// The world disk.  Distance from the centre is distance from people:
//   r <  14  人之核  the People core (People Model)
//   r 16–42  人心之地 Heartland — believed, remembered, wanted   (fingerprint-ridged hills)
//   r 46–68  代理之層 Agent layer — read, chosen, authorised by AI (an ASCII sea)
//   r 72–96  組織之岸 The shore — judgment, craft, culture        (the brand's own ground)
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { ink, inkDepth } from './mat.js';
import { LOOK, P } from './look.js';

export const R = 100;
export const RING = {
  core: [0, 14], heart: [16, 42], sea: [46, 68], shore: [72, 96],
};
export const SEA_Y = 0.35;
export const BASE_Y = -16;

// ---- ?look only (look.js): the land-use map the ground and the sea read their paint from, 512² over the disk
// (x, z ∈ [-100, 100] → u, v), filled by scenery.js once the districts stand:
//   r: the districts' sites (their clearings) · g: footpaths · b: paving (quays, town squares, roads) · a: water depth
export const LAND = LOOK ? (() => {
  const N = 512, data = new Uint8Array(N * N * 4);
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return { N, data, tex };
})() : null;
const SLOT = (k) => P[k].toFixed(1);
/** GLSL: value noise on dHash (mat.js), for the look's ground and sea */
const GN = `
      float gn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        float a = dHash(i), b = dHash(i + vec2(1.0, 0.0)), c = dHash(i + vec2(0.0, 1.0)), d = dHash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
`;
/** GLSL (?look): the ground's paint slot from where it is: zone, height above the water, slope, the land-use map */
const GROUND_PAINT = () => `
        {
          vec2 xz = vWPos.xz;
          float r = length(xz);
          float wl = vWPos.y - ${SEA_Y.toFixed(2)};
          vec4 land = texture2D(uLand, xz / 200.0 + 0.5);
          vec3 nW = normalize(cross(dFdx(vWPos), dFdy(vWPos)));
          float slope = 1.0 - abs(nW.y);
          float n1 = gn(xz * 0.075), n2 = gn(xz * 0.23 + 11.0), n3 = gn(xz * 0.05 + 37.0);
          float p;
          if (r < 46.0) {
            // the consumers' land: two meadows, a patchwork of striped fields on the gentler slopes, a lawn on the dome
            p = n1 + (n2 - 0.5) * 0.35 > 0.52 ? ${SLOT('meadow2')} : ${SLOT('meadow')};
            vec2 cellId = floor(xz / 13.0 + vec2(0.37, 0.71));
            float fa = dHash(cellId + 3.3) * 3.14159;
            float fieldOn = step(0.56, gn(xz * 0.05 + 5.0)) * step(slope, 0.32) * step(16.5, r) * step(r, 40.0) * step(0.25, dHash(cellId + 9.1));
            if (fieldOn > 0.5) p = fract(dot(xz, vec2(cos(fa), sin(fa))) * 0.62) > 0.5 ? ${SLOT('field')} : ${SLOT('field2')};
            if (r < 14.5) p = ${SLOT('lawn')};
${LOOK === 'a' ? `            // the printed map's contour lines on the hills
            float cz = vWPos.y * 0.9;
            float cw = fwidth(cz);
            if (wl > 1.3 && r > 15.0 && abs(fract(cz) - 0.5) > 0.5 - cw * 0.8) p = ${SLOT('contour')};
