/* H2 Studio v2 — every string comes from COPY[state.lang] (assets/copy-data.js).
   Zero external requests: no fetch/XHR, no CDN. "H2 Studio" is always Latin. */

var state = { lang: "fa" };
try { var saved = localStorage.getItem("h2-lang"); if (saved === "en" || saved === "fa") state.lang = saved; } catch (e) {}

var FA_DIGITS = ["۱", "۲", "۳", "۴", "۵"];
var MIN_TEXT = 3;
var WHATSAPP_FALLBACK = "989375732165";

function el(id) { return document.getElementById(id); }
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function C() { return COPY[state.lang]; }           /* current-language copy root */
function W() { return C().wizard; }                 /* current-language wizard   */
function U() { return C().ui; }                     /* current-language UI chrome */
function UW() { return W().ui; }                    /* current-language wizard chrome */
function stepNum(n) { return state.lang === "fa" ? FA_DIGITS[n - 1] : String(n); }

/* Portfolio wiring: live-link targets + preview videos (reused, never re-encoded) */
var LIVE_URLS = {
  "ramin-berger": "https://hamedhoseyni110-create.github.io/ramin-berger/",
  "coffee-nozhe": "https://hamedhoseyni110-create.github.io/coffee-nozhe/",
  "gym-site-demo": "https://hamedhoseyni110-create.github.io/gym-site-demo/",
  "navidka2ni":   "https://hamedhoseyni110-create.github.io/navidka2ni/"
};
function previewSrc(id) {
  if (id === "qatre") return "assets/previews/qatre-preview.mp4";
  if (id === "rdr")   return "assets/previews/rdr-preview.mp4";
  return "assets/previews/" + id + ".mp4";
}

/* ================= Page render ================= */

