/**
 * H2 Studio — hero showcase overlay.
 *
 * Full-bleed showreel video background (the <video> element in index.html) with
 * a lightweight 2D canvas layer floating over it: cursor-reactive particle
 * dust (swirl on slow cursor moves, soft push on fast ones), tap-burst
 * particles + shockwave ring, fast-flick ripple rings, and a barely-there
 * cursor glow on sections below.
 *
 * Zero external requests. No console output in any path.
 * No WebGL, no Three.js — pure 2D canvas, DPR-capped, paused offscreen.
 *
 * Behavior:
 *   - prefers-reduced-motion: particles + video stay off; CSS swaps in a
 *     static poster frame (see styles.css).
 *   - hero offscreen (IntersectionObserver): rAF loop stops, video pauses.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('heroFx');
  var video = document.getElementById('heroVideo');
  var hero = document.getElementById('top');
  if (!canvas || !hero) return;

  var reducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- video lifecycle (paused under reduced-motion or when offscreen) -------
  function videoPause() {
    if (video && video.pause) { try { video.pause(); } catch (_) { /* noop */ } }
  }
  function videoPlay() {
    if (!video || !video.play || reducedMotion) return;
    try {
      var p = video.play();
      if (p && p.catch) p.catch(function () { /* autoplay blocked — stay still */ });
    } catch (_) { /* noop */ }
  }

  if (reducedMotion) {
    videoPause(); // CSS hides video/canvas and shows the poster frame instead
    return;
  }

  // --- constants -------------------------------------------------------------
  var MOBILE_BREAKPOINT = 768;
  var DESKTOP_PARTICLES = 700;
  var BURST_MAX = 200;
  var CURSOR_RADIUS = 180; // px
  var SWIRL_SPEED_PX_S = 520;
  var PUSH_SPEED_PX_S = 1250;
  var RIPPLE_SPEED_PX_S = 2600;
  var RIPPLE_MIN_MS = 150;

  function clamp01(v) { return Math.min(1, Math.max(0, v)); }

  // --- sprites: pre-rendered soft dots (emerald + cyan) ----------------------
  function makeDotSprite(r, g, b) {
    var S = 48;
    var c = document.createElement('canvas');
    c.width = c.height = S;
    var x = c.getContext('2d');
    var grad = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',1)');
    grad.addColorStop(0.4, 'rgba(' + r + ',' + g + ',' + b + ',0.55)');
    grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
    x.fillStyle = grad;
    x.fillRect(0, 0, S, S);
    return c;
  }
  var SPR_EMERALD = makeDotSprite(52, 211, 153);
  var SPR_CYAN = makeDotSprite(34, 211, 238);

  // --- sizing ----------------------------------------------------------------
  var W = 0, H = 0, dpr = 1;
  var ctx = canvas.getContext('2d');
  var isMobile = window.innerWidth < MOBILE_BREAKPOINT;
  var particleCount = isMobile ? Math.round(DESKTOP_PARTICLES / 4) : DESKTOP_PARTICLES;

  function resize() {
    var w = hero.clientWidth || window.innerWidth;
    var h = hero.clientHeight || window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2); // DPR cap 2
    W = Math.round(w * dpr); H = Math.round(h * dpr);
    canvas.width = W; canvas.height = H;
  }

  // --- particle dust ----------------------------------------------------------
  var px = new Float32Array(particleCount);
  var py = new Float32Array(particleCount);
  var pspd = new Float32Array(particleCount); // upward drift px/s (CSS px)
  var pph = new Float32Array(particleCount);  // wobble phase
  var pamp = new Float32Array(particleCount); // wobble amplitude
  var prad = new Float32Array(particleCount); // radius px (CSS px)
  var pcyan = new Uint8Array(particleCount);  // 1 = cyan sprite, 0 = emerald
  var palpha = new Float32Array(particleCount);

  function seedParticle(i, anywhere) {
    px[i] = Math.random() * (W / dpr || 1);
    py[i] = anywhere ? Math.random() * (H / dpr || 1) : (H / dpr || 1) + 20;
    pspd[i] = (6 + Math.random() * 22);
    pph[i] = Math.random() * Math.PI * 2;
    pamp[i] = 4 + Math.random() * 14;
    prad[i] = 1.5 + Math.random() * 3.5;
    pcyan[i] = Math.random() < 0.5 ? 1 : 0;
    palpha[i] = 0.25 + Math.random() * 0.45;
  }
  for (var i = 0; i < particleCount; i++) seedParticle(i, true);

  // --- burst pool (tap-bursts) + rings ----------------------------------------
  var bx = new Float32Array(BURST_MAX), by = new Float32Array(BURST_MAX);
  var bvx = new Float32Array(BURST_MAX), bvy = new Float32Array(BURST_MAX);
  var blife = new Float32Array(BURST_MAX);
  var bcyan = new Uint8Array(BURST_MAX);
  for (var j = 0; j < BURST_MAX; j++) { by[j] = -9999; bcyan[j] = Math.random() < 0.5 ? 1 : 0; }
  var burstCursor = 0;

  var rings = []; // {x, y, t, dur, maxR, alpha, width}
  var lastRippleT = -1e9;

  var interacted = false;
  function markInteracted() {
    if (interacted) return;
    interacted = true;
    try { window.dispatchEvent(new CustomEvent('hero:first-interact')); } catch (_) { /* noop */ }
  }

  function spawnBurst(cx, cy) {
    for (var k = 0; k < 60; k++) {
      var i = burstCursor; burstCursor = (burstCursor + 1) % BURST_MAX;
      var a = Math.random() * Math.PI * 2;
      var sp = 90 + Math.random() * 260; // px/s
      bx[i] = cx; by[i] = cy;
      bvx[i] = Math.cos(a) * sp; bvy[i] = Math.sin(a) * sp - 40;
      blife[i] = 1;
    }
    rings.push({ x: cx, y: cy, t: 0, dur: 0.65, maxR: 190, alpha: 0.7, width: 3 });
    markInteracted();
  }

  function spawnRipple(cx, cy) {
    var nowMs = performance.now();
    if (nowMs - lastRippleT < RIPPLE_MIN_MS) return;
    lastRippleT = nowMs;
    rings.push({ x: cx, y: cy, t: 0, dur: 0.9, maxR: 260, alpha: 0.32, width: 2 });
    markInteracted();
  }

  // --- cursor state -------------------------------------------------------------
  var cursor = { x: 0, y: 0, speed: 0, seen: false, lastT: 0 };

  function onPointerMove(e) {
    var now = performance.now();
    if (cursor.seen) {
      var dtm = Math.max(1, now - cursor.lastT);
      var raw = Math.hypot(e.clientX - cursor.x, e.clientY - cursor.y) / dtm * 1000;
      if (raw < 20000) cursor.speed += (raw - cursor.speed) * 0.35;
    } else {
      cursor.seen = true;
      cursor.speed = 0;
    }
    cursor.x = e.clientX; cursor.y = e.clientY;
    cursor.lastT = now;
    if (visible && cursor.speed > RIPPLE_SPEED_PX_S) {
      var r = canvas.getBoundingClientRect();
      spawnRipple(e.clientX - r.left, e.clientY - r.top);
    }
  }

  // --- tap / burst (pointer only, skip links + buttons) -----------------------
  var downX = 0, downY = 0, downT = 0, dragMoved = 0, downActive = false;

  function onHeroPointerDown(e) {
    if (e.target && e.target.closest && e.target.closest('a,button')) return;
    downX = e.clientX; downY = e.clientY;
    downT = performance.now(); dragMoved = 0; downActive = true;
  }
  function onWindowPointerMoveTap(e) {
    if (!downActive) return;
    dragMoved = Math.max(dragMoved, Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY));
  }
  function onWindowPointerUp(e) {
    var wasDown = downActive;
    downActive = false;
    if (!wasDown) return;
    var quickTap = dragMoved < 10 && (performance.now() - downT) < 600;
    if (quickTap && !(e.target && e.target.closest && e.target.closest('a,button'))) {
      var r = canvas.getBoundingClientRect();
      spawnBurst(e.clientX - r.left, e.clientY - r.top);
    }
  }

  // --- frame -------------------------------------------------------------------
  var visible = true;
  var rafId = 0, lastT = performance.now(), destroyed = false;

  function renderFrame(dt, t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var cw = W / dpr, ch = H / dpr;
    ctx.clearRect(0, 0, cw, ch);
    ctx.globalCompositeOperation = 'lighter';

    // cursor reactivity blend
    cursor.speed *= Math.max(0, 1 - 7 * dt);
    var reactive = cursor.seen && dt > 0;
    var cwx = 0, cwy = 0, swirlAmt = 0, pushAmt = 0;
    if (reactive) {
      var r = canvas.getBoundingClientRect();
      cwx = cursor.x - r.left; cwy = cursor.y - r.top;
      var blend = clamp01((cursor.speed - SWIRL_SPEED_PX_S) / (PUSH_SPEED_PX_S - SWIRL_SPEED_PX_S));
      swirlAmt = (1 - blend) * 110; // px/s at cursor, linear falloff
      pushAmt = blend * 480;
    }
    var R = CURSOR_RADIUS, R2 = R * R;

    for (var i = 0; i < particleCount; i++) {
      // upward drift + gentle wobble
      py[i] -= pspd[i] * dt;
      if (py[i] < -30) { seedParticle(i, false); }
      var wx = px[i] + Math.sin(t * 0.0004 + pph[i]) * pamp[i];
      // cursor influence
      if (reactive && (swirlAmt > 0 || pushAmt > 0)) {
        var dx = wx - cwx, dy = py[i] - cwy;
        var d2 = dx * dx + dy * dy;
        if (d2 < R2 && d2 > 1e-4) {
          var d = Math.sqrt(d2);
          var fall = (1 - d / R) * dt;
          var ux = dx / d, uy = dy / d;
          px[i] += (-uy * swirlAmt + ux * pushAmt) * fall;
          py[i] += (ux * swirlAmt + uy * pushAmt) * fall;
        }
      }
      var s = prad[i] * 3; // sprite draw size (soft glow)
      ctx.globalAlpha = palpha[i];
      ctx.drawImage(pcyan[i] ? SPR_CYAN : SPR_EMERALD, wx - s / 2, py[i] - s / 2, s, s);
    }

    // bursts
    for (var k = 0; k < BURST_MAX; k++) {
      if (blife[k] <= 0) continue;
      blife[k] -= dt * 1.2;
      if (blife[k] <= 0) { by[k] = -9999; continue; }
      var damp = Math.max(0, 1 - 2.1 * dt);
      bvx[k] *= damp; bvy[k] *= damp;
      bvy[k] += 160 * dt; // slight gravity
      bx[k] += bvx[k] * dt; by[k] += bvy[k] * dt;
      var bs = 9 * blife[k];
      ctx.globalAlpha = 0.85 * blife[k];
      ctx.drawImage(bcyan[k] ? SPR_CYAN : SPR_EMERALD, bx[k] - bs / 2, by[k] - bs / 2, bs, bs);
    }

    // rings (shockwave + ripples)
    for (var m = rings.length - 1; m >= 0; m--) {
      var rg = rings[m];
      rg.t += dt;
      var p = rg.t / rg.dur;
      if (p >= 1) { rings.splice(m, 1); continue; }
      var e2 = 1 - Math.pow(1 - p, 2); // ease-out
      ctx.globalAlpha = rg.alpha * (1 - p);
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = rg.width;
      ctx.beginPath();
      ctx.arc(rg.x, rg.y, 8 + e2 * rg.maxR, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function loop(now) {
    if (destroyed) return;
    if (!visible) { rafId = 0; return; }
    var dt = Math.min((now - lastT) / 1000, 0.1);
    lastT = now;
    renderFrame(dt, now);
    rafId = requestAnimationFrame(loop);
  }

  // --- offscreen pause (video + particles) ------------------------------------
  var observer = null;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(function (entries) {
      var wasVisible = visible;
      visible = entries.some(function (e) { return e.isIntersecting; });
      if (visible && !wasVisible && !destroyed) {
        lastT = performance.now();
        videoPlay();
        rafId = requestAnimationFrame(loop);
      } else if (!visible && wasVisible) {
        videoPause();
      }
    }, { threshold: 0 });
    observer.observe(hero);
  }

  // --- section ambient glow (barely-there, follows the cursor) ----------------
  // Kept from the previous hero: a single passive, rAF-throttled handler writes
  // --mx/--my on in-viewport .section elements; the injected rule renders a
  // 5%-alpha gradient.
  var glowStyle = document.createElement('style');
  glowStyle.setAttribute('data-h2-hero-glow', '');
  glowStyle.textContent =
    '.section{position:relative}' +
    '.section::before{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;' +
    'background:radial-gradient(600px at calc(var(--mx,.5)*100%) calc(var(--my,.5)*100%),' +
    'rgba(52,211,153,0.05),transparent 70%)}';
  document.head.appendChild(glowStyle);

  var glowRaf = 0, glowDirty = false, glowNx = 0.5, glowNy = 0.5;
  var glowQueryT = -1e9, glowSections = [];
  function onGlowPointerMove(e) {
    glowNx = e.clientX / window.innerWidth;
    glowNy = e.clientY / window.innerHeight;
    if (!glowDirty) { glowDirty = true; glowRaf = requestAnimationFrame(glowTick); }
  }
  function glowTick() {
    glowRaf = 0; glowDirty = false;
    var nowMs = performance.now();
    if (nowMs - glowQueryT > 3000) {
      glowSections = Array.prototype.slice.call(document.querySelectorAll('.section'));
      glowQueryT = nowMs;
    }
    var vw = window.innerWidth, vh = window.innerHeight;
    for (var i = 0; i < glowSections.length; i++) {
      var el = glowSections[i];
      var r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      el.style.setProperty('--mx', clamp01((glowNx * vw - r.left) / Math.max(1, r.width)).toFixed(3));
      el.style.setProperty('--my', clamp01((glowNy * vh - r.top) / Math.max(1, r.height)).toFixed(3));
    }
  }

  // --- listeners ----------------------------------------------------------------
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointermove', onWindowPointerMoveTap, { passive: true });
  window.addEventListener('pointerup', onWindowPointerUp, { passive: true });
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onGlowPointerMove, { passive: true });
  hero.addEventListener('pointerdown', onHeroPointerDown);

  // --- start --------------------------------------------------------------------
  resize();
  videoPlay();
  rafId = requestAnimationFrame(loop);

  window.addEventListener('pagehide', function () {
    destroyed = true;
    if (rafId) cancelAnimationFrame(rafId);
    if (observer) observer.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointermove', onWindowPointerMoveTap);
    window.removeEventListener('pointerup', onWindowPointerUp);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onGlowPointerMove);
    if (glowRaf) cancelAnimationFrame(glowRaf);
    if (glowStyle && glowStyle.parentNode) glowStyle.parentNode.removeChild(glowStyle);
    try { hero.removeEventListener('pointerdown', onHeroPointerDown); } catch (_) { /* noop */ }
  });
})();
