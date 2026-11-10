/* =====================================================================
   Master Film engine — قدم ۱ (اولویت ۱ آرگون): فیلم در کل صفحه پخش می‌شود.
   این فایل رونوشت masterfilm.js است با سه تغییر موتور (بقیه عیناً همان است):
   (۱) پیشرفت از اسکرول سراسری صفحه با نگاشت تکه‌ایِ اندازه‌گیری‌شده
   (measureTimeline/mapFrame) به‌جای مستطیل کانتینر ۷۵۰vh؛
   (۲) پنجره‌های ضرب‌ها بر حسب فریم (۰–۱۱۹)؛
   (۳) کم‌نور شدن بوم روی سکشن‌ها (plateauDim) به‌جای intoActTwo.
   هیچ نوسان خودکاری نیست — «میکرودریفت» آرگون حذف شده است.
   ===================================================================== */
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
let lastPillText = ''; // قدم ۴: pill فقط وقتی متن عوض شد نوشته می‌شود

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
    const pillText = `SEQ ${seqNum} • FRAME ${String(idxA + 1).padStart(3, '0')} / ${TOTAL_FRAMES}`;
    if (pillText !== lastPillText) { statusPill.textContent = pillText; lastPillText = pillText; }
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
const finaleSection = document.getElementById('studio-finale') || document.getElementById('contact');
const progressLine = document.getElementById('progressLine');
const overlays = Array.from(document.querySelectorAll('.beat-overlay'));
// ضرب ۴: گرید دوتایی کارت‌ها باید پارالاکس موس را مثل کانوس دنبال کند تا
// کارت‌ها با قاب‌های نئونی فیلم هم‌تراز بمانند (فقط دسکتاپ).
const beat4Grid = document.querySelector('[data-beat="4"] .dual-works-grid');

// قدم ۱ — BEAT_WINDOWS بر حسب فریم (۰ تا ۱۱۹)، نه smoothP: اورلی‌ها به
// فریم‌های فیلم گره خورده‌اند، نه به کسر اسکرول. هر ضرب پیش از رسیدن سکشن
// همتایش محو می‌شود تا کارت ضرب روی سکشنِ هم‌نامش ننشیند (ضرب ۱ پیش از ریل،
// ضرب ۲ پیش از فیلم‌استریپ، ضرب ۵ پیش از فینال).
const BEAT_WINDOWS = [
  { start: 0,  peakStart: 0,   peakEnd: 7,   end: 10 }, // ضرب ۰: عنوان تولد نور (۲۰۲۶-۱۱-۱۰ دور دوم: سواپ ترتیبی ۰→۱ — محو ۷→۱۰ پیش از ورود ضرب ۱ تمام می‌شود)
  { start: 10, peakStart: 13,  peakEnd: 19,  end: 23 }, // ضرب ۱: سایت ساخته می‌شود — ورود ۱۰→۱۳ (پس از محو کامل ضرب ۰)؛ پایان در فریم ۲۳ (۲۰۲۶-۱۱-۰۹: باگ زنده؛ محو شدن باید پیش از پلاتوی اول تمام شود، نه وسط آن)
  { start: 27, peakStart: 32,  peakEnd: 43,  end: 47 }, // ضرب ۲: ویدیو ساخته می‌شود
  { start: 50, peakStart: 56,  peakEnd: 68,  end: 72 }, // ضرب ۳: شیر سیاه (فریم ۴۹ تا ۷۲)
  { start: 80, peakStart: 86,  peakEnd: 90,  end: 93 }, // ضرب ۴: عکس و اپ (۲۰۲۶-۱۱-۰۹: R1؛ دم کوتاه شد تا سایه‌اش روی پروسس نماند)
  { start: 98, peakStart: 103, peakEnd: 117, end: 119 } // ضرب ۵: نوبت ایده‌ی توست
];

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const norm = (v, a, b) => clamp((v - a) / Math.max(0.0001, b - a), 0, 1);

