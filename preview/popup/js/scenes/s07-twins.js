// 第 7 頁｜島中島｜陳介立、孫郁喬、高靖萍〈People Model：讓消費者研究變成一場隨時能開口的對話〉p.96–115
// 涼亭裡一座大沙盤，是整座島的迷你模型。阿滿姨有三款新口味拿不定：沙盤上冒出全島人的迷你分身，各喝一滴、排到喜歡的壺前，
// 沒人排的那一把一秒收回架上（分身的本事）。剩下兩把排得一樣長，分身老實舉起問號。把最後兩杯端給板凳上真的阿嬤：她選了一杯，大茶桶開煮。
import { C, keep, group, box, cyl, cone, ball, disc, ring, beam, poly, slab, card, tab, tag, cloud, house, cratePlank, skyDisc } from '../paper.js';

const DIARY = '分身先刷掉一款，最後一口問真人。';
const WHITE = '#fbf6ea', SAND = '#ecd6a6', SEA = '#8fc6cf';
const TBL = { x: 2.35, z: -.85 };                          // the sand table under the pavilion
// the model is a stepped contour island: three terraces, each with a teapot at its left end and room for a line to its right
const ROW = [{ y: .7, z: .55 }, { y: .95, z: -.04 }, { y: 1.2, z: -.62 }];
const POTS = [{ col: C.coral, tea: '#e98c7a' }, { col: C.gold, tea: '#e6c25c' }, { col: C.teal, tea: '#86b98c' }];
const PX = -1.2, LX = -.93, STEP = .17;                    // pot x, first place in line, spacing (table-local)
const KINDS = ['adult', 'kid', 'adult', 'elder', 'adult', 'kid', 'adult'];
const COATS = [C.blue, C.gold, C.leaf, C.slate, C.coral, C.aqua, C.wood, C.navy, C.pink, C.teal, C.honey, C.plum, C.mint, C.red];
// fourteen twins: where each pops up on the island (any terrace), and the line it joins (row 0 or row 2; nobody joins row 1)
const MINIS = Array.from({ length: 14 }, (_, i) => {
  let s = 17 + i * 31; const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const row = i < 7 ? 0 : 2, k = i % 7, r0 = [1, 2, 0, 1, 2, 1, 0, 1, 0, 2, 1, 0, 1, 2][i], R = ROW[r0];
  return { from: [-.85 + r() * 1.55, R.y, R.z + (r() - .5) * .16], to: [LX + k * STEP, ROW[row].y, ROW[row].z], kind: KINDS[(i * 3) % 7], coat: COATS[i] };
});
const GRAN = 7;                                            // the mini grandmother: front of the teal line

/** a paper teapot (in its own keep, origin on the ground) */
function teapot(g, col) {
  const b = ball(g, 0, .1, 0, .1, col, 1); b.scale.set(1.15, .85, 1);
  cyl(g, 0, .18, 0, .05, .07, .03, col, 10); ball(g, 0, .21, 0, .025, C.gold, 0);
  beam(g, [.1, .1, 0], [.18, .17, 0], .018, col, 5);
  const h = ring(g, -.12, .11, 0, .05, .012, col, 12); h.scale.y = 1.1;
}
/** a '?' drawn with paper rods (height about .3) */
function qmark(g, col, x, y, z) {
  const P = [[-.09, .09], [-.07, .15], [0, .18], [.08, .15], [.1, .08], [.06, .02], [0, -.01], [0, -.06]];
  for (let i = 0; i < P.length - 1; i++) beam(g, [x + P[i][0], y + P[i][1], z], [x + P[i + 1][0], y + P[i + 1][1], z], .03, col, 5);
  disc(g, x, y - .14, z, .035, col, .02, 10);
}
function scarf(p) { box(p.inner, 0, .79, .045, .34, .08, .03, C.red); poly(p.inner, [[0, 0], [.06, 0], [.08, -.2], [.02, -.2]], .02, C.red, .06, .77, .06); }

