// 第 1 頁｜啟程港｜唐心慧〈AI for Growth：看懂世界，加速成長〉p.6–11
// 木箱上的臉：清晨，小智裝在木箱裡到港。它調了又調，就是不端出來，渡輪要開了。
// 把第一杯遞給等船的阿嬤：她的表情被畫在木箱上，小智馬上改；第三杯，她笑著上船。
import { C, keep, box, cyl, cone, ball, disc, ring, beam, poly, card, tag, tab, cloud, flag } from '../paper.js';

const DIARY = '先端出一杯，臉會告訴我怎麼改。';
const TEA = ['#6f4326', '#a56d36', '#dba63f'];   // too strong, better, just right
const CHALK = '#fffaf0';

/** a chalk face: 'frown' | 'flat' | 'smile' */
function face(g, mood) {
  ring(g, 0, 0, 0, .118, .013, CHALK, 20);
  for (const sx of [-1, 1]) disc(g, sx * .042, .034, 0, .017, CHALK, .012, 8);
  const m = mood === 'frown' ? [[-.052, -.062], [0, -.034], [.052, -.062]] : mood === 'smile' ? [[-.056, -.03], [0, -.066], [.056, -.03]] : [[-.048, -.046], [.048, -.046]];
  for (let i = 0; i < m.length - 1; i++) beam(g, [m[i][0], m[i][1], 0], [m[i + 1][0], m[i + 1][1], 0], .011, CHALK, 4);
}

