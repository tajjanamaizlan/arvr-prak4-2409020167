// src/image-demo.js - Demonstrasi 1: image tracking (MindAR + Three.js)
import * as THREE from 'three';
import { MindARThree } from '../vendor/mindar/mindar-image-three.prod.js';
import { setStatus, setupStartButton } from './common.js';

const TARGET_SRC = './targets/target-messi.mind'; // hasil kompilasi target-card.png
const TARGET_ASPECT = 736 / 1281; // tinggi/lebar gambar target (734x413 px)
let foundCount = 0;

async function start() {
  const mindarThree = new MindARThree({
    container: document.getElementById('container'),
    imageTargetSrc: TARGET_SRC,
  });
  const { renderer, scene, camera } = mindarThree;

  // Anchor 0 = target pertama di file .mind. Lebar target = 1 satuan, pusat target = (0,0,0).
  const anchor = mindarThree.addAnchor(0);

  // Bingkai tipis seukuran target: membantu menilai kecocokan posisi dan skala.
  const frame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, TARGET_ASPECT)),
    new THREE.LineBasicMaterial({ color: 0x14b8a6 })
  );
  anchor.group.add(frame);

  // Objek 3D utama: torus knot melayang di atas permukaan target (sumbu z+ keluar dari gambar).
  const knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.12, 0.04, 100, 16),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4, metalness: 0.2 })
  );
  knot.position.set(0, 0, 0.2);
  anchor.group.add(knot);

  // Cahaya (MeshStandardMaterial butuh cahaya agar terlihat).
  scene.add(new THREE.HemisphereLight(0xffffff, 0x667788, 1.2));
  const dir = new THREE.DirectionalLight(0xffffff, 1.5);
  dir.position.set(0.5, 1, 1);
  scene.add(dir);

  // Event siklus hidup target.
  anchor.onTargetFound = () => {
    foundCount++;
    setStatus('Target terdeteksi', 'found');
    document.getElementById('info').textContent = 'Target ditemukan ' + foundCount + ' kali.';
  };
  anchor.onTargetLost = () => {
    setStatus('Target hilang - mencari target', 'searching');
  };

  await mindarThree.start(); // minta kamera, muat .mind, mulai tracking
  setStatus('Mencari target', 'searching');

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    knot.rotation.y += clock.getDelta() * 1.5;
    renderer.render(scene, camera);
  });
}

setupStartButton(start);