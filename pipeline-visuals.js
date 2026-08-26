// Illustrations for the "How the CAD Stack Fits Together" infographic.
//
// Every picture in that section is generated from ONE parametric part (an
// L-bracket) rendered through ONE camera, so the drawing, the exact solid, the
// tessellated viewport, the hub model, and the format icons all show the same
// object at the same angle. The exact views use a fine tessellation of the
// curves (so they read as smooth B-rep); the mesh views use a coarse one (so
// the triangles are visible) — which is precisely the distinction the section
// is trying to teach.

const PART = {
  W: 80,  // width  (x)
  D: 50,  // depth  (y)
  T: 8,   // plate thickness (base and upright)
  H: 52,  // overall height (z)
  R: 14,  // fillet radius on the upright's top corners
  bore: { x: 40, z: 30, r: 10 },              // Ø20 through the upright
  feet: [{ x: 16, y: 17 }, { x: 64, y: 17 }], // Ø8 mounting holes
  footR: 4
};

const YAW = -32 * Math.PI / 180;
const PITCH = 29 * Math.PI / 180;
const LIGHT = unit([0.25, -0.55, 0.8]);
const SMOOTH_RAD = 40 * Math.PI / 180;

// --- vectors -----------------------------------------------------------------

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function unit(v) {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function newell(pts) {
  const n = [0, 0, 0];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    n[0] += (p[1] - q[1]) * (p[2] + q[2]);
    n[1] += (p[2] - q[2]) * (p[0] + q[0]);
    n[2] += (p[0] - q[0]) * (p[1] + q[1]);
  }
  return unit(n);
}

function arc2(center, r, fromDeg, toDeg, segs) {
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const a = (fromDeg + (toDeg - fromDeg) * i / segs) * Math.PI / 180;
    pts.push([center[0] + r * Math.cos(a), center[1] + r * Math.sin(a)]);
  }
  return pts;
}

function ring3(center, u, v, r, segs) {
  const pts = [];
  for (let i = 0; i < segs; i++) {
    const a = i * 2 * Math.PI / segs;
    pts.push(add(center, add(mul(u, r * Math.cos(a)), mul(v, r * Math.sin(a)))));
  }
  return pts;
}

// --- the part ------------------------------------------------------------------

