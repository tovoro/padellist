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

Vite 8 + React 19 + TypeScript (strict), Tailwind 4, `vite-plugin-pwa`.
Backend: Node 22+ mit eingebautem `node:sqlite` (WAL-Modus), kein ORM.
Deployment: Docker-Image via Forgejo Actions, LXC in der DMZ hinter Caddy.

Laufzeit-Abhaengigkeiten sind ausschliesslich `react` und `react-dom`. Das ist Absicht:
das Projekt soll mit minimalem Wartungsaufwand jahrelang laufen.

## Nicht hinzufuegen

- Keine Router-Library - vier Tabs liegen in `useState` in `App.tsx`.
- Keine Server-State-Library - `fetch` plus Neuladen nach jeder Mutation reicht bei vier Nutzern.
- Kein ORM - SQLite wird direkt ueber `node:sqlite` (`DatabaseSync`) angesprochen.
- Kein API-Framework - Routing liegt in `server/api.ts` als Array von Regex-Routen.
- Keine Component-Library - Primitive stehen in `src/components/ui.tsx`.
- Keine Krypto- oder JWT-Library - Web Crypto (`globalThis.crypto.subtle`) reicht.
- Kein Express/Fastify - `node:http` genuegt fuer eine Handvoll Endpunkte.

## Aufbau

```
server/            Node-Server: HTTP, Routing, DB, statische Dateien
server/handlers/   Ein Modul pro API-Endpunkt (data, login, matches, players, session)
src/lib/           Reine Funktionen: Statistik, Rotation, Formatierung
src/views/         Die drei Tabs: Heute, Rangliste, Spiele
src/components/    UI-Primitive, MatchRow, MatchForm, PasswordGate, BottomNav
migrations/        SQLite-Migrationen (dieselben wie frueher unter D1)
test/              Fixture-Tests fuer die Statistik
```

Die Rangliste fasst Spieler, Duos und die drei Direktbegegnungen in einer Ansicht
zusammen. Eine eigene Duos-Ansicht gibt es nicht mehr: die Duo-Liste enthaelt
bereits jede Partnerkombination, eine zusaetzliche Aufstellung pro Spieler waere
dieselbe Zahl noch einmal.

In der Spieleliste steht immer der Sieger oben. Sonst muesste man die beiden Zeilen
vergleichen, um das Resultat zu erkennen.

## Zwei tsconfigs

`@types/node` und die DOM-Lib definieren beide `Request`, `Response` und
`fetch` mit unterschiedlichen Signaturen. Deshalb:

- `tsconfig.json` - `src/`, `test/`, mit DOM
- `tsconfig.server.json` - `server/`, mit Node-Typen, ohne DOM

`src/types.ts` wird von beiden eingebunden und enthaelt daher nur Typdeklarationen.

`npm run typecheck` prueft beide.

## Datenfluss

Ein einziger Leseendpunkt `GET /api/data` liefert Spieler und Matches samt Saetzen.
Saemtliche Statistik entsteht daraus clientseitig in `src/lib/stats.ts`.

Das ist bei diesem Datenvolumen (rund 30 KB) die einfachere Loesung: keine doppelten
Typen zwischen Server und Client, testbare reine Funktionen, und der Service Worker
kann `/api/data` cachen, sodass Rangliste und Statistik offline lesbar bleiben.

Mutationen (`POST`/`PUT`/`DELETE`) werden von einem erneuten Laden von `/api/data` gefolgt.

## Fallstricke

**Match anlegen.** Insert, Saetze und Verlaufseintrag laufen in einer einzigen
Transaktion (`transaction` in `server/db.ts`). Schlaegt ein Teil fehl, wird alles
zurueckgerollt. Ein Match ohne Saetze haette keinen bestimmbaren Sieger.

**Unentschieden sind moeglich.** Zwei Saetze 6:4 und 4:6 ergeben 1:1 Saetze und 10:10
Spiele. Die Validierung verbietet nur unentschiedene *Saetze*, nicht unentschiedene
*Matches*. `winner` ist `1 | 2 | null`, Elo rechnet mit `actual = 0.5`.

**Statistik wird nie gespeichert.** Immer aus allen Matches neu berechnet, sortiert nach
`played_on, id`. Nur so wirken nachtraegliche Korrekturen korrekt. Die Rangliste sortiert
nach Siegquote, bei Gleichstand nach Spieldifferenz.

**Der Vorschlag folgt Serien, nicht nur der Rotation.** Gespielt wird Best of three
ueber mehrere Termine: dieselbe Konstellation bleibt, bis ein Duo zwei Matches gewonnen
hat oder drei gespielt sind - erst dann wird gewechselt. `nextSuggestion` in
`src/lib/rotation.ts` erkennt die laufende Serie als hinterste Kette gleicher
Konstellation in der chronologischen Historie: laeuft sie, wird dieselbe Konstellation
samt Serienstand vorgeschlagen; ist sie entschieden, greift die Rotations-Ordnung
(am wenigsten gespielte Konstellation, bei Gleichstand die aelteste).

Unentschieden zaehlen als gespieltes Serienmatch ohne Sieg; nach drei Matches wird
immer gewechselt. Seitentausch innerhalb der Serie ist egal (Vergleich ueber duoKey).

**Nichts davon wird gespeichert.** Serie wie Rotation sind reine Ableitungen - ein
gespeicherter Zeiger wuerde verrutschen, sobald ein Match nachtraeglich erfasst oder
geloescht wird.

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

**D1-Uebernahme.** Beim ersten Start mit einer aus Cloudflare D1 exportierten Datenbank
erkennt `server/db.ts` die Tabelle `d1_migrations`, uebernimmt die Eintraege in
`schema_migrations` und loescht die alte Tabelle. Danach laufen die normalen Migrationen.

## Sprache

Die Oberflaeche ist deutsch (de-CH, `ss` statt `ß`). Alle sichtbaren Texte stehen in
`src/strings.ts`, keine i18n-Library. Code und Kommentare ebenfalls ohne Umlaute, damit
Encoding nirgends zum Thema wird.

## Tests

`npm test` laeuft ohne Test-Framework: Node 22 entfernt Typen selbst, deshalb genuegt
`node test/stats.test.ts`. Dafuer stehen in `src/`-Importen explizite `.ts`-Endungen
(`allowImportingTsExtensions`).

## Deployment

Push auf `main` baut ein Docker-Image und schiebt es in die Forgejo-Registry
(`git.suveris.ch/tobi/padellist`). Das Playbook `playbooks/padellist.yml` im
selfhosted-Repo zieht das Image auf den LXC und startet den Container neu.

Der Container laeuft als User `node` (uid 1000), die SQLite-Datei liegt unter
`/data/padellist.db` auf einem gemounteten Volume. Caddy terminiert TLS und leitet
an Port 8080 weiter.

Umgebungsvariablen: `APP_PASSWORD`, `SESSION_SECRET`, `DB_PATH`, `PORT`.
In der Produktion setzt Ansible die Werte aus dem Vault (selfhosted, Rolle padellist).
