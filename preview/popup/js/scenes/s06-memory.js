// 第 6 頁｜手印牆｜何華軒〈娛樂與運動如何累積品牌心智資產？〉、徐莉媛〈別買曝光了，開始買注意力吧〉、吳宗霖、陳炯文〈共同記憶帶來的品牌價值〉
// 市集入口一面白牆（媒體）是主角。小智三秒刷好一幅漂亮的大壁畫，遠處的牆也貼上同一幅，大家都看到了；
// 只是前面拉著紅龍，兩手沾滿顏料的小孩把手藏到背後。把他帶到牆邊按一下：紅龍收起，大家一個接一個按上手印。
import { C, keep, box, cyl, cone, ball, disc, beam, poly, card, tab, tag, cloud, house, cratePlank, skyDisc } from '../paper.js';

const DIARY = '一起按過手印的牆，大家會記一輩子。';
const WALL = { x: -2.55, z: -1.6, w: 4.3, h: 2.3 };      // the wall (its front face is at z = -1.52)
const K = 1.12;                                            // the mural's scale on the wall
const MW = 3.6, MH = 1.6, MY = .3, MZ = .081;              // the mural on it: width, height, bottom, face
const FOLK = { x: -.5, z: 0 };                             // the piece the people stand in
const P = (x, z) => ({ x: x - FOLK.x, z: z - FOLK.z });    // a place on the page, in that piece's own coordinates
const WHITE = '#fbf6ea';

/** a soft line of hills across the mural */
function hills(g, y0, amp, freq, ph, col, z) {
  const pts = [[-MW / 2, 0]];
  for (let i = 0; i <= 24; i++) { const x = -MW / 2 + MW * i / 24; pts.push([x, y0 + amp * Math.sin(x * freq + ph) + amp * .45 * Math.sin(x * freq * 2.3 + ph * 2)]); }
  pts.push([MW / 2, 0]); poly(g, pts, .004, col, 0, 0, z);
}
/** the mural: the island on a sunny afternoon. Origin at its bottom centre, x ±1.8, y 0…1.6 */
function mural(g) {
  card(g, 0, 0, 0, MW, MH, '#d6ece4', .006, .05);
  const sx = -1.2, sy = 1.18;
  for (let i = 0; i < 12; i++) poly(g, [[-.035, .27], [.035, .27], [0, .38]], .004, '#f3c27a', sx, sy, .007).rotation.z = i * Math.PI / 6;
  disc(g, sx, sy, .012, .22, '#f6b94a', .012, 24);
  poly(g, [[-.3, 0], [-.28, .07], [-.18, .1], [-.12, .18], [0, .2], [.08, .27], [.2, .26], [.26, .19], [.36, .15], [.4, .04], [.36, 0]], .004, WHITE, .5, 1.3, .008);
  hills(g, .8, .1, 2.0, .5, '#a9c69a', .012);
  hills(g, .56, .08, 3.1, 1.9, '#6e9e6c', .016);
  poly(g, [[-MW / 2, 0], [MW / 2, 0], [MW / 2, .34], [-MW / 2, .34]], .004, '#5aa0b2', 0, 0, .02);
  for (const [y, n, o] of [[.1, 9, 0], [.23, 8, .2]]) for (let i = 0; i < n; i++) { const x = -1.6 + o + i * .4; beam(g, [x - .07, y, .026], [x, y + .035, .026], .007, '#e8f5f1', 4); beam(g, [x, y + .035, .026], [x + .07, y, .026], .007, '#e8f5f1', 4); }
  // a little red-roofed house and a big round tree on the hill
  box(g, -.55, .7, .028, .2, .14, .012, WHITE); poly(g, [[-.13, 0], [.13, 0], [0, .1]], .006, C.red, -.55, .77, .028);
  beam(g, [.3, .5, .026], [.3, .8, .026], .022, C.bark, 5);
  for (const [x, y, r] of [[.3, .9, .13], [.2, .8, .09], [.4, .8, .09]]) disc(g, x, y, .03, r, '#3f7d58', .008, 14);
  // a sailing boat
  poly(g, [[-.2, 0], [.2, 0], [.14, -.08], [-.14, -.08]], .006, C.red, 1.05, .3, .026);
  beam(g, [1.05, .3, .029], [1.05, .62, .029], .008, C.bark, 4);
  poly(g, [[0, 0], [0, .28], [.18, 0]], .006, WHITE, 1.06, .33, .026);
  // a kite and three birds
  poly(g, [[0, -.1], [.08, 0], [0, .12], [-.08, 0]], .006, C.coral, .95, 1.32, .026);
  for (let i = 0; i < 3; i++) beam(g, [.95 - i * .06, 1.2 - i * .05, .026], [.95 - (i + 1) * .06, 1.2 - (i + 1) * .05, .026], .005, C.ink, 3);
  for (const [x, y] of [[-.35, 1.32], [-.15, 1.42], [-.22, 1.22]]) { beam(g, [x - .05, y + .025, .02], [x, y, .02], .007, C.ink, 3); beam(g, [x, y, .02], [x + .05, y + .025, .02], .007, C.ink, 3); }
}

