"""Render the three CrazyGames cover images (1920x1080, 800x1200, 800x800) from the real game scene."""
import json, os, tempfile
from playwright.sync_api import sync_playwright
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + os.path.join(ROOT, 'dist', 'test', 'web.html') + '?debug=1'
OUT = os.path.join(ROOT, 'dist', 'covers')
os.makedirs(OUT, exist_ok=True)

STATE = {"v": 1, "helpers": [40, 30, 25, 12, 8, 6, 4, 3, 2, 0, 0], "hands": 8, "stage": 3, "ups": {"h1": True}, "potions": 1e9, "runEarned": 1e9, "allEarned": 1e9,
         "clicks": 999, "runClicks": 999, "lastSave": 9e15, "wispIn": 999,
         "tut": {"helper": True, "up": True, "upToast": True, "meter": True, "wisp": True},
         "ach": {a: True for a in ["brew_100", "brew_1000", "brew_100000", "brew_10000000", "brew_1000000000", "click_50", "click_500",
                                   "pps_10", "pps_1000", "pps_100000", "helpers_10", "helpers_50", "nado_1", "wisp_1"]}}

HIDE = """#splash,#panel,#hud,#meter,.corner,#toasts,#hint,#banner,#tooltip,#modal{display:none!important}
#app.portrait #stage,#app.landscape #stage{flex:1 1 auto!important}"""

TITLE = """<svg id="cvTitle" viewBox="0 0 1000 290" style="position:absolute;left:50%%;top:%s;width:%s;transform:translateX(-50%%);z-index:20;overflow:visible">
<defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1ffc4"/><stop offset=".5" stop-color="#8dff6e"/><stop offset="1" stop-color="#27b247"/></linearGradient>
<filter id="gl" x="-20%%" y="-40%%" width="140%%" height="180%%"><feGaussianBlur stdDeviation="16"/></filter></defs>
<g transform="rotate(-4 500 150)">
<text x="500" y="196" text-anchor="middle" font-family="BrewBlack" font-weight="900" font-size="208" letter-spacing="-5" fill="#7dff6e" opacity=".55" filter="url(#gl)">Brewnado</text>
<text x="500" y="214" text-anchor="middle" font-family="BrewBlack" font-weight="900" font-size="208" letter-spacing="-5" fill="#1d1030" stroke="#1d1030" stroke-width="40" stroke-linejoin="round">Brewnado</text>
<text x="500" y="196" text-anchor="middle" font-family="BrewBlack" font-weight="900" font-size="208" letter-spacing="-5" fill="url(#tg)" stroke="#1d1030" stroke-width="22" stroke-linejoin="round" paint-order="stroke">Brewnado</text>
<path d="M902 40 l9 22 22 9 -22 9 -9 22 -9 -22 -22 -9 22 -9z" fill="#ffe27a" stroke="#1d1030" stroke-width="6" stroke-linejoin="round"/>
<path d="M92 230 l6 15 15 6 -15 6 -6 15 -6 -15 -15 -6 15 -6z" fill="#bffcf6" stroke="#1d1030" stroke-width="5" stroke-linejoin="round"/>
</g></svg>"""

COVERS = [
    # name, css w, h, scale, R factor of h (or w), cy factor, title top, title width
    ('cover_landscape_1920x1080.png', 960, 540, 2, ('h', 0.29), 0.6, '3%', '62%'),
    ('cover_portrait_800x1200.png', 400, 600, 2, ('w', 0.3), 0.63, '7%', '92%'),
    ('cover_square_800x800.png', 400, 400, 2, ('w', 0.235), 0.62, '3%', '84%'),
]

with sync_playwright() as p:
    b = p.chromium.launch()
    for name, w, h, sc, rf, cyf, ttop, twidth in COVERS:
        ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=sc)
        ctx.add_init_script("try{localStorage.setItem('brewnado.save.v1', %s)}catch(e){}" % json.dumps(json.dumps(STATE)))
        page = ctx.new_page()
        page.goto(URL)
        page.wait_for_timeout(1200)
        page.add_style_tag(content=HIDE)
        page.evaluate("html => document.getElementById('stage').insertAdjacentHTML('beforeend', html)", TITLE % (ttop, twidth))
        page.wait_for_timeout(400)
        R = (h if rf[0] == 'h' else w) * rf[1]
        page.evaluate("([w, h, R, cy]) => { BW.scene.resize(w, h, { R: R, cy: cy }); }", [w, h, R, h * cyf])
        page.wait_for_timeout(2500)
        page.evaluate("() => { BW.scene.startNado(); const L = BW.scene.layout(); BW.scene.burst(L.cx, L.cy - L.R * 0.2, '160,255,170', 40, 300); }")
        page.wait_for_timeout(330)
        tmp = os.path.join(tempfile.gettempdir(), name)
        page.screenshot(path=tmp)
        im = Image.open(tmp).convert('RGB')
        assert im.size == (w * sc, h * sc), im.size
        im.save(os.path.join(OUT, name), optimize=True)
        print(name, im.size)
        ctx.close()
    b.close()
