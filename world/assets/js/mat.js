// Materials write a drawing buffer, not colours:  r = shade (0 dark … 1 lit), g = style (0 pencil, 0.8 the 人 field
// of digital twins, 1 typed glyphs — see STYLE in npr.js), b = accent code (see ACCENT in npr.js; a negative b is
// "dimmed by this much": no accent; the composite keeps the contour of pencil and typed parts, a 人 part goes faint),
// a = coverage.  Lighting and shadows come from three's Lambert model; we only replace what the fragment shader
// outputs.  Opacity is screen-door dithered so fades still hatch cleanly.
import * as THREE from '../vendor/three.module.min.js';
import { ACCENT } from './npr.js';
import { LOOK } from './look.js';

export const T = { value: 0 };           // shared world clock (seconds); stands still while motion is off
export const CLOCK = { value: 0 };       // real seconds: keeps running for things the reader starts themselves
// colour follows attention: accents show fully near the focused district, stippled elsewhere
export const FOCUS = { pos: { value: new THREE.Vector3() }, r: { value: 1e5 }, all: { value: 1 } };

// uniforms every ink() shader declares itself; anything else in `o.uniforms` is declared from its value's type
const BASE_U = new Set(['uTime', 'uStyle', 'uAccent', 'uShadeMul', 'uShadeBias', 'uOpacity', 'uAside', 'uDim', 'uFocusPos', 'uFocusR', 'uAccentAll', 'uPaint']);

/** stable 53-bit string hash (cyrb53), base 36: equal shader text → equal program cache key */
export function hashKey(s) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(36) + '-' + (h1 >>> 0).toString(36);
}

/**
 * @param {object} o
 *  style    0 pencil · 0.8 the 人 field (digital twins) · 1 typed glyphs (made by AI)
 *  accent   'lime' | 'pink' | 'teal' | 'iris' | 'red' | 'ink' | number
 *  shade    multiplier on lit luminance, bias added after
 *  dim      initial uDim (0 … 1, see dim())
 *  focus    false: accents stay full wherever the camera's attention is (for things seen only up close)
 *  hooks    { key, vHead, vPos (edit `transformed`), vNormal (edit `objectNormal`), fHead,
 *             fOut (edit sh / st / ac / op, and dm = this pixel's dim, which starts at uDim) }
 *  uniforms extra uniforms, declared in both stages from their value's type; passing one of the base names
 *           (e.g. a shared `uDim` object for a group of parts) replaces that uniform instead
 *
 * Program sharing: materials whose shader text is the same share one GL program. The cache key is a hash of the
 * hook strings and the extra uniforms' names and types (side / flatShading / instancing are told apart by three
 * itself). An explicit `hooks.key` still wins: every material using that key must then have the same hooks.
 */
export function ink(o = {}) {
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff, side: o.side ?? THREE.FrontSide, flatShading: !!o.flat });
  const acc = typeof o.accent === 'string' ? ACCENT[o.accent] : (o.accent ?? 0);
  const u = {
    uTime: T,
    uStyle: { value: o.style ?? 0 },
    uAccent: { value: acc },
    uShadeMul: { value: o.shade ?? 1 },
    uShadeBias: { value: o.bias ?? 0 },
    uOpacity: { value: o.opacity ?? 1 },
    uAside: { value: 0 },                 // 0 … 1: the whole object steps aside (see world.js)
    uDim: { value: o.dim ?? 0 },          // 0 … 1: emphasis by subtraction, the object drops to its contour (see dim())
    uFocusPos: FOCUS.pos, uFocusR: FOCUS.r, uAccentAll: o.focus === false ? { value: 1 } : FOCUS.all,
    // ?look only: the paint slot (look.js) this surface writes into the drawing buffer's alpha; hooks may set `pn`
    // (0 … 79 the setting; 80 … 127, look a: a district's spot fill under its pencil line, set by scenery.js)
    ...(LOOK ? { uPaint: { value: o.paint ?? 0 } } : {}),
    ...(o.uniforms || {}),
  };
  const h = o.hooks || {};
  m.userData.u = u;
  const extraU = Object.keys(o.uniforms || {}).filter((k) => !BASE_U.has(k)).sort()
    .map((k) => `uniform ${glslType(u[k].value)} ${k};`).join('\n');
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
uniform float uTime;
${extraU}
varying vec3 vWPos;
varying vec3 vLPos;
${h.vHead || ''}`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
${h.vNormal || ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
${h.vPos || ''}
vLPos = transformed;
#ifdef USE_INSTANCING
vWPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
#else
vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
#endif`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uTime; uniform float uStyle; uniform float uAccent; uniform float uShadeMul; uniform float uShadeBias; uniform float uOpacity;
uniform float uAside; uniform float uDim;
uniform vec3 uFocusPos; uniform float uFocusR; uniform float uAccentAll;${LOOK ? `
uniform float uPaint;` : ''}
${extraU}
varying vec3 vWPos;
varying vec3 vLPos;
float dHash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
${h.fHead || ''}`)
      .replace('#include <color_fragment>', '')
      .replace('#include <opaque_fragment>', `
