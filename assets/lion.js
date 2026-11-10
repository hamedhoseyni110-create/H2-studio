/* Lion phase layer (step 5) — hero shrink-to-aura, progress, tilt titles,
   aura strip, depth-clip return section.
   Runs last (after cards.js). app.js and copy-data.js are untouched.
   Single rAF loop, time-based lerp (0.09 @60fps) — one motion system for the whole page. */
(function () {
  'use strict';
  var hero = document.getElementById('top');
  var reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- hero: only when the hero section exists. The two-act page replaces
     the hero with the Master Film, so this block is skipped there while the
     return / KAGE / filmstrip / scroll code below still runs. ---- */
  function syncVelText() {
    var ht = document.getElementById('heroTitle');
    if (!ht || !velInner) return;
    var t = ht.textContent || '';
    if (!t) return;
    var rep = t + ' ✦ ' + t + ' ✦ ' + t;
    if (velInner.textContent !== rep) velInner.textContent = rep;
  }
  if (hero) {
    /* ---- hero: wrap in a tall sticky range, group media for the shrink ---- */
    var wrap = document.createElement('div');
    wrap.className = 'lion-hero-wrap';
    hero.parentNode.insertBefore(wrap, hero);
    wrap.appendChild(hero);
    hero.classList.add('lion-sticky');
  
    var media = document.createElement('div');
    media.className = 'lion-hero-media';
    hero.insertBefore(media, hero.firstChild);
    var video = document.getElementById('heroVideo');
    var shade = hero.querySelector('.hero-shade');
    var tint = hero.querySelector('.up-hero-tint');
    var fx = document.getElementById('heroFx');
    if (video) media.appendChild(video);
    if (shade) media.appendChild(shade);
    if (tint) media.appendChild(tint);
    if (fx) media.appendChild(fx);
    var inner = hero.querySelector('.hero-inner');
  
    /* ---- hero atmosphere glow (approved demo v2, stronger): appended INSIDE
       .lion-hero-media so it sits above the video/shade/tint/particles AND
       inherits the media scroll fade (apply() drives media opacity every
       tick) — it can never linger as an orphan blob after the video fades.
       Media is created once at parse time and never re-rendered by app.js
       (language switches only change text), so this one-time append is
       permanent across languages. Stacking: media (z 0) < mid echo (z 2) <
       hero-inner (z 3), so the wash tints the video but never covers text. */
    var heroGlow = document.createElement('div');
    heroGlow.className = 'lion-hero-glow';
    heroGlow.setAttribute('aria-hidden', 'true');
    media.appendChild(heroGlow);
  
    /* ---- mid-runway echo (2026-11-02, option A): the hero title re-appears
       lower in the scroll runway so no viewport of the runway is empty.
       Text is copied live from #heroTitle, so it follows the active language
       with no new copy keys. CSS default opacity is 0; apply() drives it. */
    var mid = document.createElement('div');
    mid.className = 'lion-hero-mid';
    mid.setAttribute('aria-hidden', 'true');
    hero.appendChild(mid);
  
    /* ---- aurora: 4th blob (violet) ---- */
    var aurora = document.querySelector('.aurora');
    if (aurora && !aurora.querySelector('.b4')) {
      var b4 = document.createElement('span');
      b4.className = 'blob b4';
      aurora.appendChild(b4);
    }
  
    /* ---- aura strip (visual band, no text) after the hero ---- */
    var strip = document.createElement('section');
    strip.className = 'lion-aura-strip';
    strip.setAttribute('aria-hidden', 'true');
    strip.innerHTML = '<div class="lion-aura-bg"></div><div class="lion-aura-veil"></div>';
    wrap.parentNode.insertBefore(strip, wrap.nextSibling);
  
    /* ---- velocity strip (Argon #1, 2026-11-03): thin band in normal flow
       right AFTER the aura strip, so it never touches the hero's 260vh sticky
       geometry (it sits below the wrap). Content is the hero title repeated,
       live-copied like the mid echo — approved copy only, no invented
       slogans. Skew/tint are driven by apply() from scroll velocity; the CSS
       default is static, so reduced-motion (where apply() never runs) stays
       neutral with no JS needed. */
    var velStrip = document.createElement('section');
    velStrip.className = 'lion-vel-strip';
    velStrip.setAttribute('aria-hidden', 'true');
    velStrip.innerHTML = '<div class="lion-vel-glow lion-vel-glow-down"></div>' +
      '<div class="lion-vel-glow lion-vel-glow-up"></div>' +
      '<div class="lion-vel-inner"></div>';
    strip.parentNode.insertBefore(velStrip, strip.nextSibling);
    var velInner = velStrip.querySelector('.lion-vel-inner');
    var velGlowDown = velStrip.querySelector('.lion-vel-glow-down');
    var velGlowUp = velStrip.querySelector('.lion-vel-glow-up');
    document.addEventListener('DOMContentLoaded', syncVelText);
  }

  /* nav-spy hookup: lion.js runs at parse time, app.js creates H2NavSpy
     on DOMContentLoaded, so observe now if present, else after DOM ready. */
  function spyObserve(elm) {
    if (window.H2NavSpy) { window.H2NavSpy.observe(elm); return; }
    document.addEventListener('DOMContentLoaded', function () {
      if (window.H2NavSpy) window.H2NavSpy.observe(elm);
    });
  }
  /* ---- return section: depth clip, plays on scroll entry ---- */
  var swap = document.getElementById('services-swap');
  var ret = document.createElement('section');
  ret.className = 'lion-return';
  ret.id = 'lionReturn';
  ret.setAttribute('aria-hidden', 'true');
  if (reduced) {
    ret.innerHTML = '<img src="assets/lion-v1.webp" alt="">';
  } else {
    ret.innerHTML = '<video id="lionReturnVideo" muted playsinline preload="metadata" ' +
      'poster="assets/distant-lion-v1.webp">' +
      '<source src="assets/lion-depth-v1.mp4" type="video/mp4"></video>';
  }
  if (swap && swap.parentNode) swap.parentNode.insertBefore(ret, swap.nextSibling);
  spyObserve(ret);

  /* ---- why-us panels: Kage chapters (approved 2026-11-03) ----
     Port of the approved image-backed demo (kage-night-valley-demo.html):
     scroll-driven sticky chapters over the valley backdrop, per-chapter
     accent tint shift. Section keeps id 'lionPanels', stays after
     #portfolio, and renders from COPY (trilingual) like everything else.
     The demo's intro/outro are NOT injected: the live header (title +
     sub) sits above the sticky stage and the page flows into #videos
     below with no gap. Progress bar moved to the stage bottom so it
     never clashes with the fixed nav; .kg-top dropped (demo chrome). */
  var portfolioSec = document.getElementById('portfolio');
  var panelsSec = document.createElement('section');
  panelsSec.className = 'lion-panels';
  panelsSec.id = 'lionPanels';
  var kgAccents = ['#34d399', '#22d3ee', '#ec4899', '#fb923c'];
  var kgNums = {
    fa: ['۰۱', '۰۲', '۰۳', '۰۴'],
    en: ['01', '02', '03', '04'],
    ar: ['٠١', '٠٢', '٠٣', '٠٤']
  };
  function kgEye(lang, i) {
    var n = (kgNums[lang] || kgNums.fa)[i];
    if (lang === 'en') return 'Chapter ' + n + ' of 04';
    if (lang === 'ar') return 'الفصل ' + n + ' من ٠٤';
    return 'فصل ' + n + ' از ۰۴';
  }
  var panelsHTML = '<h2 class="section-title lion-panels-title"></h2><p class="lion-panels-sub"></p>' +
    '<div id="kgChapters"><div class="kg-sticky">' +
    '<img class="kg-bg" src="assets/kage-night-valley-1280.webp" alt="">' +
    '<div class="kg-scrim"></div>' +
    '<div class="kg-tint" style="background:radial-gradient(ellipse at 75% 15%, rgba(52,211,153,.28) 0%, rgba(52,211,153,.10) 45%, transparent 70%)"></div>' +
    '<div class="kg-tint" style="background:radial-gradient(ellipse at 75% 15%, rgba(34,211,238,.28) 0%, rgba(34,211,238,.10) 45%, transparent 70%)"></div>' +
    '<div class="kg-tint" style="background:radial-gradient(ellipse at 75% 15%, rgba(236,72,153,.28) 0%, rgba(236,72,153,.10) 45%, transparent 70%)"></div>' +
    '<div class="kg-tint" style="background:radial-gradient(ellipse at 75% 15%, rgba(251,146,60,.28) 0%, rgba(251,146,60,.10) 45%, transparent 70%)"></div>' +
    '<div class="kg-progress"></div>';
  for (var ci = 0; ci < 4; ci++) {
    panelsHTML += '<div class="kg-num" data-ch="' + ci + '" style="--acc:' + kgAccents[ci] + '"></div>';
  }
  for (var gi = 0; gi < 4; gi++) {
    panelsHTML += '<div class="kg-giant" data-ch="' + gi + '"></div>';
  }
  for (var ki = 0; ki < 4; ki++) {
    panelsHTML += '<div class="kg-card" data-ch="' + ki + '" style="--acc:' + kgAccents[ki] + '">' +
      '<div class="kg-eyebrow"></div><div class="kg-heading"></div><div class="kg-desc"></div></div>';
  }
  panelsHTML += '<div class="kg-rail">' +
    '<button type="button" data-i="0"></button><button type="button" data-i="1"></button>' +
    '<button type="button" data-i="2"></button><button type="button" data-i="3"></button>' +
    '</div></div></div>';
  panelsSec.innerHTML = panelsHTML;
  if (portfolioSec && portfolioSec.parentNode) portfolioSec.parentNode.insertBefore(panelsSec, portfolioSec.nextSibling);
  spyObserve(panelsSec);
  function renderPanels() {
    var lang = document.documentElement.lang || 'fa';
    var data = (typeof COPY !== 'undefined' && COPY[lang] && COPY[lang].panels) ||
               (typeof COPY !== 'undefined' && COPY.fa && COPY.fa.panels);
    if (!data) return;
    var title = panelsSec.querySelector('.lion-panels-title');
    var sub = panelsSec.querySelector('.lion-panels-sub');
    if (title) title.textContent = data.heading;
    if (sub) sub.textContent = data.sub;
    var nums = panelsSec.querySelectorAll('.kg-num');
    var giants = panelsSec.querySelectorAll('.kg-giant');
    var cards = panelsSec.querySelectorAll('.kg-card');
    var railBtns = panelsSec.querySelectorAll('.kg-rail button');
    var ns = kgNums[lang] || kgNums.fa;
    data.items.forEach(function (it, i) {
      if (nums[i]) nums[i].textContent = ns[i];
      if (giants[i]) giants[i].textContent = it.giant;
      if (cards[i]) {
        var eb = cards[i].querySelector('.kg-eyebrow');
        var hd = cards[i].querySelector('.kg-heading');
        var ds = cards[i].querySelector('.kg-desc');
        if (eb) eb.textContent = kgEye(lang, i);
        if (hd) hd.textContent = it.giant;
        if (ds) ds.textContent = it.desc;
      }
      if (railBtns[i]) railBtns[i].textContent = ns[i];
    });
  }
  renderPanels();
  if ('MutationObserver' in window) {
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        if (m.attributeName !== 'lang') return;
        renderPanels();
        kgMeasure(); kgKick();
        /* Mid echo follows the language at once, even with no scroll
           (apply() only runs on scroll ticks). Observer callbacks run
           after setLang's synchronous render, so the title is already new. */
        var ht = document.getElementById('heroTitle');
        if (ht && mid) mid.textContent = ht.textContent;
        syncVelText();
      });
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }
  /* ---- Kage scroll driver (ported from the approved demo) ----
     Geometry is measured from the wrapper's own offsetTop chain
     (2026-11-10: rect under a P2 transform was wrong), and
     re-measured whenever layout above it can change (grids render,
     load, resize, language switch) — this is the fix for the Argon
     demo's mapping/geometry mismatch that left black voids mid-scroll.
     The backdrop never fades, so every scroll position shows scene. */
  var kgWrap = document.getElementById('kgChapters');
  var kgBg = panelsSec.querySelector('.kg-bg');
  var kgProgress = panelsSec.querySelector('.kg-progress');
  var kgNumEls = Array.prototype.slice.call(panelsSec.querySelectorAll('.kg-num'));
  var kgGiantEls = Array.prototype.slice.call(panelsSec.querySelectorAll('.kg-giant'));
  var kgCardEls = Array.prototype.slice.call(panelsSec.querySelectorAll('.kg-card'));
  var kgTintEls = Array.prototype.slice.call(panelsSec.querySelectorAll('.kg-tint'));
  var kgRailBtns = Array.prototype.slice.call(panelsSec.querySelectorAll('.kg-rail button'));
  var kgTop = 0, kgSpan = 1, kgRaf = false, kgLast = -1;
  function kgClamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function kgRamp(t, a, b) { return kgClamp((t - a) / (b - a), 0, 1); }
  function kgMeasure() {
    if (!kgWrap) return;
    /* 2026-11-10 قدم ۲ (5a): زنجیره‌ی offsetTop جای getBoundingClientRect —
       اگر P2 همان لحظه روی فصل ترنسفورم داشته باشد، kgTop غلط می‌شد. */
    var kn = kgWrap, kt = 0;
    while (kn) { kt += kn.offsetTop || 0; kn = kn.offsetParent; }
    kgTop = kt;
    kgSpan = Math.max(1, kgWrap.offsetHeight - window.innerHeight);
    /* Number top follows the measured fixed-nav height (nav wraps to two
       rows at narrower desktop widths, e.g. 149px at 1024px) so the giant
       number never slides under the nav. CSS top is only the fallback. */
    var navEl = document.getElementById('nav');
    var navH = navEl ? navEl.offsetHeight : 0;
    if (navH > 0) {
      kgNumEls.forEach(function (n) { n.style.top = (navH + 16) + 'px'; });
    }
  }
  function kgPaint() {
    var y = window.scrollY;
    var p = kgClamp((y - kgTop) / kgSpan, 0, 1);
    var idx = Math.min(3, Math.floor(p * 4));
    if (kgProgress) {
      kgProgress.style.width = (p * 100) + '%';
      kgProgress.style.background = kgAccents[idx];
    }
    if (idx !== kgLast) {
      kgLast = idx;
      kgRailBtns.forEach(function (b, j) { b.classList.toggle('on', j === idx); });
      kgTintEls.forEach(function (t, j) { t.style.opacity = (j === idx) ? '1' : '0'; });
    }
    var isMobile = window.innerWidth <= 700;
    if (reduced) {
      if (kgBg) kgBg.style.transform = '';
      for (var ri = 0; ri < 4; ri++) {
        var on = (ri === idx) ? '1' : '0';
        kgNumEls[ri].style.opacity = on;
        kgNumEls[ri].style.transform = '';
        kgGiantEls[ri].style.opacity = on;
        kgGiantEls[ri].style.transform = 'translateX(-50%)';
        kgCardEls[ri].style.opacity = on;
        kgCardEls[ri].style.transform = isMobile ? 'translateX(50%)' : 'translateY(-50%)';
      }
    } else {
      if (kgBg) kgBg.style.transform = 'translateY(' + (-p * 6) + '%) scale(1.02)';
      for (var i = 0; i < 4; i++) {
        var t = (p - i / 4) * 4;
        /* 2026-11-10 دور دوم (قدم ۳): سواپ ترتیبیِ فشرده — فید-اوت t
           ۰٫۹۵→۰٫۹۷، فید-این فصل بعد t ‏۰٫۹۵→۰٫۹۷ (t ورودی = t خروجی − ۱)؛
           در هر لحظه مجموع دو فصل = ۱ (کراس‌فید ~۱۲px)، نه ناحیه‌ی خالی
           ۴۲px دور اول و نه دوبل (هر دو > ۰٫۵ هرگز). */
        var inR  = (i === 0) ? 1 : kgRamp(t, -0.05, -0.03);
        var outR = (i === 3) ? 0 : kgRamp(t, 0.95, 0.97);
        var op = inR * (1 - outR);
        var tyCard  = (1 - inR) * 24 + outR * (-16);
        var tyNum   = (1 - inR) * 16 + outR * (-12);
        var scNum   = 1 + (1 - inR) * 0.08;
        var tyGiant = (1 - inR) * 16 + outR * (-12);
        var baseCard = isMobile ? 'translateX(50%)' : 'translateY(-50%)';
        kgCardEls[i].style.opacity = op.toFixed(3);
        kgCardEls[i].style.transform = baseCard + ' translateY(' + tyCard.toFixed(1) + 'px)';
        kgNumEls[i].style.opacity = op.toFixed(3);
        kgNumEls[i].style.transform = 'translateY(' + tyNum.toFixed(1) + 'px) scale(' + scNum.toFixed(3) + ')';
        kgGiantEls[i].style.opacity = op.toFixed(3);
        kgGiantEls[i].style.transform = 'translateX(-50%) translateY(' + tyGiant.toFixed(1) + 'px)';
      }
    }
    kgRaf = false;
  }
  function kgKick() {
    if (!kgRaf) { kgRaf = true; requestAnimationFrame(kgPaint); }
  }
  window.addEventListener('scroll', kgKick, { passive: true });
  window.addEventListener('resize', function () { kgMeasure(); kgKick(); });
  document.addEventListener('DOMContentLoaded', function () { kgMeasure(); kgKick(); });
  window.addEventListener('load', function () { kgMeasure(); kgKick(); });
  window.addEventListener('h2:grids', function () { kgMeasure(); kgKick(); });
  kgRailBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var i = parseInt(b.getAttribute('data-i'), 10);
      window.scrollTo({ top: kgTop + ((i + 0.5) / 4) * kgSpan, behavior: 'smooth' });
    });
  });
  kgMeasure(); kgPaint();

  /* ---- videos filmstrip (scroll-driven 3D strip) ----
     Geometry from the runway's OWN rect (Kage lesson — never assumed
     heights): fsTop from the offsetTop chain (2026-11-10: rect under a
     P2 transform was wrong), fsSpan from
     offsetHeight - innerHeight. Track offset from MEASURED stage width,
     frame width and gap, so the first frame centers at p=0 and the last
     at p=1. Posters stay at full opacity through the whole range; the
     strip is scroll-scrubbed (no transition), never autoplay.
     app.js owns the DOM (re-render on language switch rebuilds stage +
     track + frames), so frames are re-collected on every measure and on
     h2:grids. Mobile + reduced-motion collapse to a static list via CSS;
     the driver resets transforms there so no desktop paint can linger. */
  var fsGrid = document.getElementById('videosGrid');
  var fsStage = null, fsTrack = null, fsFrames = [];
  var fsTop = 0, fsSpan = 1, fsW = 0, fsF = 0, fsGap = 0, fsN = 0, fsRaf = false;
  function fsClamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function fsCollect() {
    if (!fsGrid) return;
    fsStage = fsGrid.querySelector('.fs-stage');
    fsTrack = fsGrid.querySelector('.fs-track');
    fsFrames = fsTrack ? Array.prototype.slice.call(fsTrack.querySelectorAll('.fs-frame')) : [];
  }
  function fsMeasure() {
    fsCollect();
    if (!fsGrid || !fsStage || !fsTrack || !fsFrames.length) return;
    /* 2026-11-10 قدم ۲ (5a): زنجیره‌ی offsetTop جای getBoundingClientRect. */
    var fn = fsGrid, ft = 0;
    while (fn) { ft += fn.offsetTop || 0; fn = fn.offsetParent; }
    fsTop = ft;
    fsSpan = Math.max(1, fsGrid.offsetHeight - window.innerHeight);
    fsW = fsStage.clientWidth;
    fsF = fsFrames[0].offsetWidth;
    fsN = fsFrames.length;
    var g = 0;
    try { g = parseFloat(window.getComputedStyle(fsTrack).gap) || 0; } catch (e) {}
    fsGap = g;
  }
  function fsPaint() {
    fsRaf = false;
    if (!fsTrack || !fsFrames.length) return;
    var isMobile = window.innerWidth <= 700;
    if (reduced || isMobile) {
      fsTrack.style.transform = '';
      fsFrames.forEach(function (f) { f.style.transform = ''; });
      return;
    }
    var y = window.scrollY;
    var p = fsClamp((y - fsTop) / fsSpan, 0, 1);
    var travel = Math.max(0, (fsN - 1) * (fsF + fsGap));
    var x0 = (fsW - fsF) / 2;
    var x = x0 - p * travel;
    fsTrack.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
    var c = fsW / 2;
    for (var i = 0; i < fsN; i++) {
      var cx = x + i * (fsF + fsGap) + fsF / 2;
      var d = fsClamp((cx - c) / (c || 1), -1, 1);
      /* Rail convention: right of center -> -22deg, left -> +22deg.
         Depth system: translateZ 60px (top) at center, 0 at the edges. */
      var rot = -d * 22;
      var tz = (1 - Math.abs(d)) * 60;
      fsFrames[i].style.transform = 'translateZ(' + tz.toFixed(1) + 'px) rotateY(' + rot.toFixed(2) + 'deg)';
    }
  }
  function fsKick() { if (!fsRaf) { fsRaf = true; requestAnimationFrame(fsPaint); } }
  window.addEventListener('scroll', fsKick, { passive: true });
  window.addEventListener('resize', function () { fsMeasure(); fsKick(); });
  document.addEventListener('DOMContentLoaded', function () { fsMeasure(); fsKick(); });
  window.addEventListener('load', function () { fsMeasure(); fsKick(); });
  window.addEventListener('h2:grids', function () { fsMeasure(); fsKick(); });
  fsMeasure(); fsPaint();

  /* 2026-11-10 قدم ۲: ResizeObserver با debounce ‏۱۲۰ms — جابه‌جایی لی‌اوت
     (پر شدن سکشن‌ها) خودش اندازه‌گیری KAGE و فیلم‌استریپ را تازه می‌کند. */
  if ('ResizeObserver' in window) {
    var lionROTimer = 0;
    var lionRO = new ResizeObserver(function () {
      clearTimeout(lionROTimer);
      lionROTimer = setTimeout(function () { kgMeasure(); fsMeasure(); kgKick(); fsKick(); }, 120);
    });
    lionRO.observe(document.documentElement);
  }

  /* ---- templates-style portfolio cards (approved 2026-10-31) ----
     Frame restyle is CSS (.lion-tcard); here only: small WebP posters
     (poster-first, like the reference) + a watch pill for cards without
     a live link. Re-runs on every grid re-render (h2:grids). */
  function transformPortfolioCards() {
    var grid = document.getElementById('portfolioGrid');
    if (!grid) return;
    grid.querySelectorAll('.portfolio-card').forEach(function (card) {
      if (!card.classList.contains('lion-tcard')) card.classList.add('lion-tcard');
      var v = card.querySelector('.portfolio-media video[data-src]');
      if (v && !v.getAttribute('poster')) {
        var src = v.getAttribute('data-src') || '';
        if (/^assets\/previews\/[^/]+\.mp4$/.test(src)) {
          v.setAttribute('poster', src.replace(/\.mp4$/, '-480.webp'));
        }
      }
      var cap = card.querySelector('.portfolio-cap');
      if (cap && !cap.querySelector('.live-link') && !cap.querySelector('.lion-watch-pill')) {
        var pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'lion-watch-pill';
        var lang = document.documentElement.lang || 'fa';
        pill.textContent = lang === 'en' ? 'Watch ↓' : lang === 'ar' ? 'مشاهدة ↓' : 'تماشا ↓';
        pill.addEventListener('click', function () {
          var media = card.querySelector('.portfolio-media');
          if (media) media.click();
        });
        cap.appendChild(pill);
      }
    });
  }
  transformPortfolioCards();
  window.addEventListener('h2:grids', transformPortfolioCards);

  /* ---- process line (approved 2026-10-31) ----
     Injected once (absolute, so it never becomes a grid item); its height
     is measured from the first step number so it tracks real layout. */
  var procSteps = document.getElementById('processSteps');
  var procLine = null;
  function measureProcLine() {
    if (!procLine || !procSteps) return;
    var num = procSteps.querySelector('li .step-num');
    if (num) procLine.style.top = (num.offsetTop + num.offsetHeight / 2 - 1) + 'px';
  }
  if (procSteps) {
    procLine = document.createElement('div');
    procLine.className = 'lion-process-line';
    procSteps.appendChild(procLine);
    measureProcLine();
  }

  /* ---- manifesto section (approved 2026-10-31; home: right before About) ----
     Lines come from COPY (trilingual); *...* marks the accent word. */
  var aboutSec = document.getElementById('about');
  var maniSec = document.createElement('section');
  maniSec.className = 'lion-manifesto';
  maniSec.id = 'lionManifesto';
  maniSec.innerHTML = '<div class="lion-manifesto-aura"></div><div class="lion-manifesto-lines">' +
    '<p class="lion-manifesto-line"></p><p class="lion-manifesto-line"></p><p class="lion-manifesto-line"></p></div>';
  if (aboutSec && aboutSec.parentNode) aboutSec.parentNode.insertBefore(maniSec, aboutSec);
  function maniEsc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function renderManifesto() {
    var lang = document.documentElement.lang || 'fa';
    var data = (typeof COPY !== 'undefined' && COPY[lang] && COPY[lang].manifesto) ||
               (typeof COPY !== 'undefined' && COPY.fa && COPY.fa.manifesto);
    if (!data) return;
    var lines = maniSec.querySelectorAll('.lion-manifesto-line');
    data.lines.forEach(function (txt, i) {
      if (!lines[i]) return;
      var parts = txt.split('*');
      var html = '';
      parts.forEach(function (seg, j) {
        if (j % 2 === 1) html += '<span class="lion-manifesto-accent">' + maniEsc(seg) + '</span>';
        else html += maniEsc(seg);
      });
      lines[i].innerHTML = html;
    });
  }
  renderManifesto();
  if ('MutationObserver' in window) {
    new MutationObserver(function (muts) {
      muts.forEach(function (m) { if (m.attributeName === 'lang') renderManifesto(); });
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }

  /* ---- stats ticker targets (approved 2026-10-31) ----
     NOTE (2026-10-31 QC): the numbers are NOT written here. upgrades.js
     already owns the Number Ticker count-up for .stat-value (approved
     2026-10-26); writing the same text from two tickers races and once
     showed 7/8/1 mid-count. This block owns rise+fade only; the numbers
     count up via the existing ticker. */

  /* ---- pricing two-card shape (approved 2026-10-31) ----
     Wraps the factors + CTA into two cards. Nodes persist across lang
     re-renders (only innerHTML/textContent change), so one wrap survives;
     a guarded observer re-wraps if the section is ever rebuilt. */
  var pricingHeads = { fa: 'شروع همکاری', en: 'Start working together', ar: 'ابدأ التعاون' };
  function wrapPricing() {
    var sec = document.getElementById('pricing');
    if (!sec || sec.querySelector('.lion-pricing-two')) return;
    var ft = document.getElementById('pricingFactorsTitle');
    var fl = document.getElementById('pricingFactors');
    var cta = sec.querySelector('.pricing-cta');
    if (!ft || !fl || !cta) return;
    var two = document.createElement('div');
    two.className = 'lion-pricing-two';
    var cardA = document.createElement('div');
    cardA.className = 'lion-pricing-card lion-pricing-factors';
    var cardB = document.createElement('div');
    cardB.className = 'lion-pricing-card lion-pricing-start';
    var h = document.createElement('h3');
    h.className = 'lion-pricing-start-title';
    h.textContent = pricingHeads[document.documentElement.lang] || pricingHeads.fa;
    cardA.appendChild(ft);
    cardA.appendChild(fl);
    cardB.appendChild(h);
    cardB.appendChild(cta);
    two.appendChild(cardA);
    two.appendChild(cardB);
    sec.appendChild(two);
  }
  wrapPricing();
  if ('MutationObserver' in window) {
    (function () {
      var sec = document.getElementById('pricing');
      if (sec) new MutationObserver(wrapPricing).observe(sec, { childList: true });
    })();
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        if (m.attributeName === 'lang') {
          var t = document.querySelector('.lion-pricing-start-title');
          if (t) t.textContent = pricingHeads[document.documentElement.lang] || pricingHeads.fa;
        }
      });
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }

  /* ---- final CTA band (approved 2026-10-31; last in <main>) ----
     Lines come from COPY (trilingual); *...* marks the accent word. */
  var mainEl = document.querySelector('main');
  var finalSec = document.createElement('section');
  finalSec.className = 'lion-final-cta';
  finalSec.id = 'lionFinalCta';
  finalSec.innerHTML = '<h2 class="lion-final-title"></h2><p class="lion-final-sub"></p>' +
    '<a class="btn btn-primary btn-lg lion-final-btn" href="https://wa.me/989375732165" target="_blank" rel="noopener"></a>';
  if (mainEl) mainEl.appendChild(finalSec);
  /* ---- final curtain (Argon #1, 2026-11-03): the EXISTING #lionFinalCta
     becomes the curtain — no new section, no duplicate CTA, no copy change
     (renderFinalCta still owns the exact finalCta copy). The wrapper is
     200svh with the section sticky top:0, so the curtain rises to cover the
     viewport and holds for 100vh of scroll, then releases and the footer
     follows. Reduced-motion CSS collapses the wrapper (height auto, section
     static) so the curtain is a plain full section there. The sticky-CTA
     observer in playful.js watches the element itself, so the wrapper does
     not affect it. */
  if (mainEl && finalSec.parentNode === mainEl) {
    finalSec.classList.add('lion-curtain');
    var curtainWrap = document.createElement('div');
    curtainWrap.className = 'lion-curtain-wrap';
    mainEl.insertBefore(curtainWrap, finalSec);
    curtainWrap.appendChild(finalSec);
  }
  function renderFinalCta() {
    var lang = document.documentElement.lang || 'fa';
    var data = (typeof COPY !== 'undefined' && COPY[lang] && COPY[lang].finalCta) ||
               (typeof COPY !== 'undefined' && COPY.fa && COPY.fa.finalCta);
    if (!data) return;
    var t = finalSec.querySelector('.lion-final-title');
    if (t) {
      var parts = data.title.split('*');
      var html = '';
      parts.forEach(function (seg, j) {
        if (j % 2 === 1) html += '<span class="lion-final-accent">' + maniEsc(seg) + '</span>';
        else html += maniEsc(seg);
      });
      t.innerHTML = html;
    }
    var s = finalSec.querySelector('.lion-final-sub');
    if (s) s.textContent = data.sub;
    var b = finalSec.querySelector('.lion-final-btn');
    if (b) b.textContent = data.btn;
  }
  renderFinalCta();
  if ('MutationObserver' in window) {
    new MutationObserver(function (muts) {
      muts.forEach(function (m) { if (m.attributeName === 'lang') renderFinalCta(); });
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }

  /* ---- progress bar ---- */
  var prog = document.createElement('div');
  prog.id = 'lionProgress';
  document.body.appendChild(prog);

  /* ---- return video: play on view, pause off view ---- */
  var retVideo = document.getElementById('lionReturnVideo');
  if (retVideo && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          retVideo.play().catch(function () {});
        } else {
          retVideo.pause();
        }
      });
    }, { threshold: 0.5 }).observe(retVideo);
  }

  /* ---- scroll motion (skipped under reduced motion) ---- */
  if (reduced) return;
  var titles = Array.prototype.slice.call(document.querySelectorAll('.section-title'));
  /* velocity strip state: velS is the smoothed velocity (px per 60fps
     frame), derived from the smoothed scroll value itself, so it decays
     naturally as the lerp settles — no second loop, no jitter. */
  var velPrev = 0, velS = 0, velLastDt = 16.7;
  function velNeutral() {
    velS = 0;
    if (velInner) velInner.style.transform = '';
    if (velGlowDown) velGlowDown.style.opacity = '0';
    if (velGlowUp) velGlowUp.style.opacity = '0';
  }
  var target = 0, current = 0, vh = window.innerHeight;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function apply(y) {
    var doc = document.documentElement.scrollHeight - vh;
    prog.style.width = (doc > 0 ? (y / doc) * 100 : 0) + '%';
    /* hero runway (2026-11-02, option A): the media fades over 2.4 viewports
       instead of 1.2, so the lion lingers; the title leaves by 1.0 viewport;
       the mid-runway echo fades in 1.0 -> 1.4 and out 2.0 -> 2.4, so no
       viewport of the 2.6-viewport runway is ever empty. Fade-in-place
       (2026-10-31, Hamed's correction) is kept: no drift, no shrink. */
    var hp = clamp(y / (vh * 2.4), 0, 1);
    if (media) {
      media.style.transform = '';
      media.style.opacity = (1 - hp).toFixed(2);
    }
    if (inner) {
      inner.style.transform = 'translate3d(0,' + (-y * 0.12) + 'px,0)';
      inner.style.opacity = Math.max(0, 1 - hp * 2.4).toFixed(2);
    }
    if (mid) {
      /* Copy live every tick (not once per language): the first apply()
         tick can run before app.js fills #heroTitle, and a once-only copy
         would lock in that empty read forever. Compare-and-copy self-heals
         after render and on every language switch. */
      var ht = document.getElementById('heroTitle');
      if (ht && mid.textContent !== ht.textContent) mid.textContent = ht.textContent;
      var midIn = clamp((y - vh * 1.0) / (vh * 0.4), 0, 1);
      var midOut = clamp((vh * 2.4 - y) / (vh * 0.4), 0, 1);
      mid.style.opacity = Math.min(midIn, midOut).toFixed(2);
    }
    /* velocity strip — velocity from the smoothed scroll delta, normalized
       by frame time and exponentially smoothed (0.8/0.2) so direction
       changes never flicker. Down = positive skew + Narangi glow; up =
       negative skew + cyan glow; rest = neutral (velNeutral at settle).
       Mobile caps the skew so the line stays readable. */
    if (velInner) {
      syncVelText();
      var rawVel = (y - velPrev) * (16.7 / (velLastDt || 16.7));
      velPrev = y;
      velS = velS * 0.8 + rawVel * 0.2;
      if (velS > 60) velS = 60; else if (velS < -60) velS = -60;
      var skewCap = (window.innerWidth <= 700) ? 4 : 8;
      var sk = velS * 0.12;
      if (sk > skewCap) sk = skewCap; else if (sk < -skewCap) sk = -skewCap;
      var scX = 1 + Math.min(Math.abs(velS), 60) * 0.0015;
      velInner.style.transform = 'skewX(' + sk.toFixed(2) + 'deg) scaleX(' + scX.toFixed(3) + ')';
      var mag = Math.min(Math.abs(velS) / 60, 1) * 0.85;
      if (velGlowDown) velGlowDown.style.opacity = (velS > 0 ? mag : 0).toFixed(2);
      if (velGlowUp) velGlowUp.style.opacity = (velS < 0 ? mag : 0).toFixed(2);
    }
    /* tilt titles — skip titles still below the viewport so reveals keep working.
       Cinematic entrance (Argon #1): the tilt rotation still resolves on the
       raw progress p, but the rise + fade ride an easeOutCubic curve and the
       whole title settles from scale .94 — composed in the SAME inline
       transform string by the SAME owner (this block), so tilt and entrance
       can never fight. The reveal system is untouched: it still owns the
       pre-entry hidden state and the playful ::after underline via .in.
       Whole-title units only — no per-character/word splitting, so FA/AR
       joining and shaping are never touched. At p=1 the transform is
       identity, exactly as before, so tilt is intact after settle. */
    titles.forEach(function (el, i) {
      var r = el.getBoundingClientRect();
      if (r.top > vh) return;
      var p = clamp((vh - r.top) / (vh + r.height), 0, 1);
      var pe = 1 - Math.pow(1 - p, 3);
      var inv = 1 - p, invE = 1 - pe;
      var scT = (0.94 + 0.06 * pe).toFixed(3);
      if (i % 2 === 0) {
        el.style.transform = 'rotateX(' + (inv * 28) + 'deg) translateY(' + (invE * 60) + 'px) scale(' + scT + ')';
      } else {
        el.style.transform = 'rotateY(' + (inv * -30) + 'deg) translateY(' + (invE * 60) + 'px) scale(' + scT + ')';
      }
      el.style.opacity = (0.25 + 0.75 * pe).toFixed(2);
    });
    /* final curtain entrance — the curtain's own children rise + fade as the
       section enters; pinned (rect.top 0) or passed, pC = 1 and the inline
       styles CLEAR, so the button's :active press scale (stylesheet) works
       instead of being overridden by a leftover identity transform. CSS
       default is fully visible, so reduced-motion (no apply()) shows the
       plain full section. */
    if (finalSec) {
      var cr = finalSec.getBoundingClientRect();
      var pC = clamp((vh - cr.top) / vh, 0, 1);
      var curtainKids = finalSec.querySelectorAll('.lion-final-title, .lion-final-sub, .lion-final-btn');
      curtainKids.forEach(function (c) {
        if (pC >= 1) {
          c.style.transform = '';
          c.style.opacity = '';
        } else {
          c.style.transform = 'translateY(' + ((1 - pC) * 40).toFixed(1) + 'px)';
          c.style.opacity = (0.2 + 0.8 * pC).toFixed(2);
        }
      });
    }
    /* services pour — approved 2026-10-31. Replaces the generic reveal for
       services cards only (their reveal transition is neutralized in
       lion.css until .settled, so the scrub stays tight). Runs on every
       tick so the hidden state holds before entry; at rest the inline
       styles clear so hover + mouse tilt work again. */
    var svc = document.getElementById('services');
    if (svc) {
      var sr = svc.getBoundingClientRect();
      var sp = clamp((vh - sr.top) / (vh + sr.height), 0, 1);
      var spm = clamp(sp / 0.65, 0, 1);
      var svcCards = svc.querySelectorAll('.service-card');
      svcCards.forEach(function (el, i) {
        var pi = clamp((spm - i * 0.06) / 0.70, 0, 1);
        if (pi >= 1) {
          el.style.transform = '';
          el.style.opacity = '';
          el.classList.add('in');
          el.classList.add('settled');
        } else {
          el.style.transform = 'translate3d(0,' + ((1 - pi) * -70) + 'px,0) rotateX(' + ((1 - pi) * 24) + 'deg)';
          el.style.opacity = pi.toFixed(2);
        }
      });
    }
    /* portfolio fan — approved 2026-10-31. Replaces the generic reveal for
       portfolio cards (same handoff as pour). The fan spread adapts to the
       VISIBLE card count so the total spread matches the pilot; mid-fan
       cards drop their .in/.settled so the .in-gated scroll tilt cannot
       fight the scrub, and regain them at rest. */
    var pg = document.getElementById('portfolioGrid');
    if (pg) {
      var allCards = Array.prototype.slice.call(pg.querySelectorAll('.portfolio-card'));
      var visCards = allCards.filter(function (c) { return c.offsetParent !== null; });
      var nVis = visCards.length;
      var pgRect = pg.getBoundingClientRect();
      var pp = clamp((vh - pgRect.top) / (vh + pgRect.height), 0, 1);
      var ppm = clamp(pp / 0.65, 0, 1);
      var fanPer = nVis > 1 ? Math.min(0.06, 0.30 / (nVis - 1)) : 0;
      visCards.forEach(function (el, i) {
        var pi = clamp((ppm - i * fanPer) / 0.70, 0, 1);
        var spread = nVis > 1 ? (i - (nVis - 1) / 2) * (35 / (nVis - 1)) : 0;
        if (pi >= 1) {
          el.style.transform = '';
          el.style.transformOrigin = '';
          el.style.opacity = '';
          el.classList.add('in');
          el.classList.add('settled');
        } else {
          el.classList.remove('in');
          el.classList.remove('settled');
          el.style.transformOrigin = '50% 100%';
          el.style.transform = 'translate3d(0,' + ((1 - pi) * 30) + 'px,0) rotate(' + ((1 - pi) * spread) + 'deg) scale(' + (0.94 + 0.06 * pi) + ')';
          el.style.opacity = pi.toFixed(2);
        }
      });
    }
    /* process line-draw — approved 2026-10-31. Line draws right-to-left;
       steps rise + light up in turn. The line hides when the steps wrap
       to more than one row (tablet/mobile), where it would cross only the
       first row's numbers. */
    var proc = document.getElementById('processSteps');
    if (proc) {
      if (!procLine || !procLine.isConnected) {
        procLine = document.createElement('div');
        procLine.className = 'lion-process-line';
        proc.appendChild(procLine);
        measureProcLine();
      }
      var pr = proc.getBoundingClientRect();
      var pproc = clamp((vh - pr.top) / (vh + pr.height), 0, 1);
      var pprocm = clamp(pproc / 0.65, 0, 1);
      var procLis = proc.querySelectorAll('li');
      var procPer = procLis.length > 1 ? Math.min(0.18, 0.70 / (procLis.length - 1)) : 0;
      var singleRow = true;
      if (procLis.length > 1) {
        var top0 = procLis[0].offsetTop;
        for (var li = 1; li < procLis.length; li++) {
          if (procLis[li].offsetTop !== top0) { singleRow = false; break; }
        }
      }
      if (procLine) {
        procLine.style.display = singleRow ? '' : 'none';
        procLine.style.transform = 'scaleX(' + pprocm.toFixed(3) + ')';
      }
      procLis.forEach(function (el, i) {
        var pi = clamp((pprocm - i * procPer) / 0.30, 0, 1);
        if (pi >= 1) {
          el.style.transform = '';
          el.style.opacity = '';
          el.classList.add('in');
          el.classList.add('settled');
        } else {
          el.style.transform = 'translate3d(0,' + ((1 - pi) * 20) + 'px,0)';
          el.style.opacity = (0.25 + 0.75 * pi).toFixed(2);
        }
        if (pprocm > (i + 0.5) * 0.22) el.classList.add('lit'); else el.classList.remove('lit');
      });
    }
    /* manifesto fade — approved 2026-10-31. Each line brightens on its
       own rect progress (compressed), over the dim lion aura. */
    var maniLines = document.querySelectorAll('#lionManifesto .lion-manifesto-line');
    maniLines.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var p = clamp((vh - r.top) / (vh + r.height), 0, 1);
      var pm = clamp(p / 0.65, 0, 1);
      el.style.opacity = (0.15 + 0.85 * pm).toFixed(2);
      el.style.transform = 'translate3d(0,' + ((1 - pm) * 14) + 'px,0)';
    });
    /* stats ticker — approved 2026-10-31. Panels rise + fade on scroll.
       The numbers count up via the existing upgrades.js Number Ticker
       (not written here — two writers raced and showed mid-count values). */
    var sg = document.getElementById('statsGrid');
    if (sg) {
      var sgr = sg.getBoundingClientRect();
      var ssp = clamp((vh - sgr.top) / (vh + sgr.height), 0, 1);
      var sspm = clamp(ssp / 0.65, 0, 1);
      sg.querySelectorAll('.stat-card').forEach(function (card, i) {
        var pi = clamp((sspm - i * 0.08) / 0.68, 0, 1);
        if (pi >= 1) {
          card.style.transform = '';
          card.style.opacity = '';
        } else {
          card.style.transform = 'translate3d(0,' + ((1 - pi) * 44) + 'px,0)';
          card.style.opacity = pi.toFixed(2);
        }
      });
    }
  }
  window.addEventListener('scroll', function () { target = window.scrollY; kick(); }, { passive: true });
  window.addEventListener('resize', function () { vh = window.innerHeight; target = window.scrollY; measureProcLine(); kick(); });
  var wtabs = document.getElementById('worksTabs');
  if (wtabs) wtabs.addEventListener('click', function () { kick(); });
  var raf = 0, lastTick = 0;
  function tick(now) {
    /* Frame-rate-independent lerp (fix 2026-10-31: the old fixed 0.09-per-
       frame factor assumed 60fps ticks, but apply() runs full-page rect
       reads every frame, so on this VM ticks land at ~1.5fps and a jump
       from the page bottom needed ~110 ticks ≈ 70s to converge, with the
       media frozen at full shrink (hp saturates at 1) while the title
       crept. Time-based decay keeps the exact 0.09 curve at 60fps and
       covers the same TIME distance on slow ticks: a bottom-to-top jump
       now settles in ~3 ticks instead of ~110. */
    var dt = (lastTick && now) ? (now - lastTick) : 16.7;
    lastTick = now;
    velLastDt = dt;
    var f = 1 - Math.pow(1 - 0.09, dt / 16.7);
    current += (target - current) * f;
    if (Math.abs(target - current) < 0.5) {
      current = target;
      apply(current);
      velNeutral();
      raf = 0;
      lastTick = 0;
      return;
    }
    apply(current);
    raf = requestAnimationFrame(tick);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(tick); }
  apply(0);
})();
