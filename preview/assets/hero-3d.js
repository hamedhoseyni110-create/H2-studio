/**
 * H2 Studio — real-time hero scene («ورود به استودیو»).
 *
 * A giant H2 monogram floating in a dark studio void: emerald→cyan gradient
 * glyph on near-black, soft glow + fog, drifting particle dust, slow ambient
 * rotation, mouse parallax, and a scroll-driven camera dive THROUGH the monogram.
 *
 * Zero external requests — three.js is vendored as ./three.module.js.
 * No console output in any path.
 *
 * Usage:
 *   import { initHero3D } from './assets/hero-3d.js';
 *   const hero = initHero3D(document.getElementById('hero3d'));
 *   hero.setScrollProgress(0.5); // manual control (optional)
 *
 * Handle API:
 *   hero.setScrollProgress(p)  — 0..1 scroll-dive progress (manual override;
 *                                 disables the automatic window-scroll fallback)
 *   hero.destroy()             — remove listeners, dispose GL resources
 *   hero.ok                    — false when WebGL init failed (canvas hidden)
 */
import * as THREE from './three.module.js';

const NEAR_BLACK = 0x0b0f0e;
const EMERALD = new THREE.Color('#34d399');
const CYAN = new THREE.Color('#22d3ee');

const DESKTOP_PARTICLES = 700;
const MOBILE_BREAKPOINT = 768;

  const CAMERA_Z_START = 7.2; // hero resting distance
const CAMERA_Z_END = -4.0;  // past the monogram → "into the studio"

const GLYPH_LAYERS = 7;     // layered planes → fake extrusion depth
const GLYPH_LAYER_DEPTH = 0.07;

// --- cursor-reactivity tuning ------------------------------------------------
const CURSOR_RADIUS = 2.2;      // world units: particle influence radius
const SWIRL_SPEED_PX_S = 520;   // below this cursor speed: gentle tangential swirl
const PUSH_SPEED_PX_S = 1250;   // above this: soft radial push (blended between)
const RIPPLE_SPEED_PX_S = 2600; // above this: spawn a fast-move ripple ring
const RIPPLE_MIN_MS = 150;      // at most ~1 ripple per 150ms
const GAZE_Y_MAX = 0.10;        // monogram gaze: max Y rotation toward cursor (rad)
const GAZE_X_MAX = 0.06;        // monogram gaze: max X rotation toward cursor (rad)
const GAZE_IDLE_MS = 3000;      // cursor idle → ease gaze back to 0

const clamp01 = (v) => Math.min(1, Math.max(0, v));

function makeGlyphTexture() {
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, S, S);
  grad.addColorStop(0, '#34d399');
  grad.addColorStop(1, '#22d3ee');

  ctx.fillStyle = grad;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 620px Arial, Helvetica, sans-serif';
  // double-fill for a slightly richer, more opaque glyph
  ctx.fillText('H2', S / 2, S / 2 + 20);
  ctx.fillText('H2', S / 2, S / 2 + 20);

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeGlowTexture() {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0.0, 'rgba(52,211,153,0.55)');
  g.addColorStop(0.45, 'rgba(34,211,238,0.22)');
  g.addColorStop(1.0, 'rgba(34,211,238,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeDotTexture() {
  const S = 64;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(c);
}

export function initHero3D(canvas) {
  const failHandle = () => {
    try { canvas.style.display = 'none'; } catch (_) { /* noop */ }
    return {
      ok: false,
      setScrollProgress() {},
      destroy() {},
    };
  };

  try {
    return buildScene(canvas);
  } catch (_) {
    return failHandle();
  }
}

