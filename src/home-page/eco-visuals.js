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
    new ResizeObserver(fit).observe(root); fit();
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
     1) Market insights: exchange prices + carbon / gas / power
     ========================================================= */
  var MARKETS = [
    { code: 'US', name: 'United States', base: 48, swing: 46, carbon: 68.95, gas: 31.28, power: 72.45, c: .8, g: 1.1, p: 2.3 },
    { code: 'UK', name: 'United Kingdom', base: 74, swing: 52, carbon: 41.60, gas: 34.10, power: 86.20, c: -.6, g: 1.8, p: 3.1 },
    { code: 'AU', name: 'Australia', base: 62, swing: 70, carbon: 34.20, gas: 12.85, power: 94.70, c: .4, g: -.9, p: 4.6 },
    { code: 'AT', name: 'Austria', base: 82, swing: 58, carbon: 68.95, gas: 33.40, power: 91.35, c: .8, g: 1.4, p: -1.2 },
    { code: 'BR', name: 'Brazil', base: 40, swing: 30, carbon: 22.10, gas: 41.75, power: 58.90, c: 1.6, g: .7, p: 1.9 },
    { code: 'BE', name: 'Belgium', base: 79, swing: 61, carbon: 68.95, gas: 32.95, power: 88.10, c: .8, g: 1.2, p: 2.7 },
    { code: 'CA', name: 'Canada', base: 44, swing: 38, carbon: 52.40, gas: 9.70, power: 61.25, c: .5, g: -1.4, p: 1.1 }
  ];
  var ICONS = {
    carbon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21c-3.6 0-6-2.5-6-5.8 0-3.6 3.2-5.6 3.8-9.2 2.4 1.6 3.6 3.6 3.4 6 1-.6 1.6-1.6 1.8-2.8 1.8 1.6 3 3.6 3 6 0 3.3-2.4 5.8-6 5.8z"/></svg>',
    gas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19c3-4 6-7 10-9"/></svg>',
    power: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>'
  };

  function marketVisual(box) {
    var W = 1394, H = 896, m = Mount(box, W, H, 'mtl-ev--market', 1);
    var c = m.canvas;
    div('mtl-ev__glass', c, null, 'left:350px;top:52px;width:843px;height:843px');
    var dark = div('mtl-ev__dark', c, null, 'left:437px;top:179px;width:585px;height:585px');
    var title = div('mtl-ev__dark-t', dark, 'Exchange prices · EUR/MWh');
    var mk = div('mtl-ev__dark-m', dark, '');
    var svg = el('svg', { viewBox: '0 0 585 585', class: 'mtl-ev__plot' }); dark.appendChild(svg);
    var X0 = 86, X1 = 545, Y0 = 130, Y1 = 487, MAXV = 160;
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
      return { el: e, v: e.querySelector('.v'), pc: e.querySelector('.pc'), ar: e.querySelector('.ar'), s: e.querySelector('.s'), f: e.querySelector('.f'), val: 0 };
    }
    var chips = { carbon: chip('carbon', 'Carbon', 726, 0, '#e07a1f'), gas: chip('gas', 'Gas', 0, 430, '#a14be8'), power: chip('power', 'Power', 794, 672, '#0d6d5c') };

    var series = [], idx = 0, raf = 0, cur = 0;
    function build(mi) {
      var M = MARKETS[mi], r = rnd(mi * 97 + 13), n = 64; series = [];
      for (var i = 0; i < n; i++) {
        var t = i / (n - 1), day = Math.sin(t * Math.PI * 3 - .6);
        var spike = Math.exp(-Math.pow((t - .32) * 9, 2)) * 1.25 + Math.exp(-Math.pow((t - .55) * 14, 2)) * .55 - Math.exp(-Math.pow((t - .62) * 12, 2)) * .5;
        var v = M.base + M.swing * (.25 * day + spike) + (r() - .5) * 6;
        series.push(Math.max(8, Math.min(MAXV - 6, v)));
      }
      function pts(off) { return series.map(function (v, i) { return [X0 + (i / (n - 1)) * (X1 - X0), Y1 - ((v + off(i)) / MAXV) * (Y1 - Y0)]; }); }
      var spread = function (k) { return function (i) { return k * (2.5 + Math.abs(series[i] - M.base) * .12); }; };
      var pAsk = pts(spread(1)), pLast = pts(function () { return 0; }), pBid = pts(spread(-1));
      lines.ask.setAttribute('d', smooth(pAsk)); lines.last.setAttribute('d', smooth(pLast)); lines.bid.setAttribute('d', smooth(pBid));
      area.setAttribute('d', smooth(pLast) + ' L' + X1 + ' ' + Y1 + ' L' + X0 + ' ' + Y1 + 'Z');
      draw(lines.bid, 1300, 0); draw(lines.last, 1300, 120); draw(lines.ask, 1300, 240);
      mk.textContent = M.name;
      ['carbon', 'gas', 'power'].forEach(function (k, j) {
        var ch = chips[k], to = M[k], pct = M[k === 'carbon' ? 'c' : k === 'gas' ? 'g' : 'p'];
        tween(ch.val, to, 900, function (v) { ch.v.textContent = fmt(v); }); ch.val = to;
        ch.pc.textContent = (Math.abs(pct)).toFixed(1).replace('.', ',') + ' %';
        ch.ar.innerHTML = pct >= 0 ? '&#8599;' : '&#8600;';
        var rr = rnd(mi * 31 + j * 7 + 1), y = 30, sp = [];
        for (var i = 0; i < 18; i++) { y += (rr() - .45 - (pct < 0 ? .1 : 0)) * 14; y = Math.max(8, Math.min(52, y)); sp.push([i * (200 / 17), 60 - y]); }
        var d = smooth(sp); ch.s.setAttribute('d', d); ch.f.setAttribute('d', d + ' L200 60 L0 60Z'); draw(ch.s, 1100, 200 + j * 120);
      });
    }
    function valAt(p) { var f = p * (series.length - 1), i = Math.floor(f), t = f - i; var a = series[i], b = series[Math.min(series.length - 1, i + 1)]; return a + (b - a) * t; }
    function place(p) {
      var x = X0 + p * (X1 - X0), v = valAt(p), y = Y1 - (v / MAXV) * (Y1 - Y0);
      cursor.setAttribute('x1', x); cursor.setAttribute('x2', x); dot.setAttribute('cx', x); dot.setAttribute('cy', y);
      var M = MARKETS[idx], sp = 2.5 + Math.abs(v - M.base) * .12;
      var mins = Math.round(p * 2 * 24 * 60 / 30) * 30, day = 7 + Math.floor(mins / 1440), hm = mins % 1440;
      var hh = ('0' + Math.floor(hm / 60)).slice(-2), mm = ('0' + hm % 60).slice(-2);
      tip.querySelector('.mtl-ev__tip-t').textContent = (day === 7 ? 'Tue' : 'Wed') + ' ' + day + ' May ' + hh + ':' + mm;
      tip.querySelector('.va').textContent = fmt(v + sp); tip.querySelector('.vl').textContent = fmt(v); tip.querySelector('.vb').textContent = fmt(v - sp);
      var tx = 437 + x + 30, ty = 179 + y - 90; if (tx > 1080) tx = 437 + x - 330;
      tip.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + Math.max(190, Math.min(560, ty)).toFixed(1) + 'px)';
    }
    function loop(t) { cur = (t / 14000) % 1; place(.08 + cur * .86); raf = requestAnimationFrame(loop); }
    m.onShow = function () { if (!reduce && !raf) raf = requestAnimationFrame(loop); };
    m.onHide = function () { cancelAnimationFrame(raf); raf = 0; };
    build(0); place(.62);
    return {
      setMarket: function (key) {
        var i = typeof key === 'number' ? key : -1;
        if (i < 0) { var k = String(key || '').toUpperCase(); MARKETS.forEach(function (M, j) { if (M.code === k || M.name.toUpperCase() === k) i = j; }); }
        if (i < 0 || i >= MARKETS.length || i === idx) return; idx = i; build(i); if (reduce) place(.62);
      }
    };
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
    if (center && !center.querySelector('.mtl-ev')) {
      center.classList.add('has-mtl-ev');
      api.market = marketVisual(center);
    }
    var media = document.querySelector('.ecosystem__card2_media');
    if (media && !media.querySelector('.mtl-ev')) { media.classList.add('has-mtl-ev'); imbalanceVisual(media); }
    var strat = document.querySelector('.ecosystem__strategy_media');
    if (strat && !strat.querySelector('.mtl-ev')) { strat.classList.add('has-mtl-ev'); scenarioVisual(strat); }
    window.MontelEco = window.MontelEco || {};
    window.MontelEco.setMarket = function (key, index) { if (api.market) api.market.setMarket(typeof index === 'number' ? index : key); };
    window.MontelEco.markets = MARKETS.map(function (M) { return M.code; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
