/* Montel hero · Slide 4 · Secure & price PPAs
   Story: two parties with opposite needs, the PPA connects them, the offer
   is checked against Montel's fair range and lands inside it; the daily
   solar profile explains the capture rate.
   Idle: electricity and money keep flowing between the two parties. */
MontelMotion.register('ppa', function (ctx) {
  var h = ctx.h, tl = ctx.tl, root = ctx.root, reduce = ctx.reduce;
  var svg = h.$('.mtl-ppa__svg', root), flow = h.$('.mtl-ppa__flow', root);
  svg.innerHTML = ''; flow.innerHTML = '';
  var uid = 'mtl-ppa-' + Math.random().toString(36).slice(2, 7);
  var defs = h.svg('defs', {}, svg);
  var lg = h.svg('linearGradient', { id: uid + 'r', x1: 0, x2: 1, y1: 0, y2: 0 }, defs);
  h.svg('stop', { offset: 0, 'stop-color': '#8fdcbf' }, lg); h.svg('stop', { offset: 1, 'stop-color': '#0d6d5c' }, lg);

  /* ---- fair price range (card pixels, card origin 882,123) ---- */
  var PX = function (eur) { return 36 + (eur - 30) * 22.92; };   // 30 .. 55 EUR/MWh
  var track = h.svg('rect', { x: 36, y: 262, width: 573, height: 14, rx: 7, fill: '#e7ecea' }, svg);
  var range = h.svg('rect', { x: PX(37), y: 262, width: PX(47.4) - PX(37), height: 14, rx: 7, fill: 'url(#' + uid + 'r)' }, svg);
  var mk = h.svg('g', {}, svg);
  h.svg('rect', { x: -2, y: 245, width: 4, height: 48, rx: 2, fill: '#6a2ff6' }, mk);
  var offerT = h.svg('text', { x: 0, y: 239, 'text-anchor': 'middle', fill: '#6a2ff6', 'font-size': 17, 'font-weight': 500, 'font-family': 'inherit' }, mk);
  var setOffer = function (v) { gsap.set(mk, { x: PX(v) }); offerT.textContent = 'Offer ' + v.toFixed(1); };
  setOffer(42.5);
  [[30, 'start'], [38, 'middle'], [46, 'middle'], [55, 'end']].forEach(function (a) {
    h.svg('text', { x: a[0] === 55 ? 609 : PX(a[0]) + (a[0] === 38 ? -12 : a[0] === 46 ? -11 : 0), y: 322, 'class': 'mtl-axis', 'text-anchor': a[0] === 38 || a[0] === 46 ? 'start' : a[1] }, svg).textContent = a[0];
  });
  h.svg('line', { x1: 36, x2: 609, y1: 349, y2: 349, stroke: '#e4ebe9', 'stroke-width': 1.4 }, svg);

  /* ---- one day: solar output vs price ---- */
  var TX = function (hr) { return 43 + hr * 23.42; };           // 00:00 .. 24:00
  var base = 564;
  h.svg('line', { x1: 36, x2: 609, y1: base, y2: base, 'class': 'mtl-grid' }, svg);
  [['00:00', TX(0), 'start'], ['12:00', TX(12), 'middle'], ['24:00', TX(24), 'end']].forEach(function (a) {
    h.svg('text', { x: a[0] === '00:00' ? 38 : a[1], y: 594, 'class': 'mtl-axis', 'text-anchor': a[2] }, svg).textContent = a[0];
  });
  var sol = [], i;
  for (i = 0; i <= 40; i++) { var hr = 5.7 + i * (12.6 / 40), t = (hr - 5.7) / 12.6; sol.push([TX(hr), base - Math.pow(Math.max(0, Math.sin(Math.PI * t)), 1.6) * 135]); }
  var area = h.svg('path', { d: h.smooth(sol) + ' Z', fill: '#c4f0dd' }, svg);
  /* price curve traced from the design, in canvas y */
  var price = [[0,597],[2,607],[4,620],[5.5,633],[7,648],[8.5,655],[10,657],[11.5,655],[12.5,645],[14,625],[15.5,602],[17,582],[18,572],[19,570],[20.5,572],[22.5,582],[24,595]];
  var pY = function (y) { return y - 123; };
  var pLine = h.svg('path', { d: h.smooth(price.map(function (p) { return [TX(p[0]), pY(p[1])]; })), fill: 'none', stroke: '#6a2ff6', 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);

  /* ---- flow arrows between the parties (layer pixels, origin 380,740) ---- */
  var aE = h.svg('path', { d: 'M30 62 H114', stroke: '#0d6d5c', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }, flow);
  var hE = h.svg('path', { d: 'M106 54 L118 62 L106 70 Z', fill: '#0d6d5c' }, flow);
  var aP = h.svg('path', { d: 'M117 143 H33', stroke: '#6a2ff6', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }, flow);
  var hP = h.svg('path', { d: 'M40 135 L27 143 L40 151 Z', fill: '#6a2ff6' }, flow);
  var dE = h.svg('circle', { cx: 30, cy: 62, r: 5, fill: '#1a9f82', opacity: 0 }, flow);
  var dP = h.svg('circle', { cx: 117, cy: 143, r: 5, fill: '#8a5cff', opacity: 0 }, flow);

  /* ---- intro ---- */
  h.draw(aE, tl, 1.1, .7, 'power2.out');
  tl.fromTo(hE, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: .3 }, 1.7);
  h.draw(aP, tl, 1.6, .7, 'power2.out');
  tl.fromTo(hP, { opacity: 0, x: 8 }, { opacity: 1, x: 0, duration: .3 }, 2.2);

  var tiles = h.$$('.mtl-ppa__tiles > div', root);
  tl.from(tiles, { y: 12, autoAlpha: 0, duration: .6, stagger: .1 }, .7);
  h.counters(h.$('.mtl-ppa__tiles', root), tl, .8, 1);
  tl.fromTo([track], { opacity: 0 }, { opacity: 1, duration: .5 }, 1.0)
    .fromTo(range, { scaleX: 0, svgOrigin: PX(42.2) + ' 269' }, { scaleX: 1, duration: reduce ? .01 : 1, ease: 'power3.inOut' }, 1.2);
  var sweep = { v: 30.5 };
  tl.fromTo(mk, { opacity: 0 }, { opacity: 1, duration: .3 }, 1.6)
    .to(sweep, { v: 42.5, duration: reduce ? .01 : 1.5, ease: 'power3.inOut', onUpdate: function () { setOffer(sweep.v); } }, 1.6);
  var ok = h.$('.mtl-ppa__ok', root), tick = h.$('.mtl-ppa__tick', root);
  tl.fromTo(ok, { scale: .6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: .6, ease: 'back.out(2.5)' }, 3.0);
  h.draw(tick, tl, 3.2, .45, 'power2.out');

  tl.fromTo(area, { scaleY: 0, svgOrigin: TX(12) + ' ' + base }, { scaleY: 1, duration: reduce ? .01 : 1.4, ease: 'power2.out' }, 2.0);
  h.draw(pLine, tl, 2.2, 1.6);
  h.counters(h.$('.mtl-ppa__cap', root), tl, 3.0, 1.4);

  /* ---- idle: value flows both ways, the offer is re-checked now and then ---- */
  ctx.loop(function () {
    gsap.fromTo(dE, { attr: { cx: 30 }, opacity: 0 }, { keyframes: [{ opacity: 1, duration: .15 }, { attr: { cx: 112 }, duration: 1, ease: 'power1.inOut' }, { opacity: 0, duration: .15 }] });
    gsap.fromTo(dP, { attr: { cx: 117 }, opacity: 0 }, { delay: .9, keyframes: [{ opacity: 1, duration: .15 }, { attr: { cx: 35 }, duration: 1, ease: 'power1.inOut' }, { opacity: 0, duration: .15 }] });
  }, 2.6, 4.2);
  var n = 0;
  ctx.loop(function () {
    n++;
    var v = { v: n % 2 ? 42.5 : 43.4 }, to = n % 2 ? 43.4 : 42.5;
    gsap.to(v, { v: to, duration: 1.1, ease: 'power3.inOut', onUpdate: function () { setOffer(v.v); } });
  }, 5, 7);
});