/* =====================================================================
   قدم ۱ — نگاشت تکه‌ای اسکرول سراسری → فریم (جایگزین پیشرفت کانتینری):
   مرزها از اندازه‌های واقعی صفحه خوانده می‌شوند، نه از کسرهای ثابت آرگون.
   سکشن‌ها (plateau) فریم را ۱–۲ فریم جلو می‌برند؛ باندهای خالی (film)
   سکانس‌ها را پخش می‌کنند. فریم تابعی از scrollY است — هیچ تایمری نیست.
   ===================================================================== */
let p1Breakpoints = [[0, 0], [1, TOTAL_FRAMES - 1]]; // [scrollY, frame]
let p1Plateaus = []; // [{start, end}] به ترتیب scrollY
let p1FinaleTop = 0; // کش موقعیت فیناله — خواندن rect در هر فریم حذف شد (قدم ۲)

/* 2026-11-10 دور دوم — گیت رکت‌به‌رکت (جایگزین گیت کل‌ویوپورت دور اول):
   گیت از هم‌پوشانیِ رکتِ خودِ پنلِ اورلی (pill + title + card) با رکت‌های
   محتوای واقعی (عناصر متن‌دار/تصویری سکشن‌ها) محاسبه می‌شود، نه پوشش کل
   ویوپورت. رکت‌های محتوا در measureTimeline ساخته می‌شوند (زنجیره‌ی
   offsetTop — مصون از ترنسفورم P2) و در doc ذخیره می‌شوند؛ رکت پنل در هر
   تیک از getBoundingClientRect خوانده می‌شود (موقعیت واقعیِ نقاشی‌شده،
   شامل shiftY فعلی). حاشیه‌ی بالا ۱۶px کشش ورود P2 را پوشش می‌دهد؛
   پایین بدون حاشیه است (دلیل در p1BuildFineBlocks). رمپ تند ۲٪→۵٪ است
   تا معیار «α>۰٫۰۵ در حالی که هم‌پوشانی > ۵٪ = ۰ فریم» دقیقاً برقرار باشد
   (با رمپ ۴٪/۱۸٪ دور اول، ۲–۴ نمونه در هر ضرب نقض می‌شد — سویپ کامل
   ۷۳۵ نمونه‌ای ۴۱۲×۹۱۵، ۲۰۲۶-۱۱-۱۰). رکت‌های محتوا ادغام نمی‌شوند؛
   union در هر گیت حساب می‌شود تا فاصله‌ی خالی بین عناصر، محتوا شمرده نشود.
   ⚠️ اصلاح ۲۰۲۶-۱۱-۱۰ (سویپ زنده: ضرب ۲، ۹ نقض — همه از IMG .kg-bg):
   offsetTop برای محتوای داخل کانتینرِ sticky (مانند .kg-sticky فصل‌ها،
   .fs-stage فیلم‌استریپ، .sr-sticky، .lion-curtain) با اسکرول جابه‌جا
   می‌شود — رکت کش‌شده در doc ثابت نیست و گیت نسبت به آن کور می‌ماند
   (kg-bg در build در [۳۳۴۸،۴۴۰۰] کش شد ولی در y=۵۹۹۰ واقعاً در
   [۵۶۵۴،۶۷۲۷] نقاشی می‌شود — ۲۳۷۹px اختلاف = دقیقاً kgSpan). پس
   عناصری که جدِ sticky دارند در p1StickyEls نگه داشته می‌شوند و رکتشان
   در هر تیک زنده خوانده می‌شود (کش بر اساس scrollY واقعی — هر ۶ گیتِ
   یک تیک یک بار می‌خوانند). رکت زنده دقیق است و حاشیه نمی‌خواهد. */
const P1_CONTENT = ['#services', '#portfolio', '#lionPanels', '#videos', '#academy',
  '#lab', '.lab-trigger-wrap', '#process', '#faq', '#pricing', '#stats',
  '#lionManifesto', '#about', '#contact', '.duo-wrap', '.lion-curtain-wrap'];
