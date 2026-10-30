/* Brewnado - UI, input, saving, CrazyGames SDK and main loop. */
(function (BW) {
  'use strict';
  var core = BW.core, i18n = BW.i18n, t = i18n.t, fmt = i18n.fmt, scene = BW.scene, audio = BW.audio;
  var KEY = 'brewnado.save.v1';
  var S = null, C = null, SDK = null;
  var gameplayOn = false, modalOpen = false, modalOnClose = null;
  var tab = 'helpers', helperEls = [], upSig = '', upEls = [], magicBuilt = '';
  var lastFrame = 0, uiAcc = 0, achAcc = 0, saveAcc = 0, hiddenAt = 0;
  var clickTimes = [], wispWas = false, wispCaught = false, coarse = false, mem = {}, frameEma = 1 / 60, perfTime = 0;
  var tip = { el: null, fn: null };
  var lastBuffSig = '', modalAt = 0, dispPotions = 0, feverOn = false;
  var COMBO_AT = [10, 25, 50, 75, 150, 200, 300, 500, 1000];
  var Q_ICON = { click: 'c1', combo: 'combo', buy: 'frog', hand: 'hand', nado: 'tornado', bubble: 'bubble', lucky: 'lucky', up: 'g2', wisp: 'wisp', earn: 'potion' };
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function setText(el, v) { if (el && el._v !== v) { el._v = v; el.textContent = v; } }

  // ------------------------------------------------------------------ SDK + storage
  function initSDK() {
    return new Promise(function (resolve) {
      var done = false;
      function fin() { if (!done) { done = true; resolve(); } }
      try {
        var cg = window.CrazyGames && window.CrazyGames.SDK;
        if (!cg || !cg.init) return fin();
        var to = setTimeout(fin, 10000);
        cg.init().then(function () {
          clearTimeout(to);
          // Adopt the SDK only if the game has not already started without it:
          // switching storage mid-session could overwrite the cloud save with a fresh state.
          if (!done && cg.environment !== 'disabled') SDK = cg;
          fin();
        }).catch(function () { clearTimeout(to); fin(); });
      } catch (e) { fin(); }
    });
  }
  function sdk(fn) { if (!SDK) return; try { fn(SDK); } catch (e) { /* SDK call failed - game continues */ } }
  function gameplay(on) {
    if (on === gameplayOn) return;
    gameplayOn = on;
    sdk(function (s) { if (on) s.game.gameplayStart(); else s.game.gameplayStop(); });
  }
  function storeGet() {
    var v = null;
    if (SDK && SDK.data) { try { v = SDK.data.getItem(KEY); } catch (e) { v = null; } }
    if (v) return v;
    try { v = window.localStorage.getItem(KEY); } catch (e) { v = null; }
    return v || mem[KEY] || null;
  }
  function storeSet(v) {
    if (SDK && SDK.data) { try { SDK.data.setItem(KEY, v); return; } catch (e) { /* fall through */ } }
    try { window.localStorage.setItem(KEY, v); } catch (e) { mem[KEY] = v; }
  }
  function storeClear() {
    if (SDK && SDK.data) { try { SDK.data.removeItem(KEY); } catch (e) { /* ignore */ } }
    try { window.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    delete mem[KEY];
  }
  function save() { if (!S) return; S.lastSave = Date.now(); storeSet(core.serialize(S)); }

  function detectLang() {
    var l = S.settings.lang;
    if (l === 'en' || l === 'de') return l;
    var loc = '';
    try { if (SDK && SDK.user && SDK.user.systemInfo && SDK.user.systemInfo.locale) loc = String(SDK.user.systemInfo.locale); } catch (e) { loc = ''; }
    if (!loc && !SDK) loc = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
    return /^de([-_]|$)/i.test(loc) ? 'de' : 'en';
  }

  // ------------------------------------------------------------------ UI building
  function buildUI() {
    $('countIco').innerHTML = BW.icon('potion');
    $('meterIco').innerHTML = BW.icon('tornado');
    $('btnRecords').innerHTML = BW.icon('trophy');
    $('btnGift').innerHTML = BW.icon('gift') + '<span class="dot"></span>';
    $('btnGift').addEventListener('click', function () { audio.unlock(); audio.sfx.tick(); openGift(); });
    scene.onHandTap(function () { audio.sfx.handTap(); });
    $('btnSettings').innerHTML = BW.icon('gear');
    $('questBar').querySelector('.qi').innerHTML = BW.icon('scroll');
    $('questBar').addEventListener('click', function () { audio.unlock(); audio.sfx.tick(); openQuests(); });
    $('hint').querySelector('.hand').innerHTML = HAND;
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
      b.addEventListener('click', function () { audio.unlock(); setTab(b.getAttribute('data-tab')); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('#buybar [data-buy]'), function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-buy');
        S.settings.buy = v === 'max' ? 'max' : Number(v);
        audio.sfx.tick(); updateUI(true);
      });
    });
    $('btnRecords').addEventListener('click', function () { audio.unlock(); audio.sfx.tick(); openRecords('ach'); });
    $('btnSettings').addEventListener('click', function () { audio.unlock(); audio.sfx.tick(); openSettings(); });
    $('btnSound').addEventListener('click', function () {
      audio.unlock();
      if (audio.isMuted()) { shakeEl($('btnSound')); return; }
      var on = !(S.settings.sfx || S.settings.music);
      S.settings.sfx = on; S.settings.music = on;
      audio.set(on, on); updateSoundBtn(); save();
      if (on) audio.sfx.tick();
    });
    $('modal').addEventListener('click', function (e) { if (e.target === $('modal') && modalOnClose !== 'locked') closeModal(); });
    buildHelpers();
    applyTexts();
  }
  var HAND = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M27 6c3 0 5 2.2 5 5v18l2.6-.7c2.6-.6 5.1 1 5.6 3.6l.2 1 2.6-.5c2.6-.5 5.1 1.2 5.6 3.8l.2 1.3 1.2-.2c2.7-.3 5.1 1.7 5.3 4.4l.7 8.6C56.7 57.7 50.2 62 42.6 62h-8.8c-5.8 0-10.8-3.4-13-8.7L14.9 40c-1-2.5.2-5.3 2.7-6.3 2.3-.9 4.8 0 6 2.1l1.4 2.4V11c0-2.8 2.2-5 5-5z" fill="#fff" stroke="#1d1030" stroke-width="3" stroke-linejoin="round"/></svg>';

  function applyTexts() {
    document.documentElement.lang = i18n.getLang();
    setText($('ppsLabel'), t('perSec'));
    setText($('meterLabel'), t('meter'));
    var tl = document.querySelectorAll('.tab .tl');
    setText(tl[0], t('tabHelpers')); setText(tl[1], t('tabUpgrades')); setText(tl[2], t('tabMagic'));
    setText($('buyLbl'), t('buy'));
    setText(document.querySelector('#buybar [data-buy="max"]'), t('max'));
    $('btnRecords').setAttribute('aria-label', t('records'));
    $('btnGift').setAttribute('aria-label', t('gift'));
    $('btnSettings').setAttribute('aria-label', t('settings'));
    $('btnSound').setAttribute('aria-label', t('sound'));
    $('questBar').setAttribute('aria-label', t('quests'));
    scene.setComboLabel(t('combo'));
    questSig = '';
    upSig = ''; magicBuilt = '';
    updateSoundBtn();
  }
  function updateSoundBtn() {
    var on = (S.settings.sfx || S.settings.music) && !audio.isMuted();
    var b = $('btnSound');
    var want = on ? 'sound' : 'mute';
    if (b._ic !== want) { b._ic = want; b.innerHTML = BW.icon(want); }
    b.classList.toggle('off', audio.isMuted());
  }

  function makeCard(cls, iconSvg) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = cls;
    b.innerHTML = '<span class="ico">' + iconSvg + '</span>' +
      '<span class="mid"><span class="name"></span><span class="sub"><span class="cost">' + BW.icon('potion') + '<span class="cv"></span></span><span class="rt"></span></span></span>' +
      '<span class="own"></span>';
    return { b: b, name: b.querySelector('.name'), cv: b.querySelector('.cv'), rt: b.querySelector('.rt'), own: b.querySelector('.own'), ico: b.querySelector('.ico'), cls: '' };
  }
  var handEl = null;
  function buildHelpers() {
    var list = $('helperList');
    list.innerHTML = '';
    handEl = makeCard('item hand', BW.icon('hand'));
    list.appendChild(handEl.b);
    bindItem(handEl.b, buyHand, handTip);
    helperEls = BW.HELPERS.map(function (h, i) {
      var e = makeCard('item helper', BW.icon(BW.ICON_FOR_HELPER[i]));
      list.appendChild(e.b);
      bindItem(e.b, function () { buyHelper(i); }, function () { return helperTip(i); });
      return e;
    });
  }
  function bindItem(b, onBuy, tipFn) {
    var lp = null, long = false;
    b.addEventListener('click', function (e) {
      if (long) { long = false; e.preventDefault(); return; }
      audio.unlock(); onBuy();
      if (tip.el === b) showTip(b, tipFn);
    });
    b.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') showTip(b, tipFn); });
    b.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hideTip(); });
    b.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') return;
      long = false; clearTimeout(lp);
      lp = setTimeout(function () { long = true; showTip(b, tipFn); }, 450);
    });
    ['pointerup', 'pointercancel'].forEach(function (ev) {
      b.addEventListener(ev, function (e) { clearTimeout(lp); if (e.pointerType !== 'mouse') setTimeout(hideTip, 900); });
    });
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  function showTip(el, fn) {
    var html = fn();
    if (!html) { hideTip(); return; }
    var box = $('tooltip');
    tip.el = el; tip.fn = fn;
    box.innerHTML = html; box.classList.remove('hidden');
    var r = el.getBoundingClientRect(), br = box.getBoundingClientRect();
    var vw = window.innerWidth, vh = window.innerHeight, x, y;
    if ($('app').className === 'landscape') { x = $('panel').getBoundingClientRect().left - br.width - 10; y = r.top + r.height / 2 - br.height / 2; }
    else { x = r.left + r.width / 2 - br.width / 2; y = r.top - br.height - 8; if (y < 8) y = r.bottom + 8; }
    x = Math.max(8, Math.min(vw - br.width - 8, x)); y = Math.max(8, Math.min(vh - br.height - 8, y));
    box.style.left = x + 'px'; box.style.top = y + 'px';
  }
  function hideTip() { tip.el = null; tip.fn = null; $('tooltip').classList.add('hidden'); }

  function handTip() {
    var nm = i18n.pick(BW.HAND);
    var h = '<b>' + esc(nm[0]) + '</b><div class="d">' + esc(nm[1]) + '</div>' +
      '<div class="l">' + esc(t('handEvery', { s: i18n.pct(Math.round(C.handInterval * 10) / 10) })) + '</div>' +
      '<div class="l">' + t('perTap') + ': <em>+' + fmt(C.handTapBase, true) + '</em></div>';
    if (S.hands > 0) h += '<div class="l">' + t('total') + ': <em>' + fmt(C.handPps, true) + '/s</em></div>';
    return h;
  }
  function handLook() { return S.ups.h5 ? 3 : S.ups.h3 ? 2 : S.ups.h1 ? 1 : 0; }
  function helperTip(i) {
    if (helperEls[i].cls.indexOf('mystery') >= 0) return '<b>' + t('unknown') + '</b>';
    var nm = i18n.pick(BW.HELPERS[i]);
    var each = C.helperPps[i], tot = C.helperTotal[i], share = C.pps > 0 ? Math.round(tot / C.pps * 100) : 0;
    var h = '<b>' + esc(nm[0]) + '</b><div class="d">' + esc(nm[1]) + '</div>' +
      '<div class="l">' + t('each') + ': <em>+' + fmt(each, true) + '/s</em></div>';
    if (S.helpers[i] > 0) h += '<div class="l">' + t('total') + ': <em>' + fmt(tot, true) + '/s</em> (' + share + '%)</div>';
    return h;
  }
  function upgradeDesc(u) {
    if (u.kind === 'tier') return t('upTier', { h: i18n.pick(BW.HELPERS[u.helper])[0] });
    if (u.kind === 'click') return u.eff.mult ? t('upClickMult', { m: u.eff.mult }) : t('upClickPct', { p: i18n.pct(Math.round(u.eff.pct * 100)) });
    if (u.kind === 'global') return t('upGlobal', { p: Math.round(u.bonus * 100) });
    if (u.kind === 'combo' || u.kind === 'luck' || u.kind === 'bubble') return t('up_' + u.kind + '_' + u.eff);
    if (u.kind === 'hand') {
      var parts = [];
      if (u.eff.power) parts.push(t('upHandPower', { m: u.eff.power }));
      if (u.eff.speed) parts.push(t('upHandSpeed', { p: Math.round((1 - 1 / u.eff.speed) * 100) }));
      if (u.eff.pct) parts.push(t('upHandPct', { p: i18n.pct(Math.round(u.eff.pct * 10000) / 100) }));
      return parts.join(' · ');
    }
    return t('up_' + u.eff);
  }
  function upName(u) { return i18n.getLang() === 'de' ? u.de : u.en; }

  function setTab(name) {
    tab = name;
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === name); });
    $('helperList').classList.toggle('hidden', name !== 'helpers');
    $('buybar').classList.toggle('hidden', name !== 'helpers');
    $('upList').classList.toggle('hidden', name !== 'upgrades');
    $('magicList').classList.toggle('hidden', name !== 'magic');
    if (name === 'upgrades') S.tut.up = true;
    hideTip();
    audio.sfx.tick();
    updateUI(true);
  }

  // ------------------------------------------------------------------ UI updates
  function updateUI() {
    if (dispPotions > S.potions || !(dispPotions >= 0)) dispPotions = S.potions;
    setText($('potions'), fmt(dispPotions));
    updateQuestBar();
    setText($('pps'), fmt(C.ppsTotalNow, true));
    scene.setHands(S.hands, C.handRate, handLook(), '+' + fmt(C.handTapNow, true));
    updateGift();
    var mp = Math.min(100, S.meter / C.meterCap * 100);
    var fill = $('meterFill'), w = mp.toFixed(1) + '%';
    if (fill._w !== w) { fill._w = w; fill.style.width = w; }
    $('meter').classList.toggle('hot', mp >= 85);
    updateBuffs();
    var seg = document.querySelectorAll('#buybar [data-buy]');
    Array.prototype.forEach.call(seg, function (b) { var v = b.getAttribute('data-buy'); b.classList.toggle('on', String(S.settings.buy) === v); });
    updateHelpers();
    updateUpgrades();
    updateMagic();
    if (tip.el && tip.fn) { var box = $('tooltip'), html = tip.fn(); if (box._h !== html) { box._h = html; box.innerHTML = html; } }
    aimTarget();
    var tb = $('toasts');
    if (!tb.classList.contains('side')) {
      var hud = $('hud'), top = Math.round(hud.offsetTop + hud.offsetHeight + 8);
      if (tb._top !== top) { tb._top = top; tb.style.top = top + 'px'; }
    } else if (tb._top) { tb._top = 0; tb.style.top = ''; }
  }
  function aimTarget() {
    var ci = $('countIco').getBoundingClientRect(), sr = $('stage').getBoundingClientRect();
    if (ci.width > 0) scene.setTarget(ci.left - sr.left + ci.width / 2, ci.top - sr.top + ci.height / 2);
  }
  var lastBump = 0;
  function bumpCount() {
    var now = performance.now();
    if (now - lastBump < 110) return;
    lastBump = now;
    var c = $('count');
    c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
    audio.sfx.collect();
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function dayKey(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function dayKeys() { var now = new Date(); return [dayKey(now), dayKey(new Date(now.getTime() - 864e5))]; }
  var giftAt = 0;
  function updateGift() {
    var now = performance.now();
    if (now - giftAt < 1000) return;
    giftAt = now;
    var k = dayKeys(), info = core.dailyInfo(S, k[0], k[1]);
    var show = info.available && (S.playTime >= 60 || S.allEarned >= 500);
    var b = $('btnGift');
    if (b.classList.contains('hidden') === show) b.classList.toggle('hidden', !show);
  }
  function openGift() {
    var k = dayKeys(), info = core.dailyInfo(S, k[0], k[1]);
    if (!info.available) { $('btnGift').classList.add('hidden'); return; }
    var amount = core.dailyAmount(S, C, info.idx), days = '';
    for (var d = 0; d < BW.TUNE.dailyMin.length; d++) {
      var cls = d < info.idx ? 'done' : d === info.idx ? 'today' : '';
      days += '<div class="gday ' + cls + '"><span class="gd">' + esc(t('giftDay', { n: d + 1 })) + '</span>' + (d < info.idx ? BW.icon('check') : BW.icon(d === BW.TUNE.dailyMin.length - 1 ? 'gift' : 'potion')) + '</div>';
    }
    openModal(t('gift'), '<div class="gift"><div class="gdays">' + days + '</div><div class="amt">' + BW.icon('potion') + '<span>+' + fmt(amount) + '</span></div><p class="muted">' + esc(t('giftText')) + '</p></div>',
      [{ label: t('giftClaim'), cls: '', fn: function () {
        var kk = dayKeys(), got = core.claimDaily(S, C, kk[0], kk[1]);
        closeModal();
        if (got > 0) {
          audio.sfx.gift(); aimTarget();
          var L = scene.layout(); scene.flyPotions(L.cx, L.cy - L.R * 0.2, 14); scene.burst(L.cx, L.cy - L.R * 0.2, '255,211,107', 24, 280);
          toast('gift', t('giftGot', { n: fmt(got) }), null, 'gold');
          C = core.calc(S); save(); updateUI();
        }
        giftAt = 0; updateGift();
      } }]);
  }
  function updateBuffs() {
    var list = [];
    if (S.buffs.rush > 0) list.push(['rush', 'wisp', t('buffRush') + ' ×' + BW.TUNE.rushMult, S.buffs.rush]);
    if (S.buffs.storm > 0) list.push(['storm', 'c5', t('buffStorm') + ' ×' + BW.TUNE.stormMult, S.buffs.storm]);
    if (S.buffs.nado > 0) list.push(['nado', 'tornado', t('buffNado') + ' ×' + BW.TUNE.nadoRushMult, S.buffs.nado]);
    if (S.buffs.fever > 0) list.push(['fever', 'fever', t('buffFever') + ' ×' + C.feverMult, S.buffs.fever]);
    var sig = list.map(function (b) { return b[0]; }).join(',') + i18n.getLang();
    var box = $('buffs');
    if (sig !== lastBuffSig) {
      lastBuffSig = sig;
      box.innerHTML = list.map(function (b) {
        var parts = b[2].split(' ×');
        return '<div class="buff ' + b[0] + '">' + BW.icon(b[1]) + '<span><span class="bn">' + esc(parts[0]) + ' </span>×' + esc(parts[1]) + '</span><span class="bt"></span></div>';
      }).join('');
    }
    var times = box.querySelectorAll('.bt');
    list.forEach(function (b, k) { setText(times[k], i18n.clock(b[3])); });
  }
  function setProg(e, p) {
    var v = Math.max(0, Math.min(1, p || 0));
    v = Math.round(v * 100) / 100;
    if (e.p !== v) { e.p = v; e.b.style.setProperty('--p', v); }
  }
  function helperVisibility() {
    var top = -1;
    for (var i = 0; i < S.helpers.length; i++) if (S.helpers[i] > 0) top = i;
    return Math.max(1, top + 1);
  }
  function updateHelpers() {
    var lastVisible = helperVisibility();
    var mode = S.settings.buy;
    if (handEl) {
      var hn = mode === 'max' ? Math.max(1, core.maxHands(S)) : mode, hc = core.handCost(S, hn), hcan = hc <= S.potions;
      var hcls = 'item hand ' + (hcan ? 'can' : 'cant');
      setProg(handEl, hcan ? 1 : S.potions / hc);
      setText(handEl.name, i18n.pick(BW.HAND)[0]);
      setText(handEl.cv, fmt(hc) + (hn > 1 ? '  ×' + hn : ''));
      setText(handEl.rt, '+' + fmt(C.handEach, true) + '/s');
      setText(handEl.own, S.hands ? String(S.hands) : '');
      var hlook = handLook();
      if (handEl._look !== hlook) { handEl._look = hlook; handEl.ico.innerHTML = BW.icon(hlook >= 3 ? 'handGold' : 'hand'); }
      if (handEl.cls !== hcls) { var hk = (handEl.b.classList.contains('flash') ? ' flash' : '') + (handEl.b.classList.contains('shine') ? ' shine' : ''); handEl.cls = hcls; handEl.b.className = hcls + hk; }
    }
    for (var i = 0; i < helperEls.length; i++) {
      var e = helperEls[i], cls = 'item helper';
      if (i > lastVisible + 1) { cls += ' hidden'; }
      else if (i === lastVisible + 1) {
        cls += ' mystery';
        setText(e.name, t('unknown')); setText(e.cv, fmt(BW.HELPERS[i].cost)); setText(e.rt, ''); setText(e.own, '');
      } else {
        var maxA = core.maxAffordable(S, i);
        var n = mode === 'max' ? Math.max(1, maxA) : mode;
        var cost = core.helperCost(S, i, n);
        var can = cost <= S.potions;
        cls += can ? ' can' : ' cant';
        setProg(e, can ? 1 : S.potions / cost);
        if (!S.tut.helper && i === 0 && S.clicks >= 5 && can) cls += ' hint-glow';
        setText(e.name, i18n.pick(BW.HELPERS[i])[0]);
        setText(e.cv, fmt(cost) + (n > 1 ? '  ×' + n : ''));
        setText(e.rt, '+' + fmt(C.helperPps[i], true) + '/s');
        setText(e.own, S.helpers[i] ? String(S.helpers[i]) : '');
      }
      var ti = cls.indexOf('mystery') >= 0 ? -1 : 0;
      if (e.b._ti !== ti) { e.b._ti = ti; e.b.tabIndex = ti; e.b.setAttribute('aria-disabled', ti < 0 ? 'true' : 'false'); }
      if (e.cls !== cls) {
        var keep = (e.b.classList.contains('flash') ? ' flash' : '') + (e.b.classList.contains('shine') ? ' shine' : '');
        e.cls = cls; e.b.className = cls + keep;
      }
    }
  }
  function updateUpgrades() {
    var av = core.availableUpgrades(S);
    var nx = core.nextStage(S);
    var sig = av.map(function (u) { return u.id; }).join(',') + '|' + i18n.getLang() + '|' + S.stage;
    var list = $('upList');
    var bought = Object.keys(S.ups).length;
    if (sig !== upSig) {
      upSig = sig;
      list.innerHTML = '';
      stageEl = makeStageCard(nx);
      list.appendChild(stageEl.b);
      list.insertAdjacentHTML('beforeend', '<div class="uphead"><span>' + esc(t('upSummary', { a: bought, b: BW.UPGRADES.length })) + '</span></div>');
      if (!av.length) list.insertAdjacentHTML('beforeend', '<div class="empty">' + esc(t('noUpgrades')) + '</div>');
      upEls = av.map(function (u) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'item up';
        b.innerHTML = '<span class="ico">' + BW.iconForUpgrade(u) + '</span><span class="mid"><span class="name">' + esc(upName(u)) +
          '</span><span class="sub eff">' + esc(upgradeDesc(u)) + '</span></span><span class="cost">' + BW.icon('potion') + '<span>' + fmt(u.cost) + '</span></span>';
        list.appendChild(b);
        bindItem(b, function () { buyUpgrade(u.id, b); }, function () { return '<b>' + esc(upName(u)) + '</b><div class="d">' + esc(upgradeDesc(u)) + '</div><div class="l"><em>' + fmt(u.cost) + '</em> ' + t('potions') + '</div>'; });
        return { u: u, b: b, cls: '' };
      });
    }
    var affordable = 0;
    if (stageEl && nx) {
      var scan = S.potions >= nx.cost, scls = 'item stage ' + (scan ? 'can' : 'cant');
      if (scan) affordable++;
      if (stageEl.cls !== scls) { stageEl.cls = scls; stageEl.b.className = scls; }
      setProg(stageEl, scan ? 1 : S.potions / nx.cost);
      if (scan && !S.tut.stageToast) { S.tut.stageToast = true; toast(BW.iconCauldron(S.stage + 1), t('stageToast'), stageName(S.stage + 1), 'gold'); }
    }
    upEls.forEach(function (e) {
      var can = S.potions >= e.u.cost;
      if (can) affordable++;
      var cls = 'item up ' + (can ? 'can' : 'cant');
      if (e.cls !== cls) { e.cls = cls; e.b.className = cls; }
      setProg(e, can ? 1 : S.potions / e.u.cost);
    });
    var badge = $('upBadge');
    setText(badge, String(affordable));
    badge.classList.toggle('hidden', affordable === 0 || tab === 'upgrades');
    badge.classList.toggle('pulse', affordable > 0 && !S.tut.up);
    if (affordable > 0 && !S.tut.upToast) {
      var first = null;
      for (var k = 0; k < upEls.length; k++) if (S.potions >= upEls[k].u.cost) { first = upEls[k].u; break; }
      if (first) { S.tut.upToast = true; toast(BW.iconForUpgrade(first), t('hintUpgrade'), upName(first), 'gold'); }
    }
  }
  var stageEl = null;
  function makeStageCard(nx) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'item stage' + (nx ? '' : ' max');
    var lv = '<span class="lv">' + esc(t('stageLv', { n: S.stage + 1 })) + (nx ? ' → ' + (S.stage + 2) : '') + '</span>';
    if (nx) {
      b.innerHTML = '<span class="ico">' + BW.iconCauldron(S.stage + 1) + '</span><span class="mid"><span class="name">' + esc(stageName(S.stage + 1)) + '</span>' +
        '<span class="sub eff">' + lv + esc(t('stageEff', { p: Math.round((BW.STAGE_MULT - 1) * 100) })) + '</span></span>' +
        '<span class="cost">' + BW.icon('potion') + '<span>' + fmt(nx.cost) + '</span></span>';
      bindItem(b, function () { buyStage(b); }, function () {
        return '<b>' + esc(t('stageCard')) + '</b><div class="d">' + esc(stageName(S.stage)) + ' → ' + esc(stageName(S.stage + 1)) + '</div><div class="l">' +
          esc(t('stageEff', { p: Math.round((BW.STAGE_MULT - 1) * 100) })) + '</div><div class="l"><em>' + fmt(nx.cost) + '</em> ' + t('potions') + '</div>';
      });
    } else {
      b.innerHTML = '<span class="ico">' + BW.iconCauldron(S.stage) + '</span><span class="mid"><span class="name">' + esc(stageName(S.stage)) + '</span>' +
        '<span class="sub eff">' + lv + esc(t('stageMax')) + '</span></span><span></span>';
      b.tabIndex = -1;
    }
    return { b: b, cls: b.className };
  }
  function buildMagic() {
    var m = $('magicList');
    m.innerHTML = '<div class="moonhead">' + BW.icon('moonstone') + '<div><div class="big" id="mgStones"></div><div class="muted" id="mgBonus"></div></div></div>' +
      '<div class="card"><h3>' + esc(t('moonrise')) + '</h3><p>' + esc(t('moonDesc')) + '</p>' +
      '<div class="gain">' + esc(t('moonGain')) + ': <b id="mgGain"></b>' + BW.icon('moonstone') + '</div>' +
      '<div class="prog"><div id="mgProg"></div></div><div class="muted" id="mgNext"></div>' +
      '<div style="margin-top:.65em"><button class="btn moon wide" id="mgBtn" type="button"></button></div>' +
      '<div class="muted" id="mgNeed" style="margin-top:.45em"></div></div>' +
      '<h3>' + esc(t('perks')) + '</h3>' +
      BW.PERKS.map(function (p) {
        var nm = i18n.pick(p);
        return '<div class="perk" id="pk_' + p.id + '">' + BW.icon('moonstone') + '<div><div class="name">' + esc(nm[0]) + '</div><div class="muted">' + esc(nm[1]) + '</div><div class="muted pks"></div></div></div>';
      }).join('');
    $('mgBtn').addEventListener('click', function () { audio.unlock(); confirmMoonrise(); });
  }
  function updateMagic() {
    var gain = core.stonesForRun(S), M = BW.MOON;
    var badge = $('magicBadge');
    badge.classList.toggle('hidden', !(gain >= M.minGain && gain >= Math.ceil(S.stones * 0.5)) || tab === 'magic');
    if (tab !== 'magic') return;
    if (magicBuilt !== i18n.getLang()) { magicBuilt = i18n.getLang(); buildMagic(); }
    setText($('mgStones'), S.stones + ' ' + t('moonstones'));
    setText($('mgBonus'), t('moonBonus', { p: Math.round(S.stones * M.bonus * 100) }));
    setText($('mgGain'), '+' + gain);
    var next = core.nextStoneAt(S);
    var prev = gain > 0 ? M.base * Math.pow(gain, 1 / M.exp) : 0;
    var p = Math.max(0, Math.min(1, (S.runEarned - prev) / Math.max(1, next - prev)));
    $('mgProg').style.width = (p * 100).toFixed(1) + '%';
    setText($('mgNext'), gain === 0 ? t('moonFirst', { n: fmt(M.base * Math.pow(M.minGain, 1 / M.exp)) }) : t('moonNext', { n: fmt(next) }));
    var btn = $('mgBtn');
    btn.disabled = gain < M.minGain;
    setText(btn, t('moonBtn', { n: gain }));
    setText($('mgNeed'), gain < M.minGain ? t('moonNeed', { n: M.minGain }) : '');
    BW.PERKS.forEach(function (pk) {
      var el = $('pk_' + pk.id), on = S.stonesEver >= pk.need;
      el.classList.toggle('on', on);
      setText(el.querySelector('.pks'), on ? t('perkOn') : (pk.need === 1 ? t('perkNeed1') : t('perkNeed', { n: pk.need })));
    });
  }

  // ------------------------------------------------------------------ quests
  var questSig = '';
  function questsUnlocked() { return S.clicks >= 15 || S.allEarned >= 300; }
  function questText(q) {
    if (q.k === 'wisp') return t('q_wisp');
    if (q.n === 1 && (q.k === 'nado' || q.k === 'bubble' || q.k === 'lucky' || q.k === 'up')) return t('q_' + q.k + '1');
    return t('q_' + q.k, { n: q.k === 'earn' ? fmt(q.n) : i18n.groupInt(q.n) });
  }
  function questCount(q) {
    var p = core.questProgress(S, q);
    return q.k === 'earn' ? fmt(p) + ' / ' + fmt(q.n) : i18n.groupInt(p) + ' / ' + i18n.groupInt(q.n);
  }
  function updateQuestBar() {
    var bar = $('questBar'), on = questsUnlocked() && S.quests.length > 0;
    if (bar.classList.contains('hidden') === on) bar.classList.toggle('hidden', !on);
    if (!on) return;
    var ready = 0, best = null, bestP = -1;
    S.quests.forEach(function (q) {
      if (q.done) { ready++; return; }
      var p = core.questProgress(S, q) / q.n;
      if (p > bestP) { bestP = p; best = q; }
    });
    var txt, cnt, p;
    if (ready) { txt = ready === 1 ? t('questReady1') : t('questReady', { n: ready }); cnt = ''; p = 1; }
    else if (best) { txt = questText(best); cnt = questCount(best); p = bestP; }
    else return;
    setText(bar.querySelector('.qt'), txt);
    setText(bar.querySelector('.qn'), cnt);
    var w = (Math.max(0, Math.min(1, p)) * 100).toFixed(1) + '%', fill = bar.querySelector('.qp i');
    if (fill._w !== w) { fill._w = w; fill.style.width = w; }
    bar.classList.toggle('ready', ready > 0);
    var ico = ready ? 'scroll' : Q_ICON[best.k];
    if (bar._ic !== ico) { bar._ic = ico; bar.querySelector('.qi').innerHTML = BW.icon(ico); }
  }
  function checkQuests() {
    if (!questsUnlocked()) return;
    if (S.quests.length < 3) core.ensureQuests(S, C, Math.random);
    core.updateQuests(S).forEach(function (i) {
      var q = S.quests[i];
      toast('scroll', t('questDone'), questText(q), 'gold');
      audio.sfx.questDone(); buzz(30);
      var bar = $('questBar'); bar.classList.remove('pop'); void bar.offsetWidth; bar.classList.add('pop');
    });
  }
  function openQuests() {
    checkQuests();
    var body = '<p class="muted qintro">' + esc(t('questsText')) + '</p>' + S.quests.map(function (q, i) {
      var p = core.questProgress(S, q) / q.n;
      return '<div class="quest' + (q.done ? ' done' : '') + '"><span class="ico">' + BW.icon(Q_ICON[q.k]) + '</span><div class="qmid"><div class="name">' + esc(questText(q)) + '</div>' +
        '<div class="prog"><div style="width:' + (Math.min(1, p) * 100).toFixed(1) + '%"></div></div><div class="muted">' + esc(questCount(q)) + '</div></div>' +
        '<div class="qright"><div class="cost">' + BW.icon('potion') + '<span>+' + fmt(core.questReward(S, C)) + '</span></div>' +
        '<button type="button" class="btn qclaim" data-q="' + i + '"' + (q.done ? '' : ' disabled') + '>' + esc(t('questClaim')) + '</button></div></div>';
    }).join('') + '<div class="muted qtotal">' + esc(t('st_quests')) + ': ' + i18n.groupInt(S.questsDone) + '</div>';
    openModal(t('quests'), body, [{ label: t('close'), cls: 'sec', fn: closeModal }]);
    Array.prototype.forEach.call(document.querySelectorAll('#modal .qclaim'), function (b) {
      b.addEventListener('click', function () { claimQuest(Number(b.getAttribute('data-q'))); });
    });
  }
  function claimQuest(i) {
    var got = core.claimQuest(S, C, i, Math.random());
    if (!(got > 0)) { audio.sfx.deny(); return; }
    audio.sfx.gift(); buzz(40);
    aimTarget();
    var L = scene.layout(); scene.flyPotions(L.cx, L.cy - L.R * 0.2, 14); scene.burst(L.cx, L.cy - L.R * 0.2, '255,211,107', 30, 320);
    toast('scroll', t('questGot', { n: fmt(got) }), null, 'gold');
    C = core.calc(S); checkAch(); save();
    modalOpen = false; openQuests();
  }

  // ------------------------------------------------------------------ toasts, banner, hints, modal
  var toastQ = [];
  function toast(icon, title, sub, cls) {
    toastQ.push([icon, title, sub, cls]);
    if (toastQ.length > 4) toastQ.splice(0, toastQ.length - 4);
    pumpToasts();
  }
  function pumpToasts() {
    var box = $('toasts'), maxT = box.classList.contains('side') ? 2 : 1;
    var live = box.querySelectorAll('.toast:not(.out)').length;
    while (live < maxT && toastQ.length) { var q = toastQ.shift(); showToast(q[0], q[1], q[2], q[3]); live++; }
  }
  function showToast(icon, title, sub, cls) {
    var box = $('toasts');
    var d = document.createElement('div');
    d.className = 'toast ' + (cls || '');
    d.innerHTML = (icon && icon.charAt(0) === '<' ? icon : BW.icon(icon)) + '<div><b></b>' + (sub ? '<small></small>' : '') + '</div>';
    d.querySelector('b').textContent = title;
    if (sub) d.querySelector('small').textContent = sub;
    box.appendChild(d);
    setTimeout(function () {
      d.classList.add('out');
      setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); pumpToasts(); }, 300);
    }, toastQ.length ? 1900 : 2700);
  }
  function showBanner(sub, title, gold) {
    var b = $('banner');
    b.innerHTML = '<span class="bt"></span>' + (sub ? '<span class="ba"></span>' : '');
    b.classList.toggle('lvl', !!gold);
    b.querySelector('.bt').textContent = title || t('nadoBanner');
    if (sub) b.querySelector('.ba').textContent = sub;
    // centre the banner in the free space between the HUD and the cauldron rim
    var L = scene.layout(), hud = $('hud'), hb = hud.offsetTop + hud.offsetHeight, bh = b.offsetHeight || 60;
    var rim = L.cy - L.R * 0.32, top = Math.max(hb + bh / 2 + 4, Math.min(rim - bh / 2, (hb + rim) / 2));
    b.style.top = Math.round(top) + 'px';
    var tb = $('toasts');
    if (!tb.classList.contains('side')) { tb.classList.add('dim'); clearTimeout(tb._dim); tb._dim = setTimeout(function () { tb.classList.remove('dim'); }, 1600); }
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  }
  function updateHint() {
    var h = $('hint'), L = scene.layout(), txt = null, x = 0, y = 0;
    if (!modalOpen) {
      if (S.clicks < 5) { txt = coarse ? t('hintTap') : t('hintClick'); x = L.cx; y = L.cy - L.R * 0.38; }
      else if (!S.tut.wisp && S.wisps === 0 && scene.wispActive()) { var wp = scene.wispPos(); if (wp) { txt = t('hintWisp'); x = wp.x; y = wp.y - L.R * 0.2; } }
      else if (!S.tut.meter && S.nados === 0 && S.meter >= C.meterCap * 0.35) {
        var m = $('meter'); txt = t('hintMeter'); x = L.cx; y = m.offsetTop - 4;
      } else if (!S.tut.bubble && S.bubbles === 0 && scene.bubblePos()) {
        var bp = scene.bubblePos(); txt = t('hintBubble'); x = bp.x; y = bp.y - L.R * 0.25;
      } else if (!S.tut.helper && S.clicks >= 5 && S.potions >= BW.HELPERS[0].cost && $('app').className === 'portrait' && tab === 'helpers') {
        txt = t('hintBuy'); x = L.cx; y = $('stage').clientHeight - 2;
      } else if (!S.tut.combo && S.clicks >= 25 && S.comboBest < 10 && S.combo < 3) {
        txt = t('hintCombo'); x = L.cx; y = L.cy - L.R * 0.38;
      }
    }
    if (!txt) { if (!h.classList.contains('hidden')) h.classList.add('hidden'); return; }
    h.classList.remove('hidden');
    setText(h.querySelector('.txt'), txt);
    var sw = $('stage').clientWidth, hw = h.offsetWidth / 2 + 6;
    x = Math.max(hw, Math.min(sw - hw, x));
    h.style.left = x + 'px'; h.style.top = Math.max(h.offsetHeight + 4, y) + 'px';
  }
  function openModal(title, body, buttons, onClose) {
    hideTip();
    var m = $('modal');
    m.innerHTML = '<div class="mbox" role="dialog" aria-modal="true"><div class="mhead"><h2></h2><button class="xbtn" type="button">' + BW.icon('close') + '</button></div><div class="mbody"></div><div class="mfoot"></div></div>';
    m.querySelector('h2').textContent = title;
    m.querySelector('.xbtn').setAttribute('aria-label', t('close'));
    m.querySelector('.mbody').innerHTML = body;
    var foot = m.querySelector('.mfoot');
    (buttons || []).forEach(function (b) {
      var el = document.createElement('button');
      el.type = 'button'; el.className = 'btn ' + (b.cls || ''); el.textContent = b.label;
      el.addEventListener('click', function () { audio.unlock(); b.fn(); });
      foot.appendChild(el);
    });
    m.querySelector('.xbtn').addEventListener('click', function () { closeModal(); });
    m.classList.remove('hidden');
    modalOpen = true; modalOnClose = onClose || null; modalAt = performance.now();
    try { $('app').inert = true; } catch (e) { /* older browsers */ }
    gameplay(false);
    // Focus the first (safe) button: Cancel / Not yet / Close / Collect - never the destructive one.
    var f = foot.firstChild || m.querySelector('.xbtn');
    try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }
  function closeModal() {
    if (!modalOpen) return;
    var cb = modalOnClose;
    modalOpen = false; modalOnClose = null;
    var m = $('modal');
    m.classList.add('hidden'); m.innerHTML = '';
    try { $('app').inert = false; } catch (e) { /* older browsers */ }
    gameplay(true);
    if (typeof cb === 'function') cb();
  }

  // ------------------------------------------------------------------ records, settings, welcome, moonrise
  function achName(a) {
    var n = fmt(a.n);
    if (a.cat === 'nado') return a.n === 1 ? t('ach_nado1') : t('ach_nado', { n: n });
    if (a.cat === 'wisp') return a.n === 1 ? t('ach_wisp1') : t('ach_wisp', { n: n });
    if (a.cat === 'moon') return a.n === 1 ? t('ach_moon1') : t('ach_moon', { n: n });
    if (a.cat === 'lucky') return a.n === 1 ? t('ach_lucky1') : t('ach_lucky', { n: n });
    if (a.cat === 'stage') return t('ach_stage', { name: stageName(a.n) });
    if (a.cat === 'fever' || a.cat === 'jackpot' || a.cat === 'bubble' || a.cat === 'quest') return a.n === 1 ? t('ach_' + a.cat + '1') : t('ach_' + a.cat, { n: n });
    return t('ach_' + a.cat, { n: n });
  }
  function openRecords(which) {
    var got = Object.keys(S.ach).length, total = BW.ACHIEVEMENTS.length, body;
    body = '<div class="mtabs seg"><button type="button" data-r="ach" class="' + (which === 'ach' ? 'on' : '') + '">' + esc(t('achievements')) + ' ' + got + '/' + total + '</button>' +
      '<button type="button" data-r="stats" class="' + (which === 'stats' ? 'on' : '') + '">' + esc(t('stats')) + '</button></div>';
    if (which === 'ach') {
      body += '<div class="achlist">' + BW.ACHIEVEMENTS.map(function (a) {
        return '<div class="ach' + (S.ach[a.id] ? ' got' : '') + '">' + BW.iconForAch(a) + '<span>' + esc(achName(a)) + '</span></div>';
      }).join('') + '</div>';
    } else {
      var rows = [
        [t('st_all'), fmt(S.allEarned)], [t('st_run'), fmt(S.runEarned)], [t('st_clicks'), i18n.groupInt(S.clicks)],
        [t('st_best'), fmt(S.best, true) + '/s'], [t('st_nados'), i18n.groupInt(S.nados)], [t('st_wisps'), i18n.groupInt(S.wisps)],
        [t('st_stage'), stageName(S.stage) + ' (' + t('stageLv', { n: S.stage + 1 }) + ')'], [t('st_hands'), i18n.groupInt(S.hands)], [t('st_taps'), i18n.groupInt(S.handTaps)],
        [t('st_lucky'), i18n.groupInt(S.lucky)], [t('st_jackpots'), i18n.groupInt(S.jackpots)], [t('st_combo'), i18n.groupInt(S.comboBest)],
        [t('st_fevers'), i18n.groupInt(S.fevers)], [t('st_bubbles'), i18n.groupInt(S.bubbles)], [t('st_quests'), i18n.groupInt(S.questsDone)],
        [t('st_streak'), i18n.groupInt(S.daily ? S.daily.streak : 0)],
        [t('st_moon'), i18n.groupInt(S.rebirths)], [t('st_stones'), i18n.groupInt(S.stonesEver)], [t('st_time'), i18n.duration(S.playTime)]
      ];
      body += rows.map(function (r) { return '<div class="row"><span>' + esc(r[0]) + '</span><span class="rowval">' + esc(r[1]) + '</span></div>'; }).join('');
    }
    openModal(t('records'), body, [{ label: t('close'), cls: 'sec', fn: closeModal }]);
    Array.prototype.forEach.call(document.querySelectorAll('#modal [data-r]'), function (b) {
      b.addEventListener('click', function () { audio.sfx.tick(); var w = b.getAttribute('data-r'); modalOpen = false; openRecords(w); });
    });
  }
  function seg(name, options, current) {
    return '<div class="seg" data-seg="' + name + '">' + options.map(function (o) {
      return '<button type="button" data-v="' + o[0] + '" class="' + (String(current) === String(o[0]) ? 'on' : '') + '">' + esc(o[1]) + '</button>';
    }).join('') + '</div>';
  }
  function openSettings() {
    var body =
      '<div class="row"><span>' + esc(t('sfx')) + '</span>' + seg('sfx', [['1', t('on')], ['0', t('off')]], S.settings.sfx ? '1' : '0') + '</div>' +
      '<div class="row"><span>' + esc(t('music')) + '</span>' + seg('music', [['1', t('on')], ['0', t('off')]], S.settings.music ? '1' : '0') + '</div>' +
      '<div class="row"><span>' + esc(t('language')) + '</span>' + seg('lang', [['auto', t('langAuto')], ['en', 'English'], ['de', 'Deutsch']], S.settings.lang) + '</div>' +
      '<div style="margin-top:.9em"><button class="btn danger wide" id="btnReset" type="button">' + esc(t('reset')) + '</button></div>' +
      '<div class="credits">' + esc(t('credits')) + '<br>Brewnado 2.0</div>';
    openModal(t('settings'), body, [{ label: t('close'), cls: 'sec', fn: closeModal }]);
    Array.prototype.forEach.call(document.querySelectorAll('#modal [data-seg] button'), function (b) {
      b.addEventListener('click', function () {
        var k = b.parentNode.getAttribute('data-seg'), v = b.getAttribute('data-v');
        if (k === 'sfx') S.settings.sfx = v === '1';
        if (k === 'music') S.settings.music = v === '1';
        if (k === 'lang') { S.settings.lang = v; i18n.setLang(detectLang()); applyTexts(); }
        audio.set(S.settings.sfx, S.settings.music); updateSoundBtn(); save();
        audio.sfx.tick();
        modalOpen = false; openSettings();
      });
    });
    $('btnReset').addEventListener('click', function () {
      modalOpen = false;
      openModal(t('resetTitle'), '<p>' + esc(t('resetText')) + '</p>', [
        { label: t('cancel'), cls: 'sec', fn: closeModal },
        { label: t('resetYes'), cls: 'danger', fn: function () { resetAll(); closeModal(); } }
      ]);
    });
  }
  function resetAll() {
    var keep = S.settings;
    storeClear();
    S = core.newState(); S.settings = keep;
    C = core.calc(S);
    syncScene();
    upSig = ''; magicBuilt = ''; lastBuffSig = ''; dispPotions = 0;
    save();
    setTab('helpers');
  }
  function offlineWelcome(seconds) {
    var gain = core.offlineGain(S, C, seconds);
    if (!(gain >= 1)) return;
    core.earn(S, gain); C = core.calc(S); save();   // credited immediately - a reload can't lose it
    var done = false;
    function collect() {
      if (done) return; done = true;
      audio.sfx.buy();
      var L = scene.layout(); aimTarget(); scene.flyPotions(L.cx, L.cy - L.R * 0.2, 10);
    }
    if (modalOpen) { toast('potion', t('welcome'), '+' + fmt(gain), 'teal'); return; }
    openModal(t('welcome'), '<div class="welcome"><p>' + esc(t('welcomeText', { t: i18n.duration(seconds) })) + '</p><div class="amt">' +
      BW.icon('potion') + '<span>+' + fmt(gain) + '</span></div></div>',
      [{ label: t('collect'), cls: '', fn: function () { closeModal(); } }], collect);
  }
  function confirmMoonrise() {
    var gain = core.stonesForRun(S);
    if (gain < BW.MOON.minGain) { audio.sfx.deny(); return; }
    openModal(t('moonConfirmTitle'), '<p>' + esc(t('moonConfirm', { n: gain })) + '</p>', [
      { label: t('moonNo'), cls: 'sec', fn: closeModal },
      { label: t('moonYes'), cls: 'moon', fn: function () { closeModal(); doMoonrise(); } }
    ]);
  }
  function doMoonrise() {
    var g = core.moonrise(S);
    if (!g) return;
    C = core.calc(S);
    syncScene();
    var L = scene.layout();
    scene.burst(L.cx, L.cy - L.R * 0.3, '210,180,255', 70, 420);
    audio.sfx.moonrise();
    toast('moonstone', t('moonDone', { n: g }), null, 'gold');
    upSig = ''; save();
    setTab('helpers');
    sdk(function (s) { if (s.game.happytime) s.game.happytime(); });
  }

  // ------------------------------------------------------------------ game actions
  function cauldronClick(x, y) {
    var now = performance.now();
    while (clickTimes.length && now - clickTimes[0] > 1000) clickTimes.shift();
    if (clickTimes.length >= BW.TUNE.maxClicksPerSec) return;
    clickTimes.push(now);
    var boosted = C.clickBuff > 1;
    var r = core.click(S, C, Math.random());
    audio.sfx.bloop(boosted, r.combo);
    if (r.lucky) audio.sfx.lucky();
    var label = r.jackpot ? t('jackpot') + ' +' : r.lucky ? t('lucky') + ' +' : '+';
    scene.onClick(x, y, r.nado || r.jackpot ? '' : label + fmt(r.gain, true), boosted, r.lucky, r.combo);   // the Brewnado banner shows the reward instead
    if (r.jackpot) {
      scene.jackpot(x, y); audio.sfx.jackpot(); buzz([40, 40, 80]);
      scene.floatText(x, y - scene.layout().R * 0.35, label + fmt(r.gain), 1.9, '#ffe27a');
      aimTarget(); scene.flyPotions(x, y, 16);
    }
    var lvl = COMBO_AT.indexOf(r.combo);
    if (lvl >= 0) { scene.comboWord(t('comboWords').split('|')[lvl], lvl); audio.sfx.comboUp(lvl); if (lvl >= 2) buzz(25); S.tut.combo = true; }
    if (r.fever) {
      scene.setFever(true); feverOn = true; audio.sfx.fever(); audio.setFever(true); buzz([30, 30, 60]);
      if (!r.nado) showBanner(t('feverSub', { m: C.feverMult }), t('feverBanner'));
      else setTimeout(function () { if (S.buffs.fever > 0) showBanner(t('feverSub', { m: C.feverMult }), t('feverBanner')); }, 1500);   // after the Brewnado banner
    }
    if (r.nado) {
      S.tut.meter = true;
      scene.startNado(); audio.sfx.nado(); showBanner('+' + fmt(r.nado));
      var L = scene.layout();
      aimTarget(); scene.flyPotions(L.cx, L.cy - L.R * 0.2, 12);
    }
    C = core.calc(S);
  }
  function catchWisp() {
    var w = scene.catchWisp();
    if (!w) return;
    wispCaught = true; S.tut.wisp = true;
    var res = core.catchWisp(S, C, Math.random());
    audio.sfx.wispCatch();
    S.wispIn = core.nextWispDelay(S, C, Math.random());
    if (res.type === 'rush') toast('wisp', t('wispRush', { s: Math.round(res.sec) }), null, 'teal');
    else if (res.type === 'storm') toast('c5', t('wispStorm', { s: Math.round(res.sec) }), null, 'teal');
    else { toast('wisp', t('wispTreasure', { n: fmt(res.amount) }), null, 'teal'); scene.floatText(w.x, w.y, '+' + fmt(res.amount), 1.4, '#bffcf6'); aimTarget(); scene.flyPotions(w.x, w.y, 10); }
    C = core.calc(S);
  }
  function updateWisps(dt) {
    if (scene.wispActive()) return;
    if (wispWas && !wispCaught) { S.wispIn = core.nextWispDelay(S, C, Math.random()); S.tut.wisp = S.tut.wisp || S.wisps > 0; }
    wispWas = false; wispCaught = false;
    S.wispIn -= dt;
    if (S.wispIn <= 0 && !modalOpen) {
      scene.spawnWisp(C.wispLife); audio.sfx.wispSpawn(); wispWas = true;
    }
  }
  function updateBubbles(dt) {
    S.bubbleIn -= dt;
    if (S.bubbleIn > 0 || modalOpen || S.clicks < 10) return;
    S.bubbleIn = core.nextBubbleDelay(S, C, Math.random());
    if (scene.spawnBubble(Math.random() < C.bubbleGold, BW.TUNE.bubbleLife)) audio.sfx.wispSpawn();
  }
  function popBubble(i) {
    var b = scene.popBubble(i);
    if (!b) return;
    S.tut.bubble = true;
    var got = core.popBubble(S, C, b.golden);
    audio.sfx.bubblePop(b.golden);
    if (b.golden) buzz(30);
    scene.floatText(b.x, b.y, (b.golden ? t('golden') + ' +' : '+') + fmt(got), b.golden ? 1.6 : 1.25, b.golden ? '#ffe27a' : '#bfefff');
    aimTarget(); scene.flyPotions(b.x, b.y, b.golden ? 12 : 5);
    C = core.calc(S);
  }
  function buzz(p) {
    if (!coarse || !navigator.vibrate) return;
    try { navigator.vibrate(p); } catch (e) { /* not supported */ }
  }
  function buyHand() {
    var mode = S.settings.buy, n = mode === 'max' ? core.maxHands(S) : mode;
    if (n >= 1 && core.handCost(S, n) <= S.potions && core.buyHands(S, n)) {
      audio.sfx.buy(); flash(handEl.b); shine(handEl.b);
      C = core.calc(S); syncScene();
      updateUI();
    } else { audio.sfx.deny(); shakeEl(handEl.b); }
  }
  function syncScene() {
    scene.setCounts(S.helpers, S.rebirths, S.stage);
    scene.setHands(S.hands, C.handRate, handLook(), '+' + fmt(C.handTapNow, true));
  }
  function stageName(n) { var st = BW.STAGES[n]; return st ? (i18n.getLang() === 'de' ? st.de : st.en) : ''; }
  function buyStage(el) {
    var nx = core.nextStage(S);
    if (nx && core.buyStage(S)) {
      C = core.calc(S); syncScene();
      scene.stageUp(S.stage); audio.sfx.levelUp();
      showBanner(stageName(S.stage), t('stageUp'), true);
      upSig = ''; updateUI(); save();
      sdk(function (s) { if (s.game.happytime) s.game.happytime(); });
    } else { audio.sfx.deny(); shakeEl(el); }
  }
  function buyHelper(i) {
    if (helperEls[i].cls.indexOf('mystery') >= 0) return;
    var mode = S.settings.buy, n = mode === 'max' ? core.maxAffordable(S, i) : mode;
    if (n >= 1 && core.helperCost(S, i, n) <= S.potions && core.buyHelper(S, i, n)) {
      S.tut.helper = true;
      audio.sfx.buy(); flash(helperEls[i].b); shine(helperEls[i].b);
      C = core.calc(S); syncScene(); scene.poof(i);
      updateUI();
    } else { audio.sfx.deny(); shakeEl(helperEls[i].b); }
  }
  function buyUpgrade(id, el) {
    if (core.buyUpgrade(S, id)) {
      audio.sfx.upgrade(); hideTip();
      var L = scene.layout(); scene.burst(L.cx, L.cy - L.R * 0.1, '255,226,122', 22, 260);
      C = core.calc(S);
      updateUI();
    } else { audio.sfx.deny(); shakeEl(el); }
  }
  function flash(el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); setTimeout(function () { el.classList.remove('flash'); }, 360); }
  function shine(el) { el.classList.remove('shine'); void el.offsetWidth; el.classList.add('shine'); setTimeout(function () { el.classList.remove('shine'); }, 650); }
  function shakeEl(el) { if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); setTimeout(function () { el.classList.remove('shake'); }, 320); }
  function checkAch() {
    var got = core.checkAchievements(S, C);
    got.forEach(function (a, k) {
      setTimeout(function () { toast(BW.iconForAch(a), t('achToast') + ' ' + achName(a), t('achBonus'), 'gold'); audio.sfx.achievement(); }, k * 450);
    });
    if (got.length) C = core.calc(S);
    checkQuests();
  }

  // ------------------------------------------------------------------ layout, input, loop
  function layout() {
    var w = window.innerWidth, h = window.innerHeight;
    var portrait = h > w * 1.05;
    var app = $('app'), want = portrait ? 'portrait' : 'landscape';
    if (app.className !== want) app.className = want;
    var st = $('stage'), r = st.getBoundingClientRect();
    scene.resize(r.width, r.height);
    $('toasts').classList.toggle('side', r.width >= 560 && r.height >= 380);
    var hs = Math.max(0.9, Math.min(1, r.width / 480));
    $('hud').style.fontSize = hs + 'em';
    $('hud').classList.toggle('compact', r.width < 520);
    $('banner').style.fontSize = (3.1 * Math.max(0.65, Math.min(1, r.width / 560))) + 'em';
    hideTip();
  }
  function bindInput() {
    var cv = $('scene');
    cv.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      audio.unlock();
      if (modalOpen) return;
      var ae = document.activeElement;
      if (ae && ae !== document.body && ae.blur) ae.blur();
      var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (scene.hitWisp(x, y)) { catchWisp(); return; }
      var bi = scene.hitBubble(x, y);
      if (bi >= 0) { popBubble(bi); return; }
      if (scene.hitCauldron(x, y)) cauldronClick(x, y);
    }, { passive: false });
    $('stage').addEventListener('contextmenu', function (e) { e.preventDefault(); });
    // Mouse clicks shouldn't keep buttons focused (Space/Enter would re-buy instead of brewing).
    document.addEventListener('click', function (e) {
      if (e.detail > 0 && e.target && e.target.closest) { var b = e.target.closest('button'); if (b && b.blur) b.blur(); }
    });
    // Dialog keyboard safety: ignore Space/Enter right after a dialog opens; Escape closes it.
    function guardKeys(e) {
      if (!modalOpen) return;
      var k = e.key;
      if ((k === ' ' || k === 'Enter' || e.code === 'Space') && performance.now() - modalAt < 400) { e.preventDefault(); e.stopPropagation(); }
      else if (e.type === 'keydown' && (k === 'Escape' || k === 'Esc') && modalOnClose !== 'locked') { e.preventDefault(); closeModal(); }
    }
    window.addEventListener('keydown', guardKeys, true);
    window.addEventListener('keyup', guardKeys, true);
    ['pointerdown', 'touchend', 'click', 'keydown'].forEach(function (ev) { window.addEventListener(ev, function () { audio.unlock(); }, { capture: true, passive: true }); });
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    window.addEventListener('keydown', function (e) {
      var tag = e.target && e.target.tagName;
      if (e.code !== 'Space' && e.code !== 'Enter' && e.key !== ' ' && e.key !== 'Enter') return;
      if (tag === 'BUTTON' || tag === 'INPUT' || modalOpen) return;
      e.preventDefault();
      if (e.repeat) return;
      var L = scene.layout();
      cauldronClick(L.cx + (Math.random() - 0.5) * L.R * 0.6, L.cy - L.R * 0.1);
    });
    window.addEventListener('resize', layout);
    window.addEventListener('orientationchange', function () { setTimeout(layout, 120); });
    if (window.ResizeObserver) { try { new ResizeObserver(function () { layout(); }).observe($('stage')); } catch (e) { /* ignore */ } }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { hiddenAt = Date.now(); save(); audio.suspend(); }
      else {
        audio.resume();
        var away = hiddenAt ? (Date.now() - hiddenAt) / 1000 : 0;
        hiddenAt = 0;
        if (away > 60) offlineWelcome(away);
        else if (away > 0) advance(away);
        lastFrame = performance.now();
      }
    });
    window.addEventListener('pagehide', save);
    window.addEventListener('beforeunload', save);
  }
  // Advance the economy in steps of at most 1 s so buffs end on time.
  function advance(sec) {
    if (!(sec > 0)) { C = core.calc(S); return; }
    while (sec > 1e-6) { var st = Math.min(1, sec); core.tick(S, C, st); C = core.calc(S); sec -= st; }
  }
  function frame(now) {
    var econ = Math.max(0, (now - lastFrame) / 1000);
    lastFrame = now;
    var gap = 0;
    if (econ > 60) { gap = econ; econ = 0; }
    try {
      if (gap) offlineWelcome(gap);
      advance(econ);
      var dt = Math.min(econ, 0.1);
      updateWisps(dt);
      updateBubbles(dt);
      scene.setCombo(S.combo, C.comboWindow > 0 ? S.comboT / C.comboWindow : 0);
      if (feverOn !== S.buffs.fever > 0) { feverOn = S.buffs.fever > 0; scene.setFever(feverOn); audio.setFever(feverOn); }
      if (dispPotions < S.potions) {
        dispPotions += (S.potions - dispPotions) * Math.min(1, dt * 14) + 1e-9;
        if (S.potions - dispPotions < Math.max(0.5, S.potions * 1e-4)) dispPotions = S.potions;
        setText($('potions'), fmt(dispPotions));
      }
      if (econ > 0 && econ < 0.5) {
        frameEma = frameEma * 0.97 + econ * 0.03;
        perfTime += econ;
        if (perfTime > 4 && frameEma > 0.025 && scene.quality() > 0) scene.setQuality(0);
      }
      scene.update(dt, Math.log(C.ppsNow + 1) / Math.LN10);
      scene.draw();
      if (scene.takeArrivals()) bumpCount();
      updateHint();
      uiAcc += econ; if (uiAcc >= 0.1) { uiAcc = 0; updateUI(); }
      achAcc += econ; if (achAcc >= 0.5) { achAcc = 0; checkAch(); }
      saveAcc += econ; if (saveAcc >= 15) { saveAcc = 0; save(); }
    } catch (err) {
      if (window.console && console.warn) console.warn('Brewnado frame error', err);
    }
    requestAnimationFrame(frame);
  }

  function start() {
    sdk(function (s) { s.game.loadingStart(); });
    var raw = storeGet();
    var loaded = raw ? core.deserialize(raw) : null;
    S = loaded || core.newState();
    dispPotions = S.potions;
    i18n.setLang(detectLang());
    C = core.calc(S);
    syncScene();
    buildUI();
    layout();
    audio.set(S.settings.sfx, S.settings.music);
    sdk(function (s) {
      if (s.game.settings) { audio.setSdkMuted(!!s.game.settings.muteAudio); updateSoundBtn(); }
      if (s.game.addSettingsChangeListener) s.game.addSettingsChangeListener(function (ns) { audio.setSdkMuted(!!(ns && ns.muteAudio)); updateSoundBtn(); });
    });
    bindInput();
    updateUI();
    var away = loaded ? (Date.now() - S.lastSave) / 1000 : 0;
    var fontsReady = (document.fonts && document.fonts.load) ? Promise.all([
      document.fonts.load('800 20px BrewDisplay'), document.fonts.load('900 20px BrewBlack'), document.fonts.load('600 16px BrewText')
    ]) : Promise.resolve();
    var go = false;
    function begin() {
      if (go) return; go = true;
      lastFrame = performance.now();
      requestAnimationFrame(frame);
      sdk(function (s) { s.game.loadingStop(); });
      var sp = $('splash'); if (sp) { sp.classList.add('gone'); setTimeout(function () { if (sp.parentNode) sp.parentNode.removeChild(sp); }, 450); }
      gameplay(true);
      if (away > 60) offlineWelcome(away);
      save();
    }
    fontsReady.then(begin, begin);
    setTimeout(begin, 1500);
    /*DEBUG-START*/
    if (/[?&]debug=1/.test(location.search)) {
      window.__bw = {
        S: function () { return S; }, C: function () { return C; }, core: core, save: save, layout: layout,
        setTab: setTab, openSettings: openSettings, openRecords: openRecords, sdk: function () { return SDK; },
        click: function (n) { var L = scene.layout(); for (var i = 0; i < (n || 1); i++) { clickTimes = []; cauldronClick(L.cx, L.cy); } },
        spawnWisp: function () { S.wispIn = 0; }, catchWisp: catchWisp, modalOpen: function () { return modalOpen; },
        L: function () { return scene.layout(); }, wisp: function () { return scene.wispPos(); }, muted: function () { return audio.isMuted(); },
        toast: toast, fmt: fmt, offline: offlineWelcome,
        refresh: function () { upSig = ''; magicBuilt = ''; C = core.calc(S); syncScene(); updateUI(); }, openGift: openGift, buyStage: function () { buyStage($('upList')); },
        spawnBubble: function (golden) { return scene.spawnBubble(!!golden, 7); }, bubble: function () { return scene.bubblePos(); },
        openQuests: openQuests, checkQuests: checkQuests, claimQuest: claimQuest,
      };
    }
    /*DEBUG-END*/
  }
  function makeGrain() {
    try {
      var c = document.createElement('canvas'); c.width = c.height = 96;
      var g = c.getContext('2d'), img = g.createImageData(96, 96), d = img.data;
      for (var i = 0; i < d.length; i += 4) { var v = Math.random() * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 10 + Math.random() * 12; }
      g.putImageData(img, 0, 0);
      document.documentElement.style.setProperty('--grain', 'url(' + c.toDataURL('image/png') + ')');
    } catch (e) { /* purely cosmetic */ }
  }
  function boot() {
    coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    makeGrain();
    var spi = $('splashIco'); if (spi) spi.innerHTML = BW.icon('potion');
    scene.init($('scene'));
    initSDK().then(start, start);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.BW = window.BW || {});
