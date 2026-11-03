/* H2 Studio v2 — playful layer (iter3).
 *
 *  - Scroll parallax on settled portfolio/service cards (CSS var --par).
 *  - Sticky order CTA: one-time playful pulse when it first matters;
 *    otherwise visible only when useful (hides on scroll-down, over the
 *    footer/final CTA, and while the narengi bubble is open).
 *  - Mascot dock: body.mascot-docked when scrolled past the hero
 *    (styling lives in assets/narengi.css).
 *  - window.H2Lab.render(): the Lab playground — cinematic prompt builder
 *    + live palette playground. Bilingual via COPY; re-renders on language
 *    switch (selections + generated prompt survive).
 *
 * Vanilla JS, no modules, zero external requests, no console output.
 */
(function () {
  'use strict';

  var REDUCED = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  /* ================= seeded random (stable scenes) ================= */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ================= divider scenes ================= */
  /* ================= scroll parallax on cards ================= */
  var parEls = [];
  var parQueued = false;

  function collectParallax() {
    parEls = Array.prototype.slice.call(document.querySelectorAll(
      '#portfolioGrid .portfolio-card, #servicesGrid .service-card'
    ));
    updateParallax();
  }

  function updateParallax() {
    parQueued = false;
    if (REDUCED || !parEls.length) return;
    var vh = window.innerHeight || 1;
    for (var i = 0; i < parEls.length; i++) {
      var elc = parEls[i];
      var r = elc.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) continue;
      var c = (r.top + r.height / 2) - vh / 2;
      var v = clamp(c * -0.045, -16, 16);
      elc.style.setProperty('--par', v.toFixed(1) + 'px');
    }
  }

  function queueParallax() {
    if (parQueued || REDUCED) return;
    parQueued = true;
    requestAnimationFrame(updateParallax);
  }

  /* ================= sticky CTA pulse (once) ================= */
  var pulsed = false;
  function armCtaPulse(heroEl, ctaEl) {
    if (!heroEl || !ctaEl || !('IntersectionObserver' in window) || REDUCED) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting && en.boundingClientRect.top < 0 && !pulsed) {
          pulsed = true;
          ctaEl.classList.add('pulse');
          setTimeout(function () { ctaEl.classList.remove('pulse'); }, 2200);
          io.disconnect();
        }
      });
    }, { threshold: 0 });
    io.observe(heroEl);
  }

  /* ================= sticky CTA: visible only when useful =================
     Hides while scrolling down (reading), returns on scroll-up, and stays
     hidden while the hero is on screen (its own CTA serves), over the
     footer/final CTA (they have their own order button), and while the
     narengi bubble is open (no triple order path). */
  function armCtaBehavior(heroEl, ctaEl) {
    if (!ctaEl) return;
    var lastY = window.scrollY || 0, down = false, heroVis = false, foot = false, bub = false;
    function apply() {
      var hide = heroVis || (down && (window.scrollY || 0) > 320) || foot || bub;
      ctaEl.classList.toggle('cta-hidden', hide);
    }
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY || 0;
        if (y > lastY + 6) down = true; else if (y < lastY - 6) down = false;
        lastY = y; ticking = false; apply();
      });
    }, { passive: true });
    if ('IntersectionObserver' in window) {
      if (heroEl) {
        var hio = new IntersectionObserver(function (es) {
          heroVis = es.some(function (en) { return en.isIntersecting; }); apply();
        }, { threshold: 0 });
        hio.observe(heroEl);
      }
      var fio = new IntersectionObserver(function (es) {
        foot = es.some(function (en) { return en.isIntersecting; }); apply();
      }, { threshold: 0.02 });
      var footEl = document.querySelector('footer');
      var finalEl = document.getElementById('lionFinalCta');
      if (footEl) fio.observe(footEl);
      if (finalEl) fio.observe(finalEl);
    }
    var bubble = document.getElementById('narengi-bubble');
    if (bubble && 'MutationObserver' in window) {
      var mo = new MutationObserver(function () { bub = !bubble.hidden; apply(); });
      mo.observe(bubble, { attributes: true, attributeFilter: ['hidden'] });
      bub = !bubble.hidden;
    }
    apply();
  }

  /* ================= mascot dock ================= */
  function armMascotDock(heroEl) {
    if (!heroEl || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        var past = !en.isIntersecting && en.boundingClientRect.top < 0;
        document.body.classList.toggle('mascot-docked', past);
      });
    }, { threshold: 0 });
    io.observe(heroEl);
  }

  /* ================= THE LAB ================= */
  var labState = { sel: [0, 0, 0, 0], prompt: '' };
  var typeTimer = 0;

  var PALETTES = [
    { e: '#34d399', c: '#22d3ee', m: '#ec4899' },
    { e: '#fbbf24', c: '#fb7185' },
    { e: '#38bdf8', c: '#2dd4bf' },
    { e: '#a78bfa', c: '#f472b6' }
  ];
  var PAL_KEY = 'h2-palette';
  var palIdx = 0; /* the site itself always starts on the lion default (0);
    a saved sunset from the old global behaviour is overwritten by the
    init applyPalette(0) below, so the lion theme can no longer break. */

  function applyPalette(idx) {
    palIdx = idx;
    var p = PALETTES[idx];
    var root = document.documentElement;
    root.style.setProperty('--emerald', p.e);
    root.style.setProperty('--cyan', p.c);
    root.style.setProperty('--grad', p.m ?
      'linear-gradient(135deg,' + p.e + ',' + p.c + ',' + p.m + ')' :
      'linear-gradient(135deg,' + p.e + ',' + p.c + ')');
    try { localStorage.setItem(PAL_KEY, String(idx)); } catch (e) { /* noop */ }
  }

  /* Lab-only palette preview: recolours #lab subtree (its primary button
     and pressed chips use var(--grad)) without touching :root or saving
     anything, so the rest of the site keeps the lion theme. */
  var previewIdx = -1;
  function previewPalette(idx) {
    var lab = document.getElementById('lab');
    if (!lab) return;
    var p = PALETTES[idx];
    lab.style.setProperty('--emerald', p.e);
    lab.style.setProperty('--cyan', p.c);
    lab.style.setProperty('--grad', p.m ?
      'linear-gradient(135deg,' + p.e + ',' + p.c + ',' + p.m + ')' :
      'linear-gradient(135deg,' + p.e + ',' + p.c + ')');
    previewIdx = idx;
  }
  function clearPreview() {
    var lab = document.getElementById('lab');
    if (lab) {
      lab.style.removeProperty('--emerald');
      lab.style.removeProperty('--cyan');
      lab.style.removeProperty('--grad');
    }
    previewIdx = -1;
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function copyText(text, done) {
    function ok() { if (done) done(); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, function () { fb(); ok(); });
    } else { fb(); ok(); }
    function fb() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) { /* noop */ }
      ta.remove();
    }
  }

  function chipRow(options, groupIdx, pressedIdx) {
    return '<div class="chips" role="group">' + options.map(function (o, i) {
      return '<button type="button" class="chip" data-labg="' + groupIdx +
        '" data-labi="' + i + '" aria-pressed="' + (i === pressedIdx) + '">' +
        esc(o) + '</button>';
    }).join('') + '</div>';
  }

  function buildPrompt(lab) {
    var P = lab.prompt;
    return buildPromptFor(lab, P.subjects_en[labState.sel[0]],
      labState.sel[1], labState.sel[2], labState.sel[3]);
  }

  /* ================= style explorer (lab toyC) =================
     Showcase, not a generator: each style chip maps to one REAL video
     work of the studio (COPY videos items, poster + src + title + desc).
     The "prompt" is the lab builder's formula with a per-style preset
     (action/camera/mood indices into the EN option lists, one short EN
     subject phrase per style); a typed subject replaces the subject slot.
     No API call, no network request, no new media — poster files only. */
  var explorerState = { style: -1, subject: '' };
  /* style order matches COPY lab.explorer.styles */
  var EXPLORER_STYLES = [
    { id: 'qatre-film', subj: 'a watercolor drop blooming into a flower', a: 1, c: 0, m: 3 },
    { id: 'nozhe-coffee', subj: 'a barista pouring coffee on a golden morning', a: 1, c: 3, m: 0 },
    { id: 'burger-ad', subj: 'a burger assembling itself in mid-air', a: 0, c: 1, m: 2 },
    { id: 'h2-parfum', subj: 'a perfume bottle glowing in the dark', a: 2, c: 0, m: 1 },
    { id: 'h2-prism', subj: 'a beam of light breaking through a glass prism', a: 3, c: 1, m: 2 }
  ];
  var pgTimer = 0;

  function buildPromptFor(lab, subj, a, c, m) {
    var P = lab.prompt;
    return 'Photorealistic ultra-detailed cinematic shot: ' + subj + ' ' + P.actions_en[a] + '. ' +
      'Camera: ' + P.cameras_en[c] + ', one smooth move only. ' +
      P.moods_en[m] + ', volumetric light, shallow depth of field. ' +
      '8 seconds, 9:16 vertical. Film grain, teal-and-orange grade, cinematic color, no text, no watermark.';
  }

  function pgFindVideo(lang, id) {
    var items = (((COPY[lang] || COPY.fa).videos) || {}).items || [];
    for (var i = 0; i < items.length; i++) if (items[i].id === id) return items[i];
    var faItems = ((COPY.fa.videos) || {}).items || [];
    for (var j = 0; j < faItems.length; j++) if (faItems[j].id === id) return faItems[j];
    return null;
  }

  function typeInto(elm, text) {
    if (typeTimer) { clearInterval(typeTimer); typeTimer = 0; }
    if (REDUCED) { elm.textContent = text; return; }
    var i = 0;
    elm.textContent = '';
    typeTimer = setInterval(function () {
      if (document.hidden) return;
      i += 2;
      elm.textContent = text.slice(0, i);
      if (i >= text.length) { clearInterval(typeTimer); typeTimer = 0; }
    }, 14);
  }

  function renderLab() {
    if (typeof COPY === 'undefined') return;
    var grid = document.getElementById('labGrid');
    if (!grid) return;
    var lang = (typeof state !== 'undefined' && state.lang) || 'fa';
    var lab = (COPY[lang] || COPY.fa).lab;
    if (!lab) return;
    var P = lab.prompt, PL = lab.palette;

    /* English option values ride alongside localized labels */
    var enP = (COPY.en || {}).lab;
    P.subjects_en = enP.prompt.subjects;
    P.actions_en = enP.prompt.actions;
    P.cameras_en = enP.prompt.cameras;
    P.moods_en = enP.prompt.moods;

    var groups = [
      [P.groups.subject, P.subjects, 0],
      [P.groups.action, P.actions, 1],
      [P.groups.camera, P.cameras, 2],
      [P.groups.mood, P.moods, 3]
    ];
    var toyA =
      '<article class="lab-toy" id="labPromptToy">' +
      '<h3>' + esc(P.title) + '</h3><p>' + esc(P.desc) + '</p>' +
      groups.map(function (g) {
        return '<div class="lab-group"><span>' + esc(g[0]) + '</span>' +
          chipRow(g[1], g[2], labState.sel[g[2]]) + '</div>';
      }).join('') +
      '<div class="lab-actions">' +
      '<button type="button" class="btn btn-primary" id="labGen">' + esc(P.generate) + '</button>' +
      '<button type="button" class="btn btn-ghost" id="labCopy">' + esc(P.copy) + '</button>' +
      '<span class="lab-copy-ok" id="labCopyOk" hidden>' + esc(P.copied) + '</span>' +
      '</div>' +
      '<span class="lab-output-label">' + esc(P.output_label) + '</span>' +
      '<div class="lab-output" id="labOutput" data-placeholder="' + esc(P.output_label) + '"></div>' +
      '<p class="lab-note">' + esc(P.note) + '</p>' +
      '</article>';

    var toyB =
      '<article class="lab-toy">' +
      '<h3>' + esc(PL.title) + '</h3><p>' + esc(PL.desc) + '</p>' +
      '<div class="palette-name" id="palName">' + esc(PL.palettes[palIdx]) + '</div>' +
      '<div class="palette-row" role="group">' +
      PALETTES.map(function (p, i) {
        return '<button type="button" class="palette-dot" data-pal="' + i +
          '" aria-pressed="' + (i === palIdx) + '" aria-label="' + esc(PL.palettes[i]) + '"' +
          ' style="background:linear-gradient(135deg,' + p.e + ',' + p.c + ')"></button>';
      }).join('') +
      '</div>' +
      '<div class="lab-actions">' +
      '<button type="button" class="btn btn-ghost" id="palReset">' + esc(PL.reset) + '</button>' +
      '</div>' +
      '</article>';

    var E = lab.explorer || null;
    var watchLabel = (((COPY[lang] || COPY.fa).videos) || {}).watch || '';
    var toyC = !E ? '' :
      '<article class="lab-toy pg-toy" id="labExplorerToy">' +
      '<h3>' + esc(E.title) + '</h3><p>' + esc(E.desc) + '</p>' +
      '<div class="chips pg-chips" role="group">' + E.styles.map(function (s, i) {
        return '<button type="button" class="chip" data-pgs="' + i +
          '" aria-pressed="' + (i === explorerState.style) + '">' + esc(s) + '</button>';
      }).join('') + '</div>' +
      '<div class="lab-group"><span>' + esc(E.subject_label) + '</span>' +
      '<input type="text" class="pg-subject" id="pgSubject" maxlength="40" autocomplete="off" placeholder="' +
      esc(E.subject_placeholder) + '" value="' + esc(explorerState.subject) + '"></div>' +
      '<div class="pg-stage" id="pgStage">' +
      '<div class="pg-shimmer" id="pgShimmer" hidden></div>' +
      '<div class="pg-reveal" id="pgReveal" hidden></div>' +
      '<div class="pg-empty" id="pgEmpty">' + esc(E.empty) + '</div>' +
      '</div>' +
      '<p class="lab-note">' + esc(E.note) + '</p>' +
      '</article>';

    grid.innerHTML = toyA + toyB + toyC;

    /* reveal-on-scroll for toys (mirrors app.js initReveals contract) */
    if (window.H2Reveal) window.H2Reveal(grid.querySelectorAll('.lab-toy'));

    /* prompt toy wiring */
    grid.querySelectorAll('[data-labg]').forEach(function (b) {
      b.addEventListener('click', function () {
        var g = +b.getAttribute('data-labg'), i = +b.getAttribute('data-labi');
        labState.sel[g] = i;
        grid.querySelectorAll('[data-labg="' + g + '"]').forEach(function (x) {
          x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
        });
      });
    });
    var out = grid.querySelector('#labOutput');
    if (labState.prompt) out.textContent = labState.prompt;
    grid.querySelector('#labGen').addEventListener('click', function () {
      labState.prompt = buildPrompt(lab);
      typeInto(out, labState.prompt);
    });
    grid.querySelector('#labCopy').addEventListener('click', function () {
      var t = labState.prompt || buildPrompt(lab);
      if (!labState.prompt) { labState.prompt = t; out.textContent = t; }
      copyText(t, function () {
        var ok = grid.querySelector('#labCopyOk');
        ok.hidden = false;
        setTimeout(function () { ok.hidden = true; }, 2200);
      });
    });

    /* palette toy wiring */
    var palName = grid.querySelector('#palName');
    grid.querySelectorAll('[data-pal]').forEach(function (b) {
      b.addEventListener('click', function () {
        var i = +b.getAttribute('data-pal');
        previewPalette(i);
        grid.querySelectorAll('[data-pal]').forEach(function (x) {
          x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
        });
        palName.textContent = PL.palettes[i];
      });
    });
    grid.querySelector('#palReset').addEventListener('click', function () {
      clearPreview();
      grid.querySelectorAll('[data-pal]').forEach(function (x) {
        x.setAttribute('aria-pressed', x.getAttribute('data-pal') === '0' ? 'true' : 'false');
      });
      palName.textContent = PL.palettes[0];
    });
    if (previewIdx >= 0) {
      grid.querySelectorAll('[data-pal]').forEach(function (x) {
        x.setAttribute('aria-pressed', +x.getAttribute('data-pal') === previewIdx ? 'true' : 'false');
      });
      palName.textContent = PL.palettes[previewIdx];
    }

    /* explorer toy wiring (toyC) */
    function pgPrompt(st) {
      var subj = explorerState.subject.trim() || st.subj;
      return buildPromptFor(lab, subj, st.a, st.c, st.m);
    }
    function pgFillReveal() {
      var st = EXPLORER_STYLES[explorerState.style];
      var rv = grid.querySelector('#pgReveal');
      if (!st || !rv) return '';
      var item = pgFindVideo(lang, st.id);
      if (!item) { rv.innerHTML = ''; return ''; }
      var prompt = pgPrompt(st);
      rv.innerHTML =
        '<div class="pg-work">' +
        '<div class="pg-poster" role="button" tabindex="0" aria-label="' + esc(watchLabel + ': ' + item.title) + '">' +
        '<img src="' + esc(item.poster) + '" alt="" loading="lazy">' +
        '<span class="pg-play" aria-hidden="true">▶</span></div>' +
        '<div class="pg-info"><h4>' + esc(item.title) + '</h4><p>' + esc(item.desc || '') + '</p></div>' +
        '</div>' +
        '<span class="lab-output-label">' + esc(P.output_label) + '</span>' +
        '<div class="lab-output pg-prompt">' + esc(prompt) + '</div>' +
        '<div class="lab-actions">' +
        '<button type="button" class="btn btn-primary" id="pgWatch">' + esc(watchLabel) + '</button>' +
        '<button type="button" class="btn btn-ghost" id="pgCopy">' + esc(P.copy) + '</button>' +
        '<span class="lab-copy-ok" id="pgCopyOk" hidden>' + esc(P.copied) + '</span>' +
        '</div>';
      var open = function () {
        if (typeof openLightbox === 'function') openLightbox(item.src, item.poster, item.title, item.desc);
      };
      var posterEl = rv.querySelector('.pg-poster');
      posterEl.addEventListener('click', open);
      posterEl.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open(); }
      });
      rv.querySelector('#pgWatch').addEventListener('click', open);
      rv.querySelector('#pgCopy').addEventListener('click', function () {
        copyText(prompt, function () {
          var ok = rv.querySelector('#pgCopyOk');
          ok.hidden = false;
          setTimeout(function () { ok.hidden = true; }, 2200);
        });
      });
      return prompt;
    }
    function pgShow(instant) {
      var shim = grid.querySelector('#pgShimmer');
      var rv = grid.querySelector('#pgReveal');
      var em = grid.querySelector('#pgEmpty');
      if (!shim || !rv || !em) return;
      if (pgTimer) { clearTimeout(pgTimer); pgTimer = 0; }
      if (explorerState.style < 0) {
        shim.hidden = true; rv.hidden = true; em.hidden = false; return;
      }
      em.hidden = true;
      pgFillReveal();
      if (REDUCED || instant) { shim.hidden = true; rv.hidden = false; return; }
      rv.hidden = true; shim.hidden = false;
      pgTimer = setTimeout(function () {
        pgTimer = 0; shim.hidden = true; rv.hidden = false;
      }, 1200);
    }
    var subjInput = grid.querySelector('#pgSubject');
    if (subjInput) {
      subjInput.addEventListener('input', function () {
        explorerState.subject = subjInput.value;
        var st = EXPLORER_STYLES[explorerState.style];
        var rv = grid.querySelector('#pgReveal');
        var pr = grid.querySelector('.pg-prompt');
        if (st && rv && !rv.hidden && pr) pr.textContent = pgPrompt(st);
      });
    }
    grid.querySelectorAll('[data-pgs]').forEach(function (b) {
      b.addEventListener('click', function () {
        var i = +b.getAttribute('data-pgs');
        explorerState.style = i;
        grid.querySelectorAll('[data-pgs]').forEach(function (x) {
          x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
        });
        pgShow(false);
      });
    });
    if (explorerState.style >= 0) pgShow(true); /* restore after language re-render, no shimmer */
  }

  window.H2Lab = { render: renderLab };

  /* ================= init ================= */
  function init() {
    applyPalette(palIdx); /* before first paint where possible */

    if (!REDUCED) {
      window.addEventListener('scroll', queueParallax, { passive: true });
      window.addEventListener('resize', queueParallax);
    }
    /* parallax collection happens after app.js renders the grids */
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', collectParallax);
    } else {
      collectParallax();
    }
    window.addEventListener('h2:grids', collectParallax);

    var hero = document.getElementById('top');
    var cta = document.getElementById('stickyCta');
    armCtaPulse(hero, cta);
    armCtaBehavior(hero, cta);
    armMascotDock(hero);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
