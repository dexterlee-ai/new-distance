// 第 3 頁｜運動場｜周麗君〈真實的力量〉p.44–49、第 3 篇 p.20–27
// 百歲爺爺的標槍：105 歲的爺爺彎著腰站在白線前。小智立起一面大看板（超人爺爺，一隻手六根手指），
// 看台坐滿了人，卻抱著胸搖頭；小孩數完手指，戳戳真的爺爺。讀者把標槍往後拉、放開：真的一擲，全場站起來。
import { C, keep, box, cyl, cone, ball, disc, beam, poly, card, quad, tag, tab, cloud, cratePlank, skyDisc } from '../paper.js';

const DIARY = '真的，要讓人親眼看到。';
const SKIN = '#f3cfa6', HAIR = '#ecebe4';
const FOLK = [C.navy, C.slate, C.plum, C.teal, C.deep, C.blue];
const lerp = (a, b, t) => a + (b - a) * t;

/** a hand with six fingers, fanned: drawn on the billboard and again, big, in the kid's thought */
function sixHand(g, x, y, z, s, fingers) {
  const k = keep(g, x, y, z); k.scale.setScalar(s);
  disc(k, 0, 0, 0, .1, SKIN, .02, 16);
  for (let i = 0; i < 6; i++) {
    const a = -.95 + i * .38, f = keep(k, Math.sin(a) * .08, Math.cos(a) * .08, .005); f.rotation.z = -a;
    card(f, 0, 0, 0, .042, .15, SKIN, .02, .02); if (fingers) fingers.push(f);
  }
  return k;
}

