// The table, the open book, its turning leaf and the camera. Scenes stand on spreads; this file knows nothing about stories.
import { T, C, group, box, cyl, cone, ball, disc, ring, beam, poly, slab, seal } from './paper.js';

export const W = 6, D = 7.2, Y = .04;
const PI = Math.PI;
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
export const EASE = {
  lin: (t) => t, in: (t) => t * t * t, out: (t) => 1 - (1 - t) ** 3, inOut: (t) => (t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  back: (t) => { const c = 1.9; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; },
  bounce: (t) => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; },
  elastic: (t) => (t === 0 || t === 1 ? t : 2 ** (-10 * t) * Math.sin((t * 10 - .75) * (2 * PI / 3)) + 1),
};
/** how high the page stands above Y at distance r from the spine (pages dip into the gutter) */
export const camber = (r) => .13 * (1 - Math.exp(-r * 2.6));
export const pageY = (x) => Y + camber(Math.abs(x));

export const THEMES = {
  map:      { bg: '#2a3140', table: '#8a8f97', pattern: 'cloth',   key: '#fff0d6', fill: '#cfe0f5', sky: '#fff7e5' },
  prologue: { bg: '#1e3248', table: '#5d7f9c', pattern: 'waves',   key: '#fff0d2', fill: '#bcd8ff', sky: '#f4f8ff' },
  people:   { bg: '#24453d', table: '#86a08f', pattern: 'cloth',   key: '#ffe9c9', fill: '#c3e5ed', sky: '#fff7e5' },
  model:    { bg: '#44263a', table: '#b48996', pattern: 'grid',    key: '#ffe9dc', fill: '#f3d3e3', sky: '#fff3ee' },
  ai:       { bg: '#12333f', table: '#5b929c', pattern: 'circuit', key: '#f2fbff', fill: '#b5eef5', sky: '#eefcff' },
};

function patternTexture(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, 512, 512);
  let s = 77; const rnd = () => ((s = (Math.imul(1664525, s) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 5200; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.09)'; g.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 4, 1); }
  g.lineWidth = 1.5;
  if (kind === 'waves') { g.strokeStyle = 'rgba(255,255,255,.16)'; for (let y = 16; y < 512; y += 32) { g.beginPath(); for (let x = 0; x <= 512; x += 8) g.lineTo(x, y + Math.sin((x + y * 3) * PI / 64) * 5); g.stroke(); } }
  if (kind === 'grid') { g.strokeStyle = 'rgba(255,255,255,.2)'; for (let k = 0; k <= 512; k += 64) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 512); g.moveTo(0, k); g.lineTo(512, k); g.stroke(); } g.strokeStyle = 'rgba(255,255,255,.09)'; for (let k = 0; k <= 512; k += 16) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 512); g.moveTo(0, k); g.lineTo(512, k); g.stroke(); } }
  if (kind === 'circuit') { g.strokeStyle = 'rgba(255,255,255,.2)'; g.fillStyle = 'rgba(255,255,255,.26)'; for (let i = 0; i < 26; i++) { let x = Math.round(rnd() * 16) * 32, y = Math.round(rnd() * 16) * 32; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 3; k++) { if (k % 2) y += (Math.round(rnd() * 4) - 2) * 32; else x += (Math.round(rnd() * 4) - 2) * 32; g.lineTo(x, y); } g.stroke(); g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); } }
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(kind === 'cloth' ? 70 : 34, kind === 'cloth' ? 70 : 34); t.colorSpace = T.SRGBColorSpace; return t;
}

