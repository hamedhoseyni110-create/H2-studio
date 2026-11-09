/* masterfilm-p4.js — P4: camera-spline coordinate projection (Argon Priority 4).
 *
 * The beat cards stop standing divorced from the video's internal camera
 * motion. In beats 1 and 2 the card subtly tracks the light anchor measured
 * from the actual film frames (±18px X/Y, scale 0.96→1.02), so the card
 * feels pinned to a point in 3D space as the camera flies past — the Camper
 * camera-path.json pattern, vanilla, 0 KB, no new assets.
 *
 * Anchor table: measured from the real webp frames (PIL: brightness
 * centroid of the top-1% brightest pixels + RMS spread, 3-frame moving
 * average, keyframes every 2nd frame), stored NORMALIZED (u, v in 0..1 of
 * the 800x450 frame + spread in frame-px). Source of truth:
 * work/p4-anchor-table.json — the embedded constant below MUST match it.
 *
 * Peak frames are EMPIRICAL (plan §4): probed on the live P3 page by
 * scrolling until each overlay's opacity is 1 and reading the pill. The
 * P1 engine's frame-based BEAT_WINDOWS (masterfilm-p1.js) govern what
 * actually runs — NOT the old smoothP windows, which is why the peaks
 * (16 and 37) differ from the plan's smoothP-based guesses (27 and 48).
 * Beat 1: overlay visible pills 8–24, opacity-1 plateau 13–19, peak 16.
 * Beat 2: overlay visible pills 27–47, opacity-1 plateau 32–43, peak 37.
 * The peak is an INTEGER pill so the offset is EXACTLY 0 there (§5).
 *
 * Scale (§5): beat 1 uses the LINEAR ENVELOPE (its measured spread is
 * still jumpy after smoothing: max adjacent scale delta 0.0223 > 0.01 at
 * films 9→10, the birth-flash collapse). Beat 2 uses the MEASURED spread
 * (max adjacent scale delta 0.0094 ≤ 0.01).
 *
 * Beat 4 is EXCLUDED (plan §2): the mouse tilt owns the beat-4 cards'
 * transform and the pixel-exact frame lock forbids moving them.
 *
 * Hover (§3): P4's inline transform beats the CSS :hover lift, so P4
 * tracks hover itself (pointerenter/pointerleave) and composes the exact
 * hover values (Y −4px, Z +18px, scale ×1.015) into its transform.
 * The :hover box-shadow stays in CSS untouched.
 *
 * Per-frame delta clamp (§4 MUST): the applied offset chases its table
 * value by at most 6px per axis per rAF tick, so the card never jumps —
 * the fastest table segment (beat 1 films 15→16: 8.02px/frame on X)
 * is smoothed by the clamp instead of teleporting.
 *
 * D-P4-1 fix (2026-11-07): the tracking rides on the overlay's exit zoom
 * and can push the card past the viewport edge on mobile (pills 22/23/45,
 * up to +12.9px). After writing the transform, tick() measures the card
 * rect and clamps dx so the rect stays in-viewport (1px guard) — one
 * correction pass is exact, and the corrected dx is what `applied` keeps.
 *
 * Everything is a pure function of the displayed frame + hover: no
 * timers, no autonomous motion — frozen when scroll stops, forward only
 * with scroll. Reduced motion: the loop never starts, no handle.
 *
 * Frame source: the pill (#seqStatusPill) — the DISPLAYED frame, so the
 * tracking always matches the image on screen. Fallback: interpolate
 * from window.__p1Timeline breakpoints; if that is missing too, the
 * transform is cleared.
 */
