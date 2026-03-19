import * as THREE from 'three';
import gsap from 'gsap';

/**
 * Section-specific foreground 3D shapes that orbit in/out on scroll.
 *
 * Section map:
 *   0 HOME     → Three-sided pyramid (tetrahedron) with 3 stat faces
 *   1 ABOUT    → Rotating cube with Oscar's photo
 *   2 WORK     → Rotating dodecahedron with company names
 *   3 REVIEWS  → null (no foreground shape)
 *   4 CONTACT  → Low-poly globe showing world map + Florida highlight
 */

const OFF_X  = 24;
const REST_Y = 1.5;

const CYAN      = 0x18CEFE;
const TURQUOISE = 0x1FCFB4;
const NAVY      = 0x31465D;

// ── Canvas texture helpers ─────────────────────────────────────
function makeTextCanvas(lines, opts = {}) {
  const W = opts.width  || 512;
  const H = opts.height || 512;
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = opts.bg || 'rgba(17,28,42,0.95)';
  roundRect(ctx, 0, 0, W, H, opts.radius || 24);
  ctx.fill();

  ctx.strokeStyle = opts.borderColor || '#18CEFE';
  ctx.lineWidth   = opts.borderWidth  || 6;
  roundRect(ctx, 3, 3, W - 6, H - 6, (opts.radius || 24) - 3);
  ctx.stroke();

  let y = H * 0.22;
  lines.forEach(line => {
    const cfg = Array.isArray(line) ? line : [line];
    ctx.font         = cfg[1] || `bold ${Math.round(W * 0.07)}px Montserrat, sans-serif`;
    ctx.fillStyle    = cfg[2] || '#FCFCFC';
    ctx.textAlign    = 'center';
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

  ctx.fillStyle = '#1A2535';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#1FCFB4';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, W - 8, H - 8);

  ctx.font = 'bold 38px Montserrat, sans-serif';
  ctx.fillStyle = '#1FCFB4';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('OSCAR COELLO', W / 2, H * 0.88);

  const tex = new THREE.CanvasTexture(canvas);

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    ctx.clearRect(0, 0, W, H);
    const aspect = img.width / img.height;
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (aspect > 1) { sx = (img.width - img.height) / 2; sw = img.height; }
    else            { sy = (img.height - img.width)  / 2; sh = img.width;  }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
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

function makeStatTexture(number, label) {
  return makeTextCanvas([
    [`${number}`, `bold 118px Montserrat, sans-serif`, '#18CEFE', 165],
    [label,       `bold 42px Montserrat, sans-serif`,  '#FCFCFC',  80],
  ], { bg: 'rgba(17,28,42,0.97)', borderColor: '#18CEFE', width: 512, height: 512 });
}

function makeCompanyTexture(name, prominent = false) {
  const bg     = prominent ? 'rgba(24,206,254,0.12)' : 'rgba(17,28,42,0.9)';
  const color  = prominent ? '#FCFCFC' : '#8BA4BA';
  const border = prominent ? '#18CEFE' : '#31465D';
  const size   = prominent ? 52 : 38;
  return makeTextCanvas([
    [name, `bold ${size}px Montserrat, sans-serif`, color, 0],
  ], { bg, borderColor: border, borderWidth: prominent ? 6 : 3, width: 512, height: 256, radius: 20 });
}

// ── Custom tetrahedron with per-face materials ─────────────────
function buildTetrahedronGeo(r) {
  // Vertices of a regular tetrahedron inscribed in a sphere of radius r
  const sq23 = Math.sqrt(2 / 3);
  const sq29 = Math.sqrt(2 / 9);
  const v = [
    new THREE.Vector3(0,              r,      0),           // apex
    new THREE.Vector3(r * 2 * sq29 * 1.5, -r / 3, 0),     // front-right
    new THREE.Vector3(-r * sq29 * 1.5,  -r / 3,  r * sq23 * 1.2), // back-left
    new THREE.Vector3(-r * sq29 * 1.5,  -r / 3, -r * sq23 * 1.2), // back-right
  ];

  // 4 triangular faces (CCW winding = outward normal)
  const faceVerts = [
    [v[0], v[1], v[2]], // stat face 0
    [v[0], v[2], v[3]], // stat face 1
    [v[0], v[3], v[1]], // stat face 2
    [v[1], v[3], v[2]], // bottom (navy) — winding reversed so it faces down
  ];

  // UV: map each triangular face to fill the texture nicely
  const triUV = [[0.5, 0.95], [0.05, 0.05], [0.95, 0.05]];

  const pos = [], nrm = [], uvArr = [];

  faceVerts.forEach(([a, b, c]) => {
    const ab = new THREE.Vector3().subVectors(b, a);
    const ac = new THREE.Vector3().subVectors(c, a);
    const n  = new THREE.Vector3().crossVectors(ab, ac).normalize();

    [a, b, c].forEach((vtx, vi) => {
      pos.push(vtx.x, vtx.y, vtx.z);
      nrm.push(n.x, n.y, n.z);
      uvArr.push(triUV[vi][0], triUV[vi][1]);
    });
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos,   3));
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(nrm,   3));
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvArr, 2));

  geo.addGroup(0,  3, 0);
  geo.addGroup(3,  3, 1);
  geo.addGroup(6,  3, 2);
  geo.addGroup(9,  3, 3);

  return geo;
}

