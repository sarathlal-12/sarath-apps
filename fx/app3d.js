import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// App pages: a glossy 3D app icon in the hero, plus a 3D scene that shows what the app does.
// The page picks them with <html data-fx-icon="/x/icon.png" data-fx-object="vinyl|airbridge|island|platter">.
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || location.search.includes('still');
const ICON = root.dataset.fxIcon, KIND = root.dataset.fxObject;
const accentHex = () => getComputedStyle(root).getPropertyValue('--accent').trim() || '#888888';
const isLight = () => root.dataset.theme === 'light';

const CAPTIONS = {
  vinyl: 'Every song, spinning offline.',
  airbridge: 'Your phone’s sound, beamed to your PC.',
  island: 'Lives at the top of your screen.',
  platter: 'Rakes out the junk. Nothing else.',
};

function roundMask(r = 58) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.beginPath(); g.roundRect(0, 0, 256, 256, r); g.fill();
  return new THREE.CanvasTexture(c);
}
function loadImg(src) { return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
function tex(canvas) { const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function glossy(color, o = {}) { return new THREE.MeshPhysicalMaterial({ color, metalness: 0.3, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, ...o }); }

// ---------- shared stage: renderer, camera, drag-to-spin, pause when off-screen ----------
function makeStage(el, { z = 9, y = 0, idle = 0.25 } = {}) {
  const canvas = el.querySelector('canvas');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { el.remove(); return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight(0xffffff, 1.3); key.position.set(3, 6, 6); scene.add(key);
  const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  const spin = new THREE.Group(); scene.add(spin);
  const s = { scene, spin, accentMats: [], update: null };

  function resize() {
    const r = el.getBoundingClientRect(); if (!r.width) return;
    renderer.setSize(r.width, r.height, false);
    cam.aspect = r.width / r.height;
    const k = z / Math.min(1, cam.aspect * 1.1);
    cam.position.set(0, y * k / z, k); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(el); resize();

  let tx = 0, ty = 0, mx = 0, my = 0, rotY = 0, vel = 0, drag = false, lastX = 0, visible = true;
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width - 0.5; ty = (e.clientY - r.top) / r.height - 0.5;
    if (drag) { const dx = e.clientX - lastX; lastX = e.clientX; vel = dx * 0.005; rotY += dx * 0.008; }
  });
  el.addEventListener('pointerdown', e => { drag = true; lastX = e.clientX; el.style.cursor = 'grabbing'; });
  addEventListener('pointerup', () => { drag = false; el.style.cursor = ''; });
  el.addEventListener('pointerleave', () => { tx = ty = 0; });
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { rootMargin: '100px' }).observe(el);
  new MutationObserver(() => { const c = accentHex(); s.accentMats.forEach(m => m.color.set(c)); if (s.onTheme) s.onTheme(); })
    .observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  const clock = new THREE.Clock(); let t = 0;
  function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!reduce) t += dt;
    mx += (tx - mx) * 0.06; my += (ty - my) * 0.06;
    if (!drag) { rotY += vel; vel *= 0.95; }
    spin.rotation.y = rotY + mx * 0.6 + (reduce ? 0 : Math.sin(t * 0.5) * idle);
    spin.rotation.x = my * 0.3;
    if (s.update) s.update(t, reduce ? 0 : dt);
    renderer.render(scene, cam);
  }
  s.start = () => { requestAnimationFrame(frame); el.classList.add('ready'); };
  return s;
}

// ---------- hero: the app icon as a glossy 3D tile ----------
function heroIcon() {
  const h1 = document.querySelector('.hero h1');
  if (!h1 || !ICON) return;
  const el = document.createElement('div');
  el.className = 'fx-icon3d'; el.setAttribute('aria-hidden', 'true'); el.innerHTML = '<canvas></canvas>';
  h1.parentNode.insertBefore(el, h1);
  const s = makeStage(el, { z: 6.2, idle: 0.45 }); if (!s) return;
  const bodyMat = glossy(accentHex()); s.accentMats.push(bodyMat);
  const body = new THREE.Mesh(new RoundedBoxGeometry(2, 2, 0.42, 6, 0.42), bodyMat);
  const t = new THREE.TextureLoader().load(ICON); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.64, 1.64), new THREE.MeshBasicMaterial({ map: t, alphaMap: roundMask(), transparent: true, toneMapped: false }));
  face.position.z = 0.215;
  const back = face.clone(); back.rotation.y = Math.PI; back.position.z = -0.215;
  s.spin.add(body, face, back);
  s.update = (time) => { s.spin.position.y = Math.sin(time * 1.3) * 0.1; s.spin.rotation.z = Math.sin(time * 0.9) * 0.05; };
  s.start();
}

