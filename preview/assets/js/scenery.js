// The world's own environment for the map looks (?look=a|b|c, look.js): what the ground is used for, the woods and
// villages of the consumers' land, the harbours and towns of the brands' shore, the water's depth, and the small life
// that belongs to those places — boats moored at the piers, buoys on the channel, smoke from chimneys, sails of the
// windmills, birds over the shore, lamps.  None of it is the book's content: it is the place the districts stand in.
// Every part is a paint slot (look.js), so each look colours the same world its own way.
//
// Draw calls: one merged mesh for the one-off structures (piers, cranes, lighthouses, windmill towers, factories,
// islets) and one InstancedMesh per repeated kind; the life moves in the vertex shader (no per-frame JS).
// Interface: buildScenery(D, { life }) → { group, update(), counts } | null without a look.
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { ink, CLOCK, FOCUS } from './mat.js';
import { LOOK, LOOK_DEF, LOOK_U, P } from './look.js';
import { heightAt, SEA_Y, LAND, inDock } from './terrain.js';
import { rng } from './kit.js';

const V3 = THREE.Vector3, M4 = THREE.Matrix4, Q = THREE.Quaternion;
const TAU = Math.PI * 2, YAX = new V3(0, 1, 0);
const rad = (d) => (d * Math.PI) / 180;

// ------------------------------------------------------------------ materials
// every scenery vertex carries aPart (0, 1, 2: which of the instance's three paints it takes; 3: a door, always the
// door's paint); instances (or merged vertices) carry aPaint (three slots)
const PART_PAINT = `vPn = aPart < 0.5 ? aPaint.x : (aPart < 1.5 ? aPaint.y : (aPart < 2.5 ? aPaint.z : ${P.door.toFixed(1)}));`;
// the surface of what is built, seen close: roofs laid in courses of tiles (a thin shadow under each course)
const SURFACE = `
  if (vPn > ${(P.roof - 0.5).toFixed(1)} && vPn < ${(P.roof3 + 0.5).toFixed(1)}) {
    float rw = fract(vWPos.y * 2.7 + 0.25);
    sh *= 0.9 + 0.1 * smoothstep(0.0, 0.16, rw);
  }`;
const STATIC_HOOKS = {
  key: 'scenery',
  vHead: 'attribute vec3 aPaint; attribute float aPart; varying float vPn;',
  vPos: PART_PAINT,
  fHead: 'varying float vPn;',
  fOut: `pn = vPn;${SURFACE}`,
};
// the life of the places, in the vertex shader (aAnim.x: 1 bob · 2 spin · 3 bird · 4 smoke; y: phase; z, w: params)
// In a district (uCalm → 1) the birds fly off and the smoke settles: the environment holds still behind the story.
const ANIM_HOOKS = {
  key: 'scenery-anim',
  vHead: 'attribute vec3 aPaint; attribute float aPart; attribute vec4 aAnim; varying float vPn; varying float vFade;',
  vPos: `
    ${PART_PAINT}
    vFade = 1.0;
    float tt = uTime + aAnim.y;
    if (aAnim.x < 1.5) {
      // moored: a slow heave, roll and pitch
      float rl = sin(tt * 1.3) * 0.07, pt = sin(tt * 0.9 + 1.0) * 0.035;
      transformed.yz = mat2(cos(rl), sin(rl), -sin(rl), cos(rl)) * transformed.yz;
      transformed.xy = mat2(cos(pt), sin(pt), -sin(pt), cos(pt)) * transformed.xy;
      transformed.y += sin(tt * 1.1) * 0.09;
    } else if (aAnim.x < 2.5) {
      // windmill sails: about the hub (local z)
      float a = tt * aAnim.z;
      transformed.xy = mat2(cos(a), sin(a), -sin(a), cos(a)) * transformed.xy;
    } else if (aAnim.x < 3.5) {
      // a bird of a flock: wings beat; it circles the flock's centre (radius |z|, its sign the way round, height w)
      transformed.y += sin(tt * 7.0 + aAnim.y) * 0.5 * abs(transformed.z);
      float dir = sign(aAnim.z), rr = abs(aAnim.z);
      float a = tt * 0.3 * dir;
      float hd = a + dir * 1.5708;
      transformed.xz = mat2(cos(hd), sin(hd), -sin(hd), cos(hd)) * transformed.xz;
      transformed *= 1.0 - uCalm;
      transformed += vec3(cos(a) * rr, aAnim.w + sin(tt * 0.6) * 0.9, sin(a) * rr);
    } else {
      // a puff of smoke: rises and swells, drifting downwind, and melts away (by its size: a solid puff, no
      // screen-door fade, so it never turns to grey speckle)
      float k = fract(tt * aAnim.z);
      transformed *= (0.35 + 1.45 * k) * (1.0 - smoothstep(0.55, 1.0, k)) * (1.0 - uCalm);
      transformed += vec3(0.45 * k * k * aAnim.w, k * aAnim.w, 0.2 * k * k * aAnim.w);
    }
  `,
  fHead: 'varying float vPn; varying float vFade;',
  fOut: 'pn = vPn; op *= vFade;',
};

// ------------------------------------------------------------------ geometry (unit: world units, feet at y = 0)
/** non-indexed, positions + normals only, every vertex tagged with part k */
function part(geo, k) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const n of Object.keys(g.attributes)) if (n !== 'position' && n !== 'normal') g.deleteAttribute(n);
  if (!g.attributes.normal) g.computeVertexNormals();
  g.setAttribute('aPart', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count).fill(k), 1));
  return g;
}
const at = (g, x = 0, y = 0, z = 0, ry = 0, s = [1, 1, 1]) => g.applyMatrix4(new M4().compose(new V3(x, y, z), new Q().setFromAxisAngle(YAX, ry), new V3(...s)));
const merge = (list) => mergeGeometries(list);
/** a gabled roof: ridge along x, from x0 to x1, eaves at ±hw (z), from y0 up by rh */
function gable(x0, x1, hw, y0, rh) {
  const s = new THREE.Shape();
  s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(0, rh); s.lineTo(-hw, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: x1 - x0, bevelEnabled: false });
  // the shape lies in x-y (its x is our z, its y is up), extruded along +z: turn it so the ridge runs along x
  g.rotateY(Math.PI / 2);
  g.translate(x0, y0, 0);
  return g;
}
const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

