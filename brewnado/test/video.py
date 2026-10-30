"""Record the two CrazyGames preview videos (18 s, 30 fps) with a virtual clock, so animation is perfectly smooth.
Landscape 1920x1080 (16:9) and portrait 1080x1620 (2:3)."""
import json, os, tempfile, shutil, subprocess, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + os.path.join(ROOT, 'dist', 'test', 'web.html') + '?debug=1'
OUT = os.path.join(ROOT, 'dist', 'videos')
os.makedirs(OUT, exist_ok=True)
FPS, SECONDS = 30, 18

CLOCK = r"""
(() => {
  let vt = 0; const d0 = Date.now();
  let seed = 7; Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  performance.now = () => vt; Date.now = () => d0 + vt;
  let raf = [], rid = 1, timers = [], tid = 1;
  window.requestAnimationFrame = cb => { const id = rid++; raf.push({ id, cb }); return id; };
  window.cancelAnimationFrame = id => { raf = raf.filter(r => r.id !== id); };
  window.setTimeout = (fn, ms, ...a) => { const id = tid++; timers.push({ id, at: vt + (+ms || 0), fn, a }); return id; };
  window.clearTimeout = id => { timers = timers.filter(t => t.id !== id); };
  window.setInterval = (fn, ms, ...a) => { const id = tid++; timers.push({ id, at: vt + (+ms || 1), fn, a, every: +ms || 1 }); return id; };
  window.clearInterval = window.clearTimeout;
  const started = new WeakMap();
  window.__step = ms => {
    vt += ms;
    for (let guard = 0; guard < 500; guard++) {
      let due = null;
      for (const t of timers) if (t.at <= vt && (!due || t.at < due.at)) due = t;
      if (!due) break;
      if (due.every) due.at += due.every; else timers = timers.filter(t => t !== due);
      try { if (typeof due.fn === 'function') due.fn(...due.a); } catch (e) {}
    }
    const q = raf; raf = [];
    for (const r of q) { try { r.cb(vt); } catch (e) {} }
    for (const a of document.getAnimations()) {
      if (!started.has(a)) started.set(a, vt - ms);
      try { a.pause(); a.currentTime = Math.max(0, vt - started.get(a)); } catch (e) {}
    }
  };
})();"""

FX_CSS = """
#splash{display:none!important}
.tapfx{position:fixed;width:64px;height:64px;margin:-32px 0 0 -32px;border-radius:50%;border:5px solid rgba(255,255,255,.95);
  box-shadow:0 0 12px rgba(255,255,255,.6);pointer-events:none;z-index:99;animation:tapfx .45s ease-out forwards}
@keyframes tapfx{from{transform:scale(.25);opacity:1}to{transform:scale(1.35);opacity:0}}
#vhand{position:fixed;width:58px;height:58px;pointer-events:none;z-index:100;filter:drop-shadow(0 4px 4px rgba(0,0,0,.4));transition:none}
"""
HAND = ('<svg viewBox="0 0 64 64"><path d="M27 6c3 0 5 2.2 5 5v18l2.6-.7c2.6-.6 5.1 1 5.6 3.6l.2 1 2.6-.5c2.6-.5 5.1 1.2 5.6 3.8l.2 1.3 1.2-.2c2.7-.3 '
        '5.1 1.7 5.3 4.4l.7 8.6C56.7 57.7 50.2 62 42.6 62h-8.8c-5.8 0-10.8-3.4-13-8.7L14.9 40c-1-2.5.2-5.3 2.7-6.3 2.3-.9 4.8 0 6 2.1l1.4 2.4V11c0-2.8 '
        '2.2-5 5-5z" fill="#fff" stroke="#1d1030" stroke-width="3" stroke-linejoin="round"/></svg>')

STATE = {"v": 1, "helpers": [30, 18, 12, 6, 3, 1, 1, 0, 1, 0, 0], "potions": 2.6e6, "runEarned": 5e6, "allEarned": 5e6,
         "clicks": 520, "runClicks": 520, "hands": 5, "nados": 4, "runNados": 4, "wisps": 2, "meter": 30, "lastSave": 9e15, "wispIn": 999,
         "ups": {"c1": True, "c2": True, "t_spoon_0": True, "t_frog_0": True, "t_shroom_0": True, "t_spoon_1": True, "g1": True},
         "ach": {a: True for a in ["brew_100", "brew_1000", "brew_100000", "click_50", "click_500", "nado_1", "wisp_1", "pps_10", "pps_1000", "helpers_10", "helpers_50"]},
         "tut": {"helper": True, "up": True, "upToast": True, "meter": True, "wisp": True}}