(function () {
  'use strict';

  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (RM) return; /* P4 never runs under reduced motion */

  var card1 = document.querySelector('[data-beat="1"] .work-showcase-card');
  var card2 = document.querySelector('[data-beat="2"] .work-showcase-card');
  var pill = document.getElementById('seqStatusPill');
  if (!card1 || !card2) return;

  /* ---- anchor table (embedded constant; source: work/p4-anchor-table.json) ----
   * window: [first, last] pill frames where the overlay is visible.
   * peak: integer pill where the offset is EXACTLY 0.
   * peakU/peakV: normalized anchor at the peak. maxDispU/maxDispV:
   * normalized max |anchor − peak| within the window (the ±18px budget's
   * denominator). scaleMode: 'linear' (envelope) or 'measured' (spread).
   * keyframes: [{f, u, v, s}] — smoothed anchor (normalized) + spread (px). */
  var TABLE = {
    1: {
      window: [8, 24], peak: 16, peakU: 0.5683, peakV: 0.5724,
      maxDispU: 0.072875, maxDispV: 0.141556,
      scaleMode: 'linear', spreadMin: 28.4, spreadMax: 84.8,
      keyframes: [
        { f: 8, u: 0.4963, v: 0.4947, s: 84.8 },
        { f: 10, u: 0.4954, v: 0.4956, s: 51.3 },
        { f: 12, u: 0.4967, v: 0.4989, s: 39.2 },
        { f: 14, u: 0.5074, v: 0.5033, s: 35.0 },
        { f: 16, u: 0.5683, v: 0.5724, s: 46.6 },
        { f: 18, u: 0.6292, v: 0.5916, s: 62.7 },
        { f: 20, u: 0.6176, v: 0.5182, s: 52.2 },
        { f: 22, u: 0.5952, v: 0.456, s: 30.4 },
        { f: 24, u: 0.5877, v: 0.4309, s: 28.4 }
      ]
    },
    2: {
      window: [27, 47], peak: 37, peakU: 0.4939, peakV: 0.4149,
      maxDispU: 0.15375, maxDispV: 0.273333,
      scaleMode: 'measured', spreadMin: 29.2, spreadMax: 55.3,
      keyframes: [
        { f: 27, u: 0.6476, v: 0.4567, s: 35.5 },
        { f: 29, u: 0.6298, v: 0.448, s: 30.8 },
        { f: 31, u: 0.5884, v: 0.4607, s: 29.2 },
        { f: 33, u: 0.5589, v: 0.4384, s: 31.8 },
        { f: 35, u: 0.5209, v: 0.3791, s: 35.1 },
        { f: 37, u: 0.4939, v: 0.4149, s: 40.2 },
        { f: 39, u: 0.5008, v: 0.5193, s: 47.7 },
        { f: 41, u: 0.491, v: 0.6618, s: 49.3 },
        { f: 43, u: 0.4969, v: 0.6749, s: 55.3 },
        { f: 45, u: 0.5186, v: 0.6413, s: 53.2 },
        { f: 47, u: 0.5208, v: 0.6378, s: 54.5 }
      ]
    }
  };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---- displayed film frame (0–119), same source as P3 ---- */
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

  /* ---- anchor interpolation (linear between keyframes) ---- */
  function anchorAt(T, f) {
    var kfs = T.keyframes;
    if (f <= kfs[0].f) return { u: kfs[0].u, v: kfs[0].v, s: kfs[0].s };
    if (f >= kfs[kfs.length - 1].f) {
      var l = kfs[kfs.length - 1];
      return { u: l.u, v: l.v, s: l.s };
    }
    for (var i = 0; i < kfs.length - 1; i++) {
      if (f >= kfs[i].f && f <= kfs[i + 1].f) {
        var t = (f - kfs[i].f) / Math.max(0.0001, kfs[i + 1].f - kfs[i].f);
        return {
          u: kfs[i].u + t * (kfs[i + 1].u - kfs[i].u),
          v: kfs[i].v + t * (kfs[i + 1].v - kfs[i].v),
          s: kfs[i].s + t * (kfs[i + 1].s - kfs[i].s)
        };
      }
    }
    return { u: T.peakU, v: T.peakV, s: kfs[0].s };
  }

  /* ---- tracking law (§5): offset ±18px from the peak anchor, scale 0.96–1.02.
   * Returns null outside the beat's window (transform cleared). ---- */
  function track(beat, f) {
    var T = TABLE[beat];
    if (f === null || f < T.window[0] || f > T.window[1]) return null;
    var a = anchorAt(T, f);
    var dx = 18 * (a.u - T.peakU) / T.maxDispU;
    var dy = 18 * (a.v - T.peakV) / T.maxDispV;
    /* guard: a light that doesn't move needs no tracking (never triggers
     * here: maxDisp is 58–123 frame-px, far above the 5px guard). */
    if (T.maxDispU * 800 < 5 || T.maxDispV * 450 < 5) { dx = 0; dy = 0; }
    dx = clamp(dx, -18, 18);
    dy = clamp(dy, -18, 18);
    var prog = (f - T.window[0]) / (T.window[1] - T.window[0]);
    var s = T.scaleMode === 'measured'
      ? 0.96 + 0.06 * (a.s - T.spreadMin) / Math.max(0.0001, T.spreadMax - T.spreadMin)
      : 0.96 + 0.06 * prog;
    s = clamp(s, 0.96, 1.02);
    return { dx: dx, dy: dy, scale: s, anchor: a, progress: prog };
  }

  /* ---- hover composition (§3): the exact CSS hover lift, composed in JS ---- */
  var hover = { 1: false, 2: false };
  function bindHover(beat, card) {
    card.addEventListener('pointerenter', function () { hover[beat] = true; });
    card.addEventListener('pointerleave', function () { hover[beat] = false; });
  }
  bindHover(1, card1);
  bindHover(2, card2);

  /* ---- main loop: pure function of displayed frame + hover ---- */
  var applied = { 1: { dx: 0, dy: 0 }, 2: { dx: 0, dy: 0 } };
  var lastWritten = { 1: null, 2: null };
  function tick() {
    requestAnimationFrame(tick);
    var f = frame();
    [1, 2].forEach(function (beat) {
      var card = beat === 1 ? card1 : card2;
      var t = track(beat, f);
      if (!t) {
        /* outside the window the overlay is invisible + inert: clear at once */
        if (lastWritten[beat] !== '') {
          card.style.transform = '';
          lastWritten[beat] = '';
          applied[beat] = { dx: 0, dy: 0 };
        }
        return;
      }
      /* per-frame delta clamp (§4): applied value chases the table by at
       * most 6px per axis per tick, so the card never jumps. */
      var ap = applied[beat];
      var ndx = clamp(t.dx, ap.dx - 6, ap.dx + 6);
      var ndy = clamp(t.dy, ap.dy - 6, ap.dy + 6);
      var hov = hover[beat];
      var ty = hov ? ndy - 4 : ndy;
      var tz = hov ? 18 : 0;
      var sc = hov ? t.scale * 1.015 : t.scale;
      var str = 'translate3d(' + ndx.toFixed(1) + 'px, ' + ty.toFixed(1) +
        'px, ' + tz + 'px) scale(' + sc.toFixed(3) + ')';
      if (str !== lastWritten[beat]) {
        card.style.transform = str;
        /* D-P4-1 fix: the tracking rides on the overlay's exit zoom and
         * can push the card past the viewport edge (mobile, pills 22/23/45).
         * Measure after writing (the rect includes the overlay's zoom +
         * scale), shift dx by the exact excess, write once more. One pass
         * is exact — a pure dx shift moves the whole rect by dx regardless
         * of scale. The 1px guard absorbs the toFixed(1) rounding.
         * Probe 2026-11-08: the right-pin fixed pills 22/45 but at pill 23
         * the card itself is ~401px wide in a 390px viewport (stage zoom),
         * so pinning the right edge pushed the left out to -12.43px. When
         * the card is wider than the viewport no dx can fit it — center it
         * instead, so the bleed splits evenly (~5px a side). */
        var r = card.getBoundingClientRect();
        var over = 0;
        var vw = window.innerWidth;
        if (r.width > vw - 2) over = r.left - (vw - r.width) / 2;
        else if (r.right > vw - 1) over = r.right - (vw - 1);
        else if (r.left < 1) over = r.left - 1;
        if (over !== 0) {
          ndx -= over;
          str = 'translate3d(' + ndx.toFixed(1) + 'px, ' + ty.toFixed(1) +
            'px, ' + tz + 'px) scale(' + sc.toFixed(3) + ')';
          card.style.transform = str;
        }
        lastWritten[beat] = str;
      }
      applied[beat] = { dx: ndx, dy: ndy };
    });
  }
  requestAnimationFrame(tick);

  /* ---- verification handle ---- */
  window.__p4Track = {
    table: function () { return TABLE; },
    frame: frame,
    trackAt: function (beat, f) { return track(beat, f); },
    state: function () {
      var f = frame();
      function st(beat) {
        var card = beat === 1 ? card1 : card2;
        var t = track(beat, f);
        return {
          active: !!t,
          frame: f,
          dx: t ? +t.dx.toFixed(2) : 0,
          dy: t ? +t.dy.toFixed(2) : 0,
          scale: t ? +t.scale.toFixed(3) : 1,
          anchor: t ? { u: +t.anchor.u.toFixed(4), v: +t.anchor.v.toFixed(4), s: +t.anchor.s.toFixed(1) } : null,
          appliedDx: +applied[beat].dx.toFixed(2),
          appliedDy: +applied[beat].dy.toFixed(2),
          hover: hover[beat],
          transform: card.style.transform || ''
        };
      }
      return { frame: f, beat1: st(1), beat2: st(2) };
    }
  };
})();
