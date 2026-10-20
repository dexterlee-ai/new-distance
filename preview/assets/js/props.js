// Props for the pilot scenes: cups, cards, a result card, speech bubbles, the typed ✕, the 0–100 frame, a seal,
// a clipboard, a phone, furniture, a pier, the AI printer, a road that draws itself, and invisible hit proxies.
// Everything goes through ink(): pencil (style 0) for real things, type (style 1) for what AI makes.
// Units are world units, things stand on y = 0 and face +z unless noted.  Each call makes its own materials, so a
// district can dim or colour one prop without touching another.  Every function returns { group, …handles }.
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { ink, setInst } from './mat.js';
import { ACCENT } from './npr.js';
import { ribbon } from './kit.js';
import { heightAt } from './terrain.js';

const V3 = THREE.Vector3;
const clamp01 = (x) => Math.min(1, Math.max(0, x));

function mesh(geo, mat, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
}
function m4(p = [0, 0, 0], r = [0, 0, 0], s = 1) {
  return new THREE.Matrix4().compose(new V3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new V3(...(Array.isArray(s) ? s : [s, s, s])));
}
/** merge [geometry, matrix?] pairs into one non-indexed geometry with positions and normals */
function merge(list) {
  return mergeGeometries(list.map(([g, m]) => {
    let x = g.index ? g.toNonIndexed() : g.clone();
    for (const k of Object.keys(x.attributes)) if (k !== 'position' && k !== 'normal') x.deleteAttribute(k);
    if (m) x.applyMatrix4(m);
    return x;
  }));
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (r0, r1, h, seg = 16) => new THREE.CylinderGeometry(r0, r1, h, seg);
function worldPt(obj, x, y, z) { obj.updateWorldMatrix(true, false); return obj.localToWorld(new V3(x, y, z)); }

/** set the accent of every ink() material under an object ('lime' | 'teal' | 'red' | … | 'none' or a code) */
export function accent(obj, name = 'none') {
  const a = typeof name === 'string' ? (ACCENT[name] ?? 0) : name;
  obj.traverse((o) => { const u = o.material?.userData?.u; if (u?.uAccent) u.uAccent.value = a; });
  return obj;
}

// ------------------------------------------------------------------ cup

// the tea and the pearls are drawn on the body: a light tone below the fill line, dark dots in a band at the bottom
const CUP_HOOKS = {
  key: 'props-cup-body',
  fOut: /* glsl */`{
  float yy = vLPos.y / uCup.x;
  if (yy < uCup.y) sh *= 0.62;
  if (yy < uCup.z) {
    float ang = atan(vLPos.z, vLPos.x) / 6.2831853 + 0.5;
    vec2 pc = vec2(ang * uCup.w, yy / uCup.z * 2.2);
    vec2 id = floor(pc);
    vec2 f = fract(pc) - 0.5 + (vec2(dHash(id), dHash(id + 7.7)) - 0.5) * 0.26;
    if (length(f * vec2(1.0, 1.2)) < 0.34) sh = 0.05;
  }
}`,
};

/**
 * makeCup({ h = 4 }) — a lidded drink cup (lathe) with a fat straw; h is body + lid, the straw rises 0.26 h above.
 * → { group, body, lid, straw, decalAnchor() (world point on the front, for the flavour name), top(), strawTip(), handle(side), h }
 */
export function makeCup({ h = 4, fill = 0.74, pearls = true } = {}) {
  const hb = 0.84 * h, rb = 0.2 * h, rt = 0.29 * h;
  const rAt = (y) => rb + (rt - rb) * (y / hb);
  const prof = [[0, 0], [rb * 0.95, 0], [rb, 0.012 * h]];
  for (let i = 1; i <= 6; i++) { const y = (i / 6) * hb; prof.push([rAt(y), y]); }
  prof.push([rt * 1.035, hb], [rt * 1.035, hb + 0.012 * h], [0, hb + 0.012 * h]);
  const g = new THREE.Group(); g.name = 'cup';
  const bodyMat = ink({ shade: 1, bias: 0.12, hooks: CUP_HOOKS, uniforms: { uCup: { value: new THREE.Vector4(hb, fill, pearls ? 0.2 : 0, 16) } } });
  const body = mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 32), bodyMat);
  const lidProf = [[rt * 1.05, hb - 0.004 * h], [rt * 1.06, hb + 0.03 * h], [rt * 0.92, hb + 0.07 * h], [rt * 0.55, hb + 0.13 * h], [rt * 0.22, hb + 0.155 * h], [0, h]];
  const lid = mesh(new THREE.LatheGeometry(lidProf.map(([r, y]) => new THREE.Vector2(r, y)), 32), ink({ shade: 1, bias: 0.2 }));
  const sLen = 0.74 * h, tilt = 0.17;
  const strawGeo = cyl(0.036 * h, 0.036 * h, sLen, 10);
  strawGeo.translate(0, sLen / 2, 0);
  const straw = mesh(strawGeo, ink({ shade: 0.55 }));
  straw.position.set(0.03 * h, 0.52 * h, 0);
  straw.rotation.z = tilt;
  g.add(body, lid, straw);
  return {
    group: g, body, lid, straw, h,
    decalAnchor: () => worldPt(g, 0, 0.42 * hb, rAt(0.42 * hb) + 0.02 * h),
    top: () => worldPt(g, 0, h, 0),
    strawTip: () => worldPt(g, 0.03 * h - Math.sin(tilt) * sLen, 0.52 * h + Math.cos(tilt) * sLen, 0),
    /** the point a hand holds: the side of the cup facing the palm */
    handle: (side = 'R') => new V3((side === 'L' ? 1 : -1) * (rAt(0.5 * hb) + 0.01 * h), 0.5 * hb, 0),
  };
}

