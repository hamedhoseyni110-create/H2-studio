/* masterfilm-p5.js — P5: Kinetic Word-Split Typography (Argon Priority 5).
 *
 * Headings never fade in as one flat block. Each WORD staggers in along
 * the Z-axis as the scroll playhead crosses it: from
 * translate3d(0, 22px, -60px) rotateX(35deg) + opacity 0 to identity,
 * 0.55s cubic-bezier(0.22, 1, 0.36, 1), 45ms stagger per word.
 *
 * RTL-safe (plan §1): split by WORD, never letters — each Persian word
 * stays one text node, so Vazirmatn cursive ligatures never break.
 * The film stage carries perspective: 1100px (masterfilm.css), so the
 * -60px Z + 35deg X read as real depth, not a flat squash.
 *
 * Triggers (plan §4 C1, CORRECTED 2026-11-08 — plan §7): ONE owner
 * per property per element.
 *  - Beat headings: the beat overlay's `.is-interactive` class, toggled
 *    by masterfilm.js (alpha > 0.55). P5 owns only the child word spans.
 *  - Section titles: the H2's entrance is driven by lion.js `apply()`
 *    (inline transform + opacity), NOT by reveal's `.in` — proven live:
 *    `.in` NEVER lands on the 12 titles inside tunnel-transformed
 *    sections (the IntersectionObserver stays silent there), while
 *    lion.js writes inline opacity 0.25→1 on every one as it enters.
 *    P5 therefore watches each title's `style` attribute with ONE
 *    shared MutationObserver and adds a `p5-in` class the moment
 *    lion.js starts driving that title. P5 owns only the child word
 *    spans + the `p5-in` class (a class, never a style — no fight over
 *    the H2's transform/opacity). The `.in` rule is kept for the lab
 *    title: inside the fixed modal (outside the tunnel) the observer
 *    DOES work and `.in` lands on modal open.
 * P5 adds NO IntersectionObserver and NO scroll listener. The
 * MutationObserver fires only when lion.js writes — i.e. only while
 * the page is scrolling; at rest it costs nothing.
 *
 * Re-split (plan §4 C2 — the language-switch trap): renderPage() re-fills
 * the 12 section-titles via textContent, which WIPES the word spans —
 * while dataset.kineticReady SURVIVES on the element. The flag alone is
 * therefore NOT a split-state signal. Split state is detected by the
 * PRESENCE of `.kinetic-word` children. Re-split trigger: the `h2:grids`
 * custom event (dispatched by app.js during renderPage).
 *
 * DEFERRAL (found while building, 2026-11-08 — plan §7): h2:grids fires
 * MID-renderPage (app.js:447/485/517) while the lab/process/faq/pricing/
 * stats/about/contact titles are filled AFTER the last dispatch. A
 * synchronous re-split on the event would miss those 7 titles on every
 * language switch. The re-split is therefore scheduled with
 * setTimeout(..., 0): it fires after renderPage returns, when ALL fills
 * are done. The trigger stays h2:grids; only its execution is deferred
 * to the end of the current task. The splitter is idempotent, so the
 * three dispatches per render collapse into no-op re-runs.
 *
 * SECTION-TITLE TRIGGER FIX (found while verifying, 2026-11-08 —
 * plan §7): the first build keyed section-title words off reveal's
 * `.in`. Live probes proved `.in` NEVER lands on the 12 titles inside
 * tunnel-transformed sections (test IntersectionObserver silent for 3s
 * with the title in view; 0 of 12 titles `.in` after a full scroll),
 * while lion.js `apply()` writes inline opacity 0.25→1 to every one —
 * so the words stayed at opacity 0 forever (invisible titles). The
 * fix: a shared MutationObserver on each title's `style` attribute
 * adds `p5-in` when lion.js starts driving it. The lab title (fixed
 * modal, outside the tunnel) is the one exception: there the observer
 * DOES work and `.in` lands on modal open, so the `.in` CSS rule is
 * kept alongside `.p5-in`. Deviation from plan C1, reason recorded
 * in plan §7.
 *
 * Beat headings are static (no JS touches them) — split once at init.
 * Empty headings are skipped (defensive: a title not yet filled at init
 * is caught by the next h2:grids re-split).
 *
 * Reduced motion (plan §4 C3): P5 never runs — no splitting, no
 * transforms, headings render as plain text. Same pattern as P4/P3:
 * the loop/handle never exists under RM.
 *
 * Scope (plan §2): splitter ONLY. Velocity skew is OUT (not specified
 * in Argon's P5 implementation section).
 */