const P1_CONTENT_ELS = 'h1,h2,h3,h4,p,li,a,button,img,video,.kg-num,.kg-giant';
let p1FineBlocks = []; // [top, bottom] doc px — sorted by top (فقط محتوای غیر-sticky)
let p1StickyEls = []; // المنت‌های داخل کانتینر sticky — رکت زنده در گیت
let p1StickyCache = { y: -1, rects: [] }; // کش بر اساس scrollY واقعی
let lastOvY = -1;
const p1Panels = overlays.map(function (ov) { return ov.querySelector('.beat-panel,.beat-panel-wide'); });

function p1IsSticky(el) {
  let n = el;
  while (n) {
    if (getComputedStyle(n).position === 'sticky') return true;
    n = n.parentElement;
  }
  return false;
}

function p1BuildFineBlocks() {
  const raw = [];
  p1StickyEls = [];
  p1StickyCache = { y: -1, rects: [] };
  P1_CONTENT.forEach(function (sel) {
    const sec = document.querySelector(sel);
    if (!sec) return;
    sec.querySelectorAll(P1_CONTENT_ELS).forEach(function (el) {
      if (el.closest('.beat-overlay,.film-stage')) return;
      if (el.offsetHeight < 4 || el.offsetWidth < 4) return;
      // محتوای sticky: رکت layout (offsetTop) با اسکرول جابه‌جا می‌شود و
      // کش‌کردنش گیت را کور می‌کند — المنت نگه داشته می‌شود تا رکتش در
      // گیت زنده خوانده شود (kg-bg، کارت‌های فصل، فیلم‌استریپ، ...).
      if (p1IsSticky(el)) { p1StickyEls.push(el); return; }
      const t = p1DocTop(el);
      // حاشیه‌ی بالا ۱۶px: کشش واقعیِ ورود P2 (محتوای در حال ورود تا ۱۲px
      // بالاتر از layout نقاشی می‌شود — اندازه‌گیری زنده‌ی دکمه‌ی lab-trigger
      // در y ‏۱۱۸۰۰–۱۲۷۰۰؛ با +۴px حاشیه‌ی امن). حاشیه‌ی پایین صفر است:
      // محتوای ورودی (که گیت را می‌بندد) در فاز ورود کوچک‌تر از layout
      // نقاشی می‌شود — یعنی layout خودش محافظه‌کارانه است؛ حاشیه‌ی بیشتر
      // فقط اسپن اوج را می‌خورد (با ‎-۳۲px، اسپن ضرب ۴ به ۲۳۲px می‌رسید —
      // زیر کف ۲۴۰px؛ با ‎-۱۶px به ~۲۴۸px برمی‌گردد).
      raw.push([t - 16, t + el.offsetHeight]);
    });
  });
  raw.sort(function (a, b) { return a[0] - b[0]; });
  p1FineBlocks = raw;
}
function p1RectGate(i, y, rect) {
  const panel = p1Panels[i];
  if (!panel) return 1;
  const r = rect || panel.getBoundingClientRect();
  if (!r || r.height < 4) return 1;
  const top = y + r.top, bot = y + r.bottom;
  const ivs = [];
  for (let k = 0; k < p1FineBlocks.length; k++) {
    const b = p1FineBlocks[k];
    if (b[0] > bot) break; // sorted — از اینجا به بعد هم‌پوشانی نیست
    if (b[1] > top) ivs.push([Math.max(b[0], top), Math.min(b[1], bot)]);
  }
  // رکت‌های زنده‌ی محتوای sticky — کش بر اساس scrollY واقعی (نه y
  // فرضیِ ریپورت): هر ۶ گیتِ یک تیک یک بار می‌خوانند؛ در ریپورت هم یک
  // بار. توجه: در ریپورت (y فرضی) این رکت‌ها در موقعیت فعلیِ صفحه
  // فریز می‌شوند — پس اسپن ریپورت برای ضرب ۲ (که kg-bg در fade-in
  // گیت را می‌بندد) ~۵۰px بیشتر از واقعیت است؛ سویپ زنده مرجع است.
  const sy = window.scrollY;
  if (sy !== p1StickyCache.y) {
    p1StickyCache.y = sy;
    p1StickyCache.rects = p1StickyEls.map(function (el) {
      const q = el.getBoundingClientRect();
      return [sy + q.top, sy + q.bottom];
    }).filter(function (b) { return b[1] - b[0] >= 4; });
  }
  for (let k = 0; k < p1StickyCache.rects.length; k++) {
    const b = p1StickyCache.rects[k];
    if (b[1] > top && b[0] < bot) ivs.push([Math.max(b[0], top), Math.min(b[1], bot)]);
  }
  ivs.sort(function (a, b) { return a[0] - b[0]; });
  let cov = 0, cs = -1, ce = -1;
  for (let k = 0; k < ivs.length; k++) {
    const s = ivs[k][0], e = ivs[k][1];
    if (cs < 0) { cs = s; ce = e; }
    else if (s <= ce) { if (e > ce) ce = e; }
    else { cov += ce - cs; cs = s; ce = e; }
  }
  if (cs >= 0) cov += ce - cs;
  const frac = cov / Math.max(1, r.height);
  return 1 - clamp((frac - 0.02) / 0.03, 0, 1); // <=2%: 1، >=5%: 0
}

