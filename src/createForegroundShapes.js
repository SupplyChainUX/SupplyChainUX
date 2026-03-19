import * as THREE from 'three';
import gsap from 'gsap';

/**
 * Section-specific foreground 3D shapes that orbit in/out on scroll.
 *
 * Each shape starts off-screen right (x: +24) and animates to its resting
 * position (x: +7) when its section becomes active, then flies back out when
 * the section is left.
 *
 * Section map:
 *   0 HOME     → Rotating octahedron with 3 stat faces
 *   1 ABOUT    → Rotating cube with Oscar's photo
 *   2 WORK     → Rotating icosahedron with company names
 *   3 REVIEWS  → null (no foreground shape)
 *   4 CONTACT  → Polygonal hand floating up/down, pointing left
 */

const OFF_X   = 24;   // off-screen starting X
const REST_Y  = 1.5;  // vertical center for all shapes

// Brand colors
const CYAN       = 0x18CEFE;
const TURQUOISE  = 0x1FCFB4;
const NAVY       = 0x31465D;
const OFF_WHITE  = 0xFCFCFC;

// ── Canvas texture helpers ─────────────────────────────────────
function makeTextCanvas(lines, opts = {}) {
  const W = opts.width  || 512;
  const H = opts.height || 512;
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = opts.bg || 'rgba(17,28,42,0.92)';
  roundRect(ctx, 0, 0, W, H, opts.radius || 24);
  ctx.fill();

  // Border
  ctx.strokeStyle = opts.borderColor || '#18CEFE';
  ctx.lineWidth = opts.borderWidth || 6;
  roundRect(ctx, 3, 3, W - 6, H - 6, (opts.radius || 24) - 3);
  ctx.stroke();

  // Text
  let y = H * 0.22;
  lines.forEach((line, i) => {
    const cfg = Array.isArray(line) ? line : [line];
    ctx.font        = cfg[1] || `bold ${Math.round(W * 0.07)}px Montserrat, sans-serif`;
    ctx.fillStyle   = cfg[2] || '#FCFCFC';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cfg[0], W / 2, y);
    y += cfg[3] || H * 0.16;
  });

  return new THREE.CanvasTexture(canvas);
}

function makeImageCanvas(imgSrc, W = 512, H = 512) {
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Draw placeholder teal background with initials
  ctx.fillStyle = '#1A2535';
  ctx.fillRect(0, 0, W, H);

  // Border
  ctx.strokeStyle = '#1FCFB4';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, W - 8, H - 8);

  // Label
  ctx.font = 'bold 38px Montserrat, sans-serif';
  ctx.fillStyle = '#1FCFB4';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('OSCAR COELLO', W / 2, H * 0.88);

  const tex = new THREE.CanvasTexture(canvas);

  // Try to load actual image
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    ctx.clearRect(0, 0, W, H);
    // Draw image centered/cropped
    const aspect = img.width / img.height;
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (aspect > 1) { sx = (img.width - img.height) / 2; sw = img.height; }
    else            { sy = (img.height - img.width) / 2; sh = img.width; }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);

    // Overlay border
    ctx.strokeStyle = '#1FCFB4';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, W - 8, H - 8);

    tex.needsUpdate = true;
  };
  img.src = imgSrc;

  return tex;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ── Stat face textures for HOME ────────────────────────────────
function makeStatTexture(number, label) {
  return makeTextCanvas([
    [`${number}`, `bold 120px Montserrat, sans-serif`, '#18CEFE', 170],
    [label, `bold 44px Montserrat, sans-serif`, '#FCFCFC', 80],
  ], { bg: 'rgba(17,28,42,0.95)', borderColor: '#18CEFE', width: 512, height: 512 });
}

// ── Company name texture for WORK ─────────────────────────────
function makeCompanyTexture(name, prominent = false) {
  const bg    = prominent ? 'rgba(24,206,254,0.12)' : 'rgba(17,28,42,0.9)';
  const color = prominent ? '#FCFCFC' : '#8BA4BA';
  const border = prominent ? '#18CEFE' : '#31465D';
  const fontSize = prominent ? 52 : 38;
  return makeTextCanvas([
    [name, `bold ${fontSize}px Montserrat, sans-serif`, color, 0],
  ], { bg, borderColor: border, borderWidth: prominent ? 6 : 3, width: 512, height: 256, radius: 20 });
}

// ── Shape factory ──────────────────────────────────────────────

