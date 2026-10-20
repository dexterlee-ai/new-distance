// Shared geometry and helpers for the districts.
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { heightAt } from './terrain.js';

export const TAU = Math.PI * 2;
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** seeded PRNG so the world is the same for every reader */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** polar → world position on the ground */
export function polar(r, deg, lift = 0) {
  const a = (deg * Math.PI) / 180;
  const x = Math.cos(a) * r, z = Math.sin(a) * r;
  return new THREE.Vector3(x, heightAt(x, z) + lift, z);
}

/** a small standing person, 1 unit tall, feet at y = 0 */
export function figureGeo(detail = 1) {
  const body = new THREE.CapsuleGeometry(0.17, 0.42, 2 + detail, 6 + detail * 2);
  body.translate(0, 0.38, 0);
  const head = new THREE.SphereGeometry(0.15, 6 + detail * 2, 5 + detail);
  head.translate(0, 0.86, 0);
  const g = mergeGeometries([toNonIndexed(body), toNonIndexed(head)]);
  g.computeVertexNormals();
  return g;
}

/** an origami paper boat, ~2 units long, keel at y = 0, bow toward +x */
export function boatGeo() {
  // half-width w at the gunwale; the hull is a folded V, the sail a folded tent rising from the middle
  const L = 1.0, w = 0.36, H = 0.42, S = 0.95;
  const P = {
    kb: [-0.55, 0, 0], kf: [0.55, 0, 0],            // keel
    gbL: [-L, H, -w], gfL: [L, H, -w],              // gunwale left (back, front)
    gbR: [-L, H, w], gfR: [L, H, w],                // gunwale right
    sb: [-0.42, H, 0], sf: [0.42, H, 0], st: [0, H + S, 0], // sail base + top
  };
  const tri = [];
  const T = (a, b, c) => tri.push(...P[a], ...P[b], ...P[c]);
  T('kb', 'kf', 'gfL'); T('kb', 'gfL', 'gbL');     // left hull
  T('kf', 'kb', 'gbR'); T('kf', 'gbR', 'gfR');     // right hull
  T('kb', 'gbL', 'gbR');                           // stern
  T('kf', 'gfR', 'gfL');                           // bow
  // sail: two triangular panels, slightly splayed
  P.slL = [0, H, -0.13]; P.slR = [0, H, 0.13];
  T('sb', 'st', 'slL'); T('slL', 'st', 'sf');
  T('st', 'sb', 'slR'); T('st', 'slR', 'sf');
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(tri, 3));
  g.computeVertexNormals();
  return g;
}

export function toNonIndexed(g) { return g.index ? g.toNonIndexed() : g; }

/** merge geometries after transforming each by a matrix */
export function mergeWith(list) {
  return mergeGeometries(list.map(([g, m]) => { const c = toNonIndexed(g.clone()); if (m) c.applyMatrix4(m); c.deleteAttribute('uv'); return c; }));
}

export function mat4({ p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] } = {}) {
  const m = new THREE.Matrix4();
  m.compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...(Array.isArray(s) ? s : [s, s, s])));
  return m;
}

/** a tube along points */
export function tube(points, radius = 0.1, seg = 64, rad = 6, closed = false) {
  const c = new THREE.CatmullRomCurve3(points, closed, 'centripetal');
  return new THREE.TubeGeometry(c, seg, radius, rad, closed);
}

/** flat ribbon (for roads / paths) hugging the terrain */
export function ribbon(points, width = 1, lift = 0.12, seg = 120) {
  const c = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const pos = [], idx = [];
  const up = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const p = c.getPointAt(t), tg = c.getTangentAt(t);
    const side = tmp.crossVectors(tg, up).normalize().multiplyScalar(width / 2);
    for (const s of [-1, 1]) {
      const x = p.x + side.x * s, z = p.z + side.z * s;
      pos.push(x, Math.max(p.y, heightAt(x, z)) + lift, z);
    }
    if (i < seg) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { geo: g, curve: c };
}

export const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _m = new THREE.Matrix4(), _e = new THREE.Euler();