// ------------------------------------------------------------------ cards

// ONE hook for every card: typed lines on the top face (solid graphite, about 1 px), ragged ends and word gaps.
// The slab's origin is its bottom face; the top sits at y = uCardT.  uCard = (w, d, lines, seed).
// aCardDim: per-instance contour-only dimming for the heap (0 on single cards).
const CARD_HOOKS = {
  key: 'props-card-lines',
  vHead: /* glsl */`attribute float aCardDim;
varying float vCardSeed;
varying float vCardDim;`,
  vPos: /* glsl */`#ifdef USE_INSTANCING
vCardSeed = float(gl_InstanceID) * 1.618 + uCard.w;
#else
vCardSeed = uCard.w;
#endif
vCardDim = aCardDim;`,
  fHead: /* glsl */`varying float vCardSeed;
varying float vCardDim;`,
  fOut: /* glsl */`{
  dm = max(dm, vCardDim);
  if (vLPos.y > uCardT * 0.5 && uCard.z > 0.5) {
    vec2 q = vec2(vLPos.x / uCard.x + 0.5, vLPos.z / uCard.y + 0.5);
    float n = uCard.z;
    float r = (q.y - 0.17) / 0.66 * n;
    float ri = floor(r);
    float pr = max(fwidth(r), 1e-4);
    float lw = max(0.1, pr * 0.62);
    float on = 1.0 - smoothstep(lw, lw + pr, abs(fract(r) - 0.5));
    float xx = (q.x - 0.14) / 0.72;
    float hs = dHash(vec2(ri + 1.0, vCardSeed));
    float endX = ri > n - 1.5 ? 0.36 + 0.3 * hs : 0.8 + 0.18 * hs;
    float wq = xx * (4.0 + 2.0 * hs) + dHash(vec2(ri, vCardSeed + 3.0)) * 3.0;
    on *= step(0.0, xx) * step(xx, endX) * step(0.0, r) * step(r, n) * (1.0 - step(0.84, fract(wq)));
    on *= 1.0 - smoothstep(0.3, 0.5, pr);
    if (on > 0.5) ac = 1.0;
  }
}`,
};
function cardMaterial(w, d, lines, t, seed) {
  return ink({ shade: 1, bias: 0.18, hooks: CARD_HOOKS, uniforms: { uCard: { value: new THREE.Vector4(w, d, lines, seed) }, uCardT: { value: t } } });
}
function cardGeo(w, d, t) {
  const g = box(w, t, d);
  g.translate(0, t / 2, 0);
  g.setAttribute('aCardDim', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count), 1));
  return g;
}

/**
 * makeCard({ w = 1.6, d = 1.1, lines = 3, t = 0.04 }) — a paper slab lying flat (top face +y, origin at its bottom
 * face centre), typed lines along x, the first row at -z.  Hold it facing forward with rot [π/2, 0, 0]: the rows then
 * read top to bottom.  → { group, mesh, material, handle(), top(), size }
 */
let cardSeed = 0;
export function makeCard({ w = 1.6, d = 1.1, lines = 3, t = 0.04, seed } = {}) {
  const g = new THREE.Group(); g.name = 'card';
  const material = cardMaterial(w, d, lines, t, seed ?? (cardSeed++ * 3.17) % 97);
  const m = mesh(cardGeo(w, d, t), material);
  g.add(m);
  return {
    group: g, mesh: m, material, size: { w, d, t },
    /** the near edge's centre: where a hand holds it */
    handle: () => new V3(0, t / 2, d / 2),
    top: () => worldPt(g, 0, t, 0),
  };
}

/**
 * makeCardInstanced(n, { w, d, lines, t }) — n cards in one InstancedMesh (same program as every card).
 * Returns the InstancedMesh itself (add it to a parent, raycast it: hits carry instanceId), carrying the handles
 * group (= the mesh, like every prop's { group }), mesh (= itself), setCard(i, matrix), tint(i, shade, style, accent)
 * (-1 keeps the material's), setDim(i, k) (contour-only dimming per card), size.  setCard keeps the bounds used for
 * raycasting up to date.
 */
