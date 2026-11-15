/* =========================================================
   Montel · Live newsroom map  (v1.0)
   News page, "Real-time energy news from reporters across Europe"
   (component "Reporters map · dark"). Replaces the static map image
   on this page only. Needs montel-map-data.js (the Europe dot grid).

   Story: a dot map of Europe with Montel's offices lit. Every few
   seconds a story breaks in a city: the pin ripples, a headline card
   rises from it, then the story drops into the live wire beside the
   map and the "stories today" counter ticks. Every third story sends
   arcs out to other offices (one newsroom, one wire). Commodity chips
   filter the wire; hover a pin for the city.
   Headlines: real Montel News headlines (montelnews.com, Nov 2026);
   times are illustrative.
   ========================================================= */
(function () {
  'use strict';
  if (window.MontelNewsMap) return;
  var D = window.MontelMapData;
  var box = document.querySelector('.curated__datasheet.is-dark-map .curated__datasheet__media');
  if (!D || !box || box.querySelector('[data-mtl-nm]')) return;
  document.documentElement.classList.add('mtl-js');

  /* ---------- content ---------- */
  /* positions in the dot-grid space (1000 x 900), projected from lon/lat with the grid's own projection */
  var OFFICES = { Oslo: [520, 294], Trondheim: [517, 211], Stockholm: [608, 303], Gothenburg: [535, 346], Helsinki: [686, 272], London: [360, 479], Stockton: [355, 405], Terneuzen: [418, 491], Paris: [389, 547], Madrid: [260, 727], Berlin: [558, 467], Halle: [537, 493], Frankfurt: [488, 524], Stuttgart: [495, 556], Munich: [532, 571], Istanbul: [841, 701] };
  var COVER = { Brussels: [424, 503], Rome: [550, 718], Vienna: [608, 567], Warsaw: [667, 465], Budapest: [651, 580], Bucharest: [776, 633], Athens: [761, 791], Kyiv: [813, 478], Copenhagen: [544, 393], Lisbon: [155, 744], Prague: [575, 524], Edinburgh: [337, 369] };
  var STORIES = [
    ['Oslo', 'POWER', 'Nordic negative price hours to drop a third this year, trader says'],
    ['Paris', 'POWER', 'French hydro deficit may drive power price volatility in 2027'],
    ['Brussels', 'CARBON', 'EU backs 121m extra free ETS permits for industry'],
    ['London', 'GAS', 'EU Russian LNG ban risks exacerbating already soaring UK prices'],
    ['Rome', 'POWER', 'Enel: Italy gas price cap to limit power to EUR 140-160/MWh'],
    ['Istanbul', 'OIL', 'Hormuz shipping risks set to outlast US-Iran conflict'],
    ['Trondheim', 'POWER', 'Norway’s century-old hydropower braces for new climate risks'],
    ['Berlin', 'CARBON', 'EU carbon market “tighter than most people think”'],
    ['Edinburgh', 'POWER', 'Afry: Scottish green power constrained half the time this year'],
    ['Helsinki', 'GAS', 'Russian gas exports to EU rise 4% in January-October'],
    ['Madrid', 'POWER', 'Spanish data centres face a green dilemma'],
    ['Terneuzen', 'GAS', '“Last-minute rush” of Russia LNG imports before ban unlikely'],
    ['Kyiv', 'POWER', 'Ukraine faces “worsening winter energy threat”'],
    ['Brussels', 'CARBON', 'Study: EU carbon emissions set to fall 1.5% in 2026'],
    ['Stockholm', 'POWER', 'Investors need clarity on battery availability'],
    ['Gothenburg', 'GAS', 'EU to receive first Qatari LNG vessel since April on Saturday'],
    ['Budapest', 'POWER', 'CSEE nuclear aims seen at risk from climate threats'],
    ['Munich', 'GAS', 'Cost of Russian LNG to EU “balloons” 21% ahead of ban'],
    ['Brussels', 'POWER', 'Europe faces some winter supply risk despite renewables, TSOs warn'],
    ['Frankfurt', 'POWER', 'Microsoft outage hits energy traders’ tools, not core trading']
  ];
  var TAGS = ['All', 'Power', 'Gas', 'Carbon', 'Oil'];
  var CROP = { x: 110, y: 160, w: 790, h: 660 };

  var html = '<div class="mtl-nm" data-mtl-nm><div class="mtl-nm__stage"><canvas class="mtl-nm__canvas" aria-hidden="true"></canvas>' +
    '<div class="mtl-nm__card" aria-hidden="true"><p class="mtl-nm__card-top"><span class="mtl-nm__tag"></span><span class="mtl-nm__time"></span></p><p class="mtl-nm__card-h"></p><p class="mtl-nm__card-city"></p></div>' +
    '<div class="mtl-nm__tip" aria-hidden="true"></div>' +
    '<div class="mtl-nm__legend"><span><i class="is-office"></i>Montel offices</span><span><i></i>Markets we cover</span></div></div>' +
    '<aside class="mtl-nm__wire" aria-label="Live wire"><div class="mtl-nm__wire-head"><p class="mtl-nm__live"><i></i>Live wire</p><p class="mtl-nm__count"><b>186</b> stories today</p></div>' +
    '<div class="mtl-nm__chips" role="tablist">' + TAGS.map(function (t, i) { return '<button type="button" class="mtl-nm__chip' + (i ? '' : ' is-on') + '" data-tag="' + t.toUpperCase() + '">' + t + '</button>'; }).join('') + '</div>' +
    '<ol class="mtl-nm__list"></ol></aside></div>';
  var wrap = document.createElement('div');
  wrap.className = 'mtl-nm-mount';
  wrap.innerHTML = html;
  box.classList.add('has-mtl-nm');
  box.appendChild(wrap);

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COL = { POWER: '#8ff0c9', GAS: '#f3c37a', CARBON: '#b9a7ff', OIL: '#ff9e80' };
  function city(n) { return OFFICES[n] || COVER[n]; }
  function fmt(c) { var h = Math.floor(c / 60) % 24, m = c % 60; return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function NM(root) {
    var self = this, q = function (s) { return root.querySelector(s); };
    this.root = root; this.stage = q('.mtl-nm__stage'); this.cv = q('.mtl-nm__canvas'); this.ctx = this.cv.getContext('2d');
    this.card = q('.mtl-nm__card'); this.tip = q('.mtl-nm__tip'); this.list = q('.mtl-nm__list'); this.countEl = q('.mtl-nm__count b');
    this.chips = [].slice.call(root.querySelectorAll('.mtl-nm__chip'));
    this.filter = 'ALL'; this.i = -1; this.count = 186; this.clock = 7 * 60 + 41; this.fx = []; this.active = null; this.hover = null;
    this.decode();
    this.fit();
    new ResizeObserver(function () { self.fit(); self.draw(performance.now()); }).observe(this.stage);
    new IntersectionObserver(function (e) {
      self.onscreen = e[0].isIntersecting;
      if (self.onscreen) { self.start(); if (!self.played) self.play(); } else self.stop();
    }, { threshold: .2 }).observe(root);
    document.addEventListener('visibilitychange', function () { document.hidden ? self.stop() : (self.onscreen && self.start()); });
    this.bind();
    /* the wire starts with a few earlier stories */
    var seedT = [7 * 60 + 18, 7 * 60 + 26, 7 * 60 + 33, 7 * 60 + 39];
    for (var k = 0; k < 4; k++) this.push(STORIES[STORIES.length - 4 + k].concat(fmt(seedT[k])), true);
    this.draw(performance.now());
  }

  NM.prototype.decode = function () {
    var S = D.s, rows = D.rows.split('|'), pts = [];
    for (var r = 0; r < rows.length; r++) {
      if (!rows[r]) continue;
      var runs = rows[r].split(';');
      for (var j = 0; j < runs.length; j++) {
        var q = runs[j].split(','), c0 = +q[0], len = +q[1], ci = +q[2], w = +q[3] / 9;
        for (var k = 0; k < len; k++) {
          var x = (c0 + k) * S + (r % 2 ? S / 2 : 0), y = r * S * .866;
          if (x < CROP.x - 20 || x > CROP.x + CROP.w + 20 || y < CROP.y - 20 || y > CROP.y + CROP.h + 20) continue;
          pts.push(x, y, (D.countries[ci] && D.countries[ci].faded) ? .45 * w : w);
        }
      }
    }
    this.pts = pts;
  };
  NM.prototype.fit = function () {
    var r = this.stage.getBoundingClientRect(), W = r.width, H = r.height, lg = this.stage.querySelector('.mtl-nm__legend');
    if (lg && getComputedStyle(lg).position === 'static') H = Math.round(W * 620 / 790);
    if (!W || !H) return;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cv.width = Math.round(W * this.dpr); this.cv.height = Math.round(H * this.dpr);
    this.cv.style.width = W + 'px'; this.cv.style.height = H + 'px';
    var s = Math.min(W / CROP.w, H / CROP.h);
    this.s = s; this.ox = (W - CROP.w * s) / 2 - CROP.x * s; this.oy = (H - CROP.h * s) / 2 - CROP.y * s;
    this.W = W; this.H = H;
    /* static dot layer */
    var off = this.base || (this.base = document.createElement('canvas'));
    off.width = this.cv.width; off.height = this.cv.height;
    var c = off.getContext('2d'), d = this.dpr, p = this.pts, rr = Math.max(1, 1.5 * s * 1.25);
    c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, W, H);
    for (var i = 0; i < p.length; i += 3) {
      c.fillStyle = 'rgba(160, 232, 214,' + (.1 + .2 * p[i + 2]).toFixed(3) + ')';
      c.beginPath(); c.arc(this.ox + p[i] * s, this.oy + p[i + 1] * s, rr, 0, 6.283); c.fill();
    }
  };
  NM.prototype.xy = function (n) { var p = city(n); return [this.ox + p[0] * this.s, this.oy + p[1] * this.s]; };

  /* ---------- loop ---------- */
  NM.prototype.start = function () {
    if (this.running || reduce) return; this.running = true;
    var self = this, loop = function (t) { if (!self.running) return; self.tick(t); self.draw(t); self.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  };
  NM.prototype.stop = function () { this.running = false; cancelAnimationFrame(this.raf); };
  NM.prototype.tick = function (t) {
    if (!this.nextAt) this.nextAt = t + 900;
    if (t >= this.nextAt) { this.nextAt = t + 3200; if (!this.paused) this.breakStory(t); }
    this.fx = this.fx.filter(function (f) { return t - f.t0 < f.dur; });
  };
  NM.prototype.draw = function (t) {
    var c = this.ctx, d = this.dpr, W = this.W, H = this.H, self = this;
    if (!W) return;
    c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, W, H);
    c.drawImage(this.base, 0, 0, W, H);
    /* arcs: one story, the whole newsroom */
    this.fx.forEach(function (f) {
      if (f.type !== 'arc') return;
      var k = Math.min(1, (t - f.t0) / 1300), a = self.xy(f.from), b = self.xy(f.to);
      var mx = (a[0] + b[0]) / 2, my = Math.min(a[1], b[1]) - Math.hypot(b[0] - a[0], b[1] - a[1]) * .28;
      var fade = 1 - Math.max(0, (t - f.t0 - 1300) / (f.dur - 1300));
      c.strokeStyle = 'rgba(143, 240, 201,' + (.35 * fade).toFixed(3) + ')'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(a[0], a[1]);
      for (var i = 1; i <= 24; i++) { var u = i / 24 * easeOut(k), v = 1 - u; c.lineTo(v * v * a[0] + 2 * v * u * mx + u * u * b[0], v * v * a[1] + 2 * v * u * my + u * u * b[1]); }
      c.stroke();
      if (k < 1) { var u2 = easeOut(k), v2 = 1 - u2; c.fillStyle = '#d9fff1'; c.beginPath(); c.arc(v2 * v2 * a[0] + 2 * v2 * u2 * mx + u2 * u2 * b[0], v2 * v2 * a[1] + 2 * v2 * u2 * my + u2 * u2 * b[1], 2.4, 0, 6.283); c.fill(); }
    });
    /* coverage pins */
    Object.keys(COVER).forEach(function (n) { var p = self.xy(n); c.fillStyle = 'rgba(190, 240, 226, .55)'; c.beginPath(); c.arc(p[0], p[1], 2.2, 0, 6.283); c.fill(); });
    /* office pins, breathing glow */
    Object.keys(OFFICES).forEach(function (n, i) {
      var p = self.xy(n), b = .5 + .5 * Math.sin(t / 900 + i * 1.7), r = 14 + 4 * b;
      var g = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], r);
      g.addColorStop(0, 'rgba(143, 240, 201, .32)'); g.addColorStop(1, 'rgba(143, 240, 201, 0)');
      c.fillStyle = g; c.beginPath(); c.arc(p[0], p[1], r, 0, 6.283); c.fill();
      c.fillStyle = '#e6fff6'; c.beginPath(); c.arc(p[0], p[1], 3.4, 0, 6.283); c.fill();
    });
    /* breaking story: ripples on its city */
    this.fx.forEach(function (f) {
      if (f.type !== 'ripple') return;
      var p = self.xy(f.city);
      for (var j = 0; j < 2; j++) {
        var k = (t - f.t0 - j * 450) / 1500; if (k < 0 || k > 1) continue;
        c.strokeStyle = f.col.replace(')', ',' + (1 - k).toFixed(3) + ')').replace('rgb', 'rgba'); c.lineWidth = 2;
        c.beginPath(); c.arc(p[0], p[1], 6 + 34 * easeOut(k), 0, 6.283); c.stroke();
      }
      c.fillStyle = f.hex; c.beginPath(); c.arc(p[0], p[1], 5, 0, 6.283); c.fill();
    });
    if (this.hover) { var hp = this.xy(this.hover); c.strokeStyle = 'rgba(230, 255, 246, .9)'; c.lineWidth = 1.5; c.beginPath(); c.arc(hp[0], hp[1], 8, 0, 6.283); c.stroke(); }
  };

  /* ---------- stories ---------- */
  function hexToRgb(h) { var n = parseInt(h.slice(1), 16); return 'rgb(' + (n >> 16) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ')'; }
  NM.prototype.nextStory = function () {
    for (var k = 0; k < STORIES.length; k++) {
      this.i = (this.i + 1) % STORIES.length;
      var s = STORIES[this.i];
      if (this.filter === 'ALL' || s[1] === this.filter) return s;
    }
    return STORIES[0];
  };
  NM.prototype.time = function () { this.clock += 2 + Math.floor(Math.random() * 5); return fmt(this.clock); };
  NM.prototype.breakStory = function (t) {
    var self = this, s = this.nextStory(), hex = COL[s[1]] || '#8ff0c9', tm = this.time();
    this.fx.push({ type: 'ripple', city: s[0], t0: t, dur: 2600, col: hexToRgb(hex), hex: hex });
    this.n = (this.n || 0) + 1;
    if (this.n % 3 === 0) {
      var others = Object.keys(OFFICES).filter(function (n) { return n !== s[0]; }).sort(function () { return Math.random() - .5; }).slice(0, 3);
      others.forEach(function (o, j) { self.fx.push({ type: 'arc', from: s[0], to: o, t0: t + 250 + j * 120, dur: 2600 }); });
    }
    var compact = this.W < 520;
    if (!compact) this.showCard(s, tm, hex);
    clearTimeout(this.pushT);
    this.pushT = setTimeout(function () { self.hideCard(); self.push([s[0], s[1], s[2], tm]); self.count++; self.countEl.textContent = self.count; }, compact ? 700 : 2300);
  };
  NM.prototype.showCard = function (s, tm, hex) {
    var p = this.xy(s[0]), card = this.card, right = p[0] > this.W * .55;
    card.querySelector('.mtl-nm__tag').textContent = s[1]; card.querySelector('.mtl-nm__tag').style.color = hex;
    card.querySelector('.mtl-nm__time').textContent = tm;
    card.querySelector('.mtl-nm__card-h').textContent = s[2];
    card.querySelector('.mtl-nm__card-city').textContent = s[0] + (OFFICES[s[0]] ? ' · Montel office' : '');
    card.classList.toggle('is-left', right);
    var w = Math.min(300, this.W * .42), x = right ? p[0] - w - 18 : p[0] + 18, y = Math.max(10, Math.min(this.H - 140, p[1] - 60));
    card.style.width = w + 'px';
    card.style.transform = 'translate(' + Math.max(8, x) + 'px,' + y + 'px)';
    card.classList.remove('is-on'); void card.offsetWidth; card.classList.add('is-on');
  };
  NM.prototype.hideCard = function () { this.card.classList.remove('is-on'); };
  NM.prototype.push = function (s, quiet) {
    var li = document.createElement('li'), hex = COL[s[1]] || '#8ff0c9', tm = s[3];
    li.className = 'mtl-nm__item' + (quiet ? '' : ' is-new');
    li.setAttribute('data-tag', s[1]);
    li.innerHTML = '<p class="mtl-nm__item-top"><span style="color:' + hex + '">' + s[1] + '</span><span>' + s[0] + '</span><span>' + tm + '</span></p><p class="mtl-nm__item-h"></p>';
    li.querySelector('.mtl-nm__item-h').textContent = s[2];
    this.list.insertBefore(li, this.list.firstChild);
    var items = this.list.children; while (items.length > 6) this.list.removeChild(items[items.length - 1]);
    this.applyFilter();
  };
  NM.prototype.applyFilter = function () {
    var f = this.filter;
    [].forEach.call(this.list.children, function (li) { li.classList.toggle('is-dim', f !== 'ALL' && li.getAttribute('data-tag') !== f); });
  };

  NM.prototype.play = function () {
    this.played = true;
    this.root.classList.add('is-in');
    if (reduce) { this.draw(performance.now()); }
  };

  NM.prototype.bind = function () {
    var self = this;
    this.chips.forEach(function (ch) {
      ch.addEventListener('click', function () {
        self.chips.forEach(function (x) { x.classList.toggle('is-on', x === ch); });
        self.filter = ch.getAttribute('data-tag'); self.applyFilter();
        self.nextAt = performance.now() + 300;
      });
    });
    this.stage.addEventListener('pointermove', function (e) {
      var r = self.stage.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, best = null, bd = 16;
      Object.keys(OFFICES).concat(Object.keys(COVER)).forEach(function (n) { var p = self.xy(n), dd = Math.hypot(p[0] - x, p[1] - y); if (dd < bd) { bd = dd; best = n; } });
      self.hover = best; self.paused = !!best;
      if (best) {
        var p = self.xy(best);
        self.tip.textContent = best + (OFFICES[best] ? ' · Montel office' : ' · market we cover');
        self.tip.style.transform = 'translate(' + (p[0] + 12) + 'px,' + (p[1] - 34) + 'px)';
        self.tip.classList.add('is-on');
      } else self.tip.classList.remove('is-on');
      if (!self.running) self.draw(performance.now());
    });
    this.stage.addEventListener('pointerleave', function () { self.hover = null; self.paused = false; self.tip.classList.remove('is-on'); });
  };

  function init(scope) { [].slice.call((scope || document).querySelectorAll('[data-mtl-nm]')).forEach(function (r) { if (!r._mtlNm) r._mtlNm = new NM(r); }); }
  window.MontelNewsMap = { init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); }); else init();
})();
