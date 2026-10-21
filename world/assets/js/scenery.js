// The world's own environment for the map looks (?look=a|b|c, look.js): what the ground is used for, the woods and
// villages of the consumers' land, the harbours and towns of the brands' shore, the water's depth, and the small life
// that belongs to those places — boats moored at the piers, buoys on the channel, smoke from chimneys, sails of the
// windmills, birds over the shore, lamps.  None of it is the book's content: it is the place the districts stand in.
// Every part is a paint slot (look.js), so each look colours the same world its own way.
//
// Draw calls: one merged mesh for the one-off structures (piers, cranes, lighthouses, windmill towers, factories,
// islets) and one InstancedMesh per repeated kind; the life moves in the vertex shader (no per-frame JS).
// Interface: buildScenery(D, { life }) → { group, update(), counts } | null without a look.
// Look a also lays the districts' stages (stageField), prints their spot fills (figureFills), thins the scenery round
// each stage, and prints the three zone names on their rings (zoneNames3d).  For the UI: zoneAt(x, z) → 'brand' | 'ai'
// | 'consumer' | null, ZONE_RINGS (radii of the coast), ZONE_LABELS (where the printed names stand).
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { ink, CLOCK, FOCUS } from './mat.js';
import { LOOK, LOOK_DEF, LOOK_U, P, FIG, figSlot } from './look.js';
import { heightAt, SEA_Y, LAND, inDock, STAGE } from './terrain.js';
import { rng } from './kit.js';

const V3 = THREE.Vector3, M4 = THREE.Matrix4, Q = THREE.Quaternion;
const TAU = Math.PI * 2, YAX = new V3(0, 1, 0);
const rad = (d) => (d * Math.PI) / 180;

// =================================================================== the zones (for the UI; any look, or none)
/** the three rings, by radius in world units, as the coast draws them: the consumers' land out to its beach, the AI's
 *  water out to the brands' bank, the brands' shore out to the rim */
export const ZONE_RINGS = { consumer: [0, 44.5], ai: [44.5, 69], brand: [69, 100] };
/** which zone a point on the map belongs to: the consumers' land (the inner island), the AI's water, the brands'
 *  shore (the outer land, and the dock cut into it); null off the disk */
export function zoneAt(x, z) {
  const r = Math.hypot(x, z);
  if (!(r <= 100)) return null;
  if (inDock(x, z)) return 'brand';
  if (heightAt(x, z) < SEA_Y) return 'ai';
  return r < 56 ? 'consumer' : 'brand';
}
/** look a: where the zone names are printed — [{ zone, name, a (radians), r, size }] (filled by buildScenery) */
export const ZONE_LABELS = [];

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

  // ---- look a: every district on its own stage (terrain.js STAGE); the scenery keeps off it and thins out round it
  const A = LOOK === 'a';
  const stage = A ? stageField(D) : null;
  if (A) {
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const cx = i - H0 + 0.5, cz = j - H0 + 0.5;
      if (stage.sd(cx, cz) < 2.2 || stage.over(cx, cz)) occ[j * N + i] = 1;
    }
  }
  /** look a: how likely a tree, a house or a lamp is to stand here — none on a stage's edge, the full count 10 units out */
  const thin = (x, z) => !A || R() < smoothstep(2.4, 10, stage.sd(x, z));
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
      // (look a keeps the scenery off the districts by their stages and silhouettes instead, above)
      if (!A) for (let j = ci(_b.min.z - m); j <= ci(_b.max.z + m); j++) for (let i = ci(_b.min.x - m); i <= ci(_b.max.x + m); i++) if (i >= 0 && j >= 0 && i < N && j < N) occ[j * N + i] = 1;
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
  // (look a: the talkers' words fly to the AI's ear and its card down to the phone — their ground stays clear too, so
  // the zone names never sit under a flow)
  if (A && L) {
    const seg = (a, b, r) => { if (!a || !b) return; for (let i = 0; i <= 24; i++) { const t = i / 24; mark(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, r, 2); } };
    for (const sp of L.speakers || []) seg(sp, L.ear, 4);
    seg(L.mouth, L.phone, 4);
  }
  // ---- look a: the zone names, printed on open ground or water of their rings (chosen before the scenery is laid)
  const names = A ? placeZoneNames({ occ, N, H0, stage, hAt, slope }) : null;
  if (names) for (const n of names) for (const [x, z] of n.cells) mark(x, z, 0.8, 3);

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
    if (!thin(x, z)) return;
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
    if (!thin(x, z)) return;
    put('tree', x, hAt(x, z) - 0.1, z, R() * TAU, s * rr(0.8, 1.15), paint || [R() < 0.55 ? P.tree : P.tree2, P.trunk, P.trunk]);
    mark(x, z, 0.9 * s);
  };
  const pine = (x, z, s = 1) => { if (!thin(x, z)) return; put('pine', x, hAt(x, z) - 0.1, z, R() * TAU, s * rr(0.85, 1.2), [P.pine, P.trunk, P.trunk]); mark(x, z, 0.9 * s); };

  // =================================================================== the consumers' land (r < 44)
  // hamlets: a few houses around a small square, facing it
  const hamlets = [];
  for (let k = 0; k < 900 && hamlets.length < 9; k++) {
    const r = rr(18, 39), a = R() * TAU, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!free(x, z, 6.5) || !land(x, z, 1.6) || slope(x, z) > 0.32 || hamlets.some((h) => Math.hypot(h.x - x, h.z - z) < 13)) continue;
    if (A && stage.sd(x, z) < 11) continue;
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
  function lampAt(x, z) { if (!free(x, z, 0.4) || !thin(x, z)) return; put('lamp', x, hAt(x, z) - 0.1, z, 0, 1, [P.steel, P.lamp, P.lamp]); mark(x, z, 0.4); }
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
    if (A && stage.sd(x, z) < 7) continue;
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
      if (w2 < 0.2 || w2 > 1.1 || !free(px, pz, 0.8) || !thin(px, pz)) continue;
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
  if (A) {
    counts.fills = figureFills(D);
    if (names) { const nm = zoneNames3d(names); group.add(nm.mesh); counts.names = nm.glyphs; }
  }
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
  return { group, update, counts, _dbg: { harbours, hamlets, islets, jetties, mills, occ, stage, names: names && names.map((n) => ({ zone: n.Z.zone, deg: n.deg, r: n.r })) } };
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

