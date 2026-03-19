import * as THREE from 'three';

const RADIUS = 9;

// Hub section mapping
const HUB_DEFS = [
  { label: 'Logistics Hub',       section: 0, angle: 0 },           // HOME
  { label: 'Design Studio',       section: 1, angle: Math.PI * 0.4 }, // ABOUT  (~72°)
  { label: 'Manufacturing Plant', section: 2, angle: Math.PI * 0.8 }, // WORK   (~144°)
  { label: 'Distribution Center', section: 3, angle: Math.PI * 1.2 }, // REVIEWS (~216°)
  { label: 'Port Terminal',       section: 4, angle: Math.PI * 1.6 }, // CONTACT (~288°)
];

/**
 * Creates the large wireframe sphere + 5 supply-chain facility hubs on its surface.
 * Returns { group, wireMesh, wireMat, hubs }
 *
 * hubs: array of { group, angle, label, meshes, glowMat }
 * The hub angle is the longitude (Y-rotation) where the hub sits on the equator.
 * Rotating sphereGroup.rotation.y by -hub.angle brings that hub to the front (Z+).
 * To bring a hub to the TOP, the truck sits at top so we rotate sphere so hub faces up.
 */
export function createSphere() {
  const group = new THREE.Group();

  // ── Primary wireframe ─────────────────────────────────────────
  const icoGeo  = new THREE.IcosahedronGeometry(RADIUS, 4);
  const wireGeo = new THREE.WireframeGeometry(icoGeo);

  const wireMat = new THREE.LineBasicMaterial({
    color: 0x3A5570,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });

  const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
  group.add(wireMesh);

  // Inner glow mesh (subtle depth)
  const glowGeo = new THREE.SphereGeometry(RADIUS * 0.98, 32, 32);
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x18253A,
    roughness: 1,
    transparent: true,
    opacity: 0.42,
    side: THREE.BackSide,
  });
  group.add(new THREE.Mesh(glowGeo, glowMat));

  // Equator accent ring (cyan)
  const ringGeo = new THREE.TorusGeometry(RADIUS, 0.04, 6, 90);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x18CEFE,
    transparent: true,
    opacity: 0.22,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = 0.28;
  group.add(ringMesh);

  // ── Supply-Chain Hubs ─────────────────────────────────────────
  const hubs = [];

  HUB_DEFS.forEach(def => {
    const hubGroup = new THREE.Group();

    // Place hub on sphere equator at given longitude angle
    // Hub sits on the surface: position = RADIUS * direction vector
    const sx = Math.sin(def.angle);
    const sz = Math.cos(def.angle);
    // Surface normal points outward — we tilt the group to stand "up" on the sphere
    hubGroup.position.set(sx * RADIUS, 0, sz * RADIUS);
    // Orient hub to stand perpendicular to sphere surface
    hubGroup.lookAt(0, 0, 0);
    hubGroup.rotateX(Math.PI); // flip upright (lookAt points inward, we want outward)

    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x1FCFB4,
      roughness: 0.4,
      metalness: 0.1,
      emissive: new THREE.Color(0x1FCFB4),
      emissiveIntensity: 0.18,
    });

    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x31465D,
      roughness: 0.8,
      metalness: 0.05,
    });

    // Build hub geometry based on facility type
    const meshes = buildHub(def.section, glowMat, darkMat, hubGroup);

    group.add(hubGroup);
    hubs.push({
      group: hubGroup,
      angle: def.angle,
      label: def.label,
      meshes,
      glowMat,
    });
  });

  return { group, wireMesh, wireMat, hubs };
}

/** Builds low-poly facility silhouette based on section type */
function buildHub(section, glowMat, darkMat, parent) {
  const meshes = [];
  const scale = 0.45; // hub scale relative to sphere

  switch (section) {
    case 0: { // Logistics Hub — main building + two side wings + tower
      const base = box(1.2, 0.6, 0.8, glowMat, 0, 0.3, 0);
      const leftWing = box(0.5, 0.35, 0.6, darkMat, -0.85, 0.18, 0);
      const rightWing = box(0.5, 0.35, 0.6, darkMat, 0.85, 0.18, 0);
      const tower = box(0.28, 0.9, 0.28, glowMat, 0.35, 0.75, 0);
      const roof = box(1.3, 0.08, 0.9, darkMat, 0, 0.64, 0);
      [base, leftWing, rightWing, tower, roof].forEach(m => {
        parent.add(m); meshes.push(m);
      });
      break;
    }
    case 1: { // Design Studio — clean modern office block
      const base = box(0.9, 0.8, 0.7, glowMat, 0, 0.4, 0);
      const annex = box(0.4, 0.5, 0.5, darkMat, 0.65, 0.25, 0);
      const penthouse = box(0.55, 0.25, 0.5, glowMat, -0.1, 0.925, 0);
      const ledge = box(1.0, 0.06, 0.76, darkMat, 0, 0.83, 0);
      [base, annex, penthouse, ledge].forEach(m => {
        parent.add(m); meshes.push(m);
      });
      break;
    }
    case 2: { // Manufacturing Plant — wide low factory + chimney stacks
      const factory = box(1.6, 0.45, 0.9, glowMat, 0, 0.225, 0);
      const warehouse = box(0.9, 0.7, 0.7, darkMat, 0, 0.35, 0);
      const chimney1 = cyl(0.08, 0.08, 0.7, glowMat, -0.55, 0.8, 0.2);
      const chimney2 = cyl(0.08, 0.08, 0.55, glowMat, -0.35, 0.725, 0.2);
      const roofFan = cyl(0.18, 0.18, 0.06, darkMat, 0.3, 0.73, 0);
      [factory, warehouse, chimney1, chimney2, roofFan].forEach(m => {
        parent.add(m); meshes.push(m);
      });
      break;
    }
    case 3: { // Distribution Center — large flat warehouse with dock doors
      const shed = box(1.8, 0.4, 1.0, glowMat, 0, 0.2, 0);
      const office = box(0.55, 0.65, 0.7, darkMat, -0.7, 0.325, 0);
      const dock1 = box(0.2, 0.22, 0.08, darkMat, 0.3, 0.11, 0.51);
      const dock2 = box(0.2, 0.22, 0.08, darkMat, 0.7, 0.11, 0.51);
      const roofEdge = box(1.85, 0.06, 1.05, darkMat, 0, 0.43, 0);
      [shed, office, dock1, dock2, roofEdge].forEach(m => {
        parent.add(m); meshes.push(m);
      });
      break;
    }
    case 4: { // Port Terminal — crane arm + control tower + base platform
      const platform = box(2.0, 0.15, 1.0, glowMat, 0, 0.075, 0);
      const tower = box(0.25, 1.1, 0.25, glowMat, 0.5, 0.625, 0);
      const craneArm = box(0.9, 0.1, 0.12, darkMat, 0.0, 1.15, 0);
      const cranePost = box(0.08, 0.45, 0.08, darkMat, 0.5, 1.37, 0);
      const control = box(0.4, 0.35, 0.35, darkMat, -0.5, 0.475, 0);
      [platform, tower, craneArm, cranePost, control].forEach(m => {
        parent.add(m); meshes.push(m);
      });
      break;
    }
  }

  parent.scale.setScalar(scale);
  return meshes;
}

// ── Geometry helpers ───────────────────────────────────────────
function box(w, h, d, mat, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  return mesh;
}

function cyl(rTop, rBot, h, mat, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 8), mat);
  mesh.position.set(x, y, z);
  return mesh;
}
