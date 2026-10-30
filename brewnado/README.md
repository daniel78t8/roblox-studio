# Brewnado – Quellcode

Ein gemütliches Hexen-Clicker-Spiel für CrazyGames (HTML5, ohne Fremdbibliotheken).

**Neu in Version 2.0 (Dopamin-Update):**
- **Combo** für schnelles Klicken (×Zahl neben dem Kessel, Sprüche wie „Mega!“, „GOATED!“, „MAX AURA!“) – der Klick-Sound wird mit jedem Treffer höher.
- **FIEBER** bei jedem 100er-Combo: Klicks ×2, Regenbogen-Ring, Konfetti, schnellere Musik.
- **Jackpots** (seltene ×40-Klicks mit Goldregen), **Blasen** zum Platzenlassen (goldene geben ×6).
- **Quests**: immer drei Aufgaben mit Belohnung, Fortschrittsleiste über den Tabs.
- Der Kessel hat jetzt ein **Gesicht**: blinzelt, schaut Irrlichtern nach, grinst beim Combo.
- **Mehr Inhalt**: 2 neue Helfer (Regenbogen-Einhorn, Zeitportal), 2 neue Kessel (Zucker, Regenbogen), 121 statt 71 Upgrades (Stufe V und VI für jeden Helfer, Combo-, Glücks- und Blasen-Upgrades), 59 statt 41 Erfolge, 2 neue Mond-Vorteile.
- Vibration auf Handys bei großen Momenten.

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
python3 test/functional.py && python3 test/regress.py && python3 test/features.py && python3 test/dopamine.py
node sim/sim.js
```
