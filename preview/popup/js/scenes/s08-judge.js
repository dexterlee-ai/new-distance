// 第 8 頁｜辦桌棚｜強義明〈「衡斷力 (Judgment)」將成為最稀缺的競爭力〉p.128–135；朱芳儀〈AI 代理時代的增長架構師〉p.36–43
// 你點就好：小智一秒寫出四十道菜的長菜單，繞在轉盤上；每個人都把轉盤推給下一個人，桌上還是沒有菜。
// 讀者把轉盤轉到請客的阿嬤面前，她圈了一道；菜上桌，帳單也順著轉盤轉到她面前：點菜的人，也是買單的人。
import { C, keep, group, box, cyl, cone, ball, disc, ring, beam, poly, slab, card, tri, quad, tab, tag, cratePlank, skyDisc } from '../paper.js';

const DIARY = '點菜的人，也是買單的人。';
const TC = [2.1, .5], TS = 1.5;            // TS: the table piece is planted at this scale                       // the round table's centre on the page
const MR = .6, NSEG = 20, DA = Math.PI * 2 * .9 / NSEG;   // the menu: a strip of twenty panels round the turntable, two dishes each
const FOOD = [C.honey, C.leaf, C.coral, C.red, C.gold, '#b9803f', C.mint];
const STRIPE = [C.red, C.white, C.blue];
const GRAN = [.62, 1.72], ABO = [1.4, -1.32], CE = [2.95, -1.22];   // the three guests' places
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export default {
  id: 's08-judge', land: 'model', short: '你點就好', calm: true,
  title: 'AI 給了四十個方案，聽誰的？',
  sources: [{ n: 14 }, { n: 5 }],
  diary: DIARY,
  takeaway: 'AI 幾秒就給出一大堆方案。難的不是答案不夠，是解法太多；選哪一個、為結果負責的，是人。',
  quote: { t: 'AI 可以生成答案、提供選項、加速執行；但為決策負責、為價值定錨的，始終是人。', n: 14, page: 135 },
  look: { bg: '#53303a', table: '#bb8f8a', key: '#ffdcb4', fill: '#f0cfd6', sky: '#ffe9d6' },   // late afternoon
  ground(G) {
    G.wash('#ead6c6');
    G.marks('dot', -6, -3.6, 6, 3.6, { n: 120, col: '#cf5a3e44', size: .2, seed: 8 });       // paper confetti from an earlier feast
    G.rect(2.1, -2.32, 3.6, 1.6, '#d9bfae', { r: .1 });                                          // the shade under the tent
    G.circle(TC[0] + .1, TC[1] + .16, 1.98, '#c9a597');                                         // the table's shadow
    G.rect(-1.55, -.35, 1.3, .9, '#d8c0ae', { r: .12 });                                         // the cart's spot
    G.path([[-6, 2.1], [-2.6, 1.9], [-.4, 2.3], [3, 2.6], [6, 2.4]], { w: .05, col: '#b9998455', dash: [.16, .14] });
  },
  build(S) {
    const st = S.state({ phase: 'intro', busy: false });
    let puffRate = .18, dogT = 0, eatT = -1, circleT = -1, pointing = false;
    const PHI = Math.atan2(GRAN[1] - TC[1], GRAN[0] - TC[0]);      // the direction of 阿嬤's seat, seen from the table's centre

    // ---- the sun, low in the west
    let rays;
    S.plant(-3.3, -3.25, (g) => { rays = skyDisc(g, { y: 1.4, r: .42 }); });
    S.curio(rays, { id: 'sun', label: '太陽', tap: () => { S.to(rays.rotation, { z: rays.rotation.z + Math.PI / 2 }, .9, 'out'); } });

    // ---- the landmark: a red, white and blue striped banquet tent
    S.plant(2.1, -2.32, (g) => {
      const HW = 1.65, ZF = .62, ZB = -.62, YE = 2.1, YR = 2.75, n = 11, sw = HW * 2 / n;
      tab(g, 3.2);
      for (const x of [-HW + .05, HW - .05]) for (const z of [ZF, ZB]) beam(g, [x, 0, z], [x, YE, z], .035, C.steel, 6);
      for (let i = 0; i < n; i++) {
        const x0 = -HW + i * sw, x1 = x0 + sw, col = STRIPE[i % 3];
        quad(g, [x0, YE, ZF + .06], [x1, YE, ZF + .06], [x1, YR, 0], [x0, YR, 0], col);       // front slope
        quad(g, [x0, YE, ZB - .06], [x1, YE, ZB - .06], [x1, YR, 0], [x0, YR, 0], col);       // back slope
        // the scalloped valance along the front eave (right to left along its lower edge)
        const sc = []; for (let j = 0; j <= 8; j++) { const a = Math.PI * j / 8; sc.push([sw / 2 + Math.cos(a) * sw / 2, -Math.sin(a) * .16]); }
        poly(g, [[0, .1], [sw, .1], ...sc], .02, col, x0, YE - .1, ZF + .07);
      }
      // gable ends and a ridge pole
      for (const x of [-HW, HW]) tri(g, [x, YE, ZF + .06], [x, YR, 0], [x, YE, ZB - .06], C.white);
      beam(g, [-HW - .05, YR + .01, 0], [HW + .05, YR + .01, 0], .03, C.steel, 6);
      // two paper lanterns under the front eave
      for (const x of [-.9, .9]) { beam(g, [x, YE - .1, ZF], [x, YE - .32, ZF], .01, C.ink, 4); const b = ball(g, x, YE - .46, ZF, .14, C.red, 1); b.scale.y = .85; cyl(g, x, YE - .33, ZF, .06, .06, .04, C.gold, 8); cyl(g, x, YE - .59, ZF, .06, .06, .04, C.gold, 8); }
    });

    // ---- the place sign: the only words on the page
    S.plant(-4.4, .55, (g) => {
      tab(g, .5); beam(g, [0, 0, 0], [0, 1.25, 0], .035, C.bark, 6);
      tag(g, '辦桌棚', 0, 1.02, .04, { h: .27, paper: C.white, ink: C.navy });
    });

    // ---- a stack of red plastic stools
    let stools;
    S.plant(-3.2, -.7, (g) => {
      tab(g, .7); stools = keep(g);
      for (let i = 0; i < 5; i++) { const y = i * .13; cyl(stools, 0, .2 + y, 0, .26, .3, .1, C.red, 10); for (const sx of [-1, 1]) box(stools, sx * .2, .1 + y, .12, .05, .2, .03, '#b84a33'); }
      cyl(stools, 0, .2 + 4 * .13 + .06, 0, .26, .26, .03, '#e06a4c', 10);
    }, { s: 1.15 });
    S.curio(stools, { id: 'stools', label: '塑膠椅', tap: () => { S.sound('tap'); S.wiggle(stools, .3); } });

    // ---- the serving cart: its tray is a plank from 小智's crate; the steamer rides on it
    let plank, steamer, lid; const puffs = [];
    S.plant(-1.6, -.4, (g) => {
      tab(g, 1.1);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { beam(g, [sx * .42, .08, sz * .2], [sx * .42, .56, sz * .2], .02, C.steel, 5); disc(g, sx * .42, .07, sz * .24, .07, C.dark, .04, 10); }
      box(g, 0, .25, 0, .9, .03, .44, '#b9b4a8');
      beam(g, [.45, .56, -.2], [.62, .78, -.2], .02, C.steel, 5); beam(g, [.45, .56, .2], [.62, .78, .2], .02, C.steel, 5); beam(g, [.62, .78, -.2], [.62, .78, .2], .025, C.dark, 5);
      plank = cratePlank(g, 0, .58, 0, { len: .96, h: .48, thick: .05 }); plank.rotation.x = -Math.PI / 2;
      steamer = keep(g, -.05, .61, 0);
      for (let i = 0; i < 3; i++) { cyl(steamer, 0, .09 + i * .17, 0, .3, .3, .15, i % 2 ? C.kraft : C.honey, 14); cyl(steamer, 0, .17 + i * .17, 0, .31, .31, .02, C.wood, 14); }
      lid = keep(steamer, 0, .52, 0); const d = ball(lid, 0, 0, 0, .3, C.honey, 1); d.scale.y = .35; ball(lid, 0, .11, 0, .045, C.wood, 0);
      for (let i = 0; i < 3; i++) { const p = keep(steamer, 0, .7, 0); const b = ball(p, 0, 0, 0, .13, C.white, 1); b.scale.z = .5; puffs.push(p); }
    }, { s: 1.2 });
    S.curio(steamer, { id: 'steamer', label: '蒸籠', tap: async () => { S.sound('soft'); puffRate = 1.1; await S.to(lid.position, { y: .7 }, .2, 'out'); await S.to(lid.position, { y: .52 }, .4, 'bounce'); } });
    S.curio(plank, { id: 'plank', label: '托板', tap: () => { S.sound('tap'); } });

    // ---- the red round table and its turntable
    let tt, swirl, pen, ringMark, platter, bill, soda, cap, sticks, purse, flap; const segs = [], chops = [], steamUp = [];
    S.plant(TC[0], TC[1], (g) => {
      tab(g, 1.6);
      cyl(g, 0, .25, 0, 1.14, 1.2, .26, '#b84a33', 30);
      cyl(g, 0, .4, 0, 1.12, 1.12, .05, C.red, 30);
      for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2; box(g, Math.cos(a) * 1.17, .18, Math.sin(a) * 1.17, .01, .12, .2, '#a9432f').rotation.y = -a; }
      // a plate and a pair of chopsticks at each seat
      for (const [sx, sz] of [GRAN, ABO, CE, [4.0, .9]]) {
        const a = Math.atan2(sz - TC[1], sx - TC[0]), x = Math.cos(a) * .9, z = Math.sin(a) * .9;
        cyl(g, x, .435, z, .15, .13, .025, C.white, 16); cyl(g, x, .45, z, .1, .1, .008, '#f0e6d2', 16);
      }
      // two curved arrows: the menu goes round and round (shown while nobody chooses)
      swirl = keep(g, 0, .82, 0);
      for (const a0 of [0, Math.PI]) { const R = .88, n = 9, span = 1.5; let prev = null;
        for (let j = 0; j <= n; j++) { const a = a0 + span * j / n, q = [Math.cos(a) * R, 0, Math.sin(a) * R]; if (prev) beam(swirl, prev, q, .032, C.ink, 5); prev = q; }
        const a = a0 + span, hd = cone(swirl, Math.cos(a) * R, 0, Math.sin(a) * R, .08, .2, C.ink, 8); hd.rotation.set(0, -a - Math.PI / 2, -Math.PI / 2); }
      swirl.visible = false;
      // the turntable
      tt = keep(g, 0, .43, 0);
      cyl(tt, 0, .02, 0, .74, .74, .03, '#f6efe2', 32); cyl(tt, 0, .04, 0, .1, .1, .02, '#e2d6bf', 12);
      // the long menu: twenty panels, two little dishes drawn on each
      for (let i = 0; i < NSEG; i++) {
        const a = -(i + .5) * DA - .1, k = keep(tt, Math.cos(a) * MR, .035, Math.sin(a) * MR); k.rotation.y = Math.PI / 2 - a;
        const ln = group(k); ln.rotation.x = .62; k.userData.lean = ln;                // the strip leans out, so its dishes face up
        card(ln, 0, 0, -.006, .17, .24, '#fffaf0', .012, .02);
        box(ln, 0, .232, .008, .17, .016, .004, C.red);
        for (const [j, y] of [[0, .07], [1, .158]]) { disc(ln, 0, y, .012, .045, C.white, .006, 14); disc(ln, 0, y, .016, .028, FOOD[(i * 2 + j) % FOOD.length], .004, 10); }
        k.visible = false; segs.push(k);
      }
      // the circle 阿嬤 draws, on the dish next to the pen
      ringMark = keep(segs[0].userData.lean, 0, .158, .026); ring(ringMark, 0, 0, 0, .062, .012, C.red, 18); ringMark.visible = false;
      // the pen clipped to the end of the menu
      pen = keep(tt, Math.cos(0) * MR, .035, Math.sin(0) * MR); pen.rotation.y = Math.PI / 2;
      { const p = keep(pen); p.rotation.z = -.32;
        beam(p, [0, .0, .02], [0, .36, .02], .032, C.navy, 8); cone(p, 0, -.035, .02, .032, .07, C.ink, 8).rotation.z = Math.PI;
        cyl(p, 0, .38, .02, .036, .036, .08, C.gold, 8); box(p, .04, .3, .02, .012, .12, .02, C.gold); }
      pen.visible = false;
      // the dish that comes (hidden): a whole fish on a big oval platter
      platter = keep(tt, 0, .04, 0);
      { const pl = cyl(platter, 0, .02, 0, .3, .27, .04, C.white, 24); pl.scale.z = .72; const pi = cyl(platter, 0, .045, 0, .25, .25, .006, '#f3e6c8', 24); pi.scale.z = .66;
        const fish = group(platter); fish.scale.setScalar(.82);
        slab(fish, [[-.24, 0], [-.12, -.11], [.06, -.12], [.18, -.06], [.2, 0], [.18, .06], [.06, .12], [-.12, .11]], .05, '#e07a45', .05);
        slab(fish, [[.18, 0], [.32, -.1], [.3, 0], [.32, .1]], .04, '#cf5a3e', .05);
        disc(fish, -.15, .1, .0, .018, C.ink, .01, 8).rotation.x = -Math.PI / 2;
        for (const [x, z] of [[-.05, .14], [.08, -.15], [-.22, -.12], [.26, .12]]) ball(fish, x, .08, z, .045, C.leaf, 0);
        for (const x of [-.1, .05]) beam(fish, [x, .1, -.09], [x + .03, .1, .09], .008, '#7d3f35', 4);
        for (let i = 0; i < 2; i++) { const p = keep(platter, -.05 + i * .12, .3, 0); const b = ball(p, 0, 0, 0, .09, C.white, 1); b.scale.z = .5; steamUp.push(p); } }
      platter.visible = false;
      // the bill (hidden): a slip held down by coins on a small plate. It turns to face the reader wherever the turntable is.
      bill = keep(tt, 0, .035, 0);
      { cyl(bill, 0, .015, 0, .15, .12, .03, C.white, 16);
        const sl = keep(bill, 0, .03, -.03); sl.rotation.x = -.22;
        card(sl, 0, 0, 0, .4, .54, '#fffdf4', .014, .03);
        for (let i = 0; i < 4; i++) box(sl, -.03 + (i % 2) * .03, .47 - i * .08, .017, .3 - (i % 2) * .06, .024, .004, '#8a8174');
        box(sl, 0, .13, .017, .32, .04, .004, C.red); box(sl, 0, .07, .017, .32, .014, .004, C.red);
        for (let i = 0; i < 4; i++) cyl(bill, -.05 + (i % 2) * .09, .035 + Math.floor(i / 2) * .024, .07, .045, .045, .02, C.gold, 12); }
      bill.visible = false;
      // the chopstick holder and a bottle of soda: still parts of the table, they move when tapped
      sticks = keep(g, .95, .43, -.15);
      { cyl(sticks, 0, .12, 0, .09, .08, .24, C.kraft, 10); cyl(sticks, 0, .24, 0, .095, .095, .02, C.wood, 10);
        const inner = keep(sticks, 0, 0, 0); inner.name = 'in'; for (let i = 0; i < 6; i++) { const a = i * 1.05; beam(inner, [Math.cos(a) * .04, .05, Math.sin(a) * .04], [Math.cos(a) * .07, .44, Math.sin(a) * .07], .008, i % 2 ? '#7d3f35' : C.bark, 4); } }
      soda = keep(g, .72, .43, .62);
      { cyl(soda, 0, .16, 0, .075, .075, .32, '#6fae8f', 10); cone(soda, 0, .38, 0, .075, .12, '#6fae8f', 10); cyl(soda, 0, .45, 0, .028, .028, .06, '#6fae8f', 8);
        box(soda, 0, .17, .075, .1, .1, .01, C.white);
        cap = keep(soda, 0, .49, 0); cyl(cap, 0, 0, 0, .036, .036, .025, C.red, 10); }
      // three pairs of chopsticks that reach for the fish (hidden until it comes)
      for (const [sx, sz] of [GRAN, ABO, CE]) {
        const a = Math.atan2(sz - TC[1], sx - TC[0]), k = keep(g, Math.cos(a) * .75, .63, Math.sin(a) * .75); k.rotation.y = -a;
        for (const dz of [-.02, .02]) beam(k, [0, 0, dz], [-.5, -.12, dz * .3], .01, C.bark, 4);
        k.visible = false; chops.push(k);
      }
    }, { s: TS });
    S.curio(sticks, { id: 'sticks', label: '筷子筒', tap: async () => { S.sound('tick'); const inn = sticks.getObjectByName('in'); await S.to(inn.position, { y: .14 }, .15, 'out'); await S.to(inn.position, { y: 0 }, .35, 'bounce'); } });
    S.curio(soda, { id: 'soda', label: '汽水', tap: async () => { S.sound('pop'); S.burst(S.world(soda, [0, .55, 0]), { n: 8, up: 1.4, speed: .7, colors: ['#ffffff', '#d8f0e4'] }); await S.to(cap.position, { y: .9 }, .25, 'out'); await S.to(cap.position, { y: .49 }, .45, 'bounce'); } });

    // ---- the dog under the table
    let dog, tail;
    S.plant(2.95, 2.42, (g) => {
      dog = keep(g);
      const b = ball(dog, 0, .16, 0, .17, C.honey, 1); b.scale.set(1.35, .75, .8);
      const h = keep(dog, -.2, .3, .04); ball(h, 0, 0, 0, .11, C.honey, 1); for (const sx of [-1, 1]) poly(h, [[-.03, 0], [.03, 0], [0, -.12]], .02, C.wood, sx * .07, .07, .02);
      for (const sx of [-1, 1]) disc(h, sx * .04, .02, .1, .014, C.ink, .01, 8); ball(h, -.0, -.035, .1, .022, C.ink, 0);
      for (const x of [-.12, .12]) box(dog, x, .05, .06, .05, .1, .05, C.honey);
      tail = keep(dog, .22, .2, 0); beam(tail, [0, 0, 0], [.14, .12, 0], .02, C.honey, 4);
    }, { s: 1.1 });
    S.curio(dog, { id: 'dog', label: '小狗', tap: () => { S.sound('soft'); dogT = 1.6; } });

    // ---- the guests: 阿嬤 hosts, 阿伯 and 小策 sit at the back of the table
    let gran, abo, ce;
    S.plant(GRAN[0], GRAN[1], (g) => {
      gran = S.person(g, { s: 1, kind: 'elder', coat: '#b5654f' });
      purse = keep(g, .34, .42, .26); box(purse, 0, .11, 0, .32, .22, .1, C.plum); beam(purse, [-.1, .22, 0], [0, .34, 0], .014, C.gold, 4); beam(purse, [0, .34, 0], [.1, .22, 0], .014, C.gold, 4);
      flap = keep(purse, 0, .22, .052); box(flap, 0, -.05, 0, .32, .1, .014, '#83506b'); ball(flap, 0, -.095, .012, .024, C.gold, 0);
      purse.visible = false;
    });
    S.plant(ABO[0], ABO[1], (g) => { abo = S.person(g, { s: 1.12, kind: 'adult', coat: C.blue, hair: '#8f8a80' }); });
    S.plant(CE[0], CE[1], (g) => { ce = S.person(g, { s: 1.12, kind: 'ce', coat: C.navy }); });
    for (const [p, id, label] of [[gran, 'gran', '阿嬤'], [abo, 'abo', '阿伯'], [ce, 'ce', '小策']]) { const c = S.curio(p.root, { id, label, tap: () => p.hop() }); p.propId = c.id; }

    // ---- 小智
    let zhi;
    S.plant(-.7, 1.45, (g) => { zhi = S.robot(g, { s: 1.1, lights: S.index - 1 }); });
    S.hero(zhi, { ready: () => st.phase === 'ready', go });

    // ---- the story
    const penAngle = () => wrap(-tt.rotation.y);          // where the pen is now, seen from the table's centre (world angle)
    async function go() {
      if (st.phase !== 'ready') return; S.set({ phase: 'busy' });
      zhi.cheer(); S.sound('whoosh');
      for (let i = NSEG - 1; i >= 0; i--) { S.show(segs[i], .18); if (i % 3 === 0) S.sound('tick'); await S.wait(.05); }
      await S.show(pen, .3); zhi.still(); zhi.wave(1);
      await S.wait(.3);
      // nobody wants to choose: each one pushes the turntable on to the next (you order, you order)
      const target = -(2 * Math.PI * 2) + .95 - tt.rotation.y;   // two full turns, then the pen ends at the back right, by 小策
      S.to(tt.rotation, { y: tt.rotation.y + target }, 3.6, 'inOut'); S.show(swirl, .3);
      for (const p of [gran, abo, ce, gran, abo, ce]) { p.wave(.7); p.hop(.12); S.sound('whoosh'); await S.wait(.55); }
      await S.wait(.4); pointing = true; S.sound('tick'); S.emote(abo, '…', 2.4, C.ink);
      await S.wait(.6);
      S.set({ phase: 'touch' }); S.hint(pen, [0, .3, 0], '轉到阿嬤面前');
    }
    async function touch(byHand) {
      if (st.phase !== 'touch' || st.busy) return; st.busy = true; S.hint(null); S.refresh();
      pointing = false; S.hide(swirl, .25);
      const d = wrap(PHI - penAngle());
      await S.to(tt.rotation, { y: tt.rotation.y - d }, byHand ? .25 : Math.max(.5, Math.abs(d) * .45), byHand ? 'out' : 'inOut');
      S.sound('tap'); gran.still(); abo.still(); gran.hop();
      // she picks up the pen and circles one dish
      await S.to(pen.position, { y: .3 }, .3, 'out');
      circleT = 0; await S.wait(.7); circleT = -1;
      S.sound('stamp'); S.show(ringMark, .3);
      await S.to(pen.position, { x: Math.cos(0) * MR, y: .035, z: 0 }, .3, 'inOut');
      await S.wait(.4);
      // the rest of the menu folds away: one dish chosen out of forty
      for (let i = NSEG - 1; i > 0; i--) { S.hide(segs[i], .12); if (i % 4 === 0) S.sound('tick'); await S.wait(.03); }
      await S.wait(.3);
      // the dish arrives from the steamer on the cart
      const from = S.local(tt, S.world(steamer, [0, .6, 0]));
      platter.position.copy(from); platter.rotation.y = tt.rotation.y * -1;
      S.show(platter, .3); S.sound('whoosh'); puffRate = 1;
      await S.to(platter.position, { x: from.x * .5, y: .9, z: from.z * .5 }, .4, 'out');
      await S.to(platter.position, { x: 0, y: .04, z: 0 }, .4, 'in'); S.sound('pop');
      S.burst(S.world(platter, [0, .2, 0]), { n: 18, up: 2, speed: 1.1 });
      gran.cheer(); abo.cheer(); ce.cheer(); zhi.cheer();
      chops.forEach((k, i) => { S.wait(i * .15).then(() => S.show(k, .3)); }); eatT = 0;
      await S.wait(1.4);
      gran.still(); abo.still(); ce.still(); zhi.still();
      // the bill comes too, and it rides the turntable round to the one who chose
      const b0 = -.7, r = .56, la = b0 + tt.rotation.y;           // start at the back right; local angle = world angle + turn
      bill.position.set(Math.cos(la) * r, .035, Math.sin(la) * r);
      await S.show(bill, .35); S.sound('tick');
      await S.wait(.3);
      const dd = wrap(PHI - b0); const turn = dd > 0 ? dd : dd + Math.PI * 2;   // forward, past the front of the table
      await S.to(tt.rotation, { y: tt.rotation.y - turn }, 2.4, 'inOut');
      S.sound('tap'); gran.hop();
      await S.wait(.3);
      S.show(purse, .3); await S.wait(.35);
      S.sound('pop'); await S.to(flap.rotation, { x: -2.2 }, .35, 'back');
      S.burst(S.world(purse, [0, .2, 0]), { n: 12, up: 1.6, speed: .8, colors: ['#e8b84e', '#fff3d6'] });
      gran.cheer(); S.emote(gran, '♥', 2.2); ce.wave(1.4); abo.wave(1.2);
      await S.wait(.6);
      S.learn(zhi); zhi.cheer();
      S.set({ phase: 'done' }); await S.wait(1); S.done();
    }
    const crank = S.crank(tt, { id: 'tt', label: '轉盤', spin: false, pad: 0, tap: () => touch(false),
      turn: (d) => { if (st.phase !== 'touch' || st.busy) return; tt.rotation.y -= d; if (Math.abs(wrap(PHI - penAngle())) < .26) touch(true); },
      done: () => { if (st.phase === 'touch' && !st.busy && Math.abs(wrap(PHI - penAngle())) < .5) touch(true); } });
    S.pad(tt, .8, [0, .05, 0]).scale.y = .35;                // a flat grab area over the whole turntable
    S.act('go', go); S.act('touch', () => touch(false));
    S.on('reset', () => { puffRate = .18; dogT = 0; eatT = -1; circleT = -1; pointing = false; crank.zero(); });
    S.on('enter', async () => {
      await S.wait(.5); abo.hop(.12); S.sound('soft'); S.emote(abo, '…', 1.4, C.ink);
      await S.wait(.6); ce.doubt(); gran.wave(.8);
      await S.wait(.6); ce.still(); S.set({ phase: 'ready' });
    });
    S.ui(() => ({
      caption: st.phase === 'done' ? '今天學到：' + DIARY : '',
      buttons: st.phase === 'ready' ? [{ id: 'go', label: '交給我！', primary: true }]
        : st.phase === 'busy' ? [{ id: 'go', label: '交給我！', primary: true, disabled: true }]
          : st.phase === 'touch' ? [{ id: 'touch', label: '請阿嬤點', primary: true, disabled: st.busy }] : [],
    }));

    S.tick((t, dt) => {
      puffRate += (.18 - puffRate) * Math.min(1, dt * .7);
      puffs.forEach((p, i) => { const u = (t * puffRate * 2 + i / 3) % 1; p.position.set(Math.sin(u * 5 + i) * .06, .62 + u * .55, 0); p.scale.setScalar(Math.max(.001, (.45 + u * .8) * (1 - u * u))); });
      rays.rotation.z += dt * .05;
      if (dogT > 0) dogT -= dt;
      tail.rotation.z = Math.sin(t * (dogT > 0 ? 24 : 3)) * (dogT > 0 ? .7 : .25);
      dog.position.x = dogT > 0 ? -Math.sin(Math.min(1, (1.6 - dogT) * 3) * Math.PI / 2) * .12 * Math.min(1, dogT * 2) : 0;
      if (swirl.visible) swirl.rotation.y = -t * (st.phase === 'busy' ? 3 : .6);
      if (pointing) { const w = Math.sin(t * 5) * .08; gran.armR.rotation.z = 1.3 + w; abo.armR.rotation.z = 1.3 - w; ce.armL.rotation.z = -1.3 + w; }   // you choose. no, you.
      if (bill.visible) bill.rotation.y = -tt.rotation.y;       // the slip always faces the reader
      if (platter.visible) { steamUp.forEach((p, i) => { const u = (t * .5 + i * .5) % 1; p.position.y = .2 + u * .5; p.scale.setScalar(Math.max(.001, (1 - u) * 1.1)); }); }
      if (circleT >= 0) { circleT += dt; const a = circleT * 9; pen.position.x = Math.cos(0) * MR + Math.cos(a) * .05; pen.position.z = Math.sin(a) * .05; }
      if (eatT >= 0) { eatT += dt; chops.forEach((k, i) => { const u = Math.sin(eatT * 5 + i * 2); k.position.y = .63 + u * .05; }); }
    });
  },
};
