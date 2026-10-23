// NPR pipeline: the scene is rendered into a small "drawing buffer" (shade, ascii-ness, accent, coverage)
// and a single composite pass turns it into graphite hatching on recycled paper, or typeset ASCII glyphs —
// the same pencil-sketch ↔ ASCII duality as the printed cover of 決策智慧 2026.
import * as THREE from '../vendor/three.module.min.js';
import { LOOK, LOOK_DEF, LOOK_U, P as PAINT, PAL_W, paletteTexture, OVERLAY, NPR_U } from './look.js';
import { REVEAL } from './mappose.js';

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
uniform mat4 uInvVP; uniform float uReveal; uniform vec2 uRevealO;
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
// dimmed sample goes toward 0 instead of toward 1: shade x (1 - 0.82 dim). Undimmed samples (b >= 0) are untouched.
float shadeOf(vec4 s){ return s.r - 0.82 * clamp(-s.b, 0.0, 1.0) * uNight; }
// the hito band of the style channel (0.7 ... 0.895; >= 0.895 is typed)
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
  // typed and hito surfaces carry no outlines, except a dimmed (b < 0) typed part, which keeps its contour.
  // The hito band never gets one: a twin field is thousands of cell-sized particles, and outlining each of them would
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
  // the ASCII ramp is for typed surfaces only (g >= 0.9); 0.7 ... 0.9 is the hito band below
  float ascii = glyph * gc.a * step(0.895, gc.g) * cellDim;

  // ---- hito: the field of digital twins, one glyph per cell; ink density follows the shade (dark -> bold, light -> faint)
  float hb = twinBand(gc.g);
  float hd = clamp(mix(1.0 - gcs, gcs, uNight), 0.0, 1.0);
  float hw = floor(min(hd * 1.2, 0.999) * uNH);
  // one device pixel -> one atlas texel (nearest), also when the cell is fractional (13.5 px at DPR 1.5): a cell of
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
    float rr = length(wp.xz - uRevealO) + (noise(wp.xz * 0.22) - 0.5) * 14.0 + max(0.0, -wp.y) * 0.6;
    float front = ${REVEAL.r0.toFixed(1)} + uReveal * ${REVEAL.span.toFixed(1)};
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

