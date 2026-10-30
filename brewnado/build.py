#!/usr/bin/env python3
"""Build Brewnado into single-file HTML builds.
dist/web/index.html          - for the shareable artifact page (no CrazyGames SDK)
dist/crazygames/index.html   - for CrazyGames (loads the official SDK v3)
dist/Brewnado_CrazyGames.zip - upload package
dist/test/*.html             - same builds WITH the ?debug=1 test hooks (used by the test scripts only)
"""
import base64, os, zipfile, re

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
ASSETS = os.path.join(ROOT, 'assets')
DIST = os.path.join(ROOT, 'dist')
JS_ORDER = ['data.js', 'core.js', 'i18n.js', 'icons.js', 'audio.js', 'scene.js', 'main.js']
FONTS = [('BrewText', 'Inter-SemiBold.woff', 600), ('BrewDisplay', 'InterDisplay-ExtraBold.woff', 800), ('BrewBlack', 'InterDisplay-Black.woff', 900)]
SDK_TAG = '<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>'


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def font_css():
    out = []
    for fam, file, w in FONTS:
        b64 = base64.b64encode(open(os.path.join(ASSETS, file), 'rb').read()).decode()
        out.append("@font-face{font-family:%s;src:url(data:font/woff;base64,%s) format('woff');font-weight:%d;font-style:normal;font-display:block}" % (fam, b64, w))
    return '\n'.join(out)


def build():
    tpl = read(os.path.join(SRC, 'index.html'))
    css = read(os.path.join(SRC, 'style.css'))
    js = '\n'.join(read(os.path.join(SRC, f)) for f in JS_ORDER)
    assert '</script' not in js.lower(), 'script end tag inside JS'
    js_release = re.sub(r'/\*DEBUG-START\*/.*?/\*DEBUG-END\*/', '', js, flags=re.S)
    assert '__bw' not in js_release and 'DEBUG' not in js_release, 'debug hooks left in release build'
    outs = {}
    os.makedirs(os.path.join(DIST, 'test'), exist_ok=True)
    for name, sdk in (('web', ''), ('crazygames', SDK_TAG)):
        for release in (True, False):
            page = tpl.replace('/*FONTS*/', font_css()).replace('/*CSS*/', css).replace('/*JS*/', js_release if release else js)
            html = page.replace('<!--SDK-->', sdk)
            if release:
                d = os.path.join(DIST, name)
                os.makedirs(d, exist_ok=True)
                out = os.path.join(d, 'index.html')
                outs[name] = len(html.encode())
            else:
                out = os.path.join(DIST, 'test', name + '.html')
            with open(out, 'w', encoding='utf-8') as f:
                f.write(html)
    lic = os.path.join(ASSETS, 'LICENSE-Inter-OFL.txt')
    zp = os.path.join(DIST, 'Brewnado_CrazyGames.zip')
    with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
        z.write(os.path.join(DIST, 'crazygames', 'index.html'), 'index.html')
        z.write(lic, 'LICENSE-Inter-OFL.txt')
    outs['zip'] = os.path.getsize(zp)
    return outs


if __name__ == '__main__':
    for k, v in build().items():
        print('%-11s %8.1f KB' % (k, v / 1024))
