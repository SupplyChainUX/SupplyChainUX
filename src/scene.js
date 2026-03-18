import * as THREE from 'three';
import { createTruck } from './createTruck.js';
import { createSphere } from './createSphere.js';
import { createFloatingShapes, updateShapes } from './createShapes.js';
import { state } from './state.js';

// ── Constants ─────────────────────────────────────────────────
const SPHERE_RADIUS      = 9;
const SPHERE_CENTER_Y    = -6.5;   // top of sphere = SPHERE_CENTER_Y + SPHERE_RADIUS = 2.5
const TRUCK_Y            = SPHERE_CENTER_Y + SPHERE_RADIUS; // 2.5

// Animation params
const IDLE_BOB_AMP       = 0.03;
const IDLE_BOB_SPEED     = 1.4;
const DRIVE_BOB_AMP      = 0.055;
const DRIVE_BOB_SPEED    = 8.5;
const DRIVE_SWAY_AMP     = 0.018;
const DRIVE_SWAY_SPEED   = 13.0;
const WHEEL_IDLE_SPEED   = 0.005;  // very slow idle creep
const WHEEL_DRIVE_SPEED  = 0.22;
const SPHERE_IDLE_SPEED  = 0.0015;
const SPHERE_DRIVE_SPEED = 0.025;

export function initScene() {
  const canvas = document.getElementById('three-canvas');

  // ── Renderer ──────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // ── Scene ─────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1F3047);
  // Subtle atmospheric fog towards the horizon
  scene.fog = new THREE.FogExp2(0x1A2A3E, 0.018);

  // ── Camera ────────────────────────────────────────────────────
  const camera = new THREE.PerspectiveCamera(
    48,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(0, 4.5, 15);
  camera.lookAt(0, 1.5, 0);

  // ── Lighting ──────────────────────────────────────────────────
  // Ambient — warm blue base
  const ambient = new THREE.AmbientLight(0x3A5570, 0.9);
  scene.add(ambient);

  // Key light — cool white from upper-right
  const keyLight = new THREE.DirectionalLight(0xE0F2FF, 2.2);
  keyLight.position.set(5, 10, 6);
  scene.add(keyLight);

  // Fill light — teal tint from left
  const fillLight = new THREE.DirectionalLight(0x2BC8C8, 0.6);
  fillLight.position.set(-6, 4, -3);
  scene.add(fillLight);

  // Rim light — blue from behind
  const rimLight = new THREE.DirectionalLight(0x1050A0, 0.5);
  rimLight.position.set(0, -3, -8);
  scene.add(rimLight);

  // ── Background particle field (stars/nodes) ───────────────────
  const starGeo = new THREE.BufferGeometry();
  const starCount = 500;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 80;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 60 - 5;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0x4A7090,
    size: 0.06,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true,
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // ── Sphere ────────────────────────────────────────────────────
  const { group: sphereGroup, wireMat } = createSphere();
  sphereGroup.position.y = SPHERE_CENTER_Y;
  scene.add(sphereGroup);

  // ── Truck ─────────────────────────────────────────────────────
  const { group: truckGroup, wheels } = createTruck();

  // Position: on top of sphere, slightly right of center (so cab faces right toward empty space)
  truckGroup.position.set(0.3, TRUCK_Y, 0);

  // Rotate truck slightly toward the camera (right-hand 3/4 view)
  truckGroup.rotation.y = -0.35;

  scene.add(truckGroup);

  // ── Floating Shapes ───────────────────────────────────────────
  const floatingShapes = createFloatingShapes(scene);

  // ── Resize handler ────────────────────────────────────────────
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });

  // ── Animation state ───────────────────────────────────────────
  const clock = new THREE.Clock();
  let wheelAngle = 0;

  // ── Render loop ───────────────────────────────────────────────
  function animate() {
    requestAnimationFrame(animate);

    const t  = clock.getElapsedTime();
    const dp = state.drivingProgress; // 0–1

    // ── Truck idle bob (suspension simulation) ────────────────
    const bobAmp   = IDLE_BOB_AMP   + (DRIVE_BOB_AMP   - IDLE_BOB_AMP)   * dp;
    const bobSpeed = IDLE_BOB_SPEED + (DRIVE_BOB_SPEED  - IDLE_BOB_SPEED) * dp;
    truckGroup.position.y = TRUCK_Y + Math.sin(t * bobSpeed) * bobAmp;

    // ── Truck lateral sway while driving ──────────────────────
    const swayAmt = Math.sin(t * DRIVE_SWAY_SPEED) * DRIVE_SWAY_AMP * dp;
    truckGroup.rotation.z = swayAmt * 0.5;
    truckGroup.rotation.x = swayAmt * 0.2;

    // ── Wheel rotation ────────────────────────────────────────
    const wheelSpeed = WHEEL_IDLE_SPEED + (WHEEL_DRIVE_SPEED - WHEEL_IDLE_SPEED) * dp;
    wheelAngle -= wheelSpeed;
    wheels.forEach(wg => { wg.rotation.z = wheelAngle; });

    // ── Sphere rotation ───────────────────────────────────────
    // Rotates on Y axis for globe-spinning effect
    const sphereSpeed = SPHERE_IDLE_SPEED + (SPHERE_DRIVE_SPEED - SPHERE_IDLE_SPEED) * dp;
    sphereGroup.rotation.y += sphereSpeed * state.drivingDirection;

    // Very subtle sphere tilt breathe (idle)
    sphereGroup.rotation.z = Math.sin(t * 0.2) * 0.015;

    // ── Wireframe line opacity pulse ──────────────────────────
    wireMat.opacity = 0.45 + Math.sin(t * 0.5) * 0.08 + dp * 0.15;

    // ── Stars slow drift ──────────────────────────────────────
    stars.rotation.y = t * 0.003;

    // ── Floating shapes ───────────────────────────────────────
    updateShapes(floatingShapes, t, dp);

    renderer.render(scene, camera);
  }

  animate();

  return { renderer, scene, camera };
}
