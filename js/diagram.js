/* ============================================================
   Architecture diagram player.
   The SVG is rendered at build time and is already complete without JavaScript.
   This script only adds the step-by-step animation and its controls:
   Play/Pause, Step, Replay. Reduced motion or the page's Pause-animations setting
   shows each step instantly (no travelling marker, no drawing).
   ============================================================ */
(function () {
  'use strict';
  var root = document.documentElement;
  var fig = document.getElementById('arch');
  if (!fig) return;

  var steps = JSON.parse(fig.getAttribute('data-steps') || '[]');
  var items = Array.prototype.slice.call(document.querySelectorAll('.arch__steps li'));
  var controls = fig.querySelector('.arch__controls');
  var status = fig.querySelector('.arch__status');
  var playBtn = fig.querySelector('[data-act="play"]');
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var STEP_MS = 2100;

  function q(sel) { return Array.prototype.slice.call(fig.querySelectorAll(sel)); }
  function calm() { return mq.matches || root.classList.contains('motion-paused'); }

  // Edge geometry for the draw effect (both desktop and mobile copies)
  q('.arch__edge').forEach(function (p) {
    var len = p.getTotalLength();
    p.style.setProperty('--len', len);
    p.setAttribute('data-len', len);
  });

  var current = 0;          // last step that is shown (0 = nothing yet)
  var timer = 0;
  var playing = false;
  var running = [];         // Web Animations in flight

  function stopAnimations() { running.forEach(function (a) { try { a.cancel(); } catch (e) {} }); running = []; }

  function setLit(el, on) { el.classList.toggle('is-lit', on); }

  function render(upTo, animateStep) {
    var litNodes = {}, litEdges = {}, retired = {};
    for (var i = 0; i < steps.length && steps[i].n <= upTo; i++) {
      steps[i].nodes.forEach(function (id) { litNodes[id] = true; });
      steps[i].edges.forEach(function (id) { litEdges[id] = true; });
      (steps[i].retire || []).forEach(function (id) { retired[id] = true; });
    }
    var cur = null;
    for (var s = 0; s < steps.length; s++) if (steps[s].n === upTo) cur = steps[s];
    var curNodes = {}, curEdges = [];
    if (cur) { cur.nodes.forEach(function (id) { curNodes[id] = true; }); curEdges = cur.edges; }

    q('[data-node]').forEach(function (n) {
      var id = n.getAttribute('data-node');
      setLit(n, !!litNodes[id]);
      n.classList.toggle('is-current', !!curNodes[id]);
      n.classList.toggle('is-retired', !!retired[id]);
    });
    q('[data-group]').forEach(function (g) {
      // a group shows once any of its members is lit
      var id = g.getAttribute('data-group');
      var lit = false;
      q('[data-node].is-lit').forEach(function (n) { if (g.getAttribute('data-members') && g.getAttribute('data-members').indexOf(n.getAttribute('data-node')) > -1) lit = true; });
      setLit(g, upTo > 0);
    });
    q('[data-edge]').forEach(function (e) {
      var id = e.getAttribute('data-edge');
      var lit = !!litEdges[id];
      setLit(e, lit);
      var len = +e.getAttribute('data-len');
      e.style.strokeDasharray = lit ? 'none' : len + ' ' + len;
      e.style.strokeDashoffset = lit ? '0' : String(len);
    });
    items.forEach(function (li, idx) {
      var n = idx + 1;
      li.classList.toggle('is-current', n === upTo);
      li.classList.toggle('is-done', n < upTo);
    });
    status.textContent = cur ? 'Step ' + cur.n + ' of ' + steps.length + ': ' + (items[cur.n - 1] ? items[cur.n - 1].textContent : '') : '';

    if (animateStep && cur && !calm()) animateEdges(curEdges);
  }

  // Draw each edge of the current step, then send a marker along it
  function animateEdges(ids) {
    stopAnimations();
    ids.forEach(function (id, k) {
      q('[data-edge="' + id + '"]').forEach(function (e) {
        if (!e.getClientRects().length) return; // the hidden (desktop or mobile) copy
        var len = +e.getAttribute('data-len');
        e.style.strokeDasharray = len + ' ' + len;
        var draw = e.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 700, delay: k * 250, easing: 'cubic-bezier(0.22,1,0.36,1)', fill: 'forwards' });
        running.push(draw);
        draw.finished.then(function () { e.style.strokeDasharray = 'none'; e.style.strokeDashoffset = '0'; }, function () {});
        var packet = fig.querySelector('.arch__svg:not([style*="none"]) [data-packet="' + id + '"]');
        var visible = q('[data-packet="' + id + '"]').filter(function (c) { return c.ownerSVGElement.getClientRects().length; })[0];
        if (visible && 'offsetPath' in visible.style) {
          visible.style.offsetPath = 'path("' + e.getAttribute('d') + '")';
          var mv = visible.animate([{ offsetDistance: '0%', opacity: 1 }, { offsetDistance: '100%', opacity: 1 }, { offsetDistance: '100%', opacity: 0 }],
            { duration: 900, delay: 350 + k * 250, easing: 'ease-in-out', fill: 'both' });
          running.push(mv);
        }
      });
    });
  }

  function go(n, animateStep) {
    current = Math.max(0, Math.min(steps.length, n));
    render(current, animateStep);
  }

  function setPlaying(on) {
    playing = on;
    clearTimeout(timer);
    playBtn.textContent = on ? 'Pause' : (current >= steps.length ? 'Play again' : 'Play');
    playBtn.setAttribute('aria-pressed', String(on));
    if (on) tick();
  }
  function tick() {
    if (!playing) return;
    if (current >= steps.length) { setPlaying(false); return; }
    go(current + 1, true);
    timer = setTimeout(function () {
      if (current >= steps.length) setPlaying(false); else tick();
    }, calm() ? 1400 : STEP_MS);
  }

  playBtn.addEventListener('click', function () {
    if (playing) { setPlaying(false); return; }
    if (current >= steps.length) { stopAnimations(); go(0, false); }
    setPlaying(true);
  });
  fig.querySelector('[data-act="step"]').addEventListener('click', function () {
    setPlaying(false);
    go(current >= steps.length ? 1 : current + 1, true);
  });
  fig.querySelector('[data-act="replay"]').addEventListener('click', function () {
    stopAnimations(); setPlaying(false); go(0, false); setPlaying(true);
  });
  // Clicking a numbered step jumps to it
  items.forEach(function (li, idx) {
    li.style.cursor = 'pointer';
    li.addEventListener('click', function () { setPlaying(false); go(idx + 1, true); });
  });

  // Enable the animated mode
  fig.classList.add('arch--js');
  controls.hidden = false;
  go(0, false);

  // Start once the diagram is on screen (reduced motion: show the finished diagram and let the user step through)
  var started = false;
  function start() {
    if (started) return; started = true;
    if (calm()) { go(steps.length, false); playBtn.textContent = 'Play again'; return; }
    setPlaying(true);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries, io) {
      if (entries[0].isIntersecting) { io.disconnect(); start(); }
    }, { threshold: 0.35 }).observe(fig);
  } else start();

  // Pause when the tab is hidden or the user turns animations off
  document.addEventListener('visibilitychange', function () { if (document.hidden && playing) setPlaying(false); });
  new MutationObserver(function () { if (calm() && playing) setPlaying(false); }).observe(root, { attributes: true, attributeFilter: ['class'] });
})();