export function makeCardInstanced(n, { w = 1.6, d = 1.1, lines = 3, t = 0.04, seed = 0 } = {}) {
  const geo = cardGeo(w, d, t);
  geo.deleteAttribute('aCardDim');
  const dimA = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
  geo.setAttribute('aCardDim', dimA);
  const im = new THREE.InstancedMesh(geo, cardMaterial(w, d, lines, t, seed), n);
  im.name = 'cards';
  im.castShadow = im.receiveShadow = true;
  im.frustumCulled = false;
  // instance colours start as "keep the material's shade, style and accent" (three would fill them with 1 = type)
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col[i * 3] = 1; col[i * 3 + 1] = -1; col[i * 3 + 2] = -1; }
  im.instanceColor = new THREE.InstancedBufferAttribute(col, 3);
  return Object.assign(im, {
    group: im, mesh: im, size: { w, d, t },
    setCard(i, matrix) {
      im.setMatrixAt(i, matrix); im.instanceMatrix.needsUpdate = true;
      im.boundingSphere = null; im.boundingBox = null;        // three caches them for raycasting: re-measure on demand
    },
    tint(i, shade = 1, style = -1, acc = -1) {
      setInst(im, i, shade, style, typeof acc === 'string' ? (ACCENT[acc] ?? 0) : acc);
      im.instanceColor.needsUpdate = true;
    },
    setDim(i, k) { dimA.array[i] = clamp01(k); dimA.needsUpdate = true; },
  });
}

// the result card: a teal hairline frame (about 1.2 px) and faint dotted teal ruling between the rows.
// uRC = (w, d, rows, t).  Flat slab like a card; makeResultCard stands it up.
const RESULT_HOOKS = {
  key: 'props-result-card',
  fOut: /* glsl */`{
  if (vLPos.y > uRC.w * 0.5) {
    vec2 q = vec2(vLPos.x / uRC.x + 0.5, vLPos.z / uRC.y + 0.5);
    vec2 pw = max(fwidth(q), vec2(1e-5));
    vec2 ins = vec2(0.05 * min(uRC.x, uRC.y)) / uRC.xy;
    vec2 dq = min(q - ins, 1.0 - ins - q);
    vec2 dp = abs(dq) / pw;
    float frame = max((1.0 - smoothstep(0.65, 1.25, dp.x)) * step(-pw.y, dq.y), (1.0 - smoothstep(0.65, 1.25, dp.y)) * step(-pw.x, dq.x));
    float n = uRC.z;
    float ry = (q.y - 2.0 * ins.y) / (1.0 - 4.0 * ins.y) * n;
    float py = max(fwidth(ry), 1e-5);
    float dy = abs(ry - floor(ry + 0.5)) / py;
    float px = q.x * uRC.x / 0.16;
    float dots = (1.0 - smoothstep(0.5, 1.0, dy)) * step(fract(px), 0.4) * step(0.5, ry) * step(ry, n - 0.5)
      * step(2.0 * ins.x, q.x) * step(q.x, 1.0 - 2.0 * ins.x) * (1.0 - smoothstep(0.25, 0.4, fwidth(px)));
    if (frame > 0.5 || dots > 0.5) ac = ${ACCENT.teal.toFixed(2)};
  }
}`,
};

/**
 * makeResultCard({ w = 4.2, h = 3.2, rows = 6, lean = 0.12 }) — a larger typed card standing upright (face +z, leaning
 * back by `lean`, origin at its bottom edge), with a teal hairline frame and faint dotted ruling.
 * rowAnchors(n = rows, { align: 'center' | 'left' }) → world points on the face, one per row (for HTML rows).
 * → { group, mesh, material, rowAnchors(n, o), corners(), size }
 */
export function makeResultCard({ w = 4.2, h = 3.2, rows = 6, lean = 0.12, t = 0.06 } = {}) {
  const g = new THREE.Group(); g.name = 'result-card';
  const material = ink({ shade: 1, bias: 0.3, hooks: RESULT_HOOKS, uniforms: { uRC: { value: new THREE.Vector4(w, h, rows, t) } } });
  const geo = box(w, t, h); geo.translate(0, t / 2, 0);
  const m = mesh(geo, material);
  const th = Math.PI / 2 - lean;
  m.rotation.x = th;
  m.position.set(0, (h / 2) * Math.sin(th), -(h / 2) * Math.cos(th));
  g.add(m);
  // a small easel behind, so it can stand on a bench
  const leg = mesh(box(w * 0.12, h * 0.62, t), ink({ shade: 0.9, bias: 0.05 }));
  leg.position.set(0, h * 0.29, -h * 0.25);
  leg.rotation.x = -0.42;
  g.add(leg);
  const ins = 0.05 * Math.min(w, h);
  const face = (x, z) => { m.updateWorldMatrix(true, false); return m.localToWorld(new V3(x, t + 0.002, z)); };
  return {
    group: g, mesh: m, material, size: { w, h, t, rows },
    rowAnchors(n = rows, { align = 'center' } = {}) {
      const z0 = -h / 2 + 2 * ins, z1 = h / 2 - 2 * ins;
      return Array.from({ length: n }, (_, i) => face(align === 'left' ? -w / 2 + 2 * ins : 0, z0 + ((i + 0.5) / n) * (z1 - z0)));
    },
    corners: () => [face(-w / 2, -h / 2), face(w / 2, -h / 2), face(w / 2, h / 2), face(-w / 2, h / 2)],
  };
}

