// 第 12 頁｜天燈廣場｜張詠琦、蔡孟軒、楊至靜〈保健、美妝與零售如何把 AI 變成行動能力〉p.188–195（全書結尾）
// 放手之前，等你：夜裡，小智一眨眼糊好大天燈、貼上願望、點火；貼歪的那張它自己撕下重貼（收得回的事）。
// 天燈鼓起來要飛，小智緊緊拉住不放、腳尖離地，回頭等阿嬤點頭；讀者把天燈往上送，阿嬤一點頭，它才放手。
import { T, C, keep, group, box, cyl, cone, ball, disc, ring, beam, poly, slab, card, tag, tab, house, pine, cratePlank, skyDisc } from '../paper.js';

const DIARY = '放手就收不回，所以等你點頭。';
const BW = .42, TW = .56, LH = 1.6, HOV = 1.35;    // the big lantern: half widths at the bottom and top, height; how high it floats while held
const LZ = -.35, RZ = .5;                          // in the lantern's plant: where the lantern and 小智 stand
const A = [0, 0, LZ], B = [0, 1.5, LZ - .45];      // the reader sends it up along this line
const WARM = '#ffd47a';

// a soft round glow, drawn additively: halos round the lanterns and pools of light on the page
const haloTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,226,160,1)'); r.addColorStop(.3, 'rgba(255,196,112,.5)'); r.addColorStop(.65, 'rgba(255,170,90,.14)'); r.addColorStop(1, 'rgba(255,160,80,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
})();
/** a part that shines by itself (not lit by the night): kept out of the merged paper mesh */
function lit(p, geo, m, x = 0, y = 0, z = 0) { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.userData.raw = true; p.add(o); return o; }
function litShape(p, pts, m, x = 0, y = 0, z = 0) { const s = new T.Shape(); pts.forEach(([a, b], i) => (i ? s.lineTo(a, b) : s.moveTo(a, b))); return lit(p, new T.ShapeGeometry(s), m, x, y, z); }
function litQuad(p, a, b, c, d, m) { const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute([...a, ...b, ...c, ...c, ...d, ...a], 3)); geo.computeVertexNormals(); return lit(p, geo, m); }
function halo(p, x, y, z, size, opacity = .6, col = '#ffd08a') {
  const m = new T.Sprite(new T.SpriteMaterial({ map: haloTex, color: col, transparent: true, opacity, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
  m.position.set(x, y, z); m.scale.set(size, size, 1); m.raycast = () => {}; m.userData.raw = true; p.add(m); return m;
}
function pool(p, x, z, size, opacity) {
  const m = new T.Mesh(new T.PlaneGeometry(size, size), new T.MeshBasicMaterial({ map: haloTex, color: '#ffa04a', transparent: true, opacity, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, .016, z); m.raycast = () => {}; m.userData.raw = true; p.add(m); return m;
}
const shine = (col) => new T.MeshBasicMaterial({ color: col, side: T.DoubleSide, fog: false });
/** a small sky lantern far away, glowing */
function skyLantern(p, s = 1) {
  const k = keep(p); k.scale.setScalar(s);
  lit(k, new T.CylinderGeometry(.085, .062, .19, 4), shine(['#ffc45e', '#ffb458', '#ffd27a'][Math.floor(s * 10) % 3]), 0, .095, 0).rotation.y = Math.PI / 4;
  halo(k, 0, .1, -.02, .62, .55);
  return k;
}

export default {
  id: 's12-gates', land: 'ai', short: '等你點頭', calm: true,
  title: '哪些事可以放手讓 AI 做？',
  sources: [{ n: 22 }],
  diary: DIARY,
  takeaway: '不是讓 AI 做越多越好。錯了收得回的事放手讓它做；收不回的事，先等人點頭。',
  quote: { t: 'Agent 的成熟度不等於自主權越高越好。', n: 22, page: 195 },
  look: { bg: '#141a33', table: '#3b4a74', key: '#cfd6ff', fill: '#7f93d6', sky: '#aab6e6' },   // night
  ground(G) {
    G.wash('#7373a8');
    // the night sea beyond the sea wall, with lantern light on it
    G.rect(0, -3.0, 12.4, 1.3, '#3f4f88', { r: 0 });
    G.marks('wave', -6, -3.6, 6, -2.45, { n: 42, col: '#ffffff2e', size: .16, seed: 12 });
    for (const [x, z, w] of [[-4.6, -2.7, .34], [-2.4, -2.95, .26], [-1.2, -2.6, .22], [.9, -3.2, .3], [2.3, -2.75, .26], [4.2, -2.9, .32], [-3.3, -3.35, .2], [3.2, -3.4, .22]])
      for (let i = 0; i < 3; i++) G.path([[x - w * (1 - i * .3), z + i * .09], [x + w * (1 - i * .3), z + i * .09]], { w: .035, col: '#ffd27a' + ['aa', '77', '44'][i], sharp: true });
    G.path([[-6, -2.36], [6, -2.36]], { w: .13, col: '#a3abd6', sharp: true });
    // paving
    for (let i = 0; i < 12; i++) G.path([[-6, -2.0 + i * .5], [6, -2.0 + i * .5]], { w: .016, col: '#ffffff1c', sharp: true });
    for (let i = 0; i < 17; i++) G.path([[-6 + i * .75 + (i % 2) * .15, -2.3], [-6 + i * .75 + (i % 2) * .15, 3.6]], { w: .012, col: '#ffffff12', sharp: true });
    // the lantern circle, warm where the big lantern stands
    G.circle(-.8, -.8, 1.7, '#8a86be', { edge: '#c3bfe4', edgeW: .05 });
    G.circle(-.8, -.8, 1.25, null, { edge: '#b9bee277', edgeW: .03 });
    for (const [r, a] of [[1.6, '16'], [1.25, '1e'], [.9, '26'], [.55, '30']]) G.circle(-.8, -.8, r, '#ffcf7a' + a);
    // warm spots under the wish table, the cat's little lantern and the tea stall
    for (const [x, z, r] of [[-1.8, .84, .8], [-1.3, 1.65, .55], [1.8, .9, 1.1]]) for (const k of [1, .7, .45]) G.circle(x, z, r * k, '#ffcf7a14');
    // a path from the reader's side to the circle
    G.path([[-.6, 3.6], [-.7, 2.2], [-.8, .9]], { w: .5, col: '#ffffff14' });
  },
  build(S) {
    const st = S.state({ phase: 'intro', busy: false, nodded: false });
    const GLOW = { u: 0 }, LIFT = { y: 0 }, GL = [];
    let hold = false, look = false, ceReach = false, ceSlip = false, draw = true, nodT = 0, back = null, catBusy = false, ferryBusy = false;
    /** a lantern colour that goes from moonlit paper (off) to lamplight (on) as GLOW.u goes from 0 to 1 */
    const gm = (on, off = .58) => { const c1 = new T.Color(on), c0 = typeof off === 'number' ? c1.clone().multiplyScalar(off) : new T.Color(off); const m = new T.MeshBasicMaterial({ color: c0, side: T.DoubleSide, fog: false }); GL.push([m, c0, c1]); return m; };
    const WIN = shine(WARM);

    // ---- the moon, high: it is night
    let stars;
    S.plant(3.4, -3.25, (g) => { stars = skyDisc(g, { kind: 'moon', y: 2.4, r: .42 }); halo(g, 0, 2.42, -.08, 1.9, .28, '#cfd6ff'); });
    S.curio(stars, { id: 'moon', label: '月亮', tap: () => { S.sound('soft'); S.to(stars.rotation, { z: stars.rotation.z + Math.PI / 2 }, .9, 'out'); } });

    // ---- the village across the water: lit windows
    for (const [x, z, s] of [[-4.75, -2.85, 1], [-3.55, -3.1, .8], [4.75, -2.7, .95]]) S.plant(x, z, (g) => { tab(g, .8); house(g, .9, .7, .6, '#d9c4a4', '#8b4f5c'); lit(g, new T.PlaneGeometry(.17, .15), WIN, .198, .392, .33); }, { s });
    S.plant(-5.5, -1.95, (g) => pine(g, 1.3)); S.plant(5.5, -1.7, (g) => pine(g, 1.1));
    // strings of little lights along the sea wall
    const bulbs = [shine('#ffd47a'), shine('#ff9a6a')];
    for (const side of [-1, 1]) S.plant(side * 3.95, -2.1, (g) => {
      for (const x of [-1.45, 1.45]) { const p = group(g); p.position.x = x; tab(p, .2); beam(p, [0, 0, 0], [0, 1.05, 0], .022, C.bark, 5); ball(p, 0, 1.07, 0, .035, C.gold, 0); }
      const pts = []; for (let i = 0; i <= 12; i++) { const u = i / 12, x = -1.45 + 2.9 * u; pts.push([x, 1.0 - Math.sin(Math.PI * u) * .28]); }
      for (let i = 0; i < 12; i++) beam(g, [pts[i][0], pts[i][1], 0], [pts[i + 1][0], pts[i + 1][1], 0], .006, '#2b2f45', 3);
      for (let i = 1; i < 12; i++) { lit(g, new T.SphereGeometry(.045, 8, 6), bulbs[i % 2], pts[i][0], pts[i][1] - .05, 0); halo(g, pts[i][0], pts[i][1] - .05, .02, .42, .45); }
    });

    // ---- a ferry going home far out, its windows lit
    let ferry, funnel, puff;
    S.plant(-1.95, -3.2, (g) => {
      ferry = keep(g);
      poly(ferry, [[-1.0, .3], [1.05, .3], [.85, 0], [-.85, 0]], .4, '#e9dcc0', 0, 0, -.2);
      poly(ferry, [[-1.02, .3], [1.07, .3], [1.05, .23], [-1.0, .23]], .42, C.red, 0, 0, -.21);
      box(ferry, -.15, .5, 0, 1.1, .4, .32, C.white);
      for (let i = 0; i < 4; i++) lit(ferry, new T.PlaneGeometry(.15, .13), WIN, -.55 + i * .27, .52, .165);
      box(ferry, -.15, .72, 0, 1.2, .05, .36, C.navy);
      funnel = keep(ferry, .3, .74, 0); cyl(funnel, 0, .18, 0, .09, .1, .36, C.red, 8); cyl(funnel, 0, .37, 0, .1, .1, .05, C.dark, 8);
      puff = keep(ferry, .3, 1.05, 0); const b = ball(puff, 0, 0, 0, .12, C.white, 1); b.scale.z = .5; puff.visible = false;
    }, { s: .55 });
    S.curio(funnel, { id: 'ferry', label: '渡輪', tap: async () => {
      if (ferryBusy) return; ferryBusy = true; S.sound('soft'); S.wiggle(funnel, .12);
      puff.position.y = 1.05; S.show(puff, .25); await S.to(puff.position, { y: 1.6 }, 1.1, 'out'); await S.hide(puff, .25); puff.position.y = 1.05; ferryBusy = false;
    } });

    // ---- other people's lanterns, slowly rising far away (more join at the end)
    const sea = [], more = []; let rnd = 41; const R = () => ((rnd = (Math.imul(rnd, 1664525) + 1013904223) >>> 0) / 4294967296);
    const SEA0 = [[-4.6, -3.3, 1.5, 1], [-2.5, -3.2, 2.2, .9], [-1.3, -3.45, 1.2, .8], [2.6, -3.3, 1.9, .9], [4.5, -3.45, 1.35, 1], [.6, -3.05, 2.7, .8]];
    const SEA1 = []; for (let i = 0; i < 18; i++) SEA1.push([-5.2 + i * .6 + R() * .3, -3.4 + R() * 1.5, 1.4 + R() * 2.0, .7 + R() * .4]);
    for (const side of [-1, 1]) S.plant(side * 3.2, -3.0, (g) => {
      for (const [list, late] of [[SEA0, false], [SEA1, true]]) for (const [x, z, y, s] of list) {
        if (Math.sign(x || 1) !== side) continue;
        const slot = keep(g, x - side * 3.2, 0, z + 3.0), bob = keep(slot); skyLantern(bob, s);
        sea.push({ bob, y0: y - .6, ph: R(), sp: .028 + R() * .02 });
        if (late) { slot.visible = false; more.push(slot); }
      }
    });

    // ---- the place sign: the only words on the page
    S.plant(-4.5, -.45, (g) => {
      tab(g, .5); beam(g, [0, 0, 0], [0, 1.25, 0], .035, C.bark, 6);
      tag(g, '天燈廣場', 0, 1.02, .04, { h: .27, paper: C.white, ink: C.navy });
    });

    // ---- the big lantern and 小智
    let LP, lanLift, lanHov, bob, body, flame, flick, tug, sheets, bucket, bubble, lanHalo, lanPool, padMesh, zhi, ropeL, ropeR; const wishes = [];
    S.plant(-.8, -.45, (g) => {
      LP = g;
      lanLift = keep(g, ...A); lanHov = keep(lanLift); bob = keep(lanHov);
      body = keep(bob); body.rotation.y = Math.PI / 4;
      const b = BW, t = TW;
      const bfl = [-b, 0, b], bfr = [b, 0, b], bbr = [b, 0, -b], bbl = [-b, 0, -b], tfl = [-t, LH, t], tfr = [t, LH, t], tbr = [t, LH, -t], tbl = [-t, LH, -t], apex = [0, LH + .2, 0];
      litQuad(body, bfl, bfr, tfr, tfl, gm('#ffcf6e', '#bdb6d2'));      // faces the reader on the right
      litQuad(body, bbl, bfl, tfl, tbl, gm('#ffad57', '#a39cbf'));      // faces the reader on the left
      const backM = gm('#f59652', '#8e88aa'); litQuad(body, bfr, bbr, tbr, tfr, backM); litQuad(body, bbr, bbl, tbl, tbr, backM);
      const capM = gm('#ffe0a0', '#cfc8e0'); for (const [p, q] of [[tfl, tfr], [tfr, tbr], [tbr, tbl], [tbl, tfl]]) litQuad(body, p, q, apex, apex, capM);
      // bamboo: ribs, the bottom hoop, the cross wires and the fuel pad
      for (const [p, q] of [[bfl, tfl], [bfr, tfr], [bbr, tbr], [bbl, tbl]]) beam(body, p, q, .014, C.wood, 5);
      for (const [p, q] of [[bfl, bfr], [bfr, bbr], [bbr, bbl], [bbl, bfl]]) beam(body, p, q, .022, C.bark, 5);
      for (const [p, q] of [[tfl, tfr], [tfr, tbr], [tbr, tbl], [tbl, tfl]]) beam(body, p, q, .012, C.wood, 5);
      beam(body, bfl, bbr, .006, '#d8ccaa', 4); beam(body, bfr, bbl, .006, '#d8ccaa', 4); box(body, 0, 0, 0, .13, .03, .13, '#f2e2c0');
      flame = keep(body, 0, .02, 0); flick = keep(flame);
      lit(flick, new T.ConeGeometry(.065, .22, 8), shine('#ffbf4a'), 0, .11, 0); lit(flick, new T.ConeGeometry(.032, .13, 8), shine('#fff3c4'), 0, .075, 0);
      flame.visible = false;
      // the wishes: a heart, a cup of tea, a home (the home goes on crooked first)
      const onPanel = (face, y, off) => {
        const w = b + (t - b) * y / LH, a = Math.atan((t - b) / LH), k = keep(body); k.rotation.order = 'YXZ';
        if (face === 'front') { k.position.set(off, y, w + .014); k.rotation.set(a, 0, 0); } else { k.position.set(-w - .014, y, off); k.rotation.set(a, -Math.PI / 2, 0); }
        return k;
      };
      const paperM = gm('#fff3d8', '#c4bfd2'), red = gm('#e0573c'), brown = gm('#b07a3e'), blue = gm('#5f86a8');
      [['front', .98, -.1, 'heart'], ['left', .92, .12, 'cup'], ['front', .5, .13, 'home']].forEach(([face, y, off, pic], i) => {
        const k = keep(onPanel(face, y, off)); lit(k, new T.PlaneGeometry(.3, .36), paperM);
        if (pic === 'heart') { lit(k, new T.CircleGeometry(.052, 14), red, -.045, .035, .004); lit(k, new T.CircleGeometry(.052, 14), red, .045, .035, .004); litShape(k, [[-.096, .022], [.096, .022], [0, -.095]], red, 0, 0, .004); }
        else if (pic === 'cup') { litShape(k, [[-.075, .03], [.075, .03], [.055, -.09], [-.055, -.09]], brown, 0, 0, .004); lit(k, new T.RingGeometry(.026, .042, 12), brown, .085, -.025, .004); for (const sx of [-1, 1]) litShape(k, [[-.008, 0], [.008, 0], [.014, .09], [-.002, .09]], brown, sx * .03, .06, .004); }
        else { litShape(k, [[-.075, -.11], [.075, -.11], [.075, .02], [-.075, .02]], blue, 0, 0, .004); litShape(k, [[-.11, .02], [.11, .02], [0, .12]], red, 0, 0, .005); litShape(k, [[-.022, -.11], [.022, -.11], [.022, -.04], [-.022, -.04]], paperM, 0, 0, .006); k.rotation.z = .5; }
        k.visible = false; wishes.push(k);
      });
      // lines over the top that say "it wants to go up"
      tug = keep(bob, 0, LH + .38, .1);
      for (let i = 0; i < 3; i++) litShape(tug, [[-.09, 0], [0, .075], [.09, 0], [.09, -.04], [0, .035], [-.09, -.04]], shine('#fff1c8'), (i - 1) * .5, 0, 0);
      tug.visible = false;
      lanHalo = halo(bob, 0, LH * .55, 0, 3.6, 0); lanHalo.visible = false;
      padMesh = S.pad(bob, .82, [0, LH * .5, 0]); padMesh.visible = false;
      body.scale.y = .03;                                   // at first it is only a flat stack of paper on a bamboo frame
      lanPool = pool(g, 0, LZ, 3.8, 0);
      // loose sheets and the paste bucket beside it
      sheets = keep(g, -.85, 0, -.2);
      [[C.cream, .2, 0, 0], [C.coral, -.25, .05, .08], [C.gold, .5, -.03, .16]].forEach(([col, r, dx, y]) => { slab(sheets, [[-.26, -.2], [.26, -.2], [.26, .2], [-.26, .2]], .012, col, .012 + y * .1).rotation.z = r; });
      for (const [p, q] of [[[-.3, .06, .3], [.3, .06, .3]], [[.3, .06, .3], [.3, .06, -.1]]]) beam(sheets, p, q, .016, C.wood, 5);
      bucket = keep(g, -1.05, 0, -.6); tab(bucket, .3);
      cyl(bucket, 0, .12, 0, .12, .1, .24, C.steel, 10); cyl(bucket, 0, .245, 0, .11, .11, .012, C.white, 10); beam(bucket, [.02, .24, 0], [.13, .44, .03], .014, C.wood, 5);
      bubble = keep(bucket, -.03, .27, 0); ball(bubble, 0, 0, 0, .05, C.white, 1); bubble.visible = false;
      // 小智, with eleven lights on
      zhi = S.robot(g, { x: 0, y: 0, z: RZ, s: .95, prop: false, lights: S.index - 1 });
      // the two strings it holds on by (stretched between its hands and the lantern every frame)
      for (let i = 0; i < 2; i++) { const k = keep(g); cyl(k, 0, .5, 0, .011, .011, 1, '#f3e6c4', 5); k.visible = false; if (i) ropeR = k; else ropeL = k; }
    });
    const liftProp = S.pull(lanLift, { id: 'lift', label: '送它上天', from: A, to: B,
      move: (u) => { if (st.phase === 'touch' && !st.busy && u > .03) nod(); },
      end: (u) => { if (st.phase !== 'touch' || st.busy) return; if (u > .4) touch(true); else { back = { u }; S.to(back, { u: 0 }, .45, 'out').then(() => { back = null; }); } },
      tap: () => { if (st.phase === 'ready') go(); else if (st.phase === 'touch') touch(false); else S.wiggle(bob, .05); } });
    const liftDrag = liftProp.drag; liftProp.drag = null;     // it can only be sent up once 小智 is holding it
    S.hero(zhi, { ready: () => st.phase === 'ready', go });
    S.curio(bucket, { id: 'paste', label: '漿糊桶', tap: async () => {
      if (bubble.visible) return; S.show(bubble, .2); await S.to(bubble.position, { y: .45 }, .45, 'out'); S.sound('tick'); await S.hide(bubble, .12); bubble.position.y = .27;
    } });

    // ---- the grandmother drawing her wish, slowly, at a low table
    let gran, wish, candle, cflick;
    S.plant(-2.4, .7, (g) => {
      gran = S.person(g, { x: 0, z: 0, s: 1, kind: 'elder', coat: '#b5654f' });
      const tb = group(g); tb.position.set(.6, 0, .14); tab(tb, .7);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) beam(tb, [sx * .28, 0, sz * .16], [sx * .28, .42, sz * .16], .018, C.bark, 5);
      box(tb, 0, .43, 0, .7, .04, .44, C.wood);
      wish = keep(tb, -.02, .455, .17); wish.rotation.x = -1.42;
      card(wish, 0, 0, 0, .34, .26, C.white, .008, .02);
      for (const sx of [-1, 1]) disc(wish, sx * .03, .15, .01, .034, C.red, .006, 12);
      poly(wish, [[-.062, .14], [.01, .14], [-.01, .07]], .006, C.red, 0, 0, .006);   // half a heart: she is still drawing it
      beam(tb, [.16, .455, .05], [.3, .47, -.05], .012, C.ink, 4);                       // her brush
      candle = keep(tb, -.24, .45, -.08); cyl(candle, 0, .06, 0, .035, .035, .12, C.white, 8);
      cflick = keep(candle, 0, .13, 0); lit(cflick, new T.ConeGeometry(.03, .1, 8), shine('#ffc24d'), 0, .04, 0); halo(candle, 0, .17, 0, .7, .5);
      pool(g, .6, .14, 1.6, .32);
    });
    const gp = S.curio(gran.root, { id: 'gran', label: '阿嬤', tap: () => { gran.hop(); } }); gran.propId = gp.id;
    S.curio(wish, { id: 'wish', label: '願望紙', tap: async () => { S.sound('whoosh'); await S.to(wish.rotation, { x: -.75 }, .22, 'out'); await S.to(wish.rotation, { x: -1.42 }, .5, 'bounce'); } });
    S.curio(candle, { id: 'flame', label: '燭火', tap: async () => { await S.to(cflick.scale, { y: 2.2, x: 1.3 }, .12, 'out'); await S.to(cflick.scale, { y: 1, x: 1 }, .5, 'elastic'); } });

    // ---- a cat and a little paper lantern lying on its side
    let cat, tail, small;
    const CAT_OUT = -.44, CAT_IN = -.02;
    S.plant(-1.3, 1.6, (g) => {
      tab(g, .5);
      small = keep(g, 0, .16, 0);
      const tube = lit(small, new T.CylinderGeometry(.155, .155, .36, 14, 1, true), shine('#ff9468')); tube.rotation.z = Math.PI / 2;
      for (const x of [-.12, 0, .12]) ring(small, x, 0, 0, .157, .008, '#a3443a', 18).rotation.y = Math.PI / 2;
      disc(small, .182, 0, 0, .16, '#7d3f35', .02, 16).rotation.set(0, Math.PI / 2, 0);
      halo(small, 0, .02, .05, 1.0, .5);
      cat = keep(g, CAT_OUT, 0, .02);
      const b = ball(cat, 0, .1, 0, .1, '#e0954e', 1); b.scale.set(1.35, .75, .55);
      const h = ball(cat, .13, .17, .01, .068, '#e0954e', 1); h.scale.z = .7;
      for (const dz of [-.025, .025]) poly(cat, [[-.03, 0], [.03, 0], [0, .06]], .012, '#c97a3a', .13 + dz * 1.4, .22, dz);
      for (const dx of [-.07, .06]) box(cat, dx, .03, 0, .03, .07, .05, '#c97a3a');
      disc(cat, .175, .18, .05, .01, C.ink, .006, 6);
      tail = keep(cat, -.12, .1, 0); beam(tail, [0, 0, 0], [-.12, .1, 0], .018, '#c97a3a', 5); beam(tail, [-.12, .1, 0], [-.1, .19, 0], .016, '#c97a3a', 5);
    });
    S.curio(cat, { id: 'cat', label: '貓', tap: async () => {
      if (catBusy) return; catBusy = true; S.sound('soft');
      await S.to(cat.position, { x: CAT_IN }, .5, 'inOut'); S.wiggle(small, .12); S.sound('tap');
      await S.wait(1.4); await S.to(cat.position, { x: CAT_OUT }, .45, 'out'); catBusy = false;
    } });

    // ---- 小策
    let ce;
    S.plant(.45, 1.45, (g) => { ce = S.person(g, { s: 1, kind: 'ce', coat: C.navy }); });
    const cp = S.curio(ce.root, { id: 'ce', label: '小策', tap: () => { ce.hop(); } }); ce.propId = cp.id;

    // ---- the crate 小智 came in, now the tea stall: the slip still on it, the last plank leaning on it
    let lid, slip, mini, plank, figs, post;
    S.plant(1.8, .45, (g) => {
      tab(g, 1.8);
      box(g, 0, .31, 0, 1.7, .62, .8, '#c99a63');
      for (const y of [.205, .41]) box(g, 0, y, .402, 1.7, .014, .01, '#a87a48');
      for (const sx of [-1, 1]) { box(g, sx * .8, .31, .405, .1, .62, .03, '#b3824e'); box(g, sx * .855, .31, 0, .012, .62, .8, '#b3824e'); }
      lid = keep(g, 0, .62, -.4); box(lid, 0, .03, .4, 1.76, .06, .84, '#b98a55'); for (const x of [-.5, .5]) box(lid, x, .066, .4, .09, .012, .84, '#a87a48');
      for (const x of [-.7, -.52]) poly(lid, [[-.035, 0], [.035, 0], [.035, .16], [.08, .16], [0, .29], [-.08, .16], [-.035, .16]], .008, C.red, x, -.003, .3).rotation.x = Math.PI / 2;
      lid.rotation.x = -1.82;
      // tea on the counter
      const pot = ball(g, -.12, .72, .05, .12, C.white, 1); pot.scale.set(1.1, .8, .9);
      beam(g, [-.01, .72, .05], [.09, .82, .05], .018, C.white, 5); ball(g, -.12, .82, .05, .025, C.red, 0); ring(g, -.25, .73, .05, .055, .012, C.white, 12);
      for (const [x, z] of [[.18, .2], [.36, .12]]) { cyl(g, x, .68, z, .05, .04, .11, C.white, 10); cyl(g, x, .735, z, .046, .046, .01, '#b9803f', 10); }
      // the slip on the crate: a sky lantern and a turn-back arrow (the same slip as on page 1)
      slip = keep(g, -.6, .17, .414); slip.rotation.z = .07;
      card(slip, 0, 0, 0, .38, .3, C.white, .012, .02);
      poly(slip, [[-.05, 0], [.05, 0], [.066, .13], [-.066, .13]], .006, C.coral, -.09, .11, .013);
      poly(slip, [[-.022, 0], [.022, 0], [0, .04]], .006, C.gold, -.09, .06, .013);
      beam(slip, [.03, .215, .017], [.14, .215, .017], .01, C.red, 4); beam(slip, [.14, .215, .017], [.14, .105, .017], .01, C.red, 4); beam(slip, [.14, .105, .017], [.055, .105, .017], .01, C.red, 4);
      poly(slip, [[0, 0], [.05, .04], [.05, -.04]], .006, C.red, .012, .105, .013);
      // folded into a little lantern later
      mini = keep(g, 0, 0, 0); lit(mini, new T.CylinderGeometry(.12, .09, .26, 4), shine('#fff0c8'), 0, .13, 0).rotation.y = Math.PI / 4;
      litShape(mini, [[-.03, 0], [.03, 0], [.04, .08], [-.04, .08]], shine(C.coral), 0, .1, .095); halo(mini, 0, .14, 0, 1.0, .65); mini.visible = false;
      // the last plank, leaning on the crate; at the end it stands up as the shop's new sign
      post = keep(g, 0, 0, -.5); for (const sx of [-1, 1]) beam(post, [sx * 1.0, 0, 0], [sx * 1.0, 2.05, 0], .03, C.bark, 6); post.visible = false;
      plank = cratePlank(g, 1.09, .42, .45, { len: 1.3, h: .36, rz: -.7 });
      figs = keep(plank, .27, 0, .032); figs.scale.setScalar(1.15);
      // 小策: coat, face, hair and bun
      poly(figs, [[-.06, -.15], [.06, -.15], [.045, -.01], [-.045, -.01]], .006, C.navy, -.12, 0, 0);
      disc(figs, -.12, .04, .004, .05, '#f3cfa6', .006, 14); poly(figs, [[-.052, .045], [-.045, .075], [0, .095], [.045, .075], [.052, .045]], .006, C.ink, -.12, 0, .006); disc(figs, -.12, .108, .004, .02, C.ink, .006, 10);
      // 小智: body, chest light, head, screen, antenna
      card(figs, .12, -.15, 0, .11, .1, C.teal, .006, .02); disc(figs, .12, -.1, .006, .016, C.gold, .004, 10);
      card(figs, .12, -.05, 0, .14, .1, C.teal, .006, .025); card(figs, .12, -.035, .006, .11, .065, C.dark, .004, .02);
      beam(figs, [.12, .05, .003], [.12, .09, .003], .005, C.steel, 4); disc(figs, .12, .095, .004, .014, C.gold, .004, 8);
      // and a heart between them
      for (const sx of [-1, 1]) disc(figs, sx * .014, .07, .004, .016, C.red, .005, 10); poly(figs, [[-.029, .066], [.029, .066], [0, .03]], .005, C.red, 0, 0, .002);
      figs.visible = false;
    }, { s: 1.1 });
    S.curio(slip, { id: 'slip', label: '箱上的單子', tap: () => S.say(slip, '試用一天。天燈升空前不合用，原箱退回。', { who: '箱上的單子', dur: 3.2 }) });
    S.curio(plank, { id: 'plank', label: '木箱板', tap: () => { S.sound('tap'); } });

    // ---- the story
    function nod() {
      if (st.nodded) return; st.nodded = true; draw = false; nodT = 1.2; gran.still(); S.sound('soft');
      S.wait(.55).then(release);
    }
    function release() {
      if (!hold) return; hold = false; look = false; ceReach = false; tug.visible = false; ropeL.visible = ropeR.visible = false;
      S.to(LIFT, { y: 0 }, .4, 'bounce'); S.sound('tap'); zhi.cheer(); ce.cheer(); gran.wave(2.2);
    }
    async function go() {
      if (st.phase !== 'ready') return; S.set({ phase: 'busy' });
      zhi.cheer(); S.sound('whoosh'); S.hide(sheets, .3);
      await S.wait(.2); S.sound('pop'); await S.to(body.scale, { y: 1 }, .55, 'back');          // up it pops from the flat stack
      for (let i = 0; i < 3; i++) { S.show(wishes[i], .18); S.sound('tick'); await S.wait(.15); }
      zhi.still(); await S.wait(.45);
      // the crooked one: it peels it off and puts it back straight by itself (that can be undone)
      const w = wishes[2]; zhi.hop(); S.sound('tap');
      await S.to(w.position, { z: .14 }, .16, 'out'); await S.to(w.rotation, { z: 0 }, .22, 'inOut'); await S.to(w.position, { z: 0 }, .12, 'in'); S.sound('stamp'); S.pop(w, 1.12);
      await S.wait(.35);
      // light it: it glows and fills with hot air
      S.show(flame, .3); lanHalo.visible = true; S.sound('rise'); await S.to(GLOW, { u: 1 }, .8, 'inOut');
      // it wants to go up: 小智 grabs the strings and holds on, off its feet, and looks back at her
      hold = true; ropeL.visible = ropeR.visible = true; tug.visible = true; zhi.still();
      S.to(lanHov.position, { y: HOV }, 1.0, 'out'); S.to(LIFT, { y: .3 }, 1.0, 'out');
      await S.wait(.7); look = true; ceReach = true; ce.still();
      await S.wait(.6);
      S.set({ phase: 'touch' }); padMesh.visible = true; liftProp.drag = liftDrag; S.hint(bob, [0, LH * .5, 0], '送它上天');
    }
    async function touch(byHand) {
      if (st.phase !== 'touch' || st.busy) return; st.busy = true; S.hint(null); S.refresh(); liftProp.drag = null; padMesh.visible = false; back = null;
      if (!st.nodded) { nod(); await S.wait(1.0); }
      if (hold) release();
      // up it goes, into the sea of lanterns
      S.sound('whoosh');
      S.to(lanLift.position, { x: .6, y: 2.0, z: -2.0 }, 3.4, 'inOut'); S.to(lanLift.scale, { x: .55, y: .55, z: .55 }, 3.4, 'inOut');
      S.burst(S.world(bob, [0, .2, 0]), { n: 26, up: 2.6, speed: 1.4, colors: ['#ffd15c', '#fff3d6', '#ee8672', '#f6b9aa'] });
      await S.wait(.6); more.forEach((k, i) => S.wait(i * .1).then(() => S.show(k, .5)));
      await S.wait(1.0); zhi.still(); S.learn(zhi);
      await S.wait(.5); zhi.lamps.forEach((m, i) => S.wait(i * .06).then(() => S.pop(m, 2.3))); zhi.cheer();
      // 小策 tears the slip off the crate, folds it into a little lantern and sends it up too
      await S.wait(.6); ce.still(); await S.walk(ce, { x: .4 }, .6); ceSlip = true;
      await S.wait(.25); S.sound('tick');
      const hand = S.local(slip.parent, S.world(ce.armR, [0, -.36, .06]));
      S.to(slip.rotation, { z: .5 }, .35, 'out'); await S.to(slip.position, { x: hand.x, y: hand.y, z: hand.z }, .35, 'out');
      await S.to(slip.scale, { x: .3, y: .3 }, .2, 'in'); slip.visible = false;
      mini.position.copy(slip.position); S.show(mini, .25); S.sound('pop'); ceSlip = false; ce.cheer();
      const sky = S.local(mini.parent, new T.Vector3(1.55, 2.5, -1.3));
      S.to(mini.position, { x: sky.x, y: sky.y, z: sky.z }, 3.0, 'inOut');
      // the last plank stands up: the tea stall's new sign, the two of them on it
      await S.wait(.9); S.show(post, .4); await S.wait(.3); S.sound('whoosh');
      S.to(plank.rotation, { z: 0 }, .6, 'back'); S.to(plank.scale, { x: 1.3, y: 1.3, z: 1.3 }, .6, 'out'); await S.to(plank.position, { x: 0, y: 1.82, z: -.46 }, .6, 'out');
      S.sound('stamp'); S.show(figs, .45); S.burst(S.world(plank, [0, .2, .1]), { n: 22, up: 2.2, speed: 1.2, colors: ['#ffd15c', '#fff3d6', '#cf5a3e', '#6fd6e0'] });
      gran.cheer(); S.burst(S.world(zhi.root, [0, 1.2, .1]), { n: 18, up: 2.4, speed: 1.2, colors: ['#ffd15c', '#fff3d6', '#f6b9aa'] });
      S.set({ phase: 'done' }); await S.wait(1.0); S.sound('done'); S.done();
    }
    S.act('go', go); S.act('touch', () => touch(false));
    S.on('reset', () => {
      GLOW.u = 0; LIFT.y = 0; hold = look = ceReach = ceSlip = false; draw = true; nodT = 0; back = null; catBusy = ferryBusy = false;
      liftProp.drag = null; bubble.position.y = .27; puff.position.y = 1.05;
    });
    S.on('enter', async () => {
      draw = true;
      await S.wait(.5); S.sound('pop'); zhi.hop(); zhi.wave(1.4);
      await S.wait(.8); ce.hop();
      await S.wait(.4); S.set({ phase: 'ready' });
    });
    S.ui(() => ({
      caption: st.phase === 'done' ? '今天學到：' + DIARY : '',
      buttons: st.phase === 'ready' ? [{ id: 'go', label: '交給我！', primary: true }]
        : st.phase === 'busy' ? [{ id: 'go', label: '交給我！', primary: true, disabled: true }]
          : st.phase === 'touch' ? [{ id: 'touch', label: '放手', primary: true, disabled: st.busy }] : [],
    }));

    const up = new T.Vector3(0, 1, 0);
    const stretch = (k, arm, end) => {
      arm.updateWorldMatrix(true, false); body.updateWorldMatrix(true, false);
      const a = S.local(LP, S.world(arm, [0, -.3, 0])), d = S.local(LP, S.world(body, end)).sub(a), len = d.length();
      k.position.copy(a); k.scale.set(1, Math.max(.01, len), 1); k.quaternion.setFromUnitVectors(up, d.normalize());
    };
    S.tick((t, dt) => {
      // light
      for (const [m, c0, c1] of GL) m.color.copy(c0).lerp(c1, GLOW.u);
      const rise = Math.min(1, Math.max(0, lanLift.position.y / 1.6));
      lanHalo.material.opacity = .62 * GLOW.u; lanPool.material.opacity = .55 * GLOW.u * (1 - rise);
      if (flame.visible) flick.scale.y = 1 + Math.sin(t * 17) * .12 + Math.sin(t * 29) * .06;
      cflick.scale.x = 1 + Math.sin(t * 13) * .08;
      // the far lanterns rise slowly and fade away high up
      for (const s of sea) { const u = (t * s.sp + s.ph) % 1; s.bob.position.y = s.y0 + u * 1.3; s.bob.scale.setScalar(Math.max(.001, Math.pow(Math.sin(Math.PI * u), .35))); s.bob.position.x = Math.sin(t * .7 + s.ph * 6) * .05; }
      // the big lantern tugs while it is held; once gone it drifts
      bob.position.y = hold ? Math.sin(t * 2.3) * .06 : st.phase === 'done' ? Math.sin(t * 1.4) * .08 : 0;
      bob.rotation.z = hold ? Math.sin(t * 1.7) * .03 : 0;
      if (tug.visible) tug.children.forEach((m, i) => { const u = (t * 1.1 + i / 3) % 1; m.position.y = u * .3; m.scale.setScalar(Math.max(.001, Math.sin(Math.PI * u))); });
      if (back) liftProp.set(back.u);
      // 小智 hangs on by the strings, looking back at her
      zhi.root.position.y = LIFT.y + (hold ? Math.sin(t * 2.3) * .06 : 0);
      if (hold) { zhi.armR.rotation.z = 2.75; zhi.armL.rotation.z = -2.75; zhi.inner.rotation.z = Math.sin(t * 1.7) * .05; stretch(ropeL, zhi.armL, [-BW, 0, 0]); stretch(ropeR, zhi.armR, [0, 0, BW]); }
      zhi.root.rotation.y += ((look ? -.5 : 0) - zhi.root.rotation.y) * Math.min(1, dt * 5);   // it turns to her while it waits
      if (look) { zhi.head.rotation.y = -.45; zhi.eyes.position.x = -.04; }
      // 小策's hand stops halfway: this time it is not his to hold
      if (ceReach) { ce.armL.rotation.z = -1.25; ce.head.rotation.y = -.35; }
      if (ceSlip) ce.armR.rotation.z = 1.9;
      // she draws slowly; then she nods
      if (draw) { gran.armR.rotation.z = .8 + Math.sin(t * 3.2) * .1; gran.head.rotation.x = .22; }
      if (nodT > 0) { nodT -= dt; gran.head.rotation.x = .45 * Math.pow(Math.sin((1.2 - nodT) * 5.3), 2); }
      tail.rotation.z = Math.sin(t * 2.4) * .25;
    });
  },
};
