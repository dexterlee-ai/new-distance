// 第 9 頁｜廟口｜王馥蓓、周允玉〈贏在 AI 時代的隱形戰場：看見「文化暗流」，啟動企業真實的轉型動能〉p.144–149
// 掀開獅子布：舊舞獅跳不上高板凳。小智一秒做出又大又會發光的新獅頭換上，獅頭往前衝、獅尾留在原地，獅子絆成一團。
// 讀者把布掀開：底下兩個人，一個照老步子踩，一個背對著蹲著，誰也沒看誰。兩人對上眼、抓好腰帶，獅子戴著新頭一躍上凳。
import { C, keep, box, cyl, cone, ball, disc, ring, beam, poly, card, tab, tag, cratePlank, skyDisc } from '../paper.js';

const DIARY = '換新的頭之前，先看布底下。';
const LION = [.9, .75], LS = 1.2;          // where the lion stands, and the scale of its piece
const BENCH = [-1.18, .05], BH = 1.0;      // the tall bench, and the height of its top
const CLOTH = C.red, TRIM = C.gold, FUR = C.white;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

/** a lion head facing +z. glow: the new one (gold, with lights). Returns { lights: [] } for blinking. */
function lionHead(S, g, glow) {
  const T = S.T, lights = [];
  const face = glow ? C.gold : CLOTH, dark = glow ? '#c98a2c' : C.deep;
  card(g, 0, -.3, -.12, .7, .62, face, .24, .16);                         // the head block
  poly(g, [[-.38, .18], [-.2, .36], [0, .3], [.2, .36], [.38, .18], [.3, .26], [0, .24], [-.3, .26]], .05, FUR, 0, 0, .12);   // fur brow
  disc(g, 0, .27, .13, .07, glow ? C.white : '#d9d4c4', .02, 14);                // the mirror on its forehead
  cone(g, 0, .42, 0, .07, .2, glow ? C.white : TRIM, 6);                         // the horn
  for (const sx of [-1, 1]) {                                                     // eyes and ears
    disc(g, sx * .17, .08, .13, .1, C.white, .02, 16); disc(g, sx * .17, .07, .145, .05, C.ink, .015, 12);
    poly(g, [[-.07, 0], [.07, 0], [0, .2]], .04, dark, sx * .36, .2, 0).rotation.z = -sx * .5;
  }
  box(g, 0, -.1, .13, .3, .1, .04, dark); ball(g, 0, -.06, .16, .06, C.pink, 0);  // the nose
  card(g, 0, -.3, .1, .5, .16, '#7d3f35', .04, .06);                              // the jaw
  for (const sx of [-1, 0, 1]) poly(g, [[-.03, 0], [.03, 0], [0, -.06]], .02, C.white, sx * .12, -.15, .13);   // teeth
  poly(g, [[-.42, -.3], [-.36, -.42], [-.18, -.36], [0, -.44], [.18, -.36], [.36, -.42], [.42, -.3]], .06, FUR, 0, 0, .06);   // beard
  if (glow) {                                                                     // a ring of lamps round its face
    for (let i = 0; i < 12; i++) {
      const a = Math.PI * 2 * i / 12, m = new T.Mesh(new T.CircleGeometry(.032, 10), new T.MeshBasicMaterial({ color: '#fff3a0', toneMapped: false }));
      m.position.set(Math.cos(a) * .4, .02 + Math.sin(a) * .36, .14); m.userData.raw = true; g.add(m); lights.push(m);
    }
  }
  return { lights };
}