// =================================================================== look a: figure and ground
// The districts are the subject of the map; the place they stand in is its setting.  So each district stands on its
// own stage — a clearing of clean paper round what it stands on, a crisp rim in its zone's ink, a soft printed shadow
// on the sun's far side — and the setting thins out round it (thin() above).  The district itself gains the print's
// spot colours under its pencil line (figureFills), while the setting's own colour and line step back (look.js
// quiet, npr.js).  None of this touches a district module: it is all materials, paint slots and the composite.
const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const INF = 1e20;
/** 1-D squared distance transform (Felzenszwalb & Huttenlocher) of f (0 = seed, INF = none) → d, and each one's seed */
function edt1(f, n, d, arg, v, z) {
  let k = -1;
  for (let q = 0; q < n; q++) {
    if (f[q] >= INF) continue;
    if (k < 0) { k = 0; v[0] = q; z[0] = -Infinity; z[1] = Infinity; continue; }
    let s;
    for (;;) {
      const p = v[k];
      s = (f[q] + q * q - (f[p] + p * p)) / (2 * (q - p));
      if (s <= z[k]) { k--; if (k < 0) break; } else break;
    }
    k++; v[k] = q; z[k] = k === 0 ? -Infinity : s; z[k + 1] = Infinity;
  }
  if (k < 0) { for (let q = 0; q < n; q++) { d[q] = INF; arg[q] = -1; } return; }
  let j = 0;
  for (let q = 0; q < n; q++) { while (z[j + 1] < q) j++; const p = v[j]; d[q] = (q - p) * (q - p) + f[p]; arg[q] = p; }
}
/** 2-D Euclidean distance (texels) from every texel to the nearest seed (mask = 1); with `lab`, also that seed's label */
function edt(mask, N, lab = null) {
  const g = new Float64Array(N * N), ga = new Int32Array(N * N), out = new Float32Array(N * N), ol = lab ? new Int8Array(N * N) : null;
  const f = new Float64Array(N), d = new Float64Array(N), arg = new Int32Array(N), v = new Int32Array(N), z = new Float64Array(N + 1);
  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) f[y] = mask[y * N + x] ? 0 : INF;
    edt1(f, N, d, arg, v, z);
    for (let y = 0; y < N; y++) { g[y * N + x] = d[y]; ga[y * N + x] = arg[y]; }
  }
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) f[x] = g[y * N + x];
    edt1(f, N, d, arg, v, z);
    for (let x = 0; x < N; x++) {
      out[y * N + x] = Math.sqrt(d[x]);
      if (ol) { const sx = arg[x]; const sy = sx >= 0 ? ga[y * N + sx] : -1; ol[y * N + x] = sy >= 0 ? lab[sy * N + sx] : -1; }
    }
  }
  return { d: out, lab: ol };
}
/**
 * The stages.  For each district: what of its geometry stands on the ground (within CONTACT of it, as the district is
 * built — its rest), drawn from above into a texel mask, closed (gaps under CLOSE units bridged, holes filled) and
 * grown by PAD: a clearing that follows the district's own footprint, calm-edged, not a panel round it.  Written to
 * terrain.js STAGE as a signed distance (so the ground prints the rim and the shadow crisply at any zoom) and the
 * nearest stage's zone.  Also each district's whole silhouette from above (`over`), which the scenery keeps off too.
 * → { sd(x, z) world units (< 0 inside), zone(x, z), over(x, z), area: { id: m² } }
 */
