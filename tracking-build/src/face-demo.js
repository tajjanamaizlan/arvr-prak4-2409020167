// src/face-demo.js - Demonstrasi 2: face tracking (MindAR + Three.js)
import * as THREE from 'three';
import { MindARThree } from '../vendor/mindar/mindar-face-three.prod.js';
import { setStatus, setupStartButton } from './common.js';

const ANCHOR_INDEX = 10; // titik atas dahi
const ACC_SCALE = 1.0;
const ACC_OFFSET = { x: 0, y: 0.15, z: 0.0 };
const ACC_TILT = 0.0;        // condong ke belakang (radian), coba -0.15 bila perlu

// Bentuk mahkota: busur mendatar yang melingkari kepala
const HEAD_CENTER_Z = -0.38; // pusat kepala (di belakang dahi)
const RING_Y = 0.02;         // tinggi mahkota
const RING_RX = 0.43;        // lebar kiri-kanan
const RING_RZ = 0.40;        // panjang depan-belakang
const ARC_SPAN_DEG = 270;    // 180 = setengah lingkaran, makin besar makin ke belakang
const BACK_RISE = 0.04;      // bagian belakang sedikit naik

const FLOWER_COUNT = 13;     // pakai angka ganjil (bunga tengah = mawar terbesar)

// Palet warna lembut (ubah sesukamu)
const ROSE_COLORS = [0xf4b6c2, 0xe8a0b4, 0xffcba4, 0xf9d5d3];
const DAISY_COLORS = [0xfff8f0, 0xffffff];
const BLOSSOM_COLORS = [0xfbcfe8, 0xddd6fe, 0xfff1e6];
const LEAF_COLORS = [0x5f8f5f, 0x7aa874];
const EUCA_COLOR = 0x84a98c;
const VINE_COLOR = 0x4d7c4f;

// Penutup kepala: menyembunyikan bagian mahkota yang ada di belakang kepala
const USE_OCCLUDER = true;
const HEAD_RADIUS = { x: 0.38, y: 0.50, z: 0.38 };
const HEAD_CENTER_Y = -0.10;

const SPAN = (ARC_SPAN_DEG * Math.PI) / 180;
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);
const rnd = (i) => { const s = Math.sin(i * 127.1) * 43758.5453; return s - Math.floor(s); };

// ---------- Busur ----------
function ringPoint(t) { // t=0 belakang kiri, t=0.5 dahi, t=1 belakang kanan
  const th = (t - 0.5) * SPAN;
  return new THREE.Vector3(
    Math.sin(th) * RING_RX,
    RING_Y + BACK_RISE * (1 - Math.cos(th)),
    HEAD_CENTER_Z + Math.cos(th) * RING_RZ
  );
}
function outward(p) {
  const v = new THREE.Vector3(p.x, 0, p.z - HEAD_CENTER_Z).normalize();
  return v.add(new THREE.Vector3(0, 0.55, 0)).normalize();
}
function tangent(t) {
  const a = Math.max(0, t - 0.01), b = Math.min(1, t + 0.01);
  return ringPoint(b).sub(ringPoint(a)).normalize();
}

// ---------- Bahan dan bentuk dasar ----------
const stdMat = (color, o = {}) => new THREE.MeshStandardMaterial({
  color, roughness: 0.6, emissive: color, emissiveIntensity: 0.12, ...o,
});
const petalGeo = new THREE.SphereGeometry(1, 14, 10);
const dotGeo = new THREE.SphereGeometry(1, 10, 8);

const leafShape = new THREE.Shape();
leafShape.moveTo(0, 0);
leafShape.quadraticCurveTo(0.028, 0.035, 0, 0.09);
leafShape.quadraticCurveTo(-0.028, 0.035, 0, 0);
const leafGeo = new THREE.ShapeGeometry(leafShape, 8);
const eucaGeo = new THREE.CircleGeometry(0.018, 16);

// Satu kelopak: berputar mengelilingi sumbu bunga (z), miring sebesar tilt
function addPetal(parent, mat, angle, radius, tilt, w, h, th, z = 0) {
  const pivot = new THREE.Group();
  pivot.rotation.z = angle;
  const petal = new THREE.Mesh(petalGeo, mat);
  petal.scale.set(w, h, th);
  const half = h * 0.85;
  petal.position.set(0, radius + Math.cos(tilt) * half, z + Math.sin(tilt) * half);
  petal.rotation.x = tilt;
  pivot.add(petal);
  parent.add(pivot);
}

