// 第 5 頁｜臭豆腐攤｜孫韞筑〈討好演算法，還是打動人？〉p.66–71；莊閔雯、呂季霖〈GEO 時代〉p.168–175；吳宗霖〈在注意力被 AI 稀釋的時代…〉p.116–127
// 正午。小智用一大堆花蓋住臭豆腐攤、猛噴香水，可是一縷臭味還是鑽出來，把旅人嚇得更遠。
// 讀者把花掀開：常客一手捏鼻子、一手比讚。小智照著他的樣子學給旅人看，旅人笑了，也捏著鼻子坐下來吃。
import { T, C, keep, group, box, cyl, cone, ball, disc, ring, beam, poly, card, quad, tab, tag, bush, cratePlank, skyDisc } from '../paper.js';

const DIARY = '吃過的人說臭也說香，我照著說。';
const STALL = { x: -1.75, z: -1.35 };
const STINK = ['#a9c94a', '#c3d94e', '#8fb85a'];
const BENCH = { x: -1.6, z: .5 };
const SEAT = -.17;                                     // how far a seated puppet sinks behind the bench
const TRAV = { z: 1.5, x0: 3.3, back: { x: 3.9, z: .35 }, front: { x: -2.15, z: -.55 }, seat: { x: -2.15, z: -1.18, y: SEAT } };
const COPY = { x: -1.2, z: -.4 };                    // where 小智 stands to copy the regular, in its own plant
const FLOWER = [C.pink, C.coral, C.gold, C.white, '#f49a8c', C.pink];

/** a curly paper strip rising h: the smell */
function curl(g, h, col, w = .05, amp = .12, turns = 1.5) {
  const N = 18, L = [], R = [];
  for (let i = 0; i <= N; i++) { const u = i / N, x = Math.sin(u * Math.PI * 2 * turns) * amp * (1 - u * .3), y = u * h, ww = w * (1 - u * .55); L.push([x - ww / 2, y]); R.push([x + ww / 2, y]); }
  return poly(g, [...L, ...R.reverse()], .02, col, 0, 0, -.01);
}
/** a thumb on a puppet's right hand, so a raised arm reads as a thumbs-up */
function thumb(p, len, col, z) { box(p.armR, 0, len, z, .035, .09, .035, col); }
/** one hand pinching the nose, the other up with its thumb: the regular's verdict, and 小智's copy of it */
function verdict(p, robot) { p.armL.rotation.z = robot ? 2.45 : 2.6; p.armR.rotation.z = 2.75; if (robot) p.armL.position.z = .14; }   // the robot's arm comes out in front of its chest
function pinchOnly(p) { p.armL.rotation.z = 2.6; }

