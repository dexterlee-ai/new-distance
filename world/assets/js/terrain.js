// The world disk.  Distance from the centre is distance from people:
//   r <  14  人之核  the People core (People Model)
//   r 16–42  人心之地 Heartland — believed, remembered, wanted   (fingerprint-ridged hills)
//   r 46–68  代理之層 Agent layer — read, chosen, authorised by AI (an ASCII sea)
//   r 72–96  組織之岸 The shore — judgment, craft, culture        (the brand's own ground)
import * as THREE from '../vendor/three.module.min.js';
import { ink, inkDepth } from './mat.js';

export const R = 100;
export const RING = {
  core: [0, 14], heart: [16, 42], sea: [46, 68], shore: [72, 96],
};
export const SEA_Y = 0.35;
export const BASE_Y = -16;

function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, o = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; } return s; }
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// fingerprint-like ridges: rings around a few drifting centres, warped by noise
function ridges(x, z) {
  const w = (fbm(x * 0.03 + 7, z * 0.03) - 0.5) * 9;
  const c1 = Math.hypot(x - 8 + w, z + 6), c2 = Math.hypot(x + 14, z - 12 + w * 0.6);
  const d = Math.min(c1 * 1.0, c2 * 1.15 + 3);
  return Math.sin(d * 1.45);
}

/** ground height at (x, z) — exported so districts can sit on the terrain */
export function heightAt(x, z) {
  const r = Math.hypot(x, z);
  const n = fbm(x * 0.045, z * 0.045);
  // heartland hills with fingerprint ridges
  const hills = 1.6 + n * 7.5 + ridges(x, z) * 0.55 * smooth(15, 22, r) * (1 - smooth(38, 43, r));
  // core dome rising out of the hills
  const coreH = 9.5 - 7.3 * smooth(4, 15, r);
  // sea floor and shore plateau
  const floor = -3.8 + n * 1.5;
  const shore = 5.6 + (fbm(x * 0.05 + 3, z * 0.05 - 2) - 0.5) * 1.1;
  let h = r < 15 ? coreH + (hills - 2.2) * smooth(9, 15, r) : hills;
  h += (floor - h) * smooth(41, 47.5, r);
  h += (shore - h) * smooth(66, 73, r);
  return h;
}

