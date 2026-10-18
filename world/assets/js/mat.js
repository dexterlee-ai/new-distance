// Materials write a drawing buffer, not colours:  r = shade (0 dark … 1 lit), g = ascii-ness (0 pencil … 1 glyphs),
// b = accent code (see ACCENT in npr.js), a = coverage.  Lighting and shadows come from three's Lambert model;
// we only replace what the fragment shader outputs.  Opacity is screen-door dithered so fades still hatch cleanly.
import * as THREE from '../vendor/three.module.min.js';
import { ACCENT } from './npr.js';

export const T = { value: 0 };           // shared world clock (seconds); stands still while motion is off
export const CLOCK = { value: 0 };       // real seconds: keeps running for things the reader starts themselves
// colour follows attention: accents show fully near the focused district, stippled elsewhere
export const FOCUS = { pos: { value: new THREE.Vector3() }, r: { value: 1e5 }, all: { value: 1 } };

let keySeq = 0;

/**
 * @param {object} o
 *  style    0 pencil … 1 ascii
 *  accent   'lime' | 'pink' | 'teal' | 'iris' | 'ink' | number
 *  shade    multiplier on lit luminance, bias added after
 *  focus    false: accents stay full wherever the camera's attention is (for things seen only up close)
 *  hooks    { vHead, vPos (edit `transformed`), vNormal (edit `objectNormal`), fHead, fOut (edit sh / st / ac / op) }
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
    uFocusPos: FOCUS.pos, uFocusR: FOCUS.r, uAccentAll: o.focus === false ? { value: 1 } : FOCUS.all,
    ...(o.uniforms || {}),
  };
  const h = o.hooks || {};
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    const extraU = Object.keys(o.uniforms || {}).map((k) => `uniform ${glslType(u[k].value)} ${k};`).join('\n');
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
uniform float uAside;
uniform vec3 uFocusPos; uniform float uFocusR; uniform float uAccentAll;
${extraU}
varying vec3 vWPos;
varying vec3 vLPos;
float dHash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
${h.fHead || ''}`)
      .replace('#include <color_fragment>', '')
      .replace('#include <opaque_fragment>', `
float L = dot(outgoingLight, vec3(0.299, 0.587, 0.114));
float sh = clamp(L * uShadeMul + uShadeBias, 0.0, 1.0);
float st = uStyle; float ac = uAccent; float op = uOpacity;
// three only defines USE_COLOR in the fragment stage for instance colours
#if defined(USE_INSTANCING_COLOR) || defined(USE_COLOR)
sh = clamp(sh * vColor.r, 0.0, 1.0);
if (vColor.g >= 0.0) st = vColor.g;
if (vColor.b >= 0.0) ac = vColor.b;
#endif
${h.fOut || ''}
{
  float keep = max(uAccentAll, 1.0 - smoothstep(uFocusR, uFocusR + 14.0, distance(vWPos, uFocusPos)));
  if (ac > 0.01 && ac < 0.9 && dHash(floor(gl_FragCoord.xy * 0.5) + 7.3) > keep) ac = 0.0;
}
op *= 1.0 - uAside;
if (op < 0.999 && dHash(floor(gl_FragCoord.xy)) > op) discard;
gl_FragColor = vec4(sh, st, ac, 1.0);`)
      .replace('#include <tonemapping_fragment>', '')
      .replace('#include <colorspace_fragment>', '')
      .replace('#include <fog_fragment>', '')
      .replace('#include <premultiplied_alpha_fragment>', '')
      .replace('#include <dithering_fragment>', '');
  };
  const key = 'ink' + (keySeq++);
  m.customProgramCacheKey = () => (h.key || key);
  return m;
}

/** depth material that applies the same vertex displacement, for shadow casting of animated meshes */
export function inkDepth(hooks = {}, uniforms = {}) {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = T;
    Object.assign(sh.uniforms, uniforms);
    const extraU = Object.keys(uniforms).map((k) => `uniform ${glslType(uniforms[k].value)} ${k};`).join('\n');
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
uniform float uTime;
${extraU}
${hooks.vHead || ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
${hooks.vPos || ''}`);
  };
  m.customProgramCacheKey = () => 'inkd' + (hooks.key || Math.random());
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
