// 第 11 頁｜藍染坊｜〈交付力〉第 20、21、4 篇
// 顏色全倒一起：天剛黑的染坊。小智抱起架上所有的顏料罐全倒在一起，一口氣把整排布染完：土灰色。
// 遠處別家晾的也是同一種灰，客人一手一條布，分不出來。讀者把阿藍婆那缸藍倒進染槽：藍色一條一條染過去，灰灰的遠景裡只有這一排是藍的。
import { C, keep, box, cyl, cone, ball, disc, ring, beam, poly, card, slab, tag, tab, cloud, cratePlank, skyDisc } from '../paper.js';

const DIARY = '先說好哪一樣不能換，再做一千個。';
const BLUE = '#33569b', DUN = '#a39a86', CLOTH = '#f6f1e4', TUB = '#8a5a3a';

/** a cloth hanging from its top edge (y = 0) down to -h. Its colours are layers that rise from the hem: lay(k, 'dun' | 'blue') */
function cloth(g, x, y, z, w, h, { dots = true } = {}) {
  const k = keep(g, x, y, z);
  box(k, 0, -h / 2, 0, w, h, .02, CLOTH); box(k, 0, -.03, .004, w + .02, .06, .03, '#ddd5c2');
  const layer = (col, dz) => { const L = keep(k, 0, -h, dz); box(L, 0, h / 2 - .03, 0, w, h - .06, .012, col); L.visible = false; return L; };
  const dun = layer(DUN, .014), blue = layer(BLUE, .026);
  // her pattern: little white rings, tied before dyeing
  if (dots) for (let r = 0; r <= Math.floor((h - .35) / .28); r++) for (const c of [-1, 1]) { if (w < .3 && c > 0) continue; ring(blue, w < .3 ? 0 : c * w * .22, .2 + r * .28 + (c > 0 ? .14 : 0), .012, Math.min(.055, w * .12), .012, CLOTH, 12); }
  return { k, dun, blue };
}