/** a village house: walls (0), a gabled roof and its chimney (1), windows and door (2) */
function houseGeo() {
  const w = 3.0, d = 2.4, h = 1.9, sink = 0.9;
  const walls = part(box(w, h + sink, d, 0, (h - sink) / 2, 0), 0);
  const roof = part(merge([part(gable(-w / 2 - 0.25, w / 2 + 0.25, d / 2 + 0.32, h, 1.3), 1), part(box(0.36, 1.0, 0.36, 0.85, h + 0.95, -0.35), 1)]), 1);
  const wins = [];
  for (const sz of [-1, 1]) for (const x of [-0.8, 0.8]) wins.push(part(box(0.52, 0.56, 0.08, x, 1.08, sz * (d / 2 + 0.02)), 2));
  wins.push(part(box(0.08, 0.5, 0.5, w / 2 + 0.02, 1.15, 0), 2), part(box(0.08, 0.5, 0.5, -w / 2 - 0.02, 1.15, 0), 2));
  // the front door, between the two front windows, under a small hood
  const door = [part(box(0.56, 1.05, 0.1, 0, 0.52, d / 2 + 0.03), 3), part(box(0.82, 0.08, 0.34, 0, 1.15, d / 2 + 0.12), 1)];
  return merge([walls, roof, ...wins, ...door]);
}
/** a warehouse on the quay: long walls (0), a low roof (1), its big doors and high windows (2) */
function shedGeo() {
  const w = 7.6, d = 3.6, h = 2.7, sink = 1.0;
  const walls = part(box(w, h + sink, d, 0, (h - sink) / 2, 0), 0);
  const roof = part(gable(-w / 2 - 0.2, w / 2 + 0.2, d / 2 + 0.25, h, 0.95), 1);
  const o = [];
  for (const sz of [-1, 1]) {
    o.push(part(box(1.6, 1.9, 0.08, -1.9, 0.95, sz * (d / 2 + 0.02)), 3), part(box(1.6, 1.9, 0.08, 1.9, 0.95, sz * (d / 2 + 0.02)), 3));
    for (let i = 0; i < 4; i++) o.push(part(box(0.7, 0.36, 0.08, -2.7 + i * 1.8, 2.25, sz * (d / 2 + 0.02)), 2));
  }
  return merge([walls, roof, ...o]);
}
/** an office block: walls (0), its roof slab (1), rows of windows (2) */
function towerGeo() {
  const w = 3.2, h = 5.6, sink = 1.0;
  const walls = part(box(w, h + sink, w, 0, (h - sink) / 2, 0), 0);
  const roof = part(merge([part(box(w + 0.3, 0.3, w + 0.3, 0, h + 0.15, 0), 1), part(box(1.0, 0.7, 1.0, 0.5, h + 0.6, -0.4), 1)]), 1);
  const o = [part(box(0.8, 1.1, 0.1, 0, 0.55, w / 2 + 0.03), 3)];
  for (let f = 0; f < 3; f++) for (let i = -1; i <= 1; i++) {
    const y = 1.2 + f * 1.55, x = i * 0.95;
    if (f === 0 && i === 0) { o.push(part(box(0.62, 0.7, 0.08, x, y, -w / 2 - 0.02), 2)); continue; }
    o.push(part(box(0.62, 0.7, 0.08, x, y, w / 2 + 0.02), 2), part(box(0.62, 0.7, 0.08, x, y, -w / 2 - 0.02), 2));
    o.push(part(box(0.08, 0.7, 0.62, w / 2 + 0.02, y, x), 2), part(box(0.08, 0.7, 0.62, -w / 2 - 0.02, y, x), 2));
  }
  return merge([walls, roof, ...o]);
}
/** a broad-leaved tree: crown (0), trunk (1) */
function treeGeo() {
  const crown = part(new THREE.IcosahedronGeometry(1.3, 1).scale(1, 0.92, 1).translate(0, 2.35, 0), 0);
  const top = part(new THREE.IcosahedronGeometry(0.8, 0).translate(0.35, 3.15, 0.2), 0);
  const trunk = part(new THREE.CylinderGeometry(0.16, 0.22, 1.5, 5).translate(0, 0.55, 0), 1);
  return merge([crown, top, trunk]);
}
/** a pine: two cones (0), trunk (1) */
function pineGeo() {
  const a = part(new THREE.ConeGeometry(1.15, 2.4, 7).translate(0, 2.0, 0), 0);
  const b = part(new THREE.ConeGeometry(0.82, 1.9, 7).translate(0, 3.3, 0), 0);
  const trunk = part(new THREE.CylinderGeometry(0.14, 0.18, 1.2, 5).translate(0, 0.4, 0), 1);
  return merge([a, b, trunk]);
}
/** a small working boat, bow toward +x, waterline at y = 0: hull (0), wheelhouse and mast (1) */
function boatGeoW() {
  const hull = new THREE.BoxGeometry(3.0, 0.75, 1.2, 4, 1, 1);
  const p = hull.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const bow = Math.max(0, (x - 0.55) / 0.95);           // the bow narrows to a stem
    const keel = y < 0 ? 0.55 : 1;                        // and the bottom is narrower than the deck
    p.setXYZ(i, x + (y > 0 && x > 1.2 ? 0.18 : 0), y + 0.12, z * (1 - 0.9 * bow) * keel);
  }
  hull.computeVertexNormals();
  const cab = part(box(0.95, 0.75, 0.82, -0.45, 0.85, 0), 1);
  const mast = part(box(0.09, 2.1, 0.09, 0.45, 1.5, 0), 1);
  return merge([part(hull, 0), cab, mast]);
}
/** a channel buoy, its foot at the waterline: body (0), its light (1) */
function buoyGeo() {
  return merge([part(new THREE.ConeGeometry(0.55, 1.5, 8).translate(0, 0.55, 0), 0), part(new THREE.CylinderGeometry(0.62, 0.62, 0.35, 8).translate(0, -0.05, 0), 0),
    part(new THREE.SphereGeometry(0.26, 8, 6).translate(0, 1.45, 0), 1)]);
}
/** a bird, wings spread along z, nose toward +x (about 1.6 across) */
function birdGeo() {
  const g = new THREE.BufferGeometry();
  const v = [
    0.35, 0, 0, -0.3, 0.05, 0, 0, 0.02, 0.8,     // left wing (toward +z)
    -0.3, 0.05, 0, 0.35, 0, 0, 0, 0.02, -0.8,    // right wing
    0.35, 0, 0, 0, 0.02, 0.8, -0.3, 0.05, 0,     // (both faces)
    -0.3, 0.05, 0, 0, 0.02, -0.8, 0.35, 0, 0,
  ];
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return merge([part(g, 0), part(box(0.7, 0.16, 0.18, 0, 0, 0), 0)]);
}
const smokeGeo = () => part(new THREE.IcosahedronGeometry(0.62, 0), 0);
/** a flower bed by a house: a low box of flowers (0) in a hedge rim (1) */
const bedGeo = () => merge([part(box(1.5, 0.42, 0.62, 0, 0.12, 0), 1), part(box(1.32, 0.18, 0.46, 0, 0.42, 0), 0)]);
/** a beach parasol: canopy (0), pole (1) */
const parasolGeo = () => merge([part(new THREE.ConeGeometry(1.25, 0.55, 8).translate(0, 2.05, 0), 0), part(box(0.08, 2.0, 0.08, 0, 1.0, 0), 1)]);
/** a lighthouse's beam (dusk): a long open cone along local +x from the lamp, spun about local z (0) */
const beamGeo = () => part(new THREE.ConeGeometry(2.4, 26, 10, 1, true).translate(0, -13, 0).rotateZ(Math.PI / 2), 0);
/** a quay lamp: post (0), lamp (1) */
const lampGeo = () => merge([part(box(0.13, 2.3, 0.13, 0, 0.9, 0), 0), part(box(0.42, 0.34, 0.42, 0, 2.2, 0), 1)]);
/** a container (0) */
const crateGeo = () => part(box(1.3, 1.05, 2.7, 0, 0.52, 0), 0);
/** windmill sails: four blades about the hub (local z is the axle) (0) */
function sailsGeo() {
  const l = [];
  for (let i = 0; i < 4; i++) {
    const b = box(0.55, 2.9, 0.07, 0.18, 1.65, 0);
    b.rotateZ((i * Math.PI) / 2);
    l.push(part(b, 0));
  }
  l.push(part(box(0.34, 0.34, 0.34), 0));
  return merge(l);
}