function buildScene(canvas) {
  const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
  const particleCount = isMobile
    ? Math.round(DESKTOP_PARTICLES / 4)
    : DESKTOP_PARTICLES;
  const reducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- renderer -----------------------------------------------------------
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !isMobile,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(canvas.clientWidth || window.innerWidth,
                   canvas.clientHeight || window.innerHeight, false);
  renderer.setClearColor(NEAR_BLACK, 0); // transparent → CSS gradient shows

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(NEAR_BLACK, 9, 26);

  const camera = new THREE.PerspectiveCamera(
    55,
    (canvas.clientWidth || window.innerWidth) / (canvas.clientHeight || window.innerHeight),
    0.1,
    100
  );
  camera.position.set(0, 0, CAMERA_Z_START);

  // --- monogram: layered planes for subtle extrusion depth ----------------
  const glyphTex = makeGlyphTexture();
  const glowTex = makeGlowTexture();
  const dotTex = makeDotTexture();

  const monogram = new THREE.Group();
  const glyphGeo = new THREE.PlaneGeometry(4.6, 4.6);
  for (let i = 0; i < GLYPH_LAYERS; i++) {
    const t = i / (GLYPH_LAYERS - 1); // 0 = front, 1 = back
    const tint = new THREE.Color().lerpColors(
      new THREE.Color(0xffffff),
      new THREE.Color(0x0d3f3a),
      t * t
    );
    const mat = new THREE.MeshBasicMaterial({
      map: glyphTex,
      transparent: true,
      color: tint,
      depthWrite: i === 0,
    });
    const layer = new THREE.Mesh(glyphGeo, mat);
    layer.position.z = -i * GLYPH_LAYER_DEPTH;
    monogram.add(layer);
  }

  // soft glow layer behind the monogram (cinematic rim feel)
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 11),
    new THREE.MeshBasicMaterial({
      map: glowTex,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glow.position.z = -1.6;
  monogram.add(glow);

  scene.add(monogram);

  // --- particle dust -------------------------------------------------------
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const speeds = new Float32Array(particleCount);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 24;       // x
    positions[i * 3 + 1] = (Math.random() - 0.5) * 14;   // y
    positions[i * 3 + 2] = -8 + Math.random() * 14;       // z: behind → front
    const col = new THREE.Color().lerpColors(EMERALD, CYAN, Math.random());
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
    speeds[i] = 0.08 + Math.random() * 0.25;              // upward drift
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const particles = new THREE.Points(
    particleGeo,
    new THREE.PointsMaterial({
      size: 0.07,
      map: dotTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
  );
  scene.add(particles);

  // --- tap-burst particle pool + shockwave ring (playful interaction) ------
  const BURST_MAX = 240;
  const burstPos = new Float32Array(BURST_MAX * 3);
  const burstVel = new Float32Array(BURST_MAX * 3);
  const burstLife = new Float32Array(BURST_MAX);
  const burstColArr = new Float32Array(BURST_MAX * 3);
  for (let i = 0; i < BURST_MAX; i++) {
    burstPos[i * 3] = 0; burstPos[i * 3 + 1] = -999; burstPos[i * 3 + 2] = 0; // parked
    burstVel[i * 3] = 0; burstVel[i * 3 + 1] = 0; burstVel[i * 3 + 2] = 0;
    burstLife[i] = 0;
    const col = new THREE.Color().lerpColors(EMERALD, CYAN, Math.random());
    burstColArr[i * 3] = col.r; burstColArr[i * 3 + 1] = col.g; burstColArr[i * 3 + 2] = col.b;
  }
  const burstGeo = new THREE.BufferGeometry();
  burstGeo.setAttribute('position', new THREE.BufferAttribute(burstPos, 3));
  burstGeo.setAttribute('color', new THREE.BufferAttribute(burstColArr, 3));
  const burstPts = new THREE.Points(
    burstGeo,
    new THREE.PointsMaterial({
      size: 0.11, map: dotTex, vertexColors: true, transparent: true,
      opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false,
      sizeAttenuation: true,
    })
  );
  burstPts.frustumCulled = false;
  scene.add(burstPts);
  let burstCursor = 0;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.32, 0.42, 48),
    new THREE.MeshBasicMaterial({
      color: CYAN, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    })
  );
  ring.visible = false;
  scene.add(ring);
  let ringT = 1; // 0..1 shockwave progress; >=1 = idle

  // fast-move ripple: a second fading ring, spawned on fast cursor flicks.
  // Same visual pattern as the shockwave ring, cyan + additive, very subtle.
  const ripple = new THREE.Mesh(
    new THREE.RingGeometry(0.26, 0.34, 48),
    new THREE.MeshBasicMaterial({
      color: CYAN, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    })
  );
  ripple.visible = false;
  scene.add(ripple);
  let rippleT = 1;        // 0..1 ripple progress; >=1 = idle
  let lastRippleT = -1e9;  // last spawn timestamp (ms) — rate limiter

  function spawnRipple(wx, wy) {
    const nowMs = performance.now();
    if (nowMs - lastRippleT < RIPPLE_MIN_MS) return;
    lastRippleT = nowMs;
    ripple.position.set(wx, wy, 0.5);
    ripple.visible = true;
    rippleT = 0;
    markInteracted(); // the existing hero:first-interact hint mechanism; no new copy
  }

  function spawnBurst(worldX, worldY) {
    if (reducedMotion) return;
    for (let k = 0; k < 70; k++) {
      const i = burstCursor; burstCursor = (burstCursor + 1) % BURST_MAX;
      const a = Math.random() * Math.PI * 2;
      const sp = 1.6 + Math.random() * 3.2;
      burstPos[i * 3] = worldX; burstPos[i * 3 + 1] = worldY; burstPos[i * 3 + 2] = 0.8;
      burstVel[i * 3] = Math.cos(a) * sp;
      burstVel[i * 3 + 1] = Math.sin(a) * sp;
      burstVel[i * 3 + 2] = 0.6 + Math.random() * 1.8;
      burstLife[i] = 1;
    }
    ring.position.set(worldX, worldY, 0.9);
    ring.visible = true;
    ringT = 0;
  }

  function updateBursts(dt) {
    let any = false;
    for (let i = 0; i < BURST_MAX; i++) {
      if (burstLife[i] <= 0) continue;
      any = true;
      burstLife[i] -= dt * 1.15;
      if (burstLife[i] <= 0) { burstPos[i * 3 + 1] = -999; continue; }
      const damp = Math.max(0, 1 - 1.9 * dt);
      burstVel[i * 3] *= damp; burstVel[i * 3 + 1] *= damp; burstVel[i * 3 + 2] *= damp;
      burstVel[i * 3 + 1] -= 0.7 * dt;
      burstPos[i * 3] += burstVel[i * 3] * dt;
      burstPos[i * 3 + 1] += burstVel[i * 3 + 1] * dt;
      burstPos[i * 3 + 2] += burstVel[i * 3 + 2] * dt;
    }
    if (any) burstGeo.attributes.position.needsUpdate = true;
    if (ringT < 1) {
      ringT = Math.min(1, ringT + dt * 1.6);
      const s = 0.6 + ringT * 7;
      ring.scale.set(s, s, 1);
      ring.material.opacity = 0.85 * (1 - ringT);
      if (ringT >= 1) ring.visible = false;
    }
    if (rippleT < 1) {
      rippleT = Math.min(1, rippleT + dt * 1.25);
      const s = 0.5 + rippleT * 9;
      ripple.scale.set(s, s, 1);
      ripple.material.opacity = 0.45 * (1 - rippleT);
      if (rippleT >= 1) ripple.visible = false;
    }
  }

  // --- interaction state ---------------------------------------------------
  let scrollProgress = 0;
  let manualScroll = false; // setScrollProgress disables auto scroll fallback
  const pointer = { x: 0, y: 0, cx: 0, cy: 0, speed: 0, seen: false, lastT: 0 };
  const camTarget = { x: 0, y: 0 };
  // monogram gaze: eased rotation offsets that lean the H2 toward the cursor
  const gaze = { x: 0, y: 0 };
  let lastPointerMoveT = 0;
  let visible = true;
  let rafId = 0;
  let lastT = performance.now();
  let destroyed = false;
  let zoom = 1; // >1 on narrow viewports so the whole glyph fits

  // drag-to-spin (mouse only — touch keeps native scroll) + tap bursts
  const spin = { x: 0, y: 0, tx: 0, ty: 0 };
  let dragging = false;
  let downX = 0, downY = 0, downT = 0, dragMoved = 0;
  let interacted = false;
  const heroEl = (canvas.closest && canvas.closest('section')) || canvas.parentElement || canvas;

  function markInteracted() {
    if (interacted) return;
    interacted = true;
    try { window.dispatchEvent(new CustomEvent('hero:first-interact')); } catch (_) { /* noop */ }
  }

  function ndcToWorld(clientX, clientY) {
    const nx = (clientX / window.innerWidth) * 2 - 1;
    const ny = -((clientY / window.innerHeight) * 2 - 1);
    const z = (CAMERA_Z_START + (CAMERA_Z_END - CAMERA_Z_START) * easeInOut(scrollProgress)) * zoom;
    const halfH = Math.max(0.001, z) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const halfW = halfH * camera.aspect;
    return { x: nx * halfW, y: ny * halfH };
  }

  function onHeroPointerDown(e) {
    if (e.target && e.target.closest && e.target.closest('a,button')) return;
    downX = e.clientX; downY = e.clientY;
    downT = performance.now(); dragMoved = 0;
    if (e.pointerType === 'mouse') dragging = true;
  }

  function onDragMove(e) {
    if (!dragging) return;
    const dx = e.clientX - downX, dy = e.clientY - downY;
    dragMoved = Math.max(dragMoved, Math.abs(dx) + Math.abs(dy));
    spin.ty += dx * 0.0048;
    spin.tx = Math.max(-0.65, Math.min(0.65, spin.tx + dy * 0.003));
    downX = e.clientX; downY = e.clientY;
    markInteracted();
  }

  function onHeroPointerUp(e) {
    const quickTap = dragMoved < 10 && (performance.now() - downT) < 600;
    dragging = false;
    if (quickTap && !(e.target && e.target.closest && e.target.closest('a,button'))) {
      const w = ndcToWorld(e.clientX, e.clientY);
      spawnBurst(w.x, w.y);
      markInteracted();
    }
  }

  function easeInOut(v) {
    return v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2;
  }

  function renderFrame(dt, t) {
    // user spin (eased) + ambient wobble + cursor gaze (leans toward the cursor,
    // eases back to 0 when the cursor is idle >3s; touch uses the last touch point)
    spin.y += (spin.ty - spin.y) * 0.085;
    spin.x += (spin.tx - spin.x) * 0.085;
    const gazeActive = !reducedMotion && (t - lastPointerMoveT) < GAZE_IDLE_MS;
    gaze.y += ((gazeActive ? pointer.x * GAZE_Y_MAX : 0) - gaze.y) * 0.06;
    gaze.x += ((gazeActive ? -pointer.y * GAZE_X_MAX : 0) - gaze.x) * 0.06;
    monogram.rotation.y = spin.y + Math.sin(t * 0.00018) * 0.14 + gaze.y;
    monogram.rotation.x = spin.x + Math.sin(t * 0.00012 + 1.3) * 0.05 + gaze.x;

    // tap-burst particles + shockwave + fast-move ripple
    updateBursts(dt);

    // particle drift + cursor reactivity:
    // slow cursor → gentle tangential swirl near the cursor point;
    // fast cursor → soft radial push. Blended by cursor speed; upward drift kept.
    const pos = particleGeo.attributes.position.array;
    let cwx = 0, cwy = 0, swirlAmt = 0, pushAmt = 0;
    const reactive = !reducedMotion && dt > 0; // loop only runs when visible
    if (reactive) {
      pointer.speed *= Math.max(0, 1 - 7 * dt); // speed decays while the cursor rests
      const cw = ndcToWorld(pointer.cx, pointer.cy);
      cwx = cw.x; cwy = cw.y;
      const blend = clamp01((pointer.speed - SWIRL_SPEED_PX_S) /
                            (PUSH_SPEED_PX_S - SWIRL_SPEED_PX_S));
      swirlAmt = (1 - blend) * 0.55; // world-units/s at the cursor, linear falloff
      pushAmt = blend * 2.4;         // world-units/s at the cursor, linear falloff
    }
    const R2 = CURSOR_RADIUS * CURSOR_RADIUS;
    for (let i = 0; i < particleCount; i++) {
      const ix = i * 3;
      pos[ix + 1] += speeds[i] * dt;
      if (pos[ix + 1] > 7) pos[ix + 1] = -7;
      pos[ix] += Math.sin(t * 0.0002 + i) * 0.0009;
      if (reactive && (swirlAmt > 0 || pushAmt > 0)) {
        const dx = pos[ix] - cwx, dy = pos[ix + 1] - cwy;
        const d2 = dx * dx + dy * dy;
        if (d2 < R2 && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const fall = (1 - d / CURSOR_RADIUS) * dt;
          const ux = dx / d, uy = dy / d;
          // tangential swirl (−uy, ux) + radial push (ux, uy), scaled by speed blend
          pos[ix]     += (-uy * swirlAmt + ux * pushAmt) * fall;
          pos[ix + 1] += ( ux * swirlAmt + uy * pushAmt) * fall;
        }
      }
    }
    particleGeo.attributes.position.needsUpdate = true;

    // camera: scroll dive + eased mouse parallax
    const eased = easeInOut(scrollProgress);
    const baseZ = (CAMERA_Z_START + (CAMERA_Z_END - CAMERA_Z_START) * eased) * zoom;
    const parallaxScale = 1 - eased * 0.75; // parallax fades as we dive in
    camTarget.x += (pointer.x * 1.15 * parallaxScale - camTarget.x) * 0.045;
    camTarget.y += (pointer.y * 0.65 * parallaxScale - camTarget.y) * 0.045;
    camera.position.set(camTarget.x, camTarget.y, baseZ);
    camera.lookAt(0, 0, -1);

    renderer.render(scene, camera);
  }

  function loop(now) {
    if (destroyed) return;
    if (!visible) { rafId = 0; return; }
    const dt = Math.min((now - lastT) / 1000, 0.1);
    lastT = now;
    renderFrame(dt, now);
    rafId = requestAnimationFrame(loop);
  }

  // --- event handlers ------------------------------------------------------
  function onPointerMove(e) {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    const now = performance.now();
    if (pointer.seen) {
      // cursor speed in px/s, smoothed — drives swirl↔push blend + ripples
      const dtm = Math.max(1, now - pointer.lastT);
      const raw = Math.hypot(e.clientX - pointer.cx, e.clientY - pointer.cy) / dtm * 1000;
      if (raw < 20000) pointer.speed += (raw - pointer.speed) * 0.35;
    } else {
      pointer.seen = true; // first move: no jump speed, no ripple
      pointer.speed = 0;
    }
    pointer.cx = e.clientX;
    pointer.cy = e.clientY;
    pointer.lastT = now;
    lastPointerMoveT = now; // touch: last touch point steers the gaze too
    // fast flicks spawn a fading ripple ring at the cursor's world position
    if (!reducedMotion && visible && pointer.speed > RIPPLE_SPEED_PX_S) {
      const w = ndcToWorld(e.clientX, e.clientY);
      spawnRipple(w.x, w.y);
    }
  }

  function onScroll() {
    if (manualScroll) return;
    const rect = canvas.getBoundingClientRect();
    const h = Math.max(1, rect.height);
    scrollProgress = clamp01(-rect.top / h);
  }

  function onResize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    zoom = Math.max(1, 0.77 / camera.aspect);
    renderer.setSize(w, h, false);
  }

  const observer = new IntersectionObserver((entries) => {
    const wasVisible = visible;
    visible = entries.some((e) => e.isIntersecting);
    if (!reducedMotion && visible && !wasVisible && !destroyed) {
      lastT = performance.now();
      rafId = requestAnimationFrame(loop);
    }
  }, { threshold: 0 });
  observer.observe(canvas);

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointermove', onDragMove, { passive: true });
  window.addEventListener('pointerup', onHeroPointerUp, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  heroEl.addEventListener('pointerdown', onHeroPointerDown);

  // --- section ambient glow (barely-there, follows the cursor) ----------------
  // Skipped entirely under prefers-reduced-motion. A single passive, rAF-throttled
  // handler writes --mx/--my (0..1, relative to each section) on in-viewport
  // .section elements; the injected ::before rule renders a 5%-alpha gradient.
  let glowStyle = null, glowRaf = 0, glowDirty = false;
  let glowNx = 0.5, glowNy = 0.5, glowQueryT = -1e9;
  let glowSections = [];
  function onGlowPointerMove(e) {
    glowNx = e.clientX / window.innerWidth;
    glowNy = e.clientY / window.innerHeight;
    if (!glowDirty) { glowDirty = true; glowRaf = requestAnimationFrame(glowTick); }
  }
  function glowTick() {
    glowRaf = 0; glowDirty = false;
    if (destroyed) return;
    const nowMs = performance.now();
    if (nowMs - glowQueryT > 3000) {
      glowSections = Array.prototype.slice.call(document.querySelectorAll('.section'));
      glowQueryT = nowMs;
    }
    const vw = window.innerWidth, vh = window.innerHeight;
    for (let i = 0; i < glowSections.length; i++) {
      const el = glowSections[i];
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue; // in-viewport only
      el.style.setProperty('--mx', clamp01((glowNx * vw - r.left) / Math.max(1, r.width)).toFixed(3));
      el.style.setProperty('--my', clamp01((glowNy * vh - r.top) / Math.max(1, r.height)).toFixed(3));
    }
  }
  if (!reducedMotion) {
    glowStyle = document.createElement('style');
    glowStyle.setAttribute('data-h2-hero-glow', '');
    glowStyle.textContent =
      '.section{position:relative}' +
      '.section::before{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;' +
      'background:radial-gradient(600px at calc(var(--mx,.5)*100%) calc(var(--my,.5)*100%),' +
      'rgba(52,211,153,0.05),transparent 70%)}';
    document.head.appendChild(glowStyle);
    window.addEventListener('pointermove', onGlowPointerMove, { passive: true });
  }

  // --- start ---------------------------------------------------------------
  onScroll();
  onResize();

  if (reducedMotion) {
    // exactly one static frame, then stop — no loop, no animation
    renderFrame(0, 0);
  } else {
    renderFrame(0, performance.now());
    rafId = requestAnimationFrame(loop);
  }

  function destroy() {
    destroyed = true;
    if (rafId) cancelAnimationFrame(rafId);
    observer.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onHeroPointerUp);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pointermove', onGlowPointerMove);
    if (glowRaf) cancelAnimationFrame(glowRaf);
    if (glowStyle && glowStyle.parentNode) glowStyle.parentNode.removeChild(glowStyle);
    try { heroEl.removeEventListener('pointerdown', onHeroPointerDown); } catch (_) { /* noop */ }
    glyphGeo.dispose();
    glow.geometry.dispose();
    particleGeo.dispose();
    burstGeo.dispose();
    ring.geometry.dispose();
    ripple.geometry.dispose();
    ring.material.dispose();
    ripple.material.dispose();
    [glyphTex, glowTex, dotTex].forEach((t) => t.dispose());
    monogram.children.forEach((m) => m.material.dispose());
    particles.material.dispose();
    burstPts.material.dispose();
    ring.material.dispose();
    renderer.dispose();
  }

  return {
    ok: true,
    setScrollProgress(p) {
      manualScroll = true;
      scrollProgress = clamp01(typeof p === 'number' ? p : 0);
      if (reducedMotion) renderFrame(0, 0); // keep the single static frame honest
    },
    destroy,
  };
}