function buildBracket(fine) {
  const { W, D, T, H, R, bore, feet, footR } = PART;
  const arcSegs = fine ? 10 : 3;
  const boreSegs = fine ? 28 : 12;
  const footSegs = fine ? 20 : 8;
  const X = a => [a, 0, 0];
  const Y = a => [0, a, 0];
  const Z = a => [0, 0, a];

  const faces = [];
  const holes = [];
  const face = pts => {
    const f = { pts, n: newell(pts), holes: [] };
    faces.push(f);
    return f;
  };
  const rect = (o, u, v) => face([o, add(o, u), add(add(o, u), v), add(o, v)]);
  const profile = z0 => [
    [0, z0], [W, z0],
    ...arc2([W - R, H - R], R, 0, 90, arcSegs),
    ...arc2([R, H - R], R, 90, 180, arcSegs)
  ];
  const onY = (y, pts) => pts.map(([x, z]) => [x, y, z]);

  const bottom = rect([0, 0, 0], Y(D), X(W));
  rect([0, 0, 0], X(W), Z(T));                                                   // front of base
  rect([0, 0, 0], Z(T), Y(D - T));                                               // left of base
  face([[0, D - T, 0], [0, D - T, T], [0, D - T, H - R], [0, D, H - R], [0, D, 0]]); // left of upright
  rect([W, 0, 0], Y(D - T), Z(T));                                               // right of base
  face([[W, D - T, 0], [W, D, 0], [W, D, H - R], [W, D - T, H - R], [W, D - T, T]]); // right of upright
  const topLeft = rect([0, 0, T], X(W / 2), Y(D - T));                           // base top, split so each
  const topRight = rect([W / 2, 0, T], X(W / 2), Y(D - T));                      // half owns one foot hole
  const front = face(onY(D - T, profile(T)));                                    // upright front
  const back = face(onY(D, profile(0)).reverse());                               // back
  rect([R, D - T, H], X(W - 2 * R), Y(T));                                       // top

  for (const [cx, from] of [[W - R, 0], [R, 90]]) {                              // fillet strips
    const pts = arc2([cx, H - R], R, from, from + 90, arcSegs);
    for (let i = 0; i < arcSegs; i++) {
      const [x0, z0] = pts[i];
      const [x1, z1] = pts[i + 1];
      face([[x0, D - T, z0], [x0, D, z0], [x1, D, z1], [x1, D - T, z1]]);
    }
  }

  const hole = (capA, centerA, capB, centerB, u, v, r, segs) => {
    const ringA = ring3(centerA, u, v, r, segs);
    const ringB = ring3(centerB, u, v, r, segs);
    capA.holes.push(ringA);
    capB.holes.push(ringB);
    const axis = mul(add(centerA, centerB), 0.5);
    const quads = [];
    for (let i = 0; i < segs; i++) {
      const j = (i + 1) % segs;
      let pts = [ringA[i], ringA[j], ringB[j], ringB[i]];
      let n = newell(pts);
      const mid = mul(add(add(pts[0], pts[1]), add(pts[2], pts[3])), 0.25);
      if (dot(n, sub(axis, mid)) < 0) {
        pts = pts.reverse();
        n = mul(n, -1);
      }
      quads.push({ pts, n });
    }
    holes.push({ caps: [{ face: capA, ring: ringA }, { face: capB, ring: ringB }], quads });
  };

  hole(front, [bore.x, D - T, bore.z], back, [bore.x, D, bore.z], X(1), Z(1), bore.r, boreSegs);
  hole(topLeft, [feet[0].x, feet[0].y, T], bottom, [feet[0].x, feet[0].y, 0], X(1), Y(1), footR, footSegs);
  hole(topRight, [feet[1].x, feet[1].y, T], bottom, [feet[1].x, feet[1].y, 0], X(1), Y(1), footR, footSegs);

  // Edge adjacency, so the exact renderer can draw B-rep style: sharp edges
  // always, smooth (tangent) edges only where they form a silhouette.
  const edges = new Map();
  const key = p => p.map(c => Math.round(c * 1000)).join(',');
  for (const f of faces) {
    for (let i = 0; i < f.pts.length; i++) {
      const a = f.pts[i];
      const b = f.pts[(i + 1) % f.pts.length];
      const ka = key(a);
      const kb = key(b);
      const k = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      let edge = edges.get(k);
      if (!edge) {
        edge = { a, b, faces: [] };
        edges.set(k, edge);
      }
      edge.faces.push(f);
    }
  }
  for (const edge of edges.values()) {
    const [f, g] = edge.faces;
    edge.sharp = edge.faces.length !== 2
      || Math.acos(Math.max(-1, Math.min(1, dot(f.n, g.n)))) > SMOOTH_RAD;
  }

  return { faces, holes, edges: [...edges.values()] };
}

const FINE = buildBracket(true);
const COARSE = buildBracket(false);

// --- camera --------------------------------------------------------------------

const CAM = (() => {
  const cy = Math.cos(YAW);
  const sy = Math.sin(YAW);
  const cp = Math.cos(PITCH);
  const sp = Math.sin(PITCH);
  return {
    project([x, y, z]) {
      const x1 = x * cy - y * sy;
      const y1 = x * sy + y * cy;
      return [x1, -(z * cp + y1 * sp), y1 * cp - z * sp];
    },
    view: [-cp * sy, -cp * cy, sp]
  };
})();

