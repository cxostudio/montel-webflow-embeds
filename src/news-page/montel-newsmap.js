/* =========================================================
   Montel · Live newsroom map  (v2.0)
   News page, dark "Reporters map" component. Replaces the static map
   image on this page only. Needs montel-map-data.js (Europe dot grid).

   No frame: the dot map sits straight on the section gradient and
   fades out at its edges. Each region of dots is tinted by the
   language edition whose desk covers it (8 editions). Every few
   seconds a story breaks at a desk in its own language: the pin
   ripples, a headline card rises, the story lands in the live wire.
   Every third story is picked up by other editions (arcs to their
   desks). Edition chips filter the wire and dim the other regions.
   Headlines: real Montel News headlines from each edition
   (montelnews.com, Nov 2026); times are illustrative.
   ========================================================= */
(function () {
  'use strict';
  if (window.MontelNewsMap) return;
  var D = window.MontelMapData;
  var box = document.querySelector('.curated__datasheet.is-dark-map .curated__datasheet__media');
  if (!D || !box || box.querySelector('[data-mtl-nm]')) return;
  document.documentElement.classList.add('mtl-js');

  /* ---------- content ---------- */
  var ED = {
    EN: { name: 'English', col: '#e8fff7' },
    NORD: { name: 'Nordisk', col: '#7fd3ff' },
    DE: { name: 'Deutsch', col: '#f6c46f' },
    FR: { name: 'Français', col: '#b9a7ff' },
    ES: { name: 'Español', col: '#ff9a7a' },
    IT: { name: 'Italiano', col: '#8ff09f' },
    TR: { name: 'Türkçe', col: '#ff8fc0' },
    SEE: { name: 'SE Europe', col: '#5fe3d2' }
  };
  var ORDER = ['EN', 'NORD', 'DE', 'FR', 'ES', 'IT', 'TR', 'SEE'];
  /* desks (Montel offices) and covered markets, in dot-grid space (1000 x 900) */
  var OFFICES = { Oslo: [520, 294, 'NORD'], Trondheim: [517, 211, 'NORD'], Stockholm: [608, 303, 'NORD'], Gothenburg: [535, 346, 'NORD'], Helsinki: [686, 272, 'NORD'], London: [360, 479, 'EN'], Stockton: [355, 405, 'EN'], Terneuzen: [418, 491, 'EN'], Paris: [389, 547, 'FR'], Madrid: [260, 727, 'ES'], Berlin: [558, 467, 'DE'], Halle: [537, 493, 'DE'], Frankfurt: [488, 524, 'DE'], Stuttgart: [495, 556, 'DE'], Munich: [532, 571, 'DE'], Istanbul: [841, 701, 'TR'] };
  var COVER = { Brussels: [424, 503, 'EN'], Amsterdam: [435, 468, 'EN'], Edinburgh: [337, 369, 'EN'], Kyiv: [813, 478, 'EN'], Warsaw: [667, 465, 'EN'], Copenhagen: [544, 393, 'NORD'], Vienna: [608, 567, 'DE'], Zurich: [484, 589, 'DE'], Prague: [575, 524, 'DE'], Lisbon: [155, 744, 'ES'], Rome: [550, 718, 'IT'], Milan: [493, 634, 'IT'], Budapest: [651, 580, 'SEE'], Bucharest: [776, 633, 'SEE'], Athens: [761, 791, 'SEE'] };
  var STORIES = [
    ['Oslo', 'NORD', 'Bratt prisoppgang til nye rekordnivåer'],
    ['Frankfurt', 'DE', 'Microsoft-Störung bremst Abläufe im Energiehandel'],
    ['Paris', 'FR', 'France : le déficit hydrologique expose les prix au gaz'],
    ['London', 'EN', 'EU Russian LNG ban risks exacerbating already soaring UK prices'],
    ['Rome', 'IT', 'Enel: il price cap vincolerà elettricità verso i EUR 140-160/MWh'],
    ['Istanbul', 'TR', 'Türkiye’nin 2040 Enerji Hedefleri açıklandı'],
    ['Madrid', 'ES', 'España planea atraer 47,4 GW de nueva demanda para 2030'],
    ['Bucharest', 'SEE', 'Romanian 675 MW reactor restart gets delayed by 1 day'],
    ['Stockholm', 'NORD', 'Ellevio riktar kritik mot elmarknadshubb'],
    ['Berlin', 'DE', 'Kabinett beschließt Entwurf für 24-TWh-Gasreserve'],
    ['Brussels', 'EN', 'EU backs 121m extra free ETS permits for industry'],
    ['Milan', 'IT', 'Pun, supera i EUR 300/MWh per la prima volta da quasi 4 anni'],
    ['Paris', 'FR', 'Le retour du vent devrait détendre le marché spot d’ici vendredi'],
    ['Trondheim', 'NORD', 'Frykter RME-krav vil ta livet av ny produksjon i NO4'],
    ['Budapest', 'SEE', 'CSEE nuclear aims seen at risk from climate threats'],
    ['Munich', 'DE', 'Analysten befürchten zu wenig Kraftwerksleistung im Süden'],
    ['Istanbul', 'TR', 'Elektrik tüketimi 1-10 Kasım döneminde yıllık %8,04 arttı'],
    ['Edinburgh', 'EN', 'Afry: Scottish green power constrained half the time this year'],
    ['Madrid', 'ES', 'El gas bajaría a EUR 80/MWh en el primer trimestre – banco'],
    ['Copenhagen', 'NORD', 'Branchen efter genåbning: Vi er ikke i mål'],
    ['Halle', 'DE', 'Deutschland drohen Gaslücken bei extremer Winterkälte'],
    ['Athens', 'SEE', 'SE Europe 2026 nuclear losses near previous 5-year total'],
    ['Rome', 'IT', 'L’Italia approva misure per tagliare i prezzi elettrici di EUR 15/MWh'],
    ['Kyiv', 'EN', 'Ukraine faces “worsening winter energy threat”'],
    ['Paris', 'FR', 'Électricité française : risques haussiers pour l’été 2027'],
    ['Oslo', 'NORD', '– Statnetts datasenterstans er veldig dramatisk']
  ];
  var CROP = { x: 110, y: 160, w: 790, h: 660 };

  var chips = '<button type="button" class="mtl-nm__chip is-on" data-ed="ALL">All editions</button>' +
    ORDER.map(function (k) { return '<button type="button" class="mtl-nm__chip" data-ed="' + k + '"><i style="background:' + ED[k].col + '"></i>' + ED[k].name + '</button>'; }).join('');
  var html = '<div class="mtl-nm" data-mtl-nm><div class="mtl-nm__stage"><canvas class="mtl-nm__canvas" aria-hidden="true"></canvas>' +
    '<div class="mtl-nm__card" aria-hidden="true"><p class="mtl-nm__card-top"><span class="mtl-nm__ed"></span><span class="mtl-nm__time"></span></p><p class="mtl-nm__card-h"></p><p class="mtl-nm__card-city"></p></div>' +
    '<div class="mtl-nm__tip" aria-hidden="true"></div></div>' +
    '<aside class="mtl-nm__wire" aria-label="Live wire"><div class="mtl-nm__wire-head"><p class="mtl-nm__live"><i></i>Live wire</p><p class="mtl-nm__count"><b>186</b> stories today · 8 editions</p></div>' +
    '<div class="mtl-nm__chips">' + chips + '</div><ol class="mtl-nm__list"></ol></aside></div>';
  var wrap = document.createElement('div');
  wrap.className = 'mtl-nm-mount';
  wrap.innerHTML = html;
  box.classList.add('has-mtl-nm');
  box.appendChild(wrap);

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function place(n) { return OFFICES[n] || COVER[n]; }
  function rgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; }
  function rgba(h, a) { var c = rgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')'; }
  function fmt(c) { var h = Math.floor(c / 60) % 24, m = c % 60; return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  var DESKS = Object.keys(OFFICES).concat(Object.keys(COVER));

  function NM(root) {
    var self = this, q = function (s) { return root.querySelector(s); };
    this.root = root; this.stage = q('.mtl-nm__stage'); this.cv = q('.mtl-nm__canvas'); this.ctx = this.cv.getContext('2d');
    this.card = q('.mtl-nm__card'); this.tip = q('.mtl-nm__tip'); this.list = q('.mtl-nm__list'); this.countEl = q('.mtl-nm__count b');
    this.chips = [].slice.call(root.querySelectorAll('.mtl-nm__chip'));
    this.filter = 'ALL'; this.i = -1; this.count = 186; this.clock = 7 * 60 + 41; this.fx = []; this.hover = null;
    this.decode();
    this.fit();
    new ResizeObserver(function () { self.fit(); self.draw(performance.now()); }).observe(this.stage);
    new IntersectionObserver(function (e) {
      self.onscreen = e[0].isIntersecting;
      if (self.onscreen) { self.start(); root.classList.add('is-in'); } else self.stop();
    }, { threshold: .2 }).observe(root);
    document.addEventListener('visibilitychange', function () { document.hidden ? self.stop() : (self.onscreen && self.start()); });
    this.bind();
    var seedT = [7 * 60 + 18, 7 * 60 + 26, 7 * 60 + 33, 7 * 60 + 39], n = STORIES.length;
    for (var k = 0; k < 4; k++) this.push(STORIES[n - 4 + k].concat(fmt(seedT[k])), true);
    this.draw(performance.now());
  }

  /* dots + which edition's desk covers each one (nearest desk, with falloff) */
  NM.prototype.decode = function () {
    var S = D.s, rows = D.rows.split('|'), pts = [];
    for (var r = 0; r < rows.length; r++) {
      if (!rows[r]) continue;
      var runs = rows[r].split(';');
      for (var j = 0; j < runs.length; j++) {
        var q = runs[j].split(','), c0 = +q[0], len = +q[1], w = +q[3] / 9;
        for (var k = 0; k < len; k++) {
          var x = (c0 + k) * S + (r % 2 ? S / 2 : 0), y = r * S * .866;
          if (x < CROP.x - 40 || x > CROP.x + CROP.w + 40 || y < CROP.y - 40 || y > CROP.y + CROP.h + 40) continue;
          var best = null, bd = 1e9;
          for (var d = 0; d < DESKS.length; d++) { var p = place(DESKS[d]), dd = (p[0] - x) * (p[0] - x) + (p[1] - y) * (p[1] - y); if (dd < bd) { bd = dd; best = p[2]; } }
          pts.push({ x: x, y: y, w: w, ed: best, near: Math.max(0, 1 - Math.sqrt(bd) / 150) });
        }
      }
    }
    this.pts = pts;
  };
  NM.prototype.fit = function () {
    var r = this.stage.getBoundingClientRect(), W = r.width, H = r.height;
    if (!W || !H) return;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cv.width = Math.round(W * this.dpr); this.cv.height = Math.round(H * this.dpr);
    this.cv.style.width = W + 'px'; this.cv.style.height = H + 'px';
    var s = Math.min(W / CROP.w, H / CROP.h);
    this.s = s; this.ox = (W - CROP.w * s) / 2 - CROP.x * s; this.oy = (H - CROP.h * s) / 2 - CROP.y * s;
    this.W = W; this.H = H;
    this.paintBase();
  };
  NM.prototype.paintBase = function () {
    if (!this.W) return;
    var off = this.base || (this.base = document.createElement('canvas'));
    off.width = this.cv.width; off.height = this.cv.height;
    var c = off.getContext('2d'), d = this.dpr, s = this.s, rr = Math.max(1, 1.85 * s), f = this.filter, self = this;
    c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, this.W, this.H);
    this.pts.forEach(function (p) {
      var on = f === 'ALL' || p.ed === f, tint = on ? p.near : 0;
      var a = (.08 + .14 * p.w) * (on ? 1 : .55) + .42 * tint * tint;
      c.fillStyle = tint > .05 ? rgba(ED[p.ed].col, a) : 'rgba(170, 230, 218,' + a.toFixed(3) + ')';
      c.beginPath(); c.arc(self.ox + p.x * s, self.oy + p.y * s, rr, 0, 6.283); c.fill();
    });
  };
  NM.prototype.xy = function (n) { var p = place(n); return [this.ox + p[0] * this.s, this.oy + p[1] * this.s]; };

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
    var c = this.ctx, d = this.dpr, W = this.W, self = this, f = this.filter;
    if (!W) return;
    c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, W, this.H);
    c.drawImage(this.base, 0, 0, W, this.H);
    /* pick-up arcs, coloured by the receiving edition */
    this.fx.forEach(function (fx) {
      if (fx.type !== 'arc' || t < fx.t0) return;
      var k = Math.min(1, (t - fx.t0) / 1300), a = self.xy(fx.from), b = self.xy(fx.to), col = ED[place(fx.to)[2]].col;
      var mx = (a[0] + b[0]) / 2, my = Math.min(a[1], b[1]) - Math.hypot(b[0] - a[0], b[1] - a[1]) * .3;
      var fade = 1 - Math.max(0, (t - fx.t0 - 1300) / (fx.dur - 1300)), e = easeOut(k);
      c.strokeStyle = rgba(col, .45 * fade); c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(a[0], a[1]);
      for (var i = 1; i <= 28; i++) { var u = i / 28 * e, v = 1 - u; c.lineTo(v * v * a[0] + 2 * v * u * mx + u * u * b[0], v * v * a[1] + 2 * v * u * my + u * u * b[1]); }
      c.stroke();
      if (k < 1) { var v2 = 1 - e; c.fillStyle = col; c.beginPath(); c.arc(v2 * v2 * a[0] + 2 * v2 * e * mx + e * e * b[0], v2 * v2 * a[1] + 2 * v2 * e * my + e * e * b[1], 2.6, 0, 6.283); c.fill(); }
    });
    /* covered markets */
    Object.keys(COVER).forEach(function (n) {
      var p = self.xy(n), on = f === 'ALL' || COVER[n][2] === f;
      c.fillStyle = rgba(ED[COVER[n][2]].col, on ? .7 : .2); c.beginPath(); c.arc(p[0], p[1], 2.3, 0, 6.283); c.fill();
    });
    /* desks: breathing glow in the edition colour */
    Object.keys(OFFICES).forEach(function (n, i) {
      var p = self.xy(n), col = ED[OFFICES[n][2]].col, on = f === 'ALL' || OFFICES[n][2] === f;
      var b = .5 + .5 * Math.sin(t / 900 + i * 1.7), r = 15 + 5 * b;
      var g = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], r);
      g.addColorStop(0, rgba(col, on ? .34 : .08)); g.addColorStop(1, rgba(col, 0));
      c.fillStyle = g; c.beginPath(); c.arc(p[0], p[1], r, 0, 6.283); c.fill();
      c.fillStyle = on ? col : rgba(col, .35); c.beginPath(); c.arc(p[0], p[1], 3.4, 0, 6.283); c.fill();
    });
    /* breaking story */
    this.fx.forEach(function (fx) {
      if (fx.type !== 'ripple') return;
      var p = self.xy(fx.city), col = ED[fx.ed].col;
      for (var j = 0; j < 2; j++) {
        var k = (t - fx.t0 - j * 450) / 1500; if (k < 0 || k > 1) continue;
        c.strokeStyle = rgba(col, 1 - k); c.lineWidth = 2;
        c.beginPath(); c.arc(p[0], p[1], 6 + 36 * easeOut(k), 0, 6.283); c.stroke();
      }
      c.fillStyle = col; c.beginPath(); c.arc(p[0], p[1], 5, 0, 6.283); c.fill();
    });
    if (this.hover) { var hp = this.xy(this.hover); c.strokeStyle = 'rgba(230, 255, 246, .9)'; c.lineWidth = 1.5; c.beginPath(); c.arc(hp[0], hp[1], 8, 0, 6.283); c.stroke(); }
  };

  /* ---------- stories ---------- */
  NM.prototype.nextStory = function () {
    for (var k = 0; k < STORIES.length; k++) {
      this.i = (this.i + 1) % STORIES.length;
      if (this.filter === 'ALL' || STORIES[this.i][1] === this.filter) return STORIES[this.i];
    }
    return STORIES[0];
  };
  NM.prototype.breakStory = function (t) {
    var self = this, s = this.nextStory(), tm = fmt(this.clock += 2 + Math.floor(Math.random() * 5)), picked = [];
    this.fx.push({ type: 'ripple', city: s[0], ed: s[1], t0: t, dur: 2600 });
    this.n = (this.n || 0) + 1;
    if (this.n % 3 === 0 && this.filter === 'ALL') {
      /* picked up by other editions: one desk of each, nearest first */
      var a = place(s[0]), byEd = {};
      Object.keys(OFFICES).forEach(function (o) {
        var e = OFFICES[o][2]; if (e === s[1]) return;
        var dd = Math.hypot(OFFICES[o][0] - a[0], OFFICES[o][1] - a[1]);
        if (!byEd[e] || dd < byEd[e].d) byEd[e] = { o: o, d: dd };
      });
      picked = Object.keys(byEd).sort(function (x, y) { return byEd[x].d - byEd[y].d; }).slice(0, 3);
      picked.forEach(function (e, j) { self.fx.push({ type: 'arc', from: s[0], to: byEd[e].o, t0: t + 300 + j * 140, dur: 2700 }); });
    }
    var compact = this.W < 520;
    if (!compact) this.showCard(s, tm, picked);
    clearTimeout(this.pushT);
    this.pushT = setTimeout(function () { self.hideCard(); self.push([s[0], s[1], s[2], tm]); self.count++; self.countEl.textContent = self.count; }, compact ? 700 : 2400);
  };
  NM.prototype.showCard = function (s, tm, picked) {
    var p = this.xy(s[0]), card = this.card, right = p[0] > this.W * .55, ed = ED[s[1]];
    var e = card.querySelector('.mtl-nm__ed'); e.textContent = ed.name; e.style.color = ed.col;
    card.querySelector('.mtl-nm__time').textContent = tm;
    card.querySelector('.mtl-nm__card-h').textContent = s[2];
    card.querySelector('.mtl-nm__card-city').textContent = s[0] + (OFFICES[s[0]] ? ' desk' : '') +
      (picked.length ? ' · picked up in ' + picked.map(function (k) { return ED[k].name; }).join(', ') : '');
    var w = Math.min(310, this.W * .44), x = right ? p[0] - w - 20 : p[0] + 20, y = Math.max(8, Math.min(this.H - 150, p[1] - 64));
    card.style.width = w + 'px';
    card.style.transform = 'translate(' + Math.max(6, x) + 'px,' + y + 'px)';
    card.style.setProperty('--ed', ed.col);
    card.classList.remove('is-on'); void card.offsetWidth; card.classList.add('is-on');
  };
  NM.prototype.hideCard = function () { this.card.classList.remove('is-on'); };
  NM.prototype.push = function (s, quiet) {
    var li = document.createElement('li'), ed = ED[s[1]];
    li.className = 'mtl-nm__item' + (quiet ? '' : ' is-new');
    li.setAttribute('data-ed', s[1]);
    li.innerHTML = '<p class="mtl-nm__item-top"><span style="color:' + ed.col + '">' + ed.name + '</span><span>' + s[0] + '</span><span>' + s[3] + '</span></p><p class="mtl-nm__item-h"></p>';
    li.querySelector('.mtl-nm__item-h').textContent = s[2];
    this.list.insertBefore(li, this.list.firstChild);
    while (this.list.children.length > 6) this.list.removeChild(this.list.lastChild);
    this.applyFilter();
  };
  NM.prototype.applyFilter = function () {
    var f = this.filter;
    [].forEach.call(this.list.children, function (li) { li.classList.toggle('is-dim', f !== 'ALL' && li.getAttribute('data-ed') !== f); });
  };

  NM.prototype.bind = function () {
    var self = this;
    this.chips.forEach(function (ch) {
      ch.addEventListener('click', function () {
        self.chips.forEach(function (x) { x.classList.toggle('is-on', x === ch); });
        self.filter = ch.getAttribute('data-ed'); self.applyFilter(); self.paintBase();
        self.nextAt = performance.now() + 250;
        if (!self.running) self.draw(performance.now());
      });
    });
    this.stage.addEventListener('pointermove', function (e) {
      var r = self.stage.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, best = null, bd = 16;
      DESKS.forEach(function (n) { var p = self.xy(n), dd = Math.hypot(p[0] - x, p[1] - y); if (dd < bd) { bd = dd; best = n; } });
      self.hover = best; self.paused = !!best;
      if (best) {
        var p = self.xy(best), ed = ED[place(best)[2]];
        self.tip.innerHTML = '<b></b><span></span>';
        self.tip.firstChild.textContent = best + (OFFICES[best] ? ' · Montel desk' : ' · market we cover');
        self.tip.lastChild.textContent = 'Montel News ' + ed.name; self.tip.lastChild.style.color = ed.col;
        self.tip.style.transform = 'translate(' + (p[0] + 12) + 'px,' + (p[1] - 46) + 'px)';
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
