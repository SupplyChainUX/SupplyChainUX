import * as THREE from 'three';
import gsap from 'gsap';
import { createTruck }  from './createTruck.js';
import { createSphere } from './createSphere.js';
import { createFloatingShapes, updateShapes } from './createShapes.js';
import {
  createForegroundShapes,
  showForegroundShape,
  hideForegroundShape,
  updateForegroundShapes,
} from './createForegroundShapes.js';
import { state } from './state.js';

// ── Constants ──────────────────────────────────────────────────
const SPHERE_RADIUS    = 9;
const SPHERE_CENTER_Y  = -6.5;
const TRUCK_Y          = SPHERE_CENTER_Y + SPHERE_RADIUS; // 2.5

const IDLE_BOB_AMP     = 0.03;
const IDLE_BOB_SPEED   = 1.4;
const DRIVE_BOB_AMP    = 0.055;
const DRIVE_BOB_SPEED  = 8.5;
const DRIVE_SWAY_AMP   = 0.018;
const DRIVE_SWAY_SPEED = 13.0;
const WHEEL_IDLE_SPEED = 0.005;
const WHEEL_DRIVE_SPEED= 0.22;
const SPHERE_IDLE_SPEED= 0.0015;
const SPHERE_DRIVE_SPEED=0.025;

// Tween duration (seconds) for truck emissive glow
const GLOW_IN_DUR  = 0.35;
const GLOW_OUT_DUR = 0.55;