/* 2026-11-10 ghost-stretch fix قدم ۲: زنجیره‌ی offsetTop جای
   getBoundingClientRect — زیر ترنسفورم P2، rect غلط می‌شود؛ offsetTop
   مصون از ترنسفورم است. */
function p1DocTop(el) { var t = 0, n = el; while (n) { t += n.offsetTop || 0; n = n.offsetParent; } return t; }
function p1RectTop(el) { return el ? p1DocTop(el) : null; }
function p1RectBottom(el) { return el ? p1DocTop(el) + el.offsetHeight : null; }
// بازه‌ی سکشن: [min(top, bottom−vh), max(top, bottom−vh)] — برای سکشن بلند
// «بالا تا پایینِ کامل» و برای سکشن کوتاه «کاملاً دیده‌شدن» را می‌دهد.
function p1PlateauRange(topEl, bottomEl) {
  const vh = window.innerHeight;
  const top = p1RectTop(topEl);
  const bottom = p1RectBottom(bottomEl);
  if (top === null || bottom === null) return null;
  const a = Math.min(top, bottom - vh);
  const b = Math.max(top, bottom - vh);
  return { start: a, end: b };
}

function measureTimeline() {
  const vh = window.innerHeight;
  const maxY = Math.max(1, document.documentElement.scrollHeight - vh);
  const services = document.getElementById('services');
  const lionPanels = document.getElementById('lionPanels');
  const videos = document.getElementById('videos');
  const labWrap = document.querySelector('.lab-trigger-wrap');
  const processSec = document.getElementById('process');
  const duoWrap = document.querySelector('.duo-wrap');
  const finale = document.getElementById('studio-finale');
  const r3 = document.getElementById('runway-seq4');

  const p1 = p1PlateauRange(services, lionPanels || document.getElementById('portfolio'));
  const p2 = p1PlateauRange(videos, videos);
  const p3 = p1PlateauRange(labWrap, processSec);
  const p4 = p1PlateauRange(duoWrap, finale);
  const r3Top = p1RectTop(r3);
  if (!p1 || !p2 || !p3 || !p4 || r3Top === null) return; // هنوز رندر کامل نشده؛ اندازه‌گیری بعدی

  p1Plateaus = [p1, p2, p3, p4];
  // نقاط شکست (scrollY → frame)، یکنوا در هر دو محور:
  const pts = [
    [0, 0],
    [p1.start, 23],
    [p1.end, 25],
    [p2.start, 47],
    [p2.end, 48],
    [r3Top, 71],
    [p3.start, 95],
    [p3.end, 96],
    [p4.start, 119],
    [maxY, 119]
  ];
  // اگر اندازه‌ای غیرمنتظره شد، یکنوایی فریم را حفظ کن — نگاشت هرگز نباید
  // به عقب برگردد. نقطه‌های هم‌ارتفاع مجازند (پله‌ی ۱ فریمی نامحسوس).
  pts.sort((a, b) => a[0] - b[0]);
  const clean = [];
  let lastF = -1;
  for (const pt of pts) {
    if (pt[1] < lastF) continue;
    clean.push(pt);
    lastF = pt[1];
  }
  if (clean.length >= 2) p1Breakpoints = clean;
  p1BuildFineBlocks();
  p1FinaleTop = finaleSection ? p1DocTop(finaleSection) : 0;
  window.__p1Timeline = { breakpoints: p1Breakpoints, plateaus: p1Plateaus, measuredAt: Date.now() };
}

