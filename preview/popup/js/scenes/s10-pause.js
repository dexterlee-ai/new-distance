// 第 10 頁｜結帳口｜〈體驗與猶豫〉第 17、18、15 篇
// 敲西瓜：日落的水果攤。阿嬤抱著西瓜站在收銀台前，貼著耳朵敲了又敲。小智把收銀機變大、價錢剪半、西瓜堆高一倍，
// 她看都沒看，越敲越快。讀者把西瓜上那一角拔出來：裡面紅通通。她笑著付錢，老闆當場切開分給大家。
import { C, keep, group, box, cyl, cone, ball, disc, ring, beam, poly, card, tri, tag, tab, cloud, cratePlank, skyDisc } from '../paper.js';

const DIARY = '她不是嫌貴，是怕不甜。';
const RIND = '#4f8c48', STRIPE = '#2f5d35', FLESH = '#e4524a', PALE = '#f4efd4', SEED = '#2d2f33';
const arc = (r, a0, a1, n = 14) => { const p = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push([Math.cos(a) * r, Math.sin(a) * r]); } return p; };

/** a whole watermelon (stripes running top to bottom); flat < 1 squashes it toward the page like a paper cut-out */
function melon(g, x, y, z, r, flat = .82) {
  const m = group(g); m.position.set(x, y, z); m.scale.z = flat;
  ball(m, 0, 0, 0, r, RIND, 1);
  for (const a of [-.62, 0, .62]) ring(m, 0, 0, 0, r * 1.01, r * .065, STRIPE, 18).rotation.y = Math.PI / 2 + a;
  beam(m, [0, r * .92, 0], [r * .12, r * 1.12, 0], r * .05, C.bark, 4);
  return m;
}
/** a slice of watermelon: the tip at (0, 0), the rind arc on top */
function slice(g, R = .2) {
  poly(g, [[0, 0], ...arc(R, Math.PI * .28, Math.PI * .72)], .03, RIND, 0, 0, 0);
  poly(g, [[0, 0], ...arc(R * .9, Math.PI * .28, Math.PI * .72)], .03, PALE, 0, 0, .012);
  poly(g, [[0, 0], ...arc(R * .82, Math.PI * .28, Math.PI * .72)], .03, FLESH, 0, 0, .024);
  for (const [sx, sy] of [[-.05, .55], [.05, .55], [0, .38]]) disc(g, sx * R / .2, sy * R, .058, R * .055, SEED, .01, 6);
}