function stageField(D) {
  const N = STAGE.N, S = N / 200, PAD = 1.5, CLOSE = 2.6, CONTACT = 5.0, FAR = 46;
  const ids = Object.keys(D);
  const mask = new Uint8Array(N * N), lab = new Int8Array(N * N).fill(-1), over = new Uint8Array(N * N);
  // the ground's height on a 2-unit grid (the contact test runs on many points)
  const G = 101, hg = new Float32Array(G * G);
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) hg[j * G + i] = Math.max(heightAt(i * 2 - 100, j * 2 - 100), SEA_Y);
  const ground = (x, z) => {
    const fx = Math.min(G - 1.001, Math.max(0, (x + 100) / 2)), fz = Math.min(G - 1.001, Math.max(0, (z + 100) / 2));
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, w = fz - j;
    return (hg[j * G + i] * (1 - u) + hg[j * G + i + 1] * u) * (1 - w) + (hg[(j + 1) * G + i] * (1 - u) + hg[(j + 1) * G + i + 1] * u) * w;
  };
  const tx = (x) => (x + 100) * S;
  /** a disc of radius r (world) into buf */
  const dot = (buf, x, z, r, k = -1) => {
    const cx = tx(x), cz = tx(z), rr = r * S;
    for (let j = Math.max(0, Math.floor(cz - rr)); j <= Math.min(N - 1, Math.ceil(cz + rr)); j++) for (let i = Math.max(0, Math.floor(cx - rr)); i <= Math.min(N - 1, Math.ceil(cx + rr)); i++) {
      const dx = i + 0.5 - cx, dz = j + 0.5 - cz;
      if (dx * dx + dz * dz <= rr * rr) { buf[j * N + i] = 1; if (k >= 0) lab[j * N + i] = k; }
    }
  };
  /** a triangle (world x, z) into buf */
  const tri = (buf, ax, az, bx, bz, cx, cz, k = -1) => {
    ax = tx(ax); az = tx(az); bx = tx(bx); bz = tx(bz); cx = tx(cx); cz = tx(cz);
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(N - 1, Math.ceil(Math.max(ax, bx, cx)));
    const z0 = Math.max(0, Math.floor(Math.min(az, bz, cz))), z1 = Math.min(N - 1, Math.ceil(Math.max(az, bz, cz)));
    const ar = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
    if (Math.abs(ar) < 1e-6) return;
    for (let j = z0; j <= z1; j++) for (let i = x0; i <= x1; i++) {
      const px = i + 0.5, pz = j + 0.5;
      const w0 = ((bx - px) * (cz - pz) - (bz - pz) * (cx - px)) / ar, w1 = ((cx - px) * (az - pz) - (cz - pz) * (ax - px)) / ar, w2 = 1 - w0 - w1;
      if (w0 >= -0.02 && w1 >= -0.02 && w2 >= -0.02) { buf[j * N + i] = 1; if (k >= 0) lab[j * N + i] = k; }
    }
  };
  const _v = new V3(), _mi = new M4(), _mw = new M4(), _bb = new THREE.Box3();
  const area = {};
  ids.forEach((id, k) => {
    const d = D[id];
    const c = d.pin || d.anchor || new V3();
    d.group.updateMatrixWorld(true);
    const near = (x, z) => Number.isFinite(x) && Number.isFinite(z) && Math.hypot(x - c.x, z - c.z) <= FAR && Math.hypot(x, z) <= 99;
    d.group.traverse((o) => {
      if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
      for (let p = o; p; p = p.parent) if (!p.visible) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      if (mats.every((m) => !m || m.visible === false)) return;
      const geo = o.geometry, pos = geo.attributes.position;
      if (!geo.boundingBox) geo.computeBoundingBox();
      if (o.isInstancedMesh) {
        if (!o.count) return;
        const b = geo.boundingBox;
        const st = Math.max(1, Math.floor(o.count / 3000));
        for (let i = 0; i < o.count; i += st) {
          o.getMatrixAt(i, _mi);
          if (Math.abs(_mi.determinant()) < 1e-9) continue;          // a parked (zero-scale) instance
          _mw.multiplyMatrices(o.matrixWorld, _mi);
          const q = [[b.min.x, b.min.y, b.min.z], [b.max.x, b.min.y, b.min.z], [b.max.x, b.min.y, b.max.z], [b.min.x, b.min.y, b.max.z]].map(([x, y, z]) => _v.set(x, y, z).applyMatrix4(_mw).toArray());
          if (!q.every((p) => near(p[0], p[2]))) continue;
          const gy = ground(q[0][0], q[0][2]);
          const low = Math.min(q[0][1], q[2][1]) < gy + CONTACT, any = Math.min(q[0][1], q[2][1]) < gy + 40;
          for (const [buf, on, kk] of [[mask, low, k], [over, any, -1]]) if (on) { tri(buf, q[0][0], q[0][2], q[1][0], q[1][2], q[2][0], q[2][2], kk); tri(buf, q[0][0], q[0][2], q[2][0], q[2][2], q[3][0], q[3][2], kk); }
        }
        return;
      }
      _bb.copy(geo.boundingBox).applyMatrix4(o.matrixWorld);
      if (_bb.isEmpty() || _bb.max.x - _bb.min.x > 90 || _bb.max.z - _bb.min.z > 90) return;
      // the mesh's vertices in world space, and whether each stands on the ground
      const n = pos.count, W = new Float32Array(n * 3), lo = new Uint8Array(n), hi = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        _v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        W[i * 3] = _v.x; W[i * 3 + 1] = _v.y; W[i * 3 + 2] = _v.z;
        if (!near(_v.x, _v.z)) continue;
        const gy = ground(_v.x, _v.z);
        lo[i] = _v.y < gy + CONTACT ? 1 : 0; hi[i] = _v.y < gy + 40 ? 1 : 0;
      }
      const idx = geo.index ? geo.index.array : null, nt = idx ? idx.length / 3 : n / 3;
      // small triangles: their vertices as dots; large ones (a deck, a platform's top): filled
      const tst = Math.max(1, Math.floor(nt / 40000));
      for (let t = 0; t < nt; t += tst) {
        const a = idx ? idx[t * 3] : t * 3, b = idx ? idx[t * 3 + 1] : t * 3 + 1, cc = idx ? idx[t * 3 + 2] : t * 3 + 2;
        const ex = Math.max(Math.abs(W[a * 3] - W[b * 3]), Math.abs(W[a * 3 + 2] - W[b * 3 + 2]), Math.abs(W[a * 3] - W[cc * 3]), Math.abs(W[a * 3 + 2] - W[cc * 3 + 2]));
        for (const [buf, f, kk] of [[mask, lo, k], [over, hi, -1]]) {
          if (!(f[a] && f[b] && f[cc])) { if (f[a] && t % 2 === 0) dot(buf, W[a * 3], W[a * 3 + 2], 0.7, kk); continue; }
          if (ex > 0.9) tri(buf, W[a * 3], W[a * 3 + 2], W[b * 3], W[b * 3 + 2], W[cc * 3], W[cc * 3 + 2], kk);
          else dot(buf, W[a * 3], W[a * 3 + 2], 0.7, kk);
        }
      }
    });
    // every district has a stage, even one that floats (its pin's foot)
    dot(mask, c.x, c.z, 2.2, k);
  });
  // close the footprint: bridge gaps under CLOSE (dilate, then erode by the same), then fill its holes
  const d1 = edt(mask, N, lab);
  const dil = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) dil[i] = d1.d[i] <= CLOSE * S ? 0 : 1;            // 1 = outside the dilation
  const d2 = edt(dil, N);
  const fin = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) fin[i] = d2.d[i] > CLOSE * S || mask[i] ? 1 : 0;
  {
    // holes: background not reachable from the border
    const seen = new Uint8Array(N * N), q = new Int32Array(N * N);
    let h = 0, t = 0;
    const push = (i) => { if (!fin[i] && !seen[i]) { seen[i] = 1; q[t++] = i; } };
    for (let i = 0; i < N; i++) { push(i); push((N - 1) * N + i); push(i * N); push(i * N + N - 1); }
    while (h < t) { const i = q[h++], x = i % N, y = (i / N) | 0; if (x > 0) push(i - 1); if (x < N - 1) push(i + 1); if (y > 0) push(i - N); if (y < N - 1) push(i + N); }
    for (let i = 0; i < N * N; i++) if (!fin[i] && !seen[i]) fin[i] = 1;
  }
  // signed distance to the stages' edge, grown by PAD; each texel's zone from the nearest footprint
  const out = edt(fin, N);
  const inv = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) inv[i] = fin[i] ? 0 : 1;
  const ins = edt(inv, N);
  const sdA = new Float32Array(N * N);
  const ZC = { brand: 64, ai: 128, consumer: 192 };
  const zoneOfLab = ids.map((id) => ZC[D[id].zone] || 192);
  const data = STAGE.data, R2 = STAGE.range;
  for (let i = 0; i < N * N; i++) {
    const sd = fin[i] ? -ins.d[i] / S - PAD : out.d[i] / S - PAD;
    sdA[i] = sd;
    data[i * 4] = Math.max(0, Math.min(255, Math.round((0.5 + sd / R2) * 255)));
    const l = d1.lab[i];
    data[i * 4 + 1] = l >= 0 ? zoneOfLab[l] : 0;
    data[i * 4 + 2] = 0; data[i * 4 + 3] = 255;
    if (sd < 0 && l >= 0) area[ids[l]] = (area[ids[l]] || 0) + 1 / (S * S);
  }
  STAGE.tex.needsUpdate = true;
  // the silhouettes, grown by a unit
  const overD = edt(over, N).d;
  const ix = (x) => Math.min(N - 1, Math.max(0, Math.floor((x + 100) * S)));
  const at = (arr, x, z) => arr[ix(z) * N + ix(x)];
  for (const k of Object.keys(area)) area[k] = Math.round(area[k]);
  return {
    sd: (x, z) => (Math.hypot(x, z) > 101 ? 99 : at(sdA, x, z)),
    zone: (x, z) => { const v = STAGE.data[(ix(z) * N + ix(x)) * 4 + 1]; return v === 64 ? 'brand' : v === 128 ? 'ai' : v === 192 ? 'consumer' : null; },
    over: (x, z) => at(overD, x, z) / S < 1.0,
    area,
  };
}