float L = dot(outgoingLight, vec3(0.299, 0.587, 0.114));
float sh = clamp(L * uShadeMul + uShadeBias, 0.0, 1.0);
float st = uStyle; float ac = uAccent; float op = uOpacity; float dm = uDim;${LOOK ? `
float pn = uPaint;` : ''}
// three only defines USE_COLOR in the fragment stage for instance colours
#if defined(USE_INSTANCING_COLOR) || defined(USE_COLOR)
sh = clamp(sh * vColor.r, 0.0, 1.0);
if (vColor.g >= 0.0) st = vColor.g;
if (vColor.b >= 0.0) ac = vColor.b;
#endif
${h.fOut || ''}
// dim by subtraction: the shade is pushed toward the paper and the accent goes; the style stays, and the composite
// keeps the depth outlines, so a dimmed part reads as its under-drawing
dm = clamp(dm, 0.0, 1.0);
sh = mix(sh, 1.0, dm * 0.82);
if (dm > 0.5) ac = 0.0;
// a part that still shows its accent (dim ≤ 0.5) cannot carry the dim flag; its out-of-focus stipple holes must not
// carry it either, or the composite would see a speckle of flagged / unflagged pixels on one surface
float acPart = ac;
{
  float keep = max(uAccentAll, 1.0 - smoothstep(uFocusR, uFocusR + 14.0, distance(vWPos, uFocusPos)));
  if (ac > 0.01 && ac < 0.9 && dHash(floor(gl_FragCoord.xy * 0.5) + 7.3) > keep) ac = 0.0;
}
op *= 1.0 - uAside;
if (op < 0.999 && dHash(floor(gl_FragCoord.xy)) > op) discard;
// no accent: b carries -dim instead (≤ 0 reads as "no accent" in the composite either way)
gl_FragColor = vec4(sh, st, ac > 0.01 ? ac : (acPart > 0.01 ? 0.0 : -dm), ${LOOK ? '1.0 + clamp(pn, 0.0, 127.0) * 0.0625' : '1.0'});`)
      .replace('#include <tonemapping_fragment>', '')
      .replace('#include <colorspace_fragment>', '')
      .replace('#include <fog_fragment>', '')
      .replace('#include <premultiplied_alpha_fragment>', '')
      .replace('#include <dithering_fragment>', '');
  };
  const key = h.key || 'ink#' + hashKey([h.vHead, h.vPos, h.vNormal, h.fHead, h.fOut, extraU].map((s) => s || '').join('\u0001'));
  m.customProgramCacheKey = () => key;
  return m;
}

/**
 * Contour-only emphasis: sets uDim (0 full … 1 contour only) on every ink() material under `target`
 * (an Object3D, a material, or an array of either). Materials can be shared between meshes, and then dimming one
 * mesh dims every mesh that uses the material: callers that need to dim parts independently must give each part
 * its own materials (or pass a shared `uniforms: { uDim }` object to the parts that should dim together).
 * Pencil and typed parts keep their outlines; a 人 (style 0.8) part has none and goes faint through its glyph density.
 * Above 0.5 the accent goes and the composite lifts the contour; at or below 0.5 an accented part looks undimmed but
 * for its shade. Cast shadows are not touched: a dimmed part still throws its full shadow.
 */
export function dim(target, amount = 1) {
  const k = Math.min(1, Math.max(0, +amount || 0));
  const set = (mat) => { const u = mat && mat.userData && mat.userData.u; if (u && u.uDim) u.uDim.value = k; };
  const visit = (t) => {
    if (!t) return;
    if (Array.isArray(t)) { t.forEach(visit); return; }
    if (t.isMaterial) { set(t); return; }
    if (t.isObject3D) t.traverse((o) => { if (Array.isArray(o.material)) o.material.forEach(set); else set(o.material); });
  };
  visit(target);
  return target;
}

/** depth material that applies the same vertex displacement, for shadow casting of animated meshes */
export function inkDepth(hooks = {}, uniforms = {}) {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  const extraU = Object.keys(uniforms).filter((k) => k !== 'uTime').sort()
    .map((k) => `uniform ${glslType(uniforms[k].value)} ${k};`).join('\n');
  const key = 'inkd' + (hooks.key || '#' + hashKey([hooks.vHead, hooks.vPos, extraU].map((s) => s || '').join('\u0001')));
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = T;
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
uniform float uTime;
${extraU}
${hooks.vHead || ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
${hooks.vPos || ''}`);
  };
  m.customProgramCacheKey = () => key;
  return m;
}

/** raw shader for points / lines that bypass lighting */
export function inkPoints({ vertex, fragment, uniforms = {}, transparent = false }) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: T, ...uniforms },
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent,
    depthWrite: !transparent,
  });
}

function glslType(v) {
  if (typeof v === 'number') return 'float';
  if (v && v.isVector2) return 'vec2';
  if (v && v.isVector3) return 'vec3';
  if (v && v.isVector4) return 'vec4';
  if (v && v.isColor) return 'vec3';
  if (v && v.isTexture) return 'sampler2D';
  if (v && v.isMatrix4) return 'mat4';
  return 'float';
}

/** per-instance (shadeMul, style, accent); pass -1 to keep the material's value.
 *  In fragment hooks test `#if defined(USE_INSTANCING_COLOR) || defined(USE_COLOR)` before reading vColor. */
export function setInst(mesh, i, shade = 1, style = -1, accent = -1) {
  mesh.setColorAt(i, _c.setRGB(shade, style, accent, THREE.LinearSRGBColorSpace));
}
const _c = new THREE.Color();
