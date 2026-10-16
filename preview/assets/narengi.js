/* نارنگی (Tangerine) — chubby orange cat mascot + ambient sound toggle.
   Vanilla JS, no modules. Runs after copy-data.js + app.js.
   Zero external requests.

   STATES:
     working   — working.mp4 muted autoplay loop (default)
     talk      — loop paused, bubble with quick-action chips (6s idle → working)
     making    — making_something.mp4 plays ONCE after a chip action
     milestone — milestone_level_up.mp4 plays ONCE after a completed chip action
                 (+ synthesized meow, only when site sound is ON)
     poster    — prefers-reduced-motion: static poster.jpg, no video, no talk */

(function () {
  "use strict";

  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function byId(id) { return document.getElementById(id); }
  function lang() { return document.documentElement.lang === "en" ? "en" : "fa"; }
  function M() { return COPY[lang()].mascot; }
  function UI() { return COPY[lang()].ui; }

  /* ================= sound state ================= */

  var SOUND_KEY = "h2-sound";
  var audio = null;   /* lazily created HTMLAudioElement, loop=true */
  var ac = null;      /* lazily created AudioContext for the meow */

  function soundOn() {
    try { return localStorage.getItem(SOUND_KEY) === "1"; } catch (e) { return false; }
  }
  function persistSound(on) {
    try { localStorage.setItem(SOUND_KEY, on ? "1" : "0"); } catch (e) {}
  }

  function renderSoundToggle() {
    var btn = byId("soundToggle");
    if (!btn) return;
    var on = soundOn();
    btn.textContent = on ? "🔊" : "🔇";
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", on ? UI().sound_off : UI().sound_on);
  }

  function setAmbient(on) {
    persistSound(on);
    if (on) {
      if (!audio) {
        audio = new Audio("assets/ambient.ogg");
        audio.loop = true;
        audio.volume = 0.5;
      }
      var p = audio.play();
      if (p && p.catch) p.catch(function () { /* autoplay block: leave toggle as-is */ });
    } else if (audio) {
      audio.pause();
    }
    renderSoundToggle();
    /* one master sound concept — the music player listens for this */
    try { window.dispatchEvent(new CustomEvent("h2:sound", { detail: { on: !!on } })); } catch (e) {}
  }

  function initSoundToggle() {
    var btn = byId("soundToggle");
    if (!btn) return;
    renderSoundToggle(); /* restore icon only — never autoplay audio */
    btn.addEventListener("click", function () { setAmbient(!soundOn()); });
  }

  /* ================= synthesized meow (no file) ================= */

  function meow() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      if (!ac) ac = new AC();
      if (ac.state === "suspended") ac.resume();
      var t = ac.currentTime;

      var osc = ac.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(550, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.12);
      osc.frequency.exponentialRampToValueAtTime(480, t + 0.35);

      /* cartoon-cute vibrato: 8 Hz LFO on frequency */
      var lfo = ac.createOscillator();
      lfo.frequency.value = 8;
      var lfoGain = ac.createGain();
      lfoGain.gain.value = 30;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      var gain = ac.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.4, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);

      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t);
      lfo.start(t);
      osc.stop(t + 0.42);
      lfo.stop(t + 0.42);
    } catch (e) { /* audio unavailable: silent wave still plays */ }
  }

  /* ================= mascot behavior ================= */

  var cat = byId("narengi");
  var bubble = byId("narengi-bubble");
  var bubbleKey = null;   /* greeting | portfolio_tip | wizard_tip | talk */
  var hideTimer = null;
  var talkTimer = null;
  var talkOpen = false;
  var pendingCelebrate = false;  /* set by the «سفارش» chip: milestone after making ends */
  var seen = { greeting: false, portfolio: false, wizard: false };

  function renderMascotChrome() {
    if (!cat) return;
    cat.setAttribute("aria-label", M().aria);
    if (bubbleKey && bubble && !bubble.hidden) renderBubble();
    renderSoundToggle();
  }

  /* re-render mascot chrome when app.js flips the language */
  var langObs = new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      if (muts[i].attributeName === "lang") { renderMascotChrome(); break; }
    }
  });
  langObs.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

  function closeButton() {
    var close = document.createElement("button");
    close.type = "button";
    close.className = "narengi-close";
    close.textContent = "×";
    close.setAttribute("aria-label", UI().close);
    close.addEventListener("click", function (e) {
      e.stopPropagation();
      if (talkOpen) closeTalk(); else hideBubble();
    });
    return close;
  }

  function renderBubble() {
    if (!bubble || REDUCED) return;
    bubble.innerHTML = "";
    if (bubbleKey === "talk") {
      var txt = document.createElement("div");
      txt.className = "narengi-talk-text";
      txt.textContent = M().talk;
      bubble.appendChild(txt);

      var chips = document.createElement("div");
      chips.className = "narengi-chips";
      chips.appendChild(chipButton("portfolio", M().chips.portfolio, chipPortfolio));
      chips.appendChild(chipButton("order", M().chips.order, chipOrder));
      chips.appendChild(chipButton("sound", M().chips.sound, chipSound));
      bubble.appendChild(chips);
      bubble.appendChild(closeButton());
    } else {
      var span = document.createElement("span");
      span.textContent = M()[bubbleKey] || "";
      bubble.appendChild(span);
      bubble.appendChild(closeButton());
    }
  }

  function chipButton(kind, label, action) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "narengi-chip";
    b.setAttribute("data-chip", kind);
    b.textContent = label;
    b.addEventListener("click", function (e) { e.stopPropagation(); action(); });
    return b;
  }

  function showBubble(key) {
    if (!bubble || REDUCED) return;
    if (talkOpen) return; /* never clobber the open talk bubble with a scripted tip */
    bubbleKey = key;
    renderBubble();
    bubble.hidden = false;
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(hideBubble, 5000);
  }

  function hideBubble() {
    if (bubble) bubble.hidden = true;
    bubbleKey = null;
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
  }

  /* (a) greeting ~1.2s after first load */
  if (!REDUCED) {
    setTimeout(function () {
      if (!seen.greeting) { seen.greeting = true; showBubble("greeting"); }
    }, 1200);
  }

  /* (b) tip when #portfolio scrolls into view (once) */
  var port = byId("portfolio");
  if (port && !REDUCED && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && !seen.portfolio) {
          seen.portfolio = true;
          showBubble("portfolio_tip");
          io.disconnect();
        }
      });
    }, { threshold: 0.25 });
    io.observe(port);
  }

  /* ================= video mascot state machine =================
     working.mp4            — default: muted autoplay loop (cat typing at laptop)
     making_something.mp4   — plays ONCE after a chip action ("doing the task")
     milestone_level_up.mp4 — plays ONCE after a completed chip action
                              (+ meow only when site sound is ON)
     poster.jpg             — static frame for prefers-reduced-motion (no video) */

  var VID = {
    working:   "assets/narengi/working.mp4",
    milestone: "assets/narengi/milestone_level_up.mp4",
    making:    "assets/narengi/making_something.mp4"
  };

  var video = byId("narengi-video");
  var vstate = "working";
  var preloaded = {};

  /* reduced motion: static poster frame, no video element at all */
  if (REDUCED && video) {
    var still = document.createElement("img");
    still.src = "assets/narengi/poster.jpg";
    still.alt = "";
    still.setAttribute("aria-hidden", "true");
    video.replaceWith(still);
    video = null;
  }

  /* lazy preload of the two event clips on first need — never on page load */
  function lazyPreload(key) {
    if (REDUCED || preloaded[key]) return;
    preloaded[key] = true;
    var l = document.createElement("link");
    l.rel = "preload"; l.as = "video"; l.href = VID[key];
    document.head.appendChild(l);
  }

  function playVideo() {
    if (!video) return;
    try {
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }

  function setVState(key, once) {
    if (!video || REDUCED) return;
    if (vstate !== key) {
      vstate = key;
      video.loop = !once;
      video.src = VID[key];
    } else {
      video.loop = !once;
    }
    playVideo();
  }

  function resumeWorking() {
    if (!video) return;
    if (vstate === "working") { video.loop = true; playVideo(); }
    else { playVideo(); } /* resume whatever once-clip was paused */
  }

  if (video) {
    video.muted = true; /* belt & braces for autoplay policy */
    playVideo();
    video.addEventListener("ended", function () {
      if (vstate === "working") return;
      if (pendingCelebrate && vstate === "making") {
        pendingCelebrate = false;
        setVState("milestone", true);
        if (soundOn()) meow(); /* silent celebration when sound is off */
      } else {
        setVState("working", false);
      }
    });
    /* first-need preload triggers */
    if (cat) cat.addEventListener("pointerenter", function () {
      lazyPreload("milestone"); lazyPreload("making");
    }, { once: true });
    document.addEventListener("pointerover", function (e) {
      if (e.target && e.target.closest && e.target.closest("[data-wizard-open]")) lazyPreload("making");
    }, { passive: true });
  }

  /* ================= TALK MODE =================
     click → pause loop, show «گوش می‌دم!» + 3 chips.
     click again (or ×) → close, resume. 6s idle → close, resume. */

  function showTalk() {
    if (!bubble || REDUCED || !video) return;
    if (video && !video.paused) video.pause();
    talkOpen = true;
    bubbleKey = "talk";
    renderBubble();
    bubble.hidden = false;
    if (talkTimer) clearTimeout(talkTimer);
    talkTimer = setTimeout(function () { closeTalk(); }, 6000);
  }

  function closeTalk() {
    talkOpen = false;
    if (talkTimer) { clearTimeout(talkTimer); talkTimer = null; }
    hideBubble();
    resumeWorking();
  }

  function afterChip() {
    /* "doing the task": play making_something.mp4 once, then back to the loop */
    closeTalk();
    lazyPreload("making");
    setVState("making", true);
  }

  function chipPortfolio() {
    afterChip();
    var p = byId("portfolio");
    if (p && p.scrollIntoView) p.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function chipOrder() {
    closeTalk();
    lazyPreload("making");
    pendingCelebrate = true; /* milestone (+meow if sound on) after making ends */
    var wz = byId("wizard");
    var wasOpen = wz && !wz.hidden;
    if (typeof openWizard === "function") openWizard(cat);
    else if (wz) wz.hidden = false;
    /* wizard-open observer fires making only on a hidden→shown mutation;
       if it was already open, start the clip directly */
    if (wasOpen) setVState("making", true);
  }

  function chipSound() {
    afterChip(); /* toggles first, then the clip plays — same as the nav toggle */
    var t = byId("soundToggle");
    if (t) t.click(); else setAmbient(!soundOn());
  }

  /* click the cat → toggle talk mode (no more direct milestone on click) */
  if (cat) {
    cat.addEventListener("click", function () {
      if (REDUCED) return;
      lazyPreload("milestone"); lazyPreload("making");
      if (talkOpen) closeTalk(); else showTalk();
    });
  }

  /* (c) encouragement + "making" clip when the wizard opens */
  var wiz = byId("wizard");
  if (wiz && "MutationObserver" in window) {
    var wo = new MutationObserver(function () {
      if (wiz.hidden) return;
      if (!REDUCED) { lazyPreload("making"); setVState("making", true); }
      if (!seen.wizard && !REDUCED) {
        seen.wizard = true;
        showBubble("wizard_tip");
      }
    });
    wo.observe(wiz, { attributes: true, attributeFilter: ["hidden"] });
  }

  /* CTA hover (delegated — app.js re-renders buttons) → happy wiggle 600ms */
  var happyTimer = null;
  document.addEventListener("mouseover", function (e) {
    if (REDUCED || !cat) return;
    if (e.target && e.target.closest && e.target.closest(".btn")) {
      if (!cat.classList.contains("happy")) {
        cat.classList.add("happy");
        if (happyTimer) clearTimeout(happyTimer);
        happyTimer = setTimeout(function () { cat.classList.remove("happy"); }, 600);
      }
    }
  });

  /* ================= init ================= */
  initSoundToggle();
  renderMascotChrome();
})();