/**
 * The districts' spot fills: every pencil material of a district prints over a flat Riso tint from its zone's inks
 * (look.js A.fig), chosen by what the material is — people in one warm tint wherever they are; large surfaces (bases,
 * buildings, decks) in the zone's light ink, middling ones (furniture, props) in its second ink, small ones (cups,
 * tools) in its deeper ink.  Typed and 人 materials (what AI makes) keep none: the composite also skips any pixel
 * that is typed, solid ink, accented or dimmed, so the story's own emphasis still leads.  Materials shared by several
 * meshes take the largest.  → the number of materials filled
 */
function figureFills(D) {
  const _bb = new THREE.Box3(), sz = new V3(), _mi = new M4();
  let n = 0;
  for (const d of Object.values(D)) {
    const zone = FIG.zone[d.zone] != null ? d.zone : 'consumer';
    const people = new Set();
    d.group.traverse((o) => { if (o.name === 'person') o.traverse((m) => { if (m.isMesh) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => people.add(x)); }); });
    const area = new Map();
    d.group.updateMatrixWorld(true);
    d.group.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      _bb.copy(o.geometry.boundingBox);
      let k = 1;
      if (o.isInstancedMesh && o.count) { o.getMatrixAt(0, _mi); k = Math.cbrt(Math.abs(_mi.determinant())) || 1; }
      _bb.applyMatrix4(o.matrixWorld);
      _bb.getSize(sz).multiplyScalar(k);
      const a = Number.isFinite(sz.x + sz.y + sz.z) ? Math.max(sz.x * sz.z, sz.x * sz.y, sz.y * sz.z) : 0;
      for (const m of mats) if (m) area.set(m, Math.max(area.get(m) || 0, a));
    });
    for (const [m, a] of area) {
      const u = m.userData && m.userData.u;
      if (!u || !u.uPaint || m.visible === false) continue;
      if ((u.uStyle?.value ?? 0) >= 0.7) continue;                 // type and 人 stay the book's
      if (u.uPaint.value >= 1 && u.uPaint.value < 80) continue;     // already painted as part of the setting
      const kind = people.has(m) ? 'people' : a >= 24 ? 'large' : a >= 3.5 ? 'mid' : 'small';
      u.uPaint.value = figSlot(zone, kind);
      n++;
    }
  }
  return n;
}

