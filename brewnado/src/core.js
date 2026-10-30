/* Brewnado - core economy (no DOM). Shared by the game and the balancing simulation. */
(function (BW) {
  'use strict';
  var T = BW.TUNE, H = BW.HELPERS, NH = H.length, G = BW.COST_GROWTH;

  function zeros(n) { var a = []; for (var i = 0; i < n; i++) a.push(0); return a; }
  function num(v, d) { v = Number(v); return (isFinite(v) && v >= 0) ? v : d; }

  function newState() {
    return {
      v: 1,
      potions: 0, runEarned: 0, allEarned: 0,
      clicks: 0, runClicks: 0,
      helpers: zeros(NH),
      ups: {}, ach: {},
      stones: 0, stonesEver: 0, rebirths: 0,
      meter: 0, nados: 0, runNados: 0,
      wisps: 0,
      hands: 0, handTaps: 0, stage: 0, lucky: 0,
      daily: { day: '', streak: 0 },
      buffs: { rush: 0, storm: 0, nado: 0, fever: 0 },
      wispIn: T.wispFirst,
      combo: 0, comboT: 0, comboBest: 0, fevers: 0, jackpots: 0,
      bubbles: 0, bubbleIn: T.bubbleFirst,
      quests: [], questsDone: 0, bought: 0, handsBought: 0, upsBought: 0,
      playTime: 0, created: Date.now(), lastSave: Date.now(),
      best: 0,
      settings: { sfx: true, music: true, lang: 'auto', buy: 1 },
      tut: {}
    };
  }

  function perk(s, id) {
    for (var i = 0; i < BW.PERKS.length; i++) if (BW.PERKS[i].id === id) return s.stonesEver >= BW.PERKS[i].need;
    return false;
  }

  // Compute all derived values. Cheap enough to run whenever something changes.
  function calc(s) {
    var c = { helperMult: zeros(NH), helperPps: zeros(NH), helperTotal: zeros(NH) };
    var clickMult = 1, clickPct = 0, global = 1, upsOwned = 0;
    var nadoReward = 1, nadoFill = 1, nadoLong = 1, wispOften = 1, wispDur = 1, wispStay = 1, wispTreasure = 1;
    var handPower = 1, handSpeed = 1, handPct = 0;
    var comboWin = 1, comboCap = T.comboCap, comboStep = T.comboStep, feverMult = T.feverMult, feverSec = T.feverSec;
    var luckyChance = T.luckyChance, luckyMult = T.luckyMult, jackChance = T.jackpotChance, jackMult = T.jackpotMult;
    var bubbleOften = 1, bubbleReward = 1, bubbleGold = T.bubbleGold;
    for (var i = 0; i < NH; i++) c.helperMult[i] = 1;
    for (var k = 0; k < BW.UPGRADES.length; k++) {
      var u = BW.UPGRADES[k];
      if (!s.ups[u.id]) continue;
      upsOwned++;
      if (u.kind === 'tier') c.helperMult[u.helper] *= 2;
      else if (u.kind === 'click') { if (u.eff.mult) clickMult *= u.eff.mult; if (u.eff.pct) clickPct += u.eff.pct; }
      else if (u.kind === 'global') global *= 1 + u.bonus;
      else if (u.kind === 'nado') {
        if (u.eff === 'reward15') nadoReward *= 1.5;
        else if (u.eff === 'reward2') nadoReward *= 2;
        else if (u.eff === 'fill') nadoFill *= 0.75;
        else if (u.eff === 'longer') nadoLong *= 1.5;
      } else if (u.kind === 'hand') {
        if (u.eff.power) handPower *= u.eff.power;
        if (u.eff.speed) handSpeed *= u.eff.speed;
        if (u.eff.pct) handPct += u.eff.pct;
      } else if (u.kind === 'wisp') {
        if (u.eff === 'often') wispOften *= 0.8;
        else if (u.eff === 'duration') wispDur *= 1.3;
        else if (u.eff === 'stay') { wispStay *= 1.5; wispTreasure *= 1.5; }
      } else if (u.kind === 'combo') {
        if (u.eff === 'window') comboWin *= 1.5;
        else if (u.eff === 'cap') comboCap += 35;
        else if (u.eff === 'step') comboStep *= 1.5;
        else if (u.eff === 'fever') { feverMult = 3; feverSec *= 1.5; }
      } else if (u.kind === 'luck') {
        if (u.eff === 'chance') luckyChance += 0.015;
        else if (u.eff === 'mult') luckyMult = 10;
        else if (u.eff === 'jackpot') jackChance *= 1.5;
        else if (u.eff === 'jmult') jackMult *= 1.5;
      } else if (u.kind === 'bubble') {
        if (u.eff === 'often') bubbleOften *= 0.7;
        else if (u.eff === 'reward') bubbleReward *= 2;
        else if (u.eff === 'gold') bubbleGold *= 3;
      }
    }
    var achCount = 0;
    for (var a in s.ach) if (s.ach[a]) achCount++;
    var achMult = 1 + BW.ACH_BONUS * achCount;
    var stoneMult = 1 + BW.MOON.bonus * s.stones;
    var stageMult = Math.pow(BW.STAGE_MULT, s.stage);
    var mult = global * achMult * stoneMult * stageMult;
    var raw = 0, owned = 0;
    for (i = 0; i < NH; i++) {
      c.helperPps[i] = H[i].pps * c.helperMult[i] * mult;
      c.helperTotal[i] = c.helperPps[i] * s.helpers[i];
      raw += c.helperTotal[i];
      owned += s.helpers[i];
    }
    c.pps = raw;
    c.rush = s.buffs.rush > 0 ? T.rushMult : 1;
    c.ppsNow = c.pps * c.rush;
    c.clickBase = clickMult * achMult * stoneMult * stageMult;
    c.clickPct = clickPct;
    c.clickPower = c.clickBase + c.pps * clickPct;
    c.feverMult = feverMult; c.feverSec = feverSec;
    c.clickBuff = (s.buffs.storm > 0 ? T.stormMult : 1) * (s.buffs.nado > 0 ? T.nadoRushMult : 1) * (s.buffs.fever > 0 ? feverMult : 1);
    c.clickNow = (c.clickBase + c.ppsNow * clickPct) * c.clickBuff;
    // Magic Hands tap with the flat click power (not the "% of production" part) plus their own small % bonus.
    c.handPower = handPower; c.handPct = handPct;
    c.handInterval = T.handInterval / handSpeed;
    c.handRate = s.hands / c.handInterval;
    c.handTapBase = c.clickBase * handPower + c.pps * handPct;
    c.handTapNow = (c.clickBase * handPower + c.ppsNow * handPct) * c.clickBuff;
    c.handEach = c.handTapBase / c.handInterval;
    c.handPps = c.handRate * c.handTapBase;
    c.handPpsNow = c.handRate * c.handTapNow;
    c.ppsTotal = c.pps + c.handPps;
    c.ppsTotalNow = c.ppsNow + c.handPpsNow;
    c.stageMult = stageMult;
    c.meterCap = Math.max(20, Math.round(T.nadoCap * nadoFill * (perk(s, 'p4') ? 0.7 : 1)));
    c.nadoReward = nadoReward;
    c.nadoSec = T.nadoRushSec * nadoLong;
    c.wispOften = wispOften * (perk(s, 'p3') ? 0.77 : 1);
    c.wispDur = wispDur;
    c.wispLife = T.wispLife * wispStay;
    c.wispTreasure = wispTreasure;
    c.comboWindow = T.comboWindow * comboWin * (perk(s, 'p5') ? 1.5 : 1);
    c.comboCap = comboCap; c.comboStep = comboStep;
    c.comboMult = comboMult(c, s.combo);
    c.luckyChance = luckyChance; c.luckyMult = luckyMult;
    c.jackpotChance = jackChance * (perk(s, 'p6') ? 2 : 1); c.jackpotMult = jackMult;
    c.bubbleOften = bubbleOften; c.bubbleReward = bubbleReward; c.bubbleGold = bubbleGold;
    c.mult = mult; c.global = global; c.achMult = achMult; c.stoneMult = stoneMult;
    c.achCount = achCount; c.upsOwned = upsOwned; c.helpersOwned = owned;
    return c;
  }

  // Click multiplier of the n-th hit of a combo (the first hit of a chain counts ×1).
  function comboMult(c, n) { return 1 + Math.min(Math.max(0, n - 1), c.comboCap) * c.comboStep; }

  // Cost of n units when `owned` are already owned (geometric series).
  function unitCost(base, owned, n) {
    var b = base * Math.pow(G, owned);
    if (n === 1) return Math.ceil(b);
    return Math.ceil(b * (Math.pow(G, n) - 1) / (G - 1));
  }
  function unitMax(base, owned, potions) {
    var b = base * Math.pow(G, owned);
    if (potions < b) return 0;
    var n = Math.floor(Math.log(1 + potions * (G - 1) / b) / Math.log(G));
    while (n > 0 && unitCost(base, owned, n) > potions) n--;
    return Math.max(0, Math.min(n, 1000));
  }
  function helperCost(s, i, n) { return unitCost(H[i].cost, s.helpers[i], n); }
  function maxAffordable(s, i) { return unitMax(H[i].cost, s.helpers[i], s.potions); }
  function handCost(s, n) { return unitCost(BW.HAND.cost, s.hands, n); }
  function maxHands(s) { return unitMax(BW.HAND.cost, s.hands, s.potions); }
  function buyHands(s, n) {
    if (n === 'max') n = maxHands(s);
    if (!(n >= 1)) return 0;
    var cost = handCost(s, n);
    if (cost > s.potions) return 0;
    s.potions -= cost; s.hands += n; s.handsBought += n;
    return n;
  }
  // Cauldron levels
  function nextStage(s) { return s.stage + 1 < BW.STAGES.length ? BW.STAGES[s.stage + 1] : null; }
  function buyStage(s) {
    var n = nextStage(s);
    if (!n || s.potions < n.cost) return false;
    s.potions -= n.cost; s.stage++;
    return true;
  }
  function buyHelper(s, i, n) {
    if (n === 'max') n = maxAffordable(s, i);
    if (!(n >= 1)) return 0;
    var cost = helperCost(s, i, n);
    if (cost > s.potions) return 0;
    s.potions -= cost;
    s.helpers[i] += n; s.bought += n;
    return n;
  }
  function upgradeUnlocked(s, u) { return !s.ups[u.id] && u.req(s); }
  function availableUpgrades(s) {
    var out = [];
    for (var k = 0; k < BW.UPGRADES.length; k++) if (upgradeUnlocked(s, BW.UPGRADES[k])) out.push(BW.UPGRADES[k]);
    out.sort(function (a, b) { return a.cost - b.cost; });
    return out;
  }
  function buyUpgrade(s, id) {
    var u = BW.UP_BY_ID[id];
    if (!u || !upgradeUnlocked(s, u) || s.potions < u.cost) return false;
    s.potions -= u.cost;
    s.ups[id] = true; s.upsBought++;
    return true;
  }

  function earn(s, v) {
    if (!(v > 0) || !isFinite(v)) return 0;
    s.potions += v; s.runEarned += v; s.allEarned += v;
    return v;
  }

  // One click on the cauldron. r (optional, 0..1) decides lucky clicks and jackpots.
  // Every click within c.comboWindow seconds of the last one grows the combo; every T.feverAt hits start a FEVER.
  // Returns {gain, nado, lucky, jackpot, fever, combo}; nado is the Brewnado reward (0 if none).
  function click(s, c, r) {
    var jackpot = r != null && r < c.jackpotChance;
    var lucky = !jackpot && r != null && r < c.jackpotChance + c.luckyChance;
    s.combo++; s.comboT = c.comboWindow;
    if (s.combo > s.comboBest) s.comboBest = s.combo;
    for (var qi = 0; qi < s.quests.length; qi++) if (s.quests[qi].k === 'combo' && !s.quests[qi].done) s.quests[qi].p = Math.max(s.quests[qi].p, s.combo);
    var gain = earn(s, c.clickNow * comboMult(c, s.combo) * (jackpot ? c.jackpotMult : lucky ? c.luckyMult : 1));
    if (lucky) s.lucky++;
    if (jackpot) s.jackpots++;
    s.clicks++; s.runClicks++;
    s.meter += 1;
    var fever = false;
    if (s.combo % T.feverAt === 0) { s.buffs.fever = Math.max(s.buffs.fever, c.feverSec); s.fevers++; fever = true; }
    var nado = 0;
    if (s.meter >= c.meterCap) nado = brewnado(s, c);
    return { gain: gain, nado: nado, lucky: lucky, jackpot: jackpot, fever: fever, combo: s.combo };
  }
  function brewnado(s, c) {
    var reward = Math.max(c.ppsTotal * T.nadoPpsSec, c.clickPower * T.nadoClicks) * c.nadoReward;
    earn(s, reward);
    s.buffs.nado = c.nadoSec;
    s.meter = 0;
    s.nados++; s.runNados++;
    return reward;
  }

  // Advance time. Returns true when buffs ended (caller should recalc).
  function tick(s, c, dt) {
    if (!(dt > 0)) return false;
    earn(s, (c.ppsNow + c.handPpsNow) * dt);
    s.handTaps += c.handRate * dt;
    s.playTime += dt;
    var changed = false;
    if (s.combo > 0) { s.comboT -= dt; if (s.comboT <= 0) { s.combo = 0; s.comboT = 0; changed = true; } }
    ['rush', 'storm', 'nado', 'fever'].forEach(function (b) {
      if (s.buffs[b] > 0) { s.buffs[b] -= dt; if (s.buffs[b] <= 0) { s.buffs[b] = 0; changed = true; } }
    });
    if (c.ppsTotal > s.best) s.best = c.ppsTotal;
    return changed;
  }

  function nextWispDelay(s, c, r) {
    return (T.wispMin + (T.wispMax - T.wispMin) * r) * c.wispOften;
  }
  // Catch a wisp: r in [0,1) chooses the blessing.
  function catchWisp(s, c, r) {
    s.wisps++;
    if (r < 0.45) { s.buffs.rush = Math.max(s.buffs.rush, 0) + T.rushSec * c.wispDur; return { type: 'rush', sec: T.rushSec * c.wispDur }; }
    if (r < 0.85) {
      var amount = Math.max(25, (c.ppsTotal * T.treasurePpsSec + c.clickPower * T.treasureClicks) * c.wispTreasure);
      earn(s, amount);
      return { type: 'treasure', amount: amount };
    }
    s.buffs.storm = Math.max(s.buffs.storm, 0) + T.stormSec * c.wispDur;
    return { type: 'storm', sec: T.stormSec * c.wispDur };
  }

  // Bubbles float out of the cauldron; popping one gives a few seconds of production (golden ones much more).
  function nextBubbleDelay(s, c, r) {
    return (T.bubbleMin + (T.bubbleMax - T.bubbleMin) * r) * c.bubbleOften;
  }
  function bubbleAmount(s, c, golden) {
    return Math.max(10, c.ppsTotal * T.bubblePpsSec + c.clickPower * T.bubbleClicks) * c.bubbleReward * (golden ? T.bubbleGoldMult : 1);
  }
  function popBubble(s, c, golden) {
    s.bubbles++;
    return earn(s, bubbleAmount(s, c, golden));
  }

  // ---------------------------------------------------------------- quests
  var QK = {};
  BW.QUESTS.forEach(function (q) { QK[q.k] = q; });
  function questMetric(s, k) {
    switch (k) {
      case 'click': return s.clicks;
      case 'combo': return s.combo;
      case 'buy': return s.bought;
      case 'hand': return s.handsBought;
      case 'nado': return s.nados;
      case 'bubble': return s.bubbles;
      case 'lucky': return s.lucky + s.jackpots;
      case 'up': return s.upsBought;
      case 'wisp': return s.wisps;
      case 'earn': return s.allEarned;
    }
    return 0;
  }
  function questAllowed(s, k) {
    if (k === 'wisp') return s.wisps >= 1;
    if (k === 'nado') return s.nados >= 1 || s.clicks >= 120;
    if (k === 'bubble') return s.bubbles >= 1;
    if (k === 'up') return s.upsBought >= 1;
    if (k === 'hand') return s.handsBought >= 1 || s.allEarned >= 100;
    return true;
  }
  function niceRound(n) {
    if (n < 100) return Math.ceil(n);
    var p = Math.pow(10, Math.floor(Math.log10(n)) - 1);
    return Math.ceil(n / p) * p;
  }
  // r in [0,1) picks the kind; kinds already active are skipped.
  function makeQuest(s, c, r) {
    var active = {}, i;
    for (i = 0; i < s.quests.length; i++) active[s.quests[i].k] = true;
    var pool = BW.QUESTS.filter(function (q) { return !active[q.k] && questAllowed(s, q.k); });
    if (!pool.length) pool = BW.QUESTS.filter(function (q) { return !active[q.k]; });
    var d = pool[Math.min(pool.length - 1, Math.floor(r * pool.length))], n;
    if (d.k === 'earn') n = niceRound(Math.max(500, c.ppsTotal * 60 * d.mins + c.clickPower * 200));
    else n = Math.max(1, Math.min(d.max, Math.round(d.base * Math.pow(d.grow, s.questsDone))));
    return { k: d.k, n: n, b: d.k === 'combo' ? 0 : questMetric(s, d.k), p: 0, done: false };
  }
  function ensureQuests(s, c, rnd) {
    while (s.quests.length < 3) s.quests.push(makeQuest(s, c, rnd()));
  }
  function questProgress(s, q) {
    if (q.done) return q.n;
    if (q.k === 'combo') return Math.min(q.n, Math.max(q.p, s.combo));
    return Math.max(0, Math.min(q.n, questMetric(s, q.k) - q.b));
  }
  // Marks finished quests; returns the indices that were finished just now.
  function updateQuests(s) {
    var out = [];
    for (var i = 0; i < s.quests.length; i++) {
      var q = s.quests[i];
      if (q.done) continue;
      if (q.k === 'combo') q.p = Math.max(q.p, s.combo);
      if (questProgress(s, q) >= q.n) { q.done = true; out.push(i); }
    }
    return out;
  }
  function questReward(s, c) {
    return Math.max(T.questMinPotions, c.ppsTotal * 60 * T.questMin + c.clickPower * 80) * (1 + Math.min(1, s.questsDone * 0.02));
  }
  function claimQuest(s, c, i, r) {
    var q = s.quests[i];
    if (!q || !q.done) return 0;
    var amount = earn(s, questReward(s, c));
    s.questsDone++;
    s.quests.splice(i, 1);
    s.quests.splice(i, 0, makeQuest(s, c, r));
    return amount;
  }

  function stonesForRun(s) {
    if (s.runEarned < BW.MOON.base) return 0;
    return Math.floor(Math.pow(s.runEarned / BW.MOON.base, BW.MOON.exp) + 1e-9);
  }
  // Potions needed (this run) for the next Moonstone.
  function nextStoneAt(s) {
    var n = stonesForRun(s) + 1;
    return BW.MOON.base * Math.pow(n, 1 / BW.MOON.exp);
  }
  function moonrise(s) {
    var gain = stonesForRun(s);
    if (gain < 1) return 0;
    s.stones += gain; s.stonesEver += gain; s.rebirths++;
    s.potions = 0; s.runEarned = 0; s.runClicks = 0; s.runNados = 0;
    s.helpers = zeros(NH);
    s.hands = 0; s.stage = 0;
    s.ups = {};
    s.meter = 0; s.combo = 0; s.comboT = 0;
    s.buffs = { rush: 0, storm: 0, nado: 0, fever: 0 };
    if (perk(s, 'p1')) { s.helpers[0] = 10; s.helpers[1] = 2; }
    return gain;
  }

  function checkAchievements(s, c) {
    var got = [];
    for (var i = 0; i < BW.ACHIEVEMENTS.length; i++) {
      var a = BW.ACHIEVEMENTS[i];
      if (!s.ach[a.id] && a.test(s, c)) { s.ach[a.id] = true; got.push(a); }
    }
    return got;
  }

  function offlineGain(s, c, seconds) {
    if (!(seconds > 60)) return 0;
    var full = perk(s, 'p2');
    var cap = (full ? 12 : T.offlineCapH) * 3600;
    return c.ppsTotal * Math.min(seconds, cap) * (full ? 1 : T.offlineRate);
  }

  // Daily gift. today / yesterday are local date keys like '2026-10-29'.
  function dailyInfo(s, today, yesterday) {
    var d = s.daily || { day: '', streak: 0 };
    var available = d.day !== today;
    var streak = available ? (d.day === yesterday ? d.streak + 1 : 1) : d.streak;
    var idx = (Math.max(1, streak) - 1) % T.dailyMin.length;
    return { available: available, streak: streak, idx: idx };
  }
  function dailyAmount(s, c, idx) {
    return Math.max(T.dailyMinPotions * (idx + 1), c.ppsTotal * 60 * T.dailyMin[idx]);
  }
  function claimDaily(s, c, today, yesterday) {
    var info = dailyInfo(s, today, yesterday);
    if (!info.available) return 0;
    var amount = dailyAmount(s, c, info.idx);
    earn(s, amount);
    s.daily = { day: today, streak: info.streak };
    return amount;
  }

  function serialize(s) { return JSON.stringify(s); }
  function deserialize(str) {
    var d;
    try { d = JSON.parse(str); } catch (e) { return null; }
    if (!d || typeof d !== 'object' || d.v !== 1) return null;
    var s = newState();
    ['potions', 'runEarned', 'allEarned', 'clicks', 'runClicks', 'stones', 'stonesEver', 'rebirths',
     'meter', 'nados', 'runNados', 'wisps', 'wispIn', 'playTime', 'created', 'lastSave', 'best',
     'comboBest', 'fevers', 'jackpots', 'bubbles', 'bubbleIn', 'questsDone', 'bought', 'handsBought', 'upsBought'].forEach(function (k) {
      s[k] = num(d[k], s[k]);
    });
    if (Array.isArray(d.helpers)) for (var i = 0; i < NH; i++) s.helpers[i] = Math.min(100000, Math.floor(num(d.helpers[i], 0)));
    s.hands = Math.min(100000, Math.floor(num(d.hands, 0)));
    s.handTaps = num(d.handTaps, 0); s.lucky = Math.floor(num(d.lucky, 0));
    s.stage = Math.min(BW.STAGES.length - 1, Math.floor(num(d.stage, 0)));
    if (d.daily && typeof d.daily === 'object' && typeof d.daily.day === 'string' && d.daily.day.length <= 10) {
      s.daily = { day: d.daily.day, streak: Math.min(100000, Math.floor(num(d.daily.streak, 0))) };
    }
    if (d.ups && typeof d.ups === 'object') for (var u in d.ups) if (BW.UP_BY_ID[u] && d.ups[u]) s.ups[u] = true;
    var achIds = {}; BW.ACHIEVEMENTS.forEach(function (x) { achIds[x.id] = true; });
    if (d.ach && typeof d.ach === 'object') for (var a in d.ach) if (d.ach[a] && achIds[a]) s.ach[a] = true;
    if (Array.isArray(d.quests)) d.quests.slice(0, 10).forEach(function (q) {
      if (s.quests.length >= 3 || !q || typeof q !== 'object' || !QK[q.k]) return;
      for (var j = 0; j < s.quests.length; j++) if (s.quests[j].k === q.k) return;
      s.quests.push({ k: q.k, n: Math.max(1, Math.min(1e300, num(q.n, 1))), b: Math.min(1e300, num(q.b, 0)), p: Math.min(1e6, num(q.p, 0)), done: q.done === true });
    });
    ['comboBest', 'fevers', 'jackpots', 'bubbles', 'questsDone', 'bought', 'handsBought', 'upsBought'].forEach(function (k) { s[k] = Math.min(1e9, Math.floor(s[k])); });
    s.bubbleIn = Math.min(s.bubbleIn, T.bubbleMax * 2);
    if (d.buffs && typeof d.buffs === 'object') ['rush', 'storm', 'nado', 'fever'].forEach(function (b) { s.buffs[b] = Math.min(600, num(d.buffs[b], 0)); });
    if (d.settings && typeof d.settings === 'object') {
      if (typeof d.settings.sfx === 'boolean') s.settings.sfx = d.settings.sfx;
      if (typeof d.settings.music === 'boolean') s.settings.music = d.settings.music;
      if (d.settings.lang === 'en' || d.settings.lang === 'de' || d.settings.lang === 'auto') s.settings.lang = d.settings.lang;
      if (d.settings.buy === 1 || d.settings.buy === 10 || d.settings.buy === 'max') s.settings.buy = d.settings.buy;
    }
    if (d.tut && typeof d.tut === 'object') for (var t in d.tut) s.tut[t] = !!d.tut[t];
    if (s.runEarned > s.allEarned) s.allEarned = s.runEarned;
    s.wispIn = Math.min(s.wispIn, T.wispMax * 2);
    s.meter = Math.min(s.meter, T.nadoCap);
    s.stones = Math.min(Math.floor(s.stones), 1e9); s.stonesEver = Math.max(s.stones, Math.min(s.stonesEver, 1e9));
    ['potions', 'runEarned', 'allEarned', 'best'].forEach(function (k) { if (s[k] > 1e300) s[k] = 1e300; });
    return s;
  }

  BW.core = {
    newState: newState, calc: calc, perk: perk,
    helperCost: helperCost, maxAffordable: maxAffordable, buyHelper: buyHelper,
    handCost: handCost, maxHands: maxHands, buyHands: buyHands, nextStage: nextStage, buyStage: buyStage,
    dailyInfo: dailyInfo, dailyAmount: dailyAmount, claimDaily: claimDaily,
    availableUpgrades: availableUpgrades, upgradeUnlocked: upgradeUnlocked, buyUpgrade: buyUpgrade,
    click: click, brewnado: brewnado, tick: tick, earn: earn,
    nextWispDelay: nextWispDelay, catchWisp: catchWisp, comboMult: comboMult,
    nextBubbleDelay: nextBubbleDelay, bubbleAmount: bubbleAmount, popBubble: popBubble,
    makeQuest: makeQuest, ensureQuests: ensureQuests, questProgress: questProgress, updateQuests: updateQuests,
    questReward: questReward, claimQuest: claimQuest,
    stonesForRun: stonesForRun, nextStoneAt: nextStoneAt, moonrise: moonrise,
    checkAchievements: checkAchievements, offlineGain: offlineGain,
    serialize: serialize, deserialize: deserialize
  };
})(typeof window !== 'undefined' ? (window.BW = window.BW || {}) : (global.BW = global.BW || {}));
