"""Functional + layout + performance + SDK tests for Brewnado."""
import json, os, sys, time, math
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = 'file://' + os.path.join(ROOT, 'dist', 'test', 'web.html') + '?debug=1'
CG = 'file://' + os.path.join(ROOT, 'dist', 'test', 'crazygames.html') + '?debug=1'
results, errors = [], []


def check(name, ok, info=''):
    results.append((name, bool(ok), info))
    print(('PASS ' if ok else 'FAIL ') + name + ('  -- ' + str(info) if info else ''))


def new_page(p, w=1280, h=720, locale='en-US', state=None, url=WEB, touch=False, route=None):
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': w, 'height': h}, locale=locale, device_scale_factor=1, has_touch=touch, is_mobile=touch)
    if route:
        ctx.route('**/crazygames-sdk-v3.js', route)
    if state is not None:
        ctx.add_init_script("if(!sessionStorage.getItem('bwinit')){sessionStorage.setItem('bwinit','1');try{localStorage.setItem('brewnado.save.v1', %s)}catch(e){}}" % json.dumps(state))
    page = ctx.new_page()
    tag = '%dx%d' % (w, h)
    page.on('console', lambda m: errors.append(tag + ' ' + m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    page.on('pageerror', lambda e: errors.append(tag + ' pageerror: ' + str(e)))
    page.goto(url)
    page.wait_for_timeout(1100)
    return b, ctx, page


def S(page, expr='S'):
    return page.evaluate('() => window.__bw.S()' if expr == 'S' else expr)


def canvas_xy(page):
    return page.evaluate("() => { const r = document.getElementById('scene').getBoundingClientRect(); const L = window.__bw.L(); return {x: r.left + L.cx, y: r.top + L.cy, R: L.R, left: r.left, top: r.top}; }")


def make_state(**kw):
    import subprocess
    js = """
global.BW={}; require('%s/src/data.js'); require('%s/src/core.js');
const s = BW.core.newState(); Object.assign(s, %s); s.lastSave = s.lastSave || Date.now();
process.stdout.write(BW.core.serialize(s));""" % (ROOT, ROOT, json.dumps(kw))
    return subprocess.check_output(['node', '-e', js]).decode()


with sync_playwright() as p:
    # ------------------------------------------------------------ fresh game flow
    b, ctx, page = new_page(p)
    hint = page.evaluate("() => { const h = document.getElementById('hint'); return h.classList.contains('hidden') ? '' : h.textContent; }")
    check('tutorial hint shown on fresh start', 'cauldron' in hint.lower(), hint)
    c = canvas_xy(page)
    for i in range(20):
        page.mouse.click(c['x'], c['y'])
        page.wait_for_timeout(40)
    s = S(page)
    # one unbroken combo: hit i is worth 1 + 1% * (i - 1); lucky clicks add 6x, jackpots 39x of their hit
    base, extra = 20 + 0.01 * 190, 6 * s['lucky'] + 39 * s['jackpots']
    check('20 mouse clicks brew 20 potions (+combo, lucky, jackpots)', base + extra - 1e-6 <= s['potions'] <= base + extra * 1.19 + 1e-6 and s['clicks'] == 20 and s['comboBest'] == 20,
          (s['potions'], s['clicks'], s['lucky'], s['jackpots'], s['comboBest']))
    page.wait_for_timeout(150)
    check('hint hidden after 5 clicks', page.evaluate("() => document.getElementById('hint').classList.contains('hidden')"))
    cls = page.evaluate("() => document.querySelector('#helperList .item.helper').className")
    check('spoon card affordable + glowing hint', 'can' in cls and 'hint-glow' in cls, cls)
    p0 = S(page)['potions']
    page.click('#helperList .item.helper >> nth=0')
    page.wait_for_timeout(100)
    s = S(page)
    check('buying a spoon costs 12', s['helpers'][0] == 1 and abs(p0 - s['potions'] - 12) < 0.6, (s['helpers'][0], p0, s['potions']))
    page.click('#helperList .item.helper >> nth=1')
    page.wait_for_timeout(50)
    s = S(page)
    check('cannot buy unaffordable frog', s['helpers'][1] == 0)
    for i in range(110):
        page.mouse.click(c['x'], c['y'])
        page.wait_for_timeout(36)
    page.wait_for_timeout(250)
    s = S(page)
    badge = page.evaluate("() => { const b = document.getElementById('upBadge'); return b.classList.contains('hidden') ? 0 : +b.textContent; }")
    check('upgrade badge appears', badge >= 1, (badge, s['potions']))
    page.click('.tab[data-tab="upgrades"]')
    page.wait_for_timeout(150)
    names = page.evaluate("() => Array.from(document.querySelectorAll('#upList .item .name')).map(e => e.textContent)")
    check('Sturdy Ladle offered', 'Sturdy Ladle' in names, names)
    idx = names.index('Sturdy Ladle') + 1 if 'Sturdy Ladle' in names else 1
    before = S(page)['potions']
    page.click('#upList .item:nth-of-type(%d)' % idx)
    page.wait_for_timeout(120)
    s = S(page); cc = page.evaluate('() => window.__bw.C()')
    check('buying Sturdy Ladle doubles clicks', s['ups'].get('c1') and abs(cc['clickPower'] - 2 * cc['achMult']) < 1e-6, (cc['clickPower'], s['potions'], before))
    # brewnado
    page.evaluate("() => { const S = window.__bw.S(); S.meter = window.__bw.C().meterCap - 1; }")
    nd = S(page)['nados']
    page.mouse.click(c['x'], c['y'])
    page.wait_for_timeout(120)
    s = S(page)
    banner = page.evaluate("() => document.getElementById('banner').className")
    check('Brewnado triggers when meter is full', s['nados'] == nd + 1 and s['buffs']['nado'] > 0 and s['meter'] == 0 and 'show' in banner, (s['nados'], s['buffs'], banner))
    # wisp
    page.evaluate("() => window.__bw.spawnWisp()")
    page.wait_for_timeout(1000)
    w = page.evaluate("() => window.__bw.wisp()")
    check('wisp spawns', w is not None, w)
    if w:
        page.mouse.click(c['left'] + w['x'], c['top'] + w['y'])
        page.wait_for_timeout(150)
        s = S(page)
        check('catching the wisp works', s['wisps'] == 1, s['wisps'])
    # keyboard
    page.click('.tab[data-tab="helpers"]')
    page.evaluate("() => document.activeElement && document.activeElement.blur()")
    k0 = S(page)['clicks']
    for i in range(3):
        page.keyboard.press('Space'); page.wait_for_timeout(60)
    page.keyboard.down('Space'); page.wait_for_timeout(700); page.keyboard.up('Space')
    k1 = S(page)['clicks']
    check('Space key clicks (no auto-repeat)', k1 - k0 == 4, k1 - k0)
    # rate limit
    k0 = S(page)['clicks']
    page.evaluate("""() => { const cv = document.getElementById('scene'), r = cv.getBoundingClientRect(), L = window.__bw.L();
      for (let i = 0; i < 100; i++) cv.dispatchEvent(new PointerEvent('pointerdown', {clientX: r.left + L.cx, clientY: r.top + L.cy, bubbles: true, cancelable: true, pointerType: 'mouse'})); }""")
    k1 = S(page)['clicks']
    check('click rate is capped (anti auto-clicker)', 0 < k1 - k0 <= 30, k1 - k0)
    # save + reload
    page.evaluate('() => window.__bw.save()')
    before = S(page)
    page.reload(); page.wait_for_timeout(1100)
    after = S(page)
    check('progress survives reload', after['helpers'][0] == before['helpers'][0] and after['clicks'] == before['clicks'] and abs(after['potions'] - before['potions']) < max(5, before['potions'] * 0.05), (before['potions'], after['potions']))
    # settings: language + sound + reset
    page.click('#btnSettings'); page.wait_for_timeout(150)
    page.click('#modal [data-seg="lang"] button[data-v="de"]'); page.wait_for_timeout(150)
    lang = page.evaluate("() => [document.documentElement.lang, document.querySelector('.tab .tl').textContent]")
    check('language switch to German', lang == ['de', 'Helfer'], lang)
    page.click('#modal .xbtn'); page.wait_for_timeout(100)
    check('modal closes', not page.evaluate('() => window.__bw.modalOpen()'))
    page.click('#btnSound'); page.wait_for_timeout(100)
    s = S(page)
    check('mute button turns sound + music off', s['settings']['sfx'] is False and s['settings']['music'] is False)
    page.click('#btnSound'); page.wait_for_timeout(50)
    page.click('#btnSettings'); page.wait_for_timeout(100)
    page.click('#btnReset'); page.wait_for_timeout(100)
    page.click('#modal .btn.danger'); page.wait_for_timeout(200)
    s = S(page)
    check('reset clears progress, keeps settings', s['clicks'] == 0 and sum(s['helpers']) == 0 and s['settings']['lang'] == 'de', (s['clicks'], s['settings']))
    b.close()

    # ------------------------------------------------------------ offline progress
    st = make_state(helpers=[10, 5, 2, 0, 0, 0, 0, 0, 0, 0, 0], potions=1000, runEarned=5000, allEarned=5000, clicks=300, runClicks=300,
                    lastSave=int(time.time() * 1000) - 2 * 3600 * 1000, tut={'helper': True})
    b, ctx, page = new_page(p, state=st)
    page.wait_for_timeout(600)
    modal = page.evaluate("() => document.querySelector('#modal h2') && document.querySelector('#modal h2').textContent")
    check('welcome-back popup after 2 hours', modal == 'Welcome back!', modal)
    pps = page.evaluate('() => window.__bw.C().pps')
    shown = page.evaluate("() => document.querySelector('#modal .amt span').textContent")
    after = S(page)['potions']           # the offline gain is credited on load (the dialog only informs)
    page.click('#modal .mfoot .btn'); page.wait_for_timeout(150)
    expect = pps * 7200 * 0.5
    check('offline gain = 50% of 2h production (credited on load)', abs((after - 1000) - expect) / expect < 0.08, (round(after - 1000), round(expect), shown))
    check('Collect closes the welcome dialog', not page.evaluate('() => window.__bw.modalOpen()'))
    b.close()

    # ------------------------------------------------------------ moonrise
    st = make_state(helpers=[40, 30, 20, 10, 5, 2, 0, 0, 0, 0, 0], potions=5e11, runEarned=2.7e13, allEarned=2.7e13, clicks=900, runClicks=900, tut={'helper': True, 'up': True, 'upToast': True})
    b, ctx, page = new_page(p, state=st)
    page.click('.tab[data-tab="magic"]'); page.wait_for_timeout(200)
    dis = page.evaluate("() => document.getElementById('mgBtn').disabled")
    check('Moonrise button enabled', dis is False)
    page.click('#mgBtn'); page.wait_for_timeout(150)
    page.click('#modal .btn.moon'); page.wait_for_timeout(250)
    s = S(page)
    check('Moonrise grants 30 stones and resets the night', s['stones'] == 30 and s['potions'] < 50 and s['helpers'][2] == 0 and s['rebirths'] == 1, (s['stones'], s['potions'], s['helpers']))
    check('Moonlit Start perk gives 10 spoons + 2 frogs', s['helpers'][0] == 10 and s['helpers'][1] == 2)
    cc = page.evaluate('() => window.__bw.C()')
    check('stones boost production (+300%)', abs(cc['stoneMult'] - 4.0) < 1e-9, cc['stoneMult'])
    b.close()

    # ------------------------------------------------------------ layouts
    mid = open(os.path.join(ROOT, 'test', 'fixtures', 'state_mid.json')).read()
    m = json.loads(mid); m['lastSave'] = 9e15; mid = json.dumps(m)
    for (w, h, touch) in [(907, 510, False), (1216, 684, False), (1280, 720, False), (1920, 1080, False), (800, 450, True), (1080, 607, True),
                          (390, 844, True), (360, 640, True), (768, 1024, True), (1024, 768, True)]:
        for state in (None, mid):
            b, ctx, page = new_page(p, w, h, state=state, touch=touch)
            r = page.evaluate("""() => {
              const rect = id => document.getElementById(id).getBoundingClientRect();
              const inter = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
              const hud = rect('count'), L = rect('cornerL'), R = rect('cornerR');
              const items = Array.from(document.querySelectorAll('.item')).filter(e => e.offsetParent);
              const over = items.filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent.slice(0, 30));
              const tabsOver = Array.from(document.querySelectorAll('.tab')).filter(e => e.querySelector('.tl').getBoundingClientRect().width > e.clientWidth - 4).length;
              let minFont = 99;
              document.querySelectorAll('#app *').forEach(e => { if (!e.offsetParent || !e.childNodes.length) return;
                for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { const f = parseFloat(getComputedStyle(e).fontSize); if (f < minFont) minFont = f; } });
              return { docOverflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight,
                hudCorner: inter(hud, L) || inter(hud, R), over, tabsOver, minFont, cls: document.getElementById('app').className,
                meterIn: rect('meter').bottom <= rect('stage').bottom + 1 && rect('meter').left >= rect('stage').left };
            }""")
            ok = not r['docOverflow'] and not r['hudCorner'] and not r['over'] and not r['tabsOver'] and r['minFont'] >= 9.5 and r['meterIn']
            check('layout %dx%d %s' % (w, h, 'mid' if state else 'fresh'), ok, r)
            b.close()

    # ------------------------------------------------------------ performance (CPU throttle ~ low-end Chromebook; software rendering here)
    for rate in (1, 2, 4):
        b, ctx, page = new_page(p, 1280, 720, state=mid)
        cdp = ctx.new_cdp_session(page)
        cdp.send('Emulation.setCPUThrottlingRate', {'rate': rate})
        page.wait_for_timeout(5000)
        page.evaluate("() => { window.__f = []; let last = performance.now(); (function loop(t){ window.__f.push(t - last); last = t; if (window.__f.length < 300) requestAnimationFrame(loop); })(performance.now()); }")
        page.wait_for_timeout(6000)
        f = page.evaluate('() => window.__f.slice(10)')
        q = page.evaluate('() => window.__bw && 1')
        avg = sum(f) / max(1, len(f))
        p95 = sorted(f)[int(len(f) * 0.95)] if f else 999
        info = 'avg %.1f ms (%.0f fps), p95 %.1f ms' % (avg, 1000 / avg if avg else 0, p95)
        if rate == 1: check('performance normal CPU: ~60 fps', avg < 18.5, info)
        elif rate == 2: check('performance 2x CPU throttle: >= 45 fps', avg < 22.3, info)
        else: check('performance 4x CPU throttle (software rendering): >= 25 fps', avg < 40, info)
        b.close()

    # ------------------------------------------------------------ CrazyGames SDK integration (mocked SDK)
    MOCK = """
window.__cg = [];
window.CrazyGames = { SDK: {
  environment: 'crazygames',
  init: function () { __cg.push('init'); return Promise.resolve(); },
  game: { gameplayStart: function () { __cg.push('gameplayStart'); }, gameplayStop: function () { __cg.push('gameplayStop'); },
          loadingStart: function () { __cg.push('loadingStart'); }, loadingStop: function () { __cg.push('loadingStop'); },
          happytime: function () { __cg.push('happytime'); },
          settings: { muteAudio: false, disableChat: false },
          addSettingsChangeListener: function (fn) { __cg.push('settingsListener'); window.__cgSet = fn; } },
  user: { isUserAccountAvailable: true, systemInfo: { locale: 'de-DE', countryCode: 'DE', device: { type: 'desktop' } } },
  data: { _d: {}, getItem: function (k) { __cg.push('getItem'); return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
          setItem: function (k, v) { __cg.push('setItem'); this._d[k] = String(v); }, removeItem: function (k) { delete this._d[k]; }, clear: function () { this._d = {}; } }
}};"""
    b, ctx, page = new_page(p, 1280, 720, url=CG, route=lambda route: route.fulfill(status=200, content_type='application/javascript', body=MOCK))
    calls = page.evaluate('() => window.__cg')
    check('SDK: init/loading/gameplay events', all(k in calls for k in ['init', 'loadingStart', 'loadingStop', 'gameplayStart', 'getItem', 'settingsListener']), calls)
    check('SDK: gameplayStart only once at boot', calls.count('gameplayStart') == 1, calls.count('gameplayStart'))
    lang = page.evaluate('() => document.documentElement.lang')
    check('SDK locale (de-DE) picks German', lang == 'de', lang)
    page.click('#btnSettings'); page.wait_for_timeout(100)
    page.click('#modal .xbtn'); page.wait_for_timeout(100)
    calls = page.evaluate('() => window.__cg')
    check('SDK: gameplayStop/Start around menus', calls[-2:] == ['gameplayStop', 'gameplayStart'], calls[-4:])
    page.evaluate('() => window.__bw.save()')
    check('SDK: progress saved with data module', 'setItem' in page.evaluate('() => window.__cg'))
    page.evaluate('() => window.__cgSet({ muteAudio: true })'); page.wait_for_timeout(100)
    check('SDK: muteAudio respected', page.evaluate('() => window.__bw.muted()') is True and page.evaluate("() => document.getElementById('btnSound').innerHTML.indexOf('M42') > 0"))
    b.close()
    # SDK unreachable -> game still runs
    b, ctx, page = new_page(p, 1280, 720, url=CG, route=lambda route: route.abort())
    c = canvas_xy(page)
    page.mouse.click(c['x'], c['y']); page.wait_for_timeout(100)
    check('game runs when SDK script cannot load', S(page)['clicks'] == 1)
    b.close()

errors_real = [e for e in errors if 'crazygames-sdk-v3.js' not in e and 'ERR_FAILED' not in e]
check('no console errors or page errors', not errors_real, errors_real[:8])
fails = [r for r in results if not r[1]]
print('\n%d checks, %d failed' % (len(results), len(fails)))
sys.exit(1 if fails else 0)