// =================================================================== look a: the zone names, printed on the map
// 品牌, AI and 消費者 printed into the map itself, each on its own ring and in its ring's ink, letter-spaced along the
// ring's curve, on open ground (or water) of that ring: never on a stage, a flow or the scenery (which is laid after
// them and keeps off).  Each name stands at its own azimuth, so the three never line up whichever way the map turns.
// The letters lie flat on the ground and stay upright to the reader as the map turns (each one turns about its own
// centre; a name reads left to right, or top to bottom where its arc runs up the screen, and changes its reading
// order only on the diagonal where the two disagree, fading through that change).  On the water they ride its swell.
// In a district they step back with the rest of the setting.  One mesh, one material (one draw call, one program).
const NAME_SET = [
  // zone, name, glyph size (world units), tracking (× size), radii to try, the medium
  { zone: 'consumer', name: '消費者', size: 6.4, track: 0.42, radii: [34, 37, 31, 40, 28, 25], medium: 'land' },
  { zone: 'ai', name: 'AI', size: 9.0, track: 0.4, radii: [57, 54, 60], medium: 'water' },
  { zone: 'brand', name: '品牌', size: 9.0, track: 0.6, radii: [81, 78, 84], medium: 'plateau' },
];
const NAME_SLOT = { brand: P.nameBrand, ai: P.nameAi, consumer: P.nameConsumer };
const NAME_FONT = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", "Heiti TC", sans-serif';
/** the map's default camera azimuth (ui.js: az 0.62 on phones and desks) — a name is placed to read well from there */
const AZ0 = 0.62;