// ------------------------------------------------------------------ bubble, ✕, frame

/**
 * makeBubble({ w = 3.2, h = 2, tail = 'left', t = 0.22 }) — a speech bubble: a rounded box with a tail, flat but thick,
 * paper white with a pencil outline, facing +z, origin at the body's centre.
 * iconSlots(n) → n Object3Ds across the inside (add small geometry to them; userData.size = room for each).
 * → { group, mesh, material, tip() (world), tipLocal, iconSlots(n), size }
 */
export function makeBubble({ w = 3.2, h = 2, tail = 'left', t = 0.22, r } = {}) {
  r = r ?? Math.min(w, h) * 0.32;
  const x0 = -w / 2, x1 = w / 2, y0 = -h / 2, y1 = h / 2;
  const dir = tail === 'right' ? 1 : -1;
  // tail base on the straight part of the bottom edge (kept clear of the rounded corners for tall bubbles)
  const lo = x0 + r + 0.02 * w, hi = x1 - r - 0.02 * w, cl = (x) => Math.min(hi, Math.max(lo, x));
  const a = cl(dir * w * 0.1), b = cl(dir * w * 0.3);
  const tip = new THREE.Vector2(dir * w * 0.36, y0 - h * 0.42);
  const s = new THREE.Shape();
  s.moveTo(x0 + r, y0);
  s.lineTo(Math.min(a, b), y0); s.lineTo(tip.x, tip.y); s.lineTo(Math.max(a, b), y0);
  s.lineTo(x1 - r, y0); s.quadraticCurveTo(x1, y0, x1, y0 + r);
  s.lineTo(x1, y1 - r); s.quadraticCurveTo(x1, y1, x1 - r, y1);
  s.lineTo(x0 + r, y1); s.quadraticCurveTo(x0, y1, x0, y1 - r);
  s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  const bev = Math.min(0.06, t * 0.3);
  const geo = new THREE.ExtrudeGeometry(s, { depth: t - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 10 });
  geo.translate(0, 0, -(t - 2 * bev) / 2);
  geo.computeVertexNormals();
  const g = new THREE.Group(); g.name = 'bubble';
  const material = ink({ shade: 1, bias: 0.32 });
  const m = mesh(geo, material);
  g.add(m);
  const tipLocal = new V3(tip.x, tip.y, 0);
  const slots = new Map();
  return {
    group: g, mesh: m, material, tipLocal, size: { w, h, t },
    tip: () => worldPt(g, tipLocal.x, tipLocal.y, tipLocal.z),
    iconSlots(n) {
      if (slots.has(n)) return slots.get(n);
      const pad = w * 0.12, room = Math.min((w - 2 * pad) / n * 0.86, h * 0.62);
      const list = Array.from({ length: n }, (_, i) => {
        const o = new THREE.Group(); o.name = `slot${i}`;
        o.position.set(x0 + pad + ((i + 0.5) / n) * (w - 2 * pad), 0, t / 2 + 0.04);
        o.userData.size = room;
        g.add(o);
        return o;
      });
      slots.set(n, list);
      return list;
    },
  };
}

/**
 * makeX({ size = 2.4 }) — a typed ✕: two crossed slabs in type (style 1), red, with a thin graphite rim behind so the
 * mark keeps its shape on a busy or red ground; facing +z, origin at its centre.  → { group, mesh, rim, material }
 */
export function makeX({ size = 2.4, w, t = 0.36, accent: acc = 'red', shade = 0.3, rim: rimW } = {}) {
  w = w ?? size * 0.24;
  rimW = rimW ?? size * 0.035;
  const L = size * Math.SQRT2 * 0.82;
  const cross = (l, ww, tt, z) => merge([[box(l, ww, tt), m4([0, 0, z], [0, 0, Math.PI / 4])], [box(l, ww, tt * 1.04), m4([0, 0, z], [0, 0, -Math.PI / 4])]]);
  const material = ink({ style: 1, shade, accent: acc });
  const g = new THREE.Group(); g.name = 'x';
  const m = mesh(cross(L, w, t, 0), material);
  const rim = mesh(cross(L + 2 * rimW, w + 2 * rimW, t * 0.5, -t * 0.4), ink({ accent: 'ink' }), { cast: false });
  g.add(m, rim);
  return { group: g, mesh: m, rim, material };
}

