// 第 4 頁｜雨傘屋｜陳蒔〈AI 可以幫人買東西：但品牌要讓人想買東西〉p.50–57
// 陰天的上午。小智把每樣東西都標上「最便宜」，再拉出一條長長的比價單攔路人；一下雨，沒有人停下來看價錢。
// 讀者拉屋簷下的繩子，屋頂那把收起來的大傘啪地撐開：路人擠到傘下，老闆遞上熱茶。下一朵烏雲來時，他們自己往這把傘跑。
import { T, C, keep, box, cyl, cone, ball, disc, ring, beam, poly, card, tri, tab, tag, bush, cloud, cratePlank, skyDisc } from '../paper.js';

const DIARY = '下雨的時候，先當一把傘。';
const KIOSK = { x: -1.7, z: -1.5 };              // the shop; its roof is the umbrella
const STREET = 1.2;                              // the walkers' plant stands on the street
const UNDER = [{ x: -1.0, z: -.8 }, { x: -.3, z: -.7 }];   // under the open umbrella, in the walkers' coordinates
const OUT = [{ x: .1, z: 0 }, { x: 1.2, z: 0 }];               // back on the street
const RAIN = '#8fb3c9', WET = '#b9d3e2';
const UP = new T.Vector3(0, 1, 0);

/** a price tag with no words: a coin and an arrow pointing down */
function priceTag(g, x, y, z, s = 1) {
  const k = keep(g, x, y, z); k.scale.setScalar(s);
  beam(k, [0, -.2, -.012], [0, .02, -.012], .012, C.wood, 4);
  card(k, 0, 0, 0, .27, .2, C.white, .02, .03);
  disc(k, -.06, .1, .028, .05, C.gold, .014, 14); disc(k, -.06, .1, .036, .028, C.honey, .006, 12);
  poly(k, [[-.02, .155], [.02, .155], [.02, .1], [.045, .1], [0, .045], [-.045, .1], [-.02, .1]], .012, C.red, .065, 0, .022);
  k.visible = false; return k;
}
/** a rod of unit length (along y) that can be stretched between two points every frame */
function rod(g, r, col) { const k = keep(g); cyl(k, 0, 0, 0, r, r, 1, col, 5); return k; }
function stretch(k, a, b) {
  const d = new T.Vector3().subVectors(b, a), L = Math.max(.001, d.length());
  k.position.copy(a).addScaledVector(d, .5); k.scale.set(1, L, 1); k.quaternion.setFromUnitVectors(UP, d.normalize());
}

