/* =========================================================
   Montel · Data catalogue visual  (v1.0)
   No dependencies. One rAF loop that only runs on screen.

   Story: one catalogue, every tool. The market tabs filter
   the catalogue, a dataset is picked and travels as a chip
   into Platform, Spreadsheets, Models or BI tools, which
   light up and react. Hover a tool to send data to it;
   click a tab to switch market.
   ========================================================= */
(function () {
  'use strict';
  if (window.MontelCatalogue) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  /* [market tab, data row index, tool index] */
  var STEPS = [['Power', 0, 0], ['Power', 1, 1], ['Power', 2, 2], ['Gas', 3, 3], ['Gas', 4, 0], ['Carbon', 5, 1], ['Carbon', 5, 3], ['Power', 0, 2]];
  var EVERY = 3.2;
  var CODE = ["get('DA')", "stream('ID')", "get('IMB')", "get('TTF')", "get('STOR')", "stream('EUA')"];

  var ease = {
    out: function (t) { return 1 - Math.pow(1 - t, 3); },
    inOut: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    expo: function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  };
  function el(tag, a, p) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }

  function Cat(root) {
    this.root = root; var q = this.q = function (s) { return root.querySelector(s); };
    this.canvas = q('.mtl-cat__canvas');
    this.cards = [].slice.call(root.querySelectorAll('.mtl-cat__card')).sort(function (a, b) { return a.getAttribute('data-o') - b.getAttribute('data-o'); });
    this.rows = [].slice.call(root.querySelectorAll('.mtl-cat__row:not(.mtl-cat__row--th)'));
    this.tools = [].slice.call(root.querySelectorAll('.mtl-cat__tool'));
    this.tabs = [].slice.call(root.querySelectorAll('.mtl-cat__seg span'));
    this.chip = q('.mtl-cat__chip');
    this.hl = document.createElement('span'); this.hl.className = 'mtl-cat__hl'; q('.mtl-cat__rows').prepend(this.hl);
    this.clock = 0; this.tweens = []; this.events = [];
    this.step = -1; this.row = 0; this.tool = 0; this.tab = 'Power';
    this.lastUser = -99; this.played = false; this.running = false;
    this.buildPreviews();
    var self = this;
    this.fit();
    new ResizeObserver(function () { self.fit(); self.placeHl(true); self.knob(true); }).observe(root);
    new IntersectionObserver(function (e) {
      self.onscreen = e[0].isIntersecting;
      if (self.onscreen) { self.start(); if (!self.played) self.play(); } else self.stop();
    }, { threshold: .15 }).observe(root);
    document.addEventListener('visibilitychange', function () { document.hidden ? self.stop() : (self.onscreen && self.start()); });
    this.setTab('Power', true); this.placeHl(true);
    this.bind();
  }

  Cat.prototype.fit = function () {
    this.mobile = window.matchMedia('(max-width: 760px)').matches;
    var w = this.root.clientWidth; if (w && !this.mobile) this.root.style.setProperty('--mtl-s', Math.min(1.1, w / 1000).toFixed(4));
  };

  /* ---------- clock ---------- */
  Cat.prototype.tween = function (o, to, dur, opt) {
    opt = opt || {};
    var t = { o: o, to: to, from: {}, dur: Math.max(.001, reduce ? Math.min(dur, .2) : dur), t0: this.clock + (opt.delay || 0), e: ease[opt.ease || 'out'], up: opt.update, done: opt.done, started: false };
    this.tweens.push(t); return t;
  };
  Cat.prototype.at = function (dt, fn) { this.events.push({ t: this.clock + dt, fn: fn }); };
  Cat.prototype.tick = function (dt) {
    this.clock += dt;
    var now = this.clock, list = this.tweens, i, p; this.tweens = [];
    for (i = 0; i < list.length; i++) {
      var t = list[i];
      if (now < t.t0) { this.tweens.push(t); continue; }
      if (!t.started) { for (p in t.to) t.from[p] = t.o[p]; t.started = true; }
      var qq = Math.min(1, (now - t.t0) / t.dur), e = t.e(qq);
      for (p in t.to) t.o[p] = t.from[p] + (t.to[p] - t.from[p]) * e;
      if (t.up) t.up(e, qq);
      if (qq < 1) this.tweens.push(t); else if (t.done) t.done();
    }
    var ev = this.events; this.events = [];
    for (i = 0; i < ev.length; i++) { if (now >= ev[i].t) ev[i].fn(); else this.events.push(ev[i]); }
  };
  Cat.prototype.start = function () {
    if (this.running) return; this.running = true; this.last = performance.now();
    var self = this;
    var loop = function (n) { if (!self.running) return; var dt = Math.min(.05, (n - self.last) / 1000); self.last = n; self.tick(dt); self.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  };
  Cat.prototype.stop = function () { this.running = false; cancelAnimationFrame(this.raf); };

  /* ---------- pieces ---------- */
  Cat.prototype.knob = function (instant) {
    var self = this, k = this.q('.mtl-cat__seg i'), on = this.tabs.filter(function (t) { return t.getAttribute('data-m') === self.tab; })[0];
    if (!on) return;
    if (instant) k.style.transition = 'none';
    k.style.width = on.offsetWidth + 'px'; k.style.transform = 'translateX(' + on.offsetLeft + 'px)';
    if (instant) { void k.offsetWidth; k.style.transition = ''; }
  };
  Cat.prototype.setTab = function (m, instant) {
    this.tab = m;
    this.tabs.forEach(function (t) { t.classList.toggle('is-on', t.getAttribute('data-m') === m); });
    this.rows.forEach(function (r) { r.classList.toggle('is-dim', r.getAttribute('data-m') !== m); });
    this.knob(instant);
  };
  Cat.prototype.placeHl = function (instant) {
    var r = this.rows[this.row]; if (!r) return;
    if (instant) this.hl.style.transition = 'none';
    this.hl.style.height = r.offsetHeight + 'px';
    this.hl.style.transform = 'translateY(' + r.offsetTop + 'px)';
    if (instant) { void this.hl.offsetWidth; this.hl.style.transition = ''; }
  };
  Cat.prototype.setTool = function (i) {
    this.tool = i;
    this.tools.forEach(function (t, k) { t.classList.toggle('is-on', k === i); });
    this.react(i);
  };

  /* small reactions inside each tool */
  Cat.prototype.buildPreviews = function () {
    var sheets = this.tools[1].querySelector('.mtl-cat__pv'), models = this.tools[2].querySelector('.mtl-cat__pv'), bi = this.tools[3].querySelector('.mtl-cat__pv');
    this.cells = [];
    for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) this.cells.push(el('rect', { x: 2 + c * 20.5, y: 2 + r * 12.5, width: 18.5, height: 10.5, rx: 2, fill: '#ece6ff' }, sheets));
    el('rect', { x: 1, y: 6, width: 82, height: 28, rx: 7, fill: '#0c2a2b' }, models);
    this.codeT = el('text', { x: 9, y: 25, fill: '#8ff0c9', 'font-size': 12.5, 'font-family': 'ui-monospace, SFMono-Regular, Menlo, monospace' }, models);
    el('circle', { cx: 62, cy: 20, r: 15, fill: 'none', stroke: '#ece6ff', 'stroke-width': 7 }, bi);
    this.donut = el('circle', { cx: 62, cy: 20, r: 15, fill: 'none', stroke: '#6a2ff6', 'stroke-width': 7, 'stroke-dasharray': '94.2', 'stroke-dashoffset': '40', transform: 'rotate(-90 62 20)', 'stroke-linecap': 'round' }, bi);
    this.biT = el('text', { x: 2, y: 25, fill: '#0c2a2b', 'font-size': 14, 'font-weight': 600, 'font-family': 'inherit' }, bi);
    this.biT.textContent = '58%';
    this.pvLine = this.tools[0].querySelector('.mtl-cat__pv-line');
  };
  Cat.prototype.react = function (i) {
    var self = this;
    if (reduce) return;
    if (i === 0) {
      var L = this.pvLine.getTotalLength(); this.pvLine.style.strokeDasharray = L;
      this.tween({ v: 0 }, { v: 1 }, 1, { delay: .1, ease: 'inOut', update: function (e) { self.pvLine.style.strokeDashoffset = L * (1 - e); } });
    }
    if (i === 1) {
      this.cells.forEach(function (c) { c.setAttribute('fill', '#ece6ff'); });
      [1, 6, 11, 4].forEach(function (k, n) { self.at(.15 + n * .18, function () { self.cells[k].setAttribute('fill', '#1a9f82'); }); self.at(.6 + n * .18, function () { self.cells[k].setAttribute('fill', '#bfe9d6'); }); });
    }
    if (i === 2) {
      var s = CODE[this.row] || CODE[0], o = { n: 0 };
      this.tween(o, { n: s.length }, .8, { ease: 'out', update: function () { self.codeT.textContent = s.slice(0, Math.round(o.n)) + (o.n < s.length ? '▍' : ''); } });
    }
    if (i === 3) {
      var p = { v: 0 }, to = 40 + Math.round(Math.random() * 45);
      this.tween(p, { v: to }, 1, { ease: 'out', update: function () { self.donut.setAttribute('stroke-dashoffset', (94.2 * (1 - p.v / 100)).toFixed(1)); self.biT.textContent = Math.round(p.v) + '%'; } });
    }
  };

  /* the dataset chip travels from its row into the tool */
  Cat.prototype.send = function (rowI, toolI) {
    var self = this, row = this.rows[rowI], tool = this.tools[toolI], chip = this.chip;
    this.row = rowI; this.placeHl(false);
    if (this.mobile || reduce) { this.setTool(toolI); return; }
    chip.textContent = row.children[0].textContent;
    var cr = this.canvas.getBoundingClientRect(), s = cr.width / 1000 || 1;
    var rr = row.getBoundingClientRect(), tr = tool.getBoundingClientRect();
    var x0 = (rr.left - cr.left) / s + 14, y0 = (rr.top - cr.top) / s + 6;
    var x1 = (tr.left - cr.left) / s + 92, y1 = (tr.top - cr.top) / s + 26;
    var cx = (x0 + x1) / 2 + 40, cy = Math.min(y0, y1) - 60;
    var o = { t: 0 };
    this.at(.55, function () {
      self.tween(o, { t: 1 }, .95, { ease: 'inOut', update: function () {
        var t = o.t, u = 1 - t, x = u * u * x0 + 2 * u * t * cx + t * t * x1, y = u * u * y0 + 2 * u * t * cy + t * t * y1;
        chip.style.opacity = t < .1 ? t * 10 : (t > .85 ? (1 - t) / .15 : 1);
        chip.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + (1 - .25 * Math.max(0, t - .7) / .3) + ')';
      }, done: function () { chip.style.opacity = 0; self.setTool(toolI); } });
    });
  };

  /* ---------- story ---------- */
  Cat.prototype.play = function () {
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
    if (!reduce) this.rows.forEach(function (r, i) {
      r.style.opacity = 0;
      self.tween({ v: 0 }, { v: 1 }, .5, { delay: .5 + i * .07, update: function (e) { r.style.opacity = e; }, done: function () { r.style.opacity = ''; } });
    });
    this.at(.9, function () { self.react(0); });
    if (!reduce) this.at(2.2, function () { self.next(); });
  };
  Cat.prototype.next = function () {
    var self = this;
    if (this.clock - this.lastUser > 4 && this.onscreen) {
      this.step = (this.step + 1) % STEPS.length;
      var s = STEPS[this.step];
      if (s[0] !== this.tab) this.setTab(s[0]);
      this.send(s[1], s[2]);
    }
    this.at(EVERY, function () { self.next(); });
  };

  Cat.prototype.bind = function () {
    var self = this;
    this.tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        self.lastUser = self.clock; var m = t.getAttribute('data-m');
        self.setTab(m);
        var r = self.rows.findIndex(function (x) { return x.getAttribute('data-m') === m; });
        self.send(r, self.tool);
      });
    });
    if (!window.matchMedia('(pointer: fine)').matches) return;
    this.tools.forEach(function (t, i) {
      t.addEventListener('pointerenter', function () { self.lastUser = self.clock; if (i !== self.tool) self.send(self.row, i); });
    });
  };

  function init(scope) { [].slice.call((scope || document).querySelectorAll('[data-mtl-catalogue]')).forEach(function (r) { if (!r._mtlCat) r._mtlCat = new Cat(r); }); }
  window.MontelCatalogue = { init: init, steps: STEPS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); }); else init();
})();
