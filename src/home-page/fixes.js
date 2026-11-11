/* =========================================================
   Montel · Home page fixes (design feedback R3)
   Behaviour overrides on top of the Webflow build, homepage only.
   The site-wide scripts stay as they are; where one misbehaves on
   the homepage, this file switches it off and replaces it.
   ========================================================= */
(function () {
  'use strict';
  var $ = window.jQuery;
  function onLoad(fn) { if (document.readyState === 'complete') setTimeout(fn, 0); else window.addEventListener('load', function () { setTimeout(fn, 0); }); }
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  /* ---------------- Hero tabs: mobile arrows stop at the ends, swipe ---------------- */
  (function heroTabs() {
    var tabs = [].slice.call(document.querySelectorAll('.hero__tab_button'));
    var left = document.querySelector('.hero__tab_nav_button[data-button="left"]');
    var right = document.querySelector('.hero__tab_nav_button[data-button="right"]');
    if (!tabs.length || !left || !right) return;
    var mq = window.matchMedia('(max-width: 767px)');
    function idx() { for (var i = 0; i < tabs.length; i++) if (tabs[i].classList.contains('active')) return i; return 0; }
    function update() {
      var i = idx(), m = mq.matches;
      left.classList.toggle('is-disabled', m && i === 0);
      right.classList.toggle('is-disabled', m && i === tabs.length - 1);
      left.setAttribute('aria-disabled', m && i === 0 ? 'true' : 'false');
      right.setAttribute('aria-disabled', m && i === tabs.length - 1 ? 'true' : 'false');
    }
    /* block the site's wrap-around at the ends (capture phase runs before its handler) */
    document.addEventListener('click', function (e) {
      if (!mq.matches) return;
      var b = e.target.closest && e.target.closest('.hero__tab_nav_button');
      if (b && b.classList.contains('is-disabled')) { e.stopPropagation(); e.preventDefault(); }
    }, true);
    var mo = new MutationObserver(update);
    tabs.forEach(function (t) { mo.observe(t, { attributes: true, attributeFilter: ['class'] }); });
    (mq.addEventListener ? mq.addEventListener('change', update) : mq.addListener(update));
    update();
    /* swipe on the panel */
    var body = document.querySelector('.hero__tab_body'), x0 = null, y0 = 0;
    if (body) {
      body.addEventListener('touchstart', function (e) { var t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; }, { passive: true });
      body.addEventListener('touchend', function (e) {
        if (x0 === null || !mq.matches) return;
        var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = null;
        if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
        var btn = dx < 0 ? right : left;
        if (!btn.classList.contains('is-disabled')) btn.click();
      }, { passive: true });
    }
  })();

  /* ---------------- Ecosystem (desktop): sticky stacked cards ---------------- */
  (function ecosystem() {
    var sec = document.querySelector('.eco2');
    if (!sec || !window.gsap || !window.ScrollTrigger) return;
    var list = sec.querySelector('.eco2__body_list');
    var items, navItems, progress;

    function killSiteTriggers() {
      ScrollTrigger.getAll().forEach(function (st) {
        if (st.vars && st.vars.id && String(st.vars.id).indexOf('mtl') === 0) return;
        var t = st.trigger, p = st.pin;
        if ((t && t.closest && t.closest('.eco2')) || (p && p.closest && p.closest('.eco2'))) {
          var anim = st.animation; st.kill(true); if (anim) anim.kill();
        }
      });
    }
    function clean() {
      gsap.set(items, { clearProps: 'transform,opacity,scale,translate,y' });
      gsap.set(navItems, { clearProps: 'opacity' });
      progress.forEach(function (p) { p.style.height = ''; });
      items.forEach(function (it) { it.style.transform = ''; it.style.opacity = ''; });
    }

    function desktop() {
      items = [].slice.call(sec.querySelectorAll('.eco2__body_item'));
      navItems = [].slice.call(sec.querySelectorAll('.eco2__nav_item'));
      progress = [].slice.call(sec.querySelectorAll('.eco2__nav_item_progress'));
      if (!items.length || !list) return;
      killSiteTriggers(); clean();
      sec.classList.add('mtl-eco');

      var header = document.querySelector('.header');
      var top = 0, H = 0, gap = 0, hold = 0, S = [], raf = 0;
      function measure() {
        top = (header ? header.getBoundingClientRect().height : 90) + 56;
        H = Math.round(Math.min(640, Math.max(520, window.innerHeight - top - 40)));
        sec.style.setProperty('--mtl-eco-top', top + 'px');
        sec.style.setProperty('--mtl-eco-h', H + 'px');
        hold = 160;
        sec.style.setProperty('--mtl-eco-hold', hold + 'px');
        gap = parseFloat(getComputedStyle(list).rowGap) || 0;
        sec.style.setProperty('--mtl-eco-gap', gap + 'px');
        var listTop = list.getBoundingClientRect().top + window.pageYOffset;
        S = items.map(function (_, i) { return listTop + i * (H + gap) - top; });
        render();
      }
      function render() {
        raf = 0;
        var y = window.pageYOffset, n = items.length, D = H + gap, active = 0;
        for (var i = 0; i < n; i++) if (y >= S[i] - 2) active = i;
        navItems.forEach(function (el, i) { el.classList.toggle('is-active', i === active); });
        progress.forEach(function (el, i) {
          var p = i < n - 1 ? (y - S[i]) / (S[i + 1] - S[i]) : (y - S[i]) / (hold || H);
          el.style.height = (clamp(p) * 100).toFixed(2) + '%';
        });
        items.forEach(function (el, i) {
          var depth = 0;
          for (var k = i + 1; k < n; k++) depth += clamp((y - (S[k] - D)) / D);
          el.style.transform = depth ? 'translate3d(0,' + (-18 * depth).toFixed(1) + 'px,0) scale(' + (1 - .05 * depth).toFixed(4) + ')' : '';
          el.style.opacity = depth ? Math.max(.3, 1 - .6 * Math.min(1, depth)).toFixed(3) : '';
        });
      }
      function onScroll() { if (!raf) raf = requestAnimationFrame(render); }
      var rt;
      function onResize() { clearTimeout(rt); rt = setTimeout(measure, 120); }
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onResize);
      /* the hero tab script calls ScrollTrigger.refresh() on every tab change; re-measure after it */
      ScrollTrigger.addEventListener('refresh', onResize);
      measure();
      setTimeout(measure, 600);

      return function () {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onResize);
        ScrollTrigger.removeEventListener('refresh', onResize);
        sec.classList.remove('mtl-eco');
        sec.style.removeProperty('--mtl-eco-top'); sec.style.removeProperty('--mtl-eco-h'); sec.style.removeProperty('--mtl-eco-hold');
        navItems.forEach(function (el) { el.classList.remove('is-active'); });
        clean();
      };
    }

    /* phone: same height for the three cards so the arrows don't jump */
    function phoneHeights() {
      var all = [].slice.call(sec.querySelectorAll('.eco2__body_item'));
      if (window.innerWidth >= 768) { sec.style.removeProperty('--mtl-eco-mh'); return; }
      sec.style.setProperty('--mtl-eco-mh', '0px');
      var max = 0;
      var w = list ? list.clientWidth : 0;
      all.forEach(function (el) {
        var d = el.style.display, v = el.style.visibility, p = el.style.position, wd = el.style.width;
        if (getComputedStyle(el).display === 'none') { el.style.visibility = 'hidden'; el.style.position = 'absolute'; el.style.display = 'block'; if (w) el.style.width = w + 'px'; }
        max = Math.max(max, el.offsetHeight);
        el.style.display = d; el.style.visibility = v; el.style.position = p; el.style.width = wd;
      });
      sec.style.setProperty('--mtl-eco-mh', max + 'px');
    }

    /* phone: swipe between the cards using the site's own arrows */
    (function swipe() {
      var x0 = null, y0 = 0;
      if (!list) return;
      list.addEventListener('touchstart', function (e) { var t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; }, { passive: true });
      list.addEventListener('touchend', function (e) {
        if (x0 === null || window.innerWidth >= 768) return;
        var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = null;
        if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
        var b = sec.querySelector('.eco2__arrow button[data-button="' + (dx < 0 ? 'right' : 'left') + '"]');
        if (b) b.click();
      }, { passive: true });
    })();

    onLoad(function () {
      /* created after the site's own matchMedia, so on every breakpoint change it runs after it */
      var mm = gsap.matchMedia();
      mm.add('(min-width: 992px)', desktop);
      phoneHeights();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(phoneHeights);
      setTimeout(phoneHeights, 800);
      var li; if (list) list.addEventListener('load', function () { clearTimeout(li); li = setTimeout(phoneHeights, 100); }, true);
      /* the site's phone slider decides at DOM ready; run its resize handler once so it matches the final width */
      if (window.innerWidth < 768 && $) $(window).trigger('resize');
      var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(phoneHeights, 150); });
    });
  })();

  /* ---------------- Data section: numbers count up when they enter the viewport ---------------- */
  (function counters() {
    var sec = document.querySelector('.data'); if (!sec) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var els = [].slice.call(sec.querySelectorAll('h3')).filter(function (e) { return !e.children.length && /^\s*\d[\d,.]*\+?\s*$/.test(e.textContent); });
    function lightAll() { els.forEach(function (_, i) { try { document.dispatchEvent(new CustomEvent('mtl:stat', { detail: { index: i } })); } catch (x) {} }); }
    if (!els.length) return;
    if (reduce || !('IntersectionObserver' in window)) { setTimeout(lightAll, 0); return; }
    els.forEach(function (e, i) {
      var raw = e.textContent.trim(), plus = /\+$/.test(raw), to = parseFloat(raw.replace(/[^\d.]/g, '')), done = false;
      e.style.fontVariantNumeric = 'tabular-nums';
      e.style.minWidth = e.getBoundingClientRect().width + 'px';   /* no layout shift while the digits change */
      e.textContent = '0' + (plus ? '+' : '');
      var io = new IntersectionObserver(function (es) {
        var en = es[es.length - 1];
        if (done) return;
        if (!en.isIntersecting) return;
        done = true; io.disconnect();
        var t0 = performance.now() + i * 140, D = 1600 + Math.min(600, to);
        (function f(t) {
          var p = Math.max(0, Math.min(1, (t - t0) / D)), k = 1 - Math.pow(1 - p, 4);
          e.textContent = Math.round(to * k) + (plus ? '+' : '');
          if (p < 1) requestAnimationFrame(f); else { e.textContent = raw; try { document.dispatchEvent(new CustomEvent('mtl:stat', { detail: { index: i } })); } catch (x) {} }
        })(performance.now());
      }, { threshold: .3 });
      io.observe(e);
      /* jumped past without it ever being on screen (anchor link, fast scroll): show the final number */
      function past() {
        if (done) return window.removeEventListener('scroll', past);
        if (e.getBoundingClientRect().top < 0) { done = true; io.disconnect(); e.textContent = raw; window.removeEventListener('scroll', past); try { document.dispatchEvent(new CustomEvent('mtl:stat', { detail: { index: i } })); } catch (x) {} }
      }
      window.addEventListener('scroll', past, { passive: true });
    });
  })();

  /* ---------------- Newsletter: live background shapes, slow drift + light cursor parallax ---------------- */
  (function newsletter() {
    var sec = document.querySelector('.newsletter'); if (!sec || sec.querySelector('.mtl-nl')) return;
    var art = document.createElement('div'); art.className = 'mtl-nl'; art.setAttribute('aria-hidden', 'true');
    var spec = [['a', 22, -8, 18, 0, 6], ['b', 18, 16, -12, -4, 14], ['c', 24, -14, 10, -9, 10], ['d', 20, 10, 14, -2, 5]];
    var shapes = spec.map(function (p) {
      var s = document.createElement('div'); s.className = 'mtl-nl__s mtl-nl__' + p[0];
      s.style.setProperty('--d', p[1] + 's'); s.style.setProperty('--fx', p[2] + 'px'); s.style.setProperty('--fy', p[3] + 'px'); s.style.setProperty('--dl', p[4] + 's');
      s.innerHTML = '<i></i>'; art.appendChild(s); return { el: s, depth: p[5] };
    });
    sec.insertBefore(art, sec.firstChild); sec.classList.add('has-mtl-nl');
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(hover: hover)').matches) return;
    sec.addEventListener('pointermove', function (e) {
      var r = sec.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5;
      shapes.forEach(function (s) { s.el.style.translate = (-nx * s.depth * 2).toFixed(1) + 'px ' + (-ny * s.depth * 1.4).toFixed(1) + 'px'; });
    });
    sec.addEventListener('pointerleave', function () { shapes.forEach(function (s) { s.el.style.translate = '0px 0px'; }); });
  })();

  /* ---------------- Testimonial: one slow crossfade for text, photo and tabs ---------------- */
  (function testimonials() {
    if (!$ || !$.fn.slick) return;
    function boot() {
      var q = $('.testimonial__quote_slider'), im = $('.testimonial__img_slider');
      if (!q.length || !q.hasClass('slick-initialized')) return setTimeout(boot, 200);
      [q, im].forEach(function ($s) {
        if (!$s.length) return;
        try { $s.slick('slickSetOption', 'speed', 700, false); $s.slick('slickSetOption', 'cssEase', 'ease', false); } catch (e) {}
      });
    }
    onLoad(boot);
  })();
})();
