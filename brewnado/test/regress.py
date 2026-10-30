"""Regression tests for the independent QA findings (SDK timing, saving, dialogs, offline, toasts, keyboard)."""
import json, os, sys, re, subprocess
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = 'file://' + os.path.join(ROOT, 'dist', 'test', 'web.html') + '?debug=1'
CG = 'file://' + os.path.join(ROOT, 'dist', 'test', 'crazygames.html') + '?debug=1'
results, errors = [], []

def check(name, ok, info=''):
    results.append((name, bool(ok), info))
    print(('PASS ' if ok else 'FAIL ') + name + ('  -- ' + str(info) if info else ''))

def make_state(**kw):
    js = """
global.BW={}; require('%s/src/data.js'); require('%s/src/core.js');
const s = BW.core.newState(); Object.assign(s, %s); s.lastSave = s.lastSave || Date.now();
process.stdout.write(BW.core.serialize(s));""" % (ROOT, ROOT, json.dumps(kw))
    return subprocess.check_output(['node', '-e', js]).decode()

def mock(delay_ms=0, data=None, throw=False, mute=False, locale='en-US'):
    store = json.dumps(data or {})
    get = "throw new Error('dataModuleDisabled');" if throw else "__cg.push('getItem'); return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null;"
    sett = "throw new Error('dataModuleDisabled');" if throw else "__cg.push('setItem'); this._d[k] = String(v);"
    return """
window.__cg = [];
window.CrazyGames = { SDK: {
  environment: 'crazygames',
  init: function () { __cg.push('init'); return new Promise(function (r) { setTimeout(function () { __cg.push('init-resolved'); r(); }, %d); }); },
  game: { gameplayStart: function () { __cg.push('gameplayStart'); }, gameplayStop: function () { __cg.push('gameplayStop'); },
          loadingStart: function () { __cg.push('loadingStart'); }, loadingStop: function () { __cg.push('loadingStop'); },
          happytime: function () {}, settings: { muteAudio: %s }, addSettingsChangeListener: function (fn) { window.__cgSet = fn; } },
  user: { systemInfo: { locale: '%s' } },
  data: { _d: %s, getItem: function (k) { %s }, setItem: function (k, v) { %s }, removeItem: function (k) { delete this._d[k]; } }
}};""" % (delay_ms, 'true' if mute else 'false', locale, store, get, sett)

def open_page(p, url=WEB, state=None, route=None, w=1280, h=720, wait=1100, once=True):
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1)
    if route: ctx.route('**/crazygames-sdk-v3.js', route)
    if state is not None:
        if once:
            ctx.add_init_script("if(!sessionStorage.getItem('bwinit')){sessionStorage.setItem('bwinit','1');try{localStorage.setItem('brewnado.save.v1', %s)}catch(e){}}" % json.dumps(state))
        else:
            ctx.add_init_script("try{localStorage.setItem('brewnado.save.v1', %s)}catch(e){}" % json.dumps(state))
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
    page.on('console', lambda m: errors.append(m.type + ': ' + m.text) if m.type == 'error' and 'sdk' not in m.text.lower() else None)
    page.goto(url); page.wait_for_timeout(wait)
    return b, ctx, page

def fulfill(body):
    return lambda route: route.fulfill(status=200, content_type='application/javascript', body=body)

cloud = make_state(stones=340, stonesEver=340, potions=5000, runEarned=5000, allEarned=5000, lastSave=9e15)

