// 第 2 頁｜相機屋｜邵懿文〈品牌與人的真實距離〉p.12–17
// 相機屋的奶瓶：港邊照相館的牆上掛著一張嬰兒照（戴著小漁夫帽）。大鬍子漁夫收工，熱得想喝一杯。
// 小智盯著那張照片，端出奶瓶、搖鈴、圍兜；把它帶到本人面前從頭看到腳，才端上一大杯冰茶。
import { C, keep, box, cyl, cone, ball, disc, ring, beam, poly, card, tag, tab, cloud, cratePlank, skyDisc } from '../paper.js';

const DIARY = '照片是那一天，人是今天的。';
const HAT = C.gold;                       // the little fisherman's hat: on the baby in the photo, and on the man today
const SKIN = '#d9a47a', BEARD = '#6b4a35', TEA = '#c9822f';
const WALL = '#f1e2c4', SILVER = '#d5d8d6';
const lerp = (a, b, t) => a + (b - a) * t;

/** a face for the photos on the wall: a baby, or the same man today (beard) */
function portrait(g, beard) {
  card(g, 0, -.33, 0, .56, .62, beard ? '#bfe0e4' : C.sky, .02, .02);
  poly(g, [[-.22, -.33], [.22, -.33], [.17, -.17], [-.17, -.17]], .015, beard ? C.teal : C.white, 0, 0, .022);   // shoulders
  disc(g, 0, -.02, .03, beard ? .15 : .16, beard ? SKIN : '#f6d9b8', .02, 20);
  for (const sx of [-1, 1]) { disc(g, sx * .055, 0, .042, .018, C.ink, .006, 8); disc(g, sx * .095, -.05, .041, .024, '#f1a58c', .004, 10); }
  if (beard) {
    poly(g, [[-.14, -.02], [-.15, -.08], [-.09, -.17], [0, -.2], [.09, -.17], [.15, -.08], [.14, -.02], [.06, -.06], [-.06, -.06]], .012, BEARD, 0, 0, .043);
    poly(g, [[-.05, -.09], [.05, -.09], [0, -.13]], .006, C.deep, 0, 0, .056);   // laughing
  } else poly(g, [[-.035, -.07], [.035, -.07], [0, -.095]], .006, C.deep, 0, 0, .042);
  // the hat: the same little fisherman's hat in both photos
  poly(g, [[-.2, .1], [.2, .1], [.16, .14], [.1, .22], [-.1, .22], [-.16, .14]], .014, HAT, 0, 0, .046);
  box(g, 0, .11, .055, .4, .025, .006, '#c99a3c');
}