` : ''}
          } else {
            // the brand's plateau: sandstone in two tones, its cliff, small parks
            p = n1 + (n2 - 0.5) * 0.3 > 0.6 ? ${SLOT('stone2')} : ${SLOT('stone')};
            if (n3 > 0.7 && wl > 3.0) p = ${SLOT('park')};
            if (slope > 0.45) p = ${SLOT('rock')};
          }
          // the banks: sand on the consumers' side, rock on the brand's
          if (wl < 1.0 && r < 54.0) p = ${SLOT('sand')};
          if (wl < 0.9 && r >= 54.0) p = ${SLOT('rock')};
          // paving, footpaths, the districts' own sites
          if (land.b > 0.5) p = r < 46.0 ? ${SLOT('path')} : ${SLOT('quay')};
          if (land.g > 0.5) p = ${SLOT('path')};
${LOOK === 'a' ? `          if (land.r + (n2 - 0.5) * 0.3 > 0.5) p = r < 46.0 ? ${SLOT('clear')} : ${SLOT('clear2')};` : `          // (b, c: each site is a plot laid for its district, edged with a kerb — the base a model stands on)
          if (land.r > 0.5) p = land.r < 0.66 ? ${SLOT('kerb')} : (r < 46.0 ? ${SLOT('clear')} : ${SLOT('clear2')});`}
          // surf where the water meets the land
          if (wl > -0.05 && wl < 0.28 + 0.12 * sin(xz.x * 0.9 + xz.y * 0.7 + uTime * 1.3)) p = ${SLOT('foam')};
          // seen close, grass is not one flat colour: tufts (darker specks) and, in b, wildflowers; both fade out with
          // the ground's size on screen, so the map seen whole stays calm
          {
            float grass = step(abs(p - ${SLOT('meadow')}), 0.1) + step(abs(p - ${SLOT('meadow2')}), 0.1) + step(abs(p - ${SLOT('lawn')}), 0.1) + step(abs(p - ${SLOT('park')}), 0.1);
            float near = 1.0 - smoothstep(0.1, 0.26, fwidth(xz.x) + fwidth(xz.y));
            if (grass > 0.5 && near > 0.01) {
              vec2 q = xz * 1.9, cq = floor(q);
              float hq = dHash(cq + 13.7);
              float dd = length(fract(q) - 0.5 - (vec2(dHash(cq + 2.1), dHash(cq + 5.3)) - 0.5) * 0.5);
              if (hq > 0.5 && dd < 0.24) sh *= 1.0 - 0.11 * near;
${LOOK === 'b' ? `              if (hq > 0.955 && dd < 0.18 && near > 0.5) p = hq > 0.982 ? ${SLOT('garden')} : ${SLOT('blossom')};
` : ''}            }
          }
          pn = p;${LOOK === 'a' ? '' : `
          // painted ground is never quite flat: a slow variation of its light, like gouache on board
          sh = clamp(sh * (0.93 + 0.1 * n1 + 0.04 * n2), 0.0, 1.0);`}
        }
`;
// the terrain mesh: rings out to the rim (denser near the shore so the rim stays round) and columns of 1°
const NR = 150, NA = 360;
const ringR = (i) => R * Math.pow(i / NR, 0.92);
/**
 * The dock (組織文化, article 16): a slot cut into the rim at 216°–239°, from the ring nearest r 90 out to the rim.
 * The ship is stranded at th (232°) and, afloat, sails off toward 216° a hull length and more: the slot runs on that
 * way, past its bow at the end of the run (nothing else stands on the rim between 216° and 221°).
 * Inside it the ground is gone down to the dock floor; the slot holds water at SEA_Y, and below the waterline its
 * walls are solid ink (the dark water a section drawing shows), above it they show the rim's strata.  Seen from
 * outside the rim, the cut is one frame through the waterline: a ship above, the iceberg's mass below.
 * Its edges lie on the mesh's own rings and columns (i0, a0, a1), so the hole in the ground and the walls meet exactly.
 */
