import * as THREE from 'three';

/**
 * Builds a logo-accurate 3D truck for Oscar Coello's Supply Chain UX portfolio.
 *
 * Color mapping from brand spec:
 *   Navy   #31465D → outer frame, undercarriage, C-wheel extruded sides
 *   Cyan   #18CEFE → lower cargo stripe
 *   Turquoise #1FCFB4 → cabin (emissive on hover)
 *   Off-White #FCFCFC → upper cargo, C-wheel face (emissive on hover)
 *
 * Truck faces +X direction. Wheel bottoms at local y ≈ 0.
 * Returns { group, wheels, emissiveMeshes, hoverMeshes }
 */
export function createTruck() {
  const group = new THREE.Group();

  // ── Materials ──────────────────────────────────────────────────
  const navyMat = new THREE.MeshStandardMaterial({
    color: 0x31465D,
    roughness: 0.85,
    metalness: 0.05,
  });

  const cargoUpperMat = new THREE.MeshStandardMaterial({
    color: 0xFCFCFC,
    roughness: 0.55,
    metalness: 0.05,
    emissive: new THREE.Color(0xFCFCFC),
    emissiveIntensity: 0,
  });

  const cargoLowerMat = new THREE.MeshStandardMaterial({
    color: 0x18CEFE,
    roughness: 0.6,
    metalness: 0.1,
  });

  const cabMat = new THREE.MeshStandardMaterial({
    color: 0x1FCFB4,
    roughness: 0.3,
    metalness: 0.12,
    transparent: true,
    opacity: 0.92,
    emissive: new THREE.Color(0x1FCFB4),
    emissiveIntensity: 0,
  });

  const cWheelFaceMat = new THREE.MeshStandardMaterial({
    color: 0xFCFCFC,
    roughness: 0.45,
    metalness: 0.05,
    emissive: new THREE.Color(0xFCFCFC),
    emissiveIntensity: 0,
  });

  const cWheelSideMat = new THREE.MeshStandardMaterial({
    color: 0x31465D,
    roughness: 0.8,
    metalness: 0.05,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x1E2B3A,
    roughness: 0.95,
    metalness: 0.0,
  });

  const hubMat = new THREE.MeshStandardMaterial({
    color: 0xFCFCFC,
    roughness: 0.5,
    metalness: 0.1,
    emissive: new THREE.Color(0xFCFCFC),
    emissiveIntensity: 0,
  });

  // ── Outer Frame (navy border behind everything) ────────────────
  // This acts as the thick navy outline visible around the truck edges
  const outerFrameGeo = new THREE.BoxGeometry(2.18, 1.08, 0.64);
  const outerFrameMesh = new THREE.Mesh(outerFrameGeo, navyMat);
  outerFrameMesh.position.set(-0.01, 0.62, 0);
  group.add(outerFrameMesh);

  // ── Cargo Upper (off-white) ───────────────────────────────────
  const cargoUpperGeo = new THREE.BoxGeometry(1.22, 0.52, 0.52);
  const cargoUpperMesh = new THREE.Mesh(cargoUpperGeo, cargoUpperMat);
  cargoUpperMesh.position.set(-0.38, 0.79, 0);
  group.add(cargoUpperMesh);

  // ── Cargo Lower stripe (cyan) ─────────────────────────────────
  const cargoLowerGeo = new THREE.BoxGeometry(1.22, 0.2, 0.52);
  const cargoLowerMesh = new THREE.Mesh(cargoLowerGeo, cargoLowerMat);
  cargoLowerMesh.position.set(-0.38, 0.46, 0);
  group.add(cargoLowerMesh);

  // ── Cargo rear wall (navy inset) ──────────────────────────────
  const cargoRearGeo = new THREE.BoxGeometry(0.03, 0.7, 0.52);
  const cargoRearMesh = new THREE.Mesh(cargoRearGeo, navyMat);
  cargoRearMesh.position.set(-0.99, 0.62, 0);
  group.add(cargoRearMesh);

  // ── Cabin (turquoise, emissive on hover) ──────────────────────
  const cabGeo = new THREE.BoxGeometry(0.56, 0.72, 0.52);
  const cabMesh = new THREE.Mesh(cabGeo, cabMat);
  cabMesh.position.set(0.65, 0.64, 0);
  group.add(cabMesh);

  // Cab rounded top accent — slightly smaller box for roof softness
  const cabRoofGeo = new THREE.BoxGeometry(0.48, 0.1, 0.48);
  const cabRoofMesh = new THREE.Mesh(cabRoofGeo, navyMat);
  cabRoofMesh.position.set(0.65, 1.03, 0);
  group.add(cabRoofMesh);

  // Windshield (darker tinted glass)
  const windshieldGeo = new THREE.BoxGeometry(0.05, 0.3, 0.38);
  const windshieldMat = new THREE.MeshStandardMaterial({
    color: 0x1A3040,
    roughness: 0.05,
    metalness: 0.25,
    transparent: true,
    opacity: 0.7,
  });
  const windshieldMesh = new THREE.Mesh(windshieldGeo, windshieldMat);
  windshieldMesh.position.set(0.94, 0.7, 0);
  windshieldMesh.rotation.z = 0.12;
  group.add(windshieldMesh);

  // Front bumper (navy)
  const bumperGeo = new THREE.BoxGeometry(0.1, 0.14, 0.48);
  const bumperMesh = new THREE.Mesh(bumperGeo, navyMat);
  bumperMesh.position.set(0.97, 0.3, 0);
  group.add(bumperMesh);

  // Junction strip between cargo and cab (navy divider)
  const junctionGeo = new THREE.BoxGeometry(0.1, 0.72, 0.54);
  const junctionMesh = new THREE.Mesh(junctionGeo, navyMat);
  junctionMesh.position.set(0.32, 0.64, 0);
  group.add(junctionMesh);

  // Undercarriage frame (navy)
  const frameGeo = new THREE.BoxGeometry(2.0, 0.1, 0.42);
  const frameMesh = new THREE.Mesh(frameGeo, navyMat);
  frameMesh.position.set(-0.02, 0.2, 0);
  group.add(frameMesh);

  // ── Rear Wheel ────────────────────────────────────────────────
  const wheelGroups = [];

  function addRearWheel(z) {
    const wg = new THREE.Group();
    wg.position.set(-0.52, 0.24, z);

    const tireGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.12, 24);
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.rotation.x = Math.PI / 2;
    wg.add(tire);

    const innerRingGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.125, 24);
    const innerRing = new THREE.Mesh(innerRingGeo, new THREE.MeshStandardMaterial({
      color: 0x243040, roughness: 0.98,
    }));
    innerRing.rotation.x = Math.PI / 2;
    wg.add(innerRing);

    const hubGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.13, 12);
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.rotation.x = Math.PI / 2;
    wg.add(hub);

    const boltGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.14, 6);
    const bolt = new THREE.Mesh(boltGeo, navyMat);
    bolt.rotation.x = Math.PI / 2;
    wg.add(bolt);

    group.add(wg);
    wheelGroups.push(wg);
    return wg;
  }

  addRearWheel(+0.3);
  addRearWheel(-0.3);

  // ── Front "C" Wheel (letter C extruded shape) ─────────────────
  // The C opens to the right (+X direction = front of truck)
  const cShape = new THREE.Shape();
  const outerR = 0.22;
  const innerR = 0.13;
  const gapAngle = 0.75; // radians — gap opening faces +X (right / front)

  // Outer arc: goes from gapAngle/2 to 2π - gapAngle/2 (counter-clockwise)
  // Starting at top of gap, going counter-clockwise (the long way around the C)
  cShape.absarc(0, 0, outerR, gapAngle / 2, Math.PI * 2 - gapAngle / 2, false);

  // Connect to inner arc tip
  const innerEndX = Math.cos(Math.PI * 2 - gapAngle / 2) * innerR;
  const innerEndY = Math.sin(Math.PI * 2 - gapAngle / 2) * innerR;
  cShape.lineTo(innerEndX, innerEndY);

  // Inner arc: goes back (clockwise, i.e. reversed)
  cShape.absarc(0, 0, innerR, Math.PI * 2 - gapAngle / 2, gapAngle / 2, true);
  cShape.closePath();

  const extrudeSettings = {
    depth: 0.12,
    bevelEnabled: false,
  };

  const cGeo = new THREE.ExtrudeGeometry(cShape, extrudeSettings);

  // ExtrudeGeometry uses groups: [0] = sides, [1] = top cap, [2] = bottom cap
  // We want: front face off-white, extruded sides navy
  const cMesh = new THREE.Mesh(cGeo, [cWheelSideMat, cWheelFaceMat, cWheelFaceMat]);
  // Rotate so C disc is in XY plane (ExtrudeGeometry extrudes along Z)
  cMesh.rotation.y = Math.PI / 2; // make disc face outward (XY → ZY)
  cMesh.rotation.z = Math.PI;     // flip so opening faces +X (front)
  cMesh.position.set(0.78, 0.24, 0);

  const cWheelGroup = new THREE.Group();
  cWheelGroup.add(cMesh);
  group.add(cWheelGroup);
  wheelGroups.push(cWheelGroup);

  // ── Scale & orient ─────────────────────────────────────────────
  group.scale.setScalar(0.58);

  // ── Hover glow meshes ─────────────────────────────────────────
  // These are the meshes with emissive materials that glow on hover
  const emissiveMeshes = [cabMesh, cargoUpperMesh, cMesh];
  const emissiveMats   = [cabMat, cargoUpperMat, cWheelFaceMat];
  const hubEmissiveMeshes = group.children.filter(c => c.isMesh && c.material === hubMat);

  // Collect all truck mesh children for raycasting
  const hoverMeshes = [];
  group.traverse(child => {
    if (child.isMesh) hoverMeshes.push(child);
  });

  return {
    group,
    wheels: wheelGroups,
    emissiveMeshes,
    emissiveMats,
    hoverMeshes,
  };
}