/** a hand print on the wall, facing +z (k: size). three = 小智's three-fingered metal hand */
function handprint(g, col, k = 1, three = false) {
  if (three) {
    card(g, 0, -.085 * k, 0, .16 * k, .15 * k, col, .008, .035 * k);
    for (const x of [-.05, 0, .05]) { box(g, x * k, .1 * k, .004, .036 * k, .08 * k, .008, col); disc(g, x * k, .14 * k, .004, .02 * k, col, .008, 10); }
    return;
  }
  const pts = []; for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; pts.push([Math.cos(a) * .075 * k, Math.sin(a) * .085 * k]); }
  poly(g, pts, .008, col, 0, 0, 0);
  for (const [bx, by, a, L] of [[-.048, .06, -.22, .1], [-.016, .075, -.07, .125], [.018, .075, .07, .12], [.05, .06, .24, .095], [-.07, -.01, -1.05, .08]]) {
    const x0 = bx * k, y0 = by * k, x1 = x0 + Math.sin(a) * L * k, y1 = y0 + Math.cos(a) * L * k;
    beam(g, [x0, y0, .004], [x1, y1, .004], .022 * k, col, 8); disc(g, x1, y1, .004, .022 * k, col, .008, 10);
  }
}
function pawprint(g, col, k = 1) {
  disc(g, 0, 0, .004, .045 * k, col, .008, 12);
  for (const [x, y] of [[-.05, .045], [-.018, .07], [.018, .07], [.05, .045]]) disc(g, x * k, y * k, .004, .019 * k, col, .008, 8);
}