// ---------- Jenis bunga ----------
function makeRose(color, size) {
  const f = new THREE.Group();
  const layers = [ // dari tengah (menguncup) ke luar (terbuka)
    { n: 3, r: 0.004, tilt: 1.35, s: 0.50, z: 0.030, shade: -0.25 },
    { n: 4, r: 0.010, tilt: 1.20, s: 0.65, z: 0.026, shade: -0.18 },
    { n: 5, r: 0.018, tilt: 1.00, s: 0.80, z: 0.020, shade: -0.10 },
    { n: 6, r: 0.026, tilt: 0.75, s: 0.95, z: 0.013, shade: 0.0 },
    { n: 7, r: 0.034, tilt: 0.50, s: 1.05, z: 0.006, shade: 0.08 },
  ];
  layers.forEach((L, li) => {
    const c = new THREE.Color(color);
    if (L.shade < 0) c.lerp(new THREE.Color(0x9f3a5a), -L.shade);
    else c.lerp(new THREE.Color(0xffffff), L.shade);
    const m = stdMat(c, { side: THREE.DoubleSide });
    for (let i = 0; i < L.n; i++) {
      const a = (i / L.n) * Math.PI * 2 + li * 0.7;
      addPetal(f, m, a, L.r, L.tilt, 0.024 * L.s, 0.03 * L.s, 0.008 * L.s, L.z);
    }
  });
  f.scale.setScalar(size);
  return f;
}

function makeDaisy(color, size) {
  const f = new THREE.Group();
  const m = stdMat(color, { side: THREE.DoubleSide });
  const n = 16;
  for (let i = 0; i < n; i++) {
    addPetal(f, m, (i / n) * Math.PI * 2, 0.012, 0.15 + (i % 2) * 0.1,
      0.007, 0.03, 0.003, 0.004 + (i % 2) * 0.002);
  }
  const center = new THREE.Mesh(dotGeo, stdMat(0xf59e0b, { roughness: 0.4, metalness: 0.3 }));
  center.scale.set(0.016, 0.016, 0.008);
  center.position.z = 0.012;
  f.add(center);
  f.scale.setScalar(size);
  return f;
}

function makeBlossom(color, size) {
  const f = new THREE.Group();
  const m = stdMat(color, { side: THREE.DoubleSide });
  for (let i = 0; i < 5; i++) {
    addPetal(f, m, (i / 5) * Math.PI * 2, 0.008, 0.3, 0.022, 0.024, 0.006, 0.006);
  }
  const center = new THREE.Mesh(dotGeo, stdMat(0xfacc15, { roughness: 0.4 }));
  center.scale.set(0.009, 0.009, 0.006);
  center.position.z = 0.012;
  f.add(center);
  const stamenMat = stdMat(0xfbbf24);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const s = new THREE.Mesh(dotGeo, stamenMat);
    s.scale.setScalar(0.003);
    s.position.set(Math.cos(a) * 0.014, Math.sin(a) * 0.014, 0.022);
    f.add(s);
  }
  f.scale.setScalar(size);
  return f;
}

function makeBaby(seed) { // gerombol baby's breath
  const g = new THREE.Group();
  const m = stdMat(0xffffff, { roughness: 0.5 });
  for (let k = 0; k < 7; k++) {
    const d = new THREE.Mesh(dotGeo, m);
    d.scale.setScalar(0.005 + 0.004 * rnd(seed + k * 3));
    d.position.set((rnd(seed + k) - 0.5) * 0.05, (rnd(seed + k * 7) - 0.5) * 0.05, rnd(seed + k * 5) * 0.03);
    g.add(d);
  }
  return g;
}