// ---------- SpotVault: a record spinning on a deck, songs floating around it ----------
async function vinyl(s) {
  const A = accentHex();
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  const g = c.getContext('2d');
  g.fillStyle = '#0b0b0c'; g.fillRect(0, 0, 1024, 1024);
  for (let r = 175; r < 505; r += 3) { g.strokeStyle = r % 9 === 0 ? '#202023' : '#121214'; g.lineWidth = 1.5; g.beginPath(); g.arc(512, 512, r, 0, Math.PI * 2); g.stroke(); }
  g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 60; g.beginPath(); g.arc(512, 512, 330, -0.6, 0.2); g.stroke();
  const drawLabel = img => {
    g.fillStyle = A; g.beginPath(); g.arc(512, 512, 165, 0, Math.PI * 2); g.fill();
    if (img) { g.save(); g.beginPath(); g.arc(512, 512, 92, 0, Math.PI * 2); g.clip(); g.drawImage(img, 420, 420, 184, 184); g.restore(); }
    g.fillStyle = '#0b0b0c'; g.beginPath(); g.arc(512, 512, 10, 0, Math.PI * 2); g.fill();
  };
  drawLabel(null);
  const map = tex(c);
  loadImg(ICON).then(img => { drawLabel(img); map.needsUpdate = true; });
  const top = new THREE.MeshPhysicalMaterial({ map, roughness: 0.32, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.15 });
  const side = new THREE.MeshPhysicalMaterial({ color: 0x0b0b0c, roughness: 0.3 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.06, 128), [side, top, top]);
  disc.position.y = 0.32;

  const deck = new THREE.Mesh(new RoundedBoxGeometry(5.6, 0.4, 5, 4, 0.14), new THREE.MeshPhysicalMaterial({ color: 0x1b1b1e, metalness: 0.6, roughness: 0.35, clearcoat: 0.6 }));
  deck.position.set(0.3, 0, 0);
  const mat = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.08, 96), new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.8 }));
  mat.position.y = 0.25;

  const silver = new THREE.MeshPhysicalMaterial({ color: 0xd9d9de, metalness: 1, roughness: 0.18 });
  const arm = new THREE.Group(); arm.position.set(2.55, 0.3, -1.8);
  const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.35, 32), silver); pivot.position.y = 0.15;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.9, 16), silver); rod.rotation.x = Math.PI / 2; rod.position.set(0, 0.3, 1.45);
  const head = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.1, 0.42, 2, 0.04), silver); head.position.set(0, 0.24, 2.9);
  arm.add(pivot, rod, head); arm.rotation.y = -0.42;

  const notes = [];
  const noteMat = glossy(A); s.accentMats.push(noteMat);
  const white = glossy(0xf2efe8);
  for (let i = 0; i < 7; i++) {
    const n = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.5, 0.1, 4, 0.08), i % 3 ? noteMat : white);
    n.userData = { a: i / 7 * Math.PI * 2, h: 1.1 + (i % 3) * 0.45, r: 3 + (i % 2) * 0.5 };
    notes.push(n); s.spin.add(n);
  }
  s.spin.add(deck, mat, disc, arm);
  s.spin.position.y = -0.4;
  s.update = (t, dt) => {
    disc.rotation.y -= dt * 2.2;
    arm.rotation.y = -0.42 + Math.sin(t * 0.7) * 0.015;
    notes.forEach((n, i) => {
      const d = n.userData, a = d.a + t * 0.25;
      n.position.set(Math.cos(a) * d.r, d.h + Math.sin(t * 1.4 + i) * 0.18, Math.sin(a) * d.r);
      n.rotation.set(Math.sin(t + i) * 0.4, -a + Math.PI / 2, Math.cos(t * 0.8 + i) * 0.3);
    });
  };
}

