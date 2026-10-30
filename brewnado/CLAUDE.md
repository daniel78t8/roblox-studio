# Brewnado – project guide for Claude Code

Brewnado is a cozy witch-themed idle/clicker game (HTML5) made for **CrazyGames**.
The player taps a cauldron to brew potions and buys Magic Hands (auto-clickers), helpers and upgrades.
They can also upgrade the cauldron through 10 levels, trigger "Brewnados", catch wisps and restart with Moonstones (prestige).
Version 2.0 is tuned for kids who want constant rewards: fast clicking builds a **combo** (up to +30 %, more with upgrades) and every 100 hits start a **FEVER** (clicks ×2, rainbow effects, faster music).
Rare **jackpot** clicks (×40), **bubbles** to pop (golden ones pay ×6), three **quests** at a time with rewards, and a cauldron with a face that reacts to everything.

- Plain JavaScript (ES5 style), Canvas 2D for the scene and DOM for the UI.
- No dependencies, no bundler, no npm.
- Everything (code, CSS, fonts, icons, sounds, music) ends up in **one self-contained `index.html`**.
- Languages: English (required by CrazyGames) and German.

## Commands

```bash
python3 build.py                 # build everything into dist/ (run after every change)
node sim/sim.js                  # balancing simulation (run after any economy change)
python3 test/functional.py       # gameplay, layouts at all CrazyGames sizes, performance, mocked SDK
python3 test/regress.py          # regressions from an independent QA pass (SDK timing, saving, dialogs, toasts, keyboard)
python3 test/features.py         # Magic Hands, cauldron levels, lucky clicks, daily gift
python3 test/dopamine.py         # combo + FEVER, jackpots, bubbles, quests, new content, 2.0 save compatibility
python3 test/shot.py 1280x720 en-US test/fixtures/state_mid.json   # quick screenshot -> dist/shot.png
python3 test/screens.py          # screenshots of all screens -> dist/screens/
python3 test/covers.py           # CrazyGames cover images -> dist/covers/
python3 test/video.py            # 18 s preview videos (needs ffmpeg) -> dist/videos/
```

Test requirements: Python 3, `pip install playwright pillow`, `python -m playwright install chromium`, and Node.js (tests build save states with `node`).
All four test suites must pass before a release.

## Build outputs (generated – never edit `dist/` by hand)

| File | Purpose |
|---|---|
| `dist/web/index.html` | Standalone build without the CrazyGames SDK (preview / sharing) |
| `dist/crazygames/index.html` | CrazyGames build, loads `https://sdk.crazygames.com/crazygames-sdk-v3.js` |
| `dist/Brewnado_CrazyGames.zip` | **Upload package** (index.html + font licence) |
| `dist/test/web.html`, `dist/test/crazygames.html` | Same builds **with** the debug hooks (`?debug=1` → `window.__bw`), used only by the tests |

The release builds strip everything between `/*DEBUG-START*/` and `/*DEBUG-END*/` in `main.js`. `build.py` asserts that no `__bw` is left.

## Source map

| File | What it contains |
|---|---|
| `src/data.js` | **All economy data and tuning**. Includes `HELPERS` (13 producers), `HAND` (Magic Hand), `STAGES` (10 cauldron levels, `STAGE_MULT` 1.3) and `UPGRADES` (121: tier I–VI, click, global, nado, wisp, hand, combo, luck, bubble). Also `ACHIEVEMENTS` (59, each +1 %), `MOON` (prestige formula), `PERKS` (6), `QUESTS` (quest kinds and how targets grow) and `TUNE` (timings, multipliers, offline, lucky clicks, jackpots, combo, FEVER, bubbles, quests, daily gift). Shared with the simulation. |
| `src/core.js` | Pure economy logic, no DOM. `newState`, `calc` (all derived values, called "C" in main.js), costs/buying, `click` (combo, FEVER, lucky clicks, jackpots), `brewnado`, `tick` (also breaks the combo), wisps, bubbles, quests (`ensureQuests`, `updateQuests`, `claimQuest`), `moonrise`, achievements, `offlineGain`, daily gift, `serialize`/`deserialize` (validates and clamps every field). |
| `src/i18n.js` | EN/DE strings and number formatting (`fmt`: 1.15M / 1,15 Mio.). |
| `src/icons.js` | Hand-made inline SVG icons (outline `#1d1030`). Includes `iconCauldron(level)`, `iconForUpgrade` (roman tier badges), `iconForAch` and the glove used for Magic Hands. |
| `src/audio.js` | Procedural Web Audio: sound effects and a music-box loop, no audio files. Unlocks on the first gesture and respects the CrazyGames mute setting. |
| `src/scene.js` | Canvas renderer, see "Scene" below. |
| `src/main.js` | DOM UI (shop cards, tabs, quest bar + quest dialog, dialogs, toast queue, tooltips, hints, rolling potion counter, haptics on phones), SDK integration, storage, input, main loop, daily gift and the debug hooks. |
| `src/style.css`, `src/index.html` | UI styles and the HTML template (`<!--SDK-->`, `/*FONTS*/`, `/*CSS*/`, `/*JS*/` placeholders filled by `build.py`). |
| `assets/` | Subset Inter fonts (WOFF) and their OFL licence. |
| `sim/sim.js` | Greedy-player simulation (active 5 clicks/s, casual 2 clicks/s, both pause 3 s every 30 s; pops bubbles and claims quests; second run after a Moonrise). |
| `test/fixtures/` | Saved game states used by tests and screenshots. |