export default {
  id: 's02-distance', land: 'prologue', short: '看今天的他', calm: true,
  title: '都在用 AI，還能贏在哪？',
  sources: [{ n: 2 }],
  diary: DIARY,
  takeaway: '比的不是誰用了更多 AI，是誰更懂人。AI 最該做的，是幫你更快、更準地懂人：從問一次就結束，變成隨時能問。',
  quote: { t: 'Agentic 時代，戰場上比的不是誰用了更多 AI，而取決於誰更懂人。', n: 2, page: 13 },
  look: { bg: '#2f5672', table: '#6f93ab', key: '#ffe6c4', fill: '#bfd6f5', sky: '#fff1e0' },   // just after dawn
  ground(G) {
    G.wash('#93b9cc');
    G.rect(0, -3.3, 12.4, .7, '#f6e3cf', { r: 0 });                       // morning light on the far water
    G.marks('wave', -6, -3.6, 6, -2.05, { n: 44, col: '#ffffff88', size: .18, seed: 4 });
    // the quay: wooden boards
    G.rect(0, .8, 12.4, 5.6, '#e6cc98', { r: 0 });
    for (let i = 0; i < 12; i++) G.path([[-6, -1.6 + i * .45], [6, -1.6 + i * .45]], { w: .02, col: '#b89f6a77', sharp: true });
    for (let i = 0; i < 15; i++) G.path([[-5.7 + i * .82 + (i % 2) * .25, -1.95], [-5.7 + i * .82 + (i % 2) * .25, 3.6]], { w: .013, col: '#b89f6a44', sharp: true });
    G.path([[-6, -1.98], [6, -1.98]], { w: .1, col: '#b99b63', sharp: true });
    // the jetty where his boat is tied, and his wet footprints up to the studio
    G.rect(2.45, -2.6, .8, 1.3, '#dcc08a', { r: 0, edge: '#b99b63', edgeW: .04 });
    for (let i = 0; i < 4; i++) G.path([[2.05, -2.0 - i * .3], [2.85, -2.0 - i * .3]], { w: .015, col: '#b89f6a88', sharp: true });
    for (let i = 0; i < 8; i++) G.circle(2.42 + (i % 2 ? .1 : -.1), -1.75 + i * .36, .05, '#9fb8c766');
    // the studio's doormat
    G.rect(-3.07, .1, 1.0, .5, '#d9b27a', { r: .04 });
  },
  build(S) {
    const T = S.T, V = (x, y, z) => new T.Vector3(x, y, z);
    const st = S.state({ phase: 'intro', busy: false });
    const follow = new Map();                 // node -> () => world position it sticks to
    const arms = new Map();                   // arm -> {w, z}: holds a puppet's arm in a pose
    const scan = { u: -1 };                   // 0 -> 1: 小智's look runs from his hat down to his boots
    let wipe = false, beamTo = null, sweatT = 0, catBusy = false, capBusy = false;

    // ---------------------------------------------------------------- the camera house
    let flash, glow, shutter, cap, frame, tilt, today, cat, rattle0, swing, plank;
    S.plant(-2.15, -1.2, (g) => {
      tab(g, 2.3);
      box(g, 0, .575, 0, 2.3, 1.15, .9, WALL);
      box(g, 0, .05, .455, 2.32, .1, .02, C.bark);
      box(g, 0, 1.18, 0, 2.46, .06, 1.02, C.navy);                         // the eave
      // the door, with a curtain the cat hides behind
      box(g, -.68, .47, .452, .56, .94, .01, '#7a5237');
      box(g, -.68, .44, .456, .46, .86, .01, '#4a3326');
      cat = keep(g, -.52, .66, .5); const catIn = keep(cat);
      { const cat = catIn; const h = ball(cat, 0, 0, 0, .1, C.ink, 1); h.scale.set(1, .85, .5);
        for (const sx of [-1, 1]) { poly(cat, [[-.035, 0], [.035, 0], [0, .08]], .02, C.ink, sx * .055, .05, -.01); disc(cat, sx * .036, .01, .05, .017, C.lime, .008, 8); }
        poly(cat, [[-.012, -.03], [.012, -.03], [0, -.045]], .008, C.pink, 0, 0, .05); }
      for (const sx of [-1, 1]) { const c = poly(g, [[-.11, 0], [.11, 0], [.11, .38], [-.11, .38]], .012, C.coral, -.68 + sx * .115, .5, .56); c.rotation.z = sx * -.02; }
      box(g, -.68, .89, .53, .56, .03, .1, C.bark);
      // the plank from 小智's crate: the step in front of the door
      box(g, -.68, .1, .58, .6, .03, .26, C.wood);
      plank = cratePlank(g, -.68, .045, .72, { len: .62, h: .09, thick: .04 });
      // the photo of the baby, and an empty nail for one more photo
      frame = keep(g, .12, .62, .47); const frameIn = keep(frame); tilt = frameIn;
      card(frameIn, 0, -.38, -.02, .68, .76, C.wood, .02, .03); portrait(keep(frameIn), false);
      beam(frameIn, [-.2, .38, -.01], [0, .5, -.01], .008, C.bark, 4); beam(frameIn, [.2, .38, -.01], [0, .5, -.01], .008, C.bark, 4);
      ball(g, .12, 1.12, .47, .025, C.bark); ball(g, .8, 1.12, .47, .025, C.bark);
      today = keep(g, .8, .62, .47);
      card(today, 0, -.38, -.02, .64, .76, C.wood, .02, .03); portrait(keep(today), true);
      beam(today, [-.2, .38, -.01], [0, .5, -.01], .008, C.bark, 4); beam(today, [.2, .38, -.01], [0, .5, -.01], .008, C.bark, 4);
      today.visible = false;
      // the rattle a studio waves to make babies look at the camera
      rattle0 = keep(g, -.31, 1.1, .5); const r0 = keep(rattle0); swing = r0;
      beam(r0, [0, 0, 0], [0, -.22, 0], .006, C.ink, 3);
      beam(r0, [0, -.22, 0], [0, -.38, 0], .018, C.white, 5); ball(r0, 0, -.45, 0, .07, C.coral, 1); ring(r0, 0, -.45, 0, .085, .012, HAT, 14);
      // the roof is an old camera
      box(g, 0, 1.61, -.05, 1.8, .8, .74, C.dark);
      for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) box(g, sx * .63, 1.37 + i * .12, .325, .42, .05, .01, '#444247');
      box(g, 0, 2.05, -.05, 1.84, .08, .78, SILVER); box(g, 0, 1.24, -.05, 1.84, .06, .78, SILVER);
      box(g, 0, 2.18, -.1, .5, .2, .5, C.dark); box(g, 0, 2.29, -.1, .54, .04, .54, SILVER); box(g, 0, 2.18, .155, .22, .09, .01, C.blue);
      cyl(g, -.3, 2.13, -.05, .09, .09, .08, SILVER, 12);
      const lens = keep(g, 0, 1.62, .32);
      for (const [r, d, z, c] of [[.38, .1, .05, SILVER], [.32, .3, .2, '#26272b'], [.34, .05, .37, SILVER]]) cyl(lens, 0, 0, z, r, r, d, c, 24).rotation.x = Math.PI / 2;
      disc(lens, 0, 0, .39, .25, '#4f6f8f', .02, 24); disc(lens, -.09, .09, .405, .06, C.white, .01, 12); disc(lens, .07, -.06, .405, .025, C.white, .01, 8);
      cap = keep(g, .62, 1.35, .38);
      beam(cap, [-.24, .24, -.02], [0, 0, -.02], .006, C.ink, 3);
      disc(cap, 0, -.12, 0, .14, '#26272b', .03, 20); disc(cap, 0, -.12, .02, .1, SILVER, .01, 18);
      shutter = keep(g, .62, 2.09, -.05); cyl(shutter, 0, .04, 0, .08, .08, .08, C.red, 12);
      flash = keep(g, -.62, 2.09, -.05);
      beam(flash, [0, 0, 0], [0, .24, 0], .025, SILVER, 6);
      const dish = cone(flash, 0, .36, .02, .25, .14, SILVER, 16); dish.rotation.x = -Math.PI / 2;
      ball(flash, 0, .36, .1, .07, C.white, 1);
      glow = new T.Mesh(new T.CircleGeometry(.5, 24), new T.MeshBasicMaterial({ color: '#fffbe8', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
      glow.position.set(0, .36, .16); glow.userData.raw = true; glow.visible = false; flash.add(glow);
    }, { s: 1.35 });
    const pop = async () => {                       // the camera goes click: the button dips, the flash fires
      S.sound('stamp'); S.to(shutter.position, { y: 2.05 }, .08).then(() => S.to(shutter.position, { y: 2.09 }, .2, 'back'));
      glow.visible = true; glow.material.opacity = .95; glow.scale.setScalar(.3);
      S.to(glow.scale, { x: 3.4, y: 3.4, z: 3.4 }, .45, 'out'); await S.to(glow.material, { opacity: 0 }, .5, 'in'); glow.visible = false;
    };
    S.curio(flash, { id: 'flash', label: '相機', tap: pop });
    S.curio(frame, { id: 'frame', label: '相框', tap: async () => { S.sound('tick'); await S.to(tilt.rotation, { z: tilt.rotation.z ? 0 : .16 }, .8, 'elastic'); } });
    S.curio(cap, { id: 'cap', label: '鏡頭蓋', tap: async () => {
      if (capBusy) return; capBusy = true; S.sound('pop');
      S.to(cap.rotation, { y: cap.rotation.y + Math.PI * 2 }, .7, 'out');
      await S.to(cap.position, { y: 1.75 }, .3, 'out'); await S.to(cap.position, { y: 1.35 }, .45, 'bounce'); capBusy = false;
    } });
    S.curio(cat, { id: 'cat', label: '貓', tap: async () => {
      if (catBusy) return; catBusy = true; S.sound('soft');
      const c = cat.children[0]; await S.to(c.position, { x: .2 }, .3, 'back'); S.to(c.rotation, { z: -.35 }, .25); await S.wait(1.0);
      S.to(c.rotation, { z: 0 }, .25); await S.to(c.position, { x: 0 }, .35, 'inOut'); catBusy = false;
    } });
    S.curio(rattle0, { id: 'rattle', label: '搖鈴', tap: async () => { S.sound('tick'); await S.to(swing.rotation, { z: .5 }, .12); await S.to(swing.rotation, { z: -.4 }, .16); S.sound('tick'); await S.to(swing.rotation, { z: 0 }, .6, 'elastic'); } });
    S.curio(plank, { id: 'plank', label: '台階' });

    // ---------------------------------------------------------------- the place sign, the sun, the boat he came in on
    S.plant(-4.75, .35, (g) => { tab(g, .5); beam(g, [0, 0, 0], [0, 1.3, 0], .035, C.bark, 6); tag(g, '相機屋', 0, 1.07, .04, { h: .27, paper: C.white, ink: C.navy }); });
    let rays;
    S.plant(3.9, -3.25, (g) => { rays = skyDisc(g, { y: .55, r: .45 }); });
    S.curio(rays, { id: 'sun', label: '太陽', tap: () => { S.to(rays.rotation, { z: rays.rotation.z + Math.PI / 2 }, .9, 'out'); } });
    S.plant(-5.0, -3.15, (g) => cloud(g, 1.1, 2.6, '#fbeee2')); S.plant(1.1, -3.3, (g) => cloud(g, .9, 3.0, '#fff4e8'));
    let boat;
    S.plant(2.45, -3.0, (g) => {
      boat = keep(g);
      poly(boat, [[-.95, .36], [.95, .36], [.7, 0], [-.75, 0]], .6, C.white, 0, 0, -.3);
      poly(boat, [[-.97, .36], [.97, .36], [.95, .29], [-.95, .29]], .64, C.teal, 0, 0, -.32);
      box(boat, .3, .58, 0, .5, .44, .4, '#f3e6c8'); box(boat, .3, .82, 0, .58, .05, .46, C.red); box(boat, .3, .62, .205, .3, .14, .01, '#7fb1bb');
      beam(boat, [-.35, .36, 0], [-.35, 1.5, 0], .025, C.wood, 5); beam(boat, [-.35, 1.45, 0], [.25, .84, 0], .008, C.ink, 3);
      flag(boat);
    }, { s: 1 });
    function flag(g) { poly(g, [[0, 0], [.28, -.06], [0, -.13]], .02, C.red, -.35, 1.5, 0); }
    S.plant(3.55, -1.3, (g) => {                   // today's catch
      tab(g, .5); cyl(g, 0, .17, 0, .2, .17, .34, C.blue, 12); cyl(g, 0, .34, 0, .21, .21, .03, C.steel, 12);
      for (const [x, r] of [[-.08, .5], [.06, -.4], [.0, .1]]) { const f = poly(g, [[-.13, 0], [.06, .05], [.13, 0], [.17, .05], [.17, -.05], [.13, 0], [.06, -.05]], .03, '#9fb3bd', x, .4, 0); f.rotation.z = r + 1.2; }
    });

    // ---------------------------------------------------------------- the fisherman, back from the sea
    let fisher, fisherArt, wish, sweat, laugh, dots;
    const fp = S.plant(2.05, 1.15, (g) => {
      fisherArt = g;
      fisher = S.person(g, { x: .9, z: -1.25, s: 1.35, kind: 'adult', coat: C.teal, hair: BEARD, skin: SKIN, legs: '#3c4a52' });
      const h = fisher.head;
      cyl(h, 0, .38, 0, .3, .3, .03, HAT, 16); cyl(h, 0, .45, 0, .17, .21, .14, HAT, 14); box(h, 0, .41, .2, .36, .025, .01, '#c99a3c');
      poly(h, [[-.19, .17], [-.2, .07], [-.13, -.05], [0, -.1], [.13, -.05], [.2, .07], [.19, .17], [.1, .1], [-.1, .1]], .02, BEARD, 0, 0, .036);
      laugh = keep(h, 0, .06, .06); poly(laugh, [[-.06, 0], [.06, 0], [0, -.06]], .008, C.deep); laugh.visible = false;
      sweat = keep(h, .17, .3, .06);
      for (const [x, y] of [[0, 0], [.08, -.1]]) poly(sweat, [[-.025, 0], [.025, 0], [0, .06]], .01, C.aqua, x, y, 0).rotation.z = .2;
      sweat.visible = false;
      // what he wants: a cold glass of something
      wish = keep(fisher.root, -.62, 1.45, .05);
      card(wish, 0, 0, 0, .52, .48, C.white, .03, .2); disc(wish, .24, -.06, 0, .05, C.white, .03, 12); disc(wish, .33, -.13, 0, .03, C.white, .03, 10);
      poly(wish, [[-.08, .08], [.08, .08], [.1, .36], [-.1, .36]], .01, TEA, 0, 0, .035);
      for (const [x, y] of [[-.04, .3], [.035, .27]]) box(wish, x, y, .048, .05, .05, .01, C.white);
      beam(wish, [.03, .3, .05], [.1, .44, .05], .01, C.red, 4);
      wish.visible = false;
      dots = keep(fisher.root, -.62, 1.45, .05); card(dots, 0, 0, 0, .52, .3, C.white, .03, .14); disc(dots, .24, -.05, 0, .045, C.white, .03, 12);
      for (let i = 0; i < 3; i++) disc(dots, -.13 + i * .13, .15, .035, .042, C.navy, .02, 10);
      dots.visible = false;
    });
    const fpp = S.curio(fisher.root, { id: 'fisher', label: '漁夫', tap: () => { fisher.hop(); } }); fisher.propId = fpp.id;

    // what 小智 makes for him: from the photo, then from the man himself
    let bottle, bib, rattle, tea;
    {
      const g = fisherArt;
      bottle = keep(g); cyl(bottle, 0, .085, 0, .068, .068, .17, C.white, 12); cyl(bottle, 0, .21, 0, .064, .064, .08, '#cfe9f0', 12); for (const y of [.06, .12, .18]) box(bottle, 0, y, .068, .05, .008, .006, C.blue); cyl(bottle, 0, .265, 0, .074, .074, .04, C.coral, 12); cone(bottle, 0, .33, 0, .04, .1, C.honey, 10);
      bib = keep(g); poly(bib, [[-.17, .1], [-.13, -.12], [0, -.17], [.13, -.12], [.17, .1], [.07, .1], [0, .03], [-.07, .1]], .015, C.pink); box(bib, 0, -.07, .016, .1, .03, .005, C.white);
      beam(bib, [-.15, .1, .005], [-.2, .2, 0], .008, C.pink, 3); beam(bib, [.15, .1, .005], [.2, .2, 0], .008, C.pink, 3);
      rattle = keep(g); beam(rattle, [0, 0, 0], [0, .16, 0], .018, C.white, 5); ball(rattle, 0, .23, 0, .07, C.coral, 1); ring(rattle, 0, .23, 0, .085, .012, HAT, 14);
      tea = keep(g); cyl(tea, 0, .25, 0, .15, .12, .5, TEA, 14); cyl(tea, 0, .5, 0, .155, .155, .02, '#e8b06a', 14);
      for (const [x, z] of [[-.06, .02], [.05, -.03], [.02, .07]]) box(tea, x, .52, z, .08, .08, .08, '#eef7f8').rotation.y = x * 9;
      beam(tea, [.04, .45, 0], [.14, .78, .02], .016, C.red, 5); disc(tea, -.12, .5, .07, .07, C.lime, .02, 12);
      for (const k of [bottle, bib, rattle, tea]) k.visible = false;
    }

    // ---------------------------------------------------------------- 小策 and 小智
    let ce;
    S.plant(-2.35, 1.7, (g) => { ce = S.person(g, { s: 1.1, kind: 'ce', coat: C.navy }); });
    const cp = S.curio(ce.root, { id: 'ce', label: '小策', tap: () => { ce.hop(); } }); ce.propId = cp.id;

    let zhi, zhiArt, ray;
    S.plant(-.9, .95, (g) => {
      zhiArt = g;
      zhi = S.robot(g, { s: 1.1, lights: S.index - 1 });
      const geo = new T.ConeGeometry(1, 1, 18, 1, true); geo.rotateX(Math.PI); geo.translate(0, .5, 0);
      ray = new T.Mesh(geo, new T.MeshBasicMaterial({ color: C.aqua, transparent: true, opacity: .45, depthWrite: false, side: T.DoubleSide, toneMapped: false }));
      ray.userData.raw = true; ray.visible = false; g.add(ray);
    });

    // ---------------------------------------------------------------- helpers: hold a pose, stick to a hand, fly over
    const hand = (p, side, dy = 0) => () => S.world(side === 'R' ? p.armR : p.armL, [0, -.36, .07]).add(V(0, dy, 0));
    const pose = (arm, z, dur = .3) => { let o = arms.get(arm); if (!o) { o = { w: 0, z }; arms.set(arm, o); } o.z = z; return S.to(o, { w: z == null ? 0 : 1 }, dur, 'inOut'); };
    const at = (node, fn) => { follow.set(node, fn); node.position.copy(S.local(node.parent, fn())); };
    async function fly(node, to, dur = .55, peak = .7) {
      const from = node.getWorldPosition(V(0, 0, 0)), o = { u: 0 };
      follow.set(node, () => { const p = from.clone().lerp(to(), o.u); p.y += Math.sin(Math.PI * o.u) * peak; return p; });
      await S.to(o, { u: 1 }, dur, 'inOut'); follow.set(node, to);
    }
    const fromZhi = (node) => { node.rotation.set(0, 0, 0); at(node, () => S.world(zhi.root, [0, 1.35, .1])); follow.delete(node); return S.show(node, .2); };
    const beamAt = (fn) => { beamTo = fn; ray.visible = !!fn; };
    const photo = () => S.world(frame, [0, 0, .05]);
    const spot = () => S.local(zhi.root.parent, S.world(fisherArt, [-.92, 0, .32]));

    // ---------------------------------------------------------------- the story
    async function go() {
      if (st.phase !== 'ready') return; S.set({ phase: 'busy' });
      // it reads the photo on the wall in a blink
      zhi.hop(); S.sound('whoosh'); beamAt(photo); await S.wait(.8);
      S.emote(zhi, '!', 1.0, C.red); S.sound('tick'); await S.wait(.35); beamAt(null);
      S.hide(wish, .2); zhi.cheer();
      // and serves the baby in it: bib, rattle, bottle
      await fromZhi(bib); S.sound('pop'); fly(bib, () => S.world(fisher.inner, [0, .58, .1]), .45, .5);
      await S.wait(.25); await fromZhi(rattle); S.sound('pop'); fly(rattle, hand(fisher, 'R', -.06), .45, .6);
      await S.wait(.25); await fromZhi(bottle); S.sound('pop'); pose(fisher.armL, -1.25, .4); await fly(bottle, hand(fisher, 'L', -.14), .5, .6);
      // a man with a beard, holding a baby's bottle with two fingers
      zhi.still(); S.sound('soft'); fisher.still();
      await S.wait(.5); S.show(dots, .3);
      await S.wait(.5); pose(ce.armR, -2.62, .35); ce.doubt();
      await S.wait(1.0);
      S.set({ phase: 'touch' }); S.hint(zhi.root, [0, .75, 0], '去看看本人');
    }
    async function touch(byHand) {
      if (st.phase !== 'touch' || st.busy) return; st.busy = true; S.hint(null); S.refresh();
      const p = spot(); p.y = 0;
      if (!byHand) { zhi.walking = true; await S.to(zhi.root.position, { x: p.x, y: 0, z: p.z }, .9, 'inOut'); zhi.walking = false; }
      else { S.sound('soft'); await S.to(zhi.root.position, { x: p.x, y: 0, z: p.z }, .25, 'out'); }
      pose(ce.armR, null, .4); ce.still();
      // it looks at the man himself, from his hat to his boots
      S.sound('whoosh'); scan.u = 0; beamAt(() => S.world(fisher.inner, [0, lerp(1.55, .05, scan.u), .05]));
      await S.to(scan, { u: 1 }, 1.1, 'inOut');
      S.show(sweat, .25); S.sound('tick'); await S.to(scan, { u: .2 }, .5, 'inOut');
      beamAt(null); scan.u = -1; S.emote(zhi, '!', .9, C.red); zhi.hop(); S.hide(dots, .2);
      // the bottle goes back; a big glass of iced tea comes out
      S.hide(bib, .2); await fly(bottle, () => S.world(zhi.root, [0, 1.2, .1]), .4, .4); S.hide(bottle, .15);
      await fromZhi(tea); S.sound('pop'); await fly(tea, hand(fisher, 'L', -.24), .55, .6);
      pose(fisher.armL, -2.45, .3); S.hide(sweat, .2);
      laugh.visible = true; fisher.hop(); S.sound('done');
      S.burst(S.world(fisher.inner, [0, 1.3, .1]), { n: 14, up: 2, speed: 1.1, colors: ['#e8b84e', '#fff3d6', '#62c4cf'] });
      await S.wait(.6);
      // he laughs, and hangs the rattle on 小智's antenna
      S.to(rattle.rotation, { z: -2.3 }, .6); await fly(rattle, () => S.world(zhi.head, [0, .5, .05]), .6, .5); S.sound('tick'); S.wiggle(rattle, .5);
      fisher.cheer(); ce.cheer(); zhi.cheer();
      await S.wait(.5); S.show(today, .4); pop();                     // and the camera on the roof takes today's photo
      S.learn(zhi);
      S.set({ phase: 'done' }); await S.wait(1.0); S.done();
    }

    // 小智: tap it to start; when it is the reader's turn, drag it over to the man himself
    let home = null, off = null;
    const zp = S.drag(zhi.root, { id: 'zhi', label: '小智', aim: [0, .7, 0], plane: 'ground', pad: 0,
      tap: () => {
        if (st.phase === 'ready') go(); else if (st.phase === 'touch') touch(false);
        else { zhi.hop(); zhi.wave(1.2); S.say(S.world(zhi.root, [0, 1.25, 0]), '交給我！', { dur: 1 }); }
      },
      start: (e) => { if (st.phase !== 'touch' || st.busy) { home = null; return; } home = zhi.root.position.clone(); off = zhi.root.parent.worldToLocal(e.point.clone()).sub(zhi.root.position); S.hint(null); },
      move: (e) => { if (!home) return; const p = zhi.root.parent.worldToLocal(e.point.clone()).sub(off); zhi.root.position.set(p.x, home.y, p.z); zhi.walking = true; },
      end: (e) => {
        if (!home) return; zhi.walking = false; const h = home; home = null;
        if (!e.moved) { zhi.root.position.copy(h); return; }
        const a = S.stage.project(S.world(zhi.root, [0, .5, 0])), b = S.stage.project(S.world(fisher.inner, [0, .7, 0]));
        if (Math.hypot(a.x - b.x, a.y - b.y) < 170) touch(true);
        else { S.to(zhi.root.position, { x: h.x, y: h.y, z: h.z }, .45, 'back'); S.wait(.5).then(() => { if (st.phase === 'touch' && !st.busy) S.hint(zhi.root, [0, .75, 0], '去看看本人'); }); }
      } });
    zhi.propId = zp.id;
    S.pad(zhi.root, .42, [0, .55, 0]);

    S.act('go', go); S.act('touch', () => touch(false));
    S.on('reset', () => { follow.clear(); arms.clear(); wipe = false; scan.u = -1; beamTo = null; sweatT = 0; catBusy = capBusy = false; glow.material.opacity = 0; zhi.walking = false; home = null; });
    S.on('enter', async () => {
      // he comes up from his boat, hot, and wipes his brow: he would love a cold drink
      await S.wait(.2); await S.walk(fisher, { x: 0, z: 0 }, .8); fisher.root.scale.x = Math.abs(fisher.root.scale.x);
      wipe = true; pose(fisher.armL, 2.6, .25); S.show(sweat, .2);
      await S.wait(.8); wipe = false; pose(fisher.armL, null, .3); S.hide(sweat, .2);
      S.show(wish, .35); S.sound('pop');
      await S.wait(.4); S.set({ phase: 'ready' });
    });
    S.ui(() => ({
      caption: st.phase === 'done' ? '今天學到：' + DIARY : '',
      buttons: st.phase === 'ready' ? [{ id: 'go', label: '交給我！', primary: true }]
        : st.phase === 'busy' ? [{ id: 'go', label: '交給我！', primary: true, disabled: true }]
          : st.phase === 'touch' ? [{ id: 'touch', label: '看看本人', primary: true, disabled: st.busy }] : [],
    }));

    S.tick((t, dt) => {
      for (const [arm, o] of arms) if (o.w > .001) arm.rotation.z = lerp(arm.rotation.z, o.z + (wipe && arm === fisher.armL ? Math.sin(t * 14) * .2 : 0), o.w);
      for (const [node, fn] of follow) node.position.copy(S.local(node.parent, fn()));
      if (ray.visible && beamTo) {
        const a = S.local(zhiArt, S.world(zhi.eyes, [0, 0, .02])), b = S.local(zhiArt, beamTo()), d = b.clone().sub(a), len = d.length();
        ray.position.copy(a); ray.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
        const r = scan.u >= 0 ? .26 : .36; ray.scale.set(r, len, r); ray.material.opacity = .42 + Math.sin(t * 18) * .08;
      }
      if (sweat.visible) { sweatT += dt; sweat.position.y = .3 - (sweatT * .25) % .12; }
      boat.position.y = Math.sin(t * 1.5) * .025; boat.rotation.z = Math.sin(t * 1.2) * .02;
      rays.rotation.z += dt * .05;
      wish.position.y = 1.45 + Math.sin(t * 2.2) * .025;
    });
  },
};
