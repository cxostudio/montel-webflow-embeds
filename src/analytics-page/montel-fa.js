/* =========================================================
   Montel · Forecasting & analytics hero  (v1.0)
   No dependencies. One rAF loop that only runs on screen.

   Story: a playhead travels the time axis from 30+ years of
   history, through "Now", to 2060. As it reaches each horizon
   its connector rises and the card comes into focus; behind
   them the forecast band widens with the horizon.
   Idle: the intraday tape keeps printing, the months band
   breathes, the 2060 scenarios take turns.
   ========================================================= */
(function () {
  'use strict';
  if (window.MontelFA) return;
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var AXIS_Y = 560;
  /* tick x positions on the 980px canvas, one per card, plus "Years" */
  var TICKS = [{ x: 70, l: '1995', c: '#9fb2af' }, { x: 330, l: 'Intraday', c: '#1a9f82' }, { x: 600, l: 'Days', c: '#3fae96' }, { x: 760, l: 'Months', c: '#4f8fc4' }, { x: 1040, l: '2060', c: '#6a2ff6' }];
  var NOW_X = 200, YEARS_X = 905, END = 1060;
  var SCEN = ['Central scenario', 'High renewables', 'Low gas price'];

  var ease = {
    out: function (t) { return 1 - Math.pow(1 - t, 3); },
    inOut: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    expo: function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); },
    back: function (t) { var c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    lin: function (t) { return t; }
  };
  function el(tag, a, p) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  function r1(n) { return Math.round(n * 10) / 10; }
  function smooth(p, move) {
    var d = (move === false ? 'L' : 'M') + r1(p[0][0]) + ',' + r1(p[0][1]);
    for (var i = 0; i < p.length - 1; i++) {
      var p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      d += ' C' + r1(p1[0] + (p2[0] - p0[0]) / 6) + ',' + r1(p1[1] + (p2[1] - p0[1]) / 6) + ' ' + r1(p2[0] - (p3[0] - p1[0]) / 6) + ',' + r1(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + r1(p2[0]) + ',' + r1(p2[1]);
    }
    return d;
  }
  function rng(s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function len(path) { try { return path.getTotalLength(); } catch (e) { return 1000; } }

  function FA(root) {
    this.root = root; this.canvas = root.querySelector('.mtl-fa__canvas'); this.back = root.querySelector('.mtl-fa__back');
    this.cards = [].slice.call(root.querySelectorAll('.mtl-fa__card'));
    this.clock = 0; this.tweens = []; this.events = []; this.loops = [];
    this.running = false; this.played = false;
    this.mobile = window.matchMedia('(max-width: 760px)').matches;
    var self = this;
    this.charts = {};
    this.cards.forEach(function (c) { var s = c.querySelector('[data-chart]'); self.charts[s.getAttribute('data-chart')] = { svg: s, card: c }; });
    this.uid = 'mtlfa' + Math.random().toString(36).slice(2, 7);
    this.fit();
    new ResizeObserver(function () { self.fit(); }).observe(root);
    new IntersectionObserver(function (e) {
      if (e[0].isIntersecting) { self.start(); if (!self.played) self.play(); } else self.stop();
    }, { threshold: .15 }).observe(root);
    document.addEventListener('visibilitychange', function () { document.hidden ? self.stop() : self.start(); });
    this.cards.forEach(function (c) { c.style.opacity = 0; });
    this.buildBack(); this.buildCharts(); this.bindHover();
  }

  FA.prototype.fit = function () {
    this.mobile = window.matchMedia('(max-width: 760px)').matches;
    var w = this.root.clientWidth; if (w && !this.mobile) this.root.style.setProperty('--mtl-s', Math.min(1.15, w / 1080).toFixed(4));
  };

  /* ---------- clock ---------- */
  FA.prototype.tween = function (o, to, dur, opt) {
    opt = opt || {};
    var t = { o: o, to: to, from: {}, dur: Math.max(.001, reduce ? Math.min(dur, .2) : dur), t0: this.clock + (opt.delay || 0), e: ease[opt.ease || 'out'], up: opt.update, done: opt.done, started: false };
    this.tweens.push(t); return t;
  };
  FA.prototype.at = function (dt, fn) { this.events.push({ t: this.clock + dt, fn: fn }); };
  FA.prototype.every = function (dt, fn, first) {
    var self = this; if (reduce) return;
    var run = function () { fn(); self.at(dt, run); };
    this.at(first != null ? first : dt, run);
  };
  FA.prototype.step = function (dt) {
    this.clock += dt;
    var now = this.clock, list = this.tweens, i, p; this.tweens = [];
    for (i = 0; i < list.length; i++) {
      var t = list[i];
      if (now < t.t0) { this.tweens.push(t); continue; }
      if (!t.started) { for (p in t.to) t.from[p] = t.o[p]; t.started = true; }
      var q = Math.min(1, (now - t.t0) / t.dur), e = t.e(q);
      for (p in t.to) t.o[p] = t.from[p] + (t.to[p] - t.from[p]) * e;
      if (t.up) t.up(e, q);
      if (q < 1) this.tweens.push(t); else if (t.done) t.done();
    }
    var ev = this.events; this.events = [];
    for (i = 0; i < ev.length; i++) { if (now >= ev[i].t) ev[i].fn(); else this.events.push(ev[i]); }
  };
  FA.prototype.start = function () {
    if (this.running) return; this.running = true; this.last = performance.now();
    var self = this;
    var loop = function (n) { if (!self.running) return; var dt = Math.min(.05, (n - self.last) / 1000); self.last = n; self.step(dt); self.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  };
  FA.prototype.stop = function () { this.running = false; cancelAnimationFrame(this.raf); };

  /* ---------- background: spine, axis, ticks, connectors ---------- */
  FA.prototype.buildBack = function () {
    var s = this.back, u = this.uid, self = this;
    s.innerHTML = '';
    var defs = el('defs', {}, s);
    var g1 = el('linearGradient', { id: u + 'ax', x1: NOW_X, x2: END, y1: 0, y2: 0, gradientUnits: 'userSpaceOnUse' }, defs);
    el('stop', { offset: 0, 'stop-color': '#1a9f82' }, g1); el('stop', { offset: .55, 'stop-color': '#4f8fc4' }, g1); el('stop', { offset: 1, 'stop-color': '#6a2ff6' }, g1);
    var g2 = el('linearGradient', { id: u + 'fan', x1: NOW_X, x2: 1260, y1: 0, y2: 0, gradientUnits: 'userSpaceOnUse' }, defs);
    el('stop', { offset: 0, 'stop-color': '#1a9f82', 'stop-opacity': .22 }, g2); el('stop', { offset: 1, 'stop-color': '#6a2ff6', 'stop-opacity': .2 }, g2);
    var mg = el('linearGradient', { id: u + 'mg', x1: -180, x2: 1270, y1: 0, y2: 0, gradientUnits: 'userSpaceOnUse' }, defs);
    [[0, 0], [.14, 1], [.88, 1], [1, 0]].forEach(function (a) { el('stop', { offset: a[0], 'stop-color': '#fff', 'stop-opacity': a[1] }, mg); });
    var mask = el('mask', { id: u + 'm', maskUnits: 'userSpaceOnUse', x: -200, y: -100, width: 1600, height: 800 }, defs);
    el('rect', { x: -200, y: -100, width: 1600, height: 800, fill: 'url(#' + u + 'mg)' }, mask);
    var clip = el('clipPath', { id: u + 'c' }, defs);
    this.fanClip = el('rect', { x: NOW_X, y: -100, width: 0, height: 800 }, clip);
    var hclip = el('clipPath', { id: u + 'h' }, defs);
    this.histClip = el('rect', { x: -200, y: -100, width: 0, height: 800 }, hclip);

    /* the spine: actuals up to "now", then a forecast band that widens with the horizon */
    var spine = el('g', { mask: 'url(#' + u + 'm)' }, s);
    var rnd = rng(5), hist = [], x;
    for (x = -180; x <= NOW_X; x += 6) {
      var t = (x + 180) / (NOW_X + 180);
      var v = 196 - 14 * t + Math.sin(x / 23) * 6 + (rnd() - .5) * 9 - 46 * Math.exp(-Math.pow((x - 150) / 12, 2)) - 18 * Math.exp(-Math.pow((x - 20) / 10, 2));
      hist.push([x, v]);
    }
    var nowY = hist[hist.length - 1][1];
    this.nowY = nowY;
    el('path', { d: smooth(hist), fill: 'none', stroke: '#284443', 'stroke-opacity': .32, 'stroke-width': 2, 'clip-path': 'url(#' + u + 'h)' }, spine);
    var mid = [], up = [], lo = [];
    for (x = NOW_X; x <= 1260; x += 10) {
      var k = (x - NOW_X) / (1260 - NOW_X), c = nowY - 95 * k + Math.sin(x / 40) * 8 * k;
      var w = 4 + 92 * Math.pow(k, 1.15);
      mid.push([x, c]); up.push([x, c - w]); lo.push([x, c + w * .8]);
    }
    var fan = el('g', { 'clip-path': 'url(#' + u + 'c)' }, spine);
    el('path', { d: smooth(up) + ' ' + smooth(lo.slice().reverse(), false) + ' Z', fill: 'url(#' + u + 'fan)' }, fan);
    el('path', { d: smooth(mid), fill: 'none', stroke: 'url(#' + u + 'ax)', 'stroke-width': 2, 'stroke-dasharray': '5 6', 'stroke-opacity': .7 }, fan);
    this.nowDot = el('circle', { cx: NOW_X, cy: nowY, r: 4.5, fill: '#0d6d5c', opacity: 0 }, s);

    /* connectors (dotted), drawn up from the axis to each card */
    this.conns = TICKS.map(function (tk, i) {
      return el('line', { x1: tk.x, x2: tk.x, y1: AXIS_Y - 8, y2: AXIS_Y - 8, stroke: tk.c, 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-dasharray': '0.1 6', opacity: .9 }, s);
    });

    /* axis */
    this.axHist = el('line', { x1: 20, x2: NOW_X, y1: AXIS_Y, y2: AXIS_Y, stroke: '#b9c6c4', 'stroke-width': 4, 'stroke-linecap': 'round' }, s);
    this.axFut = el('line', { x1: NOW_X, x2: END, y1: AXIS_Y, y2: AXIS_Y, stroke: 'url(#' + u + 'ax)', 'stroke-width': 4, 'stroke-linecap': 'round' }, s);
    this.ticks = TICKS.map(function (tk) {
      var g = el('g', { opacity: 0 }, s);
      el('circle', { cx: tk.x, cy: AXIS_Y, r: 7, fill: '#fff', stroke: tk.c, 'stroke-width': 3 }, g);
      var tx = el('text', { x: tk.x, y: AXIS_Y + 32, 'text-anchor': 'middle', 'class': 'mtl-fa__axis-l' }, g); tx.textContent = tk.l;
      return g;
    });
    this.years = el('g', { opacity: 0 }, s);
    el('circle', { cx: YEARS_X, cy: AXIS_Y, r: 4, fill: '#fff', stroke: '#5b78d6', 'stroke-width': 2.4 }, this.years);
    el('text', { x: YEARS_X, y: AXIS_Y + 32, 'text-anchor': 'middle', 'class': 'mtl-fa__axis-l' }, this.years).textContent = 'Years';
    this.now = el('g', { opacity: 0 }, s);
    el('rect', { x: NOW_X - 22, y: AXIS_Y - 36, width: 44, height: 22, rx: 11, fill: '#0c2a2b' }, this.now);
    var nt = el('text', { x: NOW_X, y: AXIS_Y - 21, 'text-anchor': 'middle', fill: '#fff', 'font-size': 12.5, 'font-weight': 600, 'font-family': 'inherit' }, this.now); nt.textContent = 'Now';
    this.nowRing = el('circle', { cx: NOW_X, cy: AXIS_Y, r: 6, fill: 'none', stroke: '#0d6d5c', 'stroke-width': 1.6, opacity: 0 }, s);
    el('circle', { cx: NOW_X, cy: AXIS_Y, r: 4, fill: '#0c2a2b' }, this.now);
    this.head = el('g', { opacity: 0 }, s);
    this.headHalo = el('circle', { cx: 20, cy: AXIS_Y, r: 14, fill: '#1a9f82', opacity: .18 }, this.head);
    this.headDot = el('circle', { cx: 20, cy: AXIS_Y, r: 7, fill: '#0d6d5c', stroke: '#fff', 'stroke-width': 2.5 }, this.head);

    [this.axHist, this.axFut].forEach(function (l) { var L = l === self.axHist ? NOW_X - 20 : END - NOW_X; l.setAttribute('stroke-dasharray', L + ' ' + L); l.setAttribute('stroke-dashoffset', L); l._L = L; });
  };

  /* ---------- charts ---------- */
  FA.prototype.buildCharts = function () {
    var c = this.charts, u = this.uid, rnd = rng(13), i;

    /* history: 30 years of prices, with 2008 and 2022 */
    var h = c.history.svg; h.innerHTML = '';
    var hp = [];
    for (i = 0; i <= 62; i++) {
      var yr = i / 2, v = 22 + yr * .9 + (rnd() - .5) * 5 + 26 * Math.exp(-Math.pow((yr - 13.2) / 1.1, 2)) + 66 * Math.exp(-Math.pow((yr - 27.4) / .9, 2));
      hp.push([i * 2, 50 - v * .42]);
    }
    var hd = smooth(hp);
    c.history.area = el('path', { d: hd + ' L124,52 L0,52 Z', fill: '#0d6d5c', 'fill-opacity': .07 }, h);
    c.history.line = el('path', { d: hd, fill: 'none', stroke: '#284443', 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, h);

    /* intraday: 15-min bars, the last six are forecast */
    var d = c.intraday.svg; d.innerHTML = '';
    var defs = el('defs', {}, d), lg = el('linearGradient', { id: u + 'b', x1: 0, x2: 0, y1: 0, y2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': '#0d6d5c' }, lg); el('stop', { offset: 1, 'stop-color': '#1a9f82' }, lg);
    var N = 26, F = 6, bw = 5.4, gap = (208 - N * bw) / (N - 1);
    var vals = []; for (i = 0; i < N; i++) vals.push(this.iv(i));
    c.intraday.vals = vals; c.intraday.bars = []; c.intraday.ph = N;
    for (i = 0; i < N; i++) {
      var fc = i >= N - F;
      c.intraday.bars.push(el('rect', { x: r1(i * (bw + gap)), width: bw, y: 100, height: 0, rx: 1.2, fill: fc ? '#c6ecdd' : 'url(#' + u + 'b)' }, d));
    }
    var nx = (N - F) * (bw + gap) - gap / 2;
    c.intraday.now = el('line', { x1: nx, x2: nx, y1: 2, y2: 100, stroke: '#0c2a2b', 'stroke-opacity': .35, 'stroke-width': 1, 'stroke-dasharray': '2 3', opacity: 0 }, d);

    /* days: a week of demand, actual then forecast with a narrow band */
    var w = c.days.svg; w.innerHTML = '';
    var dp = [], bu = [], bl = [], CUT = 48;
    for (i = 0; i <= 168; i += 2) {
      var day = Math.floor(i / 24), amp = day >= 5 ? .72 : 1;
      var y = 26 - amp * 13 * Math.max(0, Math.sin(Math.PI * ((i % 24) - 5) / 15)) - 3 * Math.sin(i / 37);
      var x2 = i / 168 * 149; dp.push([x2, y]);
      if (i >= CUT) { var bwd = 1.5 + (i - CUT) / 120 * 5; bu.push([x2, y - bwd]); bl.push([x2, y + bwd]); }
    }
    var cutI = CUT / 2;
    c.days.band = el('path', { d: smooth(bu) + ' ' + smooth(bl.reverse(), false) + ' Z', fill: '#1a9f82', 'fill-opacity': .14 }, w);
    c.days.act = el('path', { d: smooth(dp.slice(0, cutI + 1)), fill: 'none', stroke: '#0d6d5c', 'stroke-width': 1.8 }, w);
    c.days.fc = el('path', { d: smooth(dp.slice(cutI)), fill: 'none', stroke: '#1a9f82', 'stroke-width': 1.8, 'stroke-dasharray': '3 3' }, w);

    /* months: forward view with an uncertainty band (as in the design) */
    var m = c.months.svg; m.innerHTML = '';
    [24, 66].forEach(function (yy) { el('line', { x1: 0, x2: 213, y1: yy, y2: yy, stroke: '#edf1f0', 'stroke-width': 1.2 }, m); });
    var mp = [], mu = [], ml = [], mu2 = [], ml2 = [];
    for (i = 0; i <= 40; i++) {
      var X = i / 40 * 213, Y = 44 - 13 * Math.sin((i / 40) * Math.PI * 1.9 + .25), bwm = 7 + 9 * (i / 40);
      mp.push([X, Y]); mu.push([X, Y - bwm]); ml.push([X, Y + bwm]); mu2.push([X, Y - bwm * 1.25]); ml2.push([X, Y + bwm * 1.25]);
    }
    c.months.bandA = smooth(mu) + ' ' + smooth(ml.slice().reverse(), false) + ' Z';
    c.months.bandB = smooth(mu2) + ' ' + smooth(ml2.slice().reverse(), false) + ' Z';
    var mclip = el('clipPath', { id: u + 'mc' }, el('defs', {}, m));
    c.months.clip = el('rect', { x: -2, y: -20, width: 0, height: 140 }, mclip);
    c.months.band = el('path', { d: c.months.bandA, fill: '#1a9f82', 'fill-opacity': .2, 'clip-path': 'url(#' + u + 'mc)' }, m);
    c.months.line = el('path', { d: smooth(mp), fill: 'none', stroke: '#0d6d5c', 'stroke-width': 2.4, 'stroke-linecap': 'round' }, m);

    /* long term: three scenario paths to 2060 */
    var L = c.long.svg; L.innerHTML = '';
    el('line', { x1: 0, x2: 243, y1: 76, y2: 76, stroke: '#fff', 'stroke-opacity': .25, 'stroke-width': 1 }, L);
    var ends = [32, 12, 60];
    c.long.lines = ends.map(function (e, j) {
      var pts = []; for (var q = 0; q <= 24; q++) { var t = q / 24; pts.push([t * 243, 40 + (e - 40) * Math.pow(t, 1.35) + Math.sin(t * 6 + j) * 2]); }
      return el('path', { d: smooth(pts), fill: 'none', stroke: '#fff', 'stroke-width': j ? 1.8 : 2.6, 'stroke-opacity': j ? .55 : 1, 'stroke-linecap': 'round' }, L);
    });
    c.long.scn = this.charts.long.card.querySelector('.mtl-fa__scn');
  };
  FA.prototype.iv = function (i) { return 30 + 38 * Math.max(0, Math.sin(Math.PI * (((i + (this.charts.intraday.ph || 0)) % 30) - 3) / 22)) + Math.random() * 14; };

  /* ---------- the sequence ---------- */
  FA.prototype.play = function () {
    this.played = true;
    var self = this, mob = this.mobile;
    var head = { x: 20 };
    var T0 = reduce ? 0 : .5, RUN = reduce ? .01 : 4.6;
    var px = function (x) { return (x - 20) / (END - 20); };

    if (!mob) {
      this.tween({ v: 0 }, { v: 1 }, .9, { delay: T0, ease: 'inOut', update: function (e) { self.axHist.setAttribute('stroke-dashoffset', self.axHist._L * (1 - e)); } });
      this.tween({ v: 0 }, { v: 1 }, RUN, { delay: T0 + .5, ease: 'inOut', update: function (e) { self.axFut.setAttribute('stroke-dashoffset', self.axFut._L * (1 - e)); } });
      this.tween({ v: 0 }, { v: 1 }, 1.2, { delay: T0, ease: 'inOut', update: function (e) { self.histClip.setAttribute('width', (NOW_X + 200) * e); } });
      this.head.setAttribute('opacity', 1);
      /* playhead: history quickly, then the future more slowly */
      this.tween(head, { x: NOW_X }, reduce ? .01 : 1.1, { delay: T0, ease: 'inOut', update: function () { self.moveHead(head.x); } });
      this.tween(head, { x: END }, RUN, { delay: T0 + 1.15, ease: 'inOut', update: function () { self.moveHead(head.x); self.fanClip.setAttribute('width', Math.max(0, head.x - NOW_X) * 1.2); } });
      this.tween({ v: 0 }, { v: 1 }, .6, { delay: T0 + 1.2 + RUN, update: function (e) { self.head.setAttribute('opacity', 1 - e); self.fanClip.setAttribute('width', 1000 + 300 * e); } });
      this.at(T0 + 1.0, function () { self.now.setAttribute('opacity', 1); self.nowDot.setAttribute('opacity', 1); self.pulseNow(); });
      this.at(T0 + 3.4, function () { self.years.setAttribute('opacity', 1); });
    }
    /* each horizon: tick, connector, card, chart */
    var times = TICKS.map(function (tk, i) {
      if (mob) return .3 + i * .45;
      if (tk.x <= NOW_X) return T0 + 1.1 * px(tk.x) / px(NOW_X);
      var q = (tk.x - NOW_X) / (END - NOW_X); return T0 + 1.15 + RUN * self.invEase(q);
    });
    TICKS.forEach(function (tk, i) { self.at(times[i], function () { self.reveal(i); }); });
    this.at((mob ? 2.6 : T0 + RUN + 1.6), function () { self.idle(); });
  };
  FA.prototype.invEase = function (y) { var lo = 0, hi = 1; for (var k = 0; k < 20; k++) { var m = (lo + hi) / 2; if (ease.inOut(m) < y) lo = m; else hi = m; } return lo; };
  FA.prototype.moveHead = function (x) { this.headDot.setAttribute('cx', x); this.headHalo.setAttribute('cx', x); };
  FA.prototype.pulseNow = function () {
    var self = this, o = { r: 6, a: .7 }; if (reduce) return;
    this.tween(o, { r: 18, a: 0 }, 1.8, { ease: 'out', update: function () { self.nowRing.setAttribute('r', o.r); self.nowRing.setAttribute('opacity', o.a); }, done: function () { self.at(.4, function () { self.pulseNow(); }); } });
  };

  FA.prototype.reveal = function (i) {
    var self = this, card = this.cards[i], tk = TICKS[i];
    if (!this.mobile) {
      this.ticks[i].setAttribute('opacity', 1);
      var t = { s: 0 }, circ = this.ticks[i].firstChild;
      this.tween(t, { s: 1 }, .5, { ease: 'back', update: function () { circ.setAttribute('r', 7 * t.s); } });
      var bottom = parseFloat(getComputedStyle(card).getPropertyValue('--y')) + parseFloat(getComputedStyle(card).getPropertyValue('--h'));
      var cn = this.conns[i], o = { y: AXIS_Y - 8 };
      this.tween(o, { y: bottom + 4 }, .45, { ease: 'out', update: function () { cn.setAttribute('y2', o.y); } });
    }
    var st = { p: 0 };
    this.tween(st, { p: 1 }, reduce ? .2 : .9, { delay: this.mobile ? 0 : .25, ease: 'expo', update: function () {
      var p = st.p;
      card.style.opacity = Math.min(1, p * 1.6);
      if (!reduce) { card.style.transform = 'translateY(' + (22 * (1 - p)) + 'px) scale(' + (.9 + .1 * p) + ')'; card.style.filter = p < .98 ? 'blur(' + (6 * (1 - p)) + 'px)' : ''; }
    }, done: function () { card.classList.add('is-in'); card.style.opacity = ''; card.style.filter = ''; } });
    this.at(this.mobile ? .2 : .55, function () { self.chartIn(i); });
  };

  FA.prototype.draw = function (path, dur, delay) {
    var L = len(path), o = { v: 1 };
    path.style.strokeDasharray = L + ' ' + L; path.style.strokeDashoffset = L;
    var keep = path.getAttribute('stroke-dasharray');
    this.tween(o, { v: 0 }, dur, { delay: delay || 0, ease: 'inOut', update: function () { path.style.strokeDashoffset = L * o.v; }, done: function () { path.style.strokeDasharray = keep ? keep.split(' ').join(' ') : ''; path.style.strokeDashoffset = ''; } });
  };

  FA.prototype.chartIn = function (i) {
    var c = this.charts, self = this;
    if (i === 0) { this.draw(c.history.line, 1.2); c.history.area.style.opacity = 0; this.tween({ v: 0 }, { v: 1 }, .8, { delay: .8, update: function (e) { c.history.area.style.opacity = e; } }); }
    if (i === 1) {
      c.intraday.bars.forEach(function (b, k) {
        var o = { h: 0 }, v = c.intraday.vals[k];
        self.tween(o, { h: v }, .5, { delay: k * .035, ease: 'out', update: function () { b.setAttribute('height', o.h); b.setAttribute('y', 100 - o.h); } });
      });
      this.at(1.0, function () { c.intraday.now.setAttribute('opacity', 1); });
    }
    if (i === 2) {
      c.days.band.style.opacity = 0;
      this.draw(c.days.act, .6); this.draw(c.days.fc, 1.0, .5);
      this.tween({ v: 0 }, { v: 1 }, .8, { delay: .7, update: function (e) { c.days.band.style.opacity = e; } });
    }
    if (i === 3) {
      this.draw(c.months.line, 1.3);
      this.tween({ w: 0 }, { w: 220 }, 1.4, { delay: .15, ease: 'inOut', update: function (e, q) { c.months.clip.setAttribute('width', 220 * e); } });
    }
    if (i === 4) { c.long.lines.forEach(function (l, k) { self.draw(l, 1.3, k * .15); }); }
  };

  /* ---------- idle ---------- */
  FA.prototype.idle = function () {
    var self = this, c = this.charts;
    /* intraday tape: one bar prints, the window shifts */
    this.every(2.2, function () {
      c.intraday.ph += 1;
      c.intraday.vals.shift(); c.intraday.vals.push(self.iv(c.intraday.vals.length));
      c.intraday.bars.forEach(function (b, k) {
        var o = { h: parseFloat(b.getAttribute('height')) || 0 };
        self.tween(o, { h: c.intraday.vals[k] }, .7, { ease: 'inOut', update: function () { b.setAttribute('height', o.h); b.setAttribute('y', 100 - o.h); } });
      });
    }, .4);
    /* months band breathes */
    var wide = false;
    this.every(2.6, function () {
      wide = !wide;
      var from = wide ? c.months.bandA : c.months.bandB, to = wide ? c.months.bandB : c.months.bandA;
      var A = from.match(/-?\d+(\.\d+)?/g).map(Number), B = to.match(/-?\d+(\.\d+)?/g).map(Number), tpl = from.split(/-?\d+(?:\.\d+)?/);
      self.tween({ v: 0 }, { v: 1 }, 2.4, { ease: 'inOut', update: function (e) {
        var s = tpl[0]; for (var k = 0; k < A.length; k++) s += r1(A[k] + (B[k] - A[k]) * e) + tpl[k + 1];
        c.months.band.setAttribute('d', s);
      } });
    }, .2);
    /* 2060 scenarios take turns */
    var n = 0;
    this.every(2.8, function () {
      n = (n + 1) % 3;
      c.long.lines.forEach(function (l, k) { l.setAttribute('stroke-opacity', k === n ? 1 : .45); l.setAttribute('stroke-width', k === n ? 2.6 : 1.8); l.style.transition = 'stroke-opacity .5s, stroke-width .5s'; });
      c.long.scn.style.opacity = 0;
      self.at(.3, function () { c.long.scn.textContent = SCEN[n]; c.long.scn.style.opacity = 1; });
    }, 1.2);
  };

  /* ---------- hover: bring one horizon forward ---------- */
  FA.prototype.bindHover = function () {
    var self = this;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    this.cards.forEach(function (card, i) {
      card.addEventListener('pointerenter', function () { self.focus(i); });
      card.addEventListener('pointerleave', function () { self.focus(-1); });
    });
  };
  FA.prototype.focus = function (i) {
    var self = this;
    this.cards.forEach(function (c, k) { c.classList.toggle('is-dim', i >= 0 && k !== i); c.classList.toggle('is-hot', k === i); });
    this.conns.forEach(function (l, k) { l.setAttribute('opacity', i < 0 || k === i ? .9 : .25); });
    this.ticks.forEach(function (t, k) { var circ = t.firstChild; circ.setAttribute('r', k === i ? 9 : 7); });
    void self;
  };

  function init(scope) { [].slice.call((scope || document).querySelectorAll('[data-mtl-fa]')).forEach(function (r) { if (!r._mtlFA) r._mtlFA = new FA(r); }); }
  window.MontelFA = { init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); }); else init();
})();
