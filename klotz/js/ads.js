/*!
 * Klotz – Werbe-Schnittstellen
 *
 * Aktuell SIMULIERT (Platzhalter-Overlays), damit das Spiel ohne AdSense-Konto
 * testbar ist. Das Spiel spricht nur diese zwei Funktionen an:
 *
 *   triggerInterstitialAd(onClosed)           Vollbild zwischen Levels / bei Neustart
 *   triggerRewardedAd(onReward, onDismiss)    Video gegen Hinweis (freiwillig)
 *
 * Während eine Anzeige läuft, werden die Window-Events `klotz:adstart` und
 * `klotz:adend` gefeuert – das Spiel pausiert/fortsetzt sich darüber selbst.
 *
 * ---------------------------------------------------------------------------
 * PRODUKTION: Google H5 Games Ads (Ad Placement API, "adBreak")
 * ---------------------------------------------------------------------------
 * Für Browsergames erlaubt Google Interstitials/Rewarded nur über diese API.
 * 1) Snippet aus index.html (adsbygoogle.js + adBreak/adConfig) aktivieren.
 * 2) Die beiden Funktionen unten durch diese Varianten ersetzen:
 *
 *   function triggerInterstitialAd(onClosed) {
 *     adBreak({
 *       type: 'next',                       // Pause zwischen zwei Levels
 *       name: 'level-transition',
 *       beforeAd: () => emit('klotz:adstart', 'interstitial'),
 *       afterAd: () => emit('klotz:adend', 'interstitial'),
 *       adBreakDone: (info) => onClosed(info.breakStatus === 'viewed')
 *     });
 *   }
 *
 *   function triggerRewardedAd(onReward, onDismiss) {
 *     let rewarded = false;
 *     adBreak({
 *       type: 'reward',
 *       name: 'hint',
 *       beforeAd: () => emit('klotz:adstart', 'rewarded'),
 *       afterAd: () => emit('klotz:adend', 'rewarded'),
 *       beforeReward: (showAdFn) => showAdFn(), // Spieler hat bereits aktiv "Hinweis" gewählt
 *       adViewed: () => { rewarded = true; onReward(); },
 *       adDismissed: () => onDismiss(),
 *       // Kein Video verfügbar (frequencyCapped, notReady …): Hinweis trotzdem
 *       // gewähren – ein leerer Klick frustriert und senkt die künftige Opt-in-Rate.
 *       adBreakDone: (info) => {
 *         if (!rewarded && info.breakStatus !== 'dismissed' && info.breakStatus !== 'viewed') onReward();
 *       }
 *     });
 *   }
 */
