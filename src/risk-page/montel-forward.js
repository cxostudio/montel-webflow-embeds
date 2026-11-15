/* =========================================================
   Montel · "Forward prices in your tools" visual  (v1.0)
   Risk page, "Works where you work" (Analytics work component).
   Replaces the static image on this page only. No dependencies,
   one rAF loop that only runs while on screen.

   Story: the forward curve table ticks live. Every few seconds a
   contract is picked and travels as a chip into Excel, Models or
   BI tools, which light up and react. Base / Peak switches now and
   then (click to switch). Hover a tool to send the selected
   contract to it; hover a row to select it.
   ========================================================= */
(function () {
  'use strict';
  if (window.MontelForward) return;

  /* ---------- mount ---------- */
  var box = document.querySelector('.analytics_work__right');
  if (!box || box.querySelector('[data-mtl-fp]')) return;
  document.documentElement.classList.add('mtl-js');

  var IC = {
    excel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M3.5 10h17M3.5 14.5h17M9.5 10v9"/></svg>',
    models: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/></svg>',
    bi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M4 20h16M6 20v-6h3v6M10.5 20V9h3v11M15 20V5h3v15"/></svg>'
  };
  var TOOLS = [['excel', 'Excel', 'Spreadsheet add-in', 206], ['models', 'Models', 'Python and API', 313], ['bi', 'BI tools', 'Live dashboards', 420]];
  var ROWS = [['M+1', 92.40, 1.10], ['Q+1', 88.70, .60], ['Y+1', 81.20, -.40], ['Y+2', 76.90, -.20], ['Y+3', 74.30, .10], ['Y+4', 72.80, -.30]];

  var html = '<div class="mtl-fp" data-mtl-fp><div class="mtl-fp__canvas"><svg class="mtl-fp__links" viewBox="0 0 1000 700" aria-hidden="true"></svg>';
  TOOLS.forEach(function (t, i) {
    html += '<div class="mtl-fp__card mtl-fp__tool" data-o="' + (i + 1) + '" data-tool="' + t[0] + '" style="--x:40px;--y:' + t[3] + 'px;--w:318px;--h:76px">' +
      '<span class="mtl-fp__ic">' + IC[t[0]] + '</span><div><h3 class="mtl-fp__tt">' + t[1] + '</h3><p class="mtl-fp__ts">' + t[2] + '</p></div>' +
      '<svg class="mtl-fp__pv" viewBox="0 0 80 32" aria-hidden="true"></svg></div>';
  });
  html += '<section class="mtl-fp__card mtl-fp__table" data-o="0" style="--x:446px;--y:112px;--w:514px;--h:476px">' +
    '<div class="mtl-fp__head"><div><h3 class="mtl-fp__t">Forward prices</h3><p class="mtl-fp__s">Platform view · EUR/MWh</p></div>' +
    '<div class="mtl-fp__seg" role="tablist"><i></i><span class="is-on" data-m="base">Base</span><span data-m="peak">Peak</span></div></div>' +
    '<div class="mtl-fp__rows"><span class="mtl-fp__hl"></span><div class="mtl-fp__row mtl-fp__row--th"><span>Contract</span><span>Last</span><span>Change</span></div>';
  ROWS.forEach(function (r, i) {
    html += '<div class="mtl-fp__row" data-i="' + i + '"><span>' + r[0] + '</span><span class="mtl-fp__last"></span><span class="mtl-fp__chg"></span></div>';
  });
  html += '</div></section><span class="mtl-fp__chip" aria-hidden="true"></span></div></div>';
  var wrap = document.createElement('div');
  wrap.className = 'mtl-fp-mount';
  wrap.innerHTML = html;
  box.classList.add('has-mtl-fp');
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
  function fmt(v) { return v.toFixed(2); }

  function Fp(root) {
    var self = this, q = this.q = function (s) { return root.querySelector(s); };
    this.root = root; this.canvas = q('.mtl-fp__canvas'); this.links = q('.mtl-fp__links'); this.chip = q('.mtl-fp__chip'); this.hl = q('.mtl-fp__hl');
    this.cards = [].slice.call(root.querySelectorAll('.mtl-fp__card')).sort(function (a, b) { return a.getAttribute('data-o') - b.getAttribute('data-o'); });
    this.tools = [].slice.call(root.querySelectorAll('.mtl-fp__tool'));
    this.rows = [].slice.call(root.querySelectorAll('.mtl-fp__row:not(.mtl-fp__row--th)'));
    this.tabs = [].slice.call(root.querySelectorAll('.mtl-fp__seg span'));
    this.clock = 0; this.tweens = []; this.events = []; this.tool = -1; this.row = 2; this.lastUser = -99; this.mode = 'base'; this.step = 0;
    /* live values: base, peak = base x 1.14 */
    this.data = { base: ROWS.map(function (r) { return { v: r[1], c: r[2] }; }), peak: ROWS.map(function (r) { return { v: r[1] * 1.14, c: r[2] * 1.3 }; }) };
    this.render(); this.buildLinks(); this.buildPreviews();
    this.fit();
    new ResizeObserver(function () { self.fit(); self.placeHl(true); self.knob(true); }).observe(root);
    new IntersectionObserver(function (e) {
      self.onscreen = e[0].isIntersecting;
      if (self.onscreen) { self.start(); if (!self.played) self.play(); } else self.stop();
    }, { threshold: .15 }).observe(root);
    document.addEventListener('visibilitychange', function () { document.hidden ? self.stop() : (self.onscreen && self.start()); });
    this.knob(true); this.placeHl(true);
    this.bind();
  }

  Fp.prototype.fit = function () {
    this.mobile = window.matchMedia('(max-width: 760px)').matches;
    var w = this.root.clientWidth; if (w && !this.mobile) this.root.style.setProperty('--mtl-s', Math.min(1.1, w / 1000).toFixed(4));
  };

  /* ---------- clock ---------- */
  Fp.prototype.tween = function (o, to, dur, opt) {
    opt = opt || {};
    var t = { o: o, to: to, from: {}, dur: Math.max(.001, reduce ? Math.min(dur, .2) : dur), t0: this.clock + (opt.delay || 0), e: ease[opt.ease || 'out'], up: opt.update, done: opt.done, started: false };
    this.tweens.push(t); return t;
  };
  Fp.prototype.at = function (dt, fn) { this.events.push({ t: this.clock + dt, fn: fn }); };
  Fp.prototype.tick = function (dt) {
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
  Fp.prototype.start = function () {
    if (this.running) return; this.running = true; this.last = performance.now();
    var self = this;
    var loop = function (n) { if (!self.running) return; var dt = Math.min(.05, (n - self.last) / 1000); self.last = n; self.tick(dt); self.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  };
  Fp.prototype.stop = function () { this.running = false; cancelAnimationFrame(this.raf); };

  /* ---------- table ---------- */
  Fp.prototype.setRow = function (i, shown) {
    var r = this.rows[i], d = this.data[this.mode][i], v = shown == null ? d.v : shown;
    r.querySelector('.mtl-fp__last').textContent = fmt(v);
    var c = r.querySelector('.mtl-fp__chg');
    c.textContent = (d.c >= 0 ? '▲ ' : '▼ ') + fmt(Math.abs(d.c));
    c.classList.toggle('is-down', d.c < 0);
  };
  Fp.prototype.render = function () { for (var i = 0; i < this.rows.length; i++) this.setRow(i); };
  Fp.prototype.knob = function (instant) {
    var self = this, k = this.q('.mtl-fp__seg i'), on = this.tabs.filter(function (t) { return t.getAttribute('data-m') === self.mode; })[0];
    if (!on) return;
    if (instant) k.style.transition = 'none';
    k.style.width = on.offsetWidth + 'px'; k.style.transform = 'translateX(' + on.offsetLeft + 'px)';
    if (instant) { void k.offsetWidth; k.style.transition = ''; }
  };
  Fp.prototype.setMode = function (m) {
    if (m === this.mode) return;
    var self = this, from = this.data[this.mode].map(function (d) { return d.v; });
    this.mode = m;
    this.tabs.forEach(function (t) { t.classList.toggle('is-on', t.getAttribute('data-m') === m); });
    this.knob();
    var o = { t: 0 };
    this.tween(o, { t: 1 }, .7, { update: function () { self.rows.forEach(function (r, i) { self.setRow(i, from[i] + (self.data[m][i].v - from[i]) * o.t); }); }, done: function () { self.render(); } });
  };
  Fp.prototype.placeHl = function (instant) {
    var r = this.rows[this.row]; if (!r) return;
    if (instant) this.hl.style.transition = 'none';
    this.hl.style.height = r.offsetHeight + 'px';
    this.hl.style.transform = 'translateY(' + r.offsetTop + 'px)';
    this.rows.forEach(function (x, i) { x.classList.toggle('is-sel', x === r); });
    if (instant) { void this.hl.offsetWidth; this.hl.style.transition = ''; }
  };
  /* one price ticks: the number moves, its change updates, the row flashes */
  Fp.prototype.tickPrice = function () {
    var self = this, i = Math.floor(Math.random() * this.rows.length), modes = ['base', 'peak'];
    var delta = (Math.random() < .5 ? -1 : 1) * (.1 + Math.random() * .5);
    var cur = this.data[this.mode][i], from = cur.v;
    modes.forEach(function (m) { var d = self.data[m][i], k = m === 'peak' ? 1.14 : 1; d.v = Math.max(40, d.v + delta * k); d.c = +(d.c + delta * k).toFixed(2); });
    var r = this.rows[i], o = { v: from };
    r.classList.remove('is-up', 'is-dn'); void r.offsetWidth; r.classList.add(delta > 0 ? 'is-up' : 'is-dn');
    this.tween(o, { v: cur.v }, .6, { update: function () { self.setRow(i, o.v); }, done: function () { self.setRow(i); } });
  };

  /* ---------- connectors ---------- */
  Fp.prototype.buildLinks = function () {
    var s = this.links, self = this, ax = 432;
    this.paths = [];
    [196, 350, 504].forEach(function (ay, i) {
      var ty = TOOLS[i][3] + 38, x0 = 358 + 8;
      var d = 'M' + x0 + ' ' + ty + ' C' + (x0 + 30) + ' ' + ty + ' ' + (ax - 34) + ' ' + ay + ' ' + ax + ' ' + ay;
      var p = el('path', { d: d, class: 'mtl-fp__link' + (i === 1 ? ' mtl-fp__link--v' : '') }, s);
      el('circle', { cx: ax, cy: ay, r: 5, class: 'mtl-fp__anchor' + (i === 1 ? ' mtl-fp__anchor--v' : '') }, s);
      self.paths.push(p);
    });
  };

  /* ---------- tool reactions ---------- */
  Fp.prototype.buildPreviews = function () {
    var pv = this.tools.map(function (t) { return t.querySelector('.mtl-fp__pv'); });
    this.cells = [];
    for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) this.cells.push(el('rect', { x: 1 + c * 15.75, y: 1 + r * 10.5, width: 14, height: 9, rx: 2, fill: '#e1f5ed' }, pv[0]));
    el('rect', { x: 0, y: 4, width: 80, height: 24, rx: 6, fill: '#1d1340' }, pv[1]);
    this.codeT = el('text', { x: 6, y: 20, fill: '#c7b6ff', 'font-size': 7.4, 'font-family': 'ui-monospace, SFMono-Regular, Menlo, monospace' }, pv[1]);
    this.bars = [8, 16, 11, 22].map(function (h, i) { return el('rect', { x: 6 + i * 14, y: 30 - h, width: 9, height: h, rx: 2, fill: '#bfe9d6' }, pv[2]); });
  };
  Fp.prototype.setTool = function (i) {
    this.tool = i;
    this.tools.forEach(function (t, k) { t.classList.toggle('is-on', k === i); });
    this.react(i);
  };
  Fp.prototype.react = function (i) {
    var self = this, name = ROWS[this.row][0];
    if (reduce) return;
    if (i === 0) {
      this.cells.forEach(function (c) { c.setAttribute('fill', '#e1f5ed'); });
      [1, 6, 11, 4, 9].forEach(function (k, n) { self.at(.1 + n * .14, function () { self.cells[k].setAttribute('fill', '#1a9f82'); }); self.at(.5 + n * .14, function () { self.cells[k].setAttribute('fill', '#bfe9d6'); }); });
    }
    if (i === 1) {
      var s = "get('DE','" + name + "')", o = { n: 0 };
      this.tween(o, { n: s.length }, .8, { update: function () { self.codeT.textContent = s.slice(0, Math.round(o.n)) + (o.n < s.length ? '▍' : ''); } });
    }
    if (i === 2) {
      this.bars.forEach(function (b, k) {
        var h = 6 + Math.random() * 20, o = { h: +b.getAttribute('height') };
        self.tween(o, { h: h }, .7, { delay: k * .08, update: function () { b.setAttribute('height', o.h.toFixed(1)); b.setAttribute('y', (30 - o.h).toFixed(1)); } });
        b.setAttribute('fill', k === 3 ? '#1a9f82' : '#bfe9d6');
      });
    }
  };
  /* the selected contract travels as a chip into a tool */
  Fp.prototype.send = function (toolI) {
    var self = this, row = this.rows[this.row], tool = this.tools[toolI], chip = this.chip, d = this.data[this.mode][this.row];
    if (this.mobile || reduce) { this.setTool(toolI); return; }
    chip.textContent = ROWS[this.row][0] + ' · ' + fmt(d.v);
    var cr = this.canvas.getBoundingClientRect(), s = cr.width / 1000 || 1;
    var rr = row.getBoundingClientRect(), tr = tool.getBoundingClientRect();
    var x0 = (rr.left - cr.left) / s + 12, y0 = (rr.top - cr.top) / s + 12;
    var x1 = (tr.left - cr.left) / s + 120, y1 = (tr.top - cr.top) / s + 20;
    var cx = (x0 + x1) / 2, cy = Math.min(y0, y1) - 70;
    var o = { t: 0 }, p = this.paths[toolI];
    p.classList.add('is-live');
    this.tween(o, { t: 1 }, .95, { ease: 'inOut', update: function () {
      var t = o.t, u = 1 - t, x = u * u * x0 + 2 * u * t * cx + t * t * x1, y = u * u * y0 + 2 * u * t * cy + t * t * y1;
      chip.style.opacity = t < .1 ? t * 10 : (t > .85 ? (1 - t) / .15 : 1);
      chip.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + (1 - .25 * Math.max(0, t - .7) / .3) + ')';
    }, done: function () { chip.style.opacity = 0; p.classList.remove('is-live'); self.setTool(toolI); } });
  };

  /* ---------- story ---------- */
  Fp.prototype.play = function () {
    this.played = true;
    var self = this;
    this.cards.forEach(function (c, i) {
      if (reduce) { c.classList.add('is-in'); return; }
      var cs = getComputedStyle(c);
      var cx = parseFloat(cs.getPropertyValue('--x')) + parseFloat(cs.getPropertyValue('--w')) / 2, cy = parseFloat(cs.getPropertyValue('--y')) + parseFloat(cs.getPropertyValue('--h')) / 2;
      var dx = self.mobile ? 0 : (500 - cx) * .3, dy = self.mobile ? 20 : (350 - cy) * .3, o = { p: 0 };
      self.tween(o, { p: 1 }, 1.1, { delay: .15 + i * .12, ease: 'expo', update: function () {
        var p = o.p; c.style.opacity = Math.min(1, p * 1.5);
        c.style.transform = 'translate(' + dx * (1 - p) + 'px,' + dy * (1 - p) + 'px) scale(' + (.9 + .1 * p) + ')';
        c.style.filter = p < .98 ? 'blur(' + 7 * (1 - p) + 'px)' : '';
      }, done: function () { c.classList.add('is-in'); c.style.opacity = ''; c.style.filter = ''; c.style.transform = ''; } });
    });
    if (reduce) { this.setTool(0); return; }
    this.rows.forEach(function (r, i) {
      r.style.opacity = 0;
      self.tween({ v: 0 }, { v: 1 }, .5, { delay: .55 + i * .08, update: function (e) { r.style.opacity = e; }, done: function () { r.style.opacity = ''; } });
    });
    this.at(1.9, function () { self.send(0); });
    this.at(2.6, function () { self.ticker(); });
    this.at(4.8, function () { self.next(); });
  };
  Fp.prototype.ticker = function () {
    var self = this;
    if (this.onscreen) this.tickPrice();
    this.at(1.3 + Math.random() * 1.1, function () { self.ticker(); });
  };
  Fp.prototype.next = function () {
    var self = this;
    if (this.clock - this.lastUser > 4 && this.onscreen) {
      this.step++;
      if (this.step % 4 === 0) this.setMode(this.mode === 'base' ? 'peak' : 'base');
      this.row = (this.row + 1 + Math.floor(Math.random() * 2)) % this.rows.length;
      this.placeHl(false);
      this.at(.45, function () { self.send((self.tool + 1) % 3); });
    }
    this.at(3.4, function () { self.next(); });
  };

  Fp.prototype.bind = function () {
    var self = this;
    this.tabs.forEach(function (t) {
      t.addEventListener('click', function () { self.lastUser = self.clock; self.setMode(t.getAttribute('data-m')); });
    });
    if (!window.matchMedia('(pointer: fine)').matches) return;
    this.tools.forEach(function (t, i) {
      t.addEventListener('pointerenter', function () { self.lastUser = self.clock; if (i !== self.tool) self.send(i); });
    });
    this.rows.forEach(function (r, i) {
      r.addEventListener('pointerenter', function () { self.lastUser = self.clock; if (i !== self.row) { self.row = i; self.placeHl(false); } });
    });
  };

  function init(scope) { [].slice.call((scope || document).querySelectorAll('[data-mtl-fp]')).forEach(function (r) { if (!r._mtlFp) r._mtlFp = new Fp(r); }); }
  window.MontelForward = { init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); }); else init();
})();
