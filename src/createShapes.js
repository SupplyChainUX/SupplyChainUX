import * as THREE from 'three';

// Brand colors
const CYAN       = 0x18CEFE;
const TURQUOISE  = 0x1FCFB4;
const NAVY       = 0x31465D;
const NAVY_DARK  = 0x1A2535;

/**
 * Creates background floating geometric shapes scattered in the scene.
 * Returns an array of shape objects. Shapes glow on hover (managed by scene.js raycasting).
 */
export function createFloatingShapes(scene) {
  const shapes = [];

  const matSolid = new THREE.MeshStandardMaterial({
    color: CYAN,
    roughness: 0.45,
    metalness: 0.2,
    transparent: true,
    opacity: 0.5,
    emissive: new THREE.Color(CYAN),
    emissiveIntensity: 0.05,
  });

  const matTurq = new THREE.MeshStandardMaterial({
    color: TURQUOISE,
    roughness: 0.5,
    metalness: 0.15,
    transparent: true,
    opacity: 0.45,
    emissive: new THREE.Color(TURQUOISE),
    emissiveIntensity: 0.05,
  });

  const matWire = new THREE.MeshBasicMaterial({
    color: CYAN,
    wireframe: true,
    transparent: true,
    opacity: 0.4,
  });

  const matFaint = new THREE.MeshBasicMaterial({
    color: NAVY,
    wireframe: true,
    transparent: true,
    opacity: 0.3,
  });

  const matNavyFaint = new THREE.MeshStandardMaterial({
    color: NAVY,
    roughness: 0.8,
    transparent: true,
    opacity: 0.4,
    emissive: new THREE.Color(TURQUOISE),
    emissiveIntensity: 0.04,
  });

  const definitions = [
    // Foreground right
    { geo: new THREE.OctahedronGeometry(0.22),          mat: matSolid,    pos: [ 4.5,  1.2,  3.5], rxs: 0.008, rys: 0.011, rzs: 0.005 },
    { geo: new THREE.BoxGeometry(0.3, 0.3, 0.3),        mat: matWire,     pos: [ 3.0,  3.5,  4.0], rxs: 0.012, rys: 0.007, rzs: 0.009 },
    { geo: new THREE.TetrahedronGeometry(0.25),          mat: matTurq,     pos: [ 5.5, -0.5,  2.5], rxs: 0.005, rys: 0.013, rzs: 0.008 },
    { geo: new THREE.OctahedronGeometry(0.15),           mat: matWire,     pos: [ 2.0,  4.5,  3.0], rxs: 0.009, rys: 0.006, rzs: 0.014 },
    { geo: new THREE.BoxGeometry(0.18, 0.18, 0.18),     mat: matSolid,    pos: [ 5.8,  2.8,  1.5], rxs: 0.014, rys: 0.009, rzs: 0.006 },

    // Foreground left
    { geo: new THREE.TetrahedronGeometry(0.2),           mat: matWire,     pos: [-4.0,  2.0,  4.0], rxs: 0.007, rys: 0.012, rzs: 0.010 },
    { geo: new THREE.OctahedronGeometry(0.28),           mat: matFaint,    pos: [-5.5,  0.5,  3.0], rxs: 0.011, rys: 0.008, rzs: 0.007 },
    { geo: new THREE.BoxGeometry(0.22, 0.22, 0.22),      mat: matWire,     pos: [-3.2,  3.8,  2.5], rxs: 0.006, rys: 0.015, rzs: 0.009 },
    { geo: new THREE.TetrahedronGeometry(0.18),          mat: matTurq,     pos: [-2.5, -1.5,  4.5], rxs: 0.010, rys: 0.007, rzs: 0.013 },

    // Mid-right / upper
    { geo: new THREE.OctahedronGeometry(0.35),           mat: matFaint,    pos: [ 6.5,  4.5,  0.5], rxs: 0.004, rys: 0.010, rzs: 0.008 },
    { geo: new THREE.BoxGeometry(0.28, 0.28, 0.28),      mat: matNavyFaint,pos: [ 7.0,  1.5, -1.0], rxs: 0.008, rys: 0.005, rzs: 0.012 },

    // Left side middle
    { geo: new THREE.OctahedronGeometry(0.2),            mat: matFaint,    pos: [-6.5,  2.5,  1.0], rxs: 0.009, rys: 0.011, rzs: 0.006 },
    { geo: new THREE.TetrahedronGeometry(0.3),           mat: matNavyFaint,pos: [-7.0, -1.0,  0.0], rxs: 0.006, rys: 0.009, rzs: 0.013 },

    // Scattered high
    { geo: new THREE.OctahedronGeometry(0.18),           mat: matWire,     pos: [ 1.0,  6.5,  2.0], rxs: 0.013, rys: 0.007, rzs: 0.009 },
    { geo: new THREE.BoxGeometry(0.2, 0.2, 0.2),         mat: matFaint,    pos: [-1.5,  6.0,  1.5], rxs: 0.007, rys: 0.013, rzs: 0.005 },
  ];

  definitions.forEach(({ geo, mat, pos, rxs, rys, rzs }) => {
    // Clone material so each shape can glow independently
    const m = mat.clone();
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(...pos);
    mesh.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
    );
    scene.add(mesh);

    const driftPhase  = Math.random() * Math.PI * 2;
    const driftAmp    = 0.14 + Math.random() * 0.2;
    const driftSpeed  = 0.4  + Math.random() * 0.5;

    // Store base emissive so we can restore after hover
    const baseEmissiveIntensity = m.emissiveIntensity || 0;

    shapes.push({
      mesh,
      mat: m,
      rxs, rys, rzs,
      originY: pos[1],
      driftPhase,
      driftAmp,
      driftSpeed,
      baseEmissiveIntensity,
    });
  });

  return shapes;
}

/**
 * Update floating shapes in the animation loop.
 */
export function updateShapes(shapes, t, drivingProgress) {
  const boostRot = 1 + drivingProgress * 1.5;

  shapes.forEach(s => {
    s.mesh.rotation.x += s.rxs * boostRot;
    s.mesh.rotation.y += s.rys * boostRot;
    s.mesh.rotation.z += s.rzs * boostRot;
    s.mesh.position.y  = s.originY + Math.sin(t * s.driftSpeed + s.driftPhase) * s.driftAmp;
  });
}
