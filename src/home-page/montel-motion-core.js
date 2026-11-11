/* =========================================================
   Montel Motion · core  (v1.0)
   Shared runtime for the hero slides. Load once per page,
   after GSAP and before the slide scripts.

   - Scales each 1600x1029 slide canvas to its container
   - Plays a slide when it becomes visible (tab switch),
     resets it when hidden, pauses it when off screen
   - Shared entry motion: cards emerge from the centre
   - Subtle pointer parallax on [data-depth] layers
   - prefers-reduced-motion: simple fades, no idle loops
   - No GSAP on the page: everything is shown statically
   ========================================================= */
(function () {
  'use strict';
  if (window.MontelMotion) return;

  var W = 1600, H = 1029, NS = 'http://www.w3.org/2000/svg';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && matchMedia('(pointer: fine)').matches;
  var registry = {};
  var instances = [];

  /* ---------------- helpers (exposed to slides) ---------------- */
  var h = {
    $: function (s, r) { return (r || document).querySelector(s); },
    $$: function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); },
    svg: function (tag, attrs, parent) {
      var e = document.createElementNS(NS, tag);
      for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(e);
      return e;
    },
    r1: function (n) { return Math.round(n * 10) / 10; },
    /* Catmull-Rom spline through points -> cubic bezier path */
    smooth: function (p, move) {
      var r1 = h.r1, d = (move === false ? 'L' : 'M') + r1(p[0][0]) + ',' + r1(p[0][1]);
      for (var i = 0; i < p.length - 1; i++) {
        var p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
        d += ' C' + r1(p1[0] + (p2[0] - p0[0]) / 6) + ',' + r1(p1[1] + (p2[1] - p0[1]) / 6) +
             ' ' + r1(p2[0] - (p3[0] - p1[0]) / 6) + ',' + r1(p2[1] - (p3[1] - p1[1]) / 6) +
             ' ' + r1(p2[0]) + ',' + r1(p2[1]);
      }
      return d;
    },
    /* Sample a smooth curve through key points [[x,v],...] at a fixed step */
    sample: function (keys, from, to, step, noise, seed) {
      var rnd = h.rng(seed || 7), out = [];
      for (var x = from; x <= to + 1e-9; x += step) {
        var i = 0; while (i < keys.length - 2 && keys[i + 1][0] < x) i++;
        var k0 = keys[i - 1] || keys[i], k1 = keys[i], k2 = keys[i + 1], k3 = keys[i + 2] || k2;
        var t = Math.max(0, Math.min(1, (x - k1[0]) / ((k2[0] - k1[0]) || 1)));
        var t2 = t * t, t3 = t2 * t;
        var v = .5 * ((2 * k1[1]) + (-k0[1] + k2[1]) * t + (2 * k0[1] - 5 * k1[1] + 4 * k2[1] - k3[1]) * t2 + (-k0[1] + 3 * k1[1] - 3 * k2[1] + k3[1]) * t3);
        out.push([x, v + (noise ? (rnd() - .5) * noise : 0)]);
      }
      return out;
    },
    rng: function (seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    /* value of a sampled series at x */
    at: function (series, x) {
      for (var i = 0; i < series.length - 1; i++) {
        if (series[i + 1][0] >= x) {
          var a = series[i], b = series[i + 1], t = (x - a[0]) / ((b[0] - a[0]) || 1);
          return a[1] + (b[1] - a[1]) * t;
        }
      }
      return series[series.length - 1][1];
    },
    /* Format a [data-to] counter element */
    fmt: function (el, v) {
      var t = el.getAttribute('data-to');
      var dec = el.hasAttribute('data-dec') ? +el.getAttribute('data-dec') : ((t.split('.')[1] || '').length);
      var s = Math.abs(v).toFixed(dec);
      if (el.hasAttribute('data-sep')) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      var sign = v < 0 && +s !== 0 ? '-' : (el.hasAttribute('data-plus') && v > 0 ? '+' : '');
      el.textContent = (el.getAttribute('data-prefix') || '') + sign + s + (el.getAttribute('data-suffix') || '');
    },
    /* Animate every [data-to] counter inside scope */
    counters: function (scope, tl, at, dur) {
      h.$$('[data-to]', scope).forEach(function (el) {
        var o = { v: el.hasAttribute('data-from') ? +el.getAttribute('data-from') : 0 };
        h.fmt(el, o.v);
        tl.to(o, { v: +el.getAttribute('data-to'), duration: reduce ? .01 : (dur || 1.4), ease: 'power2.out', onUpdate: function () { h.fmt(el, o.v); } }, at);
      });
    },
    /* Stroke draw-in for a path */
    draw: function (path, tl, at, dur, ease) {
      var len = path.getTotalLength();
      gsap.set(path, { strokeDasharray: len + ' ' + len, strokeDashoffset: len });
      tl.to(path, { strokeDashoffset: 0, duration: reduce ? .01 : dur, ease: ease || 'power2.inOut',
        onComplete: function () { gsap.set(path, { strokeDasharray: 'none', strokeDashoffset: 0 }); } }, at);
    },
    /* Move a segmented-toggle knob to item idx */
    seg: function (seg, idx, instant) {
      var items = h.$$(':scope > span', seg), knob = seg.querySelector(':scope > i'), it = items[idx];
      items.forEach(function (x, i) { x.classList.toggle('is-on', i === idx); });
      if (!knob || !it) return;
      if (instant || !window.gsap) { knob.style.transform = 'translateX(' + it.offsetLeft + 'px)'; knob.style.width = it.offsetWidth + 'px'; return; }
      gsap.to(knob, { x: it.offsetLeft, width: it.offsetWidth, duration: .55, ease: 'power3.inOut' });
    },
    flash: function (el, up) {
      el.classList.remove('mtl-flash-up', 'mtl-flash-down'); void el.offsetWidth;
      el.classList.add(up ? 'mtl-flash-up' : 'mtl-flash-down');
    }
  };

  /* ---------------- slide instance ---------------- */
  function Slide(root) {
    this.root = root;
    this.name = root.getAttribute('data-mtl-slide');
    this.canvas = root.querySelector('.mtl-canvas');
    this.playing = false;
    this.onscreen = true;
    this.loops = [];
    this.cleanup = null;
    this.tl = null;
    var self = this;

    this.ro = new ResizeObserver(function () { self.fit(); self.check(); });
    this.ro.observe(root);
    this.mo = new MutationObserver(function () { self.check(); });
    this.mo.observe(root, { attributes: true, attributeFilter: ['class', 'style'] });
    /* watch the wrappers the tab script is likely to toggle */
    for (var el = root.parentElement, n = 0; el && n < 3; el = el.parentElement, n++) {
      this.mo.observe(el, { attributes: true, attributeFilter: ['class', 'style'] });
      el.addEventListener('transitionend', function () { self.check(); });
    }
    this.io = new IntersectionObserver(function (e) {
      self.onscreen = e[e.length - 1].isIntersecting;
      if (self.tl) self.onscreen ? self.tl.resume() : self.tl.pause();
    }, { threshold: .1 });
    this.io.observe(root);

    if (!reduce && finePointer) this.parallax();
    this.fit();
    if (window.gsap) this.hide(); else this.showStatic();
    this.check();
  }

  /* Scale the canvas to the container. Below the breakpoint, a slide with
     data-mtl-crop="x,y,w,h" shows only that region (its main card). */
  Slide.prototype.fit = function () {
    var r = this.root, w = r.clientWidth;
    if (!w) return;
    var crop = r.getAttribute('data-mtl-crop'), bp = +(r.getAttribute('data-mtl-breakpoint') || 640);
    if (crop && w < bp) {
      var c = crop.split(',').map(Number);
      r.classList.add('is-cropped');
      r.style.aspectRatio = c[2] + ' / ' + c[3];
      r.style.setProperty('--mtl-s', (w / c[2]).toFixed(5));
      r.style.setProperty('--mtl-x', -c[0] + 'px');
      r.style.setProperty('--mtl-y', -c[1] + 'px');
    } else {
      r.classList.remove('is-cropped');
      r.style.aspectRatio = '';
      r.style.setProperty('--mtl-s', (w / W).toFixed(5));
      r.style.removeProperty('--mtl-x'); r.style.removeProperty('--mtl-y');
    }
  };

  Slide.prototype.visible = function () {
    var r = this.root;
    if (!r.offsetWidth || !r.offsetHeight) return false;
    var cs = getComputedStyle(r);
    if (cs.visibility === 'hidden' || +cs.opacity < .05) return false;
    var p = r.parentElement;
    if (p && +getComputedStyle(p).opacity < .05) return false;
    return true;
  };

  Slide.prototype.check = function () {
    var self = this, v = this.visible();
    clearTimeout(this._poll);
    if (v && !this.playing && registry[this.name]) this.play();
    else if (!v && this.playing) this.stop();
    /* laid out but faded out: the tab may be cross-fading in, look again shortly */
    if (!v && this.root.offsetWidth && (this._tries = (this._tries || 0) + 1) < 12) {
      this._poll = setTimeout(function () { self.check(); }, 120);
    }
    if (v) this._tries = 0;
  };

  Slide.prototype.cards = function () {
    return h.$$('.mtl-card, .mtl-pop', this.canvas)
      .filter(function (c) { return c.hasAttribute('data-order'); })
      .sort(function (a, b) { return a.getAttribute('data-order') - b.getAttribute('data-order'); });
  };

  Slide.prototype.hide = function () {
    gsap.set(this.cards(), { autoAlpha: 0 });
    gsap.set(h.$$('.mtl-photo', this.canvas), { autoAlpha: 0 });
  };

  Slide.prototype.showStatic = function () {
    h.$$('.mtl-card, .mtl-photo, .mtl-pop', this.canvas).forEach(function (c) { c.style.visibility = 'visible'; });
    h.$$('.mtl-seg', this.canvas).forEach(function (s) { h.seg(s, Math.max(0, h.$$(':scope > span', s).findIndex(function (x) { return x.classList.contains('is-on'); })), true); });
  };

  Slide.prototype.loop = function (fn, every, delay) {
    if (reduce) return;
    var self = this, dc;
    var run = function () { if (self.onscreen) fn(); dc = gsap.delayedCall(every, run); self.loops.push(dc); };
    dc = gsap.delayedCall(delay != null ? delay : every, run);
    this.loops.push(dc);
  };

  Slide.prototype.play = function () {
    if (!window.gsap) { this.showStatic(); return; }
    this.playing = true;
    var self = this, canvas = this.canvas;
    var tl = this.tl = gsap.timeline({ paused: !this.onscreen, defaults: { ease: 'power3.out' } });

    /* photos: soft Ken Burns in */
    h.$$('.mtl-photo', canvas).forEach(function (p, i) {
      tl.fromTo(p, { autoAlpha: 0, scale: reduce ? 1 : 1.06 },
        { autoAlpha: 1, scale: 1, duration: reduce ? .4 : 1.6, ease: 'power2.out' }, i * .08);
    });

    /* cards: emerge from the centre of the composition */
    var cards = this.cards();
    cards.forEach(function (c) {
      var box = c.getBoundingClientRect(), cv = canvas.getBoundingClientRect(), s = cv.width / W || 1;
      var cx = (box.left - cv.left + box.width / 2) / s, cy = (box.top - cv.top + box.height / 2) / s;
      c._dx = (W / 2 - cx) * .35; c._dy = (H / 2 - cy) * .35;
    });
    tl.fromTo(cards,
      reduce ? { autoAlpha: 0 } : { autoAlpha: 0, x: function (i) { return cards[i]._dx; }, y: function (i) { return cards[i]._dy; }, scale: .88, filter: 'blur(8px)' },
      { autoAlpha: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)', duration: reduce ? .4 : 1.15, ease: 'expo.out', stagger: .14, clearProps: 'filter' }, .15);

    var fn = registry[this.name];
    this.cleanup = fn({
      root: this.root, canvas: canvas, tl: tl, h: h, reduce: reduce,
      loop: function (f, every, delay) { self.loop(f, every, delay); }
    }) || null;
  };

  Slide.prototype.stop = function () {
    this.playing = false;
    if (this.tl) { this.tl.kill(); this.tl = null; }
    this.loops.forEach(function (d) { d.kill(); }); this.loops = [];
    if (typeof this.cleanup === 'function') this.cleanup();
    this.cleanup = null;
    if (window.gsap) { gsap.killTweensOf(h.$$('*', this.canvas)); this.hide(); }
  };

  Slide.prototype.replay = function () { this.stop(); this.play(); };

  Slide.prototype.parallax = function () {
    if (!window.gsap) return;
    var layers = h.$$('[data-depth]', this.canvas).map(function (l) {
      return { d: +l.getAttribute('data-depth'), x: gsap.quickTo(l, 'x', { duration: 1, ease: 'power3.out' }), y: gsap.quickTo(l, 'y', { duration: 1, ease: 'power3.out' }) };
    });
    var root = this.root;
    root.addEventListener('pointermove', function (e) {
      var r = root.getBoundingClientRect();
      var nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5;
      layers.forEach(function (l) { l.x(-nx * l.d); l.y(-ny * l.d); });
    });
    root.addEventListener('pointerleave', function () { layers.forEach(function (l) { l.x(0); l.y(0); }); });
  };

  /* ---------------- public API ---------------- */
  function init(scope) {
    h.$$('[data-mtl-slide]', scope || document).forEach(function (root) {
      if (root._mtl) return;
      root._mtl = new Slide(root);
      instances.push(root._mtl);
    });
  }

  window.MontelMotion = {
    version: '1.0.0',
    helpers: h,
    register: function (name, fn) {
      registry[name] = fn;
      instances.forEach(function (s) { if (s.name === name) s.check(); });
    },
    init: init,
    replay: function (name) { instances.forEach(function (s) { if (!name || s.name === name) s.replay(); }); },
    instances: instances
  };

  if (!window.gsap) {
    document.documentElement.classList.remove('mtl-js');
    if (window.console) console.warn('[MontelMotion] GSAP not found: slides are shown statically.');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); });
  else init();
})();
