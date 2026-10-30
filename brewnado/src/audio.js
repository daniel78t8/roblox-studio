/* Brewnado - procedural sound effects and music (Web Audio, no audio files). */
(function (BW) {
  'use strict';
  var ctx = null, master, sfxGain, musicGain, noiseBuf;
  var want = { sfx: true, music: true }, sdkMuted = false, musicOn = false;
  var lastBloop = 0;
  var SFX_VOL = 0.5, MUSIC_VOL = 0.28;

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { ctx = null; return null; }
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.25;
    master = ctx.createGain(); master.gain.value = 0;
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0;
    musicGain = ctx.createGain(); musicGain.gain.value = 0;
    sfxGain.connect(master); musicGain.connect(master); master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.2), ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    apply();
    return ctx;
  }
  function apply() {
    if (!ctx) return;
    var t = ctx.currentTime;
    master.gain.setTargetAtTime(sdkMuted ? 0 : 0.9, t, 0.04);
    sfxGain.gain.setTargetAtTime(want.sfx ? SFX_VOL : 0, t, 0.02);
    musicGain.gain.setTargetAtTime(want.music ? MUSIC_VOL : 0, t, 0.4);
    if (want.music && !sdkMuted) startMusic(); else stopMusic();
  }
  // Must be called from user gestures (click/touchend/keydown). Also resumes after iOS interruptions.
  function unlock() {
    var c = ensure();
    if (!c) return;
    if (c.state !== 'running') { try { var p = c.resume(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
    apply();
  }
  function suspend() { if (ctx && ctx.state === 'running') { try { ctx.suspend(); } catch (e) {} } }
  function resume() { if (ctx && ctx.state !== 'running') { try { var p = ctx.resume(); if (p && p.catch) p.catch(function () {}); } catch (e) {} } }
  function ready() { return ctx && ctx.state === 'running' && !sdkMuted; }

  function env(g, t0, att, vol, dur) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t0 + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }
  function tone(type, f, t0, dur, vol, o) {
    o = o || {};
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + (o.slide || dur));
    if (o.detune) osc.detune.setValueAtTime(o.detune, t0);
    env(g, t0, o.att || 0.004, vol, dur);
    osc.connect(g); g.connect(o.dest || sfxGain);
    osc.start(t0); osc.stop(t0 + dur + 0.03);
  }
  function bell(f, t0, vol, dur, dest) {
    tone('sine', f, t0, dur, vol, { dest: dest });
    tone('sine', f * 2.005, t0, dur * 0.6, vol * 0.35, { dest: dest });
    tone('sine', f * 3.01, t0, dur * 0.3, vol * 0.12, { dest: dest });
  }
  function noise(t0, dur, vol, f0, f1, q) {
    var src = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf;
    flt.type = 'bandpass'; flt.Q.value = q || 1.2;
    flt.frequency.setValueAtTime(f0, t0);
    flt.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(flt); flt.connect(g); g.connect(sfxGain);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }
  function midi(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  var PENTA = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93];

  var S = {};
  S.bloop = function (power) {
    if (!ready() || !want.sfx) return;
    var t = ctx.currentTime;
    if (t - lastBloop < 0.028) return;
    lastBloop = t;
    var f = 430 * (0.88 + Math.random() * 0.3) * (power ? 1.15 : 1);
    tone('sine', f, t, 0.13, 0.32, { to: f * 0.5, slide: 0.1 });
    tone('triangle', f * 2.1, t + 0.01, 0.07, 0.07, { to: f * 1.3 });
  };
  S.buy = function () {
    if (!ready() || !want.sfx) return;
    var t = ctx.currentTime;
    bell(midi(84), t, 0.16, 0.35); bell(midi(91), t + 0.06, 0.14, 0.4);
  };
  S.upgrade = function () {
    if (!ready() || !want.sfx) return;
    var t = ctx.currentTime;
    [79, 84, 88, 91].forEach(function (m, i) { bell(midi(m), t + i * 0.055, 0.13, 0.45); });
  };
  S.deny = function () {
    if (!ready() || !want.sfx) return;
    var t = ctx.currentTime;
    tone('triangle', 180, t, 0.12, 0.12, { to: 120 });
  };
  var lastTap = 0;
  S.handTap = function () {
    if (!ready() || !want.sfx) return;
    var t = ctx.currentTime;
    if (t - lastTap < 0.14) return;
    lastTap = t;
    var f = 1500 + Math.random() * 500;
    tone('triangle', f, t, 0.035, 0.026, { to: f * 0.6, slide: 0.03 });
    tone('sine', f * 0.5, t, 0.05, 0.022, { to: f * 0.3 });
  };
  S.lucky = function () {
    if (!ready() || !want.sfx) return;
    var t = ctx.currentTime;
    [88, 93, 96, 100].forEach(function (m, i) { bell(midi(m), t + i * 0.035, 0.09, 0.4); });
    noise(t, 0.35, 0.08, 4000, 9000, 2);
  };
  S.levelUp = function () {
    if (!ready() || !want.sfx) return;
    var t = ctx.currentTime;
    noise(t, 0.9, 0.22, 300, 3200, 1.2);
    [60, 64, 67, 72, 76, 79, 84].forEach(function (m, i) { bell(midi(m), t + 0.08 + i * 0.06, 0.13, 0.7); });
    [72, 76, 79, 84].forEach(function (m) { bell(midi(m), t + 0.62, 0.08, 1.1); });
  };
  S.gift = function () {
    if (!ready() || !want.sfx) return;
    var t = ctx.currentTime;
    [79, 83, 86, 91, 95].forEach(function (m, i) { bell(midi(m), t + i * 0.07, 0.11, 0.5); });
  };
  var collectStep = 0, lastCollect = 0;
  S.collect = function () {
    if (!ready() || !want.sfx) return;
    var t = ctx.currentTime;
    collectStep = t - lastCollect > 0.6 ? 0 : Math.min(PENTA.length - 1, collectStep + 1);
    lastCollect = t;
    bell(midi(PENTA[collectStep]), t, 0.055, 0.22);
  };
  S.tick = function () {
    if (!ready() || !want.sfx) return;
    tone('sine', 1250, ctx.currentTime, 0.05, 0.05);
  };
  S.nado = function () {
    if (!ready() || !want.sfx) return;
    var t = ctx.currentTime;
    noise(t, 1.1, 0.35, 220, 2600, 1.4);
    [69, 72, 76, 81, 84, 88].forEach(function (m, i) { bell(midi(m), t + 0.15 + i * 0.07, 0.12, 0.5); });
  };
  S.wispSpawn = function () {
    if (!ready() || !want.sfx) return;
    var t = ctx.currentTime;
    tone('sine', 1760, t, 0.6, 0.11, { att: 0.15, to: 2350, slide: 0.5 });
    tone('sine', 2640, t + 0.12, 0.5, 0.06, { att: 0.12 });
    bell(midi(93), t + 0.05, 0.05, 0.5);
  };
  S.wispCatch = function () {
    if (!ready() || !want.sfx) return;
    var t = ctx.currentTime;
    for (var i = 0; i < 6; i++) bell(midi(PENTA[3 + Math.floor(Math.random() * 7)]), t + i * 0.045, 0.1, 0.4);
  };
  S.achievement = function () {
    if (!ready() || !want.sfx) return;
    var t = ctx.currentTime;
    [67, 72, 76, 79].forEach(function (m, i) { tone('triangle', midi(m), t + i * 0.09, 0.32, 0.12); bell(midi(m + 12), t + i * 0.09, 0.05, 0.3); });
  };
  S.moonrise = function () {
    if (!ready() || !want.sfx) return;
    var t = ctx.currentTime;
    noise(t, 1.6, 0.22, 3000, 300, 0.8);
    [57, 64, 69, 72, 76, 81].forEach(function (m, i) { tone('triangle', midi(m), t + 0.2 + i * 0.12, 1.4, 0.07); });
  };

  // --- Music: gentle music-box loop over Am - F - C - G ---------------------------------
  var CHORDS = [[69, 72, 76], [65, 69, 72], [67, 72, 76], [67, 71, 74]];
  var BASS = [45, 41, 48, 43];
  var ARP = [0, 1, 2, 1, 3, 2, 1, 2];
  var TEMPO = 84, STEP = 60 / TEMPO / 2;   // eighth notes
  var timer = null, nextT = 0, step = 0;
  function schedule() {
    if (!ctx || ctx.state !== 'running') return;
    var now = ctx.currentTime;
    if (nextT < now - 0.5) nextT = now + 0.05;
    while (nextT < now + 0.25) {
      var bar = Math.floor(step / 8) % 4, s8 = step % 8, ch = CHORDS[bar];
      var loop = Math.floor(step / 32) % 2;
      var idx = ARP[s8];
      var note = idx === 3 ? ch[0] + 12 : ch[idx];
      if (!(loop === 1 && (s8 === 3 || s8 === 7))) bell(midi(note + 12), nextT, 0.05, 0.9, musicGain);
      if (s8 === 0 || s8 === 4) tone('triangle', midi(BASS[bar] + (s8 === 4 ? 12 : 0)), nextT, 0.5, 0.11, { dest: musicGain, att: 0.01 });
      if (s8 === 0) ch.forEach(function (m) { tone('triangle', midi(m), nextT, STEP * 8 * 0.95, 0.018, { dest: musicGain, att: 0.35, detune: (Math.random() - 0.5) * 8 }); });
      if (loop === 1 && bar === 3 && s8 === 6) bell(midi(ch[2] + 24), nextT, 0.035, 1.2, musicGain);
      nextT += STEP; step++;
    }
  }
  function startMusic() {
    if (musicOn || !ctx) return;
    musicOn = true; nextT = ctx.currentTime + 0.1;
    timer = setInterval(schedule, 60);
  }
  function stopMusic() {
    if (!musicOn) return;
    musicOn = false;
    if (timer) clearInterval(timer);
    timer = null;
  }

  BW.audio = {
    unlock: unlock, suspend: suspend, resume: resume, sfx: S,
    set: function (sfx, music) { want.sfx = !!sfx; want.music = !!music; apply(); },
    setSdkMuted: function (m) { sdkMuted = !!m; apply(); },
    isMuted: function () { return sdkMuted; }
  };
})(window.BW = window.BW || {});
