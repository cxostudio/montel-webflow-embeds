/* =========================================================
   Montel · Data page mount  (runs before the animations init)
   Swaps the static hero image for the live hero map on /data.
   This bundle is only loaded on that page.
   ========================================================= */
(function () {
  'use strict';
  var box = document.querySelector('.page_hero__img_container');
  if (!box || box.querySelector('[data-mtl-map]')) return;
  var wrap = document.createElement('div');
  wrap.className = 'mtl-hero-mount';
  wrap.innerHTML = "<div class=\"mtl-map\" data-mtl-map><div class=\"mtl-map__stage\"><canvas class=\"mtl-map__canvas\" aria-hidden=\"true\"></canvas></div><div class=\"mtl-map__card\" aria-live=\"polite\"><div class=\"mtl-map__head\"><h3 class=\"mtl-map__name\">Germany</h3><div class=\"mtl-map__seg\"><span class=\"is-on\">Power</span><span>Gas</span><span>Carbon</span></div></div><p class=\"mtl-map__label\">Day-ahead baseload \u00b7 EUR/MWh</p><div class=\"mtl-map__price\"><span class=\"mtl-map__value\">92.40</span><span class=\"mtl-map__chg\">\u25b2 4.1%</span></div><ul class=\"mtl-map__rows\"><li class=\"mtl-map__row\"><span>Wind</span><span class=\"mtl-map__bar\"><i style=\"width:40.4%;--c:#43c39a\"></i></span><b>18.2 GW</b></li><li class=\"mtl-map__row\"><span>Solar</span><span class=\"mtl-map__bar\"><i style=\"width:21.3%;--c:#a9e6cc\"></i></span><b>9.6 GW</b></li><li class=\"mtl-map__row\"><span>Demand</span><span class=\"mtl-map__bar\"><i style=\"width:81.3%;--c:#a58cf2\"></i></span><b>61.0 GW</b></li></ul><div class=\"mtl-map__news\"><p class=\"mtl-map__news-k\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\"><rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"M7 9h10M7 13h6\"/></svg>News \u00b7 <span class=\"mtl-map__news-time\">08:45</span></p><p class=\"mtl-map__news-t\">Cooler week ahead lifts demand forecast</p></div></div><div class=\"mtl-map__ping\" aria-hidden=\"true\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\"><rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"M7 9h10M7 13h6\"/></svg><span>News \u00b7 08:45</span></div><div class=\"mtl-map__tip\" aria-hidden=\"true\"></div><div class=\"mtl-map__foot\"><span>Power, gas and carbon across connected markets</span><span class=\"mtl-map__scale\">Day-ahead price \u00b7 low <i style=\"background:#14987c\"></i><i style=\"background:#55bf9f\"></i><i style=\"background:#9cb8b0\"></i><i style=\"background:#a088f0\"></i><i style=\"background:#7140f4\"></i> high</span></div></div>";
  /* keep the hero's original proportions: use the replaced image's ratio */
  var img = box.querySelector('img');
  var w = img && (+img.getAttribute('width') || img.naturalWidth), h = img && (+img.getAttribute('height') || img.naturalHeight);
  if (!(w && h) && img) { var r = img.getBoundingClientRect(); w = r.width; h = r.height; }
  if (w && h) wrap.style.setProperty('--mtl-hero-ar', w + ' / ' + h);
  box.classList.add('has-mtl-map');
  box.appendChild(wrap);
})();
