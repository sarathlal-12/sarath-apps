import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Home hero: the four app icons as glossy 3D tiles orbiting a glass core.
// Drag to spin, hover to see the name, click to open the app's page.
const APPS = [
  { name: 'SpotVault', tag: 'Your playlists, offline', href: '/spotvault/', icon: '/logo.png', color: '#E0443E' },
  { name: 'AirBridge', tag: "Your phone's sound, on your PC", href: '/airbridge/', icon: '/airbridge/icon.png', color: '#3B7BFF' },
  { name: '.light', tag: 'A Dynamic Island for Windows', href: '/light/', icon: '/light/icon.png', color: '#22B455' },
  { name: 'Byterake', tag: 'Free up disk space, safely', href: '/byterake/', icon: '/byterake/icon.png', color: '#7C5CFF' },
];

function main() {
  const stage = document.getElementById('stage');
  if (!stage) return;
  const canvas = stage.querySelector('canvas'), label = stage.querySelector('.stage-label');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || location.search.includes('still');
  const root = document.documentElement;

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(3, 5, 6); scene.add(key);

  // glass core + two thin orbit rings
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 5), new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0.15, roughness: 0.05, transmission: 1, thickness: 1.2, ior: 1.45,
    iridescence: 1, iridescenceIOR: 1.6, clearcoat: 1,
  }));
  scene.add(core);
  const glow = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 3), new THREE.MeshBasicMaterial({ color: 0xE5E5EA }));
  scene.add(glow);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 });
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.008, 8, 160), ringMat); ringA.rotation.x = Math.PI / 2;
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.006, 8, 120), ringMat); ringB.rotation.set(Math.PI / 2.6, 0.4, 0);
  scene.add(ringA, ringB);

  // rounded mask so square icons get soft corners
  const m = document.createElement('canvas'); m.width = m.height = 256;
  const mc = m.getContext('2d'); mc.fillStyle = '#fff'; mc.beginPath(); mc.roundRect(0, 0, 256, 256, 58); mc.fill();
  const mask = new THREE.CanvasTexture(m);

  const loader = new THREE.TextureLoader();
  const bodyGeo = new RoundedBoxGeometry(1.5, 1.5, 0.28, 6, 0.28);
  const faceGeo = new THREE.PlaneGeometry(1.22, 1.22);
  const hitList = [];
  const tiles = APPS.map((a, i) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, new THREE.MeshPhysicalMaterial({ color: a.color, metalness: 0.3, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 }));
    const tex = loader.load(a.icon); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const face = new THREE.Mesh(faceGeo, new THREE.MeshBasicMaterial({ map: tex, alphaMap: mask, transparent: true, toneMapped: false }));
    face.position.z = 0.145;
    const back = face.clone(); back.rotation.y = Math.PI; back.position.z = -0.145;
    g.add(body, face, back);
    g.userData = { app: a, i, hover: 0, born: 0 };
    [body, face, back].forEach(o => { o.userData.tile = g; hitList.push(o); });
    scene.add(g);
    return g;
  });

  function theme() {
    const light = root.dataset.theme === 'light';
    ringMat.color.set(light ? 0x111111 : 0xffffff);
    ringMat.opacity = light ? 0.16 : 0.22;
  }
  new MutationObserver(theme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  theme();

  let W = 1, H = 1;
  function resize() {
    const r = stage.getBoundingClientRect(); W = r.width; H = r.height;
    renderer.setSize(W, H, false);
    cam.aspect = W / H;
    cam.position.set(0, 1.5, Math.max(9.5, 3.15 / (0.2867 * cam.aspect)));
    cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  // input
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(-9, -9);
  let tiltX = 0, tiltY = 0, tX = 0, tY = 0, spin = 0, vel = 0, dragging = false, lastX = 0, moved = 0, hovered = null, px = 0, py = 0;
  stage.addEventListener('pointermove', e => {
    const r = stage.getBoundingClientRect();
    px = e.clientX - r.left; py = e.clientY - r.top;
    ptr.set(px / r.width * 2 - 1, -(py / r.height) * 2 + 1);
    tX = (px / r.width - 0.5); tY = (py / r.height - 0.5);
    if (dragging) { const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx); vel = dx * 0.006; spin += dx * 0.008; }
  });
  stage.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; moved = 0; });
  addEventListener('pointerup', () => { dragging = false; });
  stage.addEventListener('pointerleave', () => { ptr.set(-9, -9); tX = tY = 0; });
  stage.addEventListener('click', e => {
    if (moved >= 6) return;
    const r = stage.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), cam);
    const h = ray.intersectObjects(hitList, false)[0];
    if (h) location.href = h.object.userData.tile.userData.app.href;
  });

  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(stage);

  const easeBack = x => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const clock = new THREE.Clock();
  let t = 0;
  function loop() {
    requestAnimationFrame(loop);
    if (!visible || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.05); t += dt;
    if (!dragging) { vel *= 0.95; spin += (reduce ? 0 : 0.22) * dt + vel; }
    tiltX += (tX - tiltX) * 0.06; tiltY += (tY - tiltY) * 0.06;

    ray.setFromCamera(ptr, cam);
    const hit = ray.intersectObjects(hitList, false)[0];
    const now = hit ? hit.object.userData.tile : null;
    if (now !== hovered) {
      hovered = now;
      stage.style.cursor = hovered ? 'pointer' : 'grab';
      if (hovered) { const a = hovered.userData.app; label.innerHTML = '<b>' + a.name + '</b><span>' + a.tag + '</span>'; label.style.setProperty('--c', a.color); }
      label.classList.toggle('on', !!hovered);
    }
    if (hovered) label.style.transform = 'translate(' + (px + 18) + 'px,' + (py + 14) + 'px)';

    const R = 2.05;
    tiles.forEach(g => {
      const d = g.userData;
      const born = reduce ? 1 : easeBack(Math.min(1, Math.max(0, (t - 0.2 - d.i * 0.15) / 1.1)));
      d.hover += ((g === hovered ? 1 : 0) - d.hover) * 0.12;
      const ang = spin + d.i * Math.PI / 2;
      g.position.set(Math.cos(ang) * R, (reduce ? 0 : Math.sin(t * 1.1 + d.i * 1.7) * 0.18) + (1 - born) * -2.2, Math.sin(ang) * R);
      g.rotation.set(-tiltY * 0.5 + Math.sin(t * 0.8 + d.i) * 0.12, tiltX * 0.9 + Math.sin(t * 0.6 + d.i * 2) * 0.35, Math.sin(t * 0.7 + d.i) * 0.06);
      g.scale.setScalar(Math.max(0.001, born) * (1 + d.hover * 0.2));
    });
    core.rotation.set(t * 0.2, t * 0.3, 0);
    glow.scale.setScalar(1 + Math.sin(t * 2) * 0.06);
    glow.material.color.set(hovered ? hovered.userData.app.color : '#E5E5EA');
    ringA.rotation.z = t * 0.1; ringB.rotation.z = -t * 0.15;
    scene.rotation.x = tiltY * 0.25; scene.rotation.z = -tiltX * 0.08;
    renderer.render(scene, cam);
    if (!stage.classList.contains('ready')) stage.classList.add('ready');
  }
  loop();
}
main();