// ── World map canvas texture (equirectangular) ─────────────────
function makeWorldMapTexture() {
  const W = 1024, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Ocean
  ctx.fillStyle = '#1A2535';
  ctx.fillRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = 'rgba(49,70,93,0.45)';
  ctx.lineWidth = 0.8;
  for (let lat = -90; lat <= 90; lat += 30) {
    const y = H * (90 - lat) / 180;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  for (let lon = -180; lon <= 180; lon += 30) {
    const x = W * (lon + 180) / 360;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }

  // Helper: lat/lon → canvas x,y (equirectangular)
  const ll = (lat, lon) => [W * (lon + 180) / 360, H * (90 - lat) / 180];

  function drawPoly(pts, color = 'rgba(180,200,220,0.18)') {
    if (!pts.length) return;
    ctx.beginPath();
    const [x0, y0] = ll(pts[0][0], pts[0][1]);
    ctx.moveTo(x0, y0);
    for (let i = 1; i < pts.length; i++) {
      const [x, y] = ll(pts[i][0], pts[i][1]);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  // ── Simplified continent outlines ──────────────────────────
  // North America
  drawPoly([
    [73,-140],[70,-130],[60,-141],[49,-125],[37,-122],[32,-117],[23,-110],
    [16,-90],[8,-77],[9,-79],[11,-75],[18,-87],[25,-80],[30,-81],[31,-81],
    [41,-70],[47,-54],[60,-64],[65,-64],[72,-80],[74,-100],[72,-115],[73,-140],
  ]);

  // Mexico/Central America (part of above is enough — add lower tip)
  drawPoly([
    [25,-110],[16,-90],[8,-77],[9,-79],[11,-75],[18,-87],[22,-90],[25,-110],
  ]);

  // Greenland
  drawPoly([
    [84,-45],[77,-20],[73,-22],[72,-24],[72,-28],[76,-60],[80,-70],[84,-45],
  ]);

  // South America
  drawPoly([
    [12,-72],[8,-77],[1,-78],[-5,-80],[-18,-70],[-23,-43],[-34,-53],
    [-55,-69],[-55,-66],[-42,-65],[-38,-57],[-23,-41],[-10,-37],
    [0,-50],[5,-52],[12,-72],
  ]);

  // Europe (approximate)
  drawPoly([
    [71,28],[70,18],[61,5],[52,4],[50,2],[44,0],[36,-6],[36,10],
    [38,16],[40,19],[43,14],[46,13],[48,17],[52,14],[55,10],
    [57,12],[59,18],[65,14],[68,16],[70,24],[71,28],
  ]);

  // British Isles (approximate)
  drawPoly([[58,-5],[51,-3],[51,2],[53,0],[57,-2],[58,-5]]);

  // Africa
  drawPoly([
    [37,10],[37,0],[35,-5],[30,-13],[15,-17],[0,-18],[-35,19],
    [-34,26],[-29,32],[-11,40],[0,42],[10,42],[22,37],[35,35],[37,10],
  ]);

  // Russia / Northern Asia
  drawPoly([
    [73,60],[73,100],[73,130],[67,142],[55,142],[50,140],[42,135],
    [40,130],[42,128],[50,115],[50,85],[55,60],[60,55],[65,40],
    [70,30],[72,40],[74,60],[73,60],
  ]);

  // Central/South Asia + Indian subcontinent
  drawPoly([
    [42,42],[40,48],[35,52],[28,55],[22,60],[8,78],[8,76],[22,68],
    [25,62],[28,55],[35,52],[40,48],[42,42],
  ]);

  // India
  drawPoly([
    [28,70],[22,68],[8,77],[8,80],[10,80],[15,80],[22,88],[25,90],
    [27,88],[28,80],[28,70],
  ]);

  // Southeast Asia
  drawPoly([
    [22,100],[14,100],[5,100],[1,104],[-5,104],[0,108],[5,103],
    [10,105],[15,100],[20,100],[22,100],
  ]);

  // Japan
  drawPoly([[45,141],[40,140],[34,130],[34,131],[40,141],[45,141]]);

  // Australia
  drawPoly([
    [-16,136],[-17,122],[-22,114],[-32,115],[-38,145],[-38,148],
    [-27,154],[-20,148],[-12,136],[-16,136],
  ]);

  // ── Florida highlighted in cyan ──────────────────────────────
  drawPoly([
    [31,-87.6],[30.3,-86.5],[29.9,-85.3],[29.5,-83.8],
    [28.7,-82.8],[27.6,-82.8],[26.6,-82.0],[25.5,-80.9],
    [25.1,-80.4],[25.5,-80.1],[27,-80.0],[28.5,-80.5],
    [29.5,-81.0],[30.6,-81.3],[30.7,-81.5],[31,-85],[31,-87.6],
  ], '#18CEFE');

  // Florida label dot
  const [flx, fly] = ll(27.8, -83.5);
  ctx.beginPath();
  ctx.arc(flx, fly, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#FCFCFC';
  ctx.fill();

  // Subtle "FL" text
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = '#FCFCFC';
  ctx.textAlign = 'center';
  ctx.fillText('FL', flx, fly - 8);

  return new THREE.CanvasTexture(canvas);
}

// ── Shape factories ────────────────────────────────────────────

function createHomeShape(scene) {
  const group = new THREE.Group();
  group.position.set(OFF_X, REST_Y, 3);

  const r = 1.45;
  const geo = buildTetrahedronGeo(r);

  const stats = [
    ['4+',  'Years Experience'],
    ['8+',  'Companies Designed For'],
    ['70+', 'Projects'],
  ];

  const mats = stats.map(([num, label]) =>
    new THREE.MeshStandardMaterial({
      map: makeStatTexture(num, label),
      roughness: 0.3,
      metalness: 0.1,
      side: THREE.DoubleSide,
      emissive: new THREE.Color(0x0a1a2a),
      emissiveIntensity: 0.25,
    })
  );

  // 4th face (bottom) — navy, hidden naturally when rotating
  mats.push(new THREE.MeshStandardMaterial({
    color: NAVY,
    roughness: 0.8,
    side: THREE.DoubleSide,
    emissive: new THREE.Color(CYAN),
    emissiveIntensity: 0.06,
  }));

  const mesh = new THREE.Mesh(geo, mats);
  group.add(mesh);

  // Edge overlay (cyan lines outlining pyramid)
  const edgePts = [];
  const sq23 = Math.sqrt(2 / 3);
  const sq29 = Math.sqrt(2 / 9);
  const vv = [
    new THREE.Vector3(0,              r,      0),
    new THREE.Vector3(r * 2 * sq29 * 1.5, -r / 3, 0),
    new THREE.Vector3(-r * sq29 * 1.5, -r / 3,  r * sq23 * 1.2),
    new THREE.Vector3(-r * sq29 * 1.5, -r / 3, -r * sq23 * 1.2),
  ];
  const edges = [[0,1],[0,2],[0,3],[1,2],[2,3],[3,1]];
  edges.forEach(([a, b]) => { edgePts.push(vv[a], vv[b]); });

  const edgeGeo = new THREE.BufferGeometry().setFromPoints(edgePts);
  const edgeMat = new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.5 });
  group.add(new THREE.LineSegments(edgeGeo, edgeMat));

  scene.add(group);
  return { group, mesh, rxs: 0.003, rys: 0.007, rzs: 0.002, floatAmp: 0.15, floatSpeed: 0.6 };
}

function createAboutShape(scene) {
  const group = new THREE.Group();
  group.position.set(OFF_X, REST_Y, 3);

  const photoTex = makeImageCanvas('/oscar.jpg');

  const faceMats = [
    new THREE.MeshStandardMaterial({ map: photoTex, roughness: 0.3 }),
    new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.7, emissive: new THREE.Color(TURQUOISE), emissiveIntensity: 0.08 }),
    new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.7, emissive: new THREE.Color(TURQUOISE), emissiveIntensity: 0.08 }),
    new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.7 }),
    new THREE.MeshStandardMaterial({ map: photoTex, roughness: 0.3 }),
    new THREE.MeshStandardMaterial({ map: photoTex, roughness: 0.3 }),
  ];

  const geo  = new THREE.BoxGeometry(1.6, 1.6, 1.6);
  const mesh = new THREE.Mesh(geo, faceMats);
  group.add(mesh);

  const edgeGeo = new THREE.EdgesGeometry(geo);
  const edgeMat = new THREE.LineBasicMaterial({ color: TURQUOISE, transparent: true, opacity: 0.6 });
  group.add(new THREE.LineSegments(edgeGeo, edgeMat));

  scene.add(group);
  return { group, mesh, rxs: 0.003, rys: 0.006, rzs: 0.001, floatAmp: 0.12, floatSpeed: 0.5 };
}