export function buildTerrain() {
  const group = new THREE.Group();
  const NR = 150, NA = 360;
  const pos = [], idx = [];
  // centre vertex + rings (denser near the shore so the rim stays round)
  pos.push(0, heightAt(0, 0), 0);
  for (let i = 1; i <= NR; i++) {
    const r = R * Math.pow(i / NR, 0.92);
    for (let j = 0; j < NA; j++) {
      const a = (j / NA) * Math.PI * 2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      pos.push(x, heightAt(x, z), z);
    }
  }
  for (let j = 0; j < NA; j++) idx.push(0, 1 + ((j + 1) % NA), 1 + j);
  for (let i = 1; i < NR; i++) {
    const a0 = 1 + (i - 1) * NA, a1 = 1 + i * NA;
    for (let j = 0; j < NA; j++) {
      const j1 = (j + 1) % NA;
      idx.push(a0 + j, a0 + j1, a1 + j, a0 + j1, a1 + j1, a1 + j);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const ground = new THREE.Mesh(g, ink({
    shade: 1.08, bias: 0.06,
    hooks: {
      key: 'ground',
      fOut: `
        float r = length(vWPos.xz);
        // the shore is drawn a touch darker, the heartland lighter: paper shows through near people
        // flatten gentle slopes so only real relief and cast shadows are drawn
        sh = 1.0 - (1.0 - sh) * 0.62;
        sh = clamp(sh + 0.06 * (1.0 - smoothstep(14.0, 42.0, r)), 0.0, 1.0);
      `,
    },
  }));
  ground.receiveShadow = true;
  ground.castShadow = true;
  ground.name = 'ground';
  group.add(ground);

  // rim wall: the world is a cut disk floating on paper, its edge shows strata
  const wpos = [], widx = [];
  const NV = 10;
  for (let j = 0; j <= NA; j++) {
    const a = (j / NA) * Math.PI * 2;
    const x = Math.cos(a) * R, z = Math.sin(a) * R;
    const top = heightAt(x, z);
    for (let k = 0; k <= NV; k++) {
      const y = top + (BASE_Y - top) * (k / NV);
      wpos.push(x, y, z);
    }
  }
  for (let j = 0; j < NA; j++) for (let k = 0; k < NV; k++) {
    const a = j * (NV + 1) + k, b = (j + 1) * (NV + 1) + k;
    widx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const wg = new THREE.BufferGeometry();
  wg.setAttribute('position', new THREE.Float32BufferAttribute(wpos, 3));
  wg.setIndex(widx);
  wg.computeVertexNormals();
  const wall = new THREE.Mesh(wg, ink({
    hooks: {
      key: 'wall',
      fOut: `
        // strata bands: alternating light / dark layers like a geological section
        float y = vWPos.y;
        float band = smoothstep(0.42, 0.5, abs(fract(y * 0.16 + 0.12 * sin(atan(vWPos.z, vWPos.x) * 5.0)) - 0.5));
        sh = clamp(0.74 + sh * 0.22 - band * 0.26, 0.0, 1.0);
      `,
    },
  }));
  wall.receiveShadow = true;
  group.add(wall);

  // underside: a slightly domed bottom so the floating disk reads from low angles
  const bg = new THREE.CircleGeometry(R, 120);
  bg.rotateX(Math.PI / 2);
  bg.translate(0, BASE_Y, 0);
  const bottom = new THREE.Mesh(bg, ink({ shade: 0.32 }));
  group.add(bottom);

  return { group, ground };
}

/** the agent layer: a circulating sea of glyphs between the heartland and the shore */
export function buildSea() {
  const g = new THREE.RingGeometry(RING.sea[0] - 4, RING.sea[1] + 5, 360, 24);
  g.rotateX(-Math.PI / 2);
  g.translate(0, SEA_Y, 0);
  const hooks = {
    key: 'sea',
    vPos: `
      float rr = length(transformed.xz);
      float aa = atan(transformed.z, transformed.x);
      transformed.y += sin(aa * 18.0 + rr * 0.6 - uTime * 0.8) * 0.18 + sin(rr * 1.3 + uTime * 0.6) * 0.12;
    `,
    fHead: `
      float sn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        float a=dHash(i), b=dHash(i+vec2(1,0)), c=dHash(i+vec2(0,1)), d=dHash(i+vec2(1,1));
        return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }
    `,
    fOut: `
      float r = length(vWPos.xz);
      float a = atan(vWPos.z, vWPos.x);
      // the current circulates around the heartland: streams of text flowing clockwise
      float flow = a * r * 0.5 + uTime * 2.2;
      float band = sin(r * 1.15 + sn(vec2(flow * 0.08, r * 0.2)) * 3.0);
      float stream = sn(vec2(flow * 0.35, r * 0.9));
      sh = 0.58 + 0.22 * band + 0.25 * (stream - 0.5);
      // calmer, lighter water near both banks
      sh = mix(sh, 0.97, smoothstep(RIN + 3.0, RIN - 2.0, r) + smoothstep(ROUT - 3.0, ROUT + 3.0, r));
      st = 1.0;
    `.replace('RIN', RING.sea[0].toFixed(1)).replace('RIN', RING.sea[0].toFixed(1)).replace(/ROUT/g, RING.sea[1].toFixed(1)),
  };
  const m = ink({ style: 1, hooks });
  const sea = new THREE.Mesh(g, m);
  sea.receiveShadow = true;
  sea.name = 'sea';
  return sea;
}

export { inkDepth };
