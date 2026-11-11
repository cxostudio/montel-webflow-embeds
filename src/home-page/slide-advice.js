/* Montel hero · Slide 5 · Get expert advice
   Story: a client question comes in, the analyst answers with data:
   reservoir filling tracks below normal, two annotated takeaways appear,
   the relevant expertise areas light up.
   Idle: the highlighted takeaway and expertise chips alternate. */
MontelMotion.register('advice', function (ctx) {
  var h = ctx.h, tl = ctx.tl, root = ctx.root, reduce = ctx.reduce;
  var svg = h.$('.mtl-adv__svg', root);
  svg.innerHTML = '';

  /* split the question into words once, for a calm word-by-word reveal */
  var qt = h.$('.mtl-adv__qt', root);
  if (!qt.querySelector('.w')) qt.innerHTML = qt.textContent.trim().split(/\s+/).map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' ');
  tl.from(h.$$('.mtl-adv__qt .w', root), { y: 14, autoAlpha: 0, duration: .5, stagger: .05, ease: 'power3.out' }, .45);

  /* geometry, card pixels (card origin 1058,178) */
  var X = function (m) { return 70 + m * 33.08; };                // Jan .. Dec
  var Y = function (p) { return 355 - (p - 10) * 2.489; };        // 10 .. 100 %
  var g = h.svg('g', {}, svg);
  [100, 70, 40, 10].forEach(function (v) {
    h.svg('line', { x1: 70, x2: 467, y1: Y(v), y2: Y(v), 'class': 'mtl-grid' }, g);
    h.svg('text', { x: 30, y: Y(v) + 6, 'class': 'mtl-axis' }, g).textContent = v;
  });
  [['Jan', 0], ['Apr', 3], ['Jul', 6], ['Oct', 9], ['Dec', 11]].forEach(function (a) {
    h.svg('text', { x: X(a[1]), y: 385, 'class': 'mtl-axis' }, g).textContent = a[0];
  });

  var norm = h.sample([[0, 63], [1, 52], [2, 38], [3, 29], [3.7, 26], [4.5, 29], [5.5, 42], [6.5, 60], [7.5, 74], [8.5, 83], [9.4, 86], [10.3, 82], [11, 74], [11.6, 67], [12, 64]], 0, 12, .1);
  var act = h.sample([[0, 62], [1, 47], [2, 31], [3, 21], [3.6, 19], [4.5, 23], [5.5, 34], [6.5, 48], [7.5, 60], [8.3, 69], [9, 73]], 0, 9, .1);
  var P = function (s) { return s.map(function (p) { return [X(p[0]), Y(p[1])]; }); };
  var bw = function (m) { return 10 - m * .15; };
  var up = norm.map(function (p) { return [X(p[0]), Y(p[1] + bw(p[0]))]; });
  var dn = norm.map(function (p) { return [X(p[0]), Y(p[1] - bw(p[0]))]; }).reverse();

  var uid = 'mtl-adv-' + Math.random().toString(36).slice(2, 7);
  var cp = h.svg('clipPath', { id: uid }, h.svg('defs', {}, svg));
  var cpr = h.svg('rect', { x: 60, y: 0, width: 0, height: 420 }, cp);
  var ng = h.svg('g', { 'clip-path': 'url(#' + uid + ')' }, svg);
  h.svg('path', { d: h.smooth(up) + ' ' + h.smooth(dn, false) + ' Z', fill: '#ece5ff' }, ng);
  h.svg('path', { d: h.smooth(P(norm)), fill: 'none', stroke: '#8a5cff', 'stroke-width': 2.6, 'stroke-dasharray': '6 6' }, ng);
  var aLine = h.svg('path', { d: h.smooth(P(act)), fill: 'none', stroke: '#0d6d5c', 'stroke-width': 3.2, 'stroke-linecap': 'round' }, svg);
  var end = act[act.length - 1];
  var halo = h.svg('circle', { cx: X(end[0]), cy: Y(end[1]), r: 7, fill: '#1a9f82', opacity: 0 }, svg);
  var dot = h.svg('circle', { cx: X(end[0]), cy: Y(end[1]), r: 7, fill: '#0d6d5c' }, svg);

  function pin(n, m, series) {
    var x = X(m), y = Y(h.at(series, m)), gp = h.svg('g', {}, svg);
    h.svg('line', { x1: x, x2: x, y1: y - 15, y2: y, stroke: '#f2a21f', 'stroke-width': 2.4 }, gp);
    h.svg('circle', { cx: x, cy: y - 28, r: 14, fill: '#f2a21f', stroke: '#fff', 'stroke-width': 2 }, gp);
    var t = h.svg('text', { x: x, y: y - 22, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 600, fill: '#3b2500', 'font-family': 'inherit' }, gp);
    t.textContent = n;
    gp._o = x + ' ' + y;
    return gp;
  }
  var p1 = pin(1, 8.3, act), p2 = pin(2, 11.55, norm);

  /* intro */
  gsap.set([dot, p1, p2], { opacity: 0 });
  tl.to(cpr, { attr: { width: 420 }, duration: reduce ? .01 : 1.6, ease: 'power2.inOut' }, 1.2);
  h.draw(aLine, tl, 1.6, 1.7);
  tl.fromTo(dot, { opacity: 0, scale: 0, svgOrigin: X(end[0]) + ' ' + Y(end[1]) }, { opacity: 1, scale: 1, duration: .4, ease: 'back.out(3)' }, 3.25);
  if (!reduce) tl.fromTo(halo, { attr: { r: 7 }, opacity: .3 }, { attr: { r: 18 }, opacity: 0, duration: 1.8, repeat: -1, ease: 'power1.out' }, 3.5);
  var notes = h.$$('.mtl-adv__notes li', root);
  [[p1, notes[0], 3.0], [p2, notes[1], 3.6]].forEach(function (a) {
    tl.fromTo(a[0], { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: .6, ease: 'bounce.out' }, a[2])
      .fromTo(a[1], { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: .5 }, a[2] + .15);
  });

  /* idle: alternate the highlighted takeaway and the matching expertise */
  var chips = h.$$('.mtl-adv__chips .mtl-pill', root), k = 0;
  var sets = [[2], [0, 3]];
  ctx.loop(function () {
    var on = k % 2;
    chips.forEach(function (c, i) { c.classList.toggle('is-on', sets[on].indexOf(i) > -1); });
    gsap.to(notes[on], { opacity: 1, duration: .4 }); gsap.to(notes[1 - on], { opacity: .45, duration: .4 });
    gsap.fromTo(on ? p2 : p1, { scale: 1, svgOrigin: (on ? p2 : p1)._o }, { scale: 1.12, duration: .35, yoyo: true, repeat: 1, ease: 'power2.inOut' });
    k++;
  }, 3, 5);
  return function () { chips.forEach(function (c) { c.classList.remove('is-on'); }); gsap.set(notes, { opacity: 1 }); };
});
