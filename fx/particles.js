import * as THREE from 'three';

// A slow field of glowing dots in the page colour(s), drifting with the mouse and scroll.
export function start(canvas) {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' }); }
  catch (e) { canvas.remove(); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  cam.position.z = 8;

  const N = innerWidth < 700 ? 650 : 1500;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 3 + Math.random() * 11, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 1.4;
    pos[i * 3 + 2] = r * Math.cos(ph) - 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

  const dot = document.createElement('canvas'); dot.width = dot.height = 64;
  const g = dot.getContext('2d'), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.25, 'rgba(255,255,255,.6)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);

  const mat = new THREE.PointsMaterial({ size: 0.09, map: new THREE.CanvasTexture(dot), vertexColors: true, transparent: true, depthWrite: false });
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);

  const isLight = () => root.dataset.theme === 'light' || (!root.dataset.theme && !matchMedia('(prefers-color-scheme: dark)').matches);
  function paint() {
    const css = getComputedStyle(root);
    const list = ((isLight() && root.dataset.fxColorsLight) || root.dataset.fxColors || css.getPropertyValue('--accent') || '#888').split(',').map(s => new THREE.Color(s.trim()));
    const light = isLight(), neutral = new THREE.Color(light ? '#3a3835' : '#f2efe8');
    for (let i = 0; i < N; i++) (i % 4 === 0 ? neutral : list[i % list.length]).toArray(col, i * 3);
    geo.attributes.color.needsUpdate = true;
    mat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    mat.opacity = light ? 0.45 : 0.85;
    mat.needsUpdate = true;
    if (reduce) render();
  }
  new MutationObserver(paint).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
    if (reduce) render();
  }
  addEventListener('resize', resize);

  let mx = 0, my = 0, tx = 0, ty = 0;
  addEventListener('pointermove', e => { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; }, { passive: true });

  function render() { renderer.render(scene, cam); }
  const clock = new THREE.Clock();
  function loop() {
    const t = clock.getElapsedTime();
    mx += (tx - mx) * 0.04; my += (ty - my) * 0.04;
    pts.rotation.y = t * 0.018 + mx * 0.25;
    pts.rotation.x = my * 0.15;
    pts.position.y = scrollY * 0.0012;
    render();
    requestAnimationFrame(loop);
  }
  paint(); resize();
  if (!reduce) loop(); else render();
}
