/* Brewnado - game data (economy definitions + texts). Shared by the game and the balancing simulation. */
(function (BW) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Helpers (producers). cost = base cost of the first unit, pps = potions/second per unit.
  // ---------------------------------------------------------------------------
  BW.HELPERS = [
    { id: 'spoon',   cost: 12,      pps: 0.15,
      en: ['Magic Spoon', 'Stirs the brew while you rest.'],
      de: ['Zauberlöffel', 'Rührt den Trank, während du dich ausruhst.'] },
    { id: 'frog',    cost: 110,     pps: 1,
      en: ['Frog Apprentice', 'Ribbit! Learns fast, brews faster.'],
      de: ['Froschlehrling', 'Quak! Lernt schnell, braut schneller.'] },
    { id: 'shroom',  cost: 1200,    pps: 9,
      en: ['Glow Mushrooms', 'Glowing caps full of magic spores.'],
      de: ['Leuchtpilze', 'Leuchtende Hüte voller Zaubersporen.'] },
    { id: 'cat',     cost: 13000,   pps: 50,
      en: ['Black Cat', 'Purrs spells into the cauldron.'],
      de: ['Schwarze Katze', 'Schnurrt Zauber in den Kessel.'] },
    { id: 'crystal', cost: 140000,  pps: 280,
      en: ['Crystal Ball', 'Foresees the perfect recipe.'],
      de: ['Kristallkugel', 'Sieht das perfekte Rezept voraus.'] },
    { id: 'broom',   cost: 1.6e6,   pps: 1500,
      en: ['Broom Courier', 'Flies in rare herbs every night.'],
      de: ['Besenkurier', 'Fliegt jede Nacht seltene Kräuter ein.'] },
    { id: 'bog',     cost: 2.2e7,   pps: 8500,
      en: ['Bubbling Bog', 'A whole swamp of simmering brew.'],
      de: ['Blubbersumpf', 'Ein ganzer Sumpf voller Gebräu.'] },
    { id: 'altar',   cost: 3.6e8,   pps: 48000,
      en: ['Moon Altar', 'Turns moonlight into potions.'],
      de: ['Mondaltar', 'Verwandelt Mondlicht in Tränke.'] },
    { id: 'dragon',  cost: 5.5e9,   pps: 290000,
      en: ['Dragon Furnace', 'The hottest fire in the realm.'],
      de: ['Drachenofen', 'Das heißeste Feuer im Reich.'] },
    { id: 'forge',   cost: 8e10,    pps: 1.75e6,
      en: ['Star Forge', 'Forges stardust into elixirs.'],
      de: ['Sternenschmiede', 'Schmiedet Sternenstaub zu Elixieren.'] },
    { id: 'galaxy',  cost: 1.2e12,  pps: 1.1e7,
      en: ['Galaxy Cauldron', 'Brews whole nebulas at once.'],
      de: ['Galaxienkessel', 'Braut ganze Nebel auf einmal.'] }
  ];
  BW.COST_GROWTH = 1.15;

  // Magic Hands: auto-clickers that visibly tap the cauldron (bought like helpers, but they click instead of brewing).
  BW.HAND = { id: 'hand', cost: 15,
    en: ['Magic Hand', 'Taps the cauldron for you, again and again.'],
    de: ['Zauberhand', 'Tippt immer wieder für dich auf den Kessel.'] };

  // Cauldron levels: every level multiplies production and click power and changes the cauldron's look.
  BW.STAGES = [
    { id: 'iron',    cost: 0,    en: 'Iron Cauldron',    de: 'Eisenkessel' },
    { id: 'copper',  cost: 2500, en: 'Copper Cauldron',  de: 'Kupferkessel' },
    { id: 'silver',  cost: 2e5,  en: 'Silver Cauldron',  de: 'Silberkessel' },
    { id: 'gold',    cost: 2e7,  en: 'Golden Cauldron',  de: 'Goldkessel' },
    { id: 'jade',    cost: 2e9,  en: 'Jade Cauldron',    de: 'Jadekessel' },
    { id: 'crystal', cost: 2e11, en: 'Crystal Cauldron', de: 'Kristallkessel' },
    { id: 'lava',    cost: 3e13, en: 'Lava Cauldron',    de: 'Lavakessel' },
    { id: 'star',    cost: 5e15, en: 'Star Cauldron',    de: 'Sternenkessel' }
  ];
  BW.STAGE_MULT = 1.3;

  // Per-helper upgrade tiers: unlocked when owning N units, each doubles that helper's output.
  BW.TIER_OWNED = [1, 10, 25, 50];
  BW.TIER_COST = [10, 60, 600, 6000]; // multiplier of the helper's base cost
  var TIER_NAMES = {
    spoon:   [['Carved Handle', 'Geschnitzter Griff'], ['Silver Spoon', 'Silberlöffel'], ['Self-Stirring Charm', 'Selbstrühr-Zauber'], ['Whirlpool Spoon', 'Strudellöffel']],
    frog:    [['Tiny Wizard Hats', 'Mini-Zauberhüte'], ['Lily Pad Library', 'Seerosen-Bibliothek'], ['Croak Chorus', 'Quakchor'], ['Archfrog Diploma', 'Erzfrosch-Diplom']],
    shroom:  [['Moonwater Sprinkler', 'Mondwasser-Sprenger'], ['Spore Lanterns', 'Sporenlaternen'], ['Giant Caps', 'Riesenhüte'], ['Fairy Ring', 'Hexenring']],
    cat:     [['Velvet Collar', 'Samthalsband'], ['Nine Lives', 'Neun Leben'], ['Purr-fect Spells', 'Schnurr-Zauber'], ['Familiar Bond', 'Seelenband']],
    crystal: [['Polished Glass', 'Poliertes Glas'], ['Third Eye', 'Drittes Auge'], ['Fortune Mist', 'Orakelnebel'], ['Clairvoyance', 'Hellsicht']],
    broom:   [['Turbo Bristles', 'Turbo-Borsten'], ['Night Routes', 'Nachtrouten'], ['Express Saddlebags', 'Express-Satteltaschen'], ['Comet Broom', 'Kometenbesen']],
    bog:     [['Bog Bubbles', 'Sumpfblasen'], ['Toad Choir', 'Krötenchor'], ['Mist Pumps', 'Nebelpumpen'], ['Primordial Ooze', 'Urschlamm']],
    altar:   [['Silver Runes', 'Silberrunen'], ['Moonbeam Lens', 'Mondstrahl-Linse'], ['Lunar Eclipse', 'Mondfinsternis'], ['Tidal Chant', 'Gezeitengesang']],
    dragon:  [['Coal Snacks', 'Kohle-Snacks'], ['Blue Flame', 'Blaue Flamme'], ['Scale Polish', 'Schuppenpolitur'], ['Elder Dragon', 'Uralter Drache']],
    forge:   [['Stardust Anvil', 'Sternenstaub-Amboss'], ['Comet Hammer', 'Kometenhammer'], ['Nova Bellows', 'Nova-Blasebalg'], ['Supernova Core', 'Supernova-Kern']],
    galaxy:  [['Nebula Ladle', 'Nebelkelle'], ['Orbit Stirring', 'Orbitales Rühren'], ['Black Hole Drain', 'Schwarzloch-Abfluss'], ['Big Bang Brew', 'Urknall-Gebräu']]
  };

  // ---------------------------------------------------------------------------
  // Upgrades. kind: tier | click | global | nado | wisp
  // req: function(state) -> unlocked?   (state.helpers, runClicks, runEarned, ...)
  // ---------------------------------------------------------------------------
  var U = [];
  BW.HELPERS.forEach(function (h, hi) {
    BW.TIER_OWNED.forEach(function (need, t) {
      var nm = TIER_NAMES[h.id][t];
      U.push({
        id: 't_' + h.id + '_' + t, kind: 'tier', helper: hi, tier: t,
        cost: h.cost * BW.TIER_COST[t], need: need,
        en: nm[0], de: nm[1],
        req: function (s) { return s.helpers[hi] >= need; }
      });
    });
  });
  function clickUp(id, cost, clicks, eff, en, de) {
    U.push({ id: id, kind: 'click', cost: cost, eff: eff, en: en, de: de,
      req: function (s) { return s.runClicks >= clicks || s.clicks >= clicks * 3; } });
  }
  clickUp('c1', 100,    15,   { mult: 2 },   'Sturdy Ladle', 'Robuste Kelle');
  clickUp('c2', 1000,   100,  { mult: 2 },   'Silver Ladle', 'Silberkelle');
  clickUp('c3', 25000,  400,  { mult: 2 },   'Golden Ladle', 'Goldene Kelle');
  clickUp('c4', 2e5,    800,  { pct: 0.01 }, 'Echo Ladle', 'Echokelle');
  clickUp('c5', 2e7,    1500, { pct: 0.02 }, 'Storm Ladle', 'Sturmkelle');
  clickUp('c6', 2e9,    2500, { pct: 0.03 }, 'Starlight Ladle', 'Sternenlichtkelle');
  clickUp('c7', 2e11,   4000, { pct: 0.04 }, 'Eternity Ladle', 'Ewigkeitskelle');
  clickUp('c8', 2e13,   6000, { mult: 3 },   'Cosmic Ladle', 'Kosmische Kelle');

  function globalUp(id, cost, bonus, en, de) {
    U.push({ id: id, kind: 'global', cost: cost, bonus: bonus, en: en, de: de,
      req: function (s) { return s.runEarned >= cost / 5; } });
  }
  globalUp('g1', 2e4,   0.10, 'Secret Recipe', 'Geheimrezept');
  globalUp('g2', 2e6,   0.15, "Witch's Grimoire", 'Hexen-Grimoire');
  globalUp('g3', 2e8,   0.20, 'Full Moon Ritual', 'Vollmond-Ritual');
  globalUp('g4', 2e10,  0.25, 'Ancient Runes', 'Uralte Runen');
  globalUp('g5', 2e12,  0.30, "Philosopher's Pebble", 'Stein der Weisen');
  globalUp('g6', 2e14,  0.50, 'Cosmic Harmony', 'Kosmische Harmonie');

  function nadoUp(id, cost, needNados, eff, en, de) {
    U.push({ id: id, kind: 'nado', cost: cost, eff: eff, en: en, de: de,
      req: function (s) { return s.runNados >= needNados || s.nados >= needNados * 2; } });
  }
  nadoUp('b1', 2000,  1,  'reward15', 'Wider Swirl', 'Breiterer Wirbel');
  nadoUp('b2', 5e4,   3,  'fill',     'Quick Fill', 'Schnellfüller');
  nadoUp('b3', 5e6,   6,  'reward2',  'Twin Tornado', 'Doppelwirbel');
  nadoUp('b4', 5e8,   10, 'longer',   'Eye of the Storm', 'Auge des Sturms');

  function wispUp(id, cost, needWisps, eff, en, de) {
    U.push({ id: id, kind: 'wisp', cost: cost, eff: eff, en: en, de: de,
      req: function (s) { return s.wisps >= needWisps; } });
  }
  wispUp('w1', 1e4, 1, 'often',   'Wisp Lantern', 'Irrlicht-Laterne');
  wispUp('w2', 1e6, 3, 'duration', 'Lucky Charm', 'Glücksbringer');
  wispUp('w3', 1e8, 6, 'stay',    'Wisp Whisperer', 'Irrlicht-Flüsterer');

  function handUp(id, cost, need, eff, en, de) {
    U.push({ id: id, kind: 'hand', cost: cost, need: need, eff: eff, en: en, de: de,
      req: function (s) { return s.hands >= need; } });
  }
  handUp('h1', 150,   1,   { power: 2 },               'Velvet Gloves',  'Samthandschuhe');
  handUp('h2', 3000,  10,  { speed: 1.25 },            'Nimble Fingers', 'Flinke Finger');
  handUp('h3', 2e5,   25,  { power: 2, pct: 0.0005 },  'Silver Rings',   'Silberringe');
  handUp('h4', 2e7,   50,  { speed: 1.5 },             'Lightning Taps', 'Blitzfinger');
  handUp('h5', 2e9,   80,  { power: 3, pct: 0.001 },   'Midas Touch',    'Midas-Hand');
  handUp('h6', 2e11,  120, { speed: 1.25, pct: 0.002 }, 'Hundred Hands', 'Hundert Hände');

  BW.UPGRADES = U;
  BW.UP_BY_ID = {};
  U.forEach(function (u) { BW.UP_BY_ID[u.id] = u; });

  // ---------------------------------------------------------------------------
  // Achievements (each gives +1% production and click power).
  // ---------------------------------------------------------------------------
  var A = [];
  function ach(cat, n, test) { A.push({ id: cat + '_' + n, cat: cat, n: n, test: test }); }
  [100, 1e3, 1e5, 1e7, 1e9, 1e11, 1e13, 1e15].forEach(function (n) { ach('brew', n, function (s) { return s.allEarned >= n; }); });
  [50, 500, 2500, 10000].forEach(function (n) { ach('click', n, function (s) { return s.clicks >= n; }); });
  [10, 1e3, 1e5, 1e7, 1e9].forEach(function (n) { ach('pps', n, function (s, c) { return c.ppsTotal >= n; }); });
  [10, 50, 150, 400].forEach(function (n) { ach('helpers', n, function (s, c) { return c.helpersOwned >= n; }); });
  [1, 10, 50].forEach(function (n) { ach('nado', n, function (s) { return s.nados >= n; }); });
  [1, 10, 50].forEach(function (n) { ach('wisp', n, function (s) { return s.wisps >= n; }); });
  [1, 5].forEach(function (n) { ach('moon', n, function (s) { return s.rebirths >= n; }); });
  [10, 30, 60].forEach(function (n) { ach('ups', n, function (s, c) { return c.upsOwned >= n; }); });
  [10, 50, 100].forEach(function (n) { ach('hands', n, function (s) { return s.hands >= n; }); });
  [1, 3, 5, 7].forEach(function (n) { ach('stage', n, function (s) { return s.stage >= n; }); });
  [1, 100].forEach(function (n) { ach('lucky', n, function (s) { return s.lucky >= n; }); });
  BW.ACHIEVEMENTS = A;
  BW.ACH_BONUS = 0.01;

  // ---------------------------------------------------------------------------
  // Moonrise (prestige)
  // ---------------------------------------------------------------------------
  BW.MOON = {
    base: 1e8,      // potions earned this run needed for the first Moonstone
    exp: 1 / 3,     // stones = floor((runEarned / base) ^ exp)
    bonus: 0.10,    // +10% production & click power per Moonstone
    minGain: 2      // Moonrise needs at least this many new stones
  };
  // Moon perks: unlocked permanently by lifetime Moonstones earned (never spent).
  BW.PERKS = [
    { id: 'p1', need: 1,   en: ['Moonlit Start', 'Every new night starts with 10 Magic Spoons and 2 Frog Apprentices.'],
                           de: ['Mondstart', 'Jede neue Nacht startet mit 10 Zauberlöffeln und 2 Froschlehrlingen.'] },
    { id: 'p2', need: 5,   en: ['Night Owl', 'Offline brewing at 100% speed for up to 12 hours.'],
                           de: ['Nachteule', 'Offline wird mit 100 % Tempo bis zu 12 Stunden weitergebraut.'] },
    { id: 'p3', need: 15,  en: ['Wisp Magnet', 'Wisps appear 30% more often.'],
                           de: ['Irrlicht-Magnet', 'Irrlichter erscheinen 30 % häufiger.'] },
    { id: 'p4', need: 40,  en: ['Storm Heart', 'The Brewnado meter needs 30% fewer clicks.'],
                           de: ['Sturmherz', 'Die Brewnado-Anzeige braucht 30 % weniger Klicks.'] }
  ];

  // ---------------------------------------------------------------------------
  // Tuning constants
  // ---------------------------------------------------------------------------
  BW.TUNE = {
    nadoCap: 100,            // clicks to fill the Brewnado meter
    nadoPpsSec: 25,         // reward = max(pps * nadoPpsSec, click * nadoClicks)
    nadoClicks: 15,
    nadoRushMult: 3,        // click power multiplier after a Brewnado
    nadoRushSec: 8,
    wispFirst: 40,          // seconds until the very first wisp
    wispMin: 90, wispMax: 170,
    wispLife: 12,
    rushMult: 5, rushSec: 30,
    stormMult: 10, stormSec: 12,
    treasurePpsSec: 180, treasureClicks: 40,
    offlineRate: 0.5, offlineCapH: 8,
    maxClicksPerSec: 30,
    handInterval: 10,        // seconds between two taps of one Magic Hand
    luckyChance: 0.04, luckyMult: 7,   // lucky clicks
    dailyMin: [10, 15, 20, 30, 40, 50, 60], dailyMinPotions: 100   // daily gift = minutes of production (day 1..7)
  };
})(typeof window !== 'undefined' ? (window.BW = window.BW || {}) : (global.BW = global.BW || {}));
