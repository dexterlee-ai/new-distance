// Paper puppets: flat cut-out people and the little agent robot. Each has a few hinges the kit animates every frame.
import { T, C, keep, box, ball, disc, beam, poly, card, tab, strut, cyl } from './paper.js';

const SKIN = ['#f3cfa6', '#e9bb8e', '#f6d9b8', '#d9a47a'];
const LAMP_ON = '#ffd75e', LAMP_OFF = '#234048';
const semi = (r, n = 10) => { const p = []; for (let i = 0; i <= n; i++) { const a = Math.PI * i / n; p.push([Math.cos(a) * r, Math.sin(a) * r]); } return p; };

/** kind: 'adult' | 'ce' (小策, the brand planner) | 'elder' | 'kid' */
export function makePerson(parent, { x = 0, y = 0, z = 0, s = 1, coat = C.navy, hair = C.ink, skin = SKIN[0], kind = 'adult', legs = C.dark, prop = true } = {}) {
  const root = keep(parent, x, y, z); const k = kind === 'kid' ? .72 : 1; root.scale.setScalar(s * k);
  const inner = keep(root); // hop / lean happens here so root keeps its place
  if (prop) { tab(root, .34); strut(root, .8); }
  for (const sx of [-1, 1]) box(inner, sx * .085, .15, 0, .085, .3, .05, legs);
  poly(inner, [[-.2, .27], [.2, .27], [.145, .8], [-.145, .8]], .07, coat, 0, 0, -.035);
  if (kind === 'ce') { beam(inner, [-.13, .78, .045], [.16, .42, .045], .018, C.honey, 4); box(inner, .18, .38, .05, .17, .15, .05, C.honey); box(inner, .18, .44, .08, .17, .03, .012, C.wood); }
  const arms = [];
  for (const sx of [-1, 1]) {
    const a = keep(inner, sx * .165, .74, .01);
    card(a, 0, -.34, 0, .085, .36, coat, .05, .04); const h = ball(a, 0, -.36, .025, .05, skin); h.scale.z = .6;
    a.rotation.z = sx * .16; arms.push(a);
  }
  const head = keep(inner, 0, .84, 0);
  disc(head, 0, .19, 0, .2, skin, .06, 22);
  if (kind === 'elder') { poly(head, semi(.21), .03, '#d8d5cc', 0, .22, .035); }
  else if (kind === 'ce') { poly(head, semi(.215), .035, hair, 0, .215, .035); const bun = ball(head, 0, .43, 0, .075, hair); bun.scale.z = .6; }
  else if (kind === 'kid') { poly(head, semi(.215), .035, hair, 0, .225, .035); poly(head, [[-.21, .22], [-.05, .22], [-.12, .13]], .03, hair, 0, 0, .04); }
  else poly(head, semi(.215), .035, hair, 0, .215, .035);
  const eyes = keep(head, 0, .17, .04);
  for (const sx of [-1, 1]) disc(eyes, sx * .075, 0, 0, .026, C.ink, .012, 10);
  for (const sx of [-1, 1]) disc(head, sx * .125, .1, .034, .03, '#f1a58c', .008, 10);
  if (kind === 'elder') beam(inner, [.27, 0, .02], [.2, .5, .02], .015, C.wood, 4);
  const p = {
    root, inner, head, eyes, armL: arms[0], armR: arms[1], kind: 'person', phase: Math.random() * 6,
    mood: 'idle', waveT: 0, hopT: 0, hopH: .28, walk: null, lookAt: [0, 1.0, .05], gaze: { x: 0, y: 0 }, q: null,
    wave(d = 1.6) { p.waveT = d; return p; }, hop(h = .28) { p.hopT = .55; p.hopH = h; return p; },
    cheer(on = true) { p.mood = on ? 'cheer' : 'idle'; return p; }, doubt(on = true) { p.mood = on ? 'doubt' : 'idle'; return p; },
    still() { p.mood = 'idle'; p.waveT = 0; return p; },
  };
  return p;
}

