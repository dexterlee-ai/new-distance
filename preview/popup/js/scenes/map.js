// Spread 0: the fold-out map of 決策智慧島. One road, twelve stops, four lands. A little book-van drives to the flag you
// pick and a card tells you what that page says. The map only shows the way: one press takes you into a page.
import { C, keep, box, cyl, cone, ball, disc, beam, poly, tag, words, tab, cloud, pine, ring } from '../paper.js';
import { LANDS } from '../data.js';
import { pageY } from '../stage.js';

const PINS = [
  { no: 1, id: 's01-loop', short: '啟程港', x: -4.7, z: 1.95, land: 'prologue' },
  { no: 2, id: 's02-distance', short: '相機屋', x: -3.55, z: 1.0, land: 'prologue' },
  { no: 3, id: 's03-real', short: '運動場', x: -3.05, z: -.4, land: 'people' },
  { no: 4, id: 's04-want', short: '雨傘屋', x: -1.85, z: -1.15, land: 'people' },
  { no: 5, id: 's05-voice', short: '臭豆腐攤', x: -.95, z: .05, land: 'people' },
  { no: 6, id: 's06-memory', short: '手印牆', x: -1.6, z: 1.6, land: 'people' },
  { no: 7, id: 's07-twins', short: '島中島', x: .95, z: 1.8, land: 'model' },
  { no: 8, id: 's08-judge', short: '辦桌棚', x: 1.4, z: .35, land: 'model' },
  { no: 9, id: 's09-undertow', short: '廟口', x: 2.35, z: -.95, land: 'model' },
  { no: 10, id: 's10-pause', short: '結帳口', x: 3.5, z: -.05, land: 'ai' },
  { no: 11, id: 's11-spec', short: '藍染坊', x: 4.3, z: 1.1, land: 'ai' },
  { no: 12, id: 's12-gates', short: '天燈廣場', x: 4.95, z: 2.3, land: 'ai' },
];
const INK = { prologue: '#b98a2c', people: '#7d9a2e', model: '#c4604e', ai: '#2f8f9b' };
const PAPER = { prologue: '#f3d58a', people: '#d5e283', model: '#f6b9aa', ai: '#9fd8dd' };
const START = [-5.45, 2.75];

// one smooth road from the pier through the twelve stops
const ROAD = (() => {
  const P = [START, ...PINS.map((p) => [p.x, p.z])], pts = [], N = 14;
  const cr = (a, b, c, d, t) => .5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
  for (let i = 0; i < P.length - 1; i++) { const a = P[Math.max(0, i - 1)], b = P[i], c = P[i + 1], d = P[Math.min(P.length - 1, i + 2)]; for (let k = 0; k < N; k++) pts.push([cr(a[0], b[0], c[0], d[0], k / N), cr(a[1], b[1], c[1], d[1], k / N)]); }
  pts.push(P[P.length - 1]);
  const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return {
    pts, len: L[L.length - 1], stop: (k) => L[k * N], // stop 0 is the pier, 1–12 are the pages
    at(s) { s = Math.max(0, Math.min(L[L.length - 1], s)); let i = 1; while (i < L.length - 1 && L[i] < s) i++; const u = (s - L[i - 1]) / (L[i] - L[i - 1] || 1), a = pts[i - 1], b = pts[i]; return { x: a[0] + (b[0] - a[0]) * u, z: a[1] + (b[1] - a[1]) * u, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) }; },
    near(x, z) { let best = 0, bd = 1e9; for (let i = 0; i < pts.length; i++) { const d = (pts[i][0] - x) ** 2 + (pts[i][1] - z) ** 2; if (d < bd) { bd = d; best = i; } } return L[best]; },
  };
})();

