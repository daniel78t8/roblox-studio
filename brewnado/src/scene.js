/* Brewnado - canvas scene: night forest, cauldron, helpers, particles, wisps, Brewnado. */
(function (BW) {
  'use strict';
  var cv, ctx, W = 0, H = 0, dpr = 1, bg = null, bgCtx = null, vig = null, fireflies = [];
  var L = { cx: 0, cy: 0, R: 50, ground: 0, horizon: 0 };
  var t = 0, sq = 0, sqv = 0, shake = 0;
  var parts = [], texts = [], surf = [], stars = [], shooting = [], brooms = [];
  var frogs = [], catBlink = 0, dragonBreath = 0, nextDragon = 4, nextBroom = 6, nextShoot = 5;
  var nado = { on: false, t: 0, dur: 1.9 };
  var flies = [], arrivals = 0, target = { x: 0, y: 0 }, emberAcc = 0;
  var cloudImg = null, mistImg = null, potionImg = null, shadowImg = null, mistStrip = null;
  var bodyC = null, bounceC = null, decoC = null, bodyKey = '';
  var stage = 0, rings = [], flashA = 0, flashRGB = '255,255,255';
  var handN = 0, handRate = 0, handLook = 0, handText = '', hv = [], handSpr = null, handSprKey = '', handTextT = 0, onHandTap = null;
  // Cauldron materials per level (iron, copper, silver, gold, jade, crystal, lava, star)
  var MAT = [
    { body: ['#3a3456', '#221d35', '#100c1c'], rim: ['#5a5282', '#463f66', '#2f2949'], band: '#120d1d', bandHi: 'rgba(170,160,220,0.3)', riv: ['#07050c', '#5d5683'], feet: '#231d36', handle: '#3d3658', lip: '#2a2440', blot: 0.12 },
    { body: ['#c27448', '#8a4424', '#3d1a0c'], hi: '#e9a378', rim: ['#f0a476', '#c06c3e', '#6d3418'], band: '#4a230f', bandHi: 'rgba(255,205,160,0.45)', riv: ['#2a1206', '#f2b07e'], feet: '#4a230f', handle: '#9a5530', lip: '#5a2a12', blot: 0.1, deco: 'patina' },
    { body: ['#dde3f0', '#9ba3bb', '#4a5068'], hi: '#ffffff', rim: ['#ffffff', '#c3c9dc', '#727a98'], band: '#3b3f55', bandHi: 'rgba(255,255,255,0.6)', riv: ['#262a3a', '#f8f9ff'], feet: '#3b3f55', handle: '#a9b0c8', lip: '#5a6080', blot: 0.05, deco: 'shine' },
    { body: ['#ffe07a', '#d9a02c', '#7a4f0c'], hi: '#fff6c8', rim: ['#fff4c0', '#eebb44', '#9a6812'], band: '#6b430a', bandHi: 'rgba(255,250,215,0.65)', riv: ['#4a2e05', '#fff3c0'], feet: '#6b430a', handle: '#cf9426', lip: '#8a5a10', blot: 0.05, deco: 'gems', glow: '255,236,160' },
    { body: ['#6ee0ad', '#279a64', '#0c4a2e'], rim: ['#b4f8d6', '#46c186', '#16603d'], band: '#0b3d26', bandHi: 'rgba(205,255,228,0.5)', riv: ['#05261a', '#d0ffe0'], feet: '#0b3d26', handle: '#30915f', lip: '#145a38', blot: 0.08, deco: 'runes', glow: '120,255,190' },
    { body: ['#c9b5ff', '#8063ea', '#3a2491'], hi: '#f2ecff', rim: ['#f4eeff', '#ad93ff', '#5a3fb8'], band: '#2d1a72', bandHi: 'rgba(255,255,255,0.65)', riv: ['#1c0f4d', '#ffffff'], feet: '#2d1a72', handle: '#9478f2', lip: '#4a30a0', blot: 0, deco: 'facets', glow: '210,190,255' },
    { body: ['#43323a', '#21171c', '#0a0608'], rim: ['#6a4640', '#40282a', '#1e1210'], band: '#0a0505', bandHi: 'rgba(255,150,70,0.55)', riv: ['#1a0a05', '#ff9a40'], feet: '#1d1418', handle: '#40282a', lip: '#2a1614', blot: 0.1, deco: 'cracks', glow: '255,120,30' },
    { body: ['#33449a', '#18225f', '#080c2a'], rim: ['#9db3ff', '#5068d8', '#1e2a7a'], band: '#0a0f33', bandHi: 'rgba(190,210,255,0.6)', riv: ['#060a22', '#ffe27a'], feet: '#0a0f33', handle: '#4555b0', lip: '#16205a', blot: 0, deco: 'stars', glow: '255,240,190' },
    { body: ['#ff9bd0', '#e0559e', '#7a1f50'], hi: '#ffe0f0', rim: ['#ffe6f3', '#ff8fc6', '#a03070'], band: '#7a1f50', bandHi: 'rgba(255,230,245,0.6)', riv: ['#5a1038', '#ffffff'], feet: '#7a1f50', handle: '#ff8fc6', lip: '#a03070', blot: 0, deco: 'candy', glow: '255,170,225' },
    { body: ['#8a6cff', '#5a3fd0', '#24125e'], hi: '#e8deff', rim: ['#ffffff', '#c9b6ff', '#6a4ad0'], band: '#24125e', bandHi: 'rgba(255,255,255,0.7)', riv: ['#1a0c40', '#ffe27a'], feet: '#24125e', handle: '#b48cff', lip: '#3a2190', blot: 0, deco: 'rainbow', glow: '255,255,255' }
  ];
  var RAINBOW = ['#ff5d6c', '#ffa34d', '#ffe27a', '#7ee86f', '#5ff3e6', '#8fb7ff', '#c08cff'];
  var CONF = ['#ffe27a', '#ff6f9c', '#5ff3e6', '#9a6bff', '#7ee86f', '#ffffff'];
  var BLOT = [[-0.55, 0.36, 0.13, 0], [0.36, 0.56, 0.11, 0], [-0.2, 0.78, 0.09, 0], [0.72, 0.3, 0.08, 0], [0.06, 0.42, 0.07, 1], [-0.76, 0.6, 0.07, 0], [0.52, 0.8, 0.08, 1], [-0.42, 0.14, 0.06, 1], [0.2, 0.2, 0.05, 0]];
  var wisp = null;
  var counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  // combo / fever / bubbles / cauldron face
  var combo = { n: 0, shown: 0, frac: 0, pop: 0, fade: 0 }, fever = false, feverT = 0;
  var bubs = [], face = { blink: 0, nextBlink: 3, excite: 0, lookX: 0, lookY: 0, happy: 0 };
  var unis = [], nextUni = 4;
  var PAL = [
    { a: '#c4ff9a', b: '#4fd65a', c: '#1c6e36', g: '90,255,120' },
    { a: '#b4fff6', b: '#2fd0c6', c: '#0f6563', g: '80,240,230' },
    { a: '#ffc2f0', b: '#ff5fc8', c: '#7d1d64', g: '255,110,210' },
    { a: '#fff3b8', b: '#ffc93d', c: '#80520c', g: '255,210,90' },
    { a: '#ddccff', b: '#9a6bff', c: '#38207f', g: '170,130,255' }
  ];
  var pal = PAL[0], galaxy = false;
  var O = '#1d1030';

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function seeded(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  function mk(w, h, fn) { var c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d')); return c; }
  function init(canvas) {
    cv = canvas;
    ctx = cv.getContext('2d', { alpha: false });
    for (var i = 0; i < 4; i++) frogs.push({ hop: 0, next: rnd(2, 8) });
    cloudImg = mk(320, 120, function (g) {
      [[60, 72, 44], [112, 56, 56], [172, 60, 52], [224, 74, 40], [140, 84, 48], [266, 82, 30]].forEach(function (c) {
        var gr = g.createRadialGradient(c[0], c[1], 0, c[0], c[1], c[2]);
        gr.addColorStop(0, 'rgba(185,165,240,0.55)'); gr.addColorStop(1, 'rgba(185,165,240,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(c[0], c[1], c[2], 0, 6.283); g.fill();
      });
    });
    mistImg = mk(512, 96, function (g) {
      g.scale(1, 96 / 512);
      var gr = g.createRadialGradient(256, 256, 0, 256, 256, 256);
      gr.addColorStop(0, 'rgba(175,155,235,0.55)'); gr.addColorStop(1, 'rgba(175,155,235,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    });
    shadowImg = mk(128, 128, function (g) {
      var gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(4,0,14,0.85)'); gr.addColorStop(0.55, 'rgba(4,0,14,0.45)'); gr.addColorStop(1, 'rgba(4,0,14,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    });
    if (BW.icon) {
      potionImg = new Image();
      potionImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(BW.icon('potion').replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" '));
    }
  }

  // o (optional, used only for store artwork): { R: radius, cy: cauldron y }
  function resize(w, h, o) {
    W = Math.max(1, Math.round(w)); H = Math.max(1, Math.round(h));
    dpr = quality > 0 ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    dpr = Math.max(1, Math.min(dpr, Math.sqrt(3.7e6 / (W * H))));   // cap canvas memory/fill cost on big high-DPI screens
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    var portrait = H > W * 1.05;
    L.R = (o && o.R) || Math.max(30, Math.min(W * (portrait ? 0.24 : 0.2), H * 0.235));
    L.cx = W / 2;
    L.cy = (o && o.cy) || H * (portrait ? 0.53 : 0.555);
    L.ground = L.cy + L.R * 1.04;
    L.horizon = L.cy + L.R * 0.25;
    buildBackground();
  }

  function softBlob(g, x, y, r, rgba) {
    var gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgba); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
  }
  function buildBackground() {
    bg = document.createElement('canvas');
    bg.width = cv.width; bg.height = cv.height;
    bgCtx = bg.getContext('2d');
    var g = bgCtx, i, k; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var hz = L.horizon, R = L.R, rand = seeded(1234);
    // sky with a faint nebula band
    var sky = g.createLinearGradient(0, 0, 0, hz);
    sky.addColorStop(0, '#090515'); sky.addColorStop(0.45, '#1a0d3b'); sky.addColorStop(0.85, '#33205f'); sky.addColorStop(1, '#46296f');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    softBlob(g, W * 0.22, hz * 0.32, Math.max(W, H) * 0.32, 'rgba(120,70,200,0.12)');
    softBlob(g, W * 0.62, hz * 0.18, Math.max(W, H) * 0.26, 'rgba(70,100,210,0.09)');
    softBlob(g, W * 0.45, hz * 0.62, Math.max(W, H) * 0.42, 'rgba(170,80,170,0.08)');
    // stars (static ones baked, twinkling ones animated)
    stars = [];
    var n = Math.round(W * hz / 2600);
    for (i = 0; i < n; i++) {
      var st = { x: rand() * W, y: rand() * hz * 0.9, r: 0.45 + Math.pow(rand(), 2) * 1.5, p: rand() * 6.28, tw: rand() < 0.3 };
      stars.push(st);
      if (!st.tw) { g.globalAlpha = 0.25 + rand() * 0.55; g.fillStyle = rand() < 0.15 ? '#cfe0ff' : '#ffffff'; g.beginPath(); g.arc(st.x, st.y, st.r, 0, 6.283); g.fill(); }
    }
    g.globalAlpha = 1;
    // moon with soft halo and craters
    var mr = Math.max(14, R * 0.3), mx = W * 0.83, my = Math.max(mr + 52, Math.min(H * 0.17, hz * 0.3));
    if (H > W * 1.05) mx = W * 0.8;
    L.moon = { x: mx, y: my, r: mr };
    softBlob(g, mx, my, mr * 2.4, 'rgba(255,240,200,0.16)');
    var mg = g.createRadialGradient(mx - mr * 0.35, my - mr * 0.35, mr * 0.1, mx, my, mr);
    mg.addColorStop(0, '#fffbe6'); mg.addColorStop(0.7, '#fbedb8'); mg.addColorStop(1, '#e9d58e');
    g.fillStyle = mg; g.beginPath(); g.arc(mx, my, mr, 0, 6.283); g.fill();
    g.fillStyle = 'rgba(205,180,110,0.45)';
    [[-0.32, -0.18, 0.2], [0.24, 0.26, 0.27], [0.34, -0.34, 0.12], [-0.12, 0.42, 0.1], [-0.45, 0.25, 0.08]].forEach(function (c) {
      g.beginPath(); g.arc(mx + c[0] * mr, my + c[1] * mr, c[2] * mr, 0, 6.283); g.fill();
    });
    // a few soft clouds
    if (cloudImg) {
      var cw = Math.max(W * 0.3, R * 2.4), chh = cw * 0.375;
      [[0.08, 0.16, 0.13, 1], [0.52, 0.36, 0.1, 0.85], [0.3, 0.6, 0.08, 0.7]].forEach(function (c) {
        g.globalAlpha = c[2]; g.drawImage(cloudImg, c[0] * W, hz * c[1] - chh * 0.5, cw * c[3], chh * c[3]);
      });
      g.globalAlpha = 1;
    }
    // distant mountains in haze
    ridge(g, hz - R * 0.95, R * 0.55, '#2e1d5c', 0.0032, 2.2, 0.55);
    var haze = g.createLinearGradient(0, hz - R * 1.2, 0, hz);
    haze.addColorStop(0, 'rgba(110,80,170,0)'); haze.addColorStop(1, 'rgba(110,80,170,0.32)');
    g.fillStyle = haze; g.fillRect(0, hz - R * 1.2, W, R * 1.2);
    // two layers of pine forest
    forest(g, hz - R * 0.32, R * 0.42, '#24154c', rand, 22);
    var haze2 = g.createLinearGradient(0, hz - R * 0.5, 0, hz + 4);
    haze2.addColorStop(0, 'rgba(90,60,150,0)'); haze2.addColorStop(1, 'rgba(90,60,150,0.25)');
    g.fillStyle = haze2; g.fillRect(0, hz - R * 0.5, W, R * 0.5 + 4);
    forest(g, hz + 2, R * 0.6, '#160b31', rand, 15);
    // ground
    var gr = g.createLinearGradient(0, hz, 0, H);
    gr.addColorStop(0, '#1d1140'); gr.addColorStop(0.5, '#150c2f'); gr.addColorStop(1, '#0c0620');
    g.fillStyle = gr; g.fillRect(0, hz, W, H - hz);
    // clearing under the cauldron
    g.save(); g.translate(L.cx, L.ground); g.scale(1, 0.24);
    var cl = g.createRadialGradient(0, 0, 0, 0, 0, R * 2.8);
    cl.addColorStop(0, 'rgba(78,52,130,0.95)'); cl.addColorStop(0.6, 'rgba(60,40,110,0.5)'); cl.addColorStop(1, 'rgba(60,40,110,0)');
    g.fillStyle = cl; g.beginPath(); g.arc(0, 0, R * 2.8, 0, 6.283); g.fill(); g.restore();
    // pebbles and grass
    for (i = 0; i < 40; i++) {
      var px = rand() * W, py = hz + 6 + rand() * (H - hz - 8);
      if (Math.abs(px - L.cx) < R * 1.2 && Math.abs(py - L.ground) < R * 0.35) continue;
      var pr = 1 + rand() * 2.4;
      g.fillStyle = 'rgba(120,95,170,0.22)'; g.beginPath(); g.ellipse(px, py, pr * 1.6, pr, 0, 0, 6.283); g.fill();
      g.fillStyle = 'rgba(200,180,240,0.12)'; g.beginPath(); g.ellipse(px - pr * 0.4, py - pr * 0.35, pr * 0.6, pr * 0.35, 0, 0, 6.283); g.fill();
    }
    g.lineCap = 'round';
    for (i = 0; i < 46; i++) {
      var gx = rand() * W, gy = hz + 6 + rand() * (H - hz - 6);
      if (Math.abs(gx - L.cx) < R * 1.25 && Math.abs(gy - L.ground) < R * 0.42) continue;
      var near = (gy - hz) / (H - hz), bh = 5 + near * 9;
      g.strokeStyle = near > 0.5 ? '#2a1a52' : '#251648'; g.lineWidth = 1.4 + near * 1.4;
      for (k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(gx + k * 2.5, gy); g.quadraticCurveTo(gx + k * 3, gy - bh * 0.6, gx + k * 4.5 + rand() * 2, gy - bh - rand() * 4); g.stroke(); }
    }
    // vignette overlay (drawn every frame on top of the scene)
    vig = document.createElement('canvas'); vig.width = cv.width; vig.height = cv.height;
    var v = vig.getContext('2d'); v.setTransform(dpr, 0, 0, dpr, 0, 0);
    var vr = Math.sqrt(W * W + H * H) * 0.62;
    var vg = v.createRadialGradient(L.cx, L.cy, vr * 0.42, L.cx, L.cy, vr);
    vg.addColorStop(0, 'rgba(6,2,16,0)'); vg.addColorStop(1, 'rgba(6,2,16,0.55)');
    v.fillStyle = vg; v.fillRect(0, 0, W, H);
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(vig, 0, 0); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    vig = null;
    // ground mist strip (tiles horizontally, drawn with an offset each frame)
    mistStrip = null;
    if (mistImg) {
      var bw = Math.max(W * 0.5, R * 4), bh = R * 0.5, P = Math.ceil(Math.max(W, bw * 2));
      mistStrip = document.createElement('canvas');
      mistStrip.width = Math.ceil(P * dpr); mistStrip.height = Math.ceil(bh * 1.6 * dpr);
      var ms = mistStrip.getContext('2d'); ms.setTransform(dpr, 0, 0, dpr, 0, 0);
      var nb = Math.max(3, Math.round(P / (bw * 0.45)));
      for (i = 0; i < nb; i++) {
        var bx = i * P / nb + (rand() - 0.5) * bw * 0.2, by = (i % 2 ? 0.55 : 0.15) * bh, ww = bw * (0.8 + rand() * 0.4);
        for (k = -1; k <= 1; k++) { ms.globalAlpha = 0.75; ms.drawImage(mistImg, bx - ww / 2 + k * P, by, ww, bh); }
      }
      mistStrip._p = P; mistStrip._h = bh * 1.6;
    }
    // ambient fireflies
    fireflies = [];
    var nf = Math.max(6, Math.min(16, Math.round(W / 90)));
    for (i = 0; i < nf; i++) fireflies.push({ x: rand() * W, y: hz - R * 0.4 + rand() * (H - hz + R * 0.3), p: rand() * 6.28, f1: 0.2 + rand() * 0.35, f2: 0.25 + rand() * 0.4, a: 20 + rand() * 40 });
  }
  function ridge(g, base, amp, col, freq, ph, jag) {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, L.horizon + 2);
    for (var x = 0; x <= W + 8; x += 8) {
      var y = base - amp * (0.5 + 0.5 * Math.sin(x * freq + ph)) - amp * 0.3 * Math.sin(x * freq * 3.1 + ph * 2) - amp * 0.08 * jag * Math.sin(x * freq * 11 + ph);
      g.lineTo(x, y);
    }
    g.lineTo(W, L.horizon + 2); g.closePath(); g.fill();
  }
  function forest(g, base, size, col, rand, spacing) {
    g.fillStyle = col;
    g.fillRect(0, base - size * 0.12, W, L.horizon - base + size * 0.12 + 4);
    var x = -rand() * spacing;
    while (x < W + spacing) {
      var h = size * (0.55 + rand() * 0.6), w = h * 0.46, y = base + rand() * size * 0.08;
      for (var k = 0; k < 4; k++) {
        var ty = y - h * 0.08 - k * h * 0.21, tw = w * (1 - k * 0.2), th = h * 0.36;
        g.beginPath(); g.moveTo(x, ty - th);
        g.lineTo(x + tw * 0.5, ty); g.lineTo(x + tw * 0.22, ty - th * 0.07); g.lineTo(x + tw * 0.1, ty + th * 0.02);
        g.lineTo(x - tw * 0.1, ty + th * 0.02); g.lineTo(x - tw * 0.22, ty - th * 0.07); g.lineTo(x - tw * 0.5, ty);
        g.closePath(); g.fill();
      }
      x += spacing * (0.55 + rand() * 0.9);
    }
  }

  // ---------------------------------------------------------------- effects API
  function setCounts(helpers, rebirths, st) {
    for (var i = 0; i < counts.length; i++) counts[i] = helpers[i] || 0;
    pal = PAL[(rebirths || 0) % PAL.length];
    galaxy = counts[10] > 0;
    if (st != null) stage = Math.max(0, Math.min(MAT.length - 1, st | 0));
  }
  // Magic Hands: n owned, rate = real taps per second, look = glove style (0..3), text = '+value' shown on some taps.
  function setHands(n, rate, look, text) { handN = n; handRate = rate; handText = text || ''; if (look !== handLook) { handLook = look; handSprKey = ''; } }
  // Magic Hands walk slowly around the cauldron rim and drum on it (back ones a bit smaller, like in 3D).
  var orbit = 0;
  function handVisibleN() { return Math.min(handN, quality > 0 ? (L.R < 110 ? 7 : 10) : 5); }
  function handGeom(h) {
    var R = L.R, a = orbit + h.off;
    var ca = Math.cos(a), sa = Math.sin(a);
    var px = L.cx + ca * R * 1.0, py = L.cy + sa * R * 0.215;          // tap point on the rim
    var depth = 0.84 + 0.16 * (sa + 1) / 2;                              // 0.84 at the back, 1 at the front
    var tilt = -ca * 0.32;                                               // fingers fan out a little
    return { px: px, py: py, sa: sa, depth: depth, rot: Math.PI + tilt };
  }
  // Cartoon glove (pointing up in a 64x64 box): chunky finger, fist with knuckles, thumb and a puffy cuff.
  function gloveShapes(g, fn) {
    function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
    rr(26, 3, 12.5, 34, 6.2); fn('finger');
    rr(17, 25, 34, 28, 11); fn('palm');
    g.beginPath(); g.arc(44, 29.5, 6.8, 0, 6.283); fn('k');
    g.beginPath(); g.arc(49, 37, 6.2, 0, 6.283); fn('k');
    g.beginPath(); g.arc(49, 45, 5.6, 0, 6.283); fn('k');
    g.beginPath(); g.ellipse(18.5, 37, 6.2, 10, -0.42, 0, 6.283); fn('thumb');
    rr(15, 49, 38, 13, 5.5); fn('cuff');
    return rr;
  }
  function buildHandSprite() {
    var S = Math.max(18, L.R * 0.42), key = S.toFixed(1) + '|' + dpr + '|' + handLook;
    if (handSprKey === key && handSpr) return;
    handSprKey = key;
    var px = Math.ceil(S * dpr) + 4;
    handSpr = document.createElement('canvas'); handSpr.width = handSpr.height = px;
    var g = handSpr.getContext('2d'), sc = (px - 4) / 64;
    g.translate(2, 2); g.scale(sc, sc);
    var gold = handLook >= 3, glv = gold ? '#ffd76a' : '#ffffff';
    var cuff = gold ? '#e0892a' : (handLook >= 1 ? '#6a3fd6' : '#9a7cf0');
    g.lineJoin = 'round'; g.strokeStyle = O; g.lineWidth = 6.4;
    gloveShapes(g, function () { g.stroke(); });
    var rr = gloveShapes(g, function (k) { g.fillStyle = k === 'cuff' ? cuff : glv; g.fill(); });
    // one union clip for the shading (no seams between the parts)
    g.save(); g.beginPath();
    [[26, 3, 12.5, 34, 6.2], [17, 25, 34, 28, 11]].forEach(function (b) { var x = b[0], y = b[1], w = b[2], h = b[3], r = b[4]; g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); });
    g.moveTo(50.8, 29.5); g.arc(44, 29.5, 6.8, 0, 6.283); g.moveTo(55.2, 37); g.arc(49, 37, 6.2, 0, 6.283); g.moveTo(54.6, 45); g.arc(49, 45, 5.6, 0, 6.283);
    g.moveTo(24.7, 37); g.ellipse(18.5, 37, 6.2, 10, -0.42, 0, 6.283);
    g.clip();
    g.fillStyle = gold ? 'rgba(170,90,0,0.22)' : 'rgba(120,100,200,0.2)'; g.fillRect(40, 0, 30, 49);
    g.restore();
    g.strokeStyle = O; g.lineWidth = 2.4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(22.5, 30); g.quadraticCurveTo(26.5, 37, 23.5, 46); g.stroke();
    g.beginPath(); g.moveTo(38.5, 26.5); g.quadraticCurveTo(41, 30, 40.5, 34); g.stroke();
    g.beginPath(); g.moveTo(43.5, 35); g.quadraticCurveTo(46, 38, 45, 42); g.stroke();
    g.strokeStyle = 'rgba(29,16,48,0.35)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(29, 41); g.lineTo(29, 47); g.moveTo(34, 41); g.lineTo(34, 47); g.moveTo(39, 41); g.lineTo(39, 47); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.4)'; rr(18, 51, 32, 3, 1.5); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)'; rr(28.5, 7, 3.5, 12, 1.75); g.fill();
    if (handLook >= 2) { g.fillStyle = '#e6ecfa'; g.strokeStyle = O; g.lineWidth = 2.2; rr(25, 24, 14.5, 5, 2); g.fill(); g.stroke(); }
  }
  function handTap(h, G) {
    var R = L.R, x = G.px, y = G.py;
    addPart({ k: 'spark', x: x, y: y - R * 0.02, vx: rnd(-50, 50), vy: rnd(-90, -30), life: 0, max: 0.45, r: rnd(1.4, 2.4), c: '255,240,200' });
    var a = rnd(-2.4, -0.7), v = rnd(50, 120);
    addPart({ k: 'drop', x: x, y: y, vx: Math.cos(a) * v - Math.cos(orbit + h.off) * 40, vy: Math.sin(a) * v, life: 0, max: rnd(0.35, 0.55), r: rnd(1.5, 2.8) * Math.max(0.7, R / 110) });
    surf.push({ x: Math.max(-0.82, Math.min(0.82, (x - L.cx) / (R * 0.82) * 0.92)), y: Math.max(-0.7, Math.min(0.7, G.sa * 0.75)), r: 0, max: rnd(0.05, 0.08), life: 0, ring: true });
    sqv += 0.8;
    if (handText && quality > 0 && t - handTextT > 0.45) { handTextT = t; floatText(x, y - R * 0.42 * G.depth, handText, 0.72, '#e8deff'); }
    if (onHandTap) onHandTap();
  }
  function updateHands(dt) {
    var vis = handVisibleN(), i;
    orbit += dt * 0.16;
    if (hv.length !== vis) {
      var fresh = hv.length < vis;
      while (hv.length < vis) hv.push({ next: rnd(0.3, 1.2), p: -1, sp: 0, off: 0, init: false });
      if (hv.length > vis) hv.length = vis;
      for (i = 0; i < hv.length; i++) {
        var target = 6.2832 * i / hv.length;
        hv[i].tgt = target;
        if (!hv[i].init) {
          hv[i].off = target; hv[i].init = true;
          if (fresh && handN > 0 && hv.length > 1) {
            var G0 = handGeom(hv[i]);
            for (var k = 0; k < 6; k++) addPart({ k: 'smoke', x: G0.px + rnd(-0.08, 0.08) * L.R, y: G0.py - L.R * 0.3 + rnd(-0.08, 0.08) * L.R, vx: rnd(-40, 40), vy: rnd(-50, -10), life: 0, max: rnd(0.4, 0.8), r: rnd(0.05, 0.09) * L.R });
          }
        }
      }
    }
    if (!vis) return;
    var iv = handRate > 0 ? Math.max(0.42, vis / handRate) : 1e9;
    for (i = 0; i < hv.length; i++) {
      var h = hv[i];
      h.off += ((h.tgt != null ? h.tgt : h.off) - h.off) * Math.min(1, dt * 2.5);
      h.sp = Math.min(1, h.sp + dt / 0.35);
      if (h.p >= 0) {
        var before = h.p;
        h.p += dt / 0.26;
        if (before < 0.4 && h.p >= 0.4) handTap(h, handGeom(h));
        if (h.p >= 1) h.p = -1;
      } else {
        h.next -= dt;
        if (h.next <= 0) { h.p = 0; h.next = iv * rnd(0.85, 1.15); }
      }
    }
  }
  var handOrder = [];
  function drawHands() {
    var vis = hv.length, i;
    if (!vis) return;
    buildHandSprite();
    if (!handSpr) return;
    var R = L.R, S0 = Math.max(18, R * 0.42);
    handOrder.length = 0;
    for (i = 0; i < vis; i++) handOrder.push(i);
    var G = hv.map(function (h) { return handGeom(h); });
    handOrder.sort(function (a, b) { return G[a].sa - G[b].sa; });
    for (var j = 0; j < handOrder.length; j++) {
      i = handOrder[j];
      var h = hv[i], g = G[i], S = S0 * g.depth, tip = S * 31 / 64, pvx = S * 32 / 64, pvy = S * 34 / 64;
      var lift = R * 0.13 * g.depth, f = 0;
      if (h.p >= 0) { var q = h.p; f = q < 0.4 ? Math.pow(q / 0.4, 2) : 1 - Math.pow((q - 0.4) / 0.6, 0.6); }
      var hover = Math.sin(t * 2.2 + i * 1.9) * R * 0.012;
      var dx = Math.sin(g.rot), dy = -Math.cos(g.rot);            // finger direction (points down)
      var gap = lift * (1 - f) + hover * (1 - f);
      var tx = g.px - dx * gap, ty = g.py - dy * gap;               // finger tip
      var bx = tx - dx * tip, by = ty - dy * tip;                   // finger base (sprite pivot)
      var sc = h.sp < 1 ? 1 - Math.pow(1 - h.sp, 3) : 1;
      if (quality > 0 && f > 0.6) glow(g.px, g.py, R * 0.12, '255,236,190', (f - 0.6) * 1.2);
      ctx.save(); ctx.translate(bx, by); ctx.rotate(g.rot); if (sc !== 1) ctx.scale(sc, sc);
      if (g.sa < 0) ctx.globalAlpha = 0.92;
      ctx.drawImage(handSpr, -pvx, -pvy, S, S);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  function stageUp(n) {
    stage = Math.max(0, Math.min(MAT.length - 1, n | 0));
    var R = L.R;
    flashA = 0.5; flashRGB = '255,244,214';
    rings.push({ t: 0, max: 0.9, c: '255,236,160' }); rings.push({ t: -0.18, max: 0.9, c: '255,255,255' });
    sqv += 24; shake = Math.max(shake, 0.9);
    for (var i = 0; i < (quality > 0 ? 56 : 26); i++) {
      addPart({ k: 'conf', x: L.cx + rnd(-0.4, 0.4) * R, y: L.cy - R * 0.1, vx: rnd(-280, 280), vy: rnd(-560, -240), life: 0, max: rnd(1.5, 2.4), r: rnd(3, 6) * Math.max(0.8, R / 140), c: CONF[i % CONF.length], rot: rnd(0, 6.28), vr: rnd(-12, 12) });
    }
    burst(L.cx, L.cy - R * 0.1, '255,226,122', 30, 360);
  }
  function addPart(p) { if (parts.length < partCap) parts.push(p); }
  function onClick(x, y, gainText, big, lucky, comboN) {
    sqv += lucky ? 16 : 9;
    face.excite = 1;
    if (x != null) { face.lookX = Math.max(-1, Math.min(1, (x - L.cx) / L.R)); face.lookY = Math.max(-1, Math.min(1, (y - L.cy) / L.R)); }
    var ns = Math.min(quality > 0 ? 10 : 4, Math.floor((comboN || 0) / 8) + (fever ? 4 : 0));
    for (var si = 0; si < ns; si++) {
      var sa = rnd(0, 6.283), sv = rnd(80, 260);
      addPart({ k: 'spark', x: x != null ? x : L.cx, y: y != null ? y : L.cy, vx: Math.cos(sa) * sv, vy: Math.sin(sa) * sv - 60, life: 0, max: rnd(0.4, 0.8), r: rnd(1.6, 3.4), c: hexRgb(fever ? RAINBOW[si % RAINBOW.length] : CONF[si % CONF.length]) });
    }
    if (lucky) {
      burst(x != null ? x : L.cx, y != null ? y : L.cy, '255,226,122', quality > 0 ? 22 : 12, 300);
      rings.push({ t: 0, max: 0.5, c: '255,226,122', x: x != null ? x : L.cx, y: y != null ? y : L.cy, small: true });
      flashA = Math.max(flashA, 0.12); flashRGB = '255,230,150';
      if (gainText) { floatText(x != null ? x : L.cx, (y != null ? y : L.cy) - L.R * 0.3, gainText, 1.35, '#ffe27a'); gainText = ''; }
    }
    var R = L.R, sx = L.cx + rnd(-0.45, 0.45) * R, sy = L.cy - R * 0.02;
    for (var i = 0; i < 7; i++) {
      var a = rnd(-2.6, -0.55);
      addPart({ k: 'drop', x: sx + rnd(-0.1, 0.1) * R, y: sy, vx: Math.cos(a) * rnd(60, 170), vy: Math.sin(a) * rnd(140, 280), life: 0, max: rnd(0.5, 0.9), r: rnd(2, 4.5) * Math.max(0.7, R / 110) });
    }
    surf.push({ x: rnd(-0.6, 0.6), y: rnd(-0.4, 0.4), r: 0, max: rnd(0.08, 0.16), life: 0, ring: true });
    if (gainText) floatText(x != null ? x : sx, (y != null ? y : sy) - R * 0.25, gainText, big ? 1.35 : 1 + Math.min(0.18, (comboN || 0) / 250), big ? '#ffe27a' : (comboN || 0) >= 25 ? '#fff3b0' : '#ffffff');
  }
  function floatText(x, y, text, scale, color) {
    scale = scale || 1;
    if (texts.length > (quality > 0 ? 14 : 8)) texts.shift();
    var j = scale > 1.2 ? 0 : 1;
    texts.push({ x: x + rnd(-0.22, 0.22) * L.R * j, y: y + rnd(-0.08, 0.08) * L.R * j, vx: rnd(-14, 14) * j, text: text, s: scale, c: color || '#fff', life: 0, max: scale > 1.2 ? 1.35 : 0.85 });
  }
  function flyPotions(x, y, n) {
    if (quality === 0) n = Math.ceil(n / 2);
    if (flies.length > 30) return;
    for (var i = 0; i < n; i++) {
      flies.push({ x0: x + rnd(-0.3, 0.3) * L.R, y0: y + rnd(-0.15, 0.15) * L.R, t: -i * 0.04, dur: rnd(0.55, 0.85), rot: rnd(-2.5, 2.5), cx: rnd(-0.7, 0.7) * L.R, cy: -rnd(0.3, 0.9) * L.R });
    }
  }
  function setTarget(x, y) { target.x = x; target.y = y; }
  function takeArrivals() { var a = arrivals; arrivals = 0; return a; }
  function helperSpot(i) {
    var R = L.R;
    var spots = [[L.cx + R * 0.6, L.cy - R * 0.55], [L.cx - 1.9 * R, L.ground - R * 0.15], [L.cx - 1.12 * R, L.ground + 0.25 * R],
      [L.cx + 1.4 * R, L.ground - 0.25 * R], [L.cx - 1.42 * R, L.ground - 0.4 * R], [W * 0.5, L.horizon * 0.4],
      [L.cx - 1.85 * R, L.horizon], [L.cx + 1.95 * R, L.horizon - 0.3 * R], [L.cx - 0.95 * R, L.cy - 0.55 * R], [L.cx, L.cy - 0.4 * R], [L.cx, L.cy - 0.1 * R],
      [W * 0.5, L.horizon * 0.3], [W * 0.15, L.horizon * 0.45]];
    var p = spots[i] || [L.cx, L.cy];
    return { x: Math.max(R * 0.3, Math.min(W - R * 0.3, p[0])), y: p[1] };
  }
  function poof(i) {
    var p = helperSpot(i), R = L.R;
    for (var k = 0; k < 9; k++) addPart({ k: 'smoke', x: p.x + rnd(-0.15, 0.15) * R, y: p.y + rnd(-0.1, 0.1) * R, vx: rnd(-45, 45), vy: rnd(-55, -10), life: 0, max: rnd(0.5, 0.95), r: rnd(0.07, 0.13) * R });
    burst(p.x, p.y, '255,236,160', 16, 210);
    if (i === 5) nextBroom = 0;
    if (i === 8) { dragonBreath = 0.8; nextDragon = rnd(5, 9); }
    if (i === 11) nextUni = 0;
  }
  function burst(x, y, color, n, speed) {
    for (var i = 0; i < (n || 18); i++) {
      var a = rnd(0, 6.283), v = rnd(40, speed || 220);
      addPart({ k: 'spark', x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: rnd(0.5, 1.1), r: rnd(1.5, 3.5), c: color || '255,240,160' });
    }
  }
  // Combo counter next to the cauldron. n = current combo, frac = time left (0..1).
  function setCombo(n, frac) {
    if (n > combo.n) combo.pop = 1;
    combo.n = n; combo.frac = frac;
    if (n >= 3) { combo.shown = n; combo.fade = 1; }
  }
  function comboPos() {
    var R = L.R, x = L.cx + R * 1.5, y = L.cy - R * 0.62;
    return { x: Math.min(W - R * 0.55, x), y: Math.max(R * 0.5 + 40, y) };
  }
  function comboWord(text, level) {
    var p = comboPos();
    floatText(p.x, p.y - L.R * 0.3, text, 1.25 + Math.min(0.6, level * 0.08), RAINBOW[level % RAINBOW.length]);
    sqv += 10;
    if (level >= 4) { shake = Math.max(shake, 0.5); rings.push({ t: 0, max: 0.45, c: hexRgb(RAINBOW[level % RAINBOW.length]), x: p.x, y: p.y, small: true }); }
  }
  function setFever(on) {
    if (on && !fever) {
      feverT = 0; flashA = Math.max(flashA, 0.3); flashRGB = '255,170,230'; shake = Math.max(shake, 0.8); sqv += 20;
      rings.push({ t: 0, max: 0.8, c: '255,111,156' }); rings.push({ t: -0.12, max: 0.8, c: '95,243,230' }); rings.push({ t: -0.24, max: 0.8, c: '255,226,122' });
      for (var i = 0; i < (quality > 0 ? 40 : 18); i++) addPart({ k: 'conf', x: L.cx + rnd(-0.4, 0.4) * L.R, y: L.cy - L.R * 0.1, vx: rnd(-300, 300), vy: rnd(-560, -220), life: 0, max: rnd(1.3, 2.2), r: rnd(3, 6) * Math.max(0.8, L.R / 140), c: RAINBOW[i % RAINBOW.length], rot: rnd(0, 6.28), vr: rnd(-12, 12) });
    }
    fever = !!on;
  }
  function jackpot(x, y) {
    var R = L.R; x = x != null ? x : L.cx; y = y != null ? y : L.cy;
    flashA = Math.max(flashA, 0.5); flashRGB = '255,226,122'; shake = Math.max(shake, 1.1); sqv += 30;
    rings.push({ t: 0, max: 0.9, c: '255,226,122' }); rings.push({ t: -0.15, max: 0.9, c: '255,255,255' }); rings.push({ t: -0.3, max: 0.9, c: '255,111,156' });
    for (var i = 0; i < (quality > 0 ? 70 : 30); i++) addPart({ k: 'conf', x: x + rnd(-0.2, 0.2) * R, y: y, vx: rnd(-340, 340), vy: rnd(-640, -260), life: 0, max: rnd(1.5, 2.6), r: rnd(3, 6.5) * Math.max(0.8, R / 140), c: i % 3 ? '#ffe27a' : CONF[i % CONF.length], rot: rnd(0, 6.28), vr: rnd(-14, 14) });
    burst(x, y, '255,226,122', 40, 420);
    face.happy = 2.5;
  }
  // Bubbles: float up out of the cauldron and can be popped for a reward.
  function spawnBubble(golden, life) {
    if (bubs.length >= 3) return false;
    var R = L.R, r = Math.max(24, R * 0.2) * (golden ? 1.12 : 1);
    bubs.push({ x0: L.cx + rnd(-0.55, 0.55) * R, y0: L.cy - R * 0.1, y: L.cy, x: L.cx, r: r, t: 0, life: life, golden: !!golden, ph: rnd(0, 6.28), top: Math.max(r + 70, H * 0.22) });
    for (var i = 0; i < 6; i++) addPart({ k: 'drop', x: bubs[bubs.length - 1].x0, y: L.cy - R * 0.05, vx: rnd(-80, 80), vy: rnd(-260, -120), life: 0, max: rnd(0.4, 0.7), r: rnd(2, 3.5) });
    return true;
  }
  function hitBubble(x, y) {
    for (var i = bubs.length - 1; i >= 0; i--) {
      var b = bubs[i], hr = b.r * 1.3;
      if (b.t > 0.25 && (x - b.x) * (x - b.x) + (y - b.y) * (y - b.y) <= hr * hr) return i;
    }
    return -1;
  }
  function popBubble(i) {
    var b = bubs[i];
    if (!b) return null;
    bubs.splice(i, 1);
    var col = b.golden ? '255,226,122' : '159,231,255';
    burst(b.x, b.y, col, quality > 0 ? 26 : 12, 300);
    rings.push({ t: 0, max: 0.4, c: col, x: b.x, y: b.y, small: true });
    for (var k = 0; k < 8; k++) { var a = k * 0.785; addPart({ k: 'drop', x: b.x + Math.cos(a) * b.r, y: b.y + Math.sin(a) * b.r, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, life: 0, max: 0.45, r: rnd(2, 3.5) }); }
    if (b.golden) { flashA = Math.max(flashA, 0.18); flashRGB = '255,230,150'; face.happy = 1.5; }
    return { x: b.x, y: b.y, golden: b.golden };
  }
  function startNado() { nado.on = true; nado.t = 0; shake = 1; burst(L.cx, L.cy, pal.g, 30, 320); }

  // Wisp
  function spawnWisp(life) {
    wisp = { t: 0, life: life, p1: rnd(0, 6.28), p2: rnd(0, 6.28), x: -100, y: -100, alpha: 0, caught: false };
  }
  function wispPos(w) {
    var top = Math.max(60, H * 0.16), bottom = L.horizon - L.R * 0.15;
    return {
      x: W * (0.12 + 0.76 * (0.5 + 0.5 * Math.sin(w.t * 0.42 + w.p1))) ,
      y: top + (bottom - top) * (0.5 + 0.5 * Math.sin(w.t * 0.77 + w.p2))
    };
  }
  function hitWisp(x, y) {
    if (!wisp || wisp.caught || wisp.alpha < 0.3) return false;
    var r = Math.max(34, L.R * 0.28);
    return (x - wisp.x) * (x - wisp.x) + (y - wisp.y) * (y - wisp.y) <= r * r;
  }
  function catchWisp() { if (!wisp) return; wisp.caught = true; burst(wisp.x, wisp.y, '160,255,245', 34, 280); var w = wisp; wisp = null; return w; }
  function wispActive() { return !!wisp; }
  function hitCauldron(x, y) {
    var dx = (x - L.cx) / (L.R * 1.25), dy = (y - (L.cy + L.R * 0.38)) / (L.R * 0.95);
    return dx * dx + dy * dy <= 1;
  }

  // ---------------------------------------------------------------- update + draw
  function update(dt, intensity) {
    t += dt;
    // spring squash
    for (var acc = dt; acc > 1e-6; acc -= 1 / 240) { var hs = Math.min(acc, 1 / 240); sqv += (-sq * 300 - sqv * 20) * hs; sq += sqv * hs; }
    sq = Math.max(-1, Math.min(1, sq));
    shake = Math.max(0, shake - dt * 2.2);
    // surface bubbles
    var rate = 2.5 + Math.min(10, intensity);
    if (Math.random() < rate * dt && surf.length < 26) surf.push({ x: rnd(-0.75, 0.75), y: rnd(-0.55, 0.55), r: 0, max: rnd(0.04, 0.11), life: 0 });
    for (var i = surf.length - 1; i >= 0; i--) {
      var b = surf[i]; b.life += dt; b.r = b.max * Math.min(1, b.life / (b.ring ? 0.35 : 0.9));
      if (b.life > (b.ring ? 0.45 : 1.05)) {
        if (!b.ring && quality > 0 && parts.length < 200) addPart({ k: 'steam', x: L.cx + b.x * L.R * 0.85, y: L.cy + b.y * L.R * 0.17, vx: rnd(-8, 8), vy: rnd(-40, -20), life: 0, max: rnd(1.2, 2.2), r: rnd(1.5, 3) });
        surf.splice(i, 1);
      }
    }
    // particles
    for (i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.life += dt;
      if (p.life >= p.max) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.k === 'drop') p.vy += 620 * dt;
      else if (p.k === 'spark') { p.vx *= 1 - 1.8 * dt; p.vy *= 1 - 1.8 * dt; p.vy += 30 * dt; }
      else if (p.k === 'steam') p.vx += Math.sin(t * 2 + i) * 6 * dt;
      else if (p.k === 'ember') { p.vx += Math.sin(t * 3 + i * 1.7) * 30 * dt; p.vy *= 1 - 0.35 * dt; }
      else if (p.k === 'smoke') { p.vx *= 1 - 2.5 * dt; p.vy *= 1 - 2.5 * dt; }
      else if (p.k === 'conf') { p.vy += 520 * dt; p.vx *= 1 - 1.4 * dt; p.vy *= 1 - 0.8 * dt; p.rot += p.vr * dt; }
    }
    for (i = texts.length - 1; i >= 0; i--) { var tx = texts[i]; tx.life += dt; tx.y -= 62 * dt; tx.x += (tx.vx || 0) * dt; if (tx.life > tx.max) texts.splice(i, 1); }
    emberAcc += dt * (quality > 0 ? 8 : 0) * (dragonBreath > 0 ? 2.5 : 1);
    while (emberAcc >= 1) {
      emberAcc -= 1;
      addPart({ k: 'ember', x: L.cx + rnd(-0.4, 0.4) * L.R, y: L.cy + L.R * 1.02, vx: rnd(-14, 14), vy: rnd(-100, -55), life: 0, max: rnd(1.0, 2.0), r: rnd(0.9, 2.1), c: '255,' + Math.round(rnd(120, 200)) + ',60' });
    }
    for (i = flies.length - 1; i >= 0; i--) { var fy = flies[i]; fy.t += dt; if (fy.t >= fy.dur) { flies.splice(i, 1); arrivals++; } }
    updateHands(dt);
    for (i = rings.length - 1; i >= 0; i--) { rings[i].t += dt; if (rings[i].t >= rings[i].max) rings.splice(i, 1); }
    flashA = Math.max(0, flashA - dt * 1.6);
    // frogs hop
    for (i = 0; i < frogs.length; i++) { var f = frogs[i]; if (f.hop > 0) { f.hop += dt / 0.55; if (f.hop >= 1) { f.hop = 0; f.next = rnd(3, 9); } } else { f.next -= dt; if (f.next <= 0) f.hop = 0.001; } }
    catBlink -= dt; if (catBlink < -0.15) catBlink = rnd(2, 5);
    if (counts[8] > 0) { nextDragon -= dt; if (nextDragon <= 0) { dragonBreath = 0.8; nextDragon = rnd(5, 9); } }
    dragonBreath = Math.max(0, dragonBreath - dt);
    if (counts[5] > 0) {
      nextBroom -= dt;
      if (nextBroom <= 0) { brooms.push({ x: -60, y: rnd(0.14, 0.42) * L.horizon, v: rnd(0.16, 0.24) * W + 60, ph: rnd(0, 6) }); nextBroom = Math.max(5, 26 - 3.5 * Math.log2(counts[5] + 1)) * rnd(0.7, 1.3); }
    }
    for (i = brooms.length - 1; i >= 0; i--) {
      var br = brooms[i]; br.x += br.v * dt;
      if (Math.random() < 30 * dt) addPart({ k: 'spark', x: br.x - 20, y: br.y + Math.sin(t * 3 + br.ph) * 6 + 6, vx: -20, vy: rnd(-10, 10), life: 0, max: 0.8, r: rnd(1, 2.2), c: '255,230,140' });
      if (br.x > W + 80) brooms.splice(i, 1);
    }
    nextShoot -= dt * (1 + Math.min(4, Math.log2(counts[9] + 1))) * (quality > 0 ? 1 : 0.3);
    if (nextShoot <= 0) { shooting.push({ x: rnd(0.1, 0.9) * W, y: rnd(0.04, 0.3) * L.horizon, life: 0, max: 0.9, a: rnd(2.5, 2.9) }); nextShoot = rnd(6, 14); }
    for (i = shooting.length - 1; i >= 0; i--) { shooting[i].life += dt; if (shooting[i].life > shooting[i].max) shooting.splice(i, 1); }
    if (nado.on) { nado.t += dt; if (Math.random() < 54 * dt) burst(L.cx + rnd(-0.6, 0.6) * L.R, L.cy - rnd(0.2, 2.2) * L.R, pal.g, 1, 120); if (nado.t >= nado.dur) nado.on = false; }
    combo.pop = Math.max(0, combo.pop - dt * 5);
    if (combo.n < 3) combo.fade = Math.max(0, combo.fade - dt * 2.5);
    if (fever) feverT += dt;
    face.excite = Math.max(0, face.excite - dt * 4);
    face.happy = Math.max(0, face.happy - dt);
    face.nextBlink -= dt;
    if (face.nextBlink <= 0) { face.blink = 0.14; face.nextBlink = rnd(2.5, 5.5); }
    face.blink = Math.max(0, face.blink - dt);
    var look = wisp ? wisp : bubs.length ? bubs[0] : null;
    if (look) { face.lookX += (Math.max(-1, Math.min(1, (look.x - L.cx) / (L.R * 2))) - face.lookX) * Math.min(1, dt * 6); face.lookY += (-1 - face.lookY) * Math.min(1, dt * 6); }
    else { face.lookX *= 1 - Math.min(1, dt * 1.5); face.lookY *= 1 - Math.min(1, dt * 1.5); }
    for (i = bubs.length - 1; i >= 0; i--) {
      var bu = bubs[i]; bu.t += dt;
      var k5 = Math.min(1, bu.t / bu.life), ease = 1 - Math.pow(1 - k5, 1.6);
      bu.y = bu.y0 + (bu.top - bu.y0) * ease;
      bu.x = Math.max(bu.r + 6, Math.min(W - bu.r - 6, bu.x0 + Math.sin(bu.t * 1.7 + bu.ph) * L.R * 0.35 * Math.min(1, bu.t)));
      if (bu.t >= bu.life) { bubs.splice(i, 1); burst(bu.x, bu.y, '200,240,255', 8, 120); }
    }
    if (counts[11] > 0) {
      nextUni -= dt;
      if (nextUni <= 0) { unis.push({ x: W + 80, y: rnd(0.12, 0.38) * L.horizon, v: rnd(0.14, 0.2) * W + 70, ph: rnd(0, 6) }); nextUni = Math.max(7, 30 - 3.5 * Math.log2(counts[11] + 1)) * rnd(0.7, 1.3); }
    }
    for (i = unis.length - 1; i >= 0; i--) {
      var un = unis[i]; un.x -= un.v * dt;
      if (Math.random() < 40 * dt) addPart({ k: 'spark', x: un.x + 26, y: un.y + Math.sin(t * 3 + un.ph) * 6 + 4, vx: 30, vy: rnd(-10, 10), life: 0, max: 0.9, r: rnd(1.4, 2.6), c: hexRgb(RAINBOW[Math.floor(Math.random() * RAINBOW.length)]) });
      if (un.x < -100) unis.splice(i, 1);
    }
    if (wisp) {
      wisp.t += dt;
      var wp = wispPos(wisp); wisp.x = wp.x; wisp.y = wp.y;
      wisp.alpha = Math.min(1, wisp.t / 0.6, Math.max(0, (wisp.life - wisp.t) / 1.0));
      if (Math.random() < 36 * dt) addPart({ k: 'spark', x: wisp.x + rnd(-6, 6), y: wisp.y + rnd(-6, 6), vx: rnd(-20, 20), vy: rnd(-5, 25), life: 0, max: rnd(0.4, 0.9), r: rnd(1, 2.4), c: '170,255,245' });
      if (wisp.t >= wisp.life) wisp = null;
    }
  }

  function draw() {
    if (!ctx || !bg) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg, 0, 0);
    var ox = shake > 0 ? rnd(-1, 1) * 4 * shake : 0, oy = shake > 0 ? rnd(-1, 1) * 4 * shake : 0;
    ctx.setTransform(dpr, 0, 0, dpr, ox * dpr, oy * dpr);
    var R = L.R, i;
    // twinkling stars
    ctx.fillStyle = '#fff';
    for (i = 0; i < stars.length; i += (quality > 0 ? 1 : 2)) {
      var s = stars[i]; if (!s.tw) continue;
      ctx.globalAlpha = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * 2.2 + s.p));
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // moon glow
    var m = L.moon, glowA = 0.2 + Math.min(0.25, Math.log2(counts[7] + 1) * 0.05);
    glow(m.x, m.y, m.r * 3.4, '255,240,190', glowA);
    ctx.globalCompositeOperation = 'lighter';
    // shooting stars
    for (i = 0; i < shooting.length; i++) {
      var sh = shooting[i], k = sh.life / sh.max, len = 70;
      var hx = sh.x - Math.cos(sh.a) * 260 * k, hy = sh.y + Math.sin(sh.a) * 260 * k;
      ctx.strokeStyle = 'rgba(255,255,230,' + (1 - k) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(sh.a) * len, hy - Math.sin(sh.a) * len); ctx.stroke();
    }
    if (counts[7] > 0 && quality > 0) { // moonbeam
      ctx.fillStyle = 'rgba(255,240,190,0.05)';
      ctx.beginPath(); ctx.moveTo(m.x - m.r * 0.6, m.y); ctx.lineTo(m.x + m.r * 0.6, m.y); ctx.lineTo(L.cx + R * 0.9, L.cy); ctx.lineTo(L.cx - R * 0.9, L.cy); ctx.closePath(); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    // ground mist drifting along the tree line
    if (mistStrip && quality > 0) {
      var P = mistStrip._p, off = (t * 8) % P, my2 = L.horizon - mistStrip._h * 0.62;
      ctx.globalAlpha = 0.42;
      for (var mx2 = -off; mx2 < W; mx2 += P) ctx.drawImage(mistStrip, mx2, my2, P, mistStrip._h);
      ctx.globalAlpha = 1;
    }
    // fireflies
    for (i = 0; i < (quality > 0 ? fireflies.length : 0); i++) {
      var ff = fireflies[i], blink = Math.max(0, Math.sin(t * 1.3 + ff.p * 3));
      blink = blink * blink * blink;
      if (blink < 0.02) continue;
      var fx = ff.x + Math.sin(t * ff.f1 + ff.p) * ff.a, fyy = ff.y + Math.cos(t * ff.f2 + ff.p * 1.3) * ff.a * 0.45;
      glow(fx, fyy, 10, '210,255,140', 0.6 * blink);
      ctx.globalAlpha = blink; ctx.fillStyle = '#f4ffc8';
      ctx.beginPath(); ctx.arc(fx, fyy, 1.5, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
    }
    if (counts[12] > 0) drawPortal();
    for (i = 0; i < unis.length; i++) drawUnicorn(unis[i]);
    // brooms
    for (i = 0; i < brooms.length; i++) drawBroom(brooms[i]);
    if (counts[6] > 0) drawBog();
    if (counts[7] > 0) drawAltar();
    if (counts[4] > 0) drawCrystal();
    if (counts[3] > 0) drawCat();
    // cauldron contact shadow + warm fire light on the ground
    shadow(L.cx, L.ground + R * 0.04, R * 1.35, R * 0.26, 0.9);
    var fl = 0.34 + 0.05 * Math.sin(t * 9) + 0.03 * Math.sin(t * 21) + (dragonBreath > 0 ? 0.15 : 0);
    glowE(L.cx, L.ground + R * 0.05, R * 2.3, R * 0.7, '255,130,50', fl);
    if (nado.on) drawRays();
    if (fever) drawFeverGlow();
    if (counts[8] > 0) drawDragon();
    drawCauldron();
    drawHands();
    drawFire();
    if (counts[2] > 0) drawMushrooms();
    if (counts[1] > 0) drawFrogs();
    if (nado.on) drawNado();
    // particles
    for (i = 0; i < parts.length; i++) {
      var p = parts[i], a = 1 - p.life / p.max;
      if (p.k === 'drop') { ctx.globalAlpha = a; ctx.fillStyle = pal.b; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
      else if (p.k === 'steam') { ctx.globalAlpha = a * 0.35; ctx.fillStyle = pal.a; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + p.life), 0, 6.283); ctx.fill(); }
      else if (p.k === 'smoke') { var sr = p.r * (1 + p.life * 2.2); ctx.globalAlpha = a * 0.55; ctx.drawImage(glowSprite('214,204,240'), p.x - sr, p.y - sr, sr * 2, sr * 2); }
      else if (p.k === 'conf') {
        ctx.globalAlpha = Math.min(1, a * 3); ctx.fillStyle = p.c;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.cos(p.rot * 1.7));
        ctx.fillRect(-p.r * 0.8, -p.r * 0.45, p.r * 1.6, p.r * 0.9); ctx.restore();
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      if (p.k === 'spark') {
        ctx.globalAlpha = 1 - p.life / p.max; ctx.fillStyle = 'rgb(' + p.c + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      } else if (p.k === 'ember') {
        var ea = (1 - p.life / p.max) * (0.6 + 0.4 * Math.sin(t * 19 + p.x)), er = p.r * 2.6;
        ctx.globalAlpha = ea; ctx.drawImage(glowSprite(p.c), p.x - er, p.y - er, er * 2, er * 2);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalCompositeOperation = 'lighter';
    if (wisp) drawWisp();
    if (nado.on && nado.t < 0.4) { ctx.fillStyle = 'rgba(' + pal.g + ',' + (0.28 * (1 - nado.t / 0.4)).toFixed(3) + ')'; ctx.fillRect(-10, -10, W + 20, H + 20); }
    for (i = 0; i < rings.length; i++) {
      var rg = rings[i]; if (rg.t < 0) continue;
      var rk = rg.t / rg.max, grow = 1 - Math.pow(1 - rk, 3), rr = rg.small ? R * (0.1 + 0.5 * grow) : R * (1.1 + 2.4 * grow);
      ctx.globalAlpha = (1 - rk) * (rg.small ? 0.9 : 0.75); ctx.strokeStyle = 'rgb(' + rg.c + ')'; ctx.lineWidth = Math.max(2, R * (rg.small ? 0.03 : 0.07) * (1 - rk));
      ctx.beginPath(); ctx.ellipse(rg.x != null ? rg.x : L.cx, rg.y != null ? rg.y : L.cy + R * 0.3, rr, rg.small ? rr : rr * 0.55, 0, 0, 6.283); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (flashA > 0.01) { ctx.fillStyle = 'rgba(' + flashRGB + ',' + flashA.toFixed(3) + ')'; ctx.fillRect(-10, -10, W + 20, H + 20); }
    ctx.globalCompositeOperation = 'source-over';
    // floating texts
    for (i = 0; i < texts.length; i++) {
      var tx = texts[i], k2 = tx.life / tx.max;
      var size = Math.round(Math.max(15, R * 0.2) * tx.s * (k2 < 0.12 ? 0.7 + k2 * 2.5 : 1));
      ctx.globalAlpha = k2 > 0.65 ? (1 - k2) / 0.35 : 1;
      ctx.font = '800 ' + size + 'px BrewDisplay, sans-serif';
      ctx.textAlign = 'center'; ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(3, size * 0.22); ctx.strokeStyle = O; ctx.strokeText(tx.text, tx.x, tx.y);
      ctx.fillStyle = tx.c; ctx.fillText(tx.text, tx.x, tx.y);
    }
    ctx.globalAlpha = 1;
    for (i = 0; i < bubs.length; i++) drawBubble(bubs[i]);
    drawCombo();
    // potions flying to the counter
    var img = potionImg && potionImg.complete && potionImg.naturalWidth ? potionImg : null;
    for (i = 0; i < flies.length; i++) {
      var fly = flies[i]; if (fly.t < 0) continue;
      var k3 = fly.t / fly.dur, e = k3 < 0.5 ? 2 * k3 * k3 : 1 - Math.pow(-2 * k3 + 2, 2) / 2, u = 1 - e;
      var qx = u * u * fly.x0 + 2 * u * e * (fly.x0 + fly.cx) + e * e * target.x;
      var qy = u * u * fly.y0 + 2 * u * e * (fly.y0 + fly.cy) + e * e * target.y;
      var sz = Math.max(18, R * 0.24) * (1 - 0.45 * e) * Math.min(1, k3 / 0.12);
      if (quality > 0) glow(qx, qy, sz * 1.3, pal.g, 0.55);
      ctx.save(); ctx.translate(qx, qy); ctx.rotate(fly.rot * e);
      if (img) ctx.drawImage(img, -sz / 2, -sz / 2, sz, sz);
      else { ctx.fillStyle = pal.a; ctx.beginPath(); ctx.arc(0, 0, sz * 0.32, 0, 6.283); ctx.fill(); }
      ctx.restore();
    }
  }
  function drawRays() {
    var k = nado.t / nado.dur, f = Math.min(1, nado.t / 0.25) * (k > 0.7 ? (1 - k) / 0.3 : 1);
    var RL = Math.max(W, H) * 1.3, cy = L.cy - L.R * 0.2;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(' + pal.g + ',' + (0.075 * f).toFixed(3) + ')';
    var nr = quality > 0 ? 12 : 6;
    for (var i = 0; i < nr; i++) {
      var a0 = t * 0.3 + i * Math.PI * 2 / nr, aw = 0.06 + 0.02 * Math.sin(t * 2 + i);
      ctx.beginPath(); ctx.moveTo(L.cx, cy);
      ctx.lineTo(L.cx + Math.cos(a0 - aw) * RL, cy + Math.sin(a0 - aw) * RL);
      ctx.lineTo(L.cx + Math.cos(a0 + aw) * RL, cy + Math.sin(a0 + aw) * RL);
      ctx.closePath(); ctx.fill();
    }
    glow(L.cx, cy, L.R * 2.2, pal.g, 0.35 * f);
    ctx.globalCompositeOperation = 'source-over';
  }

  // Static cauldron body rendered once per size into a sprite (much cheaper per frame on low-end devices).
  function bodyPath(R) {
    ctx.beginPath(); ctx.moveTo(-R * 1.0, R * 0.02);
    ctx.bezierCurveTo(-R * 1.14, R * 0.66, -R * 0.6, R * 1.0, 0, R * 1.0);
    ctx.bezierCurveTo(R * 0.6, R * 1.0, R * 1.14, R * 0.66, R * 1.0, R * 0.02);
    ctx.closePath();
  }
  function buildBody() {
    var R = L.R, key = R.toFixed(2) + '|' + dpr + '|' + stage;
    if (bodyKey === key && bodyC) return;
    bodyKey = key;
    var M = MAT[stage] || MAT[0];
    var w = Math.max(1, Math.ceil(2.6 * R * dpr)), h = Math.max(1, Math.ceil(1.15 * R * dpr));
    bodyC = document.createElement('canvas'); bodyC.width = w; bodyC.height = h;
    bounceC = document.createElement('canvas'); bounceC.width = w; bounceC.height = h;
    decoC = null;
    var main = ctx, i;
    try {
      ctx = bodyC.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 1.3 * R * dpr, 0.05 * R * dpr);
      ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(2.5, R * 0.04); ctx.strokeStyle = O;
      // feet
      ctx.fillStyle = M.feet;
      [-0.55, 0.55].forEach(function (fx) { roundRect(fx * R - R * 0.12, R * 0.84, R * 0.24, R * 0.2, R * 0.06); ctx.fill(); ctx.stroke(); });
      // handles (outlined)
      ctx.lineWidth = Math.max(4, R * 0.1); ctx.strokeStyle = O;
      ctx.beginPath(); ctx.arc(-R * 1.06, R * 0.24, R * 0.13, 0, 6.283); ctx.stroke();
      ctx.beginPath(); ctx.arc(R * 1.06, R * 0.24, R * 0.13, 0, 6.283); ctx.stroke();
      ctx.lineWidth = Math.max(2.5, R * 0.065); ctx.strokeStyle = M.handle;
      ctx.beginPath(); ctx.arc(-R * 1.06, R * 0.24, R * 0.13, 0, 6.283); ctx.stroke();
      ctx.beginPath(); ctx.arc(R * 1.06, R * 0.24, R * 0.13, 0, 6.283); ctx.stroke();
      ctx.lineWidth = Math.max(2.5, R * 0.04); ctx.strokeStyle = O;
      // body
      var body = ctx.createLinearGradient(-R, 0, R, 0);
      body.addColorStop(0, M.body[0]);
      if (M.hi) { body.addColorStop(0.16, M.hi); body.addColorStop(0.3, M.body[0]); }
      body.addColorStop(0.5, M.body[1]); body.addColorStop(1, M.body[2]);
      ctx.fillStyle = body;
      bodyPath(R); ctx.fill();
      ctx.save(); ctx.clip();
      // vertical shading: darker towards the bottom
      var vs = ctx.createLinearGradient(0, 0, 0, R);
      vs.addColorStop(0, 'rgba(0,0,0,0)'); vs.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = vs; ctx.fillRect(-1.2 * R, 0, 2.4 * R, 1.1 * R);
      if (M.blot) for (var d = 0; d < BLOT.length; d++) {
        var bl = BLOT[d]; ctx.fillStyle = bl[3] ? 'rgba(255,255,255,' + (M.blot * 0.3) + ')' : 'rgba(0,0,0,' + M.blot + ')';
        ctx.beginPath(); ctx.ellipse(bl[0] * R, bl[1] * R, bl[2] * R, bl[2] * R * 0.7, bl[0], 0, 6.283); ctx.fill();
      }
      decoBody(M, R);
      // riveted band
      ctx.strokeStyle = M.band; ctx.lineWidth = R * 0.1;
      ctx.beginPath(); ctx.ellipse(0, R * 0.2, R * 1.12, R * 0.17, 0, 0, Math.PI); ctx.stroke();
      ctx.strokeStyle = M.bandHi; ctx.lineWidth = Math.max(1, R * 0.016);
      ctx.beginPath(); ctx.ellipse(0, R * 0.165, R * 1.12, R * 0.17, 0, 0.2, Math.PI - 0.2); ctx.stroke();
      for (var rv = 0; rv < 7; rv++) {
        var ra = 0.55 + rv * (Math.PI - 1.1) / 6, rx = Math.cos(ra) * R * 1.12, ry = R * 0.2 + Math.sin(ra) * R * 0.17;
        if (M.deco === 'gems' && (rv === 1 || rv === 3 || rv === 5)) { gem(rx, ry, R * 0.055, rv === 3 ? '#ff4d6d' : '#4dc3ff'); continue; }
        ctx.fillStyle = M.riv[0]; ctx.beginPath(); ctx.arc(rx, ry + R * 0.008, R * 0.03, 0, 6.283); ctx.fill();
        ctx.fillStyle = M.riv[1]; ctx.beginPath(); ctx.arc(rx, ry, R * 0.024, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.arc(rx - R * 0.008, ry - R * 0.008, R * 0.009, 0, 6.283); ctx.fill();
      }
      ctx.restore();
      bodyPath(R); ctx.stroke();
      // soft specular
      ctx.globalAlpha = M.hi ? 0.3 : 0.12; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = R * 0.06; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, R * 0.05, R * 0.82, Math.PI * 0.72, Math.PI * 0.9); ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineCap = 'butt';
      // fire bounce light mask
      ctx = bounceC.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 1.3 * R * dpr, 0.05 * R * dpr);
      bodyPath(R); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.globalCompositeOperation = 'source-in';
      ctx.drawImage(glowSprite('255,120,40'), -R * 1.1, R * 0.37, R * 2.2, R * 1.5);
      ctx.globalCompositeOperation = 'source-over';
      // pulsing magic glow layer (gold glints, jade runes, crystal light, lava cracks, stars)
      if (M.glow) {
        decoC = document.createElement('canvas'); decoC.width = w; decoC.height = h;
        ctx = decoC.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 1.3 * R * dpr, 0.05 * R * dpr);
        bodyPath(R); ctx.save(); ctx.clip();
        decoGlow(M, R);
        ctx.restore();
      }
    } finally { ctx = main; }
  }
  function gem(x, y, r, col) {
    ctx.fillStyle = col; ctx.strokeStyle = O; ctx.lineWidth = Math.max(1.5, r * 0.35);
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.3, r * 0.22, 0, 6.283); ctx.fill();
  }
  var DOTS = [[-0.62, 0.5], [-0.3, 0.72], [0.1, 0.55], [0.42, 0.76], [0.66, 0.46], [-0.08, 0.86], [0.3, 0.38], [-0.5, 0.32], [0.78, 0.6], [-0.78, 0.62]];
  function star4(x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x + r * 0.18, y - r * 0.18, x + r, y); ctx.quadraticCurveTo(x + r * 0.18, y + r * 0.18, x, y + r);
    ctx.quadraticCurveTo(x - r * 0.18, y + r * 0.18, x - r, y); ctx.quadraticCurveTo(x - r * 0.18, y - r * 0.18, x, y - r); ctx.fill();
  }
  function crackPath(R) {
    ctx.beginPath();
    ctx.moveTo(-0.72 * R, 0.36 * R); ctx.lineTo(-0.58 * R, 0.5 * R); ctx.lineTo(-0.64 * R, 0.64 * R); ctx.lineTo(-0.46 * R, 0.78 * R);
    ctx.moveTo(-0.58 * R, 0.5 * R); ctx.lineTo(-0.4 * R, 0.52 * R);
    ctx.moveTo(0.18 * R, 0.4 * R); ctx.lineTo(0.3 * R, 0.56 * R); ctx.lineTo(0.22 * R, 0.7 * R); ctx.lineTo(0.36 * R, 0.86 * R);
    ctx.moveTo(0.3 * R, 0.56 * R); ctx.lineTo(0.48 * R, 0.6 * R); ctx.lineTo(0.6 * R, 0.52 * R);
    ctx.moveTo(-0.16 * R, 0.66 * R); ctx.lineTo(-0.06 * R, 0.8 * R); ctx.lineTo(-0.14 * R, 0.92 * R);
  }
  function runePath(R) {
    ctx.beginPath();
    for (var k = -2; k <= 2; k++) {
      var x = k * 0.36 * R, y = 0.56 * R + Math.abs(k) * 0.03 * R;
      ctx.moveTo(x - 0.1 * R, y + 0.06 * R); ctx.quadraticCurveTo(x - 0.1 * R, y - 0.1 * R, x, y - 0.08 * R);
      ctx.quadraticCurveTo(x + 0.1 * R, y - 0.06 * R, x + 0.06 * R, y + 0.04 * R); ctx.quadraticCurveTo(x + 0.02 * R, y + 0.1 * R, x - 0.04 * R, y + 0.02 * R);
    }
  }
  function decoBody(M, R) {
    var i;
    if (M.deco === 'patina') {
      ctx.fillStyle = 'rgba(80,205,170,0.3)';
      DOTS.forEach(function (p, k) { if (k % 2) { ctx.beginPath(); ctx.ellipse(p[0] * R, p[1] * R, R * 0.07, R * 0.045, k, 0, 6.283); ctx.fill(); } });
    } else if (M.deco === 'shine') {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineCap = 'round';
      ctx.lineWidth = R * 0.05; ctx.beginPath(); ctx.arc(0, R * 0.05, R * 0.66, Math.PI * 0.68, Math.PI * 0.86); ctx.stroke();
      ctx.lineWidth = R * 0.025; ctx.beginPath(); ctx.arc(0, R * 0.05, R * 0.92, Math.PI * 0.12, Math.PI * 0.3); ctx.stroke();
    } else if (M.deco === 'gems') {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      [[-0.5, 0.55, 0.035], [0.35, 0.7, 0.025], [-0.15, 0.82, 0.02]].forEach(function (p) { star4(p[0] * R, p[1] * R, p[2] * R * 2); });
    } else if (M.deco === 'runes') {
      ctx.strokeStyle = 'rgba(5,40,24,0.75)'; ctx.lineWidth = Math.max(1.5, R * 0.025); ctx.lineCap = 'round';
      runePath(R); ctx.stroke();
    } else if (M.deco === 'facets') {
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = Math.max(1, R * 0.015);
      ctx.beginPath();
      [[-0.95, 0.1, -0.45, 0.95], [-0.45, 0.25, 0.05, 1.0], [0.1, 0.22, -0.4, 0.95], [0.55, 0.2, 0.15, 0.98], [0.95, 0.15, 0.5, 0.9], [-0.7, 0.2, -0.95, 0.5]].forEach(function (l) {
        ctx.moveTo(l[0] * R, l[1] * R); ctx.lineTo(l[2] * R, l[3] * R);
      });
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath(); ctx.moveTo(-0.95 * R, 0.1 * R); ctx.lineTo(-0.45 * R, 0.95 * R); ctx.lineTo(-0.45 * R, 0.25 * R); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0.1 * R, 0.22 * R); ctx.lineTo(0.55 * R, 0.2 * R); ctx.lineTo(0.15 * R, 0.98 * R); ctx.closePath(); ctx.fill();
    } else if (M.deco === 'cracks') {
      ctx.strokeStyle = '#120606'; ctx.lineWidth = Math.max(2, R * 0.04); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      crackPath(R); ctx.stroke();
      ctx.strokeStyle = '#ff7a1e'; ctx.lineWidth = Math.max(1, R * 0.018);
      crackPath(R); ctx.stroke();
    } else if (M.deco === 'stars') {
      for (i = 0; i < DOTS.length; i++) { ctx.fillStyle = i % 3 ? '#ffffff' : '#ffe27a'; star4(DOTS[i][0] * R, DOTS[i][1] * R, R * (i % 3 ? 0.022 : 0.04)); }
    } else if (M.deco === 'candy') {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = R * 0.11; ctx.lineCap = 'butt';
      ctx.beginPath();
      for (i = -4; i <= 4; i++) { ctx.moveTo(i * R * 0.38 - R * 0.5, R * 1.1); ctx.lineTo(i * R * 0.38 + R * 0.5, 0); }
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      [[-0.55, 0.45, 0.04], [0.42, 0.7, 0.03], [0.1, 0.88, 0.025]].forEach(function (p) { star4(p[0] * R, p[1] * R, p[2] * R); });
    } else if (M.deco === 'rainbow') {
      ctx.lineWidth = R * 0.075;
      for (i = 0; i < RAINBOW.length; i++) { ctx.strokeStyle = RAINBOW[i]; ctx.beginPath(); ctx.ellipse(0, R * 1.35, R * (1.45 - i * 0.075), R * (0.95 - i * 0.075), 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); }
      for (i = 0; i < DOTS.length; i += 2) { ctx.fillStyle = '#ffffff'; star4(DOTS[i][0] * R, DOTS[i][1] * R, R * 0.03); }
    }
    ctx.lineCap = 'butt';
  }
  function decoGlow(M, R) {
    var i;
    if (M.deco === 'candy' || M.deco === 'rainbow') {
      for (i = 0; i < DOTS.length; i++) { var gc = M.deco === 'candy' ? (i % 2 ? '255,190,235' : '255,255,255') : hexRgb(RAINBOW[i % RAINBOW.length]); ctx.drawImage(glowSprite(gc), DOTS[i][0] * R - R * 0.1, DOTS[i][1] * R - R * 0.1, R * 0.2, R * 0.2); }
      return;
    }
    if (M.deco === 'cracks') {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      [[0.12, 0.2], [0.3, 0.09], [0.9, 0.025]].forEach(function (g) { ctx.strokeStyle = 'rgba(255,140,40,' + g[0] + ')'; ctx.lineWidth = Math.max(1, R * g[1]); crackPath(R); ctx.stroke(); });
      ctx.drawImage(glowSprite('255,90,20'), -R * 1.1, R * 0.45, R * 2.2, R * 0.9);
    } else if (M.deco === 'runes') {
      ctx.lineCap = 'round';
      [[0.15, 0.09], [0.6, 0.025]].forEach(function (g) { ctx.strokeStyle = 'rgba(140,255,200,' + g[0] + ')'; ctx.lineWidth = Math.max(1, R * g[1]); runePath(R); ctx.stroke(); });
    } else if (M.deco === 'facets') {
      ctx.drawImage(glowSprite('190,160,255'), -R * 0.9, R * 0.15, R * 1.8, R * 0.9);
      ctx.fillStyle = '#ffffff';
      [[-0.55, 0.42, 0.05], [0.4, 0.62, 0.04], [0.05, 0.3, 0.03]].forEach(function (p) { star4(p[0] * R, p[1] * R, p[2] * R); });
    } else if (M.deco === 'stars') {
      for (i = 0; i < DOTS.length; i++) { ctx.drawImage(glowSprite(i % 3 ? '220,230,255' : '255,230,150'), DOTS[i][0] * R - R * 0.08, DOTS[i][1] * R - R * 0.08, R * 0.16, R * 0.16); }
    } else if (M.deco === 'gems') {
      ctx.fillStyle = '#ffffff';
      [[-0.5, 0.55, 0.06], [0.35, 0.7, 0.045], [0.62, 0.38, 0.035]].forEach(function (p) { star4(p[0] * R, p[1] * R, p[2] * R); });
    }
  }
  function drawCauldron() {
    var R = L.R, cx = L.cx, cy = L.cy;
    var sx = 1 + sq * 0.12, sy = 1 - sq * 0.12;
    ctx.save();
    ctx.translate(cx, cy + R * 0.98); ctx.scale(sx, sy); ctx.translate(0, -R * 0.98);
    buildBody();
    ctx.drawImage(bodyC, -1.3 * R, -0.05 * R, 2.6 * R, 1.15 * R);
    var fk = 0.5 + 0.06 * Math.sin(t * 9) + 0.04 * Math.sin(t * 23) + (dragonBreath > 0 ? 0.2 : 0);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, fk);
    ctx.drawImage(bounceC, -1.3 * R, -0.05 * R, 2.6 * R, 1.15 * R);
    if (decoC && quality > 0) { ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 2.2); ctx.drawImage(decoC, -1.3 * R, -0.05 * R, 2.6 * R, 1.15 * R); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    drawFace(R);
    var M = MAT[stage] || MAT[0];
    ctx.lineJoin = 'round'; ctx.strokeStyle = O; ctx.lineWidth = Math.max(2.5, R * 0.04);
    // rim
    var rimG = ctx.createLinearGradient(0, -R * 0.25, 0, R * 0.25);
    rimG.addColorStop(0, M.rim[0]); rimG.addColorStop(0.5, M.rim[1]); rimG.addColorStop(1, M.rim[2]);
    ctx.fillStyle = rimG;
    ctx.beginPath(); ctx.ellipse(0, 0, R * 1.07, R * 0.25, 0, 0, 6.283); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.38)'; ctx.lineWidth = Math.max(1.5, R * 0.022); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(0, -R * 0.005, R * 1.0, R * 0.215, 0, Math.PI * 1.1, Math.PI * 1.42); ctx.stroke();
    ctx.strokeStyle = hexA(pal.a, 0.35);
    ctx.beginPath(); ctx.ellipse(0, R * 0.01, R * 1.0, R * 0.22, 0, Math.PI * 0.18, Math.PI * 0.5); ctx.stroke();
    ctx.lineCap = 'butt'; ctx.strokeStyle = O; ctx.lineWidth = Math.max(2.5, R * 0.04);
    // liquid
    var lg;
    if (galaxy) {
      lg = ctx.createRadialGradient(-R * 0.2, -R * 0.03, R * 0.05, 0, 0, R * 0.95);
      lg.addColorStop(0, '#e9dcff'); lg.addColorStop(0.35, '#8a5cff'); lg.addColorStop(1, '#1f1352');
    } else {
      lg = ctx.createRadialGradient(-R * 0.25, -R * 0.04, R * 0.05, 0, 0, R * 0.95);
      lg.addColorStop(0, pal.a); lg.addColorStop(0.55, pal.b); lg.addColorStop(1, pal.c);
    }
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.ellipse(0, 0, R * 0.92, R * 0.185, 0, 0, 6.283); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, R * 0.92, R * 0.185, 0, 0, 6.283); ctx.clip();
    if (galaxy) {
      ctx.fillStyle = '#fff';
      for (var g = 0; g < 26; g++) {
        var ang = t * 0.4 + g * 2.399, rr = (g / 26) * 0.88;
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + g);
        ctx.beginPath(); ctx.arc(Math.cos(ang) * rr * R, Math.sin(ang) * rr * R * 0.2, 1.2 + (g % 3) * 0.5, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // surface waves
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = Math.max(1.5, R * 0.018); ctx.lineCap = 'round';
    for (var w = 0; w < 3; w++) {
      var off = Math.sin(t * 1.6 + w * 2.1) * R * 0.18;
      ctx.beginPath(); ctx.ellipse(off * 0.6 - R * 0.15 + w * R * 0.18, -R * 0.02 + w * R * 0.05, R * (0.22 + w * 0.05), R * 0.035, 0, Math.PI * 1.05, Math.PI * 1.75); ctx.stroke();
    }
    // bubbles
    for (var b = 0; b < surf.length; b++) {
      var bb = surf[b], bx = bb.x * R * 0.82, by = bb.y * R * 0.15, br = bb.r * R;
      if (bb.ring) { ctx.strokeStyle = 'rgba(255,255,255,' + (1 - bb.life / 0.45) * 0.6 + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(bx, by, br * 2.2, br * 0.6, 0, 0, 6.283); ctx.stroke(); }
      else {
        ctx.fillStyle = galaxy ? 'rgba(220,200,255,0.75)' : pal.a; ctx.beginPath(); ctx.arc(bx, by - br * 0.4, br, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(bx - br * 0.35, by - br * 0.8, br * 0.3, 0, 6.283); ctx.fill();
      }
    }
    var ish = ctx.createLinearGradient(0, -R * 0.185, 0, -R * 0.03);
    ish.addColorStop(0, 'rgba(6,2,18,0.6)'); ish.addColorStop(1, 'rgba(6,2,18,0)');
    ctx.fillStyle = ish; ctx.fillRect(-R, -R * 0.2, R * 2, R * 0.18);
    ctx.globalAlpha = 0.28; ctx.drawImage(glowSprite('255,255,255'), -R * 0.66, -R * 0.015, R * 0.62, R * 0.1); ctx.globalAlpha = 1;
    ctx.restore();
    // glow above liquid
    glow(0, -R * 0.1, R * 1.3, galaxy ? '170,130,255' : pal.g, 0.3);
    // inner rim lip (front)
    ctx.strokeStyle = M.lip; ctx.lineWidth = Math.max(2, R * 0.035);
    ctx.beginPath(); ctx.ellipse(0, 0, R * 0.95, R * 0.2, 0, 0.05, Math.PI - 0.05); ctx.stroke();
    ctx.restore();
    if (counts[0] > 0) drawSpoon(sx, sy);
  }
  function drawSpoon() {
    var R = L.R, spd = 0.8 + Math.min(2.2, Math.log2(counts[0] + 1) * 0.35), th = t * spd;
    var tipX = L.cx + Math.cos(th) * R * 0.45, tipY = L.cy + Math.sin(th) * R * 0.09;
    var endX = tipX + R * 0.45 + Math.cos(th) * R * 0.1, endY = tipY - R * 0.85;
    ctx.lineCap = 'round';
    ctx.strokeStyle = O; ctx.lineWidth = R * 0.12; ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(endX, endY); ctx.stroke();
    ctx.strokeStyle = '#c98a4b'; ctx.lineWidth = R * 0.07; ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(endX, endY); ctx.stroke();
    ctx.strokeStyle = '#e8b47a'; ctx.lineWidth = R * 0.02; ctx.beginPath(); ctx.moveTo(tipX + R * 0.1, tipY - R * 0.2); ctx.lineTo(endX - R * 0.03, endY + R * 0.06); ctx.stroke();
    ctx.lineCap = 'butt';
  }
  function drawFire() {
    var R = L.R, cx = L.cx, by = L.cy + R * 1.16;
    ctx.lineWidth = Math.max(2, R * 0.03); ctx.strokeStyle = O;
    glowE(cx, by + R * 0.02, R * 0.8, R * 0.24, '255,90,30', 0.75 + 0.1 * Math.sin(t * 11));
    var boost = dragonBreath > 0 ? 1.55 : 1;
    glowE(cx, by - R * 0.2, R * 0.75, R * 0.45, '255,140,50', 0.5 + 0.08 * Math.sin(t * 13));
    var xs = [-0.44, -0.3, -0.15, 0, 0.15, 0.3, 0.44], hs = [0.62, 0.8, 0.95, 1, 0.93, 0.78, 0.6];
    var outer = counts[8] > 0 ? '#ff5a2a' : '#ff6d1f';
    for (var i = 0; i < xs.length; i++) {
      var h = R * (0.4 * hs[i] + 0.07 * Math.sin(t * 7.3 + i * 1.7) + 0.045 * Math.sin(t * 13.1 + i * 2.3)) * boost;
      var lean = Math.sin(t * 2.1 + i) * R * 0.02;
      flame(cx + xs[i] * R + lean, by + R * 0.05, R * (0.1 + 0.035 * hs[i]), h + R * 0.07, outer, '#ffb43d');
    }
    ctx.globalCompositeOperation = 'lighter';
    for (i = 1; i < xs.length - 1; i++) {
      var h2 = R * (0.24 * hs[i] + 0.05 * Math.sin(t * 9.7 + i * 1.3)) * boost;
      ctx.globalAlpha = 0.85;
      flame(cx + xs[i] * R, by + R * 0.04, R * 0.06, h2 + R * 0.06, counts[8] > 0 && dragonBreath > 0 ? '#9fe3ff' : '#ffd25a', '#fff2b8');
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    buildLogs();
    ctx.drawImage(logsC, cx - R * 0.7, by - R * 0.22, R * 1.4, R * 0.44);
    glowE(cx, by - R * 0.01, R * 0.5, R * 0.09, '255,120,40', 0.5 + 0.15 * Math.sin(t * 7));
  }
  var logsC = null, logsKey = '';
  function buildLogs() {
    var R = L.R, key = R.toFixed(2) + '|' + dpr;
    if (logsKey === key && logsC) return;
    logsKey = key;
    logsC = document.createElement('canvas');
    logsC.width = Math.max(1, Math.ceil(1.4 * R * dpr)); logsC.height = Math.max(1, Math.ceil(0.44 * R * dpr));
    var main = ctx;
    try {
      ctx = logsC.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0.7 * R * dpr, 0.22 * R * dpr);
      drawLog(0, 0, 0.18, R); drawLog(0, 0, -0.18, R);
    } finally { ctx = main; }
  }
  function drawLog(cx, by, rot, R) {
    var lw = R * 1.1, lh = R * 0.15;
    ctx.save(); ctx.translate(cx, by); ctx.rotate(rot);
    var lg = ctx.createLinearGradient(0, -lh / 2, 0, lh / 2);
    lg.addColorStop(0, '#94603a'); lg.addColorStop(0.45, '#6b3f22'); lg.addColorStop(1, '#3a200f');
    ctx.fillStyle = lg; ctx.strokeStyle = O; ctx.lineWidth = Math.max(2, R * 0.03);
    roundRect(-lw / 2, -lh / 2, lw, lh, lh * 0.45); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(30,12,4,0.55)'; ctx.lineWidth = Math.max(1, R * 0.012); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-lw * 0.4, -lh * 0.14); ctx.lineTo(lw * 0.08, -lh * 0.18);
    ctx.moveTo(-lw * 0.22, lh * 0.2); ctx.lineTo(lw * 0.34, lh * 0.14); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,160,70,0.8)'; ctx.lineWidth = Math.max(1, R * 0.016);
    ctx.beginPath(); ctx.moveTo(-lw * 0.12, lh * 0.04); ctx.lineTo(lw * 0.02, -lh * 0.06); ctx.lineTo(lw * 0.14, lh * 0.05); ctx.stroke();
    var ex = rot > 0 ? lw / 2 - lh * 0.32 : -lw / 2 + lh * 0.32;
    ctx.fillStyle = '#c99260'; ctx.strokeStyle = O; ctx.lineWidth = Math.max(1.5, R * 0.022);
    ctx.beginPath(); ctx.ellipse(ex, 0, lh * 0.3, lh * 0.46, 0, 0, 6.283); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(110,62,30,0.85)'; ctx.lineWidth = Math.max(1, R * 0.01);
    ctx.beginPath(); ctx.ellipse(ex, 0, lh * 0.15, lh * 0.24, 0, 0, 6.283); ctx.stroke();
    ctx.lineCap = 'butt'; ctx.restore();
  }
  var flameCache = {};
  function flameSprite(c1, c2) {
    var key = c1 + c2, c = flameCache[key];
    if (c) return c;
    c = document.createElement('canvas'); c.width = 64; c.height = 128;
    var g = c.getContext('2d'), gr = g.createLinearGradient(0, 128, 0, 0);
    gr.addColorStop(0, c2); gr.addColorStop(1, c1);
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, 128);
    g.quadraticCurveTo(-3.2, 57.6, 32, 0); g.quadraticCurveTo(67.2, 57.6, 64, 128);
    g.closePath(); g.fill();
    flameCache[key] = c;
    return c;
  }
  function flame(x, y, w, h, c1, c2) { if (h > 1) ctx.drawImage(flameSprite(c1, c2), x - w, y - h, w * 2, h); }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function frogCount(n) { return n >= 40 ? 4 : n >= 15 ? 3 : n >= 5 ? 2 : 1; }
  function drawFrogs() {
    var R = L.R, n = frogCount(counts[1]);
    var spots = [[-1.9, 0.08], [1.92, 0.1], [-2.42, 0.26], [2.45, 0.28]];
    var s = R * 0.22;
    for (var i = 0; i < n; i++) {
      var x = L.cx + spots[i][0] * R, y = L.ground + spots[i][1] * R;
      if (x < s * 1.1 || x > W - s * 1.1) continue;
      var f = frogs[i], hop = f.hop > 0 ? Math.sin(Math.PI * f.hop) : 0;
      shadow(x, y + s * 0.05, s * (1.15 - hop * 0.4), s * (0.32 - hop * 0.1), 0.75 - hop * 0.35);
      drawFrog(x, y - hop * R * 0.35, s, i % 2 === 1, 1 + Math.sin(t * 3 + i) * 0.03);
    }
  }
  function drawFrog(x, y, s, flip, br) {
    ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
    ctx.lineWidth = Math.max(2, s * 0.1); ctx.strokeStyle = O; ctx.lineJoin = 'round';
    ctx.fillStyle = '#5cc95a';
    ctx.beginPath(); ctx.ellipse(0, -s * 0.55, s * 0.95 * br, s * 0.62 / br, 0, 0, 6.283); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c9f5a6'; ctx.beginPath(); ctx.ellipse(s * 0.1, -s * 0.38, s * 0.5, s * 0.3, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#5cc95a';
    [-0.42, 0.42].forEach(function (ex) { ctx.beginPath(); ctx.arc(ex * s + s * 0.1, -s * 1.08, s * 0.3, 0, 6.283); ctx.fill(); ctx.stroke(); });
    ctx.fillStyle = O;
    [-0.42, 0.42].forEach(function (ex) { ctx.beginPath(); ctx.arc(ex * s + s * 0.16, -s * 1.08, s * 0.13, 0, 6.283); ctx.fill(); });
    ctx.strokeStyle = O; ctx.lineWidth = Math.max(1.5, s * 0.08); ctx.beginPath(); ctx.arc(s * 0.12, -s * 0.72, s * 0.28, 0.25, Math.PI - 0.25); ctx.stroke();
    // wizard hat
    ctx.fillStyle = '#7b4fd6'; ctx.lineWidth = Math.max(2, s * 0.09);
    ctx.beginPath(); ctx.moveTo(-s * 0.35, -s * 1.28); ctx.lineTo(s * 0.18, -s * 2.2); ctx.lineTo(s * 0.62, -s * 1.28); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(s * 0.16, -s * 1.62, s * 0.09, 0, 6.283); ctx.fill();
    ctx.restore();
  }
  function drawMushrooms() {
    var R = L.R, n = counts[2], k = n >= 50 ? 5 : n >= 20 ? 4 : n >= 8 ? 3 : n >= 3 ? 2 : 1;
    var spots = [[-1.12, 0.4, 0.21, '#ff73c6'], [1.14, 0.44, 0.19, '#5ff3e6'], [-0.84, 0.56, 0.14, '#5ff3e6'], [1.5, 0.56, 0.15, '#ff73c6'], [-1.5, 0.6, 0.13, '#ffd36b']];
    for (var i = 0; i < k; i++) {
      var sp = spots[i], x = L.cx + sp[0] * R, y = L.ground + sp[1] * R, s = sp[2] * R;
      if (y > H - 4) y = H - 4;
      var pulse = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.3);
      shadow(x, y + s * 0.04, s * 0.85, s * 0.22, 0.7);
      if (quality > 0) glow(x, y - s * 0.9, s * 2.2, hexRgb(sp[3]), 0.25 + pulse * 0.15);
      ctx.lineWidth = Math.max(2, s * 0.12); ctx.strokeStyle = O;
      ctx.fillStyle = '#f4e7d2'; ctx.beginPath(); ctx.moveTo(x - s * 0.22, y); ctx.lineTo(x - s * 0.17, y - s * 0.8); ctx.lineTo(x + s * 0.17, y - s * 0.8); ctx.lineTo(x + s * 0.22, y); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = sp[3]; ctx.beginPath(); ctx.moveTo(x - s * 0.75, y - s * 0.75); ctx.quadraticCurveTo(x - s * 0.7, y - s * 1.55, x, y - s * 1.55); ctx.quadraticCurveTo(x + s * 0.7, y - s * 1.55, x + s * 0.75, y - s * 0.75); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(x - s * 0.3, y - s * 1.1, s * 0.11, 0, 6.283); ctx.arc(x + s * 0.25, y - s * 1.28, s * 0.09, 0, 6.283); ctx.fill();
    }
  }
  var glowCache = {}, quality = 1, partCap = 260;
  function glowSprite(rgb) {
    var c = glowCache[rgb];
    if (c) return c;
    c = document.createElement('canvas'); c.width = c.height = 128;
    var g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(' + rgb + ',1)'); gr.addColorStop(0.35, 'rgba(' + rgb + ',0.5)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    glowCache[rgb] = c;
    return c;
  }
  // Additive glow drawn from a cached sprite (much cheaper than a gradient fill every frame).
  function glow(x, y, r, rgb, a) {
    if (!(a > 0) || !(r > 0)) return;
    var prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, a);
    ctx.drawImage(glowSprite(rgb), x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = prev;
  }
  function glowE(x, y, rx, ry, rgb, a) {
    if (!(a > 0) || !(rx > 0)) return;
    var prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a);
    ctx.drawImage(glowSprite(rgb), x - rx, y - ry, rx * 2, ry * 2);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = prev;
  }
  function shadow(x, y, rx, ry, a) {
    if (!shadowImg) return;
    ctx.globalAlpha = a; ctx.drawImage(shadowImg, x - rx, y - ry, rx * 2, ry * 2); ctx.globalAlpha = 1;
  }
  function hexRgb(hex) { var n = parseInt(hex.slice(1), 16); return (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255); }
  function hexA(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function drawCat() {
    var R = L.R, x = L.cx + R * 1.4, y = L.ground - R * 0.06, s = R * 0.3;
    if (x > W - s) return;
    shadow(x + s * 0.2, y + s * 0.02, s * 1.0, s * 0.24, 0.75);
    ctx.save(); ctx.translate(x, y);
    ctx.lineWidth = Math.max(2, s * 0.09); ctx.strokeStyle = O; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // tail
    ctx.strokeStyle = '#2d2440'; ctx.lineWidth = s * 0.2;
    var tw = Math.sin(t * 1.8) * 0.4;
    ctx.beginPath(); ctx.moveTo(s * 0.5, -s * 0.15); ctx.quadraticCurveTo(s * 1.3, -s * 0.2, s * (1.1 + tw * 0.4), -s * (0.9 + tw * 0.2)); ctx.stroke();
    ctx.strokeStyle = O; ctx.lineWidth = Math.max(2, s * 0.09);
    ctx.fillStyle = '#2d2440';
    ctx.beginPath(); ctx.ellipse(0, -s * 0.45, s * 0.62, s * 0.5, 0, 0, 6.283); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.48, -s * 1.15); ctx.lineTo(-s * 0.45, -s * 1.62); ctx.lineTo(-s * 0.12, -s * 1.3); ctx.lineTo(s * 0.12, -s * 1.3); ctx.lineTo(s * 0.45, -s * 1.62); ctx.lineTo(s * 0.48, -s * 1.15);
    ctx.quadraticCurveTo(s * 0.5, -s * 0.78, 0, -s * 0.78); ctx.quadraticCurveTo(-s * 0.5, -s * 0.78, -s * 0.48, -s * 1.15); ctx.fill(); ctx.stroke();
    var open = catBlink > 0 ? 1 : 0.15;
    ctx.fillStyle = '#ffd94a';
    [-0.2, 0.2].forEach(function (ex) { ctx.beginPath(); ctx.ellipse(ex * s, -s * 1.1, s * 0.1, s * 0.08 * open, 0, 0, 6.283); ctx.fill(); });
    ctx.fillStyle = '#ff8ab8'; ctx.beginPath(); ctx.moveTo(-s * 0.05, -s * 0.98); ctx.lineTo(s * 0.05, -s * 0.98); ctx.lineTo(0, -s * 0.93); ctx.fill();
    ctx.restore();
  }
  function drawCrystal() {
    var R = L.R, x = L.cx - R * 1.42, y = L.ground - R * 0.1, s = R * 0.22;
    if (x < s) return;
    shadow(x, y + s * 0.05, s * 1.15, s * 0.28, 0.75);
    glowE(x, y + s * 0.05, s * 1.6, s * 0.4, '170,140,255', 0.18);
    ctx.lineWidth = Math.max(2, s * 0.1); ctx.strokeStyle = O;
    ctx.fillStyle = '#7a4d2b'; ctx.beginPath(); ctx.moveTo(x - s * 0.8, y); ctx.lineTo(x + s * 0.8, y); ctx.lineTo(x + s * 0.5, y - s * 0.45); ctx.lineTo(x - s * 0.5, y - s * 0.45); ctx.closePath(); ctx.fill(); ctx.stroke();
    glow(x, y - s * 1.3, s * 2.4, '170,140,255', 0.38);
    ctx.fillStyle = '#8f6cff'; ctx.beginPath(); ctx.arc(x, y - s * 1.3, s, 0, 6.283); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(230,220,255,0.8)'; ctx.lineWidth = s * 0.12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y - s * 1.3, s * 0.55, t * 2, t * 2 + 2.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y - s * 1.3, s * 0.3, -t * 3, -t * 3 + 1.8); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(x - s * 0.38, y - s * 1.62, s * 0.22, s * 0.13, -0.6, 0, 6.283); ctx.fill();
    ctx.lineCap = 'butt';
  }
  // Cute face on the cauldron: blinks, looks at wisps and bubbles, grins while you click.
  function drawFace(R) {
    var ex = R * 0.3, ey = R * 0.52, er = R * 0.115, happy = face.happy > 0 || fever || combo.n >= 25;
    var px = face.lookX * er * 0.38, py = face.lookY * er * 0.32;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = O; ctx.lineWidth = Math.max(2, R * 0.035);
    ctx.globalAlpha = 0.5; ctx.fillStyle = fever ? RAINBOW[Math.floor(t * 8) % RAINBOW.length] : '#ff6f9c';
    ctx.beginPath(); ctx.ellipse(-ex * 1.55, ey + R * 0.12, R * 0.09, R * 0.05, 0, 0, 6.283); ctx.ellipse(ex * 1.55, ey + R * 0.12, R * 0.09, R * 0.05, 0, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 1;
    for (var k = -1; k <= 1; k += 2) {
      var x = k * ex;
      if (happy) { ctx.beginPath(); ctx.moveTo(x - er * 0.85, ey + er * 0.25); ctx.quadraticCurveTo(x, ey - er * 1.1, x + er * 0.85, ey + er * 0.25); ctx.stroke(); continue; }
      if (face.blink > 0) { ctx.beginPath(); ctx.moveTo(x - er * 0.8, ey); ctx.lineTo(x + er * 0.8, ey); ctx.stroke(); continue; }
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x, ey, er, er * 1.12, 0, 0, 6.283); ctx.fill(); ctx.stroke();
      ctx.fillStyle = O; ctx.beginPath(); ctx.arc(x + px, ey + py, er * 0.55, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x + px - er * 0.2, ey + py - er * 0.22, er * 0.2, 0, 6.283); ctx.fill();
    }
    var my = ey + R * 0.2, mw = R * 0.15;
    if (face.excite > 0.05 || happy) {
      var open = Math.max(face.excite, happy ? 0.7 : 0);
      ctx.fillStyle = '#5a1030'; ctx.beginPath(); ctx.moveTo(-mw, my - R * 0.02); ctx.quadraticCurveTo(0, my + R * (0.05 + 0.13 * open), mw, my - R * 0.02); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff8fb0'; ctx.beginPath(); ctx.ellipse(0, my + R * 0.045 * open + R * 0.01, mw * 0.45, R * 0.03 * open + 0.5, 0, 0, Math.PI); ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(-mw * 0.8, my); ctx.quadraticCurveTo(0, my + R * 0.08, mw * 0.8, my); ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  function drawFeverGlow() {
    var R = L.R, cy = L.cy + R * 0.35, i, n = quality > 0 ? 12 : 6;
    var col = hexRgb(RAINBOW[Math.floor(feverT * 6) % RAINBOW.length]);
    glow(L.cx, cy, R * 2.4, col, 0.35 + 0.1 * Math.sin(t * 10));
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (i = 0; i < n; i++) {
      var a = t * 2.4 + i * 6.283 / n;
      ctx.strokeStyle = RAINBOW[i % RAINBOW.length]; ctx.globalAlpha = 0.7; ctx.lineWidth = Math.max(3, R * 0.06);
      ctx.beginPath(); ctx.ellipse(L.cx, cy, R * 1.45, R * 0.9, 0, a, a + 0.35); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'butt';
  }
  function drawBubble(b) {
    var a = Math.min(1, b.t / 0.25, (b.life - b.t) / 0.6), wob = 1 + Math.sin(b.t * 7 + b.ph) * 0.05, r = b.r;
    ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.translate(b.x, b.y); ctx.scale(wob, 2 - wob);
    if (quality > 0) glow(0, 0, r * 1.9, b.golden ? '255,210,90' : '140,220,255', 0.45);
    ctx.fillStyle = b.golden ? 'rgba(255,211,107,0.6)' : 'rgba(159,231,255,0.32)';
    ctx.strokeStyle = O; ctx.lineWidth = Math.max(2.5, r * 0.1);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = b.golden ? '#fff3b0' : 'rgba(255,255,255,0.9)'; ctx.lineWidth = Math.max(2, r * 0.12); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.68, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke(); ctx.lineCap = 'butt';
    var img = potionImg && potionImg.complete && potionImg.naturalWidth ? potionImg : null;
    if (img) ctx.drawImage(img, -r * 0.5, -r * 0.45, r, r);
    if (b.golden) { ctx.fillStyle = '#ffffff'; star4(r * 0.55, -r * 0.55, r * 0.22); star4(-r * 0.6, r * 0.5, r * 0.14); }
    ctx.restore();
  }
  function drawCombo() {
    if (combo.fade <= 0.01 || combo.shown < 3) return;
    var R = L.R, p = comboPos(), n = combo.shown, lvl = n >= 100 ? 4 : n >= 50 ? 3 : n >= 25 ? 2 : n >= 10 ? 1 : 0;
    var col = fever ? RAINBOW[Math.floor(t * 10) % RAINBOW.length] : ['#ffffff', '#ffe27a', '#ffa34d', '#ff6f9c', '#5ff3e6'][lvl];
    var size = Math.round(Math.max(22, R * 0.3) * (1 + combo.pop * 0.35) * (1 + Math.min(0.35, lvl * 0.08)));
    ctx.save(); ctx.globalAlpha = combo.fade; ctx.translate(p.x, p.y); ctx.rotate(-0.12 + Math.sin(t * 3) * 0.03);
    ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    ctx.font = '900 ' + size + 'px BrewBlack, sans-serif';
    ctx.lineWidth = Math.max(4, size * 0.2); ctx.strokeStyle = O; ctx.strokeText('×' + n, 0, 0);
    ctx.fillStyle = col; ctx.fillText('×' + n, 0, 0);
    var ls = Math.round(Math.max(11, size * 0.36));
    ctx.font = '800 ' + ls + 'px BrewDisplay, sans-serif';
    ctx.lineWidth = Math.max(3, ls * 0.28); ctx.strokeText(comboLabel, 0, ls * 1.15); ctx.fillStyle = '#ffffff'; ctx.fillText(comboLabel, 0, ls * 1.15);
    var bw = size * 1.5, bh = Math.max(4, size * 0.13), by = ls * 1.55;
    ctx.fillStyle = O; roundRect(-bw / 2 - 2, by - 2, bw + 4, bh + 4, bh); ctx.fill();
    ctx.fillStyle = col; if (combo.frac > 0 && combo.n >= 3) { roundRect(-bw / 2, by, bw * combo.frac, bh, bh / 2); ctx.fill(); }
    ctx.restore();
  }
  var comboLabel = 'COMBO';
  function drawPortal() {
    var R = L.R, p = helperSpot(12), s = Math.max(20, R * 0.32) * (1 + Math.min(0.5, Math.log2(counts[12] + 1) * 0.06));
    if (quality > 0) glow(p.x, p.y, s * 2.2, '120,240,230', 0.4 + 0.1 * Math.sin(t * 3));
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = '#1a1036'; ctx.strokeStyle = O; ctx.lineWidth = Math.max(2.5, s * 0.1);
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.8, s, 0, 0, 6.283); ctx.fill(); ctx.stroke();
    ctx.lineCap = 'round';
    for (var i = 0; i < 4; i++) {
      var a = -t * (2 + i * 0.6) + i * 1.6, rr = 1 - i * 0.2;
      ctx.strokeStyle = ['#5ff3e6', '#9a6bff', '#ff9be9', '#ffffff'][i]; ctx.lineWidth = Math.max(2, s * 0.09);
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.7 * rr, s * 0.88 * rr, 0, a, a + 3.6); ctx.stroke();
    }
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, s * 0.1, 0, 6.283); ctx.fill();
    ctx.restore(); ctx.lineCap = 'butt';
  }
  function drawUnicorn(u) {
    var y = u.y + Math.sin(t * 3 + u.ph) * 6, s = Math.max(16, L.R * 0.2), i;
    ctx.save(); ctx.translate(u.x, y);
    ctx.lineCap = 'round';
    for (i = 0; i < 5; i++) { ctx.strokeStyle = RAINBOW[i]; ctx.globalAlpha = 0.75; ctx.lineWidth = s * 0.16; ctx.beginPath(); ctx.moveTo(s * 0.9, (i - 2) * s * 0.15); ctx.lineTo(s * 3.4, (i - 2) * s * 0.15 + Math.sin(t * 4 + i) * s * 0.1); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = O; ctx.lineWidth = Math.max(1.8, s * 0.1); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.95, s * 0.5, 0, 0, 6.283); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-s * 0.95, -s * 0.45, s * 0.42, s * 0.32, -0.4, 0, 6.283); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.moveTo(-s * 1.1, -s * 0.7); ctx.lineTo(-s * 1.45, -s * 1.25); ctx.lineTo(-s * 0.92, -s * 0.78); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#b48cff'; ctx.beginPath(); ctx.ellipse(-s * 0.55, -s * 0.55, s * 0.3, s * 0.18, -0.6, 0, 6.283); ctx.fill(); ctx.stroke();
    ctx.fillStyle = O; ctx.beginPath(); ctx.arc(-s * 1.05, -s * 0.5, s * 0.07, 0, 6.283); ctx.fill();
    ctx.strokeStyle = O; ctx.lineWidth = s * 0.16;
    [-0.5, 0.5].forEach(function (lx) { ctx.beginPath(); ctx.moveTo(lx * s, s * 0.35); ctx.lineTo(lx * s + Math.sin(t * 10 + lx) * s * 0.2, s * 0.85); ctx.stroke(); });
    ctx.restore(); ctx.lineCap = 'butt';
  }
  function drawBroom(b) {
    var y = b.y + Math.sin(t * 3 + b.ph) * 6, s = Math.max(16, L.R * 0.2);
    ctx.save(); ctx.translate(b.x, y); ctx.rotate(-0.08);
    ctx.strokeStyle = O; ctx.lineCap = 'round'; ctx.lineWidth = s * 0.28; ctx.beginPath(); ctx.moveTo(-s * 1.4, 0); ctx.lineTo(s * 1.3, 0); ctx.stroke();
    ctx.strokeStyle = '#9b6233'; ctx.lineWidth = s * 0.15; ctx.beginPath(); ctx.moveTo(-s * 1.4, 0); ctx.lineTo(s * 1.3, 0); ctx.stroke();
    ctx.fillStyle = '#ffcb4f'; ctx.strokeStyle = O; ctx.lineWidth = Math.max(1.5, s * 0.1);
    ctx.beginPath(); ctx.moveTo(-s * 1.2, -s * 0.18); ctx.lineTo(-s * 2.3, -s * 0.55); ctx.lineTo(-s * 2.4, s * 0.55); ctx.lineTo(-s * 1.2, s * 0.18); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.lineCap = 'butt';
  }
  function drawBog() {
    var R = L.R, x = L.cx - R * 1.85, y = L.horizon + R * 0.06;
    if (x < R * 0.6) x = R * 0.6;
    ctx.lineWidth = Math.max(2, R * 0.03); ctx.strokeStyle = O;
    ctx.fillStyle = '#2f6b3a'; ctx.beginPath(); ctx.ellipse(x, y, R * 0.72, R * 0.14, 0, 0, 6.283); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4fae58'; ctx.beginPath(); ctx.ellipse(x, y - R * 0.02, R * 0.52, R * 0.08, 0, 0, 6.283); ctx.fill();
    for (var i = 0; i < 3; i++) {
      var ph = (t * 0.6 + i * 0.37) % 1, bx = x + (i - 1) * R * 0.32;
      ctx.globalAlpha = 1 - ph; ctx.fillStyle = '#9bf09b';
      ctx.beginPath(); ctx.arc(bx, y - R * 0.04 - ph * R * 0.25, R * (0.03 + ph * 0.04), 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#25502c'; ctx.lineWidth = Math.max(2, R * 0.03); ctx.lineCap = 'round';
    [[-0.8, 0.35], [-0.65, 0.5], [0.78, 0.42]].forEach(function (r) { ctx.beginPath(); ctx.moveTo(x + r[0] * R, y); ctx.lineTo(x + r[0] * R + Math.sin(t + r[0]) * 3, y - r[1] * R); ctx.stroke(); });
    ctx.lineCap = 'butt';
  }
  function drawAltar() {
    var R = L.R, x = L.cx + R * 1.95, y = L.horizon + R * 0.08, s = R * 0.27;
    if (x > W - s * 0.6) x = W - s * 0.8;
    ctx.lineWidth = Math.max(2, s * 0.08); ctx.strokeStyle = O;
    ctx.fillStyle = '#5d5f86'; ctx.fillRect(x - s * 0.7, y - s * 0.25, s * 1.4, s * 0.25); ctx.strokeRect(x - s * 0.7, y - s * 0.25, s * 1.4, s * 0.25);
    ctx.fillStyle = '#7c80aa'; ctx.fillRect(x - s * 0.42, y - s * 1.6, s * 0.84, s * 1.35); ctx.strokeRect(x - s * 0.42, y - s * 1.6, s * 0.84, s * 1.35);
    ctx.fillStyle = '#5d5f86'; ctx.fillRect(x - s * 0.6, y - s * 1.8, s * 1.2, s * 0.22); ctx.strokeRect(x - s * 0.6, y - s * 1.8, s * 1.2, s * 0.22);
    var pulse = 0.6 + 0.4 * Math.sin(t * 2.4);
    glow(x, y - s * 2.3, s * 1.6, '255,240,170', 0.5 * pulse);
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath(); ctx.arc(x, y - s * 2.3, s * 0.45, 0.6, 5.7); ctx.arc(x + s * 0.18, y - s * 2.35, s * 0.36, 5.4, 0.9, true); ctx.closePath(); ctx.fill();
  }
  function drawDragon() {
    var R = L.R, s = R * 0.3, x = L.cx - R * 0.98, y = L.cy - R * 0.5 + Math.sin(t * 1.6) * R * 0.025;
    ctx.save(); ctx.translate(x, y);
    ctx.lineWidth = Math.max(2, s * 0.09); ctx.strokeStyle = O; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // neck going down behind the cauldron
    ctx.fillStyle = '#e8573f';
    ctx.beginPath(); ctx.moveTo(-s * 0.55, s * 0.2); ctx.quadraticCurveTo(-s * 0.7, s * 1.2, -s * 0.2, s * 2.0); ctx.lineTo(s * 0.45, s * 2.0); ctx.quadraticCurveTo(s * 0.05, s * 1.2, s * 0.25, s * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
    // back spikes
    ctx.fillStyle = '#ffb347';
    [[-0.62, 0.55], [-0.66, 1.0], [-0.55, 1.45]].forEach(function (p) {
      ctx.beginPath(); ctx.moveTo(p[0] * s, (p[1] - 0.16) * s); ctx.lineTo((p[0] - 0.28) * s, p[1] * s); ctx.lineTo(p[0] * s, (p[1] + 0.16) * s); ctx.closePath(); ctx.fill(); ctx.stroke();
    });
    // horns
    ctx.fillStyle = '#fff1c9';
    ctx.beginPath(); ctx.moveTo(-s * 0.45, -s * 0.45); ctx.quadraticCurveTo(-s * 0.85, -s * 0.95, -s * 0.5, -s * 1.15); ctx.quadraticCurveTo(-s * 0.55, -s * 0.8, -s * 0.15, -s * 0.55); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.05, -s * 0.55); ctx.quadraticCurveTo(-s * 0.2, -s * 1.1, s * 0.15, -s * 1.25); ctx.quadraticCurveTo(s * 0.05, -s * 0.9, s * 0.25, -s * 0.55); ctx.closePath(); ctx.fill(); ctx.stroke();
    // head + snout
    ctx.fillStyle = '#ff6a4d';
    ctx.beginPath(); ctx.moveTo(-s * 0.7, 0);
    ctx.bezierCurveTo(-s * 0.75, -s * 0.75, s * 0.2, -s * 0.8, s * 0.45, -s * 0.35);
    ctx.bezierCurveTo(s * 0.8, -s * 0.35, s * 1.15, -s * 0.25, s * 1.15, s * 0.05);
    ctx.bezierCurveTo(s * 1.15, s * 0.32, s * 0.7, s * 0.42, s * 0.3, s * 0.38);
    ctx.bezierCurveTo(-s * 0.1, s * 0.5, -s * 0.65, s * 0.45, -s * 0.7, 0);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffb199'; ctx.beginPath(); ctx.ellipse(s * 0.55, s * 0.24, s * 0.42, s * 0.11, 0, 0, 6.283); ctx.fill();
    // eye (blinks with the cat timer offset)
    var open = Math.sin(t * 0.9) > -0.996 ? 1 : 0.15;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-s * 0.08, -s * 0.28, s * 0.2, s * 0.22 * open, 0, 0, 6.283); ctx.fill(); ctx.stroke();
    ctx.fillStyle = O; ctx.beginPath(); ctx.ellipse(-s * 0.02, -s * 0.27, s * 0.09, s * 0.12 * open, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = O; ctx.beginPath(); ctx.arc(s * 0.98, -s * 0.06, s * 0.05, 0, 6.283); ctx.fill();
    ctx.restore();
    if (dragonBreath > 0) {
      var k = 1 - dragonBreath / 0.8, len = R * 0.55 * Math.sin(Math.PI * Math.min(1, k * 1.2));
      var mx = x + s * 1.15, my = y + s * 0.05;
      var g = ctx.createLinearGradient(mx, my, mx + len, my);
      g.addColorStop(0, '#fff6c2'); g.addColorStop(0.4, '#ffb43d'); g.addColorStop(1, 'rgba(255,90,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(mx, my - s * 0.08); ctx.quadraticCurveTo(mx + len * 0.6, my - s * 0.45, mx + len, my); ctx.quadraticCurveTo(mx + len * 0.6, my + s * 0.45, mx, my + s * 0.08); ctx.closePath(); ctx.fill();
    }
  }
  function drawNado() {
    var R = L.R, k = nado.t / nado.dur;
    var grow = Math.min(1, nado.t / 0.35), fade = k > 0.75 ? (1 - k) / 0.25 : 1;
    ctx.save(); ctx.lineCap = 'round';
    for (var i = 0; i < 16; i++) {
      var y = L.cy - i * R * 0.15 * grow;
      var rx = R * (0.22 + i * 0.075), ry = rx * 0.22;
      var dx = Math.sin(t * 9 + i * 0.55) * R * 0.04 * i * 0.6;
      ctx.globalAlpha = 0.75 * fade * (1 - i / 22);
      ctx.strokeStyle = i % 2 ? pal.a : pal.b; ctx.lineWidth = Math.max(3, R * 0.06);
      ctx.beginPath(); ctx.ellipse(L.cx + dx, y, rx, ry, 0, t * 6 + i, t * 6 + i + 4.4); ctx.stroke();
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function drawWisp() {
    var w = wisp, r = Math.max(16, L.R * 0.15), pulse = 1 + 0.12 * Math.sin(t * 6);
    ctx.globalAlpha = w.alpha;
    glow(w.x, w.y, r * 3 * pulse, '95,243,230', 0.95 * w.alpha);
    glow(w.x, w.y, r * 1.2, '220,255,252', 0.9 * w.alpha);
    ctx.globalAlpha = w.alpha;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(w.x, w.y, r * 0.5, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 1;
  }

  BW.scene = {
    init: init, resize: resize, update: update, draw: draw, setCounts: setCounts,
    onClick: onClick, floatText: floatText, burst: burst, startNado: startNado,
    flyPotions: flyPotions, setTarget: setTarget, takeArrivals: takeArrivals, poof: poof,
    setHands: setHands, stageUp: stageUp, onHandTap: function (fn) { onHandTap = fn; }, handsShown: function () { return hv.length; },
    spawnWisp: spawnWisp, hitWisp: hitWisp, catchWisp: catchWisp, wispActive: wispActive,
    setCombo: setCombo, comboWord: comboWord, comboPos: comboPos, setFever: setFever, jackpot: jackpot,
    setComboLabel: function (s) { comboLabel = s; },
    spawnBubble: spawnBubble, hitBubble: hitBubble, popBubble: popBubble, bubbleCount: function () { return bubs.length; },
    bubblePos: function () { return bubs.length ? { x: bubs[0].x, y: bubs[0].y } : null; },
    hitCauldron: hitCauldron, layout: function () { return L; },
    setQuality: function (q) {
      if (q === quality) return;
      quality = q; partCap = q > 0 ? 260 : 110;
      if (q === 0 && dpr > 1) { resize(W, H); }
    },
    quality: function () { return quality; },
    wispPos: function () { return wisp ? { x: wisp.x, y: wisp.y } : null; }
  };
})(window.BW = window.BW || {});
