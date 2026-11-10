/* masterfilm-p2.js — P2: Z-axis camera tunnel (Argon Priority 2).
 *
 * Sections fly toward the camera through a 1000px perspective tunnel instead
 * of sliding up in Y: deep Z (translateZ -320px, ~0.76 scale, faded) -> Z 0
 * (full size, readable) -> fade out in place (exit Z 0, no lift, no balloon).
 * plus a velocity-driven pitch tilt (rotateX, lion.js's smoothed-velocity
 * pattern) — tiltCap is 0 since 2026-11-10 (the top-anchored rotateX on
 * thousand-px chapters moved content by tens of px with finger speed:
 * that WAS the stretch).
 * (2026-11-09 ghost fix: enter -320 / exit +85, was -500..-750 / +240..+360;
 * the old 1.32x-1.56x exit ballooned downward over the next chapter.
 * 2026-11-10 ghost-stretch fix: exit 0, tiltCap 0 both viewports.)
 *
 * OWNERSHIP (plan §1): the tunnel owns ONLY the chapter elements'
 * transform/opacity/inert. app.js's reveal and lion.js keep owning the
 * INNER nodes (titles, cards, steps, KAGE/filmstrip internals) — their
 * transforms compose inside the chapter's plane. Nobody else writes
 * transform/opacity on the chapter elements themselves. At rest (focus)
 * the tunnel CLEARS its inline styles, so the chapter is pixel-identical
 * to the P1 preview while being read.
 *
 * transform-origin 50% 0 (CSS): lion.js reads getBoundingClientRect().top
 * of inner nodes every frame — a top-anchored chapter keeps every top exact
 * during flight, so their entrances never pop when the tunnel clears.
 * NO perspective property on any ancestor (it would re-parent the fixed
 * film backdrop); the tunnel uses the perspective() transform FUNCTION.
 *
 * MEASUREMENT SAFETY (plan §2): P1's timeline, KAGE and the filmstrip
 * measure element rects on discrete triggers only (load, resize, h2:grids,
 * language clicks). A transformed chapter's bottom shifts, so the tunnel
 * CLEARS all transforms around those triggers and forces a re-measure
 * (suspend-and-heal): the wrong anchor never renders a frame.
 */
