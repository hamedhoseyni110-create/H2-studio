/* H2 Studio — mini music player (SoundCloud embeds, no local audio hosting).
 *
 * TRACK CONFIG: paste SoundCloud track page URLs here. Empty array → clean
 * «به‌زودی» / "Soon" empty state, nothing external is loaded.
 *
 *   var MUSIC_TRACKS = [
 *     { title: "نام آهنگ", artist: "هنرمند", sc: "https://soundcloud.com/artist/track" },
 *   ];
 *
 * Architecture: streams via the SoundCloud widget iframe (w.soundcloud.com).
 * The widget API script is lazy-loaded ONLY on first play with ≥1 track —
 * zero external requests otherwise. Honors the site's ONE master sound
 * concept (localStorage "h2-sound", toggled in the nav): master off → player
 * stays paused; turning master back on resumes a track that was playing.
 *
 * Bilingual labels come from COPY[lang].ui.player (assets/copy-data.js);
 * window.H2MP.refresh() re-renders labels on language switch.
 * No console output in any path.
 */

var MUSIC_TRACKS = [
  // { title: "نام آهنگ", artist: "هنرمند", sc: "https://soundcloud.com/artist/track" },
];

(function () {
  "use strict";

  var SOUND_KEY = "h2-sound";
  var SC_API = "https://w.soundcloud.com/player/api.js";
  var WIDGET_BASE = "https://w.soundcloud.com/player/?";

  var host = null, els = {};
  var cur = 0;                 // current track index
  var widget = null;           // SC.Widget instance
  var apiReady = false, apiLoading = false, apiQueue = [];
  var playing = false;         // last known widget state
  var resumeWanted = false;    // was playing when master sound turned off
  var P = null;                // current-language player copy
  var built = false;

  function $(id) { return document.getElementById(id); }
  function lang() {
    try {
      var s = localStorage.getItem("h2-lang");
      if (s === "en" || s === "fa") return s;
    } catch (e) { /* noop */ }
    return (typeof COPY !== "undefined" && COPY.en) ? "fa" : "fa";
  }
  function copy() {
    if (typeof COPY !== "undefined" && COPY[lang()] && COPY[lang()].ui && COPY[lang()].ui.player) {
      return COPY[lang()].ui.player;
    }
    return { title: "", play: "", pause: "", list_title: "", empty: "", expand: "", collapse: "", master_off_note: "", unknown: "" };
  }
  function masterOn() {
    try { return localStorage.getItem(SOUND_KEY) === "1"; } catch (e) { return false; }
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  var SVG_PLAY = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z"/></svg>';
  var SVG_PAUSE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 2.5h3.4v11H3.5zM9.1 2.5h3.4v11H9.1z"/></svg>';
  var SVG_CHEV = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6.5 8 11.5 13 6.5"/></svg>';

  function widgetUrl(track, autoplay) {
    return WIDGET_BASE + "url=" + encodeURIComponent(track.sc) +
      "&color=%2334d399&auto_play=" + (autoplay ? "true" : "false") +
      "&hide_related=true&show_comments=false&show_user=false" +
      "&show_reposts=false&show_teaser=false&visual=false";
  }

  function ensureApi(cb) {
    if (apiReady) { cb(); return; }
    apiQueue.push(cb);
    if (apiLoading) return;
    apiLoading = true;
    var s = document.createElement("script");
    s.src = SC_API;
    s.async = true;
    s.onload = function () {
      apiReady = true; apiLoading = false;
      var q = apiQueue; apiQueue = [];
      for (var i = 0; i < q.length; i++) { try { q[i](); } catch (e) { /* noop */ } }
    };
    s.onerror = function () { apiLoading = false; apiQueue = []; };
    document.head.appendChild(s);
  }

  function ensureWidget(cb) {
    if (widget) { cb(); return; }
    ensureApi(function () {
      try {
        var fr = document.createElement("iframe");
        fr.setAttribute("title", "");
        fr.setAttribute("allow", "autoplay");
        fr.src = widgetUrl(MUSIC_TRACKS[cur], false);
        els.widget.appendChild(fr);
        /* global SC */
        widget = SC.Widget(fr);
        widget.bind(SC.Widget.Events.READY, function () {
          widget.bind(SC.Widget.Events.PLAY, function () { setPlaying(true); });
          widget.bind(SC.Widget.Events.PAUSE, function () { setPlaying(false); });
          widget.bind(SC.Widget.Events.FINISH, function () { next(true); });
          cb();
        });
      } catch (e) { /* widget unavailable — stay paused */ }
    });
  }

  function setPlaying(on) {
    playing = on;
    renderBar();
  }

  function showNote() {
    els.note.textContent = P.master_off_note;
    els.note.classList.add("show");
    setTimeout(function () { els.note.classList.remove("show"); }, 2600);
  }

  function play() {
    if (!MUSIC_TRACKS.length) return;
    if (!masterOn()) { showNote(); return; }
    resumeWanted = false;
    ensureWidget(function () {
      try { widget.play(); } catch (e) { /* noop */ }
    });
  }

  function pause() {
    if (widget) { try { widget.pause(); } catch (e) { /* noop */ } }
    setPlaying(false);
  }

  function toggle() {
    if (!MUSIC_TRACKS.length) return;
    if (playing) pause(); else play();
  }

  function select(i, autoplay) {
    if (!MUSIC_TRACKS.length) return;
    cur = ((i % MUSIC_TRACKS.length) + MUSIC_TRACKS.length) % MUSIC_TRACKS.length;
    resumeWanted = false;
    renderList(); renderBar();
    if (widget) {
      try {
        var self = this;
        widget.load(MUSIC_TRACKS[cur].sc, {
          auto_play: !!autoplay && masterOn(),
          color: "34d399",
          hide_related: true, show_comments: false, show_user: false,
          show_reposts: false, show_teaser: false, visual: false,
          callback: function () { if (autoplay && masterOn()) setPlaying(true); }
        });
      } catch (e) { /* noop */ }
    } else if (autoplay) {
      play();
    }
  }

  function next(autoplay) {
    select(cur + 1, autoplay !== false);
  }

  /* ---------- rendering ---------- */

  function trackName(t) {
    var name = t.title || P.unknown;
    return t.artist ? name + " — " + t.artist : name;
  }

  function renderBar() {
    var t = MUSIC_TRACKS[cur];
    els.play.innerHTML = playing ? SVG_PAUSE : SVG_PLAY;
    els.play.setAttribute("aria-label", playing ? P.pause : P.play);
    els.play.toggleAttribute("disabled", !MUSIC_TRACKS.length);
    els.title.textContent = t ? trackName(t) : P.title;
    els.sub.textContent = t ? P.title : "";
    els.chev.setAttribute("aria-label", listOpen ? P.collapse : P.expand);
    els.chev.setAttribute("aria-expanded", listOpen ? "true" : "false");
    var curBtn = els.tracks.querySelector('[data-i="' + cur + '"]');
    els.tracks.querySelectorAll(".mp-track").forEach(function (b) {
      var isCur = b === curBtn;
      b.setAttribute("aria-current", isCur ? "true" : "false");
      b.classList.toggle("paused-eq", isCur && !playing);
    });
  }

  function renderList() {
    els.listTitle.textContent = P.list_title;
    els.tracks.innerHTML = "";
    els.empty.style.display = MUSIC_TRACKS.length ? "none" : "";
    els.empty.textContent = P.empty;
    MUSIC_TRACKS.forEach(function (t, i) {
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "mp-track";
      b.setAttribute("data-i", i);
      b.setAttribute("aria-current", i === cur ? "true" : "false");
      if (i === cur && !playing) b.classList.add("paused-eq");
      var nm = document.createElement("span");
      nm.className = "t-name";
      nm.setAttribute("dir", "auto");
      nm.textContent = trackName(t);
      var idx = document.createElement("span");
      idx.className = "t-idx";
      idx.textContent = String(i + 1);
      var eq = document.createElement("span");
      eq.className = "t-eq";
      eq.setAttribute("aria-hidden", "true");
      eq.innerHTML = "<i></i><i></i><i></i>";
      b.appendChild(idx); b.appendChild(nm); b.appendChild(eq);
      b.addEventListener("click", function () { select(i, true); });
      li.appendChild(b);
      els.tracks.appendChild(li);
    });
  }

  var listOpen = false;
  function setList(open) {
    listOpen = open;
    els.list.hidden = !open;
    renderBar();
  }

  function build() {
    host = document.createElement("div");
    host.className = "music-player";
    host.id = "musicPlayer";
    host.setAttribute("aria-label", "");
    host.innerHTML =
      '<div class="mp-bar">' +
        '<button class="mp-play" id="mpPlay" type="button"></button>' +
        '<button class="mp-meta" id="mpMeta" type="button" aria-expanded="false"></button>' +
        '<button class="mp-chev" id="mpChev" type="button" aria-expanded="false">' + SVG_CHEV + "</button>" +
      "</div>" +
      '<div class="mp-list" id="mpList" hidden>' +
        '<div class="mp-list-head" id="mpListTitle"></div>' +
        '<ol class="mp-tracks" id="mpTracks"></ol>' +
        '<div class="mp-empty" id="mpEmpty"></div>' +
        '<div class="mp-note" id="mpNote" role="status"></div>' +
      "</div>" +
      '<div class="mp-widget" id="mpWidget" aria-hidden="true"></div>';
    document.body.appendChild(host);

    els.play = $("mpPlay"); els.meta = $("mpMeta"); els.chev = $("mpChev");
    els.list = $("mpList"); els.listTitle = $("mpListTitle");
    els.tracks = $("mpTracks"); els.empty = $("mpEmpty");
    els.note = $("mpNote"); els.widget = $("mpWidget");
    els.title = document.createElement("span"); els.title.className = "mp-title"; els.title.setAttribute("dir", "auto");
    els.sub = document.createElement("span"); els.sub.className = "mp-sub";
    els.meta.appendChild(els.title); els.meta.appendChild(els.sub);

    els.play.addEventListener("click", toggle);
    els.meta.addEventListener("click", function () { setList(!listOpen); });
    els.meta.setAttribute("aria-expanded", "false");
    els.chev.addEventListener("click", function () { setList(!listOpen); });

    // master sound integration: one master concept — off pauses, on resumes
    window.addEventListener("h2:sound", function (e) {
      var on = !!(e && e.detail && e.detail.on);
      if (!on) {
        resumeWanted = playing;
        pause();
      } else if (resumeWanted && MUSIC_TRACKS.length) {
        resumeWanted = false;
        play();
      }
    });

    built = true;
  }

  function refresh() {
    if (!built) build();
    P = copy();
    host.setAttribute("aria-label", P.title);
    renderList();
    setList(listOpen);
    els.meta.setAttribute("aria-expanded", listOpen ? "true" : "false");
  }

  window.H2MP = { refresh: refresh };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refresh);
  } else {
    refresh();
  }
})();
