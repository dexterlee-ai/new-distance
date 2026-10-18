// Boot: data → world → interface.  Falls back to a text-only reading experience without WebGL.
import { Engine } from './engine.js';
import { buildWorld } from './world.js';
import { UI } from './ui.js';
import { parseHead } from './d-oracle.js';
import { Sound } from './audio.js';

const getJSON = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(`${u}: ${r.status}`); return r.json(); });
const getBin = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(`${u}: ${r.status}`); return r.arrayBuffer(); });

function webglOK() {
  try { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); } catch { return false; }
}

async function boot() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const params = new URLSearchParams(location.search);
  // ?still: deterministic frames for screenshots (no opening reveal, instant camera moves, settled animation)
  const still = params.has('still');
  if (still) document.documentElement.classList.add('still');
  const gl = webglOK();
  // the text needs only the two data files; the 3D assets are loaded alongside and may fail on their own
  const [W, index, assets] = await Promise.all([
    getJSON('data/world.json'), getJSON('data/index.json'),
    gl ? Promise.all([getBin('data/head.bin'), getJSON('data/head_shards.json')]).catch((e) => { console.warn('3D assets unavailable', e); return null; }) : null,
  ]);
  let engine = null, world = null;
  if (assets) {
    try {
      engine = new Engine(document.getElementById('world'), { reduced: reduced || still });
      if (still) { engine.timeScale = 1; engine.npr.u.uReveal.value = 1; }
      world = buildWorld(engine.scene, { head: { headGeo: parseHead(assets[0]), shards: assets[1] } });
    } catch (e) {
      console.warn('3D unavailable, continuing in text mode', e);
      engine = null; world = null;
    }
  }
  if (!engine) document.documentElement.classList.add('nogl');
  const sound = new Sound();
  const ui = new UI({ W, index, engine, world, reduced, sound, still });
  if (engine) {
    engine.onFrame((t, dt) => {
      world.update(t, dt, { camera: engine.camera, focus: ui.focusId });
      ui.frame(t, dt);
    });
    engine.start();
  }
  // the sound follows the world (the undercurrent drone under the disk) and steps back while a sheet is open;
  // its own loop, because the engine rests while reading.  Silent and nearly free until the reader turns it on.
  const listen = () => { requestAnimationFrame(listen); sound.frame(engine ? engine.npr.u.uNight.value : 0, ui.sheetOpen); };
  listen();
  ui.start();
  if (engine && still) {
    engine.tick(240);
    addEventListener('hashchange', () => setTimeout(() => engine.tick(240), 0));
  }
  // test hooks only on request (?debug) or for screenshots (?still)
  if (still || params.has('debug')) window.__nd = { engine, world, ui, sound };
}
boot().catch((e) => {
  console.error(e);
  document.getElementById('ui').innerHTML = '<p class="noscript">載入失敗，請重新整理頁面。</p>';
});