(function () {
  'use strict';

  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (RM) return; /* P5 never runs under reduced motion */

  var SELECTOR = '.beat-heading, .section-title';
  var resplits = 0;

  function isSplit(heading) {
    /* C2: presence of .kinetic-word children — never the flag alone. */
    return heading.querySelector('.kinetic-word') !== null;
  }

  function splitHeading(heading) {
    if (isSplit(heading)) return false;
    var text = heading.textContent;
    var words = text.trim().split(/\s+/);
    if (words.length === 1 && words[0] === '') return false; /* empty title */
    heading.textContent = '';
    words.forEach(function (word, idx) {
      var span = document.createElement('span');
      span.className = 'kinetic-word';
      span.style.setProperty('--word-idx', idx);
      span.textContent = word;
      heading.appendChild(span);
      if (idx < words.length - 1) {
        heading.appendChild(document.createTextNode(' '));
      }
    });
    /* Argon's flag, kept for compatibility — NOT relied on (see C2). */
    heading.dataset.kineticReady = 'true';
    return true;
  }

  function splitAll() {
    var split = 0;
    var headings = document.querySelectorAll(SELECTOR);
    for (var i = 0; i < headings.length; i++) {
      if (splitHeading(headings[i])) split++;
      /* Section titles: watch the H2's style attribute for lion.js's
         entrance writes (see header). Idempotent per element. */
      if (headings[i].classList.contains('section-title')) {
        observeTitle(headings[i]);
        maybeShowTitle(headings[i]);
      }
    }
    if (split > 0) resplits++;
    return split;
  }

  /* ---- section-title trigger: hook lion.js's inline-style driver ---- */
  var titleObserver = null;

  function maybeShowTitle(el) {
    if (el.classList.contains('p5-in')) return;
    /* lion.js has not started driving this title yet — and, since the
       shield (2026-11-08), not risen above its 0.25 resting floor
       either: lion.js writes exactly 0.25 the moment a title peeks
       into view (pe=0), so the old truthy check fired one tick too
       early. The 0.26 threshold waits until the title genuinely
       starts rising (pe > ~0.013, ~4px into view). Verified by the
       shield suite's edge probe; revert this line if any title ever
       stops staggering (plan §7). */
    if (!(parseFloat(el.style.opacity) > 0.26)) return;
    /* Hidden title (lab modal closed): lion.js writes to its 0x0 rect
       too — do not show it until it is actually visible. When the
       modal opens, reveal's `.in` (which works outside the tunnel)
       shows the words instead. */
    if (el.offsetParent === null) return;
    if (el.getBoundingClientRect().height === 0) return;
    el.classList.add('p5-in');
  }

  function observeTitle(el) {
    if (el._p5Watched) return;
    el._p5Watched = true;
    if (!titleObserver) {
      titleObserver = new MutationObserver(function (records) {
        for (var i = 0; i < records.length; i++) {
          maybeShowTitle(records[i].target);
        }
      });
    }
    titleObserver.observe(el, { attributes: true, attributeFilter: ['style'] });
  }

  /* ---- P-EX1 fix (option 4, 2026-11-08 — plan §7): transient
     pointer-events:none on the beat-1 card ONLY while the film frame
     is 16–21 inclusive AND the card actually covers a rail tab.
     Grounding (probes p5-pex1-ground.py, pre-fix, + boundary probe
     p5-pex1-boundary.py on the fixed build): `[data-beat="1"]
     .work-showcase-card` (href #portfolio) is the ONE card that flies
     over the portfolio rail tabs on DESK at those frames
     (elementsFromPoint chain IMG.poster-img > A.card > BUTTON.tab);
     real taps there follow the card link to #portfolio instead of
     switching tabs (reproduced at all of 16,17,18,19,20,21).
     NOTE the window starts at 16, not 17: the inspector never probed
     16, but the boundary probe proves it dead (tab0 hits
     DIV.work-card-bar, tab1 hits IMG.poster-img, no switch) while 15
     is free (both tabs hit BUTTON, switch) — the boundary is sharp.
     v2 gate (2026-11-08, inspector Defect 1: the frame-driven toggle
     killed the card link on MOB 16–21, where the tabs were never
     blocked): the frame window 16–21 is only the OUTER gate (cheap
     pre-filter); the real condition is a hit-test — at apply-time,
     with FRESH rects (the tab centres move as the film scrolls),
     elementFromPoint at each of the first two tab centres, and the
     toggle turns on only when a tab centre's topmost element is the
     beat-1 card itself or one of its descendants (el.closest
     ('.work-showcase-card') === pex1Card). Grounding
     (p5-pex1-v2-ground2.py): DESK 15 free / 16–21 covered / 22 free;
     MOB 15–22 ALL free — so on mobile the link stays alive and the
     fix is a no-op, exactly as it should be.
     CRITICAL measurement subtlety (grounding round 1,
     p5-pex1-v2-ground.py): the off-class makes the card
     pointer-events:none, which elementFromPoint SKIPS — measuring
     with the class on reads "not covered" at DESK 16–21 and would
     flap the toggle OFF exactly where the fix is needed. So
     pex1Apply() REMOVES the class, measures, then sets the final
     state — all synchronous inside one task, so no paint can happen
     between (zero visual change). The chain alternative was probed
     and is DEAD in this Chromium: elementsFromPoint with the class
     on never includes the pe:none card in the chain.
     Edge cases: a tab centre outside the viewport gives
     elementFromPoint null → not covered (no tab to protect, link
     stays alive); absent tabs → defensive false; no scroll listener
     (the pill MutationObserver already fires per frame).
     The toggle is driven by the engine's OWN frame ground truth —
     `#seqStatusPill` text (`SEQ n • FRAME NNN / 120`, written by
     masterfilm.js in the rAF tick) — via MutationObserver, so it fires
     on every pill update, including instant jumps. The class only
     toggles pointer-events (CSS below); the card's rects and rendering
     are untouched — zero visual change. The link returns the moment
     the frame leaves the window (observer fires on the pill change).
     RM: this IIFE returns early under RM, so this section never runs
     there — under RM the film is a static stacked column with no
     flying card and no dead window (grounding G5: pill frozen at
     FRAME 072, card centre hits the card itself, pe:auto), so no fix
     is needed and no link is ever killed. */
  var PEX1_FIRST = 16, PEX1_LAST = 21;
  var pex1Card = null;
  var pex1Off = false;
  var pex1CoveredState = false;

  function pex1Frame() {
    var pill = document.getElementById('seqStatusPill');
    if (!pill) return null;
    var m = /FRAME\s+(\d+)/.exec(pill.textContent || '');
    if (!m) return null;
    return parseInt(m[1], 10) - 1; /* pill shows 1-based FRAME, engine is 0-based */
  }

  /* True geometric coverage: does the beat-1 card (clickable state)
     cover either of the first two rail-tab centres right now? Fresh
     rects every call — the tab centres move as the film scrolls.
     Callers MUST neutralize the off-class first (see pex1Apply):
     with the class on, elementFromPoint skips the pe:none card and
     always reads "not covered". */
  function pex1Covered() {
    if (!pex1Card) return false;
    var tabs = document.querySelectorAll('#worksTabs .works-tab');
    if (!tabs || tabs.length === 0) return false; /* defensive: no tabs, no fix */
    for (var i = 0; i < Math.min(2, tabs.length); i++) {
      var r = tabs[i].getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      var el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (!el) continue; /* centre outside the viewport: no tab to protect */
      var anc = el.closest ? el.closest('.work-showcase-card') : null;
      if (anc === pex1Card) return true;
    }
    return false;
  }

  function pex1Apply() {
    if (!pex1Card) return;
    var f = pex1Frame();
    var inWindow = (f !== null && f >= PEX1_FIRST && f <= PEX1_LAST);
    /* Neutralize-measure-restore, synchronous: remove the off-class
       so elementFromPoint sees the card clickable, measure, then set
       the final state. No early return before the final toggle — the
       class must always end in the computed state. No paint happens
       inside this task. */
    if (pex1Card.classList.contains('p5-pex1-off')) {
      pex1Card.classList.remove('p5-pex1-off');
    }
    var covered = inWindow ? pex1Covered() : false;
    var off = covered;
    pex1CoveredState = covered;
    pex1Off = off;
    pex1Card.classList.toggle('p5-pex1-off', off);
  }

  function pex1State() {
    return {
      frame: pex1Frame(),
      off: pex1Off,
      covered: pex1CoveredState,
      cardFound: pex1Card !== null,
      cardHasClass: pex1Card ? pex1Card.classList.contains('p5-pex1-off') : false
    };
  }

  function pex1Init() {
    pex1Card = document.querySelector('[data-beat="1"] .work-showcase-card');
    if (!pex1Card) return; /* defensive: no beat-1 card, no fix */
    var pill = document.getElementById('seqStatusPill');
    if (!pill || !window.MutationObserver) return;
    var obs = new MutationObserver(pex1Apply);
    obs.observe(pill, { childList: true, characterData: true, subtree: true });
    pex1Apply();
  }

  /* ---- LAB fix (Defect 1, 2026-11-09 — plan work/lab-defect-fix-plan.md) ----
   * The lab trigger (#labTrigger) slides up behind the two stacked beat-4
   * cards on MOB at film frames ~86–93 (peak window): the cards sit nearly
   * still on screen while the trigger's centre passes through their rects,
   * so a centre-tap hits the card link and the modal never opens. DESK is
   * unaffected (the trigger centre falls in the horizontal gap between the
   * side-by-side cards). Same shape as the P-EX1 fix: watch #seqStatusPill
   * and add class `p5-lab-off` to the ONE beat-4 card that actually covers
   * the trigger centre right now (hit-test-gated, fresh rects every apply),
   * so the tap falls through to the trigger; the link returns the moment
   * coverage ends. The class only toggles pointer-events (CSS below); the
   * cards' rects and rendering are untouched — zero visual change, and the
   * beat-4 frame lock (cards never move) is preserved. RM: this IIFE
   * returns early under RM, so this section never runs there — under RM the
   * film is a static stacked column with no flying card and no cover. */
  var LAB_FIRST = 80, LAB_LAST = 96;
  var labTrigger = null;
  var labCards = [];
  var labCoveredState = null; /* the covering card, or null */

  /* Which beat-4 card (if any) covers the lab trigger's centre right now?
     Callers MUST neutralize the off-class first (see labApply):
     with the class on, elementFromPoint skips the pe:none card and always
     reads "not covered" — the P-EX1 v2 lesson. */
  function labCovered() {
    if (!labTrigger || labCards.length === 0) return null;
    var r = labTrigger.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null; /* defensive: no trigger, no fix */
    var el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!el) return null; /* centre outside the viewport: nothing to protect */
    var anc = el.closest ? el.closest('.work-showcase-card') : null;
    if (!anc) return null;
    for (var i = 0; i < labCards.length; i++) {
      if (anc === labCards[i]) return labCards[i];
    }
    return null;
  }

  function labApply() {
    if (!labTrigger || labCards.length === 0) return;
    var f = pex1Frame();
    var inWindow = (f !== null && f >= LAB_FIRST && f <= LAB_LAST);
    /* Neutralize-measure-restore, synchronous: remove the off-class from
       BOTH cards so elementFromPoint sees them clickable, measure, then set
       the final state. No early return before the final toggle — each card
       must always end in its computed state. No paint happens inside this
       task. */
    for (var i = 0; i < labCards.length; i++) {
      if (labCards[i].classList.contains('p5-lab-off')) {
        labCards[i].classList.remove('p5-lab-off');
      }
    }
    var covering = inWindow ? labCovered() : null;
    labCoveredState = covering;
    for (var j = 0; j < labCards.length; j++) {
      labCards[j].classList.toggle('p5-lab-off', labCards[j] === covering);
    }
  }

  function labState() {
    return {
      frame: pex1Frame(),
      off: labCards.map(function (c) { return c.classList.contains('p5-lab-off'); }),
      covered: labCoveredState ? labCards.indexOf(labCoveredState) : -1,
      triggerFound: labTrigger !== null,
      cardsFound: labCards.length
    };
  }

  function labInit() {
    labTrigger = document.querySelector('#labTrigger');
    labCards = Array.prototype.slice.call(document.querySelectorAll('[data-beat="4"] .work-showcase-card'));
    if (!labTrigger || labCards.length === 0) return; /* defensive: no trigger/cards, no fix */
    var pill = document.getElementById('seqStatusPill');
    if (!pill || !window.MutationObserver) return;
    var obs = new MutationObserver(labApply);
    obs.observe(pill, { childList: true, characterData: true, subtree: true });
    labApply();
  }

  /* ---- lifecycle ---- */
  function init() {
    splitAll();
    pex1Init();
    labInit();
    /* h2:grids fires mid-renderPage — defer to end of task (see header). */
    window.addEventListener('h2:grids', function () {
      setTimeout(splitAll, 0);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ---- verification handle ---- */
  window.__p5Kinetic = {
    splitAll: splitAll,
    state: function () {
      var headings = document.querySelectorAll(SELECTOR);
      var beats = 0, sections = 0, words = 0;
      for (var i = 0; i < headings.length; i++) {
        var spans = headings[i].querySelectorAll('.kinetic-word').length;
        words += spans;
        if (headings[i].classList.contains('beat-heading')) beats++;
        else if (headings[i].classList.contains('section-title')) sections++;
      }
      return {
        headings: headings.length,
        beatHeadings: beats,
        sectionTitles: sections,
        splitHeadings: (function () {
          var n = 0;
          for (var j = 0; j < headings.length; j++) {
            if (isSplit(headings[j])) n++;
          }
          return n;
        })(),
        words: words,
        resplits: resplits,
        p5InTitles: (function () {
          var n = 0;
          for (var k = 0; k < headings.length; k++) {
            if (headings[k].classList.contains('p5-in')) n++;
          }
          return n;
        })(),
        pex1: pex1State(),
        lab: labState()
      };
    }
  };
})();