export default {
  id: 's09-undertow', land: 'model', short: '先看布底下', calm: true,
  title: 'AI 工具買了，為什麼還是不動？',
  sources: [{ n: 16 }],
  diary: DIARY,
  takeaway: '買了 AI 工具，事情還是不動：卡住的是看不見的地方（靠老經驗、怕被取代不敢講、各做各的）。先看見，再處理。',
  quote: { t: '忽視水底下的文化暗流，再強大的 AI 引擎也只能在水面上空轉。', n: 16, page: 149 },
  look: { bg: '#5a3430', table: '#c08f76', key: '#ffcf96', fill: '#f0c6c0', sky: '#ffe0c0' },   // golden dusk
  ground(G) {
    G.wash('#ecd2b4');
    G.rect(2.3, -2.2, 4.6, 1.2, '#d8b896', { r: .08 });                               // the temple's stone step
    G.rect(.3, .3, 9.2, 4.6, '#e3c4a2', { r: .2 });                                    // the square in front of the temple
    G.grid(.6, '#a77d5a22', .012);
    G.circle(BENCH[0], BENCH[1] + .1, .85, '#cfae8e');                                 // a worn spot under the bench
    G.circle(LION[0] + .2, LION[1] + .1, 1.2, '#dcbb98');
    G.marks('dot', -6, -3.6, 6, 3.6, { n: 70, col: '#cf5a3e55', size: .22, seed: 19 });   // red paper from earlier firecrackers
  },
  build(S) {
    const st = S.state({ phase: 'intro', busy: false, look: 0, grip: 0 });
    let drumT = 0, smokeT = 0, swallowBusy = false, blink = 0, lifting = null, attached = true, lampsOn = 0;

    // ---- the sun, low and golden
    let rays;
    S.plant(-4.2, -3.25, (g) => { rays = skyDisc(g, { y: .9, r: .46, col: '#f29b4c' }); });
    S.curio(rays, { id: 'sun', label: '太陽', tap: () => { S.to(rays.rotation, { z: rays.rotation.z + Math.PI / 2 }, .9, 'out'); } });

    // ---- the landmark: the temple, with swallowtail ridges sweeping up at both ends
    let swallows;
    S.plant(2.35, -2.55, (g) => {
      tab(g, 3.6);
      box(g, 0, .09, .1, 3.9, .18, 1.0, C.stone);                                       // the stone platform
      box(g, 0, .2, .55, 1.6, .06, .2, '#b89c78');
      box(g, 0, .72, 0, 3.3, 1.0, .7, '#e2c79a');                                      // the walls
      for (const x of [-1.5, -.75, .75, 1.5]) cyl(g, x, .72, .38, .08, .08, 1.0, C.red, 10);   // red pillars
      box(g, 0, .62, .36, .9, .84, .03, C.deep);                                       // the great door
      for (const sx of [-1, 1]) { box(g, sx * .22, .62, .38, .4, .76, .02, C.red); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) ball(g, sx * .22 - .12 + c * .12, .4 + r * .2, .4, .025, C.gold, 0); }
      for (const x of [-1.1, 1.1]) { box(g, x, .76, .37, .34, .34, .02, C.deep); for (let i = 0; i < 3; i++) box(g, x - .1 + i * .1, .76, .385, .03, .3, .02, C.honey); }   // lattice windows
      // the roof: a wide sweep, its eaves curling up
      const roof = [[-2.05, 0], [-1.9, .08], [-1.6, .1], [1.6, .1], [1.9, .08], [2.05, 0], [2.08, .14], [1.6, .32], [1.2, .62], [-1.2, .62], [-1.6, .32], [-2.08, .14]];
      poly(g, roof, .95, '#d98b3a', 0, 1.2, -.5);
      poly(g, roof.map(([x, y]) => [x * 1.005, y * .18]), .99, '#a95f2c', 0, 1.2, -.52);   // the dark underside line of the eaves
      for (let i = 0; i < 11; i++) box(g, -1.5 + i * .3, 1.55, .25, .03, .5, .5, '#c47a33').rotation.x = -.95;   // tile rows
      // the ridge with its swallowtails, and a pearl between two dragons
      const ridge = [[-1.25, 0], [1.25, 0], [1.5, .14], [1.95, .5], [1.7, .36], [1.35, .2], [-1.35, .2], [-1.7, .36], [-1.95, .5], [-1.5, .14]];
      poly(g, ridge, .14, C.red, 0, 1.8, -.07);
      poly(g, ridge.map(([x, y]) => [x, y * .35]), .15, C.teal, 0, 1.8, -.075);
      ball(g, 0, 2.15, 0, .13, C.gold, 1); for (const sx of [-1, 1]) poly(g, [[0, 0], [sx * .45, .02], [sx * .5, .14], [sx * .3, .18], [sx * .38, .1], [sx * .1, .1]], .06, C.leaf, sx * .15, 2.0, -.03);
      // red lanterns under the eaves
      for (const x of [-1.15, 1.15]) { beam(g, [x, 1.3, .45], [x, 1.18, .45], .01, C.ink, 4); const b = ball(g, x, 1.04, .45, .15, C.red, 1); b.scale.y = .85; cyl(g, x, .89, .45, .05, .05, .04, C.gold, 8); }
      // two swallows on the eave
      swallows = keep(g, 1.85, 1.48, .45);
      for (const dx of [0, .22]) { const b = keep(swallows, dx, 0, 0); poly(b, [[-.1, 0], [.06, .02], [.1, .06], [.04, .1], [-.06, .06], [-.16, .1], [-.12, .03]], .03, C.ink, 0, 0, 0); disc(b, .06, .06, .035, .01, C.white, .005, 6); poly(b, [[.09, .05], [.14, .05], [.09, .03]], .02, C.honey, 0, 0, .005); }
    });
    S.curio(swallows, { id: 'swallows', label: '燕子', tap: async () => {
      if (swallowBusy) return; swallowBusy = true; S.sound('whoosh');
      await S.to(swallows.position, { x: .9, y: 2.6 }, .5, 'out'); await S.to(swallows.position, { x: -.6, y: 2.3 }, .7, 'inOut'); await S.to(swallows.position, { x: 1.85, y: 1.48 }, .8, 'inOut'); swallowBusy = false;
    } });

    // ---- the incense burner in front of the temple, smoke curling up
    let burner; const smoke = [];
    S.plant(1.55, -1.35, (g) => {
      tab(g, .7); burner = keep(g);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) beam(burner, [sx * .2, 0, sz * .14], [sx * .16, .2, sz * .1], .025, '#8a6a3a', 4);
      cyl(burner, 0, .32, 0, .3, .22, .26, '#b08a4a', 12); cyl(burner, 0, .46, 0, .32, .32, .04, '#c9a45a', 12);
      for (const sx of [-1, 1]) ring(burner, sx * .34, .44, 0, .06, .015, '#8a6a3a', 10).rotation.y = Math.PI / 2;
      for (const x of [-.06, 0, .06]) { beam(burner, [x, .46, 0], [x * 1.4, .78, 0], .008, '#a03a2a', 4); ball(burner, x * 1.4, .79, 0, .014, C.coral, 0); }
      for (let i = 0; i < 4; i++) { const p = keep(burner, 0, .9, 0); const b = ball(p, 0, 0, 0, .09, '#f4ece0', 1); b.scale.z = .5; smoke.push(p); }
    }, { s: 1.15 });
    S.curio(burner, { id: 'burner', label: '香爐', tap: () => { S.sound('soft'); smokeT = 2.4; } });

    // ---- the tall bench; one length of its seat is a plank from 小智's crate
    let plank, benchTop;
    S.plant(BENCH[0], BENCH[1], (g) => {
      tab(g, 1.6);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) beam(g, [sx * .72, 0, sz * .16], [sx * .66, BH - .05, sz * .14], .04, C.bark, 6);
      for (const sx of [-1, 1]) beam(g, [sx * .69, .35, -.16], [sx * .69, .35, .16], .025, C.bark, 5);
      beam(g, [-.69, .35, 0], [.69, .35, 0], .025, C.bark, 5);
      box(g, -.39, BH - .03, 0, .78, .06, .42, C.wood);
      plank = cratePlank(g, .4, BH - .03, 0, { len: .76, h: .42, thick: .06 }); plank.rotation.x = -Math.PI / 2;
      for (const x of [.08, .72]) for (const z of [-.14, .14]) disc(g, x, BH + .002, z, .018, C.dark, .01, 6).rotation.x = -Math.PI / 2;   // nails
      benchTop = keep(g, 0, BH + .03, 0);
    });
    S.curio(plank, { id: 'plank', label: '凳面', tap: () => { S.sound('tap'); } });

    // ---- the place sign: the only words on the page
    S.plant(-4.75, .9, (g) => {
      tab(g, .5); beam(g, [0, 0, 0], [0, 1.25, 0], .035, C.bark, 6);
      tag(g, '廟口', 0, 1.02, .04, { h: .27, paper: C.white, ink: C.navy });
    });

    // ---- a string of firecrackers on a pole
    let crackers; const pops = [];
    S.plant(-2.55, -1.75, (g) => {
      tab(g, .5); beam(g, [0, 0, 0], [0, 1.7, 0], .03, C.bark, 6); beam(g, [0, 1.68, 0], [.42, 1.62, 0], .02, C.bark, 5);
      crackers = keep(g, .42, 1.6, 0);
      beam(crackers, [0, 0, 0], [0, -1.0, 0], .008, C.ink, 4);
      for (let i = 0; i < 10; i++) { const k = keep(crackers, 0, -.12 - i * .09, 0); for (const sx of [-1, 1]) { const c = cyl(k, sx * .045, 0, 0, .022, .022, .1, C.red, 8); c.rotation.z = sx * .9; } pops.push(k); }
    });
    S.curio(crackers, { id: 'crackers', label: '鞭炮', tap: async () => {
      for (let i = pops.length - 1; i >= 6; i--) { S.sound('tick'); S.pop(pops[i], 1.8); S.burst(S.world(pops[i]), { n: 4, up: 1, speed: .8, colors: [C.red, C.gold] }); await S.wait(.08); }
    } });

    // ---- the big drum, and 小策 beside it
    let drum, skin, ce;
    S.plant(3.75, .75, (g) => {
      tab(g, 1);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) beam(g, [sx * .35, 0, sz * .3], [sx * .3, .45, sz * .25], .03, C.bark, 5);
      drum = keep(g, 0, .45, 0);
      cyl(drum, 0, .28, 0, .48, .44, .56, C.red, 18); cyl(drum, 0, .28, 0, .5, .5, .08, C.gold, 18);
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; ball(drum, Math.cos(a) * .49, .54, Math.sin(a) * .49, .025, C.gold, 0); }
      skin = keep(drum, 0, .57, 0); cyl(skin, 0, 0, 0, .46, .46, .02, '#f3e2c0', 18);
      for (const [x, r] of [[-.15, .5], [.18, -.4]]) { beam(drum, [x, .6, .1], [x + r * .5, .95, .3], .022, C.wood, 5); }
    }, { s: 1.05 });
    S.curio(drum, { id: 'drum', label: '大鼓', tap: () => { S.sound('stamp'); drumT = .5; S.pop(skin, 1.12); } });
    S.plant(2.75, 1.75, (g) => { ce = S.person(g, { s: 1, kind: 'ce', coat: C.navy }); });
    { const c = S.curio(ce.root, { id: 'ce', label: '小策', tap: () => ce.hop() }); ce.propId = c.id; }

    // ---- 小智, and the three spare heads it will make
    let zhi, spare; const spareHeads = [], spareEyes = [];
    S.plant(-2.35, 1.35, (g) => { zhi = S.robot(g, { s: 1, lights: S.index - 1 }); });
    S.hero(zhi, { ready: () => st.phase === 'ready', go });
    S.plant(-3.45, .45, (g) => {
      tab(g, .8); spare = keep(g);
      for (let i = 0; i < 3; i++) {
        const k = keep(spare, (i - 1) * .08, .26 + i * .44, 0); k.scale.setScalar(.62); k.rotation.y = (i - 1) * .2;
        lionHead(S, k, true); const e = keep(k, 0, .07, .15); for (const sx of [-1, 1]) box(e, sx * .17, 0, 0, .2, .12, .02, C.gold); e.scale.y = .001; spareEyes.push(e);
        k.visible = false; spareHeads.push(k);
      }
    });
    S.curio(spare, { id: 'spare', label: '備用獅頭', tap: async () => { S.sound('tick'); for (const e of spareEyes) { S.to(e.scale, { y: 1 }, .12, 'out'); } await S.wait(.35); for (const e of spareEyes) S.to(e.scale, { y: .001 }, .15, 'out'); } });

    // ---- the lion: a head, a cloth, and two people under it (the front one holds the head, the back one is the tail)
    let tail, lion, head, oldHead, newHead, cloth, clothF, clothB, mid, front, back, grab, newLights = [];
    S.plant(LION[0], LION[1], (g) => {
      lion = keep(g);
      front = S.person(lion, { x: -.45, s: .85, kind: 'adult', coat: C.white, legs: C.gold, prop: false });
      back = S.person(lion, { x: .45, s: .85, kind: 'adult', coat: C.pink, legs: C.gold, hair: C.bark, prop: false });
      back.root.scale.y = .85 * .8;                             // the tail is always bent over
      // the cloth: a front half, a back half and a middle that stretches between them
      cloth = keep(lion);
      clothF = keep(cloth, -.45, 0, 0);
      poly(clothF, [[-.4, .35], [.38, .35], [.38, .98], [.1, 1.12], [-.25, 1.1], [-.4, .95]], .56, CLOTH, 0, 0, -.28);
      for (const [x, y] of [[-.2, .7], [.1, .82], [.05, .5], [-.25, .45]]) disc(clothF, x, y, .29, .07, TRIM, .02, 3).rotation.z = Math.PI / 2;
      for (let i = 0; i < 8; i++) poly(clothF, [[-.05, 0], [.05, 0], [0, -.09]], .03, i % 2 ? FUR : TRIM, -.35 + i * .1, .36, .27);
      clothB = keep(cloth, .45, 0, 0);
      poly(clothB, [[-.38, .28], [.4, .28], [.44, .62], [.3, .82], [-.1, .95], [-.38, .98]], .56, CLOTH, 0, 0, -.28);
      for (const [x, y] of [[-.15, .75], [.15, .6], [-.2, .45]]) disc(clothB, x, y, .29, .07, TRIM, .02, 3).rotation.z = Math.PI / 2;
      for (let i = 0; i < 8; i++) poly(clothB, [[-.05, 0], [.05, 0], [0, -.09]], .03, i % 2 ? FUR : TRIM, -.33 + i * .1, .29, .27);
      tail = keep(clothB, .42, .66, 0); poly(tail, [[0, 0], [.22, .14], [.3, .32], [.18, .22], [.06, .2]], .08, FUR, 0, 0, -.04);
      mid = keep(cloth, 0, 0, 0); box(mid, 0, .63, 0, 1, .68, .54, CLOTH); box(mid, 0, .31, .272, 1, .04, .01, TRIM); mid.scale.x = .001;
      // the heads: the old red one, and the new one (hidden)
      head = keep(lion, -1.0, .78, .05); head.rotation.y = -.3;
      oldHead = keep(head); lionHead(S, oldHead, false);
      newHead = keep(head); newHead.scale.setScalar(1.18); newLights = lionHead(S, newHead, true).lights; newHead.visible = false;
      // the reader's grip on the cloth (only there while it is the reader's turn)
      grab = keep(lion, -.35, .5, .3); grab.visible = false;
    }, { s: LS });
    S.pad(grab, .32, [0, 0, 0]);
    const lionTap = S.curio(cloth, { id: 'lion', label: '舞獅', tap: () => { if (st.phase === 'touch') touch(false); else if (st.phase === 'ready' || st.phase === 'done') { front.hop(.12); back.hop(.12); S.wiggle(head, .15); } } });
    for (const p of [front, back]) p.propId = lionTap.id;

    // keep the three cloth pieces over the two people, and the head on the front person
    function follow() {
      clothF.position.x = front.root.position.x; clothB.position.x = back.root.position.x;
      const a = front.root.position.x + .36, b = back.root.position.x - .36;
      mid.position.x = (a + b) / 2; mid.scale.x = Math.max(.001, b - a);
      if (attached) { head.position.x = front.root.position.x - .55; head.position.y = .78 + front.inner.position.y; }
    }

    // ---- the story
    async function jump(to, dur = .7, up = .7) {          // the whole lion jumps, as one
      S.sound('whoosh'); const y0 = lion.position.y;
      S.to(lion.position, { x: to.x, z: to.z }, dur, 'inOut');
      await S.to(lion.position, { y: Math.max(y0, to.y) + up }, dur * .5, 'out'); await S.to(lion.position, { y: to.y }, dur * .5, 'in');
    }
    const benchLocal = () => { const v = S.local(lion.parent, S.world(benchTop)); return v; };

    async function go() {
      if (st.phase !== 'ready') return; S.set({ phase: 'busy' });
      zhi.cheer(); S.sound('whoosh');
      // a new head in a second: big, bright, and three spares besides
      S.burst(S.world(head, [0, .2, .2]), { n: 16, up: 1.8, speed: 1.1, colors: ['#fff3a0', C.gold] });
      await S.hide(oldHead, .2); newHead.visible = true; newHead.scale.setScalar(.001); S.to(newHead.scale, { x: 1.18, y: 1.18, z: 1.18 }, .45, 'back'); S.sound('pop'); lampsOn = 1;
      for (const k of spareHeads) { await S.wait(.12); S.show(k, .3); S.sound('tick'); }
      await S.wait(.5); zhi.still();
      // the new head charges ahead; the tail does not move; the lion trips into a heap
      front.walking = true; S.sound('whoosh');
      await S.to(front.root.position, { x: -1.2 }, .45, 'in');
      front.walking = false; S.sound('stamp');
      attached = false;
      S.to(head.position, { x: -2.0, y: .3, z: .3 }, .35, 'bounce'); S.to(head.rotation, { z: .55, y: -.1 }, .35, 'out');
      S.to(cloth.scale, { y: .42 }, .3, 'in'); S.to(cloth.position, { y: -.08 }, .3, 'in');
      await S.wait(.12); front.root.visible = false; back.root.visible = false;
      S.burst(S.world(lion, [-.4, .3, 0]), { n: 10, up: 1, speed: .8, colors: ['#e9d3b0', '#ffffff'] });
      await S.wait(.6); ce.doubt(); blink = 1;
      await S.wait(.8);
      S.set({ phase: 'touch' }); grab.visible = true; S.hint(grab, [0, .1, 0], '掀開看看');
    }

    // lifting the cloth: u = 0 (a heap) .. 1 (held up high, the two people showing)
    function lift(u) {
      cloth.position.y = -.08 + u * .95; cloth.scale.y = .42 + .58 * Math.min(1, u * 1.6); cloth.rotation.z = -.12 * u;
      const show = u > .04; front.root.visible = back.root.visible = show;
      if (show) { const k = Math.max(.001, Math.min(1, u * 1.5)); front.root.scale.y = .85 * k; back.root.scale.y = .85 * .66 * k; }
    }
    const pull = S.pull(grab, { id: 'cloth', label: '掀開布', from: [-.35, .5, .3], to: [-.35, 1.45, .3],
      move: (u) => { if (st.phase === 'touch' && !st.busy) lift(u); },
      end: (u) => { if (st.phase !== 'touch' || st.busy) return; if (u > .55) touch(true); else { lifting = { u, to: 0 }; } } });

    async function touch(byHand) {
      if (st.phase !== 'touch' || st.busy) return; st.busy = true; S.hint(null); S.refresh();
      lifting = { u: pull.value(), to: 1 }; await S.wait(byHand ? .3 : .8); lifting = null; pull.set(1); lift(1); grab.visible = false;
      // under the cloth: the front one keeps doing the old steps; the back one crouches facing the other way
      blink = 0; front.walking = true; S.sound('soft');
      await S.wait(1.4);
      front.walking = false;
      // they see each other
      S.to(front.root.rotation, { y: .45 }, .35, 'out'); S.to(back.root.rotation, { y: -.45 }, .35, 'out'); S.sound('tick');
      front.hop(.1); back.hop(.1); st.look = 1;
      await S.wait(.6);
      S.to(back.root.scale, { y: .85 * .85 }, .3, 'out');
      await S.walk(back, { x: front.root.position.x + .86 }, .6); back.root.scale.x = .85;
      st.grip = 1; S.sound('pop');                                                   // the back one takes the front one's belt
      await S.wait(.5);
      // the head goes back on, the cloth comes down over both of them
      S.to(front.root.rotation, { y: 0 }, .3); S.to(back.root.rotation, { y: 0 }, .3);
      S.to(head.rotation, { z: 0, y: -.3 }, .35, 'out'); await S.to(head.position, { x: front.root.position.x - .55, y: .78, z: .05 }, .35, 'out'); attached = true;
      S.to(back.root.scale, { y: .85 * .8 }, .3);
      S.to(cloth.rotation, { z: 0 }, .35, 'in'); await S.to(cloth.position, { y: 0 }, .35, 'in'); cloth.scale.y = 1; S.sound('tap');
      st.grip = 0; st.look = 0;
      await S.wait(.25);
      // one leap, and it stands on the bench, new head shining
      const b = benchLocal(), cx = (front.root.position.x + back.root.position.x) / 2;
      S.sound('rise');
      await jump({ x: b.x - cx + .22, y: b.y, z: b.z }, .9, .8);   // a little to the right, so its head clears the bench's end
      lampsOn = 2; S.pop(newHead, 1.25); S.sound('stamp'); drumT = .5; S.pop(skin, 1.12);
      for (let i = 0; i < 4; i++) S.wait(i * .22).then(() => { S.burst(S.world(head, [(i - 1.5) * .4, .3, .2]), { n: 14, up: 2.4, speed: 1.3, colors: [C.red, C.gold, '#fff3a0'] }); S.sound('pop'); });
      ce.still(); ce.cheer(); zhi.cheer();
      await S.wait(.8);
      S.learn(zhi);
      S.set({ phase: 'done' }); await S.wait(1); S.done();
    }
    S.act('go', go); S.act('touch', () => touch(false));
    S.on('reset', () => { drumT = 0; smokeT = 0; swallowBusy = false; blink = 0; lifting = null; attached = true; lampsOn = 0; follow(); });
    S.on('enter', async () => {
      // the old lion tries the bench twice, and cannot get up
      await S.wait(.4);
      const home = lion.position.clone(), b = benchLocal();
      for (let i = 0; i < 2; i++) {
        const to = { x: home.x + (b.x - home.x - .6) * .35, y: 0, z: home.z + (b.z - home.z) * .3 };
        await jump(to, .5, .35 + i * .1); S.sound('tap'); front.hop(.08);
        await S.to(lion.position, { x: home.x, z: home.z }, .35, 'out');
      }
      ce.doubt(); await S.wait(.3); ce.still(); S.set({ phase: 'ready' });
    });
    S.ui(() => ({
      caption: st.phase === 'done' ? '今天學到：' + DIARY : '',
      buttons: st.phase === 'ready' ? [{ id: 'go', label: '交給我！', primary: true }]
        : st.phase === 'busy' ? [{ id: 'go', label: '交給我！', primary: true, disabled: true }]
          : st.phase === 'touch' ? [{ id: 'touch', label: '掀開布', primary: true, disabled: st.busy }] : [],
    }));

    S.tick((t, dt) => {
      follow();
      rays.rotation.z += dt * .05;
      if (drumT > 0) drumT -= dt;
      smokeT = Math.max(0, smokeT - dt);
      smoke.forEach((p, i) => { const u = (t * .3 + i / 4) % 1, sw = smokeT > 0 ? 1 : 0;
        p.position.set(Math.sin(u * 6 + i) * .07 + sw * Math.cos(t * 5 + i * 1.6) * .3, .9 + u * (sw ? .5 : .9), sw * Math.sin(t * 5 + i * 1.6) * .3); p.scale.setScalar(Math.max(.001, (.5 + u) * (1 - u * u))); });
      // the lifted cloth springs back when let go too early, or rises by itself after the button
      if (lifting) { lifting.u += (lifting.to - lifting.u) * Math.min(1, dt * 7); pull.set(lifting.u); lift(lifting.u); if (lifting.to === 0 && lifting.u < .01) { pull.set(0); lift(0); lifting = null; } }
      // the new head's lamps: blink while it lies in the heap, shine when it stands on the bench
      newLights.forEach((m, i) => { const on = lampsOn === 2 ? true : blink ? ((t * 4 + i * .5) | 0) % 2 === 0 : lampsOn === 1 ? (i + ((t * 3) | 0)) % 3 !== 0 : false; m.visible = on; });
      // under the cloth: they look away from each other, until they look at each other
      if (front.root.visible && cloth.position.y > .3) {
        const look = st.look ? 1 : -1;
        front.eyes.position.x = .04 * (st.look ? 1 : -1); front.head.rotation.y = -.45 * -look;
        back.eyes.position.x = .04 * (st.look ? -1 : 1); back.head.rotation.y = .45 * -look;
        if (!st.look) { front.root.rotation.y = -.5; back.root.rotation.y = .6; }
        front.armR.rotation.z = 2.5; front.armL.rotation.z = -2.5;                  // still holding up a head that is not there
        if (st.grip) back.armL.rotation.z = -1.35;
      }
      tail.rotation.z = Math.sin(t * 3) * .15;
    });
  },
};