export default {
  id: 's01-loop', land: 'prologue', short: '先端出一杯', calm: true,
  title: '計畫沒做完，可以先推出去嗎？',
  sources: [{ n: 1 }],
  diary: DIARY,
  takeaway: '別等計畫完美：先小小試一次，看反應、調一下，再試。市場不會等。',
  quote: { t: '競爭優勢不在計劃更聰明，而在學習循環更快。', n: 1, page: 7 },
  look: { bg: '#39415f', table: '#7a86a8', key: '#ffd2ad', fill: '#b9c2f0', sky: '#ffe1d6' },   // dawn
  ground(G) {
    G.wash('#a9c3d6');
    G.rect(0, -3.25, 12.4, .8, '#f2c9be', { r: 0 });                 // first light on the far water
    G.rect(0, -2.7, 12.4, .34, '#d2c7d8', { r: 0 });
    G.marks('wave', -6, -3.6, 6, -1.5, { n: 46, col: '#ffffff77', size: .18, seed: 11 });
    // the pier
    G.rect(0, 1.25, 12.4, 5.2, '#e6d3a1', { r: 0 });
    for (let i = 0; i < 11; i++) G.path([[-6, -1.05 + i * .45], [6, -1.05 + i * .45]], { w: .022, col: '#b89f6a77', sharp: true });
    for (let i = 0; i < 14; i++) G.path([[-5.6 + i * .86 + (i % 2) * .2, -1.3], [-5.6 + i * .86 + (i % 2) * .2, 3.6]], { w: .014, col: '#b89f6a44', sharp: true });
    G.path([[-6, -1.32], [6, -1.32]], { w: .1, col: '#b99b63', sharp: true });
  },
  build(S) {
    const st = S.state({ phase: 'intro', served: 0, busy: false });
    let hornT = 0, puffRate = .16, tinker = 0, gullBusy = false;

    // ---- the ferry: it leaves when it leaves
    let ferry, funnel, deckGran, gull, wing; const puffs = [];
    S.plant(-1.5, -2.45, (g) => {
      ferry = keep(g);
      poly(ferry, [[-1.9, .5], [2.0, .5], [1.65, 0], [-1.6, 0]], .8, '#f6ead0', 0, 0, -.4);
      poly(ferry, [[-1.92, .5], [2.02, .5], [1.99, .4], [-1.89, .4]], .84, C.red, 0, 0, -.42);
      box(ferry, -.45, .86, 0, 2.2, .7, .55, C.white); for (let i = 0; i < 5; i++) box(ferry, -1.25 + i * .4, .92, .28, .22, .24, .02, '#7fb1bb');
      box(ferry, -.45, 1.25, 0, 2.4, .08, .65, C.navy);
      flag(ferry, -1.5, 1.29, 0, .42, C.gold, .5);
      funnel = keep(ferry, .25, 1.29, 0); cyl(funnel, 0, .3, 0, .16, .18, .6, C.red, 8); cyl(funnel, 0, .6, 0, .17, .17, .1, C.dark, 8);
      for (let i = 0; i < 3; i++) { const p = keep(ferry, .25, 2.0, 0); const b = ball(p, 0, 0, 0, .17, C.white, 1); b.scale.z = .5; puffs.push(p); }
      gull = keep(ferry, -1.0, 1.3, .12);
      poly(gull, [[-.13, .02], [.08, 0], [.17, .07], [.1, .13], [-.04, .1]], .05, C.white, 0, 0, -.025);
      poly(gull, [[.15, .08], [.24, .07], [.15, .05]], .03, C.gold, 0, 0, -.015); disc(gull, .1, .09, .028, .014, C.ink, .008, 8);
      wing = keep(gull, -.02, .08, .03); poly(wing, [[-.12, 0], [.06, 0], [-.16, .1]], .02, '#c9cfd2', 0, 0, 0);
      deckGran = S.person(ferry, { x: 1.42, y: .5, z: .12, s: .62, kind: 'elder', coat: '#b5654f', prop: false }); deckGran.root.visible = false;
    }, { s: 1.25 });
    const horn = () => { S.sound('soft'); S.wiggle(funnel, .1); puffRate = .6; hornT = 0; };
    S.curio(funnel, { id: 'funnel', label: '渡輪', tap: horn });
    S.curio(gull, { id: 'gull', label: '海鷗', tap: async () => {
      if (gullBusy) return; gullBusy = true; S.sound('whoosh');
      await S.to(gull.position, { x: -.3, y: 2.25 }, .45, 'out'); await S.to(gull.position, { x: .95, y: 2.05 }, .6, 'inOut'); await S.to(gull.position, { x: -1.0, y: 1.3 }, .75, 'inOut'); gullBusy = false;
    } });

    // ---- the sun, just up (it will cross the sky page by page)
    let rays, sunK;
    S.plant(4.75, -3.2, (g) => {
      sunK = keep(g); rays = keep(sunK, 0, .02, -.03); for (let i = 0; i < 9; i++) { const a = Math.PI * i / 8; poly(rays, [[-.05, .62], [.05, .62], [0, .82]], .02, '#f3c27a', 0, 0, 0).rotation.z = a - Math.PI / 2; }
      disc(g, 0, .02, 0, .52, '#f4a66a', .04, 28);
    });
    S.curio(sunK, { id: 'sun', label: '太陽', tap: () => { S.to(rays.rotation, { z: rays.rotation.z + Math.PI / 2 }, .9, 'out'); } });   // the tap wobbles sunK; the rays inside are free to turn
    S.plant(-5.1, -3.1, (g) => cloud(g, 1.2, 2.7, '#f8ded6')); S.plant(2.3, -3.2, (g) => cloud(g, .9, 3.1, '#fbe6de'));

    // ---- the place sign: the only words on the page
    S.plant(-4.8, .1, (g) => {
      tab(g, .5); beam(g, [0, 0, 0], [0, 1.25, 0], .035, C.bark, 6);
      tag(g, '啟程港', 0, 1.02, .04, { h: .27, paper: C.white, ink: C.navy });
    });

    // ---- bollards, a rope and a crab at the edge of the pier
    let crab;
    for (const x of [-5.4, -3.0, 3.2, 5.5]) S.plant(x, -1.05, (g) => { cyl(g, 0, .2, 0, .1, .13, .4, C.bark, 8); cyl(g, 0, .42, 0, .15, .15, .06, C.dark, 8); });
    S.plant(4.35, -1.0, (g) => {
      beam(g, [-1.1, .34, 0], [-.55, .12, 0], .02, C.kraft, 5); beam(g, [-.55, .12, 0], [.55, .12, 0], .02, C.kraft, 5); beam(g, [.55, .12, 0], [1.1, .34, 0], .02, C.kraft, 5);
      crab = keep(g, -.3, .06, .22);
      const b = ball(crab, 0, .07, 0, .1, C.red, 1); b.scale.set(1.25, .6, .8);
      for (const sx of [-1, 1]) { ball(crab, sx * .15, .15, .02, .045, C.red, 0); for (let i = 0; i < 3; i++) beam(crab, [sx * .09, .05, -.03 + i * .04], [sx * .19, 0, -.05 + i * .06], .011, C.deep, 4); disc(crab, sx * .035, .14, .07, .014, C.ink, .01, 6); }
    });
    S.curio(crab, { id: 'crab', label: '螃蟹', tap: async () => { const x0 = -.3; S.sound('tick'); await S.to(crab.position, { x: crab.position.x > 0 ? x0 : .55 }, .55, 'inOut'); } });

    // ---- the crate 小智 came in. Opened, it is the tea stall; her faces get chalked on its front
    let lid, slip, zhi; const tower = [], cups = [], faces = [];
    S.plant(1.95, .6, (g) => {
      tab(g, 1.8);
      box(g, 0, .31, 0, 1.7, .62, .8, '#c99a63');
      for (const y of [.205, .41]) box(g, 0, y, .402, 1.7, .014, .01, '#a87a48');
      for (const sx of [-1, 1]) { box(g, sx * .8, .31, .405, .1, .62, .03, '#b3824e'); box(g, sx * .855, .31, 0, .012, .62, .8, '#b3824e'); }
      lid = keep(g, 0, .62, -.4); box(lid, 0, .03, .4, 1.76, .06, .84, '#b98a55'); for (const x of [-.5, .5]) box(lid, x, .066, .4, .09, .012, .84, '#a87a48');
      // 'this side up' on the inside of the lid: it faces the reader once the crate is open
      for (const x of [-.7, -.52]) poly(lid, [[-.035, 0], [.035, 0], [.035, .16], [.08, .16], [0, .29], [-.08, .16], [-.035, .16]], .008, C.red, x, -.003, .3).rotation.x = Math.PI / 2;
      // the slip on the crate: a sky lantern and a turn-back arrow
      slip = keep(g, -.6, .17, .414); slip.rotation.z = .07;
      card(slip, 0, 0, 0, .38, .3, C.white, .012, .02);
      poly(slip, [[-.05, 0], [.05, 0], [.066, .13], [-.066, .13]], .006, C.coral, -.09, .11, .013);
      poly(slip, [[-.022, 0], [.022, 0], [0, .04]], .006, C.gold, -.09, .06, .013);
      beam(slip, [.03, .215, .017], [.14, .215, .017], .01, C.red, 4); beam(slip, [.14, .215, .017], [.14, .105, .017], .01, C.red, 4); beam(slip, [.14, .105, .017], [.055, .105, .017], .01, C.red, 4);
      poly(slip, [[0, 0], [.05, .04], [.05, -.04]], .006, C.red, .012, .105, .013);
      // 小智 is still inside
      zhi = S.robot(g, { x: -.12, y: -.66, z: -.12, s: .95, prop: false, lights: 0 });
      // everything it will make: a tower of cups it keeps adjusting
      for (let r = 0; r < 4; r++) for (let j = 0; j < 4 - r; j++) {
        const k = keep(g, .3 + r * .085 + j * .17, .62 + r * .232, .2); cyl(k, 0, .11, 0, .075, .058, .22, C.white, 10); cyl(k, 0, .224, 0, .07, .07, .012, ['#8a5a30', '#b9803f', '#6f4326'][(r + j) % 3], 10);
        k.visible = false; tower.push(k);
      }
      // the cup that actually gets served: three tries
      for (let i = 0; i < 3; i++) {
        const k = keep(g, -.76, .62, .3); cyl(k, 0, .13, 0, .088, .066, .26, C.white, 10); cyl(k, 0, .264, 0, .083, .083, .014, TEA[i], 10); beam(k, [.02, .27, 0], [.07, .46, 0], .012, C.red, 4);
        k.visible = false; cups.push(k);
      }
      // her three faces, kept in order on the front of the crate
      ['frown', 'flat', 'smile'].forEach((m, i) => { const k = keep(g, -.12 + i * .31, .31, .425); face(k, m); k.visible = false; faces.push(k); });
    }, { s: 1.25 });
    S.curio(slip, { id: 'slip', label: '箱上的單子', tap: () => S.say(slip, '試用一天。天燈升空前不合用，原箱退回。', { who: '箱上的單子', dur: 3.2 }) });
    const zp = S.prop(zhi.root, { id: 'zhi', label: '小智', aim: [0, .7, 0], tap: () => { if (st.phase === 'ready') go(); else { zhi.hop(); zhi.wave(1.2); S.say(S.world(zhi.root, [0, 1.25, 0]), '交給我！', { dur: 1 }); } } }); zhi.propId = zp.id;

    // ---- 小策, arms crossed
    let ce;
    S.plant(4.4, 1.35, (g) => { ce = S.person(g, { s: 1, kind: 'ce', coat: C.navy }); });
    const cp = S.curio(ce.root, { id: 'ce', label: '小策', tap: () => { ce.hop(); } }); ce.propId = cp.id;

    // ---- the vegetable seller waiting for the next ferry
    let gran, basket, radish;
    S.plant(-5.6, 1.35, (g) => {
      gran = S.person(g, { x: 4.75, z: 0, s: 1, kind: 'elder', coat: '#b5654f' });
      basket = keep(g, 4.2, 0, .25);
      box(basket, 0, .12, 0, .42, .24, .3, C.kraft); box(basket, 0, .245, 0, .46, .03, .34, C.wood); beam(basket, [-.2, .25, 0], [0, .5, 0], .015, C.wood, 4); beam(basket, [0, .5, 0], [.2, .25, 0], .015, C.wood, 4);
      for (const x of [-.1, .12]) { ball(basket, x, .3, .02, .09, C.leaf, 0); }
      radish = keep(basket, 0, .3, .08); cone(radish, 0, .02, 0, .06, .2, C.white, 7).rotation.z = Math.PI; for (const sx of [-1, 0, 1]) poly(radish, [[-.02, 0], [.02, 0], [sx * .05, .13]], .012, C.leaf, 0, .1, 0);
    });
    const gp = S.curio(gran.root, { id: 'gran', label: '等船的阿嬤', tap: () => { gran.hop(); } }); gran.propId = gp.id;
    S.curio(basket, { id: 'basket', label: '菜籃', tap: async () => { await S.to(radish.position, { y: .62 }, .22, 'out'); await S.to(radish.position, { y: .3 }, .4, 'bounce'); } });

    // ---- the story
    async function go() {
      if (st.phase !== 'ready') return; S.set({ phase: 'busy' });
      zhi.cheer(); S.sound('whoosh');
      for (let i = 0; i < tower.length; i++) { S.show(tower[i], .2); if (i % 3 === 0) S.sound('tick'); await S.wait(.1); }
      await S.wait(.5); gran.doubt(); horn();            // the ferry is getting ready and she has not had a sip
      await S.wait(.9); zhi.still();
      await S.show(cups[0], .3);
      S.set({ phase: 'serve' }); S.hint(cups[0], [0, .22, 0], '遞給阿嬤');
    }
    async function serve(byHand) {
      if (st.phase !== 'serve' || st.busy || st.served > 2) return; st.busy = true; S.hint(null); S.refresh();
      const k = st.served, cup = cups[k], f = faces[k];
      if (!byHand) { const to = S.local(cup.parent, S.world(gran.root, [.26, .62, .16])); await S.to(cup.position, { x: to.x, y: to.y, z: to.z }, .45, 'inOut'); }
      S.sound('pop'); S.hide(cup, .2); gran.still(); gran.hop();
      await S.wait(.4);
      if (k === 0) gran.doubt(); else if (k === 2) gran.cheer(); else gran.wave(1.4);
      // her face: first over her head, then chalked on the crate
      const slot = f.position.clone(), from = S.local(f.parent, S.world(gran.root, [0, 1.62, .12]));
      f.position.copy(from); f.visible = true; f.scale.setScalar(.001); S.to(f.scale, { x: 2.1, y: 2.1, z: 2.1 }, .35, 'back'); S.sound('tick');
      await S.wait(1.0);
      ce.still(); ce.hop();
      S.to(f.scale, { x: 1, y: 1, z: 1 }, .5, 'inOut'); await S.to(f.position, { x: slot.x, y: slot.y, z: slot.z }, .5, 'inOut'); S.sound('tap');
      st.served = k + 1;
      if (k < 2) {
        zhi.hop(); S.sound('whoosh'); for (let i = k; i < tower.length; i += 2) S.pop(tower[i], 1.3);   // it changes the recipe at once
        await S.wait(.5); gran.still();
        await S.show(cups[k + 1], .3); st.busy = false; S.refresh(); S.hint(cups[k + 1], [0, .22, 0], '再遞一杯');
        return;
      }
      // the third one is right: she takes it aboard, and the ferry leaves on time
      zhi.cheer(); ce.cheer(); S.burst(S.world(gran.root, [0, 1.5, 0]), { n: 20, up: 2.4, speed: 1.3 });
      await S.wait(1.0); gran.still(); S.hide(basket, .2);
      await S.walk(gran, { x: 5.9, z: -2.15 }, 1.2);
      gran.root.visible = false; deckGran.root.visible = true; deckGran.wave(5); horn();
      zhi.still(); ce.still();
      const lamp = zhi.setLights(1); if (lamp) S.pop(lamp, 3.2); S.sound('rise');
      S.burst(S.world(zhi.root, [0, .8, .15]), { n: 16, up: 1.8, speed: 1, colors: ['#ffd15c', '#fff3d6'] });
      S.to(ferry.position, { x: -.95 }, 3.2, 'inOut'); zhi.wave(2); ce.wave(1.6);
      S.set({ phase: 'done' }); await S.wait(1.0); S.done();
    }
    cups.forEach((c, i) => S.carry(c, { id: 'cup' + i, label: '遞給阿嬤', pad: .26, padAt: [0, .15, 0], tap: () => serve(false),
      targets: () => [{ node: gran.root, r: 150, drop: () => serve(true) }] }));
    S.act('go', go); S.act('serve', () => serve(false));
    S.on('reset', () => { hornT = 0; puffRate = .16; tinker = 0; gullBusy = false; });
    S.on('enter', async () => {
      ce.doubt();
      await S.wait(.8); S.sound('pop');
      S.to(lid.rotation, { x: -1.82 }, .6, 'back');
      await S.wait(.3); await S.to(zhi.root.position, { y: .46 }, .5, 'back'); zhi.hop(); zhi.wave(1.6);
      await S.wait(.6); S.set({ phase: 'ready' });
    });
    S.ui(() => ({
      caption: st.phase === 'done' ? '今天學到：' + DIARY : '',
      buttons: st.phase === 'ready' ? [{ id: 'go', label: '交給我！', primary: true }]
        : st.phase === 'busy' ? [{ id: 'go', label: '交給我！', primary: true, disabled: true }]
          : st.phase === 'serve' ? [{ id: 'serve', label: '遞給阿嬤', primary: true, disabled: st.busy }] : [],
    }));

    S.tick((t, dt) => {
      ferry.position.y = Math.sin(t * 1.6) * .03; ferry.rotation.z = Math.sin(t * 1.3) * .012;
      puffRate += (.16 - puffRate) * Math.min(1, dt * .6);
      puffs.forEach((p, i) => { const u = (t * puffRate * 2 + i / 3) % 1; p.position.set(.25 + u * .5, 2.0 + u * 1.05, 0); p.scale.setScalar(Math.max(.001, (.45 + u * 1.1) * (1 - u * u))); });
      wing.rotation.z = gullBusy ? Math.sin(t * 22) * .7 : Math.sin(t * 2.2) * .06;
      rays.rotation.z += dt * .05;
      crab.position.y = .06 + Math.abs(Math.sin(t * 3)) * .012;
      if (st.phase === 'serve') {
        hornT += dt; if (hornT > 7) horn();              // the ferry will not wait for a perfect cup
        tinker += dt; if (tinker > .55 && !st.busy) { tinker = 0; S.pop(tower[Math.floor(t * 7) % tower.length], 1.18); }
      }
    });
  },
};