(function (root) {
  'use strict';

  const AdConfig = {
    // Spielpause, bevor "Schließen (X)" aktiv wird
    interstitialPauseMs: 3000,
    // Länge des simulierten Belohnungsvideos
    rewardedDurationMs: 5000,
    // Frequency-Cap: Mindestabstand zwischen zwei Interstitials.
    // 0 = jedes Mal (zum Testen). Für Produktion 45–90 s empfohlen: zu häufige
    // Interstitials senken Sitzungsdauer und Wiederkehr stärker, als sie einbringen.
    // (Bei der H5 Games Ads API übernimmt das data-ad-frequency-hint.)
    interstitialMinIntervalMs: 0
  };

  const doc = root.document;
  const el = (id) => doc.getElementById(id);
  const noop = function () {};
  let active = null; // 'interstitial' | 'rewarded' | null
  let lastInterstitialAt = -Infinity;
  let lastFocus = null;

  function emit(name, type) {
    root.dispatchEvent(new CustomEvent(name, { detail: { type: type } }));
  }

  function openOverlay(overlay, type) {
    active = type;
    lastFocus = doc.activeElement;
    overlay.hidden = false;
    // Reflow erzwingen, damit die Einblend-Transition greift
    void overlay.offsetWidth;
    overlay.classList.add('is-open');
    emit('klotz:adstart', type);
  }

  function closeOverlay(overlay) {
    const type = active;
    overlay.classList.remove('is-open');
    overlay.hidden = true;
    active = null;
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    emit('klotz:adend', type);
  }

  /**
   * Interstitial (Vollbild) – aufrufen bei Level geschafft bzw. Level-Neustart.
   * Pausiert das Spiel für AdConfig.interstitialPauseMs, danach kann der
   * Spieler mit "Schließen (X)" weiter. onClosed(shown) folgt immer.
   */
  function triggerInterstitialAd(onClosed) {
    const done = typeof onClosed === 'function' ? onClosed : noop;
    if (active) return;
    if (Date.now() - lastInterstitialAt < AdConfig.interstitialMinIntervalMs) {
      done(false);
      return;
    }
    lastInterstitialAt = Date.now();

    const overlay = el('adInterstitial');
    const btn = el('adInterstitialClose');
    const counter = el('adInterstitialCountdown');
    let remaining = Math.ceil(AdConfig.interstitialPauseMs / 1000);

    btn.disabled = true;
    btn.classList.remove('is-ready');
    counter.textContent = remaining;
    openOverlay(overlay, 'interstitial');

    const timer = setInterval(function () {
      remaining--;
      if (remaining > 0) {
        counter.textContent = remaining;
        return;
      }
      clearInterval(timer);
      counter.textContent = '';
      btn.disabled = false;
      btn.classList.add('is-ready');
      btn.focus();
    }, 1000);

    function onKey(e) {
      if (e.key === 'Escape') finish();
    }
    function finish() {
      if (btn.disabled) return;
      btn.removeEventListener('click', finish);
      doc.removeEventListener('keydown', onKey);
      closeOverlay(overlay);
      done(true);
    }
    btn.addEventListener('click', finish);
    doc.addEventListener('keydown', onKey);
  }

  /**
   * Rewarded Ad – nur nach aktivem Opt-in des Spielers aufrufen.
   * Zeigt "Video wird geladen...", schließt nach AdConfig.rewardedDurationMs
   * und ruft dann onReward() auf. Abbrechen → onDismiss(), keine Belohnung.
   */
  function triggerRewardedAd(onReward, onDismiss) {
    const reward = typeof onReward === 'function' ? onReward : noop;
    const dismiss = typeof onDismiss === 'function' ? onDismiss : noop;
    if (active) return;

    const overlay = el('adRewarded');
    const bar = el('adRewardedBar');
    const left = el('adRewardedLeft');
    const cancel = el('adRewardedCancel');
    const duration = AdConfig.rewardedDurationMs;
    const start = performance.now();
    let raf = 0;

    bar.style.transform = 'scaleX(0)';
    left.textContent = Math.ceil(duration / 1000);
    openOverlay(overlay, 'rewarded');

    function tick(now) {
      const p = Math.min(1, (now - start) / duration);
      bar.style.transform = 'scaleX(' + p + ')';
      left.textContent = Math.max(0, Math.ceil((duration - (now - start)) / 1000));
      if (p >= 1) {
        end();
        reward();
        return;
      }
      raf = requestAnimationFrame(tick);
    }
    function end() {
      cancelAnimationFrame(raf);
      cancel.removeEventListener('click', onCancel);
      closeOverlay(overlay);
    }
    function onCancel() {
      end();
      dismiss();
    }
    cancel.addEventListener('click', onCancel);
    raf = requestAnimationFrame(tick);
  }

  const api = {
    config: AdConfig,
    triggerInterstitialAd: triggerInterstitialAd,
    triggerRewardedAd: triggerRewardedAd,
    isShowing: function () { return active !== null; }
  };
  root.KlotzAds = api;
  // Global verfügbar, wie in der Spezifikation gefordert
  root.triggerInterstitialAd = triggerInterstitialAd;
  root.triggerRewardedAd = triggerRewardedAd;
})(window);
