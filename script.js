// ============================================================
//  Portfolio interactions & animations (Motion: https://motion.dev)
// ============================================================

(function () {
  'use strict';

  var root = document.documentElement;
  var G = window.gsap;
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
  // Theme: dark (default) or light, remembered in localStorage.
  // The switch grows out of the button via the View Transitions API
  // where the browser supports it; otherwise it changes instantly.
  // ----------------------------------------------------------
  var introDone = (window.__intro && window.__intro.done) || Promise.resolve();
  var theme = initTheme();
  function initTheme() {
    var btn = $('#themeToggle');
    var meta = $('meta[name="theme-color"]');
    var BAR = { dark: '#0d0506', light: '#faf6f5' };
    function current() { return root.dataset.theme === 'light' ? 'light' : 'dark'; }
    function paint(name) {
      root.dataset.theme = name;
      if (meta) meta.setAttribute('content', BAR[name]);
      if (btn) btn.setAttribute('aria-label', name === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    }
    function set(name, origin) {
      try { localStorage.setItem('theme', name); } catch (e) {}
      if (!document.startViewTransition || reduceMotion) { paint(name); return; }
      var x = origin ? origin.x : window.innerWidth / 2;
      var y = origin ? origin.y : window.innerHeight / 2;
      var radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      var vt = document.startViewTransition(function () { paint(name); });
      vt.ready.then(function () {
        root.animate(
          { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: 650, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' }
        );
      }, function () {});
    }
    function toggle(origin) { set(current() === 'light' ? 'dark' : 'light', origin); }
    paint(current());
    if (btn) {
      btn.addEventListener('click', function () {
        var r = btn.getBoundingClientRect();
        toggle({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      });
    }
    return { toggle: toggle, current: current };
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

  var toTop = $('#toTop');
  if (toTop) toTop.addEventListener('click', function () { scrollToId('home'); });
  var lastY = window.scrollY;
  var ticking = false;
  function onScroll() {
    var y = window.scrollY;
    if (nav) {
      nav.classList.toggle('nav--scrolled', y > 20);
      var hide = y > lastY && y > 240 && !links.classList.contains('open') && Date.now() > autoScrollUntil;
      nav.classList.toggle('nav--hidden', hide);
    }
    if (toTop) {
      var show = y > window.innerHeight * 1.2;
      toTop.classList.toggle('to-top--show', show);
      toTop.tabIndex = show ? 0 : -1;
    }
    lastY = y;
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  // Sliding indicator under the nav links (springs keep velocity when interrupted)
  function moveIndicator(link) {
    if (!indicator || !G || window.innerWidth <= 768) return;
    if (!link) { G.to(indicator, { opacity: 0, duration: 0.2, overwrite: 'auto' }); return; }
    G.to(indicator, { x: link.offsetLeft, scaleX: link.offsetWidth / 100, opacity: 1, duration: 0.45, ease: 'power3.out', overwrite: 'auto' });
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
    introDone.then(function () { if (!loops.paused) timer = setTimeout(tick, 2600); });
    // Print the first phrase in full instead of whatever frame the typing is on
    window.addEventListener('beforeprint', function () {
      clearTimeout(timer);
      typed.textContent = phrases[0];
    });
    window.addEventListener('afterprint', function () {
      p = 0; c = phrases[0].length; deleting = true;
      if (!loops.paused) timer = setTimeout(tick, 1200);
    });
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
      if (!G || reduceMotion) { label.textContent = text; return; }
      G.to(label, { opacity: 0, y: -6, duration: 0.12, overwrite: true, onComplete: function () {
        label.textContent = text;
        G.fromTo(label, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power3.out' });
      } });
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
  // Command palette (Ctrl/Cmd + K). Every entry is read from the page
  // itself (nav links, project cards, contact links), so it never drifts
  // out of sync with the content.
  // ----------------------------------------------------------
  function initPalette() {
    var openBtn = $('#cmdkOpen');
    if (!openBtn || typeof HTMLDialogElement === 'undefined') return;
    var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    var hint = $('#cmdkHint');
    if (hint) hint.textContent = isMac ? '\u2318K' : 'Ctrl K';

    var dlg = document.createElement('dialog');
    dlg.className = 'cmdk';
    dlg.setAttribute('aria-label', 'Command palette');
    dlg.innerHTML =
      '<div class="cmdk__box">' +
        '<div class="cmdk__search">' +
          '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
          '<input type="text" role="combobox" aria-expanded="true" aria-controls="cmdkList" aria-autocomplete="list" aria-label="Search commands" placeholder="Type a command or search\u2026" autocomplete="off" spellcheck="false" />' +
          '<kbd>Esc</kbd>' +
        '</div>' +
        '<ul class="cmdk__list" id="cmdkList" role="listbox" aria-label="Commands"></ul>' +
        '<p class="cmdk__empty" hidden>No matches</p>' +
        '<div class="cmdk__foot"><span><kbd>\u2191</kbd><kbd>\u2193</kbd> navigate</span><span><kbd>\u21b5</kbd> select</span><span><kbd>Esc</kbd> close</span></div>' +
      '</div>';
    document.body.appendChild(dlg);
    var input = $('input', dlg), list = $('.cmdk__list', dlg), empty = $('.cmdk__empty', dlg);

    function text(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }
    function go(href) { window.open(href, '_blank', 'noopener'); }

    // Rebuilt on every open, so labels like "Switch to light theme" are current
    function buildItems() {
      var items = [];
      function add(group, label, hintText, run, keys) {
        items.push({ group: group, label: label, hint: hintText || '', run: run, keys: (keys || '').toLowerCase() });
      }
      add('Go to', 'Home', '', function () { scrollToId('home'); }, 'top hero');
      navAnchors.forEach(function (a) {
        var id = a.getAttribute('href').slice(1);
        add('Go to', text(a), '#' + id, function () { scrollToId(id); });
      });
      $$('.pcard').forEach(function (card) {
        var title = text($('.pcard__title', card));
        var repo = $('a.gh-btn', card);
        if (title && repo) add('Projects', title, 'GitHub \u2197', function () { go(repo.href); }, 'project repo source code');
      });
      var mail = $('.contact__actions a[href^="mailto:"]');
      var copyBtn = $('#copyEmail');
      if (copyBtn) add('Contact', 'Copy email address', copyBtn.dataset.email, function () {
        var done = function () { var s = $('#copyStatus'); if (s) s.textContent = 'Email address copied to clipboard'; };
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(copyBtn.dataset.email).then(done, function () {});
      }, 'mail');
      if (mail) add('Contact', 'Send an email', '', function () { window.location.href = mail.href; }, 'mail write hire');
      $$('.contact__socials a').forEach(function (a) {
        if (/linkedin|github/i.test(a.href)) add('Contact', 'Open ' + text(a), '\u2197', function () { go(a.href); }, 'profile social');
      });
      add('Preferences', theme.current() === 'light' ? 'Switch to dark theme' : 'Switch to light theme', '', function () {
        theme.toggle();
      }, 'mode appearance colour color');
      if ($('#intro')) add('Preferences', 'Replay intro animation', '', function () {
        window.location.href = window.location.pathname + '?intro';
      }, 'entry splash boy');
      var motionBtn = $('#motionToggle');
      if (motionBtn && !motionBtn.hidden) add('Preferences', loops.paused ? 'Play animations' : 'Pause animations', '', function () { motionBtn.click(); }, 'motion reduce');
      return items;
    }

    var items = [], shown = [], active = 0;
    function render() {
      var q = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      shown = items.filter(function (it) {
        var hay = (it.label + ' ' + it.group + ' ' + it.keys).toLowerCase();
        return q.every(function (t) { return hay.indexOf(t) !== -1; });
      });
      list.textContent = '';
      var lastGroup = '';
      shown.forEach(function (it, i) {
        if (it.group !== lastGroup) {
          lastGroup = it.group;
          var g = document.createElement('li');
          g.className = 'cmdk__group'; g.setAttribute('role', 'presentation'); g.textContent = it.group;
          list.appendChild(g);
        }
        var li = document.createElement('li');
        li.className = 'cmdk__item'; li.id = 'cmdk-opt-' + i; li.setAttribute('role', 'option');
        li.innerHTML = '<span></span><small></small>';
        li.firstChild.textContent = it.label;
        li.lastChild.textContent = it.hint;
        li.addEventListener('click', function () { choose(i); });
        li.addEventListener('mousemove', function () { if (active !== i) setActive(i, false); });
        list.appendChild(li);
      });
      empty.hidden = shown.length > 0;
      list.hidden = shown.length === 0;
      setActive(0, false);
    }
    function setActive(i, scroll) {
      active = i;
      $$('.cmdk__item', list).forEach(function (el, n) { el.setAttribute('aria-selected', String(n === i)); });
      var el = $('#cmdk-opt-' + i, list);
      if (el) { input.setAttribute('aria-activedescendant', el.id); if (scroll) el.scrollIntoView({ block: 'nearest' }); }
      else input.removeAttribute('aria-activedescendant');
    }
    function choose(i) {
      var it = shown[i];
      if (!it) return;
      dlg.close();
      // run after the dialog has closed so focus and scrolling behave normally
      setTimeout(it.run, 30);
    }
    function open() {
      if (dlg.open || root.classList.contains('intro-active')) return;
      setMenu(false);
      items = buildItems();
      input.value = '';
      render();
      dlg.showModal();
      input.focus();
    }

    input.addEventListener('input', render);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (shown.length) setActive((active + 1) % shown.length, true); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (shown.length) setActive((active - 1 + shown.length) % shown.length, true); }
      else if (e.key === 'Home') { e.preventDefault(); setActive(0, true); }
      else if (e.key === 'End') { e.preventDefault(); setActive(Math.max(0, shown.length - 1), true); }
      else if (e.key === 'Enter') { e.preventDefault(); choose(active); }
    });
    // Click on the dimmed area closes it; keep the page behind from scrolling
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('wheel', function (e) { if (!list.contains(e.target)) e.preventDefault(); }, { passive: false });
    openBtn.addEventListener('click', open);
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (dlg.open) dlg.close(); else open();
      }
    });
  }

  // ----------------------------------------------------------
  // Without Motion: show the page as-is and keep the essentials
  // ----------------------------------------------------------
  if (!G) {
    showEverything();
    startOrbIfPresent();
    initMotionToggle();
    startTyping();
    initCopy();
    initPalette();
    return;
  }
  clearTimeout(window.__revealFallback);

  var ST = window.ScrollTrigger;
  if (ST) G.registerPlugin(ST);
  // Entrances ease out with no overshoot; interactions get a little life
  var EASE = 'power3.out';
  function enter(targets, distance, opts) {
    opts = opts || {};
    var vars = { delay: opts.delay || 0, stagger: opts.stagger || 0, overwrite: 'auto' };
    if (reduceMotion) return G.fromTo(targets, { opacity: 0 }, Object.assign(vars, { opacity: 1, duration: 0.25 }));
    return G.fromTo(targets, { opacity: 0, y: distance }, Object.assign(vars, { opacity: 1, y: 0, duration: 0.7, ease: EASE }));
  }
  // Calls cb(el) the first time an element scrolls into view
  function inView(sel, cb, opts) {
    opts = opts || {};
    var els = typeof sel === 'string' ? $$(sel) : [sel];
    if (!('IntersectionObserver' in window)) { els.forEach(cb); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); cb(e.target); } });
    }, { threshold: opts.amount || 0, rootMargin: opts.margin || '0px' });
    els.forEach(function (el) { io.observe(el); });
  }
  // ----------------------------------------------------------
  // Hero entrance + orb
  // ----------------------------------------------------------
  introDone.then(function () { enter($$('[data-hero]'), 28, { stagger: 0.09, delay: 0.1 }); });

  var orbEl = $('#orb');
  if (orbEl) {
    introDone.then(function () {
      if (reduceMotion) {
        G.fromTo(orbEl, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      } else {
        G.fromTo(orbEl, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 1.2, delay: 0.2, ease: EASE });
      }
    });
  }

  // Count-up stats
  inView('#stats', function (el) { introDone.then(function () {
    var items = $$('[data-stat]', el);
    enter(items, 18, { stagger: 0.08, delay: 0.75 });
    $$('[data-count]', el).forEach(function (b, i) {
      var end = Number(b.dataset.count);
      var pre = b.dataset.prefix || '', suf = b.dataset.suffix || '';
      if (reduceMotion) { b.textContent = pre + end + suf; return; }
      var counter = { v: 0 };
      G.to(counter, {
        v: end, duration: 1.6, delay: 0.85 + i * 0.08, ease: 'power4.out',
        onUpdate: function () { b.textContent = pre + Math.round(counter.v) + suf; }
      });
    });
  }); }, { amount: 0.3 });

  // ----------------------------------------------------------
  // Scroll-driven effects
  // ----------------------------------------------------------
  var progressBar = $('#scrollProgress');
  if (progressBar && ST) {
    G.fromTo(progressBar, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });
  }
  var timeline = $('#timeline');
  var timelineLine = $('#timelineLine');
  if (timeline && timelineLine && ST) {
    G.fromTo(timelineLine, { scaleY: 0 }, { scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: timeline, start: 'top 75%', end: 'bottom 55%', scrub: true } });
  }
  var hero = $('#home');
  var heroGrid = $('#heroGrid');
  if (hero && heroGrid && ST && !reduceMotion) {
    var heroScroll = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
    G.to(heroGrid, { y: -70, opacity: 0.25, ease: 'none', scrollTrigger: heroScroll });
    if (orbEl) G.to(orbEl, { y: 120, scale: 0.9, ease: 'none', scrollTrigger: heroScroll });
  }
  // Layout settles after fonts load; keep scroll positions accurate
  if (ST && document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
  // ----------------------------------------------------------
  // Reveal on scroll
  // ----------------------------------------------------------
  function revealOne(el) {
    if (el.dataset.shown) return;
    el.dataset.shown = '1';
    enter(el, 32);
  }
  function revealGroup(el) {
    if (el.dataset.shown) return;
    el.dataset.shown = '1';
    enter(Array.prototype.slice.call(el.children), 24, { stagger: 0.07 });
  }
  inView('[data-reveal]', revealOne, { margin: '0px 0px -12% 0px' });
  inView('[data-stagger]', revealGroup, { margin: '0px 0px -10% 0px' });

  // A very fast scroll (or a jump from a nav link) can carry an element past the
  // viewport between two observer checks. Once scrolling settles, show anything
  // that is now above the bottom of the screen but was never revealed.
  var catchUpTimer;
  window.addEventListener('scroll', function () {
    clearTimeout(catchUpTimer);
    catchUpTimer = setTimeout(function () {
      var limit = window.innerHeight;
      $$('[data-reveal]:not([data-shown])').forEach(function (el) {
        if (el.getBoundingClientRect().top < limit) revealOne(el);
      });
      $$('[data-stagger]:not([data-shown])').forEach(function (el) {
        if (el.getBoundingClientRect().top < limit) revealGroup(el);
      });
    }, 150);
  }, { passive: true });

  $$('[data-flow]').forEach(function (flow) {
    $$('li', flow).forEach(function (li, i) { li.style.setProperty('--i', i); });
  });
  inView('[data-flow]', function (el) {
    var nodes = $$('li', el);
    if (reduceMotion) {
      G.fromTo(nodes, { opacity: 0 }, { opacity: 1, duration: 0.25 });
    } else {
      G.fromTo(nodes, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out', delay: 0.25, stagger: 0.15 });
    }
    el.classList.add('is-in');
  }, { amount: 0.6 });

  // ----------------------------------------------------------
  // Cards: hover lift, 3D tilt, cursor spotlight (mouse only)
  // ----------------------------------------------------------
  if (finePointer && !reduceMotion) {
    $$('[data-tilt]').forEach(function (card) {
      G.set(card, { transformPerspective: 1000 });
      var rx = G.quickTo(card, 'rotationX', { duration: 0.5, ease: EASE });
      var ry = G.quickTo(card, 'rotationY', { duration: 0.5, ease: EASE });
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', (px * 100) + '%');
        card.style.setProperty('--my', (py * 100) + '%');
        rx((0.5 - py) * 6);
        ry((px - 0.5) * 6);
      });
      card.addEventListener('pointerenter', function () { G.to(card, { y: -6, duration: 0.3, ease: EASE, overwrite: 'auto' }); });
      card.addEventListener('pointerleave', function () { rx(0); ry(0); G.to(card, { y: 0, duration: 0.4, ease: EASE, overwrite: 'auto' }); });
    });
    // Background glow drifts gently toward the cursor
    var glow = $('#bgGlow');
    if (glow) {
      var gx = G.quickTo(glow, 'x', { duration: 1.6, ease: EASE });
      var gy = G.quickTo(glow, 'y', { duration: 1.6, ease: EASE });
      window.addEventListener('pointermove', function (e) {
        gx((e.clientX / window.innerWidth - 0.5) * 140);
        gy((e.clientY / window.innerHeight - 0.5) * 140);
      }, { passive: true });
    }
  }
  // Press feedback on buttons and links
  if (!reduceMotion) {
    var pressed = null;
    var release = function () {
      if (!pressed) return;
      G.to(pressed, { scale: 1, duration: 0.35, ease: 'back.out(2.5)', overwrite: 'auto' });
      pressed = null;
    };
    document.addEventListener('pointerdown', function (e) {
      var el = e.target.closest && e.target.closest('[data-press]');
      if (!el) return;
      pressed = el;
      G.to(el, { scale: 0.96, duration: 0.12, ease: EASE, overwrite: 'auto' });
    });
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
  }
  initMotionToggle();
  startTyping();
  initCopy();
  initPalette();

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
    var MARGIN = 36;
    var SPHERE = 0.95; // visible height of the outer shell as a share of the canvas size
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
  // ============================================================
  // Particle sphere renderer (canvas 2D, no dependencies)
  // ============================================================
  function startOrb(canvas, opts) {
    var ctx = canvas.getContext('2d');
    // Deep gold body: a pale rim on the lit side falling away to burnt orange and ember in shadow
    var PALETTE = [
      [253, 236, 170], [255, 214, 102], [250, 178, 54], [232, 140, 30],
      [205, 108, 22], [168, 78, 16], [126, 54, 12], [84, 34, 10]
    ];
    // "VSJ" dots run left to right from pale gold to amber
    var TEXT_PALETTE = [[255, 238, 160], [255, 226, 120], [255, 212, 88], [255, 196, 66], [252, 178, 50], [244, 158, 38]];
    var TEXT_COLORS = TEXT_PALETTE.map(function (c) { return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; });
    var COLORS = PALETTE.map(function (c) { return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; });

    var pts = [];
  function addPoint(x, y, z, kind) {
      var len = Math.sqrt(x * x + y * y + z * z) || 1;
      pts.push({ x: x, y: y, z: z, r: kind === 3 ? len : 1, kind: kind, s: Math.random(), tw: Math.random() * Math.PI * 2 });
    }
    // Shell: evenly spread with a Fibonacci lattice, plus slight jitter
    // Fewer dots on smaller orbs (phones), so each frame stays cheap; full density at ~600px
    var density = Math.max(0.4, Math.min(1, Math.pow((canvas.clientWidth || 600) / 600, 2)));
    var SHELL = Math.round(6000 * density), golden = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < SHELL; i++) {
      var y = 1 - (i / (SHELL - 1)) * 2;
      var r = Math.sqrt(1 - y * y);
      var th = golden * i;
      var j = 1 + (Math.random() - 0.5) * 0.03;
      addPoint(Math.cos(th) * r * j, y * j, Math.sin(th) * r * j, 0);
    }
    // Outer shell: the same lattice at 1.3x the radius, but only about a quarter
    // of the points (a stable random subset), so it reads as a thin, faint layer
    var OUTER = 1.3;
    for (var o = 0; o < SHELL; o++) {
      if (Math.random() < 0.7) continue;
      var oy = 1 - (o / (SHELL - 1)) * 2;
      var orr = Math.sqrt(1 - oy * oy);
      var oth = golden * o + 0.5;
      var oj = OUTER * (1 + (Math.random() - 0.5) * 0.04);
      addPoint(Math.cos(oth) * orr * oj, oy * oj, Math.sin(oth) * orr * oj, 3);
    }
    // Halo: sparse dust between and just outside the two shells
    for (var h = 0, HALO = Math.round(450 * density); h < HALO; h++) {
      var u = Math.random() * 2 - 1, t2 = Math.random() * Math.PI * 2;
      var rad = 1.04 + Math.pow(Math.random(), 1.6) * 0.38;
      var rs = Math.sqrt(1 - u * u);
      addPoint(Math.cos(t2) * rs * rad, u * rad, Math.sin(t2) * rs * rad, 2);
    }

    // "VSJ" in the middle, built from dots sampled off a hidden canvas. It faces the viewer
    // and only sways a little while the shell turns around it (kind 4 in draw).
    function buildText() {
      pts = pts.filter(function (q) { return q.kind !== 4; });
      var TW = 420, TH = 170, WORLD_W = 1.24, k = WORLD_W / TW;
      var tc = document.createElement('canvas');
      tc.width = TW; tc.height = TH;
      var tx = tc.getContext('2d', { willReadFrequently: true });
      var size = 150, family = '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif';
      tx.textAlign = 'center'; tx.textBaseline = 'middle'; tx.fillStyle = '#fff';
      if ('letterSpacing' in tx) tx.letterSpacing = '8px';
      for (; size > 60; size -= 6) {
        tx.font = '700 ' + size + 'px ' + family;
        if (tx.measureText('VSJ').width <= TW - 30) break;
      }
      tx.fillText('VSJ', TW / 2, TH / 2 + size * 0.04);
      var data = tx.getImageData(0, 0, TW, TH).data, step = 2;
      for (var py = 0; py < TH; py += step) {
        for (var pxl = 0; pxl < TW; pxl += step) {
          if (data[(py * TW + pxl) * 4 + 3] < 140) continue;
          var frac = pxl / TW;
          pts.push({
            x: (pxl - TW / 2 + (Math.random() - 0.5) * 0.9) * k,
            y: (py - TH / 2 + (Math.random() - 0.5) * 0.9) * k,
            z: (Math.random() - 0.5) * 0.05,
            r: 1, kind: 4, s: Math.random(), tw: Math.random() * Math.PI * 2,
            ci: Math.max(0, Math.min(5, Math.floor(((frac - 0.15) / 0.7) * 6 + (Math.random() - 0.5)))),
            sz: 0.75 + Math.random() * 0.55
          });
        }
      }
    }
    buildText();
    // The page font may arrive after the first build: rebuild once it is ready
    if (document.fonts && document.fonts.load) {
      document.fonts.load('700 120px "IBM Plex Sans"').then(function () {
        buildText();
        if (!running) draw(performance.now());
      }, function () {});
    }
    var w = 0, hgt = 0, dpr = 1, R = 0;
  function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; hgt = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(hgt * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.min(w, hgt) * 0.36;
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
      // The lettering only sways (and follows the mouse a little), so it stays readable
      var sway = Math.sin(time * 0.0004) * 0.1 + offY * 0.6;
      var cyT = Math.cos(sway), syT = Math.sin(sway), cxT = Math.cos(tiltX * 0.35), sxT = Math.sin(tiltX * 0.35);
      var textScale = Math.max(0.7, Math.min(1.15, R / 200));
      var ox = w / 2, oy = hgt / 2, F = 3.2;

      ctx.clearRect(0, 0, w, hgt);
      ctx.globalCompositeOperation = 'lighter';

      for (var k = 0; k < pts.length; k++) {
        var p = pts[k];
        if (p.kind === 4) {
          var t1 = p.x * cyT - p.z * syT, tz1 = p.x * syT + p.z * cyT;
          var t2y = p.y * cxT - tz1 * sxT, tz2 = p.y * sxT + tz1 * cxT;
          var tsc = F / (F + tz2) * R * breathe;
          ctx.globalAlpha = (0.8 + (opts.animate ? 0.08 * Math.sin(time * 0.0021 + p.tw) : 0)) * (0.88 + p.s * 0.12);
          ctx.fillStyle = TEXT_COLORS[p.ci];
          ctx.fillRect(ox + t1 * tsc, oy + t2y * tsc, p.sz * textScale, p.sz * textScale);
          if (p.s > 0.7) { // a soft glow around every few dots
            ctx.globalAlpha = 0.13;
            ctx.fillRect(ox + t1 * tsc - 1.4, oy + t2y * tsc - 1.4, p.sz * textScale + 2.8, p.sz * textScale + 2.8);
          }
          continue;
        }
        var px = p.x, py = p.y, pz = p.z;
        // rotate Y, then X (tilt), then Z
        var x1 = px * cy - pz * sy, z1 = px * sy + pz * cy;
        var y2 = py * cx - z1 * sx, z2 = py * sx + z1 * cx;
        var x3 = x1 * cz - y2 * sz, y3 = x1 * sz + y2 * cz;

        var scale = F / (F + z2) * R * breathe;
        var sxp = ox + x3 * scale, syp = oy + y3 * scale;
        var depth = (1 - z2 / p.r) / 2; // 1 = front, 0 = back

        // colour: lit from the upper-left, warmer and darker toward the lower-right
        // colour runs left to right like the motion.dev orb: cream-yellow on the left, orange on the right
        var light = (-x3 * 0.85 - y3 * 0.15 + 1) / 2;
        var ci = Math.max(0, Math.min(7, Math.round((1 - light) * 7 + (p.kind === 2 ? 1 : 0))));
        // limb brightening: shell points near the silhouette glow, like a lit edge
        var rim = 1 - Math.min(1, Math.abs(z2) / p.r);
        rim = rim * rim * rim;
        // Shadow that falls across the lower right of the sphere
        var lowerRight = Math.max(0, Math.min(1, (x3 * 0.55 + y3 * 0.85) / (0.85 * p.r)));
        var alpha;
        if (p.kind === 0) {
          // Inner orb: dark face, light concentrated on the rim
          alpha = 0.06 + depth * 0.19 + rim * 1.1;
          alpha *= 1 - lowerRight * 0.7 * (1 - rim * 0.55);
        } else if (p.kind === 3) {
          // Outer shell: faint, with a thin brighter outline
          alpha = (0.18 + depth * 0.1 + rim * 0.55) * (0.6 + p.s * 0.4);
          alpha *= 1 - lowerRight * 0.45;
        } else {
          alpha = 0.08 + p.s * 0.22;
        }
        if (p.kind === 0 && rim > 0.45 && x3 < 0) ci = Math.max(0, ci - 1); // only the lit (left) rim goes paler
        if (opts.animate) alpha *= 0.82 + 0.18 * Math.sin(time * 0.002 + p.tw);

        var size = (p.kind === 2 ? 0.7 : p.kind === 3 ? 0.55 + p.s * 0.6 : 0.6 + p.s * 0.8)
          * (0.6 + depth * 0.7) * (p.kind === 0 || p.kind === 3 ? 1 + rim * 0.5 : 1);
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
