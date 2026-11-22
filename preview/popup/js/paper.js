// Paper kit: every object in the book is cut from a few flat-shaded paper primitives.
// Coordinates: the open book lies on the XZ plane, Y is up, the spine runs along Z at x = 0.
import * as T from '../vendor/three.module.min.js';
export { T };

export const C = {
  cream: '#f5e3b8', edge: '#fff3d6', white: '#fbf6ea', ink: '#3b3833', dark: '#2d2f33', grey: '#b9b4a8', stone: '#c9b08a',
  kraft: '#c9a274', wood: '#a16d43', bark: '#7a5237', honey: '#e0aa55', gold: '#e8b84e', red: '#cf5a3e', deep: '#7d3f35',
  leaf: '#5c8a63', pine: '#335f54', mint: '#a5ba8f', lime: '#c3d94e', teal: '#4a8284', aqua: '#62c4cf', sky: '#9fd0d6',
  navy: '#2c4460', blue: '#5f86a8', coral: '#ee8672', pink: '#f6b9aa', plum: '#6b3f55', slate: '#5b6b73', steel: '#8fa3a8',
};

export const FONT = '"DW Sans","Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';
export const SERIF = '"DW Serif","Noto Serif TC","Songti TC","PMingLiU",serif';

const mats = new Map();
function mat(col) {
  if (!mats.has(col)) mats.set(col, new T.MeshLambertMaterial({ color: col, flatShading: true, side: T.DoubleSide }));
  return mats.get(col);
}
function add(g, geo, col, x = 0, y = 0, z = 0) {
  const m = new T.Mesh(geo, mat(col));
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m;
}

export const group = (parent) => { const g = new T.Group(); if (parent) parent.add(g); return g; };
/** a part that moves on its own (kept out of its parent's merged mesh) */
export function keep(parent, x = 0, y = 0, z = 0) { const g = new T.Group(); g.userData.keep = true; g.position.set(x, y, z); if (parent) parent.add(g); return g; }

export const box = (g, x, y, z, w, h, d, col) => add(g, new T.BoxGeometry(w, h, d), col, x, y, z);
export const cyl = (g, x, y, z, rTop, rBot, h, col, sides = 10) => add(g, new T.CylinderGeometry(rTop, rBot, h, sides), col, x, y, z);
export const cone = (g, x, y, z, r, h, col, sides = 8) => add(g, new T.ConeGeometry(r, h, sides), col, x, y, z);
export const ball = (g, x, y, z, r, col, detail = 0) => add(g, new T.IcosahedronGeometry(r, detail), col, x, y, z);
/** a round paper disc standing upright, facing +z */
export function disc(g, x, y, z, r, col, thick = .04, sides = 20) { const m = add(g, new T.CylinderGeometry(r, r, thick, sides), col, x, y, z); m.rotation.x = Math.PI / 2; return m; }
export function ring(g, x, y, z, r, tube, col, seg = 24) { return add(g, new T.TorusGeometry(r, tube, 5, seg), col, x, y, z); }
/** a rod between two points */
export function beam(g, a, b, rad, col, sides = 6) {
  const v = new T.Vector3(...a), d = new T.Vector3(...b).sub(v), len = d.length();
  const m = add(g, new T.CylinderGeometry(rad, rad, len, sides), col, v.x + d.x / 2, v.y + d.y / 2, v.z + d.z / 2);
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); return m;
}
function shapeOf(points) { const s = new T.Shape(); points.forEach(([px, py], i) => (i ? s.lineTo(px, py) : s.moveTo(px, py))); s.closePath(); return s; }
/** an upright cut-out: outline in the XY plane, thickness toward +z */
export function poly(g, points, thick, col, x = 0, y = 0, z = 0) { return add(g, new T.ExtrudeGeometry(shapeOf(points), { depth: thick, bevelEnabled: false }), col, x, y, z); }
/** a cut-out lying flat on the page: outline given as [x, z] pairs */
export function slab(g, points, thick, col, y = 0) {
  const m = add(g, new T.ExtrudeGeometry(shapeOf(points.map(([px, pz]) => [px, -pz])), { depth: thick, bevelEnabled: false }), col, 0, y, 0);
  m.rotation.x = -Math.PI / 2; return m;
}
/** an upright card with rounded corners, centred on x, standing on y */
export function card(g, x, y, z, w, h, col, thick = .04, r = .06) {
  const s = new T.Shape(), a = -w / 2, b = w / 2; r = Math.min(r, w / 2, h / 2);
  s.moveTo(a + r, 0); s.lineTo(b - r, 0); s.quadraticCurveTo(b, 0, b, r); s.lineTo(b, h - r); s.quadraticCurveTo(b, h, b - r, h);
  s.lineTo(a + r, h); s.quadraticCurveTo(a, h, a, h - r); s.lineTo(a, r); s.quadraticCurveTo(a, 0, a + r, 0);
  return add(g, new T.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false, curveSegments: 4 }), col, x, y, z);
}
export function tri(g, a, b, c, col) {
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute([...a, ...b, ...c], 3)); geo.computeVertexNormals();
  return add(g, geo, col);
}
export function quad(g, a, b, c, d, col) { tri(g, a, b, c, col); tri(g, c, d, a, col); }
/** the glue tab every pop-up piece stands on */
export function tab(g, w = .6, col = '#d9c08f') {
  quad(g, [-w / 2, .012, .012], [w / 2, .012, .012], [w / 2 - .05, .012, .2], [-w / 2 + .05, .012, .2], col);
}
/** a paper prop holding a standing piece up from behind */
export function strut(g, h, col = '#cdb083') { quad(g, [0, .012, -.03], [0, h * .6, -.03], [0, h * .3, -h * .24], [0, .012, -h * .32], col); }

