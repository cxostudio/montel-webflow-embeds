/* =========================================================
   Montel · Ecosystem card visuals (homepage)
   Three live visuals that replace the static card images:
   market (card 1), imbalance (card 2), scenarios (card 3).
   Fixed design canvas per visual, scaled to its box. Runs only
   while on screen; reduced motion shows the final frame.
   Public hook: MontelEco.setMarket('UK') or setMarket(index).
   ========================================================= */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function rnd(seed) { var s = seed % 2147483647; if (s <= 0) s += 2147483646; return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; }; }
  function smooth(pts) { /* Catmull-Rom to cubic Bezier */
    if (!pts.length) return '';
    var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += ' C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + ' ' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d;
  }
  function draw(path, ms, delay) {
    var len = path.getTotalLength ? path.getTotalLength() : 1000;
    path.style.transition = 'none'; path.style.strokeDasharray = len; path.style.strokeDashoffset = reduce ? 0 : len;
    if (reduce) return;
    path.getBoundingClientRect();
    path.style.transition = 'stroke-dashoffset ' + ms + 'ms cubic-bezier(.4,0,.2,1) ' + (delay || 0) + 'ms';
    path.style.strokeDashoffset = 0;
  }
  function tween(from, to, ms, step) {
    if (reduce || ms <= 0) { step(to); return; }
    var t0 = performance.now();
    (function f(t) { var p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3); step(from + (to - from) * e); if (p < 1) requestAnimationFrame(f); })(t0);
  }
  function fmt(v, dec) { return v.toFixed(dec == null ? 2 : dec); }

  /* ---------- shared mount: fixed canvas scaled into its box ---------- */
  function Mount(box, W, H, cls, fill) {
    var root = document.createElement('div'); root.className = 'mtl-ev ' + cls;
    var canvas = document.createElement('div'); canvas.className = 'mtl-ev__canvas'; canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    root.appendChild(canvas); box.appendChild(root);
    function fit() {
      var w = root.clientWidth, h = root.clientHeight; if (!w || !h) return;
      var s = Math.min(w / W, h / H) * (fill || 1);
      canvas.style.transform = 'translate(' + ((w - W * s) / 2).toFixed(1) + 'px,' + ((h - H * s) / 2).toFixed(1) + 'px) scale(' + s.toFixed(4) + ')';
    }
    var fr = 0; new ResizeObserver(function () { if (!fr) fr = requestAnimationFrame(function () { fr = 0; fit(); }); }).observe(root); fit();
    var api = { root: root, canvas: canvas, visible: false, onShow: null, onHide: null };
    new IntersectionObserver(function (es) {
      var v = es[es.length - 1].isIntersecting;
      if (v === api.visible) return; api.visible = v;
      if (v && api.onShow) api.onShow(); if (!v && api.onHide) api.onHide();
    }, { threshold: .2 }).observe(root);
    return api;
  }
  function div(cls, parent, html, style) { var d = document.createElement('div'); d.className = cls; if (html != null) d.innerHTML = html; if (style) d.setAttribute('style', style); parent.appendChild(d); return d; }

  /* =========================================================
     1) Market insights: exchange prices + carbon / gas / power,
        Europe dot map behind, flag rail on the right
     ========================================================= */
  var MARKETS = [
    { code: 'DE', name: 'Germany',        base: 82, swing: 58, carbon: 68.95, gas: 34.20, power: 92.40, c: .8, g: 1.1, p: 2.3 },
    { code: 'FR', name: 'France',         base: 66, swing: 50, carbon: 68.95, gas: 33.60, power: 78.10, c: .8, g: .9, p: -1.4 },
    { code: 'GB', name: 'Great Britain',  base: 74, swing: 52, carbon: 41.60, gas: 34.10, power: 86.20, c: -.6, g: 1.8, p: 3.1 },
    { code: 'NL', name: 'Netherlands',    base: 78, swing: 56, carbon: 68.95, gas: 33.15, power: 89.60, c: .8, g: 1.2, p: 1.7 },
    { code: 'BE', name: 'Belgium',        base: 77, swing: 55, carbon: 68.95, gas: 32.95, power: 88.10, c: .8, g: 1.2, p: 2.7 },
    { code: 'NO', name: 'Norway',         base: 36, swing: 22, carbon: 68.95, gas: 33.15, power: 41.30, c: .8, g: 1.2, p: -2.2 },
    { code: 'SE', name: 'Sweden',         base: 31, swing: 26, carbon: 68.95, gas: 33.15, power: 36.80, c: .8, g: 1.2, p: 4.1 },
    { code: 'ES', name: 'Spain',          base: 55, swing: 48, carbon: 68.95, gas: 34.40, power: 64.50, c: .8, g: .6, p: -3.0 },
    { code: 'IT', name: 'Italy',          base: 98, swing: 44, carbon: 68.95, gas: 36.10, power: 108.90, c: .8, g: 1.5, p: 1.2 },
    { code: 'AT', name: 'Austria',        base: 81, swing: 57, carbon: 68.95, gas: 35.20, power: 91.35, c: .8, g: 1.4, p: -1.2 }
  ];
  var ICONS = {
    carbon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21c-3.6 0-6-2.5-6-5.8 0-3.6 3.2-5.6 3.8-9.2 2.4 1.6 3.6 3.6 3.4 6 1-.6 1.6-1.6 1.8-2.8 1.8 1.6 3 3.6 3 6 0 3.3-2.4 5.8-6 5.8z"/></svg>',
    gas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19c3-4 6-7 10-9"/></svg>',
    power: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>'
  };
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function lerpPts(a, b, t) { return a.map(function (p, i) { return [p[0] + (b[i][0] - p[0]) * t, p[1] + (b[i][1] - p[1]) * t]; }); }

  function marketVisual(box) {
    var W = 1394, H = 896, m = Mount(box, W, H, 'mtl-ev--market', 1);
    var c = m.canvas;
    div('mtl-ev__glass', c, null, 'left:350px;top:52px;width:843px;height:843px');
    var dark = div('mtl-ev__dark', c, null, 'left:437px;top:179px;width:585px;height:585px');
    div('mtl-ev__dark-t', dark, 'Exchange prices · EUR/MWh');
    var mk = div('mtl-ev__dark-m', dark, '');
    var svg = el('svg', { viewBox: '0 0 585 585', class: 'mtl-ev__plot' }); dark.appendChild(svg);
    var X0 = 86, X1 = 545, Y0 = 150, Y1 = 487, MAXV = 175, N = 64;
    [0, 50, 100, 150].forEach(function (v) {
      var y = Y1 - (v / MAXV) * (Y1 - Y0);
      el('line', { x1: X0, x2: X1, y1: y, y2: y, class: 'mtl-ev__grid' }, svg);
      var t = el('text', { x: 18, y: y + 7, class: 'mtl-ev__axis' }, svg); t.textContent = v + ' EUR';
    });
    ['7 May', '8 May', '9 May'].forEach(function (d, i) { var t = el('text', { x: X0 + 40 + i * 175, y: 535, class: 'mtl-ev__axis' }, svg); t.textContent = d; });
    var area = el('path', { class: 'mtl-ev__area' }, svg);
    var lines = { bid: el('path', { class: 'mtl-ev__line mtl-ev__line--bid' }, svg), last: el('path', { class: 'mtl-ev__line mtl-ev__line--last' }, svg), ask: el('path', { class: 'mtl-ev__line mtl-ev__line--ask' }, svg) };
    var cursor = el('line', { y1: Y0 - 10, y2: Y1, class: 'mtl-ev__cursor' }, svg);
    var dot = el('circle', { r: 7, class: 'mtl-ev__dot' }, svg);
    var tip = div('mtl-ev__tip', c, '<p class="mtl-ev__tip-t"></p><p><i class="a"></i>Ask <b class="va"></b></p><p><i class="l"></i>Last <b class="vl"></b></p><p><i class="b"></i>Bid <b class="vb"></b></p>');

    function chip(key, label, x, y, color) {
      var e = div('mtl-ev__chip', c, '<span class="mtl-ev__ic">' + ICONS[key] + '</span><span class="mtl-ev__chip-txt"><small>' + label + '</small><b class="v"></b><small class="u">' + (key === 'carbon' ? 'EUR/t' : 'EUR/MWh') + '</small></span><svg class="mtl-ev__spark" viewBox="0 0 200 60" preserveAspectRatio="none"><path class="f"/><path class="s"/></svg><span class="mtl-ev__pill"><span class="ar">&#8599;</span><span class="pc"></span></span>', 'left:' + x + 'px;top:' + y + 'px;width:600px;height:120px;--c:' + color);
      return { el: e, v: e.querySelector('.v'), pc: e.querySelector('.pc'), ar: e.querySelector('.ar'), s: e.querySelector('.s'), f: e.querySelector('.f'), val: 0, pts: null };
    }
    var chips = { carbon: chip('carbon', 'Carbon', 726, 0, '#e07a1f'), gas: chip('gas', 'Gas', 0, 430, '#a14be8'), power: chip('power', 'Power', 794, 672, '#0d6d5c') };

    /* data per market */
    function seriesFor(mi) {
      var M = MARKETS[mi], r = rnd(mi * 97 + 13), out = [];
      for (var i = 0; i < N; i++) {
        var t = i / (N - 1), day = Math.sin(t * Math.PI * 3 - .6);
        var spike = Math.exp(-Math.pow((t - .32) * 9, 2)) * 1.25 + Math.exp(-Math.pow((t - .55) * 14, 2)) * .55 - Math.exp(-Math.pow((t - .62) * 12, 2)) * .5;
        out.push(Math.max(8, Math.min(150, M.base + M.swing * (.25 * day + spike) + (r() - .5) * 6)));
      }
      return out;
    }
    function linePts(ser, k, base) { return ser.map(function (v, i) { var off = k * (2.5 + Math.abs(v - base) * .12); return [X0 + (i / (N - 1)) * (X1 - X0), Y1 - ((v + off) / MAXV) * (Y1 - Y0)]; }); }
    function sparkPts(mi, j, pct) { var rr = rnd(mi * 31 + j * 7 + 1), y = 30, sp = []; for (var i = 0; i < 18; i++) { y += (rr() - .45 - (pct < 0 ? .1 : 0)) * 14; y = Math.max(8, Math.min(52, y)); sp.push([i * (200 / 17), 60 - y]); } return sp; }

    var idx = 0, cur = { ask: null, last: null, bid: null, ser: null, base: 0 }, morphRaf = 0;
    function paint(st) {
      lines.ask.setAttribute('d', smooth(st.ask)); lines.last.setAttribute('d', smooth(st.last)); lines.bid.setAttribute('d', smooth(st.bid));
      area.setAttribute('d', smooth(st.last) + ' L' + X1 + ' ' + Y1 + ' L' + X0 + ' ' + Y1 + 'Z');
    }
    function target(mi) { var ser = seriesFor(mi), b = MARKETS[mi].base; return { ser: ser, base: b, ask: linePts(ser, 1, b), last: linePts(ser, 0, b), bid: linePts(ser, -1, b) }; }
    function morphTo(mi, first) {
      var M = MARKETS[mi], to = target(mi);
      mk.classList.add('is-out');
      setTimeout(function () { mk.textContent = M.name; mk.classList.remove('is-out'); }, first ? 0 : 280);
      ['carbon', 'gas', 'power'].forEach(function (k, j) {
        var ch = chips[k], v = M[k], pct = M[k === 'carbon' ? 'c' : k === 'gas' ? 'g' : 'p'], sp = sparkPts(mi, j, pct);
        tween(ch.val, v, first ? 0 : 1000, function (x) { ch.v.textContent = fmt(x); }); ch.val = v;
        ch.pc.textContent = Math.abs(pct).toFixed(1).replace('.', ',') + ' %'; ch.ar.innerHTML = pct >= 0 ? '&#8599;' : '&#8600;';
        ch.from = ch.pts || sp; ch.to = sp; ch.pts = sp;
        if (first) { var d = smooth(sp); ch.s.setAttribute('d', d); ch.f.setAttribute('d', d + ' L200 60 L0 60Z'); draw(ch.s, 1100, 200 + j * 120); }
      });
      if (first || reduce) {
        cur = to; paint(cur);
        if (first) { draw(lines.bid, 1300, 0); draw(lines.last, 1300, 120); draw(lines.ask, 1300, 240); }
        if (reduce) ['carbon', 'gas', 'power'].forEach(function (k) { var d = smooth(chips[k].to); chips[k].s.setAttribute('d', d); chips[k].f.setAttribute('d', d + ' L200 60 L0 60Z'); });
        return;
      }
      var from = { ask: cur.ask, last: cur.last, bid: cur.bid, ser: cur.ser }, t0 = performance.now(), D = 1100;
      cancelAnimationFrame(morphRaf);
      (function f(t) {
        var p = ease(Math.min(1, (t - t0) / D));
        cur = { base: to.base, ser: from.ser.map(function (v, i) { return v + (to.ser[i] - v) * p; }), ask: lerpPts(from.ask, to.ask, p), last: lerpPts(from.last, to.last, p), bid: lerpPts(from.bid, to.bid, p) };
        paint(cur);
        ['carbon', 'gas', 'power'].forEach(function (k) { var ch = chips[k], d = smooth(lerpPts(ch.from, ch.to, p)); ch.s.style.strokeDasharray = 'none'; ch.s.setAttribute('d', d); ch.f.setAttribute('d', d + ' L200 60 L0 60Z'); });
        if (p < 1) morphRaf = requestAnimationFrame(f);
      })(t0);
    }
    function valAt(p) { var s = cur.ser, f = p * (s.length - 1), i = Math.floor(f), t = f - i; var a = s[i], b = s[Math.min(s.length - 1, i + 1)]; return a + (b - a) * t; }
    function place(p) {
      var x = X0 + p * (X1 - X0), v = valAt(p), y = Y1 - (v / MAXV) * (Y1 - Y0);
      cursor.setAttribute('x1', x); cursor.setAttribute('x2', x); dot.setAttribute('cx', x); dot.setAttribute('cy', y);
      var sp = 2.5 + Math.abs(v - cur.base) * .12;
      var mins = Math.round(p * 2 * 24 * 60 / 30) * 30, day = 7 + Math.floor(mins / 1440), hm = mins % 1440;
      tip.querySelector('.mtl-ev__tip-t').textContent = (day === 7 ? 'Tue' : 'Wed') + ' ' + day + ' May ' + ('0' + Math.floor(hm / 60)).slice(-2) + ':' + ('0' + hm % 60).slice(-2);
      tip.querySelector('.va').textContent = fmt(v + sp); tip.querySelector('.vl').textContent = fmt(v); tip.querySelector('.vb').textContent = fmt(v - sp);
      var tx = 437 + x + 30, ty = 179 + y - 90; if (tx > 1080) tx = 437 + x - 330;
      tip.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + Math.max(190, Math.min(560, ty)).toFixed(1) + 'px)';
    }
    var raf = 0;
    function loop(t) { place(.08 + ((t / 16000) % 1) * .86); raf = requestAnimationFrame(loop); }
    m.onShow = function () { if (!reduce && !raf) raf = requestAnimationFrame(loop); };
    m.onHide = function () { cancelAnimationFrame(raf); raf = 0; };
    morphTo(0, true); place(.62);
    return {
      setMarket: function (key) {
        var i = typeof key === 'number' ? key : -1;
        if (i < 0) { var k = String(key || '').toUpperCase(); MARKETS.forEach(function (M, j) { if (M.code === k || M.name.toUpperCase() === k) i = j; }); }
        if (i < 0 || i >= MARKETS.length || i === idx) return; idx = i; morphTo(i, false); if (reduce) place(.62);
      }
    };
  }

  /* ---------- Europe dot map behind card 1 (canvas, crisp at any pixel ratio) ---------- */
  function europeMap(card, getAnchor) {
    var D = window.MontelMapData; if (!D) return null;
    var cv = document.createElement('canvas'); cv.className = 'mtl-ev-map'; cv.setAttribute('aria-hidden', 'true');
    card.insertBefore(cv, card.firstChild);
    var ctx = cv.getContext('2d'), S = D.s, rows = D.rows.split('|'), dots = [];
    for (var r = 0; r < rows.length; r++) {
      if (!rows[r]) continue;
      rows[r].split(';').forEach(function (run) {
        var q = run.split(','), c0 = +q[0], len = +q[1], ci = +q[2], w = +q[3] / 9;
        for (var k = 0; k < len; k++) dots.push([(c0 + k) * S + (r % 2 ? S / 2 : 0), r * S * .866, ci, w]);
      });
    }
    var codeIdx = {}; D.countries.forEach(function (cn, i) { codeIdx[cn.code] = i; });
    var base = document.createElement('canvas'), bctx = base.getContext('2d');
    var dpr = 1, k = 1, ox = 0, oy = 0, cw = 0, ch = 0, active = -1, prev = -1, mix = 1, t0 = 0, raf = 0, visible = false;
    var label = document.createElement('div'); label.className = 'mtl-ev-map__label'; card.appendChild(label);
    function layout() {
      cw = card.clientWidth; ch = card.clientHeight; if (!cw || !ch) return;
      dpr = Math.min(2.5, window.devicePixelRatio || 1);
      cv.width = base.width = Math.round(cw * dpr); cv.height = base.height = Math.round(ch * dpr);
      cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
      k = (ch * 1.12) / D.h;
      var A = getAnchor ? getAnchor() : { x: cw * .62, y: ch * .55 }, de = D.countries[codeIdx.DE];
      ox = A.x - de.x * k; oy = A.y - de.y * k;
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0); bctx.clearRect(0, 0, cw, ch);
      var rad = Math.max(.9, S * k * .27);
      dots.forEach(function (d) {
        var x = ox + d[0] * k, y = oy + d[1] * k; if (x < -4 || y < -4 || x > cw + 4 || y > ch + 4) return;
        var cn = D.countries[d[2]], a = (cn && cn.faded ? .08 : .2) * (.35 + .65 * d[3]);
        bctx.fillStyle = 'rgba(132,214,203,' + a.toFixed(3) + ')'; bctx.beginPath(); bctx.arc(x, y, rad, 0, 6.2832); bctx.fill();
      });
      frame(performance.now());
    }
    function countryDots(ci, alpha, rad) {
      ctx.fillStyle = 'rgba(150,240,226,' + alpha.toFixed(3) + ')';
      dots.forEach(function (d) { if (d[2] !== ci) return; var x = ox + d[0] * k, y = oy + d[1] * k; ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.2832); ctx.fill(); });
    }
    function frame(t) {
      raf = 0; if (!cw) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(base, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var rad = Math.max(.9, S * k * .27);
      mix = reduce ? 1 : Math.min(1, (t - t0) / 900);
      if (prev >= 0 && mix < 1) countryDots(prev, .55 * (1 - mix), rad);
      if (active >= 0) {
        countryDots(active, .55 * mix, rad);
        var cn = D.countries[active], x = ox + cn.x * k, y = oy + cn.y * k, ph = reduce ? 0 : ((t / 1800) % 1);
        ctx.strokeStyle = 'rgba(48,222,238,' + (.55 * (1 - ph) * mix).toFixed(3) + ')'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, 6 + ph * 22, 0, 6.2832); ctx.stroke();
        ctx.fillStyle = 'rgba(48,222,238,' + mix.toFixed(3) + ')'; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 6.2832); ctx.fill();
        label.style.transform = 'translate(' + (x + 16).toFixed(1) + 'px,' + (y - 15).toFixed(1) + 'px)';
      }
      if (visible && !reduce) raf = requestAnimationFrame(frame);
    }
    new ResizeObserver(function () { layout(); }).observe(card);
    new IntersectionObserver(function (es) { visible = es[es.length - 1].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame); }, { threshold: .05 }).observe(card);
    return {
      setActive: function (code, name, price) {
        var ci = codeIdx[code]; if (ci == null) return;
        prev = active; active = ci; t0 = performance.now();
        label.classList.remove('is-in'); label.getBoundingClientRect();
        label.innerHTML = '<b>' + name + '</b><span>' + price.toFixed(2) + ' EUR/MWh</span>'; label.classList.add('is-in');
        if (!raf) raf = requestAnimationFrame(frame);
      },
      relayout: layout
    };
  }

  /* ---------- flag rail: slow continuous rotation (replaces the slick column) ---------- */
  function flagRail(slider, onChange) {
    var F = window.MontelFlags || {}, n = MARKETS.length, COPIES = 3;
    var rail = document.createElement('div'); rail.className = 'mtl-flags';
    var track = document.createElement('div'); track.className = 'mtl-flags__track'; rail.appendChild(track);
    var items = [];
    for (var c = 0; c < COPIES; c++) MARKETS.forEach(function (M, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'mtl-flags__item';
      b.setAttribute('aria-label', M.name); b.innerHTML = '<span class="mtl-flags__flag">' + (F[M.code] || M.code) + '</span>';
      var j = items.length;
      b.addEventListener('click', function () { if (j !== pos) go(j, true); restart(); });
      track.appendChild(b); items.push(b);
    });
    slider.parentNode.insertBefore(rail, slider.nextSibling);
    slider.classList.add('mtl-hidden');
    var horizontal = false, slot = 74, pos = n, timer = 0, hover = false, visible = false;
    function measure() {
      horizontal = rail.clientWidth > rail.clientHeight * 1.4;
      rail.classList.toggle('is-h', horizontal);
      var it = items[0]; if (!it) return;
      var cs = getComputedStyle(it);
      slot = (horizontal ? it.offsetWidth + parseFloat(cs.marginLeft) + parseFloat(cs.marginRight) : it.offsetHeight + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom)) || 74;
      apply(false);
    }
    function apply(anim) {
      var view = horizontal ? rail.clientWidth : rail.clientHeight, off = view / 2 - (pos + .5) * slot;
      track.style.transition = anim && !reduce ? 'transform 1.1s cubic-bezier(.65,0,.35,1)' : 'none';
      track.style.transform = horizontal ? 'translate3d(' + off.toFixed(1) + 'px,0,0)' : 'translate3d(0,' + off.toFixed(1) + 'px,0)';
      items.forEach(function (b, j) { b.classList.toggle('is-active', j === pos); });
    }
    function go(p, anim) {
      pos = p; apply(anim); onChange(pos % n);
      if (pos >= n * 2 || pos < n) setTimeout(function () { pos = n + (pos % n); apply(false); }, reduce ? 0 : 1150);
    }
    function tick() { if (visible && !hover) go(pos + 1, true); }
    function restart() { clearInterval(timer); timer = setInterval(tick, 3600); }
    rail.addEventListener('mouseenter', function () { hover = true; });
    rail.addEventListener('mouseleave', function () { hover = false; });
    new IntersectionObserver(function (es) { visible = es[es.length - 1].isIntersecting; }, { threshold: .35 }).observe(rail);
    new ResizeObserver(function () { measure(); }).observe(rail);
    measure(); onChange(pos % n); if (!reduce) restart();
    return rail;
  }

  /* =========================================================
     2) Forecasting: system imbalance, live
     ========================================================= */
  function imbalanceVisual(box) {
    var W = 768, H = 538, m = Mount(box, W, H, 'mtl-ev--imb', 1), c = m.canvas;
    var card = div('mtl-ev__card', c, '<p class="mtl-ev__t">System imbalance</p><p class="mtl-ev__s">Germany · MW</p>', 'left:66px;top:66px;width:438px;height:406px');
    var svg = el('svg', { viewBox: '0 0 438 406', class: 'mtl-ev__plot' }); card.appendChild(svg);
    el('line', { x1: 36, x2: 402, y1: 121, y2: 121, class: 'mtl-ev__g2' }, svg);
    el('line', { x1: 36, x2: 402, y1: 279, y2: 279, class: 'mtl-ev__g2' }, svg);
    var N = 18, bw = 12, step = (402 - 36 - bw) / (N - 1), base = 201, bars = [];
    var g = el('g', {}, svg);
    for (var i = 0; i < N; i++) bars.push(el('rect', { x: 36 + i * step, width: bw, rx: 3, y: base, height: 0 }, g));
    el('line', { x1: 36, x2: 402, y1: base, y2: base, class: 'mtl-ev__zero' }, svg);
    var t1 = el('text', { x: 36, y: 318, class: 'mtl-ev__ax2' }, svg); t1.textContent = '12:00';
    var t2 = el('text', { x: 402, y: 318, class: 'mtl-ev__ax2', 'text-anchor': 'end' }, svg); t2.textContent = 'Now';
    div('mtl-ev__legend', card, '<span><i style="background:#0d7d6c"></i>Long</span><span><i style="background:#b9a6ff"></i>Short</span>');
    var chip = div('mtl-ev__state', c, '<p>System now</p><b class="st">Short</b><span class="mw">−420 MW</span>', 'left:478px;top:108px;width:226px;height:192px');
    var st = chip.querySelector('.st'), mw = chip.querySelector('.mw'), shown = -420;
    var r = rnd(4242), vals = [], v = 260, timer = 0;
    for (i = 0; i < N; i++) { v += (i < 5 ? 30 : -68) + (r() - .5) * 40; vals.push(v); }
    function render(animate) {
      var max = 520;
      bars.forEach(function (b, j) {
        var h = Math.min(1, Math.abs(vals[j]) / max) * 72, pos = vals[j] >= 0;
        b.style.transition = animate && !reduce ? 'all .7s cubic-bezier(.4,0,.2,1)' : 'none';
        b.setAttribute('y', pos ? base - h - 2 : base + 2); b.setAttribute('height', Math.max(2, h));
        b.setAttribute('class', pos ? 'mtl-ev__bar l' : 'mtl-ev__bar s');
      });
      var last = Math.round(vals[N - 1] / 10) * 10, long = last >= 0;
      chip.classList.toggle('is-long', long); st.textContent = long ? 'Long' : 'Short';
      tween(shown, last, animate ? 700 : 0, function (x) { var k = Math.round(x / 10) * 10; mw.textContent = (k >= 0 ? '+' : '−') + Math.abs(k) + ' MW'; });
      shown = last;
    }
    function tick() {
      var lastV = vals[N - 1], drift = lastV < -480 ? 70 : lastV > 380 ? -70 : (r() - .5) * 150;
      vals.shift(); vals.push(Math.max(-520, Math.min(520, lastV + drift)));
      render(true);
    }
    render(false);
    if (!reduce) bars.forEach(function (b, j) { b.style.opacity = 0; setTimeout(function () { b.style.transition = 'opacity .4s ease'; b.style.opacity = 1; }, 60 * j); });
    m.onShow = function () { if (!reduce && !timer) timer = setInterval(tick, 1600); };
    m.onHide = function () { clearInterval(timer); timer = 0; };
  }

  /* =========================================================
     3) Decision support: price scenarios
     ========================================================= */
  function scenarioVisual(box) {
    var W = 800, H = 560, m = Mount(box, W, H, 'mtl-ev--scn', 1.12), c = m.canvas;
    var card = div('mtl-ev__card', c, '<p class="mtl-ev__t">Price scenarios</p><p class="mtl-ev__s">Germany · EUR/MWh</p>', 'left:64px;top:100px;width:672px;height:394px');
    var svg = el('svg', { viewBox: '0 0 672 394', class: 'mtl-ev__plot' }); card.appendChild(svg);
    [122, 188, 254, 320].forEach(function (y) { el('line', { x1: 38, x2: 636, y1: y, y2: y, class: 'mtl-ev__g2' }, svg); });
    [['2030', 38, 'start'], ['2045', 337, 'middle'], ['2060', 636, 'end']].forEach(function (a) { var t = el('text', { x: a[1], y: 362, class: 'mtl-ev__ax2', 'text-anchor': a[2] }, svg); t.textContent = a[0]; });
    var S = [
      { k: 'gas', label: 'High gas', color: '#f0a52b', to: -96, shape: [0, .05, .12, .25, .45, .62, .74, .85, .93, 1] },
      { k: 'central', label: 'Central', color: '#0d7d6c', to: -28, shape: [0, .12, .22, .3, .42, .55, .7, .82, .92, 1] },
      { k: 'build', label: 'Fast build-out', color: '#063b3a', to: 50, shape: [0, .38, .55, .66, .76, .84, .9, .94, .97, 1] }
    ];
    var Y0 = 254;
    S.forEach(function (s) {
      s.g = el('g', { class: 'mtl-ev__scn' }, svg);
      s.path = el('path', { class: 'mtl-ev__sl', stroke: s.color }, s.g);
      s.dot = el('circle', { r: 7, fill: s.color, cx: 636 }, s.g);
      s.ring = el('circle', { r: 7, fill: 'none', stroke: s.color, class: 'mtl-ev__ring', cx: 636 }, s.g);
      s.txt = el('text', { x: 628, class: 'mtl-ev__sl-t', fill: s.color, 'text-anchor': 'end' }, s.g); s.txt.textContent = s.label;
    });
    var chips = div('mtl-ev__chips', c, '<span class="mtl-ev__c mtl-ev__c--gas" data-k="gas">' + ICONS.carbon + 'Gas</span><span class="mtl-ev__c mtl-ev__c--build" data-k="build"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/></svg>Build-out</span>', 'left:334px;top:32px;width:392px;height:96px');
    var r = rnd(777);
    function shape(s, jitter) {
      var pts = s.shape.map(function (f, i) { var x = 38 + i * (598 / (s.shape.length - 1)); var y = Y0 + s.to * f + (i && i < s.shape.length - 1 ? (r() - .5) * jitter : 0); return [x, y]; });
      s.path.setAttribute('d', smooth(pts)); var end = pts[pts.length - 1][1];
      s.dot.setAttribute('cy', end); s.ring.setAttribute('cy', end); s.txt.setAttribute('y', end - 18);
    }
    S.forEach(function (s, i) { shape(s, 0); draw(s.path, 1500, 150 * i); });
    var phase = 0, timer = 0;
    function focus(k) {
      S.forEach(function (s) { s.g.classList.toggle('is-dim', !!k && s.k !== k && s.k !== 'central'); s.g.classList.toggle('is-on', s.k === k); });
      [].slice.call(chips.querySelectorAll('.mtl-ev__c')).forEach(function (ch) { ch.classList.toggle('is-on', ch.getAttribute('data-k') === k); });
    }
    function tick() {
      phase = (phase + 1) % 3; var k = phase === 1 ? 'gas' : phase === 2 ? 'build' : null;
      if (k) { var s = S.filter(function (x) { return x.k === k; })[0]; s.to = k === 'gas' ? -96 - r() * 16 : 50 + r() * 10; shape(s, 10); }
      focus(k);
    }
    m.onShow = function () { if (!reduce && !timer) timer = setInterval(tick, 2600); };
    m.onHide = function () { clearInterval(timer); timer = 0; };
  }

  /* ---------------- mount into the ecosystem cards ---------------- */
  function boot() {
    var api = {};
    var center = document.querySelector('.eco_country__center');
    var card = document.querySelector('.eco2__country');
    if (center && !center.querySelector('.mtl-ev')) {
      center.classList.add('has-mtl-ev');
      api.market = marketVisual(center);
    }
    if (card && !card.querySelector('.mtl-ev-map')) {
      card.classList.add('has-mtl-map');
      api.map = europeMap(card, function () {
        var cr = card.getBoundingClientRect(), r = center ? center.getBoundingClientRect() : null;
        if (!r || !r.width) return { x: cr.width * .55, y: cr.height * .58 };
        return { x: r.left - cr.left + r.width * .38, y: cr.height * .6 };
      });
    }
    function setMarket(i) {
      var M = MARKETS[i]; if (!M) return;
      if (api.market) api.market.setMarket(i);
      if (api.map) api.map.setActive(M.code, M.name, M.power);
      try { document.dispatchEvent(new CustomEvent('mtl:market', { detail: { index: i, market: M.code } })); } catch (e) {}
    }
    var thumbs = document.querySelector('.eco2__country_thumb_slider');
    if (thumbs && !document.querySelector('.mtl-flags')) flagRail(thumbs, setMarket); else setMarket(0);
    var media = document.querySelector('.ecosystem__card2_media');
    if (media && !media.querySelector('.mtl-ev')) { media.classList.add('has-mtl-ev'); imbalanceVisual(media); }
    var strat = document.querySelector('.ecosystem__strategy_media');
    if (strat && !strat.querySelector('.mtl-ev')) { strat.classList.add('has-mtl-ev'); scenarioVisual(strat); }
    window.MontelEco = window.MontelEco || {};
    window.MontelEco.setMarket = function (key) {
      var i = typeof key === 'number' ? key : -1, k = String(key || '').toUpperCase();
      if (i < 0) MARKETS.forEach(function (M, j) { if (M.code === k) i = j; });
      if (i >= 0) setMarket(i);
    };
    window.MontelEco.markets = MARKETS.map(function (M) { return M.code; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
