/* =========================================================
   Montel · numbers count-up (shared: homepage, Data page, analytics/news/risk)
   Works on the Data stats bar (.data__grid) and the Key numbers bar
   (.key_numbers__rightcol). A year (e.g. 2060) counts up from this year.
   Reads each number from the Webflow heading (25+, 8, 30+...), so
   editors change the figure in the Designer and the animation follows.
   Counts from 0 when the bar scrolls into view; fires mtl:stat per number.
   ========================================================= */
(function () {
  'use strict';
  /* ---------------- Data section: numbers count up when they enter the viewport ---------------- */
  [['.data__grid', true], ['.key_numbers__rightcol', false]].forEach(function (scope) {
    [].slice.call(document.querySelectorAll(scope[0])).forEach(function (sec) { counters(sec, scope[1]); });
  });
  function counters(sec, signal) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var els = [].slice.call(sec.querySelectorAll('h3')).filter(function (e) { return !e.children.length && /^\s*\d[\d,.]*\s*[kKmM]?\+?\s*$/.test(e.textContent); });
    function fire(i) { if (signal) try { document.dispatchEvent(new CustomEvent('mtl:stat', { detail: { index: i } })); } catch (x) {} }
    function lightAll() { els.forEach(function (_, i) { fire(i); }); }
    if (!els.length) return;
    if (reduce || !('IntersectionObserver' in window)) { setTimeout(lightAll, 0); return; }
    els.forEach(function (e, i) {
      var raw = e.textContent.trim(), suf = raw.replace(/^[\d,.\s]+/, ''), plus = !!suf, to = parseFloat(raw.replace(/[^\d.]/g, '')), done = false;
      var year = !plus && /^\d{4}$/.test(raw) && to > 1900 && to < 2200, from = year ? Math.min(to, new Date().getFullYear()) : 0;
      /* already on screen or above it at boot (reload mid-page): keep the final number, no reset flash */
      if (e.getBoundingClientRect().top < window.innerHeight) { setTimeout(function () { fire(i); }, 0); return; }
      e.style.fontVariantNumeric = 'tabular-nums';
      e.style.minWidth = e.getBoundingClientRect().width + 'px';   /* no layout shift while the digits change */
      e.textContent = from + suf;
      var io = new IntersectionObserver(function (es) {
        var en = es[es.length - 1];
        if (done) return;
        if (!en.isIntersecting) return;
        done = true; io.disconnect();
        var t0 = performance.now() + i * 140, D = 1600 + Math.min(600, to - from);
        (function f(t) {
          var p = Math.max(0, Math.min(1, (t - t0) / D)), k = 1 - Math.pow(1 - p, 4);
          e.textContent = Math.round(from + (to - from) * k) + suf;
          if (p < 1) requestAnimationFrame(f); else { e.textContent = raw; fire(i); }
        })(performance.now());
      }, { threshold: .3 });
      io.observe(e);
      /* jumped past without it ever being on screen (anchor link, fast scroll): show the final number */
      function past() {
        if (done) return window.removeEventListener('scroll', past);
        if (e.getBoundingClientRect().top < 0) { done = true; io.disconnect(); e.textContent = raw; window.removeEventListener('scroll', past); fire(i); }
      }
      window.addEventListener('scroll', past, { passive: true });
    });
  }

})();
