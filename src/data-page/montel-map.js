/* =========================================================
   Montel Markets · hero map  (v1.0)
   Requires montel-map-data.js (the dot grid) loaded first.
   No other dependencies. One canvas, one rAF loop that only
   runs while the map is on screen.

   Story: the map focuses one market at a time. Its dots fill
   in, a ripple runs across Europe, interconnector arcs carry
   flows to and from its neighbours, the card updates price,
   fundamentals and a news line. Other countries are tinted by
   day-ahead price (green = cheap, purple = expensive).
   ========================================================= */
(function () {
  'use strict';
  if (window.MontelMap) return;

  /* ---------------- content (illustrative figures) ---------------- */
  var C = { wind: '#43c39a', solar: '#a9e6cc', demand: '#a58cf2', hydro: '#3aa3c4', nuclear: '#6f8a86', gas: '#f0a35a' };
  var MARKETS = [
    { code: 'DE', name: 'Germany', price: 92.40, chg: 4.1,
      rows: [['Wind', 18.2, 45, C.wind], ['Solar', 9.6, 45, C.solar], ['Demand', 61.0, 75, C.demand]],
      news: ['08:45', 'Cooler week ahead lifts demand forecast'],
      flows: [['NO', 'DE'], ['DK', 'DE'], ['DE', 'FR'], ['DE', 'AT'], ['DE', 'PL']] },
    { code: 'FR', name: 'France', price: 78.15, chg: -2.3,
      rows: [['Nuclear', 41.3, 60, C.nuclear], ['Wind', 7.8, 45, C.wind], ['Demand', 54.2, 75, C.demand]],
      news: ['09:10', 'Nuclear availability back above 41 GW after maintenance'],
      flows: [['FR', 'GB'], ['FR', 'ES'], ['FR', 'IT'], ['FR', 'CH'], ['FR', 'BE']] },
    { code: 'ES', name: 'Spain', price: 64.80, chg: -6.2,
      rows: [['Solar', 21.4, 30, C.solar], ['Wind', 11.9, 30, C.wind], ['Demand', 31.5, 45, C.demand]],
      news: ['11:20', 'Midday solar surge pushes intraday prices lower'],
      flows: [['ES', 'PT'], ['ES', 'FR']] },
    { code: 'NO', name: 'Norway', price: 41.20, chg: 1.8,
      rows: [['Hydro', 14.6, 25, C.hydro], ['Wind', 1.9, 25, C.wind], ['Demand', 17.3, 25, C.demand]],
      news: ['07:30', 'Reservoir filling 4 points below seasonal normal'],
      flows: [['NO', 'GB'], ['NO', 'DE'], ['NO', 'NL'], ['NO', 'DK'], ['SE', 'NO']] },
    { code: 'IT', name: 'Italy', price: 108.60, chg: 2.7,
      rows: [['Gas', 19.8, 35, C.gas], ['Solar', 8.4, 35, C.solar], ['Demand', 38.9, 50, C.demand]],
      news: ['10:05', 'Gas-fired output climbs as imports tighten'],
      flows: [['FR', 'IT'], ['CH', 'IT'], ['AT', 'IT'], ['SI', 'IT'], ['GR', 'IT']] }
  ];
  /* day-ahead baseload, EUR/MWh, used for the price tint and the hover tooltip */
  var PRICES = { DE: 92.40, FR: 78.15, ES: 64.80, PT: 65.10, IT: 108.60, NO: 41.20, SE: 38.50, FI: 47.00, DK: 84.30, NL: 90.10, BE: 86.70, LU: 92.40, CH: 95.20, AT: 96.80, PL: 104.50, CZ: 93.50, SK: 97.20, HU: 106.30, SI: 101.40, HR: 103.00, RS: 99.00, BA: 98.10, ME: 99.40, AL: 97.30, MK: 101.20, GR: 112.40, BG: 104.20, RO: 103.80, GB: 88.60, IE: 110.20, EE: 72.40, LV: 74.10, LT: 79.80, XK: 99.00 };
  var HEAT = ['#14987c', '#55bf9f', '#9cb8b0', '#a088f0', '#7140f4'];
  var heatBucket = function (p) { return p < 55 ? 0 : p < 80 ? 1 : p < 96 ? 2 : p < 105 ? 3 : 4; };

  /* ---------------- tiny tween + clock ---------------- */
  var ease = {
    out: function (t) { return 1 - Math.pow(1 - t, 3); },
    inOut: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    expo: function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); },
    lin: function (t) { return t; }
  };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function MapHero(root) {
    var D = window.MontelMapData;
    if (!D) { console.warn('[MontelMap] montel-map-data.js missing'); return; }
    this.root = root;
    this.stage = root.querySelector('.mtl-map__stage');
    this.canvas = root.querySelector('.mtl-map__canvas');
    this.ctx = this.canvas.getContext('2d');
    this.card = root.querySelector('.mtl-map__card');
    this.ping = root.querySelector('.mtl-map__ping');
    this.tip = root.querySelector('.mtl-map__tip');
    this.clock = 0; this.tweens = []; this.events = [];
    this.running = false; this.onscreen = false; this.hover = -1; this.hovering = false;
    this.parse(D);
    this.cam = { x: this.cx[this.idx.DE], y: this.cy[this.idx.DE] };
    this.leader = { x: this.cam.x, y: this.cam.y, a: 0 };
    this.view = { reveal: reduce ? 9999 : 0, heat: reduce ? 1 : 0 };
    this.focus = []; this.arcs = []; this.ripples = []; this.sparks = [];
    this.market = -1;
    this.bind();
    this.resize();
    this.intro();
  }

  MapHero.prototype.parse = function (D) {
    var S = D.s, n = 0, rows = D.rows.split('|'), xs = [], ys = [], cs = [], ws = [];
    this.lookup = {};
    for (var r = 0; r < rows.length; r++) {
      if (!rows[r]) continue;
      var runs = rows[r].split(';');
      for (var j = 0; j < runs.length; j++) {
        var q = runs[j].split(','), c0 = +q[0], len = +q[1], ci = +q[2], w = +q[3] / 9;
        for (var k = 0; k < len; k++) {
          xs.push((c0 + k) * S + (r % 2 ? S / 2 : 0)); ys.push(r * S * .866); cs.push(ci); ws.push(w);
          this.lookup[r * 4096 + c0 + k] = n++;
        }
      }
    }
    this.S = S; this.n = n;
    this.mx = new Float32Array(xs); this.my = new Float32Array(ys);
    this.mc = new Int16Array(cs); this.mw = new Float32Array(ws);
    this.countries = D.countries;
    this.idx = {}; this.cx = []; this.cy = []; this.heat = [];
    var self = this;
    D.countries.forEach(function (c, i) {
      self.idx[c.code] = i; self.cx[i] = c.x; self.cy[i] = c.y;
      self.heat[i] = c.faded || PRICES[c.code] == null ? -1 : heatBucket(PRICES[c.code]);
    });
  };

  /* ---------------- layout ---------------- */
  MapHero.prototype.resize = function () {
    var cv = this.canvas, dpr = Math.min(2, window.devicePixelRatio || 1);
    var cr = cv.getBoundingClientRect(), sr = this.stage.getBoundingClientRect();
    if (!cr.width) return;
    this.mobile = window.matchMedia('(max-width: 760px)').matches;
    this.dpr = dpr; this.W = cr.width; this.H = cr.height;
    cv.width = Math.round(cr.width * dpr); cv.height = Math.round(cr.height * dpr);
    this.ox = sr.left - cr.left + sr.width * (this.mobile ? .5 : .36);
    this.oy = sr.top - cr.top + sr.height * (this.mobile ? .52 : .5);
    this.k = sr.width / (this.mobile ? 440 : 700);
    if (this.card && !this.mobile) {
      var kr = this.card.getBoundingClientRect();
      this.cardPt = { x: kr.left - cr.left, y: kr.top - cr.top + 36 };
    } else this.cardPt = null;
    this.sprites();
  };

  MapHero.prototype.sprites = function () {
    var r = Math.max(1.3, this.S * this.k * .3) * this.dpr * 1.35, self = this;
    var mk = function (col) {
      var c = document.createElement('canvas'), s = Math.ceil(r * 2 + 2);
      c.width = c.height = s;
      var x = c.getContext('2d'); x.fillStyle = col; x.beginPath(); x.arc(s / 2, s / 2, r, 0, Math.PI * 2); x.fill();
      return c;
    };
    this.sp = { neutral: mk('#0d6d5c'), focus: mk('#0d6d5c'), heat: HEAT.map(mk) };
    this.spR = r; this.spS = this.sp.neutral.width;
    void self;
  };

  MapHero.prototype.toScreen = function (x, y) { return [this.ox + (x - this.cam.x) * this.k, this.oy + (y - this.cam.y) * this.k]; };

  /* ---------------- timeline helpers ---------------- */
  MapHero.prototype.tween = function (o, to, dur, opt) {
    opt = opt || {};
    var tw = { o: o, to: to, from: {}, dur: Math.max(.001, reduce ? Math.min(dur, .25) : dur), t0: this.clock + (opt.delay || 0), e: ease[opt.ease || 'inOut'], up: opt.update, done: opt.done, tag: opt.tag, started: false };
    this.tweens.push(tw); return tw;
  };
  MapHero.prototype.at = function (dt, fn, tag) { this.events.push({ t: this.clock + dt, fn: fn, tag: tag }); };
  MapHero.prototype.kill = function (tag) {
    this.tweens = this.tweens.filter(function (t) { return t.tag !== tag; });
    this.events = this.events.filter(function (e) { return e.tag !== tag; });
  };
  MapHero.prototype.step = function (dt) {
    this.clock += dt;
    var now = this.clock, i, list = this.tweens;
    this.tweens = [];
    for (i = 0; i < list.length; i++) {
      var t = list[i];
      if (now < t.t0) { this.tweens.push(t); continue; }
      if (!t.started) { for (var p in t.to) t.from[p] = t.o[p]; t.started = true; }
      var q = Math.min(1, (now - t.t0) / t.dur), e = t.e(q);
      for (p in t.to) t.o[p] = t.from[p] + (t.to[p] - t.from[p]) * e;
      if (t.up) t.up(e);
      if (q < 1) this.tweens.push(t); else if (t.done) t.done();
    }
    var ev = this.events; this.events = [];
    for (i = 0; i < ev.length; i++) { if (now >= ev[i].t) ev[i].fn(); else this.events.push(ev[i]); }
  };

  /* ---------------- story ---------------- */
  MapHero.prototype.intro = function () {
    var self = this;
    this.tween(this.view, { reveal: 1300 }, 2.2, { ease: 'out' });
    this.tween(this.view, { heat: 1 }, 1.6, { delay: 1.2, ease: 'inOut' });
    this.at(reduce ? 0 : .7, function () { self.go(0); });
    this.sparkLoop();
  };

  MapHero.prototype.go = function (mi, byUser) {
    var self = this, m = MARKETS[mi], ci = this.idx[m.code];
    if (mi === this.market) return;
    this.kill('market');
    this.market = mi;
    var ax = this.cx[ci], ay = this.cy[ci], de = [this.cx[this.idx.DE], this.cy[this.idx.DE]];

    /* dots: previous focus fades, new one fills in from its centre */
    this.focus.forEach(function (f) { self.tween(f, { f: 0 }, .8, { ease: 'out', done: function () { f.dead = true; } }); });
    var nf = { ci: ci, x: ax, y: ay, f: 0, fill: 0 };
    this.focus.push(nf);
    this.tween(nf, { f: 1 }, .5, { ease: 'out' });
    this.tween(nf, { fill: 260 }, 1.3, { ease: 'out', delay: .1 });
    if (!reduce) { var rp = { x: ax, y: ay, t: 0 }; this.ripples.push(rp); this.tween(rp, { t: 1 }, 2.6, { ease: 'lin', done: function () { rp.dead = true; } }); }

    /* camera drifts toward the market, leader line sweeps to it */
    if (!reduce) this.tween(this.cam, { x: de[0] + (ax - de[0]) * .42, y: de[1] + (ay - de[1]) * .42 }, 1.5, { ease: 'inOut', tag: 'market' });
    this.tween(this.leader, { x: ax, y: ay, a: 1 }, 1.1, { ease: 'inOut', tag: 'market' });

    /* arcs */
    this.arcs.forEach(function (a) { self.tween(a, { a: 0 }, .4, { done: function () { a.dead = true; } }); });
    m.flows.forEach(function (fl, i) {
      var a0 = self.idx[fl[0]], a1 = self.idx[fl[1]];
      var arc = { x0: self.cx[a0], y0: self.cy[a0], x1: self.cx[a1], y1: self.cy[a1], p: 0, a: 1, ph: Math.random() };
      self.arcs.push(arc);
      self.tween(arc, { p: 1 }, .9, { delay: .6 + i * .12, ease: 'out', tag: 'market' });
    });

    this.at(.3, function () { self.updateCard(m); }, 'market');
    this.at(2.0, function () { self.newsPing(m); }, 'market');
    this.at(2.6, function () { self.updateNews(m); }, 'market');
    this.at(6.9, function () { self.next(); }, 'market');
  };

  MapHero.prototype.next = function () {
    var self = this;
    if (this.hovering) { this.at(1, function () { self.next(); }, 'market'); return; }
    this.go((this.market + 1) % MARKETS.length);
  };

  MapHero.prototype.sparkLoop = function () {
    var self = this;
    if (reduce) return;
    var add = function () {
      for (var tries = 0; tries < 6; tries++) {
        var i = (Math.random() * self.n) | 0, c = self.mc[i];
        if (self.heat[c] >= 0) { var s = { i: i, t: 0 }; self.sparks.push(s); self.tween(s, { t: 1 }, 1.4, { ease: 'lin', done: function () { s.dead = true; } }); break; }
      }
      self.at(.16, add);
    };
    add();
  };

  /* ---------------- card ---------------- */
  MapHero.prototype.swap = function (el, fn) {
    if (!el) return;
    el.classList.add('mtl-map__fade', 'is-out');
    setTimeout(function () { fn(); el.classList.remove('is-out'); }, reduce ? 0 : 320);
  };
  MapHero.prototype.updateCard = function (m) {
    var card = this.card, self = this;
    if (!card) return;
    var q = function (s) { return card.querySelector(s); };
    this.swap(q('.mtl-map__name'), function () { q('.mtl-map__name').textContent = m.name; });
    var val = q('.mtl-map__value'), chg = q('.mtl-map__chg');
    var o = { v: parseFloat(val.textContent) || m.price };
    this.tween(o, { v: m.price }, 1.1, { ease: 'out', tag: 'market', update: function () { val.textContent = o.v.toFixed(2); } });
    this.swap(chg, function () {
      chg.textContent = (m.chg >= 0 ? '▲ ' : '▼ ') + Math.abs(m.chg).toFixed(1) + '%';
      chg.classList.toggle('is-down', m.chg < 0);
    });
    var rows = card.querySelectorAll('.mtl-map__row');
    m.rows.forEach(function (r, i) {
      var row = rows[i]; if (!row) return;
      var lab = row.children[0], bar = row.querySelector('.mtl-map__bar i'), num = row.querySelector('b');
      if (lab.textContent !== r[0]) self.swap(lab, function () { lab.textContent = r[0]; });
      var o2 = { v: parseFloat(num.textContent) || 0, w: parseFloat(bar.style.width) || 0 };
      bar.style.setProperty('--c', r[3]);
      self.tween(o2, { v: r[1], w: 100 * r[1] / r[2] }, 1.0, { delay: .1 + i * .08, ease: 'out', tag: 'market', update: function () {
        num.textContent = o2.v.toFixed(1) + ' GW'; bar.style.width = o2.w.toFixed(1) + '%';
      } });
    });
  };
  MapHero.prototype.updateNews = function (m) {
    var box = this.card && this.card.querySelector('.mtl-map__news');
    if (!box) return;
    this.swap(box, function () {
      box.querySelector('.mtl-map__news-time').textContent = m.news[0];
      box.querySelector('.mtl-map__news-t').textContent = m.news[1];
    });
  };
  MapHero.prototype.newsPing = function (m) {
    var p = this.ping; if (!p || reduce) return;
    var ci = this.idx[m.code], self = this;
    p.querySelector('span').textContent = 'News · ' + m.news[0];
    var o = { y: 0, a: 0 };
    var place = function () {
      var s = self.toScreen(self.cx[ci], self.cy[ci]);
      var cr = self.canvas.getBoundingClientRect(), rr = self.root.getBoundingClientRect();
      p.style.left = (s[0] + cr.left - rr.left) + 'px';
      p.style.top = (s[1] + cr.top - rr.top - 14 - o.y) + 'px';
      p.style.opacity = o.a;
    };
    this.tween(o, { y: 22, a: 1 }, .45, { ease: 'out', update: place, tag: 'market' });
    this.tween(o, { y: 40, a: 0 }, .5, { delay: 1.5, ease: 'inOut', update: place, tag: 'market' });
  };

  /* ---------------- interaction ---------------- */
  MapHero.prototype.pick = function (ex, ey) {
    var cr = this.canvas.getBoundingClientRect();
    var x = this.cam.x + (ex - cr.left - this.ox) / this.k, y = this.cam.y + (ey - cr.top - this.oy) / this.k;
    var S = this.S, r = Math.round(y / (S * .866)), c = Math.round((x - (r % 2 ? S / 2 : 0)) / S);
    for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
      var i = this.lookup[(r + dr) * 4096 + c + dc];
      if (i != null && this.heat[this.mc[i]] >= 0) return this.mc[i];
    }
    return -1;
  };
  MapHero.prototype.bind = function () {
    var self = this, cv = this.canvas;
    this.ro = new ResizeObserver(function () { self.resize(); });
    this.ro.observe(this.root);
    new IntersectionObserver(function (e) { self.onscreen = e[0].isIntersecting; self.onscreen ? self.start() : self.stop(); }, { threshold: .05 }).observe(this.root);
    document.addEventListener('visibilitychange', function () { document.hidden ? self.stop() : (self.onscreen && self.start()); });
    if (!window.matchMedia('(pointer: fine)').matches) return;
    cv.addEventListener('pointermove', function (e) {
      var c = self.pick(e.clientX, e.clientY);
      self.hover = c; self.hovering = c >= 0;
      cv.style.cursor = c >= 0 && MARKETS.some(function (m) { return self.idx[m.code] === c; }) ? 'pointer' : '';
      if (!self.tip) return;
      if (c < 0) { self.tip.style.opacity = 0; return; }
      var code = self.countries[c].code, rr = self.root.getBoundingClientRect();
      self.tip.innerHTML = self.countries[c].name + '<b>€' + PRICES[code].toFixed(2) + '</b>';
      self.tip.style.left = (e.clientX - rr.left) + 'px'; self.tip.style.top = (e.clientY - rr.top) + 'px';
      self.tip.style.opacity = 1;
    });
    cv.addEventListener('pointerleave', function () { self.hover = -1; self.hovering = false; if (self.tip) self.tip.style.opacity = 0; cv.style.cursor = ''; });
    cv.addEventListener('click', function (e) {
      var c = self.pick(e.clientX, e.clientY);
      MARKETS.forEach(function (m, i) { if (self.idx[m.code] === c) self.go(i, true); });
    });
  };

  /* ---------------- render loop ---------------- */
  MapHero.prototype.start = function () {
    if (this.running) return;
    this.running = true; this.last = performance.now();
    var self = this;
    var loop = function (now) {
      if (!self.running) return;
      var dt = Math.min(.05, (now - self.last) / 1000); self.last = now;
      self.step(dt); self.draw();
      self.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  };
  MapHero.prototype.stop = function () { this.running = false; cancelAnimationFrame(this.raf); };

  MapHero.prototype.draw = function () {
    var ctx = this.ctx, dpr = this.dpr, k = this.k, i;
    if (!this.W) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    var bx = this.ox - this.cam.x * k, by = this.oy - this.cam.y * k;
    var de = this.idx.DE, rx = this.cx[de], ry = this.cy[de], reveal = this.view.reveal, heat = this.view.heat;
    var focus = this.focus = this.focus.filter(function (f) { return !f.dead; });
    var rip = this.ripples = this.ripples.filter(function (r) { return !r.dead; });
    var sparks = this.sparks = this.sparks.filter(function (s) { return !s.dead; });
    var sparkA = new Map(); sparks.forEach(function (s) { sparkA.set(s.i, Math.sin(Math.PI * s.t)); });
    var sp = this.sp, S2 = this.spS, R = this.spR, hov = this.hover;
    var base = .14 + .17 * heat;

    for (i = 0; i < this.n; i++) {
      var x = this.mx[i], y = this.my[i], c = this.mc[i], w = this.mw[i];
      var a = w * base, sprite = sp.neutral, scale = 1;
      var hb = this.heat[c];
      if (hb >= 0) { sprite = sp.heat[hb]; a = base * (.75 + .25 * heat); }
      else a = w * .13;
      if (reveal < 1300) { var dr = Math.sqrt((x - rx) * (x - rx) + (y - ry) * (y - ry)); a *= Math.max(0, Math.min(1, (reveal - dr) / 90)); }
      if (c === hov) a += .2;
      for (var r = 0; r < rip.length; r++) {
        var q = rip[r], d = Math.sqrt((x - q.x) * (x - q.x) + (y - q.y) * (y - q.y)), R2 = q.t * 700;
        var b = Math.exp(-Math.pow((d - R2) / 26, 2)) * (1 - q.t);
        a += .32 * b; scale += .35 * b;
      }
      for (var f = 0; f < focus.length; f++) {
        var F = focus[f];
        if (F.ci !== c || !F.f) continue;
        var dd = Math.sqrt((x - F.x) * (x - F.x) + (y - F.y) * (y - F.y));
        var lit = Math.max(0, Math.min(1, (F.fill - dd) / 26)) * F.f;
        if (lit > 0) { a = a + (.95 - a) * lit; scale += .28 * lit; if (lit > .35) sprite = sp.focus; }
      }
      var s = sparkA.get(i); if (s) { a += .4 * s; scale += .3 * s; }
      if (a <= .01) continue;
      var size = S2 * scale / (1.35), half = size / 2;
      ctx.globalAlpha = Math.min(1, a);
      ctx.drawImage(sprite, (bx + x * k) * dpr - half, (by + y * k) * dpr - half, size, size);
    }
    ctx.globalAlpha = 1;
    void R;

    /* arcs + flowing particles */
    var self = this, arcs = this.arcs = this.arcs.filter(function (a) { return !a.dead; });
    ctx.lineCap = 'round';
    arcs.forEach(function (A) {
      if (A.p <= 0 || A.a <= 0) return;
      var p0 = self.toScreen(A.x0, A.y0), p1 = self.toScreen(A.x1, A.y1);
      var mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2, dx = p1[0] - p0[0], dy = p1[1] - p0[1];
      var cxp = mx - dy * .28, cyp = my + dx * .28;
      var qb = function (t) { var u = 1 - t; return [u * u * p0[0] + 2 * u * t * cxp + t * t * p1[0], u * u * p0[1] + 2 * u * t * cyp + t * t * p1[1]]; };
      ctx.beginPath();
      for (var s2 = 0; s2 <= 28; s2++) { var t = A.p * s2 / 28, pt = qb(t); s2 ? ctx.lineTo(pt[0] * dpr, pt[1] * dpr) : ctx.moveTo(pt[0] * dpr, pt[1] * dpr); }
      ctx.strokeStyle = 'rgba(13,109,92,' + (.55 * A.a) + ')'; ctx.lineWidth = 1.6 * dpr; ctx.stroke();
      if (A.p >= 1) {
        var e = qb(1);
        ctx.fillStyle = 'rgba(13,109,92,' + (.85 * A.a) + ')';
        ctx.beginPath(); ctx.arc(e[0] * dpr, e[1] * dpr, 3 * dpr, 0, 7); ctx.fill();
        if (!reduce) for (var j = 0; j < 3; j++) {
          var tt = ((self.clock * .42 + A.ph + j / 3) % 1), pp = qb(tt), fade = Math.sin(Math.PI * tt) * A.a;
          ctx.fillStyle = 'rgba(26,159,130,' + (.22 * fade) + ')';
          ctx.beginPath(); ctx.arc(pp[0] * dpr, pp[1] * dpr, 6.5 * dpr, 0, 7); ctx.fill();
          ctx.fillStyle = 'rgba(13,109,92,' + (.95 * fade) + ')';
          ctx.beginPath(); ctx.arc(pp[0] * dpr, pp[1] * dpr, 2.6 * dpr, 0, 7); ctx.fill();
        }
      }
    });

    /* leader line from the market to the card + anchor marker */
    if (this.leader.a > 0 && this.market >= 0) {
      var L = this.toScreen(this.leader.x, this.leader.y);
      if (this.cardPt) {
        var E = this.cardPt, mid = (L[0] + E.x) / 2;
        ctx.beginPath(); ctx.moveTo(L[0] * dpr, L[1] * dpr);
        ctx.bezierCurveTo(mid * dpr, L[1] * dpr, mid * dpr, E.y * dpr, E.x * dpr, E.y * dpr);
        ctx.strokeStyle = 'rgba(12,42,43,' + (.38 * this.leader.a) + ')'; ctx.lineWidth = 1.3 * dpr;
        ctx.setLineDash([3 * dpr, 4 * dpr]); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(12,42,43,.5)'; ctx.beginPath(); ctx.arc(E.x * dpr, E.y * dpr, 2.6 * dpr, 0, 7); ctx.fill();
      }
      var pulse = reduce ? 0 : (this.clock % 2) / 2;
      ctx.strokeStyle = 'rgba(13,109,92,' + (.5 * (1 - pulse)) + ')'; ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath(); ctx.arc(L[0] * dpr, L[1] * dpr, (8 + 18 * pulse) * dpr, 0, 7); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(L[0] * dpr, L[1] * dpr, 7 * dpr, 0, 7); ctx.fill();
      ctx.fillStyle = '#0d6d5c'; ctx.beginPath(); ctx.arc(L[0] * dpr, L[1] * dpr, 4.2 * dpr, 0, 7); ctx.fill();
    }
  };

  /* ---------------- boot ---------------- */
  function init(scope) {
    [].slice.call((scope || document).querySelectorAll('[data-mtl-map]')).forEach(function (el) {
      if (!el._mtlMap) el._mtlMap = new MapHero(el);
    });
  }
  window.MontelMap = { init: init, markets: MARKETS, prices: PRICES };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); });
  else init();
})();