// ---------- Rangkaian ----------
function buildAccessory() {
  const g = new THREE.Group();

  // Penutup kepala (tidak terlihat, hanya menyembunyikan yang di belakangnya)
  if (USE_OCCLUDER) {
    const occ = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 24),
      new THREE.MeshBasicMaterial({ colorWrite: false })
    );
    occ.scale.set(HEAD_RADIUS.x, HEAD_RADIUS.y, HEAD_RADIUS.z);
    occ.position.set(0, HEAD_CENTER_Y, HEAD_CENTER_Z);
    occ.renderOrder = -1;
    g.add(occ);
  }

  // Batang hijau mengikuti busur
  const pts = [];
  for (let i = 0; i <= 60; i++) pts.push(ringPoint(i / 60));
  g.add(new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.01, 8, false),
    stdMat(VINE_COLOR, { roughness: 0.8, emissiveIntensity: 0.05 })
  ));

  const leafMats = LEAF_COLORS.map((c) => stdMat(c, { side: THREE.DoubleSide, roughness: 0.7 }));
  const eucaMat = stdMat(EUCA_COLOR, { side: THREE.DoubleSide, roughness: 0.7 });

  const n = FLOWER_COUNT;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const size = 1.25 - 0.7 * Math.abs(2 * t - 1); // terbesar di dahi, mengecil ke belakang
    const kind = i % 3; // 0 mawar, 1 daisy, 2 bunga sakura
    let fl;
    if (kind === 0) fl = makeRose(ROSE_COLORS[(i / 3 | 0) % ROSE_COLORS.length], size);
    else if (kind === 1) fl = makeDaisy(DAISY_COLORS[(i / 3 | 0) % DAISY_COLORS.length], size);
    else fl = makeBlossom(BLOSSOM_COLORS[(i / 3 | 0) % BLOSSOM_COLORS.length], size);
    const p = ringPoint(t);
    fl.position.copy(p);
    fl.quaternion.setFromUnitVectors(AXIS_Z, outward(p));
    g.add(fl);

    if (i < n - 1) {
      const tm = (i + 1) / n;
      const pm = ringPoint(tm);
      const tg = tangent(tm);
      const nrm = outward(pm);

      for (const side of [-1, 1]) {
        // daun lancip tumbuh dari batang, searah busur
        const pivot = new THREE.Group();
        pivot.position.copy(pm);
        const dir = tg.clone().multiplyScalar(side * 0.9).add(nrm.clone().multiplyScalar(0.45)).normalize();
        pivot.quaternion.setFromUnitVectors(AXIS_Y, dir);
        const leaf = new THREE.Mesh(leafGeo, leafMats[(i + (side > 0 ? 1 : 0)) % leafMats.length]);
        leaf.scale.setScalar(0.8 + 0.5 * rnd(i * 4 + side + 2));
        leaf.rotation.y = side * 0.5;
        pivot.add(leaf);
        g.add(pivot);

        // daun eukaliptus bulat kecil
        const euca = new THREE.Mesh(eucaGeo, eucaMat);
        euca.position.copy(pm).add(tg.clone().multiplyScalar(side * 0.03)).add(nrm.clone().multiplyScalar(0.022));
        euca.quaternion.setFromUnitVectors(AXIS_Z, nrm);
        g.add(euca);
      }

      // baby's breath di sela bunga
      const baby = makeBaby(i * 11 + 3);
      baby.position.copy(pm).add(nrm.clone().multiplyScalar(0.035));
      baby.quaternion.setFromUnitVectors(AXIS_Z, nrm);
      g.add(baby);
    }
  }

  g.rotation.x = ACC_TILT;
  g.scale.setScalar(ACC_SCALE);
  g.position.set(ACC_OFFSET.x, ACC_OFFSET.y, ACC_OFFSET.z);
  return g;
}

async function start() {
  const mindarThree = new MindARThree({ container: document.getElementById('container') });
  const { renderer, scene, camera } = mindarThree;

  const anchor = mindarThree.addAnchor(ANCHOR_INDEX);
  anchor.group.add(buildAccessory());

  scene.add(new THREE.HemisphereLight(0xffffff, 0x667788, 1.4));
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(0, 1, 2);
  scene.add(dir);

  await mindarThree.start();
  setStatus('Mencari wajah', 'searching');

  let hadFace = false, lostCount = 0;
  renderer.setAnimationLoop(() => {
    const hasFace = mindarThree.getLatestEstimate() !== null;
    if (hasFace !== hadFace) {
      hadFace = hasFace;
      if (hasFace) setStatus('Wajah terdeteksi', 'found');
      else { lostCount++; setStatus('Wajah tidak terdeteksi - mencari wajah', 'searching'); }
      document.getElementById('info').textContent = 'Wajah hilang ' + lostCount + ' kali.';
    }
    renderer.render(scene, camera);
  });
}

setupStartButton(start);