/** each glyph's advance in em (CJK: 1; Latin from the font) */
function advances(text) {
  const c = document.createElement('canvas').getContext('2d');
  c.font = `800 100px ${NAME_FONT}`;
  return [...text].map((ch) => (/[　-鿿]/.test(ch) ? 1 : Math.max(0.42, c.measureText(ch).width / 100)));
}
/** the reading of a name at angle th from a camera at azimuth az (as the shader): across the screen or up it, and how
 *  far from the diagonal where its reading order turns (fade < 1 near it) */
function reading(th, az) {
  const d = th - az, tr = -Math.cos(d), tu = Math.sin(d);
  const hz = Math.abs(tr) >= 0.42 * Math.abs(tu);
  return { hz, fade: tr * tu > 0 ? smoothstep(0.03, 0.16, Math.abs(Math.abs(tr) - 0.42 * Math.abs(tu))) : 1, tr, tu };
}

function placeZoneNames({ occ, N, H0, stage, hAt, slope }) {
  const cell = (x, z) => { const i = Math.floor(x + H0), j = Math.floor(z + H0); return i < 0 || j < 0 || i >= N || j >= N ? 255 : occ[j * N + i]; };
  // (tried strict first, then a step looser: a little nearer the stages, then over a district's raised parts —
  // never on a stage, never on a flow)
  const LEVELS = [{ sd: 3.0, over: false }, { sd: 2.0, over: false }, { sd: 2.0, over: true }, { sd: 1.4, over: true }];
  let lev = LEVELS[0];
  const ok = (x, z, medium) => {
    const r = Math.hypot(x, z);
    if (r > 95 || inDock(x, z)) return false;
    const c = cell(x, z);
    if (c === 2 || c === 255 || (c === 1 && !(lev.over && stage.sd(x, z) > lev.sd))) return false;
    if (stage.sd(x, z) < lev.sd) return false;
    const h = hAt(x, z);
    if (medium === 'land') return r < 43.5 && h > SEA_Y + 0.7 && slope(x, z) < 0.6;
    if (medium === 'water') return h < SEA_Y - 0.9;
    return h > 4.3 && slope(x, z) < 0.45;
  };
  const cand = NAME_SET.map((Z) => {
    const adv = advances(Z.name);
    let list = [];
    for (lev of LEVELS) {
      list = scan(Z, adv);
      if (list.length) break;
    }
    return list.sort((a, b) => b.score - a.score);
  });
  function scan(Z, adv) {
    const list = [];
    for (const r of Z.radii) {
      const w = adv.map((a) => a * Z.size);
      const total = w.reduce((s, a) => s + a, 0) + Z.track * Z.size * (adv.length - 1);
      for (let deg = 0; deg < 360; deg += 2) {
        const th = rad(deg);
        let good = true;
        const cells = [];
        // the band it covers (the glyphs turn about their centres: a margin of their half-diagonal)
        const half = total / 2 + 1.2, hw = Z.size * 0.62 + 0.8;
        for (let s = -half; s <= half && good; s += 1) for (let o = -hw; o <= hw; o += 1) {
          const a = th + s / r, rr = r + o, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
          if (!ok(x, z, Z.medium)) { good = false; break; }
          cells.push([x, z]);
        }
        if (!good) continue;
        const rd = reading(th, AZ0);
        // reads well from the default view: across the screen (near or far side) rather than up it, and not on the
        // diagonal where the reading order turns
        const score = Math.abs(rd.tr) + (rd.fade < 1 ? -2 : 0) - Math.abs(r - Z.radii[0]) * 0.015;
        list.push({ Z, r, th, deg, score, cells, adv });
      }
    }
    return list;
  }
  // the best three that stand apart round the disk (at least 50° between any two: they never line up)
  const sep = (a, b) => Math.abs(((a - b + 540) % 360) - 180), SEP = 50;
  let best = null;
  const top = (l) => l.slice(0, 90);
  for (const a of top(cand[0])) for (const b of top(cand[1])) {
    if (sep(a.deg, b.deg) < SEP) continue;
    for (const c of top(cand[2])) {
      if (sep(a.deg, c.deg) < SEP || sep(b.deg, c.deg) < SEP) continue;
      const s = a.score + b.score + c.score;
      if (!best || s > best.s) best = { s, picks: [a, b, c] };
    }
  }
  // (if a ring has no room at all, the others still never stack: each next one keeps its distance)
  let picks = best ? best.picks : null;
  if (!picks) {
    picks = [];
    for (const l of cand) { const c = l.find((x) => picks.every((p) => sep(p.deg, x.deg) >= SEP)); if (c) picks.push(c); }
  }
  ZONE_LABELS.length = 0;
  for (const p of picks) ZONE_LABELS.push({ zone: p.Z.zone, name: p.Z.name, a: +p.th.toFixed(4), r: p.r, size: p.Z.size });
  return picks;
}

