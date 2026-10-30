/*!
 * Klotz – Spiel: Rendering, Eingabe, UI-Abläufe und Speicherstand
 */
(function () {
  'use strict';

  const Core = window.KlotzCore;
  const Ads = window.KlotzAds;
  const W = Core.W, H = Core.H, STEP = Core.STEP;

  const COLORS = {
    bg: '#121212',
    field: '#151515',
    grid: 'rgba(255, 255, 255, 0.04)',
    edge: 'rgba(255, 0, 85, 0.35)',
    klotz: '#ff0055',
    shape: '#00ffcc',
    circle: '#00ffcc', // z. B. '#ffe600' für gelbe Kreise
    goal: '#39ff14',
    staticFill: '#1c1c1c',
    staticStroke: '#4d4d4d',
    hint: '#ffe600'
  };
  const TAP_TOLERANCE_PX = 14;   // vergrößerte Trefferfläche für Finger
  const NUDGE_IDLE_S = 20;       // so lange ohne Fortschritt → Hinweis-Button pulsiert
  const NUDGE_FAILS = 2;         // oder nach so vielen Fehlversuchen im selben Level

  // ---------------------------------------------------------------------------
  // Speicherstand (localStorage)
  // ---------------------------------------------------------------------------
  const STORAGE_KEY = 'klotz.progress.v1';

  function loadProgress() {
    const fresh = { level: 1, best: 1, hints: [] };
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!data || !Number.isInteger(data.level) || data.level < 1) return fresh;
      return {
        level: data.level,
        best: Math.max(data.level, Number.isInteger(data.best) ? data.best : 1),
        hints: Array.isArray(data.hints) ? data.hints.filter(Number.isInteger) : []
      };
    } catch (e) {
      return fresh; // kein Zugriff (privater Modus) oder kaputte Daten
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) { /* Speichern nicht möglich – Spiel läuft trotzdem */ }
  }

  const progress = loadProgress();
  const hintUnlocked = (n) => progress.hints.indexOf(n) !== -1;

  // ---------------------------------------------------------------------------
  // DOM
  // ---------------------------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const canvas = $('game');
  const ctx = canvas.getContext('2d');
  const stage = $('stage');
  const ui = {
    levelNumber: $('levelNumber'),
    btnHint: $('btnHint'),
    btnRestart: $('btnRestart'),
    tip: $('levelTip'),
    toast: $('toast'),
    start: $('startScreen'),
    btnPlay: $('btnPlay'),
    btnReset: $('btnReset'),
    win: $('winScreen'),
    winLevel: $('winLevel'),
    winStats: $('winStats'),
    winNote: $('winNote'),
    btnNext: $('btnNext'),
    fail: $('failScreen'),
    failTitle: $('failTitle'),
    failText: $('failText'),
    btnRetry: $('btnRetry'),
    btnFailHint: $('btnFailHint')
  };

  // ---------------------------------------------------------------------------
  // Zustand
  // ---------------------------------------------------------------------------
  const game = {
    run: null,
    screen: 'start',     // 'start' | 'play' | 'win' | 'fail'
    adPaused: false,
    acc: 0,
    last: performance.now(),
    pending: null,       // { screen, t } – Ergebnis-Screen kurz verzögert zeigen
    particles: [],
    rings: [],
    shake: 0,
    idle: 0,
    fails: 0,
    nudging: false,
    blinkAt: 2
  };
  const view = { w: 0, h: 0, dpr: 1, scale: 40, ox: 0, oy: 0 };

  // ---------------------------------------------------------------------------
  // Level-Ablauf
  // ---------------------------------------------------------------------------
  function loadLevel(n) {
    game.run = Core.createRun(n);
    game.acc = 0;
    game.pending = null;
    game.particles.length = 0;
    game.rings.length = 0;
    game.idle = 0;
    ui.levelNumber.textContent = n;
    updateHintButton();
  }

  function startLevel(n) {
    if (!game.run || game.run.levelNumber !== n || game.run.time > 0 || game.run.taps > 0) loadLevel(n);
    game.screen = 'play';
    hideScreens();
    setMenuEnabled(true);
    showTip();
  }

  function restartLevel() {
    if (!game.run || Ads.isShowing() || game.screen === 'start' || game.screen === 'win') return;
    const n = game.run.levelNumber;
    // Monetarisierung B: Interstitial bei "Level neu starten"
    triggerInterstitialAd(function () {
      loadLevel(n);
      startLevel(n);
    });
  }

  function nextLevel() {
    if (Ads.isShowing()) return;
    // Monetarisierung B: Interstitial nach geschafftem Level – erst NACH dem
    // Erfolgsmoment, an der natürlichen Pause zwischen zwei Levels.
    triggerInterstitialAd(function () {
      loadLevel(progress.level);
      startLevel(progress.level);
    });
  }

  function onRunEnded(run) {
    hideTip();
    if (run.status === 'win') {
      // Fortschritt sofort sichern – auch wenn der Tab während der Werbung schließt
      progress.level = run.levelNumber + 1;
      progress.best = Math.max(progress.best, progress.level);
      progress.hints = progress.hints.filter((n) => n !== run.levelNumber);
      saveProgress();
      game.fails = 0;
      spawnConfetti(run.klotz);
      vibrate([20, 40, 30]);
      game.pending = { screen: 'win', t: 0.9 };
    } else {
      game.fails++;
      vibrate(60);
      game.pending = { screen: 'fail', t: run.failReason === 'out' ? 0.4 : 0.2 };
    }
  }

  function showWinScreen() {
    const run = game.run;
    const next = Core.levelInfo(progress.level);
    ui.winLevel.textContent = run.levelNumber;
    ui.winStats.textContent = run.taps + (run.taps === 1 ? ' Zug' : ' Züge') + ' · ' + run.time.toFixed(1).replace('.', ',') + ' s';
    ui.winNote.textContent = (next.index === 0)
      ? 'Alle ' + Core.LEVEL_COUNT + ' Level geschafft! Weiter geht\'s mit gespiegelten Leveln.'
      : 'Fortschritt gespeichert – nächstes Level: „' + next.def.name + '“';
    setMenuEnabled(false);
    showScreen(ui.win, ui.btnNext);
  }

  function showFailScreen() {
    const run = game.run;
    if (run.failReason === 'stuck') {
      ui.failTitle.textContent = 'SACKGASSE';
      ui.failText.textContent = 'Keine Formen mehr übrig – der Klotz kommt nicht mehr ins Ziel.';
    } else {
      ui.failTitle.textContent = 'KLOTZ VERLOREN';
      ui.failText.textContent = 'Der Klotz ist aus dem Spielfeld gefallen.';
    }
    // Monetarisierung C: Hinweis-Angebot im Moment der höchsten Motivation
    ui.btnFailHint.hidden = hintUnlocked(run.levelNumber);
    showScreen(ui.fail, ui.btnFailHint.hidden ? ui.btnRetry : ui.btnFailHint);
  }

  // ---------------------------------------------------------------------------
  // Hinweis (Rewarded Ad)
  // ---------------------------------------------------------------------------
  function requestHint() {
    const run = game.run;
    if (!run || Ads.isShowing() || game.screen === 'start' || game.screen === 'win') return;
    const n = run.levelNumber;
    if (hintUnlocked(n)) {
      toast('Hinweis aktiv: Tippe die gelb markierte Form an.');
      return;
    }
    const midLevel = game.screen === 'play' && run.taps > 0;
    // Monetarisierung C: Rewarded Ad gegen Lösungshinweis
    triggerRewardedAd(function () {
      progress.hints.push(n);
      saveProgress();
      if (game.screen === 'fail') {
        // Gerade ein Video geschaut → kein zusätzliches Interstitial beim Neustart
        loadLevel(n);
        startLevel(n);
      }
      updateHintButton();
      toast(midLevel
        ? 'Hinweis frei! Klappt es nicht mehr, starte das Level neu.'
        : 'Hinweis frei! Tippe zuerst die markierte Form an.');
    }, function () {
      toast('Video abgebrochen – kein Hinweis.');
    });
  }

  function updateHintButton() {
    const active = !!game.run && hintUnlocked(game.run.levelNumber);
    ui.btnHint.classList.toggle('is-active', active);
    ui.btnHint.setAttribute('aria-pressed', active ? 'true' : 'false');
    ui.btnHint.title = active ? 'Hinweis ist aktiv' : 'Hinweis freischalten (Video)';
    setNudge(false);
  }

  function setNudge(on) {
    if (on === game.nudging) return;
    game.nudging = on;
    ui.btnHint.classList.toggle('is-nudging', on);
  }

  // ---------------------------------------------------------------------------
  // Eingabe (Touch + Maus)
  // ---------------------------------------------------------------------------
  function toWorld(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (clientX - r.left - view.ox) / view.scale,
      y: (clientY - r.top - view.oy) / view.scale
    };
  }

  function handleTap(clientX, clientY) {
    const run = game.run;
    if (!run || game.screen !== 'play' || game.adPaused || run.status !== 'playing') return;
    const p = toWorld(clientX, clientY);
    const body = Core.pick(run, p, TAP_TOLERANCE_PX / view.scale);

    if (!body) {
      game.rings.push({ x: p.x, y: p.y, r: 0.1, grow: 1.2, t: 0, life: 0.3, color: 'rgba(255,255,255,0.5)' });
      return;
    }
    if (body === run.klotz) {
      game.shake = 0.35;
      vibrate(30);
      toast('Der Klotz ist unzerstörbar!');
      return;
    }
    const color = body.shape === 'circle' ? COLORS.circle : COLORS.shape;
    if (Core.destroy(run, body)) {
      spawnBurst(body, color);
      vibrate(12);
      hideTip();
      game.idle = 0;
      setNudge(false);
    }
  }

  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault(); // kein Zoom/Scroll, keine zusätzlichen Maus-Events
    for (let i = 0; i < e.changedTouches.length; i++) {
      handleTap(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
    }
  }, { passive: false });

  canvas.addEventListener('mousedown', function (e) {
    if (e.button === 0) handleTap(e.clientX, e.clientY);
  });

  ui.btnRestart.addEventListener('click', restartLevel);
  ui.btnHint.addEventListener('click', requestHint);
  ui.btnRetry.addEventListener('click', restartLevel);
  ui.btnFailHint.addEventListener('click', requestHint);
  ui.btnNext.addEventListener('click', nextLevel);
  ui.btnPlay.addEventListener('click', function () { startLevel(progress.level); });
  ui.btnReset.addEventListener('click', function () {
    if (!window.confirm('Fortschritt wirklich löschen und bei Level 1 beginnen?')) return;
    progress.level = 1;
    progress.best = 1;
    progress.hints = [];
    saveProgress();
    loadLevel(1);
    updateStartScreen();
  });

  document.addEventListener('keydown', function (e) {
    if (Ads.isShowing() || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key.toLowerCase();
    if (key === 'r' && (game.screen === 'play' || game.screen === 'fail')) restartLevel();
    if (key === 'h' && (game.screen === 'play' || game.screen === 'fail')) requestHint();
  });

  window.addEventListener('klotz:adstart', function () { game.adPaused = true; });
  window.addEventListener('klotz:adend', function () {
    game.adPaused = false;
    game.last = performance.now();
  });

  // ---------------------------------------------------------------------------
  // UI-Helfer
  // ---------------------------------------------------------------------------
  let toastTimer = 0;
  function toast(text) {
    hideTip();
    ui.toast.textContent = text;
    ui.toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { ui.toast.classList.remove('is-visible'); }, 2200);
  }

  let tipTimer = 0;
  function showTip() {
    const run = game.run;
    ui.tip.innerHTML = '';
    const title = document.createElement('b');
    title.textContent = 'Level ' + run.levelNumber + ': ' + run.def.name + (run.mirrored ? ' (gespiegelt)' : '');
    ui.tip.appendChild(title);
    ui.tip.appendChild(document.createTextNode(run.def.tip));
    ui.tip.classList.add('is-visible');
    clearTimeout(tipTimer);
    // Im ersten Level bleibt die Anleitung bis zum ersten Tipp stehen
    if (run.levelNumber > 1) tipTimer = setTimeout(hideTip, 5000);
  }
  function hideTip() {
    clearTimeout(tipTimer);
    ui.tip.classList.remove('is-visible');
  }

  function showScreen(screen, focusEl) {
    hideScreens();
    game.screen = screen === ui.win ? 'win' : screen === ui.fail ? 'fail' : 'start';
    screen.classList.add('is-visible');
    screen.setAttribute('aria-hidden', 'false');
    if (focusEl) setTimeout(function () { focusEl.focus({ preventScroll: true }); }, 50);
  }
  function hideScreens() {
    for (const s of [ui.start, ui.win, ui.fail]) {
      s.classList.remove('is-visible');
      s.setAttribute('aria-hidden', 'true');
    }
  }
  function setMenuEnabled(on) {
    ui.btnHint.disabled = !on;
    ui.btnRestart.disabled = !on;
  }
  function updateStartScreen() {
    ui.btnPlay.textContent = progress.level > 1 ? 'WEITER · LEVEL ' + progress.level : 'SPIELEN';
    ui.btnReset.hidden = progress.level <= 1;
  }
  function vibrate(pattern) {
    if (navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) { /* nicht unterstützt */ }
    }
  }

  // ---------------------------------------------------------------------------
  // Effekte
  // ---------------------------------------------------------------------------
  function spawnBurst(body, color) {
    const n = Math.round(Math.min(28, Math.max(12, body.boundR * 16)));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * body.boundR * 0.8;
      const speed = 1.5 + Math.random() * 4;
      game.particles.push({
        x: body.pos.x + Math.cos(a) * d, y: body.pos.y + Math.sin(a) * d,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 2,
        size: 0.06 + Math.random() * 0.1, t: 0, life: 0.45 + Math.random() * 0.4, color: color
      });
    }
    game.rings.push({ x: body.pos.x, y: body.pos.y, r: body.boundR * 0.6, grow: 1.6, t: 0, life: 0.35, color: color });
  }

  function spawnConfetti(klotz) {
    const palette = [COLORS.goal, COLORS.shape, COLORS.klotz, COLORS.hint];
    for (let i = 0; i < 46; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const speed = 4 + Math.random() * 6;
      game.particles.push({
        x: klotz.pos.x, y: klotz.pos.y,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        size: 0.08 + Math.random() * 0.1, t: 0, life: 0.9 + Math.random() * 0.6,
        color: palette[i % palette.length]
      });
    }
    game.rings.push({ x: klotz.pos.x, y: klotz.pos.y, r: 0.6, grow: 3, t: 0, life: 0.6, color: COLORS.goal });
  }

  function updateEffects(dt) {
    for (let i = game.particles.length - 1; i >= 0; i--) {
      const p = game.particles[i];
      p.t += dt;
      if (p.t >= p.life) {
        game.particles.splice(i, 1);
        continue;
      }
      p.vy += 9 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = game.rings.length - 1; i >= 0; i--) {
      const r = game.rings[i];
      r.t += dt;
      if (r.t >= r.life) game.rings.splice(i, 1);
    }
    if (game.shake > 0) game.shake = Math.max(0, game.shake - dt);
  }

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------
  function resize() {
    const rect = stage.getBoundingClientRect();
    view.w = Math.max(1, rect.width);
    view.h = Math.max(1, rect.height);
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(view.w * view.dpr);
    canvas.height = Math.round(view.h * view.dpr);
    canvas.style.width = view.w + 'px';
    canvas.style.height = view.h + 'px';
    const pad = 10;
    view.scale = Math.max(1, Math.min((view.w - pad * 2) / W, (view.h - pad * 2) / H));
    view.ox = (view.w - W * view.scale) / 2;
    view.oy = (view.h - H * view.scale) / 2;
  }

  if (typeof ResizeObserver === 'function') new ResizeObserver(resize).observe(stage);
  window.addEventListener('resize', resize);

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------
  function glow(color, px) {
    ctx.shadowColor = color;
    ctx.shadowBlur = px * view.dpr * Math.min(1.4, view.scale / 40);
  }
  function noGlow() {
    ctx.shadowBlur = 0;
  }
  function alpha(hex, a) {
    const v = parseInt(hex.slice(1), 16);
    return 'rgba(' + (v >> 16) + ',' + ((v >> 8) & 255) + ',' + (v & 255) + ',' + a + ')';
  }
  function roundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function withBody(b, fn) {
    ctx.save();
    ctx.translate(b.pos.x, b.pos.y);
    ctx.rotate(b.angle);
    fn();
    ctx.restore();
  }

  function drawField() {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.save();
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.scale, view.scale);
    ctx.fillStyle = COLORS.field;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1 / view.scale;
    ctx.beginPath();
    for (let x = 1; x < W; x++) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 1; y < H; y++) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    // Spielfeldränder: hier darf der Klotz nicht hinaus
    ctx.strokeStyle = COLORS.edge;
    ctx.lineWidth = 2 / view.scale;
    ctx.setLineDash([0.3, 0.25]);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, H);
    ctx.moveTo(W, 0); ctx.lineTo(W, H);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawGoal(goal, charge) {
    withBody(goal, function () {
      const w = goal.hw * 2, h = goal.hh * 2, lw = 0.07;
      glow(COLORS.goal, 14 + 22 * charge);
      ctx.fillStyle = alpha(COLORS.goal, 0.14 + 0.2 * charge);
      ctx.strokeStyle = COLORS.goal;
      ctx.lineWidth = lw;
      roundRect(-goal.hw + lw / 2, -goal.hh + lw / 2, w - lw, h - lw, 0.08);
      ctx.fill();
      ctx.stroke();
      noGlow();
      // Warnstreifen
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = alpha(COLORS.goal, 0.16);
      ctx.lineWidth = 0.12;
      ctx.beginPath();
      for (let x = -goal.hw - h; x < goal.hw + h; x += 0.45) {
        ctx.moveTo(x, goal.hh);
        ctx.lineTo(x + h, -goal.hh);
      }
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawStatic(b) {
    withBody(b, function () {
      ctx.fillStyle = COLORS.staticFill;
      ctx.strokeStyle = COLORS.staticStroke;
      ctx.lineWidth = 0.06;
      if (b.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, b.r - 0.03, 0, Math.PI * 2);
      } else {
        roundRect(-b.hw + 0.03, -b.hh + 0.03, b.hw * 2 - 0.06, b.hh * 2 - 0.06, 0.05);
      }
      ctx.fill();
      ctx.stroke();
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      const ext = b.boundR;
      for (let x = -ext * 2; x < ext * 2; x += 0.3) {
        ctx.moveTo(x, ext);
        ctx.lineTo(x + ext, -ext);
      }
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawShape(b) {
    const color = b.shape === 'circle' ? COLORS.circle : COLORS.shape;
    withBody(b, function () {
      const lw = 0.07;
      glow(color, 12);
      ctx.fillStyle = alpha(color, 0.15);
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      if (b.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, b.r - lw / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        noGlow();
        // Speiche, damit man das Rollen sieht
        ctx.strokeStyle = alpha(color, 0.55);
        ctx.lineWidth = 0.05;
        ctx.beginPath();
        ctx.arc(0, 0, b.r * 0.45, 0, Math.PI * 2);
        ctx.moveTo(b.r * 0.45, 0);
        ctx.lineTo(b.r - lw, 0);
        ctx.stroke();
      } else {
        roundRect(-b.hw + lw / 2, -b.hh + lw / 2, b.hw * 2 - lw, b.hh * 2 - lw, 0.07);
        ctx.fill();
        ctx.stroke();
        noGlow();
        const inset = Math.min(0.16, b.hw * 0.4, b.hh * 0.4);
        ctx.strokeStyle = alpha(color, 0.3);
        ctx.lineWidth = 0.035;
        roundRect(-b.hw + inset, -b.hh + inset, b.hw * 2 - inset * 2, b.hh * 2 - inset * 2, 0.04);
        ctx.stroke();
      }
    });
  }

  function drawKlotz(b, now) {
    const s = b.hw;
    const shakeX = game.shake > 0 ? Math.sin(now * 0.09) * 0.09 * (game.shake / 0.35) : 0;
    const won = game.run.status === 'win';
    ctx.save();
    ctx.translate(b.pos.x + shakeX, b.pos.y);
    ctx.rotate(b.angle);
    glow(COLORS.klotz, 20);
    ctx.fillStyle = COLORS.klotz;
    roundRect(-s, -s, s * 2, s * 2, 0.1);
    ctx.fill();
    noGlow();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 0.05;
    roundRect(-s + 0.09, -s + 0.09, s * 2 - 0.18, s * 2 - 0.18, 0.06);
    ctx.stroke();

    // Augen: schauen in Bewegungsrichtung, blinzeln gelegentlich
    const t = now / 1000;
    if (t > game.blinkAt + 0.12) game.blinkAt = t + 2 + Math.random() * 3;
    const blinking = t > game.blinkAt;
    const lookX = Math.max(-0.08, Math.min(0.08, b.vel.x * 0.04));
    const lookY = Math.max(-0.06, Math.min(0.06, b.vel.y * 0.03));
    ctx.fillStyle = '#121212';
    ctx.strokeStyle = '#121212';
    for (const ex of [-0.22, 0.22]) {
      if (won) {
        ctx.lineWidth = 0.07;
        ctx.beginPath();
        ctx.arc(ex * s * 2, -0.02, 0.1, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      } else {
        const eh = blinking ? 0.04 : 0.22;
        ctx.fillRect(ex * s * 2 + lookX - 0.06, -0.1 + lookY - eh / 2, 0.12, eh);
      }
    }
    ctx.restore();
  }

  function drawHint(run, now) {
    if (!hintUnlocked(run.levelNumber) || run.status !== 'playing' || game.screen !== 'play') return;
    const b = Core.nextHint(run);
    if (!b) return;
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.006);
    const pad = 0.14 + 0.08 * pulse;
    ctx.save();
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.scale, view.scale);
    withBody(b, function () {
      glow(COLORS.hint, 14 + 12 * pulse);
      ctx.strokeStyle = COLORS.hint;
      ctx.lineWidth = 0.08;
      ctx.setLineDash([0.28, 0.16]);
      ctx.lineDashOffset = -now * 0.0012;
      if (b.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, b.r + pad, 0, Math.PI * 2);
      } else {
        roundRect(-b.hw - pad, -b.hh - pad, (b.hw + pad) * 2, (b.hh + pad) * 2, 0.12);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      noGlow();
    });
    ctx.restore();

    // Nummer der Lösungsreihenfolge mittig auf der Form – in Bildschirmkoordinaten,
    // damit der Text scharf bleibt
    const step = run.def.solution.indexOf(b.data.id) + 1;
    const sx = view.ox + b.pos.x * view.scale;
    const sy = view.oy + b.pos.y * view.scale;
    ctx.save();
    glow(COLORS.hint, 12);
    ctx.fillStyle = COLORS.hint;
    ctx.beginPath();
    ctx.arc(sx, sy, 11 + 1.5 * pulse, 0, Math.PI * 2);
    ctx.fill();
    noGlow();
    ctx.fillStyle = '#121212';
    ctx.font = '14px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(step), sx, sy + 1);
    ctx.restore();
  }

  function drawEffects() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const r of game.rings) {
      const k = r.t / r.life;
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = 1 - k;
      ctx.lineWidth = 0.08 * (1 - k) + 0.01;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r + r.grow * k, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const p of game.particles) {
      ctx.globalAlpha = 1 - p.t / p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.restore();
  }

  function render(now) {
    const run = game.run;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    drawField();
    if (!run) return;

    ctx.save();
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.scale, view.scale);
    drawGoal(run.goal, Math.min(1, run.goalTime / Core.WIN_HOLD) || (run.status === 'win' ? 1 : 0));
    for (const s of run.statics) drawStatic(s);
    for (const b of run.shapes.values()) drawShape(b);
    drawKlotz(run.klotz, now);
    drawEffects();
    ctx.restore();

    drawHint(run, now);
  }

  // ---------------------------------------------------------------------------
  // Spielschleife (feste Physik-Schrittweite, variable Bildrate)
  // ---------------------------------------------------------------------------
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - game.last) / 1000));
    game.last = now;
    const run = game.run;

    if (run && !game.adPaused && game.screen !== 'start') {
      game.acc += dt;
      let steps = 0;
      while (game.acc >= STEP && steps < 4) {
        if (run.status === 'playing') {
          if (Core.step(run, STEP) !== 'playing') onRunEnded(run);
        } else {
          run.world.step(STEP); // Szene nach Sieg/Niederlage ausklingen lassen
        }
        game.acc -= STEP;
        steps++;
      }
      if (steps === 4) game.acc = 0;
      updateEffects(dt);

      if (game.pending) {
        game.pending.t -= dt;
        if (game.pending.t <= 0) {
          const screen = game.pending.screen;
          game.pending = null;
          if (screen === 'win') showWinScreen();
          else showFailScreen();
        }
      }

      if (run.status === 'playing' && !hintUnlocked(run.levelNumber)) {
        game.idle += dt;
        setNudge(game.idle > NUDGE_IDLE_S || game.fails >= NUDGE_FAILS);
      }
    }

    render(now);
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------------------
  resize();
  loadLevel(progress.level);
  updateStartScreen();
  setMenuEnabled(false);
  showScreen(ui.start, ui.btnPlay);
  requestAnimationFrame(function (now) {
    game.last = now;
    frame(now);
  });
})();