// ---------------------------------------------------------------- printed words

function fit(ctx, text, maxW) { const lines = []; let cur = ''; for (const ch of text) { if (ch === '\n') { lines.push(cur); cur = ''; continue; } if (ctx.measureText(cur + ch).width > maxW && cur) { lines.push(cur); cur = ch; } else cur += ch; } if (cur) lines.push(cur); return lines; }
/** words printed on a transparent sheet; returns {texture, aspect, lines} */
export function printed(text, { size = 56, color = C.ink, weight = 700, font = FONT, maxChars = 0, align = 'center', gap = 1.28 } = {}) {
  const c = document.createElement('canvas'), ctx = c.getContext('2d'), f = `${weight} ${size}px ${font}`;
  ctx.font = f;
  const maxW = maxChars ? size * maxChars : 1e9, lines = fit(ctx, String(text), maxW);
  const w = Math.ceil(Math.max(...lines.map((l) => ctx.measureText(l).width)) + size * .5), h = Math.ceil(lines.length * size * gap + size * .3);
  c.width = w; c.height = h; ctx.font = f; ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.textAlign = align;
  const x = align === 'center' ? w / 2 : align === 'left' ? size * .25 : w - size * .25;
  lines.forEach((l, i) => ctx.fillText(l, x, size * .15 + size * gap * (i + .5)));
  const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
  return { texture: tex, aspect: w / h, lines: lines.length };
}
/** words on the front of something: h is the height of one line in world units */
export function words(g, text, x, y, z, h = .16, opt = {}) {
  const p = printed(text, opt), H = h * p.lines * 1.28 + h * .3, W = H * p.aspect;
  const m = new T.Mesh(new T.PlaneGeometry(W, H), new T.MeshBasicMaterial({ map: p.texture, transparent: true, alphaTest: .35, toneMapped: false }));
  m.position.set(x, y, z); m.userData.words = true; m.userData.size = [W, H]; g.add(m); return m;
}
/** a name tag: a paper plaque with words on it, centred at (x, y, z). It is its own keep() group, so it can be moved, hidden or popped. */
export function tag(g, text, x, y, z, { h = .15, paper = C.edge, ink = C.ink, pad = .09, thick = .035, maxChars = 0, weight = 700, pole = 0 } = {}) {
  const t = keep(g, x, y, z);
  const w = words(t, text, 0, 0, thick + .006, h, { color: ink, maxChars, weight }), [W, H] = w.userData.size;
  const pw = W + pad * 2 - h * .3, ph = H + pad * .9;
  card(t, 0, -ph / 2, 0, pw, ph, paper, thick, .05);
  if (pole) beam(t, [0, -ph / 2, thick / 2], [0, -ph / 2 - pole, thick / 2], .022, C.wood, 5);
  t.userData.size = [pw, ph]; return t;
}

/** a board whose words can change while the scene plays: const b = board(g, x, y, z, w, h); b.write('三行以內的字') */
export function board(g, x, y, z, w, h, { paper = C.white, ink = C.ink, size = .16, weight = 700, frame = C.wood, align = 'center' } = {}) {
  const node = keep(g, x, y, z), R = 220, c = document.createElement('canvas'); c.width = Math.round(w * R); c.height = Math.round(h * R);
  const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
  if (frame) card(node, 0, -h / 2 - .04, -.045, w + .08, h + .08, frame, .04, .05);
  const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex, toneMapped: false })); m.userData.words = true; node.add(m);
  const api = { node, text: '', opts: {}, write(text, o = {}) {
    api.text = text; api.opts = o; const ctx = c.getContext('2d'), px = (o.size || size) * R; ctx.fillStyle = o.paper || paper; ctx.fillRect(0, 0, c.width, c.height);
    ctx.font = `${o.weight || weight} ${px}px ${FONT}`; ctx.fillStyle = o.ink || ink; ctx.textBaseline = 'middle'; ctx.textAlign = align;
    const lines = String(text).split('\n').flatMap((l) => fit(ctx, l, c.width - px * .8)), x0 = align === 'center' ? c.width / 2 : px * .4, y0 = c.height / 2 - (lines.length - 1) * px * .65;
    lines.forEach((l, i) => ctx.fillText(l, x0, y0 + i * px * 1.3)); tex.needsUpdate = true; return api; } };
  node.userData.board = api; return api.write('');
}

