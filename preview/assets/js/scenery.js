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
// each stage, and prints the three zone names on their rings (zoneNames3d, drawn over the composite).  For the UI:
// zoneAt(x, z) → 'brand' | 'ai' | 'consumer' | null (the twins' island is 'ai'), ZONE_RINGS (radii of the coast),
// ZONE_LABELS (where the printed names stand, and which of them shows now with its screen box — see placeZoneNames;
// at most one copy of a name shows at a time).  The consumers' town square (square.js) is laid before all this: the
// scenery and the names keep off it (square.keep), and its paving and paths are painted into the land-use map.
// For tests only: ZONE_LABELS.cands (every place a name could have gone) and ZONE_LABELS.why(x, z) (what a cell offers).
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { ink, CLOCK, FOCUS, T as T_WORLD } from './mat.js';
import { LOOK, LOOK_DEF, LOOK_U, P, PAL_W, FIG, figSlot, OVERLAY, NPR_U } from './look.js';
import { heightAt, SEA_Y, LAND, inDock, STAGE, islandSd } from './terrain.js';
import { rng } from './kit.js';
import { MAP_AZ, MAP_EL, REVEAL } from './mappose.js';

const V3 = THREE.Vector3, M4 = THREE.Matrix4, Q = THREE.Quaternion;
const TAU = Math.PI * 2, YAX = new V3(0, 1, 0);
const rad = (d) => (d * Math.PI) / 180;

// =================================================================== the zones (for the UI; any look, or none)
/** the three rings, by radius in world units, as the coast draws them: the consumers' land out to its beach, the AI's
 *  water out to the brands' bank, the brands' shore out to the rim.  (Round the twins' island, at 128 deg, the AI's
 *  water opens a bay into the brands' plateau, out to about r 87: zoneAt() follows the coast itself.) */
export const ZONE_RINGS = { consumer: [0, 44.5], ai: [44.5, 69], brand: [69, 100] };
/** which zone a point on the map belongs to: the consumers' land (the inner island), the AI's water and the twins'
 *  island in it (terrain.js ISLAND), the brands' shore (the outer land, and the dock cut into it); null off the disk */
export function zoneAt(x, z) {
  const r = Math.hypot(x, z);
  if (!(r <= 100)) return null;
  if (inDock(x, z)) return 'brand';
  if (islandSd(x, z) < 1.5) return 'ai';
  if (heightAt(x, z) < SEA_Y) return 'ai';
  return r < 56 ? 'consumer' : 'brand';
}
/** look a: where the zone names are printed, filled by buildScenery — one entry per placement (a ring has up to five,
 *  of which at most one shows): { zone, name, a (radians), r, size (world units), copy, w (0 … 1: how much it shows
 *  now), box ([x0, y0, x1, y1] css px on screen while it shows, else null) }, and for tests vis, hid, ang, ins, score.
 *  `ZONE_LABELS.missing` lists any zone that found no room (an error: it is also logged); `ZONE_LABELS.coverage`
 *  { zone: { share, double, gaps } }: the share of 96 model views (phone and desk, at rest and tilted low, every 15 deg)
 *  from which one copy reads (double: two), and the views from which none does */
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

export function buildScenery(D, { life, square = null } = {}) {
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
  // the twins' island is the AI's: nothing of the setting is laid on it (its two districts and their stages only);
  // nor on the consumers' town square (square.js) and what it has laid
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = i - H0 + 0.5, z = j - H0 + 0.5;
    if (islandSd(x, z) < 2.5 || (square && Math.abs(x) < 30 && Math.abs(z) < 30 && square.keep(x, z))) occ[j * N + i] = 1;
  }
  const hAt = (x, z) => heightAt(x, z);
  const slope = (x, z) => (Math.abs(hAt(x + 1, z) - hAt(x - 1, z)) + Math.abs(hAt(x, z + 1) - hAt(x, z - 1))) / 4;
  const land = (x, z, above = 1) => !inDock(x, z) && hAt(x, z) > SEA_Y + above && Math.hypot(x, z) < 97;
  const water = (x, z, below = 0.6) => !inDock(x, z) && hAt(x, z) < SEA_Y - below && Math.hypot(x, z) < 96;

  // ---- look a: every district on its own stage (terrain.js STAGE); the scenery keeps off it and thins out round it
  const A = LOOK === 'a';
  const stage = A ? stageField(D) : null;
  if (A && square && square.mesh) stage.top.add(square.mesh);
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
  // ---- the brands' harbours: where the shore is open (look a chooses them now, before the zone names, so that the
  // names leave them their water, quay and town; the other looks after the consumers' land, as they always did)
  const openArc = (a0, half) => {
    for (let a = a0 - half; a <= a0 + half; a += 1) for (let r = 62; r <= 82; r += 2) {
      const x = Math.cos(rad(a)) * r, z = Math.sin(rad(a)) * r;
      if (!free(x, z, 1)) return false;
    }
    return true;
  };
  // the near side first (the desktop map looks across it), then spread round the disk
  const NEAR = 36;
  const angDist = (p, q) => Math.abs(((p - q + 540) % 360) - 180);
  const harbours = [];
  const chooseHarbours = () => {
    const cand = [];
    for (let a = 0; a < 360; a += 2) if (openArc(a, 10)) cand.push(a);
    cand.sort((p, q) => angDist(p, NEAR) - angDist(q, NEAR));
    for (const a of cand) { if (harbours.length >= 4) break; if (harbours.every((h) => angDist(h.a, a) > 52)) harbours.push({ a }); }
  };
  if (A) chooseHarbours();
  // ---- look a: the zone names, printed on open ground or water of their rings (chosen before the scenery is laid,
  // round the harbours' sectors: their piers' water, the quay and the town behind it are reserved while they choose)
  const RESERVED = 4;
  // (the harbour's water by its piers, its quay and the first row of its town: a name may still lie beyond them)
  if (A) for (const H of harbours) for (let a = H.a - 15; a <= H.a + 15; a += 0.5) for (let r = 60; r <= 81; r += 0.5) {
    const i = ci(Math.cos(rad(a)) * r), j = ci(Math.sin(rad(a)) * r);
    if (i >= 0 && j >= 0 && i < N && j < N && !occ[j * N + i]) occ[j * N + i] = RESERVED;
  }
  const tall = A ? tallParts(D) : null;
  const tN = performance.now();
  const names = A ? placeZoneNames({ occ, N, H0, stage, hAt, slope, tall, square }) : null;
  ZONE_LABELS.ms = Math.round(performance.now() - tN);
  if (A) for (let k = 0; k < N * N; k++) if (occ[k] === RESERVED) occ[k] = 0;
  if (names) for (const n of names) for (const [x, z] of n.cells) mark(x, z, 0.8, 3);
  // (where the names' letters lie, for what stands tall in the setting to keep its distance: nearName)
  const nameCell = new Uint8Array(N * N);
  if (names) for (const n of names) for (const [x, z] of n.cells) { const i = ci(x), j = ci(z); if (i >= 0 && j >= 0 && i < N && j < N) nameCell[j * N + i] = 1; }
  const nearName = (x, z, d) => {
    for (let j = ci(z - d); j <= ci(z + d); j++) for (let i = ci(x - d); i <= ci(x + d); i++) {
      if (i < 0 || j < 0 || i >= N || j >= N || !nameCell[j * N + i]) continue;
      if ((i - H0 + 0.5 - x) ** 2 + (j - H0 + 0.5 - z) ** 2 <= d * d) return true;
    }
    return false;
  };
  // what else stands tall over the ground a name may lie on, as spheres [x, y, z, r] (zoneNames3d keeps every name's
  // room clear of them on screen): the sunflower's face, which turns to the reader (headDisc: its round with the
  // petals), and the windmills laid below
  // (the face as it is drawn now: on the map it draws itself smaller while it would hide another district -- d-core.js
  // -- and headDisc follows it; zoneNames3d reads it every frame)
  const BLOCK = [];
  if (A) for (const d of Object.values(D)) if (d.headDisc) BLOCK.push(Object.assign([d.headDisc.center.x, d.headDisc.center.y, d.headDisc.center.z, d.headDisc.r, 0.5], { disc: d.headDisc }));

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
  // (look a: never within 9 units of a printed name's letters -- a mill stands about 7 units tall, and from a desk's
  // tilt it covers the ground up to 8 units behind it: 費 of 消費者 lay under one)
  for (const t of tops) { if (mills.length >= 2) break; if (mills.every((m) => Math.hypot(m.x - t.x, m.z - t.z) > 26) && free(t.x, t.z, 4) && !nearName(t.x, t.z, 9)) { mills.push(t); mark(t.x, t.z, 3); } }
  if (A) for (const m of mills) BLOCK.push([m.x, footY(m.x, m.z, 1) + 3.6, m.z, 3.4, 0.25]);
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
  if (!A) chooseHarbours();
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
  // look a: each brand's district is the landmark of a quarter of its own on the plateau -- a few rows of houses and
  // an office block turned toward it, a lamp at its approach -- so that on the map (and in the brands' own view) the
  // three stand in a lived-in shore, not on bare sand: the brand world they belong to.  Printed in the setting's quiet
  // tints, a step under the districts' own inks
  const quarters = [];
  if (A) for (const [id, d] of Object.entries(D)) {
    if (d.zone !== 'brand') continue;
    const c = d.pin || d.anchor;
    if (!c) continue;
    let n = 0, towers = 0;
    for (let k = 0; k < 700 && n < 11; k++) {
      const a = R() * TAU, dist = rr(9, 26), x = c.x + Math.cos(a) * dist, z = c.z + Math.sin(a) * dist, r = Math.hypot(x, z);
      if (r < 70 || r > 94.5 || !land(x, z, 4.3) || slope(x, z) > 0.35 || !free(x, z, 2.3)) continue;
      const sd = stage.sd(x, z);
      if (sd < 3.2 || sd > 15) continue;
      const ry = Math.atan2(-(c.z - z), c.x - x) + rr(-0.2, 0.2) + Math.PI / 2;
      if (towers < 1 && sd > 6) { put('tower', x, footY(x, z, 1.7), z, ry, rr(0.95, 1.12), [pick([P.wall, P.tower, P.wall2]), P.steel, P.window]); mark(x, z, 2.4); towers++; }
      else house(x, z, ry, { chimney: R() < 0.12 });
      n++;
    }
    // (a lamp or two where its quarter meets its stage)
    for (let k = 0, l = 0; k < 120 && l < 2; k++) {
      const a = R() * TAU, dist = rr(5, 12), x = c.x + Math.cos(a) * dist, z = c.z + Math.sin(a) * dist;
      const sd = stage.sd(x, z);
      if (sd < 1.6 || sd > 3.6 || !land(x, z, 4.3) || !free(x, z, 0.8)) continue;
      lampAt(x, z); l++;
    }
    quarters.push({ id, n });
  }
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
  paintLand({ sites, hamlets, harbours, quays, jetties, mills, D, hAt, free, R, square });

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
    // the names are drawn over the composite (look.js OVERLAY), not into the drawing
    if (names && names.length && OVERLAY && NPR_U.tD) {
      for (const o of OVERLAY.children.filter((c) => c.name === 'zone-names')) OVERLAY.remove(o);
      const nm = zoneNames3d(names, tall, { top: stage.top, life, block: BLOCK });
      OVERLAY.add(nm.mesh);
      counts.names = nm.glyphs; counts.nameCopies = names.length;
    }
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
  return { group, update, counts, _dbg: { harbours, quarters, hamlets, islets, jetties, mills, occ, stage, names: names && names.map((n) => ({ zone: n.Z.zone, copy: n.copy, deg: n.deg, r: n.r, size: +n.size.toFixed(2), track: n.track, hid: n.hid })) } };
}

