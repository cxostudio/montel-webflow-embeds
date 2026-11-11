/* Montel hero · Slide 3 · Value & manage assets
   Story: the plant is introduced, revenue ranges open up year by year,
   the central path draws through them, and the asset value range resolves.
   Idle: steps through Central / High price / Low price and moves the value marker. */
MontelMotion.register('assets', function (ctx) {
  var h = ctx.h, tl = ctx.tl, root = ctx.root, reduce = ctx.reduce;
  var svg = h.$('.mtl-asset__svg', root);
  svg.innerHTML = '';

  /* geometry, card pixels (card origin 800,86) */
  var OX = 800, OY = 86;
  var yv = function (v) { return 574 - (v - 5) * 76.8; };        // 5..10 EUR m
  var xs = [890, 979, 1068, 1157, 1245, 1334, 1423].map(function (x) { return x - OX; });
  var years = [2027, 2029, 2031, 2033, 2035, 2037, 2039];
  var hi = [391, 373, 402, 410, 381, 391, 419].map(function (y) { return y - OY; });
  var ce = [460, 450, 487, 502, 482, 498, 534].map(function (y) { return y - OY; });
  var lo = [513, 510, 552, 574, 560, 582, 624].map(function (y) { return y - OY; });

  var g = h.svg('g', {}, svg);
  [10, 9, 8, 7, 6, 5].forEach(function (v) {
    h.svg('line', { x1: 45, x2: 668, y1: yv(v), y2: yv(v), 'class': 'mtl-grid' }, g);
    h.svg('text', { x: 685, y: yv(v) + 6, 'class': 'mtl-axis' }, g).textContent = v;
  });
  years.forEach(function (yr, i) { h.svg('text', { x: xs[i], y: 608, 'class': 'mtl-axis', 'text-anchor': 'middle' }, g).textContent = yr; });

  var caps = h.svg('g', {}, svg), caps_ = [];
  xs.forEach(function (x, i) {
    caps_.push(h.svg('rect', { x: x - 23, y: hi[i] - 17, width: 46, height: lo[i] - hi[i] + 34, rx: 23, fill: '#e1f5ed', stroke: '#c9eddc', 'stroke-width': 1.5 }, caps));
  });
  var pts = xs.map(function (x, i) { return [x, ce[i]]; });
  var hiLine = h.svg('path', { d: h.smooth(xs.map(function (x, i) { return [x, hi[i]]; })), fill: 'none', stroke: '#6a2ff6', 'stroke-width': 2.4, 'stroke-dasharray': '6 7', opacity: 0 }, svg);
  var loLine = h.svg('path', { d: h.smooth(xs.map(function (x, i) { return [x, lo[i]]; })), fill: 'none', stroke: '#8b9897', 'stroke-width': 2.4, 'stroke-dasharray': '6 7', opacity: 0 }, svg);
  var cLine = h.svg('path', { d: h.smooth(pts), fill: 'none', stroke: '#0d6d5c', 'stroke-width': 3.2, 'stroke-linecap': 'round' }, svg);
  var sq = [], hd = [], ld = [];
  xs.forEach(function (x, i) {
    hd.push(h.svg('circle', { cx: x, cy: hi[i], r: 7.5, fill: '#6a2ff6' }, svg));
    ld.push(h.svg('circle', { cx: x, cy: lo[i], r: 7, fill: '#fff', stroke: '#8b9897', 'stroke-width': 2.6 }, svg));
    sq.push(h.svg('rect', { x: x - 7.5, y: ce[i] - 7.5, width: 15, height: 15, rx: 2.5, fill: '#0d6d5c' }, svg));
  });

  /* intro */
  caps_.forEach(function (c, i) {
    tl.fromTo(c, { scaleY: 0, svgOrigin: xs[i] + ' ' + ce[i] }, { scaleY: 1, duration: reduce ? .01 : .9, ease: 'power3.out' }, 1.0 + i * .08);
  });
  h.draw(cLine, tl, 1.2, 1.5);
  sq.forEach(function (s, i) { tl.fromTo(s, { scale: 0, svgOrigin: xs[i] + ' ' + ce[i] }, { scale: 1, duration: .45, ease: 'back.out(3)' }, 1.25 + i * .2); });
  hd.forEach(function (d, i) { tl.fromTo(d, { attr: { cy: ce[i] }, opacity: 0 }, { attr: { cy: hi[i] }, opacity: 1, duration: .7, ease: 'power3.out' }, 1.6 + i * .08); });
  ld.forEach(function (d, i) { tl.fromTo(d, { attr: { cy: ce[i] }, opacity: 0 }, { attr: { cy: lo[i] }, opacity: 1, duration: .7, ease: 'power3.out' }, 1.7 + i * .08); });

  h.counters(h.$('.mtl-asset__plant', root), tl, .9, 1.4);
  h.counters(h.$('.mtl-asset__value', root), tl, 2.3, 1.4);
  var fill = h.$('.mtl-asset__fill', root), mk = h.$('.mtl-asset__mk', root), labels = h.$$('.mtl-asset__scale span', root);
  tl.fromTo(fill, { scaleX: 0, transformOrigin: '47% 50%' }, { scaleX: 1, duration: reduce ? .01 : 1.2, ease: 'power3.inOut' }, 2.3)
    .fromTo(mk, { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: .5, ease: 'back.out(2.5)' }, 3.2);

  /* idle: walk through the scenarios */
  var chips = h.$$('[data-scn]', root);
  var pos = [213, 359, 83], lab = [1, 2, 0];
  var scn = -1;
  function setScn(n) {
    scn = n;
    chips.forEach(function (c, i) { c.classList.toggle('is-on', i === n); });
    gsap.to(caps_, { opacity: n === 0 ? 1 : .55, duration: .5 });
    gsap.to(cLine, { opacity: n === 0 ? 1 : .35, duration: .5 });
    gsap.to(sq, { opacity: n === 0 ? 1 : .35, duration: .5 });
    gsap.to(hiLine, { opacity: n === 1 ? 1 : 0, duration: .5 });
    gsap.to(loLine, { opacity: n === 2 ? 1 : 0, duration: .5 });
    hd.forEach(function (d, i) { gsap.to(d, { attr: { r: n === 1 ? 9.5 : 7.5 }, duration: .4, delay: i * .04 }); });
    ld.forEach(function (d, i) { gsap.to(d, { attr: { r: n === 2 ? 9 : 7 }, duration: .4, delay: i * .04 }); });
    gsap.to(mk, { left: pos[n], duration: .9, ease: 'power3.inOut' });
    labels.forEach(function (l, i) { l.classList.toggle('is-on', i === lab[n]); });
  }
  ctx.loop(function () { setScn((scn + 1) % 3); }, 3.2, 4.6);
  return function () { chips.forEach(function (c) { c.classList.remove('is-on'); }); gsap.set(mk, { left: 213 }); labels.forEach(function (l) { l.classList.remove('is-on'); }); };
});
