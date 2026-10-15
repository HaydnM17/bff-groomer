(function () {
  'use strict';
  if (window.__siteInit) return;
  window.__siteInit = true;

  var doc = document;
  var root = doc.documentElement;
  var reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  function reduced() { return reduceQuery.matches; }
  function qsa(sel, ctx) { return [].slice.call((ctx || doc).querySelectorAll(sel)); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  var hasIO = 'IntersectionObserver' in window;

  /* ==========================================================================
     One scroll frame. Every scroll effect registers a function here, so there is
     one requestAnimationFrame per scroll tick. Effects that read layout are
     registered first, the ones that only write come after (no read after write).
     ========================================================================== */
  var frameFns = [];
  var frameQueued = false;
  function runFrame() {
    frameQueued = false;
    var y = window.scrollY || 0;
    var vh = window.innerHeight || 800;
    for (var i = 0; i < frameFns.length; i++) frameFns[i](y, vh);
  }
  function requestFrame() {
    if (frameQueued) return;
    frameQueued = true;
    requestAnimationFrame(runFrame);
  }
  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', requestFrame);

  /* ---------- parallax and scale on scroll (data-parallax). Only frames on screen are measured. ---------- */
  var pxItems = qsa('[data-parallax]').map(function (el) {
    return {
      el: el,
      img: el.querySelector('img'),
      zoom: el.getAttribute('data-parallax') === 'zoom',
      amp: el.classList.contains('band') ? 0.09 : 0.045,
      on: false
    };
  }).filter(function (it) { return it.img; });

  if (pxItems.length && hasIO) {
    var pxByEl = typeof Map === 'function' ? new Map() : null;
    var pxIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var it = pxByEl.get(en.target);
        if (!it) return;
        it.on = en.isIntersecting;
        en.target.classList.toggle('px-on', en.isIntersecting);
      });
      requestFrame();
    }, { rootMargin: '80px 0px' });
    if (pxByEl) {
      pxItems.forEach(function (it) { pxByEl.set(it.el, it); pxIO.observe(it.el); });
      frameFns.push(function (y, vh) {
        if (reduced()) return;
        var live = pxItems.filter(function (it) { return it.on; });
        if (!live.length) return;
        var rects = live.map(function (it) { return it.el.getBoundingClientRect(); });   // read everything first
        live.forEach(function (it, i) {                                                  // then write everything
          var r = rects[i];
          var p = clamp((r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2), -1, 1);
          if (it.zoom) {
            it.img.style.transform = 'scale(' + (1 + 0.16 * (1 - Math.abs(p))).toFixed(4) + ')';
          } else {
            it.img.style.transform = 'translate3d(0,' + (-p * it.amp * r.height).toFixed(1) + 'px,0)';
          }
        });
      });
    }
  }
  function clearParallax() {
    pxItems.forEach(function (it) { it.img.style.transform = ''; });
  }

  /* ---------- header, progress line, hero depth ---------- */
  var header = doc.getElementById('header');
  var progress = header && header.querySelector('.progress');
  var veilEl = doc.querySelector('.env-veil');
  var posterEl = doc.querySelector('.env-poster');
  var heroInner = doc.querySelector('.hero-inner');
  var heroClear = false;

  frameFns.push(function (y, vh) {
    var max = Math.max(1, doc.documentElement.scrollHeight - vh);
    if (header) header.classList.toggle('solid', y > 40);
    if (progress) progress.style.setProperty('--p', Math.min(1, y / max).toFixed(4));
    var t = clamp(y / (vh * 0.9), 0, 1);
    if (veilEl) veilEl.style.opacity = (t * 0.85).toFixed(3);
    if (reduced()) {
      if (!heroClear) { heroClear = true; if (posterEl) posterEl.style.transform = ''; if (heroInner) { heroInner.style.transform = ''; heroInner.style.opacity = ''; } }
      return;
    }
    heroClear = false;
    if (y > vh * 1.3) return;
    if (posterEl) posterEl.style.transform = 'translate3d(0,' + (-t * vh * 0.04).toFixed(1) + 'px,0) scale(' + (1 + t * 0.08).toFixed(4) + ')';
    if (heroInner) {
      heroInner.style.transform = 'translate3d(0,' + (-t * 44).toFixed(1) + 'px,0) scale(' + (1 - t * 0.05).toFixed(4) + ')';
      heroInner.style.opacity = (1 - t * 0.9).toFixed(3);
    }
  });
  requestFrame();

  /* ---------- phone menu ---------- */
  var menuBtn = doc.querySelector('.menu-btn');
  var nav = doc.getElementById('menu');
  var inertTargets = [doc.getElementById('main'), doc.querySelector('.site-footer')];
  var wide = window.matchMedia('(min-width: 900px)');

  function setMenu(open) {
    if (!menuBtn || !nav) return;
    nav.setAttribute('data-open', open ? 'true' : 'false');
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    doc.body.classList.toggle('menu-open', open);
    inertTargets.forEach(function (el) { if (el) el.inert = open; });
    if (open) {
      var first = nav.querySelector('a');
      if (first) first.focus();
    }
  }
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        menuBtn.focus();
      }
    });
    wide.addEventListener('change', function () { if (wide.matches) setMenu(false); });
  }

  /* ---------- current section in the nav ---------- */
  var links = nav ? qsa('a[href^="#"]', nav) : [];
  if (hasIO && links.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) {
          if (a.getAttribute('href') === '#' + en.target.id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function (a) {
      var t = doc.querySelector(a.getAttribute('href'));
      if (t) spy.observe(t);
    });
  }

  /* ---------- word rise on headings (the h1 and every section h2) ---------- */
  qsa('[data-words]').forEach(function (el) {
    var text = el.textContent.replace(/\s+/g, ' ').trim();
    if (!text) return;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    text.split(' ').forEach(function (word, i, all) {
      var outer = doc.createElement('span');
      outer.className = 'w';
      outer.setAttribute('aria-hidden', 'true');
      var inner = doc.createElement('span');
      inner.className = 'wi';
      inner.style.setProperty('--i', i);
      inner.textContent = word;
      outer.appendChild(inner);
      el.appendChild(outer);
      if (i < all.length - 1) el.appendChild(doc.createTextNode(' '));
    });
  });

  /* ---------- scroll reveals ----------
     data-reveal="up|left|right|scale|tilt|zoom|fade|draw|curtain". Sections and the footer get .in too,
     which drives the band wipe. .done is added once the transition has finished, so hover rules can take over. */
  qsa('[data-reveal-group]').forEach(function (group) {
    var mod = parseInt(group.getAttribute('data-reveal-group'), 10) || 0;
    [].forEach.call(group.children, function (child, i) {
      child.style.setProperty('--d', mod ? i % mod : i);
    });
  });
  /* hours rows and form fields arrive one after another inside their revealed block */
  qsa('.hours tr').forEach(function (tr, i) { tr.style.setProperty('--r', i); });
  qsa('.form > .field').forEach(function (f, i) { f.style.setProperty('--f', i); });
  var revealTargets = qsa('[data-reveal], [data-words], .section, .site-footer');
  function settleReveal(el) {
    if (!el.hasAttribute('data-reveal')) return;
    var d = parseInt(el.style.getPropertyValue('--d'), 10) || 0;
    setTimeout(function () { el.classList.add('done'); }, 1300 + d * 90);
  }
  function showAll() {
    revealTargets.forEach(function (el) {
      el.classList.add('in', 'words-in', 'done');
    });
  }
  if (hasIO) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        en.target.classList.add('words-in');
        io.unobserve(en.target);
        settleReveal(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    revealTargets.forEach(function (el) { io.observe(el); });
  } else {
    showAll();
  }

  /* ---------- card spotlight and tilt toward the pointer (fine pointer only) ----------
     data-spot: a soft light follows the pointer. data-tilt: the card tilts toward it while the
     hover lift (CSS) holds it up. Put data-tilt on a card that is not itself the revealed element. */
  function untilt(el) { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); }
  doc.addEventListener('pointermove', function (e) {
    if (!finePointer.matches || !e.target.closest) return;
    var card = e.target.closest('[data-spot]');
    if (card) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }
    var tilt = reduced() ? null : e.target.closest('[data-tilt]');
    if (tilt) {
      var t = tilt.getBoundingClientRect();
      tilt.style.setProperty('--ry', (((e.clientX - t.left) / t.width - 0.5) * 10).toFixed(2) + 'deg');
      tilt.style.setProperty('--rx', ((0.5 - (e.clientY - t.top) / t.height) * 8).toFixed(2) + 'deg');
    }
  });
  doc.addEventListener('pointerout', function (e) {
    var tilt = e.target.closest ? e.target.closest('[data-tilt]') : null;
    if (tilt && !(e.relatedTarget && tilt.contains(e.relatedTarget))) untilt(tilt);
  });

  /* list services: every row carries the pointer position so its photo can follow the mouse (the CSS reads --mx and --my) */
  qsa('[data-services="list"] .service').forEach(function (el) { el.setAttribute('data-spot', ''); });

  /* ---------- drifting motif (.drops): runs only while its section is on screen ---------- */
  qsa('.drops').forEach(function (el) {
    if (!hasIO) { el.classList.add('is-live'); return; }
    new IntersectionObserver(function (entries) {
      el.classList.toggle('is-live', entries[0].isIntersecting);
    }).observe(el);
  });

  /* ==========================================================================
     Gallery rows. Every row scrolls on its own: swipe, trackpad, or the arrows.
     An arrow click moves 4 photos on a wide screen and 1 on a phone. Arrows are
     disabled at the ends. Optional slow drift (data-drift on .gallery) that
     pauses on hover, focus, touch and after any arrow click.
     ========================================================================== */
  var galleries = qsa('[data-gallery]').map(initGallery);

  function initGallery(gallery) {
    var rows = qsa('[data-row]', gallery).map(initRow).filter(Boolean);
    var drift = gallery.hasAttribute('data-drift') ? makeDrift(gallery, rows) : null;
    return { gallery: gallery, rows: rows, drift: drift };
  }

  function initRow(row) {
    var track = row.querySelector('[data-track]');
    if (!track) return null;
    var prev = row.querySelector('[data-dir="-1"]');
    var next = row.querySelector('[data-dir="1"]');
    var thumb = row.querySelector('.g-line i');
    var items = [].slice.call(track.children);
    var pending = null;
    var pendingTimer = 0;
    var settleTimer = 0;
    var queued = false;
    var api = { track: track, items: items, go: go, settle: settle, update: update, max: 0, acc: 0, dir: 1 };

    function perClick() {
      if (window.innerWidth < 640 || items.length < 2) return 1;
      var stride = items[1].offsetLeft - items[0].offsetLeft;
      var gap = stride - items[0].offsetWidth;
      return clamp(Math.floor((track.clientWidth + gap + 2) / stride), 1, 4);
    }
    function offsetOf(i) { return items[i].offsetLeft - items[0].offsetLeft; }
    function maxScroll() { return Math.max(0, track.scrollWidth - track.clientWidth); }
    function nearest() {
      var x = track.scrollLeft, best = 0, bd = 1e9;
      for (var i = 0; i < items.length; i++) {
        var d = Math.abs(offsetOf(i) - x);
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    }
    function scrollToLeft(left) {
      track.scrollTo({ left: left, behavior: reduced() ? 'auto' : 'smooth' });
    }
    function go(dir) {
      if (!items.length) return;
      if (api.onUser) api.onUser(6000);
      var base = pending !== null ? pending : nearest();
      var i = clamp(base + dir * perClick(), 0, items.length - 1);
      pending = i;
      scrollToLeft(Math.min(offsetOf(i), maxScroll()));
      clearTimeout(pendingTimer);
      pendingTimer = setTimeout(function () { pending = null; }, 800);
      settle(900);
    }
    /* leave drift mode: glide to the nearest photo first, then turn snapping back on */
    function settle(delay) {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(function () {
        if (!track.classList.contains('is-drifting')) return;
        scrollToLeft(Math.min(offsetOf(nearest()), maxScroll()));
        settleTimer = setTimeout(function () { track.classList.remove('is-drifting'); }, 650);
      }, delay || 0);
    }
    function update() {
      queued = false;
      var max = maxScroll();
      var x = track.scrollLeft;
      api.max = max;
      var focused = doc.activeElement;
      var wasPrev = focused === prev, wasNext = focused === next;
      if (prev) prev.disabled = x <= 2;
      if (next) next.disabled = x >= max - 2;
      if (wasPrev && prev.disabled && next && !next.disabled) next.focus({ preventScroll: true });
      if (wasNext && next.disabled && prev && !prev.disabled) prev.focus({ preventScroll: true });
      if (thumb) {
        var frac = max > 0 ? clamp(track.clientWidth / track.scrollWidth, 0.08, 1) : 1;
        var pos = max > 0 ? x / max : 0;
        thumb.style.transform = 'translateX(' + (pos * (1 - frac) * 100 / frac).toFixed(2) + '%) scaleX(' + frac.toFixed(4) + ')';
      }
    }
    function queueUpdate() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    }
    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });
    track.addEventListener('scroll', queueUpdate, { passive: true });
    window.addEventListener('resize', queueUpdate);
    update();
    window.addEventListener('load', update);
    return api;
  }

  function makeDrift(gallery, rows) {
    var visible = false, hovering = false, focusing = false, touching = false;
    var holdUntil = 0, raf = 0, last = 0, wasPaused = true;
    rows.forEach(function (r, i) { r.speed = 18 - Math.min(i, 2) * 5; });

    function running() { return visible && !reduced() && !doc.hidden; }
    function paused() { return hovering || focusing || touching || Date.now() < holdUntil; }
    function hold(ms) { holdUntil = Math.max(holdUntil, Date.now() + ms); wasPaused = true; }
    function tick(ts) {
      raf = 0;
      if (!running()) return;
      var dt = Math.min(64, ts - (last || ts));
      last = ts;
      if (paused()) {
        wasPaused = true;
      } else {
        rows.forEach(function (r) {
          var t = r.track;
          if (wasPaused || !t.classList.contains('is-drifting')) {
            r.max = Math.max(0, t.scrollWidth - t.clientWidth);
            r.acc = t.scrollLeft;
          }
          if (r.max <= 4) return;
          t.classList.add('is-drifting');
          r.acc += r.dir * r.speed * dt / 1000;
          if (r.acc >= r.max) { r.acc = r.max; r.dir = -1; } else if (r.acc <= 0) { r.acc = 0; r.dir = 1; }
          t.scrollLeft = r.acc;
        });
        wasPaused = false;
      }
      raf = requestAnimationFrame(tick);
    }
    function start() {
      if (raf || !running()) return;
      last = 0;
      raf = requestAnimationFrame(tick);
    }
    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      rows.forEach(function (r) { r.settle(0); });
    }
    rows.forEach(function (r) { r.onUser = hold; });

    if (hasIO) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) start(); else stop();
      }, { threshold: 0.12 }).observe(gallery);
    }
    gallery.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hovering = true; });
    gallery.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { hovering = false; hold(900); } });
    gallery.addEventListener('focusin', function () { focusing = true; });
    gallery.addEventListener('focusout', function () { focusing = false; hold(2500); });
    gallery.addEventListener('touchstart', function () { touching = true; }, { passive: true });
    function touchDone() {
      touching = false;
      hold(3500);
      rows.forEach(function (r) { r.settle(450); });
    }
    gallery.addEventListener('touchend', touchDone, { passive: true });
    gallery.addEventListener('touchcancel', touchDone, { passive: true });
    gallery.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
      hold(4000);
      rows.forEach(function (r) { r.settle(300); });
    }, { passive: true });
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) stop(); else start(); });
    return { start: start, stop: stop };
  }

  /* ==========================================================================
     Lightbox with previous and next across every photo on the page
     ========================================================================== */
  var box = doc.getElementById('lightbox');
  if (box && typeof box.showModal === 'function') {
    var boxImg = box.querySelector('img');
    var boxCap = box.querySelector('p');
    var boxPrev = box.querySelector('.lb-prev');
    var boxNext = box.querySelector('.lb-next');
    var current = null;
    function lbList() { return qsa('[data-lightbox]'); }
    function show(btn) {
      current = btn;
      var thumb = btn.querySelector('img');
      boxImg.src = btn.getAttribute('data-lightbox');
      boxImg.alt = thumb ? thumb.alt : '';
      boxCap.textContent = btn.getAttribute('data-caption') || '';
      boxCap.hidden = !boxCap.textContent;
      var many = lbList().length > 1;
      if (boxPrev) boxPrev.hidden = !many;
      if (boxNext) boxNext.hidden = !many;
    }
    function step(dir) {
      var list = lbList();
      if (list.length < 2 || !current) return;
      var i = list.indexOf(current);
      show(list[(i + dir + list.length) % list.length]);
    }
    doc.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-lightbox]') : null;
      if (!btn) return;
      show(btn);
      box.showModal();
    });
    box.addEventListener('click', function (e) {
      if (e.target === box || e.target.closest('.lb-close')) box.close();
      else if (e.target.closest('.lb-prev')) step(-1);
      else if (e.target.closest('.lb-next')) step(1);
    });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { step(-1); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { step(1); e.preventDefault(); }
    });
    box.addEventListener('close', function () {
      boxImg.removeAttribute('src');
      if (current) current.focus();
    });
  }

  /* ==========================================================================
     Reviews: pop in one by one, float, lift and tilt on hover, open on click
     ========================================================================== */
  var reviewList = doc.querySelector('[data-reviews]');
  if (reviewList) {
    var cards = qsa('.rv', reviewList);
    var rvDialog = doc.getElementById('rv-dialog');
    var dialogOK = rvDialog && typeof rvDialog.showModal === 'function';

    /* long reviews are cut to a few lines on the card; flag them so the card says "Read more" */
    var measureClamp = function () {
      cards.forEach(function (li) {
        var p = li.querySelector('blockquote p');
        var fig = li.querySelector('.review');
        if (p && fig) fig.classList.toggle('is-clamped', p.scrollHeight > p.clientHeight + 1);
      });
    };
    measureClamp();
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(measureClamp);
    var clampTimer = 0;
    window.addEventListener('resize', function () { clearTimeout(clampTimer); clampTimer = setTimeout(measureClamp, 200); });

    /* pop in: cards that come into view together pop in order, first to last within about 1.5 seconds */
    var settle = function (li) { li.classList.add('settled'); };
    if (hasIO) {
      var rvIO = new IntersectionObserver(function (entries) {
        var batch = entries.filter(function (en) { return en.isIntersecting; }).map(function (en) { return en.target; });
        batch.sort(function (a, b) { return cards.indexOf(a) - cards.indexOf(b); });
        var n = batch.length;
        var gap = n > 1 ? clamp(1500 / (n - 1), 40, 130) : 0;
        batch.forEach(function (li, k) {
          rvIO.unobserve(li);
          li.style.setProperty('--k', k);
          li.style.setProperty('--step', gap.toFixed(0) + 'ms');
          li.classList.add('in');
          var done = false;
          var fin = function () { if (!done) { done = true; settle(li); } };
          li.addEventListener('animationend', function (e) { if (e.target === li) fin(); });
          setTimeout(fin, k * gap + 1100);
        });
      }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
      cards.forEach(function (li) { rvIO.observe(li); });
      /* floating only while the list is on screen */
      new IntersectionObserver(function (entries) {
        reviewList.classList.toggle('is-live', entries[0].isIntersecting);
      }, { threshold: 0 }).observe(reviewList);
    } else {
      cards.forEach(function (li) { li.classList.add('in', 'settled'); });
    }

    /* click a card: the full review in a dialog, with its source link */
    var rvOpener = null;
    if (dialogOK) {
      var rvBody = rvDialog.querySelector('.rv-dialog-body');
      reviewList.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('.rv-open') : null;
        if (!btn) return;
        var fig = btn.closest('.review');
        if (!fig) return;
        rvOpener = btn;
        rvBody.textContent = '';
        var out = doc.createElement('figure');
        ['.stars', 'blockquote', 'figcaption'].forEach(function (sel) {
          var node = fig.querySelector(sel);
          if (node) out.appendChild(node.cloneNode(true));
        });
        var link = out.querySelector('.rv-link');
        if (link) link.className = 'rv-link btn btn-primary';
        rvBody.appendChild(out);
        rvDialog.showModal();
      });
      rvDialog.addEventListener('click', function (e) {
        if (e.target === rvDialog || e.target.closest('.dlg-close')) rvDialog.close();
      });
      rvDialog.addEventListener('close', function () { if (rvOpener) rvOpener.focus(); });
    } else {
      qsa('.rv-open', reviewList).forEach(function (b) { b.hidden = true; });
    }
  }

  /* ==========================================================================
     Hours and the open-now pill. Each row can hold two spans (data-open2 and data-close2).
     ========================================================================== */
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function clock(tz) {
    var parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    var out = {};
    parts.forEach(function (p) { out[p.type] = p.value; });
    return { day: DAYS.indexOf(out.weekday), minutes: parseInt(out.hour, 10) * 60 + parseInt(out.minute, 10) };
  }
  function toMin(hhmm) {
    var p = hhmm.split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }
  function label(min) {
    if (min >= 1440) return 'midnight';
    var h = Math.floor(min / 60), m = min % 60;
    var suffix = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return h + (m ? ':' + (m < 10 ? '0' : '') + m : '') + ' ' + suffix;
  }
  function spans(tr) {
    var out = [];
    var o = tr.getAttribute('data-open'), c = tr.getAttribute('data-close');
    if (o && c) out.push([toMin(o), toMin(c)]);
    o = tr.getAttribute('data-open2'); c = tr.getAttribute('data-close2');
    if (o && c) out.push([toMin(o), toMin(c)]);
    return out;
  }

  function updateHours() {
    var table = doc.querySelector('[data-hours]');
    var pills = qsa('[data-open-pill]');
    if (!table) return;
    var tz = table.getAttribute('data-tz') || 'America/Toronto';
    var now;
    try { now = clock(tz); } catch (err) { return; }

    var rows = {};
    [].forEach.call(table.querySelectorAll('tr[data-day]'), function (tr) {
      var d = parseInt(tr.getAttribute('data-day'), 10);
      rows[d] = tr;
      tr.classList.toggle('today', d === now.day);
      if (tr.hasAttribute('data-closed')) tr.setAttribute('data-kind', 'closed');
      else if (spans(tr).length) tr.setAttribute('data-kind', 'open');
      else tr.setAttribute('data-kind', 'unknown');
    });

    var confirmed = table.getAttribute('data-confirmed') === 'true';
    var text = '', state = '';
    if (confirmed) {
      var today = rows[now.day];
      if (today && today.getAttribute('data-kind') === 'open') {
        var list = spans(today);
        for (var s = 0; s < list.length && !state; s++) {
          if (now.minutes >= list[s][0] && now.minutes < list[s][1]) { state = 'open'; text = 'Open now, until ' + label(list[s][1]); }
        }
        for (var n = 0; n < list.length && !state; n++) {
          if (now.minutes < list[n][0]) { state = 'closed'; text = 'Closed, opens ' + label(list[n][0]); }
        }
      }
      if (!state) {
        state = 'closed'; text = 'Closed';
        for (var i = 1; i <= 7; i++) {
          var d = (now.day + i) % 7;
          var r = rows[d];
          if (r && r.getAttribute('data-kind') === 'open') {
            text = 'Closed, opens ' + (i === 1 ? 'tomorrow' : DAYS[d]) + ' ' + label(spans(r)[0][0]);
            break;
          }
        }
      }
    }
    pills.forEach(function (pill) {
      var out = pill.querySelector('[data-open-text]');
      if (!state) { pill.hidden = true; return; }
      pill.hidden = false;
      pill.setAttribute('data-state', state);
      if (out) out.textContent = text;
    });
  }
  updateHours();
  setInterval(updateHours, 60000);

  /* ==========================================================================
     Map: fades in when it has loaded. A tap or click makes it interactive, so
     scrolling the page over the map never gets caught by it.
     ========================================================================== */
  var mapEl = doc.querySelector('[data-map]');
  if (mapEl) {
    var mapFrame = mapEl.querySelector('iframe');
    var mapLoaded = function () { mapEl.classList.add('loaded'); };
    if (mapFrame) {
      mapFrame.addEventListener('load', mapLoaded);
      setTimeout(mapLoaded, 6000);
    }
    mapEl.addEventListener('click', function () { mapEl.classList.add('active'); });
    mapEl.addEventListener('mouseleave', function () { mapEl.classList.remove('active'); });
    doc.addEventListener('pointerdown', function (e) { if (!mapEl.contains(e.target)) mapEl.classList.remove('active'); });
  }

  /* ---------- contact form (preview only) ---------- */
  var form = doc.getElementById('contact-form');
  if (form) {
    var status = doc.getElementById('form-status');
    var fields = [
      { id: 'f-name', err: 'e-name', msg: 'Please add your name.' },
      { id: 'f-reach', err: 'e-reach', msg: 'Please add a phone number or email.' },
      { id: 'f-need', err: 'e-need', msg: 'Please say what your pet needs.' }
    ];
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.textContent = '';
      status.removeAttribute('data-state');
      var firstBad = null;
      fields.forEach(function (f) {
        var input = doc.getElementById(f.id);
        var bad = !input.value.trim();
        input.setAttribute('aria-invalid', bad ? 'true' : 'false');
        doc.getElementById(f.err).textContent = bad ? f.msg : '';
        if (bad && !firstBad) firstBad = input;
      });
      if (firstBad) { firstBad.focus(); return; }
      status.setAttribute('data-state', 'info');
      status.textContent = 'This is a preview, so nothing was sent. To reach BFF Groomer, text 289-990-9308.';
    });
  }

  /* ---------- email link, put together here so the address never sits whole in the page ---------- */
  var mailUser = 'bffgroomer', mailHost = 'gmail.com';
  qsa('[data-mail]').forEach(function (a) { a.setAttribute('href', 'mailto:' + mailUser + '@' + mailHost); });

  /* ---------- background video slot ---------- */
  var env = doc.querySelector('.env');
  var video = doc.querySelector('[data-video-slot]');
  var triedVideo = false;

  function wantPortrait() {
    return window.matchMedia('(orientation: portrait) and (max-width: 1024px)').matches;
  }
  function saveData() {
    var c = navigator.connection;
    return !!(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')));
  }
  function attach(urls) {
    if (!urls.length) return;
    var url = urls[0];
    function fail() { video.removeAttribute('src'); attach(urls.slice(1)); }
    video.addEventListener('canplay', function ok() {
      video.removeEventListener('canplay', ok);
      if (reduced()) return;
      env.classList.add('has-video');
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    });
    video.addEventListener('error', fail, { once: true });
    video.preload = 'auto';
    video.src = url;
    video.load();
  }
  function startVideo() {
    if (!video || !env || triedVideo || reduced() || saveData()) return;
    triedVideo = true;
    var names = wantPortrait()
      ? ['media/hero-film-portrait.mp4', 'media/hero-film.mp4']
      : ['media/hero-film.mp4'];
    if (location.protocol === 'file:') { attach(names); return; }
    var found = [];
    var chain = Promise.resolve();
    names.forEach(function (n) {
      chain = chain.then(function () {
        return fetch(n, { method: 'HEAD', cache: 'no-store' })
          .then(function (r) { if (r.ok) found.push(n); })
          .catch(function () {});
      });
    });
    chain.then(function () { attach(found); });
  }
  function stopVideo() {
    if (!video || !env) return;
    env.classList.remove('has-video');
    video.pause();
  }
  if (video && env) startVideo();

  /* ==========================================================================
     Reduced motion, live in both directions: effects stop and clear when it is
     switched on, and start again when it is switched off. (The CSS handles its
     own half with the media query.)
     ========================================================================== */
  reduceQuery.addEventListener('change', function () {
    if (reduced()) {
      clearParallax();
      qsa('[data-tilt]').forEach(untilt);
      heroClear = false;
      requestFrame();
      galleries.forEach(function (g) { if (g.drift) g.drift.stop(); });
      stopVideo();
    } else {
      requestFrame();
      galleries.forEach(function (g) { if (g.drift) g.drift.start(); });
      if (video && video.getAttribute('src')) { env.classList.add('has-video'); var p = video.play(); if (p && p.catch) p.catch(function () {}); }
      else { triedVideo = false; startVideo(); }
    }
  });
})();
