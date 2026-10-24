// The consumers' town square: the levelled hilltop in the middle of their land (terrain.js SQUARE), where 品牌怎麼被
// 相信 (trust, 300 deg), 品牌記憶 (memory, 25 deg) and 從想買到下單 (market, 120 deg) face one another.  It is not a
// district and tells no story of its own: it is the consumers' daily life, the ground the three districts stand round.
// One moment of it, held still (nothing moves: a still square reads as a picture, and a moving crowd would only be
// noise):
//   - in the middle an advertising column with its posters (what brands say reaches people here), a ring bench round
//     it, people sitting on it;
//   - on the market's side three stalls under striped awnings, a vendor behind each, people buying, a queue;
//   - on the memory's side a cafe: two small tables, people drinking and talking;
//   - on the trust's side two people standing together, one showing the other something on her phone (word of mouth);
//     another reads his phone by the path;
//   - people walking off along the paths with their shopping, someone waiting by a lamp, an old man on a bench.
// People are the book's lay figures (people.js, pencil), posed once and baked with every prop into ONE mesh (one draw
// call); look a prints them in the crowd's tint (the people's, a step stronger, under a lighter warm line: look.js
// FIG crowd, npr.js) and the stalls, the cafe's parasols and the column's posters in the square's own inks (look.js
// slots 74-79), so the square reads as a lived-in place from the consumers' ring view, not only close up.
// Everything keeps off the districts: each item is checked against what the three districts stand on before it is
// laid (a 1-unit grid of their visible geometry near the ground).
// Interface: buildSquare(D) -> { group, paving: { r, paths: [[x, z], ...] }, keep(x, z) (true where the square has
// laid something: the scenery keeps off it), counts }.
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { ink } from './mat.js';
import { LOOK, P, figSlot } from './look.js';
import { heightAt, SQUARE } from './terrain.js';
import { makePerson } from './people.js';
import { MAP_AZ } from './mappose.js';

const V3 = THREE.Vector3, M4 = THREE.Matrix4, Q = THREE.Quaternion;
const YAX = new V3(0, 1, 0);
const rad = (d) => (d * Math.PI) / 180;
const H = 3.0;                                    // the square's people (a little smaller than the districts' own)
const PEOPLE = figSlot('consumer', 'crowd');
const CELL = 0.085;                                // the figures' level of detail (world units, see cluster())

/** non-indexed, position + normal + colour (tone, -1, -1: keep the material's style and accent) */
function prep(geo, tone = 1) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.color) {
    const n = g.attributes.position.count, c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { c[i * 3] = tone; c[i * 3 + 1] = -1; c[i * 3 + 2] = -1; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  }
  return g;
}
/**
 * fewer triangles for a far-seen figure: vertex clustering on a `cell` grid (world units).  Triangles whose corners
 * fall into fewer than three cells go; the others take their cells' mean positions and smooth normals.  The lay
 * figure's own mesh is made for close shots (about 5,000 triangles); in the square, seen from the map, a few hundred
 * keep its silhouette.
 */
