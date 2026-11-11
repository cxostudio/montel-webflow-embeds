/* =========================================================
   Montel · News hero  (v1.0)
   No dependencies. One rAF loop that only runs on screen.

   Story: the cards come in, the reporter goes on air (muted
   loop) and the lower third slides in. The wire card then
   files a new real headline every few seconds, some of them
   switching into another language the newsroom publishes in.
   The podcast waveform plays and the video snippet progresses.
   Hover the wire card to pause it.
   ========================================================= */
(function () {
  'use strict';
  if (window.MontelNews) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';

  /* Headlines from the Montel News wire (montelnews.com). Translations are drafts for the newsroom to check. */
  var WIRE = [
    { c: 'Power', r: 'DE', m: 4, t: 'German power futures rise on cold outlook, low storage', l: ['Deutsch', 'Deutsche Strom-Futures steigen bei kaltem Ausblick und niedrigen Speicherständen'] },
    { c: 'Gas', r: 'NO', m: 3, t: 'Aasgard outage raises Norway output cuts to 17.8mcm/day', l: ['Norsk', 'Åsgard-stans øker kuttene i norsk gassproduksjon til 17,8 mcm/dag'] },
    { c: 'Renewables', r: 'UK', m: 4, t: 'UK announces 2.8 GW offshore wind development in GBP 12bn deal' },
    { c: 'Power', r: 'ES', m: 3, t: 'Spanish power demand drops 7.5% below forecast', l: ['Español', 'La demanda eléctrica española cae un 7,5 % por debajo de lo previsto'] },
    { c: 'Gas', r: 'EU', m: 5, t: 'Investors cut TTF gas net length a further 9%', l: ['Français', 'Les investisseurs réduisent encore de 9 % leur position longue nette sur le TTF'] },
    { c: 'Power', r: 'SE', m: 3, t: 'Swedish TSO urges more balancing bids in SE4 zone amid shortage' },
    { c: 'Power', r: 'IT', m: 6, t: 'Italy power forwards yet to price in new government decree', l: ['Italiano', 'I forward elettrici italiani non scontano ancora il nuovo decreto del governo'] },
    { c: 'Carbon', r: 'EU', m: 5, t: 'Study: EU carbon emissions set to fall 1.5% in 2026' },
    { c: 'Gas', r: 'DE', m: 4, t: 'German cabinet approves bill for 10% of capacity gas reserve' }
  ];
  var EVERY = 4.6, START_TIME = 12 * 60 + 17;

  var ease = {
    out: function (t) { return 1 - Math.pow(1 - t, 3); },
    inOut: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    expo: function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); },
    lin: function (t) { return t; }
  };

  function News(root) {
    this.root = root; this.q = function (s) { return root.querySelector(s); };
    this.cards = [].slice.call(root.querySelectorAll('.mtl-nw__card')).sort(function (a, b) { return a.getAttribute('data-o') - b.getAttribute('data-o'); });
    this.video = this.q('video');
    this.clock = 0; this.tweens = []; this.events = [];
    this.i = 0; this.mins = START_TIME; this.paused = false; this.played = false; this.running = false;
    this.buildWave();
    var self = this;
    this.fit();
    new ResizeObserver(function () { self.fit(); }).observe(root);
    new IntersectionObserver(function (e) {
      self.onscreen = e[0].isIntersecting;
      if (self.onscreen) { self.start(); if (!self.played) self.play(); else self.playVideo(); } else { self.stop(); if (self.video) self.video.pause(); }
    }, { threshold: .15 }).observe(root);
    document.addEventListener('visibilitychange', function () { if (document.hidden) { self.stop(); if (self.video) self.video.pause(); } else if (self.onscreen) { self.start(); self.playVideo(); } });
    var story = this.q('.mtl-nw__storyw');
    story.addEventListener('pointerenter', function () { self.paused = true; });
    story.addEventListener('pointerleave', function () { self.paused = false; });
  }

  News.prototype.fit = function () {
    this.mobile = window.matchMedia('(max-width: 760px)').matches;
    var w = this.root.clientWidth; if (w && !this.mobile) this.root.style.setProperty('--mtl-s', Math.min(1.1, w / 1000).toFixed(4));
  };

  /* ---------- clock ---------- */
  News.prototype.tween = function (o, to, dur, opt) {
    opt = opt || {};
    var t = { o: o, to: to, from: {}, dur: Math.max(.001, reduce ? Math.min(dur, .2) : dur), t0: this.clock + (opt.delay || 0), e: ease[opt.ease || 'out'], up: opt.update, done: opt.done, started: false };
    this.tweens.push(t); return t;
  };
  News.prototype.at = function (dt, fn) { this.events.push({ t: this.clock + dt, fn: fn }); };
  News.prototype.step = function (dt) {
    this.clock += dt;
    var now = this.clock, list = this.tweens, i, p; this.tweens = [];
    for (i = 0; i < list.length; i++) {
      var t = list[i];
      if (now < t.t0) { this.tweens.push(t); continue; }
      if (!t.started) { for (p in t.to) t.from[p] = t.o[p]; t.started = true; }
      var q = Math.min(1, (now - t.t0) / t.dur), e = t.e(q);
      for (p in t.to) t.o[p] = t.from[p] + (t.to[p] - t.from[p]) * e;
      if (t.up) t.up(e, q);
      if (q < 1) this.tweens.push(t); else if (t.done) t.done();
    }
    var ev = this.events; this.events = [];
    for (i = 0; i < ev.length; i++) { if (now >= ev[i].t) ev[i].fn(); else this.events.push(ev[i]); }
    if (this.played) this.ambient(dt);
  };
  News.prototype.start = function () {
    if (this.running) return; this.running = true; this.last = performance.now();
    var self = this;
    var loop = function (n) { if (!self.running) return; var dt = Math.min(.05, (n - self.last) / 1000); self.last = n; self.step(dt); self.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  };
  News.prototype.stop = function () { this.running = false; cancelAnimationFrame(this.raf); };
  News.prototype.playVideo = function () {
    var v = this.video; if (!v || reduce) return;
    var p = v.play(); if (p && p.catch) p.catch(function () {});
  };

  /* ---------- intro ---------- */
  News.prototype.play = function () {
    this.played = true;
    var self = this;
    this.cards.forEach(function (c, i) {
      if (reduce) { c.classList.add('is-in'); return; }
      var cs = getComputedStyle(c);
      var cx = parseFloat(cs.getPropertyValue('--x')) + parseFloat(cs.getPropertyValue('--w')) / 2, cy = parseFloat(cs.getPropertyValue('--y')) + parseFloat(cs.getPropertyValue('--h')) / 2;
      var dx = self.mobile ? 0 : (500 - cx) * .3, dy = self.mobile ? 24 : (415 - cy) * .3, o = { p: 0 };
      self.tween(o, { p: 1 }, 1.15, { delay: .15 + i * .15, ease: 'expo', update: function () {
        var p = o.p; c.style.opacity = Math.min(1, p * 1.5);
        c.style.transform = 'translate(' + dx * (1 - p) + 'px,' + dy * (1 - p) + 'px) scale(' + (.88 + .12 * p) + ')';
        c.style.filter = p < .98 ? 'blur(' + 8 * (1 - p) + 'px)' : '';
      }, done: function () { c.classList.add('is-in'); c.style.opacity = ''; c.style.filter = ''; c.style.transform = ''; } });
    });
    this.at(.4, function () { self.playVideo(); });
    /* lower third slides in like a broadcast caption */
    var l3 = this.q('.mtl-nw__l3'), b = l3.children[0], s = l3.children[1];
    if (!reduce) {
      [b, s].forEach(function (el) { el.style.clipPath = 'inset(0 100% 0 0)'; });
      this.tween({ v: 0 }, { v: 1 }, .6, { delay: 1.5, ease: 'inOut', update: function (e) { b.style.clipPath = 'inset(0 ' + (100 - 100 * e) + '% 0 0)'; } });
      this.tween({ v: 0 }, { v: 1 }, .6, { delay: 1.8, ease: 'inOut', update: function (e) { s.style.clipPath = 'inset(0 ' + (100 - 100 * e) + '% 0 0)'; } });
    }
    if (!reduce) this.at(3.4, function () { self.wire(); });
  };

  /* ---------- the wire ---------- */
  News.prototype.wire = function () {
    var self = this;
    if (this.paused || !this.onscreen) { this.at(1, function () { self.wire(); }); return; }
    this.i = (this.i + 1) % WIRE.length;
    this.mins += 2 + (this.i % 3);
    var it = WIRE[this.i], body = this.q('.mtl-nw__body'), oldH = this.q('.mtl-nw__h');
    var nh = oldH.cloneNode(false); nh.textContent = it.t; nh.style.transform = 'translateY(105%)'; body.appendChild(nh);
    this.tween({ v: 0 }, { v: 1 }, .7, { ease: 'inOut', update: function (e) {
      oldH.style.transform = 'translateY(' + (-105 * e) + '%)'; oldH.style.opacity = 1 - e;
      nh.style.transform = 'translateY(' + (105 * (1 - e)) + '%)';
    }, done: function () { if (oldH.parentNode) oldH.parentNode.removeChild(oldH); } });
    /* meta + deck */
    var lang = this.q('.mtl-nw__lang');
    lang.classList.remove('is-on');
    var meta = [this.q('.mtl-nw__c'), this.q('.mtl-nw__r'), this.q('.mtl-nw__rt'), this.q('.mtl-nw__time')];
    meta.forEach(function (m) { m.style.transition = 'opacity .25s'; m.style.opacity = 0; });
    setTimeout(function () {
      meta[0].textContent = it.c; meta[1].textContent = it.r; meta[2].textContent = it.m;
      var hh = Math.floor(self.mins / 60) % 24, mm = self.mins % 60; meta[3].textContent = (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
      meta.forEach(function (m) { m.style.opacity = 1; });
    }, 260);
    var g1 = this.q('.mtl-nw__ghost--1'), g2 = this.q('.mtl-nw__ghost--2');
    this.tween({ v: 0 }, { v: 1 }, .7, { ease: 'out', update: function (e) {
      var k = Math.sin(Math.PI * e);
      g1.style.transform = 'translateY(' + (8 * k) + 'px)'; g2.style.transform = 'translateY(' + (14 * k) + 'px)';
    } });
    /* some stories switch into another language the newsroom publishes in */
    if (it.l) this.at(2.0, function () {
      if (WIRE[self.i] !== it) return;
      var cur = self.q('.mtl-nw__h'); lang.textContent = it.l[0];
      cur.style.transition = 'opacity .35s'; cur.style.opacity = 0;
      setTimeout(function () { cur.textContent = it.l[1]; cur.style.opacity = 1; lang.classList.add('is-on'); }, 360);
    });
    this.at(EVERY, function () { self.wire(); });
  };

  /* ---------- podcast waveform + video progress ---------- */
  News.prototype.buildWave = function () {
    var s = this.q('.mtl-nw__wave'), n = 34; s.innerHTML = ''; this.bars = [];
    for (var i = 0; i < n; i++) {
      var r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', (i * 200 / n + 1).toFixed(1)); r.setAttribute('width', (200 / n - 2.4).toFixed(1)); r.setAttribute('rx', 1.5);
      r.setAttribute('fill', '#fff'); r.setAttribute('fill-opacity', i < n * .35 ? .95 : .5);
      var h0 = 8 + 22 * Math.abs(Math.sin(i * 1.7)); r.setAttribute('y', 19 - h0 / 2); r.setAttribute('height', h0);
      s.appendChild(r); this.bars.push(r);
    }
    this.ring = this.q('.mtl-nw__ring'); this.prog = this.q('.mtl-nw__prog i'); this.pulse = this.q('.mtl-nw__pulse');
    this.ph = 0;
  };
  News.prototype.ambient = function (dt) {
    if (reduce) return;
    this.ph += dt;
    var t = this.ph, n = this.bars.length, played = (t / 40) % 1;
    for (var i = 0; i < n; i++) {
      var h = 6 + 26 * Math.abs(Math.sin(t * 2.1 + i * .7) * Math.sin(t * 1.3 + i * .31));
      this.bars[i].setAttribute('height', h.toFixed(1)); this.bars[i].setAttribute('y', (19 - h / 2).toFixed(1));
      this.bars[i].setAttribute('fill-opacity', i / n < played ? .95 : .45);
    }
    this.ring.setAttribute('stroke-dashoffset', (131.9 * (1 - played)).toFixed(1));
    this.prog.style.width = ((t / 22) % 1 * 100).toFixed(2) + '%';
    var pp = (t % 2.4) / 2.4;
    this.pulse.style.opacity = (1 - pp) * .8; this.pulse.style.transform = 'scale(' + (1 + pp * .7) + ')';
  };

  function init(scope) { [].slice.call((scope || document).querySelectorAll('[data-mtl-news]')).forEach(function (r) { if (!r._mtlNews) r._mtlNews = new News(r); }); }
  window.MontelNews = { init: init, wire: WIRE };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); }); else init();
})();
