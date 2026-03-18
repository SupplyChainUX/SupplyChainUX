import * as THREE from 'three';

/**
 * Builds a low-poly stylized freight truck matching the OC logo.
 * Returns { group, wheels, bodyMeshes } for animation.
 *
 * Truck faces +X direction (drives to the right).
 * Wheel bottoms sit at local y = 0, so position the group at sphere-top.
 */
export function createTruck() {
  const group = new THREE.Group();

  // ── Materials ────────────────────────────────────────────────
  const cargoMat = new THREE.MeshStandardMaterial({
    color: 0xECF2F8,
    roughness: 0.75,
    metalness: 0.05,
  });

  const cabMat = new THREE.MeshStandardMaterial({
    color: 0x2BC8C8,
    roughness: 0.55,
    metalness: 0.15,
  });

  const cabDarkMat = new THREE.MeshStandardMaterial({
    color: 0x1E9999,
    roughness: 0.6,
    metalness: 0.1,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xA8D8E8,
    roughness: 0.05,
    metalness: 0.2,
    transparent: true,
    opacity: 0.75,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x1A2E3F,
    roughness: 0.95,
    metalness: 0.0,
  });

  const hubMat = new THREE.MeshStandardMaterial({
    color: 0xCDD8E2,
    roughness: 0.4,
    metalness: 0.3,
  });

  const undercarriageMat = new THREE.MeshStandardMaterial({
    color: 0x1E2D3D,
    roughness: 0.9,
  });

  // ── Cargo Body ───────────────────────────────────────────────
  // Width 1.35, Height 0.78, Depth 0.58. Centered at rear.
  const cargoGeo = new THREE.BoxGeometry(1.35, 0.78, 0.58);
  const cargoMesh = new THREE.Mesh(cargoGeo, cargoMat);
  cargoMesh.position.set(-0.28, 0.59, 0);
  group.add(cargoMesh);

  // Cargo rear wall (slightly darker inset)
  const cargoRearGeo = new THREE.BoxGeometry(0.02, 0.72, 0.52);
  const cargoRearMesh = new THREE.Mesh(cargoRearGeo, undercarriageMat);
  cargoRearMesh.position.set(-0.96, 0.59, 0);
  group.add(cargoRearMesh);

  // ── Cab ──────────────────────────────────────────────────────
  const cabGeo = new THREE.BoxGeometry(0.52, 0.68, 0.58);
  const cabMesh = new THREE.Mesh(cabGeo, cabMat);
  cabMesh.position.set(0.62, 0.54, 0);
  group.add(cabMesh);

  // Cab roof visor
  const visorGeo = new THREE.BoxGeometry(0.46, 0.08, 0.54);
  const visorMesh = new THREE.Mesh(visorGeo, cabDarkMat);
  visorMesh.position.set(0.62, 0.92, 0);
  group.add(visorMesh);

  // Windshield (angled slightly with scale trick)
  const windshieldGeo = new THREE.BoxGeometry(0.04, 0.28, 0.42);
  const windshieldMesh = new THREE.Mesh(windshieldGeo, glassMat);
  windshieldMesh.position.set(0.89, 0.63, 0);
  windshieldMesh.rotation.z = 0.15; // slight lean
  group.add(windshieldMesh);

  // Front bumper
  const bumperGeo = new THREE.BoxGeometry(0.08, 0.12, 0.52);
  const bumperMesh = new THREE.Mesh(bumperGeo, undercarriageMat);
  bumperMesh.position.set(0.92, 0.26, 0);
  group.add(bumperMesh);

  // Front grille strip
  const grilleGeo = new THREE.BoxGeometry(0.04, 0.18, 0.38);
  const grilleMesh = new THREE.Mesh(grilleGeo, undercarriageMat);
  grilleMesh.position.set(0.90, 0.42, 0);
  group.add(grilleMesh);

  // Cab side panel accent (darker teal strip)
  const accentGeo = new THREE.BoxGeometry(0.5, 0.06, 0.02);
  const accentMesh = new THREE.Mesh(accentGeo, cabDarkMat);
  accentMesh.position.set(0.62, 0.30, 0.29);
  group.add(accentMesh);

  // Junction between cargo and cab
  const junctionGeo = new THREE.BoxGeometry(0.08, 0.68, 0.58);
  const junctionMesh = new THREE.Mesh(junctionGeo, cabDarkMat);
  junctionMesh.position.set(0.32, 0.54, 0);
  group.add(junctionMesh);

  // ── Undercarriage ─────────────────────────────────────────────
  const frameGeo = new THREE.BoxGeometry(2.0, 0.08, 0.38);
  const frameMesh = new THREE.Mesh(frameGeo, undercarriageMat);
  frameMesh.position.set(-0.02, 0.18, 0);
  group.add(frameMesh);

  // ── Wheels ───────────────────────────────────────────────────
  // CylinderGeometry default: height along Y.
  // We rotate PI/2 around X so the cylinder height is along Z → disc in XY plane.
  // Then spinning the wheelGroup around Z axis = rolling forward.
  const wheelGroups = [];

  function addWheel(x, z) {
    const wg = new THREE.Group();
    wg.position.set(x, 0.2, z);

    // Outer tire ring
    const tireGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.11, 20);
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.rotation.x = Math.PI / 2;
    wg.add(tire);

    // Inner tread ring (slightly smaller)
    const treadGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.115, 20);
    const tread = new THREE.Mesh(treadGeo, new THREE.MeshStandardMaterial({
      color: 0x243040,
      roughness: 0.98,
    }));
    tread.rotation.x = Math.PI / 2;
    wg.add(tread);

    // Hub cap
    const hubGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.125, 12);
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.rotation.x = Math.PI / 2;
    wg.add(hub);

    // Hub center bolt
    const boltGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.13, 6);
    const bolt = new THREE.Mesh(boltGeo, undercarriageMat);
    bolt.rotation.x = Math.PI / 2;
    wg.add(bolt);

    group.add(wg);
    wheelGroups.push(wg);
    return wg;
  }

  // Two rear wheels (left/right)
  addWheel(-0.52, +0.32);
  addWheel(-0.52, -0.32);
  // Two front wheels (left/right)
  addWheel(0.72, +0.32);
  addWheel(0.72, -0.32);

  // ── Scale the whole truck down (it should be "small" on the sphere) ──
  group.scale.setScalar(0.55);

  return {
    group,
    wheels: wheelGroups,
    meshes: [cargoMesh, cabMesh, visorMesh],
  };
}