JS load order (concatenated by `build.py`): `data, core, i18n, icons, audio, scene, main`. Every file is an IIFE that adds to `window.BW`.

### Scene

`scene.js` covers:
- **Background, baked once per resize:** sky, moon, mountains, forest, vignette.
- **Cauldron:** body sprite cached per size, DPR and level, using the materials in `MAT[]`, a decoration layer and a pulsing glow layer. A face drawn each frame (blinks, looks at wisps/bubbles, grins during combos).
- **Around the cauldron:** fire with cached logs, helper visuals (incl. a sky portal and flying unicorns), Magic Hands that orbit the rim and tap it.
- **Combo + FEVER:** the combo counter with its timer bar next to the cauldron, combo words, rainbow ring during FEVER.
- **Particles:** drop, steam, spark, ember, smoke, confetti.
- **Effects:** wisp, bubbles, jackpot, Brewnado tornado, rays, flash, shockwave rings, floating texts, potions flying to the counter.
- **Performance:** quality 1/0 (auto low quality when frames are slow) and a DPR cap.

## Rules – please keep these

### CrazyGames requirements

- **SDK v3:**
  - `await SDK.init()` with a 10 s fallback. Never adopt the SDK after the fallback fired, because that would overwrite the cloud save.
  - Boot: `loadingStart`/`loadingStop`, then `gameplayStart` once.
  - Dialogs: `gameplayStop`/`gameplayStart` around every dialog, but not on window blur.
  - `happytime()` only on big moments (cauldron level-up, Moonrise).
  - Saves go through `SDK.data`, falling back to `localStorage` and reading it back.
  - Respect `settings.muteAudio`. The SDK locale chooses the language.
- **No ads** in Basic Launch. If the game gets Full Launch, rewarded ads may be added through the SDK ad module.
- No external links, no cross-promotion and no custom fullscreen button. English must always be available.
- The game starts directly in gameplay; the only loading screen is the splash shown while the SDK initialises.
- It must work on desktop and mobile, in portrait and landscape. Required sizes: 907×510, 1216×684, 1280×720, 1920×1080, 800×450, 1080×607 and phones.
- No network requests except the SDK script. Relative paths only. Keep the download small (currently ~125 KB zipped).

### Code style

- ES5 style like the existing code: `var`, `function`, no classes, no arrow functions, no modules, no external libraries.
- Every visible text in **both** `en` and `de` in `i18n.js`.

### Save compatibility

Never rename existing state fields. New fields get a default in `newState()` and validation in `deserialize()`. Old saves must keep loading.

### Economy and balance

Change numbers only in `data.js`, then run `node sim/sim.js`. Current pacing for an active player (the sim claims quests right away, so real players are a bit slower):
- 1M potions after about 1 min and 1B after about 7 min (2.0 is intentionally much faster at the start than 1.0).
- About 190T earned and ~57 Moonstones after 60 min (the first Moonstone needs 1e9 potions).
- A casual player reaches 1B after about 13 min and has ~12 Moonstones after 60 min.
- Combo, FEVER, luck and quest rewards multiply each other. When tuning one of them, check the active player again.

### Art style

- Thick dark outline `#1d1030`, rounded cartoon shapes, purple night palette.
- Everything is drawn in code (canvas/SVG); no image files.
- It should look hand-crafted and coherent, not generic.

### Performance

- Cache expensive drawings in offscreen canvases.
- No per-frame large gradients or full-screen blends.
- Decorative effects are skipped or reduced at `quality === 0`.
- Test budget in headless software rendering: average frame < 18.5 ms at 1×, < 22.3 ms with 2× CPU throttle and < 40 ms with 4× CPU throttle.
- These budgets were calibrated on one machine. On a slower machine, all builds, even the very first one, can fail them.
- When a perf test fails, compare against the previous build on the same machine before chasing a regression.

### Accessibility and safety

- Dialogs focus the safe button (Cancel / Not yet).
- Space and Enter are ignored for 400 ms after a dialog opens, and Escape closes dialogs.
- The background is `inert` while a dialog is open.
- Clicks are capped at 30 per second.

## Ideas not built yet

- Cauldron skins or seasonal events.
- Even more late-game helpers and quest kinds (e.g. "reach level X", "catch N golden bubbles").
- Rewarded ads, only after CrazyGames selects the game for Full Launch.