with sync_playwright() as p:
    # M1a: slow SDK init (7 s) -> game waits behind the splash, then loads the cloud save
    b, ctx, page = open_page(p, CG, route=fulfill(mock(7000, {'brewnado.save.v1': cloud})), wait=3000)
    splash = page.evaluate("() => !!document.getElementById('splash') && !document.getElementById('splash').classList.contains('gone')")
    check('M1 splash covers the screen while SDK init is pending', splash)
    page.wait_for_timeout(6500)
    st = page.evaluate('() => window.__bw.S().stones')
    calls = page.evaluate('() => window.__cg')
    check('M1 slow init (7 s): cloud save loaded', st == 340, st)
    check('M1 slow init: loadingStart/loadingStop/gameplayStart sent', all(k in calls for k in ['loadingStart', 'loadingStop', 'gameplayStart']), calls)
    b.close()
    # M1b: SDK init slower than the fallback (11.5 s) -> SDK never adopted, cloud save untouched
    b, ctx, page = open_page(p, CG, route=fulfill(mock(11500, {'brewnado.save.v1': cloud})), wait=12500)
    page.evaluate('() => window.__bw.save()'); page.wait_for_timeout(200)
    calls = page.evaluate('() => window.__cg')
    cloud_now = page.evaluate("() => JSON.parse(window.CrazyGames.SDK.data._d['brewnado.save.v1']).stones")
    check('M1 init after fallback: SDK not adopted late (no setItem)', 'setItem' not in calls, calls)
    check('M1 init after fallback: cloud save not overwritten', cloud_now == 340, cloud_now)
    b.close()
    # M2: Data Module disabled (throws) -> local fallback both ways
    b, ctx, page = open_page(p, CG, route=fulfill(mock(0, throw=True)))
    page.evaluate('() => window.__bw.click(20)'); page.evaluate('() => window.__bw.save()')
    page.reload(); page.wait_for_timeout(1200)
    check('M2 data module throwing: progress survives reload', page.evaluate('() => window.__bw.S().clicks') == 20, page.evaluate('() => window.__bw.S().clicks'))
    b.close()
    # M3: Space/Enter in confirm dialogs never triggers the destructive action
    late = make_state(stones=340, stonesEver=340, potions=1e12, runEarned=8e11, allEarned=1e13, helpers=[50, 40, 30, 20, 10, 5, 0, 0, 0, 0, 0], lastSave=9e15)
    b, ctx, page = open_page(p, WEB, state=late)
    page.keyboard.press('Space'); page.keyboard.press('Space')
    page.click('#btnSettings'); page.wait_for_timeout(150)
    page.click('#btnReset'); page.wait_for_timeout(500)
    foc = page.evaluate("() => document.activeElement && document.activeElement.textContent")
    page.keyboard.press('Space'); page.wait_for_timeout(200)
    check('M3 reset confirm focuses the safe button', foc in ('Cancel', 'Abbrechen'), foc)
    check('M3 Space in reset confirm does not delete progress', page.evaluate('() => window.__bw.S().stones') == 340)
    page.keyboard.press('Escape'); page.wait_for_timeout(100)
    check('Escape closes dialogs', not page.evaluate('() => window.__bw.modalOpen()'))
    page.evaluate("() => window.__bw.setTab('magic')"); page.wait_for_timeout(150)
    page.click('#mgBtn'); page.wait_for_timeout(500)
    inside = page.evaluate("() => document.getElementById('app').inert ? 'inert' : 'not inert'")
    check('background is inert while a dialog is open', inside == 'inert', inside)
    page.keyboard.press('Enter'); page.wait_for_timeout(200)
    check('M3 Enter in Moonrise confirm does not start a Moonrise', page.evaluate('() => window.__bw.S().rebirths') == 0)
    page.keyboard.press('Escape'); page.wait_for_timeout(100)
    check('background active again after closing', page.evaluate("() => !document.getElementById('app').inert"))
    # Minor 2: Space brews after clicking a helper with the mouse
    page.evaluate("() => window.__bw.setTab('helpers')"); page.wait_for_timeout(100)
    c0 = page.evaluate('() => window.__bw.S().clicks')
    page.click('#helperList .item >> nth=0'); page.wait_for_timeout(100)
    for i in range(5): page.keyboard.press('Space'); page.wait_for_timeout(60)
    check('Space brews after a mouse click on a helper', page.evaluate('() => window.__bw.S().clicks') - c0 == 5, page.evaluate('() => window.__bw.S().clicks') - c0)
    # Brewnado banner carries the reward
    page.evaluate("() => { const S = window.__bw.S(); S.meter = window.__bw.C().meterCap - 1; window.__bw.click(1); }"); page.wait_for_timeout(150)
    ban = page.evaluate("() => document.getElementById('banner').textContent")
    check('Brewnado banner shows the reward amount', 'BREWNADO!' in ban and '+' in ban, ban)
    b.close()
    # M4: offline gain credited even if the page is reloaded before "Collect"
    import time as _t
    away = make_state(potions=1000, runEarned=1000, allEarned=1000, helpers=[10, 5, 2, 0, 0, 0, 0, 0, 0, 0, 0], lastSave=int(_t.time() * 1000) - 2 * 3600 * 1000)
    b, ctx, page = open_page(p, WEB, state=away, wait=1400)
    pot1 = page.evaluate('() => window.__bw.S().potions')
    modal = page.evaluate('() => window.__bw.modalOpen()')
    page.reload(); page.wait_for_timeout(1300)
    pot2 = page.evaluate('() => window.__bw.S().potions')
    check('M4 welcome popup shown', modal)
    check('M4 offline gain kept after reload without Collect', pot1 > 50000 and pot2 >= pot1 - 1, (round(pot1), round(pot2)))
    b.close()
    # Minor 1: queued toasts stay readable
    b, ctx, page = open_page(p, WEB, w=821, h=462)
    page.evaluate("() => { for (let i = 0; i < 3; i++) window.__bw.toast('potion', 'Toast ' + i, null, 'gold'); }")
    page.wait_for_timeout(1500)
    first = page.evaluate("() => Array.from(document.querySelectorAll('#toasts .toast:not(.out)')).map(t => t.textContent).join('|')")
    check('Minor 1 first toast still visible after 1.5 s', 'Toast 0' in first, first)
    page.wait_for_timeout(2600)
    second = page.evaluate("() => Array.from(document.querySelectorAll('#toasts .toast')).map(t => t.textContent).join('|')")
    check('Minor 1 queued toasts shown afterwards', 'Toast 1' in second or 'Toast 2' in second, second)
    b.close()
    # Minor 3: SDK mute at boot -> muted icon, button inactive
    b, ctx, page = open_page(p, CG, route=fulfill(mock(0, mute=True)))
    ic = page.evaluate("() => { const b = document.getElementById('btnSound'); return [b.innerHTML.indexOf('M42') > 0, b.classList.contains('off')]; }")
    s0 = page.evaluate('() => [window.__bw.S().settings.sfx, window.__bw.S().settings.music]')
    page.click('#btnSound'); page.wait_for_timeout(100)
    s1 = page.evaluate('() => [window.__bw.S().settings.sfx, window.__bw.S().settings.music]')
    check('Minor 3 SDK-muted at boot shows the muted icon', ic == [True, True], ic)
    check('Minor 3 sound button does not flip settings while SDK-muted', s0 == s1, (s0, s1))
    b.close()
    # Locale: SDK active with an empty locale -> English; de_DE -> German
    b, ctx, page = open_page(p, CG, route=fulfill(mock(0, locale='')))
    check('locale: SDK with empty locale uses English', page.evaluate('() => document.documentElement.lang') == 'en')
    b.close()
    b, ctx, page = open_page(p, CG, route=fulfill(mock(0, locale='de_DE')))
    check('locale: de_DE picks German', page.evaluate('() => document.documentElement.lang') == 'de')
    txt = page.evaluate("() => { window.__bw.setTab('magic'); return document.getElementById('mgNext').textContent; }")
    check('Minor 6 first Moonrise goal states 8 Mrd.', '8 Mrd.' in txt, txt)
    b.close()
    # number formatting + save validation
    b, ctx, page = open_page(p, WEB)
    f = page.evaluate("() => [window.__bw.fmt(1150000), window.__bw.fmt(4.56e15), window.__bw.fmt(1e6), window.__bw.fmt(999999)]")
    check('fmt float-safe truncation', f == ['1.15M', '4.56Qa', '1M', '999,999'], f)
    bad = json.dumps({'v': 1, 'helpers': [1e308, -5, 'x'], 'ach': {'zzz': True, 'brew1': True}, 'meter': 1e9, 'potions': 5})
    r = page.evaluate("(s) => { const d = window.__bw.core.deserialize(s); return [d.helpers[0], d.helpers[1], d.helpers[2], Object.keys(d.ach), d.meter]; }", bad)
    check('save validation clamps helpers/meter and drops unknown achievements', r[0] <= 100000 and r[1] == 0 and r[2] == 0 and 'zzz' not in r[3] and r[4] <= 100, r)
    # Minor 7: a short hidden period with an expiring Potion Rush is credited fairly
    res = page.evaluate("""() => {
      const S = window.__bw.S(); S.helpers[1] = 50; window.__bw.refresh();
      const base = window.__bw.C().ppsNow; S.buffs.rush = 3.3; window.__bw.refresh();
      const p0 = S.potions;
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
      const realNow = Date.now; Date.now = () => realNow() + 50000;
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
      Date.now = realNow;
      return [S.potions - p0, base]; }""")
    gain, base = res
    fair = base * (3.3 * 5 + 46.7)
    check('Minor 7 buffs expire on time during short absences', abs(gain - fair) / fair < 0.12, (round(gain), round(fair)))
    b.close()

# release builds have no debug hooks
for f in ('dist/web/index.html', 'dist/crazygames/index.html'):
    check('release build without debug hooks: ' + f, '__bw' not in open(os.path.join(ROOT, f)).read())
check('no page errors', not errors, errors[:5])
fails = [r for r in results if not r[1]]
print('\n%d checks, %d failed' % (len(results), len(fails)))
sys.exit(1 if fails else 0)