// =================================================================== the land-use map
function paintLand({ sites, hamlets, harbours, quays, jetties, mills, D, hAt, R, square }) {
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
  // (the town square in the middle is the first node: every path of the consumers' land leads to it)
  const nodes = [...(square ? [[0, 0]] : []), ...hamlets.map((h) => [h.x, h.z]), ...mills.map((m) => [m.x, m.z]), ...jetties.map((j) => [j.x - Math.cos(j.a) * 1.5, j.z - Math.sin(j.a) * 1.5])];
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
  // the consumers' town square: its paving, and a paved way from it to each of its three districts
  if (square) {
    gb.beginPath(); gb.arc(X(0), X(0), square.paving.r * S, 0, TAU); gb.fill();
    gb.lineWidth = 2.1 * S; gb.lineCap = 'round';
    for (const [px, pz] of square.paving.paths) {
      const L = Math.hypot(px, pz), ux = px / L, uz = pz / L;
      gb.beginPath(); gb.moveTo(X(ux * square.paving.r * 0.8), X(uz * square.paving.r * 0.8)); gb.lineTo(X(px - ux * 4), X(pz - uz * 4)); gb.stroke();
    }
  }
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
    if (r > 34 && r < 93) dep = Math.min(1, Math.max(0, (SEA_Y - hAt(x, z)) / 4.0));
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
const PLATE_STAGE = ['trust', 'twins'];
function stageField(D) {
  // (a narrow margin round what stands on the ground — the clearing is the ring's own ground, calmer, not a panel)
  const N = STAGE.N, S = N / 200, PAD = 0.8, CLOSE = 1.8, CONTACT = 5.0, FAR = 46;
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
  // what stands above the ground, from above (for the zone names: what a ray from a letter toward the reader runs
  // into): the top of the districts' geometry over each 1-unit cell
  const TN = 201, TH0 = 100.5, topA = new Float32Array(TN * TN).fill(-99);
  const tput = (x, z, y) => { const i = Math.floor(x + TH0), j = Math.floor(z + TH0); if (i < 0 || j < 0 || i >= TN || j >= TN) return; const q = j * TN + i; if (y > topA[q]) topA[q] = y; };
  const tbox = (b) => { for (let z = b.min.z; z < b.max.z + 0.9; z += 0.9) for (let x = b.min.x; x < b.max.x + 0.9; x += 0.9) tput(Math.min(x, b.max.x), Math.min(z, b.max.z), b.max.y); };
  /** a triangle's cover: its corners, and for a large one points across it, each at the triangle's highest point */
  const ttri = (W, a, b, c, ex) => {
    const y = Math.max(W[a * 3 + 1], W[b * 3 + 1], W[c * 3 + 1]);
    const n = ex > 1.2 ? Math.min(24, Math.ceil(ex / 0.8)) : 1;
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) {
      const u = i / n, v = j / n, w = 1 - u - v;
      tput(W[a * 3] * w + W[b * 3] * u + W[c * 3] * v, W[a * 3 + 2] * w + W[b * 3 + 2] * u + W[c * 3 + 2] * v, y);
    }
  };
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
          _bb.copy(b).applyMatrix4(_mw); tbox(_bb);
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
        if (hi[i]) tput(_v.x, _v.z, _v.y);
      }
      const idx = geo.index ? geo.index.array : null, nt = idx ? idx.length / 3 : n / 3;
      // small triangles: their vertices as dots; large ones (a deck, a platform's top): filled
      const tst = Math.max(1, Math.floor(nt / 40000));
      for (let t = 0; t < nt; t += tst) {
        const a = idx ? idx[t * 3] : t * 3, b = idx ? idx[t * 3 + 1] : t * 3 + 1, cc = idx ? idx[t * 3 + 2] : t * 3 + 2;
        const ex = Math.max(Math.abs(W[a * 3] - W[b * 3]), Math.abs(W[a * 3 + 2] - W[b * 3 + 2]), Math.abs(W[a * 3] - W[cc * 3]), Math.abs(W[a * 3 + 2] - W[cc * 3 + 2]));
        if (hi[a] || hi[b] || hi[cc]) ttri(W, a, b, cc, ex);
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
  // (districts whose stage would read as an empty plot -- wide, few masses of their own at rest: printed as a plate)
  const plateOfLab = ids.map((id) => (PLATE_STAGE.includes(id) ? 255 : 0));
  const data = STAGE.data, R2 = STAGE.range;
  for (let i = 0; i < N * N; i++) {
    const sd = fin[i] ? -ins.d[i] / S - PAD : out.d[i] / S - PAD;
    sdA[i] = sd;
    data[i * 4] = Math.max(0, Math.min(255, Math.round((0.5 + sd / R2) * 255)));
    const l = d1.lab[i];
    data[i * 4 + 1] = l >= 0 ? zoneOfLab[l] : 0;
    data[i * 4 + 2] = sd < 0 && l >= 0 ? plateOfLab[l] : 0; data[i * 4 + 3] = 255;
    if (sd < 0 && l >= 0) area[ids[l]] = (area[ids[l]] || 0) + 1 / (S * S);
  }
  STAGE.tex.needsUpdate = true;
  // the silhouettes, grown by a unit
  const overD = edt(over, N).d;
  const ix = (x) => Math.min(N - 1, Math.max(0, Math.floor((x + 100) * S)));
  const at = (arr, x, z) => arr[ix(z) * N + ix(x)];
  for (const k of Object.keys(area)) area[k] = Math.round(area[k]);
  const top = {
    at: (x, z) => { const i = Math.floor(x + TH0), j = Math.floor(z + TH0); return i < 0 || j < 0 || i >= TN || j >= TN ? -99 : topA[j * TN + i]; },
    /** more of what stands (the town square's mesh): every vertex, and points across its large triangles */
    add(mesh) {
      if (!mesh || !mesh.geometry) return;
      mesh.updateMatrixWorld(true);
      const pos = mesh.geometry.attributes.position, n = pos.count, W = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { _v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld); W[i * 3] = _v.x; W[i * 3 + 1] = _v.y; W[i * 3 + 2] = _v.z; }
      const idx = mesh.geometry.index ? mesh.geometry.index.array : null, nt = idx ? idx.length / 3 : n / 3;
      for (let t = 0; t < nt; t++) {
        const a = idx ? idx[t * 3] : t * 3, b = idx ? idx[t * 3 + 1] : t * 3 + 1, c = idx ? idx[t * 3 + 2] : t * 3 + 2;
        ttri(W, a, b, c, Math.max(Math.abs(W[a * 3] - W[b * 3]), Math.abs(W[a * 3 + 2] - W[b * 3 + 2]), Math.abs(W[a * 3] - W[c * 3]), Math.abs(W[a * 3 + 2] - W[c * 3 + 2])));
      }
    },
  };
  return {
    top,
    sd: (x, z) => (Math.hypot(x, z) > 101 ? 99 : at(sdA, x, z)),
    zone: (x, z) => { const v = STAGE.data[(ix(z) * N + ix(x)) * 4 + 1]; return v === 64 ? 'brand' : v === 128 ? 'ai' : v === 192 ? 'consumer' : null; },
    over: (x, z) => at(overD, x, z) / S < 1.0,
    area,
  };
}

/**
 * The districts' spot fills: every pencil material of a district prints over a Riso ink from its zone's set (look.js
 * A.fig), chosen by what the material is — people in one warm tint wherever they are; what a district stands on (a
 * floor, a deck, a disc: large and flat) in the zone's lightest tint, so what stands on it reads; large masses
 * (buildings, hulls, walls) in its main ink, middling things (furniture, props) in its second, small ones (cups,
 * tools) in its deepest.  Typed and 人 materials (what AI makes) keep none: the composite also skips any pixel that
 * is typed, solid ink, accented or dimmed, so the story's own emphasis still leads.  Materials shared by several
 * meshes take the largest.  → the number of materials filled
 */
/** districts whose own drawing needs a deeper fill to read as a figure at map scale (kind -> the kind it prints as) */
const FILL_KIND = {
  // 數位分身怎麼來: its rows of desks are the hall's mass -- in the AI's deepest ink, so they read as one block on its
  // pale plate (a lighter tint where the sun falls on them), not as a grey-blue blur
  twins: { mid: 'small' },
  // 從想買到下單: what it stands on in the consumers' saffron, as the stadium of 品牌記憶 is -- never the pale cream of
  // the square's paving beside it
  market: { plate: 'mid' },
};
function figureFills(D) {
  const _bb = new THREE.Box3(), sz = new V3(), _mi = new M4();
  let n = 0;
  for (const [id, d] of Object.entries(D)) {
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
      // flat and lying down: what the district stands on
      const plate = a >= 24 && sz.x * sz.z >= a * 0.99 && sz.y < 0.2 * Math.min(sz.x, sz.z);
      for (const m of mats) if (m) { const p = area.get(m); if (!p || a > p.a) area.set(m, { a, plate }); }
    });
    for (const [m, { a, plate }] of area) {
      const u = m.userData && m.userData.u;
      if (!u || !u.uPaint || m.visible === false) continue;
      if ((u.uStyle?.value ?? 0) >= 0.7) continue;                 // type and 人 stay the book's
      if (u.uPaint.value >= 1 && u.uPaint.value < 80) continue;     // already painted as part of the setting
      const kind = people.has(m) ? 'people' : plate ? 'plate' : a >= 24 ? 'large' : a >= 3.5 ? 'mid' : 'small';
      u.uPaint.value = figSlot(zone, FILL_KIND[id]?.[kind] ?? kind);
      n++;
    }
  }
  return n;
}