// ---------------------------------------------------------------------------------------------------------------
// ?look (look.js): the same drawing, with the world's own colour.  The drawing buffer's alpha carries a paint slot
// (1 + slot / 16; ≤ 1 = coverage only).  Unpainted pixels (the book's drawings: districts, flows) are drawn exactly as
// above; painted ones (ground, sea, the world's own scenery) take the look's colour and light:
//   a  printed: the slot's spot colour multiplied into the paper, a hair off the pencil line, shadows as a halftone
//      screen of the same ink; area borders drawn as thin lines (the coast, field edges, roofs)
//   b  diorama: gouache colour in warm key / cool fill light, thin outlines in a darker tone of the colour; a backdrop
//      instead of loose paper; depth of field in a post pass
//   c  dusk: colour in a low warm light and violet shade under a dusk sky; emissive slots (windows, lamps, the sea's
//      type) glow through a post pass
const FRAG_LOOK = /* glsl */`
precision highp float;
uniform sampler2D tG; uniform sampler2D tD; uniform sampler2D tAtlas; uniform sampler2D tPaper; uniform sampler2D tHito; uniform sampler2D tPal;
uniform float uNH; uniform float uHPx;
uniform vec2 uRes; uniform float uDpr; uniform float uTime; uniform float uNear; uniform float uFar;
uniform float uCell; uniform float uNG; uniform float uNight; uniform float uFogNear; uniform float uFogFar;
uniform vec2 uHatchOff; uniform float uBoil; uniform float uFade; uniform float uFocus; uniform float uDebug;
uniform mat4 uInvVP; uniform float uReveal; uniform vec2 uRevealO;
uniform vec3 uPaper; uniform vec3 uInk; uniform vec3 uNPaper; uniform vec3 uNInk;
uniform vec3 uLime; uniform vec3 uPink; uniform vec3 uTeal; uniform vec3 uRed;
uniform vec3 uBgTop; uniform vec3 uBgMid; uniform vec3 uBgBot; uniform vec3 uObjPaper; uniform vec3 uLineInk; uniform vec3 uKey; uniform vec3 uFill;
uniform float uCalm; uniform vec3 uFocusW; uniform float uFocusRW; uniform vec3 uTypeInk;
varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float linDepth(float d){ float z = d * 2.0 - 1.0; return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear)); }
float undim(vec4 s){ float k = 0.82 * clamp(-s.b, 0.0, 1.0); return (s.r - k) / (1.0 - k); }
float shadeOf(vec4 s){ return s.r - 0.82 * clamp(-s.b, 0.0, 1.0) * uNight; }
float twinBand(float st){ return step(0.7, st) * (1.0 - step(0.895, st)); }
// coverage and paint from the alpha channel
float covOf(float a){ return step(0.5, a); }
float paintOf(float a){ return a > 1.02 ? (a - 1.0) * 16.0 : 0.0; }
vec4 pal(float pn){ return texture2D(tPal, vec2((pn + 0.5) / ${PAL_W.toFixed(1)}, 0.25)); }
float famOf(float pn){ return texture2D(tPal, vec2((floor(pn + 0.5) + 0.5) / ${PAL_W.toFixed(1)}, 0.75)).r * 255.0; }
// slots 80 ... 127 (look a): a district's own spot fill - the pixel is the book's drawing, printed over that fill
float figOf(float pn){ return step(79.5, pn); }
// (kind 5 of each zone's fills, look.js FIG: the town square's far-seen people, drawn with a lighter pencil)
float crowdOf(float pn){ return step(79.5, pn) * (1.0 - step(0.5, abs(mod(pn - 80.0, 16.0) - 5.0))); }

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
// a halftone screen at 45 deg: v = ink coverage 0 ... 1, period in device px
float halftone(vec2 p, float v, float period){
  vec2 q = vec2(p.x + p.y, p.x - p.y) * 0.70710678 / period;
  float d = length(fract(q) - 0.5);
  float r = sqrt(clamp(v, 0.0, 1.0)) * 0.6;
  float aa = 0.8 / period;
  return (1.0 - smoothstep(r - aa, r + aa, d)) * step(0.02, v);
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

// the look's background: a: the paper; b: a soft studio backdrop; c: a dusk sky with a few stars
vec3 backdrop(vec2 frag, vec3 paper){
#if defined(LOOK_B)
  vec3 b = mix(uBgBot, uBgTop, smoothstep(0.0, 1.0, vUv.y));
  return b * (paper / max(uPaper, vec3(0.01)));
#elif defined(LOOK_C)
  float y = vUv.y;
  vec3 s = y < 0.5 ? mix(uBgBot, uBgMid, smoothstep(0.0, 0.5, y)) : mix(uBgMid, uBgTop, smoothstep(0.5, 1.0, y));
  vec2 sc = floor(frag / (3.0 * uDpr));
  float star = step(0.9965, hash(sc)) * smoothstep(0.6, 0.95, y) * (0.55 + 0.45 * sin(uTime * 1.3 + hash(sc + 3.1) * 30.0));
  return s + star * 0.55;
#else
  return paper;
#endif
}

void main(){
  vec2 frag = gl_FragCoord.xy;
  vec2 px = 1.0 / uRes;
  float seed = floor(uTime * 5.0) * uBoil;
  vec2 wob = (vec2(noise(frag * 0.03 / uDpr + seed), noise(frag * 0.03 / uDpr + seed + 17.0)) - 0.5) * 2.2 * uDpr;
  vec2 uv = (frag + wob) * px;
  vec4 g = texture2D(tG, uv);
  float cov = covOf(g.a);
  float pn = paintOf(g.a);
  float isFig = figOf(pn);
  float shade = shadeOf(g);
  float sty = g.g;
  float d0 = linDepth(texture2D(tD, uv).r);

  // ---- outlines (as the default), coverage taken from the alpha's coverage part
  float e = 1.25 * uDpr;
  vec2 o1 = vec2(e, 0.0) * px, o2 = vec2(0.0, e) * px;
  float dA = linDepth(texture2D(tD, uv + o1).r), dB = linDepth(texture2D(tD, uv - o1).r);
  float dC = linDepth(texture2D(tD, uv + o2).r), dE = linDepth(texture2D(tD, uv - o2).r);
  vec4 gA = texture2D(tG, uv + o1), gB = texture2D(tG, uv - o1), gC = texture2D(tG, uv + o2), gE = texture2D(tG, uv - o2);
  float dd = (abs(dA + dB - 2.0 * d0) + abs(dC + dE - 2.0 * d0)) / max(d0, 0.001);
  float edgeD = smoothstep(0.012, 0.03, dd);
  float sA = undim(gA), sB = undim(gB), sC = undim(gC), sE = undim(gE);
  float edgeS = smoothstep(0.22, 0.42, max(abs(sA - sB), abs(sC - sE)) * cov);
  float edgeC = smoothstep(0.3, 0.7, max(abs(covOf(gA.a) - covOf(gB.a)), abs(covOf(gC.a) - covOf(gE.a))));
  float styAvg = max(max(gA.g, gB.g), max(gC.g, gE.g));
  float dimK = clamp(-min(min(g.b, min(gA.b, gB.b)), min(gC.b, gE.b)) * 2.0, 0.0, 1.0);
  dimK *= 1.0 - max(max(twinBand(sty), max(twinBand(gA.g), twinBand(gB.g))), max(twinBand(gC.g), twinBand(gE.g)));
  float edge = max(max(edgeD, edgeS), edgeC) * (1.0 - smoothstep(0.35, 0.6, max(sty, styAvg)) * (1.0 - dimK));
#if defined(LOOK_A)
  // a district's pencil line is the map's firmest line (the setting's is lighter and in its own colour, below)
  float pnMax = max(max(paintOf(gA.a), paintOf(gB.a)), max(paintOf(gC.a), paintOf(gE.a)));
  edge *= mix(0.55 + 0.45 * noise(frag * 0.09 / uDpr + seed), 0.8 + 0.2 * noise(frag * 0.09 / uDpr + seed), step(79.5, max(pn, pnMax)));
  // (the town square's far-seen people: a lighter line, in a warm brown -- below -- so their tint carries them)
  float crowdK = max(crowdOf(pn), max(max(crowdOf(paintOf(gA.a)), crowdOf(paintOf(gB.a))), max(crowdOf(paintOf(gC.a)), crowdOf(paintOf(gE.a))))) * (1.0 - uCalm);
  edge *= 1.0 - 0.45 * crowdK;
#else
  edge *= 0.55 + 0.45 * noise(frag * 0.09 / uDpr + seed);
#endif
  // painted areas meeting (coast, field edges, roofs on walls): the printed map's thin area border
  float pA = paintOf(gA.a), pB = paintOf(gB.a), pC = paintOf(gC.a), pE = paintOf(gE.a);
  float pMin = min(min(pA, pB), min(pC, pE));
  float pEdge = 0.0;
#if defined(LOOK_A)
  // (where families of area meet: the coast, the chart's depth bands, fields, roads; not inside one family)
  // (only between areas of the setting: a district's fills and the slots that carry their own edge - the stages, their
  // rims, the zone names: family 250 - are never bordered)
  float pMax = max(max(pA, pB), max(pC, pE));
  if (pMin > 0.5 && pn > 0.5 && pn < 79.5 && pMax < 79.5) {
    float fA = famOf(pA), fB = famOf(pB), fC = famOf(pC), fE = famOf(pE);
    pEdge = step(0.5, max(abs(fA - fB), abs(fC - fE))) * (1.0 - step(249.5, max(max(fA, fB), max(fC, fE))));
  }
#endif

  // ---- graphite hatching
  vec2 hp = frag - uHatchOff * uDpr;
  float D = mix(clamp(1.0 - shade, 0.0, 1.0), clamp(shade * 0.95 - 0.12, 0.0, 1.0), uNight);
  float sp = 5.2 * uDpr;
  float w = mix(0.55, 1.7, D) * uDpr;
  float h1 = hatch(hp, 0.98, sp, w, 1.0) * smoothstep(0.17, 0.32, D);
  float h2 = hatch(hp, -0.42, sp * 1.05, w, 4.0) * smoothstep(0.44, 0.6, D);
  float h3 = hatch(hp, 0.18, sp * 0.82, w * 0.9, 9.0) * smoothstep(0.66, 0.8, D);
  float h4 = smoothstep(0.84, 0.97, D) * (0.78 + 0.22 * noise(frag * 0.7));
  float sketch = max(max(h1, h2), max(h3, h4)) * cov;

  // ---- ASCII
  float cell = uCell * uDpr;
  vec2 cid = floor(frag / cell);
  vec2 cuv = fract(frag / cell);
  vec4 gc = texture2D(tG, (cid + 0.5) * cell * px);
  float gcs = shadeOf(gc);
  float gi = floor(clamp(0.1 + 0.9 * mix(1.0 - gcs, gcs, uNight), 0.0, 0.999) * uNG);
  float glyph = texture2D(tAtlas, vec2((gi + clamp(cuv.x, 0.04, 0.96)) / uNG, cuv.y)).r;
  float cellDim = 1.0 - 0.45 * clamp(-gc.b * 2.0, 0.0, 1.0);
  float ascii = glyph * covOf(gc.a) * step(0.895, gc.g) * cellDim;
  // (the setting's own type - the sea - is drawn by the look below; a district's typed part stays the book's)
  float cellPaint = step(0.5, paintOf(gc.a)) * (1.0 - figOf(paintOf(gc.a)));

  // ---- hito
  float hb = twinBand(gc.g);
  float hd = clamp(mix(1.0 - gcs, gcs, uNight), 0.0, 1.0);
  float hw = floor(min(hd * 1.2, 0.999) * uNH);
  vec2 htc = clamp(floor(frag - cid * cell) + 0.5, vec2(0.5), vec2(uHPx - 0.5));
  float hg = texture2D(tHito, vec2((hw * uHPx + htc.x) / (uNH * uHPx), htc.y / uHPx)).r;
  float hito = hg * covOf(gc.a) * hb * mix(0.36, 1.0, smoothstep(0.0, 0.62, hd)) * cellDim;

  float sk = 1.0 - smoothstep(0.35, 0.6, sty);
  float solid = step(0.9, g.b) * cov;
#if defined(LOOK_A)
  // a district printed in its inks (fig slots): on the map its shadows are a screen of its own ink (below), and the
  // graphite hatching keeps only the deepest shade; in a district (uCalm) the book's hatching comes back in full
  sk *= mix(1.0, smoothstep(0.7, 0.9, D), isFig * (1.0 - uCalm));
  sk *= 1.0 - crowdK;
#endif
  // the book's drawing (unpainted pixels), exactly as the default composite
  float inkObj = max(max(sketch * sk, edge), max(ascii * (1.0 - cellPaint), hito));
  inkObj = max(inkObj, solid * (0.86 + 0.14 * noise(frag * 0.5)));

  // ---- the paper and the look's background
  vec2 puv = frag / (1536.0 * uDpr * 0.9);
  vec3 ptex = texture2D(tPaper, puv).rgb;
  vec3 paper = uPaper * (0.94 + 0.12 * (ptex - 0.86));
  float vig = smoothstep(1.25, 0.25, length((vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0)));
  paper *= mix(0.9, 1.0, vig);
  vec3 bg = backdrop(frag, paper);
#if defined(LOOK_C)
  vec3 objPaper = uObjPaper * (0.94 + 0.12 * (ptex - 0.86));
#elif defined(LOOK_B)
  // the book's drawing stands in the diorama's light like white card models: warm where lit, cool in its shade
  vec3 objPaper = paper * mix(mix(vec3(1.0), uFill, 0.4), mix(vec3(1.0), uKey, 0.45), smoothstep(0.1, 0.95, clamp(shade, 0.0, 1.0)));
#else
  vec3 objPaper = paper;
#endif

  // ---- the look's colour for painted pixels
  vec4 gr = texture2D(tG, uv + vec2(1.6, -1.2) * uDpr * px);
  float painted = step(0.5, pn) * (1.0 - isFig) * cov;
  float isType = step(0.895, sty);
#if defined(LOOK_A)
  // the fill is printed a hair off the pencil line (the same off-register as the accents)
  float pGr = paintOf(gr.a);
  float pnF = (pGr > 0.5 && pGr < 79.5) ? pGr : pn;
#else
  float pnF = pn;
#endif
  vec4 pc = pal(pnF);
  vec3 alb = pc.rgb;
#if defined(LOOK_A)
  // a stage's rim (slots 62 ... 64) is a crisp line in its zone's ink, drawn per pixel: where it meets its neighbours
  // their colours are averaged over this pixel and the four round it, so the rim reads smooth, not stepped
  {
    float rA = step(61.5, pA) * step(pA, 64.5), rB = step(61.5, pB) * step(pB, 64.5), rC = step(61.5, pC) * step(pC, 64.5), rE = step(61.5, pE) * step(pE, 64.5);
    float rO = step(61.5, pnF) * step(pnF, 64.5);
    if (rA + rB + rC + rE + rO > 0.5) {
      float wA = step(0.5, pA) * step(pA, 79.5), wB = step(0.5, pB) * step(pB, 79.5), wC = step(0.5, pC) * step(pC, 79.5), wE = step(0.5, pE) * step(pE, 79.5);
      vec3 sum = alb * 2.0 + pal(pA).rgb * wA + pal(pB).rgb * wB + pal(pC).rgb * wC + pal(pE).rgb * wE;
      alb = sum / (2.0 + wA + wB + wC + wE);
    }
  }
#endif
  float emi = pc.a;
  float Ls = clamp(shade, 0.0, 1.0);
  // the sea's shade is its streams, not light: it stays bright, a little rippled by them
  float Lw = mix(Ls, 0.82 + 0.18 * (Ls - 0.6), isType);
  vec3 lookCol;
#if defined(LOOK_A)
  float dark = clamp((0.93 - Lw) / 0.78, 0.0, 1.0);
  vec3 fill = paper * mix(vec3(1.0), alb, 0.94);
  // the setting's shading is a light screen (figure and ground: the districts carry the darks), and the sea's lighter
  // still (at map scale its dots were the busiest texture on the sheet)
  float ht = halftone(hp, dark * mix(0.62, 0.34, isType), 3.4 * uDpr);
  lookCol = mix(fill, fill * mix(vec3(1.0), alb, 0.95) * 0.9, ht);
  lookCol *= 0.975 + 0.05 * noise(frag * 0.3 / uDpr);
#elif defined(LOOK_B)
  float l = smoothstep(0.04, 1.0, Lw);
  lookCol = alb * mix(uFill, uKey, l) + alb * emi * 0.3;
#else
  float l = smoothstep(0.08, 1.0, Lw);
  lookCol = alb * mix(uFill, uKey, l * l) + alb * emi * 1.15;
#endif
  // the sea: its type printed / glinting / glowing on the water
  float glow = emi * painted;
  if (isType > 0.5 && painted > 0.5) {
    vec4 gp = pal(${PAINT.glyph.toFixed(1)});
    // only the denser streams of the current show their type, in lighter glyphs than the default's; slack water is clear
    float giP = floor(clamp(0.04 + 0.6 * (1.0 - gcs), 0.0, 0.999) * uNG);
    float glyphP = texture2D(tAtlas, vec2((giP + clamp(cuv.x, 0.04, 0.96)) / uNG, cuv.y)).r;
    float stream = glyphP * covOf(gc.a) * step(0.895, gc.g) * smoothstep(0.3, 0.56, 1.0 - gcs);
#if defined(LOOK_A)
    lookCol = mix(lookCol, gp.rgb * mix(vec3(1.0), paper, 0.25), stream * 0.62);
#elif defined(LOOK_B)
    lookCol = mix(lookCol, gp.rgb, stream * 0.42);
#else
    lookCol = mix(lookCol, gp.rgb, stream * 0.75);
    glow = max(glow, stream * gp.a * 0.45);
#endif
  }

  // in a district the world's own colour steps back, so the district's drawing leads (by subtraction, as dim())
#if defined(LOOK_C)
  // dusk: the world around steps back into the dark, and the district's own ground is lit like a stage (a pool of
  // lamplight where the camera's focus is), so its pencil and type read as on paper
  float pool = 0.0;
  if (uCalm > 0.001) {
    vec4 ndcW = vec4(vUv * 2.0 - 1.0, texture2D(tD, vUv).r * 2.0 - 1.0, 1.0);
    vec4 wpW = uInvVP * ndcW; wpW /= wpW.w;
    float fr = clamp(uFocusRW, 8.0, 400.0);
    pool = (1.0 - smoothstep(fr * 0.9, fr * 1.9, length(wpW.xz - uFocusW.xz))) * uCalm;
  }
  vec3 lamp = mix(objPaper * 0.8, alb * 2.2, 0.3) * (0.84 + 0.16 * l);
  lookCol = mix(lookCol * (1.0 - 0.18 * uCalm), lamp, pool * 0.88);
  glow *= 1.0 - 0.45 * uCalm;
#else
  lookCol = mix(lookCol, paper, 0.4 * uCalm);
#endif
  // graphite over painted pixels: a keeps its pencil outlines and the hatching of real shadow; b and c only thin lines
#if defined(LOOK_A)
  // the setting's linework is drawn lighter than the districts' (and in its own colour, below)
  float inkPaint = max(edge * 0.58, sketch * sk * smoothstep(0.62, 0.86, D) * 0.45);
  inkPaint = max(inkPaint, pEdge * 0.4 * (0.7 + 0.3 * noise(frag * 0.2 / uDpr)));
#elif defined(LOOK_B)
  float inkPaint = edge * 0.5;
#else
  float inkPaint = edge * 0.6;
#endif
  float ink = mix(inkObj, inkPaint, painted);

  // ---- opening reveal
  float shownM = 1.0;
  if (uReveal < 1.0) {
    vec4 ndc = vec4(vUv * 2.0 - 1.0, texture2D(tD, vUv).r * 2.0 - 1.0, 1.0);
    vec4 wp = uInvVP * ndc; wp /= wp.w;
    float rr = length(wp.xz - uRevealO) + (noise(wp.xz * 0.22) - 0.5) * 14.0 + max(0.0, -wp.y) * 0.6;
    float front = ${REVEAL.r0.toFixed(1)} + uReveal * ${REVEAL.span.toFixed(1)};
    float shown = 1.0 - smoothstep(front - 8.0, front, rr);
    float rim = smoothstep(front - 10.0, front - 2.0, rr) * shown;
    ink = mix(0.0, ink, shown) + rim * 0.35 * step(0.001, cov) * noise(frag * 0.6);
    cov *= shown;
    shownM = shown;
  }
  float fog = smoothstep(uFogNear, uFogFar, d0) * step(0.001, cov);
  ink *= 1.0 - fog;

  // ---- accents (riso spot colours), as the default
  float code = gr.b * step(gr.b, 0.89);
  vec3 acc = accentCol(code, frag);
  float riso = 0.86 + 0.14 * noise(frag * 0.45 / uDpr);
  float accAmt = step(0.05, code) * covOf(gr.a) * (1.0 - fog * 0.85) * riso * shownM;

  vec3 base = mix(objPaper, lookCol, painted);
  base = mix(bg, base, cov * shownM);
  base = mix(base, bg, fog * (0.6 + 0.4 * painted));
#if defined(LOOK_C)
  base = mix(base * mix(vec3(1.0), acc, accAmt), mix(base, acc, accAmt * 0.9), painted);
  vec3 lineCol = mix(uInk, uLineInk, painted);
#elif defined(LOOK_B)
  base = base * mix(vec3(1.0), acc, accAmt);
  vec3 lineCol = mix(uInk, base * 0.42, painted);
#else
  // ---- the districts' own spot fills (slots 80 ... 127), printed under the pencil line and a hair off it (the
  // offset sample, like the accents).  Not under what AI makes (type, hito: the book's rule - it stays type on paper),
  // not under solid ink, not where an accent prints; a dimmed part loses its fill with its shade (dim by subtraction).
  // On the map a district's shade is a screen of its own ink (its form in colour, where the setting's is pale); in a
  // district (uCalm) the fills step back to a light tint and the book's pencil hatching carries the shade, so the
  // story's accents lead
  float pf = paintOf(gr.a);
  float figAmt = figOf(pf) * isFig * covOf(gr.a) * shownM * (1.0 - fog);
  figAmt *= 1.0 - step(0.7, gr.g);
  figAmt *= 1.0 - step(0.9, gr.b);
  figAmt *= 1.0 - step(0.05, code);
  figAmt *= 1.0 - smoothstep(0.2, 0.62, -gr.b);
  figAmt *= 1.0 - 0.62 * uCalm;
  vec3 figInk = pal(pf).rgb;
  // its form in the ink's own values, as a two-hit print: faces in full light take a lighter tint of the ink, faces
  // turned from the sun the full ink, and its shadow a second hit of the same ink as a screen (ink x ink: deeper and
  // richer, never grey).  In a district the fill is a flat light tint and the pencil carries the form
  float litF = smoothstep(0.66, 0.97, shade) * (1.0 - uCalm);
  vec3 tintF = mix(figInk, mix(vec3(1.0), figInk, 0.72), litF);
  float htF = halftone(hp, clamp((0.8 - shade) / 0.5, 0.0, 1.0) * 0.9, 3.0 * uDpr) * (1.0 - uCalm);
  base = mix(base, base * tintF * mix(vec3(1.0), figInk * 0.94, htF), figAmt * (0.96 + 0.04 * riso));
  base = base * mix(vec3(1.0), acc, accAmt);
  // the setting's lines in a lighter tone of their own colour (not graphite): the black line is the districts'
  vec3 tone = base * vec3(0.6, 0.59, 0.6);
  vec3 lineCol = mix(uInk, mix(uInk, tone, 0.8), painted);
  // what AI makes (type, hito) is printed in the AI's ink
  lineCol = mix(lineCol, uTypeInk, (1.0 - painted) * step(0.7, gc.g) * covOf(gc.a) * (1.0 - cellPaint));
  lineCol = mix(lineCol, vec3(0.42, 0.25, 0.17), crowdK);
#endif
  float grain = 0.82 + 0.18 * noise(frag * 0.9 / uDpr + seed * 3.0);
  vec3 col = mix(base, lineCol, clamp(ink * grain, 0.0, 1.0));

  // under the disk (the night of the culture district (under)): the default's chalk on dark paper
  if (uNight > 0.001) {
    vec3 npaper = uNPaper * (0.9 + 0.25 * (ptex.r - 0.86)) * mix(0.7, 1.0, vig);
    vec3 nc = mix(mix(npaper, acc * 0.9, accAmt * 0.85), uNInk, clamp(inkObj * grain * (1.0 - fog), 0.0, 1.0));
    col = mix(col, nc, uNight);
  }
  col = mix(col, bg, uFade);
  if (uDebug > 0.5) col = vec3(texture2D(tG, vUv).r * covOf(texture2D(tG, vUv).a));
#if defined(LOOK_A)
  gl_FragColor = vec4(col, 1.0);
#else
  // (into the post pass's target: alpha = how much this pixel glows)
  gl_FragColor = vec4(col, clamp(glow * shownM * (1.0 - fog) * (1.0 - uFade), 0.0, 1.0));
#endif
}`;

