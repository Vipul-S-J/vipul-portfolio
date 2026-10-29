// ============================================================
//  Portfolio interactions & animations (Motion: https://motion.dev)
// ============================================================

(function () {
  'use strict';

  var root = document.documentElement;
  var M = window.Motion;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function showEverything() {
    clearTimeout(window.__revealFallback);
    root.classList.add('reveal-all');
    $$('[data-count]').forEach(function (el) {
      el.textContent = (el.dataset.prefix || '') + el.dataset.count + (el.dataset.suffix || '');
    });
  }

  // ----------------------------------------------------------
  // Navigation: menu, smooth scroll, hide on scroll, active link
  // ----------------------------------------------------------
  var nav = $('#nav');
  var toggle = $('#navToggle');
  var links = $('#navLinks');
  var indicator = $('#navIndicator');
  var navAnchors = links ? $$('a[href^="#"]', links) : [];
  var activeLink = null;
  var autoScrollUntil = 0;

  function setMenu(open) {
    if (!links || !toggle) return;
    links.classList.toggle('open', open);
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      setMenu(!links.classList.contains('open'));
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setMenu(false);
  });

  function scrollToId(id) {
    var target = document.getElementById(id);
    if (!target) return;
    autoScrollUntil = Date.now() + 1200;
    if (nav) nav.classList.remove('nav--hidden');
    var navH = (nav && nav.offsetHeight) || 72;
    var top = id === 'home' ? 0 : target.getBoundingClientRect().top + window.scrollY - navH + 1;
    window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      if (!id || !document.getElementById(id)) return;
      e.preventDefault();
      setMenu(false);
      scrollToId(id);
      history.replaceState(null, '', '#' + id);
      if (id === 'main') document.getElementById(id).focus({ preventScroll: true });
    });
  });

  var lastY = window.scrollY;
  var ticking = false;
  function onScroll() {
    var y = window.scrollY;
    if (nav) {
      nav.classList.toggle('nav--scrolled', y > 20);
      var hide = y > lastY && y > 240 && !links.classList.contains('open') && Date.now() > autoScrollUntil;
      nav.classList.toggle('nav--hidden', hide);
    }
    lastY = y;
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  // Sliding indicator under the nav links (springs keep velocity when interrupted)
  var INDICATOR = { type: 'spring', visualDuration: 0.35, bounce: 0.12 };
  function moveIndicator(link) {
    if (!indicator || !M || window.innerWidth <= 768) return;
    if (!link) {
      M.animate(indicator, { opacity: 0 }, { duration: 0.2 });
      return;
    }
    M.animate(indicator, {
      x: link.offsetLeft,
      scaleX: link.offsetWidth / 100,
      opacity: 1
    }, INDICATOR);
  }

  function setActive(link) {
    if (link === activeLink) return;
    navAnchors.forEach(function (a) { a.classList.toggle('active', a === link); });
    activeLink = link;
    moveIndicator(link);
  }

  if ('IntersectionObserver' in window && navAnchors.length) {
    var byId = {};
    navAnchors.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(byId[entry.target.id] || null);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach(function (sec) { spy.observe(sec); });

    navAnchors.forEach(function (a) {
      a.addEventListener('pointerenter', function () { moveIndicator(a); });
      a.addEventListener('pointerleave', function () { moveIndicator(activeLink); });
    });
    window.addEventListener('resize', function () { moveIndicator(activeLink); });
  }

  // ----------------------------------------------------------
  // Typing effect
  // ----------------------------------------------------------
  // Shared pause state for looping animations (typing, particles, CSS loops)
  var loops = { paused: false, listeners: [] };
  try { loops.paused = localStorage.getItem('motionPaused') === '1'; } catch (e) {}
  function onLoopsChange(fn) { loops.listeners.push(fn); }

  function initMotionToggle() {
    var btn = $('#motionToggle');
    var label = $('#motionToggleLabel');
    if (!btn || reduceMotion) return;
    btn.hidden = false;
    function render() {
      root.classList.toggle('motion-paused', loops.paused);
      btn.setAttribute('aria-pressed', String(loops.paused));
      label.textContent = loops.paused ? 'Play animations' : 'Pause animations';
    }
    btn.addEventListener('click', function () {
      loops.paused = !loops.paused;
      try { localStorage.setItem('motionPaused', loops.paused ? '1' : '0'); } catch (e) {}
      render();
      loops.listeners.forEach(function (fn) { fn(loops.paused); });
    });
    render();
  }

  function startTyping() {
    var typed = $('#typed');
    if (!typed || reduceMotion) return;
    var phrases = [
      'build and secure the cloud.',
      'ship zero-downtime deploys.',
      'design resilient AWS networks.',
      'turn events into analytics.'
    ];
    var p = 0, c = phrases[0].length, deleting = true, timer = 0;
    onLoopsChange(function (paused) {
      clearTimeout(timer);
      if (paused) {
        typed.textContent = phrases[0];
        p = 0; c = phrases[0].length; deleting = true;
      } else {
        timer = setTimeout(tick, 1200);
      }
    });
    function tick() {
      if (loops.paused) return;
      typed.textContent = phrases[p].slice(0, c);
      var delay = deleting ? 26 : 55;
      if (deleting) {
        c--;
        if (c < 0) { deleting = false; p = (p + 1) % phrases.length; c = 0; delay = 320; }
      } else {
        c++;
        if (c > phrases[p].length) { deleting = true; c = phrases[p].length; delay = 2400; }
      }
      timer = setTimeout(tick, delay);
    }
    if (!loops.paused) timer = setTimeout(tick, 2600);
  }

  // ----------------------------------------------------------
  // Copy email
  // ----------------------------------------------------------
  function initCopy() {
    var btn = $('#copyEmail');
    var label = $('#copyLabel');
    var status = $('#copyStatus');
    if (!btn) return;
    var timer;

    function swapLabel(text) {
      if (!M || reduceMotion) { label.textContent = text; return; }
      M.animate(label, { opacity: 0, y: -6 }, { duration: 0.12 }).then(function () {
        label.textContent = text;
        M.animate(label, { opacity: [0, 1], y: [6, 0] }, { type: 'spring', visualDuration: 0.25, bounce: 0 });
      });
    }

    function fallbackCopy(text) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      return ok ? Promise.resolve() : Promise.reject();
    }

    btn.addEventListener('click', function () {
      var email = btn.dataset.email;
      var copy = navigator.clipboard && window.isSecureContext
        ? navigator.clipboard.writeText(email)
        : fallbackCopy(email);
      copy.then(function () {
        swapLabel('Copied ✓');
        status.textContent = 'Email address copied to clipboard';
      }, function () {
        swapLabel(email);
        status.textContent = 'Copy failed. Email address is ' + email;
      });
      clearTimeout(timer);
      timer = setTimeout(function () { swapLabel('Copy email'); status.textContent = ''; }, 2200);
    });
  }

  // ----------------------------------------------------------
  // Without Motion: show the page as-is and keep the essentials
  // ----------------------------------------------------------
  if (!M) {
    showEverything();
    initProjectGallery();
    startOrbIfPresent();
    initMotionToggle();
    startTyping();
    initCopy();
    return;
  }
  clearTimeout(window.__revealFallback);

  var animate = M.animate, inView = M.inView, scroll = M.scroll, stagger = M.stagger;

  // Motion presets: no overshoot on entrances, a little life on interactions
  var ENTER = { type: 'spring', visualDuration: 0.7, bounce: 0 };
  var FADE = { duration: 0.5, ease: 'easeOut' };
  var SNAP = { type: 'spring', visualDuration: 0.3, bounce: 0.15 };
  var TILT = { type: 'spring', stiffness: 320, damping: 28 };

  function enter(targets, distance, delay) {
    if (reduceMotion) {
      return animate(targets, { opacity: [0, 1] }, { duration: 0.25, delay: delay });
    }
    return animate(targets, { opacity: [0, 1], y: [distance, 0] }, {
      y: Object.assign({ delay: delay }, ENTER),
      opacity: Object.assign({ delay: delay }, FADE)
    });
  }

  // ----------------------------------------------------------
  // Hero entrance + orb
  // ----------------------------------------------------------
  enter($$('[data-hero]'), 28, stagger(0.09, { startDelay: 0.1 }));

  var orbEl = $('#orb');
  if (orbEl) {
    if (reduceMotion) {
      animate(orbEl, { opacity: [0, 1] }, { duration: 0.3 });
    } else {
      animate(orbEl, { opacity: [0, 1], scale: [0.85, 1] }, {
        scale: { type: 'spring', visualDuration: 1.2, bounce: 0, delay: 0.2 },
        opacity: { duration: 1, ease: 'easeOut', delay: 0.2 }
      });
    }
  }

  // Count-up stats
  inView('#stats', function (el) {
    var items = $$('[data-stat]', el);
    enter(items, 18, stagger(0.08, { startDelay: 0.75 }));
    $$('[data-count]', el).forEach(function (b, i) {
      var end = Number(b.dataset.count);
      var pre = b.dataset.prefix || '', suf = b.dataset.suffix || '';
      if (reduceMotion) { b.textContent = pre + end + suf; return; }
      animate(0, end, {
        duration: 1.6,
        delay: 0.85 + i * 0.08,
        ease: [0.22, 1, 0.36, 1],
        onUpdate: function (v) { b.textContent = pre + Math.round(v) + suf; }
      });
    });
  }, { amount: 0.3 });

  // ----------------------------------------------------------
  // Scroll-driven effects
  // ----------------------------------------------------------
  var progressBar = $('#scrollProgress');
  if (progressBar) scroll(animate(progressBar, { scaleX: [0, 1] }, { ease: 'linear' }));

  var timeline = $('#timeline');
  var timelineLine = $('#timelineLine');
  if (timeline && timelineLine) {
    scroll(animate(timelineLine, { scaleY: [0, 1] }, { ease: 'linear' }), {
      target: timeline,
      offset: ['start 75%', 'end 55%']
    });
  }

  var hero = $('#home');
  var heroGrid = $('#heroGrid');
  if (hero && heroGrid && !reduceMotion) {
    scroll(animate(heroGrid, { y: [0, -70], opacity: [1, 0.25] }, { ease: 'linear' }), {
      target: hero,
      offset: ['start start', 'end start']
    });
    if (orbEl) {
      scroll(animate(orbEl, { y: [0, 120], scale: [1, 0.9] }, { ease: 'linear' }), {
        target: hero,
        offset: ['start start', 'end start']
      });
    }
  }

  initProjectGallery();

  // ----------------------------------------------------------
  // Reveal on scroll
  // ----------------------------------------------------------
  inView('[data-reveal]', function (el) {
    enter(el, 32, 0);
  }, { margin: '0px 0px -12% 0px' });

  inView('[data-stagger]', function (el) {
    enter(Array.prototype.slice.call(el.children), 24, stagger(0.07));
  }, { margin: '0px 0px -10% 0px' });

  $$('[data-flow]').forEach(function (flow) {
    $$('li', flow).forEach(function (li, i) { li.style.setProperty('--i', i); });
  });
  inView('[data-flow]', function (el) {
    var nodes = $$('li', el);
    if (reduceMotion) {
      animate(nodes, { opacity: [0, 1] }, { duration: 0.25 });
    } else {
      animate(nodes, { opacity: [0, 1], x: [-8, 0] }, { duration: 0.4, ease: 'easeOut', delay: stagger(0.15, { startDelay: 0.25 }) });
    }
    el.classList.add('is-in');
  }, { amount: 0.6 });

  // ----------------------------------------------------------
  // Cards: hover lift, 3D tilt, cursor spotlight (mouse only)
  // ----------------------------------------------------------
  if (finePointer && !reduceMotion) {
    $$('[data-tilt]').forEach(function (card) {
      var target = { rotateX: 0, rotateY: 0 };
      animate(card, { transformPerspective: 1000 }, { duration: 0 });

      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', (px * 100) + '%');
        card.style.setProperty('--my', (py * 100) + '%');
        target.rotateX = (0.5 - py) * 6;
        target.rotateY = (px - 0.5) * 6;
        animate(card, target, TILT);
      });

      M.hover(card, function () {
        animate(card, { y: -6 }, SNAP);
        return function () {
          animate(card, { rotateX: 0, rotateY: 0, y: 0 }, SNAP);
        };
      });
    });

    // Background glow drifts gently toward the cursor
    var glow = $('#bgGlow');
    if (glow) {
      var glowTarget = { x: 0, y: 0 };
      var GLOW = { type: 'spring', stiffness: 40, damping: 20 };
      var glowQueued = false;
      window.addEventListener('pointermove', function (e) {
        glowTarget.x = (e.clientX / window.innerWidth - 0.5) * 140;
        glowTarget.y = (e.clientY / window.innerHeight - 0.5) * 140;
        if (glowQueued) return;
        glowQueued = true;
        window.requestAnimationFrame(function () {
          glowQueued = false;
          animate(glow, glowTarget, GLOW);
        });
      }, { passive: true });
    }
  }

  // Press feedback on buttons and links
  if (!reduceMotion) {
    M.press('[data-press]', function (el) {
      animate(el, { scale: 0.96 }, { type: 'spring', visualDuration: 0.15, bounce: 0 });
      return function () { animate(el, { scale: 1 }, SNAP); };
    });
  }

  initMotionToggle();
  startTyping();
  initCopy();

  // ----------------------------------------------------------
  // Hero orb: a rotating particle sphere (paused off-screen,
  // when the tab is hidden, or when animations are paused)
  // ----------------------------------------------------------
  startOrbIfPresent();

  function startOrbIfPresent() {
    var orbCanvas = $('#orbCanvas');
    if (!orbCanvas || !orbCanvas.getContext) return;
    fitOrb();
    window.addEventListener('resize', fitOrb);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitOrb);
    startOrb(orbCanvas, { animate: !reduceMotion, trackMouse: finePointer && !reduceMotion });
  }

  // Size the orb to the free space between the nav bar and the stats row,
  // so the sphere never runs under either of them.
  function fitOrb() {
    var orb = $('#orb'), hero = $('#home'), stats = $('#stats');
    if (!orb || !hero || !stats) return;
    var vw = document.documentElement.clientWidth;
    var MARGIN = 28;
    var SPHERE = 0.82; // visible sphere height as a share of the canvas size
    var heroTop = hero.getBoundingClientRect().top;
    var regionTop = ((nav && nav.offsetHeight) || 72) + MARGIN;
    var regionBot = stats.getBoundingClientRect().top - heroTop - MARGIN;
    var cap = vw <= 768 ? vw * 1.05 : vw <= 1024 ? Math.min(vw * 0.8, 560) : Math.min(vw * 0.46, 620);
    var size;
    var top;
    if (vw <= 768) {
      // Phones: the stats sit far below, so just keep the top clear of the nav bar
      size = cap;
      top = regionTop - size * (1 - SPHERE) / 2;
    } else {
      size = Math.max(240, Math.min(cap, (regionBot - regionTop) / SPHERE));
      top = (regionTop + regionBot) / 2 - size / 2;
    }
    orb.style.width = Math.round(size) + 'px';
    orb.style.top = Math.round(top) + 'px';
    orb.style.translate = 'none';
  }


  // ============================================================
  // Projects gallery: vertical scroll moves the cards sideways
  // ============================================================
  function initProjectGallery() {
    var wrap = $('#projectScroll');
    var track = $('#projectTrack');
    if (!wrap || !track) return;
    var cards = $$('.pcard', track);
    var bar = $('#projectBar');
    var idx = $('#projectIndex');

    if (finePointer) {
      cards.forEach(function (card) {
        card.addEventListener('pointermove', function (e) {
          var r = card.getBoundingClientRect();
          card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
          card.style.setProperty('--my', (e.clientY - r.top) + 'px');
        });
      });
    }

    // Without Motion or with reduced motion, keep the swipeable row
    if (!M || reduceMotion) return;

    wrap.classList.add('hscroll--pinned');
    var hint = $('#projectHint');
    if (hint) hint.textContent = 'Scroll to explore';
    var stops = [];
    var dist = 0;
    var lastWidth = 0;

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function build() {
      stops.forEach(function (stop) { stop(); });
      stops = [];
      track.style.transform = '';
      dist = Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
      wrap.style.setProperty('--hscroll-dist', dist + 'px');
      lastWidth = window.innerWidth;

      var opts = { target: wrap, offset: ['start start', 'end end'] };
      stops.push(scroll(animate(track, { x: [0, -dist] }, { ease: 'linear' }), opts));
      stops.push(scroll(function (progress) {
        if (bar) bar.style.transform = 'scaleX(' + (0.2 + 0.8 * progress) + ')';
        if (idx) idx.textContent = pad(Math.min(cards.length, Math.round(progress * (cards.length - 1)) + 1));
      }, opts));
    }

    build();
    var resizeTimer;
    window.addEventListener('resize', function () {
      if (window.innerWidth === lastWidth) return; // ignore mobile address-bar height changes
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 200);
    });

    // Keyboard users: bring a focused card into view instead of leaving it off-screen
    var sticky = $('#projectSticky');
    track.addEventListener('focusin', function (e) {
      var card = e.target.closest('.pcard');
      if (sticky) sticky.scrollLeft = 0; // browsers without overflow: clip may scroll it on focus
      if (!card || dist === 0) return;
      var first = cards[0].offsetLeft;
      var x = Math.min(dist, Math.max(0, card.offsetLeft - first));
      var wrapTop = wrap.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: wrapTop + x, behavior: 'auto' });
    });
  }

  // ============================================================
  // Particle sphere renderer (canvas 2D, no dependencies)
  // ============================================================
  function startOrb(canvas, opts) {
    var ctx = canvas.getContext('2d');
    // Sampled from the motion.dev orb: cream rim, yellow and amber body, orange shadow side
    var PALETTE = [
      [251, 250, 238], [255, 252, 190], [255, 249, 138], [248, 189, 88],
      [240, 150, 55], [230, 120, 30], [214, 98, 18], [160, 70, 12]
    ];
    var COLORS = PALETTE.map(function (c) { return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; });

    var pts = [];
  function addPoint(x, y, z, kind) {
      pts.push({ x: x, y: y, z: z, kind: kind, s: Math.random(), tw: Math.random() * Math.PI * 2 });
    }
    // Shell: evenly spread with a Fibonacci lattice, plus slight jitter
    var SHELL = 6000, golden = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < SHELL; i++) {
      var y = 1 - (i / (SHELL - 1)) * 2;
      var r = Math.sqrt(1 - y * y);
      var th = golden * i;
      var j = 1 + (Math.random() - 0.5) * 0.03;
      addPoint(Math.cos(th) * r * j, y * j, Math.sin(th) * r * j, 0);
    }
    // Core band: a flattened swirl through the middle
    for (var b = 0; b < 2200; b++) {
      var a = Math.random() * Math.PI * 2;
      var rr = 0.12 + Math.pow(Math.random(), 0.7) * 0.68;
      addPoint(Math.cos(a) * rr, (Math.random() - 0.5) * 0.09 * (1 - rr * 0.6), Math.sin(a) * rr, 1);
    }
    // Halo: sparse dust outside the shell
    for (var h = 0; h < 700; h++) {
      var u = Math.random() * 2 - 1, t2 = Math.random() * Math.PI * 2;
      var rad = 1.06 + Math.pow(Math.random(), 1.8) * 0.5;
      var rs = Math.sqrt(1 - u * u);
      addPoint(Math.cos(t2) * rs * rad, u * rad, Math.sin(t2) * rs * rad, 2);
    }

    var w = 0, hgt = 0, dpr = 1, R = 0;
  function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; hgt = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(hgt * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.min(w, hgt) * 0.38;
    }

    var rotY = 0.6, tiltX = 0.32, tiltZ = -0.12;
    var target = { tiltX: 0.32, offY: 0 }, offY = 0;
    var last = 0;

  function draw(time) {
      var dt = last ? Math.min(64, time - last) : 16;
      last = time;
      if (opts.animate) rotY += dt * 0.00018;
      tiltX += (target.tiltX - tiltX) * 0.04;
      offY += (target.offY - offY) * 0.04;

      var cy = Math.cos(rotY + offY), sy = Math.sin(rotY + offY);
      var cx = Math.cos(tiltX), sx = Math.sin(tiltX);
      var cz = Math.cos(tiltZ), sz = Math.sin(tiltZ);
      var breathe = 1 + Math.sin(time * 0.0009) * 0.012;
      var bandSpin = time * 0.00035;
      var ox = w / 2, oy = hgt / 2, F = 3.2;

      ctx.clearRect(0, 0, w, hgt);
      ctx.globalCompositeOperation = 'lighter';

      for (var k = 0; k < pts.length; k++) {
        var p = pts[k];
        var px = p.x, py = p.y, pz = p.z;
        if (p.kind === 1) { // the band swirls a little faster than the shell
          var cb = Math.cos(bandSpin), sb = Math.sin(bandSpin);
          var bx = px * cb - pz * sb; pz = px * sb + pz * cb; px = bx;
        }
        // rotate Y, then X (tilt), then Z
        var x1 = px * cy - pz * sy, z1 = px * sy + pz * cy;
        var y2 = py * cx - z1 * sx, z2 = py * sx + z1 * cx;
        var x3 = x1 * cz - y2 * sz, y3 = x1 * sz + y2 * cz;

        var scale = F / (F + z2) * R * breathe;
        var sxp = ox + x3 * scale, syp = oy + y3 * scale;
        var depth = (1 - z2) / 2; // 1 = front, 0 = back

        // colour: lit from the upper-left, warmer and darker toward the lower-right
        // colour runs left to right like the motion.dev orb: cream-yellow on the left, orange on the right
        var light = (-x3 * 0.85 - y3 * 0.15 + 1) / 2;
        var ci = Math.max(0, Math.min(7, Math.round((1 - light) * 7 + (p.kind === 2 ? 1 : 0))));
        // limb brightening: shell points near the silhouette glow, like a lit edge
        var rim = 1 - Math.abs(z2);
        rim = rim * rim * rim;
        var alpha;
        if (p.kind === 0) alpha = 0.1 + depth * 0.4 + rim * 0.9;
        else if (p.kind === 1) alpha = 0.55 + depth * 0.45;
        else alpha = 0.1 + p.s * 0.3;
        if (p.kind === 0 && rim > 0.45 && x3 < 0) ci = Math.max(0, ci - 1); // only the lit (left) rim goes paler
        if (p.kind === 1) ci = Math.max(2, Math.min(6, Math.round(2 + (x3 + 0.8) * 2.6)));
        if (opts.animate) alpha *= 0.82 + 0.18 * Math.sin(time * 0.002 + p.tw);

        var size = (p.kind === 2 ? 0.7 : 0.6 + p.s * 0.8) * (0.6 + depth * 0.7) * (p.kind === 0 ? 1 + rim * 0.5 : 1);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = COLORS[ci];
        ctx.fillRect(sxp, syp, size, size);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    var running = false, rafId = 0, onScreen = true;
  function loop(t) { draw(t); if (running) rafId = requestAnimationFrame(loop); }
  function play() { if (!running && opts.animate) { running = true; last = 0; rafId = requestAnimationFrame(loop); } }
  function stop() { running = false; cancelAnimationFrame(rafId); }
  function sync() {
      if (onScreen && !document.hidden && !loops.paused) play(); else stop();
    }

    if (opts.trackMouse) {
      window.addEventListener('pointermove', function (e) {
        target.tiltX = 0.32 + (e.clientY / window.innerHeight - 0.5) * 0.35;
        target.offY = (e.clientX / window.innerWidth - 0.5) * 0.6;
      }, { passive: true });
    }

    // Redraw whenever the canvas changes size (window resize or fitOrb)
    function onCanvasResize() { resize(); if (!running) draw(performance.now()); }
    if ('ResizeObserver' in window) {
      new ResizeObserver(onCanvasResize).observe(canvas);
    } else {
      var resizeTimer;
      window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(onCanvasResize, 150);
      });
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { onScreen = entries[0].isIntersecting; sync(); }).observe(canvas);
    }
    document.addEventListener('visibilitychange', sync);
    onLoopsChange(function () { sync(); if (!running) draw(performance.now()); });

    resize();
    draw(performance.now()); // a still frame first, so paused / reduced-motion visitors still see the orb
    sync();
  }
})();