/** 小智: the paper agent robot */
export function makeRobot(parent, { x = 0, y = 0, z = 0, s = 1, body = C.teal, trim = C.aqua, prop = true, lights = -1 } = {}) {
  const root = keep(parent, x, y, z); root.scale.setScalar(s);
  const inner = keep(root);
  if (prop) { tab(root, .36); strut(root, .7); }
  cyl(inner, 0, .07, 0, .2, .24, .14, C.dark, 10);
  card(inner, 0, .13, -.04, .44, .46, body, .09, .08);
  disc(inner, 0, .36, .06, .07, trim, .02, 12);
  const arms = [];
  for (const sx of [-1, 1]) { const a = keep(inner, sx * .25, .5, .01); beam(a, [0, 0, 0], [0, -.26, 0], .03, C.steel, 5); const h = ball(a, 0, -.3, 0, .055, trim); h.scale.z = .6; a.rotation.z = sx * .25; arms.push(a); }
  const head = keep(inner, 0, .62, 0);
  card(head, 0, 0, -.04, .5, .36, body, .09, .09);
  card(head, 0, .05, .052, .4, .25, C.dark, .012, .06);
  const eyes = keep(head, 0, .18, .07);
  for (const sx of [-1, 1]) box(eyes, sx * .09, 0, 0, .06, .075, .012, trim);
  beam(head, [0, .36, 0], [0, .52, 0], .014, C.steel, 4); ball(head, 0, .54, 0, .045, C.gold);
  // twelve lights round the chest like the hours of a clock: one comes on for every thing it learns (lights < 0: none drawn)
  const lamps = [];
  if (lights >= 0) for (let i = 0; i < 12; i++) {
    const a = Math.PI / 2 - (i + .5) * Math.PI / 6;
    const m = new T.Mesh(new T.CircleGeometry(.027, 12), new T.MeshBasicMaterial({ color: LAMP_OFF, toneMapped: false }));
    m.position.set(Math.cos(a) * .137, .36 + Math.sin(a) * .137, .0535); m.userData.raw = true; m.userData.keep = true; inner.add(m); lamps.push(m);
  }
  const p = {
    lamps, lights0: Math.max(0, lights),
    /** show the first n lights lit (no animation); returns the n-th lamp so a scene can make it pop */
    setLights(n = 0) { lamps.forEach((m, i) => m.material.color.set(i < n ? LAMP_ON : LAMP_OFF)); p.lit = n; return lamps[n - 1] || null; },
    root, inner, head, eyes, armL: arms[0], armR: arms[1], kind: 'robot', phase: Math.random() * 6,
    mood: 'idle', waveT: 0, hopT: 0, hopH: .22, lookAt: [0, .85, .05], gaze: { x: 0, y: 0 },
    wave(d = 1.6) { p.waveT = d; return p; }, hop(h = .22) { p.hopT = .55; p.hopH = h; return p; },
    cheer(on = true) { p.mood = on ? 'cheer' : 'idle'; return p; }, doubt(on = true) { p.mood = on ? 'doubt' : 'idle'; return p; },
    still() { p.mood = 'idle'; p.waveT = 0; return p; },
  };
  p.setLights(p.lights0);
  return p;
}

const beat = (t, a, b) => (t <= a || t >= b ? 0 : Math.sin(Math.PI * (t - a) / (b - a)));
/** called every frame for every puppet on the open spread */
export function posePuppet(p, t, dt, gx, gy, hovered) {
  const e = 1 - Math.exp(-dt * 10), tt = t + p.phase;
  p.gaze.x += (gx - p.gaze.x) * e; p.gaze.y += (gy - p.gaze.y) * e;
  if (p.waveT > 0) p.waveT -= dt; if (p.hopT > 0) p.hopT -= dt;
  const hop = p.hopT > 0 ? Math.sin(Math.PI * (1 - p.hopT / .55)) * p.hopH : 0;
  const cheer = p.mood === 'cheer', doubt = p.mood === 'doubt';
  const bob = Math.sin(tt * 2.1) * .012 + (cheer ? Math.abs(Math.sin(tt * 6)) * .07 : 0);
  const step = p.walking ? Math.sin(tt * 11) : 0;
  p.inner.position.y = bob + hop + Math.abs(step) * .06; p.inner.rotation.z = (doubt ? .05 : 0) + Math.sin(tt * 1.3) * .012 + (hovered ? .04 : 0) + step * .06;
  p.head.rotation.z = (doubt ? .26 : 0) + p.gaze.x * -.1 + Math.sin(tt * 1.7) * .02;
  p.head.rotation.y = p.gaze.x * .3; p.head.rotation.x = -p.gaze.y * .14;
  p.eyes.position.x = p.gaze.x * .035; p.eyes.scale.y = 1 - .9 * beat((tt * 1.0) % 3.4, 3.2, 3.4);
  const wave = p.waveT > 0 ? 1 : 0;
  const rTarget = cheer ? 2.7 + Math.sin(tt * 9) * .2 : wave ? 2.55 + Math.sin(tt * 13) * .35 : hovered ? .9 : .16 + Math.sin(tt * 1.9) * .04;
  const lTarget = cheer ? -2.7 - Math.sin(tt * 9 + 1) * .2 : doubt ? -.5 : -.16 - Math.sin(tt * 1.9) * .04;
  p.armR.rotation.z += (rTarget - p.armR.rotation.z) * e; p.armL.rotation.z += (lTarget - p.armL.rotation.z) * e;
}