export default {
  id: 'map', land: 'map', short: '地圖',
  title: '有問題，問小智。',
  lede: '這是一本可以動手玩的立體書。四塊土地、十二面旗子：每一頁先演給你看，再換你試；看懂了，再翻開原文。',
  ground(G) {
    G.wash('#a8cbcb');
    G.marks('wave', -6, -3.6, 6, 3.6, { n: 110, col: '#ffffff55', size: .16, seed: 5 });
    // the island and its four lands
    G.blob([[-5.6, 2.9], [-5.75, .6], [-5.2, -1.6], [-3.6, -3.05], [-.8, -3.2], [1.6, -3.15], [4.2, -3.0], [5.55, -1.7], [5.75, .9], [5.5, 2.95], [3.2, 3.25], [.4, 3.05], [-2.6, 3.3]], '#f3e6c0', { edge: '#e3cf98', edgeW: .1 });
    G.blob([[-5.5, 2.8], [-5.6, .7], [-4.6, -.2], [-3.3, .3], [-2.5, 1.6], [-2.7, 3.1]], '#f1d99a');
    G.blob([[-5.1, -1.5], [-3.6, -2.9], [-.9, -3.05], [-.35, -1.2], [-.45, 1.4], [-.7, 2.9], [-2.5, 3.0], [-2.4, 1.5], [-3.3, .2], [-4.6, -.3]], '#dbe6a3');
    G.blob([[.4, -3.0], [3.0, -2.95], [3.1, -1.5], [2.5, -.2], [2.3, 1.6], [2.6, 3.0], [.5, 2.9], [.35, .6]], '#f7cfc2');
    G.blob([[3.2, -2.9], [4.3, -2.9], [5.4, -1.7], [5.65, .9], [5.4, 2.85], [2.8, 3.1], [2.5, 1.6], [2.7, -.2], [3.3, -1.5]], '#b9dfe0');
    G.grid(.6, '#ffffff16', .012);
    // the road
    G.path(ROAD.pts, { w: .5, col: '#6f6351', sharp: true }).path(ROAD.pts, { w: .4, col: '#a59a85', sharp: true }).path(ROAD.pts, { w: .035, col: '#fff6dc', dash: [.13, .15], sharp: true });
    G.rect(START[0] - .1, START[1] + .1, .9, .5, '#d9c08f', { rot: -.5, r: .05 });
    for (const p of PINS) { G.circle(p.x, p.z, .27, '#fff6dc', { edge: INK[p.land], edgeW: .05 }); G.text(p.short, p.x + .05, p.z + .52, { size: .17, col: '#4b3d2a', weight: 800 }); }
    // land names
    const mono = '"IBM Plex Mono",monospace';
    G.text('啟程港', -4.2, 2.95, { size: .3, col: INK.prologue, weight: 900 }).text('PROLOGUE', -4.2, 3.25, { size: .11, col: INK.prologue, font: mono, weight: 500, spacing: .05 });
    G.text('人間市集', -2.4, -2.55, { size: .3, col: INK.people, weight: 900 }).text('PEOPLE', -2.4, -2.25, { size: .11, col: INK.people, font: mono, weight: 500, spacing: .05 });
    G.text('推演沙盤', 1.6, 2.72, { size: .3, col: INK.model, weight: 900 }).text('MODEL', 1.6, 3.02, { size: .11, col: INK.model, font: mono, weight: 500, spacing: .05 });
    G.text('代理城', 4.4, -2.45, { size: .3, col: INK.ai, weight: 900 }).text('AI', 4.4, -2.15, { size: .11, col: INK.ai, font: mono, weight: 500, spacing: .05 });
    G.circle(-5.15, -2.75, .34, null, { edge: '#5c7f85', edgeW: .025 }).path([[-5.15, -3.2], [-5.15, -2.3]], { w: .03, col: '#5c7f85', sharp: true }).path([[-5.6, -2.75], [-4.7, -2.75]], { w: .03, col: '#5c7f85', sharp: true }).text('N', -5.15, -3.36, { size: .15, col: '#5c7f85' });
  },
  build(S) {
    const st = S.state({ at: 0, picked: 0, driving: false });
    const pos = { s: 0 }, marks = {};
    const defOf = (k) => S.app.defs()[k];
    const nextPin = () => PINS.find((p) => !S.app.stamps.has(p.id)) || PINS[0];

    // twelve flags, standing just behind their stop
    for (const p of PINS) {
      S.plant(p.x - .02, p.z - .36, (g) => {
        const k = keep(g); cyl(k, 0, .4, 0, .028, .028, .8, C.wood, 6); ball(k, 0, .83, 0, .045, C.gold);
        poly(k, [[0, 0], [.56, -.02], [.44, -.17], [.56, -.33], [0, -.33]], .03, PAPER[p.land], .02, .8, -.015);
        words(k, String(p.no), .23, .635, .022, .2, { color: '#2b2a26', weight: 900 });
        const m = keep(k, .5, .86, .03); disc(m, 0, 0, 0, .12, C.red, .02, 14); words(m, '✓', 0, 0, .016, .13, { color: '#fff3d6', weight: 900 }); m.visible = false; marks[p.id] = m;
        S.prop(k, { id: p.id, label: `第 ${p.no} 頁｜${p.short}`, tap: () => { if (st.driving) return; if (st.at === p.no) S.go(p.id); else { st.picked = p.no; drive(p.no); } } }); p.node = k;
      });
    }

    // the book-van: a small book on wheels with a bookmark for a pennant
    let van, pennant;
    S.plant(START[0], START[1], (g) => {
      van = keep(g); van.scale.setScalar(1.3);
      box(van, 0, .17, 0, .6, .09, .34, C.navy); box(van, -.03, .25, 0, .5, .09, .3, C.edge); box(van, 0, .32, 0, .6, .05, .34, C.navy); box(van, 0, .32, .172, .6, .05, .004, C.gold);
      box(van, .19, .44, 0, .2, .19, .3, C.gold); box(van, .262, .46, 0, .06, .1, .26, '#9fd0d6');
      for (const [x, z] of [[-.19, .18], [.19, .18], [-.19, -.18], [.19, -.18]]) cyl(van, x, .08, z, .08, .08, .05, C.dark, 10).rotation.x = Math.PI / 2;
      beam(van, [-.24, .34, 0], [-.24, .78, 0], .012, C.wood, 4); pennant = keep(van, -.24, .76, 0); poly(pennant, [[0, 0], [-.26, -.03], [-.2, -.09], [-.26, -.16], [0, -.15]], .012, C.red);
    });
    S.drag(van, { id: 'van', label: '書車：點旗子它就開過去，也可以拖著它走', plane: 'ground',
      start: () => { S.card(null); S.hint(null); st.driving = true; },
      move: (e) => { pos.s = ROAD.near(e.point.x, e.point.z); },
      end: () => { st.driving = false; let k = 0, bd = 1e9; for (let i = 0; i <= 12; i++) { const d = Math.abs(ROAD.stop(i) - pos.s); if (d < bd) { bd = d; k = i; } }
        if (bd < .8) { st.picked = k; S.to(pos, { s: ROAD.stop(k) }, .22).then(() => arrive(k)); } else S.set({ at: -1 }); } });

    async function drive(k, then) {
      if (st.driving) return; S.card(null); S.hint(null); st.driving = true; S.refresh(); S.sound('whoosh');
      const to = ROAD.stop(k); await S.to(pos, { s: to }, Math.min(1.4, Math.max(.4, Math.abs(to - pos.s) / 4.5)), 'inOut');
      st.driving = false; arrive(k, then);
    }
    function arrive(k, then) {
      S.set({ at: k }); if (k < 1) return; const p = PINS[k - 1]; S.sound('pop'); S.wiggle(p.node, .16);
      if (then === 'enter') { S.go(p.id); return; }
      const d = defOf(k), src = (d.sources || []).map((x) => x.n).join('、');
      S.card(S.world(p.node, [.2, 1.15, 0]), { kicker: `第 ${k} 頁 · ${LANDS[p.land].name}${S.app.stamps.has(p.id) ? ' · 已讀懂' : ''}`, title: d.title, note: src ? `取材：第 ${src} 篇` : '', button: '問小智 →' }, () => S.go(p.id));
    }

    // 啟程港: a lighthouse and a moored boat
    S.plant(-4.95, -.55, (g) => { tab(g, .5); cyl(g, 0, .55, 0, .17, .26, 1.1, '#f6ead0', 10); cyl(g, 0, .45, 0, .225, .245, .2, C.red, 10); cyl(g, 0, .95, 0, .185, .195, .16, C.red, 10); cyl(g, 0, 1.13, 0, .25, .25, .05, C.dark, 10); cyl(g, 0, 1.27, 0, .14, .14, .22, C.gold, 8); cone(g, 0, 1.48, 0, .2, .22, C.red, 8); });
    let boat; S.plant(-5.25, .95, (g) => { boat = keep(g); poly(boat, [[-.34, .16], [.38, .16], [.26, 0], [-.26, 0]], .2, C.red, 0, 0, -.1); beam(boat, [0, .16, 0], [0, .72, 0], .018, C.wood, 5); poly(boat, [[.03, .68], [.3, .24], [.03, .24]], .02, C.white); });
    // 人間市集: lantern arch and two stalls
    const lanterns = [];
    S.plant(-2.35, -1.95, (g) => {
      tab(g, 1.3);
      for (const sx of [-1, 1]) box(g, sx * .7, .5, 0, .09, 1.0, .09, C.red);
      box(g, 0, 1.03, 0, 1.7, .1, .14, C.deep); box(g, 0, 1.13, 0, 1.9, .07, .18, C.red);
      for (let i = 0; i < 4; i++) { const l = keep(g, -.45 + i * .3, .98, .06); beam(l, [0, 0, 0], [0, -.08, 0], .008, C.dark, 4); const b = ball(l, 0, -.19, 0, .1, i % 2 ? C.gold : C.red, 1); b.scale.set(1, 1.15, .7); lanterns.push(l); }
    });
    const stall = (x, z, ry, col) => S.plant(x, z, (g) => { tab(g, .6); box(g, 0, .2, 0, .62, .4, .34, '#e9cb95'); for (let i = 0; i < 4; i++) box(g, -.24 + i * .16, .5, .02, .16, .24, .38, i % 2 ? C.white : col).rotation.x = -.35; for (const sx of [-1, 1]) beam(g, [sx * .28, .4, .14], [sx * .28, .62, .14], .015, C.wood, 4); }, { ry });
    stall(-4.0, -1.5, .2, C.red); stall(-.85, -2.2, -.2, C.lime);
    // 推演沙盤: a drafting table with compass and set square, and one sunflower
    let flower;
    S.plant(1.75, -2.1, (g) => {
      tab(g, 1.2);
      box(g, 0, .62, 0, 1.5, .07, .8, '#f9e3d8').rotation.x = .32;
      for (const sx of [-1, 1]) { beam(g, [sx * .6, 0, -.3], [sx * .6, .72, -.3], .035, C.wood, 5); beam(g, [sx * .6, 0, .3], [sx * .6, .46, .3], .035, C.wood, 5); }
      poly(g, [[0, 0], [.5, 0], [0, .5]], .03, C.coral, -.62, .74, -.1).rotation.x = -.3;
      beam(g, [.25, .78, -.05], [.42, 1.42, -.05], .02, C.dark, 5); beam(g, [.6, .74, -.05], [.42, 1.42, -.05], .02, C.dark, 5); ball(g, .42, 1.44, -.05, .05, C.gold);
    });
    S.plant(.75, -1.7, (g) => { tab(g, .3); beam(g, [0, 0, 0], [0, .78, 0], .025, C.leaf, 5); poly(g, [[0, .3], [.2, .42], [.05, .46]], .02, C.leaf); flower = keep(g, 0, .86, .02); for (let i = 0; i < 10; i++) poly(flower, [[-.05, .1], [0, .27], [.05, .1]], .02, C.gold).rotation.z = i * Math.PI / 5; disc(flower, 0, 0, .02, .12, C.bark, .03, 12); });
    // 代理城: a factory and a dish
    const puffs = [];
    S.plant(4.25, -1.65, (g) => {
      tab(g, 1.3); box(g, -.1, .32, 0, 1.2, .64, .6, '#cfe6e6');
      for (let i = 0; i < 3; i++) poly(g, [[0, 0], [.4, 0], [.4, .22], [0, .05]], .6, C.teal, -.7 + i * .4, .64, -.3);
      cyl(g, .72, .6, -.1, .09, .12, 1.2, C.slate, 8); cyl(g, .72, 1.16, -.1, .11, .11, .08, C.red, 8);
      for (let i = 0; i < 3; i++) box(g, -.48 + i * .34, .3, .31, .18, .2, .02, C.navy);
      for (let i = 0; i < 3; i++) { const p = keep(g, .72, 1.3, -.1); ball(p, 0, 0, 0, .12, C.white, 1).scale.z = .6; puffs.push(p); }
    });
    let dish; S.plant(5.3, -.6, (g) => { tab(g, .3); beam(g, [0, 0, 0], [0, .9, 0], .025, C.steel, 5); dish = keep(g, 0, .95, 0); ring(dish, 0, 0, 0, .16, .02, C.aqua, 14); ball(dish, 0, 0, 0, .05, C.gold); });
    // the sky lanterns of the last page stay in the sky once the reader has released one
    const sky = [];
    S.plant(-2.2, -.6, (g) => { for (let i = 0; i < 4; i++) { const l = keep(g, -.9 + i * .6, 2.2 + (i % 2) * .5, -.3 + (i % 3) * .3); cyl(l, 0, 0, 0, .13, .09, .26, i % 2 ? '#f6c45a' : '#f08a5a', 8); cyl(l, 0, -.15, 0, .095, .095, .04, C.deep, 8); l.visible = false; sky.push(l); } });
    S.curio(sky[1], { label: '天燈' });
    // scenery, kept sparse: the map only shows the way
    S.plant(-5.3, -2.95, (g) => cloud(g, 1.0, 2.2)); S.plant(5.1, -3.05, (g) => cloud(g, 1.2, 2.5));
    for (const [x, z, h] of [[-4.5, -2.35, .8], [-.6, -2.85, .7], [3.3, 2.85, .65], [2.95, -2.65, .75]]) S.plant(x, z, (g) => pine(g, h));
    S.plant(0.02, -2.85, (g) => { tab(g, 1.8); tag(g, '決策智慧島', 0, 1.0, .02, { h: .22, paper: '#2f3a4a', ink: '#f5e3b8', pad: .13, weight: 900 }); for (const sx of [-1, 1]) beam(g, [sx * .55, 0, 0], [sx * .55, .84, 0], .026, C.wood, 5); });

    S.on('reset', () => { const from = Math.max(0, Math.min(12, S.app.from() || 0)); pos.s = ROAD.stop(from); st.at = from; });
    S.on('enter', () => {
      const lit = S.app.stamps.has('s12-gates'); sky.forEach((l) => { l.visible = lit; });
      for (const p of PINS) marks[p.id].visible = S.app.stamps.has(p.id);
      S.hint(nextPin().node, [.2, .62, .05], '點旗子'); S.refresh();
    });
    S.ui(() => {
      const n = S.app.stamps.size, k = st.at, np = nextPin(), here = k > 0 && k === st.picked;
      return {
        caption: '',
        buttons: [here ? { id: 'enter', label: `翻到第 ${k} 頁`, primary: true } : { id: 'next', label: n >= 12 ? '再看一次' : n ? `接著看第 ${np.no} 頁` : '從第 1 頁開始', primary: true, disabled: st.driving }],
      };
    });
    S.act('enter', () => { if (st.at > 0 && !st.driving) S.go(PINS[st.at - 1].id); });
    S.act('next', () => { const p = nextPin(); if (st.at === p.no) S.go(p.id); else drive(p.no, 'enter'); });
    S.act('read', () => S.app.read(0));
    let heading = 0;
    S.tick((t) => {
      const a = ROAD.at(pos.s); let d = -a.ang - heading; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; heading += d * .25;
      van.position.set(a.x - START[0], pageY(a.x) - pageY(START[0]) + (st.driving ? Math.abs(Math.sin(t * 20)) * .018 : 0), a.z - START[1]); van.rotation.y = heading;
      pennant.rotation.y = Math.sin(t * 6) * .35;
      boat.position.y = Math.sin(t * 1.7) * .02; boat.rotation.z = Math.sin(t * 1.7) * .06;
      lanterns.forEach((l, i) => { l.rotation.z = Math.sin(t * 2 + i) * .22; });
      flower.rotation.z = t * .5; dish.rotation.y = t * 1.2;
      sky.forEach((l, i) => { l.position.y = 2.2 + (i % 2) * .5 + Math.sin(t * .7 + i * 1.7) * .14; l.rotation.z = Math.sin(t * .9 + i) * .08; });
      puffs.forEach((p, i) => { const u = (t * .35 + i / 3) % 1; p.position.set(.72 + u * .3, 1.3 + u * .9, -.1); p.scale.setScalar(.4 + u * .9); p.visible = u < .95; });
      for (const p of PINS) { const h = S.app.hoverId() === p.id; p.node.position.y += ((h ? .16 : 0) - p.node.position.y) * .2; p.node.rotation.z = Math.sin(t * 2.2 + p.no) * .03; }
    });
  },
};
export { PINS, LANDS };