// ---------- AirBridge: phone beaming sound rings to a laptop ----------
async function airbridge(s) {
  const A = accentHex();
  const img = await loadImg(ICON);
  // phone
  const phone = new THREE.Group(); phone.position.set(-2.7, 0.15, 0); phone.rotation.y = 0.45;
  const pBody = new THREE.Mesh(new RoundedBoxGeometry(1.15, 2.3, 0.14, 6, 0.18), new THREE.MeshPhysicalMaterial({ color: 0x151517, metalness: 0.7, roughness: 0.25, clearcoat: 1 }));
  const sc = document.createElement('canvas'); sc.width = 256; sc.height = 512;
  const g = sc.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 512); grd.addColorStop(0, A); grd.addColorStop(1, '#0b0b0d');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 512);
  g.fillStyle = '#000'; g.beginPath(); g.roundRect(88, 18, 80, 22, 11); g.fill();
  if (img) { g.save(); g.beginPath(); g.roundRect(78, 180, 100, 100, 24); g.clip(); g.drawImage(img, 78, 180, 100, 100); g.restore(); }
  g.fillStyle = 'rgba(255,255,255,.9)'; g.font = '600 22px Inter, sans-serif'; g.textAlign = 'center'; g.fillText('Playing on PC', 128, 320);
  const pScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.03, 2.16), new THREE.MeshBasicMaterial({ map: tex(sc), alphaMap: roundMask(30), transparent: true, toneMapped: false }));
  pScreen.position.z = 0.075;
  phone.add(pBody, pScreen);

  // laptop
  const lap = new THREE.Group(); lap.position.set(2.5, -0.55, 0); lap.rotation.y = -0.5;
  const alu = new THREE.MeshPhysicalMaterial({ color: 0xc9c9ce, metalness: 0.9, roughness: 0.28 });
  const base = new THREE.Mesh(new RoundedBoxGeometry(3.2, 0.12, 2.1, 4, 0.05), alu);
  const lid = new THREE.Group(); lid.position.set(0, 0.06, -1.03); lid.rotation.x = -0.22;
  const lidBox = new THREE.Mesh(new RoundedBoxGeometry(3.2, 2.05, 0.08, 4, 0.04), alu); lidBox.position.y = 1.02;
  const ds = document.createElement('canvas'); ds.width = 512; ds.height = 320;
  const d = ds.getContext('2d');
  const dg = d.createLinearGradient(0, 0, 512, 320); dg.addColorStop(0, '#16181d'); dg.addColorStop(1, '#0b0b0d');
  d.fillStyle = dg; d.fillRect(0, 0, 512, 320);
  d.fillStyle = 'rgba(255,255,255,.08)'; d.fillRect(0, 290, 512, 30);
  if (img) d.drawImage(img, 440, 293, 24, 24);
  d.fillStyle = 'rgba(30,30,34,.95)'; d.beginPath(); d.roundRect(300, 170, 196, 110, 14); d.fill();
  d.fillStyle = A; d.fillRect(318, 196, 150, 6);
  d.fillStyle = 'rgba(255,255,255,.8)'; d.font = '600 18px Inter, sans-serif'; d.fillText('Streaming', 318, 236);
  d.fillStyle = 'rgba(255,255,255,.4)'; d.font = '15px Inter, sans-serif'; d.fillText('AirBridge', 318, 260);
  const lScreen = new THREE.Mesh(new THREE.PlaneGeometry(2.95, 1.84), new THREE.MeshBasicMaterial({ map: tex(ds), toneMapped: false }));
  lScreen.position.set(0, 1.02, 0.045);
  lid.add(lidBox, lScreen); lap.add(base, lid);

  // rings
  const rings = [];
  for (let i = 0; i < 9; i++) {
    const m = new THREE.MeshBasicMaterial({ color: A, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    s.accentMats.push(m);
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.03, 10, 72), m);
    r.rotation.y = Math.PI / 2; rings.push(r); s.spin.add(r);
  }
  s.spin.add(phone, lap);
  s.onTheme = () => rings.forEach(r => { r.material.blending = isLight() ? THREE.NormalBlending : THREE.AdditiveBlending; r.material.needsUpdate = true; });
  s.onTheme();
  s.update = t => {
    phone.position.y = 0.15 + Math.sin(t * 1.2) * 0.12;
    rings.forEach((r, i) => {
      const p = (t * 0.32 + i / rings.length) % 1;
      r.position.set(-2.0 + p * 3.6, 0.35 + Math.sin(p * Math.PI) * 0.7, 0);
      r.scale.setScalar(0.35 + p * 1.2);
      r.material.opacity = Math.sin(p * Math.PI) * 0.9;
    });
  };
}