export default {
  id: 's05-voice', land: 'people', short: '照著說實話', calm: true,
  title: '怎麼讓 AI 推薦我的品牌？',
  sources: [{ n: 9 }, { n: 19 }, { n: 13 }],
  diary: DIARY,
  takeaway: 'AI 推薦誰，看的是用過的人具體怎麼說你，不是你自己怎麼說。別人替你說的話，會變成 AI 對下一個人說的話。',
  quote: { t: '一個沒被討論、或被討論錯了的品牌，在消費者問 AI 的那一刻，等於隱形。', n: 9, page: 67 },
  look: { bg: '#2a6150', table: '#8fb096', key: '#fff6dc', fill: '#cdeae6', sky: '#fffbe9' },   // noon
  ground(G) {
    G.wash('#eadfc1');
    G.rect(0, -3.15, 12.4, 1.0, '#cfdfbf', { r: 0 });
    G.marks('tick', -6, -3.55, 6, -2.75, { n: 70, col: '#7fa06a88', size: .14, seed: 9 });
    G.grid(.5, '#7a5a3014', .012);
    // the stall's patch of red tiles, and the bench in front of it
    G.rect(STALL.x, STALL.z + .25, 2.9, 1.6, '#e3b9a0', { r: .1, edge: '#c99a80', edgeW: .03 });
    G.rect(BENCH.x, BENCH.z - .05, 2.3, .8, '#dcc9a2', { r: .12 });
    // the way the traveller comes in
    G.path([[5.6, 2.2], [4.0, 1.75], [2.0, 1.25], [.2, .85], [-.6, .75]], { w: .5, col: '#d8cba8' });
    G.path([[5.6, 2.2], [4.0, 1.75], [2.0, 1.25], [.2, .85], [-.6, .75]], { w: .03, col: '#b9a57d', dash: [.16, .14] });
    G.marks('dot', -6, 1.6, 6, 3.4, { n: 40, col: '#b9a57d55', size: .1, seed: 3 });
  },
  build(S) {
    const st = S.state({ phase: 'intro', busy: false });
    let drive = null, regEat = true, regPose = false, travPinch = true, travEat = false, zhiPose = false, plates = 0, smellSpin = 0;

    // ---- the sun, high at noon
    let rays;
    S.plant(.7, -3.25, (g) => { rays = skyDisc(g, { y: 2.6, r: .42 }); });
    S.curio(rays, { id: 'sun', label: '太陽', tap: () => { S.to(rays.rotation, { z: rays.rotation.z + Math.PI / 2 }, .9, 'out'); } });
    S.plant(-4.9, -2.2, (g) => bush(g, .5, C.leaf)); S.plant(4.8, -2.0, (g) => bush(g, .45, '#6f9a72')); S.plant(3.9, -2.75, (g) => bush(g, .36, C.leaf));

    // ---- the place sign: the only words on the page
    S.plant(-4.3, .2, (g) => {
      tab(g, .5); beam(g, [0, 0, 0], [0, 1.2, 0], .035, C.bark, 6);
      tag(g, '臭豆腐攤', 0, .98, .04, { h: .27, paper: C.white, ink: C.navy });
    });

    // ---- the stall: a counter, a wok of oil, a stack of plates, and the smell curling up
    let wok, bubbles, plateK, smells = [], flowers;
    const extra = [];
    S.plant(STALL.x, STALL.z, (g) => {
      tab(g, 1.8);
      box(g, 0, .38, 0, 2.0, .76, .8, C.kraft);
      box(g, 0, .38, .405, 2.0, .5, .02, C.red); for (const x of [-.66, 0, .66]) box(g, x, .38, .42, .04, .5, .01, C.white);
      box(g, 0, .785, 0, 2.08, .05, .86, C.wood);
      // a striped awning over the plate end
      for (const [x, z] of [[-.95, -.36], [-.95, .36], [.05, -.36], [.05, .36]]) beam(g, [x, .8, z], [x, 1.85, z], .025, C.bark, 5);
      for (let i = 0; i < 5; i++) { const x0 = -1.05 + i * .24; quad(g, [x0, 2.02, -.5], [x0 + .24, 2.02, -.5], [x0 + .24, 1.78, .52], [x0, 1.78, .52], i % 2 ? C.white : C.red); poly(g, [[0, 0], [.24, 0], [.12, -.1]], .02, i % 2 ? C.white : C.red, x0, 1.78, .5); }
      // plates
      plateK = keep(g, -.55, .81, .12);
      for (let i = 0; i < 5; i++) cyl(plateK, 0, .015 + i * .035, 0, .2, .17, .03, C.white, 14);
      for (let i = 0; i < 3; i++) { const k = keep(plateK, 0, .19 + i * .035, 0); cyl(k, 0, 0, 0, .2, .17, .03, C.white, 14); k.visible = false; extra.push(k); }
      // the wok
      wok = keep(g, .5, .81, .05);
      cyl(wok, 0, .1, 0, .36, .2, .2, C.dark, 14); cyl(wok, 0, .19, 0, .32, .32, .02, '#e8b84e', 14);
      for (const [x, z, r] of [[-.12, .05, .2], [.1, -.06, -.3], [.02, .14, .5]]) { const b = box(wok, x, .22, z, .11, .07, .11, C.honey); b.rotation.y = r; }
      bubbles = keep(wok, 0, .21, 0); for (const [x, z] of [[-.2, -.1], [.18, .12], [.05, -.18], [-.05, .2]]) ball(bubbles, x, 0, z, .03, '#fbe3a0', 0);
      // the smell: three curly green strips that slowly twist
      [[.38, -.05, 1.55, 0], [.58, .08, 1.3, 1], [.47, -.12, 1.15, 2]].forEach(([x, z, h, i]) => { const k = keep(g, x, 1.0, z); curl(k, h, STINK[i], .06, .13, 1.4 + i * .2); smells.push(k); });
      // the heap of flowers 小智 piles over the whole stall
      flowers = keep(g, 0, 0, .15);
      { const m = ball(flowers, 0, .2, 0, 1.0, '#6f9a5a', 1); m.scale.set(1.35, 1.75, .95); }
      let s = 21; const rnd = () => ((s = (Math.imul(1664525, s) + 1013904223) >>> 0) / 4294967296);
      const A = 1.38, B = 1.8, Cc = .98;
      for (let i = 0; i < 70; i++) {
        const y = .05 + Math.pow(rnd(), .8) * .95, phi = (rnd() - .5) * Math.PI * 1.25, rr = Math.sqrt(1 - y * y);
        const nx = rr * Math.sin(phi), ny = y, nz = rr * Math.cos(phi), px = nx * A, py = .2 + ny * B, pz = nz * Cc;
        const n = new T.Vector3(nx / A, ny / B, nz / Cc).normalize(), f = group(flowers);
        f.position.set(px, py, pz); f.rotation.order = 'YXZ'; f.rotation.set(-Math.asin(n.y), Math.atan2(n.x, n.z), 0);
        const col = FLOWER[i % FLOWER.length], r = .12 + rnd() * .07;
        for (let j = 0; j < 5; j++) { const a = j / 5 * Math.PI * 2; const pt = ball(f, Math.cos(a) * r * .55, Math.sin(a) * r * .55, 0, r * .45, col, 0); pt.scale.z = .35; }
        ball(f, 0, 0, .02, r * .3, i % 3 ? C.gold : C.deep, 0);
      }
      flowers.visible = false;
    }, { s: 1.3 });

    // ---- the uncle who fries it, behind his counter
    let uncle;
    S.plant(-2.3, -2.05, (g) => { uncle = S.person(g, { y: .3, s: 1, kind: 'elder', coat: C.slate, prop: false }); card(uncle.inner, 0, .27, .04, .28, .42, C.white, .02, .04); });

    // ---- the bench: a plank from 小智's crate. The regular eats on it
    let plank, reg, regPlate, benchPlate;
    S.plant(BENCH.x, BENCH.z, (g) => {
      tab(g, 1.4);
      for (const x of [-.7, .7]) { box(g, x, .14, 0, .08, .28, .28, C.bark); }
      plank = cratePlank(g, 0, .305, 0, { len: 1.75, h: .36 }); plank.rotation.x = -Math.PI / 2;
      benchPlate = keep(g, .25, .34, .02); cyl(benchPlate, 0, 0, 0, .16, .13, .03, C.white, 14); benchPlate.visible = false;
    });
    S.plant(BENCH.x + .5, BENCH.z - .16, (g) => {
      reg = S.person(g, { y: SEAT, s: 1, kind: 'adult', coat: C.coral, hair: C.ink, prop: false });
      thumb(reg, -.42, '#f3cfa6', .02);
      regPlate = keep(reg.inner, 0, .62, .13); cyl(regPlate, 0, 0, 0, .17, .14, .03, C.white, 14); for (const [x, z] of [[-.05, 0], [.05, .03], [0, -.05]]) box(regPlate, x, .04, z, .07, .05, .07, C.honey);
    });

    // ---- the traveller with a backpack, holding his nose from far away
    let trav, travPlate;
    S.plant(0, TRAV.z, (g) => {
      trav = S.person(g, { x: TRAV.x0, z: 0, s: 1, kind: 'adult', coat: C.blue, hair: '#5a4636' });
      box(trav.inner, 0, .56, -.12, .32, .4, .14, C.kraft); cyl(trav.inner, 0, .8, -.12, .07, .07, .34, C.red, 8).rotation.z = Math.PI / 2;
      travPlate = keep(trav.inner, 0, .62, .13); cyl(travPlate, 0, 0, 0, .17, .14, .03, C.white, 14); for (const [x, z] of [[-.05, 0], [.05, .03]]) box(travPlate, x, .04, z, .07, .05, .07, C.honey);
      travPlate.visible = false;
    });

    // ---- 小智, and the perfume it brought
    let zhi, bottle, bulb;
    S.plant(1.0, .95, (g) => { zhi = S.robot(g, { s: .95, lights: S.index - 1 }); thumb(zhi, -.36, C.aqua, 0); });
    S.hero(zhi, { ready: () => st.phase === 'ready', go });
    S.plant(.95, -.05, (g) => {
      tab(g, .4); bottle = keep(g);
      card(bottle, 0, 0, 0, .3, .36, '#f2a3b4', .2, .08); box(bottle, 0, .4, .1, .08, .08, .08, C.gold);
      beam(bottle, [0, .44, .1], [.18, .44, .1], .015, C.ink, 4);
      bulb = keep(bottle, .22, .44, .1); ball(bulb, 0, 0, 0, .07, C.deep, 1);
    });

    // ---- the smell that gets out anyway
    let sneak;
    S.plant(0, 0, (g) => { sneak = keep(g, -1.4, 2.0, -1.6); curl(sneak, .55, STINK[1], .06, .1, 1.5); sneak.visible = false; });

    // ---- a cat with a clothes peg on its nose
    let cat, tail;
    S.plant(2.6, -.55, (g) => {
      tab(g, .4); cat = keep(g);
      const b = ball(cat, 0, .14, 0, .14, '#8a8580', 1); b.scale.set(1.35, .9, .8);
      ball(cat, .19, .3, .03, .1, '#8a8580', 1);
      for (const sx of [-1, 1]) { cone(cat, .19 + sx * .055, .41, .03, .035, .08, '#8a8580', 4); disc(cat, .19 + sx * .035, .32, .12, .012, C.ink, .008, 8); }
      box(cat, .19, .28, .13, .03, .06, .05, C.red);                                          // the peg
      tail = keep(cat, -.18, .14, 0); beam(tail, [0, 0, 0], [-.12, .22, 0], .025, '#8a8580', 5);
    });

    // ---- the silent things to tap
    for (const [p, id, label] of [[uncle, 'uncle', '阿伯'], [reg, 'regular', '常客'], [trav, 'traveller', '旅人']]) { const c = S.curio(p.root, { id, label, tap: () => p.hop() }); p.propId = c.id; }
    S.curio(wok, { id: 'wok', label: '油鍋', tap: async () => { S.sound('pop'); S.burst(S.world(wok, [0, .25, 0]), { n: 10, up: 1.2, speed: .8, colors: ['#fbe3a0', '#ffffff'] }); await S.to(bubbles.scale, { x: 1.8, y: 1.8, z: 1.8 }, .15, 'out'); await S.to(bubbles.scale, { x: 1, y: 1, z: 1 }, .4, 'bounce'); } });
    S.curio(smells[0], { id: 'smell', label: '臭味', tap: () => { smellSpin = 1; S.sound('whoosh'); } });
    S.curio(bottle, { id: 'perfume', label: '香水', tap: () => spray() });
    S.curio(cat, { id: 'cat', label: '貓', tap: async () => {
      S.sound('tick'); S.wiggle(tail, .6); await S.to(cat.position, { x: .5 }, .6, 'inOut'); await S.wait(.6); await S.to(cat.position, { x: 0 }, .8, 'inOut');
    } });
    S.curio(plateK, { id: 'plates', label: '盤子', tap: () => { const k = extra[plates % 4]; if (plates % 4 === 3) { extra.forEach((e) => { e.visible = false; }); S.sound('soft'); } else { S.show(k, .25); S.sound('tick'); } plates++; } });
    S.curio(plank, { id: 'plank', label: '長板凳', tap: async () => { await S.to(plank.position, { y: .36 }, .12, 'out'); await S.to(plank.position, { y: .305 }, .3, 'bounce'); } });
    function spray() {
      S.sound('pop'); S.to(bulb.scale, { x: .6, y: .6, z: .6 }, .1, 'out').then(() => S.to(bulb.scale, { x: 1, y: 1, z: 1 }, .3, 'bounce'));
      S.burst(S.world(bottle, [-.05, .5, .1]), { n: 12, up: 1.1, speed: 1.3, colors: [C.pink, '#fde3ea', '#f2a3b4'] });
    }

    // ---- lifting the flowers off: the reader's hand
    const spring = () => { drive = { u: lift.value() }; const d = drive; S.to(d, { u: 0 }, .5, 'back').then(() => { if (drive === d) drive = null; }); };
    const lift = S.pull(flowers, { id: 'flowers', label: '把花掀開', from: [0, 0, .15], to: [0, 2.3, .6],
      end: (u) => { if (st.phase === 'touch' && !st.busy && u > .45) touch(true); else if (u > .02) spring(); },
      tap: () => { if (st.phase === 'touch') touch(false); } });

    // ---- the story
    async function go() {
      if (st.phase !== 'ready') return; S.set({ phase: 'busy' });
      zhi.cheer(); S.sound('whoosh');
      for (const k of smells) S.to(k.scale, { x: .001, y: .001, z: .001 }, .3, 'in');
      await S.show(flowers, .6); S.sound('pop'); S.burst(S.world(flowers, [0, 1.6, .8]), { n: 18, up: 1.6, speed: 1.2, colors: [C.pink, C.coral, C.gold, '#ffffff'] });
      zhi.still();
      await S.walk(zhi, { x: -.55, z: -.75 }, .6); zhi.root.scale.x = Math.abs(zhi.root.scale.x);
      for (let i = 0; i < 3; i++) { spray(); zhi.hop(); await S.wait(.35); }
      zhi.wave(1.4); S.sound('tap');                                                  // pats its chest: all sorted
      await S.wait(.7);
      // a curl of smell gets out of the flowers anyway, and finds the traveller
      sneak.visible = true; sneak.position.set(-1.1, 2.55, -.9); sneak.scale.setScalar(.001); S.to(sneak.scale, { x: 1.6, y: 1.6, z: 1.6 }, .3, 'back'); S.sound('whoosh');
      await S.wait(.3);
      const nose = S.world(trav.root, [0, .9, .15]);
      S.to(sneak.position, { x: nose.x - .1, z: nose.z }, 1.5, 'inOut'); await S.to(sneak.position, { y: nose.y }, 1.5, 'out');
      S.emote(trav, '!', 1.4); S.sound('tick'); trav.doubt();

      await S.walk(trav, TRAV.back, .6); trav.root.scale.x = Math.abs(trav.root.scale.x);
      zhi.doubt();
      await S.wait(.8);
      S.set({ phase: 'touch' }); S.hint(flowers, [0, 1.5, .8], '把花掀開');
    }
    async function touch(byHand) {
      if (st.phase !== 'touch' || st.busy) return; st.busy = true; S.hint(null); S.refresh();
      if (!byHand) { const d = drive = { u: lift.value() }; await S.to(d, { u: .7 }, .45, 'inOut'); drive = null; }
      // off they go
      S.sound('whoosh'); zhi.still(); S.hide(sneak, .2);
      S.to(flowers.position, { x: -2.5, y: 4.2, z: -.8 }, .8, 'in'); S.hide(flowers, .8);
      for (const k of smells) S.to(k.scale, { x: 1, y: 1, z: 1 }, .6, 'back');
      await S.wait(.8);
      // the regular finishes his plate: one hand on his nose, the other a thumbs-up
      regEat = false; regPose = true; S.hide(regPlate, .2); S.show(benchPlate, .3); S.sound('pop'); reg.hop();
      await S.wait(1.1);
      // 小智 stands right beside him and does exactly the same, for the traveller to see
      await S.walk(zhi, COPY, .7); zhi.root.scale.x = Math.abs(zhi.root.scale.x);
      zhiPose = true; zhi.hop(); S.sound('tick');
      await S.wait(1.2);
      // the traveller laughs, comes over, and sits down to eat, nose held
      travPinch = false; trav.still(); trav.cheer(); trav.hop(); S.sound('pop');
      await S.wait(1.0); trav.still();
      await S.walk(trav, TRAV.front, 1.5); await S.walk(trav, TRAV.seat, .4); trav.root.scale.x = Math.abs(trav.root.scale.x);
      travPinch = true; travEat = true; S.show(travPlate, .3); S.sound('pop');
      await S.wait(.6);
      S.learn(zhi); S.set({ phase: 'done' }); await S.wait(1); S.done();
    }
    S.act('go', go); S.act('touch', () => touch(false));
    S.on('reset', () => { drive = null; regEat = true; regPose = false; travPinch = true; travEat = false; zhiPose = false; plates = 0; smellSpin = 0; });
    S.on('enter', async () => {
      // the regular tucks in; the traveller looks on from far away, holding his nose
      reg.hop(); S.sound('soft');
      await S.wait(.7); trav.doubt();
      await S.wait(1.0); trav.still(); S.set({ phase: 'ready' });
    });
    S.ui(() => ({
      caption: st.phase === 'done' ? '今天學到：' + DIARY : '',
      buttons: st.phase === 'ready' ? [{ id: 'go', label: '交給我！', primary: true }]
        : st.phase === 'busy' ? [{ id: 'go', label: '交給我！', primary: true, disabled: true }]
          : st.phase === 'touch' ? [{ id: 'touch', label: '掀開花', primary: true, disabled: st.busy }] : [],
    }));

    S.tick((t, dt) => {
      rays.rotation.z += dt * .05;
      if (drive) lift.set(drive.u);
      smells.forEach((k, i) => { k.rotation.y = Math.sin(t * .7 + i * 2.1) * 1.1 + (i === 0 ? smellSpin * Math.PI * 2 : 0); });
      if (smellSpin > 0) smellSpin = Math.max(0, smellSpin - dt * .9);
      if (sneak.visible) sneak.rotation.y = t * 3;
      bubbles.children.forEach((b, i) => { b.position.y = Math.abs(Math.sin(t * 3 + i * 1.7)) * .03; });
      tail.rotation.z = Math.sin(t * 2.2) * .25;
      if (regEat) reg.armR.rotation.z = -2.45 + Math.sin(t * 7) * .3;                   // eating with gusto
      if (regPose) verdict(reg);
      if (zhiPose) verdict(zhi, true);
      if (travPinch) pinchOnly(trav);
      if (travEat) trav.armR.rotation.z = -2.45 + Math.sin(t * 7 + 1) * .3;
    });
  },
};