// =================================================================== look a: the zone names, printed on the map
// 品牌, AI and 消費者 are the map's three region names: each set along its own ring's curve, letter-spaced, in its ring's
// ink, on open ground or water of that ring — never on a stage, a district's silhouette or a flow (the scenery is laid
// after them and keeps off their ground).  They are type to be read, not drawing: drawn after the composite at the
// canvas's own resolution from distance-field glyphs (antialiased at any size), with a narrow knock-out that clears
// the ground's screen, lines and type round each letter, and hidden behind whatever of the drawing stands in front
// of them (the drawing buffer's depth, npr.js OVERLAY).
// Each ring has up to five placements (copies) round it, chosen so that from every view a reader can turn or tilt
// the map to, one of them (where it can, two) lies across the screen, unhidden (placeZoneNames: views).  Every frame
// one copy of each ring shows (zoneNames3d): the copy on show keeps its place while it reads; when it no longer does,
// the best-reading one takes over within half a second, on the real clock.  Nothing a district stands up (a pier's
// people, a stall), no flow's course and no tall part may hide a copy that shows.  A name is never set vertically and
// never upside down: it reads along its arc left to right (flipped half a turn when the arc runs the other way), and
// steps aside when it would be foreshortened, too small or steeper than 50 deg (60 deg for a ring with no other copy
// to show), instead of being squashed.  In a ring's own view (#/zone/<id>) only that ring's name shows, in its largest
// copy that reads (the zone's framing, ui.js, holds one that runs across).  In a district they step back with the rest
// of the setting.
// One mesh, one material, one draw call.
const NAME_SET = [
  // zone, name, glyph size (world units: the phone's default map shows about 1.6 css px of glyph height per unit;
  // the desk's about 2.3 at the near side, see NAME_DESK), trackings to try (x size, widest first: a region's name is
  // letter-spaced, but where its ground is crowded it closes up before it shrinks), radii to try (best first), the
  // ground it may stand on
  { zone: 'brand', name: '品牌', size: 14, tracks: [0.5, 0.36, 0.22], radii: [84, 82, 86, 80, 88, 78, 90], medium: 'plateau' },
  // (ink: how tall the name's letters stand in its em -- two Latin capitals stand about four fifths as tall as a Chinese
  // character, so AI is measured by its letters, not its em, and prints as tall as 品牌 and 消費者)
  { zone: 'ai', name: 'AI', size: 14, tracks: [0.55, 0.4], radii: [57, 55, 59, 53, 61, 64, 50, 66], medium: 'water', copyMin: 0.62, ink: 0.8 },
  // the consumers' island is crowded with districts: its name may also run along its coast (beach and shallows)
  // (since the town square took the middle, the land between its three districts is narrow: its copies may be smaller
  // than the first, down to copyMin of it, and closer set)
  { zone: 'consumer', name: '消費者', size: 11, tracks: [0.3, 0.18, 0.08], radii: [31, 28, 34, 37, 25, 39, 40.5, 42, 43.5, 22], medium: 'island', copyMin: 0.6, sepMin: 28 },
];
/** sizes to try (x the ring's size, largest first) and how near a stage's edge a letter may come (units, nearest
 *  last); a copy that is not the first may be smaller than the first, down to COPY_MIN of it */
const NAME_K = [1, 0.92, 0.85, 0.78, 0.71, 0.64, 0.58, 0.52];
const NAME_SD = [2.4, 1.6, 1.1];
const COPY_MIN = 0.72;
const NAME_INK = { brand: 0, ai: 1, consumer: 2 };
const NAME_FONT = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", "Heiti TC", sans-serif';
const NAME_WEIGHT = 700;
/** on wide screens the disk is seen about 2.4 times as large as on phones: the names are printed smaller there, each
 *  copy at the scale (CAP_DESK below, never under NAME_DESK) that gives the three rings one size of lettering */
const NAME_DESK = 0.45;
/** the map's default camera azimuth (mappose.js MAP_AZ, on phones and desks) - the first copy of each name reads
 *  across the screen from there - and its default views (mappose.js MAP_EL: a portrait phone and a desk), from which
 *  no copy should lie behind a district's tall part */
const AZ0 = MAP_AZ;
const VIEWS = [{ az: AZ0, el: MAP_EL.desk }, { az: AZ0, el: MAP_EL.portrait }];
const COPIES = 5;

/** the ground's (or the water's) height over the disk on a 256² grid, worked out once: gAt(x, z) */
let GROUND_ = null;
function GROUND() {
  if (GROUND_) return GROUND_;
  const HN = 256, hf = new Float32Array(HN * HN);
  for (let j = 0; j < HN; j++) for (let i = 0; i < HN; i++) hf[j * HN + i] = Math.max(heightAt(((i + 0.5) / HN) * 200 - 100, ((j + 0.5) / HN) * 200 - 100), SEA_Y);
  const gAt = (x, z) => { const i = Math.min(HN - 1, Math.max(0, Math.floor(((x + 100) / 200) * HN))), j = Math.min(HN - 1, Math.max(0, Math.floor(((z + 100) / 200) * HN))); return hf[j * HN + i]; };
  return (GROUND_ = { HN, hf, gAt });
}
/** each glyph's advance in em (CJK: 1; Latin from the font) */
function advances(text) {
  const c = document.createElement('canvas').getContext('2d');
  c.font = `${NAME_WEIGHT} 100px ${NAME_FONT}`;
  return [...text].map((ch) => (/[　-鿿]/.test(ch) ? 1 : Math.max(0.3, c.measureText(ch).width / 100)));
}
const angSep = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
/** distance between two directions taken without their sense (a name reads across the screen at θ and θ + 180°) */
const lineSep = (a, b) => { const d = angSep(a, b); return Math.min(d, 180 - d); };