// ------------------------------------------------------------------ one-off structures, baked in world space
/** geometry with a per-vertex paint (aPaint = slot × 3, aPart 0), placed by matrix m */
function bake(geo, m, slot) {
  const g = part(geo, 0);
  if (m) g.applyMatrix4(m);
  const n = g.attributes.position.count;
  g.setAttribute('aPaint', new THREE.Float32BufferAttribute(new Float32Array(n * 3).fill(slot), 3));
  return g;
}
const place = (x, y, z, ry = 0, s = 1) => new M4().compose(new V3(x, y, z), new Q().setFromAxisAngle(YAX, ry), new V3(s, s, s));
/** the brands' ring road (radius at angle a, rad) */
const ringR = (a) => 87.5 + 1.4 * Math.sin(a * 3 + 1);

export function buildScenery(D, { life } = {}) {
  if (!LOOK) return null;
  const group = new THREE.Group();
  group.name = 'scenery';
  const R = rng(2026);
  const rr = (a, b) => a + (b - a) * R();
  // choices only one look makes (which windows are dark at dusk, a lighthouse's beam) draw from their own stream, so
  // the world is laid out the same in every look
  const RL = rng(77);

  // =================================================================== where things may go: a 1-unit grid
  const N = 201, H0 = 100.5;
  const occ = new Uint8Array(N * N);            // 0 free · 1 a district · 2 a flow's course · 3 scenery
  const ci = (x) => Math.floor(x + H0);
  const cell = (x, z) => { const i = ci(x), j = ci(z); return i < 0 || j < 0 || i >= N || j >= N ? 255 : occ[j * N + i]; };
  const mark = (x, z, r, v = 3) => {
    for (let j = ci(z - r); j <= ci(z + r); j++) for (let i = ci(x - r); i <= ci(x + r); i++) {
      if (i < 0 || j < 0 || i >= N || j >= N) continue;
      const cx = i - H0 + 0.5, cz = j - H0 + 0.5;
      if ((cx - x) ** 2 + (cz - z) ** 2 <= (r + 0.5) ** 2 && !occ[j * N + i]) occ[j * N + i] = v;
    }
  };
  const free = (x, z, r) => {
    for (let j = ci(z - r); j <= ci(z + r); j++) for (let i = ci(x - r); i <= ci(x + r); i++) {
      if (i < 0 || j < 0 || i >= N || j >= N) return false;
      const cx = i - H0 + 0.5, cz = j - H0 + 0.5;
      if ((cx - x) ** 2 + (cz - z) ** 2 <= (r + 0.5) ** 2 && occ[j * N + i]) return false;
    }
    return true;
  };
  const hAt = (x, z) => heightAt(x, z);
  const slope = (x, z) => (Math.abs(hAt(x + 1, z) - hAt(x - 1, z)) + Math.abs(hAt(x, z + 1) - hAt(x, z - 1))) / 4;
  const land = (x, z, above = 1) => !inDock(x, z) && hAt(x, z) > SEA_Y + above && Math.hypot(x, z) < 97;
  const water = (x, z, below = 0.6) => !inDock(x, z) && hAt(x, z) < SEA_Y - below && Math.hypot(x, z) < 96;

  // ---- the districts' footprints (every visible mesh's box, a margin around it) and their sites (what touches the ground)
  const sites = [];                               // [x0, z0, x1, z1] boxes at ground level, for the land-use map
  const _b = new THREE.Box3();
  for (const d of Object.values(D)) {
    d.group.updateMatrixWorld(true);
    d.group.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      for (let p = o; p; p = p.parent) if (!p.visible) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      if (mats.every((m) => !m || m.visible === false)) return;
      if (o.isInstancedMesh) { if (!o.count) return; o.computeBoundingBox(); _b.copy(o.boundingBox); }
      else { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); _b.copy(o.geometry.boundingBox); }
      _b.applyMatrix4(o.matrixWorld);
      if (_b.isEmpty() || _b.max.x - _b.min.x > 90 || _b.max.z - _b.min.z > 90) return;
      if (Math.abs(_b.min.x) > 108 || Math.abs(_b.max.x) > 108 || Math.abs(_b.min.z) > 108 || Math.abs(_b.max.z) > 108) return;
      if (_b.max.y < -6) return;
      const m = 1.8;
      for (let j = ci(_b.min.z - m); j <= ci(_b.max.z + m); j++) for (let i = ci(_b.min.x - m); i <= ci(_b.max.x + m); i++) if (i >= 0 && j >= 0 && i < N && j < N) occ[j * N + i] = 1;
      const cx = (_b.min.x + _b.max.x) / 2, cz = (_b.min.z + _b.max.z) / 2;
      if (_b.min.y < Math.max(hAt(cx, cz), SEA_Y) + 2.5) sites.push([_b.min.x, _b.min.z, _b.max.x, _b.max.z]);
    });
    const pin = d.pin || d.anchor;
    if (pin && Math.hypot(pin.x, pin.z) < 98) mark(pin.x, pin.z, 4, 1);
  }
  // ---- the flows' water: the boats' course from the slipway to the beach, where the copy goes under
  const L = life && life._dbg;
  if (L && L.brandC) {
    for (let i = 0; i <= 60; i++) { const p = L.brandC.getPointAt(i / 60); mark(p.x, p.z, 6, 2); }
    if (L.SINK) mark(L.SINK.x, L.SINK.z, 9, 2);
    if (L.LAND) mark(L.LAND.x, L.LAND.z, 7, 2);
  }

  // =================================================================== collected instances
  const T = { house: [], shed: [], tower: [], tree: [], pine: [], lamp: [], crate: [], parasol: [], bed: [], boat: [], buoy: [], bird: [], smoke: [], sails: [], beam: [] };
  const baked = [];
  const _m = new M4(), _q = new Q(), _s = new V3(), _p = new V3();
  const put = (k, x, y, z, ry, s, paint, anim) => {
    _q.setFromAxisAngle(YAX, ry);
    T[k].push({ m: _m.compose(_p.set(x, y, z), _q, Array.isArray(s) ? _s.set(...s) : _s.set(s, s, s)).clone(), paint, anim });
  };
  /** the lowest ground under a footprint (so a building on a slope sinks into it rather than floating) */
  const footY = (x, z, r) => Math.min(hAt(x - r, z - r), hAt(x + r, z - r), hAt(x - r, z + r), hAt(x + r, z + r), hAt(x, z));
  const pick = (arr) => arr[Math.floor(R() * arr.length)];
  const ROOFS = [P.roof, P.roof, P.roof2, P.roof3];
  const smokeFrom = (x, y, z, big = 1) => {
    for (let j = 0; j < 4; j++) put('smoke', x, y, z, 0, big, [P.smoke, P.smoke, P.smoke], [4, (j / 4) / 0.16 + R() * 0.4, 0.16, 4.6 * big]);
  };
  const house = (x, z, ry, { chimney = false, garden = true } = {}) => {
    const y = footY(x, z, 1.5);
    const lit = LOOK === 'c' ? (RL() < 0.78 ? P.window : P.wall2) : P.window;
    const hs = rr(0.92, 1.1);
    put('house', x, y, z, ry, hs, [R() < 0.7 ? P.wall : P.wall2, pick(ROOFS), lit]);
    // a flower bed beside the front door, now and then (checked before the house claims its ground)
    if (garden && R() < 0.55) {
      const side = R() < 0.5 ? -1 : 1;
      const o = new V3(side * 1.05 * hs, 0, (1.2 + 0.5) * hs).applyAxisAngle(YAX, ry);
      const bx = x + o.x, bz = z + o.z;
      if (free(bx, bz, 0.3) && land(bx, bz, 1.0)) { put('bed', bx, hAt(bx, bz) - 0.08, bz, ry, 1, [pick([P.garden, P.blossom, P.garden, P.roof3]), P.tree2, P.tree2]); mark(bx, bz, 0.6); }
    }
    mark(x, z, 2.1);
    if (chimney) {
      const c = new V3(0.85, 2.0 + 0.95 + 0.5, -0.35).applyAxisAngle(YAX, ry);
      smokeFrom(x + c.x, y + c.y, z + c.z, 0.8);
    }
  };
  const tree = (x, z, s = 1, paint = null) => {
    put('tree', x, hAt(x, z) - 0.1, z, R() * TAU, s * rr(0.8, 1.15), paint || [R() < 0.55 ? P.tree : P.tree2, P.trunk, P.trunk]);
    mark(x, z, 0.9 * s);
  };
  const pine = (x, z, s = 1) => { put('pine', x, hAt(x, z) - 0.1, z, R() * TAU, s * rr(0.85, 1.2), [P.pine, P.trunk, P.trunk]); mark(x, z, 0.9 * s); };

  // =================================================================== the consumers' land (r < 44)
  // hamlets: a few houses around a small square, facing it
  const hamlets = [];
  for (let k = 0; k < 900 && hamlets.length < 9; k++) {
    const r = rr(18, 39), a = R() * TAU, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!free(x, z, 6.5) || !land(x, z, 1.6) || slope(x, z) > 0.32 || hamlets.some((h) => Math.hypot(h.x - x, h.z - z) < 13)) continue;
    hamlets.push({ x, z });
    mark(x, z, 1.8);
    const n = 3 + Math.floor(R() * 4);
    for (let i = 0, tries = 0; i < n && tries < 40; tries++) {
      const aa = R() * TAU, d = rr(3.4, 6.2), hx = x + Math.cos(aa) * d, hz = z + Math.sin(aa) * d;
      if (!free(hx, hz, 2.2) || !land(hx, hz, 1.3) || slope(hx, hz) > 0.5) continue;
      house(hx, hz, Math.atan2(-(z - hz), x - hx) + rr(-0.25, 0.25) + Math.PI / 2, { chimney: i === 0 });
      i++;
    }
    lampAt(x + 1.2, z + 0.8);
    // the village tree on the green
    if (free(x - 1.0, z - 0.8, 0.6)) tree(x - 1.0, z - 0.8, 1.35);
  }
  function lampAt(x, z) { if (!free(x, z, 0.4)) return; put('lamp', x, hAt(x, z) - 0.1, z, 0, 1, [P.steel, P.lamp, P.lamp]); mark(x, z, 0.4); }
  // windmills on the two highest open hilltops
  const tops = [];
  for (let k = 0; k < 500; k++) {
    const r = rr(17, 40), a = R() * TAU, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (free(x, z, 4) && land(x, z, 2)) tops.push({ x, z, h: hAt(x, z) });
  }
  tops.sort((p, q) => q.h - p.h);
  const mills = [];
  for (const t of tops) { if (mills.length >= 2) break; if (mills.every((m) => Math.hypot(m.x - t.x, m.z - t.z) > 26) && free(t.x, t.z, 4)) { mills.push(t); mark(t.x, t.z, 3); } }
  for (const m of mills) {
    const y = footY(m.x, m.z, 1);
    const face = Math.atan2(m.z, m.x) + rr(-0.5, 0.5);       // the sails face outward, toward the sea wind
    baked.push(bake(new THREE.CylinderGeometry(0.62, 1.0, 5.2, 8).translate(0, 2.4, 0), place(m.x, y, m.z), P.wall));
    baked.push(bake(new THREE.ConeGeometry(0.95, 1.4, 8).translate(0, 5.5, 0), place(m.x, y, m.z), P.roof));
    const hub = new V3(Math.cos(face) * 0.95, 4.8, Math.sin(face) * 0.95);
    T.sails.push({ m: new M4().compose(new V3(m.x + hub.x, y + hub.y, m.z + hub.z), new Q().setFromAxisAngle(YAX, -face + Math.PI / 2), new V3(1, 1, 1)), paint: [P.sail, P.sail, P.sail], anim: [2, R() * 6, 0.55, 0] });
  }
  // groves and single trees
  for (let k = 0, groves = 0; k < 1400 && groves < 30; k++) {
    const r = rr(15.5, 43), a = R() * TAU, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!free(x, z, 2.5) || !land(x, z, 1.2)) continue;
    groves++;
    const n = 5 + Math.floor(R() * 10), spread = rr(2.4, 5.6);
    for (let i = 0; i < n; i++) {
      const aa = R() * TAU, d = Math.sqrt(R()) * spread, tx = x + Math.cos(aa) * d, tz = z + Math.sin(aa) * d;
      if (free(tx, tz, 0.9) && land(tx, tz, 1.0) && slope(tx, tz) < 0.9) tree(tx, tz, rr(0.85, 1.15));
    }
  }
  // a jetty or two on the consumers' beach, with rowing boats
  const jetties = [];
  for (let a = 0; a < 360 && jetties.length < 2; a += 7) {
    const aa = rad(a + rr(0, 5));
    let r0 = 0;
    for (let r = 36; r < 52; r += 0.25) if (hAt(Math.cos(aa) * r, Math.sin(aa) * r) < SEA_Y + 0.15) { r0 = r; break; }
    if (!r0) continue;
    const x = Math.cos(aa) * r0, z = Math.sin(aa) * r0;
    const end = new V3(Math.cos(aa) * (r0 + 6), 0, Math.sin(aa) * (r0 + 6));
    if (!free(x, z, 4) || !free(end.x, end.z, 3) || !water(end.x, end.z, 0.8) || jetties.some((j) => Math.hypot(j.x - x, j.z - z) < 40)) continue;
    jetties.push({ x, z, a: aa, r0 });
    pier(aa, r0 - 1.2, r0 + 6, 1.3, 0.85);
    for (const side of [-1, 1]) {
      const bx = Math.cos(aa) * (r0 + 3.5) - Math.sin(aa) * side * 1.35, bz = Math.sin(aa) * (r0 + 3.5) + Math.cos(aa) * side * 1.35;
      put('boat', bx, SEA_Y - 0.1, bz, -aa, 0.62, [P.hull, P.roof2, P.roof2], [1, R() * 10, 0, 0]);
    }
    mark(x, z, 3); mark(end.x, end.z, 3);
  }
  // parasols on the consumers' beach, in two small groups
  for (let k = 0, groups = 0; k < 800 && groups < 3; k++) {
    const r = rr(38, 47), a = R() * TAU, x = Math.cos(a) * r, z = Math.sin(a) * r, wl = hAt(x, z) - SEA_Y;
    if (wl < 0.25 || wl > 0.95 || !free(x, z, 3)) continue;
    groups++;
    for (let i = 0; i < 6; i++) {
      const px = x + rr(-2.6, 2.6), pz = z + rr(-2.6, 2.6), w2 = hAt(px, pz) - SEA_Y;
      if (w2 < 0.2 || w2 > 1.1 || !free(px, pz, 0.8)) continue;
      put('parasol', px, hAt(px, pz) - 0.05, pz, R() * TAU, rr(0.85, 1.05), [pick([P.roof3, P.roof2, P.wall, P.roof]), P.steel, P.steel]);
      mark(px, pz, 0.9);
    }
  }
  /** a timber pier along the radial at angle aa (rad) from r0 to r1, deck at SEA_Y + top */
  function pier(aa, r0, r1, w = 1.6, top = 1.0) {
    const len = Math.abs(r1 - r0), mid = (r0 + r1) / 2;
    const m = new M4().compose(new V3(Math.cos(aa) * mid, SEA_Y + top, Math.sin(aa) * mid), new Q().setFromAxisAngle(YAX, -aa), new V3(1, 1, 1));
    baked.push(bake(box(len, 0.32, w), m, P.road));
    for (let s = -len / 2 + 0.4; s <= len / 2; s += 2.1) for (const side of [-1, 1]) baked.push(bake(box(0.24, 3.4, 0.24, s, -1.7, side * (w / 2 - 0.1)), m, P.trunk));
  }

  // =================================================================== the brands' shore (r 66 – 97)
  // harbours where the shore is open: piers into the channel, boats moored at them, sheds and a crane on the quay,
  // containers, lamps; a town behind; a lighthouse at the first and third
  const openArc = (a0, half) => {
    for (let a = a0 - half; a <= a0 + half; a += 1) for (let r = 62; r <= 82; r += 2) {
      const x = Math.cos(rad(a)) * r, z = Math.sin(rad(a)) * r;
      if (!free(x, z, 1)) return false;
    }
    return true;
  };
  const cand = [];
  for (let a = 0; a < 360; a += 2) if (openArc(a, 10)) cand.push(a);
  // the near side first (the desktop map looks across it), then spread round the disk
  const NEAR = 36;
  const angDist = (p, q) => Math.abs(((p - q + 540) % 360) - 180);
  cand.sort((p, q) => angDist(p, NEAR) - angDist(q, NEAR));
  const harbours = [];
  for (const a of cand) { if (harbours.length >= 4) break; if (harbours.every((h) => angDist(h.a, a) > 52)) harbours.push({ a }); }
  const radialFind = (aa, test, r0 = 58, r1 = 90) => { for (let r = r0; r <= r1; r += 0.25) if (test(hAt(Math.cos(aa) * r, Math.sin(aa) * r))) return r; return r1; };
  const quays = [];
  harbours.forEach((H, hi) => {
    const a0 = rad(H.a);
    const rFoot = radialFind(a0, (h) => h > SEA_Y + 0.5);
    const rTop = radialFind(a0, (h) => h > 5.0);
    H.rFoot = rFoot; H.rTop = rTop;
    const ang = (dDeg, r) => [Math.cos(a0 + rad(dDeg)) * r, Math.sin(a0 + rad(dDeg)) * r];
    // piers and their boats
    for (const dd of [-5, 0, 5]) {
      const aa = a0 + rad(dd);
      const rf = radialFind(aa, (h) => h > SEA_Y + 0.5);
      pier(aa, rf + 1.6, rf - 7.5, 1.6, 1.0);
      for (const side of [-1, 1]) {
        if (R() < 0.2) continue;
        const d = rf - rr(3.5, 6.2);
        const bx = Math.cos(aa) * d - Math.sin(aa) * side * 1.75, bz = Math.sin(aa) * d + Math.cos(aa) * side * 1.75;
        put('boat', bx, SEA_Y - 0.1, bz, -(aa + Math.PI), rr(0.85, 1.05), [P.hull, pick([P.roof, P.roof2, P.roof3, P.wall]), P.steel], [1, R() * 10, 0, 0]);
      }
      const [x, z] = ang(dd, rf - 3); mark(x, z, 4.5);
    }
    // the quay: paving along the top of the bank
    quays.push({ a0, half: rad(11), r0: rTop - 1.2, r1: rTop + 7.5 });
    // sheds facing the water, a crane at the edge, containers, lamps
    for (const dd of [-7, 0, 7]) {
      const [x, z] = ang(dd, rTop + 3.2);
      if (!free(x, z, 2.5)) continue;
      put('shed', x, footY(x, z, 2.5), z, -(a0 + rad(dd)) + Math.PI / 2, 1, [P.shed, pick([P.roof, P.roof2]), P.window]);
      mark(x, z, 3.6);
    }
    {
      const [x, z] = ang(3.2, rTop + 0.4);
      const y = hAt(x, z);
      const m = place(x, y, z, -(a0 + rad(3.2)));
      // a gantry: four legs, a beam reaching out over the water (local −x is toward the sea)
      for (const [lx, lz] of [[-1.3, -1.2], [1.3, -1.2], [-1.3, 1.2], [1.3, 1.2]]) baked.push(bake(box(0.26, 5.6, 0.26, lx, 2.8, lz), m, P.steel));
      baked.push(bake(box(9.5, 0.45, 0.5, -2.6, 5.7, 0), m, P.steel));
      baked.push(bake(box(1.1, 0.9, 1.0, 0.6, 6.3, 0), m, P.band));
      baked.push(bake(box(0.06, 2.6, 0.06, -6.0, 4.2, 0), m, P.steel));
      mark(x, z, 2.2);
    }
    for (let i = 0; i < 7; i++) {
      const [x, z] = ang(rr(-9, 9), rTop + rr(5.4, 7.2));
      if (!free(x, z, 1.5)) continue;
      const ry = -(a0) + (R() < 0.5 ? 0 : Math.PI / 2);
      put('crate', x, footY(x, z, 1.2), z, ry, 1, [pick([P.crate, P.crate2, P.roof3]), 0, 0]);
      if (R() < 0.5) put('crate', x, footY(x, z, 1.2) + 1.05, z, ry, 1, [pick([P.crate, P.crate2, P.roof3]), 0, 0]);
      mark(x, z, 1.4);
    }
    for (let dd = -10; dd <= 10; dd += 4) { const [x, z] = ang(dd, rTop + 0.9); lampAt(x, z); }
    if (hi === 0 || hi === 2) {
      const [x, z] = ang(hi === 0 ? -12.5 : 12.5, rTop - 0.4);
      if (free(x, z, 1.5)) { lighthouse(x, hAt(x, z) - 0.2, z, 1); mark(x, z, 2); }
    }
    // the town behind: rows of houses along the shore, an office block or two, trees between
    for (let row = 0; row < 3; row++) {
      const r = rTop + 11 + row * 4.6;
      if (r > 94) break;
      const stepDeg = (4.4 / r) * (180 / Math.PI);
      for (let dd = -15; dd <= 15; dd += stepDeg) {
        const [x, z] = ang(dd + rr(-0.4, 0.4), r);
        if (!free(x, z, 2.1) || !land(x, z, 4.3) || slope(x, z) > 0.35) continue;
        const ry = -(a0 + rad(dd)) + Math.PI / 2;
        if (row === 0 && R() < 0.3) { put('tower', x, footY(x, z, 1.7), z, ry, rr(0.9, 1.15), [pick([P.wall, P.tower, P.wall2]), P.steel, LOOK === 'c' && RL() < 0.25 ? P.wall2 : P.window]); mark(x, z, 2.4); }
        else house(x, z, ry, { chimney: R() < 0.18 });
      }
    }
    // a town square
    const [sx, sz] = ang(0, rTop + 12.5);
    H.square = [sx, sz];
  });
  // =================================================================== the AI's water
  // channel buoys on two rings, a little life on the open water
  for (const [r0, step, off, paint] of [[49.5, 14, 0, P.buoy], [64.5, 12, 6, P.roof2]]) {
    for (let a = off; a < 360; a += step) {
      const x = Math.cos(rad(a)) * r0, z = Math.sin(rad(a)) * r0;
      if (!free(x, z, 2.2) || !water(x, z, 0.7)) continue;
      put('buoy', x, SEA_Y - 0.15, z, 0, 1, [paint, P.light, P.light], [1, R() * 10, 0, 0]);
      mark(x, z, 1.5);
    }
  }
  // islets: a rock, a few pines, a beacon on one of them
  const islets = [];
  for (let k = 0; k < 600 && islets.length < 3; k++) {
    const r = rr(55, 60), a = R() * TAU, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!free(x, z, 6.5) || !water(x, z, 2.2) || islets.some((i) => Math.hypot(i.x - x, i.z - z) < 30)) continue;
    islets.push({ x, z });
    const s = rr(2.6, 3.6);
    const rock = new THREE.IcosahedronGeometry(1, 2);
    const p = rock.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = new V3(p.getX(i), p.getY(i), p.getZ(i));
      const n = 0.82 + 0.3 * Math.sin(v.x * 3.1 + v.z * 2.3 + islets.length) * Math.cos(v.y * 2.7);
      p.setXYZ(i, v.x * n, v.y * n, v.z * n);
    }
    baked.push(bake(rock, new M4().compose(new V3(x, SEA_Y - 0.6, z), new Q().setFromAxisAngle(YAX, R() * TAU), new V3(s * 1.4, s * 0.55, s)), P.rock));
    const top = SEA_Y - 0.6 + s * 0.5;
    if (islets.length === 1) lighthouse(x, top - 0.2, z, 0.8);
    else for (let i = 0; i < 3; i++) { const aa = R() * TAU, d = R() * s * 0.5; put('pine', x + Math.cos(aa) * d, top - 0.3, z + Math.sin(aa) * d, R() * TAU, rr(0.6, 0.85), [P.pine, P.trunk, P.trunk]); }
    mark(x, z, 5.5);
  }
  function lighthouse(x, y, z, s = 1) {
    const m = place(x, y, z, 0, s);
    baked.push(bake(new THREE.CylinderGeometry(0.62, 1.0, 6.6, 10).translate(0, 3.3, 0), m, P.tower));
    for (const yy of [1.9, 4.2]) baked.push(bake(new THREE.CylinderGeometry(0.86, 0.9, 0.75, 10).translate(0, yy, 0), m, P.band));
    baked.push(bake(new THREE.CylinderGeometry(1.0, 1.0, 0.18, 10).translate(0, 6.65, 0), m, P.band));
    baked.push(bake(new THREE.CylinderGeometry(0.5, 0.5, 0.95, 10).translate(0, 7.2, 0), m, P.lamp));
    baked.push(bake(new THREE.ConeGeometry(0.72, 0.8, 10).translate(0, 8.05, 0), m, P.band));
    // at dusk its light sweeps the water
    if (LOOK === 'c') T.beam.push({ m: new M4().compose(new V3(x, y + 7.2 * s, z), new Q().setFromAxisAngle(new V3(1, 0, 0), -Math.PI / 2), new V3(1, 1, 0.55)), paint: [P.sheen, P.sheen, P.sheen], anim: [2, RL() * 20, 0.45, 0] });
  }

  // works on the open plateau: a factory with a tall chimney (smoke), between the towns
  for (let k = 0, n = 0; k < 600 && n < 2; k++) {
    const r = rr(81, 91), a = R() * TAU, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!free(x, z, 5) || !land(x, z, 4.5) || slope(x, z) > 0.25) continue;
    n++;
    const ry = -a + Math.PI / 2, y = footY(x, z, 3);
    const m = place(x, y, z, ry);
    baked.push(bake(box(6.4, 4.4, 3.6, 0, 1.4, 0), m, P.shed));
    for (let i = 0; i < 3; i++) baked.push(bake(gable(-1.8, 1.8, 1.05, 3.6, 1.0).rotateY(Math.PI / 2).translate(-2.1 + i * 2.1, 0, 0), m, P.roof2));
    baked.push(bake(new THREE.CylinderGeometry(0.42, 0.62, 8.5, 8).translate(2.6, 4.25, 1.2), m, P.band));
    const c = new V3(2.6, 8.7, 1.2).applyAxisAngle(YAX, ry);
    smokeFrom(x + c.x, y + c.y, z + c.z, 1.5);
    mark(x, z, 5.5);
  }
  // lamps along the ring road on the plateau (its line is painted by paintLand)
  for (let a = 0; a < 360; a += 6.5) {
    const aa = rad(a), r = ringR(aa) + 1.7, x = Math.cos(aa) * r, z = Math.sin(aa) * r;
    if (land(x, z, 4) && free(x, z, 0.6)) lampAt(x, z);
  }
  // pines along the rim and in small woods on the plateau
  for (let a = 0; a < 360; a += 2.4) {
    const r = rr(94.2, 96.5), x = Math.cos(rad(a)) * r, z = Math.sin(rad(a)) * r;
    if (R() < 0.62 && free(x, z, 1.1) && land(x, z, 4)) pine(x, z, rr(0.85, 1.1));
  }
  for (let k = 0, woods = 0; k < 900 && woods < 16; k++) {
    const r = rr(76, 93), a = R() * TAU, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!free(x, z, 3) || !land(x, z, 4)) continue;
    woods++;
    const n = 4 + Math.floor(R() * 8);
    for (let i = 0; i < n; i++) {
      const aa = R() * TAU, d = Math.sqrt(R()) * 4.5, tx = x + Math.cos(aa) * d, tz = z + Math.sin(aa) * d;
      if (free(tx, tz, 1) && land(tx, tz, 4)) (R() < 0.75 ? pine : tree)(tx, tz, rr(0.85, 1.1));
    }
  }
  // an orchard in blossom and one in leaf: trees in rows
  for (let k = 0, n = 0; k < 400 && n < 2; k++) {
    const r = rr(78, 90), a = R() * TAU, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!free(x, z, 6.5) || !land(x, z, 4.5) || slope(x, z) > 0.2) continue;
    n++;
    const t = new V3(-Math.sin(a), 0, Math.cos(a)), o = new V3(Math.cos(a), 0, Math.sin(a));
    for (let i = -3; i <= 3; i++) for (let j = -2; j <= 2; j++) {
      const tx = x + t.x * i * 2.1 + o.x * j * 2.3, tz = z + t.z * i * 2.1 + o.z * j * 2.3;
      if (free(tx, tz, 0.7) && land(tx, tz, 4)) tree(tx, tz, 0.62, [n === 1 ? P.blossom : P.tree2, P.trunk, P.trunk]);
    }
  }

  // =================================================================== birds: gulls over the first harbour and the islet, swallows over a hamlet
  const flocks = [];
  if (harbours[0]) { const a = rad(harbours[0].a); flocks.push([Math.cos(a) * (harbours[0].rFoot - 3), SEA_Y, Math.sin(a) * (harbours[0].rFoot - 3), 9, 15, 6]); }
  if (islets[0]) flocks.push([islets[0].x, SEA_Y, islets[0].z, -6.5, 13, 5]);
  if (hamlets[1]) flocks.push([hamlets[1].x, hAt(hamlets[1].x, hamlets[1].z), hamlets[1].z, 7, 11, 5]);
  if (harbours[2]) { const a = rad(harbours[2].a); flocks.push([Math.cos(a) * (harbours[2].rFoot - 2), SEA_Y, Math.sin(a) * (harbours[2].rFoot - 2), -8, 14, 5]); }
  for (const [x, y, z, r, h, n] of flocks) {
    for (let i = 0; i < n; i++) put('bird', x, y, z, 0, rr(0.85, 1.1), [P.bird, P.bird, P.bird], [3, (i / n) * (TAU / 0.3) + R() * 1.2, r * rr(0.8, 1.2), h + rr(-1.5, 1.5)]);
  }

  // =================================================================== the land-use map (terrain.js LAND)
  paintLand({ sites, hamlets, harbours, quays, jetties, mills, D, hAt, free, R });

  // =================================================================== meshes
  const mat = ink({ flat: true, hooks: STATIC_HOOKS });
  const amat = ink({ flat: true, hooks: ANIM_HOOKS, side: THREE.DoubleSide, uniforms: { uCalm: LOOK_U.calm } });
  const beamMat = ink({ flat: true, hooks: ANIM_HOOKS, side: THREE.DoubleSide, opacity: 0.24, uniforms: { uCalm: LOOK_U.calm } });
  const GEO = { house: houseGeo(), shed: shedGeo(), tower: towerGeo(), tree: treeGeo(), pine: pineGeo(), lamp: lampGeo(), crate: crateGeo(), parasol: parasolGeo(), bed: bedGeo(), boat: boatGeoW(), buoy: buoyGeo(), bird: birdGeo(), smoke: smokeGeo(), sails: sailsGeo(), beam: beamGeo() };
  const ANIM = new Set(['boat', 'buoy', 'bird', 'smoke', 'sails', 'beam']);
  const counts = {};
  for (const [k, list] of Object.entries(T)) {
    if (!list.length) continue;
    const geo = GEO[k];
    const n = list.length;
    const paint = new Float32Array(n * 3), anim = ANIM.has(k) ? new Float32Array(n * 4) : null;
    const mesh = new THREE.InstancedMesh(geo, k === 'beam' ? beamMat : ANIM.has(k) ? amat : mat, n);
    list.forEach((it, i) => {
      mesh.setMatrixAt(i, it.m);
      paint.set(it.paint, i * 3);
      if (anim) anim.set(it.anim, i * 4);
    });
    geo.setAttribute('aPaint', new THREE.InstancedBufferAttribute(paint, 3));
    if (anim) geo.setAttribute('aAnim', new THREE.InstancedBufferAttribute(anim, 4));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.castShadow = !ANIM.has(k);
    mesh.receiveShadow = !ANIM.has(k) || k === 'boat';
    mesh.name = `scenery-${k}`;
    group.add(mesh);
    counts[k] = n;
  }
  if (baked.length) {
    const g = mergeGeometries(baked);
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true; m.receiveShadow = true; m.name = 'scenery-structures';
    group.add(m);
    counts.structures = baked.length;
  }
  zoneNames();
  // in a district the environment steps back (the composite's uCalm), on the real clock (also while paused)
  let last = CLOCK.value;
  const update = (t, dt, ctx) => {
    const rdt = Math.min(0.1, Math.max(0, CLOCK.value - last)); last = CLOCK.value;
    const goal = ctx && ctx.focus ? 1 : 0, c = LOOK_U.calm;
    // (the composite's lamplit stage in a district, look c: where the camera's focus is)
    LOOK_U.focus.value.copy(FOCUS.pos.value); LOOK_U.focusR.value = FOCUS.r.value;
    c.value = goal > c.value ? Math.min(goal, c.value + rdt * 2) : Math.max(goal, c.value - rdt * 2);
    if (ctx && ctx.focus && rdt === 0 && c.value !== goal) c.value = goal;
  };
  return { group, update, counts, _dbg: { harbours, hamlets, islets, jetties, mills, occ } };
}