export default {
  id: 's04-want', land: 'people', short: '先當一把傘', calm: true,
  title: 'AI 會幫人比價，我怎麼辦？',
  sources: [{ n: 7 }],
  diary: DIARY,
  takeaway: '等人開口問 AI 才出現，只能拚價格；在他需要的時刻先出現過，他會指名你。',
  quote: { t: '被 AI 找到，只是下一階段社群商務的門票；接下來的工作是回歸行銷的初心：挖掘 insight 、創造能喚醒購買動機的內容', n: 7, page: 51 },
  look: { bg: '#3c5560', table: '#8399a0', key: '#eef2f0', fill: '#c4d8e6', sky: '#eef4f6' },   // morning, overcast
  ground(G) {
    G.wash('#d9d6c8');
    G.rect(0, -3.15, 12.4, 1.0, '#c3cdbc', { r: 0 });                             // a strip of garden at the back
    G.marks('tick', -6, -3.55, 6, -2.7, { n: 70, col: '#8fa58a88', size: .14, seed: 4 });
    G.grid(.6, '#5a5a4a12', .012);                                                  // paving
    // the street the walkers take
    G.rect(0, STREET, 12.4, 1.15, '#c9c6b8', { r: 0 });
    for (const z of [STREET - .58, STREET + .58]) G.path([[-6, z], [6, z]], { w: .05, col: '#a9a597', sharp: true });
    G.path([[-6, STREET], [6, STREET]], { w: .03, col: '#ffffff88', dash: [.3, .25], sharp: true });
    // the shop's round step
    G.circle(KIOSK.x, KIOSK.z, 1.08, '#cbc3aa', { edge: '#b2a98d', edgeW: .03 });
    G.rect(KIOSK.x, KIOSK.z + 1.02, .7, .32, '#bdb397', { r: .05 });
    // puddles left by the night's rain
    G.blob([[-3.6, 1.8], [-3.2, 1.55], [-2.6, 1.68], [-2.45, 2.05], [-2.9, 2.3], [-3.5, 2.2]], '#a9c0cc', { edge: '#ffffff88', edgeW: .03 });
    G.blob([[1.45, 2.15], [1.9, 1.95], [2.6, 2.0], [2.95, 2.3], [2.6, 2.6], [1.8, 2.6]], '#a9c0cc', { edge: '#ffffff88', edgeW: .03 });
    G.blob([[-.95, 2.3], [-.55, 2.15], [-.2, 2.3], [-.45, 2.5], [-.85, 2.48]], '#b3c8d2', { edge: '#ffffff77', edgeW: .025 });
  },
  build(S) {
    const st = S.state({ phase: 'intro', busy: false });
    let raining = false, scurry = false, cover = false, sunOut = false, drive = null, opened = false, boots = 0;

    // ---- the sun, behind a cloud this morning
    let sunK, rays, veil;
    S.plant(1.6, -3.25, (g) => {
      sunK = keep(g); rays = skyDisc(sunK, { y: 1.9, r: .42 });
      veil = keep(sunK, .1, 0, .28); cloud(veil, 2.0, 1.45, '#c6cfd3');
    });
    const veilX = () => (sunOut ? 3.6 : .1);
    S.curio(sunK, { id: 'sun', label: '太陽', tap: async () => {
      S.to(rays.rotation, { z: rays.rotation.z + Math.PI / 2 }, .9, 'out'); if (sunOut) return;
      await S.to(veil.position, { x: 1.5 }, .5, 'inOut'); await S.wait(.9); if (!sunOut) S.to(veil.position, { x: veilX() }, .7, 'inOut');
    } });

    // ---- clouds that come and go on sticks at the back
    let rainCloud, cloud2;
    S.plant(0, -2.75, (g) => { rainCloud = keep(g, 7.5, 0, 0); cloud(rainCloud, 2.8, 2.45, '#8d99a2'); rainCloud.visible = false; });
    S.plant(0, -2.55, (g) => { cloud2 = keep(g, 7.5, 0, 0); cloud(cloud2, 1.9, 2.05, '#8d99a2'); cloud2.visible = false; });

    // ---- a little green at the back
    S.plant(-4.9, -2.1, (g) => bush(g, .5, C.leaf)); S.plant(4.7, -1.9, (g) => bush(g, .45, '#6f9a72')); S.plant(4.0, -2.6, (g) => bush(g, .38, C.leaf));

    // ---- the place sign: the only words on the page
    S.plant(-4.35, .45, (g) => {
      tab(g, .5); beam(g, [0, 0, 0], [0, 1.2, 0], .035, C.bark, 6);
      tag(g, '雨傘屋', 0, .98, .04, { h: .27, paper: C.white, ink: C.navy });
    });

    // ---- the shop: an eight-sided kiosk whose roof is a big furled umbrella
    let umb, canopy, strap, handle, rope, drip, pipeK, pipeWater, snail; const winTags = [];
    const A0 = new T.Vector3(.64, 1.0, .64), H0 = [.66, .5, .68], H1 = [.86, .12, 1.42];
    S.plant(KIOSK.x, KIOSK.z, (g) => {
      tab(g, 1.4);
      cyl(g, 0, .03, 0, .92, .92, .06, C.stone, 8).rotation.y = Math.PI / 8;
      cyl(g, 0, .53, 0, .85, .85, .96, '#efdcae', 8).rotation.y = Math.PI / 8;
      cyl(g, 0, .2, 0, .865, .865, .06, '#d9b98a', 8).rotation.y = Math.PI / 8;
      cyl(g, 0, 1.04, 0, .98, .98, .08, C.wood, 8).rotation.y = Math.PI / 8;
      // the door, on the face toward the street
      card(g, 0, .06, .775, .32, .64, C.bark, .03, .04); ball(g, .1, .36, .815, .022, C.gold);
      card(g, 0, .74, .776, .4, .08, C.red, .02, .02);
      // a window full of goods on the front-left face
      const w = keep(g, -.555, 0, .555); w.rotation.y = -Math.PI / 4;
      card(w, 0, .42, .02, .48, .42, '#6f9aa0', .02, .03); box(w, 0, .5, .045, .46, .025, .03, C.wood);
      [[-.14, .58, C.red], [-.02, .6, C.gold], [.1, .57, C.leaf], [-.12, .45, C.coral], [.04, .45, C.cream], [.15, .44, C.blue]].forEach(([x, y, c]) => box(w, x, y, .06, .07, .1, .04, c));
      for (const x of [-.11, .12]) winTags.push(priceTag(w, x, .76, .08, .85));
      // a drainpipe down one corner
      pipeK = keep(g, .82, .6, .34);
      beam(pipeK, [0, .42, 0], [0, -.4, 0], .035, C.steel, 6); beam(pipeK, [0, -.4, 0], [.16, -.5, .07], .035, C.steel, 6);
      pipeWater = keep(g, 1.0, .09, .42); for (let i = 0; i < 4; i++) ball(pipeWater, i * .07, -i * i * .012, 0, .035, RAIN, 0); pipeWater.visible = false;
      // a snail by the door, and a drop hanging from the eaves
      snail = keep(g, .25, .1, .8);
      { const b = box(snail, 0, .02, 0, .16, .035, .04, '#c8b79a'); b.rotation.z = .05; disc(snail, -.02, .085, .01, .06, '#b0723f', .04, 14); ring(snail, -.02, .085, .035, .03, .01, '#e3b47c', 12); beam(snail, [.07, .03, 0], [.1, .09, 0], .007, '#c8b79a', 4); }
      drip = keep(g, -.68, .98, .68); { const d = cone(drip, 0, -.06, 0, .035, .07, WET, 8); d.rotation.z = Math.PI; ball(drip, 0, -.1, 0, .036, WET, 1); }
      // the rope under the eaves: pull it and the umbrella opens
      rope = rod(g, .014, C.kraft);
      handle = keep(g, ...H0); box(handle, 0, 0, 0, .24, .055, .055, C.wood); ball(handle, -.13, 0, 0, .035, C.red); ball(handle, .13, 0, 0, .035, C.red);
      // the umbrella: a shaft from the roof, eight panels from one tip
      umb = keep(g, 0, 1.08, 0);
      beam(umb, [0, 0, 0], [0, 1.72, 0], .035, C.dark, 6); cone(umb, 0, 1.78, 0, .035, .14, C.dark, 6);
      canopy = keep(umb, 0, 1.65, 0);
      const R = 1.85, H = .45, n = 8;
      for (let i = 0; i < n; i++) {
        const a0 = Math.PI * 2 * i / n + Math.PI / 8, a1 = Math.PI * 2 * (i + 1) / n + Math.PI / 8;
        tri(canopy, [0, 0, 0], [R * Math.sin(a0), -H, R * Math.cos(a0)], [R * Math.sin(a1), -H, R * Math.cos(a1)], i % 2 ? C.white : C.red);
        ball(canopy, R * Math.sin(a0), -H - .02, R * Math.cos(a0), .04, C.dark, 0);
      }
      canopy.scale.set(.14, 1.55, .14);                                                 // furled
      strap = keep(umb, 0, 1.2, 0); ring(strap, 0, 0, 0, .17, .026, C.navy, 12).rotation.x = Math.PI / 2;
    }, { s: 1.2 });

    const sync = () => { const a = A0.clone(), b = handle.position.clone().add(new T.Vector3(0, .03, 0)); stretch(rope, a, b); };
    sync();

    // ---- the goods out front, and a pair of rain boots
    const goodTags = []; let bootL, bootR;
    S.plant(-3.4, -.85, (g) => {
      tab(g, 1.1); box(g, 0, .14, 0, 1.15, .28, .5, C.wood); box(g, 0, .42, -.18, 1.15, .28, .2, C.wood);
      [[-.38, C.red], [0, C.leaf], [.38, C.honey]].forEach(([x, c], i) => {
        box(g, x, .33, .06, .34, .12, .32, C.kraft);
        for (let j = 0; j < 4; j++) { const b = ball(g, x - .08 + (j % 2) * .16, .43, -.02 + Math.floor(j / 2) * .14, .075, c, 0); if (i === 2) b.scale.set(1.5, .7, .8); }
        goodTags.push(priceTag(g, x, .72, .12, .95));
      });
    });
    let bootsK;
    S.plant(-2.3, -.5, (g) => {
      tab(g, .5); bootsK = keep(g);
      const boot = (x) => { const k = keep(bootsK, x, 0, 0); box(k, 0, .14, 0, .09, .26, .1, C.red); box(k, 0, .03, .05, .1, .06, .2, C.red); box(k, 0, .27, 0, .1, .025, .11, C.deep); return k; };
      bootL = boot(-.07); bootR = boot(.07);
    });

    // ---- the shopkeeper by the door
    let boss; const cups = [];
    S.plant(0, -.3, (g) => {
      boss = S.person(g, { x: -1.9, z: 0, s: 1, kind: 'adult', coat: C.teal, hair: '#5a4636' });
      card(boss.inner, 0, .27, .04, .28, .44, C.white, .02, .04);                   // apron
    });

    // ---- two people on their way somewhere
    let pA, pB;
    S.plant(0, STREET, (g) => {
      pA = S.person(g, { x: -4.1, z: 0, s: 1, kind: 'adult', coat: C.plum, hair: C.ink });
      pB = S.person(g, { x: 4.7, z: .05, s: 1, kind: 'kid', coat: C.honey, hair: '#6b4a2e' });
      pB.root.scale.x = -Math.abs(pB.root.scale.x);
      for (const p of [pA, pB]) { const k = keep(p.inner, .02, .44, .1); cyl(k, 0, .07, 0, .065, .05, .14, C.white, 10); cyl(k, 0, .145, 0, .06, .06, .01, C.bark, 10); k.visible = false; cups.push(k); }
    });

    // ---- 小智 and the long price list it pulls out
    let zhi, list;
    const L = 2.3;
    S.plant(1.1, .45, (g) => {
      zhi = S.robot(g, { s: .95, lights: S.index - 1 });
      list = keep(g, .26, 0, .06); list.rotation.y = -.6;
      card(list, L / 2 + .04, .32, 0, L, .56, C.white, .02, .04);
      box(list, L / 2 + .04, .82, .02, L - .06, .04, .012, C.red);
      for (let i = 0; i < 7; i++) {
        const x = .26 + i * .31;
        disc(list, x - .05, .7, .03, .045, C.gold, .012, 12);
        poly(list, [[-.016, .045], [.016, .045], [.016, 0], [.036, 0], [0, -.045], [-.036, 0], [-.016, 0]], .01, C.red, x + .07, .7, .024);
        box(list, x, .38 + (.06 + i * .028) / 2, .03, .09, .06 + i * .028, .012, C.steel);
      }
      cyl(list, L + .06, .45, 0, .07, .07, .9, '#f3ead6', 10); cyl(list, L + .06, .92, 0, .075, .075, .04, C.gold, 10);
      list.scale.x = .02; list.visible = false;
    });
    S.hero(zhi, { ready: () => st.phase === 'ready', go });

    // ---- 小策
    let ce;
    S.plant(4.05, .55, (g) => { ce = S.person(g, { s: 1, kind: 'ce', coat: C.navy }); });

    // ---- a frog by a puddle, and a crate plank laid over another
    let frog, plank;
    S.plant(-3.7, 1.78, (g) => {
      frog = keep(g, 0, 0, 0);
      const b = ball(frog, 0, .07, 0, .1, C.leaf, 1); b.scale.set(1.25, .7, 1);
      for (const sx of [-1, 1]) { ball(frog, sx * .055, .14, .04, .035, C.leaf, 0); disc(frog, sx * .055, .15, .07, .016, C.ink, .01, 8); box(frog, sx * .11, .025, .04, .08, .03, .06, '#4d7a55'); }
    });
    S.plant(2.2, 2.3, (g) => {
      tab(g, .5);
      for (const x of [-.6, .6]) box(g, x, .03, 0, .16, .06, .26, '#9a9a8c');
      plank = cratePlank(g, 0, .085, 0, { len: 1.3, h: .3 }); plank.rotation.x = -Math.PI / 2;
    });

    // ---- the rain: paper streaks and rings in the puddles
    let rain; const drops = [], rings = [];
    S.plant(0, 0, (g) => {
      rain = keep(g); let s = 77; const rnd = () => ((s = (Math.imul(1664525, s) + 1013904223) >>> 0) / 4294967296);
      for (let i = 0; i < 90; i++) { const k = keep(rain, -4.6 + rnd() * 9.4, rnd() * 3.2, -1.6 + rnd() * 4.0); beam(k, [0, 0, 0], [.04, .26, 0], .012, i % 3 ? RAIN : '#a9c6d6', 4); drops.push(k); }
      for (const [x, z, d] of [[-3.0, 1.95, 0], [2.2, 2.0, .4], [-.55, 2.33, .7], [-2.75, 1.85, .25]]) { const k = keep(rain, x, .02, z); ring(k, 0, 0, 0, .14, .012, '#e6f0f4', 16).rotation.x = Math.PI / 2; k.userData.d = d; rings.push(k); }
      rain.visible = false;
    });

    // ---- the silent things to tap
    for (const [p, id, label] of [[boss, 'boss', '老闆'], [pA, 'walkerA', '路人'], [pB, 'walkerB', '路人'], [ce, 'ce', '小策']]) { const c = S.curio(p.root, { id, label, tap: () => p.hop() }); p.propId = c.id; }
    S.curio(drip, { id: 'drip', label: '水滴', tap: async () => {
      S.sound('tick'); await S.to(drip.position, { y: .1 }, .35, 'in'); S.sound('tap');
      drip.position.y = .98; S.show(drip, .3);
    } });
    S.curio(snail, { id: 'snail', label: '蝸牛', tap: async () => {
      await S.to(snail.position, { y: .42 }, .9, 'inOut'); await S.wait(.4); await S.to(snail.position, { y: .1 }, 1.4, 'inOut');
    } });
    S.pad(pipeK, .16, [0, 0, 0]);
    S.curio(pipeK, { id: 'pipe', label: '排水管', tap: async () => {
      S.sound('whoosh'); pipeWater.position.set(1.0, .09, .42); pipeWater.visible = true; pipeWater.scale.setScalar(.5);
      S.to(pipeWater.scale, { x: 1.2, y: 1.2, z: 1.2 }, .3, 'out'); await S.to(pipeWater.position, { x: 1.3, y: .03 }, .5, 'out'); pipeWater.visible = false;
    } });
    S.curio(bootsK, { id: 'boots', label: '雨鞋', tap: async () => {
      if (boots) return; boots = 1;
      for (const b of [bootL, bootR, bootL, bootR]) { S.sound('tap'); await S.to(b.position, { y: .12, z: .1 }, .14, 'out'); await S.to(b.position, { y: 0, z: 0 }, .16, 'in'); }
      boots = 0;
    } });
    S.curio(frog, { id: 'frog', label: '青蛙', tap: async () => {
      if (frog.userData.busy) return; frog.userData.busy = true; S.sound('pop');
      S.to(frog.position, { x: .6, z: .15 }, .45, 'lin'); await S.to(frog.position, { y: .3 }, .22, 'out'); await S.to(frog.position, { y: -.02 }, .23, 'in');
      S.sound('tap'); await S.wait(.5);
      S.to(frog.position, { x: 0, z: 0 }, .45, 'lin'); await S.to(frog.position, { y: .3 }, .22, 'out'); await S.to(frog.position, { y: 0 }, .23, 'in');
      frog.userData.busy = false;
    } });
    S.curio(plank, { id: 'plank', label: '小木橋', tap: async () => { await S.to(plank.position, { y: .13 }, .12, 'out'); await S.to(plank.position, { y: .085 }, .3, 'bounce'); } });

    // ---- the rope: the reader's hand
    const spring = () => { drive = { u: pull.value() }; const d = drive; S.to(d, { u: 0 }, .45, 'back').then(() => { if (drive === d) drive = null; }); };
    const pull = S.pull(handle, { id: 'rope', label: '拉繩子', from: H0, to: H1, pad: .3,
      move: () => sync(),
      end: (u) => { if (st.phase === 'touch' && !st.busy && u > .5) touch(true); else if (u > .02) { if (u > .3 && st.phase !== 'touch') S.wiggle(umb, .04); spring(); } },
      tap: () => { if (st.phase === 'touch') touch(false); else { S.sound('tap'); S.wiggle(umb, .05); } } });

    // ---- the story
    async function go() {
      if (st.phase !== 'ready') return; S.set({ phase: 'busy' });
      zhi.cheer(); S.sound('whoosh');
      const tags = [...goodTags, ...winTags];
      for (const t of tags) { S.show(t, .25); S.sound('tick'); await S.wait(.16); }
      zhi.still(); zhi.hop();
      await S.wait(.25); S.sound('whoosh');
      list.visible = true; await S.to(list.scale, { x: 1 }, .7, 'out');
      pB.still(); S.emote(pB, '?', 1.4);
      await S.wait(.9);
      // the sky turns: a dark cloud, then rain
      rainCloud.visible = true; S.sound('whoosh');
      await S.to(rainCloud.position, { x: -.3 }, 1.1, 'inOut');
      raining = true; rain.visible = true; S.sound('soft');
      scurry = true; cover = true; boss.doubt(); ce.doubt();
      S.to(list.rotation, { x: .32 }, .9, 'bounce');                                  // the list goes soggy
      for (const t of [...goodTags, ...winTags]) S.to(t.rotation, { z: (Math.random() - .5) * .5 }, .6, 'bounce');
      await S.wait(1.6);
      S.set({ phase: 'touch' }); S.hint(handle, [0, 0, 0], '拉繩子');
    }
    async function touch(byHand) {
      if (st.phase !== 'touch' || st.busy) return; st.busy = true; S.hint(null); S.refresh();
      if (!byHand) { const d = drive = { u: pull.value() }; await S.to(d, { u: 1 }, .45, 'inOut'); drive = null; }
      // pop! the roof opens over half the street
      opened = true; S.sound('pop'); S.hide(strap, .12);
      S.to(umb.rotation, { x: .15 }, .7, 'back');
      await S.to(canopy.scale, { x: 1, y: 1, z: 1 }, .6, 'back'); S.sound('whoosh');
      S.burst(S.world(canopy, [0, .1, 0]), { n: 18, up: 1.4, speed: 1.4, colors: ['#d8e8f0', '#ffffff'] });
      spring();
      scurry = false;
      await Promise.all([S.walk(pA, UNDER[0], .9), S.walk(pB, UNDER[1], 1.0)]);
      cover = false; pA.root.scale.x = Math.abs(pA.root.scale.x); pB.root.scale.x = Math.abs(pB.root.scale.x);
      // wring out, and a hot cup each
      S.sound('soft'); for (const p of [pA, pB]) { S.wiggle(p.inner, .12); S.burst(S.world(p.root, [0, .7, .1]), { n: 8, up: .6, speed: .9, colors: [WET, '#ffffff'] }); }
      await S.wait(.5);
      boss.still(); await S.walk(boss, { x: -1.75, z: .05 }, .5); boss.root.scale.x = Math.abs(boss.root.scale.x);
      for (const c of cups) S.show(c, .3); S.sound('pop'); boss.wave(1.4); pA.hop(); pB.hop();
      await S.wait(.9);
      // the rain stops; the price list rolls back up; the sun comes out
      raining = false; S.hide(rain, .3); S.to(rainCloud.position, { x: -7.5 }, 1.8, 'inOut').then(() => { rainCloud.visible = false; });
      S.to(list.scale, { x: .02 }, .5, 'in').then(() => { list.visible = false; });
      zhi.hop(); await S.wait(.5);
      sunOut = true; S.sound('soft'); S.to(veil.position, { x: veilX() }, 1.3, 'inOut'); S.to(rays.rotation, { z: rays.rotation.z + Math.PI / 2 }, 1.6, 'out');
      boss.still(); ce.still(); ce.hop();
      await S.wait(1.1);
      await Promise.all([S.walk(pA, OUT[0], 1.0), S.walk(pB, OUT[1], 1.1)]);
      // another cloud: this time nobody waits for the rain
      cloud2.visible = true; S.sound('whoosh');
      await S.to(cloud2.position, { x: 2.75 }, 1.3, 'inOut');
      S.emote(pA, '!', 1.2); S.emote(pB, '!', 1.2); S.sound('tick');
      await S.wait(.35);
      await Promise.all([S.walk(pA, UNDER[0], .7), S.walk(pB, UNDER[1], .75)]);
      pA.root.scale.x = Math.abs(pA.root.scale.x); pB.root.scale.x = Math.abs(pB.root.scale.x);
      pA.cheer(); pB.cheer(); boss.wave(2.4); zhi.cheer();
      S.learn(zhi); S.set({ phase: 'done' }); await S.wait(1); S.done();
    }
    S.act('go', go); S.act('touch', () => touch(false));
    S.on('reset', () => { raining = scurry = cover = sunOut = opened = false; drive = null; boots = 0; frog.userData.busy = false; sync(); });
    S.on('enter', async () => {
      // the shopkeeper looks up and down the street; people walk past
      S.walk(pA, { x: .2, z: 0 }, 1.8); S.walk(pB, { x: 2.75, z: .05 }, 1.6);
      await S.wait(1.9); S.set({ phase: 'ready' });
    });
    S.ui(() => ({
      caption: st.phase === 'done' ? '今天學到：' + DIARY : '',
      buttons: st.phase === 'ready' ? [{ id: 'go', label: '交給我！', primary: true }]
        : st.phase === 'busy' ? [{ id: 'go', label: '交給我！', primary: true, disabled: true }]
          : st.phase === 'touch' ? [{ id: 'touch', label: '撐開傘', primary: true, disabled: st.busy }] : [],
    }));

    const base = [.2, 2.75];
    S.tick((t, dt) => {
      rays.rotation.z += dt * .05;
      if (drive) pull.set(drive.u); sync();
      if (st.phase === 'intro' || st.phase === 'ready') boss.head.rotation.y = Math.sin(t * 1.4) * .55;   // looking up and down the street
      if (raining) {
        for (const d of drops) {
          d.position.y -= dt * 4.2; d.position.x -= dt * .5; if (d.position.y < 0) { d.position.y += 3.2; d.position.x += .38; }
          d.visible = !(opened && (d.position.x + 1.7) ** 2 + (d.position.z + 1.0) ** 2 < 4.9 && d.position.y < 2.6);
        }
        for (const r of rings) { const u = (t * .9 + r.userData.d) % 1; r.scale.setScalar(.3 + u * 1.6); }
      }
      if (scurry) [pA, pB].forEach((p, i) => {
        const w = 2.4 + i * .5, ph = t * w + i * 2; p.walking = true;
        p.root.position.x = base[i] + Math.sin(ph) * (.42 - i * .08); p.root.position.z = Math.sin(ph * 1.7) * .08;
        const sx = Math.abs(p.root.scale.x); p.root.scale.x = Math.cos(ph) >= 0 ? sx : -sx;
      });
      if (cover) for (const p of [pA, pB]) { p.armL.rotation.z = -2.9; p.armR.rotation.z = 2.9; }       // hands over their heads
      if (list.visible && st.phase === 'busy') list.rotation.z = Math.sin(t * 3) * .015;
    });
  },
};