function createHomeShape(scene) {
  const group = new THREE.Group();
  group.position.set(OFF_X, REST_Y, 3);

  // Large octahedron — 8 faces, we texture 3 main visible ones
  const geo = new THREE.OctahedronGeometry(1.4, 0);

  // Build materials array for 8 faces (octahedron has 8 triangle faces)
  const stats = [
    ['4+', 'Years Experience'],
    ['8+', 'Companies Designed For'],
    ['70+', 'Apps & Features Launched'],
  ];

  const mats = [];
  // Faces 0,2,4 get stat textures; rest get a faint wireframe look
  for (let i = 0; i < 8; i++) {
    const statIdx = [0, 2, 4].indexOf(i);
    if (statIdx !== -1) {
      const [num, label] = stats[statIdx];
      mats.push(new THREE.MeshStandardMaterial({
        map: makeStatTexture(num, label),
        roughness: 0.3,
        metalness: 0.1,
        emissive: new THREE.Color(0x112233),
        emissiveIntensity: 0.3,
      }));
    } else {
      mats.push(new THREE.MeshStandardMaterial({
        color: NAVY,
        roughness: 0.7,
        metalness: 0.1,
        transparent: true,
        opacity: 0.85,
        emissive: new THREE.Color(0x18CEFE),
        emissiveIntensity: 0.05,
      }));
    }
  }

  const mesh = new THREE.Mesh(geo, mats);
  group.add(mesh);

  // Wireframe overlay
  const wireGeo = new THREE.WireframeGeometry(geo);
  const wireMat = new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.35 });
  group.add(new THREE.LineSegments(wireGeo, wireMat));

  scene.add(group);
  return { group, mesh, rxs: 0.004, rys: 0.007, rzs: 0.002, floatAmp: 0.15, floatSpeed: 0.6 };
}

function createAboutShape(scene) {
  const group = new THREE.Group();
  group.position.set(OFF_X, REST_Y, 3);

  const photoTex = makeImageCanvas('/oscar.jpg');

  const faceMats = [
    new THREE.MeshStandardMaterial({ map: photoTex, roughness: 0.3 }),  // +X
    new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.7, emissive: new THREE.Color(TURQUOISE), emissiveIntensity: 0.08 }), // -X
    new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.7, emissive: new THREE.Color(TURQUOISE), emissiveIntensity: 0.08 }), // +Y
    new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.7 }), // -Y
    new THREE.MeshStandardMaterial({ map: photoTex, roughness: 0.3 }),  // +Z front
    new THREE.MeshStandardMaterial({ map: photoTex, roughness: 0.3 }),  // -Z back
  ];

  const geo  = new THREE.BoxGeometry(1.6, 1.6, 1.6);
  const mesh = new THREE.Mesh(geo, faceMats);
  group.add(mesh);

  // Teal edge glow outline
  const edgeGeo = new THREE.EdgesGeometry(geo);
  const edgeMat = new THREE.LineBasicMaterial({ color: TURQUOISE, transparent: true, opacity: 0.6 });
  group.add(new THREE.LineSegments(edgeGeo, edgeMat));

  scene.add(group);
  return { group, mesh, rxs: 0.003, rys: 0.006, rzs: 0.001, floatAmp: 0.12, floatSpeed: 0.5 };
}

function createWorkShape(scene) {
  const group = new THREE.Group();
  group.position.set(OFF_X, REST_Y, 3);

  // Dodecahedron — 12 pentagonal faces for 8 companies (some shared/unused faces get navy)
  const geo = new THREE.DodecahedronGeometry(1.5, 0);

  const companies = [
    { name: 'Chewy',                  prominent: true  },
    { name: 'RingCentral',            prominent: true  },
    { name: 'BioPlus\nSpecialty Rx',  prominent: true  },
    { name: 'Duct Tape\nMarketing',   prominent: false },
    { name: 'WorkBetterNow',          prominent: false },
    { name: 'Forums Inc.',            prominent: false },
    { name: 'Standard Care',          prominent: false },
    { name: 'HoleScale',              prominent: false },
  ];

  const mats = [];
  for (let i = 0; i < 12; i++) {
    if (i < companies.length) {
      const c = companies[i];
      mats.push(new THREE.MeshStandardMaterial({
        map: makeCompanyTexture(c.name, c.prominent),
        roughness: 0.35,
        metalness: 0.05,
        emissive: c.prominent ? new THREE.Color(0x183040) : new THREE.Color(0x0a1520),
        emissiveIntensity: c.prominent ? 0.4 : 0.1,
      }));
    } else {
      mats.push(new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.8 }));
    }
  }

  const mesh = new THREE.Mesh(geo, mats);
  group.add(mesh);

  const wireGeo = new THREE.WireframeGeometry(geo);
  const wireMat = new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.25 });
  group.add(new THREE.LineSegments(wireGeo, wireMat));

  scene.add(group);
  return { group, mesh, rxs: 0.002, rys: 0.008, rzs: 0.003, floatAmp: 0.1, floatSpeed: 0.45 };
}