/**
 * makeFrame({ h = 6, w = 2.4 }) — the 0–100 frame: a teal typed hairline rectangle with ten tick marks on the left,
 * no digits.  Stands in the xy plane facing +z, origin at its bottom centre.
 * level(k) → local y for k (0 … 1); point(k) → world point at that level on the frame's axis.
 */
export function makeFrame({ h = 6, w = 2.4, t = 0.075, ticks = 10, accent: acc = 'teal' } = {}) {
  const parts = [
    [box(t, h + t, t), m4([-w / 2, h / 2, 0])], [box(t, h + t, t), m4([w / 2, h / 2, 0])],
    [box(w + t, t, t), m4([0, 0, 0])], [box(w + t, t, t), m4([0, h, 0])],
  ];
  for (let i = 1; i < ticks; i++) {
    const len = (i * 2 === ticks ? 0.36 : 0.2) * (w / 2.4);
    parts.push([box(len, t * 0.9, t), m4([-w / 2 - len / 2, (i / ticks) * h, 0])]);
  }
  // type, but kept light (shade 0.72 … 1): its glyphs are the ramp's punctuation ( . , : ; - ), so the thin bars and
  // ticks read as a typed teal hairline; at mid shade the ticks would print as letters (t s n e d D) beside the column
  const material = ink({ style: 1, shade: 0.28, bias: 0.72, accent: acc });
  const g = new THREE.Group(); g.name = 'frame';
  const m = mesh(merge(parts), material, { cast: false });
  g.add(m);
  return {
    group: g, mesh: m, material, size: { w, h },
    level: (k) => clamp01(k) * h,
    point: (k) => worldPt(g, 0, clamp01(k) * h, 0),
  };
}

// ------------------------------------------------------------------ hand-held things

/** makeSeal({ r = 0.35, h = 0.6 }) — a cylinder seal with a knob, origin at its stamping face.  → { group, mesh, material, handle(), face() } */
export function makeSeal({ r = 0.35, h = 0.6 } = {}) {
  const knobY = h * 1.62 + r * 0.32;
  const geo = merge([
    [cyl(r, r * 1.05, h, 22), m4([0, h / 2, 0])],
    [cyl(r * 0.46, r * 0.8, h * 0.26, 18), m4([0, h * 1.13, 0])],
    [cyl(r * 0.24, r * 0.32, h * 0.34, 12), m4([0, h * 1.42, 0])],
    [new THREE.SphereGeometry(r * 0.44, 16, 12), m4([0, knobY, 0])],
  ]);
  const material = ink({ shade: 0.86, bias: 0.04 });
  const g = new THREE.Group(); g.name = 'seal';
  const m = mesh(geo, material);
  g.add(m);
  return { group: g, mesh: m, material, size: { r, h }, handle: () => new V3(0, knobY, 0), face: () => worldPt(g, 0, 0, 0) };
}

/**
 * makeClipboard({ w = 1.2, h = 1.6 }) — upright, facing +z, origin at its bottom edge; a typed sheet (the card hook)
 * under a dark clip.  → { group, board, sheet, clip, handle() }
 */
export function makeClipboard({ w = 1.2, h = 1.6, t = 0.07, lines = 4 } = {}) {
  const g = new THREE.Group(); g.name = 'clipboard';
  const board = mesh(box(w, h, t), ink({ shade: 0.78, bias: 0.02 }));
  board.position.set(0, h / 2, 0);
  const sw = w * 0.84, sh = h * 0.8, st = 0.02;
  const sheet = mesh(cardGeo(sw, sh, st), cardMaterial(sw, sh, lines, st, 41));
  sheet.rotation.x = Math.PI / 2;
  sheet.position.set(0, h * 0.46, t / 2);
  const clip = mesh(merge([[box(w * 0.42, h * 0.09, t * 1.9), m4([0, 0, 0])], [new THREE.TorusGeometry(w * 0.07, w * 0.022, 6, 12), m4([0, h * 0.06, 0])]]), ink({ shade: 0.32 }));
  clip.position.set(0, h * 0.94, t * 0.4);
  g.add(board, sheet, clip);
  return { group: g, board, sheet, clip, size: { w, h, t }, handle: () => new V3(0, h * 0.1, -t / 2) };
}

