/* ============================================================
   Entry animation: a boy walks in and pushes the black screen. It sticks around
   the middle, he strains and heaves until it gives, then he shoves it off to the
   right, uncovering the name. The white panel then lifts to reveal the page.

   - plays once per 24 hours per browser (add ?intro to the URL to replay it once)
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
  var lean = document.getElementById('ibLean');
  var blush = document.getElementById('ibBlush');
  var thighF = document.getElementById('ibThighF'), shinF = document.getElementById('ibShinF');
  var thighB = document.getElementById('ibThighB'), shinB = document.getElementById('ibShinB');

  // Timings (ms)
  // The push has three beats: walk in, get stuck near the middle and strain, then break through
  var T_WALK = 1400, T_STUCK = 2500, T_BREAK = 1500;
  var T_PUSH = T_WALK + T_STUCK + T_BREAK;
  var SCRABBLE = 22;   // how fast the feet pump on the spot while stuck (radians per second)
  var T_HOLD = 380;    // name on white, nothing moving
  var T_LIFT = 700;    // white panel slides up (matches the CSS transition)
  // Geometry in SVG units (viewBox 220 x 320)
  var VB_W = 220, VB_H = 320, STEP = 122;

  var s = 1, W = 0, travel = 0;
  var guarded = [];
  var started = 0, leaving = false, finished = false, raf = 0, doneTimer = 0;

  // Keep the page behind out of reach while the intro covers it
  ['header', 'main', 'footer', '.skip-link', '.to-top'].forEach(function (sel) {
    Array.prototype.forEach.call(document.querySelectorAll(sel), function (el) {
      if (!el.hasAttribute('inert')) { el.setAttribute('inert', ''); guarded.push(el); }
    });
  });

  // Mark it as seen right away, so a refresh (even mid-intro) never plays it again
  try { localStorage.setItem('introSeenAt', String(Date.now())); } catch (e) {}
  try { sessionStorage.setItem('introSeen', '1'); } catch (e) {}
  // A replay link (?intro) must not replay on refresh either: drop the parameter from the address bar
  try {
    var q = new URLSearchParams(window.location.search);
    if (q.has('intro')) {
      q.delete('intro');
      var rest = q.toString();
      history.replaceState(null, '', window.location.pathname + (rest ? '?' + rest : '') + window.location.hash);
    }
  } catch (e) {}

  function layout() {
    W = window.innerWidth;
    var H = window.innerHeight;
    var h = Math.max(160, Math.min(H * 0.42, W * 0.72, 400));
    s = h / VB_H;
    boy.style.width = (VB_W * s) + 'px';
    boy.style.height = h + 'px';
    boy.style.top = Math.round(H * 0.5 - h * 0.5) + 'px';
    // far enough that the whole boy (backpack included) has left the screen
    travel = W + (handX(18) - 20) * s;
  }

  function easeOut(x) { return 1 - (1 - x) * (1 - x); }
  function easeIn(x) { return x * x; }
  function smooth(a, b, x) { var k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); }

  // Where the edge of the black screen is (px from the left), t ms into the push
  function position(t) {
    var stuck = W * 0.46;                       // it jams about halfway across
    if (t < T_WALK) return stuck * Math.sin((t / T_WALK) * Math.PI / 2);   // walks in, slowing as it resists
    t -= T_WALK;
    if (t < T_STUCK) {
      var u = t / T_STUCK;
      var amp = [8, 12, 18];                    // three heaves that barely shift it
      var n = Math.min(2, Math.floor(u * 3)), v = u * 3 - n;
      var heave = v < 0.6 ? easeOut(v / 0.6) : 1 - easeIn((v - 0.6) / 0.4);   // shove forward, then slip back
      return stuck + amp[n] * s * heave;
    }
    t -= T_STUCK;
    var w = Math.min(1, t / T_BREAK);
    var from = stuck;
    var lunge = 0.1 * easeOut(Math.min(1, w / 0.15)) + 0.9 * Math.pow(w, 1.6);   // it gives, then he runs it off
    return from + (travel - from) * lunge;
  }

  // How hard he is working, 0 (easy walk) to 1 (everything he has)
  function strain(t) {
    if (t < T_WALK) return 0.85 * smooth(0.5, 1, t / T_WALK);
    t -= T_WALK;
    if (t < T_STUCK) return 0.85 + 0.15 * (t / T_STUCK);
    t -= T_STUCK;
    return 1 - 0.7 * smooth(0, 0.25, t / T_BREAK);
  }

  // Where the hands end up (SVG units) for a given lean, so they stay on the screen's edge
  function handX(deg) {
    var a = deg * Math.PI / 180;
    return 100 + 71.1 * Math.cos(a) + 170.5 * Math.sin(a) + 1;
  }

  function rot(el, deg) { el.setAttribute('transform', 'rotate(' + deg.toFixed(2) + ')'); }

  // Walk cycle plus effort: harder lean, shorter steps, trembling arms, red face
  function pose(ph, st, now) {
    var sin = Math.sin(ph), cos = Math.cos(ph);
    var swing = 32 - 10 * st, bend = 42 * (1 - 0.35 * st);
    var tremble = st > 0.6 ? Math.sin(now / 38) * (st - 0.6) * 3.2 : 0;
    bob.setAttribute('transform', 'translate(' + (tremble * 0.5).toFixed(2) + ' ' + (-3.2 * (1 - 0.6 * st) * Math.cos(2 * ph)).toFixed(2) + ')');
    rot(thighF, -swing * sin);        rot(shinF, bend * Math.max(0, cos));
    rot(thighB, swing * sin);         rot(shinB, bend * Math.max(0, -cos));
    var pump = st > 0.7 ? Math.sin(now / 130) * 2.4 * Math.min(1, (st - 0.7) / 0.3) : 0;   // heaving with each try
    var shove = 1.8 * Math.sin(2 * ph) + tremble + pump;
    armF.setAttribute('transform', 'translate(' + shove.toFixed(2) + ' 0)');
    armB.setAttribute('transform', 'translate(' + (shove * 0.8).toFixed(2) + ' 0)');
    lean.setAttribute('transform', 'rotate(' + (12 + 16 * st).toFixed(2) + ' 100 300)');
    blush.setAttribute('opacity', (st * 0.6).toFixed(2));
  }

  var phase = 0, lastPos = 0, lastNow = 0;
  function frame(now) {
    if (!started) { started = now; lastNow = now; }
    var t = now - started;
    if (t < T_PUSH) {
      var dt = Math.min(60, now - lastNow) / 1000;
      lastNow = now;
      var pos = position(t), st = strain(t);
      // the screen's edge shudders while he strains against it
      var edge = pos + (st > 0.6 ? Math.sin(now / 41) * 1.6 * (st - 0.6) / 0.4 : 0);
      // steps follow the distance walked; while stuck, the feet scrabble on the spot
      var scrabble = smooth(T_WALK * 0.7, T_WALK, t) * (1 - smooth(T_WALK + T_STUCK, T_WALK + T_STUCK + 300, t));
      phase += Math.max(0, pos - lastPos) / (STEP * s) * Math.PI + SCRABBLE * dt * scrabble * (0.5 + 0.5 * st);
      lastPos = pos;
      curtain.style.transform = 'translate3d(' + edge.toFixed(1) + 'px,0,0)';
      boy.style.transform = 'translate3d(' + (edge - handX(12 + 16 * st) * s).toFixed(1) + 'px,0,0)';
      boy.classList.toggle('is-straining', st > 0.5);
      pose(phase, st, now);
      raf = requestAnimationFrame(frame);
    } else {
      curtain.style.transform = 'translate3d(' + (travel + 4) + 'px,0,0)';
      boy.classList.remove('is-straining');
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
  pose(0, 0, 0);
  curtain.style.transform = 'translate3d(0,0,0)';
  boy.style.transform = 'translate3d(' + (-handX(12) * s) + 'px,0,0)';
  skipBtn.addEventListener('click', leave);
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', layout);
  // Short beat of plain black before he shows up
  setTimeout(function () { raf = requestAnimationFrame(frame); }, 350);
})();