function createContactHand(scene) {
  const group = new THREE.Group();
  group.position.set(OFF_X, REST_Y, 3);

  // Stylized polygonal pointing hand shape (extruded from 2D path)
  // Hand points in the -X direction (toward the panel on the left)
  const handShape = new THREE.Shape();

  // Base of hand (wrist area)
  handShape.moveTo(0.5, -0.9);
  handShape.lineTo(-0.1, -0.9);
  handShape.lineTo(-0.1, -0.2);

  // Index finger pointing left (toward -X)
  handShape.lineTo(-0.8, -0.05);
  handShape.lineTo(-1.2, 0.0);      // finger tip — pointed
  handShape.lineTo(-0.8, 0.12);
  handShape.lineTo(-0.1, 0.25);

  // Upper palm
  handShape.lineTo(-0.05, 0.55);
  handShape.lineTo(0.2, 0.65);      // middle finger stub
  handShape.lineTo(0.3, 0.45);
  handShape.lineTo(0.55, 0.5);      // ring finger stub
  handShape.lineTo(0.6, 0.3);
  handShape.lineTo(0.8, 0.25);      // pinky stub
  handShape.lineTo(0.82, 0.05);

  // Thumb (pointing slightly downward)
  handShape.lineTo(0.9, -0.15);
  handShape.lineTo(1.0, -0.5);      // thumb tip — pointed
  handShape.lineTo(0.75, -0.6);
  handShape.lineTo(0.5, -0.5);

  handShape.closePath();

  const extrudeSettings = { depth: 0.3, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 };
  const handGeo = new THREE.ExtrudeGeometry(handShape, extrudeSettings);

  const handMat = new THREE.MeshStandardMaterial({
    color: NAVY,
    roughness: 0.6,
    metalness: 0.1,
    emissive: new THREE.Color(CYAN),
    emissiveIntensity: 0.12,
  });

  const handMesh = new THREE.Mesh(handGeo, handMat);
  // Center the hand geometry
  handMesh.position.set(0, 0, -0.15);
  group.add(handMesh);

  // Edge highlight
  const edgeGeo = new THREE.EdgesGeometry(handGeo);
  const edgeMat = new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.5 });
  group.add(new THREE.LineSegments(edgeGeo, edgeMat));

  // Hand does NOT rotate (just floats up/down) — return with no rotation speeds
  scene.add(group);
  return { group, mesh: handMesh, rxs: 0, rys: 0, rzs: 0, floatAmp: 0.22, floatSpeed: 0.8, isHand: true };
}

// ── Public API ─────────────────────────────────────────────────

export function createForegroundShapes(scene) {
  const shapes = [
    createHomeShape(scene),    // 0
    createAboutShape(scene),   // 1
    createWorkShape(scene),    // 2
    null,                      // 3 — Reviews: no foreground shape
    createContactHand(scene),  // 4
  ];

  // Expose hover meshes list for raycasting
  const hoverMeshes = [];
  shapes.forEach(s => {
    if (s && s.mesh) hoverMeshes.push(s.mesh);
  });

  return { shapes, hoverMeshes };
}

/**
 * Animate a foreground shape into view (orbit in from right).
 * @param {Object} shapeObj  — from createForegroundShapes().shapes[index]
 */
export function showForegroundShape(shapeObj) {
  if (!shapeObj) return;
  const restX = shapeObj.isHand ? 5.5 : 6.5;
  gsap.to(shapeObj.group.position, {
    x: restX,
    duration: 0.9,
    ease: 'power2.out',
  });
}

/**
 * Animate a foreground shape out of view (orbit out to right).
 */
export function hideForegroundShape(shapeObj) {
  if (!shapeObj) return;
  gsap.to(shapeObj.group.position, {
    x: OFF_X,
    duration: 0.55,
    ease: 'power2.in',
  });
}

/**
 * Update foreground shapes in the animation loop.
 * @param {Array}  shapes        — from createForegroundShapes()
 * @param {number} t             — elapsed time
 * @param {number} currentSection — 0-4
 */
export function updateForegroundShapes(shapes, t, currentSection) {
  shapes.forEach((s, i) => {
    if (!s) return;

    // Rotation (skip hand — isHand flag)
    if (!s.isHand) {
      s.mesh.rotation.x += s.rxs;
      s.mesh.rotation.y += s.rys;
      s.mesh.rotation.z += s.rzs;
    }

    // Float (all shapes including hand)
    const baseY = REST_Y + Math.sin(t * s.floatSpeed + i * 1.3) * s.floatAmp;
    s.group.position.y = baseY;
  });
}
