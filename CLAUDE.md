# Padellist

PWA fuer eine feste Padel-Runde zu viert. Rangliste nach Siegquote, Duo- und
Direktduell-Statistik, Vorschlag fuer die naechste Aufteilung. Zugang ueber ein
gemeinsames Passwort ohne Benutzerkonten.

Nicht im Umfang: Terminplanung (laeuft ueber Playtomic), Gastspieler, Elo.

## Gestaltung

Ruhig und textlastig: Grundschriftgroesse 17px, duenne Trennlinien statt Karten,
keine Emoji, keine Farbpunkte an Namen, keine Versalien-Minilabels. Farbe nur dort,
wo sie etwas bedeutet - der Speichern-Knopf und die Formpunkte. Sieger stehen fett,
Verlierer gedaempft; das ersetzt jede Einfaerbung.

Sichtbarer Text ist korrektes Deutsch mit Umlauten (de-CH, `ss` statt `ß`).
Nur Code und Kommentare bleiben ASCII.

## Stack

Vite 8 + React 19 + TypeScript (strict) auf Cloudflare Pages, D1 als Datenbank,
Tailwind 4, `vite-plugin-pwa`.

Laufzeit-Abhaengigkeiten sind ausschliesslich `react` und `react-dom`. Das ist Absicht:
das Projekt soll mit minimalem Wartungsaufwand jahrelang laufen.

## Nicht hinzufuegen

- Keine Router-Library - vier Tabs liegen in `useState` in `App.tsx`.
- Keine Server-State-Library - `fetch` plus Neuladen nach jeder Mutation reicht bei vier Nutzern.
- Kein ORM - D1 wird direkt ueber `env.DB.prepare(...).bind(...)` angesprochen.
- Kein API-Framework - Pages Functions routen ueber das Dateisystem.
- Keine Component-Library - Primitive stehen in `src/components/ui.tsx`.
- Keine Krypto- oder JWT-Library - Web Crypto ist in der Workers-Runtime enthalten.

## Aufbau

```
functions/api/     Pages Functions, Dateisystem-Routing
server/            Serverhilfen, bewusst AUSSERHALB von functions/
src/lib/           Reine Funktionen: Statistik, Rotation, Formatierung
src/views/         Die drei Tabs: Heute, Rangliste, Spiele
src/components/    UI-Primitive, MatchRow, MatchForm, PasswordGate, BottomNav
migrations/        D1-Migrationen
test/              Fixture-Tests fuer die Statistik
```

Die Rangliste fasst Spieler, Duos und die drei Direktbegegnungen in einer Ansicht
zusammen. Eine eigene Duos-Ansicht gibt es nicht mehr: die Duo-Liste enthaelt
bereits jede Partnerkombination, eine zusaetzliche Aufstellung pro Spieler waere
dieselbe Zahl noch einmal.

In der Spieleliste steht immer der Sieger oben. Sonst muesste man die beiden Zeilen
vergleichen, um das Resultat zu erkennen.

`server/` liegt absichtlich nicht unter `functions/`: in Pages wird jede Datei unterhalb
von `functions/` zu einer Route. Eine Hilfsdatei dort waere unter `/api/...` erreichbar.

Die Middleware liegt unter `functions/api/_middleware.ts`, nicht im Wurzelverzeichnis -
sonst liefe sie auch fuer jede statische Datei.

## Zwei tsconfigs

`@cloudflare/workers-types` und die DOM-Lib definieren beide `Request`, `Response` und
`fetch` mit unterschiedlichen Signaturen. Deshalb:

- `tsconfig.json` - `src/`, `test/`, mit DOM
- `tsconfig.functions.json` - `functions/`, `server/`, mit Workers-Typen, ohne DOM

`src/types.ts` wird von beiden eingebunden und enthaelt daher nur Typdeklarationen.

`npm run typecheck` prueft beide.

## Datenfluss

