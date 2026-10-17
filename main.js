/* BFF Groomer mockup v4. Plain JS, no libraries. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var qs = function (s, el) { return (el || doc).querySelector(s); };
  var qsa = function (s, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(s)); };
  var still = root.classList.contains('still');
  var rm = window.matchMedia('(prefers-reduced-motion: reduce)');
  var calm = function () { return still || rm.matches; };

  /* ---------- headings rise word by word; the full heading stays readable to screen readers ---------- */
  qsa('[data-words]').forEach(function (h) {
    var text = h.textContent.trim();
    h.setAttribute('aria-label', text);
    h.innerHTML = text.split(/\s+/).map(function (word, i) {
      return '<span class="w" aria-hidden="true"><span style="--i:' + i + '">' + word + '</span></span>';
    }).join(' ');
  });

  /* ---------- hero entrance ---------- */
  requestAnimationFrame(function () {
    root.classList.add('is-ready');
    var h1 = qs('.hero h1');
    if (h1) h1.classList.add('is-in');
  });
  // headless captures never run rAF, so land the entrance on a timer too
  setTimeout(function () { root.classList.add('is-ready'); var h1 = qs('.hero h1'); if (h1) h1.classList.add('is-in'); }, 60);

  /* ---------- header state and scroll hairline ---------- */
  var bar = qs('#top-bar'), progress = qs('.progress'), hero = qs('#hero');
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY;
    bar.classList.toggle('is-scrolled', y > (hero ? hero.offsetHeight - 90 : 40));
    var max = doc.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- phone menu ---------- */
  var menuBtn = qs('.menu'), nav = qs('#nav');
  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    nav.classList.toggle('is-open', open);
    bar.classList.toggle('menu-open', open);
  }
  menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
  qsa('a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); } });

  /* ---------- hero slider ---------- */
  /* The current dot's ring fills over 6.5 s in CSS; its animationend advances the slide.
     Pausing the ring (hover, focus) pauses the slider, and reduced motion has no ring, so no autoplay. */
  var slides = qsa('[data-slide]'), dots = qsa('[data-dot]'), current = 0;
  function show(i) {
    current = (i + slides.length) % slides.length;
    slides.forEach(function (s, n) { s.classList.toggle('is-active', n === current); s.setAttribute('aria-hidden', n === current ? 'false' : 'true'); });
    dots.forEach(function (d, n) { d.setAttribute('aria-current', n === current ? 'true' : 'false'); });
  }
  var hovering = false, focused = false, userPaused = false;
  var pauseBtn = qs('.pause');
  function syncPause() { if (hero) hero.classList.toggle('is-paused', hovering || focused || userPaused); }
  function play() { hovering = false; focused = false; syncPause(); }
  function stop() { syncPause(); }
  if (pauseBtn) {
    pauseBtn.setAttribute('aria-pressed', 'false');
    pauseBtn.hidden = calm();
    pauseBtn.addEventListener('click', function () {
      userPaused = !userPaused;
      pauseBtn.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
      pauseBtn.setAttribute('aria-label', userPaused ? 'Play the photos' : 'Pause the photos');
      syncPause();
    });
  }
  dots.forEach(function (d) {
    d.addEventListener('animationend', function (e) { if (e.animationName === 'ring' && d.getAttribute('aria-current') === 'true') show(current + 1); });
    d.addEventListener('click', function () { show(+d.getAttribute('data-dot')); });
  });
  if (hero) {
    hero.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { hovering = true; syncPause(); } });
    hero.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { hovering = false; syncPause(); } });
    hero.addEventListener('focusin', function () { focused = true; syncPause(); });
    hero.addEventListener('focusout', function (e) { if (!hero.contains(e.relatedTarget)) { focused = false; syncPause(); } });
    var x0 = null;
    hero.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }
  var pick = location.search.match(/[?&]slide=(\d)/);
  show(pick ? +pick[1] - 1 : 0);

  /* hero circles lean a little toward the pointer (desktop, fine pointer) */
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var heroOrbs = qs('.hero .orbs');
  if (hero && heroOrbs) {
    hero.addEventListener('pointermove', function (e) {
      if (calm() || !fine.matches) return;
      var r = hero.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      heroOrbs.style.translate = (x * -28).toFixed(1) + 'px ' + (y * -20).toFixed(1) + 'px';
    });
    hero.addEventListener('pointerleave', function () { heroOrbs.style.translate = '0 0'; });
  }

  /* ---------- scroll reveals ---------- */
  var revealTargets = qsa('[data-reveal], .sec-head [data-words], [data-track]');
  qsa('[data-track]').forEach(function (t) { qsa('li', t).forEach(function (li, i) { li.style.setProperty('--i', Math.min(i, 5)); }); });
  function land(el) {
    el.classList.add('is-in');
    var words = el.matches('[data-words]') ? null : qs('[data-words]', el);
    if (words) words.classList.add('is-in');
  }
  if (calm() || !('IntersectionObserver' in window)) {
    revealTargets.forEach(land);
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { land(en.target); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: .12 });
    revealTargets.forEach(function (el) { io.observe(el); });
  }

  /* ---------- gallery rows: arrows scroll by 4 photos (1 on phones) ---------- */
  qsa('[data-row]').forEach(function (row) {
    var track = qs('[data-track]', row);
    var prev = qs('[data-dir="-1"]', row), next = qs('[data-dir="1"]', row);
    function step() {
      var item = qs('li', track);
      if (!item) return track.clientWidth;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      var per = window.innerWidth >= 900 ? 4 : 1;
      return (item.getBoundingClientRect().width + gap) * per;
    }
    function update() {
      var max = track.scrollWidth - track.clientWidth - 2;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max;
    }
    prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: calm() ? 'auto' : 'smooth' }); });
    next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: calm() ? 'auto' : 'smooth' }); });
    track.addEventListener('scroll', function () { requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  /* photos tilt toward the pointer (fine pointer only); the entrance lives on the li, the tilt on the button */
  qsa('.photo').forEach(function (p) {
    p.addEventListener('pointermove', function (e) {
      if (calm() || e.pointerType !== 'mouse') return;
      var r = p.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      p.style.transform = 'perspective(700px) rotateX(' + (y * -7).toFixed(2) + 'deg) rotateY(' + (x * 7).toFixed(2) + 'deg) translateY(-4px)';
    });
    p.addEventListener('pointerleave', function () { p.style.transform = ''; });
  });

  /* cursor spotlight on cards */
  qsa('.spot').forEach(function (c) {
    c.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* depth: discs, circles and the booking dog drift at their own speed while scrolling */
  var deep = qsa('[data-depth]');
  function depth() {
    if (calm()) return;
    var vh = window.innerHeight;
    deep.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      var off = (r.top + r.height / 2 - vh / 2) * parseFloat(el.getAttribute('data-depth'));
      el.style.translate = '0 ' + off.toFixed(1) + 'px';
    });
  }
  if (deep.length) {
    window.addEventListener('scroll', function () { requestAnimationFrame(depth); }, { passive: true });
    depth();
  }

  /* ---------- lightbox ---------- */
  var lb = qs('#lightbox'), photos = qsa('.photo'), lbIndex = 0;
  function openLb(i) {
    lbIndex = (i + photos.length) % photos.length;
    var p = photos[lbIndex], img = qs('img', lb);
    img.src = p.getAttribute('data-full');
    img.alt = qs('img', p).alt;
    qs('figcaption', lb).textContent = p.getAttribute('data-caption');
    if (!lb.open) lb.showModal();
  }
  if (lb && lb.showModal) {
    photos.forEach(function (p, i) { p.addEventListener('click', function () { openLb(i); }); });
    qs('.lb-close', lb).addEventListener('click', function () { lb.close(); });
    qs('.lb-prev', lb).addEventListener('click', function () { openLb(lbIndex - 1); });
    qs('.lb-next', lb).addEventListener('click', function () { openLb(lbIndex + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.tagName === 'FIGURE') lb.close(); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') openLb(lbIndex - 1);
      if (e.key === 'ArrowRight') openLb(lbIndex + 1);
    });
    lb.addEventListener('close', function () { var p = photos[lbIndex]; if (p) p.focus(); });
  }

  /* ---------- phone book bar appears once the hero is gone ---------- */
  var bookBar = qs('.book-bar'), bookSec = qs('#book');
  if (bookBar && hero && 'IntersectionObserver' in window) {
    var heroGone = false, bookIn = false;
    function sync() {
      var on = heroGone && !bookIn;
      bookBar.classList.toggle('is-on', on);
      bookBar.inert = !on;
    }
    new IntersectionObserver(function (e) { heroGone = !e[0].isIntersecting; sync(); }).observe(hero);
    if (bookSec) new IntersectionObserver(function (e) { bookIn = e[0].isIntersecting; sync(); }).observe(bookSec);
  }

  /* ---------- hero dog drifts a little slower than the page ---------- */
  var heroCopy = qs('.hero-copy');
  function parallax() {
    if (calm()) return;
    var y = window.scrollY, h = hero.offsetHeight;
    if (y > h) return;
    var dog = qs('.slide.is-active .slide-dog');
    if (dog) dog.style.translate = '0 ' + (y * 0.18).toFixed(1) + 'px';
    heroCopy.style.transform = 'translateY(' + (y * -0.08).toFixed(1) + 'px)';
    heroCopy.style.opacity = String(Math.max(0, 1 - y / (h * 0.8)));
  }
  window.addEventListener('scroll', function () { requestAnimationFrame(parallax); }, { passive: true });

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

  /* ---------- reduced motion can change while the page is open ---------- */
  var onRm = function () {
    if (pauseBtn) pauseBtn.hidden = calm();
    if (calm()) {
      revealTargets.forEach(land);
      deep.forEach(function (el) { el.style.translate = ''; });
      if (heroOrbs) heroOrbs.style.translate = '';
    }
  };
  if (rm.addEventListener) rm.addEventListener('change', onRm); else if (rm.addListener) rm.addListener(onRm);
})();