function createWorkShape(scene) {
  const group = new THREE.Group();
  group.position.set(OFF_X, REST_Y, 3);

  const geo = new THREE.DodecahedronGeometry(1.5, 0);

  const companies = [
    { name: 'Chewy',               prominent: true  },
    { name: 'RingCentral',         prominent: true  },
    { name: 'BioPlus Specialty Rx',prominent: true  },
    { name: 'Duct Tape Marketing', prominent: false },
    { name: 'WorkBetterNow',       prominent: false },
    { name: 'Forums Inc.',         prominent: false },
    { name: 'Standard Care',       prominent: false },
    { name: 'HoleScale',           prominent: false },
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

function createContactGlobe(scene) {
  const group = new THREE.Group();
  group.position.set(OFF_X, REST_Y, 3);

  // Low-poly sphere (8×6 segments = polygonal but UV-mapped for equirectangular texture)
  const globeGeo = new THREE.SphereGeometry(1.5, 8, 6);

  const worldTex = makeWorldMapTexture();

  const globeMat = new THREE.MeshStandardMaterial({
    map: worldTex,
    roughness: 0.7,
    metalness: 0.05,
    emissive: new THREE.Color(0x060e18),
    emissiveIntensity: 0.3,
  });

  const mesh = new THREE.Mesh(globeGeo, globeMat);
  group.add(mesh);

  // Cyan polygon edge overlay (slightly larger to avoid z-fighting)
  const edgeGeo = new THREE.EdgesGeometry(globeGeo);
  const edgeMat = new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.45 });
  group.add(new THREE.LineSegments(edgeGeo, edgeMat));

  // Subtle glow sphere (BackSide)
  const glowGeo = new THREE.SphereGeometry(1.58, 8, 6);
  const glowMat = new THREE.MeshBasicMaterial({
    color: CYAN,
    transparent: true,
    opacity: 0.04,
    side: THREE.BackSide,
  });
  group.add(new THREE.Mesh(glowGeo, glowMat));

  // Tilt slightly so Florida faces toward camera on load
  // Florida is at ~27°N, 83°W → globe rotated so this faces +Z
  group.rotation.y = THREE.MathUtils.degToRad(83 - 90); // bring -83° lon to front

  scene.add(group);
  return { group, mesh, rxs: 0, rys: 0.004, rzs: 0, floatAmp: 0.13, floatSpeed: 0.55 };
}

