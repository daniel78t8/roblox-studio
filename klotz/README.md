# Klotz – Physik-Puzzle (HTML5 / Vanilla JS)

Zerstöre die türkisen Formen und bring den roten Klotz sicher auf den grünen Boden.
Der Klotz selbst ist unzerstörbar und darf nicht aus dem Spielfeld fallen.

Mobile-First, ohne Bilder, ohne Webfonts und ohne Bibliotheken: alle Dateien
zusammen sind ca. 75 KB unkomprimiert.

## Starten

`index.html` direkt im Browser öffnen (Doppelklick genügt, auch über `file://`).
Für den Test auf dem Smartphone den Ordner auf einen beliebigen Webspace legen oder lokal
`npx serve klotz` bzw. `python3 -m http.server -d klotz` starten.

Tastatur am PC: **R** = Level neu starten, **H** = Hinweis.

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html` | Struktur: Menü, Spielfeld, Screens, Werbe-Platzhalter |
| `css/style.css` | Design (Dark Mode, Neon), Layout, Banner-Größen |
| `js/physics.js` | Physik-Engine: Boxen + Kreise, Reibung, stabile Stapel (Port von Box2D Lite) |
| `js/levels.js` | Level-Daten (3 Beispiel-Level) |
| `js/core.js` | Spiellogik ohne DOM: Level aufbauen, Antippen, Sieg/Niederlage |
| `js/ads.js` | Werbe-Schnittstellen `triggerInterstitialAd()` / `triggerRewardedAd()` |
| `js/game.js` | Rendering (Canvas), Touch/Maus, UI-Abläufe, `localStorage` |
| `tests/levels.test.js` | Prüft jedes Level auf Stabilität und Lösbarkeit |

## Werbung & Monetarisierung

| Platz | Wann | Umsetzung |
|---|---|---|
| **A** Sticky-Banner | immer, unten | 320×50 mobil / 728×90 ab 768 px Breite. Teil des Flex-Layouts, verdeckt das Spielfeld nie. 8 px Abstand + „Anzeige“-Label gegen Fehlklicks (AdSense-Richtlinie). |
| **B** Interstitial | Klick auf „Weiter“ nach geschafftem Level **und** bei „Level neu starten“ | `triggerInterstitialAd(onClosed)`: Spiel pausiert, „Schließen (X)“ wird nach 3 s aktiv. |
| **C** Rewarded | Glühbirne „Hinweis“ im Menü + „Lösung zeigen“ nach einer Niederlage | `triggerRewardedAd(onReward, onDismiss)`: „Video wird geladen...“, nach 5 s wird die nächste richtige Form gelb markiert und nummeriert. |

Psychologie dahinter:

- **Interstitial erst nach dem Erfolgsmoment.** Der Sieg-Screen kommt zuerst (Belohnung), die Anzeige
  folgt in der natürlichen Pause beim Klick auf „Weiter“. Der Fortschritt ist da schon gespeichert.
- **Rewarded im Moment der Frustration.** Nach einer Niederlage wird der Hinweis prominent angeboten.
  Nach 20 s ohne Fortschritt oder 2 Fehlversuchen pulsiert die Glühbirne sanft.
- **Freiwillig und fair.** Das Video lässt sich abbrechen (dann gibt es keinen Hinweis). Ein
  freigeschalteter Hinweis bleibt für das Level aktiv, auch nach einem Neustart oder Reload.
  Wer nach einer Niederlage den Hinweis nimmt, bekommt beim Neustart kein zusätzliches Interstitial.
- **Wiederkehr.** Level, Bestwert und freigeschaltete Hinweise liegen in `localStorage`
  (`klotz.progress.v1`). Der Startbildschirm zeigt „WEITER · LEVEL 5“.

### Echte Anzeigen einbinden

Google erlaubt Interstitials und Rewarded Ads in Browsergames nur über die
**H5 Games Ads API (Ad Placement API, `adBreak`)**.

1. In `index.html` den auskommentierten Block im `<head>` aktivieren und `ca-pub-XXXXXXXXXXXXXXXX`
   durch deine Publisher-ID ersetzen. `data-adbreak-test="on"` liefert Testanzeigen und muss vor
   dem Livegang raus.
2. In `js/ads.js` die beiden Funktionen durch die `adBreak()`-Varianten aus dem Kopfkommentar
   ersetzen. Das Spiel selbst muss nicht angepasst werden, es hört nur auf die Events
   `klotz:adstart` und `klotz:adend`.
3. Im `<footer id="adBanner">` den Platzhalter durch das `<ins class="adsbygoogle">`-Tag ersetzen.
4. Frequency-Cap setzen: `data-ad-frequency-hint` (z. B. `45s`). Für die Simulation steht
   `interstitialMinIntervalMs` in `js/ads.js` auf `0`, damit beim Testen jedes Interstitial
   erscheint. Für Produktion sind 45–90 s sinnvoll, weil ein Interstitial bei jedem Neustart
   die Spieler schnell vertreibt.

## Eigene Level

Level sind reine Daten in `js/levels.js` (Spielfeld 10 × 15 Einheiten, y nach unten):

```js
{
  name: 'Die Wippe',
  tip: 'Text, der beim Levelstart eingeblendet wird',
  goal: { x: 5, y: 14.5, w: 4, h: 1 },                              // grünes Ziel
  statics: [{ type: 'box', x: 2, y: 14.5, w: 3, h: 1 }],            // graue, unzerstörbare Teile
  shapes: [                                                         // zerstörbare Formen
    { id: 'brett', type: 'box', x: 5, y: 10.75, w: 4.6, h: 0.5, angle: 0 },
    { id: 'ball', type: 'circle', x: 5, y: 13.4, r: 0.6 }
  ],
  klotz: { x: 5, y: 9.2, size: 1 },
  solution: ['brett', 'ball']                                       // Reihenfolge für den Hinweis
}
```

Danach prüfen:

```sh
node klotz/tests/levels.test.js
```

Der Test simuliert jedes Level normal und gespiegelt. Er prüft, dass der Aufbau 6 s ohne Eingriff
stehen bleibt und dass die hinterlegte `solution` gewinnt. Zusätzlich zeigt er, welche ersten
Züge verlieren. So erkennst du, ob ein Level eine echte Falle hat.

Nach dem letzten Level geht es gespiegelt von vorn weiter (Level 4 = Level 1 gespiegelt usw.),
damit die Level-Nummer und der gespeicherte Fortschritt endlos weiterzählen.

## Physik-Hinweis

`js/physics.js` ist ein Port von *Box2D Lite* (© 2006–2007 Erin Catto, freie Nutzung mit
Copyright-Hinweis), ergänzt um Kreise und Rollwiderstand. Der Copyright-Hinweis im Dateikopf muss
erhalten bleiben.
