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
    var pct = $('#trafficPct');
    if (pct) pct.textContent = '100%';
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
  // Hero entrance + deploy terminal sequence
  // ----------------------------------------------------------
  enter($$('[data-hero]'), 28, stagger(0.09, { startDelay: 0.1 }));

  var terminal = $('#terminal');
  if (terminal) {
    var lines = $$('.terminal__body li', terminal);
    var bar = $('#trafficBar');
    var pctEl = $('#trafficPct');

    if (reduceMotion) {
      animate([terminal].concat(lines), { opacity: [0, 1] }, { duration: 0.25 });
      bar.style.transform = 'none';
      pctEl.textContent = '100%';
    } else {
      var pct = M.motionValue(0);
      pct.on('change', function (v) { pctEl.textContent = Math.round(v) + '%'; });

      var seq = [
        [terminal, { opacity: [0, 1], y: [30, 0], scale: [0.97, 1] }, { type: 'spring', visualDuration: 0.8, bounce: 0, at: 0.35 }]
      ];
      lines.forEach(function (li, i) {
        seq.push([li, { opacity: [0, 1], x: [-10, 0] }, { duration: 0.3, ease: 'easeOut', at: i === 0 ? 0.95 : '+0.12' }]);
        if (li.classList.contains('t-progress')) {
          seq.push([bar, { scaleX: [0, 1] }, { duration: 0.9, ease: 'easeInOut', at: '+0.05' }]);
          seq.push([pct, 100, { duration: 0.9, ease: 'easeInOut', at: '<' }]);
        }
      });
      // Play when the terminal is on screen (below the fold on phones)
      inView(terminal, function () { animate(seq); }, { amount: 0.4 });
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
  }

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
  // Hero particle network (paused when off-screen / tab hidden)
  // ----------------------------------------------------------
  var canvas = $('#heroCanvas');
  if (canvas && canvas.getContext && !reduceMotion) startParticles(canvas, finePointer);

  function startParticles(canvas, trackMouse) {
    var ctx = canvas.getContext('2d');
    var LINK = 125, LINK_MOUSE = 170;
    var mouse = { x: -9999, y: -9999 };
    var w = 0, h = 0, particles = [];
    var running = false, rafId = 0;

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.round(Math.min(70, Math.max(24, (w * h) / 20000)));
      particles = [];
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
          r: Math.random() * 1.5 + 0.6
        });
      }
    }

    function frameFn() {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        for (var j = i + 1; j < particles.length; j++) {
          var q = particles[j];
          var dx = p.x - q.x, dy = p.y - q.y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK) {
            ctx.strokeStyle = 'rgba(255, 59, 78, ' + (0.16 * (1 - d / LINK)) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }

        var mx = p.x - mouse.x, my = p.y - mouse.y;
        var md = Math.sqrt(mx * mx + my * my);
        if (md < LINK_MOUSE) {
          ctx.strokeStyle = 'rgba(255, 138, 92, ' + (0.35 * (1 - md / LINK_MOUSE)) + ')';
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }

        ctx.fillStyle = 'rgba(255, 90, 105, 0.75)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      if (running) rafId = window.requestAnimationFrame(frameFn);
    }

    function play() { if (!running) { running = true; rafId = window.requestAnimationFrame(frameFn); } }
    function pause() { running = false; window.cancelAnimationFrame(rafId); }

    if (trackMouse) {
      window.addEventListener('pointermove', function (e) {
        var r = canvas.getBoundingClientRect();
        mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      }, { passive: true });
    }

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });

    var heroVisible = true;
    function sync() {
      if (heroVisible && !document.hidden && !loops.paused) play(); else pause();
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        heroVisible = entries[0].isIntersecting;
        sync();
      }).observe(canvas.parentElement);
    }
    document.addEventListener('visibilitychange', sync);
    onLoopsChange(sync);

    resize();
    // Draw one still frame so a paused page still shows the network
    frameFn();
    sync();
  }
})();
