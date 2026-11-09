(function () {
  'use strict';
  /* Master Film engine (two-act) — section 1 (CONFIG) from the assembly plus
     Argon's engine, adapted: asset paths under assets/masterfilm/, rect-based
     scroll for the sticky stage, and the Act-II canvas dimming. All motion
     logic is Argon's, unchanged. */
const CONFIG = {
        // شماره واتساپ واقعی خود را در صورت تفاوت جایگزین کنید
        WHATSAPP_URL: "https://wa.me/989375732165",

        // جایگاه پوسترهای واقعی نمونه‌کارها
        POSTER_SLOTS: {
          SLOT_WEB_POSTER: "./assets/masterfilm/posters/web-ramin-berger.jpg",      // آدرس پوستر بخش سایت
          SLOT_VIDEO_POSTER: "./assets/masterfilm/posters/video-qatre.jpg",    // آدرس پوستر بخش ویدیو
          SLOT_PHOTO_POSTER: "./assets/masterfilm/posters/photo-lion-v1.webp",    // آدرس پوستر بخش عکس
          SLOT_APP_POSTER: "./assets/masterfilm/posters/app-loyalty.jpg"       // آدرس پوستر بخش اپ
        },

        /*
          پنج سکانس ۲۴ فریمی (مجموعاً ۱۲۰ فریمِ پیوسته از بالا تا پایین سایت):
          - سکانس ۳ همان ۲۴ فریمِ استخراج‌شده از کلیپ ضرب ۳ (frame_01.webp تا frame_24.webp) است.
          - برای سکانس‌های ۱، ۲، ۴ و ۵ هم به محض تولید کلیپ‌ها و استخراج ۲۴ فریم، مسیر پوشه‌شان را قرار دهید.
        */
        SEQUENCES: [
          { id: 1, name: "SEQ1_BIRTH_TO_WEB",   folder: "./assets/masterfilm/seq1/", prefix: "frame_", count: 24 }, // فریم ۱ تا ۲۴
          { id: 2, name: "SEQ2_WEB_TO_VIDEO",   folder: "./assets/masterfilm/seq2/", prefix: "frame_", count: 24 }, // فریم ۲۵ تا ۴۸
          { id: 3, name: "SEQ3_LION_SANCTUARY", folder: "./assets/masterfilm/",      prefix: "frame_", count: 24 }, // فریم ۴۹ تا ۷۲ (۲۴ فریم موجود ضرب ۳)
          { id: 4, name: "SEQ4_LION_TO_DUAL",   folder: "./assets/masterfilm/seq4/", prefix: "frame_", count: 24 }, // فریم ۷۳ تا ۹۶
          { id: 5, name: "SEQ5_DUAL_TO_CTA",    folder: "./assets/masterfilm/seq5/", prefix: "frame_", count: 24 }  // فریم ۹۷ تا ۱۲۰
        ]
      };

      // اتصال لینک واتساپ و پوسترهای واقعی
      const waBtn = document.getElementById('whatsappRealLink');
      if (waBtn && CONFIG.WHATSAPP_URL) {
        waBtn.href = CONFIG.WHATSAPP_URL;
      }

      document.querySelectorAll('img[data-slot]').forEach((img) => {
        const slotKey = img.getAttribute('data-slot');
        if (CONFIG.POSTER_SLOTS[slotKey]) {
          img.src = CONFIG.POSTER_SLOTS[slotKey];
          img.hidden = false;
          const ph = img.parentElement.querySelector('.poster-slot-placeholder');
          if (ph) ph.style.display = 'none';
        }
      });

      /* =====================================================================
         ۲. مدیریت بارگذاری تنبل و مرحله‌ایِ ۱۲۰ فریم (Chunked Lazy-Loader)
            تا بازدید اول زیر ۲۵۰ کیلوبایت بماند و بقیه سکانس‌ها در مسیر لود شوند
         ===================================================================== */
/* Argon's exact vanilla engine for the Master Film — 2026-11-06.
   Replace Sections 2, 3, and 4 inside the <script> of index.html
   (from 
/* Argon's exact vanilla engine for the Master Film — 2026-11-06.
   Replace Sections 2, 3, and 4 inside the <script> of index.html
   (from const TOTAL_FRAMES = 120; down to the end of the IIFE).
   Also increase .story-scroll-container height in CSS from 600vh to 950vh.
   Verbatim from Argon's reply; comments inside are Argon's own (Persian). */

/* =====================================================================
   ۲. بارگذاری ترتیبی، پیش‌دکود (GPU Decode) و بافر بدون پرشِ ۱۲۰ فریم
      - حذف باگ پرش (0 + 2): بارگذاری строго به ترتیب 0 -> 1 -> 2 -> 3 -> 4
      - استفاده از img.decode() برای حذف لگِ اولین رسم روی Canvas موبایل
   ===================================================================== */
const TOTAL_FRAMES = 120;
const frameBank = new Array(TOTAL_FRAMES);
const chunkState = [0, 0, 0, 0, 0]; // 0: idle, 1: loading, 2: ready
let highestContiguousFrame = 0;

function getFrameUrl(seqIndex, localFrame1Based) {
  const seq = CONFIG.SEQUENCES[seqIndex];
  const num = String(localFrame1Based).padStart(2, '0');
  return `${seq.folder}${seq.prefix}${num}.webp`;
}

function updateContiguousPlayhead() {
  let maxReady = 0;
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    if (frameBank[i] && frameBank[i].ready) {
      maxReady = i;
    } else {
      break; // اولین فریمِ لودنشده مرزِ امنِ پخش پیوسته است (جلوگیری از پرش به سکانس بعد)
    }
  }
  highestContiguousFrame = maxReady;
}

function loadSequenceChunk(seqIndex) {
  if (seqIndex < 0 || seqIndex >= CONFIG.SEQUENCES.length || chunkState[seqIndex] !== 0) {
    return;
  }
  chunkState[seqIndex] = 1;

  const seq = CONFIG.SEQUENCES[seqIndex];
  const globalOffset = seqIndex * 24;
  let loadedInChunk = 0;

  for (let i = 1; i <= seq.count; i++) {
    const globalIdx = globalOffset + (i - 1);
    const img = new Image();
    img.decoding = 'async';
    img.src = getFrameUrl(seqIndex, i);

    const markReady = () => {
      frameBank[globalIdx] = { img, ready: true, seqId: seq.id, localNum: i };
      loadedInChunk++;
      updateContiguousPlayhead();
      if (loadedInChunk === seq.count) {
        chunkState[seqIndex] = 2;
        // زنجیره‌ی خودکار: به محض تمام شدن هر سکانس، سکانس بعدی را در پس‌زمینه شروع کن
        if (seqIndex + 1 < CONFIG.SEQUENCES.length) {
          loadSequenceChunk(seqIndex + 1);
        }
      }
    };

    img.onload = () => {
      if (typeof img.decode === 'function') {
        // اگر decode() زیر بار گیر کرد، بعد از ۵ ثانیه anyway آماده‌اش کن —
        // drawImage موقع رسم خودش دیکد می‌کند؛ زنجیره نباید پشت یک دیکد گیر کند.
        let settled = false;
        const done = () => { if (!settled) { settled = true; markReady(); } };
        img.decode().then(done).catch(done);
        setTimeout(done, 5000);
      } else {
        markReady();
      }
    };

    img.onerror = () => {
      frameBank[globalIdx] = { img: null, ready: false, seqId: seq.id, localNum: i };
      loadedInChunk++;
      if (loadedInChunk === seq.count && seqIndex + 1 < CONFIG.SEQUENCES.length) {
        loadSequenceChunk(seqIndex + 1);
      }
    };
  }
}

// شروع بارگذاری از سکانس ۱؛ زنجیره‌ی خودکار سکانس‌های بعد را می‌کشد (قدم ۴:
// فراخوانی هم‌زمان سکانس ۲ در لود، ۲۴ درخواست اضافه با HTML/CSS/فونت رقابت می‌کرد)
loadSequenceChunk(0);

/* =====================================================================
   ۳. موتور رندر فیلم روی Canvas با Cross-Dissolve واقعی و بدون پرش
   ===================================================================== */
const canvas = document.getElementById('masterFilmCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
const statusPill = document.getElementById('seqStatusPill');

// فقط به عقب نگاه می‌کند تا هرگز به فریمِ سکانسِ جلوتر نپرد (حذف کامل پرش زمانی)
function getSafeFrame(targetIdx) {
  if (frameBank[targetIdx] && frameBank[targetIdx].ready) {
    return frameBank[targetIdx];
  }
  for (let i = targetIdx - 1; i >= 0; i--) {
    if (frameBank[i] && frameBank[i].ready) return frameBank[i];
  }
  for (let i = targetIdx + 1; i < TOTAL_FRAMES; i++) {
    if (frameBank[i] && frameBank[i].ready) return frameBank[i];
  }
  return null;
}

function renderFilmFrame(exactFrameFloat) {
  const w = canvas.width;
  const h = canvas.height;

  // محدود کردن به آخرین فریمِ پیوسته‌ی لودشده تا اگر کاربر خیلی سریع کشید، تصویر نپرد
  const safeCap = highestContiguousFrame > 4 ? highestContiguousFrame : (TOTAL_FRAMES - 1);
  const clampedFloat = Math.max(0, Math.min(safeCap, exactFrameFloat));

  const idxA = Math.floor(clampedFloat);
  const idxB = Math.min(safeCap, idxA + 1);
  const blend = clampedFloat - idxA;

  const seqNum = Math.floor(idxA / 24) + 1;
  const localFrame = (idxA % 24) + 1;
  if (statusPill) {
    statusPill.textContent = `SEQ ${seqNum} • FRAME ${String(idxA + 1).padStart(3, '0')} / ${TOTAL_FRAMES}`;
  }

  const frameA = getSafeFrame(idxA);
  const frameB = getSafeFrame(idxB);

  if (frameA && frameA.img) {
    ctx.globalAlpha = 1;
    ctx.drawImage(frameA.img, 0, 0, w, h);

    if (frameB && frameB.img && frameB !== frameA && blend > 0.01) {
      ctx.globalAlpha = blend;
      ctx.drawImage(frameB.img, 0, 0, w, h);
    }
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = '#040706';
    ctx.fillRect(0, 0, w, h);
  }
}

/* =====================================================================
   ۴. موتور فیزیک اسکرول به سبک ORYZO:
      - Time-based Exponential Decay (مستقل از افت فریم گوشی)
      - Velocity Clamping (حداکثر سرعت عبور فریم‌ها تا هیچ فریمی جا نماند)
      - Autonomous Living Drift (نوسان زنده و چرخش نرم نور حتی وقتی اسکرول متوقف است)
      - Auto-Intro Glide (پیشروی خودکار ۴ فریم اول در بدو ورود برای حذف مکث ابتدای ضرب ۰)
   ===================================================================== */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const scrollContainer = document.getElementById('scrollContainer');
const finaleSection = document.getElementById('studio-finale') || document.getElementById('contact');
const progressLine = document.getElementById('progressLine');
const overlays = Array.from(document.querySelectorAll('.beat-overlay'));
// ضرب ۴: گرید دوتایی کارت‌ها باید پارالاکس موس را مثل کانوس دنبال کند تا
// کارت‌ها با قاب‌های نئونی فیلم هم‌تراز بمانند (فقط دسکتاپ).
const beat4Grid = document.querySelector('[data-beat="4"] .dual-works-grid');

// بازبینی BEAT_WINDOWS: کوتاه‌تر شدن مکث ضرب ۰ و توزیع متوازن در طول فیلم
const BEAT_WINDOWS = [
  { start: 0.00, peakStart: 0.00, peakEnd: 0.07, end: 0.12 }, // ضرب ۰: کوتاه و تند تا نور سریع به حرکت بیفتد
  { start: 0.11, peakStart: 0.16, peakEnd: 0.29, end: 0.34 }, // ضرب ۱: سایت ساخته می‌شود
  { start: 0.32, peakStart: 0.37, peakEnd: 0.44, end: 0.48 }, // ضرب ۲: ویدیو ساخته می‌شود
  { start: 0.47, peakStart: 0.52, peakEnd: 0.68, end: 0.72 }, // ضرب ۳: شیر سیاه (فریم ۴۹ تا ۷۲)
  { start: 0.71, peakStart: 0.76, peakEnd: 0.87, end: 0.91 }, // ضرب ۴: عکس و اپ
  { start: 0.89, peakStart: 0.94, peakEnd: 1.00, end: 1.00 }  // ضرب ۵: نوبت ایده‌ی توست
];

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const norm = (v, a, b) => clamp((v - a) / Math.max(0.0001, b - a), 0, 1);

let targetP = 0;
let smoothP = 0.0;
let lastTimeMs = performance.now();

// حداکثر سرعت مجاز ورق خوردن فیلم: ۲۸ فریم در ثانیه (یعنی کل ۱۲۰ فریم حداقل ۴.۲ ثانیه طول می‌کشد و هرگز نمی‌پرد)
const MAX_PROGRESS_SPEED_PER_SEC = 28 / TOTAL_FRAMES;
// ضریب نرمی نمایی بر حسب زمان (معادل حس سنگین و کره‌ای ORYZO)
const SMOOTH_LAMBDA = 7.5;

let mouseOffsetX = 0;
let mouseOffsetY = 0;
let smoothMouseX = 0;
let smoothMouseY = 0;

// قدم ۴ — وضعیت dirty-check رندر: وقتی فریم ثابت است و سکانس تازه‌ای هم
// لود نشده، رندر کانوس + همگام‌سازی کارت‌ها رد می‌شود
let lastRenderedFrame = -1;
let lastRenderedCap = -1;
let lastIntoActTwo = -1;

if (window.matchMedia('(pointer: fine)').matches && !reducedMotion) {
  window.addEventListener('pointermove', (e) => {
    mouseOffsetX = ((e.clientX / window.innerWidth) - 0.5) * -14;
    mouseOffsetY = ((e.clientY / window.innerHeight) - 0.5) * -10;
  }, { passive: true });
}

function tick(nowMs) {
  if (reducedMotion) {
    // بوم حالا ثابت و پشت کل صفحه است — در حالت کاهش حرکت، فریم ۷۱ فقط
    // هاله‌ی کم‌رنگِ پشت بخش‌ها باشد، نه تصویر پرنور.
    canvas.style.opacity = '0.22';
    loadSequenceChunk(2);
    // فریم ثابت RM را با نزدیک‌ترین فریمِ آماده به ۷۱ بکش — نه با سقفِ پیوسته:
    // اگر دیکدِ یک فریمِ میانی گیر کند، سقفِ پیوسته برای همیشه روی فریمِ
    // زودهنگام می‌ماند. حلقه بدون سقف تلاش می‌ماند تا خودِ ۷۱ آماده شود.
    (function renderReducedMotion() {
      const f = getSafeFrame(71);
      if (f && f.img) {
        ctx.globalAlpha = 1;
        ctx.drawImage(f.img, 0, 0, canvas.width, canvas.height);
        if (statusPill) {
          const idx = frameBank.indexOf(f);
          const seqNum = Math.floor(idx / 24) + 1;
          statusPill.textContent = `SEQ ${seqNum} • FRAME ${String(idx + 1).padStart(3, '0')} / ${TOTAL_FRAMES}`;
        }
      } else {
        ctx.fillStyle = '#040706';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      if (!(frameBank[71] && frameBank[71].ready)) {
        window.requestAnimationFrame(renderReducedMotion);
      }
    })();
    return;
  }

  const dt = Math.min(0.05, Math.max(0.001, (nowMs - lastTimeMs) * 0.001));
  lastTimeMs = nowMs;

  const vh = window.innerHeight;
  // Two-act scroll: progress from the film container's own rect (the stage is
  // sticky, so window.scrollY alone no longer measures the film).
  const rect = scrollContainer.getBoundingClientRect();
  const filmScrollable = Math.max(1, scrollContainer.offsetHeight - vh);
  const rawScrollP = clamp(-rect.top / filmScrollable, 0, 1);
  // Act-II handoff: once the film is scrolled past, dim the canvas to a 0.22 halo;
  // at the finale (#studio-finale) the golden ring brightens back to 1.0.
  const intoActTwo = clamp((-rect.top - filmScrollable) / (vh * 0.6), 0, 1);
  let finaleRebound = 0;
  if (finaleSection) {
    const fRect = finaleSection.getBoundingClientRect();
    finaleRebound = clamp(1 - (fRect.top / vh), 0, 1);
  }
  const baseDim = 1 - intoActTwo * 0.78;
  canvas.style.opacity = clamp(baseDim + finaleRebound * 0.78, 0.22, 1).toFixed(3);

  // کم‌رنگ شدن خودکار نارنگی در موبایل هنگام اسکرول فعال فیلم
  document.body.classList.toggle('is-scrubbing-film', rawScrollP > 0.04 && intoActTwo < 0.1);

  // فیلم فقط با اسکرول حرکت می‌کند — هیچ نوسان خودکار نیست (حکم حامد ۲۰۲۶-۱۱-۰۶:
  // «جلو-عقب» خوانده می‌شد). Auto-Intro Glide حذف شد: در بالای صفحه فریم ۰
  // ثابت می‌ماند تا کاربر اسکرول کند.
  targetP = rawScrollP;

  // محاسبه گام حرکت با سقف سرعت (Velocity Clamp) تا حتی در پرش‌های اسکرول هم تک‌تک فریم‌ها دیده شوند
  const alpha = 1 - Math.exp(-SMOOTH_LAMBDA * dt);
  const desiredStep = (targetP - smoothP) * alpha;
  const maxStep = MAX_PROGRESS_SPEED_PER_SEC * dt;
  const clampedStep = clamp(desiredStep, -maxStep, maxStep);

  smoothP = clamp(smoothP + clampedStep, 0, 1);

  // پیش‌بارگذاری تهاجمی‌تر بر اساس targetP (به محض حرکت انگشت، نه بعد از رسیدن smoothP)
  if (targetP > 0.01) loadSequenceChunk(2);
  if (targetP > 0.15) loadSequenceChunk(3);
  if (targetP > 0.30) loadSequenceChunk(4);

  // خط پیشرفت بالای صفحه
  progressLine.style.transform = `scaleX(${smoothP.toFixed(4)})`;

  // وقتی اسکرول متوقف می‌شود فیلم روی همان فریم می‌ایستد — Idle Frame Breathing
  // حذف شد (نوسان ±۰٫۵۵ فریم در توقف، «جلو-عقب» خوانده می‌شد).
  const exactFrame = clamp(
    smoothP * (TOTAL_FRAMES - 1),
    0,
    TOTAL_FRAMES - 1
  );
  // قدم ۴ — dirty-check: فریم عوض نشده و سکانس تازه‌ای هم لود نشده → رندر
  // کانوس را رد کن؛ پارالاکس موس بیرون این شرط می‌ماند تا همیشه زنده باشد.
  const frameDirty = Math.abs(exactFrame - lastRenderedFrame) >= 0.002 ||
    highestContiguousFrame !== lastRenderedCap;
  if (frameDirty) {
    lastRenderedFrame = exactFrame;
    lastRenderedCap = highestContiguousFrame;
    renderFilmFrame(exactFrame);
  }

  // پارالاکس موس (فقط با حرکت موس کاربر، نه خودکار) — Lissajous Camera Float
  // حذف شد (تاب ±۱۴px کل قاب، «جلو-عقب» خوانده می‌شد).
  smoothMouseX += (mouseOffsetX - smoothMouseX) * 0.08;
  smoothMouseY += (mouseOffsetY - smoothMouseY) * 0.08;

  const totalX = smoothMouseX;
  const totalY = smoothMouseY;

  canvas.style.transform = `translate3d(${totalX.toFixed(1)}px, ${totalY.toFixed(1)}px, 0) scale(1.06)`;

  // همگام‌سازی پارالاکس موس ضرب ۴ با کانوس (فقط دسکتاپ): بدون این، با حرکت
  // موس قاب‌های نئونی ±۱۴px جابه‌جا می‌شوند ولی کارت‌ها ثابت می‌مانند.
  if (beat4Grid) {
    beat4Grid.style.transform = (window.innerWidth >= 900)
      ? `translate3d(${totalX.toFixed(1)}px, ${totalY.toFixed(1)}px, 0)`
      : '';
  }

  // همگام‌سازی ظاهر شدن کارت‌های هر ضرب — وقتی فریم عوض شده (قدم ۴) یا
  // ورود به پرده‌ی دوم عوض شده؛ وگرنه بازگشت به انتهای فیلم (فریم ثابت ۱۱۹
  // و intoActTwo از ۱ به ۰) همگام‌سازی را هرگز اجرا نمی‌کند و ضرب ۵ برای
  // همیشه پنهان و inert می‌ماند — باگی که برش ۷ در تست برگشت گرفت.
  const actTwoDirty = Math.abs(intoActTwo - lastIntoActTwo) >= 0.01;
  if (frameDirty || actTwoDirty) {
    lastIntoActTwo = intoActTwo;
  overlays.forEach((ov, i) => {
    const w = BEAT_WINDOWS[i];
    if (smoothP < w.start || (smoothP > w.end && i < BEAT_WINDOWS.length - 1) || intoActTwo > 0.5) {
      ov.style.opacity = '0';
      ov.classList.remove('is-interactive');
      // قدم ۴ — کارت‌های نامرئی از دسترس کیبورد هم خارج می‌شوند (inert)
      ov.inert = true;
      ov.style.visibility = 'hidden';
      return;
    }

    const fadeIn = (i === 0) ? 1 : norm(smoothP, w.start, w.peakStart);
    const fadeOut = (i === BEAT_WINDOWS.length - 1) ? 1 : (1 - norm(smoothP, w.peakEnd, w.end));
    const alphaVal = Math.min(fadeIn, fadeOut);

    // پرواز سه‌بعدی: ورود از عمق (Z منفی + چرخش X) و خروج به‌سمت دوربین؛
    // پخش Y در خروج همان درس دموی بچ ۲۷ است (فقط Z کافی نیست). در اوج
    // (enter=exit=0) تبدیل همانی است تا قفل قاب ضرب ۴ سر جایش بماند.
    const enterProgress = 1 - fadeIn;
    const exitProgress = 1 - fadeOut;
    const shiftY = enterProgress * 28 - exitProgress * 48;
    const shiftZ = enterProgress * -200 + exitProgress * 150;
    const tiltX = enterProgress * 16 - exitProgress * 12;

    ov.style.opacity = alphaVal.toFixed(3);
    ov.style.transform = (i === 4 && window.innerWidth >= 900)
      ? `translate3d(0, ${shiftY.toFixed(1)}px, 0)`
      : `translate3d(0, ${shiftY.toFixed(1)}px, ${shiftZ.toFixed(1)}px) rotateX(${tiltX.toFixed(2)}deg)`;
    ov.classList.toggle('is-interactive', alphaVal > 0.55);
    ov.inert = false;
    ov.style.visibility = '';
  });
  }

  window.requestAnimationFrame(tick);
}

/* =====================================================================
   قدم ۳ + بچ ۲۷ — تعامل با اشاره (فقط با حرکت کاربر، نه خودکار):
   - کج‌شدن کارت‌های ضرب ۴ به‌سمت انگشت + برق نور دنبال انگشت
   - افشای شیر روی کارت عکس: خاکستریِ مرده زیر، رنگیِ زنده با دایره‌ی انگشت
   ===================================================================== */
if (!reducedMotion) {
  const beat4Cards = Array.from(document.querySelectorAll('[data-beat="4"] .work-showcase-card'));
  beat4Cards.forEach((card) => {
    const moveTilt = (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
      const px = x / r.width - 0.5;
      const py = y / r.height - 0.5;
      card.style.transform = 'rotateY(' + (px * 16).toFixed(2) + 'deg) rotateX(' + (-py * 14).toFixed(2) + 'deg)';
      card.style.setProperty('--sx', (x / r.width * 100).toFixed(1) + '%');
      card.style.setProperty('--sy', (y / r.height * 100).toFixed(1) + '%');
      card.classList.add('tilt-on');
    };
    const endTilt = () => {
      card.style.transform = '';
      card.classList.remove('tilt-on');
    };
    card.addEventListener('pointermove', moveTilt);
    card.addEventListener('pointerdown', moveTilt);
    card.addEventListener('pointerleave', endTilt);
    card.addEventListener('pointerup', endTilt);
    card.addEventListener('pointercancel', endTilt);
  });

  const photoCard = document.querySelector('[data-beat="4"] .card-photo');
  const photoImg = photoCard && photoCard.querySelector('.poster-img');
  if (photoCard && photoImg) {
    photoImg.classList.add('reveal-dead');
    const living = photoImg.cloneNode(false);
    living.classList.add('reveal-living');
    living.setAttribute('aria-hidden', 'true');
    living.style.clipPath = 'circle(64px at 50% 42%)';
    photoCard.appendChild(living);
    const ring = document.createElement('div');
    ring.className = 'reveal-ring';
    ring.style.left = '50%';
    ring.style.top = '42%';
    photoCard.appendChild(ring);
    const moveReveal = (e) => {
      const r = photoCard.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
      const cx = Math.max(0, Math.min(r.width, x));
      const cy = Math.max(0, Math.min(r.height, y));
      living.style.clipPath = 'circle(90px at ' + cx.toFixed(0) + 'px ' + cy.toFixed(0) + 'px)';
      ring.style.left = cx.toFixed(0) + 'px';
      ring.style.top = cy.toFixed(0) + 'px';
    };
    const endReveal = () => {
      living.style.clipPath = 'circle(64px at 50% 42%)';
      ring.style.left = '50%';
      ring.style.top = '42%';
    };
    photoCard.addEventListener('pointermove', moveReveal);
    photoCard.addEventListener('pointerdown', moveReveal);
    photoCard.addEventListener('pointerleave', endReveal);
    photoCard.addEventListener('pointerup', endReveal);
    photoCard.addEventListener('pointercancel', endReveal);
  }
}

window.requestAnimationFrame(tick);

})();
