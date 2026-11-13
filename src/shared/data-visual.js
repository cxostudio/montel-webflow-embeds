/* =========================================================
   Montel · "Signal from noise" (stats bar visual, homepage + Data page)
   Scattered market data (dots) snaps into one flowing curve as
   the section scrolls in. Pulses travel along it; the cursor
   scatters nearby dots. Four nodes under the stats light up as
   each number finishes counting (event: mtl:stat).
   Replaces the previous radial-lines canvas (#stripeCanvas).
   ========================================================= */
(function () {
  'use strict';
  var host = document.getElementById('visual') || document.querySelector('.data__aniimation');
  if (!host) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* stop the old animation loop before its next frame, then remove its canvas */
  var nativeRaf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function (cb) {
    if (cb && cb.name === 'frame') { var src = String(cb); if (src.indexOf('p.hover') > -1 && src.indexOf('p.len') > -1) return 0; }
    return nativeRaf(cb);
  };
  var old = document.getElementById('stripeCanvas'); if (old) old.style.display = 'none';

  var cv = document.createElement('canvas'); cv.className = 'mtl-signal'; cv.setAttribute('aria-hidden', 'true');
  host.appendChild(cv);
  var ctx = cv.getContext('2d');
  var links = true, W = 0, H = 0, dpr = 1, dots = [], N = 0, markers = [], visible = false, raf = 0, last = 0, clock = 0;
  var form = reduce ? 1 : 0, formTarget = reduce ? 1 : 0, mouse = { x: -1e4, y: -1e4, on: false }, pulses = [], nextPulse = 2;
  var lit = [0, 0, 0, 0], litT = [-1, -1, -1, -1];

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }
  function curveY(u, t) {
    /* rising forward curve with a slow breathing season */
    var base = H * (.70 - .30 * u);
    var season = Math.sin(u * Math.PI * 2 * 1.35 + .7 + t * .18) * H * .075;
    var ripple = Math.sin(u * Math.PI * 2 * 4.2 + t * .5) * H * .018;
    return base + season + ripple;
  }

  function build() {
    var r = host.getBoundingClientRect(), wrap = host.closest('.container') || host, cr = wrap.getBoundingClientRect();
    /* draw across the full page grid, not just the centred visual box */
    W = cr.width || r.width; H = r.height; if (!W || !H) return;
    cv.style.left = (cr.left - r.left) + 'px'; cv.style.right = 'auto';
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    N = Math.round(Math.min(1300, Math.max(520, W * 1.05)));
    dots = [];
    for (var i = 0; i < N; i++) {
      var s = Math.random(), strand = s < .58 ? 0 : s < .79 ? 1 : 2;
      dots.push({
        u: Math.random(), strand: strand,
        off: (strand === 0 ? gauss() * 6 : strand === 1 ? 22 + gauss() * 8 : -20 + gauss() * 8),
        nx: Math.random() * W, ny: Math.random() * H, ph: Math.random() * 6.283, sp: rnd(.15, .45),
        r: strand === 0 ? rnd(1.3, 2.6) : rnd(.9, 1.7), a: strand === 0 ? rnd(.6, 1) : rnd(.25, .5),
        c: Math.random() < .2 ? 1 : 0, dx: 0, dy: 0
      });
    }
    /* markers sit under the four stat numbers */
    var hr = cv.getBoundingClientRect();
    var nums = [].slice.call(document.querySelectorAll('.data__grid h3')).filter(function (e) { return /\d/.test(e.textContent); }).slice(0, 4);
    markers = nums.map(function (e) { var b = e.getBoundingClientRect(); return Math.min(.97, Math.max(.03, (b.left + 18 - hr.left) / W)); });
    /* stacked stats (phone): spread the nodes evenly and drop the links up to the numbers */
    links = markers.length === 4 && (Math.max.apply(null, markers) - Math.min.apply(null, markers)) > .3;
    if (!links) markers = [.14, .38, .62, .86];
    draw(0);
  }

  function updateForm() {
    var r = host.getBoundingClientRect(), vh = window.innerHeight;
    /* 0 when the visual's top reaches the bottom of the viewport, 1 when its centre reaches 62% */
    /* plays once by itself as soon as a third of the visual is on screen */
    if (reduce || (vh - r.top) > r.height * .33) formTarget = 1;
  }

  function draw(dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    form += (formTarget - form) * Math.min(1, dt * 1.5);
    var t = clock, R = Math.min(140, W * .14);

    /* vertical links from lit markers up to their numbers */
    markers.forEach(function (u, k) {
      var l = lit[k]; if (l <= 0 || !links) return;
      var x = u * W, y = curveY(u, t);
      var g = ctx.createLinearGradient(x, 0, x, y);
      g.addColorStop(0, 'rgba(23,162,135,0)'); g.addColorStop(1, 'rgba(23,162,135,' + (.35 * l).toFixed(3) + ')');
      ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y - 8); ctx.stroke();
    });

    if (form > .05) {
      ctx.beginPath();
      for (var q = 0; q <= 60; q++) { var uu = q / 60, yy = curveY(uu, t); if (q) ctx.lineTo(uu * W, yy); else ctx.moveTo(0, yy); }
      ctx.strokeStyle = 'rgba(23,162,135,' + (.10 * form).toFixed(3) + ')'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.stroke();
      ctx.strokeStyle = 'rgba(13,125,108,' + (.28 * form).toFixed(3) + ')'; ctx.lineWidth = 1.2; ctx.stroke();
    }
    for (var i = 0; i < N; i++) {
      var d = dots[i];
      if (!reduce) d.u += d.sp * .012 * dt * (d.strand === 0 ? 1 : .8);
      if (d.u > 1) d.u -= 1;
      var sx = d.u * W, sy = curveY(d.u, t) + d.off;
      var nx = d.nx + Math.sin(t * d.sp + d.ph) * 18, ny = d.ny + Math.cos(t * d.sp * .8 + d.ph) * 14;
      /* sweep left to right: dots on the left settle first */
      var k = Math.max(0, Math.min(1, form * 1.5 - (d.nx / W) * .5)), e = k * k * (3 - 2 * k);
      var x = nx + (sx - nx) * e, y = ny + (sy - ny) * e;
      /* cursor scatters, springs back */
      if (mouse.on) {
        var ddx = x - mouse.x, ddy = y - mouse.y, dist = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dist < R && dist > .1) { var f = (1 - dist / R); f *= f * 26; d.dx += (ddx / dist * f - d.dx) * .2; d.dy += (ddy / dist * f - d.dy) * .2; }
      }
      d.dx *= .9; d.dy *= .9; x += d.dx; y += d.dy;
      var edge = Math.min(1, Math.min(d.u, 1 - d.u) / .06), alpha = (.22 + (d.a - .22) * e) * (e > .5 ? (.25 + .75 * edge) : 1);
      ctx.fillStyle = d.c ? 'rgba(23,100,154,' + alpha.toFixed(3) + ')' : 'rgba(17,140,130,' + alpha.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(x, y, d.r, 0, 6.2832); ctx.fill();
    }

    /* pulses travelling along the formed curve */
    if (form > .9 && !reduce) {
      nextPulse -= dt;
      if (nextPulse <= 0) { pulses.push({ u: -.05, v: rnd(.09, .14) }); nextPulse = rnd(2.2, 3.6); }
      pulses = pulses.filter(function (p) { p.u += p.v * dt; return p.u < 1.08; });
      pulses.forEach(function (p) {
        for (var j = 0; j < 14; j++) {
          var u = p.u - j * .006; if (u < 0 || u > 1) continue;
          var x = u * W, y = curveY(u, t), a = (1 - j / 14) * .9;
          ctx.fillStyle = 'rgba(48,222,210,' + a.toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(x, y, 2.6 - j * .12, 0, 6.2832); ctx.fill();
        }
        var gx = p.u * W, gy = curveY(Math.min(1, Math.max(0, p.u)), t), gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, 26);
        gg.addColorStop(0, 'rgba(48,222,210,.35)'); gg.addColorStop(1, 'rgba(48,222,210,0)');
        ctx.fillStyle = gg; ctx.fillRect(gx - 26, gy - 26, 52, 52);
      });
    }

    /* stat markers */
    markers.forEach(function (u, k) {
      var target = litT[k] >= 0 && form > .85 ? 1 : 0;
      lit[k] += (target - lit[k]) * Math.min(1, dt * 4);
      var x = u * W, y = curveY(u, t), l = lit[k];
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = 'rgba(13,125,108,' + ((.45 + .55 * l) * Math.min(1, form * 1.2)).toFixed(3) + ')'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(x, y, 6 + 2.5 * l, 0, 6.2832); ctx.fill(); ctx.stroke();
      if (l > .05) {
        ctx.fillStyle = 'rgba(13,125,108,' + l.toFixed(3) + ')'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 6.2832); ctx.fill();
        var ph = reduce ? 0 : ((t * .5 + k * .25) % 1);
        ctx.strokeStyle = 'rgba(23,162,135,' + ((1 - ph) * .45 * l).toFixed(3) + ')'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(x, y, 7 + ph * 18, 0, 6.2832); ctx.stroke();
      }
    });
  }

  function loop(now) {
    raf = 0;
    var dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now; clock += dt;
    updateForm(); draw(dt);
    if (visible && !reduce) raf = nativeRaf(loop);
  }
  function kick() { if (!raf && visible) { last = 0; raf = nativeRaf(loop); } }

  host.addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true; });
  host.addEventListener('pointerleave', function () { mouse.on = false; });
  document.addEventListener('mtl:stat', function (e) { var k = e.detail && e.detail.index; if (k >= 0 && k < 4) { litT[k] = clock; if (reduce) { lit[k] = 1; draw(0); } } });
  new IntersectionObserver(function (es) { visible = es[es.length - 1].isIntersecting; if (visible) { if (reduce) { updateForm(); draw(1); } kick(); } }, { threshold: 0 }).observe(host);
  var rt; new ResizeObserver(function () { clearTimeout(rt); rt = setTimeout(function () { build(); kick(); }, 80); }).observe(host);
  window.addEventListener('scroll', function () { if (visible) kick(); }, { passive: true });
  build();
})();