// ---------- .light: a monitor with the island growing and shrinking at the top ----------
async function island(s) {
  const A = accentHex();
  const img = await loadImg(ICON);
  const mon = new THREE.Group(); mon.position.y = -0.55;
  const bezel = new THREE.Mesh(new RoundedBoxGeometry(5.4, 3.25, 0.18, 6, 0.12), new THREE.MeshPhysicalMaterial({ color: 0x111113, metalness: 0.5, roughness: 0.3, clearcoat: 1 }));
  bezel.position.y = 0.8;
  const wc = document.createElement('canvas'); wc.width = 1024; wc.height = 600;
  const w = wc.getContext('2d');
  const wg = w.createRadialGradient(700, 650, 50, 600, 400, 800); wg.addColorStop(0, '#1f3a2a'); wg.addColorStop(0.5, '#141a22'); wg.addColorStop(1, '#0a0a0c');
  w.fillStyle = wg; w.fillRect(0, 0, 1024, 600);
  w.fillStyle = 'rgba(255,255,255,.07)'; w.fillRect(0, 560, 1024, 40);
  if (img) w.drawImage(img, 497, 566, 30, 30);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(5.1, 2.98), new THREE.MeshBasicMaterial({ map: tex(wc), toneMapped: false }));
  screen.position.set(0, 0.8, 0.095);
  const alu = new THREE.MeshPhysicalMaterial({ color: 0xc9c9ce, metalness: 0.9, roughness: 0.3 });
  const neck = new THREE.Mesh(new RoundedBoxGeometry(0.42, 1.3, 0.16, 3, 0.05), alu); neck.position.set(0, -1.15, -0.25);
  const foot = new THREE.Mesh(new RoundedBoxGeometry(2, 0.08, 1.1, 3, 0.04), alu); foot.position.set(0, -1.8, -0.1);
  mon.add(bezel, screen, neck, foot);

  // island: black pill with a glowing dot and cards that drop out when it opens
  const pill = new THREE.Mesh(new RoundedBoxGeometry(1, 1, 0.14, 6, 0.48), new THREE.MeshPhysicalMaterial({ color: 0x050506, metalness: 0.4, roughness: 0.15, clearcoat: 1 }));
  const dotMat = new THREE.MeshBasicMaterial({ color: A }); s.accentMats.push(dotMat);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), dotMat);
  const cardMat = glossy(A); s.accentMats.push(cardMat);
  const cards = [cardMat, glossy(0xf2efe8), glossy(0x2a2a2e)].map((m, i) => {
    const c = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.5, 0.07, 3, 0.1), m);
    c.userData.x = (i - 1) * 0.95; mon.add(c); return c;
  });
  mon.add(pill, dot);
  s.spin.add(mon);
  const top = 0.8 + 1.49 - 0.06;
  const ease = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  s.update = t => {
    const cyc = (t % 5) / 5;                       // 0..1 every 5 s
    const open = cyc < 0.2 ? 0 : cyc < 0.35 ? ease((cyc - 0.2) / 0.15) : cyc < 0.8 ? 1 : cyc < 0.95 ? 1 - ease((cyc - 0.8) / 0.15) : 0;
    const wdt = 1.0 + open * 1.9, hgt = 0.3 + open * 0.55;
    pill.scale.set(wdt, hgt, 1);
    pill.position.set(0, top - hgt / 2, 0.22);
    dot.position.set(wdt / 2 - 0.18, top - 0.15, 0.31);
    cards.forEach((c, i) => {
      const k = Math.max(0, Math.min(1, open * 1.4 - i * 0.15));
      c.position.set(c.userData.x * k, top - hgt - 0.15 - k * 0.45, 0.3 + k * 0.25);
      c.scale.setScalar(Math.max(0.001, k));
      c.rotation.x = (1 - k) * -0.6;
    });
  };
}