/** makePhone({ h = 0.62 }) — upright, screen facing +z, origin at its bottom edge.  → { group, body, screen, handle(), screenAnchor() } */
export function makePhone({ h = 0.62, w, t } = {}) {
  w = w ?? h * 0.5; t = t ?? h * 0.08;
  const g = new THREE.Group(); g.name = 'phone';
  const body = mesh(box(w, h, t), ink({ shade: 0.55 }));
  body.position.y = h / 2;
  const screen = mesh(box(w * 0.84, h * 0.84, t * 0.2), ink({ shade: 1, bias: 0.15 }), { cast: false });
  screen.position.set(0, h / 2, t / 2 + t * 0.06);
  g.add(body, screen);
  return { group: g, body, screen, size: { w, h, t }, handle: () => new V3(0, h * 0.32, -t / 2), screenAnchor: () => worldPt(g, 0, h / 2, t * 0.7) };
}

// ------------------------------------------------------------------ furniture, ground

/**
 * makeTable({ w = 3, d = 10, h = 0.9, round = false, r }) — pencil table, origin on the floor under its centre.
 * Defaults: the judge's long low table (3 × 0.9 × 10).  round: a round table of radius r on a pedestal.
 * → { group, mesh, material, topY, surface(x, z) (world point on the top) }
 */
export function makeTable({ w = 3, d = 10, h = 0.9, round = false, r, top = 0.14, leg } = {}) {
  const parts = [];
  if (round) {
    r = r ?? w / 2;
    parts.push([cyl(r, r, top, 40), m4([0, h - top / 2, 0])]);
    parts.push([cyl(r * 0.1, r * 0.13, h - top, 12), m4([0, (h - top) / 2, 0])]);
    parts.push([cyl(r * 0.42, r * 0.46, 0.08, 24), m4([0, 0.04, 0])]);
  } else {
    leg = leg ?? Math.min(0.3, Math.max(0.1, Math.min(w, d) * 0.07));
    parts.push([box(w, top, d), m4([0, h - top / 2, 0])]);
    const ix = w / 2 - leg * 1.2, iz = d / 2 - leg * 1.2;
    const nz = d > 4 * w ? 3 : 2;
    for (const sx of [-1, 1]) for (let j = 0; j < nz; j++) {
      const z = -iz + (2 * iz * j) / (nz - 1);
      parts.push([box(leg, h - top, leg), m4([sx * ix, (h - top) / 2, z])]);
    }
  }
  const material = ink({ shade: 0.95, bias: 0.06 });
  const g = new THREE.Group(); g.name = 'table';
  const m = mesh(merge(parts), material);
  g.add(m);
  return { group: g, mesh: m, material, topY: h, size: { w, d, h, r }, surface: (x = 0, z = 0) => worldPt(g, x, h, z) };
}

/** makeBench({ w = 8, d = 1.6, h = 2.5 }) — a plank on two trestles (the core's display bench).  → { group, mesh, material, topY, surface(x, z) } */
export function makeBench({ w = 8, d = 1.6, h = 2.5, top = 0.24 } = {}) {
  const lx = w / 2 - Math.min(0.8, w * 0.12);
  const parts = [[box(w, top, d), m4([0, h - top / 2, 0])]];
  for (const sx of [-1, 1]) parts.push([box(0.26, h - top, d * 0.82), m4([sx * lx, (h - top) / 2, 0])]);
  parts.push([box(2 * lx, 0.16, 0.16), m4([0, (h - top) * 0.32, 0])]);
  const material = ink({ shade: 0.95, bias: 0.08 });
  const g = new THREE.Group(); g.name = 'bench';
  const m = mesh(merge(parts), material);
  g.add(m);
  return { group: g, mesh: m, material, topY: h, size: { w, d, h }, surface: (x = 0, z = 0) => worldPt(g, x, h, z) };
}

/** makeStool({ h = 1.1, r = 0.42 }) — a round three-legged stool; h matches person.seatH of a 4.5-unit figure.  → { group, mesh, material, topY } */
export function makeStool({ h = 1.1, r = 0.42 } = {}) {
  const parts = [[cyl(r, r * 0.94, 0.12, 24), m4([0, h - 0.06, 0])]];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    const top = new V3(Math.cos(a) * r * 0.62, h - 0.12, Math.sin(a) * r * 0.62);
    const bot = new V3(Math.cos(a) * r * 1.02, 0, Math.sin(a) * r * 1.02);
    const len = top.distanceTo(bot), mid = top.clone().add(bot).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), top.clone().sub(bot).normalize());
    parts.push([cyl(0.05, 0.05, len, 6), new THREE.Matrix4().compose(mid, q, new V3(1, 1, 1))]);
  }
  parts.push([new THREE.TorusGeometry(r * 0.84, 0.035, 5, 24), m4([0, h * 0.34, 0], [Math.PI / 2, 0, 0])]);
  const material = ink({ shade: 0.92, bias: 0.06 });
  const g = new THREE.Group(); g.name = 'stool';
  const m = mesh(merge(parts), material);
  g.add(m);
  return { group: g, mesh: m, material, topY: h };
}

