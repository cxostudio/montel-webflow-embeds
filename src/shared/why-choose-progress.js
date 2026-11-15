/* Montel · "Why choose" values: progress fill on the active item's bar.
   Site-wide (component "Why choose", 31 instances). Registered in Webflow as an inline site script.
   The existing site-footer script stays the engine: it rotates .why_choose__list_item.active every
   4 s, pauses on hover and restarts on click. This only follows it: whenever an item becomes active,
   its .why_choose__list_item_bar_fill grows from 0 to 100% in the same 4 s, pauses on hover and
   restarts when the rotation restarts. Styling of the bar and fill is native (Designer classes). */
(function () {
  var MS = 4000; /* keep equal to the delay in the site-footer why_choose script */
  function init() {
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    [].forEach.call(document.querySelectorAll('.why_choose'), function (sec) {
      var items = [].slice.call(sec.querySelectorAll('.why_choose__list_item'));
      if (items.length < 2 || sec.__mtlWcp) return;
      sec.__mtlWcp = 1;
      var anim = null;
      function fill(it) { return it.querySelector('.why_choose__list_item_bar_fill'); }
      function run() {
        items.forEach(function (it) {
          var f = fill(it);
          if (f && !it.classList.contains('active')) {
            if (f.getAnimations) f.getAnimations().forEach(function (a) { a.cancel(); });
            f.style.transform = '';
          }
        });
        var act = items.filter(function (i) { return i.classList.contains('active'); })[0];
        var f = act && fill(act);
        if (!f) return;
        if (anim) anim.cancel();
        anim = null;
        if (reduce || !f.animate) { f.style.transform = 'scaleY(1)'; return; }
        anim = f.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: MS, easing: 'linear', fill: 'forwards' });
      }
      var mo = new MutationObserver(function (ms) {
        for (var i = 0; i < ms.length; i++) if (ms[i].target.classList.contains('active')) { run(); return; }
      });
      items.forEach(function (it) { mo.observe(it, { attributes: true, attributeFilter: ['class'] }); });
      var grid = sec.querySelector('.why_choose__grid');
      if (grid) {
        grid.addEventListener('mouseenter', function () { if (anim) anim.pause(); });
        grid.addEventListener('mouseleave', function () { if (anim) { anim.currentTime = 0; anim.play(); } });
      }
      run();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