function renderPage() {
  var c = C(), u = U(), wiz = W();
  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.lang === "fa" ? "rtl" : "ltr";
  document.title = "H2 Studio";

  el("skipLink").textContent = u.skip;

  /* nav */
  var nav = c.nav;
  var links = [
    ["services", nav.services], ["portfolio", nav.portfolio], ["process", nav.process],
    ["about", nav.about], ["contact", nav.contact]
  ];
  el("navLinks").innerHTML = links.map(function(p){
    return '<a href="#' + p[0] + '" data-anchor="' + p[0] + '">' + esc(p[1]) + "</a>";
  }).join("");
  el("navLinks").setAttribute("aria-label", u.menu);
  el("hamburger").setAttribute("aria-label", u.menu);
  var tg = el("langToggle");
  tg.textContent = state.lang === "fa" ? "EN" : "فا";
  tg.setAttribute("aria-label", u.lang_label);
  el("navCta").textContent = nav.cta;

  /* hero */
  el("heroTitle").textContent = c.hero.title;
  el("heroSubtitle").textContent = c.hero.subtitle;
  el("heroCtaPrimary").textContent = c.hero.cta_primary;
  el("heroCtaSecondary").textContent = c.hero.cta_secondary;
  el("scrollHintText").textContent = c.hero.hint;
  el("interactHint").textContent = c.hero.interact || "";
  window.addEventListener("hero:first-interact", function(){
    el("interactHint").classList.add("gone");
  }, { once: true });

  /* services */
  el("servicesTitle").textContent = nav.services;
  var sg = el("servicesGrid");
  sg.innerHTML = "";
  c.services.forEach(function(s, i){
    var card = document.createElement("article");
    card.className = "service-card";
    var html = '<div class="service-num" aria-hidden="true">' + stepNum(i + 1) + "</div>" +
      "<h3>" + esc(s.title) + "</h3><p>" + esc(s.desc) + "</p>";
    if (s.id === "app" && s.flow) {
      html += '<details class="app-flow"><summary>' + esc(u.app_flow_title) + "</summary><ol>" +
        s.flow.map(function(f){
          return "<li><b>" + esc(f.title) + "</b> — " + esc(f.desc) + "</li>";
        }).join("") + "</ol></details>";
    }
    card.innerHTML = html;
    sg.appendChild(card);
  });

  /* portfolio */
  el("portfolioTitle").textContent = c.portfolio.heading;
  el("portfolioSub").textContent = c.portfolio.sub;
  var pg = el("portfolioGrid");
  pg.innerHTML = "";
  c.portfolio.items.forEach(function(item){
    var card = document.createElement("article");
    card.className = "portfolio-card";
    var live = LIVE_URLS[item.id];
    var cap = '<div class="portfolio-cap">' +
      '<span class="tag">' + esc(item.tag) + "</span>" +
      "<h3>" + esc(item.title) + "</h3>" +
      "<p>" + esc(item.desc) + "</p>";
    if (live) {
      cap += '<a class="live-link" href="' + live + '" target="_blank" rel="noopener">' +
        esc(c.portfolio.view_live) + ' <span aria-hidden="true">↗</span>' +
        '<span class="sr-only">' + esc(u.external_link) + "</span></a>";
    }
    cap += "</div>";
    var badge = '<span class="media-badge">' + esc(c.portfolio.preview) + "</span>";
    card.innerHTML =
      '<div class="portfolio-media">' +
      '<video data-src="' + esc(previewSrc(item.id)) + '" muted loop playsinline preload="none" aria-label="' + esc(item.title) + '"></video>' +
      badge + "</div>" + cap;
    pg.appendChild(card);
  });
  initTilt();
  initLazyVideos();

  /* process */
  el("processTitle").textContent = c.process.heading;
  var ps = el("processSteps");
  ps.innerHTML = "";
  c.process.steps.forEach(function(s, i){
    var li = document.createElement("li");
    li.innerHTML = '<div class="step-num" aria-hidden="true">' + stepNum(i + 1) + "</div>" +
      "<h3>" + esc(s.title) + "</h3><p>" + esc(s.desc) + "</p>";
    ps.appendChild(li);
  });

  /* about */
  el("aboutTitle").textContent = c.about.heading;
  el("aboutBody").innerHTML = c.about.paragraphs.map(function(p){
    return "<p>" + esc(p) + "</p>";
  }).join("");

  /* contact */
  el("contactTitle").textContent = u.contact_title;
  el("contactBody").textContent = u.contact_body;
  el("contactCta").textContent = wiz.ui.send_whatsapp;

  /* footer */
  el("footerTagline").textContent = c.footer.tagline;
  el("footerRights").textContent = c.footer.rights;
  el("wizardClose").setAttribute("aria-label", u.close);

  /* scroll reveals last — everything must exist first */
  initReveals();

  /* music player labels (bilingual; preserves playback state) */
  try { if (window.H2MP && window.H2MP.refresh) window.H2MP.refresh(); } catch (e) {}
}

/* ================= 3D tilt + glare on cards ================= */

function initTilt() {
  if (window.matchMedia("(hover: none)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.querySelectorAll("#portfolioGrid .portfolio-card, #servicesGrid .service-card").forEach(function(card){
    card.addEventListener("mousemove", function(e){
      var r = card.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = "rotateX(" + (-y * 9).toFixed(2) + "deg) rotateY(" + (x * 11).toFixed(2) + "deg) translateZ(6px)";
      card.style.setProperty("--mx", ((x + 0.5) * 100).toFixed(1) + "%");
      card.style.setProperty("--my", ((y + 0.5) * 100).toFixed(1) + "%");
    });
    card.addEventListener("mouseleave", function(){
      card.style.transition = "transform .35s ease";
      card.style.transform = "";
      setTimeout(function(){ card.style.transition = ""; }, 360);
    });
  });
}

/* ================= 3D scroll entrance (generic) ================= */

function initReveals() {
  if (!("IntersectionObserver" in window)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if (en.isIntersecting) {
        var node = en.target;
        node.classList.add("in");
        node.addEventListener("transitionend", function h(){
          node.classList.add("settled");
          node.removeEventListener("transitionend", h);
        });
        io.unobserve(node);
      }
    });
  }, { threshold: 0.12 });
  [
    ".section-title",
    "#servicesGrid .service-card",
    "#processSteps li",
    "#portfolioGrid .portfolio-card",
    "#aboutBody p"
  ].forEach(function(sel){
    document.querySelectorAll(sel).forEach(function(node, i){
      if (node.classList.contains("reveal-3d")) return;
      node.classList.add("reveal-3d");
      node.style.transitionDelay = ((i % 6) * 70) + "ms";
      io.observe(node);
    });
  });
}