/** makeDais({ w = 10, d = 4, h = 1.2 }) — a low platform with an overhanging top.  → { group, mesh, material, topY } */
export function makeDais({ w = 10, d = 4, h = 1.2 } = {}) {
  const lip = Math.min(0.14, h * 0.2);
  const geo = merge([[box(w, h - lip, d), m4([0, (h - lip) / 2, 0])], [box(w + 0.18, lip, d + 0.18), m4([0, h - lip / 2, 0])]]);
  const material = ink({ shade: 1, bias: 0.12 });
  const g = new THREE.Group(); g.name = 'dais';
  const m = mesh(geo, material);
  g.add(m);
  return { group: g, mesh: m, material, topY: h, size: { w, d, h } };
}

/**
 * makePier({ len = 6, w = 2.4, depth = 3.2 }) — a plank pier from the origin out along +x, deck top at y = 0,
 * posts going down `depth`.  → { group, mesh, material, end() (world point at the far end of the deck) }
 */
export function makePier({ len = 6, w = 2.4, depth = 3.2 } = {}) {
  const parts = [];
  const pitch = 0.42, pw = 0.35, n = Math.max(2, Math.round(len / pitch));
  for (let i = 0; i < n; i++) parts.push([box(pw, 0.12, w), m4([(i + 0.5) * (len / n), -0.06, 0])]);
  for (const sz of [-1, 1]) parts.push([box(len, 0.2, 0.18), m4([len / 2, -0.22, sz * (w / 2 - 0.22)])]);
  const xs = [0.25, len / 2, len - 0.25];
  for (const x of xs) for (const sz of [-1, 1]) {
    const top = x === xs[2] ? 0.5 : -0.1;
    parts.push([cyl(0.13, 0.15, depth + top, 8), m4([x, (top - depth) / 2, sz * (w / 2 - 0.08)])]);
  }
  const material = ink({ shade: 0.9, bias: 0.05 });
  const g = new THREE.Group(); g.name = 'pier';
  const m = mesh(merge(parts), material);
  g.add(m);
  return { group: g, mesh: m, material, size: { len, w }, end: () => worldPt(g, len, 0, 0) };
}

/**
 * makePrinter({ w = 3.2, h = 2.6, d = 2.4 }) — the AI printer: a typed box (style 1), output slot and tray facing +x.
 * Set teal with accent(printer.group, 'teal') when it is emphasised.
 * slot() → local point at the slot mouth (cards come out here); decalAnchor(face = '+z') → world point for 「AI」.
 * → { group, body, slotMesh, slot(), slotWorld(), decalAnchor(face) }
 */
export function makePrinter({ w = 3.2, h = 2.6, d = 2.4 } = {}) {
  const g = new THREE.Group(); g.name = 'printer';
  const typed = ink({ style: 1, shade: 0.66 });
  const body = mesh(merge([
    [box(w, h * 0.9, d), m4([0, h * 0.45, 0])],
    [box(w * 0.96, h * 0.1, d * 0.96), m4([-w * 0.02, h * 0.95, 0])],                 // lid
    [box(w * 0.5, 0.08, d * 0.72), m4([-w * 0.3, h * 1.07, 0], [0, 0, 0.42])],         // paper feed at the back
    [box(0.85, 0.07, d * 0.62), m4([w / 2 + 0.4, h * 0.42, 0], [0, 0, -0.1])],          // output tray
  ]), typed);
  const slotY = h * 0.6;
  const slotMesh = mesh(box(0.08, 0.17, d * 0.68), ink({ style: 1, shade: 0.08 }), { cast: false });
  slotMesh.position.set(w / 2 + 0.03, slotY, 0);
  g.add(body, slotMesh);
  const slotL = new V3(w / 2 + 0.1, slotY, 0);
  const faces = { '+x': [w / 2 + 0.02, h * 0.3, 0], '-x': [-w / 2 - 0.02, h * 0.55, 0], '+z': [0, h * 0.55, d / 2 + 0.02], '-z': [0, h * 0.55, -d / 2 - 0.02] };
  return {
    group: g, body, slotMesh, material: typed, size: { w, h, d },
    slot: () => slotL.clone(),
    slotWorld: () => worldPt(g, slotL.x, slotL.y, slotL.z),
    decalAnchor: (face = '+z') => worldPt(g, ...(faces[face] || faces['+z'])),
  };
}

/**
 * kit.ribbon's shape with the ground given as a function: ground(x, z) → the lowest y allowed at a local point
 * (null: the points' own heights).  For decks above the ground, lab pages, and roads built in a district's frame.
 */
function flatRibbon(points, width, lift, seg, ground = null) {
  const c = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const pos = [], idx = [], up = new V3(0, 1, 0), side = new V3();
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, p = c.getPointAt(t), tg = c.getTangentAt(t);
    side.crossVectors(tg, up).normalize().multiplyScalar(width / 2);
    for (const s of [-1, 1]) {
      const x = p.x + side.x * s, z = p.z + side.z * s;
      pos.push(x, (ground ? Math.max(p.y, ground(x, z)) : p.y) + lift, z);
    }
    if (i < seg) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return { geo, curve: c };
}

