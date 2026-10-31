/* H2 Studio v2 — playful layer (iter3).
 *
 *  - Canvas night-landscape divider scenes (2D only, no WebGL): layered
 *    ridges + twinkling stars + horizon glow + fireflies, parallaxed by
 *    scroll. DPR-capped, paused offscreen / when tab hidden.
 *  - Scroll parallax on settled portfolio/service cards (CSS var --par).
 *  - Sticky order CTA: one-time playful pulse when it first matters.
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
  function DividerScene(container, seed) {
    this.c = container;
    this.canvas = container.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.seed = seed;
    this.visible = false;
    this.raf = 0;
    this.t0 = 0;
    this.stars = [];
    this.flies = [];
    this.layers = []; /* {img, factor, y, speed} */
    this.W = 0; this.H = 0;
    this.resizeT = 0;
    var self = this;
    this.onResize = function () {
      if (self.resizeT) clearTimeout(self.resizeT);
      self.resizeT = setTimeout(function () { self.build(); self.paint(0); }, 180);
    };
    window.addEventListener('resize', this.onResize);
    if ('IntersectionObserver' in window) {
      this.io = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          self.visible = en.isIntersecting;
          self.kick();
        });
      }, { threshold: 0.02 });
      this.io.observe(container);
    } else {
      this.visible = true;
    }
    document.addEventListener('visibilitychange', function () { self.kick(); });
    this.build();
    this.paint(0);
    this.kick();
  }

  DividerScene.prototype.build = function () {
    var r = this.c.getBoundingClientRect();
    var dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    this.W = Math.max(2, Math.round(r.width * dpr));
    this.H = Math.max(2, Math.round(r.height * dpr));
    this.dpr = dpr;
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    var rnd = mulberry32(this.seed);
    var W = this.W, H = this.H, i;

    /* stars */
    this.stars = [];
    var nStars = W > 900 * dpr ? 110 : 60;
    for (i = 0; i < nStars; i++) {
      this.stars.push({
        x: rnd() * W, y: rnd() * H * 0.55,
        r: (0.5 + rnd() * 1.4) * dpr,
        ph: rnd() * 6.283, sp: 0.6 + rnd() * 1.8,
        cyan: rnd() > 0.72
      });
    }

    /* ridge silhouettes (pre-rendered offscreen, wider than canvas for shift) */
    function ridge(baseY, amp, color, jag) {
      var pad = Math.round(W * 0.22);
      var cw = W + pad * 2;
      var cv = document.createElement('canvas');
      cv.width = cw; cv.height = H;
      var g = cv.getContext('2d');
      var step = Math.max(18 * dpr, W / 46);
      var pts = [];
      var x, y = baseY;
      for (x = 0; x <= cw + step; x += step) {
        y += (rnd() - 0.5) * amp * jag;
        y = clamp(y, baseY - amp, baseY + amp * 0.7);
        pts.push([x, y]);
      }
      g.beginPath();
      g.moveTo(0, H);
      for (var k = 0; k < pts.length; k++) {
        var p0 = pts[Math.max(0, k - 1)], p1 = pts[k], p2 = pts[Math.min(pts.length - 1, k + 1)];
        g.quadraticCurveTo(p1[0], p1[1], (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2);
        void p0;
      }
      g.lineTo(cw, H);
      g.closePath();
      g.fillStyle = color;
      g.fill();
      return { img: cv, pad: pad };
    }

    this.layers = [
      { r: ridge(H * 0.46, H * 0.16, 'rgba(23,48,40,0.85)', 1.0), factor: 0.14, bob: 6 },
      { r: ridge(H * 0.62, H * 0.15, 'rgba(13,26,21,0.95)', 1.2), factor: 0.32, bob: 10 },
      { r: ridge(H * 0.80, H * 0.14, 'rgba(6,11,10,1)', 1.4), factor: 0.58, bob: 14 }
    ];

    /* fireflies */
    this.flies = [];
    for (i = 0; i < 14; i++) {
      this.flies.push({
        x: rnd() * W, y: H * 0.45 + rnd() * H * 0.5,
        ph: rnd() * 6.283, sp: 0.25 + rnd() * 0.5,
        rise: 6 + rnd() * 14, sway: 20 + rnd() * 30,
        cyan: rnd() > 0.5, s: (1.2 + rnd() * 1.8) * dpr
      });
    }
  };

  DividerScene.prototype.paint = function (t) {
    var ctx = this.ctx, W = this.W, H = this.H;
    if (!W || !H) return;
    ctx.clearRect(0, 0, W, H);

    /* sky wash */
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, 'rgba(4,8,7,0)');
    sky.addColorStop(0.55, 'rgba(6,12,10,0.55)');
    sky.addColorStop(1, 'rgba(4,7,6,0.9)');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    /* scroll parallax: how far the scene's center is from viewport center */
    var rect = this.c.getBoundingClientRect();
    var vh = window.innerHeight || 1;
    var p = clamp(((rect.top + rect.height / 2) - vh / 2) / vh, -1, 1);

    /* stars */
    var s, a, i;
    for (i = 0; i < this.stars.length; i++) {
      s = this.stars[i];
      a = 0.25 + 0.65 * Math.abs(Math.sin(t * s.sp + s.ph));
      ctx.beginPath();
      ctx.arc(s.x - p * 18 * this.dpr, s.y, s.r, 0, 6.283);
      ctx.fillStyle = s.cyan
        ? 'rgba(150,235,245,' + a.toFixed(3) + ')'
        : 'rgba(235,255,245,' + a.toFixed(3) + ')';
      ctx.fill();
    }

    /* horizon glow (breathes a little) */
    var glowY = H * 0.52;
    var breathe = 0.75 + 0.25 * Math.sin(t * 0.5);
    var gl = ctx.createRadialGradient(W / 2, glowY, 0, W / 2, glowY, W * 0.42);
    gl.addColorStop(0, 'rgba(52,211,153,' + (0.16 * breathe).toFixed(3) + ')');
    gl.addColorStop(0.55, 'rgba(34,211,238,' + (0.08 * breathe).toFixed(3) + ')');
    gl.addColorStop(1, 'rgba(34,211,238,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, W, H);

    /* ridge layers, back → front */
    for (i = 0; i < this.layers.length; i++) {
      var L = this.layers[i];
      var shift = -p * L.factor * W * 0.24;
      var bobY = Math.sin(t * 0.4 + i * 2.1) * L.bob * this.dpr * 0.4;
      ctx.drawImage(L.r.img, -L.r.pad + shift, bobY);
    }

    /* fireflies */
    for (i = 0; i < this.flies.length; i++) {
      var f = this.flies[i];
      var fy = f.y - ((t * f.rise) % (H * 0.5));
      var fx = f.x + Math.sin(t * f.sp + f.ph) * f.sway * this.dpr;
      a = 0.25 + 0.55 * Math.abs(Math.sin(t * f.sp * 1.7 + f.ph));
      ctx.beginPath();
      ctx.arc(fx, fy, f.s, 0, 6.283);
      ctx.fillStyle = f.cyan
        ? 'rgba(120,225,240,' + a.toFixed(3) + ')'
        : 'rgba(120,240,180,' + a.toFixed(3) + ')';
      ctx.fill();
    }
  };

  DividerScene.prototype.kick = function () {
    var self = this;
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
    if (REDUCED) { this.paint(0); return; }
    if (!this.visible || document.hidden) return;
    this.t0 = this.t0 || performance.now();
    var loop = function (now) {
      self.paint((now - self.t0) / 1000);
      self.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  };

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
  var palIdx = 0;
  try {
    var sp = parseInt(localStorage.getItem(PAL_KEY), 10);
    if (sp >= 0 && sp < PALETTES.length) palIdx = sp;
  } catch (e) { /* private mode */ }

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
    var s = P.subjects_en[labState.sel[0]];
    var a = P.actions_en[labState.sel[1]];
    var c = P.cameras_en[labState.sel[2]];
    var m = P.moods_en[labState.sel[3]];
    return 'Photorealistic ultra-detailed cinematic shot: ' + s + ' ' + a + '. ' +
      'Camera: ' + c + ', one smooth move only. ' +
      m + ', volumetric light, shallow depth of field. ' +
      '8 seconds, 9:16 vertical. Film grain, teal-and-orange grade, cinematic color, no text, no watermark.';
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

    grid.innerHTML = toyA + toyB;

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
        applyPalette(i);
        grid.querySelectorAll('[data-pal]').forEach(function (x) {
          x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
        });
        palName.textContent = PL.palettes[i];
      });
    });
    grid.querySelector('#palReset').addEventListener('click', function () {
      applyPalette(0);
      grid.querySelectorAll('[data-pal]').forEach(function (x) {
        x.setAttribute('aria-pressed', x.getAttribute('data-pal') === '0' ? 'true' : 'false');
      });
      palName.textContent = PL.palettes[0];
    });
  }

  window.H2Lab = { render: renderLab };

  /* ================= init ================= */
  function init() {
    applyPalette(palIdx); /* before first paint where possible */
    var scenes = Array.prototype.slice.call(document.querySelectorAll('[data-scene]'));
    scenes.forEach(function (c, i) { new DividerScene(c, 1234 + i * 777); });

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
    armMascotDock(hero);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