(function () {
  'use strict';

  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CHAPTERS = [
    { sel: '#services',         noExit: false },
    { sel: '#portfolio',        noExit: false },
    { sel: '#lionPanels',       noExit: true },  /* 2026-11-10 قدم ۵: pinned KAGE stage inside — no exit fade */
    { sel: '#videos',           noExit: true },  /* 2026-11-10 قدم ۵: pinned filmstrip — no exit fade */
    { sel: '.lab-trigger-wrap', noExit: false },
    { sel: '#process',          noExit: false },
    { sel: '.duo-wrap',         noExit: false },
    { sel: '#studio-finale',    noExit: true }   /* exit disabled: final CTA must stay readable */
  ];

  function docTop(el) {
    var t = 0, n = el;
    while (n) { t += n.offsetTop || 0; n = n.offsetParent; }
    return t;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  var chapters = CHAPTERS.map(function (c) {
    var el = document.querySelector(c.sel);
    var ch = {
      sel: c.sel, el: el, noExit: c.noExit,
      active: false, top: 0, bottom: 0,
      s0: 0, s1: 0, s2: 0, s3: 0,
      state: { cleared: true }
    };
    if (el) el.classList.add('p2-chapter');
    return ch;
  });

  /* Layout geometry only (offsetTop chain + offsetHeight) — immune to
   * transforms, so the tunnel can never feed back into its own windows. */
  function measure() {
    var vh = window.innerHeight;
    chapters.forEach(function (ch) {
      if (!ch.el) { ch.active = false; return; }
      var h = ch.el.offsetHeight;
      if (!h) { ch.active = false; return; }
      ch.active = true;
      ch.top = docTop(ch.el);
      ch.bottom = ch.top + h;
      /* 2026-11-09 ghost fix: asymmetric ramps + guaranteed rest floor.
       * Old: enter = exit = 0.65*vh (548px MOB) — adjacent chapters' ramps
       * overlapped by 252px in scrollY, both at 0.7-0.9 alpha at once.
       * New: enter 0.36*vh (~304px), exit 0.12*vh (~110px at 915, was
       * 0.22*vh until 2026-11-10). For adjacent chapters N+1 finishes
       * entering well BEFORE N starts exiting, so at most one chapter is
       * mid-fade at any scrollY. Rest = h + 0.52*vh — #services (251px)
       * and .lab-trigger-wrap (230px) rest at alpha 1. The minRest guard
       * is a no-op at these constants; it enforces the invariant if ramps
       * are ever retuned. */
      var enterSpan = vh * 0.36, exitSpan = vh * 0.12, minRest = vh * 0.28;
      ch.s0 = ch.top - vh;               /* enter start  */
      ch.s1 = ch.top - vh + enterSpan;   /* enter end    */
      ch.s2 = ch.bottom - exitSpan;      /* exit start   */
      ch.s3 = ch.bottom;                 /* exit end     */
      if (ch.noExit) { ch.s2 = Infinity; ch.s3 = Infinity; return; }
      if (ch.s2 - ch.s1 < minRest) {
        var m = (ch.s1 + ch.s2) / 2;
        ch.s1 = Math.max(ch.s0 + 1, m - minRest / 2);
        ch.s2 = Math.min(ch.s3 - 1, m + minRest / 2);
      }
    });
  }

  /* ---- suspend-and-heal (plan §2) ---- */
  var suspendedUntil = performance.now() + 2500; /* initial settle window while app.js fills sections */
  var healing = false, lastHeal = 0;

  function clearChapter(ch) {
    if (ch.state.cleared) return;
    ch.el.style.transform = '';
    ch.el.style.opacity = '';
    ch.el.inert = false;
    ch.state = { cleared: true };
  }
  function clearAll() { chapters.forEach(clearChapter); }
  function suspend(ms) {
    clearAll();
    suspendedUntil = Math.max(suspendedUntil, performance.now() + ms);
  }
  /* Clear transforms, then force every rect-reader (P1 timeline, KAGE,
   * filmstrip) to re-measure with true rects in the same task, then
   * immediately re-apply the tunnel in the SAME task — no suspend
   * window, no un-tunneled paint (2026-11-09 live bug 2: the old
   * suspend(600) left chapters un-transformed for 600ms on every
   * toolbar resize, so a chunk visibly popped to full scale and snapped
   * back). Guarded against re-dispatch loops. */
  function heal() {
    var now = performance.now();
    if (healing || now - lastHeal < 150) return;
    healing = true;
    lastHeal = now;
    clearAll();
    document.dispatchEvent(new Event('h2:grids'));
    /* Synchronous re-apply: the same code the tick runs (depth + tilt
     * from current velocity), so chapters are never un-tunneled for a
     * paint. suspend() is NOT used here — it stays only for the
     * language-click path, which needs to cover P1's +400ms async
     * re-measure. */
    var d = depth();
    var tilt = clamp(vel * 0.12, -d.tiltCap, d.tiltCap);
    var y = window.scrollY || 0;
    for (var i = 0; i < chapters.length; i++) updateChapter(chapters[i], y, d, tilt);
    setTimeout(function () { healing = false; }, 150);
  }

  if (RM) return; /* tunnel never runs under reduced motion */

  /* ---- depth + tilt ---- */
  /* 2026-11-10 ghost-stretch fix قدم ۱: exit Z ‏۰ (بود +۸۵) — فصلِ در حال
   * خروج دیگر روی فصل بعد باد نمی‌کند؛ tiltCap ‏۰ هر دو ویوپورت (بود
   * موبایل ۱°، دسکتاپ ۸°) — rotateX با لنگر بالا روی فصل‌های هزاران‌پیکسلی
   * محتوا را ده‌ها پیکسل با سرعت انگشت جابه‌جا می‌کرد و همان «کشش» بود.
   * Enter ‏−۳۲۰ دست نخورده. */
  function depth() {
    return {
      enter: -320,
      exit: 0,
      tiltCap: 0
    };
  }

  /* localT is used ONLY for the far-clear decision. Z/alpha come from
   * stateFor() so the short-chapter midpoint collapse stays continuous. */
  function localT(y, ch) {
    if (y <= ch.s1) return (y - ch.s0) / (ch.s1 - ch.s0) * 0.25;
    if (y <= ch.s2) return 0.25 + (y - ch.s1) / Math.max(ch.s2 - ch.s1, 1) * 0.53;
    if (y <= ch.s3) return 0.78 + (y - ch.s2) / Math.max(ch.s3 - ch.s2, 1) * 0.22;
    return 1 + (y - ch.s3) / Math.max(ch.s3 - ch.s2, 1) * 0.22;
  }
  /* 2026-11-10 قدم ۱: خروج دیگر Z و lift ندارد — فقط محو شدن
   * (alpha ‏1−t²) در ۰٫۱۲vh؛ «خروج عادی» همان اسکرول عادی است. ورود
   * دست نخورده (alpha ‏t²). */
  function stateFor(y, ch, d) {
    if (y <= ch.s0) return { z: d.enter, alpha: 0, y: 0 };
    if (y <= ch.s1) {
      var t = (y - ch.s0) / (ch.s1 - ch.s0);
      return { z: d.enter * (1 - t), alpha: t * t, y: 0 };
    }
    if (y <= ch.s2) return { z: 0, alpha: 1, y: 0 };
    if (y <= ch.s3) {
      var t2 = (y - ch.s2) / (ch.s3 - ch.s2);
      return { z: 0, alpha: 1 - t2 * t2, y: 0 };
    }
    return { z: 0, alpha: 0, y: 0 };
  }

  function updateChapter(ch, y, d, tilt) {
    if (!ch.active) { clearChapter(ch); return; }
    var lt = localT(y, ch);
    /* Far above/below the viewport: cleared (off-screen, so invisible
     * either way) — and its rects stay true for any measurement. */
    if (lt < -0.15 || lt > 1.15) { clearChapter(ch); return; }
    var st = stateFor(y, ch, d);
    var inert = st.alpha <= 0.02;
    /* Rest state: clear inline styles — chapter is pixel-identical to P1. */
    if (Math.abs(st.z) < 0.5 && Math.abs(st.y) < 0.5 && Math.abs(tilt) < 0.05 && st.alpha >= 0.999) {
      clearChapter(ch);
      return;
    }
    var z = Math.round(st.z * 10) / 10;
    var yy = Math.round(st.y * 10) / 10;
    var a = Math.round(st.alpha * 1000) / 1000;
    var t = Math.round(tilt * 100) / 100;
    var s = ch.state;
    if (!s.cleared && s.z === z && s.yy === yy && s.a === a && s.t === t && s.inert === inert) return;
    ch.el.style.transform =
      'perspective(1000px) translate3d(0, ' + yy + 'px, ' + z + 'px) rotateX(' + t + 'deg)';
    ch.el.style.opacity = String(a);
    ch.el.inert = inert;
    ch.state = { cleared: false, z: z, yy: yy, a: a, t: t, inert: inert };
  }

  /* ---- main loop: pure function of scrollY + smoothed velocity ---- */
  var lastY = window.scrollY || 0, vel = 0;
  function tick(now) {
    requestAnimationFrame(tick);
    var y = window.scrollY || 0;
    var dy = y - lastY;
    lastY = y;
    vel = vel * 0.8 + clamp(dy, -60, 60) * 0.2; /* lion.js pattern */
    if (now < suspendedUntil) return;
    var d = depth();
    var tilt = clamp(vel * 0.12, -d.tiltCap, d.tiltCap);
    for (var i = 0; i < chapters.length; i++) updateChapter(chapters[i], y, d, tilt);
  }

  /* ---- triggers (mirror P1's measurement triggers) ----
     2026-11-10 (آشتی با گیت عرض): تغییر واقعی عرض (چرخش، تقسیم صفحه)
     measure()+heal() می‌خواهد؛ تغییر فقط-ارتفاع (نوار ابزار موبایل
     وسط اسکرول) فقط measure با debounce ‏۱۲۰ms — نه نادیده (کهنه
     می‌شود)، نه heal هم‌زمان (می‌پرد). */
  var lastP2Width = window.innerWidth;
  var p2ResizeTimer = 0;
  window.addEventListener('resize', function () {
    if (window.innerWidth !== lastP2Width) {
      lastP2Width = window.innerWidth;
      measure(); heal();
      return;
    }
    clearTimeout(p2ResizeTimer);
    p2ResizeTimer = setTimeout(measure, 120);
  });
  document.addEventListener('h2:grids', function () {
    /* 2026-11-10 قدم ۲: فقط measure — اندازه‌گیری با زنجیره‌ی offsetTop
       مصون از ترنسفورم است، پس heal لازم نیست. (heal فقط برای resize با
       تغییر عرض می‌ماند.) */
    measure();
  });
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-lang]') : null;
    if (!t) return;
    measure();
    suspend(800); /* covers P1's +400ms language re-measure */
    setTimeout(measure, 450);
  });
  document.addEventListener('DOMContentLoaded', measure);
  window.addEventListener('load', measure);
  setTimeout(measure, 800);
  setTimeout(measure, 2000);

  measure();
  requestAnimationFrame(tick);

  /* ---- verification handle ---- */
  window.__p2Tunnel = {
    chapters: chapters,
    measure: measure,
    suspend: suspend,
    heal: heal,
    state: function () {
      return chapters.map(function (ch) {
        var cs = ch.el ? getComputedStyle(ch.el) : null;
        return {
          sel: ch.sel, active: ch.active, top: ch.top,
          s0: ch.s0, s1: ch.s1, s2: ch.s2, s3: ch.s3,
          transform: cs ? cs.transform : null,
          opacity: cs ? cs.opacity : null,
          inert: ch.el ? !!ch.el.inert : null,
          cleared: ch.state.cleared
        };
      });
    }
  };
})();