// ---------- Byterake: a drive platter, junk files spiral in and vanish ----------
async function platter(s) {
  const A = accentHex();
  const housing = new THREE.Mesh(new RoundedBoxGeometry(4.8, 0.36, 5.8, 4, 0.12), new THREE.MeshPhysicalMaterial({ color: 0x232327, metalness: 0.75, roughness: 0.35 }));
  const disk = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.06, 128), new THREE.MeshPhysicalMaterial({ color: 0xeeeef2, metalness: 1, roughness: 0.07 }));
  disk.position.set(0, 0.24, -0.5);
  const hubMat = glossy(A); s.accentMats.push(hubMat);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 48), hubMat); hub.position.set(0, 0.3, -0.5);
  const silver = new THREE.MeshPhysicalMaterial({ color: 0xbfbfc4, metalness: 1, roughness: 0.25 });
  const arm = new THREE.Group(); arm.position.set(1.75, 0.3, 2.0);
  const armBar = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.06, 2.4, 2, 0.03), silver); armBar.position.z = -1.2;
  const armPivot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.16, 32), silver);
  arm.add(armBar, armPivot);

  const ringMat = new THREE.MeshBasicMaterial({ color: A, transparent: true, opacity: 0.5, depthWrite: false }); s.accentMats.push(ringMat);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.02, 8, 80), ringMat); ring.rotation.x = Math.PI / 2; ring.position.set(0, 0.42, -0.5);

  const junkMats = [glossy(0x6b6b70), glossy(0x8e8e93), glossy(0x3a3a3f), hubMat];
  const geo = new RoundedBoxGeometry(0.26, 0.32, 0.06, 2, 0.04);
  const junk = [];
  const N = innerWidth < 700 ? 22 : 36;
  for (let i = 0; i < N; i++) {
    const m = new THREE.Mesh(geo, junkMats[i % junkMats.length]);
    m.userData = { p: i / N, a: Math.random() * Math.PI * 2, h: 0.9 + Math.random() * 1.6, s: 0.7 + Math.random() * 0.8 };
    junk.push(m); s.spin.add(m);
  }
  s.spin.add(housing, disk, hub, arm, ring);
  s.spin.position.y = -0.5;
  s.update = (t, dt) => {
    disk.rotation.y += dt * 3; hub.rotation.y = disk.rotation.y;
    arm.rotation.y = Math.sin(t * 1.6) * 0.25 + 0.1;
    ring.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
    junk.forEach(m => {
      const d = m.userData, p = (d.p + t * 0.09) % 1;         // 0 = far out, 1 = gone
      const r = 3.6 * (1 - p) + 0.1, a = d.a + p * 5;
      m.position.set(Math.cos(a) * r, 0.45 + d.h * (1 - p), -0.5 + Math.sin(a) * r);
      m.rotation.set(t * d.s, t * d.s * 1.3, 0);
      m.scale.setScalar(Math.max(0.001, d.s * Math.min(1, (1 - p) * 4) * Math.min(1, p * 8)));
    });
  };
}

function show() {
  const build = { vinyl, airbridge, island, platter }[KIND];
  const hero = document.querySelector('.hero');
  if (!build || !hero) return;
  const sec = document.createElement('section');
  sec.className = 'fx-show'; sec.setAttribute('aria-hidden', 'true');
  sec.innerHTML = '<div class="fx-show-in"><canvas></canvas><p class="fx-show-cap">' + CAPTIONS[KIND] + '</p><p class="fx-show-hint">Drag to spin</p></div>';
  const watch = document.getElementById('watch');
  if (watch && watch.parentNode === hero.parentNode) watch.before(sec); else hero.after(sec);
  const box = sec.firstElementChild;
  const cfg = { vinyl: { z: 8.6, y: 3.8, idle: 0.3 }, airbridge: { z: 9.5, y: 1.2, idle: 0.2 }, island: { z: 11.5, y: 0.6, idle: 0.25 }, platter: { z: 9.2, y: 4.2, idle: 0.3 } }[KIND];
  const s = makeStage(box, cfg); if (!s) return;
  build(s).then(() => s.start());
}

heroIcon();
show();
