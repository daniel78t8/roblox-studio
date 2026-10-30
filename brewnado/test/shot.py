"""Quick visual check: python3 test/shot.py WIDTHxHEIGHT [locale] [state.json] [out.png] [clicks]"""
import sys, json, os, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + os.path.join(ROOT, 'dist', 'test', 'web.html') + '?debug=1'

def main():
    size = sys.argv[1] if len(sys.argv) > 1 else '1280x720'
    locale = sys.argv[2] if len(sys.argv) > 2 else 'en-US'
    state = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != '-' else None
    out = sys.argv[4] if len(sys.argv) > 4 else os.path.join(ROOT, 'dist', 'shot.png')
    clicks = int(sys.argv[5]) if len(sys.argv) > 5 else 0
    w, h = map(int, size.split('x'))
    errors = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': w, 'height': h}, locale=locale, device_scale_factor=1, has_touch=False)
        if state:
            data = open(state).read()
            ctx.add_init_script("try{localStorage.setItem('brewnado.save.v1', %s)}catch(e){}" % json.dumps(data))
        page = ctx.new_page()
        page.on('console', lambda m: errors.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
        page.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
        page.goto(URL)
        page.wait_for_timeout(1200)
        if clicks:
            box = page.evaluate("() => { const L = window.__bw && window.__bw.S ? null : null; return null }")
            for i in range(clicks):
                page.evaluate("() => window.__bw.click(1)")
                page.wait_for_timeout(30)
        page.wait_for_timeout(600)
        page.screenshot(path=out)
        info = page.evaluate("() => ({ potions: window.__bw.S().potions, pps: window.__bw.C().pps, lang: document.documentElement.lang, cls: document.getElementById('app').className })")
        b.close()
    print(json.dumps(info))
    print('errors:', errors if errors else 'none')

main()