/* ================= lazy motion previews ================= */

var lazyIO = null;
var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function initLazyVideos() {
  if (lazyIO) lazyIO.disconnect();
  var vids = Array.prototype.slice.call(el("portfolioGrid").querySelectorAll("video[data-src]"));
  if (!("IntersectionObserver" in window)) {
    vids.forEach(function(v){ v.src = v.getAttribute("data-src"); });
    return;
  }
  lazyIO = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      var v = en.target;
      if (en.isIntersecting) {
        if (!v.src) { v.src = v.getAttribute("data-src"); v.load(); }
        if (!reduceMotion) { var p = v.play(); if (p && p.catch) p.catch(function(){}); }
      } else {
        v.pause();
      }
    });
  }, { threshold: 0.25 });
  vids.forEach(function(v){ lazyIO.observe(v); });
}

/* ================= Wizard ================= */

var wiz = { open: false, step: 1, done: false, type: null, brief: {}, budget: null, timeline: null, name: "", contact: "" };
var wizOpener = null;

function wizStepDef(i) { return W().steps[i - 1]; }
function waNumber() { return (W().ui && W().ui.whatsapp_number) || WHATSAPP_FALLBACK; }

function openWizard(opener) {
  wizOpener = opener || document.activeElement;
  wiz = { open: true, step: 1, done: false, type: null, brief: {}, budget: null, timeline: null, name: "", contact: "" };
  el("wizard").hidden = false;
  document.body.style.overflow = "hidden";
  renderWizardStep();
  el("wizardClose").focus();
}

function closeWizard(force) {
  if (!wiz.open) return;
  if (!force && !wiz.done && wiz.step > 1) {
    if (!window.confirm(UW().guard_close)) return;
  }
  wiz.open = false;
  el("wizard").hidden = true;
  document.body.style.overflow = "";
  if (wizOpener && wizOpener.focus) wizOpener.focus();
}

function fieldError(fieldEl, msg) {
  fieldEl.classList.add("invalid");
  var m = fieldEl.querySelector(".error-msg");
  if (m) m.textContent = msg;
}
function clearErrors(root) {
  root.querySelectorAll(".invalid").forEach(function(f){ f.classList.remove("invalid"); });
  root.querySelectorAll(".error-msg").forEach(function(m){ m.textContent = ""; });
}

function isOptionalText(q) {
  return q.kind === "text" && /اختیاری|optional/i.test(q.q);
}
function briefKey(i) { return "q" + i; }

function validateStep() {
  var u = UW();
  var body = el("wizardBody");
  clearErrors(body);
  var ok = true;
  if (wiz.step === 1) {
    if (!wiz.type) {
      var wrap = body.querySelector(".wiz-cards");
      wrap.classList.add("invalid");
      body.querySelector("#stepErr").textContent = u.err_pick;
      ok = false;
    }
  } else if (wiz.step === 2) {
    wizStepDef(2).per_type[wiz.type].forEach(function(q, i){
      var key = briefKey(i);
      var val = wiz.brief[key];
      var fel = body.querySelector('[data-field="' + key + '"]');
      if (q.kind === "choice") {
        if (val == null) { fieldError(fel, u.err_pick); ok = false; }
      } else if (!isOptionalText(q)) {
        if (!val || String(val).trim().length < MIN_TEXT) { fieldError(fel, u.err_required); ok = false; }
      }
    });
  } else if (wiz.step === 3) {
    if (wiz.budget == null || wiz.timeline == null) {
      body.querySelector("#stepErr").textContent = u.err_step3;
      ok = false;
    }
  } else if (wiz.step === 4) {
    var nameF = body.querySelector('[data-field="name"]');
    var conF = body.querySelector('[data-field="contact_handle"]');
    if (!wiz.name.trim() || wiz.name.trim().length < MIN_TEXT) { fieldError(nameF, u.err_name); ok = false; }
    if (!validContact(wiz.contact)) { fieldError(conF, u.err_contact); ok = false; }
  }
  if (!ok) {
    var first = body.querySelector(".invalid input, .invalid textarea") || body.querySelector("#stepErr");
    if (first && first.focus) first.focus();
  }
  return ok;
}