Ein einziger Leseendpunkt `GET /api/data` liefert Spieler und Matches samt Saetzen.
Saemtliche Statistik entsteht daraus clientseitig in `src/lib/stats.ts`.

Das ist bei diesem Datenvolumen (rund 30 KB) die einfachere Loesung: keine doppelten
Typen zwischen Worker und Client, testbare reine Funktionen, und der Service Worker
kann `/api/data` cachen, sodass Rangliste und Statistik offline lesbar bleiben.

Mutationen (`POST`/`PUT`/`DELETE`) werden von einem erneuten Laden von `/api/data` gefolgt.

## Fallstricke

**Match anlegen.** `last_insert_rowid()` funktioniert innerhalb eines D1-Batch nicht wie
erwartet: nach dem ersten `sets`-Insert zeigt es auf die Satz-Zeile, nicht auf das Match.
Deshalb erst `INSERT ... RETURNING id`, dann die Saetze als Batch - und bei Fehlschlag
das Match wieder loeschen. Ein Match ohne Saetze haette keinen bestimmbaren Sieger.
Beim Bearbeiten ist die Id bekannt, dort passt alles in einen atomaren Batch.

**Unentschieden sind moeglich.** Zwei Saetze 6:4 und 4:6 ergeben 1:1 Saetze und 10:10
Spiele. Die Validierung verbietet nur unentschiedene *Saetze*, nicht unentschiedene
*Matches*. `winner` ist `1 | 2 | null`, Elo rechnet mit `actual = 0.5`.

**Statistik wird nie gespeichert.** Immer aus allen Matches neu berechnet, sortiert nach
`played_on, id`. Nur so wirken nachtraegliche Korrekturen korrekt. Die Rangliste sortiert
nach Siegquote, bei Gleichstand nach Spieldifferenz.

**Der Rotationsvorschlag wird abgeleitet, nie gespeichert.** Ein gespeicherter Zeiger
wuerde verrutschen, sobald ein Match nachtraeglich erfasst oder geloescht wird.

**Kein Rollenkonzept, sondern ein Verlauf.** Alle vier duerfen alles erfassen, aendern
und loeschen. Statt Rechte zu vergeben, schreibt `changes` jede Mutation mit - sichtbar
fuer alle unter Spiele > Verlauf. Das reguliert sich sozial und erspart die
Benutzeranmeldung, die bewusst nicht existiert.

`before_json` und `after_json` halten den kompletten Stand eines Matches. Deshalb ist ein
versehentlich geloeschtes Match aus dem Log rekonstruierbar - ein separater Papierkorb
oder ein Soft Delete waere doppelt gemoppelt.

Sortiert wird `at DESC, id DESC`. SQLites `datetime` loest nur sekundengenau auf, und eine
Korrektur folgt dem Erfassen oft innerhalb derselben Sekunde - ohne die Id als zweites
Kriterium stuende sie in zufaelliger Reihenfolge.

Der Playtomic-Import taucht im Verlauf nicht auf: er lief als Migration, nicht ueber die
App. Was dort steht, ist in `migrations/0003_import_playtomic.sql` dokumentiert.

**Importierte Matches** tragen `source = 'playtomic'`. Die Spalte wird bewusst nirgends
angezeigt - sie existiert nur, damit sich ein fehlerhafter Import mit
`DELETE FROM matches WHERE source = 'playtomic'` gezielt zuruecknehmen laesst, ohne von
Hand erfasste Spiele zu beruehren.

## Sprache

Die Oberflaeche ist deutsch (de-CH, `ss` statt `ß`). Alle sichtbaren Texte stehen in
`src/strings.ts`, keine i18n-Library. Code und Kommentare ebenfalls ohne Umlaute, damit
Encoding nirgends zum Thema wird.

## Tests

`npm test` laeuft ohne Test-Framework: Node 22 entfernt Typen selbst, deshalb genuegt
`node test/stats.test.ts`. Dafuer stehen in `src/`-Importen explizite `.ts`-Endungen
(`allowImportingTsExtensions`).