// =================================================================== the land-use map
function paintLand({ sites, hamlets, harbours, quays, jetties, mills, D, hAt, R }) {
  const N = LAND.N, S = N / 200;                         // texels per world unit
  const cv = (w = N) => { const c = document.createElement('canvas'); c.width = c.height = w; return c; };
  const X = (x) => (x + 100) * S;
  // r: the districts' sites — what of each district stands on the ground, grown a little, softened
  const cr = cv(), gr = cr.getContext('2d');
  gr.fillStyle = '#fff';
  for (const [x0, z0, x1, z1] of sites) {
    const m = 0.9;
    const w = (x1 - x0 + 2 * m) * S, h = (z1 - z0 + 2 * m) * S;
    gr.beginPath();
    gr.roundRect ? gr.roundRect(X(x0 - m), X(z0 - m), w, h, Math.min(w, h) * 0.45) : gr.rect(X(x0 - m), X(z0 - m), w, h);
    gr.fill();
  }
  for (const d of Object.values(D)) {
    const p = d.pin || d.anchor;
    if (!p || Math.hypot(p.x, p.z) > 98) continue;
    gr.beginPath(); gr.arc(X(p.x), X(p.z), 3.5 * S, 0, TAU); gr.fill();
  }
  // g: footpaths between the hamlets, the consumers' districts, the windmills and the jetties (a spanning tree)
  const cg = cv(), gg = cg.getContext('2d');
  gg.strokeStyle = '#fff'; gg.lineCap = 'round'; gg.lineJoin = 'round';
  gg.lineWidth = 1.05 * S;
  if (LOOK === 'a') gg.setLineDash([2.2 * S, 1.6 * S]);
  const nodes = [...hamlets.map((h) => [h.x, h.z]), ...mills.map((m) => [m.x, m.z]), ...jetties.map((j) => [j.x - Math.cos(j.a) * 1.5, j.z - Math.sin(j.a) * 1.5])];
  for (const d of Object.values(D)) if (d.zone === 'consumer') { const p = d.pin || d.anchor; nodes.push([p.x, p.z]); }
  const inT = [0], edges = [];
  while (inT.length < nodes.length) {
    let best = null;
    for (const i of inT) for (let j = 0; j < nodes.length; j++) {
      if (inT.includes(j)) continue;
      const d = Math.hypot(nodes[i][0] - nodes[j][0], nodes[i][1] - nodes[j][1]);
      if (!best || d < best[2]) best = [i, j, d];
    }
    inT.push(best[1]); edges.push(best);
  }
  for (const [i, j, d] of edges) {
    const [x0, z0] = nodes[i], [x1, z1] = nodes[j];
    const bend = (R() - 0.5) * 0.4 * d;
    const mx = (x0 + x1) / 2 - ((z1 - z0) / d) * bend, mz = (z0 + z1) / 2 + ((x1 - x0) / d) * bend;
    gg.beginPath(); gg.moveTo(X(x0), X(z0)); gg.quadraticCurveTo(X(mx), X(mz), X(x1), X(z1)); gg.stroke();
  }
  // b: paving — the quays, the town squares and the ring road with its spurs down to the harbours; the hamlets' greens
  const cb = cv(), gb = cb.getContext('2d');
  gb.fillStyle = '#fff'; gb.strokeStyle = '#fff'; gb.lineCap = 'round';
  for (const q of quays) {
    gb.beginPath();
    gb.arc(X(0), X(0), q.r1 * S, q.a0 - q.half, q.a0 + q.half);
    gb.arc(X(0), X(0), q.r0 * S, q.a0 + q.half, q.a0 - q.half, true);
    gb.closePath(); gb.fill();
  }
  for (const H of harbours) if (H.square) { gb.beginPath(); gb.arc(X(H.square[0]), X(H.square[1]), 2.6 * S, 0, TAU); gb.fill(); }
  for (const h of hamlets) { gb.beginPath(); gb.arc(X(h.x), X(h.z), 1.9 * S, 0, TAU); gb.fill(); }
  gb.lineWidth = 1.9 * S;
  const ring = ringR;
  let open = false;
  for (let k = 0; k <= 720; k++) {
    const a = (k / 720) * TAU, r = ring(a), x = Math.cos(a) * r, z = Math.sin(a) * r;
    const ok = hAt(x, z) > 4 && !inDock(x, z) && !siteHit(x, z);
    if (ok && !open) { gb.beginPath(); gb.moveTo(X(x), X(z)); open = true; } else if (ok) gb.lineTo(X(x), X(z));
    if ((!ok || k === 720) && open) { gb.stroke(); open = false; }
  }
  for (const H of harbours) {
    const a = rad(H.a), r = ring(a);
    gb.beginPath(); gb.moveTo(X(Math.cos(a) * (H.rTop + 6)), X(Math.sin(a) * (H.rTop + 6))); gb.lineTo(X(Math.cos(a) * r), X(Math.sin(a) * r)); gb.stroke();
  }
  function siteHit(x, z) { return sites.some(([x0, z0, x1, z1]) => x > x0 - 3 && x < x1 + 3 && z > z0 - 3 && z < z1 + 3); }

  // combine, soften the sites' edge, and the water's depth (a) from the ground under the sea
  const dr = gr.getImageData(0, 0, N, N).data, dg = gg.getImageData(0, 0, N, N).data, db = gb.getImageData(0, 0, N, N).data;
  const out = LAND.data;
  // (paths and paving keep the canvas's antialiased edge, a touch softened: the ground's threshold at 0.5 then draws
  // a smooth line between texels instead of a staircase)
  const soft = blur(dr, N, 3), sg = blur(dg, N, 1), sb = blur(db, N, 1);
  for (let i = 0; i < N * N; i++) { out[i * 4] = soft[i]; out[i * 4 + 1] = sg[i]; out[i * 4 + 2] = sb[i]; }
  for (let j = 0; j < N; j += 2) for (let i = 0; i < N; i += 2) {
    const x = (i + 1) / S - 100, z = (j + 1) / S - 100, r = Math.hypot(x, z);
    let dep = 0;
    if (r > 34 && r < 80) dep = Math.min(1, Math.max(0, (SEA_Y - hAt(x, z)) / 4.0));
    const v = Math.round(dep * 255);
    for (const k of [j * N + i, j * N + i + 1, (j + 1) * N + i, (j + 1) * N + i + 1]) out[k * 4 + 3] = v;
  }
  LAND.tex.needsUpdate = true;
}
/** a box blur of the alpha of RGBA canvas data, radius k texels, two passes; → Uint8 per texel */
function blur(rgba, N, k) {
  let a = new Float32Array(N * N), b = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) a[i] = rgba[i * 4 + 3];
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < N; y++) { let s = 0; for (let x = -k; x <= k; x++) s += a[y * N + Math.min(N - 1, Math.max(0, x))]; for (let x = 0; x < N; x++) { b[y * N + x] = s / (2 * k + 1); s += a[y * N + Math.min(N - 1, x + k + 1)] - a[y * N + Math.max(0, x - k)]; } }
    for (let x = 0; x < N; x++) { let s = 0; for (let y = -k; y <= k; y++) s += b[Math.min(N - 1, Math.max(0, y)) * N + x]; for (let y = 0; y < N; y++) { a[y * N + x] = s / (2 * k + 1); s += b[Math.min(N - 1, y + k + 1) * N + x] - b[Math.max(0, y - k) * N + x]; } }
  }
  const o = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) o[i] = a[i];
  return o;
}

