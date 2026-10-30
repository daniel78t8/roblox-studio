"""Tests for the 2.0 features: combo + FEVER, jackpots, bubbles, quests, new helpers/levels/upgrades and save compatibility."""
import json, os, sys, subprocess
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = 'file://' + os.path.join(ROOT, 'dist', 'test', 'web.html') + '?debug=1'
results, errors = [], []

def check(name, ok, info=''):
    results.append((name, bool(ok), info))
    print(('PASS ' if ok else 'FAIL ') + name + ('  -- ' + str(info) if info else ''))

def make_state(**kw):
    js = """global.BW={}; require('%s/src/data.js'); require('%s/src/core.js');
const s = BW.core.newState(); Object.assign(s, %s); s.lastSave = 9e15; process.stdout.write(BW.core.serialize(s));""" % (ROOT, ROOT, json.dumps(kw))
    return subprocess.check_output(['node', '-e', js]).decode()

def node(expr):
    js = "global.BW={}; require('%s/src/data.js'); require('%s/src/core.js'); const C = BW.core; process.stdout.write(JSON.stringify((function(){ %s })()));" % (ROOT, ROOT, expr)
    return json.loads(subprocess.check_output(['node', '-e', js]).decode())

def open_page(p, state, w=1280, h=720, locale='en-US'):
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1, locale=locale)
    ctx.add_init_script("if(!sessionStorage.getItem('bwinit')){sessionStorage.setItem('bwinit','1');try{localStorage.setItem('brewnado.save.v1', %s)}catch(e){}}" % json.dumps(state))
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
    page.on('console', lambda m: errors.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    page.goto(WEB); page.wait_for_timeout(1300)
    return b, page

S = lambda page: page.evaluate('() => window.__bw.S()')
C = lambda page: page.evaluate('() => window.__bw.C()')
TUT = {'helper': True, 'up': True, 'upToast': True, 'combo': True, 'bubble': True}

# ---------------------------------------------------------------- pure economy (node)
r = node("""const s = C.newState(); let c = C.calc(s); const gains = [];
  for (let i = 0; i < 31; i++) { gains.push(C.click(s, c, 0.5).gain); c = C.calc(s); }
  return [gains[0], gains[1], gains[30], s.combo, s.comboBest];""")
check('combo: 1st hit ×1, 2nd ×1.01, capped at +30%', abs(r[0] - 1) < 1e-9 and abs(r[1] - 1.01) < 1e-9 and abs(r[2] - 1.3) < 1e-9 and r[3] == 31 and r[4] == 31, r)
r = node("""const s = C.newState(); let c = C.calc(s); C.click(s, c, 0.5); C.click(s, c, 0.5);
  C.tick(s, c, c.comboWindow * 0.5); const kept = s.combo; C.tick(s, c, c.comboWindow); return [kept, s.combo, s.comboBest];""")
check('combo breaks after the combo window', r == [2, 0, 2], r)
r = node("""const s = C.newState(); s.meter = -1000; let c = C.calc(s); let fever = 0;
  for (let i = 0; i < 100; i++) { const x = C.click(s, c, 0.5); if (x.fever) fever = i + 1; c = C.calc(s); }
  return [fever, s.buffs.fever, s.fevers, c.clickBuff];""")
check('FEVER starts at a 100 combo and doubles clicks', r[0] == 100 and r[1] > 0 and r[2] == 1 and r[3] == 2, r)
r = node("""const s = C.newState(); s.ups.k4 = true; let c = C.calc(s); return [c.feverMult, c.feverSec];""")
check('Fever Dream: FEVER ×3 for 9 s', r == [3, 9], r)
r = node("""const s = C.newState(); s.ups.l1 = true; s.ups.l2 = true; s.ups.l3 = true; s.ups.l4 = true; const c = C.calc(s);
  return [c.luckyChance, c.luckyMult, c.jackpotChance, c.jackpotMult];""")
check('luck upgrades', abs(r[0] - 0.055) < 1e-9 and r[1] == 10 and abs(r[2] - 0.006) < 1e-9 and r[3] == 60, r)
r = node("""const s = C.newState(); s.helpers[3] = 10; let c = C.calc(s); const a = C.bubbleAmount(s, c, false), g = C.bubbleAmount(s, c, true);
  const got = C.popBubble(s, c, true); return [a, g, got, s.bubbles, c.ppsTotal * 6 + c.clickPower * 8];""")
check('bubble reward = 6 s production + 8 clicks, golden ×6', abs(r[0] - r[4]) < 1e-6 and abs(r[1] - 6 * r[0]) < 1e-6 and abs(r[2] - r[1]) < 1e-6 and r[3] == 1, r)
r = node("""const s = C.newState(); let c = C.calc(s); let n = 0; const rnd = () => (n++ % 10) / 10;
  C.ensureQuests(s, c, rnd); const kinds = s.quests.map(q => q.k);
  const qi = s.quests.findIndex(q => q.k === 'click'); const need = s.quests[qi].n;
  for (let i = 0; i < need; i++) C.click(s, c, 0.5);
  const done = C.updateQuests(s).indexOf(qi) >= 0; const p0 = s.potions; const got = C.claimQuest(s, c, qi, 0.3);
  return [kinds, done, got > 0, s.potions - p0 === got, s.questsDone, s.quests.length, new Set(s.quests.map(q => q.k)).size];""")
check('quests: three different kinds', len(set(r[0])) == 3, r[0])
check('quests: finishing + claiming pays out and refills', r[1] and r[2] and r[3] and r[4] == 1 and r[5] == 3 and r[6] == 3, r)
r = node("""const s = C.newState(); let c = C.calc(s); s.quests = [{ k: 'combo', n: 20, b: 0, p: 0, done: false }];
  for (let i = 0; i < 20; i++) C.click(s, c, 0.5); C.tick(s, c, 5); const d = C.updateQuests(s); return [s.combo, d, s.quests[0].done];""")
check('combo quest counts even if the combo already broke', r == [0, [0], True], r)
r = node("""const d = C.deserialize(JSON.stringify({ v: 1, potions: 5, helpers: [3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0], ups: { c1: true, k9: true },
  buffs: { rush: 0, storm: 0, nado: 0 } }));
  return [d.helpers.length, d.helpers[0], d.combo, d.comboBest, d.quests.length, d.buffs.fever, d.bubbleIn > 0, Object.keys(d.ups)];""")
check('old 1.0 save loads with defaults for all new fields', r == [13, 3, 0, 0, 0, 0, True, ['c1']], r)
r = node("""const d = C.deserialize(JSON.stringify({ v: 1, comboBest: -3, jackpots: 'x', bubbles: 1e99, questsDone: 2.7, buffs: { fever: 9999 },
  quests: [{ k: 'click', n: 50, b: 3, done: true }, { k: 'evil', n: 1 }, { k: 'click', n: 5 }, { k: 'earn', n: -1, b: 'x' }, { k: 'wisp', n: 1 }, { k: 'buy', n: 3 }] }));
  return [d.comboBest, d.jackpots, d.bubbles, d.questsDone, d.buffs.fever, d.quests];""")
check('save validation of 2.0 fields', r[:5] == [0, 0, 1e9, 2, 600] and [q['k'] for q in r[5]] == ['click', 'earn', 'wisp'] and r[5][0]['done'] is True and r[5][1]['n'] == 1 and r[5][1]['b'] == 0, r)
r = node("""return [BW.HELPERS.length, BW.UPGRADES.length, BW.ACHIEVEMENTS.length, BW.STAGES.length, new Set(BW.UPGRADES.map(u => u.id)).size,
  BW.UPGRADES.filter(u => !u.en || !u.de).length];""")
check('content: 13 helpers, 121 upgrades, 59 achievements, 10 levels, unique ids, all names', r == [13, 121, 59, 10, 121, 0], r)
r = node("""const s = C.newState(); s.potions = 1e30; s.helpers[11] = 1; s.helpers[12] = 1; const c = C.calc(s);
  return [c.helperPps[11] > c.helperPps[10], c.helperPps[12] > c.helperPps[11], C.helperCost(s, 12, 1) > C.helperCost(s, 11, 1)];""")
check('new helpers are stronger and pricier', r == [True, True, True], r)

with sync_playwright() as p:
    # ---------------------------------------------------------------- combo in the browser: HUD, words, FEVER banner
    b, page = open_page(p, make_state(potions=0, clicks=50, runClicks=50, tut=TUT))
    page.evaluate("() => { window.__bw.S().meter = -1000; const r0 = Math.random; Math.random = () => 0.5; window.__bw.click(99); Math.random = r0; }")
    s = S(page)
    check('99 fast clicks = 99 combo', s['combo'] == 99 and s['comboBest'] == 99, (s['combo'], s['comboBest']))
    page.evaluate("() => { const r0 = Math.random; Math.random = () => 0.5; window.__bw.click(1); Math.random = r0; }")
    page.wait_for_timeout(150)
    s = S(page)
    ban = page.evaluate("() => [document.getElementById('banner').className, document.getElementById('banner').textContent]")
    buffs = page.evaluate("() => document.getElementById('buffs').textContent")
    check('FEVER banner and buff chip', s['buffs']['fever'] > 0 and 'show' in ban[0] and 'FEVER!' in ban[1] and 'FEVER' in buffs, (ban, buffs))
    page.wait_for_timeout(1700)
    s = S(page)
    check('combo resets when you stop clicking', s['combo'] == 0, s['combo'])
    check('combo + FEVER achievements unlocked', all(s['ach'].get(k) for k in ['combo_25', 'combo_100', 'fever_1']), [k for k in s['ach'] if k.startswith(('combo', 'fever'))])
    b.close()

    # ---------------------------------------------------------------- bubbles
    b, page = open_page(p, make_state(potions=0, clicks=50, runClicks=50, helpers=[10, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], tut=TUT))
    page.evaluate('() => window.__bw.spawnBubble(true)'); page.wait_for_timeout(700)
    bp = page.evaluate('() => window.__bw.bubble()')
    check('bubble floats out of the cauldron', bp is not None and bp['y'] < page.evaluate('() => window.__bw.L().cy'), bp)
    if bp:
        box = page.evaluate("() => { const r = document.getElementById('scene').getBoundingClientRect(); return [r.left, r.top]; }")
        bp = page.evaluate('() => window.__bw.bubble()')
        p0 = S(page)['potions']
        page.mouse.click(box[0] + bp['x'], box[1] + bp['y']); page.wait_for_timeout(150)
        s = S(page)
        check('popping a golden bubble pays out', s['bubbles'] == 1 and s['potions'] - p0 > 10 and page.evaluate('() => window.__bw.bubble()') is None, (s['bubbles'], s['potions'] - p0))
    page.evaluate("() => { window.__bw.S().bubbleIn = 0; }"); page.wait_for_timeout(300)
    check('bubbles spawn on their own timer', page.evaluate('() => window.__bw.bubble()') is not None and S(page)['bubbleIn'] > 5)
    b.close()

    # ---------------------------------------------------------------- quests: bar, dialog, claim
    b, page = open_page(p, make_state(potions=0, clicks=50, runClicks=50, allEarned=500, runEarned=500, helpers=[10, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                                     quests=[{'k': 'click', 'n': 5, 'b': 50, 'p': 0, 'done': False}, {'k': 'buy', 'n': 50, 'b': 0, 'p': 0, 'done': False},
                                             {'k': 'combo', 'n': 300, 'b': 0, 'p': 0, 'done': False}], tut=TUT))
    bar = page.evaluate("() => { const b = document.getElementById('questBar'); return [b.classList.contains('hidden'), b.textContent]; }")
    check('quest bar shows the closest quest', not bar[0] and 'Click the cauldron 5 times' in bar[1] and '0 / 5' in bar[1], bar)
    page.evaluate("() => { const r0 = Math.random; Math.random = () => 0.5; window.__bw.click(5); Math.random = r0; window.__bw.checkQuests(); }")
    page.wait_for_timeout(250)
    bar = page.evaluate("() => { const b = document.getElementById('questBar'); return [b.className, b.textContent]; }")
    check('finished quest: glowing bar', 'ready' in bar[0] and 'Reward ready!' in bar[1] and S(page)['quests'][0]['done'], bar)
    toasts = ''
    for i in range(12):
        toasts += page.evaluate("() => document.getElementById('toasts').textContent"); page.wait_for_timeout(500)
    check('finished quest: toast', 'Quest complete!' in toasts, toasts[:200])
    page.click('#questBar'); page.wait_for_timeout(250)
    rows = page.evaluate("() => Array.from(document.querySelectorAll('#modal .quest')).map(e => [e.className, e.querySelector('.qclaim').disabled])")
    check('quest dialog: 3 quests, only the done one can be claimed', rows == [['quest done', False], ['quest', True], ['quest', True]], rows)
    focus = page.evaluate("() => document.activeElement && document.activeElement.textContent")
    check('quest dialog focuses Close', focus == 'Close', focus)
    p0 = S(page)['potions']
    page.click('#modal .qclaim >> nth=0'); page.wait_for_timeout(250)
    s = S(page)
    check('claiming pays out and a new quest appears', s['questsDone'] == 1 and s['potions'] > p0 and len(s['quests']) == 3 and not s['quests'][0]['done'], (s['questsDone'], s['potions'] - p0, s['quests']))
    check('dialog stays open after claiming', page.evaluate('() => window.__bw.modalOpen()') and page.evaluate("() => document.querySelectorAll('#modal .quest').length") == 3)
    page.keyboard.press('Escape'); page.wait_for_timeout(100)
    page.evaluate('() => window.__bw.save()'); page.reload(); page.wait_for_timeout(1200)
    s2 = S(page)
    check('quests survive reload', s2['questsDone'] == 1 and [q['k'] for q in s2['quests']] == [q['k'] for q in s['quests']], s2['quests'])
    b.close()

    # ---------------------------------------------------------------- new content in the UI, German texts
    b, page = open_page(p, make_state(potions=1e16, runEarned=1e17, allEarned=1e17, clicks=900, runClicks=900, comboBest=300, lucky=100, bubbles=50, stage=7,
                                     helpers=[50, 30, 20, 10, 5, 3, 2, 2, 2, 2, 2, 0, 0], tut=TUT), locale='de-DE')
    names = page.evaluate("() => Array.from(document.querySelectorAll('#helperList .item .name')).map(e => e.textContent)")
    check('German: unicorn card, portal is the mystery card', names[-2] == 'Regenbogen-Einhorn' and names[-1] == '???', names[-3:])
    page.evaluate("() => window.__bw.setTab('upgrades')"); page.wait_for_timeout(200)
    up = page.evaluate("() => document.getElementById('upList').textContent")
    check('German: Candy Cauldron + combo/luck/bubble upgrades', all(x in up for x in ['Zuckerkessel', 'Fester Rhythmus', 'Vierblättriges Kleeblatt', 'Seifenblasenstab', 'Combo hält']), up[:200])
    page.click('#btnRecords'); page.wait_for_timeout(200)
    page.click("#modal [data-r='stats']"); page.wait_for_timeout(200)
    txt = page.evaluate("() => document.querySelector('#modal .mbody').textContent")
    check('German stats: combo, jackpots, bubbles, quests', all(x in txt for x in ['Bestes Combo', 'Jackpots', 'Geplatzte Blasen', 'Geschaffte Quests']), txt[:160])
    b.close()

    # ---------------------------------------------------------------- phone portrait: combo counter stays on screen
    b, page = open_page(p, make_state(potions=0, clicks=50, runClicks=50, tut=TUT), 360, 640)
    pos = page.evaluate("() => { const r0 = Math.random; Math.random = () => 0.5; window.__bw.click(40); Math.random = r0; return [BW.scene.comboPos(), document.getElementById('scene').clientWidth, window.__bw.L()]; }")
    check('phone: combo counter inside the stage', pos[0]['x'] + pos[2]['R'] * 0.5 <= pos[1] and pos[0]['y'] > 0, pos)
    b.close()

check('no page errors', not errors, errors[:5])
fails = [r for r in results if not r[1]]
print('\n%d checks, %d failed' % (len(results), len(fails)))
sys.exit(1 if fails else 0)
