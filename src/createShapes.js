import * as THREE from 'three';

/**
 * Creates a collection of floating teal geometric shapes scattered in the scene.
 * Returns an array of shape objects with position, rotation speed, and drift data.
 */
export function createFloatingShapes(scene) {
  const shapes = [];

  const TEAL       = 0x2BC8C8;
  const TEAL_DARK  = 0x1E9999;
  const TEAL_FAINT = 0x1A3D4A;

  const matSolid = new THREE.MeshStandardMaterial({
    color: TEAL,
    roughness: 0.4,
    metalness: 0.3,
    transparent: true,
    opacity: 0.55,
  });

  const matWire = new THREE.MeshBasicMaterial({
    color: TEAL_DARK,
    wireframe: true,
    transparent: true,
    opacity: 0.45,
  });

  const matFaint = new THREE.MeshBasicMaterial({
    color: TEAL_FAINT,
    wireframe: true,
    transparent: true,
    opacity: 0.35,
  });

  // Distribute shapes in two zones:
  // Near zone (foreground / mid-ground): z = 2 → 6
  // Far zone (behind sphere): z = -6 → -2

  const definitions = [
    // Foreground right — visible behind right side of panels
    { geo: new THREE.OctahedronGeometry(0.22), mat: matSolid,  pos: [ 4.5,  1.2,  3.5], rxs: 0.008, rys: 0.011, rzs: 0.005 },
    { geo: new THREE.BoxGeometry(0.3, 0.3, 0.3), mat: matWire, pos: [ 3.0,  3.5,  4.0], rxs: 0.012, rys: 0.007, rzs: 0.009 },
    { geo: new THREE.TetrahedronGeometry(0.25),  mat: matSolid, pos: [ 5.5, -0.5,  2.5], rxs: 0.005, rys: 0.013, rzs: 0.008 },
    { geo: new THREE.OctahedronGeometry(0.15),  mat: matWire,  pos: [ 2.0,  4.5,  3.0], rxs: 0.009, rys: 0.006, rzs: 0.014 },
    { geo: new THREE.BoxGeometry(0.18, 0.18, 0.18), mat: matSolid, pos: [5.8, 2.8, 1.5], rxs: 0.014, rys: 0.009, rzs: 0.006 },

    // Foreground left
    { geo: new THREE.TetrahedronGeometry(0.2),  mat: matWire,  pos: [-4.0,  2.0,  4.0], rxs: 0.007, rys: 0.012, rzs: 0.010 },
    { geo: new THREE.OctahedronGeometry(0.28),  mat: matFaint, pos: [-5.5,  0.5,  3.0], rxs: 0.011, rys: 0.008, rzs: 0.007 },
    { geo: new THREE.BoxGeometry(0.22, 0.22, 0.22), mat: matWire, pos: [-3.2, 3.8, 2.5], rxs: 0.006, rys: 0.015, rzs: 0.009 },
    { geo: new THREE.TetrahedronGeometry(0.18),  mat: matSolid, pos: [-2.5, -1.5, 4.5], rxs: 0.010, rys: 0.007, rzs: 0.013 },

    // Mid-right upper
    { geo: new THREE.OctahedronGeometry(0.35),  mat: matFaint, pos: [ 6.5,  4.5,  0.5], rxs: 0.004, rys: 0.010, rzs: 0.008 },
    { geo: new THREE.BoxGeometry(0.28, 0.28, 0.28), mat: matFaint, pos: [7.0, 1.5, -1.0], rxs: 0.008, rys: 0.005, rzs: 0.012 },

    // Left side middle
    { geo: new THREE.OctahedronGeometry(0.2),  mat: matFaint, pos: [-6.5,  2.5,  1.0], rxs: 0.009, rys: 0.011, rzs: 0.006 },
    { geo: new THREE.TetrahedronGeometry(0.3),  mat: matFaint, pos: [-7.0, -1.0,  0.0], rxs: 0.006, rys: 0.009, rzs: 0.013 },

    // Above / scattered high
    { geo: new THREE.OctahedronGeometry(0.18),  mat: matWire,  pos: [ 1.0,  6.5,  2.0], rxs: 0.013, rys: 0.007, rzs: 0.009 },
    { geo: new THREE.BoxGeometry(0.2, 0.2, 0.2), mat: matFaint, pos: [-1.5, 6.0, 1.5],  rxs: 0.007, rys: 0.013, rzs: 0.005 },
  ];

  definitions.forEach(({ geo, mat, pos, rxs, rys, rzs }) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);

    // Random initial rotation
    mesh.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    scene.add(mesh);

    // Drift — slow sinusoidal float
    const driftPhase = Math.random() * Math.PI * 2;
    const driftAmp   = 0.15 + Math.random() * 0.2;
    const driftSpeed = 0.4 + Math.random() * 0.5;

    shapes.push({
      mesh,
      rxs, rys, rzs,
      originY: pos[1],
      driftPhase,
      driftAmp,
      driftSpeed,
    });
  });

  return shapes;
}

/**
 * Update floating shapes in the animation loop.
 * @param {Array} shapes - from createFloatingShapes()
 * @param {number} t     - elapsed time in seconds
 * @param {number} drivingProgress - 0–1 from state
 */
export function updateShapes(shapes, t, drivingProgress) {
  const boostRot = 1 + drivingProgress * 1.5;

  shapes.forEach(s => {
    s.mesh.rotation.x += s.rxs * boostRot;
    s.mesh.rotation.y += s.rys * boostRot;
    s.mesh.rotation.z += s.rzs * boostRot;

    // Gentle vertical drift (bobbing)
    s.mesh.position.y = s.originY + Math.sin(t * s.driftSpeed + s.driftPhase) * s.driftAmp;
  });
}
