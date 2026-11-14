/* =========================================================
   Montel · "Forecasts in your workflow" visual  (v1.0)
   Analytics page, "Works where you work" (Analytics work component).
   Replaces the static image on this page only. No dependencies,
   one rAF loop that only runs while on screen.

   Story: the history line draws up to "now", the forecast and its
   uncertainty bands open to the right. Every few seconds a new run
   reshapes the forecast and a pulse travels from the chart into
   Platform, Excel or API, which light up and react. Hover a tool to
   send the forecast to it; hover the chart for a readout.
   ========================================================= */
(function () {
  'use strict';
  if (window.MontelWorkflow) return;

  /* ---------- mount: swap the section image for the visual ---------- */
  var box = document.querySelector('.analytics_work__right');
  if (!box || box.querySelector('[data-mtl-wf]')) return;
  document.documentElement.classList.add('mtl-js');

  var IC = {
    platform: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20l4-4 4 4M8 12V9M12 12V7M16 12v-2"/></svg>',
    excel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M3.5 10h17M3.5 14.5h17M9.5 10v9"/></svg>',
    api: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/></svg>'
  };
  var TOOLS = [['platform', 'Platform', 'Charts and dashboards', 120], ['excel', 'Excel', 'Refreshable sheets', 238], ['api', 'API', 'Your own models', 356]];
  var html = '<div class="mtl-wf" data-mtl-wf><div class="mtl-wf__canvas"><svg class="mtl-wf__links" viewBox="0 0 1000 560" aria-hidden="true"></svg>';
  TOOLS.forEach(function (t, i) {
    html += '<div class="mtl-wf__card mtl-wf__tool" data-o="' + (i + 1) + '" data-tool="' + t[0] + '" style="--x:14px;--y:' + t[3] + 'px;--w:342px;--h:84px">' +
      '<span class="mtl-wf__ic">' + IC[t[0]] + '</span><div><h3 class="mtl-wf__tt">' + t[1] + '</h3><p class="mtl-wf__ts">' + t[2] + '</p></div>' +
      '<svg class="mtl-wf__pv" viewBox="0 0 84 40" aria-hidden="true"></svg></div>';
  });
  html += '<section class="mtl-wf__card mtl-wf__chart" data-o="0" style="--x:412px;--y:58px;--w:568px;--h:444px">' +
    '<h3 class="mtl-wf__t">Forecasts in your workflow</h3><p class="mtl-wf__s">One forecast · connected tools <span class="mtl-wf__run"></span></p>' +
    '<svg class="mtl-wf__plot" viewBox="0 0 568 444" aria-hidden="true"></svg>' +
    '<div class="mtl-wf__tip" aria-hidden="true"></div></section></div></div>';
  var wrap = document.createElement('div');
  wrap.className = 'mtl-wf-mount';
  wrap.innerHTML = html;
  box.classList.add('has-mtl-wf');
  box.appendChild(wrap);

  /* ---------- helpers ---------- */
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  var ease = {
    out: function (t) { return 1 - Math.pow(1 - t, 3); },
    inOut: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    expo: function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  };
  function el(tag, a, p) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  /* Catmull-Rom through keyframes [[u, v], ...] */
  function interp(K, u) {
    var i = 0; while (i < K.length - 2 && u > K[i + 1][0]) i++;
    var p0 = K[Math.max(0, i - 1)], p1 = K[i], p2 = K[i + 1], p3 = K[Math.min(K.length - 1, i + 2)];
    var t = (u - p1[0]) / (p2[0] - p1[0] || 1); t = Math.max(0, Math.min(1, t));
    var t2 = t * t, t3 = t2 * t;
    return .5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
  }

  /* plot geometry (chart-card coordinates) */
  var X0 = 66, X1 = 538, YT = 132, YB = 372, NOW = .70;
  function px(u) { return X0 + (X1 - X0) * u; }
  function py(v) { return YB - (YB - YT) * v / 100; }
  var HIST = [[0, 72], [.07, 66], [.15, 47], [.21, 50], [.27, 51], [.33, 41], [.40, 23], [.47, 29], [.55, 47], [.63, 56], [NOW, 52]];
  var NOWV = 52;
  function scenario(first) {
    if (first) return { k: [[NOW, NOWV], [.78, 65], [.86, 76], [.93, 69], [1, 43]], s: 15 };
    var peak = 66 + Math.random() * 18, end = 30 + Math.random() * 28, mid = NOWV + 6 + Math.random() * 12;
    var pu = .84 + Math.random() * .06;
    return { k: [[NOW, NOWV], [.78, mid], [pu, peak], [Math.min(.96, pu + .07), (peak + end) / 2 + 6], [1, end]], s: 11 + Math.random() * 8 };
  }
  function mix(a, b, t) { return { k: a.k.map(function (p, i) { return [p[0] + (b.k[i][0] - p[0]) * t, p[1] + (b.k[i][1] - p[1]) * t]; }), s: a.s + (b.s - a.s) * t }; }

  function Wf(root) {
    var self = this, q = this.q = function (s) { return root.querySelector(s); };
    this.root = root; this.canvas = q('.mtl-wf__canvas'); this.links = q('.mtl-wf__links'); this.plot = q('.mtl-wf__plot');
    this.chart = q('.mtl-wf__chart'); this.tip = q('.mtl-wf__tip'); this.runEl = q('.mtl-wf__run');
    this.cards = [].slice.call(root.querySelectorAll('.mtl-wf__card')).sort(function (a, b) { return a.getAttribute('data-o') - b.getAttribute('data-o'); });
    this.tools = [].slice.call(root.querySelectorAll('.mtl-wf__tool'));
    this.clock = 0; this.tweens = []; this.events = []; this.tool = -1; this.lastUser = -99; this.run = 0;
    this.cur = scenario(true); this.reveal = reduce ? 1 : 0;
    this.buildPlot(); this.buildLinks(); this.buildPreviews(); this.draw();
    this.fit();
    new ResizeObserver(function () { self.fit(); }).observe(root);
    new IntersectionObserver(function (e) {
      self.onscreen = e[0].isIntersecting;
      if (self.onscreen) { self.start(); if (!self.played) self.play(); } else self.stop();
    }, { threshold: .15 }).observe(root);
    document.addEventListener('visibilitychange', function () { document.hidden ? self.stop() : (self.onscreen && self.start()); });
    this.bind();
  }

  Wf.prototype.fit = function () {
    this.mobile = window.matchMedia('(max-width: 760px)').matches;
    var w = this.root.clientWidth; if (w && !this.mobile) this.root.style.setProperty('--mtl-s', Math.min(1.1, w / 1000).toFixed(4));
  };

  /* ---------- clock (same pattern as the Data page catalogue) ---------- */
  Wf.prototype.tween = function (o, to, dur, opt) {
    opt = opt || {};
    var t = { o: o, to: to, from: {}, dur: Math.max(.001, reduce ? Math.min(dur, .2) : dur), t0: this.clock + (opt.delay || 0), e: ease[opt.ease || 'out'], up: opt.update, done: opt.done, started: false };
    this.tweens.push(t); return t;
  };
  Wf.prototype.at = function (dt, fn) { this.events.push({ t: this.clock + dt, fn: fn }); };
  Wf.prototype.tick = function (dt) {
    this.clock += dt;
    var now = this.clock, list = this.tweens, i, p; this.tweens = [];
    for (i = 0; i < list.length; i++) {
      var t = list[i];
      if (now < t.t0) { this.tweens.push(t); continue; }
      if (!t.started) { for (p in t.to) t.from[p] = t.o[p]; t.started = true; }
      var k = Math.min(1, (now - t.t0) / t.dur), e = t.e(k);
      for (p in t.to) t.o[p] = t.from[p] + (t.to[p] - t.from[p]) * e;
      if (t.up) t.up(e, k);
      if (k < 1) this.tweens.push(t); else if (t.done) t.done();
    }
    var ev = this.events; this.events = [];
    for (i = 0; i < ev.length; i++) { if (now >= ev[i].t) ev[i].fn(); else this.events.push(ev[i]); }
  };
  Wf.prototype.start = function () {
    if (this.running) return; this.running = true; this.last = performance.now();
    var self = this;
    var loop = function (n) { if (!self.running) return; var dt = Math.min(.05, (n - self.last) / 1000); self.last = n; self.tick(dt); self.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  };
  Wf.prototype.stop = function () { this.running = false; cancelAnimationFrame(this.raf); };

  /* ---------- chart ---------- */
  Wf.prototype.buildPlot = function () {
    var s = this.plot, d = el('defs', {}, s);
    var g1 = el('linearGradient', { id: 'mtlWfArea', x1: 0, y1: 0, x2: 0, y2: 1 }, d);
    el('stop', { offset: '0', 'stop-color': '#2f8f7e', 'stop-opacity': '.55' }, g1); el('stop', { offset: '1', 'stop-color': '#2f8f7e', 'stop-opacity': '0' }, g1);
    var g2 = el('linearGradient', { id: 'mtlWfBand', x1: 0, y1: 0, x2: 0, y2: 1 }, d);
    el('stop', { offset: '0', 'stop-color': '#a99bff', 'stop-opacity': '.34' }, g2); el('stop', { offset: '1', 'stop-color': '#5fd6bd', 'stop-opacity': '.16' }, g2);
    var cp = el('clipPath', { id: 'mtlWfReveal' }, d);
    this.clipR = el('rect', { x: 0, y: 0, width: 0, height: 444 }, cp);
    var cpH = el('clipPath', { id: 'mtlWfHist' }, d);
    this.clipH = el('rect', { x: 0, y: 0, width: 0, height: 444 }, cpH);
    [100, 50, 0].forEach(function (v) {
      el('line', { x1: X0, x2: X1, y1: py(v), y2: py(v), class: 'mtl-wf__grid' }, s);
      el('text', { x: 30, y: py(v) + 5, class: 'mtl-wf__ax' }, s).textContent = v;
    });
    el('text', { x: X0, y: YB + 38, class: 'mtl-wf__ax' }, s).textContent = 'Today';
    el('text', { x: X1, y: YB + 38, class: 'mtl-wf__ax', 'text-anchor': 'end' }, s).textContent = '+7 d';
    var gh = el('g', { 'clip-path': 'url(#mtlWfHist)' }, s);
    this.area = el('path', { fill: 'url(#mtlWfArea)' }, gh);
    this.hist = el('path', { class: 'mtl-wf__hist' }, gh);
    this.nowL = el('line', { x1: px(NOW), x2: px(NOW), y1: YT - 12, y2: YB, class: 'mtl-wf__now' }, s);
    var gf = el('g', { 'clip-path': 'url(#mtlWfReveal)' }, s);
    this.bandO = el('path', { fill: 'url(#mtlWfBand)', opacity: '.55' }, gf);
    this.bandI = el('path', { fill: 'url(#mtlWfBand)' }, gf);
    this.hi = el('path', { class: 'mtl-wf__edge mtl-wf__edge--hi' }, gf);
    this.lo = el('path', { class: 'mtl-wf__edge mtl-wf__edge--lo' }, gf);
    this.med = el('path', { class: 'mtl-wf__med' }, gf);
    this.dot = el('circle', { cx: px(NOW), cy: py(NOWV), r: 5.5, class: 'mtl-wf__dot' }, s);
    this.ring = el('circle', { cx: px(NOW), cy: py(NOWV), r: 5.5, class: 'mtl-wf__ring' }, s);
    this.hov = el('g', { class: 'mtl-wf__hov' }, s);
    this.hovL = el('line', { y1: YT - 12, y2: YB, class: 'mtl-wf__hovl' }, this.hov);
    this.hovD = el('circle', { r: 4.5, class: 'mtl-wf__hovd' }, this.hov);
    /* history never changes: build once */
    var dh = '', da;
    for (var i = 0; i <= 70; i++) { var u = NOW * i / 70; dh += (i ? 'L' : 'M') + px(u).toFixed(1) + ' ' + py(interp(HIST, u)).toFixed(1); }
    da = dh + 'L' + px(NOW) + ' ' + YB + 'L' + X0 + ' ' + YB + 'Z';
    this.hist.setAttribute('d', dh); this.area.setAttribute('d', da);
  };
  Wf.prototype.spread = function (u, s) { var f = (u - NOW) / (1 - NOW); return s * Math.sqrt(Math.max(0, f)); };
  Wf.prototype.val = function (u) {
    if (u <= NOW) return { m: interp(HIST, u) };
    var m = interp(this.cur.k, u), sp = this.spread(u, this.cur.s);
    return { m: m, lo: m - sp, hi: m + sp };
  };
  Wf.prototype.draw = function () {
    var N = 40, top = [], bot = [], itop = [], ibot = [], med = '', hi = '', lo = '';
    for (var i = 0; i <= N; i++) {
      var u = NOW + (1 - NOW) * i / N, m = interp(this.cur.k, u), sp = this.spread(u, this.cur.s), x = px(u).toFixed(1);
      top.push(x + ' ' + py(m + sp).toFixed(1)); bot.push(x + ' ' + py(m - sp).toFixed(1));
      itop.push(x + ' ' + py(m + sp * .5).toFixed(1)); ibot.push(x + ' ' + py(m - sp * .5).toFixed(1));
      med += (i ? 'L' : 'M') + x + ' ' + py(m).toFixed(1);
    }
    this.bandO.setAttribute('d', 'M' + top.join('L') + 'L' + bot.reverse().join('L') + 'Z');
    this.bandI.setAttribute('d', 'M' + itop.join('L') + 'L' + ibot.reverse().join('L') + 'Z');
    this.hi.setAttribute('d', 'M' + top.join('L')); this.lo.setAttribute('d', 'M' + bot.reverse().join('L'));
    this.med.setAttribute('d', med);
  };
  Wf.prototype.setReveal = function (h, f) {
    this.clipH.setAttribute('width', (px(NOW * h) + 1).toFixed(1));
    this.clipR.setAttribute('x', px(NOW).toFixed(1));
    this.clipR.setAttribute('width', ((X1 - px(NOW)) * f + 2).toFixed(1));
  };

  /* ---------- connectors ---------- */
  Wf.prototype.buildLinks = function () {
    var s = this.links, self = this, cx = 412;
    this.paths = [];
    [160, 280, 400].forEach(function (ay, i) {
      var ty = 120 + i * 118 + 42, x0 = 356 + 6;
      var d = 'M' + x0 + ' ' + ty + ' C' + (x0 + 26) + ' ' + ty + ' ' + (cx - 30) + ' ' + ay + ' ' + (cx - 8) + ' ' + ay;
      var p = el('path', { d: d, class: 'mtl-wf__link' }, s);
      el('circle', { cx: cx - 8, cy: ay, r: 4, class: 'mtl-wf__anchor' }, s);
      self.paths.push(p);
    });
    this.pulse = el('circle', { r: 5, class: 'mtl-wf__pulse' }, s);
  };

  /* ---------- tool reactions ---------- */
  Wf.prototype.buildPreviews = function () {
    var pv = this.tools.map(function (t) { return t.querySelector('.mtl-wf__pv'); });
    this.pvLine = el('path', { d: 'M2 32 C12 30 16 20 26 22 S40 30 48 18 S66 8 82 6', fill: 'none', stroke: '#0d6d5c', 'stroke-width': 2.4, 'stroke-linecap': 'round' }, pv[0]);
    this.cells = [];
    for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) this.cells.push(el('rect', { x: 2 + c * 20.5, y: 2 + r * 12.5, width: 18.5, height: 10.5, rx: 2, fill: '#e1f5ed' }, pv[1]));
    el('rect', { x: 1, y: 6, width: 82, height: 28, rx: 7, fill: '#0c2a2b' }, pv[2]);
    this.codeT = el('text', { x: 8, y: 24.5, fill: '#8ff0c9', 'font-size': 11, 'font-family': 'ui-monospace, SFMono-Regular, Menlo, monospace' }, pv[2]);
  };
  Wf.prototype.setTool = function (i) {
    this.tool = i;
    this.tools.forEach(function (t, k) { t.classList.toggle('is-on', k === i); });
    this.react(i);
  };
  Wf.prototype.react = function (i) {
    var self = this;
    if (reduce) return;
    if (i === 0) {
      var L = this.pvLine.getTotalLength(); this.pvLine.style.strokeDasharray = L;
      this.tween({ v: 0 }, { v: 1 }, 1, { delay: .05, ease: 'inOut', update: function (e) { self.pvLine.style.strokeDashoffset = L * (1 - e); } });
    }
    if (i === 1) {
      this.cells.forEach(function (c) { c.setAttribute('fill', '#e1f5ed'); });
      [1, 6, 11, 4, 9].forEach(function (k, n) { self.at(.1 + n * .15, function () { self.cells[k].setAttribute('fill', '#1a9f82'); }); self.at(.55 + n * .15, function () { self.cells[k].setAttribute('fill', '#bfe9d6'); }); });
    }
    if (i === 2) {
      var s = "fcst('DE','+7d')", o = { n: 0 };
      this.tween(o, { n: s.length }, .8, { update: function () { self.codeT.textContent = s.slice(0, Math.round(o.n)) + (o.n < s.length ? '▍' : ''); } });
    }
  };
  /* a pulse leaves the chart and runs down the connector into a tool */
  Wf.prototype.send = function (i) {
    var self = this;
    if (this.mobile || reduce) { this.setTool(i); return; }
    var p = this.paths[i], L = p.getTotalLength(), o = { t: 0 }, dot = this.pulse;
    p.classList.add('is-live');
    this.tween(o, { t: 1 }, .7, { ease: 'inOut', update: function () {
      var pt = p.getPointAtLength(L * (1 - o.t));
      dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
      dot.style.opacity = o.t < .1 ? o.t * 10 : (o.t > .9 ? (1 - o.t) * 10 : 1);
    }, done: function () { dot.style.opacity = 0; p.classList.remove('is-live'); self.setTool(i); } });
  };
  /* a new forecast run: the band reshapes, the now-dot pings */
  Wf.prototype.rerun = function () {
    var self = this, from = this.cur, to = scenario(false), o = { t: 0 };
    this.run++;
    this.runEl.textContent = '· run ' + (this.run + 1);
    this.ring.classList.remove('is-ping'); void this.ring.getBBox(); this.ring.classList.add('is-ping');
    this.tween(o, { t: 1 }, 1.1, { ease: 'inOut', update: function () { self.cur = mix(from, to, o.t); self.draw(); } });
  };

  /* ---------- story ---------- */
  Wf.prototype.play = function () {
    this.played = true;
    var self = this;
    this.cards.forEach(function (c, i) {
      if (reduce) { c.classList.add('is-in'); return; }
      var cs = getComputedStyle(c);
      var cx = parseFloat(cs.getPropertyValue('--x')) + parseFloat(cs.getPropertyValue('--w')) / 2, cy = parseFloat(cs.getPropertyValue('--y')) + parseFloat(cs.getPropertyValue('--h')) / 2;
      var dx = self.mobile ? 0 : (500 - cx) * .3, dy = self.mobile ? 20 : (280 - cy) * .3, o = { p: 0 };
      self.tween(o, { p: 1 }, 1.1, { delay: .15 + i * .12, ease: 'expo', update: function () {
        var p = o.p; c.style.opacity = Math.min(1, p * 1.5);
        c.style.transform = 'translate(' + dx * (1 - p) + 'px,' + dy * (1 - p) + 'px) scale(' + (.9 + .1 * p) + ')';
        c.style.filter = p < .98 ? 'blur(' + 7 * (1 - p) + 'px)' : '';
      }, done: function () { c.classList.add('is-in'); c.style.opacity = ''; c.style.filter = ''; c.style.transform = ''; } });
    });
    if (reduce) { this.setReveal(1, 1); this.root.classList.add('is-ready'); this.setTool(0); return; }
    var r = { h: 0, f: 0 };
    this.setReveal(0, 0);
    this.tween(r, { h: 1 }, 1.4, { delay: .55, ease: 'inOut', update: function () { self.setReveal(r.h, r.f); } });
    this.at(1.95, function () { self.root.classList.add('is-ready'); self.ring.classList.add('is-ping'); });
    this.tween(r, { f: 1 }, 1.2, { delay: 2.05, ease: 'out', update: function () { self.setReveal(r.h, r.f); } });
    this.at(3.1, function () { self.send(0); });
    this.at(3.1 + 3.4, function () { self.next(); });
  };
  Wf.prototype.next = function () {
    var self = this;
    if (this.clock - this.lastUser > 4 && this.onscreen) {
      this.rerun();
      this.at(1.2, function () { self.send((self.tool + 1) % 3); });
    }
    this.at(3.6, function () { self.next(); });
  };

  Wf.prototype.bind = function () {
    var self = this;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    this.tools.forEach(function (t, i) {
      t.addEventListener('pointerenter', function () { self.lastUser = self.clock; if (i !== self.tool) self.send(i); });
    });
    /* chart readout */
    this.chart.addEventListener('pointermove', function (e) {
      var r = self.plot.getBoundingClientRect(), k = r.width / 568, x = (e.clientX - r.left) / k;
      if (x < X0 || x > X1 || !self.root.classList.contains('is-ready')) { self.hideTip(); return; }
      self.lastUser = self.clock;
      var u = (x - X0) / (X1 - X0), v = self.val(u), y = py(v.m);
      self.hovL.setAttribute('x1', x); self.hovL.setAttribute('x2', x);
      self.hovD.setAttribute('cx', x); self.hovD.setAttribute('cy', y);
      self.hov.classList.add('is-on');
      var day = u <= NOW ? 'Actual' : 'Day +' + Math.max(1, Math.round((u - NOW) / (1 - NOW) * 7));
      self.tip.innerHTML = '<b>' + Math.round(v.m) + '</b> €/MWh<span>' + day + (v.lo != null ? ' · range ' + Math.round(v.lo) + '–' + Math.round(v.hi) : '') + '</span>';
      self.tip.style.transform = 'translate(' + Math.min(x + 14, 568 - 190) + 'px,' + (y - 52) + 'px)';
      self.tip.classList.add('is-on');
    });
    this.chart.addEventListener('pointerleave', function () { self.hideTip(); });
  };
  Wf.prototype.hideTip = function () { this.hov.classList.remove('is-on'); this.tip.classList.remove('is-on'); };

  function init(scope) { [].slice.call((scope || document).querySelectorAll('[data-mtl-wf]')).forEach(function (r) { if (!r._mtlWf) r._mtlWf = new Wf(r); }); }
  window.MontelWorkflow = { init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); }); else init();
})();
