/* =========================================================
   Montel · Decision support (risk) hero  (v1.0)
   No dependencies. One rAF loop that only runs on screen.

   Story: the unhedged price range fans out over 12 months,
   then the hedge slider moves from 0% to 70%. As it moves the
   range pulls in to the hedged band, contracts on the forward
   curve lock one by one and the cost at risk drops from
   EUR 12.4m to 4.1m. An expert review then signs off.
   Idle: price scenarios rotate. Visitors can drag the slider
   or click Scenarios at any time.
   ========================================================= */
(function () {
  'use strict';
  if (window.MontelRisk) return;
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* scenario shapes: centre of the monthly cost (EUR m) at key months, spread multiplier, unhedged cost at risk */
  var SCEN = [
    { name: 'Central', keys: [[0, 7.6], [3, 6.5], [5.5, 6.0], [8, 6.6], [11, 8.3]], k: 1.0, car: 12.4 },
    { name: 'Cold winter', keys: [[0, 7.9], [3, 7.4], [5.5, 6.6], [8, 7.6], [11, 9.6]], k: 1.18, car: 14.8 },
    { name: 'Gas spike', keys: [[0, 7.7], [3, 8.4], [5.5, 7.6], [8, 7.2], [11, 8.0]], k: 1.32, car: 17.1 }
  ];
  var FWD = [96, 101, 89, 83, 86, 81, 78];
  var TARGET = 70;

  var ease = {
    out: function (t) { return 1 - Math.pow(1 - t, 3); },
    inOut: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    expo: function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); },
    back: function (t) { var c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
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
  function interp(keys, x) {
    var i = 0; while (i < keys.length - 2 && keys[i + 1][0] < x) i++;
    var k0 = keys[i - 1] || keys[i], k1 = keys[i], k2 = keys[i + 1], k3 = keys[i + 2] || k2;
    var t = Math.max(0, Math.min(1, (x - k1[0]) / (k2[0] - k1[0]))), t2 = t * t, t3 = t2 * t;
    return .5 * (2 * k1[1] + (-k0[1] + k2[1]) * t + (2 * k0[1] - 5 * k1[1] + 4 * k2[1] - k3[1]) * t2 + (-k0[1] + 3 * k1[1] - 3 * k2[1] + k3[1]) * t3);
  }

  function Risk(root) {
    this.root = root; this.canvas = root.querySelector('.mtl-rk__canvas');
    this.cards = [].slice.call(root.querySelectorAll('.mtl-rk__card')).sort(function (a, b) { return a.getAttribute('data-o') - b.getAttribute('data-o'); });
    this.range = root.querySelector('.mtl-rk__range');
    this.pct = root.querySelector('.mtl-rk__pct');
    this.carN = root.querySelector('.mtl-rk__car-n'); this.carU = root.querySelector('.mtl-rk__car-u');
    this.lock = root.querySelector('.mtl-rk__lock');
    this.chip = root.querySelector('.mtl-rk__chip');
    this.clock = 0; this.tweens = []; this.events = [];
    this.state = { h: TARGET, s: 0, mix: 1, reveal: 1 };   /* static view = final state */
    this.from = SCEN[0]; this.to = SCEN[0]; this.scn = 0;
    this.lastUser = -99; this.played = false; this.running = false;
    this.build(); this.render();
    var self = this;
    this.fit();
    new ResizeObserver(function () { self.fit(); }).observe(root);
    new IntersectionObserver(function (e) {
      if (e[0].isIntersecting) { self.start(); if (!self.played) self.play(); } else self.stop();
    }, { threshold: .15 }).observe(root);
    document.addEventListener('visibilitychange', function () { document.hidden ? self.stop() : self.start(); });
    this.bind();
  }

  Risk.prototype.fit = function () {
    this.mobile = window.matchMedia('(max-width: 760px)').matches;
    var w = this.root.clientWidth; if (w && !this.mobile) this.root.style.setProperty('--mtl-s', Math.min(1.1, w / 1000).toFixed(4));
  };

  /* ---------- clock ---------- */
  Risk.prototype.tween = function (o, to, dur, opt) {
    opt = opt || {};
    var t = { o: o, to: to, from: {}, dur: Math.max(.001, reduce ? Math.min(dur, .2) : dur), t0: this.clock + (opt.delay || 0), e: ease[opt.ease || 'out'], up: opt.update, done: opt.done, tag: opt.tag, started: false };
    this.tweens.push(t); return t;
  };
  Risk.prototype.at = function (dt, fn, tag) { this.events.push({ t: this.clock + dt, fn: fn, tag: tag }); };
  Risk.prototype.kill = function (tag) {
    this.tweens = this.tweens.filter(function (t) { return t.tag !== tag; });
    this.events = this.events.filter(function (e) { return e.tag !== tag; });
  };
  Risk.prototype.step = function (dt) {
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
    if (this.dirty) { this.render(); this.dirty = false; }
  };
  Risk.prototype.start = function () {
    if (this.running) return; this.running = true; this.last = performance.now();
    var self = this;
    var loop = function (n) { if (!self.running) return; var dt = Math.min(.05, (n - self.last) / 1000); self.last = n; self.step(dt); self.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  };
  Risk.prototype.stop = function () { this.running = false; cancelAnimationFrame(this.raf); };

  /* ---------- build the two charts ---------- */
  Risk.prototype.build = function () {
    var s = this.root.querySelector('.mtl-rk__chart'), uid = 'mtlrk' + Math.random().toString(36).slice(2, 7);
    s.innerHTML = '';
    var X0 = 56, X1 = 608, Y = function (v) { return 18 + (12 - v) / 10 * 270; };
    this.X0 = X0; this.X1 = X1; this.Y = Y;
    [12, 7, 2].forEach(function (v) {
      el('line', { x1: X0, x2: X1, y1: Y(v), y2: Y(v), stroke: '#edf1f0', 'stroke-width': 1.4 }, s);
      el('text', { x: 0, y: Y(v) + 6, 'class': 'mtl-rk__axis' }, s).textContent = v;
    });
    [['Month 1', X0, 'start'], ['Month 6', X0 + (X1 - X0) * 5 / 11, 'middle'], ['Month 12', X1, 'end']].forEach(function (a) {
      el('text', { x: a[1], y: 330, 'class': 'mtl-rk__axis', 'text-anchor': a[2] }, s).textContent = a[0];
    });
    var cp = el('clipPath', { id: uid + 'c' }, el('defs', {}, s));
    this.clip = el('rect', { x: X0 - 4, y: -20, width: X1 - X0 + 8, height: 380 }, cp);
    var g = el('g', { 'clip-path': 'url(#' + uid + 'c)' }, s);
    this.pU = el('path', { fill: '#e7defe' }, g);
    this.pH = el('path', { fill: '#8fdcbf', 'fill-opacity': .75 }, g);
    this.pC = el('path', { fill: 'none', stroke: '#0d6d5c', 'stroke-width': 3.6, 'stroke-linecap': 'round' }, g);

    /* forward curve */
    var f = this.root.querySelector('.mtl-rk__fsvg'); f.innerHTML = '';
    var FX = function (i) { return 44 + i * (262 - 44) / 6; }, FY = function (v) { return 10 + (110 - v) / 40 * 92; };
    [110, 90, 70].forEach(function (v) {
      el('line', { x1: 40, x2: 266, y1: FY(v), y2: FY(v), stroke: '#edf1f0', 'stroke-width': 1.2 }, f);
      el('text', { x: 0, y: FY(v) + 5, 'class': 'mtl-rk__axis', 'font-size': 15 }, f).textContent = v;
    });
    el('text', { x: 44, y: 132, 'class': 'mtl-rk__axis', 'font-size': 15, 'text-anchor': 'middle' }, f).textContent = 'M+1';
    el('text', { x: 262, y: 132, 'class': 'mtl-rk__axis', 'font-size': 15, 'text-anchor': 'middle' }, f).textContent = 'Y+3';
    var pts = FWD.map(function (v, i) { return [FX(i), FY(v)]; });
    this.fLine = el('path', { d: 'M' + pts.map(function (p) { return p.join(','); }).join(' L'), fill: 'none', stroke: '#0d6d5c', 'stroke-width': 2.6, 'stroke-linejoin': 'round' }, f);
    this.fPts = pts.map(function (p) { return el('rect', { x: p[0] - 5.5, y: p[1] - 5.5, width: 11, height: 11, rx: 2, fill: '#0d6d5c', stroke: '#0d6d5c', 'stroke-width': 2.4 }, f); });
  };

  /* ---------- render everything from state ---------- */
  Risk.prototype.render = function () {
    var st = this.state, h = st.h / 100, Y = this.Y, X0 = this.X0, X1 = this.X1, self = this;
    var A = this.from, B = this.to, m = st.mix;
    var k = A.k + (B.k - A.k) * m, carU = A.car + (B.car - A.car) * m;
    var fac = Math.max(.06, 1 - .956 * h);                     /* 70% hedge leaves 33% of the spread */
    var cU = [], cD = [], hU = [], hD = [], cl = [];
    for (var x = 0; x <= 11.001; x += .25) {
      var c = interp(A.keys, x) * (1 - m) + interp(B.keys, x) * m;
      var up = (.45 + .33 * x) * k, dn = (.35 + .24 * x) * k;
      var px = X0 + (X1 - X0) * x / 11;
      cl.push([px, Y(c)]);
      cU.push([px, Y(Math.min(12.4, c + up))]); cD.push([px, Y(Math.max(1.6, c - dn))]);
      hU.push([px, Y(c + up * fac)]); hD.push([px, Y(c - dn * fac)]);
    }
    this.pU.setAttribute('d', smooth(cU) + ' ' + smooth(cD.reverse(), false) + ' Z');
    this.pH.setAttribute('d', smooth(hU) + ' ' + smooth(hD.reverse(), false) + ' Z');
    this.pH.setAttribute('fill-opacity', (.25 + .5 * Math.min(1, h / .3)).toFixed(3));
    this.pC.setAttribute('d', smooth(cl));
    this.clip.setAttribute('width', (X1 - X0 + 8) * st.reveal);

    /* numbers */
    this.pct.textContent = Math.round(st.h) + '%';
    this.range.value = Math.round(st.h);
    this.range.style.setProperty('--p', st.h + '%');
    this.carN.textContent = (carU * fac).toFixed(1);
    this.carU.textContent = carU.toFixed(1);
    var locked = Math.round(h * FWD.length);
    this.lock.textContent = locked + ' of ' + FWD.length + ' locked';
    this.fPts.forEach(function (r, i) { r.setAttribute('fill', i < locked ? '#0d6d5c' : '#fff'); });
    void self;
  };
  Risk.prototype.set = function (h) { this.state.h = h; this.dirty = true; if (!this.running) this.render(); };

  /* ---------- the story ---------- */
  Risk.prototype.play = function () {
    this.played = true;
    var self = this, st = this.state;
    if (reduce) { this.cards.forEach(function (c) { c.classList.add('is-in'); }); this.checked(true); this.idle(); return; }
    st.h = 0; st.reveal = 0; this.render();
    this.unchecked();
    /* cards emerge from the centre of the composition */
    this.cards.forEach(function (c, i) {
      var cx = parseFloat(getComputedStyle(c).getPropertyValue('--x')) + parseFloat(getComputedStyle(c).getPropertyValue('--w')) / 2;
      var cy = parseFloat(getComputedStyle(c).getPropertyValue('--y')) + parseFloat(getComputedStyle(c).getPropertyValue('--h')) / 2;
      var dx = self.mobile ? 0 : (500 - cx) * .3, dy = self.mobile ? 24 : (380 - cy) * .3;
      var o = { p: 0 };
      self.tween(o, { p: 1 }, 1.1, { delay: .15 + i * .14, ease: 'expo', update: function () {
        var p = o.p; c.style.opacity = Math.min(1, p * 1.5);
        c.style.transform = 'translate(' + dx * (1 - p) + 'px,' + dy * (1 - p) + 'px) scale(' + (.88 + .12 * p) + ')';
        c.style.filter = p < .98 ? 'blur(' + 8 * (1 - p) + 'px)' : '';
      }, done: function () { c.classList.add('is-in'); c.style.opacity = ''; c.style.filter = ''; c.style.transform = ''; } });
    });
    /* the unhedged range fans out */
    this.tween(st, { reveal: 1 }, 1.4, { delay: .8, ease: 'inOut', update: function () { self.dirty = true; } });
    /* forward curve draws */
    var L = this.fLine.getTotalLength(); this.fLine.style.strokeDasharray = L; this.fLine.style.strokeDashoffset = L;
    this.tween({ v: L }, { v: 0 }, 1.2, { delay: 1.0, ease: 'inOut', update: function (e) { self.fLine.style.strokeDashoffset = L * (1 - e); } });
    this.fPts.forEach(function (r, i) { r.style.opacity = 0; self.tween({ v: 0 }, { v: 1 }, .3, { delay: 1.1 + i * .14, update: function (e) { r.style.opacity = e; } }); });
    /* the decision: drag the hedge to 70% */
    this.at(2.5, function () { self.range.style.setProperty('--k', 1.18); }, 'drag');
    this.tween(st, { h: TARGET }, 2.3, { delay: 2.6, ease: 'inOut', tag: 'drag', update: function () { self.dirty = true; } });
    this.at(4.95, function () { self.range.style.setProperty('--k', 1); }, 'drag');
    /* expert review signs off */
    this.at(5.1, function () { self.checked(false); }, 'demo');
    this.at(6.6, function () { self.idle(); }, 'demo');
  };

  Risk.prototype.unchecked = function () {
    var s = this.root.querySelector('.mtl-rk__rev .mtl-rk__s'), ring = this.root.querySelector('.mtl-rk__ring'), tick = this.root.querySelector('.mtl-rk__tick');
    s.textContent = 'Reviewing assumptions';
    ring.setAttribute('stroke-dasharray', '22 66'); ring.style.opacity = .55; tick.style.opacity = 0;
    var self = this, spin = { r: 0 };
    this.spinT = this.tween(spin, { r: 360 * 6 }, 9, { ease: 'out', update: function () { ring.setAttribute('transform', 'rotate(' + spin.r + ' 17 17)'); } });
  };
  Risk.prototype.checked = function (instant) {
    var s = this.root.querySelector('.mtl-rk__rev .mtl-rk__s'), ring = this.root.querySelector('.mtl-rk__ring'), tick = this.root.querySelector('.mtl-rk__tick');
    var self = this;
    this.tweens = this.tweens.filter(function (t) { return t !== self.spinT; });
    ring.removeAttribute('transform'); ring.setAttribute('stroke-dasharray', '88 0'); ring.style.opacity = 1;
    s.style.opacity = 0;
    setTimeout(function () { s.textContent = 'Assumptions checked'; s.style.opacity = 1; }, instant ? 0 : 250);
    var L = 20; tick.style.opacity = 1; tick.style.strokeDasharray = L; tick.style.strokeDashoffset = instant ? 0 : L;
    if (!instant) this.tween({ v: 0 }, { v: 1 }, .45, { ease: 'out', update: function (e) { tick.style.strokeDashoffset = L * (1 - e); } });
  };

  /* ---------- idle + interaction ---------- */
  Risk.prototype.idle = function () {
    var self = this;
    if (reduce) return;
    var cyc = function () {
      if (self.clock - self.lastUser > 5) self.scenario((self.scn + 1) % SCEN.length);
      self.at(3.6, cyc, 'idle');
    };
    this.at(1.5, cyc, 'idle');
  };
  Risk.prototype.scenario = function (n) {
    var self = this, st = this.state, span = this.chip.querySelector('span');
    this.from = { keys: this.to.keys.map(function (k, i) { return [k[0], interp(self.from.keys, k[0]) * (1 - st.mix) + k[1] * st.mix]; }), k: this.from.k + (this.to.k - this.from.k) * st.mix, car: this.from.car + (this.to.car - this.from.car) * st.mix };
    this.to = SCEN[n]; this.scn = n; st.mix = 0;
    this.kill('scn');
    this.tween(st, { mix: 1 }, reduce ? .2 : 1.3, { ease: 'inOut', tag: 'scn', update: function () { self.dirty = true; } });
    span.style.opacity = 0;
    this.at(.22, function () { span.textContent = SCEN[n].name; span.style.opacity = 1; }, 'scn');
    this.dirty = true;
  };
  Risk.prototype.bind = function () {
    var self = this;
    var user = function () { self.lastUser = self.clock; self.kill('drag'); self.range.style.setProperty('--k', 1); };
    this.range.addEventListener('input', function () { user(); self.set(+self.range.value); });
    this.range.addEventListener('pointerdown', function () { user(); });
    this.chip.addEventListener('click', function () { user(); self.scenario((self.scn + 1) % SCEN.length); });
  };

  function init(scope) { [].slice.call((scope || document).querySelectorAll('[data-mtl-risk]')).forEach(function (r) { if (!r._mtlRisk) r._mtlRisk = new Risk(r); }); }
  window.MontelRisk = { init: init, scenarios: SCEN };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); }); else init();
})();