export default {
  id: 's10-pause', land: 'ai', short: '怕不甜', calm: true,
  title: '顧客為什麼放進購物車就走？',
  sources: [{ n: 17 }, { n: 18 }, { n: 15 }],
  diary: DIARY,
  takeaway: '顧客停在結帳前，不是找不到按鈕，是怕後悔。把他擔心的事說清楚，他才往前。',
  quote: { t: '顧客不是不知道下一步在哪裡，而是不確定下一步會不會讓自己後悔。', n: 17, page: 153 },
  look: { bg: '#3f3350', table: '#8a7fa6', key: '#ffb98a', fill: '#b9b4ee', sky: '#ffd2c0' },   // sunset
  ground(G) {
    G.wash('#f2d6c4');
    G.rect(0, -3.3, 12.4, .7, '#f6b18c', { r: 0 });                  // the sky low in the west, on the far edge
    G.rect(0, -2.86, 12.4, .26, '#eec0bb', { r: 0 });
    // the market street: paving stones
    G.rect(0, .62, 12.4, 5.96, '#f0ddcb', { r: 0 });
    for (let i = 0; i < 10; i++) { const z = -2.3 + i * .62; G.path([[-6, z], [6, z]], { w: .018, col: '#c9a48c66', sharp: true });
      for (let j = 0; j < 12; j++) { const x = -5.7 + j * 1.05 + (i % 2) * .52; G.path([[x, z], [x, z + .62]], { w: .016, col: '#c9a48c55', sharp: true }); } }
    G.path([[-6, -2.36], [6, -2.36]], { w: .09, col: '#c79d84', sharp: true });
    // shade under the stall and the counter
    G.rect(-2.2, -1.25, 3.2, 1.3, '#e3c1ab', { r: .12 });
    G.rect(2.15, -.55, 1.95, .95, '#e3c1ab', { r: .12 });
    // a puddle of watermelon juice for the dog
    G.blob([[-3.05, 1.0], [-2.7, .92], [-2.45, 1.05], [-2.55, 1.3], [-2.9, 1.34], [-3.12, 1.2]], '#ec8b80');
    G.marks('dot', -3.3, -.45, -1.1, .55, { n: 9, col: '#2d2f3366', size: .16, seed: 5 });   // spilled seeds
  },
  build(S) {
    const st = S.state({ phase: 'intro', busy: false });
    const gp = { lean: 1 };                      // 1 = she is bent over her melon, listening
    let knockT = 0, lastKn = -1, fast = false, dragging = false, shake = 0, flyT = 0, flyAway = 0, spin = .12, tailT = 0, rolling = false, swatting = false, licking = false;

    // ---- the sun, about to set
    // (the curio is a wrapper: a tapped curio wobbles its own rotation.z, which would cancel the spin of the rays)
    let rays, sun;
    S.plant(-4.8, -3.25, (g) => { sun = keep(g); rays = skyDisc(sun, { y: .12, r: .5, col: '#ef7d4f' }); });
    S.curio(sun, { id: 'sun', label: '太陽', tap: () => { S.to(rays.rotation, { z: rays.rotation.z + Math.PI / 2 }, .9, 'out'); } });
    S.plant(-2.6, -3.3, (g) => cloud(g, 1.1, 2.5, '#f8d2c8')); S.plant(3.0, -3.3, (g) => cloud(g, .9, 2.9, '#fadcd2'));

    // ---- the fruit stall: a mountain of watermelons under a big slice of watermelon
    let pile, roll, rollM, fly, swat, swatW, plank, cardL, cardR, snip, bladeA, bladeB; const extra = [];
    S.plant(-2.2, -1.3, (g) => {
      tab(g, 2.6);
      // the back wall and the two posts that hold the sign
      box(g, 0, .68, -.47, 2.7, 1.36, .06, '#d9a46c'); for (let i = 0; i < 4; i++) box(g, 0, .2 + i * .33, -.435, 2.7, .012, .01, '#b9834e');
      for (const sx of [-1, 1]) box(g, sx * 1.3, 1.03, -.42, .1, 2.06, .1, C.bark);
      // the sign: half a watermelon, as big as the stall
      const R = .82, top = 2.06;
      poly(g, arc(R, 0, Math.PI, 22), .05, RIND, 0, top, -.44);
      poly(g, arc(R * .9, 0, Math.PI, 22), .05, PALE, 0, top, -.43);
      poly(g, arc(R * .8, 0, Math.PI, 22), .05, FLESH, 0, top, -.42);
      box(g, 0, top - .025, -.42, R * 2 + .04, .05, .07, '#2f5d35');
      for (const [sx, sy] of [[-.42, .2], [-.16, .34], [.14, .38], [.42, .22], [-.02, .58], [.26, .54], [-.3, .48]]) {
        const s = poly(g, [[0, -.05], [.03, 0], [0, .05], [-.03, 0]], .02, SEED, sx * R / .82, top + sy * R / .82, -.365); s.rotation.z = -sx * .9; }
      // three steps of shelf
      box(g, 0, .15, .2, 2.5, .3, .56, '#c98f5a');
      box(g, 0, .42, -.02, 2.0, .24, .44, '#d39c66');
      box(g, 0, .64, -.2, 1.6, .2, .36, '#dda772');
      // a plank from the crate is the front of the bottom shelf
      plank = cratePlank(g, 0, .15, .485, { len: 2.4, h: .2 });
      // the mountain (it trembles while she knocks)
      pile = keep(g);
      const r = .19;
      for (let i = 0; i < 6; i++) melon(pile, -.95 + i * .38, .3 + r, .22, r);
      for (let i = 0; i < 5; i++) melon(pile, -.76 + i * .38, .54 + r, 0, r);
      for (let i = 0; i < 3; i++) melon(pile, -.57 + i * .38, .74 + r, -.2, r);
      roll = keep(pile, .57, .74 + r, -.2); rollM = keep(roll); melon(rollM, 0, 0, 0, r);
      // the doubled mountain, hidden until 小智 piles it up
      for (const [n, y, z] of [[3, 1.25, -.24], [2, 1.57, -.26], [1, 1.89, -.28]]) for (let i = 0; i < n; i++) {
        const k = keep(pile, (i - (n - 1) / 2) * .38, y, z); melon(k, 0, 0, 0, r); k.visible = false; extra.push(k); }
      // the price card on a stick: two coins. Cut in half, it is half the price
      beam(g, [.82, .3, .42], [.82, .86, .42], .014, C.bark, 4);
      cardL = keep(g, .82, .98, .43); cardR = keep(g, .82, .98, .43);
      card(cardL, -.11, -.14, 0, .22, .28, C.white, .02, .03); card(cardR, .11, -.14, 0, .22, .28, C.white, .02, .03);
      for (const [k, sx] of [[cardL, -1], [cardR, 1]]) { disc(k, sx * .11, 0, .03, .07, C.gold, .02, 16); disc(k, sx * .11, 0, .042, .045, C.honey, .01, 16); }
      // 小智's scissors
      snip = keep(g, .82, 1.0, .52);
      bladeA = keep(snip); bladeB = keep(snip);
      poly(bladeA, [[0, 0], [.24, .03], [.24, -.01]], .015, C.steel, 0, 0, 0); ring(bladeA, -.07, .03, .008, .04, .012, C.red, 10);
      poly(bladeB, [[0, 0], [.24, -.03], [.24, .01]], .015, '#a9b9bd', 0, 0, .016); ring(bladeB, -.07, -.03, .024, .04, .012, C.red, 10);
      bladeA.rotation.z = .35; bladeB.rotation.z = -.35; snip.rotation.z = -Math.PI / 2; snip.visible = false;
      // a fly over the mountain, and the swatter hanging on the post
      fly = keep(g, 0, 1.4, .1); ball(fly, 0, 0, 0, .035, SEED, 0); for (const sx of [-1, 1]) poly(fly, [[0, 0], [sx * .07, .05], [sx * .05, -.01]], .006, '#ffffff', 0, .01, .01);
      swatW = keep(g, 1.38, 1.62, .06); swat = keep(swatW);
      beam(swat, [0, 0, 0], [0, -.5, 0], .016, C.wood, 4); card(swat, 0, -.76, 0, .2, .22, C.lime, .012, .04);
      for (let i = 0; i < 3; i++) box(swat, 0, -.7 + i * .06, .013, .17, .006, .004, '#8fa236');
    });
    S.curio(plank, { id: 'plank', label: '展示板', tap: () => { S.sound('tap'); S.pop(plank, 1.12); } });
    S.curio(roll, { id: 'roll', label: '西瓜', tap: async () => {
      if (rolling) return; rolling = true; S.sound('whoosh');
      await S.to(roll.position, { x: .98, y: .72, z: .02 }, .3, 'in'); S.to(rollM.rotation, { z: -5 }, .9, 'out');
      await S.to(roll.position, { x: 1.18, y: .5, z: .3 }, .22, 'lin'); await S.to(roll.position, { x: 1.42, y: .19, z: .78 }, .3, 'bounce'); S.sound('tap');
      await S.wait(.7); S.to(rollM.rotation, { z: 0 }, .6, 'inOut'); await S.to(roll.position, { x: .57, y: .93, z: -.2 }, .6, 'back'); S.sound('pop'); rolling = false;
    } });
    S.curio(swatW, { id: 'swat', label: '蒼蠅拍', tap: async () => {
      if (swatting) return; swatting = true; flyAway = 1;
      await S.to(swat.rotation, { z: -1.25 }, .14, 'in'); S.sound('stamp'); await S.wait(.2); await S.to(swat.rotation, { z: 0 }, .5, 'back'); swatting = false;
    } });

    // ---- the checkout: a counter, the till, a pan scale and a beach umbrella
    let reg, drawer, pan, canopy, coin, halves, cg;
    S.plant(2.15, -.6, (g) => {
      cg = g; tab(g, 1.6);
      box(g, 0, .31, 0, 1.6, .62, .62, '#c98f5a'); box(g, 0, .645, 0, 1.7, .05, .7, '#e8c48e');
      for (let i = 0; i < 5; i++) box(g, -.64 + i * .32, .31, .312, .012, .6, .01, '#b07a48');
      tag(g, '結帳口', -.2, .36, .32, { h: .24, paper: C.white, ink: C.navy });
      // the till: it grows from its foot
      reg = keep(g, .3, .67, .02);
      box(reg, 0, .1, 0, .62, .2, .46, C.coral); box(reg, 0, .205, .0, .6, .012, .44, '#d76f58');
      for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) box(reg, -.18 + j * .12, .225, .04 + i * .1, .08, .03, .07, C.white);
      beam(reg, [0, .2, -.16], [0, .4, -.16], .025, C.dark, 5);
      box(reg, 0, .47, -.16, .36, .17, .06, C.dark); disc(reg, 0, .47, -.122, .045, C.gold, .012, 14);
      drawer = keep(reg, 0, .05, .2); box(drawer, 0, 0, 0, .52, .08, .14, '#f3b9a3'); disc(drawer, 0, 0, .075, .02, C.dark, .01, 8);
      // the pan scale, with a little melon on it
      box(g, -.6, .7, .08, .28, .08, .24, C.steel); beam(g, [-.6, .74, .08], [-.6, .82, .08], .02, C.dark, 5);
      pan = keep(g, -.6, .83, .08); cyl(pan, 0, .02, 0, .17, .12, .04, '#e4e6df', 14); melon(pan, 0, .14, 0, .12);
      // the beach umbrella
      beam(g, [.68, 0, -.44], [.68, 2.16, -.44], .025, C.white, 6); tab(g, .3);
      canopy = keep(g, .68, 2.12, -.44);
      for (let i = 0; i < 10; i++) { const a0 = i * Math.PI / 5, a1 = (i + 1) * Math.PI / 5; tri(canopy, [0, .34, 0], [Math.cos(a0) * .98, 0, Math.sin(a0) * .98], [Math.cos(a1) * .98, 0, Math.sin(a1) * .98], i % 2 ? PALE : C.coral); }
      ball(canopy, 0, .36, 0, .04, C.gold);
      // things for the end: the coin she pays with, and her melon cut in two
      coin = keep(g, 0, 0, 0); disc(coin, 0, 0, 0, .07, C.gold, .02, 16); disc(coin, 0, 0, .012, .045, C.honey, .01, 16); coin.visible = false;
      halves = keep(g, -.2, .67, .16);
      for (const sx of [-1, 1]) { const h = keep(halves, sx * .17, 0, 0); h.rotation.z = -sx * .25;
        poly(h, arc(.24, 0, Math.PI, 16), .04, RIND, 0, 0, 0); poly(h, arc(.215, 0, Math.PI, 16), .04, PALE, 0, 0, .012); poly(h, arc(.195, 0, Math.PI, 16), .04, FLESH, 0, 0, .024);
        for (const [x, y] of [[-.08, .07], [.06, .1], [0, .15]]) disc(h, x, y, .067, .014, SEED, .008, 6); }
      halves.visible = false;
    });
    S.curio(pan, { id: 'scale', label: '秤盤', tap: async () => { S.sound('tick'); await S.to(pan.position, { y: .76 }, .12, 'in'); await S.to(pan.position, { y: .83 }, .7, 'elastic'); } });
    S.curio(canopy, { id: 'umbrella', label: '陽傘', tap: () => { S.sound('whoosh'); spin = 9; } });

    // ---- the dog, licking up the juice
    let dog, dogHead, tail;
    S.plant(-3.45, 1.08, (g) => {
      dog = keep(g); tab(g, .5);
      poly(dog, [[-.26, .16], [.16, .16], [.18, .36], [-.24, .36]], .08, '#d9a066', 0, 0, -.04);
      for (const x of [-.2, -.08, .06, .14]) box(dog, x, .08, 0, .055, .17, .05, '#c98a52');
      tail = keep(dog, -.25, .33, 0); poly(tail, [[0, 0], [-.04, .16], [-.01, .17], [.03, 0]], .03, '#c98a52', 0, 0, -.015);
      dogHead = keep(dog, .17, .36, 0);
      poly(dogHead, [[-.04, -.06], [.1, -.06], [.24, -.1], [.25, .02], [.12, .12], [-.03, .1]], .09, '#e0ab72', 0, 0, -.045);
      poly(dogHead, [[.0, .08], [.07, .1], [.03, -.06]], .02, C.bark, 0, 0, .05);
      disc(dogHead, .13, .04, .05, .018, SEED, .01, 8); ball(dogHead, .25, -.04, 0, .025, SEED, 0);
      poly(dogHead, [[.18, -.1], [.22, -.1], [.21, -.17], [.19, -.17]], .02, '#ef7f86', 0, 0, .01);
      dogHead.rotation.z = -.45;
    });
    S.curio(dog, { id: 'dog', label: '小狗', tap: async () => {
      if (licking) return; licking = true; S.sound('soft');
      for (let i = 0; i < 3; i++) { await S.to(dogHead.rotation, { z: -.7 }, .14, 'in'); await S.to(dogHead.rotation, { z: -.25 }, .16, 'out'); }
      await S.to(dogHead.rotation, { z: -.45 }, .3, 'inOut'); licking = false;
    } });

    // ---- the place's people
    let shop, ce, gran, melonK, plug, hole, purse, marks, zhi; const slices = [];
    S.plant(3.4, .35, (g) => {
      shop = S.person(g, { s: 1.08, kind: 'adult', coat: '#5c8a63', hair: C.ink });
      poly(shop.inner, [[-.13, .3], [.13, .3], [.11, .66], [-.11, .66]], .02, C.white, 0, 0, .045);
    });
    const sp = S.curio(shop.root, { id: 'shop', label: '老闆', tap: () => { shop.hop(); } }); shop.propId = sp.id;
    S.plant(4.2, 1.55, (g) => { ce = S.person(g, { s: 1.05, kind: 'ce', coat: C.navy }); });
    const cp = S.curio(ce.root, { id: 'ce', label: '小策', tap: () => { ce.hop(); } }); ce.propId = cp.id;

    S.plant(1.05, .95, (g) => {
      gran = S.person(g, { s: 1.38, kind: 'elder', coat: '#c0704f' });
      // the melon she holds to her ear, with a little wedge cut into its face
      melonK = keep(gran.inner, -.34, .76, .08);
      melon(melonK, 0, 0, 0, .27, .7);
      const W = [[-.12, .07], [.12, .07], [0, -.13]], W2 = [[-.15, .088], [.15, .088], [0, -.162]];
      hole = keep(melonK, 0, -.01, .145);
      poly(hole, W2, .03, PALE, 0, 0, 0); poly(hole, W, .012, FLESH, 0, 0, .024);
      for (const [x, y] of [[-.04, .02], [.04, .02], [0, -.05]]) disc(hole, x, y, .022, .012, SEED, .006, 6);
      plug = keep(melonK, 0, -.01, .17);
      poly(plug, W, .09, FLESH, 0, 0, -.08); poly(plug, W, .02, '#3f7a3c', 0, 0, .01); beam(plug, [0, .065, .032], [0, -.09, .032], .012, STRIPE, 4);
      for (const [x, y] of [[-.04, .02], [.04, .02], [0, -.05]]) disc(plug, x, y, -.086, .013, SEED, .006, 6);
      // her purse
      purse = keep(gran.armL, 0, -.38, .06);
      beam(purse, [-.05, -.06, 0], [0, .0, 0], .01, C.deep, 4); beam(purse, [0, 0, 0], [.05, -.06, 0], .01, C.deep, 4);
      card(purse, 0, -.21, 0, .17, .15, '#8f3f4d', .05, .04); ball(purse, 0, -.06, .03, .025, C.gold, 0);
      // the sound of her knocking
      marks = keep(melonK, -.4, .08, .02);
      for (const k of [0, 1]) { const x = -k * .07; beam(marks, [x, .07, 0], [x - .035, 0, 0], .011, C.ink, 4); beam(marks, [x - .035, 0, 0], [x, -.07, 0], .011, C.ink, 4); }
      marks.visible = false;
    });
    const grp = S.curio(gran.root, { id: 'gran', label: '阿嬤', tap: () => { if (st.phase === 'done') gran.hop(); else knockT = 0; } }); gran.propId = grp.id;

    S.plant(-.8, 1.45, (g) => { zhi = S.robot(g, { s: 1.08, lights: S.index - 1 }); });
    S.hero(zhi, { ready: () => st.phase === 'ready', go });

    // a slice for everyone at the end, held in the right hand
    for (const p of [gran, shop, ce, zhi]) { const k = keep(p.armR, 0, p.kind === 'robot' ? -.3 : -.36, .07); slice(k, p.kind === 'robot' ? .2 : .19); k.visible = false; slices.push(k); }

    // ---- the story
    async function go() {
      if (st.phase !== 'ready') return; S.set({ phase: 'busy' });
      zhi.cheer(); S.sound('whoosh');
      // 1. the till grows bigger than anyone
      S.to(reg.scale, { x: 2.3, y: 2.3, z: 2.3 }, .55, 'back'); S.sound('rise');
      await S.wait(.6); shop.hop();
      // 2. half the price: snip
      S.show(snip, .2); await S.wait(.25);
      for (let i = 0; i < 2; i++) { S.to(bladeA.rotation, { z: 0 }, .1, 'in'); await S.to(bladeB.rotation, { z: 0 }, .1, 'in'); S.sound('tick'); S.to(bladeA.rotation, { z: .35 }, .12); await S.to(bladeB.rotation, { z: -.35 }, .12); }
      S.hide(snip, .2);
      S.to(cardR.rotation, { x: -1.45, z: .5 }, .55, 'inOut'); await S.to(cardR.position, { x: 1.12, y: .03, z: .82 }, .55, 'bounce'); S.sound('tap');
      // 3. twice the watermelons
      for (let i = 0; i < extra.length; i++) { S.show(extra[i], .22); S.sound('tick'); await S.wait(.13); }
      zhi.still(); zhi.wave(1);
      await S.wait(.5);
      // she has not looked up once: she knocks faster, and the whole mountain shakes
      fast = true; knockT = 0;
      await S.wait(1.4); zhi.doubt(); shop.doubt(); ce.doubt();
      await S.wait(.8);
      S.set({ phase: 'touch' }); S.hint(plug, [0, -.02, .06], '拔出一角');
    }
    const pr = { u: 0 }; let springing = false;
    const pull = S.pull(plug, { id: 'plug', label: '拔出一角', from: [0, -.01, .17], to: [-.1, .85, .3], pad: .2, padAt: [0, -.01, 0],
      move: (u) => { dragging = true; if (st.phase !== 'touch' && u > .22) { pull.set(.22); return; } plug.rotation.x = -u * .9; },
      end: (u) => { dragging = false; if (st.phase === 'touch' && u > .45) touch(true); else { pr.u = u; springing = true; S.to(pr, { u: 0 }, .35, 'back').then(() => { springing = false; }); S.sound('tap'); } },
      tap: () => { if (st.phase === 'touch') touch(false); } });
    async function touch(byHand) {
      if (st.phase !== 'touch' || st.busy) return; st.busy = true; S.hint(null); S.refresh(); fast = false; dragging = true;
      // the wedge comes out: it is red right through
      pr.u = pull.value(); springing = true; await S.to(pr, { u: 1 }, byHand ? .2 : .45, 'out'); springing = false;
      S.sound('pop'); S.burst(S.world(melonK, [0, 0, .2]), { n: 14, up: 1.6, speed: 1, colors: [FLESH, RIND, '#fff3d6'] });
      S.to(plug.rotation, { x: -Math.PI }, .5, 'out'); await S.to(plug.position, { y: .72, z: .5 }, .5, 'out');
      zhi.still(); shop.still(); ce.still();
      await S.to(gp, { lean: 0 }, .45, 'inOut');
      // a taste: it is sweet
      const mouth = S.local(melonK, S.world(gran.head, [0, .1, .12]));
      await S.to(plug.position, { x: mouth.x, y: mouth.y, z: mouth.z }, .4, 'inOut'); S.hide(plug, .2); S.sound('soft');
      gran.cheer(); S.emote(gran, '♥', 1.8); ce.hop();
      await S.wait(1.0); gran.still();
      // she pays: the till is its own size again, and the coin rings in
      S.to(reg.scale, { x: 1, y: 1, z: 1 }, .5, 'inOut');
      await S.to(drawer.position, { z: .36 }, .25, 'out');
      const a = S.local(cg, S.world(purse, [0, -.14, .08])), b = S.local(cg, S.world(drawer, [0, .06, 0]));
      coin.position.copy(a); coin.visible = true; coin.scale.setScalar(1);
      S.to(coin.position, { x: b.x, z: b.z }, .55, 'lin'); await S.to(coin.position, { y: Math.max(a.y, b.y) + .5 }, .27, 'out'); await S.to(coin.position, { y: b.y }, .28, 'in');
      S.hide(coin, .1); S.sound('done'); await S.to(drawer.position, { z: .2 }, .2, 'in'); S.pop(reg, 1.08);
      // the seller cuts it open on the spot and hands it round
      const cut = S.local(melonK.parent, S.world(cg, [-.2, .9, .16]));
      shop.hop(); await S.to(melonK.position, { x: cut.x, y: cut.y, z: cut.z }, .5, 'inOut');
      melonK.visible = false; S.show(halves, .3); S.sound('stamp');
      await S.wait(.35);
      for (const k of slices) { S.show(k, .3); S.sound('tick'); await S.wait(.14); }
      gran.cheer(); shop.cheer(); ce.cheer(); zhi.cheer();
      S.burst(S.world(gran.root, [0, 1.6, 0]), { n: 18, up: 2.2, speed: 1.2, colors: [FLESH, RIND, '#fff3d6'] });
      await S.wait(1.1); zhi.still(); S.learn(zhi);
      await S.wait(.5); gran.still(); gran.wave(3); shop.still(); ce.still(); ce.wave(1.6);
      S.set({ phase: 'done' }); await S.wait(1.0); S.done();
    }
    S.act('go', go); S.act('touch', () => touch(false));
    S.on('reset', () => { gp.lean = 1; knockT = 0; lastKn = -1; fast = false; dragging = false; shake = 0; flyAway = 0; spin = .12; rolling = swatting = licking = false; springing = false; pr.u = 0; });
    S.on('enter', async () => {
      await S.wait(1.6); S.set({ phase: 'ready' });
    });
    S.ui(() => ({
      caption: st.phase === 'done' ? '今天學到：' + DIARY : '',
      buttons: st.phase === 'ready' ? [{ id: 'go', label: '交給我！', primary: true }]
        : st.phase === 'busy' ? [{ id: 'go', label: '交給我！', primary: true, disabled: true }]
          : st.phase === 'touch' ? [{ id: 'touch', label: '切一角', primary: true, disabled: st.busy }] : [],
    }));

    S.tick((t, dt) => {
      rays.rotation.z += dt * .05;
      spin += (.12 - spin) * Math.min(1, dt * 1.2); canopy.rotation.y += dt * spin;
      tailT += dt; tail.rotation.z = Math.sin(tailT * (licking ? 18 : 6)) * .35;
      // the fly loops over the mountain; swatted, it zips off and comes back
      flyT += dt * (flyAway > 0 ? 4 : 1.6); flyAway = Math.max(0, flyAway - dt * .45);
      const fr = .35 + flyAway * 1.6;
      fly.position.set(Math.cos(flyT) * fr * 1.3, 1.35 + Math.sin(flyT * 2.3) * .1 + flyAway * .8, .1 + Math.sin(flyT) * fr * .5);
      if (springing) pull.set(pr.u);
      for (const k of slices) k.rotation.z = -k.parent.rotation.z; purse.rotation.z = -gran.armL.rotation.z;   // the slices stay upright in a waving hand
      // 阿嬤 bent over her melon, knocking: (her arms are set here, after the kit has posed her)
      if (gp.lean > .001) {
        const L = gp.lean, bursts = fast ? { n: 6, hz: 6.5, rest: .55 } : { n: 3, hz: 3.4, rest: 1.5 };
        const knocking = st.phase !== 'done' && !dragging && !st.busy;
        let pulse = 0;
        if (knocking) {
          knockT += dt; const len = bursts.n / bursts.hz, cyc = len + bursts.rest, u = knockT % cyc;
          const kn = u < len ? Math.floor(u * bursts.hz + .5) : -1;
          if (u < len) pulse = Math.sin(Math.PI * ((u * bursts.hz) % 1));
          if (kn !== lastKn && kn >= 1) { S.sound(fast ? 'tick' : 'tap'); S.pop(melonK, 1.05); if (fast) shake = 1; }
          lastKn = kn;
        }
        marks.visible = knocking && pulse > .8;
        gran.inner.rotation.z += .16 * L; gran.head.rotation.z += .34 * L; gran.eyes.position.x = gran.eyes.position.x * (1 - L) - .035 * L;
        gran.armL.rotation.z = gran.armL.rotation.z * (1 - L) + -.62 * L;
        gran.armR.rotation.z = gran.armR.rotation.z * (1 - L) + (-.92 - .3 * pulse) * L;
        if (st.phase === 'touch') gran.inner.position.y = 0;        // hold still while the reader works the wedge
      } else marks.visible = false;
      shake = Math.max(0, shake - dt * 1.6);
      pile.position.x = Math.sin(t * 47) * .014 * shake; pile.rotation.z = Math.sin(t * 39) * .012 * shake;
    });
  },
};