export default {
  id: 's06-memory', land: 'people', short: '一起按手印', calm: true,
  title: '曝光買了很多，為什麼沒人記得？',
  sources: [{ n: 8 }, { n: 10 }, { n: 11 }],
  diary: DIARY,
  takeaway: '把媒體做成邀請：人自己參與過的時刻，才會被記住、被分享、被帶到下一代。',
  quote: { t: '品牌可以購買曝光，卻無法購買記憶；真正影響消費決策的，不是品牌被看見多少次，而是是否出現在那些值得被記住的重要時刻。', n: 8, page: 65 },
  look: { bg: '#2f5f46', table: '#93ab85', key: '#fff1cc', fill: '#cfe6da', sky: '#fff6dc' },   // afternoon
  ground(G) {
    G.wash('#efe2bf');
    G.rect(0, -3.15, 12.4, 1.1, '#c9dca6', { r: 0 });                                  // the lawn behind the wall
    G.marks('tick', -6, -3.6, 6, -2.65, { n: 70, col: '#7f9f6a66', size: .12, seed: 4 });
    G.rect(WALL.x, -.55, 4.9, 2.3, '#dcc28e', { r: .12, edge: '#c4a66c', edgeW: .05 });  // the paved square in front of the wall
    for (let i = 1; i < 5; i++) G.path([[WALL.x - 2.4, -1.7 + i * .46], [WALL.x + 2.4, -1.7 + i * .46]], { w: .016, col: '#c3a97455', sharp: true });
    for (let i = 1; i < 10; i++) G.path([[WALL.x - 2.45 + i * .49, -1.7], [WALL.x - 2.45 + i * .49, .6]], { w: .016, col: '#c3a97455', sharp: true });
    G.path([[-.2, -.35], [1.6, -.55], [3.6, -.6], [6.2, -.72]], { w: .95, col: '#e9d8b0' });   // the way in from the market
    G.blob([[1.0, 1.4], [3.4, 1.15], [4.3, 2.1], [2.8, 2.75], [.9, 2.45]], '#d5e3b2', { edge: '#bccf92', edgeW: .04 });
    for (const [x, z, r, c] of [[-4.0, .05, .17, '#ee867299'], [-3.6, .2, .1, '#e8b84e99'], [-4.35, -.1, .08, '#62c4cf99'], [-2.0, .35, .07, '#ee867277']]) G.circle(x, z, r, c);
  },
  build(S) {
    const st = S.state({ phase: 'intro', busy: false });
    let painting = false, catAt = 0, catBusy = false, birdBusy = false, dripBusy = false, wagT = 0;

    // ---- the sun, in the afternoon sky over the wall
    let rays;
    S.plant(-1.2, -3.25, (g) => { rays = skyDisc(g, { y: 2.3, r: .42 }); });
    S.curio(rays, { id: 'sun', label: '太陽', tap: () => { S.sound('soft'); S.to(rays.rotation, { z: rays.rotation.z + Math.PI / 2 }, .9, 'out'); } });
    S.plant(-4.4, -3.35, (g) => cloud(g, 1.1, 2.9, '#fbf1da')); S.plant(4.5, -3.3, (g) => cloud(g, 1.2, 2.6, '#fdf4e0'));

    // ---- the wall: the hero of the page
    let cover, prints;
    const P6 = {};
    const wallP = S.plant(WALL.x, WALL.z, (g) => {
      tab(g, 3.8);
      box(g, 0, WALL.h / 2, 0, WALL.w, WALL.h, .16, WHITE);
      box(g, 0, .07, .01, WALL.w + .04, .14, .18, C.stone);
      box(g, 0, WALL.h + .04, 0, WALL.w + .24, .09, .26, C.stone);
      for (const sx of [-1, 1]) { box(g, sx * (WALL.w / 2 + .06), WALL.h / 2 + .02, 0, .18, WALL.h + .05, .24, '#ead8b2'); cyl(g, sx * (WALL.w / 2 + .06), WALL.h + .14, 0, .07, .1, .1, C.stone, 8); }
      // the mural is under a blank cover that 小智's roller takes away from left to right
      const face = keep(g, 0, MY, MZ); face.scale.setScalar(K); mural(face);
      cover = keep(face, MW / 2 + .03, -.02, .045); box(cover, -(MW / 2 + .03), (MH + .04) / 2, .005, MW + .06, MH + .04, .01, WHITE);
      prints = keep(face, 0, 0, .064);
      const mk = (id, x, y, fn) => { const k = keep(prints, x, y, 0); fn(k); k.visible = false; P6[id] = k; return k; };
      mk('kidL', .42, .86, (k) => handprint(k, C.coral, .9)); mk('kidR', .7, .9, (k) => { const m = keep(k); m.scale.x = -1; handprint(m, C.aqua, .9); });
      mk('uncle', -.05, 1.3, (k) => handprint(k, C.gold, 1.25));
      mk('zhi', -.52, 1.02, (k) => handprint(k, '#3f8a8c', 1.15, true));
      mk('gran', 1.0, 1.3, (k) => handprint(k, C.red, 1.3));
      mk('mom', 1.33, 1.25, (k) => handprint(k, C.gold, 1.0));
      mk('baby', 1.58, 1.2, (k) => handprint(k, C.pink, .58));
      [[-1.5, 1.5, C.coral, .8], [-1.58, .62, C.gold, .7], [-.95, 1.55, C.aqua, .65], [-.25, .58, C.pink, .8], [.3, 1.5, C.red, .7], [-1.15, .85, C.lime, .6]]
        .forEach(([x, y, c, s], i) => mk('f' + i, x, y, (k) => { k.rotation.z = (i % 3 - 1) * .25; handprint(k, c, s); }));
      [[-.05, .3], [.12, .4], [.27, .34], [.42, .45], [.58, .39]].forEach(([x, y], i) => mk('paw' + i, x, y, (k) => { k.rotation.z = -.5; pawprint(k, C.coral, .9); }));
    });

    // ---- the red rope in front of it (it comes up with the mural)
    let rope;
    S.plant(WALL.x, -.78, (g) => {
      rope = keep(g);
      const xs = [-1.55, 0, 1.55];
      for (const x of xs) { cyl(rope, x, .02, 0, .12, .12, .03, C.gold, 14); cyl(rope, x, .32, 0, .025, .025, .6, C.gold, 8); ball(rope, x, .64, 0, .05, C.gold, 1); }
      for (let i = 0; i < 2; i++) { const a = xs[i], b = xs[i + 1], pts = []; for (let j = 0; j <= 6; j++) { const u = j / 6; pts.push([a + (b - a) * u, .58 - Math.sin(Math.PI * u) * .18]); } for (let j = 0; j < 6; j++) beam(rope, [pts[j][0], pts[j][1], 0], [pts[j + 1][0], pts[j + 1][1], 0], .03, C.red, 6); }
      rope.visible = false;
    });

    // ---- the ladder, a bird on it, the buckets with the step board and the brush
    let bird, wing;
    S.plant(-4.55, -1.2, (g) => {
      tab(g, .5);
      for (const sx of [-1, 1]) beam(g, [sx * .19, 0, .2], [sx * .17, 2.0, -.26], .03, C.wood, 5);
      for (let i = 1; i < 8; i++) { const u = i / 8; beam(g, [-.18, u * 2.0, .2 - u * .46], [.18, u * 2.0, .2 - u * .46], .018, C.wood, 4); }
      bird = keep(g, .02, 1.98, -.2);
      poly(bird, [[-.11, .02], [.07, 0], [.14, .07], [.08, .12], [-.04, .1]], .05, '#7fb1bb', 0, 0, -.025);
      poly(bird, [[.13, .08], [.2, .07], [.13, .05]], .03, C.gold, 0, 0, -.015); disc(bird, .085, .09, .028, .013, C.ink, .008, 8);
      wing = keep(bird, -.02, .08, .03); poly(wing, [[-.1, 0], [.05, 0], [-.13, .09]], .02, '#5f86a8', 0, 0, 0);
    });
    S.curio(bird, { id: 'bird', label: '小鳥', tap: async () => {
      if (birdBusy) return; birdBusy = true; S.sound('whoosh');
      await S.to(bird.position, { x: .5, y: 2.7 }, .45, 'out'); await S.to(bird.position, { x: 1.4, y: 2.9 }, .6, 'inOut'); await S.to(bird.position, { x: .02, y: 1.98 }, .8, 'inOut'); birdBusy = false;
    } });
    let plank, drop, splat, brush;
    S.plant(-4.2, -.3, (g) => {
      tab(g, 1.0);
      for (const sx of [-1, 1]) { cyl(g, sx * .3, .16, 0, .14, .12, .32, C.steel, 12); cyl(g, sx * .3, .3, 0, .145, .145, .03, '#7d9196', 12); }
      plank = cratePlank(g, 0, .345, 0, { len: .95, h: .3, thick: .05 }); plank.rotation.x = -Math.PI / 2;
      // an open bucket of paint in front, a drop hanging from its rim
      cyl(g, .05, .13, .38, .13, .11, .26, '#e9e1cf', 12); cyl(g, .05, .255, .38, .125, .125, .012, C.coral, 12);
      poly(g, [[-.03, 0], [.03, 0], [.025, -.1], [0, -.13], [-.025, -.1]], .012, C.coral, .14, .26, .48);
      drop = keep(g, .14, .1, .49); ball(drop, 0, 0, 0, .03, C.coral, 1);
      splat = keep(g, .14, .006, .62); const sp = cyl(splat, 0, 0, 0, .08, .08, .008, C.coral, 9); sp.scale.z = .7; splat.visible = false;
      brush = keep(g, -.6, 0, .32); brush.rotation.z = .35;
      beam(brush, [0, 0, 0], [0, .55, 0], .022, C.wood, 5); box(brush, 0, .62, 0, .16, .1, .05, C.steel); box(brush, 0, .74, 0, .15, .16, .06, C.gold); box(brush, 0, .8, 0, .13, .05, .061, C.red);
    });
    S.curio(plank, { id: 'plank', label: '踏板', tap: () => S.sound('tap') });
    S.curio(drop, { id: 'drip', label: '油漆桶', tap: async () => {
      if (dripBusy) return; dripBusy = true; S.sound('tick');
      await S.to(drop.position, { y: .02 }, .35, 'in'); S.sound('tap'); drop.visible = false; S.show(splat, .3);
      await S.wait(.6); drop.position.y = .1; drop.visible = true; S.pop(drop, 1.6); dripBusy = false;
    } });
    S.curio(brush, { id: 'brush', label: '刷子', tap: async () => {
      S.sound('whoosh'); await S.to(brush.rotation, { z: -.4 }, .15, 'out');
      S.burst(S.world(brush, [0, .8, 0]), { n: 18, up: 1.6, speed: 1.6, colors: [C.coral, C.gold, C.aqua, C.lime] });
      await S.to(brush.rotation, { z: .35 }, .5, 'back');
    } });

    // ---- the place sign: the only words on the page
    S.plant(-5.2, .55, (g) => { tab(g, .5); beam(g, [0, 0, 0], [0, 1.25, 0], .035, C.bark, 6); tag(g, '手印牆', 0, 1.02, .04, { h: .27, paper: C.white, ink: C.navy }); });

    // ---- far down the market lane: two houses that will put up the same picture
    const minis = [];
    S.plant(1.9, -2.75, (g) => { house(g, 1.25, .9, .6, '#f1dcae', C.red); const k = keep(g, 0, .38, .345), m = keep(k); m.scale.setScalar(.27); mural(m); k.visible = false; minis.push(k); });
    S.plant(3.85, -2.95, (g) => { house(g, 1.05, .8, .55, '#e9d0a0', C.teal); const k = keep(g, 0, .33, .32), m = keep(k); m.scale.setScalar(.23); mural(m); k.visible = false; minis.push(k); });

    // ---- the cat that has stepped in paint
    let cat; const paws = [];
    S.plant(.85, -1.15, (g) => {
      cat = keep(g, 0, 0, 0);
      const b = ball(cat, 0, .13, 0, .13, C.ink, 1); b.scale.set(1, .95, .6);
      ball(cat, 0, .32, .02, .1, C.ink, 1).scale.z = .7;
      for (const sx of [-1, 1]) { cone(cat, sx * .06, .43, .02, .035, .08, C.ink, 4); disc(cat, sx * .035, .34, .09, .014, C.gold, .008, 8); disc(cat, sx * .06, .02, .07, .035, C.coral, .02, 10); }
      beam(cat, [.1, .05, -.04], [.22, .28, -.04], .02, C.ink, 4);
      for (let i = 0; i < 4; i++) { const k = keep(g, .12 + i * .17, .006, (i % 2) * .09 - .02); pawprint(k, C.coral, .8); k.rotation.x = -Math.PI / 2; k.rotation.z = -Math.PI / 2; k.visible = false; paws.push(k); }
    });
    S.curio(cat, { id: 'cat', label: '貓', tap: async () => {
      if (catBusy) return; catBusy = true; S.sound('tick');
      if (catAt === 0) { cat.scale.x = 1; S.to(cat.position, { x: .72 }, 1.0, 'inOut'); for (const k of paws) { await S.wait(.22); S.show(k, .2); } catAt = 1; }
      else { cat.scale.x = -1; await S.to(cat.position, { x: 0 }, 1.0, 'inOut'); cat.scale.x = 1; catAt = 0; }
      await S.wait(.2); catBusy = false;
    } });

    // ---- the dog whose tail goes into the paint
    let dog, tail, tip;
    S.plant(1.3, 1.85, (g) => {
      dog = keep(g);
      tab(dog, .5);
      box(dog, 0, .24, 0, .42, .16, .14, C.honey);
      for (const x of [-.15, .15]) for (const z of [-.04, .04]) box(dog, x, .09, z, .05, .18, .04, C.honey);
      box(dog, .25, .36, 0, .17, .15, .14, C.honey); box(dog, .35, .33, 0, .08, .07, .1, '#f0c98a'); disc(dog, .39, .35, .052, .02, C.ink, .02, 8);
      poly(dog, [[0, 0], [.05, 0], [.02, -.13]], .03, C.wood, .2, .43, .04); disc(dog, .27, .4, .075, .014, C.ink, .01, 8);
      tail = keep(dog, -.2, .3, 0); beam(tail, [0, 0, 0], [-.08, .16, 0], .022, C.honey, 5);
      tip = keep(tail, -.08, .16, 0); ball(tip, 0, 0, 0, .035, C.aqua, 1); tip.visible = false;
    });
    S.curio(dog, { id: 'dog', label: '小狗', tap: () => { S.sound('pop'); wagT = 1.4; if (!tip.visible) S.show(tip, .3); } });

    // ---- the people: 小智, the painter, the child with painted hands, and (later) a grandmother with a mother and her baby
    let zhi, uncle, kid, gran, mom, baby, roller;
    const folk = S.plant(FOLK.x, FOLK.z, (g) => {
      uncle = S.person(g, { ...P(-2.95, -.1), kind: 'adult', coat: C.blue, hair: C.grey });
      poly(uncle.head, [[-.22, .3], [.22, .3], [.02, .62]], .03, WHITE, 0, 0, .04); box(uncle.head, 0, .32, .06, .46, .05, .02, C.coral);
      for (const [x, y, c] of [[-.07, .45, C.coral], [.06, .6, C.gold], [.09, .38, C.aqua]]) disc(uncle.inner, x, y, .04, .03, c, .01, 10);
      cyl(uncle.armL, 0, -.47, .06, .1, .085, .17, C.steel, 10); cyl(uncle.armL, 0, -.385, .06, .092, .092, .012, C.gold, 10); beam(uncle.armL, [-.09, -.39, .06], [0, -.3, .06], .008, C.dark, 3); beam(uncle.armL, [0, -.3, .06], [.09, -.39, .06], .008, C.dark, 3);
      kid = S.person(g, { ...P(-.95, 1.15), kind: 'kid', coat: C.gold, hair: C.bark });
      ball(kid.armL, 0, -.36, .03, .062, C.coral, 1); ball(kid.armR, 0, -.36, .03, .062, C.aqua, 1);
      for (const [x, y, c] of [[-.08, .5, C.coral], [.07, .64, C.aqua], [.05, .4, C.lime]]) disc(kid.inner, x, y, .04, .028, c, .01, 10);
      zhi = S.robot(g, { ...P(-1.75, .5), s: .95, lights: S.index - 1 });
      roller = keep(zhi.root, .3, .3, .06);
      beam(roller, [0, 0, 0], [0, 1.0, -.32], .02, C.wood, 5); const r = cyl(roller, 0, 1.04, -.34, .075, .075, .5, C.coral, 12); r.rotation.z = Math.PI / 2;
      roller.visible = false;
      gran = S.person(g, { ...P(5.9, -.7), kind: 'elder', coat: C.plum }); gran.root.visible = false;
      mom = S.person(g, { ...P(6.4, -.45), kind: 'adult', coat: C.teal, hair: C.deep }); mom.root.visible = false;
      baby = keep(mom.inner, 0, .5, .08);
      const bb = ball(baby, 0, 0, 0, .11, C.pink, 1); bb.scale.set(1, .8, .5); disc(baby, 0, .1, .03, .065, '#f6d9b8', .02, 14);
      for (const sx of [-1, 1]) disc(baby, sx * .022, .11, .042, .009, C.ink, .006, 6);
    });
    const cp = (p, id, label) => { const c = S.curio(p.root, { id, label, tap: () => p.hop() }); p.propId = c.id; };
    cp(uncle, 'uncle', '油漆行阿伯'); cp(gran, 'gran', '阿嬤'); cp(mom, 'mom', '媽媽');
    S.hero(zhi, { ready: () => st.phase === 'ready', go });

    // ---- 小策, on the way in from the market
    let ce;
    S.plant(3.2, 1.0, (g) => { ce = S.person(g, { s: 1, kind: 'ce', coat: C.navy }); });
    cp(ce, 'ce', '小策');

    // ---- the story
    const hide2 = (on) => { for (const a of [kid.armL, kid.armR]) S.to(a.rotation, { x: on ? 1.05 : 0 }, .35, 'inOut'); };
    async function go() {
      if (st.phase !== 'ready') return; S.set({ phase: 'busy' });
      uncle.still(); kid.still(); zhi.cheer(); S.sound('whoosh');
      S.show(roller, .25);
      await S.walk(zhi, P(-4.45, -1.12), .8); zhi.still();
      // three seconds: the whole mural, rolled on from left to right
      painting = true; zhi.root.scale.x = Math.abs(zhi.root.scale.x);
      await S.to(zhi.root.position, { x: P(-.55, 0).x }, 2.6, 'lin');
      painting = false; cover.visible = false; S.hide(roller, .25); S.sound('done');
      S.burst(S.world(wallP.art, [0, 1.3, .3]), { n: 26, up: 2.2, speed: 1.6, colors: [C.coral, C.gold, C.aqua, '#fff3d6'] });
      zhi.cheer(); uncle.cheer();
      // the same picture goes up down the lane, and the rope goes up in front of the wall
      for (const k of minis) { await S.wait(.25); S.show(k, .35); S.sound('pop'); }
      await S.wait(.2); S.show(rope, .4); S.sound('stamp');
      // passers-by stop and look up: everybody has seen it
      gran.root.visible = true; mom.root.visible = true;
      S.walk(gran, P(1.6, -.6), 1.5); await S.walk(mom, P(2.45, -.4), 1.6);
      gran.wave(1.6); mom.hop(); ce.wave(1.2);
      S.walk(zhi, P(-1.75, .5), .7);
      await S.wait(.9); zhi.still(); uncle.still();
      // …but the child with painted hands hides them and steps back
      hide2(true); kid.doubt(); S.sound('soft'); S.emote(kid, '…', 2.6, C.ink);
      await S.to(kid.root.position, { z: kid.root.position.z + .3 }, .5, 'inOut');
      ce.doubt();
      await S.wait(.4);
      S.set({ phase: 'touch' }); S.hint(kid.root, [0, .5, 0], '帶他去按一下');
    }
    async function press(p, ids, lift) {
      p.still(); p.cheer(); await S.wait(.3);
      for (const id of ids) { S.show(P6[id], .35); S.sound('stamp'); S.burst(S.world(P6[id]), { n: 8, up: 1.4, speed: .9, colors: [C.coral, C.gold, '#fff3d6'] }); await S.wait(.25); }
      await S.wait(lift || .15); p.still();
    }
    async function touch(byHand) {
      if (st.phase !== 'touch' || st.busy) return; st.busy = true; S.hint(null); S.refresh();
      ce.still(); kid.still();
      S.hide(rope, .3); S.sound('whoosh');
      const spot = P(-2.2, -1.22);
      if (byHand) { kid.root.scale.x = Math.abs(kid.root.scale.x); await S.to(kid.root.position, { x: spot.x, y: 0, z: spot.z }, .35, 'out'); }
      else await S.walk(kid, spot, .9);
      hide2(false); await S.wait(.3);
      await press(kid, ['kidL', 'kidR'], .3); kid.hop();
      // then everybody else
      S.walk(uncle, P(-2.8, -1.22), .7); S.walk(zhi, P(-3.45, -1.15), .9); S.walk(gran, P(-1.55, -1.22), 1.1); S.walk(mom, P(-.95, -1.2), 1.2);
      await S.wait(.75); press(uncle, ['uncle']); await S.wait(.3); await press(zhi, ['zhi']);
      for (let i = 0; i < 5; i++) { S.show(P6['paw' + i], .2); S.sound('tick'); await S.wait(.14); }
      for (let i = 0; i < 6; i++) { S.show(P6['f' + i], .3); S.sound(i % 2 ? 'pop' : 'tap'); await S.wait(.16); }
      await press(gran, ['gran']); await press(mom, ['mom']);
      await S.to(baby.position, { x: .28, y: .95 }, .4, 'back'); await press(mom, ['baby'], .3);
      await S.to(baby.position, { x: 0, y: .5 }, .4, 'inOut');
      // everyone steps back to look at it together
      for (const [p, x, z] of [[kid, -2.15, -.5], [uncle, -2.8, -.62], [zhi, -3.45, -.95], [gran, -1.5, -.6], [mom, -.9, -.52]]) S.walk(p, P(x, z), .7);
      await S.wait(.8);
      for (const id of ['gran', 'mom', 'baby']) S.pop(P6[id], 1.35);
      S.burst(S.world(P6.mom), { n: 22, up: 2, speed: 1.2, colors: [C.red, C.gold, C.pink, '#fff3d6'] });
      kid.cheer(); uncle.wave(2); gran.wave(2); mom.hop(); ce.cheer();
      S.learn(zhi); zhi.cheer();
      S.set({ phase: 'done' }); await S.wait(1); S.done();
    }
    S.carry(kid.root, { id: 'kid', label: '小孩', pad: .3, padAt: [0, .5, 0],
      tap: () => { if (st.phase === 'touch') touch(false); else kid.hop(); },
      targets: () => (st.phase !== 'touch' || st.busy ? [] : [-1.4, 0, 1.4].map((x) => ({ at: () => S.world(wallP.art, [x, .9, .1]), r: 125, drop: () => touch(true) }))) });
    S.act('go', go); S.act('touch', () => touch(false));
    S.on('reset', () => { painting = false; catAt = 0; catBusy = false; birdBusy = false; dripBusy = false; wagT = 0; });
    S.on('enter', async () => {
      uncle.doubt(); await S.wait(.5);
      kid.cheer(); S.sound('pop'); await S.wait(.7);
      zhi.hop(); zhi.wave(1.2); await S.wait(.5);
      S.set({ phase: 'ready' });
    });
    S.ui(() => ({
      caption: st.phase === 'done' ? '今天學到：' + DIARY : '',
      buttons: st.phase === 'ready' ? [{ id: 'go', label: '交給我！', primary: true }]
        : st.phase === 'busy' ? [{ id: 'go', label: '交給我！', primary: true, disabled: true }]
          : st.phase === 'touch' ? [{ id: 'touch', label: '按一個手印', primary: true, disabled: st.busy }] : [],
    }));

    S.tick((t, dt) => {
      rays.rotation.z += dt * .05;
      wing.rotation.z = birdBusy ? Math.sin(t * 22) * .7 : Math.sin(t * 2.4) * .06;
      if (wagT > 0) wagT -= dt;
      tail.rotation.z = wagT > 0 ? Math.sin(t * 24) * .5 : Math.sin(t * 3) * .12;
      if (painting) {
        const x = zhi.root.position.x + FOLK.x + .3, L = WALL.x - MW * K / 2, u = Math.min(1, Math.max(0, (x - L) / (MW * K)));
        cover.scale.x = Math.max(.001, 1 - u);
        roller.position.y = .3 + Math.sin(t * 13) * .28; roller.rotation.x = Math.sin(t * 13) * .08;
      }
    });
  },
};
