"""Capture many UI states for visual review."""
import json, os, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + os.path.join(ROOT, 'dist', 'test', 'web.html') + '?debug=1'
OUT = os.path.join(ROOT, 'dist', 'screens')
os.makedirs(OUT, exist_ok=True)
STATE = open(os.path.join(ROOT, 'test', 'fixtures', 'state_mid.json')).read()
errors = []


def ctx_page(p, w, h, locale='en-US', state=STATE, touch=False):
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': w, 'height': h}, locale=locale, device_scale_factor=1, has_touch=touch, is_mobile=touch)
    if state:
        s = json.loads(state); s['lastSave'] = 9e15  # avoid the welcome-back popup
        ctx.add_init_script("try{localStorage.setItem('brewnado.save.v1', %s)}catch(e){}" % json.dumps(json.dumps(s)))
    page = ctx.new_page()
    page.on('console', lambda m: errors.append('%dx%d %s: %s' % (w, h, m.type, m.text)) if m.type in ('error', 'warning') else None)
    page.on('pageerror', lambda e: errors.append('%dx%d pageerror: %s' % (w, h, e)))
    page.goto(URL)
    page.wait_for_timeout(1300)
    return b, page


with sync_playwright() as p:
    b, page = ctx_page(p, 1280, 720)
    page.wait_for_timeout(2500)  # let achievement toasts pass
    page.evaluate("() => window.__bw.setTab('upgrades')"); page.wait_for_timeout(300)
    page.screenshot(path=OUT + '/upgrades.png')
    page.evaluate("() => window.__bw.setTab('magic')"); page.wait_for_timeout(300)
    page.screenshot(path=OUT + '/magic.png')
    page.evaluate("() => { window.__bw.setTab('helpers'); window.__bw.openSettings(); }"); page.wait_for_timeout(300)
    page.screenshot(path=OUT + '/settings.png')
    page.keyboard.press('Escape')
    page.evaluate("() => { const x = document.querySelector('#modal .xbtn'); if (x) x.click(); window.__bw.openRecords('ach'); }"); page.wait_for_timeout(300)
    page.screenshot(path=OUT + '/records.png')
    page.evaluate("() => { document.querySelector('#modal [data-r=stats]').click(); }"); page.wait_for_timeout(300)
    page.screenshot(path=OUT + '/stats.png')
    page.evaluate("() => document.querySelector('#modal .xbtn').click()")
    # wisp + hover tooltip
    page.evaluate("() => window.__bw.spawnWisp()"); page.wait_for_timeout(1500)
    page.hover('#helperList .item:nth-child(4)'); page.wait_for_timeout(300)
    page.screenshot(path=OUT + '/wisp_tooltip.png')
    # brewnado
    page.evaluate("() => { const S = window.__bw.S(); S.meter = 99; window.__bw.click(1); }"); page.wait_for_timeout(450)
    page.screenshot(path=OUT + '/brewnado.png')
    b.close()

    for (w, h, loc, touch, name) in [(907, 510, 'de-DE', False, 'cg_907'), (800, 450, 'en-US', True, 'mobile_land'),
                                      (1920, 1080, 'en-US', False, 'fhd'), (390, 844, 'de-DE', True, 'phone_mid'), (768, 1024, 'en-US', True, 'tablet')]:
        b, page = ctx_page(p, w, h, loc, touch=touch)
        page.wait_for_timeout(2600)
        page.screenshot(path='%s/%s.png' % (OUT, name))
        b.close()

    # fresh start (no save) at the smallest required size
    b, page = ctx_page(p, 907, 510, 'en-US', state=None)
    page.screenshot(path=OUT + '/fresh_907.png')
    b.close()

print('errors:', json.dumps(errors, indent=1) if errors else 'none')
