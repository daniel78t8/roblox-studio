"""Tests for Magic Hands, cauldron levels, lucky clicks and the daily gift."""
import json, os, sys, subprocess, datetime
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
today = datetime.date.today()
key = lambda d: d.strftime('%Y-%m-%d')

with sync_playwright() as p:
    # ---------------------------------------------------------------- Magic Hands
    b, page = open_page(p, make_state(potions=1000, runEarned=1000, allEarned=1000, clicks=50, runClicks=50, tut={'helper': True}))
    first = page.evaluate("() => document.querySelector('#helperList .item').className")
    check('Magic Hand is the first card', 'hand' in first, first)
    page.click('#helperList .item.hand'); page.wait_for_timeout(500)
    s = S(page)
    check('buying a Magic Hand costs 15', s['hands'] == 1 and abs(s['potions'] - (1000 - 15)) < 3, (s['hands'], s['potions']))
    check('one hand appears in the scene', page.evaluate('() => BW.scene.handsShown()') == 1)
    page.click('#buybar [data-buy="10"]'); page.click('#helperList .item.hand'); page.wait_for_timeout(300)
    s = S(page); c = C(page)
    check('×10 buys ten more hands', s['hands'] == 11, s['hands'])
    check('hand rate = hands / 10 s', abs(c['handRate'] - 1.1) < 1e-9, c['handRate'])
    t0, p0 = s['handTaps'], s['potions']
    page.wait_for_timeout(3000)
    s = S(page); c = C(page)
    check('hands tap over time (stats)', 2.5 < s['handTaps'] - t0 < 4.5, round(s['handTaps'] - t0, 2))
    check('hand income is added', s['potions'] - p0 > 0.8 * 3 * c['handPps'], (round(s['potions'] - p0, 2), c['handPps']))
    check('HUD shows total income', page.evaluate("() => document.getElementById('pps').textContent") != '0')
    page.evaluate("() => { window.__bw.S().potions = 1e6; window.__bw.refresh(); window.__bw.setTab('upgrades'); }"); page.wait_for_timeout(200)
    names = page.evaluate("() => Array.from(document.querySelectorAll('#upList .item .name')).map(e => e.textContent)")
    check('hand upgrades unlock (Velvet Gloves, Nimble Fingers)', 'Velvet Gloves' in names and 'Nimble Fingers' in names, names[:6])
    page.click("#upList .item:has-text('Velvet Gloves')"); page.wait_for_timeout(150)
    check('Velvet Gloves doubles hand power', C(page)['handPower'] == 2)
    b.close()

    # ---------------------------------------------------------------- Cauldron levels
    b, page = open_page(p, make_state(potions=3000, runEarned=3000, allEarned=3000, clicks=50, runClicks=50, tut={'helper': True}))
    page.evaluate("() => window.__bw.setTab('upgrades')"); page.wait_for_timeout(200)
    card = page.evaluate("() => { const c = document.querySelector('#upList .item.stage'); return c ? [c.className, c.textContent] : null; }")
    check('cauldron card on top of upgrades', card and 'Copper Cauldron' in card[1] and 'can' in card[0], card)
    badge = page.evaluate("() => +document.getElementById('upBadge').textContent")
    page.click('#upList .item.stage'); page.wait_for_timeout(250)
    s = S(page); c = C(page)
    check('buying a cauldron level', s['stage'] == 1 and abs(s['potions'] - 500) < 5, (s['stage'], s['potions']))
    check('level multiplies production & clicks (×1.3)', abs(c['stageMult'] - 1.3) < 1e-9 and abs(c['clickBase'] / c['achMult'] - 1.3) < 1e-6, (c['stageMult'], c['clickBase']))
    ban = page.evaluate("() => document.getElementById('banner').textContent")
    check('level-up banner', 'LEVEL UP!' in ban and 'Copper Cauldron' in ban, ban)
    check('next level card shows Silver', 'Silver Cauldron' in page.evaluate("() => document.querySelector('#upList .item.stage').textContent"))
    page.evaluate('() => window.__bw.save()'); page.reload(); page.wait_for_timeout(1200)
    st_after = S(page); check('cauldron level survives reload', st_after['stage'] == 1, (st_after['stage'], st_after['potions']))
    page.evaluate("() => { const S = window.__bw.S(); S.stage = 7; window.__bw.refresh(); window.__bw.setTab('upgrades'); }"); page.wait_for_timeout(200)
    check('max level card', 'max' in page.evaluate("() => document.querySelector('#upList .item.stage').className"))
    b.close()

    # ---------------------------------------------------------------- Lucky clicks
    b, page = open_page(p, make_state(potions=0, clicks=50, runClicks=50, tut={'helper': True}))
    r = page.evaluate("""() => { const r0 = Math.random; Math.random = () => 0.01; const p0 = window.__bw.S().potions, cp = window.__bw.C().clickNow;
      window.__bw.click(1); Math.random = r0; return [window.__bw.S().potions - p0, cp, window.__bw.S().lucky]; }""")
    check('lucky click gives ×7', abs(r[0] - 7 * r[1]) < 1e-6 and r[2] == 1, r)
    r = page.evaluate("""() => { const r0 = Math.random; Math.random = () => 0.5; const p0 = window.__bw.S().potions, cp = window.__bw.C().clickNow;
      window.__bw.click(1); Math.random = r0; return [window.__bw.S().potions - p0, cp]; }""")
    check('normal click unchanged', abs(r[0] - r[1]) < 1e-6, r)
    b.close()

    # ---------------------------------------------------------------- Daily gift
    yday = key(today - datetime.timedelta(days=1))
    b, page = open_page(p, make_state(potions=10, allEarned=5000, runEarned=5000, playTime=300, helpers=[20, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0], daily={'day': yday, 'streak': 2}))
    page.wait_for_timeout(1200)
    vis = page.evaluate("() => !document.getElementById('btnGift').classList.contains('hidden')")
    check('gift button shows when a gift is waiting', vis)
    page.click('#btnGift'); page.wait_for_timeout(300)
    today_box = page.evaluate("() => document.querySelector('#modal .gday.today .gd').textContent")
    check('streak continues (Day 3)', today_box == 'Day 3', today_box)
    p0 = S(page)['potions']; c = C(page)
    page.click('#modal .mfoot .btn'); page.wait_for_timeout(300)
    s = S(page)
    expect = max(300, c['ppsTotal'] * 60 * 20)
    check('gift amount = 20 min of production (day 3)', abs((s['potions'] - p0) - expect) / expect < 0.05, (round(s['potions'] - p0), round(expect)))
    check('gift claimed for today', s['daily']['day'] == key(today) and s['daily']['streak'] == 3, s['daily'])
    page.wait_for_timeout(1200)
    check('gift button hidden after claiming', page.evaluate("() => document.getElementById('btnGift').classList.contains('hidden')"))
    b.close()
    b, page = open_page(p, make_state(potions=10, allEarned=5000, runEarned=5000, playTime=300, daily={'day': key(today - datetime.timedelta(days=3)), 'streak': 5}))
    page.wait_for_timeout(1200)
    page.click('#btnGift'); page.wait_for_timeout(300)
    check('missed days reset the streak (Day 1)', page.evaluate("() => document.querySelector('#modal .gday.today .gd').textContent") == 'Day 1')
    b.close()
    b, page = open_page(p, make_state(potions=10, allEarned=10, playTime=5))
    page.wait_for_timeout(1200)
    check('no gift during the first minute of a new game', page.evaluate("() => document.getElementById('btnGift').classList.contains('hidden')"))
    b.close()

    # ---------------------------------------------------------------- Moonrise resets hands + level; German texts; stats
    b, page = open_page(p, make_state(potions=1e12, runEarned=1e12, allEarned=1e12, hands=30, stage=4, clicks=900, runClicks=900, helpers=[50, 30, 20, 10, 5, 0, 0, 0, 0, 0, 0]), locale='de-DE')
    check('German hand card', page.evaluate("() => document.querySelector('#helperList .item.hand .name').textContent") == 'Zauberhand')
    page.click('#btnRecords'); page.wait_for_timeout(200)
    page.click("#modal [data-r='stats']"); page.wait_for_timeout(200)
    txt = page.evaluate("() => document.querySelector('#modal .mbody').textContent")
    check('stats show cauldron, hands, lucky clicks', 'Jadekessel' in txt and 'Zauberhände' in txt and 'Glücksklicks' in txt, txt[:120])
    page.keyboard.press('Escape'); page.wait_for_timeout(100)
    page.evaluate("() => { window.__bw.core.moonrise(window.__bw.S()); window.__bw.refresh(); }"); page.wait_for_timeout(600)
    s = S(page)
    check('Moonrise resets hands and cauldron level', s['hands'] == 0 and s['stage'] == 0, (s['hands'], s['stage']))
    check('hands leave the scene after Moonrise', page.evaluate('() => BW.scene.handsShown()') == 0)
    b.close()

    # ---------------------------------------------------------------- save validation for the new fields
    b, page = open_page(p, make_state(potions=10))
    r = page.evaluate("""() => { const d = window.__bw.core.deserialize(JSON.stringify({ v: 1, hands: -4, stage: 99, lucky: 'x', daily: { day: 5, streak: -1 } }));
      return [d.hands, d.stage, d.lucky, d.daily.day, d.daily.streak]; }""")
    check('save validation of new fields', r == [0, 7, 0, '', 0], r)
    b.close()

check('no page errors', not errors, errors[:5])
fails = [r for r in results if not r[1]]
print('\n%d checks, %d failed' % (len(results), len(fails)))
sys.exit(1 if fails else 0)
