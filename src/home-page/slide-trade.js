/* Montel hero · Slide 1 · Trade the market
   Story: the news lands, the price reacts at 10:12, the table catches up,
   related markets follow. Idle: the tape keeps printing every 2.4s. */
MontelMotion.register('trade', function (ctx) {
  var h = ctx.h, tl = ctx.tl, root = ctx.root;
  var svg = h.$('.mtl-trade__chart', root);
  svg.innerHTML = '';

  /* geometry, in card pixels (card = 728 x 570) */
  var X0 = 80, X1 = 700, N = 60, EV = 17;
  var X = function (i) { return X0 + (X1 - X0) * i / (N - 1); };
  var Y = function (v) { return 498 - (v - 92) * 24; };

  /* axes */
  var g = h.svg('g', {}, svg);
  [98, 96, 94, 92].forEach(function (v) {
    h.svg('line', { x1: X0, x2: X1, y1: Y(v), y2: Y(v), 'class': 'mtl-grid' }, g);
    h.svg('text', { x: 35, y: Y(v) + 6, 'class': 'mtl-axis' }, g).textContent = v;
  });
  [['09:00', X0, 'start'], ['11:00', 390, 'middle'], ['13:00', X1, 'end']].forEach(function (a) {
    h.svg('text', { x: a[1], y: 530, 'class': 'mtl-axis', 'text-anchor': a[2] }, g).textContent = a[0];
  });

  /* data */
  var rnd = h.rng(11), data = [];
  for (var i = 0; i < N; i++) {
    var v;
    if (i < EV) v = 93.65 + (rnd() - .5) * .3;
    else if (i < 27) { var t = (i - EV) / 10; v = 93.65 + t * t * (3 - 2 * t) * 2.35 + (rnd() - .5) * .12; }
    else v = 96.1 + (i - 27) / 32 * .5 + (rnd() - .5) * .32;
    data.push(v);
  }
  data[N - 1] = 96.6;

  var defs = h.svg('defs', {}, svg);
  var gid = 'mtl-trade-g-' + Math.random().toString(36).slice(2, 7);
  var lg = h.svg('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  h.svg('stop', { offset: 0, 'stop-color': '#1a9f82', 'stop-opacity': .2 }, lg);
  h.svg('stop', { offset: 1, 'stop-color': '#1a9f82', 'stop-opacity': 0 }, lg);
  var cid = gid + '-c';
  var cp = h.svg('clipPath', { id: cid }, defs);
  h.svg('rect', { x: X0, y: 0, width: X1 - X0 + 14, height: 520 }, cp);

  var plot = h.svg('g', { 'clip-path': 'url(#' + cid + ')' }, svg);
  var area = h.svg('path', { fill: 'url(#' + gid + ')' }, plot);
  var mark = h.svg('g', {}, plot);
  var mLine = h.svg('line', { y1: Y(98) - 4, y2: Y(92) + 8, stroke: '#ec9a1c', 'stroke-width': 2, 'stroke-dasharray': '4 6' }, mark);
  var mLab = h.svg('text', { y: Y(98) + 19, fill: '#b4650a', 'font-size': 19, 'font-weight': 500, 'font-family': 'inherit' }, mark);
  mLab.textContent = '10:12 · Wind revised down';
  var line = h.svg('path', { fill: 'none', stroke: '#0d6d5c', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, plot);
  var ring = h.svg('circle', { r: 9, fill: '#fff', stroke: '#ec9a1c', 'stroke-width': 3 }, svg);
  var halo = h.svg('circle', { r: 8, fill: '#1a9f82', opacity: .2 }, svg);
  var dot = h.svg('circle', { r: 7, fill: '#0d6d5c', stroke: '#fff', 'stroke-width': 2 }, svg);

  var shift = 0, ev = EV;
  function render() {
    var p = data.map(function (v, i) { return [X(i - shift), Y(v)]; });
    var d = h.smooth(p), last = p[p.length - 1];
    line.setAttribute('d', d);
    area.setAttribute('d', d + ' L' + h.r1(last[0]) + ',' + Y(92) + ' L' + X0 + ',' + Y(92) + ' Z');
    dot.setAttribute('cx', last[0]); dot.setAttribute('cy', last[1]);
    halo.setAttribute('cx', last[0]); halo.setAttribute('cy', last[1]);
    var ex = X(ev - shift);
    mLine.setAttribute('x1', ex); mLine.setAttribute('x2', ex);
    mLab.setAttribute('x', ex + 13);
    ring.setAttribute('cx', ex); ring.setAttribute('cy', Y(data[ev]));
    ring.style.display = ex < X0 - 4 ? 'none' : '';
  }
  render();

  /* intro sequence */
  var t0 = .7, drawDur = 2;
  gsap.set([area, mark, dot, halo, ring], { opacity: 0 });
  h.draw(line, tl, t0, drawDur);
  var hit = t0 + drawDur * EV / N;
  tl.to(mark, { opacity: 1, duration: .4 }, hit - .1)
    .fromTo(ring, { opacity: 0, scale: 0, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: .6, ease: 'back.out(3)' }, hit - .1)
    .to(area, { opacity: 1, duration: 1.1 }, t0 + drawDur * .75)
    .to([dot, halo], { opacity: 1, duration: .3 }, t0 + drawDur);
  if (!ctx.reduce) tl.fromTo(halo, { attr: { r: 7 }, opacity: .25 }, { attr: { r: 18 }, opacity: 0, duration: 1.7, repeat: -1, ease: 'power1.out' }, t0 + drawDur + .1);

  /* the table reacts to the news */
  var row = h.$('[data-row="m1"]', root);
  tl.fromTo(row, { backgroundColor: 'rgba(225,245,237,0)', '--acc': 0 }, { backgroundColor: 'rgba(225,245,237,1)', '--acc': 1, duration: .7 }, hit);
  h.counters(h.$('.mtl-trade__table', root), tl, hit, 1.6);
  h.counters(h.$('.mtl-trade__moved', root), tl, hit + .7, 1.2);

  /* idle: the tape keeps printing */
  var cells = row.children, last = cells[3], bid = cells[1], ask = cells[2], chg = cells[4];
  ctx.loop(function () {
    var prev = data[data.length - 1];
    var next = Math.min(97.2, Math.max(96.0, prev + (Math.random() - .45) * .22));
    data.push(prev);
    var o = { v: prev, s: 0 };
    gsap.to(o, { v: next, s: 1, duration: 1.2, ease: 'power2.inOut',
      onUpdate: function () { data[data.length - 1] = o.v; shift = o.s; render(); },
      onComplete: function () { data.shift(); ev -= 1; shift = 0; render(); } });
    last.textContent = next.toFixed(2); bid.textContent = (next - .2).toFixed(2); ask.textContent = (next + .2).toFixed(2);
    chg.textContent = '▲ ' + (next - 93.5).toFixed(2);
    h.flash(last, next >= prev);
  }, 2.4, t0 + drawDur + 1.6);
});