export function initScene() {
  const canvas = document.getElementById('three-canvas');

  // ── Renderer ──────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // ── Scene ─────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1A2535);
  scene.fog = new THREE.FogExp2(0x141E2C, 0.017);

  // ── Camera ────────────────────────────────────────────────────
  const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 4.5, 15);
  camera.lookAt(0, 1.5, 0);

  // ── Lighting ──────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0x3A5570, 0.85));

  const keyLight = new THREE.DirectionalLight(0xE0F2FF, 2.2);
  keyLight.position.set(5, 10, 6);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x1FCFB4, 0.55);
  fillLight.position.set(-6, 4, -3);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x18CEFE, 0.4);
  rimLight.position.set(0, -3, -8);
  scene.add(rimLight);

  // Truck hover glow point light (invisible until hover)
  const truckGlowLight = new THREE.PointLight(0x1FCFB4, 0, 4);
  scene.add(truckGlowLight);

  // ── Stars ─────────────────────────────────────────────────────
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
    color: 0x4A7090, size: 0.06, transparent: true, opacity: 0.6, sizeAttenuation: true,
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // ── Sphere ────────────────────────────────────────────────────
  const { group: sphereGroup, wireMat, hubs } = createSphere();
  sphereGroup.position.y = SPHERE_CENTER_Y;
  scene.add(sphereGroup);

  // ── Truck ─────────────────────────────────────────────────────
  const { group: truckGroup, wheels, emissiveMeshes, emissiveMats, hoverMeshes: truckHoverMeshes } = createTruck();
  truckGroup.position.set(0.3, TRUCK_Y, 0);
  truckGroup.rotation.y = -0.35;
  scene.add(truckGroup);

  // ── Background Floating Shapes ────────────────────────────────
  const floatingShapes = createFloatingShapes(scene);

  // ── Foreground Section Shapes ─────────────────────────────────
  const { shapes: fgShapes, hoverMeshes: fgHoverMeshes } = createForegroundShapes(scene);
  // Show the first section's shape immediately
  showForegroundShape(fgShapes[0]);

  // ── Raycasting setup ──────────────────────────────────────────
  const raycaster  = new THREE.Raycaster();
  const mouse      = new THREE.Vector2(-999, -999); // start off-screen
  let truckHovered = false;
  let truckGlowTween = null;

  // Hub hover state
  let hoveredHub = null;
  const hubTooltip = document.getElementById('hub-tooltip');

  // Background shape hover
  let hoveredBgShape = null;

  // Foreground shape hover
  let hoveredFgShape = null;

  function onMouseMove(e) {
    mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  function onTouchMove(e) {
    if (e.touches.length > 0) {
      mouse.x =  (e.touches[0].clientX / window.innerWidth)  * 2 - 1;
      mouse.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
    }
  }

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('touchmove', onTouchMove, { passive: true });

  // ── Hub snap (called by scrollManager via state) ──────────────
  // The hub for section[i] should snap to the "top" of the sphere (where truck sits).
  // The truck is at the top (+Y direction). Each hub sits on the equator at angle hub.angle.
  // Rotating sphereGroup.rotation.y by -hub.angle puts that hub on the +Z axis (front);
  // we actually want the hub at the TOP (+Y). Since hubs start on equator (y=0),
  // we cannot rotate them to +Y with just Y rotation.
  //
  // Solution: each hub is placed on the sphere surface at latitude 0 (equator),
  // and we tilt the sphere group on X to raise the hub to the top.
  // A simpler approach: hubs are on the equator; the truck IS on the equator facing us.
  // So "snapping a hub to the truck position" = rotating sphere so hub faces +Z (toward camera).
  //
  // We rotate sphereGroup.rotation.y to -hub.angle so the hub appears at front (Z+).
  // The truck is at the top of the sphere (+Y). We can't change sphere tilt per section
  // without disrupting the truck. So instead, hubs are placed slightly tilted toward
  // the viewer (latitude ~15° above equator) and we spin sphere on Y to bring the hub
  // to face the camera, which is roughly where the truck is visible from above.

  let lastSnapSection = -1;
  let hubSnapTween = null;

  function snapToHub(sectionIndex) {
    if (sectionIndex === lastSnapSection) return;
    lastSnapSection = sectionIndex;

    const hub = hubs[sectionIndex];
    if (!hub) return;

    // Target rotation: bring hub to face camera (+Z)
    // We want sphereGroup.rotation.y = -hub.angle (modulo 2π)
    const currentY = sphereGroup.rotation.y;
    let targetY = -hub.angle;

    // Find shortest rotation path
    let delta = ((targetY - currentY) % (Math.PI * 2));
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;

    if (hubSnapTween) hubSnapTween.kill();
    hubSnapTween = gsap.to(sphereGroup.rotation, {
      y: currentY + delta,
      duration: 1.1,
      ease: 'power2.inOut',
    });
  }

  // ── Resize ────────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });

  // ── Expose snap function to scrollManager ─────────────────────
  // scrollManager will call window.__snapToHub(index) when navigating
  window.__snapToHub = snapToHub;
  window.__showFgShape = (idx) => showForegroundShape(fgShapes[idx]);
  window.__hideFgShape = (idx) => hideForegroundShape(fgShapes[idx]);

  // ── Animation state ───────────────────────────────────────────
  const clock     = new THREE.Clock();
  let wheelAngle  = 0;

  // ── Render loop ───────────────────────────────────────────────
  function animate() {
    requestAnimationFrame(animate);

    const t  = clock.getElapsedTime();
    const dp = state.drivingProgress;

    // ── Raycasting ────────────────────────────────────────────
    raycaster.setFromCamera(mouse, camera);

    // --- Truck hover ---
    const truckIntersects = raycaster.intersectObjects(truckHoverMeshes, false);
    const isOverTruck     = truckIntersects.length > 0;

    if (isOverTruck && !truckHovered) {
      truckHovered = true;
      canvas.style.cursor = 'pointer';
      if (truckGlowTween) truckGlowTween.kill();
      const targets = { intensity: 0 };
      truckGlowTween = gsap.to(targets, {
        intensity: 1,
        duration: GLOW_IN_DUR,
        ease: 'power2.out',
        onUpdate: () => {
          emissiveMats.forEach(m => { m.emissiveIntensity = targets.intensity * 0.9; });
          truckGlowLight.intensity = targets.intensity * 3.5;
          truckGlowLight.position.copy(truckGroup.position);
        },
      });
    } else if (!isOverTruck && truckHovered) {
      truckHovered = false;
      canvas.style.cursor = '';
      if (truckGlowTween) truckGlowTween.kill();
      const targets = { intensity: emissiveMats[0].emissiveIntensity };
      truckGlowTween = gsap.to(targets, {
        intensity: 0,
        duration: GLOW_OUT_DUR,
        ease: 'power2.in',
        onUpdate: () => {
          emissiveMats.forEach(m => { m.emissiveIntensity = targets.intensity; });
          truckGlowLight.intensity = targets.intensity * 3.5;
        },
      });
    }

    // --- Hub hover ---
    const hubMeshPool = [];
    hubs.forEach(h => h.meshes.forEach(m => hubMeshPool.push(m)));
    const hubIntersects = raycaster.intersectObjects(hubMeshPool, false);

    if (hubIntersects.length > 0) {
      // Find which hub this mesh belongs to
      const hitMesh = hubIntersects[0].object;
      const hitHub  = hubs.find(h => h.meshes.includes(hitMesh));
      if (hitHub && hitHub !== hoveredHub) {
        if (hoveredHub) {
          gsap.to({ v: hoveredHub.glowMat.emissiveIntensity }, {
            v: 0.18, duration: 0.3,
            onUpdate() { hoveredHub.glowMat.emissiveIntensity = this.targets()[0].v; },
          });
        }
        hoveredHub = hitHub;
        gsap.to({ v: hoveredHub.glowMat.emissiveIntensity }, {
          v: 1.0, duration: 0.25,
          onUpdate() { hoveredHub.glowMat.emissiveIntensity = this.targets()[0].v; },
        });
        if (hubTooltip) {
          hubTooltip.textContent = hitHub.label;
          hubTooltip.classList.add('visible');
        }
        canvas.style.cursor = 'pointer';
      }
      // Move tooltip with cursor
      if (hubTooltip) {
        const ex = (mouse.x *  0.5 + 0.5) * window.innerWidth;
        const ey = (mouse.y * -0.5 + 0.5) * window.innerHeight;
        hubTooltip.style.left = `${ex}px`;
        hubTooltip.style.top  = `${ey}px`;
      }
    } else if (hoveredHub) {
      gsap.to({ v: hoveredHub.glowMat.emissiveIntensity }, {
        v: 0.18, duration: 0.35,
        onUpdate() { hoveredHub.glowMat.emissiveIntensity = this.targets()[0].v; },
      });
      hoveredHub = null;
      if (hubTooltip) hubTooltip.classList.remove('visible');
      if (!isOverTruck) canvas.style.cursor = '';
    }

    // --- Background shape hover ---
    const bgMeshes = floatingShapes.map(s => s.mesh);
    const bgIntersects = raycaster.intersectObjects(bgMeshes, false);

    if (bgIntersects.length > 0) {
      const hitShape = floatingShapes.find(s => s.mesh === bgIntersects[0].object);
      if (hitShape && hitShape !== hoveredBgShape) {
        if (hoveredBgShape && hoveredBgShape.mat.emissiveIntensity !== undefined) {
          gsap.to(hoveredBgShape.mat, { emissiveIntensity: hoveredBgShape.baseEmissiveIntensity, duration: 0.4 });
          if (hoveredBgShape.mat.opacity !== undefined) {
            gsap.to(hoveredBgShape.mat, { opacity: hoveredBgShape.mat.opacity, duration: 0.3 });
          }
        }
        hoveredBgShape = hitShape;
        if (hitShape.mat.emissiveIntensity !== undefined) {
          gsap.to(hitShape.mat, { emissiveIntensity: 0.65, duration: 0.25 });
        }
      }
    } else if (hoveredBgShape) {
      if (hoveredBgShape.mat.emissiveIntensity !== undefined) {
        gsap.to(hoveredBgShape.mat, { emissiveIntensity: hoveredBgShape.baseEmissiveIntensity, duration: 0.4 });
      }
      hoveredBgShape = null;
    }

    // --- Foreground shape hover ---
    const fgMeshesActive = fgHoverMeshes.filter(m => {
      // Only raycast against shapes that are currently on-screen (x < OFF_X - 2)
      const worldPos = new THREE.Vector3();
      m.getWorldPosition(worldPos);
      return worldPos.x < 20;
    });
    const fgIntersects = raycaster.intersectObjects(fgMeshesActive, false);

    if (fgIntersects.length > 0) {
      const hitMesh = fgIntersects[0].object;
      if (hitMesh !== hoveredFgShape) {
        if (hoveredFgShape && hoveredFgShape.material) {
          gsap.to(hoveredFgShape.material, { emissiveIntensity: 0.12, duration: 0.4 });
        }
        hoveredFgShape = hitMesh;
        if (hitMesh.material && hitMesh.material.emissive) {
          gsap.to(hitMesh.material, { emissiveIntensity: 0.7, duration: 0.25 });
        }
      }
    } else if (hoveredFgShape) {
      if (hoveredFgShape.material && hoveredFgShape.material.emissive) {
        gsap.to(hoveredFgShape.material, { emissiveIntensity: 0.12, duration: 0.4 });
      }
      hoveredFgShape = null;
    }

    // ── Truck animations ──────────────────────────────────────
    const bobAmp   = IDLE_BOB_AMP   + (DRIVE_BOB_AMP   - IDLE_BOB_AMP)   * dp;
    const bobSpeed = IDLE_BOB_SPEED + (DRIVE_BOB_SPEED  - IDLE_BOB_SPEED) * dp;
    truckGroup.position.y = TRUCK_Y + Math.sin(t * bobSpeed) * bobAmp;

    const swayAmt = Math.sin(t * DRIVE_SWAY_SPEED) * DRIVE_SWAY_AMP * dp;
    truckGroup.rotation.z = swayAmt * 0.5;
    truckGroup.rotation.x = swayAmt * 0.2;

    const wheelSpeed = WHEEL_IDLE_SPEED + (WHEEL_DRIVE_SPEED - WHEEL_IDLE_SPEED) * dp;
    wheelAngle -= wheelSpeed;
    wheels.forEach(wg => { wg.rotation.z = wheelAngle; });

    // Keep glow light on truck
    truckGlowLight.position.copy(truckGroup.position);

    // ── Sphere rotation ───────────────────────────────────────
    // Counter-clockwise on scroll-down (dir +1), clockwise on scroll-up (dir -1)
    // counter-clockwise = negative Y rotation increment
    const sphereSpeed = SPHERE_IDLE_SPEED + (SPHERE_DRIVE_SPEED - SPHERE_IDLE_SPEED) * dp;
    sphereGroup.rotation.y -= sphereSpeed * state.drivingDirection;

    // Very subtle breathe tilt (idle only)
    sphereGroup.rotation.z = Math.sin(t * 0.2) * 0.015 * (1 - dp);

    // ── Wireframe pulse ───────────────────────────────────────
    wireMat.opacity = 0.42 + Math.sin(t * 0.5) * 0.08 + dp * 0.14;

    // ── Stars ─────────────────────────────────────────────────
    stars.rotation.y = t * 0.003;

    // ── Background shapes ─────────────────────────────────────
    updateShapes(floatingShapes, t, dp);

    // ── Foreground shapes ─────────────────────────────────────
    updateForegroundShapes(fgShapes, t, state.currentSection);

    renderer.render(scene, camera);
  }

  animate();

  return { renderer, scene, camera };
}
