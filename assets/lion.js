/* Lion phase layer (step 5) — hero shrink-to-aura, progress, tilt titles,
   aura strip, showreel section, depth-clip return section.
   Runs last (after cards.js). app.js and copy-data.js are untouched.
   Single rAF loop, time-based lerp (0.09 @60fps) — one motion system for the whole page. */
(function () {
  'use strict';
  var hero = document.getElementById('top');
  if (!hero) return;
  var reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  /* ---- showreel: the old hero video as its own section ---- */
  var show = document.createElement('section');
  show.className = 'lion-showreel';
  show.innerHTML = '<video controls playsinline preload="metadata" poster="assets/hero-poster.jpg">' +
    '<source src="assets/hero.mp4" type="video/mp4"></video>';
  strip.parentNode.insertBefore(show, strip.nextSibling);

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

  /* ---- why-us panels: stacked colour panels after the portfolio ----
     Content comes from COPY (trilingual, like everything else); the
     section survives language re-renders because it is a sibling of
     #portfolio, not inside it. Sticky tops sit below the fixed nav so
     the stack edges stay visible. */
  var portfolioSec = document.getElementById('portfolio');
  var panelsSec = document.createElement('section');
  panelsSec.className = 'lion-panels';
  panelsSec.id = 'lionPanels';
  var panelsHTML = '<h2 class="section-title lion-panels-title"></h2><p class="lion-panels-sub"></p>';
  var panelClasses = ['p-em', 'p-mg', 'p-vi', 'p-or'];
  for (var pi = 0; pi < 4; pi++) {
    panelsHTML += '<div class="lion-panel ' + panelClasses[pi] + '"><div class="lion-panel-giant"></div><div class="lion-panel-desc"></div></div>';
  }
  panelsSec.innerHTML = panelsHTML;
  if (portfolioSec && portfolioSec.parentNode) portfolioSec.parentNode.insertBefore(panelsSec, portfolioSec.nextSibling);
  function renderPanels() {
    var lang = document.documentElement.lang || 'fa';
    var data = (typeof COPY !== 'undefined' && COPY[lang] && COPY[lang].panels) ||
               (typeof COPY !== 'undefined' && COPY.fa && COPY.fa.panels);
    if (!data) return;
    var title = panelsSec.querySelector('.lion-panels-title');
    var sub = panelsSec.querySelector('.lion-panels-sub');
    if (title) title.textContent = data.heading;
    if (sub) sub.textContent = data.sub;
    var giants = panelsSec.querySelectorAll('.lion-panel-giant');
    var descs = panelsSec.querySelectorAll('.lion-panel-desc');
    data.items.forEach(function (it, i) {
      if (giants[i]) giants[i].textContent = it.giant;
      if (descs[i]) descs[i].textContent = it.desc;
    });
    updatePanelTops();
  }
  renderPanels();
  if ('MutationObserver' in window) {
    new MutationObserver(function (muts) {
      muts.forEach(function (m) { if (m.attributeName === 'lang') renderPanels(); });
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }
  var navEl = document.getElementById('nav');
  function updatePanelTops() {
    var navH = navEl ? navEl.offsetHeight : 0;
    var panels = panelsSec.querySelectorAll('.lion-panel');
    panels.forEach(function (el, i) {
      el.style.top = (navH + i * 26) + 'px';
    });
  }
  updatePanelTops();

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
  var target = 0, current = 0, vh = window.innerHeight;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function apply(y) {
    var doc = document.documentElement.scrollHeight - vh;
    prog.style.width = (doc > 0 ? (y / doc) * 100 : 0) + '%';
    /* hero fades over 1.2 viewports, then holds invisible */
    var hp = clamp(y / (vh * 1.2), 0, 1);
    /* hero fade-in-place (2026-10-31, Hamed's correction: the corner drift
       looked wrong — the whole frame must fade as one, no drifting to a
       corner, no shrinking. Opacity 1 -> 0 over the same range. */
    media.style.transform = '';
    media.style.opacity = (1 - hp).toFixed(2);
    if (inner) {
      inner.style.transform = 'translate3d(0,' + (-y * 0.12) + 'px,0)';
      inner.style.opacity = Math.max(0, 1 - hp * 1.5).toFixed(2);
    }
    /* tilt titles — skip titles still below the viewport so reveals keep working */
    titles.forEach(function (el, i) {
      var r = el.getBoundingClientRect();
      if (r.top > vh) return;
      var p = clamp((vh - r.top) / (vh + r.height), 0, 1);
      var inv = 1 - p;
      if (i % 2 === 0) {
        el.style.transform = 'rotateX(' + (inv * 28) + 'deg) translateY(' + (inv * 60) + 'px)';
      } else {
        el.style.transform = 'rotateY(' + (inv * -30) + 'deg) translateY(' + (inv * 60) + 'px)';
      }
      el.style.opacity = (0.25 + 0.75 * p).toFixed(2);
    });
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
  window.addEventListener('resize', function () { vh = window.innerHeight; target = window.scrollY; updatePanelTops(); measureProcLine(); kick(); });
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
    var f = 1 - Math.pow(1 - 0.09, dt / 16.7);
    current += (target - current) * f;
    if (Math.abs(target - current) < 0.5) {
      current = target;
      apply(current);
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