/** the terrain height under a point given in a frame (a district group: rotation about y and translation), in that frame */
function groundIn(frame) {
  const M = frame.isMatrix4 ? frame.clone() : (frame.updateMatrixWorld(true), frame.matrixWorld.clone());
  const ty = M.elements[13], v = new V3();
  return (x, z) => { v.set(x, 0, z).applyMatrix4(M); return heightAt(v.x, v.z) - ty; };
}

/**
 * makeRoad(points, width = 1.6, { lift = 0.12, hug = true, accent, shade = 0.62 }) — a ribbon road that rises over the
 * terrain where the terrain is above the points.  hug says which frame the points are in:
 *   true          world coordinates (kit.ribbon; keep the road's group at the world origin);
 *   an Object3D   that object's frame, e.g. the district group the road is added to (its matrixWorld is read now, so
 *                 position and turn the group first; rotation about y and translation only);
 *   false         no terrain: the points' own heights.
 * draw(k) reveals 0 … k of its length from the first point.
 * → { group, mesh, material, curve, length, draw(k), pointAt(k) (local, on the road's surface) }
 */
export function makeRoad(points, width = 1.6, { lift = 0.12, hug = true, accent: acc = 0, shade = 0.62, seg } = {}) {
  const pts = points.map((p) => (p.isVector3 ? p.clone() : new V3(...p)));
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += pts[i].distanceTo(pts[i - 1]);
  seg = seg ?? Math.min(600, Math.max(40, Math.ceil(L * 5)));
  const ground = !hug ? null : (hug.isObject3D || hug.isMatrix4) ? groundIn(hug) : heightAt;
  const { geo, curve } = hug === true ? ribbon(pts, width, lift, seg) : flatRibbon(pts, width, lift, seg, ground);
  // kit.ribbon winds its triangles facing down: draw both sides (three flips the normal for the back face)
  const material = ink({ shade, bias: 0.02, accent: acc, side: THREE.DoubleSide });
  const g = new THREE.Group(); g.name = 'road';
  const m = mesh(geo, material, { cast: false });
  g.add(m);
  const draw = (k = 1) => { geo.setDrawRange(0, Math.round(clamp01(k) * seg) * 6); };
  draw(1);
  // a point on the road's surface (local): over terrain the ribbon rises to the ground, and so does this point
  const pointAt = (k) => {
    const p = curve.getPointAt(clamp01(k));
    if (ground) p.y = Math.max(p.y, ground(p.x, p.z));
    p.y += lift;
    return p;
  };
  return { group: g, mesh: m, material, curve, length: curve.getLength(), draw, pointAt };
}

// ------------------------------------------------------------------ picking

const HIT_MAT = new THREE.MeshBasicMaterial({ visible: false });   // never drawn (not even into shadows), still raycast
const _ib = new THREE.Box3(), _im = new THREE.Matrix4(), _inv = new THREE.Matrix4();
function localBox(obj, out) {
  obj.updateWorldMatrix(true, true);
  _inv.copy(obj.matrixWorld).invert();
  out.makeEmpty();
  obj.traverse((o) => {
    if (!o.isMesh || o.userData.hitProxy || !o.geometry) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const gb = o.geometry.boundingBox;
    if (o.isInstancedMesh) {
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, _im);
        out.union(_ib.copy(gb).applyMatrix4(_im.premultiply(o.matrixWorld).premultiply(_inv)));
      }
    } else out.union(_ib.copy(gb).applyMatrix4(_im.multiplyMatrices(_inv, o.matrixWorld)));
  });
  if (out.isEmpty()) out.set(new V3(-0.5, -0.5, -0.5), new V3(0.5, 0.5, 0.5));
  return out;
}

/**
 * makeHitProxy(object3D, pad = 0.5) → an invisible box mesh (material.visible = false: not drawn, still raycast),
 * the object's local bounding box grown by pad on every side, added as a child of the object so it follows it.
 * userData.hitProxy = true (skip it when raycasting for geometry); userData.refit() re-measures after a big change.
 */
export function makeHitProxy(object3D, pad = 0.5) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), HIT_MAT);
  m.name = 'hit:' + (object3D.name || 'part');
  m.userData.hitProxy = true;
  m.castShadow = m.receiveShadow = false;
  const b = new THREE.Box3(), size = new V3(), c = new V3();
  const refit = () => {
    const parent = m.parent; if (parent) parent.remove(m);
    localBox(object3D, b);
    b.getSize(size); b.getCenter(c);
    m.scale.set(size.x + 2 * pad, size.y + 2 * pad, size.z + 2 * pad);
    m.position.copy(c);
    object3D.add(m);
    m.updateMatrixWorld(true);
    return m;
  };
  m.userData.refit = refit;
  return refit();
}
