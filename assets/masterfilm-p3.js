/* masterfilm-p3.js — P3: multi-plane depth separation (Argon Priority 3).
 *
 * Three planes, three rates, one scroll:
 *   background — the film canvas, barely swaying (±12px, EXACTLY 0 during
 *     beat 4, frames 80–96, so the beat-4 frame lock holds exactly).
 *     The sway lives on the WRAPPER (.film-backdrop-fixed), NOT the canvas:
 *     the film engine owns canvas.style.transform (mouse parallax +
 *     scale 1.06) and P3 never writes it. Element separation, not a
 *     shared property. Argon's literal translateZ(-300px) is
 *     unimplementable here (no perspective ancestor exists that wouldn't
 *     re-parent the fixed backdrop, and a translateZ would change the
 *     canvas's apparent size — the lock's enemy). The sway is the same
 *     differential-motion idea with zero size change.
 *   mid — the content DOM: untouched. P1/P2/reveal/lion.js keep owning it.
 *   foreground — the NEW #p3Foreground bokeh plane: scrolls at 1.35x
 *     (desktop) / 1.15x (mobile), so it rushes past the content, plus
 *     opposite-sign mouse parallax (+25px vs the canvas's −14px).
 *
 * Everything is a pure function of scrollY + displayed frame + mouse:
 * no timers, no autonomous motion — frozen when scroll stops, forward
 * only with scroll. Reduced motion: the loop never starts.
 *
 * Frame source: the pill (#seqStatusPill) — the DISPLAYED frame, so the
 * drift and the beat-4 dimming always match the image on screen, even
 * during the engine's smoothing chase after a jump. Fallback: interpolate
 * from window.__p1Timeline breakpoints; if that is missing too, drift 0.
 */
(function () {
  'use strict';

  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE_POINTER = window.matchMedia('(pointer: fine)').matches;

  var wrapper = document.querySelector('.film-backdrop-fixed');
  var fg = document.getElementById('p3Foreground');
  var pill = document.getElementById('seqStatusPill');
  if (!wrapper || !fg) return;

  function isMobile() { return window.innerWidth <= 900; }
  function params() {
    return isMobile()
      ? { tile: 1100, k: 1.15, mxAmp: 0, myAmp: 0 }
      : { tile: 1400, k: 1.35, mxAmp: 25, myAmp: 18 };
  }
  var P = params();
  fg.style.setProperty('--p3-tile', P.tile + 'px');

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smoothstep(a, b, x) {
    var t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }

  /* ---- displayed film frame (0–119) ---- */
  function pillFrame() {
    if (!pill) return null;
    var m = /FRAME\s+(\d+)/.exec(pill.textContent || '');
    if (!m) return null;
    var f = parseInt(m[1], 10) - 1;
    return (f >= 0 && f <= 119) ? f : null;
  }
  function mapperFrame(y) {
    var tl = window.__p1Timeline;
    if (!tl || !tl.breakpoints) return null;
    var pts = tl.breakpoints;
    y = clamp(y, 0, pts[pts.length - 1][0]);
    var f = pts[pts.length - 1][1];
    for (var i = 0; i < pts.length - 1; i++) {
      if (y >= pts[i][0] && y <= pts[i + 1][0]) {
        f = pts[i][1] + (y - pts[i][0]) / Math.max(0.0001, pts[i + 1][0] - pts[i][0]) * (pts[i + 1][1] - pts[i][1]);
        break;
      }
    }
    return f;
  }
  function frame() {
    var f = pillFrame();
    if (f !== null) return f;
    var m = mapperFrame(window.scrollY || 0);
    return (m === null) ? null : clamp(m, 0, 119);
  }

  /* ---- background drift (plan §3): one smooth hump, EXACTLY 0 in [80,96] ---- */
  function drift(f) {
    if (f === null) return 0;
    if (f <= 80) return 12 * Math.sin(Math.PI * f / 80);
    if (f <= 96) return 0;
    return -10 * Math.sin(Math.PI * (f - 96) / 23);
  }

  /* ---- foreground dimming during beat 4 (plan §3): 0.55x in [80,96] ---- */
  function fgDim(f) {
    if (f === null) return 1;
    if (f >= 80 && f <= 96) return 0.55;
    if (f < 80) return 1 - 0.45 * smoothstep(74, 80, f);
    return 1 - 0.45 * (1 - smoothstep(96, 102, f));
  }

  /* ---- mouse parallax (desktop, pointer:fine only) — opposite sign to the
   * canvas (Argon: background −1.0x, foreground +1.8x). Smoothed like the
   * film engine (0.08 lerp); settles when the mouse stops. ---- */
  var mouseX = 0, mouseY = 0, smX = 0, smY = 0;
  if (FINE_POINTER && !RM) {
    window.addEventListener('pointermove', function (e) {
      mouseX = ((e.clientX / window.innerWidth) - 0.5) * P.mxAmp;
      mouseY = ((e.clientY / window.innerHeight) - 0.5) * P.myAmp;
    }, { passive: true });
  }

  if (RM) return; /* P3 never runs under reduced motion */

  /* ---- main loop: pure function of scrollY + displayed frame + mouse ---- */
  var lastWrap = null, lastFgT = null, lastFgO = null;
  function tick() {
    requestAnimationFrame(tick);
    var y = window.scrollY || 0;
    var f = frame();
    var d = drift(f);
    var wrapT = Math.abs(d) < 0.05 ? '' : 'translate3d(0, ' + d.toFixed(2) + 'px, 0)';
    if (wrapT !== lastWrap) { wrapper.style.transform = wrapT; lastWrap = wrapT; }

    smX += (mouseX - smX) * 0.08;
    smY += (mouseY - smY) * 0.08;
    var ty = -((y * P.k) % P.tile);
    var fgT = 'translate3d(' + smX.toFixed(1) + 'px, ' + (ty + smY).toFixed(1) + 'px, 0)';
    if (fgT !== lastFgT) { fg.style.transform = fgT; lastFgT = fgT; }
    var fgO = +(0.9 * fgDim(f)).toFixed(3);
    if (fgO !== lastFgO) { fg.style.opacity = String(fgO); lastFgO = fgO; }
  }

  window.addEventListener('resize', function () {
    P = params();
    fg.style.setProperty('--p3-tile', P.tile + 'px');
    if (isMobile()) { mouseX = 0; mouseY = 0; smX = 0; smY = 0; }
  });

  requestAnimationFrame(tick);

  /* ---- verification handle ---- */
  window.__p3Layers = {
    params: function () { return { tile: P.tile, k: P.k }; },
    frame: frame,
    drift: drift,
    state: function () {
      var y = window.scrollY || 0;
      var f = frame();
      return {
        scrollY: y,
        frame: f,
        drift: drift(f),
        wrapperTransform: getComputedStyle(wrapper).transform,
        fgTransform: getComputedStyle(fg).transform,
        fgOpacity: fg.style.opacity || getComputedStyle(fg).opacity,
        fgDim: fgDim(f)
      };
    }
  };
})();
