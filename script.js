// ============================================================
//  Portfolio interactions & animations
// ============================================================

function initPortfolio() {
  'use strict';

  const nav = document.getElementById('nav');
  const toggle = document.getElementById('navToggle');
  const links = document.querySelector('.nav__links');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // --- Mobile menu toggle ---
  function closeMenu() {
    if (!links || !toggle) return;
    links.classList.remove('open');
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      const isOpen = links.classList.toggle('open');
      toggle.classList.toggle('open', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // --- Smooth scroll for in-page anchor links (nav-offset aware) ---
  // While a link-triggered scroll is running, keep the nav visible so the
  // next link can be clicked right away.
  let autoScrollUntil = 0;

  function scrollToId(id) {
    const target = document.getElementById(id);
    if (!target) return;
    autoScrollUntil = Date.now() + 1200;
    if (nav) nav.classList.remove('nav--hidden');
    const navH = (nav && nav.offsetHeight) || 72;
    const top = target.getBoundingClientRect().top + window.scrollY - navH + 1;
    window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      const id = href.slice(1);
      if (!document.getElementById(id)) return; // let the browser handle it
      e.preventDefault();
      closeMenu();
      scrollToId(id);
      history.replaceState(null, '', href);
    });
  });

  // --- Scroll: nav hide/show + progress bar ---
  const progress = document.getElementById('scrollProgress');
  let lastY = window.scrollY;
  let ticking = false;

  function onScroll() {
    const y = window.scrollY;

    if (nav) {
      nav.classList.toggle('nav--scrolled', y > 20);
      const menuOpen = links && links.classList.contains('open');
      const autoScrolling = Date.now() < autoScrollUntil;
      if (y > lastY && y > 200 && !menuOpen && !autoScrolling) {
        nav.classList.add('nav--hidden');
      } else {
        nav.classList.remove('nav--hidden');
      }
    }

    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    }

    lastY = y;
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(onScroll);
    }
  }, { passive: true });
  onScroll();

  // --- Stagger index for grid/list children ---
  document.querySelectorAll('.stagger').forEach(function (group) {
    Array.prototype.forEach.call(group.children, function (child, i) {
      child.style.setProperty('--i', i);
    });
  });

  // --- Scroll reveal (also triggers stagger, timeline line, heading lines) ---
  const reveals = document.querySelectorAll('.reveal, .line-draw');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    reveals.forEach(function (el) { observer.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('visible'); });
  }

  // --- Active nav link for the section in view ---
  const navLinks = links ? links.querySelectorAll('a[href^="#"]') : [];
  if ('IntersectionObserver' in window && navLinks.length) {
    const byId = {};
    navLinks.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });

    const spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.remove('active'); });
        const link = byId[entry.target.id];
        if (link) link.classList.add('active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    document.querySelectorAll('main section[id]').forEach(function (sec) { spy.observe(sec); });
  }

  // --- Typing effect in the hero subtitle ---
  const typed = document.getElementById('typed');
  if (typed && !reduceMotion) {
    const phrases = [
      'build and secure the cloud.',
      'automate zero-downtime deploys.',
      'design resilient AWS networks.',
      'turn events into analytics.'
    ];
    let p = 0;
    let c = phrases[0].length;
    let deleting = true;

    function tick() {
      const word = phrases[p];
      typed.textContent = word.slice(0, c);

      let delay = deleting ? 28 : 60;
      if (deleting) {
        c--;
        if (c < 0) {
          deleting = false;
          p = (p + 1) % phrases.length;
          c = 0;
          delay = 350;
        }
      } else {
        c++;
        if (c > phrases[p].length) {
          deleting = true;
          c = phrases[p].length;
          delay = 2200;
        }
      }
      setTimeout(tick, delay);
    }
    setTimeout(tick, 3000);
  }

  // --- Card 3D tilt + spotlight (mouse/trackpad only) ---
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('.tilt').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        const rx = ((y / r.height) - 0.5) * -8;
        const ry = ((x / r.width) - 0.5) * 8;
        card.classList.add('is-tilting');
        card.style.transform =
          'perspective(900px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateY(-6px)';
        card.style.setProperty('--mx', x + 'px');
        card.style.setProperty('--my', y + 'px');
      });
      card.addEventListener('pointerleave', function () {
        card.classList.remove('is-tilting');
        card.style.transform = '';
      });
    });

    // Background glow drifts toward the cursor
    const glow = document.getElementById('bgGlow');
    if (glow) {
      window.addEventListener('pointermove', function (e) {
        const dx = (e.clientX / window.innerWidth - 0.5) * 120;
        const dy = (e.clientY / window.innerHeight - 0.5) * 120;
        glow.style.translate = dx + 'px ' + dy + 'px';
      }, { passive: true });
    }
  }

  // --- Hero particle network ---
  const canvas = document.getElementById('heroCanvas');
  if (canvas && canvas.getContext && !reduceMotion) {
    startParticles(canvas, finePointer);
  }
}

function startParticles(canvas, trackMouse) {
  const ctx = canvas.getContext('2d');
  const hero = canvas.parentElement;
  const LINK = 130;
  const mouse = { x: -9999, y: -9999 };
  let w = 0, h = 0, dpr = 1, particles = [];
  let running = true, rafId = null;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.round(Math.min(80, Math.max(30, (w * h) / 16000)));
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.6
      });
    }
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;

      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const dx = p.x - q.x, dy = p.y - q.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < LINK) {
          ctx.strokeStyle = 'rgba(255, 59, 78, ' + (0.22 * (1 - d / LINK)) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }

      const mx = p.x - mouse.x, my = p.y - mouse.y;
      const md = Math.sqrt(mx * mx + my * my);
      if (md < LINK * 1.4) {
        ctx.strokeStyle = 'rgba(255, 138, 92, ' + (0.4 * (1 - md / (LINK * 1.4))) + ')';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(255, 90, 105, 0.85)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (running) rafId = window.requestAnimationFrame(frame);
  }

  function play() {
    if (!running) {
      running = true;
      rafId = window.requestAnimationFrame(frame);
    }
  }
  function pause() {
    running = false;
    if (rafId) window.cancelAnimationFrame(rafId);
  }

  if (trackMouse) {
    window.addEventListener('pointermove', function (e) {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    }, { passive: true });
  }

  let resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  // Pause when the hero is off-screen or the tab is hidden, to save CPU/battery
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries[0].isIntersecting ? play() : pause();
    }).observe(hero);
  }
  document.addEventListener('visibilitychange', function () {
    document.hidden ? pause() : play();
  });

  resize();
  rafId = window.requestAnimationFrame(frame);
}

// Run after the DOM is ready, regardless of where this script is loaded.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPortfolio);
} else {
  initPortfolio();
}
