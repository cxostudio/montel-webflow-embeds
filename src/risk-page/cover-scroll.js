/* =========================================================
   Montel · "cover" scroll (Risk page)
   A section whose variant puts it in front (position relative,
   z-index >= 2) with rounded top corners slides over the section
   before it, which holds still until it is covered (as on
   shopify.com/website/builder). The look is set in Webflow
   (variants "… covers section above"); this only holds the
   section underneath in place. Desktop only (>= 992px).
   ========================================================= */
(function () {
  'use strict';
  var main = document.querySelector('main') || document.body;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var desk = window.matchMedia && matchMedia('(min-width: 992px)');
  if (reduce || !desk) return;
  var pairs = [], raf = 0;

  function find() {
    pairs = [];
    [].slice.call(main.children).forEach(function (c) {
      var cs = getComputedStyle(c), p = c.previousElementSibling;
      if (p && cs.position === 'relative' && (+cs.zIndex || 0) >= 2 && parseFloat(cs.borderTopLeftRadius) > 0) pairs.push([p, c]);
    });
  }
  function update() {
    raf = 0;
    var vh = window.innerHeight;
    pairs.forEach(function (pr) {
      var p = pr[0], c = pr[1], y = 0;
      if (desk.matches) {
        var r = c.getBoundingClientRect(), ph = p.offsetHeight;
        /* hold the lower section still: its bottom stays on the bottom edge (tall sections)
           or its top stays on the top edge (short ones), never leaving a gap above it,
           and never reaching past the bottom of the section that covers it */
        y = Math.max(0, Math.min(vh - r.top, ph - r.top, vh, r.height));
      }
      var t = y ? 'translate3d(0,' + y.toFixed(1) + 'px,0)' : '';
      if (p.style.transform !== t) p.style.transform = t;
    });
  }
  function queue() { if (!raf) raf = requestAnimationFrame(update); }
  function init() {
    find(); if (!pairs.length) return;
    pairs.forEach(function (pr) { pr[0].style.willChange = 'transform'; });
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', function () { find(); queue(); });
    if (desk.addEventListener) desk.addEventListener('change', queue);
    update();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