function placeZoneNames({ occ, N, H0, stage, hAt, slope, tall, square }) {
  /** how much of a copy is hidden, seen along the direction v (toward the reader): sampled at five points along its
   *  arc -- by a district's tall part (a sphere) standing in front of it, or by anything of a district or of the
   *  square standing on the ground between it and the reader (stage.top: a ray from the letter toward the reader runs
   *  into it), a pier's people or a stall's awning as much as a tower */
  const top = stage.top, { gAt } = GROUND();
  const hiddenFrom = ([vx, vy, vz], r, th, total, near = tall, across = 0) => {
    const hl = Math.hypot(vx, vz) || 1e-6, ux = vx / hl, uz = vz / hl, rise = vy / hl;
    let n = 0;
    const rows = across ? [-across, 0, across] : [0];
    for (let q = 0; q < 5 * rows.length; q++) {
      const i = q % 5, rr = r + rows[(q / 5) | 0];
      const a = th + ((i / 4 - 0.5) * total) / r, px = Math.cos(a) * rr, pz = Math.sin(a) * rr, py = gAt(px, pz) + 0.3;
      let hit = near.some(([cx, cy, cz, cr]) => {
        const dx = cx - px, dy = cy - py, dz = cz - pz, t = dx * vx + dy * vy + dz * vz;
        return t > 0 && dx * dx + dy * dy + dz * dz - t * t < cr * cr;
      });
      if (!hit && top) for (let s = 0.8; s <= 18; s += 0.8) if (top.at(px + ux * s, pz + uz * s) > py + rise * s) { hit = true; break; }
      if (hit) n++;
    }
    return n / (5 * rows.length);
  };
  /** how much of a copy the districts hide from the map's default views (VIEWS): the worse of the two */
  const vdir = VIEWS.map(({ az, el }) => [Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)]);
  const hidden = (r, th, total) => Math.max(...vdir.map((v) => hiddenFrom(v, r, th, total)));
  // ---- the views a reader can turn the map to: every 15 deg round, as a phone held upright and a desk show the map
  // at rest (their default elevation, the free part of their screen, the whole disk in it) and at a low tilt.  A copy
  // reads from a view as zoneNames3d judges it every frame: across the screen (not near vertical, not foreshortened),
  // large enough, on the screen, and not hidden behind a district (seen from that camera)
  const VIEW_SET = [
    { el: MAP_EL.portrait, wt: 1, w: 390, h: 650, d: 560 },
    { el: MAP_EL.desk, wt: 1, w: 1040, h: 836, d: 300, desk: true },
    { el: 0.55, wt: 0.5, w: 390, h: 650, d: 600 },
    { el: 0.55, wt: 0.5, w: 1040, h: 836, d: 320, desk: true },
  ];
  const views = [];
  for (const S of VIEW_SET) for (let i = 0; i < 24; i++) {
    const az = (i / 24) * TAU, cam = new THREE.PerspectiveCamera(32, S.w / S.h, 1, 1600);
    cam.position.set(Math.cos(az) * Math.cos(S.el) * S.d, Math.sin(S.el) * S.d, Math.sin(az) * Math.cos(S.el) * S.d);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld(true);
    views.push({ ...S, az, cam });
  }
  const WT = views.reduce((s, V) => s + V.wt, 0);
  const _p0 = new V3(), _pa = new V3(), _pu = new V3(), _dv = [0, 0, 0];
  /** how well a candidate reads from each view (0 ... 1), worked out once per candidate */
  const reads = (c) => {
    if (c.rd) return c.rd;
    const rd = new Float32Array(views.length);
    const cx = Math.cos(c.th) * c.r, cz = Math.sin(c.th) * c.r, cy = gAt(cx, cz) + 0.2;
    const tx = -Math.sin(c.th), tz = Math.cos(c.th), em = c.total / c.size;
    const near = tall.filter(([x, , z, rr]) => (x - cx) ** 2 + (z - cz) ** 2 < (c.total / 2 + 64 + rr) ** 2);
    views.forEach((V, k) => {
      _p0.set(cx, cy, cz).project(V.cam);
      if (_p0.z > 1) return;
      _pa.set(cx + tx * c.size, cy, cz + tz * c.size).project(V.cam);
      _pu.set(cx + tz * c.size, cy, cz - tx * c.size).project(V.cam);
      const ax = ((_pa.x - _p0.x) * V.w) / 2, ay = ((_pa.y - _p0.y) * V.h) / 2, ux = ((_pu.x - _p0.x) * V.w) / 2, uy = ((_pu.y - _p0.y) * V.h) / 2;
      const a0 = Math.hypot(ax, ay) || 1e-6, u0 = Math.hypot(ux, uy), nx = Math.abs(ax) / a0, ny = Math.abs(ay) / a0;
      // (a desk closes a large name in toward CAP_DESK, a phone toward CAP_PHONE, as zoneNames3d does)
      const ik = c.Z.ink ?? 1;
      const sc = V.desk ? Math.min(1, Math.max(NAME_DESK, CAP_DESK / Math.max(u0 * 0.9 * ik, 1e-3))) : Math.min(1, Math.max(NAME_PHONE, CAP_PHONE / Math.max(u0 * 0.9 * ik, 1e-3)));
      const along = a0 * sc, upl = u0 * sc;
      const ang = Math.atan2(Math.abs(ay), Math.abs(ax)), cap = upl * 0.9 * ik;
      const L = em * along, hx = nx * L / 2 + ny * cap * 0.6, hy = ny * L / 2 + nx * cap * 0.6;
      const sx = ((_p0.x + 1) * V.w) / 2, sy = ((1 - _p0.y) * V.h) / 2;
      if (sx - hx < 2 || sx + hx > V.w - 2 || sy - hy < 0 || sy + hy > V.h) return;
      let v = (1 - smoothstep(0.62, 0.9, ang)) * (V.desk ? smoothstep(15, 19, cap) : smoothstep(10, 13, cap)) * smoothstep(0.3, 0.5, upl / along);
      if (v > 0.05) {
        const dx = V.cam.position.x - cx, dy = V.cam.position.y - cy, dz = V.cam.position.z - cz, dl = Math.hypot(dx, dy, dz);
        _dv[0] = dx / dl; _dv[1] = dy / dl; _dv[2] = dz / dl;
        v *= 1 - smoothstep(0.1, 0.28, hiddenFrom(_dv, c.r, c.th, c.total * sc, near, 0.32 * c.size * sc));
      }
      rd[k] = v;
    });
    return (c.rd = rd);
  };
  // what each 1-unit cell of the map offers a letter, worked out once: which ground it is (bit 1 the island, 2 open
  // water, 4 the plateau), how far it is from the nearest stage (units), and whether a flow, a district's silhouette
  // or the disk's edge rules it out.  Every placement below is then table lookups.
  const MED = { island: 1, water: 2, plateau: 4 };
  const medA = new Uint8Array(N * N), sdA = new Float32Array(N * N);
  // (the ground's height at every cell's middle, once; its slope from the cells round it)
  const H1 = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) H1[j * N + i] = hAt(i - H0 + 0.5, j - H0 + 0.5);
  const slope1 = (i, j) => (i < 1 || j < 1 || i >= N - 1 || j >= N - 1 ? 9 : (Math.abs(H1[j * N + i + 1] - H1[j * N + i - 1]) + Math.abs(H1[(j + 1) * N + i] - H1[(j - 1) * N + i])) / 4);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i, x = i - H0 + 0.5, z = j - H0 + 0.5, r = Math.hypot(x, z);
    if (r > 96 || inDock(x, z) || occ[k] === 2 || occ[k] === 4 || stage.over(x, z)) continue;
    // (nor on the town square, its paths' heads and what it has laid)
    if (square && r < 30 && square.keep(x, z)) continue;
    const sd = stage.sd(x, z);
    if (sd < NAME_SD[NAME_SD.length - 1]) continue;
    sdA[k] = sd;
    const h = H1[k], isl = islandSd(x, z), sl = slope1(i, j);
    let m = 0;
    // (each name on its own zone's ground: the twins' island is the AI's, neither the consumers' nor the brands' --
    // zoneAt(), from the cell's own height)
    const zn = isl < 1.5 || h < SEA_Y ? 'ai' : r < 56 ? 'consumer' : 'brand';
    if (r < 47 && h > SEA_Y - 1.4 && sl < 0.8 && zn !== 'ai' && isl > 3) m |= MED.island;
    if (h < SEA_Y - 0.9 && isl > 2) m |= MED.water;
    if (h > 4.3 && sl < 0.45 && zn === 'brand') m |= MED.plateau;
    medA[k] = m;
  }
  const at = (x, z) => { const i = Math.floor(x + H0), j = Math.floor(z + H0); return i < 0 || j < 0 || i >= N || j >= N ? -1 : j * N + i; };
  ZONE_LABELS.why = (x, z) => { const k = at(x, z); return { med: medA[k], sd: +sdA[k].toFixed(1), occ: occ[k], over: stage.over(x, z), ssd: +stage.sd(x, z).toFixed(1), sq: !!(square && square.keep(x, z)) }; };
  /** every place on the ring where the name fits at this size and tracking, clear of the stages by sdMin:
   *  the band a copy covers is its arc's length and its letters' height, with the knock-out's margin */
  const scan = (Z, adv, size, track, sdMin, list) => {
    const total = adv.reduce((s, a) => s + a * size, 0) + track * size * (adv.length - 1);
    const half = total / 2 + 0.7, hw = size * 0.56 + 0.35, bit = MED[Z.medium];
    for (const r of Z.radii) {
      for (let deg = 0; deg < 360; deg += 2) {
        const th = rad(deg);
        let good = true, clr = 99;
        const cells = [];
        for (let s = -half; s <= half && good; s += 1) for (let o = -hw; o <= hw; o += 1) {
          const a = th + s / r, x = Math.cos(a) * (r + o), z = Math.sin(a) * (r + o), k = at(x, z);
          if (k < 0 || !(medA[k] & bit) || sdA[k] < sdMin) { good = false; break; }
          clr = Math.min(clr, sdA[k]);
          cells.push([x, z]);
        }
        if (!good) continue;
        // (a copy with more room round it, nearer the ring's preferred radius and less closed up reads better; one that
        // a tall part hides from a default view reads worse)
        // (how much the districts hide it from the default views is worked out later, only for the few that may be
        // chosen: hidQ)
        list.push({ Z, r, th, deg, size, track, total, adv, cells, hid: null, q: 0.03 * Math.min(clr, 6) - 0.02 * Math.abs(r - Z.radii[0]) + 0.1 * track });
      }
    }
  };
  /** the copies: the first is the largest that fits, reading across the screen from the default view; each next one
   *  is the one that adds the most views from which the ring would otherwise be unnamed (the views above), so that
   *  whichever way the reader turns or tilts the map one copy reads -- as large as it can be, never under COPY_MIN
   *  (or the ring's copyMin) of the first, never within sepMin of another copy */
  // (the rings' copies already chosen: a copy of the next ring is set off from them round the map, so that from no view
  // do two rings' names stand one above the other in a column -- the three names never read as one stacked label)
  const taken = [];
  const column = (c) => taken.reduce((t, o) => t + (o.Z !== c.Z ? 1 - smoothstep(14, 26, angSep(o.deg, c.deg)) : 0), 0);
  const choose = (list) => {
    if (!list.length) return [];
    const big = Math.max(...list.map((c) => c.size));
    // (the first: of the largest, the best in each 2 deg of the ring, then the one that reads best across the default
    // views and is least hidden there)
    const fb = new Map();
    for (const c of list) {
      if (c.size < big * 0.97) continue;
      const b = Math.round(c.deg / 2), o = fb.get(b);
      if (!o || c.q > o.q) fb.set(b, c);
    }
    const hidQ = (c) => (c.hid ??= tall && tall.length ? hidden(c.r, c.th, c.total) : 0);
    const fs = (c) => c.q - 1.6 * hidQ(c) + Math.abs(Math.cos(c.th - AZ0)) - 0.9 * column(c);
    const first = [...fb.values()].reduce((b, c) => (fs(c) > fs(b) ? c : b));
    first.q -= 1.6 * hidQ(first);
    // (the pool: the best candidate in each 4 deg of the ring that is large enough to be a copy of the first)
    const minSize = first.size * (first.Z.copyMin ?? COPY_MIN);
    const bins = new Map();
    for (const c of list) {
      if (c.size < minSize) continue;
      const b = Math.round(c.deg / 4), s = c.q + 0.6 * (c.size / first.size);
      const o = bins.get(b);
      if (!o || s > o.s) bins.set(b, { c, s });
    }
    const pool = [...bins.values()].map((o) => o.c);
    const picks = [first], cov = Float32Array.from(reads(first)), cov2 = new Float32Array(cov.length);
    while (picks.length < COPIES) {
      let best = null, bs = 0;
      for (const c of pool) {
        if (picks.some((p) => angSep(p.deg, c.deg) < (c.Z.sepMin ?? 30))) continue;
        const rd = reads(c);
        let g = 0;
        for (let k = 0; k < rd.length; k++) g += (Math.max(0, rd[k] - cov[k]) + 0.4 * Math.max(0, Math.min(rd[k], cov[k]) - cov2[k])) * views[k].wt;
        g = g * (0.75 + 0.25 * (c.size / first.size)) * (1 - 0.9 * Math.min(1, column(c))) + 0.05 * c.q;
        if (g > bs) { bs = g; best = c; }
      }
      if (!best || bs < 0.4) break;
      picks.push(best);
      const rd = reads(best);
      for (let k = 0; k < rd.length; k++) { cov2[k] = Math.max(cov2[k], Math.min(rd[k], cov[k])); cov[k] = Math.max(cov[k], rd[k]); }
    }
    // (for tests: the share of the views from which one of the copies reads)
    picks.coverage = +(views.reduce((s, V, k) => s + (cov[k] > 0.5 ? V.wt : 0), 0) / WT).toFixed(3);
    picks.gaps = views.filter((V, k) => cov[k] <= 0.5).map((V) => `${V.desk ? 'd' : 'p'}${Math.round((V.az * 180) / Math.PI)}/${V.el.toFixed(2)}`);
    picks.double = +(views.reduce((s, V, k) => s + (cov2[k] > 0.5 ? V.wt : 0), 0) / WT).toFixed(3);
    return picks;
  };
  const out = [];
  // (the most crowded ring chooses first -- the consumers' land, then the AI's water, then the brands' shore, which has
  // the most room -- and each next one keeps its copies off the angles the earlier ones took)
  const ORDER = { consumer: 0, ai: 1, brand: 2 };
  for (const Z of [...NAME_SET].sort((p, q) => ORDER[p.zone] - ORDER[q.zone])) {
    const adv = advances(Z.name);
    const list = [];
    let picks = [];
    // largest first; at each size the widest tracking and the most room round the stages are tried before closer ones.
    // Stop once the ring has all its copies, or once a smaller size could no longer be a copy of the first
    // (every size down to what could still be a copy of the largest that fits, then the copies chosen once)
    let big = 0;
    const t0 = performance.now();
    for (const k of NAME_K) {
      const size = Z.size * k;
      if (big && size < big * (Z.copyMin ?? COPY_MIN)) break;
      const n0 = list.length;
      // (every place that keeps the least clearance; more room round a place counts in its quality)
      for (const track of Z.tracks) scan(Z, adv, size, track, NAME_SD[NAME_SD.length - 1], list);
      if (!big && list.length > n0) big = size;
    }
    const t1 = performance.now();
    picks = choose(list);
    taken.push(...picks);
    (ZONE_LABELS.t ||= {})[Z.zone] = [Math.round(t1 - t0), Math.round(performance.now() - t1), list.length];
    if (!picks.length) { console.error(`[scenery] no room on the map for the zone name ${Z.name}`); continue; }
    (ZONE_LABELS.coverage ||= {})[Z.zone] = { share: picks.coverage, double: picks.double, gaps: picks.gaps };
    // (for tests: where else the name could have gone, by angle)
    (ZONE_LABELS.cands ||= {})[Z.zone] = [...new Set(list.map((c) => `${c.deg}:${c.r}:${c.size.toFixed(1)}`))].slice(0, 400);
    out.push(...picks.map((p, i) => ({ ...p, copy: i })));
  }
  ZONE_LABELS.length = 0;
  for (const p of out) ZONE_LABELS.push({ zone: p.Z.zone, name: p.Z.name, a: +p.th.toFixed(4), r: p.r, size: +p.size.toFixed(2), track: p.track, copy: p.copy, w: 0, box: null });
  ZONE_LABELS.missing = NAME_SET.filter((Z) => !out.some((p) => p.Z === Z)).map((Z) => Z.zone);
  return out;
}

