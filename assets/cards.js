/* Cards pilot layer v4 — STACK+RING (2026-10-30): the v2 reference SYSTEM
   adapted to OUR design. Hamed confirmed with his own screenshots: "go ahead
   with this very system, just build it clean so it matches our site, glassy
   cards, our own model." New layer only, zero edits to app.js/copy-data.js.
   REFERENCE SYSTEM (figmaformotion.com/v2 + Hamed's mobile screenshots):
   - STACK: deck pinned in view; scroll-driven tilt-and-discard — top card
     rotates clockwise (~12-16deg) and slides up-right off the stack; the
     card underneath straightens and scales up to front. NO page-flip (no
     card back ever shown), no fade, no crossfade.
   - RING: thumbnails disperse into a ring around a central pill; the big
     center word changes as scrolling continues; then the ring scrolls away.
   - Everything scroll-driven, never autoplay/buttons.
   OUR ADAPTATION: site aurora stays the scene; GLASS cards/tiles; emerald /
   cyan accents; our portfolio content; our client-type words. */

(function () {
  var section = document.getElementById("services-swap");
  if (!section) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- stack items: our portfolio, existing light previews only ---- */
  var ITEMS = [
    { id: "ramin-berger", video: "assets/previews/ramin-berger.mp4", poster: "assets/previews/ramin-berger.jpg" },
    { id: "coffee-nozhe",  video: "assets/previews/coffee-nozhe.mp4",  poster: "assets/previews/coffee-nozhe.jpg" },
    { id: "qatre",         video: "assets/previews/qatre-preview.mp4", poster: "assets/previews/qatre-preview.jpg" },
    { id: "h2-parfum",     video: "assets/previews/h2-parfum.mp4",     poster: "assets/previews/h2-parfum.jpg" },
    { id: "loyalty",       video: "assets/previews/loyalty.mp4",       poster: "assets/previews/loyalty.jpg" },
    { id: "noir",          video: "assets/previews/noir.mp4",          poster: "assets/previews/noir.jpg" }
  ];
  /* ---- center words: our adaptation of v2's audience words. NOT in COPY —
         small hardcoded dict, re-rendered on the <html lang> observer. ---- */
  var WORDS = {
    fa: { pill: "برای", words: ["رستوران‌ها", "کافه‌ها", "فروشگاه‌ها", "باشگاه‌ها"] },
    en: { pill: "FOR",  words: ["Restaurants", "Cafés", "Shops", "Gyms"] },
    ar: { pill: "لـ",   words: ["مطاعم", "مقاهي", "متاجر", "صالات رياضية"] }
  };
  var N_STACK = ITEMS.length;          // 6 discards
  var N_WORDS = 4;
  var SEGMENTS = N_STACK + 1 + N_WORDS; // 6 stack + 1 disperse + 4 words = 11

  function lang() { return (window.state && window.state.lang) || "fa"; }

  /* ---- build DOM ---- */
  var sticky = document.getElementById("srSticky");
  var stackEl = document.getElementById("srStack");
  var ringEl = document.getElementById("srRing");
  var pillEl = document.getElementById("srPill");
  var wordEl = document.getElementById("srWord");
  var tilesEl = document.getElementById("srTiles");

  var stackCards = ITEMS.map(function (it) {
    var card = document.createElement("article");
    card.className = "sr-card";
    card.innerHTML =
      '<div class="sr-card-media"><video muted loop playsinline preload="none" ' +
      'data-src="' + it.video + '" poster="' + it.poster + '" aria-hidden="true"></video></div>' +
      '<div class="sr-card-title"></div>';
    stackEl.appendChild(card);
    return { id: it.id, el: card, title: card.querySelector(".sr-card-title"), video: card.querySelector("video") };
  });
  var ringTiles = ITEMS.map(function (it) {
    var tile = document.createElement("div");
    tile.className = "sr-tile";
    tile.innerHTML = '<video muted loop playsinline preload="metadata" ' +
      'data-src="' + it.video + '" poster="' + it.poster + '" aria-hidden="true"></video>';
    tilesEl.appendChild(tile);
    return { id: it.id, el: tile, video: tile.querySelector("video") };
  });

  /* ---- language render (titles from COPY, pill + words from WORDS) ---- */
  var lastWordIndex = -1;
  function renderLang() {
    var c = window.COPY[lang()];
    var items = (c.portfolio && c.portfolio.items) || [];
    stackCards.forEach(function (card) {
      var found = null;
      items.forEach(function (it) { if (it.id === card.id) found = it; });
      card.title.textContent = found ? found.title : card.id;
    });
    var w = WORDS[lang()] || WORDS.en;
    pillEl.textContent = w.pill;
    lastWordIndex = -1; // force word refresh on next frame
  }

  /* ---- scroll driver ---- */
  function segFloat() {
    var rect = section.getBoundingClientRect();
    var travel = section.offsetHeight - window.innerHeight;
    if (travel <= 0) return 0;
    var p = -rect.top / travel;
    if (p < 0) p = 0; if (p > 1) p = 1;
    return p * SEGMENTS;
  }
  function ringRadii() {
    var r = sticky.getBoundingClientRect();
    return { rx: Math.min(r.width * 0.42, 560), ry: Math.min(r.height * 0.34, 330) };
  }
  var TILE_ANGLES = [-90, -30, 30, 90, 150, 210];

  function cardTransform(tx, ty, rot, sc) {
    return "translate(-50%, -50%) translate(" + tx + "%, " + ty + "%) rotate(" + rot + "deg) scale(" + sc + ")";
  }

  function renderFrame(seg) {
    /* ---- stack phase: seg in [0, 6) ---- */
    stackCards.forEach(function (card, i) {
      var x = i - seg, t, rot, sc, ty, z;
      if (x <= 0) {           // discarding (top) or already discarded
        t = Math.min(1, -x);
        rot = 16 * t; sc = 1; ty = -140 * t;
        card.el.style.transform = cardTransform(45 * t, ty, rot, sc);
        card.el.style.zIndex = "50";
      } else if (x <= 1) {    // next card: straightens + scales up to front
        rot = 4 * x; sc = 1 - 0.06 * x; ty = 0;
        card.el.style.transform = cardTransform(0, ty, rot, sc);
        card.el.style.zIndex = "49";
      } else {                // deeper cards: slight scale/tilt, peeking
        rot = 4; sc = Math.max(0.85, 0.94 - 0.02 * (x - 1)); ty = Math.min(8, 2 * (x - 1));
        card.el.style.transform = cardTransform(0, ty, rot, sc);
        card.el.style.zIndex = String(50 - Math.ceil(x));
      }
    });

    /* ---- ring: opacity + disperse + words ---- */
    var ringOpacity = 0, wordIndex = 0, wordFrac = 0, orbit = 0, disperse = -1;
    if (seg >= N_STACK && seg < N_STACK + 1) {
      disperse = seg - N_STACK;
      ringOpacity = disperse;
    } else if (seg >= N_STACK + 1) {
      var wf = Math.min(N_WORDS, seg - (N_STACK + 1));
      wordIndex = Math.min(N_WORDS - 1, Math.floor(wf));
      wordFrac = wf - Math.floor(wf);
      if (wf >= N_WORDS) wordFrac = 1;
      orbit = 12 * wf;
      ringOpacity = 1;
    }
    ringEl.style.opacity = String(ringOpacity);
    var radii = ringRadii();
    ringTiles.forEach(function (tile, i) {
      var a = (TILE_ANGLES[i] + orbit) * Math.PI / 180;
      var px = radii.rx * Math.cos(a), py = radii.ry * Math.sin(a);
      var sc, op;
      if (disperse >= 0) { sc = 0.35 + 0.65 * disperse; op = disperse; px *= disperse; py *= disperse; }
      else { sc = 1; op = ringOpacity; }
      tile.el.style.transform =
        "translate(-50%, -50%) translate(" + px.toFixed(1) + "px, " + py.toFixed(1) + "px) scale(" + sc.toFixed(3) + ")";
      tile.el.style.opacity = String(op);
    });

    /* ---- center word ---- */
    var w = WORDS[lang()] || WORDS.en;
    if (wordIndex !== lastWordIndex) { wordEl.textContent = w.words[wordIndex]; lastWordIndex = wordIndex; }
    var intro = seg >= N_STACK + 1 ? Math.min(1, wordFrac / 0.3) : 1;
    wordEl.style.opacity = String(ringOpacity * intro);
    wordEl.style.transform = "translate(-50%, -50%) translateY(" + ((1 - intro) * 18).toFixed(1) + "px)";
    pillEl.style.opacity = String(ringOpacity);

    /* ---- front-card video only (FIX 2026-10-30: reduced-motion gate —
         the section observer calls renderFrame even when reduced, so the
         driver must never play here; pause everything instead) ---- */
    var active = -1;
    if (seg < N_STACK) active = Math.min(N_STACK - 1, Math.floor(seg + 0.5));
    stackCards.forEach(function (card, i) {
      var v = card.video;
      if (reduceMotion) { if (!v.paused) v.pause(); return; }
      if (i === active) {
        if (v.src && v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      } else if (!v.paused) { v.pause(); }
    });
  }

  var ticking = false;
  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(function () { ticking = false; renderFrame(segFloat()); });
    }
  }

  /* ---- lazy video load (data-src) + pause when section leaves view ---- */
  var allVideos = stackCards.map(function (c) { return c.video; })
    .concat(ringTiles.map(function (t) { return t.video; }));
  if ("IntersectionObserver" in window) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting && !v.src) { v.src = v.getAttribute("data-src"); v.load(); }
      });
    }, { threshold: 0.1 });
    allVideos.forEach(function (v) { vio.observe(v); });
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) {
          stackCards.forEach(function (card) { card.video.pause(); });
        } else { onScroll(); }
      });
    }, { threshold: 0 });
    sio.observe(section);
  } else {
    allVideos.forEach(function (v) { v.src = v.getAttribute("data-src"); });
  }

  /* ---- language switch: same MutationObserver contract as before ---- */
  if ("MutationObserver" in window) {
    var mo = new MutationObserver(function () { renderLang(); onScroll(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }

  /* ---- richer portfolio modal: wrap the existing global openLightbox (unchanged from v1) ---- */
  var FILM = {
    "qatre": "assets/videos/qatre-film.mp4",
    "h2-parfum": "assets/videos/h2-parfum-film.mp4",
    "h2-prism": "assets/videos/h2-prism-film.mp4"
  };
  var LB_STR = {
    fa: { film: "تماشای فیلم کامل", back: "بازگشت به پیش‌نمایش" },
    en: { film: "Watch the full film", back: "Back to preview" },
    ar: { film: "مشاهدة الفيلم الكامل", back: "العودة إلى المعاينة" }
  };
  var lbActions = document.createElement("div");
  lbActions.id = "csLbActions";
  lbActions.className = "cs-lb-actions";
  var lbDesc = document.getElementById("lightboxDesc");
  if (lbDesc && lbDesc.parentNode) lbDesc.parentNode.insertBefore(lbActions, lbDesc.nextSibling);

  var lbMode = "preview", lbId = null, lbPreviewSrc = null, lbPreviewPoster = null;
  function previewIdFor(src) {
    if (!window.COPY || !window.previewSrc) return null;
    var items = window.COPY[lang()].portfolio.items || [];
    for (var i = 0; i < items.length; i++) {
      try { if (window.previewSrc(items[i].id) === src) return items[i].id; } catch (e) {}
    }
    return null;
  }
  function clearLbActions() {
    lbActions.innerHTML = "";
    lbMode = "preview"; lbId = null; lbPreviewSrc = null; lbPreviewPoster = null;
  }
  function renderLbActions() {
    lbActions.innerHTML = "";
    if (!lbId) return;
    var c = window.COPY[lang()];
    var parts = [];
    if (window.LIVE_URLS && window.LIVE_URLS[lbId]) {
      parts.push('<a class="btn btn-ghost" href="' + window.LIVE_URLS[lbId] + '" target="_blank" rel="noopener">' +
        c.portfolio.view_live + ' <span aria-hidden="true">↗</span></a>');
    }
    if (FILM[lbId]) {
      var s = LB_STR[lang()] || LB_STR.en;
      parts.push('<button type="button" class="btn btn-primary" id="csLbFilm">' +
        (lbMode === "film" ? s.back : s.film) + "</button>");
    }
    lbActions.innerHTML = parts.join("");
    var filmBtn = document.getElementById("csLbFilm");
    if (filmBtn) {
      filmBtn.addEventListener("click", function () {
        var v = document.getElementById("lightboxVideo");
        if (!v) return;
        if (lbMode === "preview") {
          lbMode = "film";
          v.src = FILM[lbId]; v.load();
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        } else {
          lbMode = "preview";
          if (lbPreviewPoster) v.poster = lbPreviewPoster;
          v.src = lbPreviewSrc; v.load();
          var p2 = v.play(); if (p2 && p2.catch) p2.catch(function () {});
        }
        renderLbActions();
      });
    }
  }
  if (typeof window.openLightbox === "function" && typeof window.closeLightbox === "function") {
    var _open = window.openLightbox, _close = window.closeLightbox;
    window.openLightbox = function (src, poster, title, desc) {
      _open(src, poster, title, desc);
      lbId = previewIdFor(src);
      lbPreviewSrc = src; lbPreviewPoster = poster; lbMode = "preview";
      renderLbActions();
    };
    window.closeLightbox = function () {
      _close();
      clearLbActions();
    };
  }

  /* ---- boot ---- */
  renderLang();
  if (reduceMotion) {
    section.classList.add("sr-reduced");
  } else {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    renderFrame(segFloat());
  }
})();
