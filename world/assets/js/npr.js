// NPR pipeline: the scene is rendered into a small "drawing buffer" (shade, ascii-ness, accent, coverage)
// and a single composite pass turns it into graphite hatching on recycled paper, or typeset ASCII glyphs —
// the same pencil-sketch ↔ ASCII duality as the printed cover of 決策智慧 2026.
import * as THREE from '../vendor/three.module.min.js';

// accent codes written into the blue channel by materials (see mat.js)
export const ACCENT = { none: 0, lime: 0.15, pink: 0.3, teal: 0.45, iris: 0.6, red: 0.75, ink: 1.0 };
// style codes written into the green channel: pencil (a real person or thing), the 人 field (digital twins: any
// 0.7 < g < 0.9), typed glyphs (made by AI: g ≥ 0.9)
export const STYLE = { pencil: 0, twin: 0.8, type: 1 };

const GLYPHS = ' .,:;-+=itsnedD$#';

// ---- the 人 atlas: one slot per weight, light → bold, rasterised by the browser at the cell's device size so the
// glyph keeps its hinting at a 9 px cell (sampled 1:1, no mipmaps)
const HITO_WEIGHTS = [400, 500, 600, 700, 800, 900];
const HITO_WEB = 'Noto Sans TC';
// the system CJK fonts, named explicitly: while the web font is still loading, a canvas would otherwise draw with an
// interim fallback of its own, and that drawing would be what stays if the font never arrives
const HITO_SYSTEM = '"PingFang TC", "Microsoft JhengHei", "Heiti TC", "Noto Sans CJK TC", "Source Han Sans TC", sans-serif';
const webFontLoaded = (fonts) => {
  try { for (const f of fonts) if (f.family.replace(/["']/g, '') === HITO_WEB && f.status === 'loaded') return true; } catch (e) { /* not iterable */ }
  return false;
};

function drawHito(canvas, px, family) {
  const n = HITO_WEIGHTS.length;
  if (canvas.width !== px * n || canvas.height !== px) { canvas.width = px * n; canvas.height = px; }
  const g = canvas.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  // one size for every weight, set by the boldest ink box, leaving a gap so neighbouring cells do not touch
  const fit = px - Math.max(1, Math.round(px * 0.12));
  const box = (w, s) => {
    g.font = `${w} ${s}px ${family}`;
    const m = g.measureText('人');
    const L = m.actualBoundingBoxLeft || 0, R = m.actualBoundingBoxRight || s * 0.9;
    const A = m.actualBoundingBoxAscent || s * 0.8, D = m.actualBoundingBoxDescent || s * 0.08;
    return { L, A, w: L + R, h: A + D };
  };
  const ref = box(HITO_WEIGHTS[n - 1], 100);
  const size = (100 * fit) / Math.max(ref.w, ref.h, 1);
  HITO_WEIGHTS.forEach((w, i) => {
    const b = box(w, size);
    const x = Math.round(i * px + (px - b.w) / 2 + b.L);
    const y = Math.round((px - b.h) / 2 + b.A);
    g.fillText('人', x, y);
  });
}

function glyphAtlas() {
  const S = 64, chars = GLYPHS.split('');
  const c = document.createElement('canvas');
  c.width = S * chars.length; c.height = S;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `600 ${S * 0.86}px "IBM Plex Mono", "Courier New", Courier, monospace`;
  // measure ink coverage per glyph so the ramp is ordered by real density
  const cover = chars.map((ch, i) => {
    g.fillText(ch, i * S + S / 2, S * 0.54);
    const d = g.getImageData(i * S, 0, S, S).data;
    let s = 0;
    for (let k = 0; k < d.length; k += 4) s += d[k];
    return { ch, s };
  });
  cover.sort((a, b) => a.s - b.s);
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff';
  cover.forEach((o, i) => g.fillText(o.ch, i * S + S / 2, S * 0.54));
  const t = new THREE.CanvasTexture(c);
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.colorSpace = THREE.NoColorSpace;
  return { tex: t, n: chars.length };
}

const VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FRAG = /* glsl */`
precision highp float;
uniform sampler2D tG; uniform sampler2D tD; uniform sampler2D tAtlas; uniform sampler2D tPaper; uniform sampler2D tHito;
uniform float uNH; uniform float uHPx;
uniform vec2 uRes; uniform float uDpr; uniform float uTime; uniform float uNear; uniform float uFar;
uniform float uCell; uniform float uNG; uniform float uNight; uniform float uFogNear; uniform float uFogFar;
uniform vec2 uHatchOff; uniform float uBoil; uniform float uFade; uniform float uFocus; uniform float uDebug;
uniform mat4 uInvVP; uniform float uReveal;
uniform vec3 uPaper; uniform vec3 uInk; uniform vec3 uNPaper; uniform vec3 uNInk;
uniform vec3 uLime; uniform vec3 uPink; uniform vec3 uTeal; uniform vec3 uRed;
varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float linDepth(float d){ float z = d * 2.0 - 1.0; return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear)); }
// a dimmed sample stores shade' = mix(shade, 1, 0.82 dim) and b = -dim (mat.js): recover the shade it had before
float undim(vec4 s){ float k = 0.82 * clamp(-s.b, 0.0, 1.0); return (s.r - k) / (1.0 - k); }
// the shade to draw with. By day that is the stored one; at night the paper is dark (shade 0 draws nothing), so a
// dimmed sample goes toward 0 instead of toward 1: shade × (1 - 0.82 dim). Undimmed samples (b ≥ 0) are untouched.
float shadeOf(vec4 s){ return s.r - 0.82 * clamp(-s.b, 0.0, 1.0) * uNight; }
// the 人 band of the style channel (0.7 … 0.895; ≥ 0.895 is typed)
float twinBand(float st){ return step(0.7, st) * (1.0 - step(0.895, st)); }

// one family of pencil strokes, in device pixels
float hatch(vec2 p, float ang, float sp, float w, float seed){
  vec2 dir = vec2(cos(ang), sin(ang));
  vec2 nr = vec2(-dir.y, dir.x);
  float t = dot(p, nr), al = dot(p, dir);
  float wob = (noise(vec2(al * 0.018 + seed, t * 0.004)) - 0.5) * sp * 0.9;
  float tt = t + wob;
  float v = abs(fract(tt / sp) - 0.5) * sp;
  float line = 1.0 - smoothstep(w * 0.5, w * 0.5 + 0.9 * uDpr, v);
  float id = floor(tt / sp);
  float br = noise(vec2(al * (0.010 / uDpr) + id * 7.31, id * 1.73 + seed));
  return line * smoothstep(0.16, 0.34, br) * (0.72 + 0.28 * noise(vec2(al * 0.2, id)));
}

vec3 accentCol(float code, vec2 frag){
  float k = floor(code / 0.15 + 0.5);
  if (k < 0.5) return vec3(1.0);
  if (k < 1.5) return uLime;
  if (k < 2.5) return uPink;
  if (k < 3.5) return uTeal;
  if (k < 4.5) {
    float g = fract((frag.x * 0.6 + frag.y) / (uRes.x * 1.4) + uTime * 0.03);
    vec3 a = vec3(0.86, 0.66, 0.92), b = vec3(0.58, 0.72, 0.98), c = vec3(0.50, 0.88, 0.84);
    return g < 0.5 ? mix(a, b, g * 2.0) : mix(b, c, g * 2.0 - 1.0);
  }
  return uRed;
}

void main(){
  vec2 frag = gl_FragCoord.xy;
  vec2 px = 1.0 / uRes;
  float seed = floor(uTime * 5.0) * uBoil;

  // wobbling sample point gives hand-drawn outlines
  vec2 wob = (vec2(noise(frag * 0.03 / uDpr + seed), noise(frag * 0.03 / uDpr + seed + 17.0)) - 0.5) * 2.2 * uDpr;
  vec2 uv = (frag + wob) * px;
  vec4 g = texture2D(tG, uv);
  float cov = g.a;
  float shade = shadeOf(g);
  float sty = g.g;
  float d0 = linDepth(texture2D(tD, uv).r);

  // ---- outlines: depth + shade discontinuities (Sobel-ish cross)
  float e = 1.25 * uDpr;
  vec2 o1 = vec2(e, 0.0) * px, o2 = vec2(0.0, e) * px;
  float dA = linDepth(texture2D(tD, uv + o1).r), dB = linDepth(texture2D(tD, uv - o1).r);
  float dC = linDepth(texture2D(tD, uv + o2).r), dE = linDepth(texture2D(tD, uv - o2).r);
  vec4 gA = texture2D(tG, uv + o1), gB = texture2D(tG, uv - o1), gC = texture2D(tG, uv + o2), gE = texture2D(tG, uv - o2);
  float dd = (abs(dA + dB - 2.0 * d0) + abs(dC + dE - 2.0 * d0)) / max(d0, 0.001);
  float edgeD = smoothstep(0.012, 0.03, dd);
  // shade edges compare the undimmed shades, so a dimmed part keeps its creases (b = -dim, see mat.js)
  float sA = undim(gA), sB = undim(gB), sC = undim(gC), sE = undim(gE);
  float edgeS = smoothstep(0.22, 0.42, max(abs(sA - sB), abs(sC - sE)) * min(cov, 1.0));
  float edgeC = smoothstep(0.3, 0.7, max(abs(gA.a - gB.a), abs(gC.a - gE.a)));
  float styAvg = max(max(gA.g, gB.g), max(gC.g, gE.g));
  // typed and 人 surfaces carry no outlines, except a dimmed (b < 0) typed part, which keeps its contour.
  // The 人 band never gets one: a twin field is thousands of cell-sized particles, and outlining each of them would
  // turn a dimmed field into pencil boxes (pencil means "real"); a dimmed field goes faint through its density instead
  float dimK = clamp(-min(min(g.b, min(gA.b, gB.b)), min(gC.b, gE.b)) * 2.0, 0.0, 1.0);
  dimK *= 1.0 - max(max(twinBand(sty), max(twinBand(gA.g), twinBand(gB.g))), max(twinBand(gC.g), twinBand(gE.g)));
  float edge = max(max(edgeD, edgeS), edgeC) * (1.0 - smoothstep(0.35, 0.6, max(sty, styAvg)) * (1.0 - dimK));
  edge *= 0.55 + 0.45 * noise(frag * 0.09 / uDpr + seed);

  // ---- graphite hatching
  vec2 hp = frag - uHatchOff * uDpr;
  // day: graphite where it is dark; night (under the world): chalk where light falls
  float D = mix(clamp(1.0 - shade, 0.0, 1.0), clamp(shade * 0.95 - 0.12, 0.0, 1.0), uNight);
  float sp = 5.2 * uDpr;
  float w = mix(0.55, 1.7, D) * uDpr;
  // more paper: the first stroke family only starts at a real shadow
  float h1 = hatch(hp, 0.98, sp, w, 1.0) * smoothstep(0.17, 0.32, D);
  float h2 = hatch(hp, -0.42, sp * 1.05, w, 4.0) * smoothstep(0.44, 0.6, D);
  float h3 = hatch(hp, 0.18, sp * 0.82, w * 0.9, 9.0) * smoothstep(0.66, 0.8, D);
  float h4 = smoothstep(0.84, 0.97, D) * (0.78 + 0.22 * noise(frag * 0.7));
  float sketch = max(max(h1, h2), max(h3, h4)) * cov;

  // ---- ASCII: glyph chosen per cell from the cell-centre shade
  float cell = uCell * uDpr;
  vec2 cid = floor(frag / cell);
  vec2 cuv = fract(frag / cell);
  vec4 gc = texture2D(tG, (cid + 0.5) * cell * px);
  float gcs = shadeOf(gc);
  // never fully blank: even lit machine surfaces keep a sparse dot texture
  float gi = floor(clamp(0.1 + 0.9 * mix(1.0 - gcs, gcs, uNight), 0.0, 0.999) * uNG);
  float glyph = texture2D(tAtlas, vec2((gi + clamp(cuv.x, 0.04, 0.96)) / uNG, cuv.y)).r;
  // a dimmed cell (b < 0) keeps its glyphs, only quieter, so the contour carries the part
  float cellDim = 1.0 - 0.45 * clamp(-gc.b * 2.0, 0.0, 1.0);
  // the ASCII ramp is for typed surfaces only (g ≥ 0.9); 0.7 … 0.9 is the 人 band below
  float ascii = glyph * gc.a * step(0.895, gc.g) * cellDim;

  // ---- 人: the field of digital twins, one glyph per cell; ink density follows the shade (dark → bold, light → faint)
  float hb = twinBand(gc.g);
  float hd = clamp(mix(1.0 - gcs, gcs, uNight), 0.0, 1.0);
  float hw = floor(min(hd * 1.2, 0.999) * uNH);
  // one device pixel → one atlas texel (nearest), also when the cell is fractional (13.5 px at DPR 1.5): a cell of
  // 13 px crops the empty last column instead of resampling the glyph soft
  vec2 htc = clamp(floor(frag - cid * cell) + 0.5, vec2(0.5), vec2(uHPx - 0.5));
  float hg = texture2D(tHito, vec2((hw * uHPx + htc.x) / (uNH * uHPx), htc.y / uHPx)).r;
  float hito = hg * gc.a * hb * mix(0.36, 1.0, smoothstep(0.0, 0.62, hd)) * cellDim;

  float sk = 1.0 - smoothstep(0.35, 0.6, sty);
  float ink = max(max(sketch * sk, edge), max(ascii, hito));

  // solid ink code (b = 1): flat graphite fill, used for type-like marks
  float solid = step(0.9, g.b) * cov;
  ink = max(ink, solid * (0.86 + 0.14 * noise(frag * 0.5)));

  // ---- opening reveal: the drawing spreads outward from the people core, with a ragged pencil front
  float shownM = 1.0;
  if (uReveal < 1.0) {
    vec4 ndc = vec4(vUv * 2.0 - 1.0, texture2D(tD, vUv).r * 2.0 - 1.0, 1.0);
    vec4 wp = uInvVP * ndc; wp /= wp.w;
    float rr = length(wp.xz) + (noise(wp.xz * 0.22) - 0.5) * 14.0 + max(0.0, -wp.y) * 0.6;
    float front = uReveal * 150.0;
    float shown = 1.0 - smoothstep(front - 8.0, front, rr);
    float rim = smoothstep(front - 10.0, front - 2.0, rr) * shown;
    ink = mix(0.0, ink, shown) + rim * 0.35 * step(0.001, cov) * noise(frag * 0.6);
    cov *= shown;
    shownM = shown;
  }

  // ---- fog: far things fade back into the paper, like an unfinished drawing
  float fog = smoothstep(uFogNear, uFogFar, d0) * step(0.001, cov);
  ink *= 1.0 - fog;

  // ---- accent fills (overprinted like riso spot colours, slightly off-register from the graphite)
  vec4 gr = texture2D(tG, uv + vec2(1.6, -1.2) * uDpr * px);
  float code = gr.b * step(gr.b, 0.89);
  vec3 acc = accentCol(code, frag);
  float riso = 0.86 + 0.14 * noise(frag * 0.45 / uDpr);
  float accAmt = step(0.05, code) * gr.a * (1.0 - fog * 0.85) * riso * shownM;

  // ---- paper
  vec2 puv = frag / (1536.0 * uDpr * 0.9);
  vec3 ptex = texture2D(tPaper, puv).rgb;
  vec3 paper = uPaper * (0.94 + 0.12 * (ptex - 0.86));
  float vig = smoothstep(1.25, 0.25, length((vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0)));
  paper *= mix(0.9, 1.0, vig);
  vec3 npaper = uNPaper * (0.9 + 0.25 * (ptex.r - 0.86)) * mix(0.7, 1.0, vig);
  vec3 P = mix(paper, npaper, uNight);
  vec3 I = mix(uInk, uNInk, uNight);
  // day: spot colour overprinted (multiplied) on paper; night: multiplying dark paper would erase it, so it is laid on top
  vec3 col = mix(P * mix(vec3(1.0), acc, accAmt), mix(P, acc * 0.9, accAmt * 0.85), uNight);
  float grain = 0.82 + 0.18 * noise(frag * 0.9 / uDpr + seed * 3.0);
  col = mix(col, I, clamp(ink * grain, 0.0, 1.0));

  // focus fade (used when an overlay is open)
  col = mix(col, P, uFade);
  if (uDebug > 0.5) col = vec3(texture2D(tG, vUv).r * texture2D(tG, vUv).a);
  gl_FragColor = vec4(col, 1.0);
}`;

export class NPR {
  constructor(renderer) {
    this.r = renderer;
    this.dpr = 1;
    const depth = new THREE.DepthTexture(4, 4);
    depth.type = THREE.UnsignedIntType;
    this.gbuf = new THREE.WebGLRenderTarget(4, 4, {
      type: THREE.HalfFloatType, format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
      depthBuffer: true, depthTexture: depth,
    });
    const atlas = glyphAtlas();
    // resolved against this module, not the page, so lab pages under world/_lab/ get the same paper
    const paper = new THREE.TextureLoader().load(new URL('../img/art/paper.webp', import.meta.url).href);
    paper.wrapS = paper.wrapT = THREE.MirroredRepeatWrapping;
    paper.colorSpace = THREE.NoColorSpace;
    // the 人 atlas starts in the system CJK font (or the web font, if the page already loaded it) and is redrawn when
    // the self-hosted one arrives
    this.hito = { canvas: document.createElement('canvas'), px: 9, tex: null, font: 'pending' };
    this.u = {
      tHito: { value: null }, uNH: { value: HITO_WEIGHTS.length }, uHPx: { value: 9 },
      tG: { value: this.gbuf.texture }, tD: { value: depth }, tAtlas: { value: atlas.tex }, tPaper: { value: paper },
      uRes: { value: new THREE.Vector2(4, 4) }, uDpr: { value: 1 }, uTime: { value: 0 },
      uNear: { value: 1 }, uFar: { value: 1000 }, uCell: { value: 9 }, uNG: { value: atlas.n },
      uNight: { value: 0 }, uFogNear: { value: 260 }, uFogFar: { value: 520 },
      uHatchOff: { value: new THREE.Vector2() }, uBoil: { value: 1 }, uFade: { value: 0 }, uFocus: { value: 0 }, uDebug: { value: 0 },
      uInvVP: { value: new THREE.Matrix4() }, uReveal: { value: 1 },
      uPaper: { value: new THREE.Color('#ebe6dc') }, uInk: { value: new THREE.Color('#262423') },
      uNPaper: { value: new THREE.Color('#1d1c1b') }, uNInk: { value: new THREE.Color('#ece7de') },
      uLime: { value: new THREE.Color('#cfe06b') }, uPink: { value: new THREE.Color('#f4b9b3') },
      uTeal: { value: new THREE.Color('#86d3e8') }, uRed: { value: new THREE.Color('#ef6b54') },
    };
    for (const k of ['uPaper', 'uInk', 'uNPaper', 'uNInk', 'uLime', 'uPink', 'uTeal', 'uRed']) {
      // Color() stores linear values; the composite writes raw values to the sRGB canvas
      const c = this.u[k].value; c.convertLinearToSRGB();
    }
    this.mat = new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    this.quad = new THREE.Mesh(geo, this.mat);
    this.quad.frustumCulled = false;
    this.qscene = new THREE.Scene();
    this.qscene.add(this.quad);
    this.qcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this._v = new THREE.Vector3();
    this._hitoDraw(9);
    this.hitoReady = this._hitoFont();
  }

  /** (re)draw the 人 atlas for a cell of `px` device pixels; a new size gets a new texture */
  _hitoDraw(px = this.hito.px) {
    const H = this.hito;
    drawHito(H.canvas, px, H.font === HITO_WEB ? `"${HITO_WEB}", ${HITO_SYSTEM}` : HITO_SYSTEM);
    if (!H.tex || H.px !== px) {
      if (H.tex) H.tex.dispose();
      const t = new THREE.CanvasTexture(H.canvas);
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
      t.colorSpace = THREE.NoColorSpace;
      H.tex = t;
      this.u.tHito.value = t;
    }
    H.tex.needsUpdate = true;
    H.px = px;
    this.u.uHPx.value = px;
  }

  /** wait up to 1.5 s for the self-hosted Noto Sans TC, then go on with the system CJK font; redraw whenever it lands */
  _hitoFont() {
    const H = this.hito;
    const fonts = typeof document !== 'undefined' && document.fonts;
    if (!fonts || !fonts.load) { H.font = 'system'; return Promise.resolve(H.font); }
    const use = () => { if (H.font !== HITO_WEB) { H.font = HITO_WEB; this._hitoDraw(); } return true; };
    // already loaded (the page's own text pulled it in): draw with it now, no system-font frame first
    if (webFontLoaded(fonts)) { use(); return Promise.resolve(H.font); }
    const arrive = fonts.load(`600 64px "${HITO_WEB}"`, '人').then((f) => f.length > 0 && use(), () => false);
    const late = new Promise((r) => setTimeout(() => r(false), 1500));
    return Promise.race([arrive, late]).then((ok) => { if (!ok && H.font === 'pending') H.font = 'system'; return H.font; });
  }

  setSize(w, h, dpr) {
    this.dpr = dpr;
    const W = Math.floor(w * dpr), H = Math.floor(h * dpr);
    this.gbuf.setSize(W, H);
    this.u.uRes.value.set(W, H);
    this.u.uDpr.value = dpr;
    this._hitoFit();
  }

  /** the 人 atlas is drawn at the cell's device size: redraw it when the DPR or the cell size changed */
  _hitoFit() {
    const px = Math.max(6, Math.round(this.u.uCell.value * this.dpr));
    if (px !== this.hito.px) this._hitoDraw(px);
  }

  render(scene, camera, t) {
    const u = this.u;
    this._hitoFit();
    u.uTime.value = t;
    u.uNear.value = camera.near; u.uFar.value = camera.far;
    if (u.uReveal.value < 1) u.uInvVP.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).invert();
    // anchor the hatch pattern to the world origin so panning drags the strokes along
    this._v.set(0, 0, 0).project(camera);
    u.uHatchOff.value.set((this._v.x * 0.5 + 0.5) * u.uRes.value.x / this.dpr, (this._v.y * 0.5 + 0.5) * u.uRes.value.y / this.dpr);
    const r = this.r;
    r.setRenderTarget(this.gbuf);
    r.setClearColor(0x000000, 0);
    r.clear(true, true, true);
    r.render(scene, camera);
    r.setRenderTarget(null);
    r.render(this.qscene, this.qcam);
  }
}