function mapFrame(scrollY) {
  const pts = p1Breakpoints;
  const y = clamp(scrollY, 0, pts[pts.length - 1][0]);
  let frame = pts[pts.length - 1][1];
  let mode = 'film';
  for (let i = 0; i < pts.length - 1; i++) {
    const y0 = pts[i][0], f0 = pts[i][1];
    const y1 = pts[i + 1][0], f1 = pts[i + 1][1];
    if (y >= y0 && y <= y1) {
      const t = (y - y0) / Math.max(0.0001, y1 - y0);
      frame = f0 + t * (f1 - f0);
      break;
    }
  }
  for (const p of p1Plateaus) {
    if (y >= p.start && y <= p.end) { mode = 'plateau'; break; }
  }
  return { frame, mode };
}

// کم‌نور شدن بوم روی سکشن‌ها (خوانایی): ۱ در سکشن، ۰ در باند فیلم، با
// شیب ۳۲۰ پیکسلی در مرزها تا محو شدن ناگهانی نباشد. (۲۰۲۶-۱۱-۰۹ گوست:
// شیب ۱۲۰px بوم را دقیقاً در بدترین نقاط گوست (۸۲۶ و ۱۱۴۲۱، درست پیش از
// شروع پلاتو) روی ۱٫۰ نگه می‌داشت؛ ۳۲۰px تاریکی را زودتر وارد می‌کند.)
function plateauDimAt(scrollY) {
  let dim = 0;
  for (const p of p1Plateaus) {
    const ramp = 320;
    let d = 0;
    if (scrollY >= p.start - ramp && scrollY <= p.end + ramp) {
      d = 1;
      if (scrollY < p.start) d = (scrollY - (p.start - ramp)) / ramp;
      else if (scrollY > p.end) d = ((p.end + ramp) - scrollY) / ramp;
    }
    dim = Math.max(dim, clamp(d, 0, 1));
  }
  return dim;
}

let targetP = 0;
let smoothP = 0.0;
let lastTimeMs = performance.now();

// حداکثر سرعت مجاز ورق خوردن فیلم: ۲۸ فریم در ثانیه (یعنی کل ۱۲۰ فریم حداقل ۴.۲ ثانیه طول می‌کشد و هرگز نمی‌پرد)
const MAX_PROGRESS_SPEED_PER_SEC = 28 / TOTAL_FRAMES;
// ضریب نرمی نمایی بر حسب زمان (معادل حس سنگین و کره‌ای ORYZO)
const SMOOTH_LAMBDA = 7.5;
// ۲۰۲۶-۱۱-۰۹ فیکس فلینگ (کشش): آستانه‌ی اسنپ فلینگ بر حسب فریم — وقتی
// اختلاف فریم هدف و فریم نرم‌شده از این بیشتر شود، اختلاف تا همین آستانه
// بسته می‌شود (نه تا صفر): فیلم با تأخیر ثابت نیم‌فریمی ۱:۱ دنبال انگشت
// می‌رود، بدون دندانه و بدون پرش تک‌تیکی. اسکرول آهسته به این آستانه
// نمی‌رسد (تاپ‌آپ‌هایش زیر ۰٫۱ فریم در تیک‌اند)، پس حس نرمش دست نخورده
// می‌ماند. باریک‌ترین محوها ۲–۳ فریم‌اند، پس ۰٫۵ فریم خطای آلفای اورلی را
// زیر ~۰٫۲ نگه می‌دارد.
const SNAP_FRAMES = 0.5;

let mouseOffsetX = 0;
let mouseOffsetY = 0;
let smoothMouseX = 0;
let smoothMouseY = 0;

