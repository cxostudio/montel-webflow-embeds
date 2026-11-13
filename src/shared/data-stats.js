/* =========================================================
   Montel · stats bar count-up (shared: homepage + Data page)
   Reads each number from the Webflow heading (25+, 8, 30+...), so
   editors change the figure in the Designer and the animation follows.
   Counts from 0 when the bar scrolls into view; fires mtl:stat per number.
   ========================================================= */
(function () {
  'use strict';
  /* ---------------- Data section: numbers count up when they enter the viewport ---------------- */
  (function counters() {
    var sec = document.querySelector('.data__grid'); if (!sec) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var els = [].slice.call(sec.querySelectorAll('h3')).filter(function (e) { return !e.children.length && /^\s*\d[\d,.]*\+?\s*$/.test(e.textContent); });
    function lightAll() { els.forEach(function (_, i) { try { document.dispatchEvent(new CustomEvent('mtl:stat', { detail: { index: i } })); } catch (x) {} }); }
    if (!els.length) return;
    if (reduce || !('IntersectionObserver' in window)) { setTimeout(lightAll, 0); return; }
    els.forEach(function (e, i) {
      var raw = e.textContent.trim(), plus = /\+$/.test(raw), to = parseFloat(raw.replace(/[^\d.]/g, '')), done = false;
      /* already on screen or above it at boot (reload mid-page): keep the final number, no reset flash */
      if (e.getBoundingClientRect().top < window.innerHeight) { setTimeout(function () { try { document.dispatchEvent(new CustomEvent('mtl:stat', { detail: { index: i } })); } catch (x) {} }, 0); return; }
      e.style.fontVariantNumeric = 'tabular-nums';
      e.style.minWidth = e.getBoundingClientRect().width + 'px';   /* no layout shift while the digits change */
      e.textContent = '0' + (plus ? '+' : '');
      var io = new IntersectionObserver(function (es) {
        var en = es[es.length - 1];
        if (done) return;
        if (!en.isIntersecting) return;
        done = true; io.disconnect();
        var t0 = performance.now() + i * 140, D = 1600 + Math.min(600, to);
        (function f(t) {
          var p = Math.max(0, Math.min(1, (t - t0) / D)), k = 1 - Math.pow(1 - p, 4);
          e.textContent = Math.round(to * k) + (plus ? '+' : '');
          if (p < 1) requestAnimationFrame(f); else { e.textContent = raw; try { document.dispatchEvent(new CustomEvent('mtl:stat', { detail: { index: i } })); } catch (x) {} }
        })(performance.now());
      }, { threshold: .3 });
      io.observe(e);
      /* jumped past without it ever being on screen (anchor link, fast scroll): show the final number */
      function past() {
        if (done) return window.removeEventListener('scroll', past);
        if (e.getBoundingClientRect().top < 0) { done = true; io.disconnect(); e.textContent = raw; window.removeEventListener('scroll', past); try { document.dispatchEvent(new CustomEvent('mtl:stat', { detail: { index: i } })); } catch (x) {} }
      }
      window.addEventListener('scroll', past, { passive: true });
    });
  })();

})();
