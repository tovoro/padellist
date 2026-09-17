<p align="center">
  <img src="assets/icon.svg" width="88" alt="Padellist Logo">
</p>

<h1 align="center">Padellist</h1>

<p align="center">
  Rangliste, Statistik und Rotation für unsere wöchentliche Padel-Runde.<br>
  Eine PWA, gebaut für genau vier Spieler.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/Lizenz-MIT-1d7440" alt="MIT"></a>
</p>

<p align="center">
  <img src="docs/screenshot-dark.png" width="44%" alt="Heute-Ansicht, dunkel">
  &nbsp;
  <img src="docs/screenshot-light.png" width="44%" alt="Heute-Ansicht, hell">
</p>

## Was es kann

- **Rangliste** — Siegquote, Satzbilanz, Spieldifferenz und Formkurve
- **Duos & direkte Duelle** — wer mit wem harmoniert, welche Aufteilung dominiert
- **Rotation** — schlägt die Aufteilung vor, die am längsten nicht gespielt wurde
- **Match in 15 Sekunden erfasst** — drei Paarungs-Buttons, Stepper statt Tastatur
- **Log** — jede Änderung für alle sichtbar, gelöschte Spiele bleiben rekonstruierbar
- **Offline lesbar** — der letzte Stand ist auch ohne Empfang in der Halle da
- **Ein gemeinsames Passwort** — keine Konten, die Session hält 180 Tage

## Stack

Bewusst langweilig: Vite, React 19, TypeScript (strict) und Tailwind 4 für
das Frontend. Backend: Node 22+ mit eingebautem `node:sqlite`, kein ORM,
kein Framework. Laufzeit-Abhängigkeiten: `react` und `react-dom` — sonst
nichts. Kein Router, keine Component-Library.

Details und Architektur-Entscheidungen: [CLAUDE.md](CLAUDE.md)

## Lokal entwickeln

```
npm install
cp .env.example .env
npm run dev:api     # Node-Server mit SQLite auf :8080
npm run dev         # Vite auf :5173, leitet /api weiter
```

Login mit dem Passwort aus `.env` (Standard: `padel`).
`npm test` prüft Statistik und Rotation, `npm run typecheck` App und Server.

## Deployment

Push auf `main` baut ein Docker-Image und schiebt es in die Forgejo-Registry.
Das Ansible-Playbook im selfhosted-Repo zieht das Image auf den LXC und
startet den Container neu.

```
docker build -t padellist .
docker run -p 8080:8080 -v ./data:/data -e APP_PASSWORD=... -e SESSION_SECRET=... padellist
```

`SESSION_SECRET` ist ein beliebiger langer Zufallswert, z. B. aus
`openssl rand -base64 32`.

## Lizenz

[MIT](LICENSE)