// =================================================================== the zone names: larger, in their ring's colour
// The map's ground lettering (.ov-letter) and the phone's zone buttons (.ov-zone) are the lead's (overlay.js / ui.js);
// this only tags them by their text and loads assets/css/looks.css.  (The lead can replace the tagging with a
// `cls: 'zl zl-<id>'` on those items.)
function zoneNames() {
  const root = document.documentElement;
  root.classList.add(`look-${LOOK}`);
  for (const [id, c] of Object.entries(LOOK_DEF.zone)) root.style.setProperty(`--zl-${id}`, c);
  root.style.setProperty('--zl-halo', LOOK_DEF.halo);
  if (!document.querySelector('link[data-looks]')) {
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = 'assets/css/looks.css'; l.dataset.looks = '1';
    // the overlay measures its words once: measure again when the larger lettering arrives
    l.onload = () => dispatchEvent(new Event('resize'));
    document.head.appendChild(l);
  }
  const names = { 品牌: 'brand', AI: 'ai', 消費者: 'consumer' };
  const tag = (el) => {
    if (!el.classList) return;
    const t = (el.textContent || '').trim();
    if (el.classList.contains('ov-letter') && names[t]) el.classList.add('zl', `zl-${names[t]}`);
    if (el.classList.contains('ov-zone')) for (const [n, id] of Object.entries(names)) if (t.startsWith(n)) el.classList.add('zl', `zl-${id}`);
  };
  const scan = (n) => { tag(n); n.querySelectorAll?.('.ov-letter, .ov-zone').forEach(tag); };
  const ov = document.getElementById('ov');
  if (!ov) return;
  scan(ov);
  new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) scan(n); }).observe(ov, { childList: true, subtree: true });
}