function cluster(g, cell) {
  const pos = g.attributes.position, col = g.attributes.color, n = pos.count;
  const ids = new Int32Array(n), map = new Map(), sum = [];
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(pos.getX(i) / cell)},${Math.round(pos.getY(i) / cell)},${Math.round(pos.getZ(i) / cell)}`;
    let id = map.get(k);
    if (id === undefined) { id = sum.length; map.set(k, id); sum.push([0, 0, 0, 0]); }
    ids[i] = id; const s = sum[id]; s[0] += pos.getX(i); s[1] += pos.getY(i); s[2] += pos.getZ(i); s[3]++;
  }
  const P = [], C = [], keep = [];
  for (let t = 0; t < n; t += 3) {
    const a = ids[t], b = ids[t + 1], c = ids[t + 2];
    if (a === b || b === c || a === c) continue;
    keep.push(t);
  }
  const nrm = sum.map(() => new V3());
  const _a = new V3(), _b = new V3(), _c = new V3(), _n = new V3();
  const at = (id, out) => { const s = sum[id]; return out.set(s[0] / s[3], s[1] / s[3], s[2] / s[3]); };
  for (const t of keep) {
    at(ids[t], _a); at(ids[t + 1], _b); at(ids[t + 2], _c);
    _n.subVectors(_c, _b).cross(_b.clone().sub(_a).negate());
    for (let j = 0; j < 3; j++) nrm[ids[t + j]].add(_n);
  }
  const N3 = [];
  for (const t of keep) for (let j = 0; j < 3; j++) {
    const id = ids[t + j]; at(id, _a); P.push(_a.x, _a.y, _a.z);
    const nn = nrm[id].lengthSq() > 0 ? nrm[id].clone().normalize() : new V3(0, 1, 0); N3.push(nn.x, nn.y, nn.z);
    C.push(col.getX(t + j), col.getY(t + j), col.getZ(t + j));
  }
  const o = new THREE.BufferGeometry();
  o.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  o.setAttribute('normal', new THREE.Float32BufferAttribute(N3, 3));
  o.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  return o;
}
const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const cyl = (r0, r1, h, seg, x = 0, y = 0, z = 0) => new THREE.CylinderGeometry(r0, r1, h, seg).translate(x, y, z);
/** a prop: a mesh with a dummy material carrying its paint slot (only its geometry is baked) */
const DUMMY = new THREE.MeshBasicMaterial();
function prop(geo, pn, tone = 1) { const m = new THREE.Mesh(prep(geo, tone), DUMMY); m.userData.pn = pn; return m; }

export function buildSquare(D) {
  const group = new THREE.Group();
  group.name = 'square';
  // ---- what the districts stand on near the middle (1-unit cells, r < 34), so nothing of the square lands on them
  const N = 69, H0 = 34.5, occ = new Uint8Array(N * N);
  const ci = (v) => Math.floor(v + H0);
  {
    const v = new V3(), M = new M4(), Mi = new M4();
    for (const [id, d] of Object.entries(D)) {
      if (!d || !d.group || id === 'core' || id === 'twins') continue;
      d.group.updateMatrixWorld(true);
      d.group.traverse((o) => {
        if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
        for (let p = o; p; p = p.parent) if (!p.visible) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        if (mats.every((m) => !m || m.visible === false)) return;
        const pos = o.geometry.attributes.position, st = Math.max(1, Math.floor(pos.count / 6000));
        const n = o.isInstancedMesh ? o.count : 1;
        for (let k = 0; k < n; k++) {
          if (o.isInstancedMesh) { o.getMatrixAt(k, Mi); if (Math.abs(Mi.determinant()) < 1e-9) continue; M.multiplyMatrices(o.matrixWorld, Mi); } else M.copy(o.matrixWorld);
          for (let i = 0; i < pos.count; i += st) {
            v.fromBufferAttribute(pos, i).applyMatrix4(M);
            const x = ci(v.x), z = ci(v.z);
            if (x < 0 || z < 0 || x >= N || z >= N || v.y > heightAt(v.x, v.z) + 12) continue;
            occ[z * N + x] = 1;
          }
        }
      });
    }
  }
  const clear = (x, z, r) => {
    for (let j = ci(z - r - 1); j <= ci(z + r + 1); j++) for (let i = ci(x - r - 1); i <= ci(x + r + 1); i++) {
      if (i < 0 || j < 0 || i >= N || j >= N) return false;
      if (occ[j * N + i] && (i - H0 + 0.5 - x) ** 2 + (j - H0 + 0.5 - z) ** 2 <= (r + 1.2) ** 2) return false;
    }
    return true;
  };
  const laid = [];                                 // [x, z, r]: where the square has put something
  const gy = (x, z, r = 0) => Math.min(heightAt(x, z), heightAt(x + r, z), heightAt(x - r, z), heightAt(x, z + r), heightAt(x, z - r));
  const at = (a, r) => [Math.cos(rad(a)) * r, Math.sin(rad(a)) * r];
  /** yaw that turns local +z toward the world direction (dx, dz) */
  const face = (dx, dz) => Math.atan2(dx, dz);

  const parts = [];                                // geometries in world space, each with its paint slots
  const bake = (obj) => {
    obj.updateMatrixWorld(true);
    obj.traverse((o) => {
      if (!o.isMesh) return;
      let g = prep(o.geometry).applyMatrix4(o.matrixWorld);
      // (a figure's own body, not what it holds: clustered to a map's level of detail)
      if (o.userData.pn === undefined) g = cluster(g, CELL);
      const pn = o.userData.pn ?? PEOPLE, n = g.attributes.position.count;
      g.setAttribute('aPn', new THREE.BufferAttribute(new Float32Array(n).fill(pn), 1));
      parts.push(g);
    });
  };
  /** a thing at (x, z) on the ground, turned by yaw; `r` its footprint radius (checked against the districts) */
  const place = (obj, x, z, yaw, r, { y = null } = {}) => {
    if (!clear(x, z, r)) return false;
    obj.position.set(x, y ?? gy(x, z, r * 0.7), z);
    obj.rotation.y = yaw;
    bake(obj);
    laid.push([x, z, r]);
    return true;
  };
  const props = (...ms) => { const g = new THREE.Group(); for (const m of ms) g.add(m); return g; };

  // ---- the props
  const phone = () => prop(box(0.2, 0.36, 0.05, 0, 0.17, 0.03), P.steel, 0.55);
  const bag = (pn) => props(prop(box(0.46, 0.5, 0.24, 0, -0.42, 0), pn), prop(box(0.05, 0.22, 0.05, 0, -0.08, 0), pn, 0.8));
  const cup = () => prop(cyl(0.09, 0.075, 0.26, 8, 0.07, 0.2, 0), P.wall);
  let people = 0;
  /** a person at (x, z) facing (fx, fz) (a direction), in a pose; hands may hold props */
  // (opts.ground: the height its root stands at -- a seat for the seated, whose root is at the hips; the rest are
  // the pose's own options, in world units)
  const person = (x, z, fx, fz, pose, opts = {}, hands = {}) => {
    const { ground = null, ...po } = opts;
    const p = makePerson({ height: H, seated: pose === 'sit' || pose === 'lift' });
    p.setPose(pose, 1, po);
    for (const [side, pr] of Object.entries(hands)) p.hold(side, pr);
    if (place(p.group, x, z, face(fx, fz), 0.5, { y: ground })) { people++; return p; }
    return null;
  };

  // ---- the advertising column in the middle, its posters, the ring bench round it
  const yC = heightAt(0, 0);
  {
    const col = new THREE.Group();
    col.add(prop(cyl(0.95, 1.0, 4.0, 18, 0, 2.0, 0), P.wall));
    col.add(prop(cyl(1.12, 1.12, 0.22, 18, 0, 4.1, 0), P.sqAwn));
    col.add(prop(new THREE.SphereGeometry(1.02, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 4.2, 0), P.sqAwn2));
    col.add(prop(cyl(1.08, 1.08, 0.3, 18, 0, 0.15, 0), P.steel, 0.8));
    // the posters: panels round the column, in the square's inks
    const POST = [P.sqAwn, P.sqGoods, P.sqAwn2, P.sqAwn, P.sqGoods, P.sqAwn2];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const pnl = prop(box(0.9, 1.75, 0.06, 0, 0, 0), POST[i]);
      pnl.position.set(Math.sin(a) * 1.0, 2.35 + (i % 2) * 0.18, Math.cos(a) * 1.0);
      pnl.rotation.y = a;
      col.add(pnl);
    }
    place(col, 0, 0, 0, 1.1, { y: yC });
    // the ring bench (an octagon of seats), at the people's seat height
    const seatH = makePerson({ height: H, seated: true }).seatH;
    const ring = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const s = prop(box(1.55, 0.14, 0.62, 0, seatH - 0.07, 0), P.sqWood);
      s.position.set(Math.sin(a) * 2.05, 0, Math.cos(a) * 2.05); s.rotation.y = a;
      const leg = prop(box(1.2, seatH - 0.14, 0.4, 0, (seatH - 0.14) / 2, 0), P.sqWood, 0.7);
      leg.position.copy(s.position); leg.rotation.y = a;
      ring.add(s, leg);
    }
    place(ring, 0, 0, 0, 2.6, { y: yC });
    // sitting on it, facing out: one with her shopping beside her, one with his phone, one resting
    // (a seated figure's root is at its hips, on the seat; its feet reach forward)
    for (const [deg, pose, hands] of [[28, 'sit', {}], [152, 'sit', {}], [262, 'lift', { R: cup() }]]) {
      const [x, z] = at(deg, 2.05);
      person(x, z, x, z, pose, { ground: yC }, hands);
    }
    { const [x, z] = at(36, 2.05); place(bag(P.sqAwn2), x, z, 0.4, 0.3, { y: yC + seatH + 0.5 }); }
  }

  // ---- the stalls on the market's side: counter, striped awning on four posts, goods; a vendor behind each
  const stall = (deg, k) => {
    const [x, z] = at(deg, 7.4);
    const yaw = face(-x, -z);                       // its front (+z) toward the middle
    const g = new THREE.Group();
    const W = 3.0, D0 = 0.9, CH = 1.05;
    g.add(prop(box(W, CH, D0, 0, CH / 2, 0), P.sqWood));
    g.add(prop(box(W + 0.1, 0.08, D0 + 0.1, 0, CH + 0.04, 0), P.sqWood, 0.85));
    for (const [px, pz, ph] of [[-1.45, -0.65, 2.95], [1.45, -0.65, 2.95], [-1.45, 0.6, 2.5], [1.45, 0.6, 2.5]]) g.add(prop(box(0.09, ph, 0.09, px, ph / 2, pz), P.sqWood, 0.7));
    // the awning: five stripes, sloping down to the front (saffron, terracotta, and one of both)
    const AWN = [[P.sqAwn, P.wall], [P.sqAwn2, P.wall], [P.sqAwn2, P.sqAwn]][k % 3];
    for (let i = 0; i < 5; i++) {
      const s = prop(box(W / 5 + 0.02, 0.07, 2.05, -W / 2 + W / 10 + (i * W) / 5, 0, 0), AWN[i % 2]);
      s.position.y = 2.75; s.position.z = 0.05; s.rotation.x = 0.26;
      g.add(s);
    }
    // a valance along the front
    g.add(prop(box(W + 0.05, 0.24, 0.05, 0, 2.4, 1.02), AWN[0]));
    // goods on the counter: crates of fruit, a few in a row
    const GOODS = [P.sqGoods, P.crate2, P.blossom, P.sqGoods];
    for (let i = 0; i < 4; i++) {
      g.add(prop(box(0.52, 0.26, 0.42, -0.9 + i * 0.6, CH + 0.21, 0.1), P.crate, 0.9));
      g.add(prop(box(0.44, 0.1, 0.34, -0.9 + i * 0.6, CH + 0.37, 0.1), GOODS[(i + k) % 4]));
    }
    if (!place(g, x, z, yaw, 1.95)) return null;
    // the vendor, behind the counter, a hand on it
    const back = new V3(0, 0, -1.05).applyAxisAngle(YAX, yaw);
    person(x + back.x, z + back.z, -x, -z, 'stamp', { y: CH + 0.06, fwd: 0.62, table: CH }, {});
    return { x, z, yaw };
  };
  const stalls = [stall(98, 0), stall(124, 1), stall(150, 2)].filter(Boolean);
  // the customers: looking over the fruit, paying with a bag in hand, a queue at the last
  const front = (s, d, side = 0) => { const o = new V3(side, 0, d).applyAxisAngle(YAX, s.yaw); return [s.x + o.x, s.z + o.z]; };
  if (stalls[0]) { const [x, z] = front(stalls[0], 1.35, 0.4); person(x, z, stalls[0].x - x, stalls[0].z - z, 'watch', { yaw: 0.35, pitch: 0.4 }); }
  if (stalls[1]) { const [x, z] = front(stalls[1], 1.3, -0.3); person(x, z, stalls[1].x - x, stalls[1].z - z, 'hold', {}, { R: bag(P.shed) }); }
  if (stalls[2]) {
    { const [x, z] = front(stalls[2], 1.3, 0.2); person(x, z, stalls[2].x - x, stalls[2].z - z, 'stand'); }
    { const [x, z] = front(stalls[2], 2.35, 0.55); person(x, z, stalls[2].x - x, stalls[2].z - z, 'hold', {}, { R: phone() }); }
  }

  // ---- the cafe on the memory's side: two small tables, two people at each
  for (const [deg, poses] of [[12, ['lift', 'sit']], [42, ['sit', 'lift']]]) {
    const [x, z] = at(deg, 7.6);
    const t = new THREE.Group();
    t.add(prop(cyl(0.62, 0.62, 0.08, 14, 0, 1.0, 0), P.wall), prop(cyl(0.07, 0.07, 1.0, 6, 0, 0.5, 0), P.steel, 0.7), prop(cyl(0.34, 0.4, 0.06, 10, 0, 0.03, 0), P.steel, 0.7));
    t.add(prop(cyl(0.11, 0.09, 0.24, 8, 0.22, 1.16, 0.12), P.wall), prop(cyl(0.11, 0.09, 0.24, 8, -0.24, 1.16, -0.1), P.wall));
    // its parasol (the cafe reads from afar by them): a pole through the table, a canopy over it, short of the sitters
    t.add(prop(cyl(0.05, 0.05, 1.75, 6, 0, 1.9, 0), P.sqWood, 0.7));
    t.add(prop(new THREE.ConeGeometry(1.2, 0.5, 14).translate(0, 2.95, 0), deg < 30 ? P.sqAwn : P.sqAwn2));
    // tangent to the square: the two sit across the table from one another along it
    const tx = -Math.sin(rad(deg)), tz = Math.cos(rad(deg));
    if (!place(t, x, z, 0, 0.8)) continue;
    poses.forEach((pose, i) => {
      const sgn = i ? 1 : -1, px = x + tx * 1.25 * sgn, pz = z + tz * 1.25 * sgn;
      const seatH = makePerson({ height: H, seated: true }).seatH;
      const st = props(prop(cyl(0.3, 0.26, seatH, 10, 0, seatH / 2, 0), P.sqWood));
      if (!place(st, px, pz, 0, 0.4)) return;
      person(px, pz, x - px, z - pz, pose, { ground: gy(px, pz) }, pose === 'lift' ? { R: cup() } : {});
    });
  }

  // ---- on the trust's side: word of mouth -- one shows the other something on her phone; one reads his own
  {
    const [x, z] = at(300, 6.2);
    const tx = -Math.sin(rad(300)), tz = Math.cos(rad(300));
    person(x - tx * 0.65, z - tz * 0.65, tx, tz, 'hold', {}, { R: phone() });
    person(x + tx * 0.65, z + tz * 0.65, -tx, -tz, 'watch', { yaw: 0.35, pitch: 0.45 });
  }
  { const [x, z] = at(272, 8.6); person(x, z, -Math.sin(rad(272)), Math.cos(rad(272)), 'hold', {}, { R: phone() }); }

  // ---- on the paths: walking off with the shopping, coming in, someone waiting by a lamp, an old man on a bench
  for (const [deg, r, dir, ph, hands] of [[136, 11.2, 1, 0.3, { L: bag(P.sqAwn) }], [40, 11.0, 1, 0.15, { R: bag(P.garden) }], [288, 11.4, -1, 0.7, {}], [196, 7.2, 0, 0.45, { R: bag(P.sqAwn2), L: bag(P.shed) }]]) {
    const [x, z] = at(deg, r);
    const [fx, fz] = dir === 0 ? [-Math.sin(rad(deg)), Math.cos(rad(deg))] : [x * dir, z * dir];
    person(x, z, fx, fz, 'walk', { phase: ph }, hands);
  }
  const lamp = (deg, r) => {
    const [x, z] = at(deg, r);
    place(props(prop(box(0.12, 3.2, 0.12, 0, 1.6, 0), P.steel, 0.7), prop(box(0.4, 0.34, 0.4, 0, 3.3, 0), P.lamp)), x, z, 0, 0.3);
  };
  for (const deg of [72, 168, 232, 338]) lamp(deg, 9.7);
  { const [x, z] = at(238, 9.0); person(x, z, -Math.sin(rad(238)), Math.cos(rad(238)), 'watch', { yaw: 0.8 }); }
  {
    const [x, z] = at(208, 9.9), seatH = makePerson({ height: H, seated: true }).seatH;
    const yaw = face(-x, -z);
    const b = props(prop(box(2.3, 0.12, 0.6, 0, seatH - 0.06, 0), P.sqWood), prop(box(2.3, 0.6, 0.08, 0, seatH + 0.35, -0.28), P.sqWood, 0.85),
      prop(box(0.1, seatH - 0.12, 0.5, -1.0, (seatH - 0.12) / 2, 0), P.sqWood, 0.7), prop(box(0.1, seatH - 0.12, 0.5, 1.0, (seatH - 0.12) / 2, 0), P.sqWood, 0.7));
    if (place(b, x, z, yaw, 1.2)) {
      const o = new V3(-0.5, 0, 0.05).applyAxisAngle(YAX, yaw);
      person(x + o.x, z + o.z, -x, -z, 'sit', { ground: gy(x, z, 1.2) });
    }
  }
  // two children at the column, one pointing up at a poster; a couple walking off toward the cafe's side; a parcel
  // carried across the square
  {
    const kid = (deg, r, pose, opts) => {
      const [x, z] = at(deg, r);
      const p = makePerson({ height: 1.85 });
      p.setPose(pose, 1, opts);
      if (place(p.group, x, z, face(-x, -z), 0.35)) people++;
    };
    kid(205, 3.1, 'raise', { side: 'R' });
    kid(222, 3.4, 'watch', { yaw: 0.5, pitch: -0.35 });
    const [x, z] = at(36, 10.4), tx = -Math.sin(rad(36)), tz = Math.cos(rad(36));
    person(x + tx * 0.75, z + tz * 0.75, x, z, 'walk', { phase: 0.55 });
    const parcel = props(prop(box(0.62, 0.42, 0.5, 0, 0.05, 0.12), P.shed), prop(box(0.64, 0.05, 0.08, 0, 0.27, 0.12), P.sqAwn2, 0.8));
    const [px, pz] = at(214, 5.6);
    person(px, pz, -Math.sin(rad(214)), Math.cos(rad(214)), 'hold', {}, { R: parcel });
  }
  // shade trees at the square's edge
  const tree = (deg, r) => {
    const [x, z] = at(deg, r);
    place(props(prop(cyl(0.2, 0.3, 2.4, 6, 0, 1.2, 0), P.trunk), prop(new THREE.IcosahedronGeometry(1.7, 1).scale(1, 0.85, 1).translate(0, 3.3, 0), P.tree), prop(new THREE.IcosahedronGeometry(1.05, 0).translate(0.5, 4.25, 0.3), P.tree2)), x, z, rad(deg), 1.5);
  };
  // (on the far side from the map's default view: nothing tall between the reader and the square)
  tree(186, 11.6); tree(252, 11.4);

  // ---- one mesh
  const geo = mergeGeometries(parts);
  const mat = ink({
    shade: 1.0, bias: 0.2,
    hooks: { key: 'square', vHead: 'attribute float aPn; varying float vPn;', vPos: 'vPn = aPn;', fHead: 'varying float vPn;', fOut: LOOK ? 'pn = vPn;' : '' },
  });
  mat.vertexColors = true;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'square-life';
  mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh);

  // ---- for the scenery: the paved square and a path from it to each of the three districts
  const paths = [];
  for (const id of ['trust', 'memory', 'market']) { const d = D[id]; const p = d && (d.pin || d.anchor); if (p) paths.push([p.x, p.z]); }
  // (and the slope on the map camera's side stays open, so no grove stands between the reader and the square)
  const camSide = (x, z) => Math.abs(((Math.atan2(z, x) - MAP_AZ) * 180) / Math.PI % 360 + 540) % 360 - 180;
  const keep = (x, z) => {
    const r = Math.hypot(x, z);
    return r < SQUARE.r + 2.6 || (r < 17.5 && Math.abs(camSide(x, z)) < 65) || laid.some(([lx, lz, rr]) => (lx - x) ** 2 + (lz - z) ** 2 < (rr + 1) ** 2);
  };
  return { group, mesh, paving: { r: SQUARE.r + 0.8, paths }, keep, counts: { people, parts: parts.length, tris: geo.attributes.position.count / 3 } };
}