export const DOCK = { a0: 216, a1: 239, th: 232, i0: 133, r0: ringR(133), r1: R, floor: BASE_Y + 0.2 };
/** inside the dock's slot (its open edges excluded: the shore along them keeps its height) */
const DOCK_R0SQ = (DOCK.r0 + 1e-3) ** 2, DOCK_R1SQ = (R + 0.5) ** 2;
export function inDock(x, z) {
  // cheap first: heightAt is called for every vertex of the disk, and almost all of them are well inside the rim
  if (z > 0 || x > 0) return false;              // 216°–239° lies in the quadrant x < 0, z < 0
  const r2 = x * x + z * z;
  if (r2 <= DOCK_R0SQ || r2 > DOCK_R1SQ) return false;
  let a = (Math.atan2(z, x) * 180) / Math.PI;
  if (a < 0) a += 360;
  return a > DOCK.a0 + 1e-3 && a < DOCK.a1 - 1e-3;
}

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
  // the dock: the ground is cut away down to its floor (the water stands at SEA_Y)
  if (inDock(x, z)) return DOCK.floor;
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
  const pos = [], idx = [];
  // a quad of the ground between ring i and i + 1, columns j and j + 1, inside the dock: not drawn
  const cut = (i, j) => i >= DOCK.i0 && j >= DOCK.a0 && j < DOCK.a1;
  // centre vertex + rings (denser near the shore so the rim stays round)
  pos.push(0, heightAt(0, 0), 0);
  for (let i = 1; i <= NR; i++) {
    const r = ringR(i);
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
      if (cut(i, j)) continue;
      const j1 = (j + 1) % NA;
      idx.push(a0 + j, a0 + j1, a1 + j, a0 + j1, a1 + j1, a1 + j);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const ground = new THREE.Mesh(g, LOOK ? ink({
    // ?look: the same ground, painted by where it is (GROUND_PAINT); b and c keep more of the light's relief
    shade: 1.08, bias: 0.06,
    uniforms: { uLand: { value: LAND.tex } },
    hooks: {
      key: 'ground-look',
      fHead: GN,
      fOut: `
        float r = length(vWPos.xz);
        sh = 1.0 - (1.0 - sh) * ${LOOK === 'a' ? '0.62' : '0.9'};
        sh = clamp(sh + ${LOOK === 'a' ? '0.06' : '0.02'} * (1.0 - smoothstep(14.0, 42.0, r)), 0.0, 1.0);
${GROUND_PAINT()}`,
    },
  }) : ink({
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
    if (j >= DOCK.a0 && j < DOCK.a1) continue;   // the dock's mouth is open
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
        sh = clamp(0.74 + sh * 0.22 - band * 0.26, 0.0, 1.0);${LOOK ? `
        pn = band > 0.5 ? ${SLOT('strata2')} : ${SLOT('strata')};` : ''}
      `,
    },
  }));
  wall.receiveShadow = true;
  group.add(wall);
  group.add(buildDock(wall.material));

  // underside: a slightly domed bottom so the floating disk reads from low angles
  const bg = new THREE.CircleGeometry(R, 120);
  bg.rotateX(Math.PI / 2);
  bg.translate(0, BASE_Y, 0);
  const bottom = new THREE.Mesh(bg, ink({ shade: 0.32, paint: LOOK ? P.under : 0 }));
  group.add(bottom);

  return { group, ground };
}

/** the dock's walls, floor, water and waterline (see DOCK); strata: the rim wall's own material (one program) */
function buildDock(strata) {
  const g = new THREE.Group();
  g.name = 'dock';
  const col = (j) => (j / NA) * Math.PI * 2;          // the mesh's own column angles, so the edges meet exactly
  const at = (i, j) => { const a = col(j), r = ringR(i); return [Math.cos(a) * r, Math.sin(a) * r]; };
  const NV = 12;
  // one wall: a strip of (x, z) points along its top edge, from y0(x, z) down to y1, its faces toward the inside of
  // the dock when `flip` says so
  function strip(pts, flip, y0, y1) {
    const p = [], ix = [];
    pts.forEach(([x, z]) => {
      const top = y0(x, z);
      for (let k = 0; k <= NV; k++) p.push(x, top + (y1 - top) * (k / NV), z);
    });
    for (let n = 0; n < pts.length - 1; n++) for (let k = 0; k < NV; k++) {
      const a = n * (NV + 1) + k, b = (n + 1) * (NV + 1) + k;
      if (flip) ix.push(a, a + 1, b, b, a + 1, b + 1); else ix.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    geo.setIndex(ix);
    geo.computeVertexNormals();
    return geo;
  }
  const radial = (j) => Array.from({ length: NR - DOCK.i0 + 1 }, (_, n) => at(DOCK.i0 + n, j));
  const back = Array.from({ length: DOCK.a1 - DOCK.a0 + 1 }, (_, n) => at(DOCK.i0, DOCK.a0 + n));
  // above the water the cut shows the rim's strata; below it, water as a section drawing shows it: lit under the
  // surface (a light tone with a few level water lines), darker with depth, solid ink at the bottom — so the cut reads
  // as water seen through its side, not as a black box or a hole in the ground
  const dark = ink({ accent: 'ink' });
  const deep = ink({
    hooks: {
      key: 'dock-deep',
      fOut: `
        float dp = ${SEA_Y.toFixed(2)} - vWPos.y;
        float kd = smoothstep(0.15, 9.5, dp);
        sh = mix(0.76, 0.1, kd);
        // level water lines in the lit band under the surface, closer together near it
        float q = sqrt(max(dp, 0.0)) * 2.1 + 0.05 * sin(vWPos.x * 0.7 + vWPos.z * 0.7);
        float wl = abs(fract(q) - 0.5);
        sh = mix(sh, 0.12, (1.0 - smoothstep(0.035, 0.07, wl)) * step(0.45, dp) * (1.0 - smoothstep(4.0, 6.0, dp)));
        if (dp > 10.5) ac = 1.0;${LOOK ? `
        pn = ${P.water.toFixed(1)} + 7.0 * kd;
        if (dp > 10.5) pn = 0.0;` : ''}
      `,
    },
  });
  for (const [pts, flip] of [[radial(DOCK.a0), true], [radial(DOCK.a1), false], [back, false]]) {
    const up = new THREE.Mesh(strip(pts, flip, heightAt, SEA_Y), strata);
    const down = new THREE.Mesh(strip(pts, flip, () => SEA_Y, BASE_Y), deep);
    for (const m of [up, down]) { m.receiveShadow = true; m.castShadow = false; m.name = 'dock-wall'; g.add(m); }
  }
  // the floor and the water: the same sector of the mesh's rings and columns
  const sector = (y) => {
    const p = [], ix = [], nj = DOCK.a1 - DOCK.a0;
    for (let i = DOCK.i0; i <= NR; i++) for (let n = 0; n <= nj; n++) { const [x, z] = at(i, DOCK.a0 + n); p.push(x, y, z); }
    for (let i = 0; i < NR - DOCK.i0; i++) for (let n = 0; n < nj; n++) {
      const a = i * (nj + 1) + n, b = (i + 1) * (nj + 1) + n;
      ix.push(a, a + 1, b, a + 1, b + 1, b);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    geo.setIndex(ix);
    geo.computeVertexNormals();
    return geo;
  };
  const floor = new THREE.Mesh(sector(DOCK.floor), dark);
  floor.name = 'dock-floor';
  floor.castShadow = false;
  g.add(floor);
  // the water: real water, so pencil (the AI zone's sea is typed); a slow swell, a light tone (it is not the paper
  // of the shore around it) and drawn ripples
  const water = new THREE.Mesh(sector(SEA_Y), ink({
    shade: 0.95, bias: 0.04, side: THREE.DoubleSide,
    hooks: {
      key: 'dock-water',
      vPos: `
        transformed.y += sin(transformed.x * 0.7 + uTime * 0.9) * 0.05 + sin(transformed.z * 0.9 - uTime * 0.7) * 0.04;
      `,
      fOut: `
        sh = min(sh, 0.8);${LOOK ? `
        pn = ${(P.water + 1).toFixed(1)};` : ''}
      `,
    },
  }));
  water.name = 'dock-water';
  water.receiveShadow = true;
  water.castShadow = false;
  g.add(water);
  // ripples: short level pencil strokes lying on the water in rows along the mouth, the way a drawing says "water"
  // (seen from just above it, a mark drawn flat on the surface would vanish; strokes keep a line's width)
  const RR = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  const lineGeo = (pts, r) => {
    const t = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(6, pts.length * 3), r, 4, false);
    const n = t.index ? t.toNonIndexed() : t;
    for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k);
    return n;
  };
  {
    const parts = [];
    for (let row = 0; row < 9; row++) {
      const r = R - 0.55 - row * 1.05;
      if (r < DOCK.r0 + 0.4) break;
      let a = DOCK.a0 + 0.35 + RR() * 1.2;
      while (a < DOCK.a1 - 0.6) {
        const len = (1.1 + RR() * 1.6) / r * (180 / Math.PI);       // a dash 1.1–2.7 long
        const a1 = Math.min(a + len, DOCK.a1 - 0.35);
        const pts = [];
        for (let i = 0; i <= 4; i++) {
          const aa = ((a + (a1 - a) * (i / 4)) / 180) * Math.PI;
          const rr = r + Math.sin(i * 1.7 + row) * 0.07;
          pts.push(new THREE.Vector3(Math.cos(aa) * rr, SEA_Y + 0.13, Math.sin(aa) * rr));
        }
        parts.push(lineGeo(pts, 0.05));
        a = a1 + (0.9 + RR() * 1.8) / r * (180 / Math.PI) * (1 + row * 0.12);
      }
    }
    const m = new THREE.Mesh(mergeGeometries(parts), ink({ accent: 'ink' }));
    m.name = 'dock-ripples';
    m.castShadow = false;
    g.add(m);
  }
  // the waterline seen edge-on across the mouth: an undulating ink line at the rim, the edge of the section
  {
    const pts = [];
    for (let j = DOCK.a0; j <= DOCK.a1 + 1e-6; j += 0.25) {
      const a = (j / 360) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * (R + 0.06), SEA_Y + 0.11 * Math.sin(j * 4.1), Math.sin(a) * (R + 0.06)));
    }
    const line = new THREE.Mesh(lineGeo(pts, 0.11), ink({ accent: 'ink' }));
    line.name = 'dock-waterline';
    line.castShadow = false;
    g.add(line);
  }
  return g;
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
  if (LOOK) {
    // ?look: water with depth (the land-use map's a: shallow by the banks, deep in the channel) under the type;
    // a printed map (a) bands it like a chart, the others shade it smoothly
    hooks.key = 'sea-look';
    hooks.fOut += `
      {
        float dep = texture2D(uLand, vWPos.xz / 200.0 + 0.5).a;
        dep = clamp(dep + (sn(vWPos.xz * 0.12 + uTime * 0.05) - 0.5) * 0.12, 0.0, 1.0);
        ${LOOK === 'a' ? 'dep = floor(dep * 3.999) / 3.0;' : ''}
        pn = ${P.water.toFixed(1)} + 7.0 * dep;${LOOK === 'a' ? '' : `
        // light moving over the water: brighter patches drift with the wind
        float rip = smoothstep(0.6, 0.82, sn(vWPos.xz * 0.3 + vec2(uTime * 0.11, -uTime * 0.07)) * 0.6 + sn(vWPos.xz * 0.7 - vec2(uTime * 0.05, uTime * 0.12)) * 0.4);
        pn = max(${P.water.toFixed(1)}, pn - rip * 1.7);`}
        // the type thins out over the shallows: the current runs in the deep channel
        sh = mix(0.97, sh, smoothstep(0.08, 0.45, dep));
      }
    `;
  }
  const m = ink({ style: 1, hooks, uniforms: LOOK ? { uLand: { value: LAND.tex } } : undefined });
  const sea = new THREE.Mesh(g, m);
  sea.receiveShadow = true;
  sea.name = 'sea';
  return sea;
}

export { inkDepth };
