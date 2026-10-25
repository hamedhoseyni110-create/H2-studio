/* Upgrades layer (2026-10-25): vanilla JS for the upgrades.css effects.
   Everything is delegated or MutationObserver-driven, so language switches
   (which re-render the grids) never orphan the effects. No-ops on touch
   devices and under prefers-reduced-motion. */
(function () {
  "use strict";
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- spotlight (Magic Card): glow follows the mouse on every card ---------- */
  if (finePointer && !reducedMotion) {
    document.addEventListener("mousemove", function (e) {
      var card = e.target.closest ? e.target.closest(".service-card, .portfolio-card") : null;
      if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty("--spot-x", (e.clientX - r.left) + "px");
      card.style.setProperty("--spot-y", (e.clientY - r.top) + "px");
    }, { passive: true });
  }

  /* ---------- 3D tilt on portfolio cards (desktop mouse only) ---------- */
  var pg = $("#portfolioGrid");
  if (pg && finePointer && !reducedMotion) {
    pg.addEventListener("mousemove", function (e) {
      var card = e.target.closest ? e.target.closest(".portfolio-card") : null;
      if (!card || card.classList.contains("works-hidden")) return;
      var r = card.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      card.classList.add("up-tilting");
      card.style.transform = "rotateY(" + (x * 7).toFixed(2) + "deg) rotateX(" + (-y * 6).toFixed(2) + "deg) scale(1.015)";
    }, { passive: true });
    pg.addEventListener("mouseleave", function () {
      $$(".portfolio-card.up-tilting", pg).forEach(function (c) {
        c.classList.remove("up-tilting");
        c.style.transform = "";
      });
    });
  }

  /* ---------- border beam on the PARFUM card (all 3 languages contain PARFUM) ---------- */
  function applyBeam() {
    if (!pg) return;
    $$(".portfolio-card", pg).forEach(function (card) {
      var h = card.querySelector(".portfolio-cap h3");
      card.classList.toggle("up-beam", !!(h && h.textContent.indexOf("PARFUM") !== -1));
    });
  }
  applyBeam();
  if (pg && window.MutationObserver) {
    new MutationObserver(applyBeam).observe(pg, { childList: true });
  }

  /* ---------- marquee strip under the hero, built from the live service titles ---------- */
  var hero = $("#top");
  var marquee = null;
  function buildMarquee() {
    var titles = $$("#servicesGrid .service-card h3").map(function (h) { return h.textContent.trim(); }).filter(Boolean);
    if (!titles.length || !hero) return;
    if (!marquee) {
      marquee = document.createElement("div");
      marquee.className = "up-marquee";
      marquee.setAttribute("aria-hidden", "true");
      hero.parentNode.insertBefore(marquee, hero.nextSibling);
    }
    var track = document.createElement("div");
    track.className = "up-marquee-track";
    [0, 1].forEach(function () {
      titles.forEach(function (t) {
        var s = document.createElement("span");
        s.textContent = t;
        var sep = document.createElement("i");
        sep.textContent = "✦";
        s.appendChild(sep);
        track.appendChild(s);
      });
    });
    marquee.innerHTML = "";
    marquee.appendChild(track);
  }
  buildMarquee();
  var sg = $("#servicesGrid");
  if (sg && window.MutationObserver) {
    new MutationObserver(buildMarquee).observe(sg, { childList: true });
  }

  /* ---------- count-up stats (Number Ticker), Persian/Arabic/Latin digits ---------- */
  var FA = "۰۱۲۳۴۵۶۷۸۹", AR = "٠١٢٣٤٥٦٧٨٩";
  function toNum(str) {
    var out = "", i, ch;
    for (i = 0; i < str.length; i++) {
      ch = str[i];
      if (FA.indexOf(ch) !== -1) out += FA.indexOf(ch);
      else if (AR.indexOf(ch) !== -1) out += AR.indexOf(ch);
      else if (ch >= "0" && ch <= "9") out += ch;
    }
    return out ? parseInt(out, 10) : NaN;
  }
  function toDigits(n, sample) {
    var s = String(n), set = null, i;
    for (i = 0; i < sample.length; i++) {
      if (FA.indexOf(sample[i]) !== -1) { set = FA; break; }
      if (AR.indexOf(sample[i]) !== -1) { set = AR; break; }
    }
    if (!set) return s;
    return s.split("").map(function (d) { return set[parseInt(d, 10)]; }).join("");
  }
  function tick(el) {
    if (el.dataset.upTicked || reducedMotion) return;
    var orig = el.textContent;
    var m = orig.match(/[0-9۰-۹٠-٩]+/);
    if (!m) return;
    var target = toNum(m[0]);
    if (isNaN(target) || target <= 0) return;
    el.dataset.upTicked = "1";
    var pre = orig.slice(0, m.index), post = orig.slice(m.index + m[0].length);
    var t0 = null;
    (function frame(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / 1000, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + toDigits(Math.round(target * eased), m[0]) + post;
      if (p < 1) requestAnimationFrame(frame);
    })(performance.now());
  }
  var statsGrid = $("#statsGrid");
  if (statsGrid && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { tick(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.4 });
    $$(".stat-value", statsGrid).forEach(function (el) { io.observe(el); });
    if (window.MutationObserver) {
      new MutationObserver(function () {
        $$(".stat-value", statsGrid).forEach(function (el) { if (!el.dataset.upTicked) io.observe(el); });
      }).observe(statsGrid, { childList: true });
    }
  }

  /* ---------- aurora mouse parallax + gentle scroll depth (desktop only) ---------- */
  var aurora = document.querySelector(".aurora");
  if (aurora && finePointer && !reducedMotion) {
    var mx = 0, my = 0, ticking = false;
    function render() {
      ticking = false;
      var sy = window.scrollY || 0;
      aurora.style.transform = "translate3d(" + (mx * 12).toFixed(1) + "px, " + (sy * 0.03 + my * 10).toFixed(1) + "px, 0)";
    }
    window.addEventListener("mousemove", function (e) {
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
      if (!ticking) { ticking = true; requestAnimationFrame(render); }
    }, { passive: true });
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(render); }
    }, { passive: true });
  }
})();