export default {
  id: 's07-twins', land: 'model', short: '分身先試', calm: true,
  title: '上市前，能不能先問消費者？',
  sources: [{ n: 12 }],
  diary: DIARY,
  takeaway: '分身幫你快速刷掉沒機會的選項；要不要上市，交給真人驗證。',
  quote: { t: '用模擬做篩選，用真人做把關，而不是讓模擬單獨做出上市與否的決定。', n: 12, page: 113 },
  look: { bg: '#4a2c40', table: '#b78f9b', key: '#ffe8d2', fill: '#f1d2e0', sky: '#fff0e6' },   // afternoon
  ground(G) {
    G.wash('#f4dce2');
    G.grid(.4, '#c98fa040', .012);
    G.grid(2, '#b8708a55', .02);
    G.rect(TBL.x, TBL.z, 4.3, 2.9, '#e8c3cd', { r: .1, edge: '#c98fa0', edgeW: .04 });     // the pavilion floor
    G.path([[-1.6, -.3], [-.4, -.1], [.9, .3]], { w: .7, col: '#ecccd5' });
    G.rect(-1.5, -1.25, 1.9, 1.3, '#ecccd5', { r: .1 });                                   // the tea stall's corner
    G.circle(4.5, 1.5, .55, null, { edge: '#b8708a66', edgeW: .02 });                      // the compass's old circles
    G.circle(4.5, 1.5, .3, null, { edge: '#b8708a44', edgeW: .02 });
    G.marks('cross', 3.2, 1.0, 5.6, 2.6, { n: 10, col: '#b8708a55', size: .14, seed: 5 });
  },
  build(S) {
    const st = S.state({ phase: 'intro', busy: false });
    let lhBusy = false, ferryT = 0, catBusy = false, compBusy = false, brewing = false;

    // ---- the sun, an afternoon one
    let rays;
    S.plant(-2.4, -3.25, (g) => { rays = skyDisc(g, { y: 1.9, r: .42 }); });
    S.curio(rays, { id: 'sun', label: '太陽', tap: () => { S.sound('soft'); S.to(rays.rotation, { z: rays.rotation.z + Math.PI / 2 }, .9, 'out'); } });
    S.plant(-4.6, -3.3, (g) => cloud(g, 1.1, 2.4, '#fde8e0')); S.plant(4.7, -3.35, (g) => cloud(g, 1.0, 2.9, '#fdeee6'));

    // ---- the pavilion and its sand table: the whole island in miniature
    const pots = [], minis = [], signs = [];
    let lamp, beamK, ferry, puff, mcat, fish, tray, cups = [], plank;
    const table = S.plant(TBL.x, TBL.z, (g) => {
      tab(g, 3.0);
      // pavilion: tall posts, the roof high enough to leave the whole model in view
      const H = 2.75;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { cyl(g, sx * 1.75, .02, sz * 1.12, .1, .1, .04, C.stone, 8); cyl(g, sx * 1.75, H / 2, sz * 1.12, .06, .06, H, C.deep, 8); }
      box(g, 0, H, 0, 3.72, .08, 2.46, C.gold);
      const rg = group(g); rg.position.set(0, H + .42, 0); rg.scale.set(1, 1, .66);
      cone(rg, 0, 0, 0, 2.66, .84, C.red, 4).rotation.y = Math.PI / 4;
      ball(g, 0, H + .9, 0, .1, C.gold, 1); cyl(g, 0, H + 1.04, 0, .02, .05, .2, C.gold, 6);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) cone(g, sx * 1.86, H, sz * 1.23, .05, .16, C.gold, 5).rotation.z = Math.PI;
      // the table, one leg propped on a crate plank
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const shim = sx < 0 && sz > 0; box(g, sx * 1.4, shim ? .33 : .3, sz * .85, .1, shim ? .54 : .6, .1, C.wood); }
      plank = cratePlank(g, -1.4, .028, .85, { len: .55, h: .32, thick: .05 }); plank.rotation.x = -Math.PI / 2;
      box(g, 0, .58, 0, 3.12, .08, 1.98, C.bark);
      box(g, 0, .63, 0, 3.0, .03, 1.86, SEA);
      // three contour layers of the island
      box(g, -.25, .66, -.06, 2.5, .08, 1.74, SAND);
      box(g, -.23, .825, -.37, 2.4, .25, 1.12, '#c9dca2');
      box(g, -.25, 1.075, -.64, 2.3, .25, .58, '#a3c58e');
      // the island's little things: lighthouse, houses, trees, ferry
      const lh = group(g); lh.position.set(.72, ROW[2].y, -.66);
      for (let i = 0; i < 4; i++) cyl(lh, 0, .06 + i * .12, 0, .075 - i * .008, .08 - i * .008, .12, i % 2 ? WHITE : C.red, 10);
      cyl(lh, 0, .52, 0, .06, .06, .04, C.dark, 8); cone(lh, 0, .62, 0, .07, .1, C.red, 8);
      lamp = keep(g, .72, ROW[2].y + .57, -.66); ball(lamp, 0, 0, 0, .045, '#ffe39a', 1);
      beamK = keep(lamp); const bm = cone(beamK, .28, 0, 0, .09, .5, '#fff0b0', 8); bm.rotation.z = Math.PI / 2; beamK.visible = false;
      for (const [x, z, w, c] of [[.45, -.1, .22, C.coral], [.78, -.02, .2, C.teal]]) { const hg = group(g); hg.position.set(x, ROW[1].y, z); house(hg, w, w * .7, w * .7, WHITE, c); }
      for (const [x, y, z] of [[.6, ROW[0].y, .2], [.35, ROW[2].y, -.8], [.92, ROW[1].y, -.25]]) { cyl(g, x, y + .03, z, .012, .012, .06, C.bark, 4); cone(g, x, y + .12, z, .06, .14, C.leaf, 6); }
      ferry = keep(g, 1.28, .645, .35);
      poly(ferry, [[-.17, .06], [.17, .06], [.13, 0], [-.13, 0]], .1, WHITE, 0, 0, -.05); box(ferry, -.03, .1, 0, .14, .07, .07, C.red); cyl(ferry, .05, .16, 0, .02, .02, .07, C.dark, 6);
      puff = keep(ferry, .05, .24, 0); ball(puff, 0, 0, 0, .04, WHITE, 1); puff.visible = false;
      // the mini cat and the fish it wants
      mcat = keep(g, .55, ROW[0].y, .62);
      const cb = ball(mcat, 0, .04, 0, .04, C.ink, 0); cb.scale.set(1.2, .9, .7); ball(mcat, .045, .08, 0, .03, C.ink, 0);
      for (const sx of [-1, 1]) cone(mcat, .045 + sx * .016, .11, 0, .01, .025, C.ink, 4); beam(mcat, [-.04, .04, 0], [-.08, .1, 0], .007, C.ink, 3);
      fish = keep(g, .7, ROW[0].y + .015, .66); poly(fish, [[-.04, 0], [.02, .015], [.04, 0], [.02, -.015]], .01, C.aqua, 0, 0, 0); poly(fish, [[-.04, 0], [-.065, .02], [-.065, -.02]], .01, C.aqua, 0, 0, 0);
      // three new flavours in three little teapots, one at the end of each terrace
      POTS.forEach((p, i) => { const k = keep(g, PX, ROW[i].y, ROW[i].z); teapot(k, p.col); pots.push(k); });
      // the twins: everybody on the island, in miniature (hidden until 小智 asks)
      MINIS.forEach((m, i) => {
        const w = keep(g, m.from[0], m.from[1], m.from[2]);
        const p = S.person(w, { s: .3, kind: i === GRAN ? 'elder' : m.kind, coat: i === GRAN ? C.plum : m.coat, hair: [C.ink, C.bark, C.deep][i % 3] });
        if (i === GRAN) scarf(p);
        p.w = w; w.visible = false; minis.push(p);
        const sg = keep(p.inner, .3, .95, .06); beam(sg, [0, 0, 0], [0, .5, 0], .025, C.wood, 4); card(sg, 0, .42, 0, .48, .46, WHITE, .03, .06); qmark(sg, C.red, 0, .64, .04);
        sg.visible = false; signs.push(sg);
      });
    }, { s: 1.1 });
    // the tray with the last two cups waits on a stool in front of the pavilion (it is filled when the lines tie)
    S.plant(1.1, 1.2, (g) => {
      tab(g, .5); cyl(g, 0, .2, 0, .2, .22, .4, C.wood, 10); cyl(g, 0, .41, 0, .23, .23, .03, C.honey, 12);
      tray = keep(g, 0, .425, 0);
      box(tray, 0, .012, 0, .44, .024, .22, C.wood); box(tray, 0, .03, .1, .44, .03, .02, C.bark); box(tray, 0, .03, -.1, .44, .03, .02, C.bark);
      [0, 2].forEach((pi, j) => { const c = keep(tray, j ? .1 : -.1, .024, 0); cyl(c, 0, .06, 0, .05, .04, .12, WHITE, 10); cyl(c, 0, .118, 0, .046, .046, .008, POTS[pi].tea, 10); cups.push(c); });
      tray.visible = false;
    });
    const T6 = table.art;
    S.curio(plank, { id: 'plank', label: '墊板', tap: () => S.sound('tap') });
    S.curio(lamp, { id: 'lighthouse', label: '小燈塔', tap: async () => {
      if (lhBusy) return; lhBusy = true; S.sound('tick'); beamK.visible = true; S.pop(lamp, 1.8);
      await S.to(beamK.rotation, { y: beamK.rotation.y + Math.PI * 2 }, 1.2, 'inOut'); beamK.visible = false; lhBusy = false;
    } });
    S.curio(ferry, { id: 'ferry', label: '小渡輪', tap: () => { S.sound('soft'); ferryT = 1.2; S.show(puff, .25); S.wait(.9).then(() => S.hide(puff, .3)); } });
    S.curio(mcat, { id: 'minicat', label: '小貓', tap: async () => {
      if (catBusy) return; catBusy = true; S.sound('tick');
      const away = fish.position.x < .8, y0 = ROW[0].y;
      S.to(fish.position, { x: away ? 1.0 : .7, y: y0 + .06 }, .25, 'out').then(() => S.to(fish.position, { y: y0 + .015 }, .2, 'bounce'));
      await S.wait(.25); mcat.scale.x = away ? 1 : -1; await S.to(mcat.position, { x: away ? .85 : .55 }, .55, 'inOut'); catBusy = false;
    } });

    // ---- 阿滿姨's tea stall: a big empty urn and a shelf
    let lid, steam = [], urnTop, urnSeat, slot0;
    S.plant(-1.6, -1.05, (g) => {
      tab(g, 1.0);
      box(g, 0, .17, 0, .9, .34, .8, '#b4644a'); box(g, 0, .2, .405, .3, .16, .02, C.dark);
      cyl(g, 0, .72, 0, .36, .33, .76, '#c9875a', 16); cyl(g, 0, .52, 0, .37, .37, .05, '#a86a42', 16); cyl(g, 0, .92, 0, .37, .37, .05, '#a86a42', 16);
      beam(g, [.12, .45, .32], [.12, .45, .44], .025, C.gold, 6);
      lid = keep(g, 0, 1.1, 0); cyl(lid, 0, 0, 0, .34, .36, .05, '#a86a42', 16); cone(lid, 0, .09, 0, .3, .13, '#b97a4e', 16); ball(lid, 0, .18, 0, .045, C.gold, 1);
      urnTop = keep(g, 0, 1.6, .05); urnSeat = keep(g, 0, 1.31, .02);
      for (let i = 0; i < 3; i++) { const p = keep(g, 0, 1.3, 0); const b = ball(p, 0, 0, 0, .14, WHITE, 1); b.scale.z = .5; p.visible = false; steam.push(p); }
    });
    S.curio(lid, { id: 'lid', label: '茶桶蓋', tap: async () => { S.sound('tap'); for (let i = 0; i < 2; i++) { await S.to(lid.position, { y: 1.22 }, .12, 'out'); await S.to(lid.position, { y: 1.1 }, .14, 'in'); } } });
    S.plant(-2.65, -1.45, (g) => {
      tab(g, .9);
      for (const sx of [-1, 1]) box(g, sx * .42, .6, 0, .06, 1.2, .3, C.wood);
      for (const y of [.35, .8, 1.2]) box(g, 0, y, 0, .9, .04, .32, C.wood);
      for (const [x, c] of [[-.25, C.pink], [-.05, C.lime]]) { cyl(g, x, .45, 0, .07, .07, .16, c, 10); cyl(g, x, .55, 0, .05, .05, .03, C.wood, 10); }
      for (const [x, c] of [[.15, C.honey], [.3, C.mint]]) cyl(g, x, .9, 0, .06, .06, .16, c, 10);
      slot0 = keep(g, .05, .82, .02);
    });

    // ---- the sign, the only words on the page
    S.plant(-5.0, .35, (g) => { tab(g, .5); beam(g, [0, 0, 0], [0, 1.25, 0], .035, C.bark, 6); tag(g, '島中島', 0, 1.02, .04, { h: .27, paper: C.white, ink: C.navy }); });

    // ---- the real grandmother on her bench, 阿滿姨, 小智, 小策
    let gran, auntie, zhi, ce;
    S.plant(-2.9, .95, (g) => {
      tab(g, 1.1);
      box(g, 0, .3, 0, 1.0, .06, .36, C.wood); for (const sx of [-1, 1]) box(g, sx * .4, .14, 0, .06, .28, .3, C.bark);
      box(g, 0, .62, -.17, 1.0, .2, .04, C.wood); for (const sx of [-1, 1]) beam(g, [sx * .4, .3, -.17], [sx * .4, .72, -.17], .025, C.bark, 4);
      gran = S.person(g, { x: .1, y: .12, z: -.04, kind: 'elder', coat: C.plum, prop: false }); scarf(gran);
    });
    S.plant(-.9, -.45, (g) => {
      auntie = S.person(g, { kind: 'adult', coat: C.coral, hair: C.ink });
      poly(auntie.inner, [[-.15, .3], [.15, .3], [.12, .62], [-.12, .62]], .02, WHITE, 0, 0, .04);
      box(auntie.head, 0, .36, .02, .42, .07, .1, C.pink);
    });
    S.plant(2.75, 1.2, (g) => { zhi = S.robot(g, { s: .95, lights: S.index - 1 }); });
    S.plant(3.75, .55, (g) => { ce = S.person(g, { kind: 'ce', coat: C.navy }); });
    const cp = (p, id, label) => { const c = S.curio(p.root, { id, label, tap: () => p.hop() }); p.propId = c.id; };
    cp(gran, 'gran', '阿嬤'); cp(auntie, 'auntie', '阿滿姨'); cp(ce, 'ce', '小策');
    S.hero(zhi, { ready: () => st.phase === 'ready', go });

    // ---- the compass on the drafting paper
    let comp, compRing;
    S.plant(4.5, 1.5, (g) => {
      comp = keep(g, 0, 0, 0);
      beam(comp, [0, .02, 0], [0, .7, 0], .022, C.steel, 5); beam(comp, [0, .7, 0], [.3, .02, 0], .022, C.steel, 5);
      ball(comp, 0, .74, 0, .045, C.gold, 1); cone(comp, .3, .04, 0, .025, .06, C.dark, 6).rotation.z = Math.PI;
      compRing = keep(g, 0, .008, 0); const rr = ring(compRing, 0, 0, 0, .3, .012, C.red, 40); rr.rotation.x = Math.PI / 2; compRing.visible = false;
    });
    S.curio(comp, { id: 'compass', label: '圓規', tap: async () => {
      if (compBusy) return; compBusy = true; S.sound('whoosh'); S.show(compRing, 1.0);
      await S.to(comp.rotation, { y: comp.rotation.y + Math.PI * 2 }, 1.0, 'inOut'); compBusy = false;
    } });

    // ---- the story
    const fly = async (node, toWorld, dur = .7, lift = .7) => {
      const a = node.position.clone(), b = S.local(node.parent, toWorld), mid = { x: (a.x + b.x) / 2, y: Math.max(a.y, b.y) + lift, z: (a.z + b.z) / 2 };
      await S.to(node.position, mid, dur / 2, 'out'); await S.to(node.position, { x: b.x, y: b.y, z: b.z }, dur / 2, 'in');
    };
    async function go() {
      if (st.phase !== 'ready') return; S.set({ phase: 'busy' });
      auntie.still(); zhi.cheer(); S.sound('whoosh');
      // everybody on the island pops up as a little twin
      for (let i = 0; i < minis.length; i++) { const m = minis[i]; S.show(m.w, .3); if (i % 3 === 0) S.sound('tick'); await S.wait(.06); }
      await S.wait(.35);
      // a drop of each
      for (let i = 0; i < 3; i++) { S.to(pots[i].rotation, { z: -.5 }, .2, 'out').then(() => S.to(pots[i].rotation, { z: 0 }, .3, 'inOut')); S.burst(S.world(pots[i], [.15, .2, 0]), { n: 8, up: .8, speed: .5, colors: [POTS[i].tea, WHITE] }); await S.wait(.12); }
      minis.forEach((m) => m.hop(.4)); S.sound('pop');
      await S.wait(.5);
      // and into line in front of the one they like
      minis.forEach((m, i) => S.to(m.w.position, { x: MINIS[i].to[0], y: MINIS[i].to[1], z: MINIS[i].to[2] }, .55, 'inOut', i * .03));
      await S.wait(1.0); zhi.still();
      // nobody stands at the yellow one: back on the shelf in a second
      S.sound('whoosh'); zhi.hop();
      await fly(pots[1], S.world(slot0), .75, .9); S.sound('stamp'); S.wiggle(pots[1], .15);
      auntie.hop(); await S.wait(.6);
      // two lines exactly as long: the twins honestly cannot tell
      minis.forEach((m) => m.doubt()); signs.forEach((sg, i) => { sg.visible = true; S.show(sg, .3); }); S.sound('soft');
      await S.wait(.5); auntie.doubt(); ce.doubt();
      await S.wait(.4);
      tray.visible = true; S.show(tray, .35); S.sound('pop');
      S.set({ phase: 'touch' }); S.hint(tray, [0, .12, 0], '端給阿嬤'); S.focus(-.9);   // on a phone: keep the tray and the grandmother both in view
    }
    async function touch(byHand) {
      if (st.phase !== 'touch' || st.busy) return; st.busy = true; S.hint(null); S.refresh();
      auntie.still(); ce.still();
      const lap = S.world(gran.root, [.05, .52, .3]);
      if (byHand) { const b = S.local(tray.parent, lap); await S.to(tray.position, { x: b.x, y: b.y, z: b.z }, .3, 'out'); }
      else await fly(tray, lap, 1.1, .8);
      S.sound('tap'); gran.hop();
      // a sip of each
      for (const c of cups) { await S.to(c.position, { y: .3 }, .3, 'out'); S.sound('tick'); await S.wait(.35); await S.to(c.position, { y: .024 }, .25, 'inOut'); await S.wait(.15); }
      gran.wave(1.4); await S.wait(.2);
      S.pop(cups[1], 1.6); S.emote(gran, '♥', 2.2, C.red); S.burst(S.world(cups[1], [0, .15, 0]), { n: 14, up: 1.4, speed: .9, colors: [POTS[2].tea, C.red, '#fff3d6'] }); S.sound('done');
      await S.wait(.6);
      // her pick goes into the big urn, and the urn starts to brew
      signs.forEach((sg) => S.hide(sg, .25)); minis.forEach((m) => m.still());
      await fly(pots[2], S.world(urnTop), .9, .9); await S.to(pots[2].rotation, { z: -.9 }, .3, 'out');
      brewing = true; steam.forEach((p) => { p.visible = true; }); S.sound('rise');
      for (let i = 0; i < 2; i++) { await S.to(lid.position, { y: 1.22 }, .12, 'out'); await S.to(lid.position, { y: 1.1 }, .14, 'in'); }
      await S.to(pots[2].rotation, { z: 0 }, .3, 'inOut'); const seat = S.local(pots[2].parent, S.world(urnSeat)); await S.to(pots[2].position, { x: seat.x, y: seat.y, z: seat.z }, .3, 'bounce');
      auntie.cheer(); ce.cheer(); minis.forEach((m, i) => { if (i !== GRAN) m.cheer(); });
      // the little grandmother on the sand table waves to the real one, and she waves back
      const mg = minis[GRAN]; mg.still(); await S.to(mg.w.position, { x: -.95, y: ROW[0].y, z: .8 }, .8, 'inOut'); mg.wave(4); mg.hop(.5);
      await S.wait(.3); gran.wave(3);
      S.learn(zhi); zhi.cheer(); S.focus(.3);
      S.set({ phase: 'done' }); await S.wait(1); S.done();
    }
    S.carry(tray, { id: 'tray', label: '托盤', pad: .3, padAt: [0, .08, 0],
      tap: () => { if (st.phase === 'touch') touch(false); },
      targets: () => (st.phase !== 'touch' || st.busy ? [] : [{ at: () => S.world(gran.root, [0, .5, .1]), r: 150, drop: () => touch(true) }]) });
    S.act('go', go); S.act('touch', () => touch(false));
    S.on('reset', () => { lhBusy = false; ferryT = 0; catBusy = false; compBusy = false; brewing = false; });
    S.on('enter', async () => {
      auntie.doubt(); await S.wait(.6);
      S.wiggle(pots[0], .15); await S.wait(.25); S.wiggle(pots[1], .15); await S.wait(.25); S.wiggle(pots[2], .15); S.sound('tick');
      await S.wait(.5); zhi.hop(); zhi.wave(1.2); await S.wait(.4);
      S.set({ phase: 'ready' });
    });
    S.ui(() => ({
      caption: st.phase === 'done' ? '今天學到：' + DIARY : '',
      buttons: st.phase === 'ready' ? [{ id: 'go', label: '交給我！', primary: true }]
        : st.phase === 'busy' ? [{ id: 'go', label: '交給我！', primary: true, disabled: true }]
          : st.phase === 'touch' ? [{ id: 'touch', label: '請阿嬤喝', primary: true, disabled: st.busy }] : [],
    }));

    S.tick((t, dt) => {
      rays.rotation.z += dt * .05;
      if (ferryT > 0) ferryT -= dt;
      ferry.position.y = .77 + Math.sin(t * 2) * .006 + (ferryT > 0 ? Math.abs(Math.sin(t * 18)) * .02 : 0);
      if (brewing) steam.forEach((p, i) => { const u = (t * .35 + i / 3) % 1; p.position.set(Math.sin(u * 5 + i) * .08, 1.3 + u * 1.0, 0); p.scale.setScalar(Math.max(.001, (.5 + u * 1.2) * (1 - u * u))); });
    });
  },
};
