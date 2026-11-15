/* =========================================================
   Montel · Live newsroom map  (v3.0)
   News page, dark "Reporters map" component. Replaces the static map
   image on this page only. Needs montel-map-data.js (Europe dot grid).

   Frameless dot map of Europe on the section gradient, one colour,
   country borders drawn by brightening the dots along each edge.
   Every few seconds a story breaks at a Montel desk, in the language
   it was published in: the pin ripples, a card in the same style as
   the hero's wire card rises (flag + city, serif headline), then the
   story lands in the live wire. Every third story is picked up by
   other desks (arcs). Flags stand in for language names.
   Headlines: real Montel News headlines from its editions
   (montelnews.com, Nov 2026); times are illustrative.
   ========================================================= */
(function () {
  'use strict';
  if (window.MontelNewsMap) return;
  var D = window.MontelMapData;
  var box = document.querySelector('.curated__datasheet.is-dark-map .curated__datasheet__media');
  if (!D || !box || box.querySelector('[data-mtl-nm]')) return;
  document.documentElement.classList.add('mtl-js');

  /* ---------- flags (simple SVG, render the same on every OS) ---------- */
  function hz(a, b, c) { return '<rect width="30" height="20" fill="' + b + '"/><rect width="30" height="6.67" fill="' + a + '"/><rect y="13.33" width="30" height="6.67" fill="' + c + '"/>'; }
  function vt(a, b, c) { return '<rect width="30" height="20" fill="' + b + '"/><rect width="10" height="20" fill="' + a + '"/><rect x="20" width="10" height="20" fill="' + c + '"/>'; }
  function nordic(bg, fg, inner) {
    var s = '<rect width="30" height="20" fill="' + bg + '"/><rect x="8" width="5" height="20" fill="' + fg + '"/><rect y="7.5" width="30" height="5" fill="' + fg + '"/>';
    return inner ? s + '<rect x="9.4" width="2.2" height="20" fill="' + inner + '"/><rect y="8.9" width="30" height="2.2" fill="' + inner + '"/>' : s;
  }
  var FLAG = {
    NO: nordic('#ba0c2f', '#fff', '#00205b'), SE: nordic('#006aa7', '#fecc02'), DK: nordic('#c8102e', '#fff'), FI: nordic('#fff', '#002f6c'),
    DE: hz('#000', '#dd0000', '#ffce00'), NL: hz('#ae1c28', '#fff', '#21468b'), HU: hz('#ce2939', '#fff', '#477050'), FR: vt('#002395', '#fff', '#ed2939'), IT: vt('#009246', '#fff', '#ce2b37'), RO: vt('#002b7f', '#fcd116', '#ce1126'),
    ES: '<rect width="30" height="20" fill="#aa151b"/><rect y="5" width="30" height="10" fill="#f1bf00"/>',
    UA: '<rect width="30" height="10" fill="#0057b7"/><rect y="10" width="30" height="10" fill="#ffd700"/>',
    GB: '<rect width="30" height="20" fill="#012169"/><path d="M0 0L30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0L30 20M30 0L0 20" stroke="#c8102e" stroke-width="1.4"/><path d="M15 0V20M0 10H30" stroke="#fff" stroke-width="6"/><path d="M15 0V20M0 10H30" stroke="#c8102e" stroke-width="3.4"/>',
    GR: '<rect width="30" height="20" fill="#0d5eaf"/><path d="M0 3.33H30M0 7.78H30M0 12.22H30M0 16.67H30" stroke="#fff" stroke-width="2.22"/><rect width="11.1" height="11.1" fill="#0d5eaf"/><path d="M5.55 0V11.1M0 5.55H11.1" stroke="#fff" stroke-width="2.22"/>',
    TR: '<rect width="30" height="20" fill="#e30a17"/><circle cx="11" cy="10" r="5" fill="#fff"/><circle cx="12.3" cy="10" r="4" fill="#e30a17"/><path d="M15.4 10l3.6-1.2-2.2 3.1V8.1l2.2 3.1z" fill="#fff"/>',
    EU: '<rect width="30" height="20" fill="#003399"/>' + (function () { var s = ''; for (var i = 0; i < 12; i++) { var a = i / 12 * 6.283; s += '<circle cx="' + (15 + 6 * Math.cos(a)).toFixed(2) + '" cy="' + (10 + 6 * Math.sin(a)).toFixed(2) + '" r=".9" fill="#ffcc00"/>'; } return s; })()
  };
  function flag(c) { return '<svg class="mtl-nm__flag" viewBox="0 0 30 20" aria-hidden="true">' + FLAG[c] + '</svg>'; }

  /* ---------- content ---------- */
  /* desks (Montel offices) and covered markets, in dot-grid space (1000 x 900), with their flag */
  var OFFICES = { Oslo: [520, 294, 'NO'], Trondheim: [517, 211, 'NO'], Stockholm: [608, 303, 'SE'], Gothenburg: [535, 346, 'SE'], Helsinki: [686, 272, 'FI'], London: [360, 479, 'GB'], Stockton: [355, 405, 'GB'], Terneuzen: [418, 491, 'NL'], Paris: [389, 547, 'FR'], Madrid: [260, 727, 'ES'], Berlin: [558, 467, 'DE'], Halle: [537, 493, 'DE'], Frankfurt: [488, 524, 'DE'], Stuttgart: [495, 556, 'DE'], Munich: [532, 571, 'DE'], Istanbul: [841, 701, 'TR'] };
  var COVER = { Brussels: [424, 503, 'EU'], Edinburgh: [337, 369, 'GB'], Kyiv: [813, 478, 'UA'], Warsaw: [667, 465], Copenhagen: [544, 393, 'DK'], Vienna: [608, 567], Prague: [575, 524], Lisbon: [155, 744], Rome: [550, 718, 'IT'], Milan: [493, 634, 'IT'], Budapest: [651, 580, 'HU'], Bucharest: [776, 633, 'RO'], Athens: [761, 791, 'GR'] };
  var STORIES = [
    ['Oslo', 'Power', 'Bratt prisoppgang til nye rekordnivåer'],
    ['Frankfurt', 'Markets', 'Microsoft-Störung bremst Abläufe im Energiehandel'],
    ['Paris', 'Power', 'France : le déficit hydrologique expose les prix au gaz'],
    ['London', 'Gas', 'EU Russian LNG ban risks exacerbating already soaring UK prices'],
    ['Rome', 'Power', 'Enel: il price cap vincolerà elettricità verso i EUR 140-160/MWh'],
    ['Istanbul', 'Policy', 'Türkiye’nin 2040 Enerji Hedefleri açıklandı'],
    ['Madrid', 'Power', 'España planea atraer 47,4 GW de nueva demanda para 2030'],
    ['Bucharest', 'Nuclear', 'Romanian 675 MW reactor restart gets delayed by 1 day'],
    ['Stockholm', 'Power', 'Ellevio riktar kritik mot elmarknadshubb'],
    ['Berlin', 'Gas', 'Kabinett beschließt Entwurf für 24-TWh-Gasreserve'],
    ['Brussels', 'Carbon', 'EU backs 121m extra free ETS permits for industry'],
    ['Milan', 'Power', 'Pun, supera i EUR 300/MWh per la prima volta da quasi 4 anni'],
    ['Paris', 'Power', 'Le retour du vent devrait détendre le marché spot d’ici vendredi'],
    ['Trondheim', 'Power', 'Frykter RME-krav vil ta livet av ny produksjon i NO4'],
    ['Budapest', 'Nuclear', 'CSEE nuclear aims seen at risk from climate threats'],
    ['Munich', 'Power', 'Analysten befürchten zu wenig Kraftwerksleistung im Süden'],
    ['Istanbul', 'Power', 'Elektrik tüketimi 1-10 Kasım döneminde yıllık %8,04 arttı'],
    ['Edinburgh', 'Power', 'Afry: Scottish green power constrained half the time this year'],
    ['Madrid', 'Gas', 'El gas bajaría a EUR 80/MWh en el primer trimestre – banco'],
    ['Halle', 'Gas', 'Deutschland drohen Gaslücken bei extremer Winterkälte'],
    ['Athens', 'Nuclear', 'SE Europe 2026 nuclear losses near previous 5-year total'],
    ['Rome', 'Power', 'L’Italia approva misure per tagliare i prezzi elettrici di EUR 15/MWh'],
    ['Kyiv', 'Power', 'Ukraine faces “worsening winter energy threat”'],
    ['Paris', 'Power', 'Électricité française : risques haussiers pour l’été 2027'],
    ['Oslo', 'Power', '– Statnetts datasenterstans er veldig dramatisk']
  ];
  var LANGS = ['GB', 'NO', 'SE', 'DK', 'DE', 'FR', 'ES', 'IT', 'TR'];
  var CROP = { x: 110, y: 160, w: 790, h: 660 };

  var html = '<div class="mtl-nm" data-mtl-nm><div class="mtl-nm__stage"><canvas class="mtl-nm__canvas" aria-hidden="true"></canvas>' +
    '<div class="mtl-nm__card" aria-hidden="true"><p class="mtl-nm__meta"><span class="mtl-nm__where"></span><span class="mtl-nm__time"></span></p><p class="mtl-nm__h"></p><p class="mtl-nm__picked"></p></div>' +
    '<div class="mtl-nm__tip" aria-hidden="true"></div></div>' +
    '<aside class="mtl-nm__wire" aria-label="Live wire"><div class="mtl-nm__wire-head"><p class="mtl-nm__live"><i></i>Live wire</p><p class="mtl-nm__count"><b>186</b> stories today</p></div>' +
    '<p class="mtl-nm__langs"><span>Published in</span>' + LANGS.map(flag).join('') + '</p><ol class="mtl-nm__list"></ol></aside></div>';
  var wrap = document.createElement('div');
  wrap.className = 'mtl-nm-mount';
  wrap.innerHTML = html;
  box.classList.add('has-mtl-nm');
  box.appendChild(wrap);
  /* split layout (combo class is-map-split, set in Webflow): the wire joins the title in the right column */
  if (box.classList.contains('is-map-split') && box.parentNode) {
    var wire = wrap.querySelector('.mtl-nm__wire');
    wire.classList.add('is-split');
    box.parentNode.appendChild(wire);
    wrap.querySelector('.mtl-nm').classList.add('is-split');
  }

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MINT = '143, 240, 201';
  function place(n) { return OFFICES[n] || COVER[n]; }
  function flagOf(n) { var c = place(n)[2]; return FLAG[c] ? flag(c) : ''; }
  function fmt(c) { var h = Math.floor(c / 60) % 24, m = c % 60; return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  var DESKS = Object.keys(OFFICES).concat(Object.keys(COVER));

  function NM(root) {
    var scope = root.closest('section') || root;
    var self = this, q = function (s) { return root.querySelector(s) || scope.querySelector(s); };
    this.root = root; this.stage = q('.mtl-nm__stage'); this.cv = q('.mtl-nm__canvas'); this.ctx = this.cv.getContext('2d');
    this.card = q('.mtl-nm__card'); this.tip = q('.mtl-nm__tip'); this.list = q('.mtl-nm__list'); this.countEl = q('.mtl-nm__count b');
    this.i = -1; this.count = 186; this.clock = 7 * 60 + 41; this.fx = []; this.hover = null;
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

  /* dots; a dot on a border (next to sea or another country) is an edge dot */
  NM.prototype.decode = function () {
    var S = D.s, rows = D.rows.split('|'), grid = {}, cells = [];
    for (var r = 0; r < rows.length; r++) {
      if (!rows[r]) continue;
      var runs = rows[r].split(';');
      for (var j = 0; j < runs.length; j++) {
        var q = runs[j].split(','), c0 = +q[0], len = +q[1], ci = +q[2];
        for (var k = 0; k < len; k++) { grid[r * 4096 + c0 + k] = ci + 1; cells.push(r, c0 + k, ci); }
      }
    }
    var pts = [];
    for (var i = 0; i < cells.length; i += 3) {
      var rr = cells[i], cc = cells[i + 1], ci2 = cells[i + 2] + 1;
      var x = cc * S + (rr % 2 ? S / 2 : 0), y = rr * S * .866;
      if (x < CROP.x - 40 || x > CROP.x + CROP.w + 40 || y < CROP.y - 40 || y > CROP.y + CROP.h + 40) continue;
      var o = rr % 2 ? 0 : -1, nb = [[rr, cc - 1], [rr, cc + 1], [rr - 1, cc + o], [rr - 1, cc + o + 1], [rr + 1, cc + o], [rr + 1, cc + o + 1]], edge = false;
      /* edge: 1 = coast, 2 = land border (marked on one side only, so the line stays one dot thin) */
      for (var b = 0; b < 6; b++) { var v = grid[nb[b][0] * 4096 + nb[b][1]]; if (!v) edge = edge || 1; else if (v !== ci2 && v < ci2) edge = 2; }
      var faded = D.countries[ci2 - 1] && D.countries[ci2 - 1].faded;
      pts.push(x, y, +edge, faded ? 1 : 0);
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
    var off = this.base || (this.base = document.createElement('canvas'));
    off.width = this.cv.width; off.height = this.cv.height;
    var c = off.getContext('2d'), d = this.dpr, p = this.pts, rad = Math.max(1, 1.8 * s);
    c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, W, H);
    for (var i = 0; i < p.length; i += 4) {
      var a = p[i + 2] === 2 ? .03 : p[i + 2] === 1 ? .34 : .2;
      if (p[i + 3]) a *= .55;
      c.fillStyle = 'rgba(' + MINT + ',' + a + ')';
      c.beginPath(); c.arc(this.ox + p[i] * s, this.oy + p[i + 1] * s, rad, 0, 6.283); c.fill();
    }
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
    if (t >= this.nextAt) { this.nextAt = t + 3400; if (!this.paused) this.breakStory(t); }
    this.fx = this.fx.filter(function (f) { return t - f.t0 < f.dur; });
  };
  NM.prototype.draw = function (t) {
    var c = this.ctx, d = this.dpr, W = this.W, self = this;
    if (!W) return;
    c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, W, this.H);
    c.drawImage(this.base, 0, 0, W, this.H);
    this.fx.forEach(function (fx) {
      if (fx.type !== 'arc' || t < fx.t0) return;
      var k = Math.min(1, (t - fx.t0) / 1300), a = self.xy(fx.from), b = self.xy(fx.to);
      var mx = (a[0] + b[0]) / 2, my = Math.min(a[1], b[1]) - Math.hypot(b[0] - a[0], b[1] - a[1]) * .3;
      var fade = 1 - Math.max(0, (t - fx.t0 - 1300) / (fx.dur - 1300)), e = easeOut(k);
      c.strokeStyle = 'rgba(' + MINT + ',' + (.4 * fade).toFixed(3) + ')'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(a[0], a[1]);
      for (var i = 1; i <= 28; i++) { var u = i / 28 * e, v = 1 - u; c.lineTo(v * v * a[0] + 2 * v * u * mx + u * u * b[0], v * v * a[1] + 2 * v * u * my + u * u * b[1]); }
      c.stroke();
      if (k < 1) { var v2 = 1 - e; c.fillStyle = '#e6fff6'; c.beginPath(); c.arc(v2 * v2 * a[0] + 2 * v2 * e * mx + e * e * b[0], v2 * v2 * a[1] + 2 * v2 * e * my + e * e * b[1], 2.4, 0, 6.283); c.fill(); }
    });
    Object.keys(COVER).forEach(function (n) { var p = self.xy(n); c.fillStyle = 'rgba(210, 245, 233, .55)'; c.beginPath(); c.arc(p[0], p[1], 2.2, 0, 6.283); c.fill(); });
    Object.keys(OFFICES).forEach(function (n, i) {
      var p = self.xy(n), b = .5 + .5 * Math.sin(t / 900 + i * 1.7), r = 14 + 4 * b;
      var g = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], r);
      g.addColorStop(0, 'rgba(' + MINT + ', .3)'); g.addColorStop(1, 'rgba(' + MINT + ', 0)');
      c.fillStyle = g; c.beginPath(); c.arc(p[0], p[1], r, 0, 6.283); c.fill();
      c.fillStyle = '#e6fff6'; c.beginPath(); c.arc(p[0], p[1], 3.3, 0, 6.283); c.fill();
    });
    this.fx.forEach(function (fx) {
      if (fx.type !== 'ripple') return;
      var p = self.xy(fx.city);
      for (var j = 0; j < 2; j++) {
        var k = (t - fx.t0 - j * 450) / 1500; if (k < 0 || k > 1) continue;
        c.strokeStyle = 'rgba(230, 255, 246,' + (.9 * (1 - k)).toFixed(3) + ')'; c.lineWidth = 1.6;
        c.beginPath(); c.arc(p[0], p[1], 6 + 34 * easeOut(k), 0, 6.283); c.stroke();
      }
      c.fillStyle = '#fff'; c.beginPath(); c.arc(p[0], p[1], 4.6, 0, 6.283); c.fill();
    });
    if (this.hover) { var hp = this.xy(this.hover); c.strokeStyle = 'rgba(230, 255, 246, .9)'; c.lineWidth = 1.5; c.beginPath(); c.arc(hp[0], hp[1], 8, 0, 6.283); c.stroke(); }
  };

  /* ---------- stories ---------- */
  NM.prototype.breakStory = function (t) {
    var self = this; this.i = (this.i + 1) % STORIES.length;
    var s = STORIES[this.i], tm = fmt(this.clock += 2 + Math.floor(Math.random() * 5)), picked = [];
    this.fx.push({ type: 'ripple', city: s[0], t0: t, dur: 2600 });
    this.n = (this.n || 0) + 1;
    if (this.n % 3 === 0) {
      /* picked up by desks in other countries, nearest first */
      var a = place(s[0]), byC = {};
      Object.keys(OFFICES).forEach(function (o) {
        var cc = OFFICES[o][2]; if (cc === place(s[0])[2] || !FLAG[cc]) return;
        var dd = Math.hypot(OFFICES[o][0] - a[0], OFFICES[o][1] - a[1]);
        if (!byC[cc] || dd < byC[cc].d) byC[cc] = { o: o, d: dd };
      });
      picked = Object.keys(byC).sort(function (x, y) { return byC[x].d - byC[y].d; }).slice(0, 3);
      picked.forEach(function (cc, j) { self.fx.push({ type: 'arc', from: s[0], to: byC[cc].o, t0: t + 300 + j * 140, dur: 2700 }); });
    }
    var compact = this.W < 520;
    if (!compact) this.showCard(s, tm, picked);
    clearTimeout(this.pushT);
    this.pushT = setTimeout(function () { self.hideCard(); self.push([s[0], s[1], s[2], tm]); self.count++; self.countEl.textContent = self.count; }, compact ? 700 : 2600);
  };
  NM.prototype.showCard = function (s, tm, picked) {
    var p = this.xy(s[0]), card = this.card, right = p[0] > this.W * .55;
    card.querySelector('.mtl-nm__where').innerHTML = flagOf(s[0]) + '<b></b><i></i><em></em>';
    card.querySelector('.mtl-nm__where b').textContent = s[1];
    card.querySelector('.mtl-nm__where em').textContent = s[0];
    card.querySelector('.mtl-nm__time').textContent = tm;
    card.querySelector('.mtl-nm__h').textContent = s[2];
    card.querySelector('.mtl-nm__picked').innerHTML = picked.length ? '<span>Picked up in</span>' + picked.map(flag).join('') : '';
    /* keep the card inside what is visible: the map bleeds past the section top and the screen's left edge */
    var sr = this.stage.getBoundingClientRect(), sec = this.root.closest('section'), secTop = sec ? sec.getBoundingClientRect().top - sr.top : 0;
    var minX = Math.max(8, -sr.left + 16), minY = Math.max(8, secTop + 24);
    var w = Math.min(330, this.W * .46), x = right ? p[0] - w - 22 : p[0] + 22, h = card.offsetHeight || 150;
    if (x < minX) x = p[0] + 22;
    x = Math.max(minX, Math.min(this.W - w - 8, x));
    var y = Math.max(minY, Math.min(this.H - h - 8, p[1] - 70));
    card.style.width = w + 'px';
    card.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    card.classList.remove('is-on'); void card.offsetWidth; card.classList.add('is-on');
  };
  NM.prototype.hideCard = function () { this.card.classList.remove('is-on'); };
  NM.prototype.push = function (s, quiet) {
    var li = document.createElement('li');
    li.className = 'mtl-nm__item' + (quiet ? '' : ' is-new');
    li.innerHTML = '<p class="mtl-nm__item-top">' + flagOf(s[0]) + '<span></span><span></span></p><p class="mtl-nm__item-h"></p>';
    var sp = li.querySelectorAll('.mtl-nm__item-top span'); sp[0].textContent = s[0]; sp[1].textContent = s[3];
    li.querySelector('.mtl-nm__item-h').textContent = s[2];
    this.list.insertBefore(li, this.list.firstChild);
    while (this.list.children.length > 6) this.list.removeChild(this.list.lastChild);
  };

  NM.prototype.bind = function () {
    var self = this;
    this.stage.addEventListener('pointermove', function (e) {
      var r = self.stage.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, best = null, bd = 16;
      DESKS.forEach(function (n) { var p = self.xy(n), dd = Math.hypot(p[0] - x, p[1] - y); if (dd < bd) { bd = dd; best = n; } });
      self.hover = best; self.paused = !!best;
      if (best) {
        var p = self.xy(best);
        self.tip.innerHTML = flagOf(best) + '<span></span>';
        self.tip.lastChild.textContent = best + (OFFICES[best] ? ' · Montel desk' : ' · market we cover');
        self.tip.style.transform = 'translate(' + (p[0] + 12) + 'px,' + (p[1] - 40) + 'px)';
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
