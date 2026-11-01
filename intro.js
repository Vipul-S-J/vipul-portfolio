/* ============================================================
   Entry animation: a boy pushes the black screen off to the right,
   uncovering the name, then the white panel lifts to reveal the page.

   - plays once per browser session (add ?intro to the URL to replay)
   - skipped for reduced-motion visitors and for links with a #hash
   - any key (Esc / Enter / Space) or the Skip button ends it early
   - window.__intro.done resolves when the hero may start animating
   ============================================================ */
(function () {
  'use strict';
  var root = document.documentElement;
  var resolveDone;
  var done = new Promise(function (r) { resolveDone = r; });
  window.__intro = { done: done };

  var intro = document.getElementById('intro');
  if (!intro || !root.classList.contains('intro-pending')) { resolveDone(); return; }

  var curtain = document.getElementById('introCurtain');
  var boy = document.getElementById('introBoy');
  var skipBtn = document.getElementById('introSkip');
  var bob = document.getElementById('ibBob');
  var armF = document.getElementById('ibArmF');
  var armB = document.getElementById('ibArmB');
  var thighF = document.getElementById('ibThighF'), shinF = document.getElementById('ibShinF');
  var thighB = document.getElementById('ibThighB'), shinB = document.getElementById('ibShinB');

  // Timings (ms)
  var T_PUSH = 2900;   // boy walks the black screen off
  var T_HOLD = 380;    // name on white, nothing moving
  var T_LIFT = 700;    // white panel slides up (matches the CSS transition)
  // Geometry in SVG units (viewBox 220 x 320)
  var VB_W = 220, VB_H = 320, HAND_X = 206, STEP = 122;
  var RAMP = 0.2;      // share of the push spent speeding up

  var s = 1, W = 0, travel = 0;
  var guarded = [];
  var started = 0, leaving = false, finished = false, raf = 0, doneTimer = 0;

  // Keep the page behind out of reach while the intro covers it
  ['header', 'main', 'footer', '.skip-link', '.to-top'].forEach(function (sel) {
    Array.prototype.forEach.call(document.querySelectorAll(sel), function (el) {
      if (!el.hasAttribute('inert')) { el.setAttribute('inert', ''); guarded.push(el); }
    });
  });

  try { sessionStorage.setItem('introSeen', '1'); } catch (e) {}

  function layout() {
    W = window.innerWidth;
    var H = window.innerHeight;
    var h = Math.max(160, Math.min(H * 0.42, W * 0.72, 400));
    s = h / VB_H;
    boy.style.width = (VB_W * s) + 'px';
    boy.style.height = h + 'px';
    boy.style.top = Math.round(H * 0.5 - h * 0.5) + 'px';
    // far enough that the whole boy (backpack included) has left the screen
    travel = W + (HAND_X - 30) * s;
  }

  // Slow start, then a steady push
  function position(k) {
    var v = travel / (1 - RAMP / 2);
    return k < RAMP ? v * k * k / (2 * RAMP) : v * (k - RAMP / 2);
  }

  function rot(el, deg) { el.setAttribute('transform', 'rotate(' + deg.toFixed(2) + ')'); }

  // Walk cycle. phase advances with distance travelled, so feet don't skate.
  function pose(phase) {
    var sin = Math.sin(phase), cos = Math.cos(phase);
    bob.setAttribute('transform', 'translate(0 ' + (-3.2 * Math.cos(2 * phase)).toFixed(2) + ')');
    rot(thighF, -32 * sin);           rot(shinF, 42 * Math.max(0, cos));
    rot(thighB, 32 * sin);            rot(shinB, 42 * Math.max(0, -cos));
    // arms stay planted on the screen and give a small shove with each step
    var shove = 1.8 * Math.sin(2 * phase);
    armF.setAttribute('transform', 'translate(' + shove.toFixed(2) + ' 0)');
    armB.setAttribute('transform', 'translate(' + (shove * 0.8).toFixed(2) + ' 0)');
  }

  function frame(now) {
    if (!started) started = now;
    var t = now - started;
    if (t < T_PUSH) {
      var pos = position(t / T_PUSH);
      curtain.style.transform = 'translate3d(' + pos.toFixed(1) + 'px,0,0)';
      boy.style.transform = 'translate3d(' + (pos - HAND_X * s).toFixed(1) + 'px,0,0)';
      pose(pos / (STEP * s) * Math.PI);
      raf = requestAnimationFrame(frame);
    } else {
      curtain.style.transform = 'translate3d(' + (travel + 4) + 'px,0,0)';
      raf = 0;
      doneTimer = setTimeout(leave, T_HOLD);
    }
  }

  function leave() {
    if (leaving) return;
    leaving = true;
    cancelAnimationFrame(raf);
    clearTimeout(doneTimer);
    intro.classList.add('is-leaving');
    // let the hero start while the panel is still on its way up
    setTimeout(resolveDone, T_LIFT * 0.45);
    setTimeout(finish, T_LIFT + 60);
  }

  function finish() {
    if (finished) return;
    finished = true;
    resolveDone();
    clearTimeout(window.__introFallback);
    root.classList.remove('intro-pending', 'intro-active');
    guarded.forEach(function (el) { el.removeAttribute('inert'); });
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', layout);
  }

  function onKey(e) {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
      if (e.target === skipBtn && e.key !== 'Escape') return; // the button handles its own activation
      e.preventDefault();
      leave();
    }
  }

  layout();
  pose(0);
  curtain.style.transform = 'translate3d(0,0,0)';
  boy.style.transform = 'translate3d(' + (-HAND_X * s) + 'px,0,0)';
  skipBtn.addEventListener('click', leave);
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', layout);
  // Short beat of plain black before he shows up
  setTimeout(function () { raf = requestAnimationFrame(frame); }, 350);
})();