/** the districts' tall parts (standing more than 7 units above their ground): what can stand between the reader and
 *  a name (choose() below lets a copy step aside when one does).  Each part is one sphere (a disc that turns to face
 *  the reader, a head, a box) or, when it is long and thin (a stem, a mast), a chain of small ones along it:
 *  [x, y, z, radius] */
function tallParts(D) {
  const out = [], b = new THREE.Box3();
  for (const [id, d] of Object.entries(D)) {
    d.group.updateMatrixWorld(true);
    d.group.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      for (let p = o; p; p = p.parent) if (!p.visible) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      if (mats.every((m) => !m || m.visible === false)) return;
      if (o.isInstancedMesh) { if (!o.count) return; o.computeBoundingBox(); b.copy(o.boundingBox); }
      else { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); b.copy(o.geometry.boundingBox); }
      b.applyMatrix4(o.matrixWorld);
      if (b.isEmpty() || b.max.x - b.min.x > 45 || b.max.z - b.min.z > 45) return;
      // (nor a part folded away to nothing -- a map-scale rig scaled to zero still has a box, a point in the air)
      if (Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z) < 0.5) return;
      const cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2, g = Math.max(heightAt(cx, cz), SEA_Y);
      if (b.max.y < g + 7) return;
      // (only what stands above the ground's first few units can hide a name lying on it)
      const y0 = Math.max(b.min.y, g + 3);
      const ex = [b.max.x - b.min.x, b.max.y - y0, b.max.z - b.min.z];
      const order = [0, 1, 2].sort((i, j) => ex[j] - ex[i]);
      const L = ex[order[0]], M = ex[order[1]];
      const c = [cx, (y0 + b.max.y) / 2, cz];
      // (a sphere a little inside the box: a flower's head, a crown or a roof is not solid out to its corners)
      if (L <= 2.2 * M) { out.push({ id, h: b.max.y - g, s: [...c, 0.42 * L] }); return; }
      const rr = Math.max(0.8, 0.5 * M), n = Math.min(8, Math.ceil(L / (2 * rr)));
      for (let i = 0; i < n; i++) {
        const q = c.slice(); q[order[0]] = (order[0] === 1 ? y0 : order[0] === 0 ? b.min.x : b.min.z) + (i + 0.5) * (L / n);
        out.push({ id, h: b.max.y - g, s: [...q, Math.max(rr, 0.5 * L / n)] });
      }
    });
  }
  const top = out.sort((p, q) => q.h - p.h).slice(0, 96);
  // (for the UI: which district each part belongs to -- a map pill's pin hidden behind another district's part)
  TALL_PARTS.length = 0;
  for (const o of top) TALL_PARTS.push({ id: o.id, x: o.s[0], y: o.s[1], z: o.s[2], r: o.s[3] });
  return top.map((o) => o.s);
}
/** look a, for the UI: the districts' tall parts as spheres { id, x, y, z, r } (world units), filled by buildScenery */
export const TALL_PARTS = [];
/** look a, desks: the glyph height (css px, x 0.9) a name grows toward when its ring has room; never past the size it
 *  was placed at, never under NAME_DESK of it.  (27, not 26: at DPR 1 a dense character such as 費 needs every pixel
 *  for its strokes and the gaps between them; larger, the names would close in for what stands round them) */
const CAP_DESK = 27;
/** phones: the one size the names are printed at whichever copy shows (css px, x 0.9) -- a copy placed larger closes
 *  in to it, so turning the map never swaps a large name for a small one; never under NAME_PHONE of its own size */
const CAP_PHONE = 22;
const NAME_PHONE = 0.62;

/** the names' mesh (OVERLAY): every glyph a small grid lying on the ground, laid out in the vertex shader from its
 *  copy's (angle, radius, reading sense and scale, weight), which choose() sets every frame */