// the post pass (b: depth of field; c: glow of the emissive pixels, whose amount the composite left in alpha)
const FRAG_POST = /* glsl */`
precision highp float;
uniform sampler2D tC; uniform sampler2D tD;
uniform vec2 uRes; uniform float uDpr; uniform float uNear; uniform float uFar; uniform float uFocusD; uniform float uDof; uniform float uGlow;
varying vec2 vUv;
float linDepth(float d){ float z = d * 2.0 - 1.0; return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear)); }
const vec2 K0 = vec2(-0.613, 0.617), K1 = vec2(0.170, -0.040), K2 = vec2(-0.299, 0.791), K3 = vec2(0.645, 0.493),
  K4 = vec2(-0.651, 0.717), K5 = vec2(0.421, 0.027), K6 = vec2(-0.817, -0.271), K7 = vec2(-0.705, -0.668),
  K8 = vec2(0.977, -0.108), K9 = vec2(0.063, -0.997), K10 = vec2(0.519, 0.814), K11 = vec2(-0.281, -0.442);
void main(){
  vec4 c = texture2D(tC, vUv);
  vec3 col = c.rgb;
  vec2 px = 1.0 / uRes;
#ifdef POST_DOF
  float dz = texture2D(tD, vUv).r;
  float d = dz > 0.99999 ? uFocusD * 3.0 : linDepth(dz);
  float coc = smoothstep(0.14, 0.75, abs(d - uFocusD) / max(uFocusD, 1.0)) * uDof * uDpr;
  if (coc > 0.4) {
    vec2 r = coc * px;
    vec3 s = col;
    s += texture2D(tC, vUv + K0 * r).rgb; s += texture2D(tC, vUv + K1 * r).rgb; s += texture2D(tC, vUv + K2 * r).rgb;
    s += texture2D(tC, vUv + K3 * r).rgb; s += texture2D(tC, vUv + K4 * r).rgb; s += texture2D(tC, vUv + K5 * r).rgb;
    s += texture2D(tC, vUv + K6 * r).rgb; s += texture2D(tC, vUv + K7 * r).rgb; s += texture2D(tC, vUv + K8 * r).rgb;
    s += texture2D(tC, vUv + K9 * r).rgb; s += texture2D(tC, vUv + K10 * r).rgb; s += texture2D(tC, vUv + K11 * r).rgb;
    col = s / 13.0;
  }
#endif
#ifdef POST_GLOW
  vec3 gs = vec3(0.0);
  for (int k = 0; k < 2; k++) {
    vec2 r = (k == 0 ? 5.0 : 13.0) * uDpr * px;
    vec4 t;
    t = texture2D(tC, vUv + K0 * r); gs += t.rgb * t.a; t = texture2D(tC, vUv + K1 * r); gs += t.rgb * t.a;
    t = texture2D(tC, vUv + K2 * r); gs += t.rgb * t.a; t = texture2D(tC, vUv + K3 * r); gs += t.rgb * t.a;
    t = texture2D(tC, vUv + K4 * r); gs += t.rgb * t.a; t = texture2D(tC, vUv + K5 * r); gs += t.rgb * t.a;
    t = texture2D(tC, vUv + K6 * r); gs += t.rgb * t.a; t = texture2D(tC, vUv + K7 * r); gs += t.rgb * t.a;
    t = texture2D(tC, vUv + K8 * r); gs += t.rgb * t.a; t = texture2D(tC, vUv + K9 * r); gs += t.rgb * t.a;
    t = texture2D(tC, vUv + K10 * r); gs += t.rgb * t.a; t = texture2D(tC, vUv + K11 * r); gs += t.rgb * t.a;
  }
  col += gs / 24.0 * uGlow + c.rgb * c.a * 0.25 * uGlow;
#endif
  gl_FragColor = vec4(col, 1.0);
}`;

