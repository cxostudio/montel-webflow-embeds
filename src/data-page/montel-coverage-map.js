/* =========================================================
   Montel · Explore by country · coverage map  (v2.0)
   Same visual language as the Data hero map: hex dot grid,
   pine/mint palette, white cards.
   Needs montel-map-data.js (dot grid, shared with the hero)
   and montel-map-borders.js (country outlines, same projection).

   Reads the Webflow CMS panel items on the page:
     [data-mtl-cov-item] with data-code, data-name,
     data-power / data-gas / data-carbon / data-fund
   Inside an item (optional):
     [data-mtl-chips]      one bound chip, split per comma value
     [data-mtl-cov-count]  filled with "N commodity groups available"
   Markup needed: <div class="mtl-covmap" data-mtl-covmap data-default="NL"></div>
   (anything inside it is replaced).
   v3: commodity filter (All / Power / Gas / Carbon / Fundamentals, a group
   only shows once at least one country has it). Countries shade by depth:
   how many products the CMS lists for the chosen commodity. No arcs.
   ========================================================= */
(function () {
  'use strict';
  if (window.MontelCoverageExplorer) return;

  var GROUPS = [['power', 'Power'], ['gas', 'Gas'], ['carbon', 'Carbon'], ['fund', 'Fundamentals']];
  var COL = { ink: '#0c2a2b', pine: '#0d6d5c', pine2: '#14987c', mint: '#55bf9f', mint2: '#a9e6cc', off: '#b9c9c5', line: 'rgba(13,109,92,' };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var split = function (s) { return (s || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean); };
  var ease = { out: function (t) { return 1 - Math.pow(1 - t, 3); }, inOut: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; } };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var hex = function (h) { if (h.charAt(0) !== '#') return h.match(/[\d.]+/g).map(Number); return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; };
  var mix = function (a, b, t) { a = hex(a); b = hex(b); return 'rgb(' + Math.round(lerp(a[0], b[0], t)) + ',' + Math.round(lerp(a[1], b[1], t)) + ',' + Math.round(lerp(a[2], b[2], t)) + ')'; };

  /* split one bound chip into one chip per comma value, keeping the designer's chip styling */
  function chips(scope) {
    [].slice.call(scope.querySelectorAll('[data-mtl-chips]')).forEach(function (wrap) {
      if (wrap._done) return; wrap._done = true;
      var chip = wrap.firstElementChild; if (!chip) return;
      var vals = split(chip.textContent);
      if (vals.length < 2) return;
      var leaf = function (el) { while (el.children.length === 1) el = el.firstElementChild; return el; };
      leaf(chip).textContent = vals[0];
      for (var i = 1; i < vals.length; i++) { var c = chip.cloneNode(true); leaf(c).textContent = vals[i]; wrap.appendChild(c); }
    });
  }

  function Cov(root) {
    var D = window.MontelMapData, B = window.MontelMapBorders || {};
    if (!D) { console.warn('[MontelCoverage] montel-map-data.js missing'); return; }
    var self = this;
    this.root = root;
    root.innerHTML =
      '<canvas class="mtl-covmap__canvas" aria-hidden="true"></canvas>' +
      '<label class="mtl-covmap__pick"><span class="mtl-covmap__sr">Choose a country</span><select></select></label>' +
      '<div class="mtl-covmap__label" aria-hidden="true"></div>' +
      '<div class="mtl-covmap__filter" role="group" aria-label="Show coverage for"></div>' +
      '<div class="mtl-covmap__legend" aria-hidden="true"><span><i class="is-sel"></i>Selected</span><span class="mtl-covmap__ramp">Less<b></b>More coverage</span><span><i></i>Not covered</span></div>';
    this.cv = root.querySelector('canvas'); this.ctx = this.cv.getContext('2d');
    this.sel = root.querySelector('select'); this.label = root.querySelector('.mtl-covmap__label');

    /* CMS items */
    this.items = {};
    [].slice.call(document.querySelectorAll('[data-mtl-cov-item]')).forEach(function (el) {
      var code = (el.getAttribute('data-code') || '').toUpperCase().trim(); if (!code) return;
      var groups = GROUPS.filter(function (g) { return split(el.getAttribute('data-' + g[0])).length; }).map(function (g) { return g[1]; });
      if (!groups.length) return;
      var depth = {}; GROUPS.forEach(function (g) { depth[g[1]] = split(el.getAttribute('data-' + g[0])).length; });
      self.items[code] = { el: el, code: code, name: el.getAttribute('data-name') || code, groups: groups, depth: depth };
      var cnt = el.querySelector('[data-mtl-cov-count]');
      if (cnt) cnt.textContent = groups.length + ' commodity group' + (groups.length === 1 ? '' : 's') + ' available';
      chips(el);
    });
    document.documentElement.classList.add('mtl-covmap-on');

    /* dot grid (same decoding as the hero) */
    var S = D.s, rows = D.rows.split('|'), xs = [], ys = [], cs = [], ws = [];
    for (var r = 0; r < rows.length; r++) {
      if (!rows[r]) continue;
      rows[r].split(';').forEach(function (run) {
        var q = run.split(','), c0 = +q[0], len = +q[1], ci = +q[2], w = +q[3] / 9;
        for (var k = 0; k < len; k++) { xs.push((c0 + k) * S + (r % 2 ? S / 2 : 0)); ys.push(r * S * .866); cs.push(ci); ws.push(w); }
      });
    }
    this.S = S; this.n = xs.length; this.mx = xs; this.my = ys; this.mc = cs; this.mw = ws;
    this.C = D.countries.map(function (c, i) {
      var it = self.items[c.code];
      return { i: i, code: c.code, name: (it && it.name) || c.name, x: c.x, y: c.y, faded: !!c.faded, on: !!it, s: 0, h: 0,
        path: B[c.code] ? new Path2D(B[c.code]) : null };
    });
    this.byCode = {}; this.C.forEach(function (c) { self.byCode[c.code] = c; c.v = 0; c.tv = 0; });

    /* commodity filter: All + every group at least one country has */
    var present = GROUPS.map(function (g) { return g[1]; }).filter(function (g) { return Object.keys(self.items).some(function (k) { return self.items[k].depth[g] > 0; }); });
    this.filterEl = root.querySelector('.mtl-covmap__filter');
    this.filterEl.innerHTML = ['All'].concat(present).map(function (g) { return '<button type="button" data-g="' + g + '">' + g + '</button>'; }).join('');
    [].slice.call(this.filterEl.querySelectorAll('button')).forEach(function (b) { b.addEventListener('click', function () { self.setFilter(b.getAttribute('data-g')); }); });
    this.present = present;

    /* frame the map on the covered markets (no crop of what matters) */
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (var i = 0; i < this.n; i++) {
      var cc = this.C[cs[i]]; if (!cc || !cc.on || ws[i] < .35) continue;
      if (xs[i] < x0) x0 = xs[i]; if (xs[i] > x1) x1 = xs[i]; if (ys[i] < y0) y0 = ys[i]; if (ys[i] > y1) y1 = ys[i];
    }
    if (x1 < x0) { x0 = 150; y0 = 100; x1 = 850; y1 = 800; }
    this.box = [x0 - 24, y0 - 24, x1 + 24, y1 + 24];

    /* country picker */
    var list = Object.keys(this.items).map(function (k) { return self.items[k]; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    this.sel.innerHTML = list.map(function (c) { return '<option value="' + c.code + '">' + c.name + '</option>'; }).join('');
    this.sel.addEventListener('change', function () { self.pick(self.sel.value, true); });

    this.t = 0; this.last = 0; this.reveal = reduce ? 1 : 0; this.hover = null; this.on = false; this.raf = 0;
    this.bind();
    this.resize();
    this.setFilter('All', true);
    var first = (root.getAttribute('data-default') || '').toUpperCase();
    this.pick(this.items[first] ? first : (list[0] && list[0].code), false);
  }

  Cov.prototype.bind = function () {
    var self = this, cv = this.cv;
    new IntersectionObserver(function (e) { self.on = e[0].isIntersecting; if (self.on) self.kick(); }, { threshold: .05 }).observe(this.root);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) self.kick(); });
    if (window.ResizeObserver) new ResizeObserver(function () { self.resize(); self.kick(); }).observe(this.root);
    else window.addEventListener('resize', function () { self.resize(); self.kick(); });
    cv.addEventListener('pointermove', function (e) { var c = self.hit(e); if (c !== self.hover) { self.hover = c; cv.style.cursor = c ? 'pointer' : ''; self.showLabel(c || self.cur); self.kick(); } });
    cv.addEventListener('pointerleave', function () { self.hover = null; self.showLabel(self.cur); self.kick(); });
    cv.addEventListener('click', function (e) { var c = self.hit(e); if (c) self.pick(c.code, true); });
  };

  Cov.prototype.resize = function () {
    var r = this.root.getBoundingClientRect(); if (!r.width) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1), b = this.box;
    this.W = r.width; this.H = r.height; this.dpr = dpr;
    this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr);
    var padT = r.width < 560 ? 60 : 50, padB = r.width < 560 ? 40 : 36, padX = 12;
    var k = Math.min((r.width - padX * 2) / (b[2] - b[0]), (r.height - padT - padB) / (b[3] - b[1]));
    this.k = k;
    this.ox = (r.width - (b[2] - b[0]) * k) / 2 - b[0] * k;
    this.oy = padT + ((r.height - padT - padB) - (b[3] - b[1]) * k) / 2 - b[1] * k;
    this.dot = Math.max(1.1, this.S * k * .34);
    if (this.cur) this.showLabel(this.hover || this.cur);
  };

  Cov.prototype.toMap = function (e) { var r = this.cv.getBoundingClientRect(); return [(e.clientX - r.left - this.ox) / this.k, (e.clientY - r.top - this.oy) / this.k]; };
  Cov.prototype.hit = function (e) {
    var p = this.toMap(e), ctx = this.ctx;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (var i = 0; i < this.C.length; i++) { var c = this.C[i]; if (c.on && c.path && ctx.isPointInPath(c.path, p[0], p[1])) { ctx.restore(); return c; } }
    ctx.restore(); return null;
  };

  /* pick a market: panel, dropdown, highlight, arcs to the nearest covered neighbours */
  Cov.prototype.pick = function (code, user) {
    var it = this.items[code], c = this.byCode[code]; if (!it) return;
    var self = this;
    this.cur = c || { code: code, name: it.name, x: null };
    this.sel.value = code;
    Object.keys(this.items).forEach(function (k) { self.items[k].el.classList.toggle('is-active', k === code); });
    this.picked = this.t;
    this.showLabel(this.hover || this.cur);
    this.kick();
    void user;
  };

  /* coverage depth per country for the chosen commodity, 0..1 (0 = not covered) */
  Cov.prototype.setFilter = function (g, silent) {
    var self = this; this.filter = g;
    [].slice.call(this.filterEl.querySelectorAll('button')).forEach(function (b) { var on = b.getAttribute('data-g') === g; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
    var val = function (it) { return g === 'All' ? self.present.filter(function (x) { return it.depth[x] > 0; }).length : (it.depth[g] || 0); };
    var max = 0; Object.keys(this.items).forEach(function (k) { max = Math.max(max, val(self.items[k])); });
    this.C.forEach(function (c) { var it = self.items[c.code]; var v = it ? val(it) : 0; c.tv = v && max ? .35 + .65 * (max > 1 ? (v - 1) / (max - 1) : 1) : 0; });
    if (!silent) { this.showLabel(this.hover || this.cur); this.kick(); }
  };

  Cov.prototype.showLabel = function (c) {
    var L = this.label, it = c && this.items[c.code];
    if (!it || c.x == null || !this.k) { L.classList.remove('is-in'); return; }
    var f = this.filter, chipsTxt;
    if (f && f !== 'All') {
      var key = GROUPS.filter(function (g) { return g[1] === f; })[0][0], prods = split(it.el.getAttribute('data-' + key));
      chipsTxt = prods.length ? prods.map(function (p) { return '<em>' + p + '</em>'; }).join('') : '<em class="is-none">No ' + f.toLowerCase() + ' coverage</em>';
    } else chipsTxt = it.groups.map(function (g) { return '<em>' + g + '</em>'; }).join('');
    L.innerHTML = '<b>' + it.name + '</b><span>' + chipsTxt + '</span>';
    var x = this.ox + c.x * this.k, y = this.oy + c.y * this.k;
    var w = L.offsetWidth || 180, h = L.offsetHeight || 70;
    var right = x + 26 + w < this.W - 12;
    var left = right ? x + 26 : x - 26 - w, top = Math.max(64, Math.min(this.H - h - 48, y - h / 2));
    left = Math.max(12, left);
    L.style.transform = 'translate(' + Math.round(left) + 'px,' + Math.round(top) + 'px)';
    L.classList.add('is-in');
  };

  Cov.prototype.kick = function () { if (!this.raf && this.on && !document.hidden) { var s = this; this.last = performance.now(); this.raf = requestAnimationFrame(function (n) { s.frame(n); }); } };

  Cov.prototype.frame = function (now) {
    this.raf = 0;
    var dt = Math.min(.05, (now - this.last) / 1000); this.last = now; this.t += dt;
    var busy = this.step(dt); this.draw();
    if ((busy || !reduce) && this.on && !document.hidden) this.kick();
  };

  /* advance tweens; returns true while something is still moving */
  Cov.prototype.step = function (dt) {
    var busy = false, self = this;
    if (this.reveal < 1) { this.reveal = Math.min(1, this.reveal + dt / 1.6); busy = true; }
    this.C.forEach(function (c) {
      var ts = self.cur && c === self.cur ? 1 : 0, th = self.hover === c ? 1 : 0;
      var ns = c.s + (ts - c.s) * Math.min(1, dt * 9), nh = c.h + (th - c.h) * Math.min(1, dt * 12);
      if (Math.abs(ns - c.s) > .002 || Math.abs(nh - c.h) > .002) busy = true;
      c.s = ns; c.h = nh;
      var nv = c.v + (c.tv - c.v) * Math.min(1, dt * 7); if (Math.abs(nv - c.v) > .002) busy = true; c.v = nv;
    });
    return busy;
  };

  Cov.prototype.draw = function () {
    var ctx = this.ctx, dpr = this.dpr, k = this.k, ox = this.ox, oy = this.oy, t = this.t;
    if (!k) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.cv.width, this.cv.height);

    /* intro: dots ripple out from the selected market (or the centre) */
    var o = this.cur && this.cur.x != null ? this.cur : { x: 500, y: 450 };
    var R = ease.out(this.reveal) * 1100;

    /* 1. dots */
    var r0 = this.dot * dpr;
    for (var i = 0; i < this.n; i++) {
      var c = this.C[this.mc[i]], w = this.mw[i]; if (!c) continue;
      var x = this.mx[i], y = this.my[i];
      var d = Math.hypot(x - o.x, y - o.y);
      if (d > R) continue;
      var fin = Math.min(1, (R - d) / 90);
      var col, a, rr = r0;
      if (c.on && (c.v > .02 || c.s > .01)) {
        var base = mix(COL.mint2, COL.pine2, Math.min(1, c.v));
        col = c.s > .01 ? mix(base, COL.pine, c.s) : (c.h > .01 ? mix(base, COL.pine, c.h * .6) : base);
        a = (.55 + .4 * c.v) + .25 * Math.max(c.s, c.h * .6); rr = r0 * (1 + .18 * c.s);
        if (c.v < .02) { col = mix(COL.off, COL.pine, c.s); a = .45 + .4 * c.s; }
      } else { col = COL.off; a = .3; }
      a *= w * fin;
      if (a < .02) continue;
      ctx.globalAlpha = a; ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc((ox + x * k) * dpr, (oy + y * k) * dpr, rr * (.6 + .4 * fin), 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* 2. borders (clear, like the hero outlines) */
    ctx.setTransform(k * dpr, 0, 0, k * dpr, ox * dpr, oy * dpr);
    ctx.lineJoin = 'round';
    var bA = .9 * ease.out(Math.max(0, this.reveal * 1.4 - .4));
    for (var j = 0; j < this.C.length; j++) {
      var cc = this.C[j]; if (!cc.path) continue;
      if (cc.on && (cc.s > .01 || cc.h > .01)) continue;
      ctx.strokeStyle = COL.line + ((cc.faded ? .14 : cc.on ? .42 : .26) * bA) + ')';
      ctx.lineWidth = (cc.on ? 1.1 : .9) / k;
      ctx.stroke(cc.path);
    }
    for (j = 0; j < this.C.length; j++) {
      cc = this.C[j]; if (!cc.path || !(cc.on && (cc.s > .01 || cc.h > .01))) continue;
      var e = Math.max(cc.s, cc.h * .7);
      ctx.fillStyle = 'rgba(13,109,92,' + (.07 * e * bA) + ')'; ctx.fill(cc.path);
      ctx.strokeStyle = 'rgba(13,109,92,' + ((.42 + .5 * e) * bA) + ')';
      ctx.lineWidth = (1.1 + .9 * e) / k; ctx.stroke(cc.path);
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    var self = this;

    /* 4. selected market pin with pulse (hero focus marker) */
    var cu = this.cur;
    if (cu && cu.x != null) {
      var X = (ox + cu.x * k) * dpr, Y = (oy + cu.y * k) * dpr;
      if (!reduce) {
        var pulse = (t * .55) % 1;
        ctx.strokeStyle = 'rgba(13,109,92,' + (.5 * (1 - pulse)) + ')'; ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath(); ctx.arc(X, Y, (8 + 22 * pulse) * dpr, 0, 6.283); ctx.stroke();
      }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X, Y, 7 * dpr, 0, 6.283); ctx.fill();
      ctx.fillStyle = COL.pine; ctx.beginPath(); ctx.arc(X, Y, 4.2 * dpr, 0, 6.283); ctx.fill();
    }
    void self;
  };

  function init(scope) { [].slice.call((scope || document).querySelectorAll('[data-mtl-covmap]')).forEach(function (r) { if (!r._mtl) r._mtl = new Cov(r); }); }
  window.MontelCoverageExplorer = { init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); }); else init();
})();
