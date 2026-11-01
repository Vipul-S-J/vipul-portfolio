/* ============================================================
   Wavy boxes background

   A fine grid of small boxes seen from above. A slow ripple rolls
   continuously from the top of the screen to the bottom, lifting
   the boxes it passes and tinting them toward the accent colour.
   Moving the pointer (or tapping) adds extra ripples on top.

   Based on the "wavy cubes" Three.js demo, with these changes:
   - small boxes with visible gaps, so the grid reads as a fine net
   - a constant top-to-bottom ripple instead of pointer-only ripples
   - slow wave speed, long fade, slow camera drift
   - site palette (dark charcoal boxes, yellow accent)
   - no shadows or post-processing, to keep it light as a page background

   Source lives in src/. Build with: npm run build:bg
   (output: vendor/wavy-boxes.js, which is what index.html loads)
   ============================================================ */
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DataTexture,
  DirectionalLight,
  FloatType,
  InstancedBufferAttribute,
  InstancedMesh,
  MathUtils,
  MeshStandardMaterial,
  NearestFilter,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Mesh,
  Plane,
  Raycaster,
  RGBAFormat,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
  ACESFilmicToneMapping
} from 'three';

const CONFIG = {
  gridSize: 90,          // boxes per side
  boxWidth: 0.34,
  boxHeight: 1.6,
  gap: 0.08,             // space between boxes

  // Ambient ripple that rolls from the top of the screen to the bottom.
  ambientSpeed: 1.4,     // world units per second (one crest every ~6 units, so ~4.5s apart)
  ambientFrequency: 1.05,
  ambientAmplitude: 0.5, // how far the crest lifts a box
  ambientSharpness: 4,   // higher = narrower crests with flatter gaps between them
  ambientSourceZ: -28,   // ripple source above the screen; closer = more curved fronts

  // Pointer ripples (added on top of the ambient one)
  waveSpeed: 2,
  waveFrequency: 1.2,
  waveWidth: 2.2,
  waveJitter: 0.08,
  waveAmplitude: 0.35,
  waveMaxHeight: 0.6,
  fadeTime: 3.4,         // seconds for a pointer ripple to fade to ~37%
  trailSpacing: 0.3,     // min pointer travel (world units) between ripple sources

  // Look
  background: '#080808',
  colorBase: '#151411',
  colorFloor: '#1e1d18',
  colorHigh: '#ffd60a',
  exposure: 1.4,

  // Camera
  fov: 24,
  distance: 29,
  driftLerp: 0.025,
  driftAlpha: Math.PI * 0.02,
  driftBeta: Math.PI * 0.035
};

const MAX_TRAIL = 96;
const TOPS_Y = CONFIG.boxHeight / 2;