JS_HELPERS = r"""
window.__tapAt = (x, y) => {
  const fx = document.createElement('div'); fx.className = 'tapfx'; fx.style.left = x + 'px'; fx.style.top = y + 'px';
  document.body.appendChild(fx); setTimeout(() => fx.remove(), 500);
  const h = document.getElementById('vhand'); h.style.left = (x - 24) + 'px'; h.style.top = (y - 5) + 'px'; h.style.display = 'block';
};
window.__tapCauldron = () => {
  const cv = document.getElementById('scene'), r = cv.getBoundingClientRect(), L = window.__bw.L();
  const x = r.left + L.cx + (Math.random() - 0.5) * L.R * 0.9, y = r.top + L.cy + L.R * (0.15 + Math.random() * 0.35);
  cv.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true }));
  window.__tapAt(x, y);
};
window.__tapEl = (sel) => {
  const el = document.querySelector(sel); if (!el) return false;
  const r = el.getBoundingClientRect(); window.__tapAt(r.left + r.width * 0.5, r.top + r.height * 0.55); el.click(); return true;
};
window.__tapWisp = () => {
  const w = window.__bw.wisp(); if (!w) return false;
  const cv = document.getElementById('scene'), r = cv.getBoundingClientRect();
  cv.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + w.x, clientY: r.top + w.y, bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true }));
  window.__tapAt(r.left + w.x, r.top + w.y); return true;
};
"""


def timeline():
    ev = {}
    def at(t, js): ev.setdefault(round(t * FPS), []).append(js)
    busy = [(1.15, 1.35), (2.55, 2.75), (5.3, 5.6), (6.4, 6.6), (10.4, 12.6), (13.1, 13.3), (14.5, 15.3)]
    t = 0.25
    while t < SECONDS - 0.2:
        if not any(a <= t <= b for a, b in busy): at(t, "__tapCauldron()")
        t += 0.19
    at(1.2, "__tapEl('#helperList .item.hand')")
    at(2.6, "__tapEl('#helperList .item.hand')")
    at(4.4, "(() => { const r0 = Math.random; Math.random = () => 0.01; __tapCauldron(); Math.random = r0; })()")
    at(3.6, "window.__bw.spawnWisp()")
    at(5.4, "__tapWisp()")
    at(6.5, "__tapEl('#helperList .item:nth-child(3)')")
    at(7.6, "(() => { const S = window.__bw.S(); S.meter = window.__bw.C().meterCap - 8; })()")
    at(10.5, "__tapEl('.tab[data-tab=upgrades]')")
    at(11.4, "__tapEl('#upList .item.stage.can') || __tapEl('#upList .item.can')")
    at(12.4, "__tapEl('.tab[data-tab=helpers]')")
    at(13.2, "__tapEl('#helperList .item:nth-child(4)')")
    at(14.6, "__tapEl('#buybar [data-buy=\"10\"]')")
    at(15.2, "__tapEl('#helperList .item:nth-child(1)')")
    at(16.3, "__tapEl('#buybar [data-buy=\"1\"]')")
    return ev


def record(name, w, h, dsf, outw, outh):
    frames = os.path.join(tempfile.gettempdir(), 'bw_frames_' + name)
    shutil.rmtree(frames, ignore_errors=True); os.makedirs(frames)
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dsf, has_touch=True, locale='en-US')
        ctx.add_init_script(CLOCK)
        ctx.add_init_script("try{localStorage.setItem('brewnado.save.v1', %s)}catch(e){}" % json.dumps(json.dumps(STATE)))
        page = ctx.new_page()
        errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        page.goto(URL)
        page.wait_for_timeout(800)
        page.add_style_tag(content=FX_CSS)
        page.evaluate("html => { document.body.insertAdjacentHTML('beforeend', '<div id=\"vhand\" style=\"display:none\">' + html + '</div>'); }", HAND)
        page.evaluate(JS_HELPERS)
        for i in range(45):  # warm-up second (not recorded): fonts, first frames, particles
            page.evaluate('() => __step(1000/30)')
        ev = timeline()
        total = FPS * SECONDS
        for f in range(total):
            for js in ev.get(f, []):
                page.evaluate('() => { %s; }' % js)
            page.evaluate('() => __step(1000/30)')
            page.screenshot(path='%s/f_%04d.png' % (frames, f))
        b.close()
    if errs: print('page errors:', errs[:5])
    out = os.path.join(OUT, name)
    subprocess.check_call(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', frames + '/f_%04d.png',
                           '-vf', 'scale=%d:%d:flags=lanczos' % (outw, outh), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19',
                           '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out])
    print(name, os.path.getsize(out) // 1024, 'KB')


if __name__ == '__main__':
    which = sys.argv[1] if len(sys.argv) > 1 else 'both'
    if which in ('both', 'landscape'):
        record('Brewnado_preview_landscape_1920x1080.mp4', 1280, 720, 1.5, 1920, 1080)
    if which in ('both', 'portrait'):
        record('Brewnado_preview_portrait_1080x1620.mp4', 540, 810, 2, 1080, 1620)
