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

  /* ---------- the pack: sticker dogs with name tags ---------- */
  /* The ring on the pause button fills over 6.5 s in CSS; its animationend moves on to the next dog.
     Hovering or focusing the pack, or the pause button, holds it. Reduced motion has no ring, so no autoplay. */
  var pack = qs('.pack'), pups = qsa('[data-pup]'), bgs = qsa('[data-bg]');
  var ring = qs('.pause-ring'), live = qs('[data-live]');
  var current = 0;
  function load(i) {
    var img = qs('.pup-img', pups[i]);
    if (img && img.getAttribute('data-src')) { img.src = img.getAttribute('data-src'); img.removeAttribute('data-src'); }
  }
  function restartRing() {
    if (!ring) return;
    ring.classList.remove('run'); void ring.offsetWidth;
    if (!calm()) ring.classList.add('run');
  }
  function show(i, dir, announce) {
    var next = (i + pups.length) % pups.length;
    if (next === current) { restartRing(); return; }
    dir = dir || (next > current ? 1 : -1);
    var old = pups[current], neu = pups[next];
    load(next); load((next + 1) % pups.length);
    old.style.setProperty('--from', -dir);
    old.classList.remove('is-active'); old.setAttribute('aria-hidden', 'true');
    neu.style.transition = 'none'; neu.style.setProperty('--from', dir); void neu.offsetWidth; neu.style.transition = '';
    neu.classList.add('is-active'); neu.removeAttribute('aria-hidden');
    bgs.forEach(function (b, n) { b.classList.toggle('is-active', n === next); });
    current = next;
    if (live && announce) live.textContent = neu.getAttribute('aria-label');
    restartRing();
  }
  var hovering = false, focused = false, userPaused = false;
  var pauseBtn = qs('.pause');
  function syncPause() { if (hero) hero.classList.toggle('is-paused', hovering || focused || userPaused); }
  if (pauseBtn) {
    pauseBtn.setAttribute('aria-pressed', 'false');
    pauseBtn.hidden = calm();
    pauseBtn.addEventListener('click', function () {
      userPaused = !userPaused;
      pauseBtn.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
      pauseBtn.setAttribute('aria-label', userPaused ? 'Play the dogs' : 'Pause the dogs');
      syncPause();
    });
  }
  if (ring) ring.addEventListener('animationend', function (e) { if (e.animationName === 'ring') show(current + 1, 1); });
  qsa('[data-step]').forEach(function (b) {
    b.addEventListener('click', function () { var s = +b.getAttribute('data-step'); show(current + s, s, true); });
  });
  if (pack) {
    pack.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { hovering = true; syncPause(); } });
    pack.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { hovering = false; syncPause(); } });
    pack.addEventListener('focusin', function () { focused = true; syncPause(); });
    pack.addEventListener('focusout', function (e) { if (!pack.contains(e.relatedTarget)) { focused = false; syncPause(); } });
    pack.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1, 1, true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1, -1, true); }
    });
    var x0 = null;
    pack.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    pack.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1, true);
    }, { passive: true });
  }
  load(1);
  var pick = location.search.match(/[?&]slide=(\d+)/);
  if (pick) show(+pick[1] - 1); else restartRing();

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

  /* The hero's dogs, buttons and text scroll with the page. Only the background zooms and the
     circles and bubbles move, so nothing slides under the next section (Haydn, 2026-10-17). */

  /* ---------- soap bubbles: a handful rising through every [data-bubbles] section ---------- */
  var bubbleSets = [];
  if (!calm()) {
    qsa('[data-bubbles]').forEach(function (sec) {
      var phone = window.innerWidth < 900;
      var n = sec.id === 'hero' ? (phone ? 4 : 6) : (phone ? 3 : 4);
      var box = doc.createElement('div');
      box.className = 'bubbles bubbles--' + sec.getAttribute('data-bubbles');
      box.setAttribute('aria-hidden', 'true');
      var html = '';
      for (var k = 0; k < n; k++) {
        var s = Math.round(8 + Math.pow(Math.random(), 2) * 46);
        html += '<span class="bub" style="--x:' + (Math.random() * 96).toFixed(1) + '%;--s:' + s + 'px;--d:' + (11 + Math.random() * 14).toFixed(1) +
          's;--delay:-' + (Math.random() * 22).toFixed(1) + 's;--sw:' + (2.6 + Math.random() * 2.4).toFixed(1) + 's;--amp:' + Math.round(8 + Math.random() * 22) + 'px"><i></i></span>';
      }
      box.innerHTML = html;
      var orbsEl = qs('.orbs', sec);
      // above the section ground and its circles, under the content
      if (orbsEl) orbsEl.parentNode.insertBefore(box, orbsEl.nextSibling); else sec.insertBefore(box, sec.firstChild);
      bubbleSets.push({ sec: sec, box: box });
    });
    var sizeBubbles = function () { bubbleSets.forEach(function (b) { b.box.style.setProperty('--travel', -(b.sec.offsetHeight + 180) + 'px'); }); };
    sizeBubbles();
    window.addEventListener('resize', sizeBubbles);
    if ('IntersectionObserver' in window) {
      var bubbleIO = new IntersectionObserver(function (es) {
        es.forEach(function (e) { bubbleSets.forEach(function (b) { if (b.sec === e.target) b.box.classList.toggle('is-off', !e.isIntersecting); }); });
      }, { rootMargin: '200px 0px' });
      bubbleSets.forEach(function (b) { bubbleIO.observe(b.sec); });
    }
  }

  /* ---------- the grooming world behind the page ----------
     Grooming tools lead: scissors that snip (faster while you scroll), combs, clippers and slicker
     brushes, each at its own depth. Soft tufts of trimmed fur drift down past them, and a few soap
     bubbles float behind. Scrolling carries everything past at its own speed and wraps it round,
     fast scrolling stretches the bubbles and spins the tools, and the mouse leans the whole field. */
  var env = qs('.env'), envItems = [], envRise = null, envFall = null;
  var mouse = { tx: 0, ty: 0, x: 0, y: 0 };
  var vw = window.innerWidth, vh = window.innerHeight;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  var SNIPS = '<svg class="snips" viewBox="0 0 48 48">' +
    '<g class="blade blade-a"><path d="M24.6 26.5C25.8 18 27 10.6 28.4 3.8c-2.6 6.4-4.6 14-5.6 22.4z"/><path d="M23.4 27.6 17.6 34.4"/><circle cx="14.6" cy="38.2" r="4.6"/></g>' +
    '<g class="blade blade-b"><path d="M23.4 26.5C22.2 18 21 10.6 19.6 3.8c2.6 6.4 4.6 14 5.6 22.4z"/><path d="M24.6 27.6 30.4 34.4"/><circle cx="33.4" cy="38.2" r="4.6"/></g>' +
    '<circle class="pivot" cx="24" cy="26.6" r="1.3"/></svg>';
  var FUR = [
    '<path d="M4 20c2-6 1-11 4-15M9 21c1-5 2-9 6-13M14 21c0-4 3-7 6-9"/>',
    '<path d="M5 19c3-3 3-8 7-11 2-1.5 4-1 5 1M8 21c3-2 5-6 9-7 2-.4 3 .6 3 2"/>',
    '<path d="M12 21c-1-5-5-6-6-11M12 21c0-5 2-9 1-14M12 21c2-4 6-6 6-11"/>'
  ];
  if (env) {
    var small = vw < 900;
    var toolMix = ['snips', 'comb', 'snips', 'clippers', 'brush', 'snips', 'comb', 'clippers', 'brush', 'snips', 'comb', 'brush'];
    var nSoap = small ? 2 : 4, nTool = small ? 7 : 12, html = '';
    for (var a = 0; a < nSoap + nTool; a++) {
      var isSoap = a < nSoap, name = isSoap ? '' : toolMix[(a - nSoap) % toolMix.length];
      var side = a % 2 === 0 ? rnd(-0.08, 0.1) : rnd(0.9, 1.06);
      if (isSoap && a % 3 === 2) side = rnd(0.25, 0.75); // a bubble or two drifts across the open sections
      var s = isSoap ? Math.round(rnd(small ? 70 : 110, small ? 180 : 300))
        : name === 'snips' ? Math.round(rnd(small ? 50 : 74, small ? 78 : 124))
        : Math.round(rnd(small ? 40 : 56, small ? 60 : 92));
      envItems.push({ soap: isSoap, s: s, x: side, y0: rnd(0, 1), k: isSoap ? rnd(0.12, 0.34) : rnd(0.45, 0.8), rot: rnd(-35, 35) });
      html += '<div class="env-item">' + (isSoap
        ? '<div class="soap" style="--s:' + s + 'px;--w:' + rnd(7, 12).toFixed(1) + 's"><i></i></div>'
        : '<div class="tool" style="--s:' + s + 'px;--w:' + rnd(5, 9).toFixed(1) + 's;--snip:' + rnd(1.1, 1.8).toFixed(2) + 's">' +
          (name === 'snips' ? SNIPS : '<svg><use href="#ic-' + name + '"/></svg>') + '</div>') + '</div>';
    }
    var rise = '';
    for (var b = 0; b < (small ? 3 : 4); b++) {
      var bs = Math.round(8 + Math.pow(Math.random(), 2) * 40);
      rise += '<span class="bub" style="--x:' + (Math.random() * 96).toFixed(1) + '%;--s:' + bs + 'px;--d:' + rnd(12, 26).toFixed(1) +
        's;--delay:-' + rnd(0, 24).toFixed(1) + 's;--sw:' + rnd(2.6, 5).toFixed(1) + 's;--amp:' + Math.round(rnd(8, 30)) + 'px"><i></i></span>';
    }
    var fall = '', furColours = ['var(--gold)', 'var(--violet)', '#B98BFF', '#C98A4E'];
    for (var f = 0; f < (small ? 8 : 14); f++) {
      fall += '<span class="fur" style="--x:' + (Math.random() * 96).toFixed(1) + '%;--s:' + Math.round(rnd(small ? 22 : 28, small ? 38 : 52)) +
        'px;--d:' + rnd(9, 18).toFixed(1) + 's;--delay:-' + rnd(0, 18).toFixed(1) + 's;--tw:' + rnd(2, 4).toFixed(1) + 's;--dx:' + Math.round(rnd(-70, 70)) +
        'px;--o:' + rnd(0.4, 0.7).toFixed(2) + ';color:' + furColours[f % furColours.length] + '"><svg viewBox="0 0 24 24">' + FUR[f % FUR.length] + '</svg></span>';
    }
    env.innerHTML = html + '<div class="env-rise bubbles--light">' + rise + '</div><div class="env-fall">' + fall + '</div>';
    qsa('.env-item', env).forEach(function (el, i) { envItems[i].el = el; });
    envRise = qs('.env-rise', env);
    envFall = qs('.env-fall', env);
  }
  function placeEnv(y, still) {
    var stretch = still ? 0 : Math.min(Math.abs(vel) * 0.01, 0.26);
    var spin = still ? 0 : Math.max(-28, Math.min(28, vel * 0.7));
    envItems.forEach(function (it) {
      var span = vh + it.s * 2 + 120;
      var py = ((it.y0 * span - y * it.k) % span + span) % span - it.s - 60;
      var px = it.x * vw - it.s / 2 + mouse.x * it.k * 90;
      py += mouse.y * it.k * 60;
      it.el.style.translate = px.toFixed(1) + 'px ' + py.toFixed(1) + 'px';
      if (it.soap) it.el.style.scale = (1 - stretch * 0.4).toFixed(3) + ' ' + (1 + stretch).toFixed(3);
      else it.el.style.rotate = (it.rot + spin).toFixed(1) + 'deg';
    });
    var push = still ? 0 : Math.max(-90, Math.min(90, vel * 2.6));
    if (envRise) {
      envRise.style.setProperty('--travel', -(vh + 160) + 'px');
      envRise.style.translate = '0 ' + push.toFixed(1) + 'px';
    }
    if (envFall) {
      envFall.style.setProperty('--fall', (vh + 140) + 'px');
      envFall.style.translate = '0 ' + (push * 0.7).toFixed(1) + 'px';
    }
    // the scissors snip faster while the page is moving
    if (env) env.classList.toggle('is-fast', !still && Math.abs(vel) > 5);
  }

  /* ---------- grooming tools in the hero too ----------
     A few tools and fur tufts sit in the hero's open spaces: the edges and the gap between the dog
     and the words. They bob and snip like the ones behind the page, lean with the mouse and spin
     with scroll speed. */
  var heroTools = [];
  if (hero) {
    var hsm = vw < 900;
    var spots = hsm
      ? [[0.9, 0.64, 'snips'], [0.07, 0.7, 'comb'], [0.91, 0.86, 'clippers'], [0.08, 0.9, 'snips']]
      : [[0.44, 0.16, 'snips'], [0.03, 0.5, 'comb'], [0.45, 0.72, 'clippers'], [0.96, 0.3, 'brush'], [0.95, 0.6, 'snips']];
    var hhtml = '';
    spots.forEach(function (p) {
      var sz = Math.round(p[2] === 'snips' ? rnd(hsm ? 46 : 70, hsm ? 58 : 96) : rnd(hsm ? 38 : 56, hsm ? 50 : 80));
      hhtml += '<div class="hero-tool" style="left:' + (p[0] * 100).toFixed(1) + '%;top:' + (p[1] * 100).toFixed(1) + '%"><div class="tool" style="--s:' + sz +
        'px;--w:' + rnd(5, 9).toFixed(1) + 's;--snip:' + rnd(1.1, 1.8).toFixed(2) + 's">' + (p[2] === 'snips' ? SNIPS : '<svg><use href="#ic-' + p[2] + '"/></svg>') + '</div></div>';
    });
    var hfall = '';
    for (var hf = 0; hf < (hsm ? 4 : 6); hf++) {
      hfall += '<span class="fur" style="--x:' + (Math.random() * 96).toFixed(1) + '%;--s:' + Math.round(rnd(22, 40)) + 'px;--d:' + rnd(8, 14).toFixed(1) +
        's;--delay:-' + rnd(0, 14).toFixed(1) + 's;--tw:' + rnd(2, 4).toFixed(1) + 's;--dx:' + Math.round(rnd(-50, 50)) + 'px;--o:' + rnd(0.35, 0.6).toFixed(2) +
        ';color:' + (hf % 2 ? 'var(--gold)' : 'var(--lilac)') + '"><svg viewBox="0 0 24 24">' + FUR[hf % FUR.length] + '</svg></span>';
    }
    var heroField = doc.createElement('div');
    heroField.className = 'hero-field';
    heroField.setAttribute('aria-hidden', 'true');
    heroField.innerHTML = hhtml + '<div class="hero-fall">' + hfall + '</div>';
    var heroOrbsEl = qs('.orbs', hero);
    hero.insertBefore(heroField, heroOrbsEl ? heroOrbsEl.nextSibling : hero.firstChild);
    var heroFall = qs('.hero-fall', heroField);
    heroFall.style.setProperty('--fall', (hero.offsetHeight + 100) + 'px');
    qsa('.hero-tool', heroField).forEach(function (el) { heroTools.push({ el: el, rot: rnd(-30, 30), k: rnd(0.5, 1) }); });
  }
  function placeHeroTools(isStill) {
    var spin = isStill ? 0 : Math.max(-28, Math.min(28, vel * 0.7));
    heroTools.forEach(function (t) {
      t.el.style.rotate = (t.rot + spin).toFixed(1) + 'deg';
      t.el.style.translate = 'calc(-50% + ' + (mouse.x * t.k * 40).toFixed(1) + 'px) calc(-50% + ' + (mouse.y * t.k * 30).toFixed(1) + 'px)';
    });
  }

  /* ---------- the hero and booking circles answer the scroll too ---------- */
  var depthSet = [0.34, -0.22, 0.5, -0.38, 0.2, -0.3, 0.42];
  var orbList = qsa('.orbs i').map(function (o, i) {
    return { el: o, sec: o.closest('section') || o.parentNode, k: depthSet[i % depthSet.length] };
  });
  var heroBg = qs('.hero-slides');
  var lastY = window.scrollY, vel = 0, sraf = null;
  function react() {
    sraf = null;
    var y = window.scrollY, v = y - lastY;
    lastY = y;
    if (calm()) { vel = 0; placeEnv(y, true); return; }
    vel += (v - vel) * 0.2;
    mouse.x += (mouse.tx - mouse.x) * 0.07;
    mouse.y += (mouse.ty - mouse.y) * 0.07;
    placeEnv(y, false);
    placeHeroTools(false);
    var push = Math.max(-80, Math.min(80, vel * 2.4));
    var stretch = Math.min(Math.abs(vel) * 0.009, 0.24);
    var seen = [];
    orbList.forEach(function (o) {
      var hit = null;
      for (var i = 0; i < seen.length; i++) if (seen[i].s === o.sec) { hit = seen[i].r; break; }
      if (!hit) { hit = o.sec.getBoundingClientRect(); seen.push({ s: o.sec, r: hit }); }
      if (hit.bottom < -150 || hit.top > vh + 150) return;
      var off = (hit.top + hit.height / 2 - vh / 2) * o.k;
      o.el.style.translate = '0 ' + (off + push * o.k * 2.2).toFixed(1) + 'px';
      o.el.style.scale = (1 - stretch * 0.45).toFixed(3) + ' ' + (1 + stretch).toFixed(3);
    });
    bubbleSets.forEach(function (bs) { bs.box.style.translate = '0 ' + push.toFixed(1) + 'px'; });
    if (heroBg && hero) {
      var p = Math.min(1, y / hero.offsetHeight);
      heroBg.style.scale = (1 + p * 0.18).toFixed(3);
      heroBg.style.translate = '0 ' + (p * 60).toFixed(1) + 'px';
    }
    var moving = Math.abs(vel) > 0.06 || v !== 0 || Math.abs(mouse.tx - mouse.x) > 0.002 || Math.abs(mouse.ty - mouse.y) > 0.002;
    if (moving) sraf = requestAnimationFrame(react);
  }
  function kick() { if (!sraf) sraf = requestAnimationFrame(react); }
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    mouse.tx = e.clientX / vw - 0.5;
    mouse.ty = e.clientY / vh - 0.5;
    kick();
  }, { passive: true });
  window.addEventListener('resize', function () { vw = window.innerWidth; vh = window.innerHeight; placeEnv(window.scrollY, calm()); kick(); });
  placeEnv(window.scrollY, calm());
  react();

  /* ---------- booking request (preview only) ----------
     Checks the request, then shows the email BFF Groomer would receive, with one-tap links to text
     or email the customer a confirmation and to add the visit to a calendar. On the live site the
     same details go to /api/contact and land in her inbox. Customer details are only ever written
     with textContent and encoded into links, never parsed as HTML. */
  var form = doc.getElementById('contact-form');
  if (form) {
    var status = doc.getElementById('form-status');
    var dateIn = doc.getElementById('f-date');
    var now = new Date();
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    if (dateIn) dateIn.min = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    var val = function (n) { var el = form.elements[n]; return el && el.value ? String(el.value).trim() : ''; };
    var pick = function (n) { var c = qs('input[name="' + n + '"]:checked', form); return c ? c.value : ''; };
    var errs = ['e-name', 'e-reach', 'e-animal', 'e-service', 'e-date'];
    function fail(errId, msg, target, group) {
      doc.getElementById(errId).textContent = msg;
      if (group) group.setAttribute('aria-invalid', 'true');
      else if (target) target.setAttribute('aria-invalid', 'true');
      return target;
    }
    function niceDate(iso) {
      var d = new Date(iso + 'T12:00:00');
      return d.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });
    }
    function row(dl, label, value) {
      if (!value) return;
      var wrap = doc.createElement('div'), dt = doc.createElement('dt'), dd = doc.createElement('dd');
      dt.textContent = label; dd.textContent = value;
      wrap.appendChild(dt); wrap.appendChild(dd); dl.appendChild(wrap);
    }
    function showInbox(b) {
      var inbox = doc.getElementById('inbox'), rows = doc.getElementById('mail-rows');
      var petLabel = b.pet ? b.pet + ' (' + b.animal.toLowerCase() + ')' : b.animal;
      var when = niceDate(b.date) + ', ' + b.time.toLowerCase();
      doc.getElementById('mail-subject').textContent = 'New booking request: ' + (b.pet || b.animal) + ', ' + b.service + ', ' + when;
      rows.textContent = '';
      row(rows, 'Name', b.name); row(rows, 'Phone', b.phone); row(rows, 'Email', b.email);
      row(rows, 'Pet', petLabel); row(rows, 'Service', b.service); row(rows, 'When', when); row(rows, 'Notes', b.need);
      var first = b.name.split(/\s+/)[0];
      var who = b.pet || 'your ' + b.animal.toLowerCase();
      var msg = 'Hi ' + first + ', it\'s BFF Groomer. ' + who + ' is booked in for ' + niceDate(b.date) + ' (' + b.time.toLowerCase() +
        '). Reply here if anything changes. See you then!';
      var textBtn = doc.getElementById('mail-text'), mailBtn = doc.getElementById('mail-email'), calBtn = doc.getElementById('mail-cal');
      var digits = b.phone.replace(/[^\d+]/g, '');
      if (/^\d{10}$/.test(digits)) digits = '+1' + digits;
      textBtn.hidden = !digits;
      if (digits) textBtn.href = 'sms:' + digits + '?&body=' + encodeURIComponent(msg);
      mailBtn.hidden = !b.email;
      if (b.email) mailBtn.href = 'mailto:' + encodeURIComponent(b.email) + '?subject=' + encodeURIComponent('Your BFF Groomer booking') + '&body=' + encodeURIComponent(msg);
      var day = b.date.replace(/-/g, ''), next = new Date(b.date + 'T12:00:00');
      next.setDate(next.getDate() + 1);
      var end = next.getFullYear() + pad(next.getMonth() + 1) + pad(next.getDate());
      calBtn.href = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('Groom: ' + petLabel + ', ' + b.name) +
        '&dates=' + day + '/' + end + '&details=' + encodeURIComponent(b.service + ', ' + b.time.toLowerCase() + '\n' + [b.phone, b.email].filter(Boolean).join(' / ') + (b.need ? '\n' + b.need : ''));
      inbox.hidden = false;
      window.scrollTo({ top: inbox.getBoundingClientRect().top + window.scrollY - 100, behavior: calm() ? 'auto' : 'smooth' });
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.textContent = '';
      status.removeAttribute('data-state');
      errs.forEach(function (id) { doc.getElementById(id).textContent = ''; });
      qsa('[aria-invalid]', form).forEach(function (el) { el.removeAttribute('aria-invalid'); });
      var b = { name: val('name'), phone: val('phone'), email: val('email'), animal: pick('animal'), pet: val('pet'),
        service: pick('service'), date: val('date'), time: pick('time') || 'Any time', need: val('need') };
      var bad = [];
      if (!b.name) bad.push(fail('e-name', 'Please add your name.', form.elements.name));
      if (!b.phone && !b.email) bad.push(fail('e-reach', 'Please add a phone number or an email.', form.elements.phone));
      else if (b.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) bad.push(fail('e-reach', 'Please check the email address.', form.elements.email));
      if (!b.animal) bad.push(fail('e-animal', 'Please choose your pet.', qs('input[name="animal"]', form), doc.getElementById('e-animal').closest('fieldset')));
      if (!b.service) bad.push(fail('e-service', 'Please choose a service.', qs('input[name="service"]', form), doc.getElementById('e-service').closest('fieldset')));
      if (!b.date) bad.push(fail('e-date', 'Please pick a day.', dateIn));
      if (bad.length) { bad[0].focus(); return; }
      if (form.elements.website && form.elements.website.value) return;
      status.setAttribute('data-state', 'info');
      status.textContent = 'Request ready. On the live site this goes straight to BFF Groomer, who texts or emails you to confirm. This preview sends nothing.';
      showInbox(b);
    });
    // "Book this" on a service card picks that service in the form
    qsa('[data-service]').forEach(function (a) {
      a.addEventListener('click', function () {
        var r = qs('input[name="service"][value="' + a.getAttribute('data-service') + '"]', form);
        if (r) r.checked = true;
      });
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
      orbList.forEach(function (o) { o.el.style.translate = ''; o.el.style.scale = ''; });
      bubbleSets.forEach(function (b) { b.box.style.translate = ''; });
      if (heroBg) { heroBg.style.scale = ''; heroBg.style.translate = ''; }
      placeEnv(window.scrollY, true);
    }
  };
  if (rm.addEventListener) rm.addEventListener('change', onRm); else if (rm.addListener) rm.addListener(onRm);
})();