export function startWavyBoxes(canvas, options) {
  const reduceMotion = !!(options && options.reduceMotion);
  const root = document.documentElement;

  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
  } catch (err) {
    return null;
  }
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = CONFIG.exposure;
  renderer.setClearColor(CONFIG.background);

  const scene = new Scene();
  scene.background = new Color(CONFIG.background);

  const camera = new PerspectiveCamera(CONFIG.fov, 1, 0.1, 200);
  scene.add(camera);

  // ---- Lights ----
  scene.add(new AmbientLight('#ffffff', 0.55));
  const key = new DirectionalLight('#ffffff', 3.2);
  key.position.set(-20, 10, 6);
  scene.add(key);
  const fill = new DirectionalLight('#fff1c2', 1);
  fill.position.set(10, 5, -3);
  scene.add(fill);

  // ---- Pointer ripple sources, uploaded to the GPU as a 96x1 float texture ----
  const trail = [];
  const trailData = new Float32Array(MAX_TRAIL * 4);
  const trailTexture = new DataTexture(trailData, MAX_TRAIL, 1, RGBAFormat, FloatType);
  trailTexture.minFilter = NearestFilter;
  trailTexture.magFilter = NearestFilter;
  trailTexture.needsUpdate = true;

  const uniforms = {
    uTrailTexture: { value: trailTexture },
    uTrailCount: { value: 0 },
    uFadeTime: { value: CONFIG.fadeTime },
    uWaveSpeed: { value: CONFIG.waveSpeed },
    uWaveFreq: { value: CONFIG.waveFrequency },
    uWaveWidth: { value: CONFIG.waveWidth },
    uAmplitude: { value: CONFIG.waveAmplitude },
    uJitter: { value: CONFIG.waveJitter },
    uTime: { value: 0 },
    uAmbSpeed: { value: CONFIG.ambientSpeed },
    uAmbFreq: { value: CONFIG.ambientFrequency },
    uAmbAmp: { value: CONFIG.ambientAmplitude },
    uAmbSharp: { value: CONFIG.ambientSharpness },
    uAmbSourceZ: { value: CONFIG.ambientSourceZ },
    uMaxHeight: { value: CONFIG.waveMaxHeight },
    uColorBase: { value: new Color(CONFIG.colorBase) },
    uColorHigh: { value: new Color(CONFIG.colorHigh) }
  };

  // ---- Boxes ----
  const count = CONFIG.gridSize * CONFIG.gridSize;
  const geometry = new BoxGeometry(CONFIG.boxWidth, CONFIG.boxHeight, CONFIG.boxWidth);
  const offsets = new InstancedBufferAttribute(new Float32Array(count * 2), 2);
  geometry.setAttribute('aOffset', offsets);

  const material = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.05 });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying float vHeight;
        attribute vec2 aOffset;
        uniform sampler2D uTrailTexture;
        uniform int   uTrailCount;
        uniform float uWaveSpeed;
        uniform float uWaveFreq;
        uniform float uWaveWidth;
        uniform float uFadeTime;
        uniform float uAmplitude;
        uniform float uJitter;
        uniform float uMaxHeight;
        uniform float uTime;
        uniform float uAmbSpeed;
        uniform float uAmbFreq;
        uniform float uAmbAmp;
        uniform float uAmbSharp;
        uniform float uAmbSourceZ;

        // Stable per-box offset in [-0.5, 0.5], so ripples look slightly uneven.
        vec2 hash2(vec2 p) {
          p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
          return fract(sin(p) * 43758.5453123) - 0.5;
        }`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vHeight = 0.0;
        if (position.y > 0.0) {
          vec2 worldXZ = aOffset + hash2(aOffset) * uJitter;
          float waveHeight = 0.0;
          float totalWeight = 0.0;
          for (int i = 0; i < ${MAX_TRAIL}; i++) {
            if (i >= uTrailCount) break;
            // texel: (worldX, worldZ, age, strength)
            vec4 td = texture2D(uTrailTexture, vec2((float(i) + 0.5) / ${MAX_TRAIL}.0, 0.5));
            float dist = length(worldXZ - td.rg);
            float relDist = dist - uWaveSpeed * td.b;
            float window = exp(-(relDist * relDist) / (uWaveWidth * uWaveWidth));
            float fade = exp(-td.b / uFadeTime);
            float atten = 1.0 / (1.0 + dist * 0.1);
            float weight = fade * window * atten * td.a;
            waveHeight += weight * cos(uWaveFreq * relDist);
            totalWeight += weight;
          }
          // Overlapping ripples average instead of stacking, which avoids chaotic peaks.
          waveHeight /= max(totalWeight, 1.0);

          // Ambient ripple: circular fronts from a point far above the screen, so
          // they travel top to bottom with a slight curve. Camera "up" is -Z.
          float srcDist = length(worldXZ - vec2(0.0, uAmbSourceZ));
          float phase = uAmbFreq * (srcDist - uAmbSpeed * uTime);
          float unevenness = 0.8 + 0.2 * sin(worldXZ.x * 0.25 + uTime * 0.15);
          float ambient = pow(0.5 + 0.5 * cos(phase), uAmbSharp) * uAmbAmp * unevenness;

          float displacement = clamp(ambient + waveHeight * uAmplitude, -uMaxHeight, uMaxHeight);
          transformed.y += displacement;
          vHeight = displacement;
        }`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying float vHeight;
        uniform vec3  uColorBase;
        uniform vec3  uColorHigh;
        uniform float uMaxHeight;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float lift = clamp(vHeight / uMaxHeight, 0.0, 1.0);
        diffuseColor.rgb = mix(uColorBase, uColorHigh, lift);`);
  };

  // Dim floor under the boxes. Without it the gaps near the centre of the screen (where the
  // camera looks straight down and no box sides show) are pure background and read as a dark cross.
  const floor = new Mesh(
    new PlaneGeometry(CONFIG.gridSize * 0.6, CONFIG.gridSize * 0.6),
    new MeshStandardMaterial({ color: CONFIG.colorFloor, roughness: 1, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -CONFIG.boxHeight / 2 - 0.01;
  scene.add(floor);

  const mesh = new InstancedMesh(geometry, material, count);
  mesh.frustumCulled = false; // vertices move in the shader, so the CPU bounds would be wrong
  scene.add(mesh);

  const pitch = CONFIG.boxWidth + CONFIG.gap;
  const half = ((CONFIG.gridSize - 1) * pitch) / 2;
  const bounds = CONFIG.gridSize * pitch;
  const dummy = new Object3D();
  for (let r = 0; r < CONFIG.gridSize; r++) {
    for (let c = 0; c < CONFIG.gridSize; c++) {
      const i = r * CONFIG.gridSize + c;
      const x = r * pitch - half;
      const z = c * pitch - half;
      dummy.position.set(x, 0, z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      offsets.setXY(i, x, z);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  offsets.needsUpdate = true;

  // ---- Ripple sources ----
  function addSource(x, z, strength) {
    if (trail.length >= MAX_TRAIL) trail.shift();
    trail.push({ x, z, age: 0, strength });
  }

  function updateTrail(dt) {
    const maxAge = CONFIG.fadeTime * 4;
    for (let i = trail.length - 1; i >= 0; i--) {
      trail[i].age += dt;
      if (trail[i].age > maxAge) trail.splice(i, 1);
    }
    const n = trail.length;
    for (let i = 0; i < n; i++) {
      const t = trail[i];
      const o = i * 4;
      trailData[o] = t.x;
      trailData[o + 1] = t.z;
      trailData[o + 2] = t.age;
      trailData[o + 3] = t.strength;
    }
    if (n > 0 || uniforms.uTrailCount.value > 0) {
      trailTexture.needsUpdate = true;
      uniforms.uTrailCount.value = n;
    }
  }

  // ---- Pointer ----
  const raycaster = new Raycaster();
  const topPlane = new Plane(new Vector3(0, 1, 0), -TOPS_Y);
  const ndc = new Vector2();
  const hit = new Vector3();
  const mouse = new Vector2(0, 0);       // -1..1, drives camera drift
  const drift = new Vector2(0, 0);
  let lastPoint = null;

  function pointerToPlane(e) {
    ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.ray.intersectPlane(topPlane, hit);
  }

  function onPointerMove(e) {
    if (!pointerToPlane(e)) return;
    mouse.set(ndc.x, ndc.y);
    let moved = 0;
    if (lastPoint) {
      moved = Math.hypot(hit.x - lastPoint.x, hit.z - lastPoint.z);
      if (moved < CONFIG.trailSpacing) return;
    }
    // Faster movement makes a stronger ripple, capped at 1.
    addSource(hit.x, hit.z, lastPoint ? Math.min(1, 0.4 + moved * 0.5) : 0.4);
    lastPoint = { x: hit.x, z: hit.z };
  }

  function onPointerDown(e) {
    if (!pointerToPlane(e)) return;
    addSource(hit.x, hit.z, 1);
    lastPoint = { x: hit.x, z: hit.z };
  }

  // ---- Camera ----
  function placeCamera() {
    const a = drift.y * CONFIG.driftAlpha;
    const b = drift.x * CONFIG.driftBeta;
    const d = distance;
    camera.position.set(-d * Math.cos(a) * Math.sin(b), d * Math.cos(a) * Math.cos(b), d * Math.sin(a));
    camera.up.set(0, 0, -1);
    camera.lookAt(0, 0, 0);
  }

  let distance = CONFIG.distance;

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    // Pull the camera back on tall screens so boxes don't get huge on phones.
    distance = Math.min(52, CONFIG.distance / Math.min(1, aspect * 1.2));
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(w, h, false);
    placeCamera();
    camera.updateMatrixWorld(true);
    if (!running) renderFrame();
  }

  // ---- Loop ----
  let running = false;
  let last = 0;

  function renderFrame() {
    renderer.render(scene, camera);
  }

  function tick(now) {
    // rAF timestamps can land slightly before `last`; never let time run backwards.
    const dt = MathUtils.clamp((now - last) / 1000 || 0, 0, 0.05);
    last = now;

    uniforms.uTime.value += dt;
    updateTrail(dt);

    drift.x += (mouse.x - drift.x) * CONFIG.driftLerp;
    drift.y += (mouse.y - drift.y) * CONFIG.driftLerp;
    placeCamera();

    renderFrame();
  }

  function shouldRun() {
    return !reduceMotion && !document.hidden && !root.classList.contains('motion-paused');
  }

  function sync() {
    const want = shouldRun();
    if (want === running) return;
    running = want;
    if (running) {
      last = performance.now();
      renderer.setAnimationLoop(tick);
    } else {
      renderer.setAnimationLoop(null);
    }
  }

  // Start mid-ripple, so the first frame (and the still frame for
  // reduced-motion visitors) isn't a flat grid.
  uniforms.uTime.value = 6;

  resize();
  renderFrame();

  window.addEventListener('resize', resize);
  if (!reduceMotion) {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('visibilitychange', sync);
    // The page's "Pause animations" button toggles this class on <html>.
    new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['class'] });
    sync();
  }

  return {
    // Exposed for debugging in the console: __wavyBoxes.config, .uniforms
    config: CONFIG,
    uniforms,
    dispose() {
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('visibilitychange', sync);
      geometry.dispose();
      floor.geometry.dispose();
      floor.material.dispose();
      material.dispose();
      trailTexture.dispose();
      renderer.dispose();
    }
  };
}

// ---- Boot ----
(function boot() {
  const canvas = document.getElementById('bgBoxes');
  if (!canvas) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const api = startWavyBoxes(canvas, { reduceMotion });
  if (!api) return; // no WebGL: the old line-grid background stays
  window.__wavyBoxes = api;
  document.documentElement.classList.add('has-boxes');
  requestAnimationFrame(() => canvas.classList.add('is-ready'));
})();