/** per look: the composite's defines and colours, and which post pass it needs */
const LOOK_SET = {
  a: { def: 'LOOK_A', post: null, u: {} },
  b: { def: 'LOOK_B', post: 'POST_DOF', u: { uBgTop: '#dfe4e6', uBgMid: '#e8e4dc', uBgBot: '#efe6d7', uKey: [1.1, 1.05, 0.95], uFill: [0.64, 0.69, 0.84] } },
  c: { def: 'LOOK_C', post: 'POST_GLOW', u: { uBgTop: '#1f2242', uBgMid: '#6b4f78', uBgBot: '#e2966c', uObjPaper: '#ead9c2', uLineInk: '#221c2b', uKey: [1.08, 0.86, 0.7], uFill: [0.44, 0.43, 0.64] } },
};

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
      uInvVP: { value: new THREE.Matrix4() }, uReveal: { value: 1 }, uRevealO: { value: new THREE.Vector2() },
      uPaper: { value: new THREE.Color('#ebe6dc') }, uInk: { value: new THREE.Color('#262423') },
      uNPaper: { value: new THREE.Color('#1d1c1b') }, uNInk: { value: new THREE.Color('#ece7de') },
      uLime: { value: new THREE.Color('#cfe06b') }, uPink: { value: new THREE.Color('#f4b9b3') },
      uTeal: { value: new THREE.Color('#86d3e8') }, uRed: { value: new THREE.Color('#ef6b54') },
    };
    for (const k of ['uPaper', 'uInk', 'uNPaper', 'uNInk', 'uLime', 'uPink', 'uTeal', 'uRed']) {
      // Color() stores linear values; the composite writes raw values to the sRGB canvas
      const c = this.u[k].value; c.convertLinearToSRGB();
    }
    // ?look: the composite with the look's colour (FRAG_LOOK), and for b / c a post pass (see LOOK_SET)
    this.look = LOOK ? LOOK_SET[LOOK] : null;
    if (this.look) {
      const L = this.look, col = (v) => (Array.isArray(v) ? new THREE.Vector3(...v) : new THREE.Color(v).convertLinearToSRGB());
      Object.assign(this.u, {
        tPal: { value: paletteTexture(LOOK_DEF) },
        uBgTop: { value: col(L.u.uBgTop || '#ebe6dc') }, uBgMid: { value: col(L.u.uBgMid || '#ebe6dc') }, uBgBot: { value: col(L.u.uBgBot || '#ebe6dc') },
        uObjPaper: { value: col(L.u.uObjPaper || '#ebe6dc') }, uLineInk: { value: col(L.u.uLineInk || '#262423') },
        uKey: { value: col(L.u.uKey || [1, 1, 1]) }, uFill: { value: col(L.u.uFill || [0.7, 0.7, 0.7]) },
        uCalm: LOOK_U.calm, uFocusW: LOOK_U.focus, uFocusRW: LOOK_U.focusR,
        uTypeInk: { value: col(LOOK_DEF.typeInk || '#262423') },
      });
      // (shared by reference: what is drawn over the composite reads the drawing's depth, paint and paper)
      Object.assign(NPR_U, this.u);
    }
    this.mat = new THREE.ShaderMaterial({
      uniforms: this.u, vertexShader: VERT, depthTest: false, depthWrite: false,
      fragmentShader: this.look ? `#define ${this.look.def}\n${FRAG_LOOK}` : FRAG,
    });
    if (this.look && this.look.post) {
      this.postRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.UnsignedByteType, format: THREE.RGBAFormat, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
      this.pu = {
        tC: { value: this.postRT.texture }, tD: { value: depth }, uRes: this.u.uRes, uDpr: this.u.uDpr, uNear: this.u.uNear, uFar: this.u.uFar,
        uFocusD: { value: 200 }, uDof: { value: 4.2 }, uGlow: { value: 1.25 },
      };
      this.postMat = new THREE.ShaderMaterial({ uniforms: this.pu, vertexShader: VERT, fragmentShader: `#define ${this.look.post}\n${FRAG_POST}`, depthTest: false, depthWrite: false });
      this._ray = new THREE.Vector3();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    this.quad = new THREE.Mesh(geo, this.mat);
    this.quad.frustumCulled = false;
    if (this.postMat) {
      this.postQuad = new THREE.Mesh(geo, this.postMat);
      this.postQuad.frustumCulled = false;
      this.pscene = new THREE.Scene();
      this.pscene.add(this.postQuad);
    }
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
    if (this.postRT) this.postRT.setSize(W, H);
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
    if (u.uReveal.value < 1 || this.look) u.uInvVP.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).invert();
    // anchor the hatch pattern to the world origin so panning drags the strokes along
    this._v.set(0, 0, 0).project(camera);
    u.uHatchOff.value.set((this._v.x * 0.5 + 0.5) * u.uRes.value.x / this.dpr, (this._v.y * 0.5 + 0.5) * u.uRes.value.y / this.dpr);
    const r = this.r;
    r.setRenderTarget(this.gbuf);
    r.setClearColor(0x000000, 0);
    r.clear(true, true, true);
    r.render(scene, camera);
    if (this.postRT) {
      // focus: the ground at the frame's centre (the camera's line of sight meets y = 0), or the origin's distance
      const f = this._ray.set(0, 0, -1).applyQuaternion(camera.quaternion);
      const t = f.y < -0.05 ? -camera.position.y / f.y : camera.position.length();
      this.pu.uFocusD.value = Math.min(Math.max(t, 5), 900);
      r.setRenderTarget(this.postRT);
      r.render(this.qscene, this.qcam);
      r.setRenderTarget(null);
      r.render(this.pscene, this.qcam);
      return;
    }
    r.setRenderTarget(null);
    r.render(this.qscene, this.qcam);
    // look a: the type over the drawing (the zone names), at the canvas's own resolution, depth-tested in its shader
    // against the drawing buffer (OVERLAY in look.js)
    if (OVERLAY && OVERLAY.children.length) {
      const ac = r.autoClear;
      r.autoClear = false;
      r.render(OVERLAY, camera);
      r.autoClear = ac;
    }
  }
}