// ---------------------------------------------------------------- one mesh per piece

const grainCanvas = document.createElement('canvas'); grainCanvas.width = grainCanvas.height = 128;
{ const ctx = grainCanvas.getContext('2d'), px = ctx.createImageData(128, 128); let s = 9173;
  for (let i = 0; i < px.data.length; i += 4) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; const n = 150 + (s >>> 25); px.data[i] = px.data[i + 1] = px.data[i + 2] = n; px.data[i + 3] = 255; }
  ctx.putImageData(px, 0, 0); }
const grain = new T.CanvasTexture(grainCanvas); grain.wrapS = grain.wrapT = T.RepeatWrapping;
export const paperMat = new T.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: T.DoubleSide });
paperMat.onBeforeCompile = (sh) => {
  sh.uniforms.uGrain = { value: grain };
  sh.vertexShader = 'varying vec3 vCut;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvCut = position;');
  sh.fragmentShader = 'varying vec3 vCut;\nuniform sampler2D uGrain;\n' + sh.fragmentShader.replace('#include <color_fragment>',
    '#include <color_fragment>\ndiffuseColor.rgb *= 0.86 + 0.26 * texture2D(uGrain, vCut.xy * 0.9 + vCut.z * vec2(0.37, 0.61)).r;');
};

/** Merge the still facets of root into one mesh; every keep() group below it is merged on its own. */
export function seal(root) {
  root.updateWorldMatrix(true, true);
  const groups = [root]; root.traverse((o) => { if (o !== root && o.userData.keep) groups.push(o); });
  for (const g of groups) {
    const inv = g.matrixWorld.clone().invert(), pos = [], col = [], gone = [], v = new T.Vector3();
    g.traverse((o) => {
      if (!o.isMesh || o.userData.words || o.userData.sealed || o.userData.raw) return;
      if (o.material.map || !o.material.color || o.material.vertexColors || o.material.transparent) return;
      for (let a = o.parent; a && a !== g; a = a.parent) if (a.userData.keep) return;
      if (o === g) return;
      const m = new T.Matrix4().multiplyMatrices(inv, o.matrixWorld), geo = o.geometry, idx = geo.index, pa = geo.attributes.position, c = o.material.color;
      const n = idx ? idx.count : pa.count;
      for (let j = 0; j < n; j++) { v.fromBufferAttribute(pa, idx ? idx.getX(j) : j).applyMatrix4(m); pos.push(v.x, v.y, v.z); col.push(c.r, c.g, c.b); }
      gone.push(o);
    });
    if (!pos.length) continue;
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
    const mesh = new T.Mesh(geo, paperMat); mesh.castShadow = mesh.receiveShadow = true; mesh.userData.sealed = true;
    gone.forEach((o) => { o.removeFromParent(); o.geometry.dispose(); });
    g.add(mesh);
  }
  return root;
}

// ---------------------------------------------------------------- shared scenery

