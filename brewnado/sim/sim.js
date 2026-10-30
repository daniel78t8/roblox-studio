// Balancing simulation for Brewnado: greedy player buying the best payback item.
global.BW = {};
require('../src/data.js');
require('../src/core.js');
const C = BW.core;

function fmt(n) {
  if (n < 1e3) return n.toFixed(1);
  const u = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx'];
  let i = -1; while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
  return n.toFixed(2) + u[i];
}
function mmss(t) { const m = Math.floor(t / 60), s = Math.floor(t % 60); return m + ':' + String(s).padStart(2, '0'); }

function run(opts) {
  const cps = opts.cps, minutes = opts.minutes, rng = mulberry(opts.seed || 1);
  const s = opts.state || C.newState();
  let c = C.calc(s);
  const dt = 0.1;
  let t = 0, clickAcc = 0, wispActive = -1, lastBuyEval = 0;
  const log = [], firsts = {}, milestones = {}, stages = [];
  const marks = [1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e13];
  const reportAt = new Set((opts.report || [5, 10, 15, 20, 30, 45, 60, 90, 120]).map(m => m * 60));
  const wantStones = opts.stopAtStones || Infinity;
  const luck = 1 + BW.TUNE.luckyChance * (BW.TUNE.luckyMult - 1);
  function income(cc) { return cc.ppsNow + cc.handPpsNow + cps * cc.clickNow * luck; }
  while (t < minutes * 60) {
    // clicks
    clickAcc += cps * dt;
    while (clickAcc >= 1) { clickAcc -= 1; const r = C.click(s, c, rng()); if (r.nado) { c = C.calc(s); } }
    // wisps
    if (wispActive < 0) { s.wispIn -= dt; if (s.wispIn <= 0) wispActive = 2.0; }
    else { wispActive -= dt; if (wispActive <= 0) { if (rng() < (opts.catch ?? 0.9)) C.catchWisp(s, c, rng()); s.wispIn = C.nextWispDelay(s, c, rng()); wispActive = -1; c = C.calc(s); } }
    if (C.tick(s, c, dt)) c = C.calc(s);
    else if (s.buffs.rush > 0 || s.buffs.storm > 0 || s.buffs.nado > 0) c = C.calc(s);
    t += dt;
    // buying every second
    if (t - lastBuyEval >= 1) {
      lastBuyEval = t;
      for (let guard = 0; guard < 30; guard++) {
        const base = income(c); let best = null;
        for (let i = 0; i < BW.HELPERS.length; i++) {
          const cost = C.helperCost(s, i, 1);
          s.helpers[i]++; const nc = C.calc(s); s.helpers[i]--;
          const d = income(nc) - base; if (d <= 0) continue;
          const score = cost / d + Math.max(0, cost - s.potions) / Math.max(base, 1e-9);
          if (!best || score < best.score) best = { score, cost, kind: 'h', i };
        }
        {
          const cost = C.handCost(s, 1);
          s.hands++; const nc = C.calc(s); s.hands--;
          const d = income(nc) - base;
          if (d > 0) { const score = cost / d + Math.max(0, cost - s.potions) / Math.max(base, 1e-9); if (!best || score < best.score) best = { score, cost, kind: 'hand' }; }
        }
        const ns = C.nextStage(s);
        if (ns) {
          s.stage++; const nc = C.calc(s); s.stage--;
          const d = income(nc) - base;
          if (d > 0) { const score = ns.cost / d + Math.max(0, ns.cost - s.potions) / Math.max(base, 1e-9); if (!best || score < best.score) best = { score, cost: ns.cost, kind: 'stage' }; }
        }
        for (const u of C.availableUpgrades(s)) {
          s.ups[u.id] = true; const nc = C.calc(s); delete s.ups[u.id];
          let d = income(nc) - base;
          if (u.kind === 'nado' || u.kind === 'wisp') d = Math.max(d, base * 0.03); // rough value of utility upgrades
          if (d <= 0) continue;
          const score = u.cost / d + Math.max(0, u.cost - s.potions) / Math.max(base, 1e-9);
          if (!best || score < best.score) best = { score, cost: u.cost, kind: 'u', u };
        }
        if (!best || best.cost > s.potions) break;
        if (best.kind === 'h') { C.buyHelper(s, best.i, 1); if (!firsts[best.i]) { firsts[best.i] = t; } }
        else if (best.kind === 'hand') C.buyHands(s, 1);
        else if (best.kind === 'stage') { C.buyStage(s); stages.push(BW.STAGES[s.stage].id + '@' + mmss(t)); }
        else C.buyUpgrade(s, best.u.id);
        c = C.calc(s);
      }
      C.checkAchievements(s, c); c = C.calc(s);
      for (const m of marks) if (!milestones[m] && s.runEarned >= m) milestones[m] = t;
      const sec = Math.round(t);
      if (reportAt.has(sec) && !log.find(l => l.sec === sec)) {
        log.push({ sec, pps: c.pps, hpps: c.handPps, click: c.clickPower, earned: s.runEarned, stones: C.stonesForRun(s), helpers: c.helpersOwned, hands: s.hands, stage: s.stage, ups: c.upsOwned, ach: c.achCount, nados: s.runNados, wisps: s.wisps });
      }
      if (C.stonesForRun(s) >= wantStones) break;
    }
  }
  return { s, c, t, log, firsts, milestones, stages };
}

function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function report(name, r) {
  console.log('\n=== ' + name + ' ===');
  console.log('first helper times:', Object.entries(r.firsts).map(([i, t]) => BW.HELPERS[i].id + '@' + mmss(t)).join('  '));
  console.log('earned milestones:', Object.entries(r.milestones).map(([m, t]) => fmt(+m) + '@' + mmss(t)).join('  '));
  console.log('cauldron levels:', r.stages.join('  '));
  for (const l of r.log) console.log(`${mmss(l.sec).padStart(6)}  pps ${fmt(l.pps).padStart(8)}  hands/s ${fmt(l.hpps).padStart(8)}  click ${fmt(l.click).padStart(8)}  earned ${fmt(l.earned).padStart(8)}  stones ${String(l.stones).padStart(4)}  helpers ${l.helpers}  hands ${l.hands}  lvl ${l.stage}  ups ${l.ups}  ach ${l.ach}`);
}

const active = run({ cps: 5, minutes: 120, seed: 7 });
report('Active player (5 clicks/s), run 1', active);
const casual = run({ cps: 2, minutes: 120, seed: 3, catch: 0.6 });
report('Casual player (2 clicks/s), run 1', casual);

// Second run after a Moonrise at 60 minutes (active player)
const r1 = run({ cps: 5, minutes: 60, seed: 11 });
const st = r1.s; const gained = C.moonrise(st);
console.log('\nMoonrise after 60 min -> stones gained:', gained, 'perk p1:', C.perk(st, 'p1'));
const r2 = run({ cps: 5, minutes: 60, seed: 12, state: st });
report('Active player, run 2 (after moonrise at 60 min)', r2);
