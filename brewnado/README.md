# Brewnado – Quellcode

Ein gemütliches Hexen-Clicker-Spiel für CrazyGames (HTML5, ohne Fremdbibliotheken).

## So gibst du es Claude Code

1. Entpacke die ZIP-Datei. Du bekommst den Ordner `brewnado`.
2. Öffne diesen Ordner in Claude Code oder lade ihn dort hoch.
3. Schreib zum Beispiel: „Lies zuerst CLAUDE.md und verbessere dann …“.
   In `CLAUDE.md` steht alles Wichtige für Claude Code: wie das Spiel aufgebaut ist, wie man es baut und testet und welche CrazyGames-Regeln eingehalten werden müssen.

## Was ist drin?

| Ordner/Datei | Inhalt |
|---|---|
| `src/` | Der eigentliche Spielcode, also Wirtschaft, Grafik, Oberfläche, Sounds und Texte (Englisch/Deutsch) |
| `assets/` | Schriftarten (Inter, freie Lizenz) |
| `build.py` | Baut daraus die fertige Spieldatei und die ZIP für CrazyGames |
| `sim/sim.js` | Simulation, die prüft, ob das Spieltempo gut ist |
| `test/` | Automatische Tests, Screenshot-, Cover- und Video-Skripte |
| `CLAUDE.md` | Anleitung für Claude Code |

## Spiel bauen

```bash
python3 build.py
```

Danach liegen die fertigen Dateien in `dist/`:

- `dist/Brewnado_CrazyGames.zip`: Diese Datei lädst du bei CrazyGames hoch.
- `dist/web/index.html`: Das ganze Spiel in einer Datei. Du kannst sie im Browser öffnen.

## Testen (optional, für Claude Code)

```bash
pip install playwright pillow
python -m playwright install chromium
python3 test/functional.py && python3 test/regress.py && python3 test/features.py
node sim/sim.js
```