export default {
  id: 's11-spec', land: 'ai', short: '自己的藍', calm: true,
  title: '用 AI 做的，為什麼都長一樣？',
  sources: [{ n: 20 }, { n: 21 }, { n: 4 }],
  diary: DIARY,
  takeaway: '人人都用 AI 量產，做出來一模一樣、分不出誰是誰。先定下自己絕不妥協的規矩，同樣的產量才件件像你。',
  quote: { t: '而平均，正是品牌差異化最大的敵人。', n: 20, page: 177 },
  look: { bg: '#27304f', table: '#62749c', key: '#f6b79a', fill: '#9fb0ec', sky: '#e6c6d6' },   // just after dark
  ground(G) {
    G.wash('#e9e3d8');
    G.rect(0, -3.3, 12.4, .7, '#cfc6dc', { r: 0 });                 // the night coming in over the far edge
    G.rect(0, -2.86, 12.4, .24, '#ddd3dc', { r: 0 });
    // the dye yard: packed earth and flagstones
    G.rect(0, .62, 12.4, 5.96, '#ece4d6', { r: 0 });
    G.path([[-6, -2.38], [6, -2.38]], { w: .08, col: '#bfb3a0', sharp: true });
    G.marks('dot', -5.4, -1.8, 5.4, 3.2, { n: 40, col: '#c9bba366', size: .14, seed: 4 });
    // shade under the rack and the trough
    G.rect(-2.4, -1.15, 4.4, 1.0, '#ddd2bf', { r: .12 });
    G.marks('tick', -5.6, -2.2, 5.6, -1.6, { n: 26, col: '#b9ad9566', size: .14, seed: 21 });
  },
  build(S) {
    const st = S.state({ phase: 'intro', busy: false });
    let askT = 0, compare = false, birdBusy = false, catBusy = false, catSide = 0, pounding = false, spinStars = 0; const billow = [0, 0, 0, 0, 0, 0], bubbleT = [9, 9, 9];

    // ---- the moon, with a wrapper so a tap's wobble does not stop the stars turning
    let stars, moon;
    S.plant(4.4, -3.25, (g) => { moon = keep(g); stars = skyDisc(moon, { kind: 'moon', y: 1.3, r: .4 }); });
    S.curio(moon, { id: 'moon', label: '月亮', tap: () => { S.sound('soft'); spinStars = 1; } });
    S.plant(3.2, -3.4, (g) => cloud(g, .8, 2.3, '#d9d2e6'));

    // ---- the drying rack: six long cloths over the dye trough
    const cloths = []; let trough, poolDun, poolBlue, sparrow, plank;
    S.plant(-2.4, -1.4, (g) => {
      tab(g, 3.8);
      for (const sx of [-1, 1]) { box(g, sx * 1.95, 1.17, 0, .1, 2.34, .1, C.bark); beam(g, [sx * 1.95, 0, -.4], [sx * 1.95, 1.4, 0], .025, C.bark, 4); }
      beam(g, [-2.1, 2.25, 0], [2.1, 2.25, 0], .045, '#c8b27a', 8);                       // the bamboo pole
      for (const sx of [-1, 1]) beam(g, [sx * .45, 2.27, .02], [sx * .45, 2.42, .02], .012, C.ink, 3);
      tag(g, '藍染坊', 0, 2.58, .03, { h: .27, paper: C.white, ink: C.navy });   // the place sign, the only words on the page
      for (const sx of [-1, 1]) { beam(g, [sx * 1.95, 2.18, .07], [sx * 1.95, 1.98, .07], .008, C.ink, 3); ball(g, sx * 1.95, 1.88, .09, .1, C.gold, 1); }   // two lanterns
      for (let i = 0; i < 6; i++) { const c = cloth(g, -1.5 + i * .6, 2.22, 0, .5, 1.72); cloths.push(c); }
      // the trough at its foot, and the step in front made from a crate plank
      box(g, -.3, .15, .55, 3.3, .3, .32, '#7d5536'); box(g, -.3, .29, .55, 3.18, .02, .22, '#5a4a40');
      poolDun = keep(g, -.3, .305, .55); box(poolDun, 0, 0, 0, 3.16, .015, .21, DUN); poolDun.visible = false;
      poolBlue = keep(g, 1.33, .315, .55); box(poolBlue, -1.58, 0, 0, 3.16, .015, .21, BLUE); poolBlue.visible = false;
      trough = keep(g, -.3, .3, .55);
      box(g, -.3, .05, .86, 2.9, .1, .22, '#c9a274');
      plank = cratePlank(g, -.3, .1, .985, { len: 2.9, h: .2 });
      // a sparrow on the pole
      sparrow = keep(g, .95, 2.3, .04);
      const b = ball(sparrow, 0, .06, 0, .07, '#9a7a5a', 0); b.scale.set(1.3, 1, .7); ball(sparrow, .08, .12, 0, .045, '#9a7a5a', 0);
      poly(sparrow, [[.12, .13], [.17, .12], [.12, .1]], .02, C.gold, 0, 0, -.01); disc(sparrow, .095, .14, .03, .01, C.ink, .006, 6);
      poly(sparrow, [[-.08, .06], [-.2, .1], [-.18, .03]], .02, '#7d6046', 0, 0, -.01);
    });
    S.curio(plank, { id: 'plank', label: '墊腳板', tap: () => { S.sound('tap'); S.pop(plank, 1.1); } });
    S.curio(cloths[4].k, { id: 'wind', label: '布', tap: () => { S.sound('whoosh'); for (let i = 0; i < 6; i++) billow[i] = Math.max(billow[i], 1 - Math.abs(i - 4) * .22); } });
    S.curio(sparrow, { id: 'sparrow', label: '麻雀', tap: async () => {
      if (birdBusy) return; birdBusy = true; S.sound('whoosh');
      await S.to(sparrow.position, { x: 1.6, y: 3.0, z: .4 }, .45, 'out'); await S.to(sparrow.position, { x: .2, y: 3.2, z: .2 }, .6, 'inOut'); await S.to(sparrow.position, { x: .95, y: 2.3, z: .04 }, .55, 'inOut'); birdBusy = false;
    } });

    // ---- other dye houses far off: small racks, white cloths
    const far = [];
    for (const [x, z] of [[1.0, -2.75], [2.35, -2.95]]) S.plant(x, z, (g) => {
      tab(g, 1); for (const sx of [-1, 1]) box(g, sx * .62, .6, 0, .06, 1.2, .06, '#8a7a6a'); beam(g, [-.7, 1.16, 0], [.7, 1.16, 0], .025, '#c8b27a', 6);
      for (let i = 0; i < 3; i++) far.push(cloth(g, -.38 + i * .38, 1.14, 0, .3, .85, { dots: false }));
    });

    // ---- the paint shelf: every colour in the house
    const jars = [];
    S.plant(-4.4, .15, (g) => {
      tab(g, 1.1); box(g, 0, .42, -.12, 1.1, .84, .06, '#b9875a');
      for (const y of [.02, .44]) box(g, 0, y + .03, 0, 1.1, .06, .32, '#c9a274');
      [C.red, C.gold, C.leaf, C.pink, C.plum, C.aqua].forEach((col, i) => {
        const k = keep(g, -.34 + (i % 3) * .34, i < 3 ? .5 : .08, .02);
        cyl(k, 0, .15, 0, .12, .12, .3, col, 12); cyl(k, 0, .31, 0, .125, .125, .04, '#e9e3d8', 12); cyl(k, 0, .14, 0, .123, .123, .1, C.white, 12);
        jars.push(k);
      });
    });

    // ---- her vat of blue, on a little stand in front of the trough. It tips over backwards into the trough
    let vat, lip, stream;
    S.plant(-1.45, -.3, (g) => {
      tab(g, .8); box(g, 0, .12, 0, .74, .24, .7, '#6f4a30'); for (const sx of [-1, 1]) box(g, sx * .3, .12, .35, .06, .24, .03, '#5a3a24');
      vat = keep(g, 0, .25, -.36);
      cyl(vat, 0, .24, .36, .36, .31, .48, TUB, 16);
      for (const y of [.08, .4]) ring(vat, 0, y, .36, .32 + y * .1, .02, C.dark, 22).rotation.x = Math.PI / 2;
      cyl(vat, 0, .475, .36, .33, .33, .02, BLUE, 16);
      // her blue hand print on its side, and a drip over the rim
      poly(vat, [[-.05, 0], [.05, 0], [.06, .07], [.09, .14], [.06, .15], [.04, .1], [.035, .17], [.01, .17], [.0, .1], [-.02, .17], [-.045, .16], [-.04, .1], [-.07, .14], [-.09, .12], [-.06, .06]], .01, BLUE, -.08, .13, .68);
      poly(vat, [[-.025, 0], [.025, 0], [.02, -.08], [0, -.1], [-.02, -.08]], .01, BLUE, .17, .48, .66);
      stream = keep(g, 0, 0, 0); beam(stream, [0, .52, -.72], [0, .29, -.58], .07, BLUE, 8); stream.visible = false;
      lip = keep(g, 0, .73, .36);
    });

    // ---- people
    let gran, orders, cust, swA, swB, ce, zhi;
    S.plant(-.58, .4, (g) => {
      gran = S.person(g, { s: 1.15, kind: 'elder', coat: '#5b6b8c' });
      gran.root.traverse((o) => { if (o.isMesh && o.geometry.type === 'IcosahedronGeometry' && o.parent !== gran.head) o.material = o.material.clone(), o.material.color.set(BLUE); });   // hands blue to the wrist
      orders = keep(gran.inner, .02, .5, .09);
      for (let i = 0; i < 5; i++) { const s = box(orders, (i % 2) * .015 - .007, i * .025, 0, .26, .02, .2, i % 2 ? C.white : '#efe6d2'); s.rotation.x = -1.2; }
    });
    const gp = S.curio(gran.root, { id: 'gran', label: '阿藍婆', tap: () => { gran.hop(); } }); gran.propId = gp.id;
    S.plant(1.3, .7, (g) => {
      cust = S.person(g, { s: 1.08, kind: 'adult', coat: '#b5654f', hair: C.bark });
      swA = cloth(cust.armL, 0, -.38, .06, .16, .42, { dots: false }); swB = cloth(cust.armR, 0, -.38, .06, .16, .42, { dots: false });
      // the blue one keeps her rings
      for (const y of [.12, .28]) ring(swA.blue, 0, y, .012, .04, .01, CLOTH, 10);
    });
    const cup = S.curio(cust.root, { id: 'cust', label: '客人', tap: () => { cust.hop(); } }); cust.propId = cup.id;
    S.plant(3.1, 1.6, (g) => { ce = S.person(g, { s: 1, kind: 'ce', coat: C.navy }); });
    const cp = S.curio(ce.root, { id: 'ce', label: '小策', tap: () => { ce.hop(); } }); ce.propId = cp.id;
    S.plant(-3.2, .85, (g) => { zhi = S.robot(g, { s: 1.05, lights: S.index - 1 }); });
    S.hero(zhi, { ready: () => st.phase === 'ready', go });

    // ---- small things: a bubbling pot, the cat with blue feet, the cloth mallet
    let pot; const bubbles = [];
    S.plant(-4.75, 1.45, (g) => {
      tab(g, .5); pot = keep(g);
      cyl(pot, 0, .17, 0, .22, .19, .34, '#6f4a30', 12); ring(pot, 0, .3, 0, .215, .015, C.dark, 18).rotation.x = Math.PI / 2; cyl(pot, 0, .335, 0, .2, .2, .02, '#4b6f8f', 12);
      for (let i = 0; i < 3; i++) { const b = keep(pot, -.08 + i * .08, .36, (i - 1) * .05); ball(b, 0, 0, 0, .045, '#9bb3cf', 1); b.scale.setScalar(.001); bubbles.push(b); }
    });
    S.curio(pot, { id: 'pot', label: '染缸', tap: () => { S.sound('pop'); for (let i = 0; i < 3; i++) bubbleT[i] = -i * .18; } });

    let cat; const prints = [];
    S.plant(.75, 2.15, (g) => {
      for (let i = 0; i < 6; i++) { const p = keep(g, .25 + i * .24, .012, (i % 2 ? .05 : -.05)); slab(p, [[-.035, -.03], [.035, -.03], [.035, .03], [-.035, .03]], .006, BLUE, 0); p.visible = false; prints.push(p); }
      cat = keep(g, 0, 0, 0); tab(g, .4);
      poly(cat, [[-.2, .1], [.14, .1], [.17, .24], [-.18, .25]], .07, '#f1ece2', 0, 0, -.035);
      for (const x of [-.15, -.07, .06, .12]) { box(cat, x, .05, 0, .04, .1, .04, '#f1ece2'); box(cat, x, .012, .0, .045, .025, .045, BLUE); }
      const head = keep(cat, .17, .27, 0); poly(head, [[-.09, -.07], [.09, -.07], [.09, .06], [.06, .13], [.03, .07], [-.03, .07], [-.06, .13], [-.09, .06]], .07, '#f1ece2', 0, 0, -.035);
      for (const sx of [-1, 1]) disc(head, sx * .035, .0, .04, .012, C.ink, .006, 6);
      const tail = keep(cat, -.19, .22, 0); beam(tail, [0, 0, 0], [-.07, .18, 0], .02, '#f1ece2', 4); cat.userData.tail = tail;
    });
    S.curio(cat, { id: 'cat', label: '貓', tap: async () => {
      if (catBusy) return; catBusy = true; S.sound('tick'); const to = catSide ? 0 : 1.45;
      cat.scale.x = catSide ? -1 : 1;
      const n0 = prints.filter((p) => p.visible).length;
      await S.to(cat.position, { x: to }, 1.4, 'inOut');
      catSide = 1 - catSide; cat.scale.x = 1; catBusy = false;
      if (!n0) prints.forEach((p) => { p.visible = true; });
    } });

    let mallet;
    S.plant(-1.85, 1.95, (g) => {
      tab(g, .7); box(g, 0, .12, 0, .62, .24, .4, '#a8794e');
      box(g, 0, .26, 0, .44, .04, .3, BLUE); box(g, 0, .29, 0, .4, .03, .26, '#3d62a6');
      mallet = keep(g, .45, .4, 0); mallet.rotation.z = .12;
      beam(mallet, [0, 0, 0], [-.32, .0, 0], .022, C.wood, 5); const h = cyl(mallet, -.38, 0, 0, .07, .07, .2, C.bark, 10); h.rotation.x = Math.PI / 2;
    });
    S.curio(mallet, { id: 'mallet', label: '木槌', tap: async () => {
      if (pounding) return; pounding = true;
      for (let i = 0; i < 2; i++) { await S.to(mallet.position, { y: .58 }, .12, 'out'); await S.to(mallet.position, { y: .4 }, .1, 'in'); S.sound('stamp'); }
      pounding = false;
    } });

    // ---- the story
    const dye = (L, dur, delay = 0) => { L.visible = true; L.scale.y = .001; return S.to(L.scale, { y: 1 }, dur, 'out', delay); };
    async function go() {
      if (st.phase !== 'ready') return; S.set({ phase: 'busy' });
      zhi.cheer(); S.sound('whoosh');
      // every jar on the shelf goes in at once
      const at = (i) => S.local(jars[i].parent, S.world(trough, [-1.4 + i * .55, .55, 0]));
      for (let i = 0; i < jars.length; i++) {
        const j = jars[i], to = at(i), y0 = j.position.y;
        S.to(j.position, { x: to.x, z: to.z }, .5, 'inOut', i * .09);
        S.to(j.position, { y: Math.max(y0, to.y) + .9 }, .25, 'out', i * .09).then(() => S.to(j.position, { y: to.y }, .25, 'in'));
        S.to(j.rotation, { z: 2.4 }, .5, 'inOut', i * .09);
      }
      await S.wait(.6); S.sound('pop');
      jars.forEach((j, i) => S.wait(i * .09).then(() => S.hide(j, .15)));
      S.burst(S.world(trough, [0, .1, 0]), { n: 18, up: 1.4, speed: 1, colors: [C.red, C.gold, C.leaf, C.pink, C.plum, C.aqua] });
      S.show(poolDun, .3);
      await S.wait(.4);
      // the whole row in one go: dun, dun, dun …
      for (let i = 5; i >= 0; i--) { dye(cloths[i].dun, .28); billow[i] = .5; S.sound('tick'); await S.wait(.1); }
      await S.wait(.3);
      far.forEach((c, i) => dye(c.dun, .35, i * .04)); dye(swA.dun, .3); dye(swB.dun, .3);
      zhi.still(); zhi.wave(1.2);
      await S.wait(.9);
      // the customer cannot tell one from the other; her blue hand stops in the air
      compare = true; askT = 0; S.emote(cust, '?', 2.8); gran.doubt();
      await S.wait(1.4); zhi.doubt(); ce.doubt();
      await S.wait(.6);
      S.set({ phase: 'touch' }); S.hint(lip, [0, 0, 0], '倒進她的藍');
    }
    const pr = { u: 0 }; let springing = false;
    const pull = S.pull(lip, { id: 'vat', label: '倒進藍', from: [0, .73, .36], to: [0, 1.08, -.42], pad: .38,
      move: (u) => { if (st.phase !== 'touch' && u > .15) { pull.set(.15); return; } vat.rotation.x = -u * 1.0; },
      end: (u) => { if (st.phase === 'touch' && u > .5) touch(true); else { pr.u = u; springing = true; S.to(pr, { u: 0 }, .4, 'back').then(() => { springing = false; }); S.sound('tap'); } },
      tap: () => { if (st.phase === 'touch') touch(false); } });
    async function touch(byHand) {
      if (st.phase !== 'touch' || st.busy) return; st.busy = true; S.hint(null); S.refresh();
      pr.u = pull.value(); springing = true; await S.to(pr, { u: 1 }, byHand ? .25 : .6, 'inOut'); springing = false;
      S.show(stream, .2); S.sound('whoosh');
      // her blue runs down the trough …
      poolBlue.visible = true; poolBlue.scale.x = .001; await S.to(poolBlue.scale, { x: 1 }, .9, 'inOut');
      // … and climbs the cloths one after another, like a wave
      for (let i = 5; i >= 0; i--) { dye(cloths[i].blue, .45); billow[i] = 1; S.sound('tick'); await S.wait(.2); }
      S.hide(stream, .2); S.to(pr, { u: 0 }, .5, 'inOut'); springing = true;
      await S.wait(.55); springing = false;
      compare = false; cust.still(); gran.still(); zhi.still(); ce.still();
      dye(swA.blue, .4); S.sound('pop');
      await S.wait(.5);
      cust.cheer(); gran.cheer(); ce.cheer(); zhi.cheer();
      S.burst(S.world(cloths[2].k, [0, -.6, .1]), { n: 22, up: 2.2, speed: 1.2, colors: [BLUE, '#9fb0ec', '#fff3d6'] });
      await S.wait(1.1); zhi.still(); S.learn(zhi);
      await S.wait(.5); cust.still(); cust.wave(2.5); gran.still(); gran.wave(2); ce.still();
      S.set({ phase: 'done' }); await S.wait(1.0); S.done();
    }
    S.act('go', go); S.act('touch', () => touch(false));
    S.on('reset', () => { compare = false; birdBusy = catBusy = pounding = false; catSide = 0; spinStars = 0; springing = false; pr.u = 0; billow.fill(0); bubbleT.fill(9); });
    S.on('enter', async () => { await S.wait(1.5); S.set({ phase: 'ready' }); });
    S.ui(() => ({
      caption: st.phase === 'done' ? '今天學到：' + DIARY : '',
      buttons: st.phase === 'ready' ? [{ id: 'go', label: '交給我！', primary: true }]
        : st.phase === 'busy' ? [{ id: 'go', label: '交給我！', primary: true, disabled: true }]
          : st.phase === 'touch' ? [{ id: 'touch', label: '倒進藍', primary: true, disabled: st.busy }] : [],
    }));

    S.tick((t, dt) => {
      spinStars = Math.max(0, spinStars - dt * .5); stars.rotation.z += dt * (.04 + spinStars * 4);
      for (let i = 0; i < 6; i++) { billow[i] = Math.max(0, billow[i] - dt * .9); cloths[i].k.rotation.x = Math.sin(t * 1.3 + i * .8) * .025 - Math.sin(billow[i] * Math.PI) * .35; }
      far.forEach((c, i) => { c.k.rotation.x = Math.sin(t * 1.1 + i) * .03; });
      if (springing) pull.set(pr.u);
      for (let i = 0; i < 3; i++) { bubbleT[i] += dt; const u = bubbleT[i]; bubbles[i].scale.setScalar(u > 0 && u < .7 ? Math.max(.001, Math.sin(u / .7 * Math.PI) * 1.4) : .001); bubbles[i].position.y = .36 + Math.max(0, u) * .25; }
      if (catBusy) cat.position.y = Math.abs(Math.sin(t * 12)) * .02;
      if (cat.userData.tail) cat.userData.tail.rotation.z = Math.sin(t * 2.4) * .3;
      if (catBusy) prints.forEach((p) => { if (!p.visible && Math.abs(cat.position.x - p.position.x) < .1 && catSide === 0) p.visible = true; });
      // the swatches hang straight from the customer's hands
      for (const s of [swA, swB]) s.k.rotation.z = -s.k.parent.rotation.z;
      if (st.phase !== 'done') {
        // 阿藍婆 hugs her orders and reaches for her own blue
        gran.armR.rotation.z = -.55; gran.armL.rotation.z = -1.3 + Math.sin(t * 1.4) * (st.phase === 'touch' ? 0 : .06);
        // the customer holds up the two cloths; while comparing he looks from one to the other
        const sway = compare ? Math.sin(t * 2.6) : 0;
        cust.armL.rotation.z = -.75 - Math.max(0, -sway) * .5; cust.armR.rotation.z = .75 + Math.max(0, sway) * .5;
        if (compare) { cust.head.rotation.y = sway * .55; askT += dt; if (askT > 3.2) { askT = 0; S.emote(cust, '?', 2.8); } }
      } else cust.armL.rotation.z = -2.2;   // at the end he holds the blue one up
    });
  },
};