/** the names' mesh: every glyph a small grid lying on the ground, laid out and turned in the vertex shader */
function zoneNames3d(picks) {
  const chars = [...new Set(picks.flatMap((p) => [...p.Z.name]))];
  const CS = 128, SP = 12;
  const atlas = document.createElement('canvas');
  atlas.width = CS * chars.length; atlas.height = CS;
  const tex = new THREE.CanvasTexture(atlas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = true;
  // the glyphs as distance fields, so a name's edge stays crisp at any zoom; drawn now (system font if the page's own
  // Noto Sans TC is not in yet) and again when it is
  const draw = () => {
    const g = atlas.getContext('2d', { willReadFrequently: true });
    const out = g.createImageData(atlas.width, CS);
    const tmp = document.createElement('canvas'); tmp.width = tmp.height = CS;
    const t = tmp.getContext('2d', { willReadFrequently: true });
    chars.forEach((ch, k) => {
      t.clearRect(0, 0, CS, CS);
      t.fillStyle = '#fff'; t.textAlign = 'center'; t.textBaseline = 'alphabetic';
      t.font = `800 ${CS - 2 * SP - 6}px ${NAME_FONT}`;
      const m = t.measureText(ch);
      const asc = m.actualBoundingBoxAscent || (CS - 2 * SP) * 0.8, desc = m.actualBoundingBoxDescent || 0;
      t.fillText(ch, CS / 2, CS / 2 + (asc - desc) / 2);
      const a = t.getImageData(0, 0, CS, CS).data;
      const ins = new Uint8Array(CS * CS), outs = new Uint8Array(CS * CS);
      for (let i = 0; i < CS * CS; i++) { ins[i] = a[i * 4 + 3] > 127 ? 1 : 0; outs[i] = 1 - ins[i]; }
      const dOut = edt(ins, CS).d, dIn = edt(outs, CS).d;
      for (let y = 0; y < CS; y++) for (let x = 0; x < CS; x++) {
        const i = y * CS + x, v = 0.5 + (ins[i] ? dIn[i] - 0.5 : -(dOut[i] - 0.5)) / (2 * SP);
        // (the canvas texture is flipped on upload: its top row is v = 1, the glyph's top)
        const o = (y * atlas.width + k * CS + x) * 4, b = Math.max(0, Math.min(255, Math.round(v * 255)));
        out.data[o] = out.data[o + 1] = out.data[o + 2] = b; out.data[o + 3] = 255;
      }
    });
    g.putImageData(out, 0, 0);
    tex.needsUpdate = true;
  };
  draw();
  try { if (document.fonts) document.fonts.load('800 64px "Noto Sans TC"', chars.join('')).then((f) => { if (f && f.length) draw(); }, () => {}); } catch { /* no font API */ }

  // the ground's height for the letters (they turn, so their footprint moves): 256² half floats over the disk
  const HN = 256, hd = new Uint16Array(HN * HN);
  for (let j = 0; j < HN; j++) for (let i = 0; i < HN; i++) hd[j * HN + i] = THREE.DataUtils.toHalfFloat(Math.max(heightAt(((i + 0.5) / HN) * 200 - 100, ((j + 0.5) / HN) * 200 - 100), SEA_Y));
  const htex = new THREE.DataTexture(hd, HN, HN, THREE.RedFormat, THREE.HalfFloatType);
  htex.magFilter = THREE.LinearFilter; htex.minFilter = THREE.LinearFilter; htex.generateMipmaps = false; htex.colorSpace = THREE.NoColorSpace;
  htex.needsUpdate = true;

  const GS = 7;                                                    // each glyph: a GS × GS grid
  const pos = [], nrm = [], aG = [], aQ = [], aT = [], idx = [];
  let glyphs = 0;
  for (const p of picks) {
    const { Z, r, th, adv } = p;
    const water = Z.medium === 'water';
    // centred arc offsets of the glyphs, in reading order
    const w = adv.map((a) => a * Z.size), gap = Z.track * Z.size;
    const total = w.reduce((s, a) => s + a, 0) + gap * (w.length - 1);
    let x0 = -total / 2;
    [...Z.name].forEach((ch, i) => {
      const s = x0 + w[i] / 2; x0 += w[i] + gap;
      const k = chars.indexOf(ch);
      const base = pos.length / 3;
      for (let b = 0; b <= GS; b++) for (let a = 0; a <= GS; a++) {
        const u = a / GS - 0.5, v = b / GS - 0.5;
        pos.push(Math.cos(th) * r, 0, Math.sin(th) * r);
        nrm.push(0, 1, 0);
        aG.push(th, r, s, Z.size);
        aQ.push(u, v, water ? 0.34 : 0.16, NAME_SLOT[Z.zone]);
        aT.push((k + 0.5 + u) / chars.length, 0.5 + v);
      }
      for (let b = 0; b < GS; b++) for (let a = 0; a < GS; a++) {
        const q = base + b * (GS + 1) + a;
        idx.push(q, q + 1, q + GS + 1, q + 1, q + GS + 2, q + GS + 1);
      }
      glyphs++;
    });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('aG', new THREE.Float32BufferAttribute(aG, 4));
  geo.setAttribute('aQ', new THREE.Float32BufferAttribute(aQ, 4));
  geo.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 2));
  geo.setIndex(idx);
  // desks see the disk about 2.4 times as large as phones do: the names are printed a little smaller there
  const desk = () => typeof innerWidth === 'number' && innerWidth >= 900 && innerHeight >= 500;
  const uName = { value: new THREE.Vector2(desk() ? 0.84 : 1, 0) };
  addEventListener('resize', () => { uName.value.x = desk() ? 0.84 : 1; });
  const mat = ink({
    flat: true, side: THREE.DoubleSide, focus: false,
    uniforms: { uGlyphs: { value: tex }, uHgt: { value: htex }, uName, uCalm: LOOK_U.calm },
    hooks: {
      key: 'zone-names',
      vHead: 'attribute vec4 aG; attribute vec4 aQ; attribute vec2 aT; varying vec2 vT; varying float vSlot; varying float vNameFade;',
      vPos: /* glsl */`{
        // the screen's right, laid on the ground, and the way up the screen (away from the reader)
        vec2 rt = vec2(viewMatrix[0][0], viewMatrix[2][0]);
        rt = length(rt) > 1e-4 ? normalize(rt) : vec2(1.0, 0.0);
        vec2 up = vec2(rt.y, -rt.x);
        // the name's own arc: across the screen (left to right) or up it (top to bottom)
        vec2 tg = vec2(-sin(aG.x), cos(aG.x));
        float tr = dot(tg, rt), tu = dot(tg, up);
        float hz = step(0.42 * abs(tu), abs(tr));
        float dec = hz > 0.5 ? step(tr, 0.0) : step(0.0, tu);
        float sc = uName.x;
        float th = aG.x + (dec > 0.5 ? -1.0 : 1.0) * aG.z * sc / aG.y;
        vec2 c = vec2(cos(th), sin(th)) * aG.y;
        vec2 xz = c + (aQ.x * rt + aQ.y * up) * aG.w * sc;
        float y = max(texture2D(uHgt, xz / 200.0 + 0.5).r, ${SEA_Y.toFixed(2)}) + aQ.z;
        if (aQ.z > 0.25) {
          // on the water: the sea's own swell (terrain.js buildSea)
          float rr = length(xz), aa = atan(xz.y, xz.x);
          y += sin(aa * 18.0 + rr * 0.6 - uTime * 0.8) * 0.18 + sin(rr * 1.3 + uTime * 0.6) * 0.12;
        }
        transformed = vec3(xz.x, y, xz.y);
        vT = aT; vSlot = aQ.w;
        vNameFade = (tr * tu > 0.0 ? smoothstep(0.03, 0.16, abs(abs(tr) - 0.42 * abs(tu))) : 1.0) * (1.0 - uCalm)
          * smoothstep(30.0, 55.0, length(cameraPosition - vec3(c.x, y, c.y)));
      }`,
      fHead: 'varying vec2 vT; varying float vSlot; varying float vNameFade;',
      fOut: /* glsl */`{
        float g = texture2D(uGlyphs, vT).r;
        if (g < 0.5 || vNameFade < 0.02) discard;
        pn = vSlot; sh = 1.0; st = 0.0; ac = 0.0; dm = 0.0;
        op *= vNameFade;
      }`,
    },
  });
  mat.polygonOffset = true; mat.polygonOffsetFactor = -2; mat.polygonOffsetUnits = -6;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'zone-names';
  mesh.frustumCulled = false;
  mesh.castShadow = false; mesh.receiveShadow = false;
  return { mesh, glyphs };
}