// Maps model space into a screen box. Always measured on the fine model so the
// exact and tessellated views land in exactly the same place.
function fitter(box) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const f of FINE.faces) {
    for (const p of f.pts) {
      const [x, y] = CAM.project(p);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  const s = Math.min(box.w / (maxX - minX), box.h / (maxY - minY));
  const ox = box.x + (box.w - (maxX - minX) * s) / 2 - minX * s;
  const oy = box.y + (box.h - (maxY - minY) * s) / 2 - minY * s;
  const tf = p => {
    const [x, y, d] = CAM.project(p);
    return [x * s + ox, y * s + oy, d];
  };
  tf.bounds = {
    x: minX * s + ox,
    y: minY * s + oy,
    w: (maxX - minX) * s,
    h: (maxY - minY) * s
  };
  return tf;
}

// --- renderers -----------------------------------------------------------------

const fmt = n => (Math.round(n * 10) / 10).toString();
const pathOf = pts => `M${pts.map(p => `${fmt(p[0])} ${fmt(p[1])}`).join('L')}Z`;
const segOf = (a, b) => `M${fmt(a[0])} ${fmt(a[1])}L${fmt(b[0])} ${fmt(b[1])}`;
const visible = f => dot(f.n, CAM.view) > 0.001;

function shade(n, k = 1) {
  const lum = (0.22 + 0.78 * Math.max(0, dot(n, LIGHT))) * k;
  return `color-mix(in srgb,currentColor ${Math.round(12 + 46 * lum)}%,var(--pv-ink))`;
}

// Solid faces are stroked in their own fill colour so adjacent fills don't
// leave anti-aliasing hairlines between them; mesh triangles keep the wire
// stroke from CSS.
const faceStyle = (n, k) => `fill:${shade(n, k)};stroke:${shade(n, k)}`;
const triStyle = (n, k) => `fill:${shade(n, k)}`;

function sortedVisible(model, tf) {
  return model.faces
    .filter(visible)
    .map(f => {
      const pts = f.pts.map(tf);
      return { f, pts, holes: f.holes.map(ring => ring.map(tf)), depth: pts.reduce((s, p) => s + p[2], 0) / pts.length };
    })
    .sort((a, b) => b.depth - a.depth);
}

// Triangulates a convex polygon, or the annulus between it and one hole.
function triangulate(outer, holes) {
  if (holes.length !== 1) {
    return outer.slice(2).map((p, i) => [outer[0], outer[i + 1], p]);
  }
  const hole = holes[0];
  const cx = hole.reduce((s, p) => s + p[0], 0) / hole.length;
  const cy = hole.reduce((s, p) => s + p[1], 0) / hole.length;
  const byAngle = pts => pts
    .map(p => ({ p, a: Math.atan2(p[1] - cy, p[0] - cx) }))
    .sort((u, v) => u.a - v.a);
  const O = byAngle(outer);
  const I = byAngle(hole);
  const TAU = Math.PI * 2;
  const next = (list, i) => (i + 1 < list.length ? list[i + 1].a : list[0].a + TAU);
  const tris = [];
  let i = 0;
  let j = 0;
  while (i < O.length || j < I.length) {
    if (i < O.length && (j >= I.length || next(O, i) <= next(I, j))) {
      tris.push([O[i].p, O[(i + 1) % O.length].p, I[j % I.length].p]);
      i++;
    } else {
      tris.push([O[i % O.length].p, I[(j + 1) % I.length].p, I[j].p]);
      j++;
    }
  }
  return tris;
}

// Bore walls seen through a hole: visible wall quads clipped to the rim.
function renderBores(model, tf, faceRec, id, mesh) {
  let out = '';
  model.holes.forEach((hole, index) => {
    const cap = hole.caps.find(c => c.face === faceRec.f);
    if (!cap) return;
    const other = hole.caps.find(c => c !== cap);
    const rim = cap.ring.map(tf);
    const clipId = `${id}-hole${index}`;
    out += `<clipPath id="${clipId}"><path d="${pathOf(rim)}" /></clipPath><g clip-path="url(#${clipId})">`;
    const n = hole.quads.length;
    let edges = '';
    hole.quads.forEach((quad, i) => {
      const seen = visible(quad);
      if (seen) {
        const pts = quad.pts.map(tf);
        if (mesh) {
          out += `<path class="pv-tri" d="${pathOf([pts[0], pts[1], pts[2]])}" style="${triStyle(quad.n, 0.3)}" />`;
          out += `<path class="pv-tri" d="${pathOf([pts[0], pts[2], pts[3]])}" style="${triStyle(quad.n, 0.3)}" />`;
        } else {
          out += `<path class="pv-face" d="${pathOf(pts)}" style="${faceStyle(quad.n, 0.5)}" />`;
          edges += segOf(tf(other.ring[i]), tf(other.ring[(i + 1) % n]));
        }
      }
      if (!mesh && seen !== visible(hole.quads[(i - 1 + n) % n])) {
        edges += segOf(tf(cap.ring[i]), tf(other.ring[i]));
      }
    });
    if (edges) out += `<path class="pv-edge" d="${edges}" />`;
    out += '</g>';
    if (!mesh) out += `<path class="pv-edge" d="${pathOf(rim)}" />`;
  });
  return out;
}

function renderSolid(tf, id) {
  let out = '';
  for (const rec of sortedVisible(FINE, tf)) {
    out += `<path class="pv-face" fill-rule="evenodd" d="${pathOf(rec.pts)}${rec.holes.map(pathOf).join('')}" style="${faceStyle(rec.f.n, 1)}" />`;
    out += renderBores(FINE, tf, rec, id, false);
  }
  let edges = '';
  for (const edge of FINE.edges) {
    const seen = edge.faces.filter(visible).length;
    if (edge.sharp ? seen > 0 : seen === 1) edges += segOf(tf(edge.a), tf(edge.b));
  }
  return `${out}<path class="pv-edge" d="${edges}" />`;
}

function renderMesh(tf, id) {
  let out = '';
  for (const rec of sortedVisible(COARSE, tf)) {
    for (const tri of triangulate(rec.pts, rec.holes)) {
      out += `<path class="pv-tri" d="${pathOf(tri)}" style="${triStyle(rec.f.n, 0.55)}" />`;
    }
    out += renderBores(COARSE, tf, rec, id, true);
  }
  return out;
}

// Contact shadow: the part's footprint on the ground plane, pushed away from
// the light and blurred.
function shadow(tf, id) {
  const { W, D } = PART;
  const blur = Math.max(1.5, tf.bounds.w * 0.018);
  const footprint = [[-2, -2, 0], [W + 9, -2, 0], [W + 9, D + 7, 0], [-2, D + 7, 0]].map(tf);
  return `<filter id="${id}-blur" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="${fmt(blur)}" /></filter>`
    + `<path class="pv-shadow" filter="url(#${id}-blur)" d="${pathOf(footprint)}" />`;
}

// Floor grid at z = 0, projected with the part's camera, for the viewport view.
function floorGrid(tf) {
  const { W, D } = PART;
  let d = '';
  for (let x = -60; x <= W + 60; x += 20) d += segOf(tf([x, -60, 0]), tf([x, D + 60, 0]));
  for (let y = -60; y <= D + 60; y += 20) d += segOf(tf([-60, y, 0]), tf([W + 60, y, 0]));
  return d;
}

// --- 2D drawing ----------------------------------------------------------------

function renderBlueprint() {
  const { W, D, T, H, R, bore, feet, footR } = PART;
  const s = 1.2;
  const base = 107;  // screen y of z = 0
  const fx = 36;     // front view: x = 0
  const sx = 156;    // side view: y = 0
  const labelY = 34;
  const X = x => fmt(fx + x * s);
  const Zy = z => fmt(base - z * s);
  const Yx = y => fmt(sx + y * s);
  const r = fmt(R * s);
  const hcx = fx + bore.x * s;
  const hcy = base - bore.z * s;
  const hr = bore.r * s;
  const tick = (x, y, dx, dy) => `M${fmt(x)} ${fmt(y)}l${fmt(dx)} ${fmt(dy)}m${fmt(-dx)} ${fmt(-dy)}l${fmt(dx)} ${fmt(-dy)}`;
  const vtick = (x, y, dy) => `M${fmt(x)} ${fmt(y)}l4 ${fmt(dy)}m-4 ${fmt(-dy)}l-4 ${fmt(dy)}`;

  const front = `M${X(0)} ${Zy(0)}H${X(W)}V${Zy(H - R)}A${r} ${r} 0 0 0 ${X(W - R)} ${Zy(H)}H${X(R)}A${r} ${r} 0 0 0 ${X(0)} ${Zy(H - R)}Z`;
  const side = `M${Yx(0)} ${Zy(0)}H${Yx(D)}V${Zy(H)}H${Yx(D - T)}V${Zy(T)}H${Yx(0)}Z`;
  const visibleEdges = `M${X(0)} ${Zy(T)}H${X(W)}`;
  const hidden = [
    ...feet.flatMap(f => [`M${X(f.x - footR)} ${Zy(0)}V${Zy(T)}`, `M${X(f.x + footR)} ${Zy(0)}V${Zy(T)}`]),
    `M${Yx(feet[0].y - footR)} ${Zy(0)}V${Zy(T)}`, `M${Yx(feet[0].y + footR)} ${Zy(0)}V${Zy(T)}`,
    `M${Yx(D - T)} ${Zy(bore.z - bore.r)}H${Yx(D)}`, `M${Yx(D - T)} ${Zy(bore.z + bore.r)}H${Yx(D)}`
  ].join('');
  const centerlines = [
    `M${fmt(hcx)} ${fmt(hcy - hr - 6)}V${fmt(hcy + hr + 6)}`,
    `M${fmt(hcx - hr - 6)} ${fmt(hcy)}H${fmt(hcx + hr + 6)}`,
    ...feet.map(f => `M${X(f.x)} ${Zy(-4)}V${Zy(T + 4)}`),
    `M${Yx(D - T - 5)} ${Zy(bore.z)}H${Yx(D + 5)}`,
    `M${Yx(feet[0].y)} ${Zy(-4)}V${Zy(T + 4)}`
  ].join('');

  const dimY = base + 14;
  const dimX = sx + D * s + 10;
  const dimensions = [
    `M${X(0)} ${fmt(base + 3)}V${fmt(dimY + 3)}M${X(W)} ${fmt(base + 3)}V${fmt(dimY + 3)}M${X(0)} ${fmt(dimY)}H${X(W)}`,
    `M${Yx(0)} ${fmt(base + 3)}V${fmt(dimY + 3)}M${Yx(D)} ${fmt(base + 3)}V${fmt(dimY + 3)}M${Yx(0)} ${fmt(dimY)}H${Yx(D)}`,
    `M${fmt(sx + D * s + 3)} ${Zy(0)}H${fmt(dimX + 3)}M${fmt(sx + D * s + 3)} ${Zy(H)}H${fmt(dimX + 3)}M${fmt(dimX)} ${Zy(0)}V${Zy(H)}`,
    `M${fmt(sx - 3)} ${Zy(0)}H${fmt(sx - 13)}M${fmt(sx - 3)} ${Zy(T)}H${fmt(sx - 13)}M${fmt(sx - 10)} ${fmt(base + 8)}V${fmt(base - T * s - 8)}`
  ].join('');
  const ticks = [
    tick(fx, dimY, 6, -3), tick(fx + W * s, dimY, -6, -3),
    tick(sx, dimY, 6, -3), tick(sx + D * s, dimY, -6, -3),
    vtick(dimX, base, -6), vtick(dimX, base - H * s, 6),
    vtick(sx - 10, base, 5), vtick(sx - 10, base - T * s, -5)
  ].join('');
  const leaders = [
    `M${fmt(hcx + hr * 0.7)} ${fmt(hcy - hr * 0.7)}L${fmt(hcx + 22)} ${fmt(labelY)}h10`,
    `M${fmt(fx + R * s - R * s * 0.7)} ${fmt(base - (H - R) * s - R * s * 0.7)}L${fmt(fx - 8)} ${fmt(labelY)}h-4`
  ].join('');

  return `
      <rect class="pv-frame" x="1" y="1" width="238" height="148" rx="8" />
      <path class="pv-grid" d="M1 30h238M1 59h238M1 89h238M1 118h238M40 1v148M80 1v148M120 1v148M160 1v148M200 1v148" />
      <path class="pv-outline" d="${front}${side}" />
      <path class="pv-line" d="${visibleEdges}" />
      <circle class="pv-cut" cx="${fmt(hcx)}" cy="${fmt(hcy)}" r="${fmt(hr)}" />
      <path class="pv-hidden" d="${hidden}" />
      <path class="pv-centerline" d="${centerlines}" />
      <path class="pv-dimension" d="${dimensions}" />
      <path class="pv-line" d="${ticks}${leaders}" />
      <text x="${X(W / 2)}" y="${fmt(dimY + 11)}">${W}</text>
      <text x="${Yx(D / 2)}" y="${fmt(dimY + 11)}">${D}</text>
      <text x="${fmt(dimX + 9)}" y="${Zy(H / 2)}" transform="rotate(-90 ${fmt(dimX + 9)} ${Zy(H / 2)})">${H}</text>
      <text x="${fmt(sx - 19)}" y="${Zy(T / 2 - 1.5)}">${T}</text>
      <text x="${fmt(hcx + 43)}" y="${fmt(labelY + 3.5)}">Ø${bore.r * 2}</text>
      <text x="${fmt(fx - 22)}" y="${fmt(labelY + 3.5)}">R${R}</text>`;
}

// --- public API -----------------------------------------------------------------

const STAGE_BOX = { x: 18, y: 8, w: 204, h: 118 };
const FORMAT_BOX = { x: 9, y: 4, w: 102, h: 56 };
const cache = new Map();

function svg(kind, viewBox, body, extraClass = '') {
  return `<svg class="pipeline-visual pipeline-visual--${kind}${extraClass}" viewBox="${viewBox}" aria-hidden="true" focusable="false">${body}</svg>`;
}

function build(kind) {
  if (kind === 'blueprint') return svg(kind, '0 0 240 150', renderBlueprint());

  if (kind === 'solid' || kind === 'model') {
    const tf = fitter(STAGE_BOX);
    return svg(kind, '0 0 240 150', `${shadow(tf, `pv-${kind}`)}${renderSolid(tf, `pv-${kind}`)}`);
  }

  if (kind === 'wireframe') {
    const tf = fitter(STAGE_BOX);
    return svg(kind, '0 0 240 150', `
      <rect class="pv-frame" x="1" y="1" width="238" height="148" rx="8" />
      <clipPath id="pv-viewport-clip"><rect x="2" y="2" width="236" height="146" rx="7" /></clipPath>
      <g clip-path="url(#pv-viewport-clip)">
        <path class="pv-grid" d="${floorGrid(tf)}" />
        ${renderMesh(tf, 'pv-wireframe')}
      </g>
      <g class="pv-tools"><circle cx="224" cy="18" r="5" /><path d="m221 18 3-3 3 3m-3-3v7M219 35h10m-5-5v10M220 49l8 8m0-8-8 8" /></g>`);
  }

  if (kind === 'exact') {
    const tf = fitter(FORMAT_BOX);
    return svg(kind, '0 0 120 72', `${shadow(tf, 'pv-exact')}${renderSolid(tf, 'pv-exact')}`);
  }

  if (kind === 'mesh') {
    const tf = fitter(FORMAT_BOX);
    return svg(kind, '0 0 120 72', `${shadow(tf, 'pv-mesh')}${renderMesh(tf, 'pv-mesh')}`);
  }

  return '';
}

function visual(kind) {
  if (!cache.has(kind)) cache.set(kind, build(kind));
  return cache.get(kind);
}

export function pipelineVisual(kind) {
  return visual(kind);
}

export function pipelineFormatVisual(kind) {
  return visual(kind === 'exact' ? 'exact' : 'mesh');
}