export default {
  id: 's03-real', land: 'people', short: '親眼看到', calm: true,
  title: '什麼都能生成，大家還信什麼？',
  sources: [{ n: 6 }, { n: 3 }],
  diary: DIARY,
  takeaway: 'AI 讓什麼都像真的，大家反而不信。讓人親眼看見真實，才會相信。',
  quote: { t: '我們沒有試圖說服大家，我們只是讓大家看見真實。而真實，最終說服了所有人。', n: 6, page: 47 },
  look: { bg: '#2b5a4c', table: '#86a590', key: '#fff0d0', fill: '#c6e6ea', sky: '#fff8e6' },   // morning
  ground(G) {
    G.wash('#a9c993');
    for (let i = 0; i < 9; i++) G.rect(-5.4 + i * 1.35, .2, .68, 7.4, '#a0c189', { r: 0 });          // mown stripes
    // the running track along the front
    G.rect(0, 3.05, 12.4, 1.05, '#d98a66', { r: 0 });
    for (const z of [2.55, 2.9, 3.25]) G.path([[-6, z], [6, z]], { w: .025, col: '#ffffffcc', sharp: true });
    // the javelin runway, the white line, and the landing sector out toward the far end
    G.path([[-3.9, 2.45], [-2.15, 1.25]], { w: .6, col: '#e8d6a8' });
    G.path([[-2.7, .95], [-2.2, .78], [-1.65, .8]], { w: .06, col: '#ffffff' });
    G.path([[-2.05, .7], [-.6, -2.6]], { w: .03, col: '#ffffffbb', sharp: true });
    G.path([[-1.95, .75], [2.6, -1.3]], { w: .03, col: '#ffffffbb', sharp: true });
    for (const [x, z] of [[-.9, -.7], [.1, -.3], [-.3, -1.6], [1.1, -.9]]) G.path([[x - .12, z], [x + .12, z]], { w: .035, col: '#ffffffaa', sharp: true });
    // under the stand and the billboard
    G.rect(-2.75, -1.75, 3.7, 1.5, '#c9b98d', { r: .06 });
    G.rect(1.25, -2.35, 2.4, .5, '#93b37c', { r: .1 });
  },
  build(S) {
    const T = S.T, V = (x, y, z) => new T.Vector3(x, y, z);
    const st = S.state({ phase: 'intro', busy: false });
    const arms = new Map();                    // arm -> {w, z}: hold a puppet's arm in a pose
    const pull = { u: 0 };                     // how far the javelin is drawn back (springs home)
    let doubt = false, cheer = false, springing = false, birdsBusy = false, jav0 = null;

    // ---------------------------------------------------------------- the stand, hung with flags; nobody in it yet
    const rows = [], sits = [], crossed = [], hats = [], yays = [];
    let bunting, pennants = [];
    S.plant(-2.75, -1.85, (g) => {
      tab(g, 3.4);
      box(g, 0, .95, -.62, 3.5, 1.9, .1, '#e9d9b4');
      for (let r = 0; r < 3; r++) {
        box(g, 0, (r + 1) * .15, .5 - r * .42, 3.4, (r + 1) * .3, .42, r % 2 ? C.cream : C.white);
        box(g, 0, (r + 1) * .3 + .015, .62 - r * .42, 3.4, .03, .12, C.red);
      }
      for (const sx of [-1, 1]) { beam(g, [sx * 1.72, 0, .62], [sx * 1.72, 1.82, .62], .035, C.wood, 6); beam(g, [sx * 1.72, 0, -.6], [sx * 1.72, 2.05, -.6], .035, C.wood, 6); }
      for (let i = 0; i < 8; i++) { const x0 = -1.84 + i * .46; quad(g, [x0, 2.06, -.66], [x0 + .46, 2.06, -.66], [x0 + .46, 1.8, .7], [x0, 1.8, .7], i % 2 ? C.white : C.red); }
      // bunting along the front of the roof, and a pennant on each end
      bunting = keep(g, 0, 1.78, .72);
      beam(bunting, [-1.8, 0, 0], [1.8, 0, 0], .008, C.ink, 3);
      for (let i = 0; i < 12; i++) { const f = keep(bunting, -1.65 + i * .3, 0, 0); poly(f, [[-.11, 0], [.11, 0], [0, -.2]], .015, [C.gold, C.coral, C.teal, C.lime][i % 4]); pennants.push(f); }
      for (const sx of [-1, 1]) { beam(bunting, [sx * 1.72, 0, -.06], [sx * 1.72, .75, -.06], .022, C.wood, 5); const p = keep(bunting, sx * 1.72, .72, -.06); poly(p, [[0, 0], [.45, -.08], [0, -.18]], .02, sx < 0 ? C.red : C.gold); pennants.push(p); }
      // three rows of people who will come
      for (let r = 0; r < 3; r++) {
        const row = keep(g, 0, (r + 1) * .3, .5 - r * .42 + .02); rows.push(row);
        for (let i = 0; i < 5; i++) {
          const x = -1.3 + i * .65 + (r % 2) * .18 - .09, col = FOLK[(i + r * 2) % FOLK.length], p = keep(row, x, 0, 0);
          poly(p, [[-.16, 0], [.16, 0], [.13, .24], [-.13, .24]], .04, col, 0, 0, -.02);
          disc(p, 0, .35, 0, .1, col, .05, 16);
          const a = keep(p, 0, .15, .03); beam(a, [-.13, -.04, 0], [.13, .05, 0], .028, '#f0e4cc', 4); beam(a, [-.13, .05, 0], [.13, -.04, 0], .028, '#f0e4cc', 4); a.visible = false; crossed.push(a);
          const y = keep(p, 0, .2, .01); for (const sx of [-1, 1]) { beam(y, [sx * .12, 0, 0], [sx * .25, .3, 0], .03, col, 4); ball(y, sx * .26, .32, 0, .04, col, 0); } y.visible = false; yays.push(y);
          sits.push(p);
          if (i % 2 === 0) { const h = keep(p, 0, .44, .02); poly(h, [[-.1, 0], [.1, 0], [.06, .08], [-.06, .08]], .02, [C.gold, C.red, C.white][(i + r) % 3]); box(h, 0, .005, .01, .26, .025, .04, [C.gold, C.red, C.white][(i + r) % 3]); hats.push(h); }
        }
        row.visible = false;
      }
    });
    S.curio(bunting, { id: 'bunting', label: '彩旗', tap: () => { S.sound('whoosh'); pennants.forEach((f, i) => S.wait(i * .03).then(() => { S.to(f.rotation, { x: -.9 }, .15).then(() => S.to(f.rotation, { x: 0 }, .7, 'elastic')); })); } });

    // ---------------------------------------------------------------- the billboard 小智 puts up: grandpa as a superman (six fingers)
    let bb, chest;
    const handFingers = [];
    S.plant(1.25, -2.35, (g) => {
      bb = keep(g);
      tab(bb, 2.2);
      for (const sx of [-1, 1]) { beam(bb, [sx * .8, 0, -.05], [sx * .8, .95, -.05], .05, C.wood, 6); beam(bb, [sx * .8, 0, -.4], [sx * .8, .9, -.06], .03, C.wood, 5); }
      card(bb, 0, .9, -.04, 2.46, 1.56, C.white, .06, .05);
      card(bb, 0, .96, .025, 2.32, 1.44, '#bfe3ec', .01, .03);
      const a = keep(bb, 0, 1.68, .04);
      for (let i = 0; i < 5; i++) poly(a, [[-1.1, -.55 + i * .26], [-.2, -.5 + i * .26], [-.2, -.48 + i * .26], [-1.1, -.52 + i * .26]], .004, C.white, 0, 0, 0);   // speed lines
      poly(a, [[.15, .12], [-.55, .38], [-1.05, .22], [-.9, -.02], [-.5, .02], [.15, -.08]], .006, C.red, 0, 0, .004);                                   // cape
      for (const y of [-.02, -.12]) { box(a, -.55, y, .012, .5, .085, .008, C.blue); box(a, -.86, y, .012, .14, .095, .008, C.red); }                 // legs, boots
      poly(a, [[-.36, -.17], [.25, -.17], [.32, .17], [-.36, .1]], .008, C.blue, 0, 0, .014);                                                          // body
      box(a, -.3, -.04, .026, .08, .27, .004, C.gold);                                                                                               // belt
      chest = keep(a, .03, 0, .03); disc(chest, 0, 0, 0, .1, C.gold, .01, 18); poly(chest, [[-.05, -.05], [.05, -.05], [0, .06]], .004, C.red, 0, 0, .006);
      disc(a, .44, .12, .02, .16, SKIN, .01, 20); poly(a, [[.29, .16], [.6, .16], [.59, .25], [.44, .3], [.3, .25]], .006, HAIR, 0, 0, .03);          // head, white hair
      for (const sx of [-1, 1]) disc(a, .44 + sx * .055, .14, .032, .016, C.ink, .004, 8);
      poly(a, [[.37, .06], [.51, .06], [.44, .01]], .004, C.deep, 0, 0, .032);                                                                       // grin
      // arms like hams: one punching forward with the six-finger hand, one flexed
      const b1 = ball(a, .28, .24, .02, .12, C.blue, 1); b1.scale.z = .3; const b2 = ball(a, .45, .32, .02, .09, SKIN, 1); b2.scale.z = .3;
      beam(a, [.2, .15, .02], [.62, .38, .02], .05, SKIN, 6);
      sixHand(a, .72, .43, .03, 1.25, handFingers);
      const b3 = ball(a, -.05, -.26, .02, .12, C.blue, 1); b3.scale.z = .3; beam(a, [.05, -.16, .02], [-.1, -.34, .02], .05, SKIN, 6); ball(a, -.15, -.38, .02, .065, SKIN, 0);
      bb.visible = false;
    });

    // ---------------------------------------------------------------- the place sign, the sun, the scoreboard, a drum, a starter's pistol, sparrows
    S.plant(-4.8, 1.35, (g) => { tab(g, .5); beam(g, [0, 0, 0], [0, 1.3, 0], .035, C.bark, 6); tag(g, '運動場', 0, 1.07, .04, { h: .27, paper: C.white, ink: C.navy }); });
    let rays;
    S.plant(2.9, -3.25, (g) => { rays = skyDisc(g, { y: 1.2, r: .45 }); });
    S.curio(rays, { id: 'sun', label: '太陽', tap: () => { S.to(rays.rotation, { z: rays.rotation.z + Math.PI / 2 }, .9, 'out'); } });
    S.plant(-5.0, -3.2, (g) => cloud(g, 1.0, 2.7, C.white)); S.plant(4.7, -3.1, (g) => cloud(g, 1.1, 2.4, '#fffbef'));
    let flip, plank;
    S.plant(4.25, -.6, (g) => {
      tab(g, 1.1);
      box(g, 0, .22, -.02, .9, .03, .3, C.wood);
      plank = cratePlank(g, 0, .11, .14, { len: .9, h: .2 });
      for (const sx of [-1, 1]) beam(g, [sx * .38, .23, 0], [sx * .38, .95, 0], .03, C.bark, 5);
      box(g, 0, 1.1, 0, 1.0, .64, .1, '#2f4f45');
      const tally = (k, n, z) => { for (let i = 0; i < n; i++) box(k, -.09 + i * .06, 0, z, .025, .2, .006, C.white); if (n === 5) beam(k, [-.14, -.07, z], [.16, .08, z], .012, C.white, 3); };
      const left = keep(g, -.23, 1.1, .06); card(left, 0, -.15, 0, .36, .3, '#41665b', .01, .02); tally(left, 3, .015);
      flip = keep(g, .23, 1.25, .06); const fc = keep(flip, 0, -.15, 0); card(fc, 0, -.15, 0, .36, .3, '#41665b', .01, .02); tally(fc, 4, .015); tally(fc, 5, -.005);
    });
    S.curio(flip, { id: 'score', label: '計分板', tap: () => { S.sound('tick'); S.to(flip.rotation, { x: flip.rotation.x - Math.PI }, .5, 'back'); } });
    S.curio(plank, { id: 'plank', label: '台子' });
    let drum, mallet;
    S.plant(-4.45, -.45, (g) => {
      tab(g, .8);
      for (const sx of [-1, 1]) beam(g, [sx * .25, 0, 0], [sx * .1, .3, 0], .025, C.bark, 5);
      drum = keep(g, 0, .62, 0);
      cyl(drum, 0, 0, 0, .36, .36, .3, C.red, 20).rotation.x = Math.PI / 2;
      disc(drum, 0, 0, .152, .37, C.gold, .01, 20); disc(drum, 0, 0, .16, .32, C.white, .01, 20); disc(drum, 0, 0, -.156, .33, C.white, .01, 20);
      mallet = keep(g, .45, .7, .25); beam(mallet, [0, 0, 0], [-.05, .4, 0], .018, C.wood, 5); ball(mallet, -.05, .44, 0, .07, C.cream, 1);
    });
    S.curio(drum, { id: 'drum', label: '大鼓', tap: async () => {
      for (let i = 0; i < 2; i++) { await S.to(mallet.rotation, { z: .5 }, .1); S.sound('soft'); S.pop(drum, 1.08); await S.to(mallet.rotation, { z: 0 }, .16); }
    } });
    let gun, smoke;
    S.plant(3.75, 1.3, (g) => {
      tab(g, .5);
      for (const sx of [-1, 1]) beam(g, [sx * .15, 0, 0], [sx * .12, .34, 0], .02, C.wood, 5); box(g, 0, .36, 0, .38, .04, .3, C.wood);
      gun = keep(g, 0, .4, 0);
      box(gun, 0, .06, 0, .24, .07, .06, C.dark); box(gun, -.08, -.0, 0, .06, .1, .05, C.bark); cyl(gun, .1, .095, 0, .012, .012, .05, C.dark, 6);
      smoke = keep(gun, .2, .08, 0); ball(smoke, 0, 0, 0, .09, C.white, 1); ball(smoke, .08, .05, 0, .06, C.white, 1); smoke.visible = false;
    });
    S.curio(gun, { id: 'gun', label: '發令槍', tap: async () => {
      S.sound('stamp'); S.show(smoke, .2); S.to(gun.rotation, { z: .45 }, .08).then(() => S.to(gun.rotation, { z: 0 }, .4, 'back'));
      await S.to(smoke.position, { x: .4, y: .3 }, .6, 'out'); await S.hide(smoke, .2); smoke.position.set(.2, .08, 0);
    } });
    const birds = []; let flock;
    S.plant(1.5, 2.25, (g) => {
      flock = keep(g);
      for (const [x, z] of [[-.25, 0], [.1, .12], [.35, -.08]]) {
        const b = keep(flock, x, 0, z); const body = ball(b, 0, .07, 0, .065, C.bark, 1); body.scale.set(1.3, .9, .7);
        ball(b, .07, .12, 0, .04, C.bark, 0); poly(b, [[.1, .12], [.15, .11], [.1, .1]], .01, C.gold, 0, 0, -.005); poly(b, [[-.08, .08], [-.18, .12], [-.16, .06]], .01, C.wood, 0, 0, -.005);
        birds.push(b);
      }
    });
    S.curio(flock, { id: 'birds', label: '麻雀', tap: async () => {
      if (birdsBusy) return; birdsBusy = true; S.sound('whoosh');
      await Promise.all(birds.map((b, i) => S.to(b.position, { y: 1.4 + i * .2, x: b.position.x + .6 }, .6, 'out', i * .05)));
      await S.wait(.4); await Promise.all(birds.map((b, i) => S.to(b.position, { y: 0, x: [-.25, .1, .35][i] }, .7, 'inOut', i * .08))); birdsBusy = false;
    } });

    // ---------------------------------------------------------------- 105-year-old grandpa, leaning on his javelin
    let gpa, gArt, jav, grip;
    S.plant(-2.15, 1.05, (g) => {
      gArt = g;
      gpa = S.person(g, { s: 1.15, kind: 'elder', coat: '#e8e2d0', legs: C.navy });
      const cane = gpa.inner.children[gpa.inner.children.length - 1]; if (cane && cane.isMesh) cane.removeFromParent();   // the javelin is his staff today
      box(gpa.inner, 0, .55, .04, .3, .06, .01, C.red);                                                                     // a red stripe on his vest
      poly(gpa.head, [[-.1, .1], [0, .08], [.1, .1], [.06, .06], [-.06, .06]], .012, HAIR, 0, 0, .04);                        // white moustache
      jav = keep(g, -.42, .95, .12);
      beam(jav, [-.9, 0, 0], [.78, 0, 0], .026, '#f4f1ea', 6); cyl(jav, -.06, 0, 0, .028, .028, .26, C.red, 8).rotation.z = Math.PI / 2;
      cone(jav, .87, 0, 0, .04, .2, C.steel, 6).rotation.z = -Math.PI / 2;
      jav.rotation.z = Math.PI / 2;
      grip = keep(g, 0, 0, 0); grip.visible = false;
    });
    gpa.root.rotation.z = .07;
    const gp = S.curio(gpa.root, { id: 'gpa', label: '爺爺', tap: () => { gpa.hop(.18); } }); gpa.propId = gp.id;

    // the kid who will count the fingers
    let kid, kidArt, think; const counted = [];
    S.plant(-.85, .55, (g) => {
      kidArt = g;
      kid = S.person(g, { s: 1.15, kind: 'kid', coat: C.coral, hair: C.bark });
      think = keep(kid.root, .55, 1.55, .08);
      disc(think, 0, .45, 0, .44, C.white, .03, 26); disc(think, -.32, .02, 0, .07, C.white, .03, 12); disc(think, -.4, -.1, 0, .045, C.white, .03, 10);
      sixHand(think, 0, .38, .03, 2.2, counted);
      think.visible = false;
    });
    const kp = S.curio(kid.root, { id: 'kid', label: '小孩', tap: () => { kid.hop(); } }); kid.propId = kp.id;

    let ce;
    S.plant(2.55, 1.55, (g) => { ce = S.person(g, { s: 1.05, kind: 'ce', coat: C.navy }); });
    const cp = S.curio(ce.root, { id: 'ce', label: '小策', tap: () => { ce.hop(); } }); ce.propId = cp.id;

    let zhi;
    S.plant(.85, .45, (g) => { zhi = S.robot(g, { s: 1.0, lights: S.index - 1 }); });
    S.hero(zhi, { ready: () => st.phase === 'ready', go });

    // ---------------------------------------------------------------- helpers
    const pose = (arm, z, dur = .3) => { let o = arms.get(arm); if (!o) { o = { w: 0, z }; arms.set(arm, o); } o.z = z; return S.to(o, { w: z == null ? 0 : 1 }, dur, 'inOut'); };
    const target = () => S.world(chest, [0, 0, .02]);
    const HOLD = V(.34, 1.2, .14), ARM_HOLD = 2.75, ARM_BACK = 3.35;
    const dir = V(3.09, 1.38, -3.47).normalize(), BACK = HOLD.clone().addScaledVector(dir, -1.0); BACK.y = HOLD.y - .15;   // from the white line toward the billboard's chest
    let flight = null;
    const aimQ = (d) => new T.Quaternion().setFromUnitVectors(V(1, 0, 0), d.clone().normalize());
    const placeJav = (u) => { jav.position.lerpVectors(HOLD, BACK, u); const o = arms.get(gpa.armR); if (o) o.z = lerp(ARM_HOLD, ARM_BACK, u); };

    // ---------------------------------------------------------------- the story
    async function go() {
      if (st.phase !== 'ready') return; S.set({ phase: 'busy' });
      // a huge billboard, and people come to see it
      zhi.cheer(); S.sound('whoosh'); await S.show(bb, .55); S.sound('stamp');
      S.burst(S.world(bb, [0, 2.6, 0]), { n: 18, up: 2.2, speed: 1.2 });
      await S.wait(.3);
      for (let r = 0; r < 3; r++) { S.show(rows[r], .35); S.sound('pop'); await S.wait(.3); }
      zhi.still(); await S.wait(.5);
      // the kid counts the fingers on the hand: one, two, ... six
      think.visible = true; counted.forEach((f) => { f.visible = false; }); await S.show(think, .3);
      pose(kid.armR, 2.4, .3);
      for (const f of counted) { f.visible = true; S.pop(f, 1.6); S.sound('tick'); await S.wait(.22); }
      S.emote(kid, '?', 1.6, C.red); await S.wait(.3);
      // the stand does not buy it: arms crossed, heads shaking
      doubt = true; crossed.forEach((a, i) => S.wait(i * .02).then(() => S.show(a, .2))); S.sound('soft');
      await S.wait(.9); S.hide(think, .2); pose(kid.armR, null, .2);
      // he goes and pokes the real one
      await S.walk(kid, { x: -.78, z: .25 }, .8);
      pose(kid.armR, 1.5, .15); await S.wait(.15); gpa.hop(.14); S.sound('tap'); await S.wait(.35); pose(kid.armR, null, .25); S.walk(kid, { x: -.3, z: .45 }, .6).then(() => { kid.root.scale.x = -Math.abs(kid.root.scale.x); });
      // grandpa straightens up and lifts his javelin
      S.to(gpa.root.rotation, { z: 0 }, .4, 'inOut');
      pose(gpa.armL, null, .3); pose(gpa.armR, ARM_HOLD, .5);
      S.to(jav.position, { x: HOLD.x, y: HOLD.y, z: HOLD.z }, .6, 'inOut');
      jav0 = { from: jav.quaternion.clone(), to: aimQ(dir), k: 0 }; await S.to(jav0, { k: 1 }, .6, 'inOut');
      grip.position.copy(HOLD); grip.visible = true;
      S.set({ phase: 'touch' }); S.hint(grip, [-.26, -.21, .29], '往後拉，放開');
    }
    async function touch(byHand) {
      if (st.phase !== 'touch' || st.busy) return; st.busy = true; S.hint(null); S.refresh(); grip.visible = false;
      if (!byHand) { springing = true; pull.u = 0; await S.to(pull, { u: 1 }, .55, 'inOut'); springing = false; await S.wait(.15); }
      // let go: the javelin flies the length of the field
      S.sound('whoosh'); pose(gpa.armR, 1.2, .12); gpa.hop(.1);
      const from = jav.getWorldPosition(V(0, 0, 0)), to = target(), o = { u: 0 }, prev = from.clone();
      const fly = () => { const p = from.clone().lerp(to, o.u); p.y += Math.sin(Math.PI * o.u) * 1.3; const d = p.clone().sub(prev); if (d.lengthSq() > 1e-6) jav.quaternion.copy(aimQ(d)); prev.copy(p); jav.position.copy(S.local(gArt, p)); };
      flight = fly;
      await S.to(o, { u: 1 }, .95, 'lin'); fly(); flight = null;
      // dead centre on the superman's chest
      S.sound('stamp'); S.burst(to, { n: 16, up: 1.6, speed: 1.4, colors: [C.gold, '#fff3d6', C.red] }); S.wiggle(bb, .03);
      await S.wait(.35);
      // the whole stand gets up; hats in the air
      doubt = false; crossed.forEach((a) => S.hide(a, .15)); cheer = true; S.sound('done');
      rows.forEach((r, i) => S.to(r.position, { y: r.position.y + .14 }, .3, 'back', i * .08)); yays.forEach((y, i) => S.wait(.1 + i * .015).then(() => S.show(y, .25)));
      for (const h of hats) { const y0 = h.position.y; S.to(h.position, { y: y0 + 1.1 + Math.random() * .4 }, .55, 'out').then(() => S.to(h.position, { y: y0 }, .7, 'bounce')); S.to(h.rotation, { z: (Math.random() - .5) * 6 }, 1.2, 'out'); }
      S.burst(S.world(rows[2], [0, .8, 0]), { n: 40, up: 3.2, speed: 1.8 });
      pose(gpa.armR, null, .3); gpa.cheer(); kid.cheer(); ce.cheer();
      await S.wait(.6); zhi.cheer(); S.learn(zhi);
      S.set({ phase: 'done' }); await S.wait(1.0); S.done();
    }
    const drag = S.pull(grip, { id: 'jav', label: '標槍', pad: .5, padAt: [0, 0, 0], from: [HOLD.x, HOLD.y, HOLD.z], to: [BACK.x, BACK.y, BACK.z], tap: () => touch(false),
      move: (u) => { if (st.phase !== 'touch' || st.busy) return; S.hint(null); placeJav(u); },
      end: async (u) => {
        if (st.phase !== 'touch' || st.busy) return;
        if (u >= .5) { pull.u = u; touch(true); return; }
        springing = true; pull.u = u; drag.set(0); await S.to(pull, { u: 0 }, .35, 'back'); springing = false; drag.set(0); placeJav(0);
        S.hint(grip, [-.26, -.21, .29], '往後拉，放開');
      } });

    S.act('go', go); S.act('touch', () => touch(false));
    S.on('reset', () => { arms.clear(); doubt = cheer = springing = birdsBusy = false; pull.u = 0; jav0 = null; flight = null; });
    S.on('enter', async () => {
      // a very old man at the white line, javelin in hand; the stand is empty
      pose(gpa.armL, -.5, .01);
      await S.wait(.5); gpa.hop(.08); S.sound('tap'); await S.wait(.6);
      ce.wave(1.2); await S.wait(.6); S.set({ phase: 'ready' });
    });
    S.ui(() => ({
      caption: st.phase === 'done' ? '今天學到：' + DIARY : '',
      buttons: st.phase === 'ready' ? [{ id: 'go', label: '交給我！', primary: true }]
        : st.phase === 'busy' ? [{ id: 'go', label: '交給我！', primary: true, disabled: true }]
          : st.phase === 'touch' ? [{ id: 'touch', label: '擲出去', primary: true, disabled: st.busy }] : [],
    }));

    S.tick((t, dt) => {
      for (const [arm, o] of arms) if (o.w > .001) arm.rotation.z = lerp(arm.rotation.z, o.z, o.w);
      if (jav0 && jav0.k < 1) jav.quaternion.copy(jav0.from).slerp(jav0.to, jav0.k);
      if (springing) placeJav(pull.u);
      if (flight) flight();
      if (doubt) sits.forEach((p, i) => { p.rotation.z = Math.sin(t * 7 + i * 1.7) * .12; });
      else if (cheer) sits.forEach((p, i) => { p.position.y = Math.abs(Math.sin(t * 6 + i * .9)) * .1; p.rotation.z = 0; });
      pennants.forEach((f, i) => { f.rotation.y = Math.sin(t * 2 + i * .6) * .25; });
      rays.rotation.z += dt * .05;
      birds.forEach((b, i) => { if (!birdsBusy) b.rotation.z = Math.max(0, Math.sin(t * 3 + i * 2)) * .3; });
    });
  },
};