// ── Public API ─────────────────────────────────────────────────

export function createForegroundShapes(scene) {
  const shapes = [
    createHomeShape(scene),    // 0 — pyramid
    createAboutShape(scene),   // 1 — photo cube
    createWorkShape(scene),    // 2 — company dodecahedron
    null,                      // 3 — Reviews: no shape
    createContactGlobe(scene), // 4 — world map globe
  ];

  const hoverMeshes = [];
  shapes.forEach(s => { if (s && s.mesh) hoverMeshes.push(s.mesh); });

  return { shapes, hoverMeshes };
}

export function showForegroundShape(shapeObj) {
  if (!shapeObj) return;
  gsap.to(shapeObj.group.position, { x: 6.5, duration: 0.9, ease: 'power2.out' });
}

export function hideForegroundShape(shapeObj) {
  if (!shapeObj) return;
  gsap.to(shapeObj.group.position, { x: OFF_X, duration: 0.55, ease: 'power2.in' });
}

export function updateForegroundShapes(shapes, t, currentSection) {
  shapes.forEach((s, i) => {
    if (!s) return;

    s.mesh.rotation.x += s.rxs;
    s.mesh.rotation.y += s.rys;
    s.mesh.rotation.z += s.rzs;

    // Gentle float
    s.group.position.y = REST_Y + Math.sin(t * s.floatSpeed + i * 1.3) * s.floatAmp;
  });
}