function zoneNames3d(picks, TALL0, { top = null, life = null, block = [] } = {}) {
  // (the districts' tall parts and what else stands tall: the sunflower's face, the windmills; with the air a name
  // keeps from each, in letter heights -- the parts' spheres already stand a little proud of what they stand for, and
  // a big flat part's sphere -- a hall's roof -- much more: none blocks wider than 9 units)
  const TALL = [...TALL0.map((t) => [t[0], t[1], t[2], Math.min(t[3], 9), 0.15]), ...block.map((t) => Object.assign([...t], { disc: t.disc }))];
  const chars = [...new Set(picks.flatMap((p) => [...p.Z.name]))];
  const CS = 128, SP = 20, FPX = 84, QUAD = CS / FPX;           // cell px, distance-field spread px, font px
  const atlas = document.createElement('canvas');
  atlas.width = CS * chars.length; atlas.height = CS;
  const tex = new THREE.CanvasTexture(atlas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = true;
  tex.anisotropy = 4;
  // the glyphs as distance fields (each centred on its ink), drawn now — in the system CJK font if the page's own
  // Noto Sans TC is not in yet — and again when it is
  const draw = () => {
    const g = atlas.getContext('2d', { willReadFrequently: true });
    const img = g.createImageData(atlas.width, CS);
    const tmp = document.createElement('canvas'); tmp.width = tmp.height = CS;
    const t = tmp.getContext('2d', { willReadFrequently: true });
    chars.forEach((ch, k) => {
      t.clearRect(0, 0, CS, CS);
      t.fillStyle = '#fff'; t.textAlign = 'left'; t.textBaseline = 'alphabetic';
      t.font = `${NAME_WEIGHT} ${FPX}px ${NAME_FONT}`;
      const m = t.measureText(ch);
      const L = m.actualBoundingBoxLeft || 0, R = m.actualBoundingBoxRight || FPX * 0.9;
      const A = m.actualBoundingBoxAscent || FPX * 0.8, Dd = m.actualBoundingBoxDescent || 0;
      t.fillText(ch, CS / 2 - (R - L) / 2, CS / 2 + (A - Dd) / 2);
      const a = t.getImageData(0, 0, CS, CS).data;
      const ins = new Uint8Array(CS * CS), outs = new Uint8Array(CS * CS);
      for (let i = 0; i < CS * CS; i++) { ins[i] = a[i * 4 + 3] > 127 ? 1 : 0; outs[i] = 1 - ins[i]; }
      const dOut = edt(ins, CS).d, dIn = edt(outs, CS).d;
      for (let y = 0; y < CS; y++) for (let x = 0; x < CS; x++) {
        const i = y * CS + x, v = 0.5 + (ins[i] ? dIn[i] - 0.5 : -(dOut[i] - 0.5)) / (2 * SP);
        // (the canvas texture is flipped on upload: its top row is v = 1, the glyph's top)
        const o = (y * atlas.width + k * CS + x) * 4, b = Math.max(0, Math.min(255, Math.round(v * 255)));
        img.data[o] = img.data[o + 1] = img.data[o + 2] = b; img.data[o + 3] = 255;
      }
    });
    g.putImageData(img, 0, 0);
    tex.needsUpdate = true;
  };
  draw();
  try { if (document.fonts) document.fonts.load(`${NAME_WEIGHT} ${FPX}px "Noto Sans TC"`, chars.join('')).then((f) => { if (f && f.length) draw(); }, () => {}); } catch { /* no font API */ }

  // the ground's height under the letters: 256² half floats over the disk (GROUND)
  // (smoothed over about five units: printed type lies on the land's broad form, not on the hill's fingerprint ridges --
  // draped over them, at a low tilt the slopes facing away squeezed bands of each letter to slivers behind the crests
  // and the name read as eaten; the lift below clears the crests)
  const { HN, hf, gAt } = GROUND(), hd = new Uint16Array(HN * HN);
  const hs = Float32Array.from(hf), tmp = new Float32Array(HN * HN), RB = 3;
  for (let pass = 0; pass < 2; pass++) {
    for (let j = 0; j < HN; j++) for (let i = 0; i < HN; i++) { let t = 0, n = 0; for (let k = -RB; k <= RB; k++) { const q = i + k; if (q >= 0 && q < HN) { t += hs[j * HN + q]; n++; } } tmp[j * HN + i] = t / n; }
    for (let j = 0; j < HN; j++) for (let i = 0; i < HN; i++) { let t = 0, n = 0; for (let k = -RB; k <= RB; k++) { const q = j + k; if (q >= 0 && q < HN) { t += tmp[q * HN + i]; n++; } } hs[j * HN + i] = t / n; }
  }
  for (let i = 0; i < HN * HN; i++) hd[i] = THREE.DataUtils.toHalfFloat(Math.max(hs[i], SEA_Y));
  const htex = new THREE.DataTexture(hd, HN, HN, THREE.RedFormat, THREE.HalfFloatType);
  htex.magFilter = THREE.LinearFilter; htex.minFilter = THREE.LinearFilter; htex.generateMipmaps = false; htex.colorSpace = THREE.NoColorSpace;
  htex.needsUpdate = true;

  // each glyph: a GS x GS grid that lies over the ground's smoothed form (below)
  const GS = 10;
  const pos = [], aG = [], aQ = [], aT = [], aR = [], idx = [];
  const C = picks.map((p) => {
    const lift = p.Z.medium === 'water' ? 0.34 : 0.8;
    const w = p.adv.map((a) => a * p.size), gap = p.track * p.size;
    const ch3 = [...p.Z.name], mid = [];
    let x0 = -p.total / 2;
    for (let i = 0; i < ch3.length; i++) { mid.push(x0 + w[i] / 2); x0 += w[i] + gap; }
    ch3.forEach((ch, i) => {
      const s = mid[i];
      const k = chars.indexOf(ch), base = pos.length / 3;
      // the knock-out lane under this letter, in em from its middle: to the midpoint toward each neighbour, or (an
      // outer end: negative) a little past its own edge
      const end = -(p.adv[i] / 2 + 0.06);
      const left = i > 0 ? (s - mid[i - 1]) / 2 / p.size : end, right = i < ch3.length - 1 ? (mid[i + 1] - s) / 2 / p.size : end;
      for (let b = 0; b <= GS; b++) for (let a = 0; a <= GS; a++) {
        const u = a / GS - 0.5, v = b / GS - 0.5;
        pos.push(Math.cos(p.th) * p.r, 0, Math.sin(p.th) * p.r);
        aG.push(s, p.size, lift, C_IDX(p));
        aQ.push(u, v, NAME_INK[p.Z.zone]);
        aT.push((k + 0.5 + u) / chars.length, 0.5 + v);
        aR.push(left, right);
      }
      for (let b = 0; b < GS; b++) for (let a = 0; a < GS; a++) {
        const q = base + b * (GS + 1) + a;
        idx.push(q, q + 1, q + GS + 1, q + 1, q + GS + 2, q + GS + 1);
      }
    });
    // the copy's centre (for choose()): its arc's middle, on the ground
    const cx = Math.cos(p.th) * p.r, cz = Math.sin(p.th) * p.r;
    return { p, lift, y: Math.max(heightAt(cx, cz), SEA_Y) + lift, em: p.total / p.size, flip: 1, w: 0, label: ZONE_LABELS.find((l) => l.zone === p.Z.zone && l.copy === p.copy) };
  });
  function C_IDX(p) { return picks.indexOf(p); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aG', new THREE.Float32BufferAttribute(aG, 4));
  geo.setAttribute('aQ', new THREE.Float32BufferAttribute(aQ, 3));
  geo.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 2));
  geo.setAttribute('aR', new THREE.Float32BufferAttribute(aR, 2));
  geo.setIndex(idx);

  const NC = Math.max(1, picks.length);
  // per copy: (angle, radius, reading sense x scale, weight)
  const uCopy = { value: Array.from({ length: NC }, () => new THREE.Vector4()) };
  const inks = ['nameBrand', 'nameAi', 'nameConsumer'].map((k) => new THREE.Color(LOOK_DEF.own.find((o) => o[0] === P[k])[1]).convertLinearToSRGB());
  const U = NPR_U;
  // two passes over the same letters: first every letter's knock-out, then every letter's ink -- so the knock-out of
  // one letter never lies over the strokes of the one before it (in one pass a later letter's knock-out erased the
  // near edge of its neighbour wherever the two came close: 消 lost its right side to 費)
  const uniforms = {
    uCopy, uTime: T_WORLD, uHgt: { value: htex }, uGlyphs: { value: tex }, uInks: { value: inks },
    tD: U.tD, tG: U.tG, tPal: U.tPal, tPaper: U.tPaper, uRes: U.uRes, uDpr: U.uDpr, uNear: U.uNear, uFar: U.uFar,
    uFogNear: U.uFogNear, uFogFar: U.uFogFar, uReveal: U.uReveal, uRevealO: U.uRevealO, uFade: U.uFade, uNight: U.uNight, uPaper: U.uPaper, uCalm: LOOK_U.calm,
  };
  const mkMat = (pass) => new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
    defines: { NAME_PASS: pass },
    uniforms,
    vertexShader: /* glsl */`
      #define NC ${NC}
      uniform vec4 uCopy[NC];
      uniform float uTime;
      uniform sampler2D uHgt;
      attribute vec4 aG;      // the glyph's arc offset from the name's middle, its size, its lift, its copy
      attribute vec3 aQ;      // the corner (-0.5 ... 0.5), the ink
      attribute vec2 aT;
      attribute vec2 aR;      // the lane's extent from the letter's middle (em): left, right; negative at an outer end
      varying vec2 vT; varying float vA; varying float vInk; varying vec3 vWP; varying vec2 vL; varying vec2 vR;
      void main(){
        vec4 C = uCopy[int(aG.w + 0.5)];
        vA = C.w;
        vT = aT; vInk = aQ.z; vR = aR;
        vL = aQ.xy * ${QUAD.toFixed(4)};
        if (C.w < 0.002) { vWP = vec3(0.0); gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
        float fl = sign(C.z), rr = C.y, sc = abs(C.z);
        // the glyph's place on the arc, in reading order; its baseline along the arc and its top away from the reader
        float th = C.x + fl * aG.x * sc / rr;
        vec2 dir = vec2(cos(th), sin(th));
        vec2 b = vec2(-dir.y, dir.x) * fl;
        vec2 up = vec2(b.y, -b.x);
        vec2 xz = dir * rr + (aQ.x * b + aQ.y * up) * aG.y * sc * ${QUAD.toFixed(4)};
        float y = max(texture2D(uHgt, xz / 200.0 + 0.5).r, ${SEA_Y.toFixed(2)}) + aG.z;
        if (aG.z > 0.25) {
          // on the water: the sea's own swell (terrain.js buildSea)
          float r2 = length(xz), a2 = atan(xz.y, xz.x);
          y += sin(a2 * 18.0 + r2 * 0.6 - uTime * 0.8) * 0.18 + sin(r2 * 1.3 + uTime * 0.6) * 0.12;
        }
        vWP = vec3(xz.x, y, xz.y);
        gl_Position = projectionMatrix * viewMatrix * vec4(vWP, 1.0);
      }`,
    fragmentShader: /* glsl */`

      uniform sampler2D uGlyphs; uniform sampler2D tD; uniform sampler2D tG; uniform sampler2D tPal; uniform sampler2D tPaper;
      uniform vec2 uRes; uniform float uDpr; uniform float uNear; uniform float uFar; uniform float uFogNear; uniform float uFogFar;
      uniform float uReveal; uniform vec2 uRevealO; uniform float uFade; uniform float uNight; uniform float uCalm;
      uniform vec3 uPaper; uniform vec3 uInks[3];
      varying vec2 vT; varying float vA; varying float vInk; varying vec3 vWP; varying vec2 vL; varying vec2 vR;
      float linDepth(float d){ float z = d * 2.0 - 1.0; return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear)); }
      float paintOf(float a){ return a > 1.02 ? (a - 1.0) * 16.0 : 0.0; }
      void main(){
        // the letter's ink, as printed type: its coverage of this pixel, from sharp samples spread over the pixel's
        // footprint on the glyph -- a distance field filtered over a footprint wider than a stroke loses that stroke
        // (at DPR 1 the thin strokes of the water radical dropped out; at a low tilt, where a pixel spans many texels
        // up the letter and few across it, whole horizontal strokes did).  So: two rows of samples across the
        // footprint's short side and as many along its long side as it is longer (up to 8), each read at the detail
        // of its own small share of the pixel (textureGrad), each a sharp threshold, averaged.  The edge is not set
        // outward (at DPR 1 that closed the counters of a dense character).
        // (derivatives first, before anything is discarded)
        vec2 tx = dFdx(vT), ty = dFdy(vT);
        vec2 gsz = vec2(textureSize(uGlyphs, 0));
        float lx = length(tx * gsz), ly = length(ty * gsz);
        vec2 maj = lx > ly ? tx : ty, mnr = lx > ly ? ty : tx;
        float lmaj = max(lx, ly), lmin = max(min(lx, ly), 1e-3);
        float nm = clamp(ceil(lmaj / lmin), 1.0, 8.0);
        float d = texture2D(uGlyphs, vT, -1.0).r;
        float fw = max(length(vec2(dFdx(d), dFdy(d))), 1e-4);
        float sw = max(0.45 * lmin / ${(2 * SP).toFixed(1)}, 0.004);
        vec2 gA = maj / nm, gB = mnr * 0.5;
        float ink = 0.0;
        for (int i = 0; i < 8; i++) {
          if (float(i) >= nm) break;
          float t = (float(i) + 0.5) / nm - 0.5;
          ink += smoothstep(0.5 - sw, 0.5 + sw, textureGrad(uGlyphs, vT + maj * t - mnr * 0.25, gA, gB).r);
          ink += smoothstep(0.5 - sw, 0.5 + sw, textureGrad(uGlyphs, vT + maj * t + mnr * 0.25, gA, gB).r);
        }
        ink /= 2.0 * nm;
        float a = vA * (1.0 - uCalm) * (1.0 - uFade) * (1.0 - uNight);
        // the opening reveal: not before the drawing has spread this far
        if (uReveal < 1.0) a *= 1.0 - smoothstep(${REVEAL.r0.toFixed(1)} + uReveal * ${REVEAL.span.toFixed(1)} - 16.0, ${REVEAL.r0.toFixed(1)} + uReveal * ${REVEAL.span.toFixed(1)} - 4.0, length(vWP.xz - uRevealO));
        if (a < 0.004) discard;
        vec2 suv = gl_FragCoord.xy / uRes;
        // hidden behind whatever of the drawing stands in front of it -- not by the ground it lies on: the depth it may
        // lie under the drawn ground grows as the view grazes the ground (a vertical slip of the drape shows as a long
        // step in depth along a low ray), so a low tilt never eats the letters, and a tree or a stall still hides them
        float zf = linDepth(gl_FragCoord.z), zs = linDepth(texture2D(tD, suv).r);
        float graze = max(0.2, abs(normalize(vWP - cameraPosition).y));
        if (zf > zs + (0.5 + 0.0028 * zf) / graze) discard;
        a *= 1.0 - smoothstep(uFogNear, uFogFar, zf);
        // the knock-out round each letter (about a fifth of an em): the ground's own flat colour, without its
        // screen, its lines or the sea's type, only on the setting's own ground; and a lane of it from the first
        // letter to the last, so that nothing of the ground (a road, a field's edge, the sea's dots) shows between the
        // letters of one word
        // (never narrower than about two and a half css px past the stroke, so at DPR 1 a contour line or a halftone
        // dot never touches a letter)
        float hEdge = clamp(0.5 - 2.6 * uDpr * fw, 0.07, 0.19);
        float halo = smoothstep(hEdge - 0.9 * fw, hEdge + 0.9 * fw, d);
        float e0 = abs(vR.x), e1 = abs(vR.y);
        float inL = vR.x < 0.0 ? smoothstep(-e0 - 0.12, -e0 + 0.12, vL.x) : step(-e0, vL.x);
        float inR = vR.y < 0.0 ? 1.0 - smoothstep(e1 - 0.12, e1 + 0.12, vL.x) : step(vL.x, e1);
        halo = max(halo, inL * inR * (1.0 - smoothstep(0.4, 0.56, abs(vL.y))));
        vec4 g = texture2D(tG, suv);
        float pn = paintOf(g.a);
        float onGround = step(0.5, pn) * (1.0 - step(79.5, pn));
        vec3 alb = texture2D(tPal, vec2((pn + 0.5) / ${PAL_W.toFixed(1)}, 0.25)).rgb;
        vec3 ptex = texture2D(tPaper, gl_FragCoord.xy / (1536.0 * uDpr * 0.9)).rgb;
        vec3 paper = uPaper * (0.94 + 0.12 * (ptex - 0.86));
        float vig = smoothstep(1.25, 0.25, length((suv - 0.5) * vec2(uRes.x / uRes.y, 1.0)));
        paper *= mix(0.9, 1.0, vig);
        vec3 fill = paper * mix(vec3(1.0), alb, 0.94);
        vec3 inkC = uInks[int(vInk + 0.5)];
        // (solid ink on a solid knock-out: nothing of the ground's screen or lines shows through either)
        float ia = ink * 0.985, ha = halo * onGround;
#if NAME_PASS == 0
        gl_FragColor = vec4(fill, ha * a);
#else
        gl_FragColor = vec4(inkC, ia * a);
#endif
      }`,
  });
  const mesh = new THREE.Mesh(geo, mkMat(0));
  mesh.name = 'zone-names';
  mesh.frustumCulled = false;
  mesh.renderOrder = 10;
  // (the ink: the same letters, drawn right after; mesh.onBeforeRender below sets what both draw)
  const inkMesh = new THREE.Mesh(geo, mkMat(1));
  inkMesh.name = 'zone-names-ink';
  inkMesh.frustumCulled = false;
  inkMesh.renderOrder = 11;
  const names = new THREE.Group();
  names.name = 'zone-names';
  names.add(mesh, inkMesh);

  // ---- every frame (before it is drawn): which copy of each ring reads best now.  A ring is never left unnamed while
  // the reader turns the map: the copy on show keeps its place while it can be read (the camera moving or not), and
  // when it no longer can, the copy that reads best takes over at once -- the old one gone in about a tenth of a second,
  // the new one in under half a second, on the real clock (a slow frame never stretches the gap).  In a ring's own
  // view (#/zone/<id>) only that ring's name is placed.
  const _v = new V3(), _s0 = new THREE.Vector2(), _sz = new THREE.Vector2();
  const zones = [...new Set(C.map((c) => c.p.Z.zone))];
  let last = 0, lastMove = -1e9;
  // (a new place -- the map after a ring's view, a ring's view after the map -- is named as a cold load names it: the
  // first frame the camera rests there, the copies on show hold nothing, so the names never depend on the way in)
  let hash0 = null, fresh = true;
  const prevM = new Float32Array(16);
  const proj = (x, y, z, cam, w, h, out) => { _v.set(x, y, z).project(cam); out.set((_v.x + 1) * 0.5 * w, (1 - _v.y) * 0.5 * h); return _v.z; };
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const _a = new THREE.Vector2(), _u = new THREE.Vector2();
  const _cp = new V3(), _cr = new V3();
  // (the flows' courses on screen -- life.js keepPts: chains of discs -- are kept clear too: a name never sits under a
  // boat's, a bubble's or the card's way)
  const FL = Array.from({ length: 48 }, () => [0, 0, 0]);
  /** the share of 27 points of the name (9 along, 3 across), in world space, from which a ray toward the reader runs
   *  into something standing on the ground (top: the districts and the square) or into the ground's own rise */
  const fieldHid = (c, sc) => {
    if (!top) return 0;
    const { th, r } = c.p, L = c.p.total * sc, S = c.p.size * sc;
    let n = 0;
    for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) {
      const a = th + ((i / 8 - 0.5) * L) / r, rr = r + (j - 1) * 0.32 * S;
      const px = Math.cos(a) * rr, pz = Math.sin(a) * rr, py = gAt(px, pz) + c.lift + 0.15;
      const dx = _cp.x - px, dy = _cp.y - py, dz = _cp.z - pz, hl = Math.hypot(dx, dz) || 1e-6;
      const ux = dx / hl, uz = dz / hl, rise = dy / hl, far = Math.min(18, hl);
      let hit = false;
      for (let s = 0.8; s <= far; s += 0.8) if (top.at(px + ux * s, pz + uz * s) > py + rise * s) { hit = true; break; }
      // (or by the ground itself: at a low tilt a name on the far slope of the hill lies behind its crest)
      if (!hit) for (let s = 1, f2 = Math.min(48, hl); s <= f2; s += 1) if (gAt(px + ux * s, pz + uz * s) > py + rise * s + 0.3) { hit = true; break; }
      if (hit) n++;
    }
    return n / 27;
  };
  mesh.onBeforeRender = (renderer, scene, cam) => {
    const now = performance.now(), dt = last ? Math.min(0.5, (now - last) / 1000) : 1; last = now;
    renderer.getSize(_sz);
    const w = _sz.x, h = _sz.y;
    const desk = innerWidth >= 900 && innerHeight >= 500;
    // (the camera moving: the reader turning, tilting or zooming, or a flight)
    const me = cam.matrixWorld.elements, dist = Math.max(1, Math.hypot(me[12], me[13], me[14]));
    let mv = 0;
    for (let i = 0; i < 16; i++) mv = Math.max(mv, Math.abs(me[i] - prevM[i]) / (i >= 12 && i < 15 ? dist : 1));
    prevM.set(me);
    if (mv > 2e-4) lastMove = now;
    const moving = now - lastMove < 350;
    if (location.hash !== hash0) { hash0 = location.hash; fresh = true; }
    const cold = fresh && !moving;
    if (cold) fresh = false;
    const zm = /^#\/zone\/(brand|ai|consumer)\b/.exec(location.hash || '');
    const focus = zm ? zm[1] : null;
    const sideM = desk || focus ? 16 : 10;
    // the free part of the screen: under the top bar (ui.js freeRect: 48 css px on phones, 64 on desks), and beside
    // or above the panel, whose size the camera's view offset gives (it centres the free rect: engine.js offsetFor,
    // oy = bottom - top, ox = right)
    const topBar = desk ? 64 : 48;
    let x0 = 0, x1 = w, y0 = topBar, y1 = h;
    const vw = cam.view;
    if (vw && vw.enabled) {
      const ox = vw.offsetX > 0 ? vw.offsetX : -(vw.fullWidth - vw.width), oy = vw.offsetY > 0 ? vw.offsetY : -(vw.fullHeight - vw.height);
      if (ox > 0) x1 = w - ox; else x0 = -ox;
      y1 = Math.min(h, h - oy - topBar);
    }
    // the tall parts on screen this frame: circles (x, y, radius in css px) and how far in front of the camera their
    // nearest point is
    _cp.setFromMatrixPosition(cam.matrixWorld);
    _cr.setFromMatrixColumn(cam.matrixWorld, 0).normalize();
    const tall = [];
    for (const T of TALL) if (T.disc) { T[0] = T.disc.center.x; T[1] = T.disc.center.y; T[2] = T.disc.center.z; T[3] = T.disc.r; }
    for (const [tx0, ty0, tz0, tr, ta] of TALL) {
      const zc = proj(tx0, ty0, tz0, cam, w, h, _s0);
      if (zc < -1 || zc > 1) continue;
      const sx = _s0.x, sy = _s0.y;
      proj(tx0 + _cr.x * tr, ty0 + _cr.y * tr, tz0 + _cr.z * tr, cam, w, h, _s0);
      tall.push([sx, sy, Math.hypot(_s0.x - sx, _s0.y - sy), Math.hypot(tx0 - _cp.x, ty0 - _cp.y, tz0 - _cp.z) - tr, ta]);
    }
    let nFl = 0;
    if (life && life.keepPts) for (const { p, r } of life.keepPts()) {
      if (nFl >= FL.length || proj(p.x, p.y, p.z, cam, w, h, _s0) > 1) continue;
      FL[nFl][0] = _s0.x; FL[nFl][1] = _s0.y; FL[nFl][2] = r; nFl++;
    }
    const flows = FL.slice(0, nFl);
    for (const c of C) {
      const { th, r } = c.p;
      const cx = Math.cos(th) * r, cz = Math.sin(th) * r;
      const tx = -Math.sin(th), tz = Math.cos(th);
      const z0 = proj(cx, c.y, cz, cam, w, h, _s0);
      const _s0x = _s0.x, _s0y = _s0.y;
      // the reading sense: the name runs to the right on screen (decided on its projected direction: near the screen's
      // edge perspective can turn a ground direction the other way); kept while it runs near vertical (it fades there)
      proj(cx + tx * c.p.size, c.y, cz + tz * c.p.size, cam, w, h, _a); _a.sub(_s0);
      if (Math.abs(_a.x) > 0.12 * _a.length() || c.w < 0.02) c.flip = _a.x >= 0 ? 1 : -1;
      const bx = tx * c.flip, bz = tz * c.flip, ux = bz, uz = -bx;
      if (c.flip < 0) _a.negate();
      proj(cx + ux * c.p.size, c.y, cz + uz * c.p.size, cam, w, h, _u); _u.sub(_s0);
      // its scale: on a phone the size it was placed at (the largest its ground allows); on a desk, where the map is
      // seen larger, it closes in toward CAP_DESK of glyph height.  Where something stands in front of it, it closes in
      // further (down to NAME_DESK) before it gives way
      // (in a ring's own view its name stands a size larger, as the title of what the view shows)
      const ik = c.p.Z.ink ?? 1, cap1 = _u.length() * 0.9 * ik, capT = (desk ? CAP_DESK : CAP_PHONE) * (focus === c.p.Z.zone ? 1.3 : 1);
      const sc0 = Math.min(1, Math.max(desk ? NAME_DESK : NAME_PHONE, capT / Math.max(cap1, 1e-3)));
      const scMin = desk ? NAME_DESK : NAME_PHONE;
      const dn = Math.hypot(cx - _cp.x, c.y - _cp.y, cz - _cp.z);
      const ang = Math.atan2(Math.abs(_a.y), Math.abs(_a.x));              // 0: across the screen
      const nx = _a.x / (_a.length() || 1e-6), ny = _a.y / (_a.length() || 1e-6);
      // (a phone's name never closes in under 15 css px of glyph height to clear what stands in front of it: it steps
      // aside instead)
      const scales = [sc0, sc0 * 0.86, sc0 * 0.74, scMin].filter((v, i, l) => v >= scMin - 1e-6 && (i === 0 || v < l[i - 1]) && (i === 0 || desk || cap1 * v >= 15));
      for (const sc of scales) {
        const along = (_a.length() || 1e-6) * sc, upl = _u.length() * sc;
        const cap = upl * 0.9 * ik, fore = upl / along;
        const L = c.em * along;
        const hx = Math.abs(nx) * L / 2 + Math.abs(ny) * cap * 0.6, hy = Math.abs(ny) * L / 2 + Math.abs(nx) * cap * 0.6;
        // (wholly on the screen and well inside its sides -- 16 px on a desk and in a ring's own view, 10 on a phone's
        // overview, where the disc fills the width: a name is never cut by its edge, nor pressed against it)
        const inside = z0 < 1 && _s0x - hx > x0 + sideM && _s0x + hx < x1 - sideM && _s0y - hy > y0 + 6 && _s0y + hy < y1 - 6;
        const box = [_s0x - hx, _s0y - hy, _s0x + hx, _s0y + hy];
        // its room on screen -- the letters' band with air round it (half a letter from the sunflower's face and a
        // windmill) -- must be clear of every tall part as the reader sees it now, in front of the name or behind it:
        // the sunflower's face (its petals turn with the reader), the oracle's head, the gates.  A name half under the
        // petals, or printed over a district's silhouette, reads as part of it ('AI' beside 消費者 under the flower)
        let blk = false;
        if (inside) {
          const hu = L / 2, hv = cap * 0.6;
          for (const [sx, sy, sr, , ta] of tall) {
            const dx = sx - _s0x, dy = sy - _s0y, u = dx * nx + dy * ny, v = dy * nx - dx * ny;
            const du = Math.max(0, Math.abs(u) - hu), dv = Math.max(0, Math.abs(v) - hv), rr = sr + ta * cap;
            if (du * du + dv * dv < rr * rr) { blk = true; break; }
          }
        }
        // hidden: by a district's tall part standing in front of it (the sunflower's head, a tower) or by a flow, both
        // sampled along its own line on screen (9 points along, 3 across); by whatever stands on the ground between
        // it and the reader (fieldHid)
        let hid = blk ? 1 : 0;
        if (inside && !blk && sm(0.72, 0.98, ang) < 0.99) {
          const near = tall.filter(([sx, sy, sr, d]) => d < dn && sx + sr > box[0] && sx - sr < box[2] && sy + sr > box[1] && sy - sr < box[3]);
          const fl = flows.filter(([sx, sy, sr]) => sx + sr > box[0] && sx - sr < box[2] && sy + sr > box[1] && sy - sr < box[3]);
          if (near.length || fl.length) {
            let n = 0;
            for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) {
              const u = (i / 8 - 0.5) * L, v = (j / 2 - 0.5) * cap * 0.9;
              const px = _s0x + nx * u - ny * v, py = _s0y + ny * u + nx * v;
              if (near.some(([sx, sy, sr]) => (px - sx) ** 2 + (py - sy) ** 2 < sr * sr) || fl.some(([sx, sy, sr]) => (px - sx) ** 2 + (py - sy) ** 2 < sr * sr)) n++;
            }
            hid = n / 27;
          }
          if (hid < 0.2) hid = Math.max(hid, fieldHid(c, sc));
        }
        c.sc = sc; c.box = box; c.cap = cap; c.hid = hid; c.inside = inside; c.ang = ang;
        // (a steep name fades well before it would read upward: gone by 52 deg, so it never turns over while seen)
        // (large enough to read as a region's name: on a desk not under about 17 px of glyph, on a phone 13 -- the same
        // for the three rings, AI measured by its letters)
        const rest = inside ? (desk ? sm(15, 19, cap) : sm(11, 14, cap)) * sm(0.3, 0.5, fore) * (1 - sm(0.1, 0.28, hid)) : 0;
        // (a printed region's name lies nearly level: from about 35 deg it fades, by 52 it is gone)
        c.vis = (1 - sm(0.62, 0.9, ang)) * rest;
        // (and how it would read a little steeper, to 60 deg: for a ring that has no other copy to show)
        c.visR = (1 - sm(0.8, 1.06, ang)) * rest;
        // (a name shows clearly or not at all: never a ghost of itself)
        if (c.vis < (c.on ? 0.25 : 0.35)) c.vis = 0;
        if (c.visR < (c.on ? 0.25 : 0.35)) c.visR = 0;
        // (the copy on show keeps its place while it can be read -- firmly while the camera moves, so a turn never
        // swaps one readable copy for another; once the camera rests, a clearly better copy may take over)
        // (once the camera rests, a copy that reads clearly better -- more nearly across the screen, larger -- takes over
        // from the one on show; in the ring's own view its largest readable copy does)
        // (once the camera rests, a copy that shows well under the one size names print at holds only weakly: a larger
        // copy that reads takes over, so a turn never leaves a ring named small)
        const held = c.on && c.w > 0.02 && !cold ? (moving ? 4 : c.vis >= 0.45 ? (focus === c.p.Z.zone ? 0.2 : 0.35) * (cap >= 0.8 * capT ? 1 : 0.25) : 0) : 0;
        const across = Math.cos(ang) ** 2;
        // (and larger: up to the one size names print at, a copy that shows smaller than that loses to one that does
        // not, once the camera rests -- the reader turning the map sees one size of lettering)
        c.score = c.vis > 0.01 ? c.vis * (1 + 1.5 * across) + 0.06 * Math.min(cap, capT) + held + (focus === c.p.Z.zone ? 2 + 0.035 * Math.min(cap, 48) : 0) : -1;
        // (a ring's own view names that ring only, in its largest copy that reads: the other two rings' names step
        // aside, so they are never squeezed in beside it)
        if (focus && focus !== c.p.Z.zone) c.score = -1;
        c.relaxed = false;
        if (!inside || hid < 0.06) break;
      }
    }
    // a ring none of whose copies reads: the copy that reads best a little steeper (never past 60 deg, never upside
    // down) stands in, rather than leave the ring unnamed
    for (const z of zones) {
      const mine = C.filter((c) => c.p.Z.zone === z);
      if (mine.some((c) => c.score > 0) || (focus && focus !== z)) continue;
      let b = null;
      for (const c of mine) if (c.visR > 0 && (!b || c.visR > b.visR)) b = c;
      if (b) { b.vis = b.visR; b.relaxed = true; b.score = b.visR + (b.on && b.w > 0.02 && !cold ? (moving ? 4 : b.visR >= 0.45 ? 0.35 : 0) : 0) + (focus === z ? 2 : 0); }
    }
    // the best set: one copy (or none) per ring, never two names on top of one another or stacked in a column
    const opts = zones.map((z) => [null, ...C.filter((c) => c.p.Z.zone === z && c.score > 0)]);
    // (what two rings' names cost shown together -- 9 rules a pair out: a ring is better left unnamed for a moment, or
    // named by another copy, than named where its name runs into another's)
    const pen = (A, B) => {
      const hm = Math.max(A.cap, B.cap);
      const [a0, a1, a2, a3] = A.box, [b0, b1, b2, b3] = B.box;
      if (a0 < b2 && b0 < a2 && a1 < b3 && b1 < a3) return 10;
      // (never nearer than one and a half letters' height: closer, two names read as one label)
      const dx = Math.max(0, b0 - a2, a0 - b2), dy = Math.max(0, b1 - a3, a1 - b3);
      if (Math.hypot(dx, dy) < 1.5 * hm) return 9;
      // (never side by side on one reading line: sharing a line within about four letters of each other, they read
      // on as one phrase -- 'AI 消費者')
      const vo = Math.min(a3, b3) - Math.max(a1, b1);
      if (vo > 0.35 * Math.min(a3 - a1, b3 - b1) && dx < 4.5 * hm) return 9 * (1 - sm(2.5 * hm, 4.5 * hm, dx));
      const ov = Math.min(a2, b2) - Math.max(a0, b0), gap = Math.max(b1 - a3, a1 - b3);
      // (one above the other in a column, the three names read as one stacked label: that costs nearly as much as
      // leaving a ring unnamed)
      return ov > 0.3 * Math.min(a2 - a0, b2 - b0) && gap < 2.2 * hm ? 2.0 : 0;
    };
    // (and one size of lettering: a name shown much smaller than the largest beside it reads as a lesser thing)
    const parity = (chosen) => {
      const on = chosen.filter(Boolean);
      if (on.length < 2) return 0;
      const mx = Math.max(...on.map((c) => c.cap));
      return -on.reduce((t, c) => t + 6 * Math.max(0, 0.85 - c.cap / mx), 0);
    };
    // (and the set balanced round the map's middle on screen: names spread round it, not gathered to one side)
    proj(0, SEA_Y, 0, cam, w, h, _s0);
    const mx = _s0.x, my = _s0.y, half = 0.5 * Math.min(x1 - x0, y1 - y0);
    const balance = (chosen) => {
      const on = chosen.filter(Boolean);
      if (on.length < 2) return 0;
      const gx = on.reduce((t, c) => t + (c.box[0] + c.box[2]) / 2, 0) / on.length, gy = on.reduce((t, c) => t + (c.box[1] + c.box[3]) / 2, 0) / on.length;
      return -1.2 * Math.hypot(gx - mx, gy - my) / Math.max(half, 1);
    };
    let best = null, bestS = -Infinity;
    const walk = (i, chosen, s) => {
      if (i === opts.length) { s += balance(chosen) + parity(chosen); if (s > bestS) { bestS = s; best = chosen.slice(); } return; }
      for (const o of opts[i]) {
        // (a ring left unnamed costs: most of all the ring whose own view this is)
        let t = s + (o ? o.score : zones[i] === focus ? -6 : focus ? 0 : -2.5);
        if (o) for (const q of chosen) if (q) t -= pen(o, q);
        chosen.push(o); walk(i + 1, chosen, t); chosen.pop();
      }
    };
    walk(0, [], 0);
    const kIn = 1 - Math.exp(-dt * 10), kOut = 1 - Math.exp(-dt * 24);
    // at most one copy of a name on screen: a new copy waits until the old one is gone (at once if the old one is off
    // the screen, where its fade is not seen; else after its short fade)
    const showing = {};
    for (const c of C) if (c.w > 0.003) (showing[c.p.Z.zone] ||= []).push(c);
    C.forEach((c, i) => {
      c.on = !!best && best.includes(c);
      // (full strength while it reads at all: a copy is printed, never a ghost of itself)
      let goal = c.on ? sm(0.2, 0.3, c.vis) : 0;
      const others = (showing[c.p.Z.zone] || []).filter((o) => o !== c);
      if (goal > 0 && others.length) {
        for (const o of others) if (!o.inside) o.w = 0;
        if (others.some((o) => o.w > 0.003)) goal = 0;
      }
      if (!c.on && !c.inside) c.w = 0;
      c.w += (goal - c.w) * (goal > c.w ? kIn : kOut);
      if (goal === 0 && c.w < 0.06) c.w = 0;
      // (its scale eases too, so a copy closing in for something in front of it never jumps in size)
      c.scS = c.scS == null || c.w < 0.02 ? c.sc : c.scS + (c.sc - c.scS) * kIn;
      uCopy.value[i].set(c.p.th, c.p.r, c.flip * c.scS, c.w);
      if (c.label) {
        c.label.w = +c.w.toFixed(3);
        c.label.box = c.w > 0.05 ? c.box.map((v) => Math.round(v)) : null;
        c.label.bx = c.box ? c.box.map((v) => Math.round(v)) : null;   // (for tests: where it would stand)
        c.label.cap = Math.round(c.cap); c.label.hid = +c.hid.toFixed(2); c.label.flip = c.flip; c.label.vis = +c.vis.toFixed(2); c.label.score = +c.score.toFixed(2); c.label.ins = !!c.inside; c.label.ang = Math.round((c.ang || 0) * 57.3);
      }
    });
  };
  return { mesh: names, glyphs: C.reduce((s, c) => s + [...c.p.Z.name].length, 0) };
}
