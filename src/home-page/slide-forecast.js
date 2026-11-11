/* Montel hero · Slide 2 · Analyse & forecast
   Story: actuals draw up to "now", the forecast and its likely range unfold,
   the cursor travels to Thursday 18:00 where the dip sits, the weather model
   flags low wind and the hub-height bars turn purple.
   Idle: the model toggles EC <> GFS and the forecast re-shapes. */
MontelMotion.register('forecast', function (ctx) {
  var h = ctx.h, tl = ctx.tl, root = ctx.root, reduce = ctx.reduce;
  var svg = h.$('.mtl-fc__svg', root);
  svg.innerHTML = '';

  /* geometry, card pixels (card origin 56,132 on the canvas) */
  var X = function (day) { return 92 + day * 137.33; };          // Mon 00:00 .. Sat 24:00
  var Y = function (gw) { return 652 - gw * 9.36; };              // 0 .. 50 GW
  var NOW = 2, STEP = .05;

  var g = h.svg('g', {}, svg);
  [50, 40, 30, 20, 10, 0].forEach(function (v) {
    h.svg('line', { x1: 92, x2: 916, y1: Y(v), y2: Y(v), 'class': 'mtl-grid' }, g);
    h.svg('text', { x: 40, y: Y(v) + 6, 'class': 'mtl-axis' }, g).textContent = v;
  });
  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(function (d, i) {
    h.svg('text', { x: X(i + .5), y: 686, 'class': 'mtl-axis', 'text-anchor': 'middle' }, g).textContent = d;
  });

  /* series */
  var act = h.sample([[0, 27], [.12, 31], [.28, 35], [.41, 37.3], [.55, 35.5], [.7, 35], [.85, 31.5], [1, 29], [1.14, 28.4], [1.3, 29], [1.45, 30.5], [1.6, 33], [1.76, 34.2], [1.9, 34], [2, 34]], 0, 2, .025, 1.6, 3);
  act[act.length - 1][1] = 34;
  var keysEC = [[2, 34], [2.15, 31], [2.35, 22], [2.55, 16.5], [2.75, 15], [2.95, 15.8], [3.15, 16.4], [3.4, 16.1], [3.6, 15.2], [3.75, 15.8], [3.95, 11], [4.15, 6.5], [4.3, 5], [4.45, 6.5], [4.6, 11], [4.8, 19], [5, 24.5], [5.33, 25.2], [5.6, 25.6], [6, 25.6]];
  var keysGFS = keysEC.map(function (k) { var d = k[0]; return [d, d < 2.2 ? k[1] : k[1] + 2.4 * Math.sin((d - 2) * 2.1) + (d > 4 && d < 4.8 ? 2.5 : 0)]; });
  var norm = h.sample([[0, 26], [1, 28], [1.6, 28], [2.3, 26.5], [3, 25], [3.75, 24.6], [4.5, 24.5], [5.4, 25.2], [6, 26]], 0, 6, .1);
  var mk = function (keys, pin) {
    var s = h.sample(keys, NOW, 6, STEP, .9, 9); s[0][1] = 34;
    if (pin != null) { var dv = pin - h.at(s, 3.75); s.forEach(function (p) { p[1] += dv * Math.exp(-Math.pow((p[0] - 3.75) / .18, 2)); }); }
    return s;
  };
  var fEC = mk(keysEC, 15.8), fGFS = mk(keysGFS);
  var spread = function (d, k) { return k * 11 * Math.sqrt(Math.max(0, d - NOW) / 1.75); };
  var bandD = function (f, k) {
    var up = f.map(function (p) { return [X(p[0]), Y(Math.min(52, p[1] + spread(p[0], k)))]; });
    var lo = f.map(function (p) { return [X(p[0]), Y(Math.max(0, p[1] - spread(p[0], k)))]; }).reverse();
    return h.smooth(up) + ' ' + h.smooth(lo, false) + ' Z';
  };
  var lineD = function (s) { return h.smooth(s.map(function (p) { return [X(p[0]), Y(p[1])]; })); };

  var defs = h.svg('defs', {}, svg), uid = 'mtl-fc-' + Math.random().toString(36).slice(2, 7);
  var cpF = h.svg('clipPath', { id: uid + 'f' }, defs), cpFr = h.svg('rect', { x: X(NOW), y: 0, width: 0, height: 700 }, cpF);
  var cpN = h.svg('clipPath', { id: uid + 'n' }, defs), cpNr = h.svg('rect', { x: X(0), y: 0, width: 0, height: 700 }, cpN);

  var fg = h.svg('g', { 'clip-path': 'url(#' + uid + 'f)' }, svg);
  var bandOut = h.svg('path', { fill: '#d3f3e6', d: bandD(fEC, 1) }, fg);
  var bandIn = h.svg('path', { fill: '#a9e8cf', d: bandD(fEC, .52) }, fg);
  var fLine = h.svg('path', { fill: 'none', stroke: '#0d6d5c', 'stroke-width': 3.2, 'stroke-linecap': 'round', d: lineD(fEC) }, fg);
  var nLine = h.svg('path', { fill: 'none', stroke: '#8a5cff', 'stroke-width': 2.6, 'stroke-dasharray': '7 7', d: lineD(norm), 'clip-path': 'url(#' + uid + 'n)' }, svg);
  var aLine = h.svg('path', { fill: 'none', stroke: '#0b3a37', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: lineD(act) }, svg);
  var nowG = h.svg('g', {}, svg);
  h.svg('line', { x1: X(NOW), x2: X(NOW), y1: 180, y2: 648, stroke: '#9aa9a7', 'stroke-width': 1.8, 'stroke-dasharray': '2 5' }, nowG);
  h.svg('text', { x: X(NOW) + 11, y: 200, 'class': 'mtl-axis', fill: '#41605d' }, nowG).textContent = 'Now';
  var cur = h.svg('g', {}, svg);
  var curL = h.svg('line', { y1: 186, y2: 652, stroke: '#c7d1cf', 'stroke-width': 2 }, cur);
  var curC = h.svg('circle', { r: 10, fill: '#fff', stroke: '#0d6d5c', 'stroke-width': 3.2 }, cur);

  var tip = h.$('.mtl-fc__tip', root), tipT = h.$('.mtl-fc__tip-t', root), tipF = h.$('.mtl-fc__tip-f', root), tipR = h.$('.mtl-fc__tip-r', root), tipN = h.$('.mtl-fc__tip-n', root);
  var days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var series = fEC, prevSeries = fEC, mix = 1, curDay = 3.75;
  var valAt = function (d) { return h.lerp(h.at(prevSeries, d), h.at(series, d), mix); };
  function setCursor(d) {
    curDay = d;
    var v = valAt(d), x = X(d);
    curL.setAttribute('x1', x); curL.setAttribute('x2', x);
    curC.setAttribute('cx', x); curC.setAttribute('cy', Y(v));
    var hr = Math.round((d % 1) * 24), di = Math.floor(d + 1e-6);
    if (hr === 24) { hr = 0; di++; }
    tipT.textContent = days[Math.min(5, di)] + ' ' + (hr < 10 ? '0' : '') + hr + ':00';
    tipF.textContent = v.toFixed(1) + ' GW';
    var s = spread(d, 1);
    tipR.textContent = Math.max(0, Math.round(v - s)) + '–' + Math.round(v + s) + ' GW';
    tipN.textContent = h.at(norm, d).toFixed(1) + ' GW';
    gsap.set(tip, { x: x - X(3.75) });
  }
  setCursor(3.75);

  /* intro */
  gsap.set([nowG, cur, tip], { autoAlpha: 0 });
  h.draw(aLine, tl, .6, 1.3);
  tl.to(cpNr, { attr: { width: X(6) - X(0) }, duration: reduce ? .01 : 2.4, ease: 'power1.inOut' }, .8)
    .to(nowG, { autoAlpha: 1, duration: .4 }, 1.8)
    .to(cpFr, { attr: { width: X(6) - X(NOW) + 4 }, duration: reduce ? .01 : 1.5, ease: 'power2.inOut' }, 1.9)
    .add(function () { setCursor(NOW + .02); }, 3.2)
    .to([cur, tip], { autoAlpha: 1, duration: .35 }, 3.2);
  var sc = { d: NOW + .02 };
  tl.to(sc, { d: 3.75, duration: reduce ? .01 : 1.6, ease: 'power2.inOut', onUpdate: function () { setCursor(sc.d); } }, 3.3);

  /* weather model + hub-height bars */
  var bars = h.$$('.mtl-fc__bars i', root), low = h.$$('.mtl-fc__bars .is-low i', root);
  tl.fromTo(bars, { scaleY: 0 }, { scaleY: 1, duration: .8, stagger: .08, ease: 'power3.out' }, 1.2)
    .fromTo(low, { background: 'linear-gradient(180deg, #8fdfc0, #c9f1e1)' }, { background: 'linear-gradient(180deg, #7a3cff, #6a2ff6)', duration: .6, stagger: .12 }, 4.4);
  var bell = h.$('.mtl-fc__bell svg', root);
  if (!reduce) tl.fromTo(bell, { rotation: 0 }, { keyframes: { rotation: [0, -16, 14, -10, 6, 0] }, duration: .9, transformOrigin: '50% 10%', ease: 'none' }, 4.3);
  var seg = h.$('.mtl-fc__model .mtl-seg', root), seg2 = h.$('.mtl-fc__head .mtl-seg', root);
  h.seg(seg, 0, true); h.seg(seg2, 1, true);

  /* idle: compare models */
  var model = 0;
  ctx.loop(function () {
    model = 1 - model;
    prevSeries = series; series = model ? fGFS : fEC; mix = 0;
    h.seg(seg, model);
    gsap.to(fLine, { attr: { d: lineD(series) }, duration: 1.2, ease: 'power3.inOut' });
    gsap.to(bandIn, { attr: { d: bandD(series, .52) }, duration: 1.2, ease: 'power3.inOut' });
    gsap.to(bandOut, { attr: { d: bandD(series, 1) }, duration: 1.2, ease: 'power3.inOut' });
    var o = { t: 0 };
    gsap.to(o, { t: 1, duration: 1.2, ease: 'power3.inOut', onUpdate: function () { mix = o.t; setCursor(curDay); } });
    gsap.to(h.$$('.mtl-fc__bars i', root), { scaleY: function () { return model ? .9 + Math.random() * .18 : 1; }, duration: 1, ease: 'power3.inOut' });
  }, 4, 7.5);
});
