import * as THREE from 'three';

/**
 * Creates the large wireframe geo-sphere that the truck sits on top of.
 * Returns the THREE.Group containing the sphere and an optional glow mesh.
 */
export function createSphere() {
  const group = new THREE.Group();

  const RADIUS = 9;

  // Primary wireframe using IcosahedronGeometry for clean triangulated look
  const icoGeo = new THREE.IcosahedronGeometry(RADIUS, 4);
  const wireGeo = new THREE.WireframeGeometry(icoGeo);

  const wireMat = new THREE.LineBasicMaterial({
    color: 0x3A5570,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });

  const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
  group.add(wireMesh);

  // Slightly larger solid sphere to catch light from behind (subtle glow effect)
  const glowGeo = new THREE.SphereGeometry(RADIUS * 0.98, 32, 32);
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x1A2E42,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.45,
    side: THREE.BackSide,
  });
  const glowMesh = new THREE.Mesh(glowGeo, glowMat);
  group.add(glowMesh);

  // Equator accent ring — a flat torus at the sphere equator for visual interest
  const ringGeo = new THREE.TorusGeometry(RADIUS, 0.035, 6, 80);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x2BC8C8,
    transparent: true,
    opacity: 0.25,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  // Tilt slightly so it's visible from camera angle
  ringMesh.rotation.x = 0.3;
  group.add(ringMesh);

  return { group, wireMesh, wireMat };
}