export function pine(g, h = 1.6, col = C.pine, col2 = '#3f6d5c') {
  const w = h * .3; tab(g, w * .7);
  poly(g, [[-.07, 0], [.07, 0], [.05, h * .4], [-.05, h * .4]], .06, C.wood);
  const left = [[0, h], [-w * .42, h * .7], [-w * .22, h * .7], [-w * .68, h * .5], [-w * .4, h * .5], [-w, h * .2], [0, h * .2]];
  const right = left.map(([x, y]) => [-x, y]).reverse();
  poly(g, left, .05, col, 0, 0, .02); poly(g, right, .05, col2, 0, 0, .02);
}
export function bush(g, r = .4, col = C.leaf) { tab(g, r); for (const [x, y, s] of [[-r * .5, r * .5, .7], [r * .45, r * .55, .75], [0, r * .8, 1]]) { const b = ball(g, x, y, 0, r * s * .6, col); b.scale.z = .45; } }
export function grass(g, h = .4, col = C.leaf) { for (let i = 0; i < 5; i++) { const x = (i - 2) * .07; poly(g, [[x - .04, 0], [x + (i - 2) * .08, h * (.6 + (i % 3) * .18)], [x + .05, .05]], .02, col); } tab(g, .26); }
export function cloud(g, w = 1.2, y = 2.4, col = C.white) {
  beam(g, [0, 0, -.04], [0, y - .1, -.04], .022, '#c4b998', 4);
  const k = w / 1.3; poly(g, [[-.62, 0], [-.58, .14], [-.4, .18], [-.3, .34], [-.1, .38], [.04, .54], [.26, .54], [.4, .4], [.42, .27], [.6, .22], [.72, .06], [.66, 0]].map(([x, yy]) => [x * k, yy * k]), .06, col, 0, y, 0);
}
export function rock(g, k = 1, col = '#8a958c') { const b = ball(g, 0, .22 * k, 0, .5 * k, col); b.scale.set(1, .62, .7); b.rotation.y = 1.2; }
export function flag(g, x, y, z, len = .6, col = C.red, pole = .7) {
  beam(g, [x, y, z], [x, y + pole, z], .022, C.wood, 5); ball(g, x, y + pole + .03, z, .04, C.gold);
  return poly(g, [[0, 0], [len * .5, .05], [len, 0], [len * .78, -.1], [len, -.2], [len * .5, -.16], [0, -.21]], .022, col, x, y + pole - .04, z);
}
export function house(g, w = 1, h = .8, d = .7, wall = '#e9cb95', roofCol = C.red) {
  box(g, 0, h / 2, 0, w, h, d, wall);
  const rh = h * .62, a = [-w * .58, h, d / 2 + .04], b = [0, h + rh, d / 2 + .04], c = [w * .58, h, d / 2 + .04], A = [-w * .58, h, -d / 2 - .04], B = [0, h + rh, -d / 2 - .04], D = [w * .58, h, -d / 2 - .04];
  poly(g, [[-w / 2, 0], [0, rh * .92], [w / 2, 0]], d, wall, 0, h, -d / 2);
  quad(g, a, b, B, A, roofCol); quad(g, b, c, D, B, roofCol);
  box(g, -w * .2, h * .3, d / 2 + .012, w * .2, h * .6, .03, C.bark); box(g, w * .22, h * .56, d / 2 + .012, w * .22, h * .26, .03, '#6f9aa0');
}

// ---------------------------------------------------------------- things that recur on every story page
/** a plank from the crate 小智 came in (wood, two red "this side up" arrows): on every page an islander has put one to use.
 *  Lies along x, centred at (x, y, z); returns a keep() group so it can wiggle when tapped. */
export function cratePlank(g, x = 0, y = 0, z = 0, { len = .9, h = .2, thick = .05, rz = 0, ry = 0 } = {}) {
  const k = keep(g, x, y, z); k.rotation.z = rz; k.rotation.y = ry;
  box(k, 0, 0, 0, len, h, thick, '#c99a63'); box(k, 0, 0, thick / 2 + .003, len, .012, .006, '#a87a48');
  for (const ax of [-len * .28, -len * .12]) poly(k, [[-.022, -h * .32], [.022, -h * .32], [.022, 0], [.05, 0], [0, h * .36], [-.05, 0], [-.022, 0]], .008, C.red, ax, 0, thick / 2 + .004);
  return k;
}
/** the sun or the moon of this page, standing at the back of the spread: its height tells the time of day.
 *  y = how high its centre stands (0 = half risen on the horizon). Returns the keep() group of the rays (sun) or stars (moon), for a slow spin. */
export function skyDisc(g, { kind = 'sun', y = 0, r = .5, col = null } = {}) {
  const c = col || (kind === 'sun' ? '#f4a66a' : '#f3ecd0');
  if (y > r * .8) { tab(g, .4); beam(g, [0, 0, -.03], [0, y, -.03], .018, '#b9a27a', 5); }
  const rays = keep(g, 0, y + .02, -.03);
  if (kind === 'sun') { for (let i = 0; i < (y > r ? 14 : 9); i++) { const a = (y > r ? Math.PI * 2 : Math.PI) * i / (y > r ? 14 : 8); poly(rays, [[-.05, r + .1], [.05, r + .1], [0, r + .3]], .02, '#f3c27a', 0, 0, 0).rotation.z = a - Math.PI / 2; } }
  else { for (const [sx, sy] of [[-.9, .3], [.8, .5], [-.5, .75], [1.1, -.1]]) disc(rays, sx, sy, 0, .035, '#fff6d8', .012, 5); }
  disc(g, 0, y + .02, 0, r, c, .04, 28);
  if (kind === 'moon') disc(g, r * .32, y + .02 + r * .2, .012, r * .78, '#141a33', .03, 24);   // a bite out of it: a crescent
  return rays;
}