// قدم ۴ — وضعیت dirty-check رندر: وقتی فریم ثابت است و سکانس تازه‌ای هم
// لود نشده، رندر کانوس + همگام‌سازی کارت‌ها رد می‌شود
let lastRenderedFrame = -1;
let lastRenderedCap = -1;

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
  // قدم ۱ — پیشرفت از اسکرول سراسری صفحه (نگاشت تکه‌ای روی فریم، §۳ پلن):
  // فیلم دیگر در یک کانتینر ۷۵۰vh نمی‌نشیند؛ کل صفحه خط زمانی فیلم است.
  const mapped = mapFrame(window.scrollY);
  const targetFrame = mapped.frame;
  // کم‌نور شدن بوم روی سکشن‌ها (خوانایی) + بازگشت حلقه‌ی طلایی در فینال.
  const plateauDim = plateauDimAt(window.scrollY);
  // قدم ۲: موقعیت فیناله کش‌شده (مصون از ترنسفورم) — به‌جای rect در هر فریم.
  let finaleRebound = 0;
  if (finaleSection) {
    finaleRebound = clamp(1 - ((p1FinaleTop - window.scrollY) / vh), 0, 1);
  }
  const baseDim = 1 - plateauDim * 0.78;
  canvas.style.opacity = clamp(baseDim + finaleRebound * 0.78, 0.22, 1).toFixed(3);

  // کم‌رنگ شدن خودکار نارنگی در موبایل هنگام اسکرول فعال فیلم
  document.body.classList.toggle('is-scrubbing-film', mapped.mode === 'film');

  // فیلم فقط با اسکرول حرکت می‌کند — هیچ نوسان خودکار نیست (حکم حامد ۲۰۲۶-۱۱-۰۶:
  // «جلو-عقب» خوانده می‌شد). Auto-Intro Glide حذف شد: در بالای صفحه فریم ۰
  // ثابت می‌ماند تا کاربر اسکرول کند. «میکرودریفت» آرگون در سکشن‌ها هم حذف
  // شد — در سکشن فریم فقط همان‌قدر جلو می‌رود که نگاشت تکه‌ای می‌گوید
  // (۱–۲ فریم در کل سکشن) و هرگز با تایمر حرکت نمی‌کند.
  targetP = clamp(targetFrame / (TOTAL_FRAMES - 1), 0, 1);

  // محاسبه گام حرکت با سقف سرعت (Velocity Clamp) تا حتی در پرش‌های اسکرول هم تک‌تک فریم‌ها دیده شوند
  const alpha = 1 - Math.exp(-SMOOTH_LAMBDA * dt);
  const desiredStep = (targetP - smoothP) * alpha;
  const maxStep = MAX_PROGRESS_SPEED_PER_SEC * dt;
  const clampedStep = clamp(desiredStep, -maxStep, maxStep);

  smoothP = clamp(smoothP + clampedStep, 0, 1);

  // ۲۰۲۶-۱۱-۰۹ فیکس فلینگ (کشش): سقف ۲۸ فریم/ثانیه + λ=۷٫۵ فیلم را در
  // فلینگ ۹–۱۵ فریم عقب انگشت نگه می‌داشت (انحراف: «هر فریم دیده شود»
  // در P1:442 — در سرعت فلینگ چشم تک‌تک فریم‌ها را نمی‌بیند و خواست حامد
  // برای اسکرول بدون کشش بر آن می‌چربد؛ در اسکرول آهسته سقف هنوز حاکم
  // است و فریمی رد نمی‌شود). اگر اختلاف از آستانه بیشتر شد، آن را تا
  // دقیقاً همان آستانه ببند — نه تا صفر — تا فیلم با تأخیر ثابت
  // نیم‌فریمی با همان سرعت هدف جلو برود، بدون جهش.
  const snapGap = targetP - smoothP;
  const snapTol = SNAP_FRAMES / (TOTAL_FRAMES - 1);
  if (Math.abs(snapGap) > snapTol) {
    smoothP = clamp(targetP - Math.sign(snapGap) * snapTol, 0, 1);
  }

  // پیش‌بارگذاری تهاجمی‌تر بر اساس فریم هدف (به محض حرکت انگشت، نه بعد از رسیدن smoothP)
  if (targetFrame > 1) loadSequenceChunk(2);
  if (targetFrame > 20) loadSequenceChunk(3);
  if (targetFrame > 40) loadSequenceChunk(4);

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

  // همگام‌سازی ظاهر شدن کارت‌های هر ضرب — پنجره‌ها حالا بر حسب فریم‌اند
  // (قدم ۱). تنها ورودی همگام‌سازی فریم است، پس شرط همان frameDirty است؛
  // تغییر اندازه‌ی پنجره هم با forceDirty (روی resize) همگام‌سازی را دوباره
  // اجرا می‌کند (قانون translate-only ضرب ۴ به عرض پنجره وابسته است).
  const yNow = window.scrollY;
  if (frameDirty || yNow !== lastOvY) {
  lastOvY = yNow;
  overlays.forEach((ov, i) => {
    const w = BEAT_WINDOWS[i];
    const fadeIn = (i === 0) ? 1 : norm(exactFrame, w.start, w.peakStart);
    // قدم ۱: ضرب آخر هم مثل بقیه محو می‌شود — در نسخه‌ی دو پرده‌ای fadeOut
    // ضرب ۵ همیشه ۱ بود و intoActTwo پنهانش می‌کرد؛ در P1 آن شرط نیست، پس
    // اگر اینجا ۱ بماند هاب پورتال برای همیشه روی فینال می‌ماند (باگی که
    // اسکرین‌شات ته صفحه در تست P1 گرفت: ضرب ۵ با opacity 1 سر جایش مانده بود).
    const fadeOut = 1 - norm(exactFrame, w.peakEnd, w.end);
    const alphaVal = Math.min(fadeIn, fadeOut, i === 0 ? 1 : p1RectGate(i, yNow));
    if (exactFrame < w.start || (exactFrame > w.end && i < BEAT_WINDOWS.length - 1) || alphaVal <= 0.02) {
      ov.style.opacity = '0';
      ov.classList.remove('is-interactive');
      // قدم ۴ — کارت‌های نامرئی از دسترس کیبورد هم خارج می‌شوند (inert)
      ov.inert = true;
      ov.style.visibility = 'hidden';
      return;
    }

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

/* قدم ۱ — اندازه‌گیری خط زمانی: مرزها به رندر واقعی صفحه وابسته‌اند
   (app.js سکشن‌ها را پر می‌کند و ارتفاعشان بعد از لود عوض می‌شود)، پس
   اندازه‌گیری چند بار تکرار می‌شود؛ روی resize هم همگام‌سازی کارت‌ها با
   forceDirty دوباره اجرا می‌شود. */
measureTimeline();
document.addEventListener('DOMContentLoaded', measureTimeline);
window.addEventListener('load', measureTimeline);
/* ۲۰۲۶-۱۱-۰۹ باگ زنده ۲: تغییر ارتفاع پنجره از پنهان/نمایان شدن نوار ابزار
   موبایل وسط اسکرول نباید خط زمانی را دوباره اندازه بگیرد — فقط تغییر
   واقعی عرض (چرخش، تقسیم صفحه) اندازه‌گیری دوباره می‌خواهد. */
var lastP1Width = window.innerWidth;
var p1ResizeTimer = 0;
window.addEventListener('resize', () => {
  if (window.innerWidth !== lastP1Width) {
    lastP1Width = window.innerWidth;
    measureTimeline(); lastRenderedFrame = -1;
    return;
  }
  // تغییر فقط-ارتفاع (نوار ابزار کروم موبایل وسط اسکرول): اندازه‌گیری با
  // debounce — نه نادیده (کهنه می‌شود)، نه heal هم‌زمان (می‌پرد).
  clearTimeout(p1ResizeTimer);
  p1ResizeTimer = setTimeout(function () { measureTimeline(); lastRenderedFrame = -1; }, 120);
});
document.addEventListener('h2:grids', measureTimeline);
/* 2026-11-10 ghost-stretch fix قدم ۲: تایمرهای ثابت +۸۰۰/+۲۰۰۰ حذف —
   ResizeObserver با debounce ‏۱۲۰ms جای آن‌ها را می‌گیرد: هر جابه‌جایی
   واقعی لی‌اوت (پر شدن سکشن‌ها توسط app.js) خودش اندازه‌گیری را صدا
   می‌زند. */
if ('ResizeObserver' in window) {
  var p1ROTimer = 0;
  var p1RO = new ResizeObserver(function () {
    clearTimeout(p1ROTimer);
    p1ROTimer = setTimeout(function () { measureTimeline(); lastRenderedFrame = -1; }, 120);
  });
  p1RO.observe(document.documentElement);
}
document.querySelectorAll('[data-lang]').forEach((b) => {
  b.addEventListener('click', () => setTimeout(measureTimeline, 400));
});

/* 2026-11-10 دور دوم — گزارش تشخیصی ضرب‌ها با معیار px (جایگزین max-alpha
   دور اول که اوج تک‌نقطه‌ای را پنهان می‌کرد): در کنسول __p1BeatReport()
   را اجرا کن؛ هر ضرب اسپن α≥۰٫۹۵ (px اسکرول) + بازه‌اش را می‌دهد. رکت پنل
   در حالت اوج (ترنسفورم خنثی) خوانده می‌شود؛ shiftY هنگام فید (±۲۸/‎-۴۸px)
   در آن نیست — مدرک قطعی سویپ زنده است، نه این گزارش. */
window.__p1BeatReport = function () {
  // رکت اوج هر پنل: ترنسفورم تیک را هم‌زمان خنثی می‌کنیم (بدون paint وسط کار —
  // همان تسک سینکرون) تا رکتِ بدون ترنسفورم خوانده شود؛ وگرنه رکتِ ضرب‌های
  // بیرون از پنجره‌شان همان translate3d(0,24px,0) اولیه‌ی CSS است (+۲۴px).
  const peakRects = overlays.map(function (ov, i) {
    const panel = p1Panels[i];
    if (!panel) return null;
    const oldT = ov.style.transform;
    ov.style.transform = 'translate3d(0,0,0)';
    const r = panel.getBoundingClientRect();
    ov.style.transform = oldT;
    return r && r.height >= 4 ? { top: r.top, bottom: r.bottom, height: r.height } : null;
  });
  const maxY = document.documentElement.scrollHeight - window.innerHeight;
  const res = BEAT_WINDOWS.map(function () { return { max: 0, px95: 0, px50: 0, y95a: -1, y95b: -1 }; });
  for (let y = 0; y <= maxY; y += 8) {
    const f = mapFrame(y).frame;
    BEAT_WINDOWS.forEach(function (w, i) {
      const a = Math.min(norm(f, w.start, w.peakStart), 1 - norm(f, w.peakEnd, w.end), i === 0 ? 1 : p1RectGate(i, y, peakRects[i]));
      if (f < w.start || f > w.end) return;
      const r = res[i];
      if (a > r.max) r.max = a;
      if (a >= 0.95) { r.px95 += 8; if (r.y95a < 0) r.y95a = y; r.y95b = y; }
      if (a >= 0.5) r.px50 += 8;
    });
  }
  return res.map(function (r, i) {
    const span = r.y95a < 0 ? '—' : ('[' + r.y95a + '..' + r.y95b + ']');
    return 'beat ' + i + ': max ' + r.max.toFixed(2) + ' | px>=0.95: ' + r.px95 + ' ' + span + ' | px>=0.5: ' + r.px50;
  });
};

/* 2026-11-10 دور دوم — هلپرهای دیباگ P1 بیرون از IIFE (بازرس §۷): */
window.__p1Debug = {
  p1RectGate: p1RectGate,
  p1FineBlocks: function () { return p1FineBlocks; },
  p1StickyEls: function () { return p1StickyEls; },
  mapFrame: mapFrame,
  BEAT_WINDOWS: BEAT_WINDOWS,
  p1BuildFineBlocks: p1BuildFineBlocks
};

window.requestAnimationFrame(tick);

})();