function validContact(v) {
  v = String(v || "").trim();
  var digits = (v.match(/\d/g) || []).length;
  if (digits >= 7) return true;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return true;
  if (/^@[\w.]{2,}$/.test(v)) return true;
  return false;
}

function chip(label, pressed, attrs) {
  return '<button type="button" class="chip" aria-pressed="' + pressed + '"' + (attrs || "") + ">" + esc(label) + "</button>";
}

function renderWizardStep() {
  var u = UW();
  var body = el("wizardBody");
  var foot = el("wizardFoot");
  var stepOf = el("wizardStepOf");
  var prog = el("wizard").querySelector(".progress");
  var fill = el("progressFill");

  if (wiz.done) { renderSuccess(); return; }

  stepOf.style.display = "";
  prog.style.display = "";
  foot.style.display = "";
  stepOf.textContent = u.step_of.replace("{n}", stepNum(wiz.step));
  fill.style.width = (wiz.step / 4 * 100) + "%";
  el("wizardBack").textContent = u.back;
  el("wizardBack").style.visibility = wiz.step === 1 ? "hidden" : "visible";
  el("wizardNext").textContent = wiz.step === 4 ? u.send_whatsapp : u.next;

  var html = "";
  if (wiz.step === 1) {
    var def = wizStepDef(1);
    html = '<h2 id="wizardTitle">' + esc(def.title) + "</h2>" +
      '<div class="wiz-cards" role="group">' +
      def.options.map(function(o){
        return '<button type="button" class="wiz-card" data-type="' + o.id + '" aria-pressed="' + (wiz.type === o.id) + '">' + esc(o.label) + "</button>";
      }).join("") + "</div>" +
      '<div class="error-msg" id="stepErr" role="alert"></div>';
  } else if (wiz.step === 2) {
    var def2 = wizStepDef(2);
    var qs = def2.per_type[wiz.type];
    html = '<h2 id="wizardTitle">' + esc(def2.title) + "</h2>";
    qs.forEach(function(q, i){
      var key = briefKey(i);
      html += '<div class="field" data-field="' + key + '">';
      if (q.kind === "choice") {
        html += '<span class="q-label" id="ql' + i + '">' + esc(q.q) + "</span>" +
          '<div class="chips" role="group" aria-labelledby="ql' + i + '">' +
          q.options.map(function(o, oi){
            return chip(o, wiz.brief[key] === oi, ' data-q="' + i + '" data-oi="' + oi + '"');
          }).join("") + "</div>";
      } else {
        var opt = isOptionalText(q) ? ' <span class="opt-tag">(' + (state.lang === "fa" ? "اختیاری" : "optional") + ")</span>" : "";
        html += '<label for="qi' + i + '">' + esc(q.q) + opt + "</label>" +
          '<textarea id="qi' + i + '" data-textq="' + i + '" rows="2">' +
          esc(wiz.brief[key] || "") + "</textarea>";
      }
      html += '<div class="error-msg" role="alert"></div></div>';
    });
  } else if (wiz.step === 3) {
    var def3 = wizStepDef(3);
    html = '<h2 id="wizardTitle">' + esc(def3.title) + "</h2>" +
      '<div class="chips" role="group">' +
      def3.budget_ranges.map(function(r, i){
        return chip(r, wiz.budget === i, ' data-budget="' + i + '"');
      }).join("") + "</div>" +
      '<div class="group-label">' + esc(def3.timeline_label) + "</div>" +
      '<div class="chips" role="group">' +
      def3.timelines.map(function(r, i){
        return chip(r, wiz.timeline === i, ' data-timeline="' + i + '"');
      }).join("") + "</div>" +
      '<div class="error-msg" id="stepErr" role="alert"></div>';
  } else if (wiz.step === 4) {
    var def4 = wizStepDef(4);
    html = '<h2 id="wizardTitle">' + esc(def4.title) + "</h2>";
    def4.fields.forEach(function(f){
      var val = f.id === "name" ? wiz.name : wiz.contact;
      html += '<div class="field" data-field="' + f.id + '">' +
        '<label for="wf-' + f.id + '">' + esc(f.label) + "</label>" +
        '<input type="text" id="wf-' + f.id + '" data-wf="' + f.id + '" value="' + esc(val) + '">' +
        (f.hint ? '<div class="field-hint">' + esc(f.hint) + "</div>" : "") +
        '<div class="error-msg" role="alert"></div></div>';
    });
  }

  body.innerHTML = html;

  body.querySelectorAll("[data-type]").forEach(function(b){
    b.addEventListener("click", function(){
      wiz.type = b.getAttribute("data-type");
      body.querySelectorAll("[data-type]").forEach(function(x){ x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      body.querySelector("#stepErr").textContent = "";
    });
  });
  body.querySelectorAll("[data-q]").forEach(function(b){
    b.addEventListener("click", function(){
      var qi = +b.getAttribute("data-q"), oi = +b.getAttribute("data-oi");
      wiz.brief[briefKey(qi)] = oi;
      body.querySelectorAll('[data-q="' + qi + '"]').forEach(function(x){ x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      var fel = body.querySelector('[data-field="' + briefKey(qi) + '"]');
      fel.classList.remove("invalid"); fel.querySelector(".error-msg").textContent = "";
    });
  });
  body.querySelectorAll("[data-textq]").forEach(function(ta){
    ta.addEventListener("input", function(){ wiz.brief[briefKey(+ta.getAttribute("data-textq"))] = ta.value; });
  });
  body.querySelectorAll("[data-budget]").forEach(function(b){
    b.addEventListener("click", function(){
      wiz.budget = +b.getAttribute("data-budget");
      body.querySelectorAll("[data-budget]").forEach(function(x){ x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      body.querySelector("#stepErr").textContent = "";
    });
  });
  body.querySelectorAll("[data-timeline]").forEach(function(b){
    b.addEventListener("click", function(){
      wiz.timeline = +b.getAttribute("data-timeline");
      body.querySelectorAll("[data-timeline]").forEach(function(x){ x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      body.querySelector("#stepErr").textContent = "";
    });
  });
  body.querySelectorAll("[data-wf]").forEach(function(inp){
    inp.addEventListener("input", function(){
      if (inp.getAttribute("data-wf") === "name") wiz.name = inp.value; else wiz.contact = inp.value;
    });
    inp.addEventListener("keydown", function(e){
      if (e.key === "Enter") { e.preventDefault(); el("wizardNext").click(); }
    });
  });

  body.scrollTop = 0;
  var focusable = body.querySelector("button, input, textarea");
  if (focusable) focusable.focus();
}

function buildMessage() {
  var wizd = W();
  var typeOpt = wizStepDef(1).options.filter(function(o){ return o.id === wiz.type; })[0];
  var tpl = wizd.wa_template;
  var qs = wizStepDef(2).per_type[wiz.type];
  var briefLines = qs.map(function(q, i){
    var val = wiz.brief[briefKey(i)];
    if (val == null || String(val).trim() === "") return null;
    var ans = q.kind === "choice" ? q.options[val] : String(val).trim();
    return q.q + ": " + ans;
  }).filter(Boolean).join("\n");
  return tpl
    .replace("{project_type}", typeOpt.label)
    .replace("{brief_lines}", briefLines)
    .replace("{budget_range}", wizStepDef(3).budget_ranges[wiz.budget])
    .replace("{timeline}", wizStepDef(3).timelines[wiz.timeline])
    .replace("{name}", wiz.name.trim())
    .replace("{contact_handle}", wiz.contact.trim());
}

function waLink() {
  return "https://wa.me/" + waNumber() + "?text=" + encodeURIComponent(buildMessage());
}

function renderSuccess() {
  var u = UW();
  el("wizardStepOf").style.display = "none";
  el("wizard").querySelector(".progress").style.display = "none";
  el("wizardFoot").style.display = "none";
  var body = el("wizardBody");
  var link = waLink();
  body.innerHTML =
    '<div class="success">' +
    '<svg class="success-icon" viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="37" fill="none" stroke="#4fd08a" stroke-width="5"/><path d="M28 43l10 10 18-21" fill="none" stroke="#4fd08a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
    '<h2 id="wizardTitle">' + esc(u.success_title) + "</h2>" +
    "<p>" + esc(u.success_body) + "</p>" +
    '<a class="btn btn-wa" href="' + link + '" target="_blank" rel="noopener">' + esc(u.wa_button) + "</a>" +
    '<div class="copy-row"><button type="button" class="copy-btn" id="copyMsgBtn">' + esc(u.copy_message) + '</button><span class="copy-ok" id="copyOk" hidden>' + esc(u.copied) + "</span></div>" +
    '<button type="button" class="restart-link" id="restartBtn">' + esc(u.restart) + "</button>" +
    "</div>";
  el("copyMsgBtn").addEventListener("click", function(){ copyMessageText(buildMessage()); });
  el("restartBtn").addEventListener("click", function(){
    wiz = { open: true, step: 1, done: false, type: null, brief: {}, budget: null, timeline: null, name: "", contact: "" };
    renderWizardStep();
  });
  body.scrollTop = 0;
  body.querySelector(".btn-wa").focus();
}

function copyMessageText(text) {
  var okEl = el("copyOk");
  function done(){ okEl.hidden = false; setTimeout(function(){ okEl.hidden = true; }, 2500); }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, function(){ fallbackCopy(text); done(); });
  } else { fallbackCopy(text); done(); }
}
function fallbackCopy(text) {
  var ta = document.createElement("textarea");
  ta.value = text; ta.setAttribute("readonly", "");
  ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); } catch (e) {}
  ta.remove();
}

/* ================= focus trap + ESC ================= */

function trapTab(e, container) {
  if (e.key !== "Tab") return;
  var f = Array.prototype.filter.call(
    container.querySelectorAll("button, [href], input, textarea, [tabindex]:not([tabindex='-1'])"),
    function(x){ return !x.disabled && x.offsetParent !== null; }
  );
  if (!f.length) return;
  var first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

/* ================= screen-reader only helper ================= */
/* (styled inline via JS-injected class below) */

/* ================= wiring ================= */

function init() {
  var style = document.createElement("style");
  style.textContent = ".sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;}";
  document.head.appendChild(style);

  renderPage();

  document.querySelectorAll("[data-wizard-open]").forEach(function(b){
    b.addEventListener("click", function(){ openWizard(b); });
  });

  el("wizardClose").addEventListener("click", function(){ closeWizard(false); });
  el("wizardBack").addEventListener("click", function(){
    if (wiz.step > 1) { wiz.step--; renderWizardStep(); }
  });
  el("wizardNext").addEventListener("click", function(){
    if (!validateStep()) return;
    if (wiz.step < 4) { wiz.step++; renderWizardStep(); }
    else { wiz.done = true; renderWizardStep(); }
  });
  el("wizard").addEventListener("click", function(e){
    if (e.target === el("wizard")) closeWizard(false);
  });
  document.addEventListener("keydown", function(e){
    if (!el("wizard").hidden) {
      trapTab(e, el("wizard"));
      if (e.key === "Escape") closeWizard(false);
    }
  });

  el("langToggle").addEventListener("click", function(){
    state.lang = state.lang === "fa" ? "en" : "fa";
    try { localStorage.setItem("h2-lang", state.lang); } catch (e) {}
    renderPage();
    if (wiz.open) renderWizardStep();
  });

  var ham = el("hamburger"), links = el("navLinks");
  ham.addEventListener("click", function(){
    var open = links.classList.toggle("open");
    ham.setAttribute("aria-expanded", open ? "true" : "false");
  });
  links.addEventListener("click", function(){ links.classList.remove("open"); ham.setAttribute("aria-expanded", "false"); });

  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if (en.isIntersecting) {
        links.querySelectorAll("a").forEach(function(a){
          a.classList.toggle("active", a.getAttribute("data-anchor") === en.target.id);
        });
      }
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  ["services", "portfolio", "process", "about", "contact"].forEach(function(id){ io.observe(el(id)); });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