export function createStage(canvas) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = T.SRGBColorSpace; renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap;
  const scene = new T.Scene(); scene.background = new T.Color(THEMES.map.bg); scene.fog = new T.FogExp2(THEMES.map.bg, .0085);
  const camera = new T.PerspectiveCamera(33, 1, .1, 180);
  const hemi = new T.HemisphereLight(0xfff7e5, 0xc8b797, 2.3); scene.add(hemi);
  const key = new T.DirectionalLight(0xffe9c9, 2.5); key.position.set(-6, 10, 6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -9.5, right: 9.5, top: 9.5, bottom: -9.5, near: 1, far: 30 }); key.shadow.normalBias = .02; key.shadow.bias = -.0003; scene.add(key);
  const fill = new T.DirectionalLight(0xc3e5ed, .8); fill.position.set(5, 5, -5); scene.add(fill);

  const patterns = {}; for (const k of ['cloth', 'waves', 'grid', 'circuit']) patterns[k] = patternTexture(k);
  const table = new T.Mesh(new T.PlaneGeometry(380, 380), new T.MeshLambertMaterial({ map: patterns.cloth, color: THEMES.map.table }));
  table.rotation.x = -PI / 2; table.position.y = -.42; table.receiveShadow = true; scene.add(table);

  // ------------------------------------------------------------ table dressing: every land lays its own things around the book
  const TY = -.42, dress = {};
  function dressing(land, depth, build) { const g = new T.Group(); build(g); seal(g); g.visible = false; g.userData.depth = depth; scene.add(g); dress[land] = g; }
  function setDress(land, w) { const g = dress[land]; if (!g) return; g.visible = w > .002; g.position.y = -(1 - w) * g.userData.depth; }
  function paperBoat(g, x, z, k, ry, col) { const b = group(g); b.position.set(x, TY, z); b.rotation.y = ry; b.scale.setScalar(k);
    poly(b, [[-.9, .34], [.9, .34], [.5, 0], [-.5, 0]], .5, col, 0, 0, -.25); poly(b, [[-.45, .34], [.45, .34], [0, 1.1]], .04, '#fbf6ea', 0, 0, -.02); }
  dressing('map', 2, (g) => {
    const p = group(g); p.position.set(7.7, TY + .13, -1.2); p.rotation.y = .18;
    cyl(p, 0, 0, 0, .13, .13, 4.4, '#e8b84e', 6).rotation.x = Math.PI / 2; cone(p, 0, 0, 2.45, .13, .5, '#f5e3b8', 6).rotation.x = Math.PI / 2; cone(p, 0, 0, 2.62, .05, .16, '#3b3833', 6).rotation.x = Math.PI / 2; cyl(p, 0, 0, -2.3, .135, .135, .3, '#cf5a3e', 6).rotation.x = Math.PI / 2;
    const m = group(g); m.position.set(-7.6, TY + .06, -4.7); m.rotation.x = -Math.PI / 2; ring(m, 0, 0, 0, .7, .09, '#a16d43', 28); beam(m, [.55, -.55, 0], [1.5, -1.5, 0], .09, '#7a5237', 6);
  });
  dressing('prologue', 2.5, (g) => { paperBoat(g, -7.5, -5.0, 1.0, .5, '#f5e3b8'); paperBoat(g, 7.3, -5.4, .8, -.4, '#cf5a3e'); paperBoat(g, 8.0, .8, .7, -1.1, '#f5e3b8'); paperBoat(g, -8.1, 1.4, .6, 1.2, '#e8b84e'); });
  dressing('people', 4.2, (g) => {
    for (const sx of [-1, 1]) { beam(g, [sx * 7.9, TY, -4.7], [sx * 7.9, 3.0, -4.7], .06, '#a16d43', 6); ball(g, sx * 7.9, 3.08, -4.7, .11, '#e8b84e'); }
    const n = 19; for (let i = 0; i < n; i++) { const u = i / (n - 1), x = -7.9 + u * 15.8, y = 2.92 - Math.sin(u * Math.PI) * .75;
      if (i < n - 1) { const u2 = (i + 1) / (n - 1); beam(g, [x, y, -4.7], [-7.9 + u2 * 15.8, 2.92 - Math.sin(u2 * Math.PI) * .75, -4.7], .014, '#7a5237', 4); }
      if (i > 0 && i < n - 1) poly(g, [[-.2, 0], [.2, 0], [0, -.46]], .02, ['#c3d94e', '#cf5a3e', '#fbf6ea', '#e0aa55'][i % 4], x, y, -4.7); }
  });
  dressing('model', 2, (g) => {
    box(g, 0, TY + .04, -4.95, 12.4, .07, .8, '#f3a999');
    for (let i = 0; i <= 48; i++) box(g, -6 + i * .25, TY + .085, -4.72 + (i % 4 ? 0 : .06), .025, .012, i % 4 ? .16 : .3, '#7a3c33');
    slab(g, [[-9.2, -3.9], [-6.9, -3.9], [-9.2, -.2]], .07, '#f8d2c8', TY + .01); slab(g, [[-8.6, -3.4], [-7.6, -3.4], [-8.6, -1.8]], .08, '#b48996', TY + .012);
    const p = group(g); p.position.set(7.75, TY + .13, -.6); p.rotation.y = -.14;
    cyl(p, 0, 0, 0, .13, .13, 4.6, '#ee8672', 6).rotation.x = Math.PI / 2; cone(p, 0, 0, 2.55, .13, .5, '#f5e3b8', 6).rotation.x = Math.PI / 2; cone(p, 0, 0, 2.72, .05, .16, '#3b3833', 6).rotation.x = Math.PI / 2;
  });
  dressing('ai', 2, (g) => {
    const trace = (pts) => { for (let i = 0; i < pts.length - 1; i++) { const [a, b] = [pts[i], pts[i + 1]], dx = b[0] - a[0], dz = b[1] - a[1]; box(g, (a[0] + b[0]) / 2, TY + .02, (a[1] + b[1]) / 2, Math.abs(dx) + .09, .03, Math.abs(dz) + .09, '#7fdbe4'); } const e = pts[pts.length - 1]; cyl(g, e[0], TY + .04, e[1], .16, .16, .06, '#f5e3b8', 10); };
    trace([[6.4, -2], [7.4, -2], [7.4, -4.6], [8.8, -4.6]]); trace([[6.4, 0], [8.2, 0], [8.2, -1.6]]); trace([[-6.4, -1], [-7.6, -1], [-7.6, -3.4], [-9, -3.4]]); trace([[-6.4, 1.2], [-8.4, 1.2]]);
    trace([[-3, -4], [-3, -5.2], [-5.4, -5.2]]); trace([[2.4, -4], [2.4, -5.6], [5, -5.6], [5, -6.6]]);
    for (const [x, z] of [[7.9, -3.2], [-8.3, -2.2]]) { box(g, x, TY + .09, z, .9, .16, .9, '#2c4460'); for (let i = 0; i < 4; i++) { box(g, x - .3 + i * .2, TY + .05, z + .5, .06, .04, .14, '#8fa3a8'); box(g, x - .3 + i * .2, TY + .05, z - .5, .06, .04, .14, '#8fa3a8'); } disc(g, x, TY + .18, z, .14, '#62c4cf', .02, 10).rotation.x = 0; }
  });

  // ------------------------------------------------------------ the book itself
  const book = new T.Group(); scene.add(book);
  function board(x, y, w, h, d, col) { const m = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshLambertMaterial({ color: col })); m.position.set(x, y, 0); m.castShadow = m.receiveShadow = true; book.add(m); return m; }
  const covers = [];
  for (const s of [-1, 1]) {
    covers.push(board(s * (W / 2 + .02), -.335, W + .26, .11, D + .36, '#2f3a4a'), board(s * (W / 2 + .02), -.275, W + .28, .03, D + .38, '#e8b84e'));
    for (let i = 0; i < 9; i++) { const e = Math.sin(i * 2) * .012; board(s * (W / 2 + .012), -.245 + i * .03, W + .02 + e, .03, D + .05 + e, ['#cbb38a', '#ecd7ad', '#f8e7c0'][i % 3]); }
  }
  board(0, -.3, .34, .17, D + .34, '#273140');
  const seam = board(0, Y + .012, .04, .012, D, '#9b8460'); seam.castShadow = false;
  // bookmark ribbon
  { const s = new T.Shape(); s.moveTo(0, 0); s.lineTo(.3, 0); s.lineTo(.3, .95); s.lineTo(.15, .78); s.lineTo(0, .95); s.closePath();
    const r = new T.Mesh(new T.ShapeGeometry(s), new T.MeshLambertMaterial({ color: '#cf5a3e', side: T.DoubleSide })); r.rotation.x = PI / 2; r.rotation.z = -.08; r.position.set(.5, -.23, D / 2 - .02); book.add(r); }

  function pageGeo(side, nx = 22) {
    const pos = [], uv = [], idx = [];
    for (let j = 0; j <= 1; j++) for (let i = 0; i <= nx; i++) { const r = W * i / nx; pos.push(side * r, Y + camber(r), (j - .5) * D); uv.push(.5 + side * .5 * r / W, 1 - j); }
    for (let i = 0; i < nx; i++) { const a = i, b = i + 1, c = i + nx + 1, d = c + 1; idx.push(...(side > 0 ? [a, c, b, b, c, d] : [a, b, c, b, d, c])); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  const blank = (() => { const c = document.createElement('canvas'); c.width = c.height = 8; const g = c.getContext('2d'); g.fillStyle = '#f3e4c0'; g.fillRect(0, 0, 8, 8); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; })();
  const pages = { L: new T.Mesh(pageGeo(-1), new T.MeshLambertMaterial({ map: blank })), R: new T.Mesh(pageGeo(1), new T.MeshLambertMaterial({ map: blank })) };
  for (const m of Object.values(pages)) { m.receiveShadow = true; book.add(m); }

  // the turning leaf: one sheet, two printed faces
  const NX = 26, leafPos = new T.BufferAttribute(new Float32Array((NX + 1) * 2 * 3), 3); leafPos.setUsage(T.DynamicDrawUsage);
  function leafGeo(back) {
    const uv = [], idx = [];
    for (let j = 0; j <= 1; j++) for (let i = 0; i <= NX; i++) uv.push(back ? .5 - .5 * i / NX : .5 + .5 * i / NX, 1 - j);
    for (let i = 0; i < NX; i++) { const a = i, b = i + 1, c = i + NX + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = new T.BufferGeometry(); g.setAttribute('position', leafPos); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g;
  }
  const leaf = { front: new T.Mesh(leafGeo(false), new T.MeshLambertMaterial({ map: blank, side: T.FrontSide })), back: new T.Mesh(leafGeo(true), new T.MeshLambertMaterial({ map: blank, side: T.BackSide })) };
  for (const m of Object.values(leaf)) { m.castShadow = m.receiveShadow = true; m.frustumCulled = false; m.visible = false; book.add(m); }
  function bendLeaf(p) {
    const a = PI * p, k = .9 * Math.sin(a), ds = W / NX; let x = 0, y = 0;
    for (let i = 0; i <= NX; i++) {
      if (i) { const th = a + k * ((i - .5) / NX - .5); x += Math.cos(th) * ds; y += Math.sin(th) * ds; }
      const yy = Y + .014 + y + camber(W * i / NX) * (1 - Math.sin(a));
      leafPos.setXYZ(i, x, yy, -D / 2); leafPos.setXYZ(i + NX + 1, x, yy, D / 2);
    }
    leafPos.needsUpdate = true; leaf.front.geometry.computeVertexNormals(); leaf.back.geometry.attributes.normal = leaf.front.geometry.attributes.normal;
  }

  // ------------------------------------------------------------ spreads and their pop-ups
  const spreads = []; let cur = -1, turn = null, theme = { ...THEMES.map }, themeFrom = null, themeTo = null;
  /** the land's theme, with the page's own look (time of day) laid over it */
  const themeOf = (sp) => (sp.look ? { ...THEMES[sp.theme], ...sp.look } : THEMES[sp.theme]);
  const ticks = new Set(), frames = new Set();
  function setLift(sp, L, mode = 'rise') {
    sp.lift = L; sp.group.visible = L > .001;
    for (const a of sp.anchors) {
      const l = clamp(L * 1.5 - a.delay), e = mode === 'rise' ? EASE.back(l) : EASE.inOut(l), f = clamp(e);
      a.holder.visible = l > .002;
      a.hinge.rotation.x = a.dir * (1 - e) * PI * .495;
      a.hinge.scale.set(1, lerp(a.pack, 1, f), lerp(.03, 1, f));
    }
  }
  function register(i, sp) {
    // sp: {texture, group, anchors:[{holder,hinge,art,x,z}], theme}
    const sorted = [...sp.anchors].sort((p, q) => (p.z - q.z) || (Math.abs(q.x) - Math.abs(p.x)));
    sorted.forEach((a, k) => { a.delay = sorted.length > 1 ? .5 * k / (sorted.length - 1) : 0; });
    for (const a of sp.anchors) {
      a.dir = a.z < -.25 ? 1 : -1;
      const box = new T.Box3().setFromObject(a.art), h = box.isEmpty() ? 1 : Math.max(.2, box.max.y);
      const run = (a.dir > 0 ? D / 2 - a.z : a.z + D / 2) - .12; a.pack = Math.min(1, run / h); a.height = h;
      a.holder.position.set(a.x, pageY(a.x) + .004 + (a.y || 0), a.z);
    }
    sp.group.visible = false; scene.add(sp.group); spreads[i] = sp; setLift(sp, 0);
  }
  function show(i) {
    // open the book at spread i without a turn
    const sp = spreads[i]; if (cur >= 0 && spreads[cur]) setLift(spreads[cur], 0);
    cur = i; pages.L.material.map = pages.R.material.map = sp.texture; pages.L.material.needsUpdate = pages.R.material.needsUpdate = true;
    leaf.front.visible = leaf.back.visible = false; applyTheme(themeOf(sp)); table.material.map = patterns[themeOf(sp).pattern]; table.material.needsUpdate = true;
    for (const k in dress) setDress(k, k === sp.theme ? 1 : 0);
  }
  function rise(dur = 1.5) { return new Promise((res) => { const sp = spreads[cur]; let t = 0; const f = (dt) => { t += dt / dur; setLift(sp, clamp(t), 'rise'); if (t >= 1) { ticks.delete(f); res(); } }; ticks.add(f); }); }
  function fold(dur = .6) { return new Promise((res) => { const sp = spreads[cur]; let t = 0; const f = (dt) => { t += dt / dur; setLift(sp, 1 - clamp(t), 'fold'); if (t >= 1) { ticks.delete(f); res(); } }; ticks.add(f); }); }
  function applyTheme(th) { theme = { ...th }; scene.background.set(th.bg); scene.fog.color.set(th.bg); table.material.color.set(th.table); key.color.set(th.key); fill.color.set(th.fill); hemi.color.set(th.sky); }
  const cA = new T.Color(), cB = new T.Color();
  function mixTheme(a, b, t) { for (const [k, tgt] of [['bg', scene.background], ['table', table.material.color], ['key', key.color], ['fill', fill.color], ['sky', hemi.color]]) tgt.copy(cA.set(a[k])).lerp(cB.set(b[k]), t); scene.fog.color.copy(scene.background); }

  function setupTurn(i) {
    const A = spreads[cur], B = spreads[i], fwd = i > cur;
    B.group.visible = false;
    if (fwd) { leaf.front.material.map = A.texture; leaf.back.material.map = B.texture; pages.R.material.map = B.texture; }
    else { leaf.front.material.map = B.texture; leaf.back.material.map = A.texture; pages.L.material.map = B.texture; }
    for (const m of [leaf.front, leaf.back, pages.L, pages.R]) m.material.needsUpdate = true;
    bendLeaf(fwd ? 0 : 1); leaf.front.visible = leaf.back.visible = true;
    themeFrom = themeOf(A); themeTo = themeOf(B);
    return { A, B, fwd, t: 0, to: i, swapped: false, held: false, back: false };
  }
  function turnTo(i, speed = 1) {
    if (turn || i === cur || !spreads[i]) return Promise.resolve(false);
    const dur = clamp(1.75 + Math.abs(i - cur) * .08, 1.75, 2.4) / speed;
    return new Promise((resolve) => { turn = { ...setupTurn(i), dur, resolve }; });
  }
  /** everything about a turn follows from how far it has gone (t from 0 to 1), so a hand can scrub it */
  function applyTurn(u) {
    const t = u.t;
    setLift(u.A, 1 - smooth(0, .27, t), 'fold');
    const p = EASE.inOut(smooth(.2, .78, t)); bendLeaf(u.fwd ? p : 1 - p);
    setLift(u.B, t > .68 ? smooth(.68, 1, t) : 0, 'rise');
    mixTheme(themeFrom, themeTo, smooth(.2, .8, t));
    if (u.A.theme !== u.B.theme) { setDress(u.A.theme, 1 - smooth(.08, .45, t)); setDress(u.B.theme, EASE.back(smooth(.55, .95, t))); }
    const far = t > .5; if (far !== u.swapped) { u.swapped = far; table.material.map = patterns[(far ? themeTo : themeFrom).pattern]; table.material.needsUpdate = true; }
  }
  function endTurn(done) {
    const u = turn, keepSp = done ? u.B : u.A; turn = null;
    pages.L.material.map = pages.R.material.map = keepSp.texture; pages.L.material.needsUpdate = pages.R.material.needsUpdate = true;
    leaf.front.visible = leaf.back.visible = false; setLift(done ? u.A : u.B, 0); setLift(keepSp, 1);
    for (const k in dress) setDress(k, k === keepSp.theme ? 1 : 0);
    if (done) cur = u.to; applyTheme(done ? themeTo : themeFrom); table.material.map = patterns[(done ? themeTo : themeFrom).pattern]; table.material.needsUpdate = true;
    u.resolve(done);
  }
  function stepTurn(dt) {
    const u = turn;
    if (!u.held) u.t = clamp(u.t + (u.back ? -dt / .45 : dt / u.dur));
    applyTurn(u);
    if (!u.held && u.t >= 1) endTurn(true); else if (!u.held && u.back && u.t <= 0) endTurn(false);
  }

  // ------------------------------------------------------------ camera
  const view = { yaw: .08, tilt: .4, zoom: 1, px: 0, py: 0, sx: 0, sy: 0, home: { yaw: .08, tilt: .4 }, flat: 0, focus: 0, focusTo: 0, portrait: false };
  const target = new T.Vector3();
  function place() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1, aspect = w / h; camera.aspect = aspect;
    const portrait = aspect < .9; view.portrait = portrait; const span = portrait ? 8.6 : 14.6, height = Math.max(portrait ? 12.5 : 8.4, span / aspect);
    const dist = height / (2 * Math.tan(camera.fov * PI / 360)) / view.zoom;
    const yaw = view.yaw + view.sx * .05, tilt = clamp(lerp(view.tilt - view.sy * .03, 1.5, view.flat), .12, 1.52);
    const cy = lerp(portrait ? 1.1 : 1.3, .2, view.flat);
    target.set(portrait ? view.focus * (1 - view.flat) : 0, cy, lerp(portrait ? .2 : 0, 0, view.flat));
    camera.position.set(target.x + dist * Math.sin(yaw) * Math.cos(tilt), cy + dist * Math.sin(tilt), target.z + dist * Math.cos(yaw) * Math.cos(tilt));
    camera.lookAt(target); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  }
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75)); renderer.setSize(w, h, false); place(); }
  new ResizeObserver(resize).observe(canvas);

  const still = matchMedia('(prefers-reduced-motion: reduce)');
  // ------------------------------------------------------------ paper confetti
  const N = 260, bits = new T.InstancedMesh(new T.PlaneGeometry(.1, .1), new T.MeshLambertMaterial({ side: T.DoubleSide }), N);
  bits.instanceMatrix.setUsage(T.DynamicDrawUsage); bits.frustumCulled = false; bits.castShadow = true; scene.add(bits);
  const P = Array.from({ length: N }, () => ({ life: 0, p: new T.Vector3(), v: new T.Vector3(), r: new T.Vector3(), w: new T.Vector3(), s: 1, max: 1 }));
  const dummy = new T.Object3D(); let nextBit = 0;
  for (let i = 0; i < N; i++) { dummy.scale.setScalar(0); dummy.updateMatrix(); bits.setMatrixAt(i, dummy.matrix); bits.setColorAt(i, cA.set('#fff')); }
  function burst(pos, { n = 26, colors = ['#e8b84e', '#cf5a3e', '#fff3d6', '#62c4cf', '#c3d94e'], speed = 2.4, up = 3.4, spread = 1, life = 1.5, size = 1, gravity = 6 } = {}) {
    if (still.matches) n = Math.ceil(n / 4);
    for (let k = 0; k < n; k++) {
      const b = P[nextBit]; const a = Math.random() * PI * 2, r = Math.random() * speed * spread;
      b.p.copy(pos); b.v.set(Math.cos(a) * r, up * (.55 + Math.random() * .6), Math.sin(a) * r * .7); b.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); b.w.set(Math.random() * 8 - 4, Math.random() * 8 - 4, Math.random() * 8 - 4);
      b.life = b.max = life * (.7 + Math.random() * .5); b.s = size * (.7 + Math.random() * .8); b.g = gravity;
      bits.setColorAt(nextBit, cA.set(colors[k % colors.length])); nextBit = (nextBit + 1) % N;
    }
    bits.instanceColor.needsUpdate = true;
  }
  function stepBits(dt) {
    let any = false;
    for (let i = 0; i < N; i++) {
      const b = P[i]; if (b.life <= 0) continue; any = true; b.life -= dt;
      b.v.y -= b.g * dt; b.v.multiplyScalar(1 - dt * .9); b.p.addScaledVector(b.v, dt); b.r.addScaledVector(b.w, dt);
      const floor = Y + .02; if (b.p.y < floor) { b.p.y = floor; b.v.set(0, 0, 0); b.w.set(0, 0, 0); b.r.x = PI / 2; }
      dummy.position.copy(b.p); dummy.rotation.set(b.r.x, b.r.y, b.r.z); dummy.scale.setScalar(b.life > 0 ? b.s * Math.min(1, b.life * 4) : 0); dummy.updateMatrix(); bits.setMatrixAt(i, dummy.matrix);
    }
    if (any) bits.instanceMatrix.needsUpdate = true;
  }

  // ------------------------------------------------------------ pointer: tap things, drag parts, drag a page, drag the table
  const ray = new T.Raycaster(), ndc = new T.Vector2(), plane = new T.Plane(), hitPoint = new T.Vector3(), camDir = new T.Vector3(), upY = new T.Vector3(0, 1, 0);
  let pickables = () => [], onTap = () => {}, onHover = () => {}, onPage = () => {}, onGrab = () => -1, onDrop = () => {}, down = null, hover = null, orbiting = false;
  function shown(o) { for (let a = o; a; a = a.parent) if (!a.visible) return false; return true; }
  function setRay(ev) { const r = canvas.getBoundingClientRect(); ndc.set((ev.clientX - r.left) / r.width * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); return r; }
  function pick(ev) {
    setRay(ev);
    const list = pickables().filter((p) => shown(p.node)); if (!list.length) return null;
    const hits = ray.intersectObjects(list.map((p) => p.node), true);
    for (const h of hits) { if (!shown(h.object)) continue; for (let a = h.object; a; a = a.parent) { const p = list.find((q) => q.node === a); if (p) return { ...p, point: h.point.clone() }; } }
    return null;
  }
  /** which page the pointer is holding by its outer part: 1 = right page (turns to the next spread), -1 = left page, 0 = neither */
  function edgeAt(ev) { setRay(ev); plane.set(upY, -(Y + .1)); const p = ray.ray.intersectPlane(plane, hitPoint); if (!p || Math.abs(p.z) > D / 2 + .3) return 0; return p.x > W - 2.2 && p.x < W + .6 ? 1 : p.x < -W + 2.2 && p.x > -W - .6 ? -1 : 0; }
  function dragInfo(ev, d) { const r = setRay(ev), p = ray.ray.intersectPlane(plane, hitPoint); return { x: ev.clientX - r.left, y: ev.clientY - r.top, dx: ev.clientX - d.x, dy: ev.clientY - d.y, point: (p || d.hit.point).clone(), moved: d.moved }; }
  function letGo(ev) {
    const d = down; down = null; orbiting = false; canvas.style.cursor = 'grab'; if (!d) return null;
    if (d.drag) { plane.copy(d.plane); d.drag.end?.(dragInfo(ev, d)); return d; }
    if (d.grab && turn) { turn.held = false; turn.back = turn.t < .22; turn.dur = 1.5; }
    return d;
  }
  canvas.addEventListener('pointerdown', (ev) => {
    if (turn) return;
    const hit = pick(ev);
    down = { x: ev.clientX, y: ev.clientY, yaw: view.yaw, tilt: view.tilt, id: ev.pointerId, moved: false, hit, drag: hit && hit.drag ? hit.drag : null, edge: hit ? 0 : edgeAt(ev), grab: false };
    canvas.setPointerCapture(ev.pointerId);
    if (down.drag) {
      if (down.drag.plane === 'ground') plane.setFromNormalAndCoplanarPoint(upY, hit.point); else plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(camDir).negate(), hit.point);
      down.plane = plane.clone(); canvas.style.cursor = 'grabbing'; down.drag.start?.(dragInfo(ev, down));
    }
  });
  canvas.addEventListener('pointermove', (ev) => {
    const r = canvas.getBoundingClientRect(); view.px = (ev.clientX - r.left) / r.width * 2 - 1; view.py = (ev.clientY - r.top) / r.height * 2 - 1; view.mx = ev.clientX; view.my = ev.clientY; view.inside = true;
    if (down && down.drag) { if (Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > 5) down.moved = true; plane.copy(down.plane); down.drag.move?.(dragInfo(ev, down)); return; }
    if (down && down.grab) { if (turn) turn.t = clamp((ev.clientX - down.x) * -down.edge / (r.width * .42)) * .8; return; }
    if (down) {
      const dx = ev.clientX - down.x, dy = ev.clientY - down.y;
      if (!down.moved && Math.hypot(dx, dy) > 7) {
        down.moved = true;
        // a sideways pull that starts on the outer part of a page lifts that page; anything else turns the table
        if (down.edge && Math.abs(dx) > Math.abs(dy) * 1.1 && dx * -down.edge > 0) {
          const i = onGrab(down.edge);
          if (i >= 0 && spreads[i] && !turn) { turn = { ...setupTurn(i), dur: 1.5, held: true, resolve: (ok) => onDrop(ok, i) }; down.grab = true; canvas.style.cursor = 'grabbing'; return; }
        }
        orbiting = true; canvas.style.cursor = 'grabbing'; if (hover) { hover = null; onHover(null, ev); }
      }
      if (down.moved) { view.yaw = clamp(down.yaw - dx * .0045, -.75, .75); view.tilt = clamp(down.tilt + dy * .004, .16, 1.15); }
      return;
    }
    if (ev.pointerType === 'touch') return;
    const h = turn ? null : pick(ev); hover = h;
    canvas.style.cursor = h ? (h.drag ? 'grab' : 'pointer') : (!turn && edgeAt(ev)) ? 'ew-resize' : 'grab';
    onHover(h, ev);
  });
  canvas.addEventListener('pointerup', (ev) => {
    const d = letGo(ev); if (!d || d.grab) return;
    if (d.drag) { if (!d.moved && !turn) onTap(d.hit, ev); return; }
    if (!d.moved && !turn) { const h = pick(ev); if (h) onTap(h, ev); else if (d.edge) onPage(d.edge); else onTap(null, ev); }
  });
  canvas.addEventListener('pointercancel', (ev) => { letGo(ev); });
  canvas.addEventListener('pointerleave', () => { view.inside = false; view.px = view.py = 0; if (hover) { hover = null; onHover(null, null); } });
  canvas.addEventListener('wheel', (ev) => { ev.preventDefault(); view.zoom = clamp(view.zoom * (ev.deltaY > 0 ? .94 : 1.06), .72, 1.7); }, { passive: false });
  canvas.style.cursor = 'grab';

  // ------------------------------------------------------------ frame loop
  let last = performance.now(), running = true, clock = 0, paused = false;
  function frame(now) {
    requestAnimationFrame(frame); if (!running || paused) { last = now; return; }
    step(Math.min(.05, Math.max(0, (now - last) / 1000))); last = now;
  }
  function step(dt) {
    clock += dt;
    if (turn) stepTurn(dt);
    for (const f of [...ticks]) f(dt, clock);
    stepBits(dt);
    view.focus += (view.focusTo - view.focus) * (1 - Math.exp(-dt * 2.2));
    const e = 1 - Math.exp(-dt * 5), sway = view.inside && !orbiting && !still.matches; view.sx += ((sway ? view.px : 0) - view.sx) * e; view.sy += ((sway ? view.py : 0) - view.sy) * e;
    place(); renderer.render(scene, camera);
    for (const f of frames) f(dt, clock);
  }
  document.addEventListener('visibilitychange', () => { running = !document.hidden; last = performance.now(); });
  resize(); requestAnimationFrame(frame);

  const v3 = new T.Vector3();
  return {
    T, scene, camera, renderer, view, spreads, register, show, rise, fold, turnTo, burst, setLift, still,
    get current() { return cur; }, get turning() { return Boolean(turn); }, get clock() { return clock; },
    tick(f) { ticks.add(f); return () => ticks.delete(f); }, afterFrame(f) { frames.add(f); },
    set pickables(f) { pickables = f; }, set onTap(f) { onTap = f; }, set onHover(f) { onHover = f; }, set onPage(f) { onPage = f; }, set onGrab(f) { onGrab = f; }, set onDrop(f) { onDrop = f; },
    pause(v) { paused = v; last = performance.now(); },
    /** screen position of a world point */
    project(p) { v3.copy(p).project(camera); return { x: (v3.x * .5 + .5) * canvas.clientWidth, y: (.5 - v3.y * .5) * canvas.clientHeight, behind: v3.z > 1 }; },
    resetView() { const from = { yaw: view.yaw, tilt: view.tilt, zoom: view.zoom }; let t = 0; const f = (dt) => { t = Math.min(1, t + dt / .6); const e = EASE.inOut(t); view.yaw = lerp(from.yaw, view.home.yaw, e); view.tilt = lerp(from.tilt, view.home.tilt, e); view.zoom = lerp(from.zoom, 1, e); if (t >= 1) ticks.delete(f); }; ticks.add(f); },
    flatten(to, dur = .7) { return new Promise((res) => { const from = view.flat; let t = 0; const f = (dt) => { t = Math.min(1, t + dt / dur); view.flat = lerp(from, to, EASE.inOut(t)); if (t >= 1) { ticks.delete(f); res(); } }; ticks.add(f); }); },
    pointer() { return view; },
    /** run the book forward by hand (for checks and screenshots when the tab is throttled) */
    async advance(sec, h = 1 / 30) { for (let t = 0; t < sec; t += h) { step(h); for (let k = 0; k < 6; k++) await Promise.resolve(); } },
  };
}
