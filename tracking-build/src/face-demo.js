// src/face-demo.js - Demonstrasi 2: face tracking (MindAR + Three.js)
import * as THREE from 'three';
import { MindARThree } from '../vendor/mindar/mindar-face-three.prod.js';
import { setStatus, setupStartButton } from './common.js';

// Konstanta yang boleh Anda ubah saat evaluasi posisi dan skala kacamata.
const ANCHOR_INDEX = 168; // titik landmark di antara kedua mata (dipakai pada contoh resmi MindAR)
const GLASSES_SCALE = 1.0;
const GLASSES_OFFSET = { x: 0, y: -0.05, z: 0.05 };

function buildGlasses() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4, metalness: 0.3 });
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x14b8a6, transparent: true, opacity: 0.35 });
  for (const sx of [-1, 1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 12, 32), mat);
    ring.position.x = sx * 0.21;
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.17, 32), lensMat);
    lens.position.x = sx * 0.21;
    const temple = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 8), mat);
    temple.rotation.x = Math.PI / 2; // gagang kacamata ke arah belakang (z-)
    temple.position.set(sx * 0.38, 0, -0.2);
    g.add(ring, lens, temple);
  }
  const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 8), mat);
  bridge.rotation.z = Math.PI / 2; // jembatan hidung
  g.add(bridge);
  g.scale.setScalar(GLASSES_SCALE);
  g.position.set(GLASSES_OFFSET.x, GLASSES_OFFSET.y, GLASSES_OFFSET.z);
  return g;
}

async function start() {
  const mindarThree = new MindARThree({ container: document.getElementById('container') });
  const { renderer, scene, camera } = mindarThree;

  const anchor = mindarThree.addAnchor(ANCHOR_INDEX);
  anchor.group.add(buildGlasses());

  scene.add(new THREE.HemisphereLight(0xffffff, 0x667788, 1.4));
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(0, 1, 2);
  scene.add(dir);

  await mindarThree.start(); // minta kamera depan, memuat model deteksi wajah
  setStatus('Mencari wajah', 'searching');

  let hadFace = false, lostCount = 0;
  renderer.setAnimationLoop(() => {
    // Anchor wajah tidak punya event found/lost; gunakan getLatestEstimate():
    // bernilai null jika tidak ada wajah pada frame terakhir.
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