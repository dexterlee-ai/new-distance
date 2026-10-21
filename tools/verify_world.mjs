#!/usr/bin/env node
// The pilot verifier (design_system.md §11.2, §12.4 "Measured acceptance").
//
//   node tools/verify_world.mjs [--only core,judge] [--sizes 390x844,430x760,932x430,1440x900] [--base URL] [--out DIR]
//                               [--serve [--serve-port N]] [--no-still] [--no-camera] [--no-autoplay] [--no-captions]
//                               [--no-paint] [--pick N] [--timeout S] [--swiftshader] [--profile DIR] [--keep-profile]
//                               [--override assets/js/d-core.js=path/to/candidate.js]  (serve a candidate module; repeatable)
//   Sizes: WxH, or WxH@DPR.  A side under 600 px means a phone: mobile emulation, touch, DPR 2 unless given.
//
// One headless Chrome (tools/chrome_lite.mjs): a temporary profile with no disk caches and no background downloads,
// deleted when the run ends (also on Ctrl-C or a crash); --profile DIR uses that directory instead (deleted at the end
// only if it was new or empty; --keep-profile keeps it).  Only processes whose command line holds the profile are
// ever stopped.  Talks CDP directly (Node 22, no dependencies).  It uses the real GPU
// (under SwiftShader, ?still's tick(240) holds the first frame for about 50 s per load); --swiftshader if there is none.
// The app is read from --base (default the shared server http://127.0.0.1:5180/).  When that server does not answer
// (at the start, or it goes away during the run) the tool serves world/ itself on a free port of 127.0.0.1 (never
// 5180) and says so; --serve does that from the start.  Every load starts as a first visit (local and session
// storage of the origin cleared).
//
// For every district that is told in beats (world.json has beats AND the module exports beats; others are skipped
// with a note), at every size, a fresh load of each state:
//   • each beat ?still#/d/<id>/<n>, the end ?still#/d/<id>/end, on phones the end with the reading layer open
//     (end-reading), and each lever state through the interface (options lever: every option at its beats ≥ fromBeat
//     and at the end; pick lever: a card picked with the shortlist showing, then stamped at beats ≥ fromBeat and end).
//   • checks per state (fail):
//       actor     the module's mainActor ≥ 60 px tall (the 8 corners of its hit proxy's world box, projected)
//       parts     every emphasised part (story's emphasize ids: beats[i].parts, restParts at the end) ≥ 40 px (larger
//                 side of its hit-proxy box) and showing in ui.freeRect() (wholly inside, or its anchor inside with
//                 ≥ 40 px of it inside; a road or heap that runs past the frame is the warning partsClipped)
//       partsMeasurable  an emphasised part with no hit proxy can only be sized through parts[id].object / box()
//       overlap   no visible #ov .ov node over #strip, over the top bar's controls, or over another overlay node
//       caption   #st-cap on one line in the phone strip (scrollWidth ≤ clientWidth); ≤ 2 lines in a panel/column
//       nodes ≤ 12 · labels ≤ 3 · decals ≤ 6 · leaders ≤ 48 px phone / 72 px desktop
//       text      no visible text under 12 px in #ov and #strip
//       targets   every visible button / link in #ov and #strip ≥ 44×44 CSS px (::before/::after hit areas count)
//       world     phones: the free rect ≥ 72% of the visible height; sheet (end-reading): the half sheet ≤ 55% of the
//                 height (portrait), the reading column ≤ 40% of the width (landscape)
//       errors    no page exceptions
//     warnings: actorBody / partsBody (the geometry itself, without the proxy's pad), actorOnScreen, partsClipped,
//     dimming (other parts dimmed with uDim, castShadow off), latin (English words in the scene), layout (a phone in
//     landscape without the 38% right-hand column), topGradient (a node over the top bar's gradient), segTargets
//     (beat segments 40–44 px wide, §5.6), captionText (the caption at k = 1 is not the beat's own).
//     framework (fail): the book's English framework words (Model, People, Prologue …) in the scene.
//   • module contract (once per district, on ?still#/map): part ids of the copy (labels, decals, taps) against labelAt /
//     decalAt / parts, beats.parts / restParts / mainActor / lever.parts against parts, hit proxies, shots, timing,
//     lever shape; pose() pure and deterministic (jumping from rest() = playing from beat 0 = with another Math.random
//     and clock; only what is drawn counts), rest() = pose(last, 1, def), update() moves no transform; the copy
//     budgets (captions ≤ 30 字, title ≤ 20 字, ≤ 3 labels per beat).
//   • camera contract on ?debug#/d/<id>/end and on ?debug#/d/<id> (autoplay, paused by the reader after the arrival):
//     after the arrival flight, interface actions by real taps/clicks (reading layer open and close, a reader round
//     trip, a hotspot, Esc, fold and unfold the desktop panel, the caption) must add no 'flight' / 'ease' / 'set' to
//     engine.moveLog and leave getPose() unchanged (the projection offset may change).  Phones also turn to landscape
//     and back (§11.2 "rotate"): that may rebase the pose (§5.2 retarget) but must not fly.
//   • reduced motion: with prefers-reduced-motion, the story waits on beat 1 and 下一步 steps through to the end.
//   • captions at 375 × 812 (§12.4): every beat's caption, the end title and every lever caption within two lines.
//   • first paint (§12.4, §12.3 item 4): a cold load of the opening at the first phone and the desktop size: first
//     contentful paint and largest contentful paint ≤ 1 s from the local server, and (information) the same on a
//     simulated 4G phone with a 4× slower CPU; plus the time to the app's boot and its first WebGL frame.
// Output: <out>/report.json, <out>/<id>/<size>/<state>.jpg, and a contact sheet <out>/contact-<id>.png (+ .html) per
// district with the measured boxes drawn over every screenshot.
// Exit code 0 = every check passed (warnings allowed), 1 = a check failed, 2 = the tool could not run.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { LITE_FLAGS, makeProfile, adoptProfile, isOurs, removeProfile } from './chrome_lite.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRATCH = 'C:/Users/Dexter/AppData/Local/Temp/claude/C--Users-Dexter-iCloudDrive-AI3-Solution-Center-interactive-reading/a28eafd0-f97d-432e-b08b-4d06833b471d/scratchpad/design/pilot/verifier';
const CHROME_CANDIDATES = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

// ---------------------------------------------------------------------------------------------- arguments
function parseArgs(argv) {
  const o = {
    only: null, sizes: '390x844,430x760,932x430,1440x900', base: 'http://127.0.0.1:5180/',
    out: path.join(SCRATCH, 'out'), profile: null, keepProfile: false,
    still: true, camera: true, autoplay: true, captions: true, paint: true, swiftshader: false, pick: 0, timeout: 90,
    verbose: false, overrides: [], serve: false, servePort: 0, baseGiven: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => { const v = argv[++i]; if (v === undefined) throw new Error(`${a} needs a value`); return v; };
    if (a === '--only') o.only = val().split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--sizes') o.sizes = val();
    else if (a === '--base') { o.base = val().replace(/\/?$/, '/'); o.baseGiven = true; }
    else if (a === '--serve') o.serve = true;
    else if (a === '--serve-port') { o.serve = true; o.servePort = parseInt(val(), 10) || 0; if (o.servePort === 5180) throw new Error('--serve-port 5180 is the shared server\'s port; pick another (or 0 for a free one)'); }
    else if (a === '--out') o.out = path.resolve(val());
    else if (a === '--profile') o.profile = path.resolve(val());
    else if (a === '--keep-profile') o.keepProfile = true;
    else if (a === '--no-still') o.still = false;
    else if (a === '--no-camera') o.camera = false;
    else if (a === '--autoplay') o.autoplay = true;
    else if (a === '--no-autoplay') o.autoplay = false;
    else if (a === '--no-captions') o.captions = false;
    else if (a === '--no-paint') o.paint = false;
    else if (a === '--swiftshader') o.swiftshader = true;
    else if (a === '--gpu') o.swiftshader = false;
    else if (a === '--override') {
      const [k, ...f] = val().split('=');
      const file = path.resolve(f.join('='));
      if (!k || !fs.existsSync(file)) throw new Error(`--override needs path=file (an existing file): ${k}=${file}`);
      o.overrides.push({ path: '/' + k.replace(/^\/+/, ''), file });
    }
    else if (a === '--pick') o.pick = Math.max(0, parseInt(val(), 10) || 0);
    else if (a === '--timeout') o.timeout = Math.max(10, +val() || 90);
    else if (a === '--verbose' || a === '-v') o.verbose = true;
    else if (a === '--help' || a === '-h') { o.help = true; }
    else throw new Error(`unknown argument ${a}`);
  }
  o.sizeList = o.sizes.split(',').map((s) => s.trim()).filter(Boolean).map(parseSize);
  return o;
}

function parseSize(s) {
  const m = /^(\d+)x(\d+)(?:@(\d+(?:\.\d+)?))?$/.exec(s);
  if (!m) throw new Error(`bad size ${s} (use WxH or WxH@DPR)`);
  const w = +m[1], h = +m[2];
  const mobile = Math.min(w, h) < 600;            // phones (portrait or landscape) get mobile emulation
  return { label: `${w}x${h}`, w, h, mobile, dpr: m[3] ? +m[3] : mobile ? 2 : 1 };
}

// ---------------------------------------------------------------------------------------------- processes
const norm = (p) => p.replace(/\\/g, '/').toLowerCase();

/** chrome processes whose command line holds our profile path (never anything else) */
function ownChromePids(profile) {
  if (process.platform !== 'win32') {
    try {
      const out = execFileSync('ps', ['-eo', 'pid=,args='], { encoding: 'utf8' });
      return out.split('\n').filter((l) => norm(l).includes(norm(profile))).map((l) => +l.trim().split(/\s+/)[0]).filter(Boolean);
    } catch { return []; }
  }
  const marker = norm(profile);
  const ps = `Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | ForEach-Object { "$($_.ProcessId)\`t$($_.CommandLine)" }`;
  try {
    const out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8', windowsHide: true, maxBuffer: 64 << 20 });
    return out.split(/\r?\n/).map((l) => l.split('\t')).filter(([pid, cmd]) => pid && cmd && norm(cmd).includes(marker)).map(([pid]) => +pid);
  } catch { return []; }
}

function killOwnChrome(profile) {
  const pids = ownChromePids(profile);
  for (const pid of pids) {
    try {
      if (process.platform === 'win32') execFileSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
      else process.kill(pid, 'SIGKILL');
    } catch { /* already gone */ }
  }
  return pids.length;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------------------------- the app server
// The shared server on 5180 is someone else's process: the tool never starts or stops anything on that port.  When it
// does not answer, the tool serves world/ itself (the same files and headers as tools/serve_world.py: no-store) on a
// free port of 127.0.0.1, inside this process, and closes it at the end.
const WORLD_DIR = path.resolve(HERE, '..', 'world');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.bin': 'application/octet-stream',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.wasm': 'application/wasm', '.map': 'application/json',
};

function startServer(root, port = 0) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer(async (req, res) => {
      try {
        const u = new URL(req.url, 'http://127.0.0.1');
        let file = path.resolve(root, '.' + decodeURIComponent(u.pathname));
        if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
        let st = await fs.promises.stat(file).catch(() => null);
        if (st?.isDirectory()) { file = path.join(file, 'index.html'); st = await fs.promises.stat(file).catch(() => null); }
        if (!st?.isFile()) { res.writeHead(404, { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain' }); res.end('not found'); return; }
        const body = await fs.promises.readFile(file);
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': body.length, 'Cache-Control': 'no-store' });
        res.end(req.method === 'HEAD' ? undefined : body);
      } catch (e) { try { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end(String(e.message || e)); } catch { /* gone */ } }
    });
    srv.on('error', reject);
    srv.listen(port, '127.0.0.1', () => {
      const close = () => new Promise((r) => { try { srv.closeAllConnections?.(); } catch { /* */ } srv.close(() => r()); setTimeout(r, 1500); });
      resolve({ url: `http://127.0.0.1:${srv.address().port}/`, port: srv.address().port, root, close });
    });
  });
}

// The scenes are rebuilt while the tool runs: every state records which version of the files it was measured on
// (a short hash of the district modules, the interface and the data, read from world/ on disk).
const WATCH = ['assets/js/ui.js', 'assets/js/story.js', 'assets/js/strip.js', 'assets/js/overlay.js', 'assets/js/pick.js', 'assets/js/engine.js',
  'assets/js/world.js', 'assets/js/people.js', 'assets/js/props.js', 'assets/js/mat.js', 'assets/js/npr.js', 'assets/css/world.css', 'data/world.json'];
const Sources = {
  list: [], cur: -1, files: [],
  stamp() {
    const h = {};
    for (const f of this.files) {
      try { const b = fs.readFileSync(path.join(WORLD_DIR, f)); let x = 0x811c9dc5; for (let i = 0; i < b.length; i++) x = Math.imul(x ^ b[i], 16777619) >>> 0; h[f] = x.toString(16).padStart(8, '0'); } catch { h[f] = 'missing'; }
    }
    const last = this.list[this.cur];
    if (last && this.files.every((f) => last.hash[f] === h[f])) return this.cur;
    const changed = last ? this.files.filter((f) => last.hash[f] !== h[f]) : [];
    this.list.push({ v: this.list.length + 1, at: new Date().toISOString(), local: new Date().toLocaleTimeString('en-GB'), hash: h, changed });
    this.cur = this.list.length - 1;
    if (last) log(`  note: changed on disk during the run: ${changed.join(', ')} (states from here on are measured on version ${this.cur + 1})`);
    return this.cur;
  },
};

async function reachable(base) {
  try { const r = await fetch(base, { signal: AbortSignal.timeout(4000), cache: 'no-store' }); return r.ok; } catch { return false; }
}

// ---------------------------------------------------------------------------------------------- CDP
class CDP {
  constructor(url) { this.url = url; this.id = 0; this.pending = new Map(); this.handlers = []; }
  async open() {
    this.ws = new WebSocket(this.url);
    await new Promise((res, rej) => { this.ws.addEventListener('open', res, { once: true }); this.ws.addEventListener('error', rej, { once: true }); });
    this.ws.addEventListener('message', (m) => {
      const msg = JSON.parse(m.data);
      if (msg.id && this.pending.has(msg.id)) { const p = this.pending.get(msg.id); this.pending.delete(msg.id); msg.error ? p.rej(new Error(`${p.method}: ${msg.error.message}`)) : p.res(msg.result); }
      else if (msg.method) for (const h of this.handlers) h(msg);
    });
    this.ws.addEventListener('close', () => { for (const p of this.pending.values()) p.rej(new Error('CDP connection closed')); this.pending.clear(); });
  }
  send(method, params = {}, sessionId) {
    return new Promise((res, rej) => {
      const id = ++this.id;
      this.pending.set(id, { res, rej, method });
      this.ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
    });
  }
  on(fn) { this.handlers.push(fn); }
  close() { try { this.ws.close(); } catch { /* */ } }
}

async function launchChrome(o) {
  const chrome = CHROME_CANDIDATES.find((p) => { try { return fs.statSync(p).isFile(); } catch { return false; } });
  if (!chrome) throw new Error('Chrome not found (set CHROME=…)');
  // a temporary profile (or the caller's, adopted when new or empty): removed at the end unless --keep-profile
  o.profile = o.profile ? adoptProfile(o.profile) : makeProfile('verify');
  const removable = !o.keepProfile && isOurs(o.profile);
  const stale = killOwnChrome(o.profile);
  if (stale) await sleep(800);
  const portFile = path.join(o.profile, 'DevToolsActivePort');
  try { fs.rmSync(portFile); } catch { /* none */ }
  // the real GPU by default: under SwiftShader the first frame after ?still's tick(240) takes about 50 s and the
  // clock runs at a fifth of real time; --swiftshader for a machine without a usable GPU
  const gl = o.swiftshader ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    : ['--enable-gpu', '--ignore-gpu-blocklist', ...(process.platform === 'win32' ? ['--use-angle=d3d11'] : [])];
  const args = ['--headless=new', '--disable-gpu-sandbox', ...gl, '--hide-scrollbars', '--mute-audio',
    `--user-data-dir=${o.profile}`, '--remote-debugging-port=0', '--window-size=1440,900',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--allow-file-access-from-files',
    // no background downloads into the profile (an on-device model alone took ~300 MB)
    '--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-pings', '--disable-domain-reliability',
    '--disable-features=OptimizationGuideModelDownloading,OptimizationHintsFetching,OptimizationTargetPrediction,OnDeviceModelService,Translate,MediaRouter',
    ...LITE_FLAGS, 'about:blank'].filter((f, i, all) => all.indexOf(f) === i);
  const proc = spawn(chrome, args, { stdio: 'ignore', windowsHide: true });
  if (removable) process.once('exit', () => { if (fs.existsSync(o.profile)) { killOwnChrome(o.profile); removeProfile(o.profile); } });
  let ws = null;
  for (let i = 0; i < 120 && !ws; i++) {
    await sleep(250);
    try {
      const [port, p] = fs.readFileSync(portFile, 'utf8').split(/\r?\n/);
      if (port && p) ws = `ws://127.0.0.1:${port}${p}`;
    } catch { /* not yet */ }
  }
  if (!ws) { killOwnChrome(o.profile); if (removable) removeProfile(o.profile); throw new Error('Chrome did not open its DevTools port'); }
  const cdp = new CDP(ws);
  await cdp.open();
  const version = await cdp.send('Browser.getVersion');
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const page = new Page(cdp, sessionId, o);
  await page.init();
  const close = async () => {
    try { await cdp.send('Browser.close'); } catch { /* */ }
    cdp.close();
    await sleep(600);
    killOwnChrome(o.profile);
    try { proc.kill(); } catch { /* */ }
    await sleep(300);
    if (removable) { removeProfile(o.profile); return; }
    // a kept profile stays small between runs: caches and background downloads only (never anything outside it)
    for (const d of ['Default/Cache', 'Default/Code Cache', 'Default/Download Service', 'Default/GPUCache', 'Default/DawnGraphiteCache', 'Default/DawnWebGPUCache', 'GrShaderCache', 'ShaderCache', 'GraphiteDawnCache', 'WasmTtsEngine', 'Safe Browsing', 'OnDeviceHeadSuggestModel', 'optimization_guide_model_store']) {
      try { fs.rmSync(path.join(o.profile, d), { recursive: true, force: true }); } catch { /* in use or gone */ }
    }
  };
  return { cdp, page, version, close };
}

class Page {
  constructor(cdp, sessionId, o) {
    this.cdp = cdp; this.sid = sessionId; this.o = o; this.events = [];
    this.served = {};
    cdp.on((m) => {
      if (m.sessionId !== sessionId) return;
      if (m.method === 'Fetch.requestPaused') { this._paused(m.params); return; }
      this.events.push(m);
    });
  }
  /** --override: answer exact module paths (no query) with a local file; everything else goes through */
  async _paused(p) {
    try {
      const u = new URL(p.request.url);
      const ov = this.o.overrides.find((x) => x.path === u.pathname && !u.search);
      if (!ov) { await this.send('Fetch.continueRequest', { requestId: p.requestId }); return; }
      const body = fs.readFileSync(ov.file);
      this.served[ov.path] = (this.served[ov.path] || 0) + 1;
      await this.send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, body: body.toString('base64'),
        responseHeaders: [{ name: 'Content-Type', value: 'text/javascript; charset=utf-8' }, { name: 'Cache-Control', value: 'no-store' }] });
    } catch { try { await this.send('Fetch.continueRequest', { requestId: p.requestId }); } catch { /* */ } }
  }
  send(m, p) { return this.cdp.send(m, p, this.sid); }
  async init() {
    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('Log.enable');
    await this.send('Network.enable');
    await this.send('Network.clearBrowserCache');
    // the app remembers the reader (motion, sound, read marks, hints): start every run as a first visit
    try { await this.send('Storage.clearDataForOrigin', { origin: new URL(this.o.base).origin, storageTypes: 'local_storage,session_storage' }); } catch { /* */ }
    if (this.o.overrides.length) await this.send('Fetch.enable', { patterns: this.o.overrides.map((x) => ({ urlPattern: `*${x.path}*`, requestStage: 'Request' })) });
  }
  /** evaluate an expression (awaits promises, returns by value); throws on a page exception */
  async ev(expr, { timeout = 60000 } = {}) {
    const r = await Promise.race([
      this.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, userGesture: true }),
      sleep(timeout).then(() => { throw new Error(`evaluate timed out: ${expr.slice(0, 80)}`); }),
    ]);
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result?.value;
  }
  /** call an in-page function with JSON arguments */
  call(fn, ...args) { return this.ev(`(${fn.toString()})(...${JSON.stringify(args)})`); }
  async waitFor(expr, { timeout = 30000, every = 200 } = {}) {
    const t0 = Date.now();
    let last;
    while (Date.now() - t0 < timeout) {
      try { last = await this.ev(`(() => { try { return !!(${expr}); } catch { return false; } })()`, { timeout: 15000 }); } catch { last = false; }
      if (last) return true;
      await sleep(every);
    }
    return false;
  }
  async emulate(size) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width: size.w, height: size.h, deviceScaleFactor: size.dpr, mobile: size.mobile,
      screenWidth: size.w, screenHeight: size.h, screenOrientation: size.w > size.h ? { type: 'landscapePrimary', angle: 90 } : { type: 'portraitPrimary', angle: 0 },
    });
    await this.send('Emulation.setTouchEmulationEnabled', { enabled: size.mobile, maxTouchPoints: size.mobile ? 5 : 1 });
    this.size = size;
  }
  async goto(url, { fresh = true } = {}) {
    this.events.length = 0;
    await this.send('Page.navigate', { url: 'about:blank' });
    await this.waitFor(`location.href === 'about:blank'`, { timeout: 10000, every: 50 });
    // the app remembers the reader (visited districts, hints, motion, sound): every state starts as a first visit
    if (fresh && /^https?:/.test(url)) { try { await this.send('Storage.clearDataForOrigin', { origin: new URL(url).origin, storageTypes: 'local_storage,session_storage' }); } catch { /* */ } }
    this.events.length = 0;
    await this.send('Page.navigate', { url });
  }
  errors() {
    const out = [];
    for (const e of this.events) {
      if (e.method === 'Runtime.exceptionThrown') out.push('exception: ' + (e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text || '').split('\n').slice(0, 2).join(' | '));
      else if (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') out.push('console.error: ' + e.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 300));
      else if (e.method === 'Log.entryAdded' && e.params.entry.level === 'error') out.push('log: ' + `${e.params.entry.text} ${e.params.entry.url || ''}`.slice(0, 300));
    }
    return out;
  }
  async shot(file, clip) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const fmt = /\.jpe?g$/i.test(file) ? { format: 'jpeg', quality: 82 } : { format: 'png' };
    const r = await this.send('Page.captureScreenshot', clip ? { ...fmt, clip: { ...clip, scale: 1 }, captureBeyondViewport: true } : fmt);
    fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
  }
  async tap(x, y) {
    if (this.size?.mobile) {
      await this.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1, radiusX: 2, radiusY: 2, force: 1 }] });
      await sleep(40);
      await this.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
      await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
      await sleep(30);
      await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
    }
  }
  async key(key, code, vk) {
    await this.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  }
}

// ---------------------------------------------------------------------------------------------- in-page code
// Everything below in this section runs inside the page (serialised with toString); it may use only browser APIs
// and window.__nd.

/** wait for n animation frames (and a minimum time) */
function pageFrames(n, minMs) {
  return new Promise((res) => {
    const t0 = performance.now();
    let k = 0;
    const f = () => { if (++k >= n && performance.now() - t0 >= (minMs || 0)) res(k); else requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
}

/** what the app exposes about every district: data (world.json) and module side */
function pageDiscover() {
  const nd = window.__nd, ui = nd.ui, world = nd.world;
  const out = { gl: null, programs: nd.engine?.renderer?.info?.programs?.length ?? null, districts: [] };
  try {
    const gl = nd.engine.renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    out.gl = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  } catch { /* */ }
  for (const d of ui.W.districts) {
    const m = world.D[d.id];
    out.districts.push({
      id: d.id, pill: d.pill || d.name, dataBeats: Array.isArray(d.beats) ? d.beats.length : 0,
      modBeats: m && Array.isArray(m.beats) ? m.beats.length : 0,
      dataLever: d.lever ? { kind: d.lever.kind || 'options', fromBeat: d.lever.fromBeat, def: d.lever.def ?? null, options: (d.lever.options || []).map((x) => x.k), pick: d.lever.pick ?? null } : null,
      modLever: m?.lever ? { kind: m.lever.kind || 'options', fromBeat: m.lever.fromBeat, def: m.lever.def ?? null, options: m.lever.options || [], parts: m.lever.parts || [] } : null,
      mainActor: m?.mainActor ?? null,
      restParts: m?.restParts ?? null,
      parts: m?.parts ? Object.keys(m.parts) : [],
      beats: m?.beats ? m.beats.map((b) => ({ dur: b.dur, keyAt: b.keyAt, shot: b.shot, parts: b.parts || null })) : [],
      shots: m?.shots ? { phone: (m.shots.phone || []).length, desk: (m.shots.desk || []).length } : null,
      caps: (d.beats || []).map((b) => b.cap),
      title: d.title || '',
    });
  }
  return out;
}

/** the module contract, checked on the map page (the page is thrown away afterwards) */
async function pageContract(id) {
  const nd = window.__nd, ui = nd.ui, world = nd.world, E = nd.engine;
  const T = world.THREE;
  const mod = world.D[id], copy = ui.D[id];
  const R = [];   // { name, pass, level, detail }
  const add = (name, pass, detail, level = 'fail') => R.push({ name, pass: !!pass, level, detail });
  const parts = mod.parts || {};
  const pids = Object.keys(parts);
  const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
  // ids: the copy against the module
  const miss = (list, where) => [...new Set(list)].filter((p) => !has(where, p));
  add('labels→labelAt', !miss((copy.labels || []).map((l) => l.part), mod.labelAt).length, { missing: miss((copy.labels || []).map((l) => l.part), mod.labelAt) });
  add('decals→decalAt', !miss((copy.decals || []).map((l) => l.part), mod.decalAt).length, { missing: miss((copy.decals || []).map((l) => l.part), mod.decalAt) });
  add('taps→parts', !miss((copy.taps || []).map((l) => l.part), parts).length, { missing: miss((copy.taps || []).map((l) => l.part), parts) });
  const beatParts = (mod.beats || []).flatMap((b) => b.parts || []);
  add('beats.parts→parts', !miss(beatParts, parts).length, { missing: miss(beatParts, parts) });
  add('restParts→parts', !miss(mod.restParts || [], parts).length, { missing: miss(mod.restParts || [], parts), restParts: mod.restParts ?? null });
  add('mainActor', !!mod.mainActor && has(parts, mod.mainActor), { mainActor: mod.mainActor ?? null });
  add('beats count = copy', (mod.beats || []).length === (copy.beats || []).length, { module: (mod.beats || []).length, copy: (copy.beats || []).length });
  // the copy budgets the reader meets (§6.1, §12.4); counting rule: every character except spaces
  const len = (t) => String(t || '').replace(/\s/g, '').length;
  const caps = [...(copy.beats || []).map((b, i) => ({ where: `beat ${i + 1}`, text: b.cap })), ...((copy.lever?.options) || []).filter((x) => x.cap).map((x) => ({ where: `lever ${x.k}`, text: x.cap })), ...(copy.lever?.cap ? [{ where: 'lever', text: copy.lever.cap }] : [])];
  const longCaps = caps.filter((c) => len(c.text) > 30).map((c) => ({ ...c, n: len(c.text) }));
  add('captions ≤ 30 字', !longCaps.length, { long: longCaps, longest: Math.max(0, ...caps.map((c) => len(c.text))) });
  add('title ≤ 20 字', len(copy.title) <= 20, { title: copy.title, n: len(copy.title) });
  const perBeat = {};
  for (const l of copy.labels || []) perBeat[l.beat] = (perBeat[l.beat] || 0) + 1;
  add('labels ≤ 3 per beat', Object.values(perBeat).every((k) => k <= 3), { perBeat });
  // timing: dur, keyAt, the caption's hold (0.8 s + 0.2 s per character) and the whole district (≤ 40 s or so)
  const hold = (t) => 0.8 + 0.2 * String(t || '').replace(/\s/g, '').length;
  const lens = (mod.beats || []).map((b, i) => Math.max(b.dur || 0, (b.keyAt ?? (b.dur || 0) * 0.4) + hold(copy.beats?.[i]?.cap)));
  const total = lens.reduce((a, b) => a + b, 0);
  add('beat timing', (mod.beats || []).every((b) => b.dur > 0 && (b.keyAt === undefined || (b.keyAt >= 0 && b.keyAt <= b.dur))), { beats: (mod.beats || []).map((b, i) => ({ dur: b.dur, keyAt: b.keyAt, lasts: +lens[i].toFixed(2) })), total: +total.toFixed(2) });
  add('district ≤ 40 s', total <= 40.5, { total: +total.toFixed(2) }, 'warn');
  // shots
  const sh = mod.shots || {};
  const shotOk = (list, cover) => Array.isArray(list) && list.length && (!cover || (mod.beats || []).every((b) => (b.shot ?? 0) < list.length)) && list.every((s) => typeof s.az === 'number' && typeof s.el === 'number' && typeof s.anchors === 'function' && s.anchors().length >= 2 && s.anchors().every((v) => v && v.isVector3 && Number.isFinite(v.x + v.y + v.z)));
  const maxShot = Math.max(0, ...(mod.beats || []).map((b) => b.shot ?? 0));
  add('shots.phone', shotOk(sh.phone, true), { n: sh.phone?.length ?? 0, maxBeatShot: maxShot });
  // the design wants one or two desktop shots; ui.js clamps beats[i].shot to the desk list, so it may be shorter
  add('shots.desk', shotOk(sh.desk, false), { n: sh.desk?.length ?? 0, maxBeatShot: maxShot, clamped: (sh.desk?.length ?? 0) <= maxShot });
  // hit proxies: children of the group, raycastable, not drawn
  const isIn = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };
  const noHit = pids.filter((p) => !parts[p].hit);
  const badHit = pids.filter((p) => { const h = parts[p].hit; return h && (!h.isMesh || !isIn(h, mod.group) || h.visible === false || (h.material && h.material.visible !== false && h.material.opacity !== 0)); });
  add('parts.hit proxies', !badHit.length, { bad: badHit });
  // CONTRACTS §4 gives every part a hit proxy; a part without one does not answer a tap and cannot be measured
  // (unless it offers parts[id].object or parts[id].box())
  add('parts without a hit proxy', !noHit.length, { parts: noHit, measurable: noHit.filter((p) => parts[p].object?.isObject3D || typeof parts[p].box === 'function') }, 'warn');
  const badAnchor = pids.filter((p) => { try { const v = parts[p].anchor?.(); return !(v && v.isVector3 && Number.isFinite(v.x + v.y + v.z)); } catch { return true; } });
  add('parts.anchor()', !badAnchor.length, { bad: badAnchor });
  // levers
  const dl = copy.lever, ml = mod.lever;
  if (dl || ml) {
    const kindD = dl ? dl.kind || 'options' : null, kindM = ml ? ml.kind || 'options' : null;
    const det = { copy: dl ? { kind: kindD, fromBeat: dl.fromBeat, def: dl.def ?? null, options: (dl.options || []).map((x) => x.k) } : null, module: ml ? { kind: kindM, fromBeat: ml.fromBeat, def: ml.def ?? null, options: ml.options, parts: ml.parts } : null };
    let ok = !!dl && !!ml && kindD === kindM && dl.fromBeat === ml.fromBeat;
    if (ok && kindM === 'options') ok = JSON.stringify((dl.options || []).map((x) => x.k)) === JSON.stringify(ml.options || []) && (ml.options || []).includes(ml.def);
    if (ok && kindM === 'pick') ok = Array.isArray(ml.parts) && ml.parts.length === (dl.pick ?? ml.parts.length) && !miss(ml.parts, parts).length;
    add('lever', ok, det);
  }
  // ---- purity: a hash of every explanatory transform and material value under the group
  const M = await import(new URL('assets/js/mat.js', location.href).href);
  const skipU = new Set([M.T, M.CLOCK].filter(Boolean));
  const H = { h: 0x811c9dc5, n: 0 };
  const feed = (v) => { const q = Math.round((+v || 0) * 1e4) | 0; H.h = Math.imul(H.h ^ q, 16777619) >>> 0; H.n++; };
  const feedArr = (a, n = a ? a.length : 0) => { if (!a) return; for (let i = 0; i < Math.min(n, a.length); i++) feed(a[i]); };
  // only the drawn instances count (slots past mesh.count may hold anything)
  const feedInst = (o) => {
    // an instance collapsed to (near) zero scale is not drawn: only that fact counts, not where it was left
    feed(o.count);
    const im = o.instanceMatrix.array;
    for (let i = 0; i < o.count; i++) {
      const e = i * 16;
      const sc = Math.max(Math.hypot(im[e], im[e + 1], im[e + 2]), Math.hypot(im[e + 4], im[e + 5], im[e + 6]), Math.hypot(im[e + 8], im[e + 9], im[e + 10]));
      if (sc < 2e-3) { feed(-9); continue; }
      for (let j = 0; j < 16; j++) feed(im[e + j]);
    }
    if (o.instanceColor) feedArr(o.instanceColor.array, o.count * 3);
    if (o.geometry && o.geometry.attributes) for (const [k, a] of Object.entries(o.geometry.attributes)) if (a.isInstancedBufferAttribute) feedArr(a.array, o.count * a.itemSize);
  };
  // walk the group with the drawn state: an object hidden by itself or an ancestor contributes only that fact
  const walkDrawn = (fn) => { const rec = (o, vis) => { const v = vis && o.visible; if (!o.userData?.hitProxy) fn(o, v); for (const c of o.children) rec(c, v); }; rec(mod.group, true); };
  const pathOf = (o) => { const n = []; for (let q = o; q && q !== mod.group && n.length < 3; q = q.parent) n.unshift(q.name || q.type); return n.join('/'); };
  const hashGroup = ({ mats = true } = {}) => {
    H.h = 0x811c9dc5; H.n = 0;
    mod.group.updateMatrixWorld(true);
    walkDrawn((o, drawn) => {
      feed(drawn ? 1 : 0);
      if (!drawn) return;
      feedArr(o.matrixWorld.elements);
      if (o.isInstancedMesh) feedInst(o);
      if (mats && o.material) for (const m of [].concat(o.material)) {
        if (!m) continue;
        feed(m.visible ? 1 : 0); feed(m.opacity ?? 1);
        const u = m.userData?.u;
        if (u) for (const k of Object.keys(u).sort()) {
          const un = u[k];
          if (!un || skipU.has(un)) continue;
          const v = un.value;
          if (typeof v === 'number') feed(v);
          else if (v && typeof v.toArray === 'function' && !v.isTexture) feedArr(v.toArray());
        }
      }
    });
    return `${H.h.toString(16)}:${H.n}`;
  };
  // per-object values, to name what differs when two hashes do not match
  const snapObjects = () => {
    const out = new Map();
    mod.group.updateMatrixWorld(true);
    let i = 0;
    walkDrawn((o, drawn) => {
      const key = `${i++}:${pathOf(o)}${o.isInstancedMesh ? `[${o.count}]` : ''}`;
      if (!drawn) { out.set(key, { tf: 'hidden', inst: 0, mat: 0, un: '' }); return; }
      const save = { h: H.h, n: H.n };
      H.h = 0x811c9dc5; H.n = 0;
      feed(1); feedArr(o.matrixWorld.elements);
      const tf = H.h;
      H.h = 0x811c9dc5;
      if (o.isInstancedMesh) feedInst(o);
      const inst = H.h;
      H.h = 0x811c9dc5;
      const un = [];
      if (o.material) for (const m of [].concat(o.material)) { if (!m) continue; feed(m.visible ? 1 : 0); feed(m.opacity ?? 1); const u = m.userData?.u; if (u) for (const k of Object.keys(u).sort()) { const x = u[k]; if (!x || skipU.has(x)) continue; if (typeof x.value === 'number') { feed(x.value); un.push(k + '=' + Math.round(x.value * 1e3) / 1e3); } else if (x.value && typeof x.value.toArray === 'function' && !x.value.isTexture) feedArr(x.value.toArray()); } }
      out.set(key, { tf, inst, mat: H.h, un: un.join(' ') });
      H.h = save.h; H.n = save.n;
    });
    return out;
  };
  const diffObjects = (a, b) => {
    const d = [];
    for (const [k, va] of a) {
      const vb = b.get(k);
      if (!vb) { d.push(`${k} (missing)`); continue; }
      const what = [va.tf !== vb.tf && 'transform', va.inst !== vb.inst && 'instances', va.mat !== vb.mat && `material (${va.un} | ${vb.un})`].filter(Boolean);
      if (what.length) d.push(`${k}: ${what.join(', ')}`);
    }
    return d;
  };
  const n = (mod.beats || []).length;
  const levers = [];
  if (ml) {
    if ((ml.kind || 'options') === 'pick') levers.push(ml.def ?? null, { card: 0, stamped: false }, { card: 0, stamped: true });
    else levers.push(...(ml.options || []));
  } else levers.push(undefined);
  const defL = ml ? ml.def ?? null : undefined;
  const fails = [];
  const ks = [0, 0.37, 1];
  let checked = 0;
  try {
    for (const L of levers) {
      for (let b = 0; b < n; b++) {
        if (ml && L !== defL && b < (ml.fromBeat ?? 0)) continue;
        for (const k of ks) {
          // (1) jump there from the held end state
          mod.rest();
          mod.pose(b, k, L);
          const jump = hashGroup();
          const SJ = fails.length < 3 ? snapObjects() : null;
          // (2) play there: every beat from the start in small steps
          for (let i = 0; i <= b; i++) for (let s = 0; s <= 4; s++) { const kk = s / 4; if (i === b && kk > k) break; mod.pose(i, kk, L); }
          mod.pose(b, k, L);
          const play = hashGroup();
          const SP = SJ ? snapObjects() : null;
          // (3) the same pose with another random stream and another clock
          const rnd = Math.random, pn = performance.now, dn = Date.now;
          const tv = M.T?.value, cv = M.CLOCK?.value;
          let seed = 12345;
          Math.random = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
          performance.now = () => pn.call(performance) + 777777; Date.now = () => dn() + 777777;
          if (M.T) M.T.value = (tv || 0) + 333; if (M.CLOCK) M.CLOCK.value = (cv || 0) + 333;
          let other;
          let SO = null;
          try { mod.pose(0, 0.5, L); mod.pose(b, k, L); other = hashGroup(); if (SJ) SO = snapObjects(); } finally {
            Math.random = rnd; performance.now = pn; Date.now = dn;
            if (M.T) M.T.value = tv; if (M.CLOCK) M.CLOCK.value = cv;
          }
          checked++;
          if (jump !== play || jump !== other) {
            const f = { beat: b, k, lever: L === undefined ? null : L, jump, play, other };
            if (SJ) {
              // name the objects: jumped from rest() vs played from beat 0, and played vs another random stream / clock
              if (jump !== play) f.jumpVsPlay = diffObjects(SJ, SP).slice(0, 6);
              if (play !== other) f.playVsOtherRandomOrClock = diffObjects(SP, SO).slice(0, 6);
            }
            fails.push(f);
          }
        }
      }
    }
  } catch (e) { fails.push({ error: String(e && e.message || e) }); }
  add('pose pure (jump = play, no random, no clock)', !fails.length, { checked, fails: fails.slice(0, 8) });
  // rest() = pose(last, 1, def)
  let restOk = false, restDet = {};
  try {
    mod.pose(0, 0, defL); mod.rest(); const a = hashGroup();
    mod.pose(0, 0, defL); mod.pose(n - 1, 1, defL); const b = hashGroup();
    restOk = a === b; restDet = { rest: a, last: b };
  } catch (e) { restDet = { error: String(e.message || e) }; }
  add('rest() = pose(last, 1, def)', restOk, restDet);
  // the lever changes something (else the choice does nothing on screen)
  if (ml && levers.length > 1) {
    const hs = levers.map((L) => { mod.rest(); mod.pose(n - 1, 1, L); return hashGroup(); });
    add('lever changes the picture', new Set(hs).size > 1, { hashes: hs }, 'warn');
  }
  // update() / ambient(): material motion only, transforms untouched
  try {
    mod.rest();
    const before = hashGroup({ mats: false });
    const ctx = { camera: E.camera, focus: id };
    for (let i = 0; i < 6; i++) mod.update(10 + i * 0.7, 0.05, ctx);
    const after = hashGroup({ mats: false });
    add('update() moves no transform', before === after, { before, after });
  } catch (e) { add('update() moves no transform', false, { error: String(e.message || e) }); }
  // emphasize(): null leaves everything full
  try {
    mod.rest(); mod.emphasize(null);
    const dims = [];
    mod.group.traverse((o) => { if (o.userData?.hitProxy || !o.material) return; for (const m of [].concat(o.material)) { const v = m?.userData?.u?.uDim?.value; if (typeof v === 'number' && v > 0.001) dims.push(o.name || o.type); } });
    add('emphasize(null) = all full', !dims.length, { dimmed: [...new Set(dims)].slice(0, 10) }, 'warn');
  } catch (e) { add('emphasize(null) = all full', false, { error: String(e.message || e) }, 'warn'); }
  return R;
}

/** set a lever state through the interface, as a reader would (still mode settles at the lever's beat) */
async function pageLever(spec) {
  const nd = window.__nd, ui = nd.ui, st = ui.story, wd = nd.world.D[ui.focusId];
  const frames = (n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  const log = [];
  if (!st || !wd.lever) return { ok: false, log: ['no lever'] };
  const fromBeat = wd.lever.fromBeat ?? 0;
  ui.startLever();
  log.push('startLever');
  if (spec.kind === 'options') {
    const b = document.querySelector(`#strip [data-act="lever-opt"][data-k="${spec.k}"]`);
    if (b) { b.click(); log.push(`click lever-opt ${spec.k}`); } else { st.setLever(spec.k); log.push(`setLever(${spec.k}) (no button)`); }
  } else {
    const part = (wd.lever.parts || [])[spec.card ?? 0];
    if (ui.leverPick) { ui.leverPick(part); log.push(`leverPick(${part})`); } else { st.setLever({ card: spec.card ?? 0, stamped: false }, { play: false }); log.push('setLever(pick)'); }
    if (spec.stamped) {
      await frames(2);
      const b = document.querySelector('#strip [data-act="lever-stamp"]');
      if (b) { b.click(); log.push('click lever-stamp'); } else { st.setLever({ card: spec.card ?? 0, stamped: true }); ui.endLever?.(); log.push('setLever(stamped) (no button)'); }
    }
  }
  if (spec.at === 'end') {
    if (spec.done) { const d = document.querySelector('#strip [data-act="lever-done"]'); if (d) { d.click(); log.push('click lever-done'); } }
    st.toEnd(); log.push('toEnd');
  } else if (typeof spec.at === 'number' && spec.at !== st.beat) {
    st.goto(spec.at, { k: 1 }); log.push(`goto(${spec.at})`);
  }
  await frames(3);
  return { ok: true, log, fromBeat, state: st.state, lever: st.lever };
}

/** every measurement of one settled state */
function pageMeasure(arg) {
  const nd = window.__nd, ui = nd.ui, E = nd.engine, world = nd.world, T = world.THREE;
  const id = ui.focusId, mod = world.D[id], st = ui.story;
  const out = { id, mode: ui.mode };
  const s = st ? st.state : null;
  const emph = !st ? null : st.focusPart ? [st.focusPart] : s.ended ? (mod.restParts || null) : (mod.beats[s.beat]?.parts || null);
  const fr = ui.freeRect();
  const vv = window.visualViewport;
  const vh = vv ? vv.height : innerHeight;
  const desk = innerWidth >= 900;
  out.layout = { w: innerWidth, h: innerHeight, vh, dpr: devicePixelRatio, renderDpr: E.dpr, desk, landscape: !desk && innerHeight < 500 && innerWidth > innerHeight, strip: ui.strip?.mode, reading: !!ui.strip?.reading, folded: !!ui.strip?.folded };
  out.free = fr;
  out.story = s ? { beat: s.beat, k: s.k, ended: s.ended, lever: s.lever, focusPart: st.focusPart, caption: st.caption(), emph, levering: !!ui.levering } : null;
  out.pose = E.getPose();
  out.offset = { x: E.offset.x, y: E.offset.y };
  out.gl = { programs: E.renderer.info.programs?.length ?? null, calls: E.renderer.info.render?.calls ?? null };
  // ---- projected boxes
  const P = { x: 0, y: 0, z: 0 };
  const scr = (b) => {
    if (!b || b.isEmpty()) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, behind = 0;
    const v = new T.Vector3();
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
      const p = E.project(v.set(x, y, z), P);
      if (!p) { behind++; continue; }
      x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
    }
    if (!(x1 > x0)) return { behind, x0: 0, y0: 0, x1: 0, y1: 0, w: 0, h: 0 };
    const r = (n) => Math.round(n * 10) / 10;
    return { x0: r(x0), y0: r(y0), x1: r(x1), y1: r(y1), w: r(x1 - x0), h: r(y1 - y0), behind };
  };
  const chainVisible = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  const proxyBox = (hit) => { hit.updateWorldMatrix(true, false); return new T.Box3().setFromObject(hit); };
  const tmp = new T.Box3();
  const bodyBox = (root) => {
    if (!root || root === mod.group) return null;
    const box = new T.Box3();
    let n = 0;
    root.updateWorldMatrix(true, true);
    root.traverse((o) => {
      if (o.userData?.hitProxy) return;
      if (!(o.isMesh || o.isLine || o.isPoints)) return;
      if (!chainVisible(o)) return;
      const mats = [].concat(o.material);
      if (mats.every((m) => !m || m.visible === false)) return;
      if (o.isInstancedMesh) { if (!o.count) return; o.computeBoundingBox(); tmp.copy(o.boundingBox); }
      else { const g = o.geometry; if (!g?.attributes?.position) return; if (!g.boundingBox) g.computeBoundingBox(); tmp.copy(g.boundingBox); }
      if (tmp.isEmpty()) return;
      tmp.applyMatrix4(o.matrixWorld);
      box.union(tmp); n++;
    });
    return n ? box : null;
  };
  const inFree = (b) => {
    if (!b || !(b.w > 0)) return { inside: false, frac: 0 };
    const ix = Math.max(0, Math.min(b.x1, fr.x + fr.w) - Math.max(b.x0, fr.x)), iy = Math.max(0, Math.min(b.y1, fr.y + fr.h) - Math.max(b.y0, fr.y));
    const frac = (ix * iy) / Math.max(1e-6, b.w * b.h);
    const tol = 1;
    return { inside: b.behind === 0 && b.x0 >= fr.x - tol && b.y0 >= fr.y - tol && b.x1 <= fr.x + fr.w + tol && b.y1 <= fr.y + fr.h + tol, frac: Math.round(frac * 1000) / 1000 };
  };
  const partInfo = (pid) => {
    const p = mod.parts?.[pid];
    if (!p) return { id: pid, missing: true };
    if (!p.hit) {
      // no hit proxy: measure parts[id].object or parts[id].box() if the module offers one, else it is unmeasurable
      let wb = null, root = null;
      try { if (typeof p.box === 'function') wb = p.box(); else if (p.object?.isObject3D) { root = p.object; wb = bodyBox(root); } } catch { wb = null; }
      if (!wb || wb.isEmpty()) return { id: pid, noHit: true, unmeasurable: true };
      const b = scr(wb);
      const visible = root ? chainVisible(root) : true;
      const ix = Math.max(0, Math.min(b.x1, fr.x + fr.w) - Math.max(b.x0, fr.x)), iy = Math.max(0, Math.min(b.y1, fr.y + fr.h) - Math.max(b.y0, fr.y));
      return { id: pid, noHit: true, visible, proxy: b, body: b, bodyBasis: 'object', ...inFree(b), visPx: Math.round(Math.max(ix, iy) * 10) / 10, anchorIn: null };
    }
    const proxy = scr(proxyBox(p.hit));
    const root = p.hit.parent;
    const visible = !!root && chainVisible(root);
    const bb = visible ? bodyBox(root) : null;
    const body = bb ? scr(bb) : null;
    const use = body && body.w > 0 ? body : proxy;
    const where = inFree(use);
    // how much of it shows inside the free rect, and whether its hotspot anchor does
    const ix = use ? Math.max(0, Math.min(use.x1, fr.x + fr.w) - Math.max(use.x0, fr.x)) : 0, iy = use ? Math.max(0, Math.min(use.y1, fr.y + fr.h) - Math.max(use.y0, fr.y)) : 0;
    let anchorIn = null;
    try { const a = p.anchor?.(); const q = a && E.project(a, { x: 0, y: 0, z: 0 }); anchorIn = !!q && q.x >= fr.x && q.x <= fr.x + fr.w && q.y >= fr.y && q.y <= fr.y + fr.h; } catch { anchorIn = null; }
    return { id: pid, visible, proxy, body, bodyBasis: root === mod.group ? 'group' : bb ? 'geometry' : 'none', ...where, visPx: Math.round(Math.max(ix, iy) * 10) / 10, anchorIn };
  };
  out.actor = mod.mainActor ? partInfo(mod.mainActor) : null;
  out.parts = (emph || []).map(partInfo);
  // ---- dimming by subtraction (advisory): each object belongs to its nearest part root
  try {
    const roots = new Map();   // root object → [part ids]
    for (const [pid, p] of Object.entries(mod.parts || {})) { const r = p.hit?.parent; if (!r || r === mod.group) continue; if (!roots.has(r)) roots.set(r, []); roots.get(r).push(pid); }
    const owner = (o) => { for (let q = o; q && q !== mod.group; q = q.parent) if (roots.has(q)) return q; return null; };
    const acc = new Map();
    for (const r of roots.keys()) acc.set(r, { min: Infinity, max: -Infinity, shadow: [], n: 0 });
    mod.group.traverse((o) => {
      if (o.userData?.hitProxy || !o.material) return;
      const r = owner(o);
      if (!r) return;
      const a = acc.get(r);
      for (const m of [].concat(o.material)) {
        const u = m?.userData?.u;
        if (!u?.uDim) continue;
        let lo = u.uDim.value, hi = u.uDim.value;
        const ad = o.geometry?.attributes?.aCardDim;
        if (ad && o.isInstancedMesh) { lo = Infinity; hi = -Infinity; for (let i = 0; i < o.count; i++) { const e = Math.max(u.uDim.value, ad.array[i]); lo = Math.min(lo, e); hi = Math.max(hi, e); } }
        a.min = Math.min(a.min, lo); a.max = Math.max(a.max, hi); a.n++;
      }
      if (o.castShadow && chainVisible(o)) a.shadow.push(o.name || o.type);
    });
    const issues = [];
    for (const [r, pidsOf] of roots) {
      const a = acc.get(r);
      if (!a.n) continue;
      const on = !emph || pidsOf.some((p) => emph.includes(p));
      if (on && a.max > 0.01) issues.push({ parts: pidsOf, issue: 'emphasised but dimmed', dim: [a.min, a.max] });
      if (!on && a.min < 0.05) issues.push({ parts: pidsOf, issue: 'not emphasised but full', dim: [a.min, a.max] });
      if (!on && a.shadow.length) issues.push({ parts: pidsOf, issue: 'dimmed but casts a shadow', meshes: a.shadow.slice(0, 4) });
    }
    out.dim = { issues };
  } catch (e) { out.dim = { error: String(e.message || e) }; }
  // ---- the DOM
  const vis = (el) => (el.checkVisibility ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true, checkOpacity: true, checkVisibilityCSS: true }) : !!(el.offsetWidth || el.offsetHeight));
  const rr = (n) => Math.round(n * 10) / 10;
  const box = (el) => { const r = el.getBoundingClientRect(); return { x0: rr(r.left), y0: rr(r.top), x1: rr(r.right), y1: rr(r.bottom), w: rr(r.width), h: rr(r.height) }; };
  const desc = (el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${[...el.classList].slice(0, 2).map((c) => '.' + c).join('')}${el.dataset?.act ? `[data-act=${el.dataset.act}]` : ''}`;
  const txt = (el) => (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30);
  const strip = document.querySelector('#strip');
  const stripBox = strip && !strip.hidden && vis(strip) ? box(strip) : null;
  const top = document.querySelector('.top');
  const topBox = top ? box(top) : null;
  // the top bar's own controls (its box includes a soft gradient below the bar on phones)
  let topContent = null;
  const topCtl = [];
  if (top) for (const el of top.querySelectorAll('a, button')) { if (!vis(el)) continue; const b = box(el); if (!(b.w > 0)) continue; topCtl.push(b); topContent = topContent ? { x0: Math.min(topContent.x0, b.x0), y0: Math.min(topContent.y0, b.y0), x1: Math.max(topContent.x1, b.x1), y1: Math.max(topContent.y1, b.y1) } : { ...b }; }
  out.dom = { strip: stripBox, top: topBox, topContent, topControls: topCtl.length };
  const ov = [...document.querySelectorAll('#ov .ov')].filter((el) => !el.classList.contains('off') && vis(el)).map((el) => ({ el, kind: ([...el.classList].find((c) => c.startsWith('ov-')) || 'ov-?').slice(3), text: txt(el), box: box(el) })).filter((n) => n.box.w > 0 && n.box.h > 0);
  out.overlay = ov.map(({ kind, text, box: b }) => ({ kind, text, box: b }));
  const hit = (a, b, t = 0.5) => a && b && a.x0 < b.x1 - t && a.x1 > b.x0 + t && a.y0 < b.y1 - t && a.y1 > b.y0 + t;
  const overlaps = [];
  const counted = ov.filter((n) => n.kind !== 'letter');
  for (const n of counted) {
    if (hit(n.box, stripBox)) overlaps.push({ a: `${n.kind}:${n.text}`, b: 'strip' });
    if (topCtl.some((b) => hit(n.box, b))) overlaps.push({ a: `${n.kind}:${n.text}`, b: 'top bar' });
  }
  for (let i = 0; i < counted.length; i++) for (let j = i + 1; j < counted.length; j++) if (hit(counted[i].box, counted[j].box)) overlaps.push({ a: `${counted[i].kind}:${counted[i].text}`, b: `${counted[j].kind}:${counted[j].text}` });
  // over the top bar's box (gradient included) is reported separately, not a failure by itself
  const underTopBox = counted.filter((n) => topBox && hit(n.box, topBox) && !hit(n.box, topContent)).map((n) => `${n.kind}:${n.text}`);
  out.overlaps = overlaps;
  out.underTopGradient = underTopBox;
  out.counts = { nodes: counted.length, all: ov.length, labels: ov.filter((n) => n.kind === 'label').length, decals: ov.filter((n) => n.kind === 'decal').length, hot: ov.filter((n) => n.kind === 'hot').length, pills: ov.filter((n) => n.kind === 'pill').length };
  // leaders
  const maxLead = desk ? 72 : 48;
  out.leaders = [...document.querySelectorAll('#ov svg.ov-leaders line')].filter((l) => l.style.display !== 'none' && l.getAttribute('x1') !== null).map((l) => rr(Math.hypot(+l.getAttribute('x2') - +l.getAttribute('x1'), +l.getAttribute('y2') - +l.getAttribute('y1'))));
  out.maxLead = maxLead;
  // caption
  const cap = document.querySelector('#st-cap');
  if (cap && vis(cap)) {
    const range = document.createRange();
    range.selectNodeContents(cap);
    const tops = [];
    for (const r of range.getClientRects()) if (r.width > 0 && !tops.some((t) => Math.abs(t - r.top) < 3)) tops.push(r.top);
    out.caption = { text: cap.textContent, chars: cap.textContent.replace(/\s/g, '').length, sw: cap.scrollWidth, cw: cap.clientWidth, lines: tops.length, fs: parseFloat(getComputedStyle(cap).fontSize) };
  } else out.caption = null;
  // text sizes
  const small = [];
  for (const sel of ['#ov', '#strip']) {
    const root = document.querySelector(sel);
    if (!root) continue;
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let t = tw.nextNode(); t; t = tw.nextNode()) {
      if (!t.nodeValue.trim()) continue;
      const el = t.parentElement;
      if (!el || !vis(el)) continue;
      const b = el.getBoundingClientRect();
      if (b.width <= 1 || b.height <= 1) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 11.99) small.push({ el: desc(el), text: t.nodeValue.trim().slice(0, 20), fs });
    }
  }
  out.smallText = small;
  // targets: the box plus absolutely positioned ::before / ::after hit areas
  const targets = [];
  for (const el of document.querySelectorAll('#ov button, #ov a[href], #ov [role="button"], #strip button, #strip a[href], #strip [role="button"]')) {
    if (!vis(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.pointerEvents === 'none') continue;
    const b = box(el);
    if (!(b.w > 0 && b.h > 0)) continue;
    let h = { ...b };
    if (cs.position !== 'static') {
      for (const pe of ['::before', '::after']) {
        const ps = getComputedStyle(el, pe);
        if (!ps.content || ps.content === 'none' || ps.content === 'normal' || ps.display === 'none' || ps.position !== 'absolute' || ps.pointerEvents === 'none') continue;
        const px = (v) => (v === 'auto' || v === '' ? null : parseFloat(v));
        const L = px(ps.left), Rt = px(ps.right), Tp = px(ps.top), B = px(ps.bottom), Wd = px(ps.width), Ht = px(ps.height);
        const bl = parseFloat(cs.borderLeftWidth) || 0, br = parseFloat(cs.borderRightWidth) || 0, bt = parseFloat(cs.borderTopWidth) || 0, bb = parseFloat(cs.borderBottomWidth) || 0;
        const cx0 = b.x0 + bl, cx1 = b.x1 - br, cy0 = b.y0 + bt, cy1 = b.y1 - bb;
        let x0 = L !== null ? cx0 + L : Rt !== null && Wd !== null ? cx1 - Rt - Wd : null;
        let x1 = Rt !== null ? cx1 - Rt : x0 !== null && Wd !== null ? x0 + Wd : null;
        let y0 = Tp !== null ? cy0 + Tp : B !== null && Ht !== null ? cy1 - B - Ht : null;
        let y1 = B !== null ? cy1 - B : y0 !== null && Ht !== null ? y0 + Ht : null;
        if (x0 === null || x1 === null || y0 === null || y1 === null || !(x1 > x0 && y1 > y0)) continue;
        h = { x0: Math.min(h.x0, x0), y0: Math.min(h.y0, y0), x1: Math.max(h.x1, x1), y1: Math.max(h.y1, y1) };
      }
    }
    h.w = rr(h.x1 - h.x0); h.h = rr(h.y1 - h.y0);
    const inView = b.x1 > 0 && b.y1 > 0 && b.x0 < innerWidth && b.y0 < innerHeight;
    if (h.w < 43.5 || h.h < 43.5) targets.push({ el: desc(el), text: txt(el), box: { w: b.w, h: b.h }, hit: { w: h.w, h: h.h }, inView, seg: el.dataset?.act === 'seg' });
  }
  out.smallTargets = targets;
  out.buttons = document.querySelectorAll('#ov button, #strip button, #strip a[href]').length;
  out.worldShare = Math.round((fr.h / vh) * 1000) / 1000;
  return out;
}

/** camera-contract helpers installed after each ?debug load */
function pageCamInstall() {
  const E = window.__nd.engine;
  window.__vw = {
    mark: null,
    frames: 0,
    /** remember where the move log stands (gained() reads what came after) and return the camera */
    snap() {
      const log = E.moveLog;
      this.mark = log[log.length - 1] || null;
      return this.state();
    },
    state() { return { pose: E.getPose(), off: { x: E.offset.x, y: E.offset.y }, clock: E.clock, flight: E.flight?.kind || null, logLen: E.moveLog.length, part: window.__nd.ui.part || null, reading: !!window.__nd.ui.strip?.reading, folded: !!window.__nd.ui.strip?.folded }; },
    gained() {
      const log = E.moveLog;
      const i = this.mark ? log.indexOf(this.mark) : -1;
      return (i >= 0 ? log.slice(i + 1) : this.mark ? log.slice() : log.slice()).map((e) => ({ ...e, t: Math.round(e.t * 1000) / 1000 }));
    },
    settled() { return !E.flight && E.offset.x === E.offset.tx && E.offset.y === E.offset.ty; },
  };
  const tick = () => { window.__vw.frames++; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  return true;
}

/** the centre of the first visible element matching sel, and whether a tap there reaches it */
function pageTarget(sel, scroll) {
  const vis = (el) => (el.checkVisibility ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true, checkOpacity: true, checkVisibilityCSS: true }) : !!el.offsetWidth);
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return false;
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return false;
    // clipped by a scrolling ancestor?
    for (let p = el.parentElement; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (!/(auto|scroll|hidden)/.test(cs.overflowY + cs.overflowX)) continue;
      const q = p.getBoundingClientRect();
      if (y < q.top || y > q.bottom || x < q.left || x > q.right) return false;
    }
    return true;
  };
  for (const el of document.querySelectorAll(sel)) {
    if (!vis(el)) continue;
    let scrolled = false;
    if (!shown(el)) { if (!scroll) continue; el.scrollIntoView({ block: 'center', inline: 'nearest' }); scrolled = true; if (!shown(el)) continue; }
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const top = document.elementFromPoint(x, y);
    return { x, y, scrolled, reach: !!top && (top === el || el.contains(top)), label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24), at: top ? top.tagName.toLowerCase() + (top.id ? '#' + top.id : '') + (top.className && typeof top.className === 'string' ? '.' + top.className.split(' ')[0] : '') : null };
  }
  return null;
}

function pageClick(sel) {
  const el = document.querySelector(sel);
  if (!el) return false;
  el.click();
  return true;
}

// ---------------------------------------------------------------------------------------------- checks
const ok = (pass, value, extra = {}) => ({ pass: !!pass, value, ...extra });

function judge(m, size, errors) {
  const c = {};
  const phone = size.mobile;
  if (m.actor) {
    const a = m.actor;
    const h = a.proxy?.h ?? 0;
    c.actor = ok(!a.missing && a.visible && h >= 60, h, { min: 60, part: a.id, visible: a.visible });
    if (a.body && a.bodyBasis === 'geometry') c.actorBody = ok(a.body.h >= 60, a.body.h, { min: 60, level: 'warn', part: a.id });
    c.actorOnScreen = ok(a.inside || a.frac >= 0.999, a.frac, { level: 'warn', part: a.id });
  } else c.actor = ok(false, null, { note: 'module has no mainActor' });
  if (m.story?.emph) {
    // a part fails when it is missing, hidden, under 40 px, or not really in the free rect (its hotspot anchor outside,
    // or under 40 px of it inside); a long road or a spilling heap that runs past the frame is only 'clipped' (warn)
    const shows = (p) => p.inside || (p.anchorIn !== false && p.visPx >= 40);
    const unmeasured = m.parts.filter((p) => p.unmeasurable);
    c.partsMeasurable = ok(!unmeasured.length, unmeasured.map((p) => p.id), { note: unmeasured.length ? 'emphasised parts with no hit proxy (and no parts[id].object / box()): their size cannot be checked' : undefined });
    const bad = m.parts.filter((p) => !p.unmeasurable && (p.missing || !p.visible || !p.proxy || Math.max(p.proxy.w, p.proxy.h) < 40 || !shows(p)));
    c.parts = ok(!bad.length, m.parts.map((p) => ({ id: p.id, px: p.proxy ? Math.max(p.proxy.w, p.proxy.h) : null, inside: p.inside, frac: p.frac, visPx: p.visPx, anchorIn: p.anchorIn, visible: p.visible })), { min: 40, fails: bad.map((p) => p.id) });
    const clipped = m.parts.filter((p) => !bad.includes(p) && !p.unmeasurable && !p.inside);
    c.partsClipped = ok(!clipped.length, clipped.map((p) => ({ id: p.id, frac: p.frac, visPx: p.visPx })), { level: 'warn' });
    const bb = m.parts.filter((p) => p.bodyBasis === 'geometry' && p.body && Math.max(p.body.w, p.body.h) < 40);
    c.partsBody = ok(!bb.length, m.parts.filter((p) => p.body).map((p) => ({ id: p.id, px: Math.max(p.body.w, p.body.h) })), { min: 40, level: 'warn', fails: bb.map((p) => p.id) });
  } else c.parts = ok(true, [], { note: 'no emphasised parts (all full)' });
  if (m.layout.reading) for (const k of ['actor', 'parts', 'partsMeasurable', 'actorOnScreen']) if (c[k] && !c[k].pass) { c[k].level = 'warn'; c[k].note = 'with the half sheet open the free rect halves and only the offset moves (§5.2): informational'; }
  c.overlap = ok(!m.overlaps.length, m.overlaps.length, { pairs: m.overlaps.slice(0, 12) });
  // over the .top box but clear of its controls: the box includes a soft paper gradient below the bar on phones
  if (m.underTopGradient?.length) c.topGradient = ok(false, m.underTopGradient.length, { level: 'warn', items: m.underTopGradient.slice(0, 6), note: 'over the top bar\'s box (its gradient), not over its controls', top: m.dom.top, controls: m.dom.topContent });
  c.nodes = ok(m.counts.nodes <= 12, m.counts.nodes, { max: 12 });
  c.labels = ok(m.counts.labels <= 3, m.counts.labels, { max: 3 });
  c.decals = ok(m.counts.decals <= 6, m.counts.decals, { max: 6 });
  c.leaders = ok(m.leaders.every((l) => l <= m.maxLead + 0.5), m.leaders, { max: m.maxLead });
  const lay = m.layout.desk ? 'desktop panel' : m.layout.landscape ? 'landscape column' : 'phone strip';
  if (m.caption) {
    const v = { lines: m.caption.lines, sw: m.caption.sw, cw: m.caption.cw, chars: m.caption.chars, fs: m.caption.fs, layout: lay };
    // two lines in the phone strip (a sentence of the story), as in the desktop panel and the landscape column
    if (lay === 'phone strip') c.caption = ok(m.caption.lines <= 2, v, { text: m.caption.text });
    else c.caption = ok(m.caption.lines <= 2 && m.caption.sw <= m.caption.cw + 1, v, { text: m.caption.text, level: phone ? 'fail' : 'warn' });
  } else c.caption = ok(false, null, { note: '#st-cap not visible' });
  // a phone in landscape (§5.6): the world on the left 62%, the strip a right-hand column of 38%
  const turned = phone && m.layout.w > m.layout.h;
  const colShare = m.dom.strip ? Math.round((m.dom.strip.w / m.layout.w) * 1000) / 1000 : null;
  const isColumn = !!m.dom.strip && m.dom.strip.x1 >= m.layout.w - 1 && colShare <= 0.405;
  if (turned && !isColumn) c.layout = ok(false, { layout: lay, column: colShare }, { level: 'warn', note: 'design §5.6: a phone in landscape (about 932×430) gets a right-hand column of 38%' });
  // no English framework term in the scene (§12.4): the book's framework words fail; any other Latin word of three
  // letters or more in the overlay is a warning (a brand name may be fine)
  const words = (m.overlay || []).flatMap((n) => (n.text.match(/[A-Za-z]{3,}/g) || []).map((w) => ({ kind: n.kind, w })));
  const FRAME = /^(model|models|people|prologue|agentic|agent|agents|framework|persona|twin|twins|brand|brands|insight|journey|culture|trust|memory|judgment|judgement|epilogue)$/i;
  // 「Agent」 is the district's own plain name in Agent 權限 (design §8.3); everywhere else it is a framework word
  const allowed = (x) => (m.id === 'gates' || x.kind === 'pill' || x.kind === 'zone') && /^agents?$/i.test(x.w);
  const frame = dedupe(words.filter((x) => FRAME.test(x.w) && !allowed(x)).map((x) => `${x.kind}:${x.w}`));
  c.framework = ok(!frame.length, frame.length, { items: frame.slice(0, 8), note: frame.length ? 'English framework terms in the scene (§12.4)' : undefined });
  const latin = dedupe(words.filter((x) => !FRAME.test(x.w)).map((x) => `${x.kind}:${x.w}`));
  c.latin = ok(!latin.length, latin.length, { level: 'warn', items: latin.slice(0, 8) });
  c.text = ok(!m.smallText.length, m.smallText.length, { min: 12, items: dedupe(m.smallText.map((s) => `${s.el} "${s.text}" ${s.fs}px`)).slice(0, 12) });
  // 44 × 44 for every target; a beat segment may be 40 wide (§5.6: "each segment 44 px tall, at least 40 px wide")
  const segOk = (t) => t.seg && t.hit.w >= 39.5 && t.hit.h >= 43.5;
  const hardT = m.smallTargets.filter((t) => !segOk(t)), softT = m.smallTargets.filter(segOk);
  const tItem = (t) => `${t.el} "${t.text}" ${t.hit.w}x${t.hit.h}${t.inView ? '' : ' (scrolled)'}`;
  c.targets = ok(!hardT.length, hardT.length, { min: 44, items: dedupe(hardT.map(tItem)).slice(0, 14) });
  if (softT.length) c.segTargets = ok(false, softT.length, { level: 'warn', note: 'beat segments 40–44 px wide: the design (§5.6) allows ≥ 40 × 44, the 44 × 44 rule does not', items: dedupe(softT.map(tItem)).slice(0, 8) });
  if (phone && m.layout.reading && m.dom.strip && turned) {
    // landscape: the reading layer lives in the right-hand column (38%); the world on the left stays visible
    c.sheet = ok(isColumn && m.free.w / m.layout.w >= 0.58, colShare, { max: 0.405, basis: 'column width / viewport width (landscape)', freeW: m.free.w });
  } else if (phone && m.layout.reading && m.dom.strip) {
    // the half sheet takes at most 55% of the visible height (§5.6, §9); the world above stays visible
    const share = Math.round((m.dom.strip.h / m.layout.vh) * 1000) / 1000;
    c.sheet = ok(share <= 0.555, share, { max: 0.55, basis: 'sheet height / visible height', worldShare: m.worldShare });
  } else if (phone) c.world = ok(m.worldShare >= 0.72, m.worldShare, { min: 0.72, free: m.free, vh: m.layout.vh });
  c.dimming = ok(!(m.dim?.issues?.length) && !m.dim?.error, m.dim?.issues?.length ?? null, { level: 'warn', issues: (m.dim?.issues || []).slice(0, 8), error: m.dim?.error });
  const ex = errors.filter((e) => e.startsWith('exception'));
  c.errors = ok(!ex.length, errors.length, { items: errors.slice(0, 6) });
  return c;
}

const dedupe = (a) => [...new Set(a)];
const failed = (checks) => Object.entries(checks).filter(([, v]) => !v.pass && v.level !== 'warn').map(([k]) => k);
const warned = (checks) => Object.entries(checks).filter(([, v]) => !v.pass && v.level === 'warn').map(([k]) => k);

// ---------------------------------------------------------------------------------------------- the run
const REFUSED = /ERR_CONNECTION_REFUSED|ERR_CONNECTION_RESET|Failed to fetch dynamically imported module|ERR_EMPTY_RESPONSE|ERR_CONNECTION_CLOSED/;

async function boot(page, url, o, { story = null } = {}) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    // the shared server went away during the run: from here on the tool serves world/ itself
    if (o.ownServer && url.startsWith(o.ownServer.from)) url = o.base + url.slice(o.ownServer.from.length);
    await page.goto(url);
    // the shared server sometimes refuses a burst of module requests: then the page never boots; retry at once
    const t0 = Date.now();
    let up = false;
    while (Date.now() - t0 < o.timeout * 1000) {
      up = await page.waitFor(`window.__nd && window.__nd.ui && window.__nd.ui.booted && window.__nd.engine`, { timeout: 1500, every: 150 });
      if (up) break;
      if (Date.now() - t0 > 2500 && page.errors().some((e) => REFUSED.test(e))) break;
    }
    if (up && story) {
      const there = await page.waitFor(`__nd.ui.focusId === ${JSON.stringify(story)} && __nd.ui.story && (__nd.ui.mode === 'district' || __nd.ui.mode === 'tour')`, { timeout: 15000 });
      if (!there) return { ok: false, why: `the app did not open ${story} as a story` };
    }
    if (up) {
      // the first frames after ?still's tick(240) can hold the main thread for a long time (software GL)
      await page.waitFor(`(window.__vwBoot = (window.__vwBoot || 0) + 1) > 0`, { timeout: o.timeout * 1000, every: 300 });
      await page.ev(`Promise.race([Promise.all([document.fonts.ready, __nd.engine.npr.hitoReady || null]), new Promise((r) => setTimeout(r, 4000))]).then(() => true)`, { timeout: o.timeout * 1000 });
      await page.ev(`(${pageFrames.toString()})(3, 150)`, { timeout: o.timeout * 1000 });
      return { ok: true, attempt };
    }
    const errs = page.errors();
    const refused = errs.some((e) => REFUSED.test(e));
    if (refused && !o.ownServer && o.fallbackServe && !(await reachable(o.base))) {
      // the server is gone, not just busy: switch to our own and start this state again
      await o.fallbackServe();
      url = o.base + url.slice(o.ownServer.from.length);
      attempt = 0;
      continue;
    }
    if (attempt === 3) return { ok: false, why: `no window.__nd after ${o.timeout}s`, errors: errs };
    log(`    retry ${attempt} (${errs[0] || 'no __nd'})`);
    await sleep(1500);
  }
  return { ok: false, why: 'unreachable' };
}

function statesFor(d, o, size) {
  const n = d.modBeats;
  const S = [];
  for (let i = 0; i < n; i++) S.push({ name: `b${i + 1}`, hash: `${i + 1}`, label: `beat ${i + 1}`, cap: d.caps[i] });
  S.push({ name: 'end', hash: 'end', label: 'end' });
  // phones: the reading layer open as the half sheet (its text and buttons, and the 55% budget)
  if (size.mobile) S.push({ name: 'end-reading', hash: 'end', label: 'end, reading layer open', reading: true });
  const L = d.modLever;
  if (L) {
    const from = Math.max(0, Math.min(n - 1, L.fromBeat ?? 0));
    if (L.kind === 'pick') {
      const card = Math.min(o.pick, Math.max(0, (L.parts || []).length - 1));
      S.push({ name: `pick${card + 1}`, hash: `${from + 1}`, label: `pick card ${card + 1}`, lever: { kind: 'pick', card, stamped: false, at: from } });
      for (let i = from; i < n; i++) S.push({ name: `stamped-b${i + 1}`, hash: `${i + 1}`, label: `stamped, beat ${i + 1}`, lever: { kind: 'pick', card, stamped: true, at: i } });
      S.push({ name: 'stamped-end', hash: 'end', label: 'stamped, end', lever: { kind: 'pick', card, stamped: true, at: 'end' } });
    } else {
      for (const k of L.options || []) {
        for (let i = from; i < n; i++) S.push({ name: `lever-${k}-b${i + 1}`, hash: `${i + 1}`, label: `lever ${k}, beat ${i + 1}`, lever: { kind: 'options', k, at: i } });
        S.push({ name: `lever-${k}-end`, hash: 'end', label: `lever ${k}, end`, lever: { kind: 'options', k, at: 'end', done: true } });
      }
    }
  }
  return S;
}

let LOGV = false;
const log = (...a) => console.log(...a);
const vlog = (...a) => { if (LOGV) console.log(...a); };

async function runStill(page, d, size, o, rep) {
  const states = statesFor(d, o, size);
  for (const S of states) {
    const url = `${o.base}?still#/d/${d.id}/${S.hash}`;
    const t0 = Date.now();
    const b = await boot(page, url, o, { story: d.id });
    const rec = { size: size.label, state: S.name, label: S.label, url, lever: S.lever || null, src: Sources.stamp() + 1 };
    if (!b.ok) {
      rec.error = b.why; rec.checks = { load: ok(false, b.why, { items: b.errors }) };
      rep.states.push(rec);
      log(`  ${size.label.padEnd(9)} ${S.name.padEnd(16)} LOAD FAILED: ${b.why}`);
      continue;
    }
    try {
      if (S.lever) {
        const lv = await page.call(pageLever, S.lever);
        rec.leverLog = lv.log;
      }
      if (S.reading) {
        const opened = await page.ev(`(() => { const b = document.querySelector('#strip [data-act="read"]'); if (!b || !b.checkVisibility()) return false; b.click(); return true; })()`);
        if (!opened) { rec.note = 'no visible 讀這一區 button (desktop layout): the reading layer is the panel itself'; }
      }
      await page.call(pageFrames, 3, 120);
      const m = await page.call(pageMeasure, {});
      const file = path.join(o.out, d.id, size.label, `${S.name}.jpg`);
      await page.shot(file);
      rec.screenshot = path.relative(o.out, file).replace(/\\/g, '/');
      rec.measure = m;
      rec.checks = judge(m, size, page.errors());
      if (S.cap && m.story && m.caption && m.caption.text !== S.cap && !S.lever) rec.checks.captionText = ok(false, m.caption.text, { expected: S.cap, level: 'warn' });
    } catch (e) {
      rec.error = String(e.message || e);
      rec.checks = { run: ok(false, rec.error) };
    }
    rec.ms = Date.now() - t0;
    rep.states.push(rec);
    const f = failed(rec.checks), w = warned(rec.checks);
    log(`  ${size.label.padEnd(9)} ${S.name.padEnd(16)} ${f.length ? 'FAIL ' + f.join(',') : 'ok'}${w.length ? `  (warn ${w.join(',')})` : ''}  actor ${rec.measure?.actor?.proxy?.h ?? '-'}px  ${(rec.ms / 1000).toFixed(1)}s`);
  }
}

async function settle(page, { minFrames = 6, minMs = 500, timeout = 20000 } = {}) {
  await page.ev(`(() => { window.__vwF0 = __vw.frames; return true; })()`);
  const t0 = Date.now();
  await sleep(minMs);
  await page.waitFor(`__vw.frames - window.__vwF0 >= ${minFrames} && __vw.settled()`, { timeout, every: 120 });
  return Date.now() - t0;
}

const angDelta = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
function poseDelta(a, b) {
  if (!a || !b) return { max: Infinity };
  const dt = Math.max(...a.target.map((v, i) => Math.abs(v - b.target[i])));
  const daz = Math.abs(angDelta(a.az, b.az)), del = Math.abs(a.el - b.el), dd = Math.abs(a.dist - b.dist) / Math.max(1, Math.abs(a.dist));
  return { target: dt, az: daz, el: del, dist: dd, max: Math.max(dt / Math.max(1, a.dist), daz, del, dd) };
}

async function runCamera(page, d, size, o, rep, scenario) {
  const url = scenario === 'end' ? `${o.base}?debug#/d/${d.id}/end` : `${o.base}?debug#/d/${d.id}`;
  const rec = { size: size.label, scenario, url, actions: [], src: Sources.stamp() + 1 };
  const t0 = Date.now();
  const b = await boot(page, url, o, { story: d.id });
  if (!b.ok) { rec.error = b.why; rep.camera.push(rec); log(`  ${size.label.padEnd(9)} camera/${scenario} LOAD FAILED: ${b.why}`); return; }
  try {
    await page.call(pageCamInstall);
    // the arrival flight, then nothing moving
    const arrived = await page.waitFor(`__nd.engine.moveLog.some((e) => e.kind === 'flight') && !__nd.engine.flight`, { timeout: 60000, every: 250 });
    rec.arrival = { flown: arrived, log: await page.ev(`__nd.engine.moveLog.map((e) => e.kind).join(' ')`) };
    if (scenario === 'autoplay') {
      // the story starts after the flight; let it run a moment, then the reader pauses it
      await page.waitFor(`__nd.ui.story && __nd.ui.story.playing`, { timeout: 15000 });
      await sleep(1200);
      await page.waitFor(`!__nd.engine.flight`, { timeout: 20000 });
    }
    await settle(page, { minFrames: 8, minMs: 800 });
    const base = await page.ev(`__vw.snap()`);
    rec.base = base;
    const desk = size.w >= 900;
    const steps = [];
    if (scenario === 'autoplay') steps.push({ name: 'pause', sel: '#strip [data-act="pause"]' });
    if (!desk) steps.push({ name: 'read-open', sel: '#strip [data-act="read"]' });
    steps.push({ name: 'reader-roundtrip', sel: '#strip [data-read]', reader: true, scroll: true });
    if (!desk) steps.push({ name: 'read-close', sel: '#strip [data-act="read"]' });
    if (scenario === 'end') {
      steps.push({ name: 'hotspot', sel: '#ov .ov-hot:not(.off)' });
      // Esc clears the part focus (S3 → S2); without a focused part it would leave the place, which is a flight
      steps.push({ name: 'esc', key: ['Escape', 'Escape', 27], cond: `!!__nd.ui.part` });
    }
    if (desk) { steps.push({ name: 'fold', sel: '#strip [data-act="fold"]', scroll: true }); steps.push({ name: 'unfold', sel: '#strip [data-act="fold"]', scroll: true }); }
    steps.push({ name: 'caption', sel: '#st-cap' });
    // a phone turns to landscape and back (§11.2): the pose may be rebased (§5.2 retarget), but nothing may fly
    if (size.mobile) steps.push({ name: 'rotate', rotate: true });
    let poseBeforeRotate = null;
    for (const st of steps) {
      const A = { name: st.name };
      try {
        await page.waitFor(`__vw.settled()`, { timeout: 15000 });
        if (st.cond && !(await page.ev(`(() => { try { return !!(${st.cond}); } catch { return false; } })()`))) { A.skipped = `precondition not met: ${st.cond}`; rec.actions.push(A); continue; }
        const before = await page.ev(`__vw.snap()`);
        if (st.rotate) {
          poseBeforeRotate = before.pose;
          const turned = { ...size, w: size.h, h: size.w, label: `${size.h}x${size.w}` };
          await page.emulate(turned);
          await sleep(500);
          A.turnedMs = await settle(page, { minFrames: 6, minMs: 400 });
          A.turned = await page.ev(`({ w: innerWidth, h: innerHeight, pose: __nd.engine.getPose(), free: __nd.ui.freeRect() })`);
          await page.emulate(size);
          await sleep(500);
          A.settleMs = await settle(page, { minFrames: 6, minMs: 400 });
          const gained = await page.ev(`__vw.gained()`);
          const after = await page.ev(`__vw.state()`);
          A.gained = gained.map((e) => e.kind + (e.dur ? `(${Math.round(e.dur * 100) / 100}s)` : ''));
          A.poseDelta = poseDelta(before.pose, after.pose);
          const flew = gained.filter((e) => e.kind === 'flight');
          A.pass = !flew.length;
          A.note = 'a rotation may rebase the pose or ease back to the fitted shot when the reader has not moved the camera (§5.2); only a flight fails';
          if (!A.pass) A.why = `moveLog +${flew.map((e) => `flight(${e.dur}s)`).join(',')}`;
          rec.actions.push(A);
          continue;
        }
        if (st.key) {
          await page.key(...st.key);
          A.how = 'key';
        } else {
          const tg = await page.call(pageTarget, st.sel, !!st.scroll);
          if (!tg) { A.skipped = `nothing visible for ${st.sel}`; rec.actions.push(A); continue; }
          A.target = tg.label; A.reach = tg.reach;
          if (tg.scrolled) A.scrolledIntoView = true;
          if (tg.reach) { await page.tap(tg.x, tg.y); A.how = size.mobile ? 'touch' : 'mouse'; }
          else { await page.call(pageClick, st.sel); A.how = `el.click() (a tap at its centre lands on ${tg.at})`; }
        }
        if (st.reader) {
          const opened = await page.waitFor(`document.querySelector('#sheet.open [data-act="back"]')`, { timeout: 20000 });
          A.readerOpened = opened;
          await sleep(400);
          const back = await page.call(pageTarget, '#sheet [data-act="back"]');
          if (back?.reach) await page.tap(back.x, back.y); else await page.call(pageClick, '#sheet [data-act="back"]');
          // the sheet fades out (and still takes taps) until its visibility flips: wait until it is really gone
          A.readerClosed = await page.waitFor(`!document.querySelector('#sheet.open') && getComputedStyle(document.querySelector('#sheet')).visibility === 'hidden'`, { timeout: 15000 });
          if (!A.readerClosed) throw new Error('the reader did not close after 回到畫面');
        }
        A.settleMs = await settle(page, { minFrames: 6, minMs: 450 });
        const gained = await page.ev(`__vw.gained()`);
        const after = await page.ev(`__vw.state()`);
        A.gained = gained.map((e) => e.kind);
        A.ui = { part: after.part, reading: after.reading, folded: after.folded };
        const bad = gained.filter((e) => e.kind === 'flight' || e.kind === 'ease' || e.kind === 'set');
        const pd = poseDelta(before.pose, after.pose);
        A.poseDelta = pd;
        A.offset = { before: before.off, after: after.off };
        A.pass = !bad.length && pd.max < 1e-5;
        if (!A.pass) A.why = [bad.length ? `moveLog +${bad.map((e) => e.kind + (e.dur ? `(${e.dur}s)` : '')).join(',')}` : '', pd.max >= 1e-5 ? `pose moved (az ${pd.az.toFixed(4)}, el ${pd.el.toFixed(4)}, dist ${(pd.dist * 100).toFixed(2)}%, target ${pd.target.toFixed(3)})` : ''].filter(Boolean).join('; ');
      } catch (e) { A.pass = false; A.why = String(e.message || e); }
      rec.actions.push(A);
    }
    // overall: the camera at the end is the camera at the start (offset aside; a rotation may rebase it)
    const fin = poseBeforeRotate || await page.ev(`__nd.engine.getPose()`);
    const pd = poseDelta(base.pose, fin);
    rec.overall = { pass: pd.max < 1e-5 && rec.actions.every((a) => a.pass !== false), poseDelta: pd };
    rec.errors = page.errors();
  } catch (e) { rec.error = String(e.message || e); }
  rec.ms = Date.now() - t0;
  rep.camera.push(rec);
  const bad = rec.actions.filter((a) => a.pass === false);
  log(`  ${size.label.padEnd(9)} camera/${scenario.padEnd(8)} ${rec.error ? 'ERROR ' + rec.error : bad.length ? 'FAIL ' + bad.map((a) => `${a.name}: ${a.why}`).join(' | ') : 'ok'}  [${rec.actions.map((a) => a.name + (a.skipped ? '(skipped)' : '')).join(' ')}]  ${(rec.ms / 1000).toFixed(1)}s`);
}

/** reduced motion (§10, §12.4): the story waits on the first beat and 下一步 steps through every beat to the end */
async function runReduced(page, d, size, o, rep) {
  const url = `${o.base}?debug#/d/${d.id}`;
  const rec = { size: size.label, scenario: 'reduced', url, steps: [], src: Sources.stamp() + 1 };
  const t0 = Date.now();
  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  try {
    const b = await boot(page, url, o, { story: d.id });
    if (!b.ok) throw new Error(b.why);
    await page.call(pageCamInstall);
    await page.waitFor(`__nd.engine.moveLog.some((e) => e.kind === 'flight') && !__nd.engine.flight`, { timeout: 30000, every: 200 });
    await page.waitFor(`__nd.ui.story && (__nd.ui.story.captionShown || __nd.ui.story.ended)`, { timeout: 15000 });
    const read = () => page.ev(`(() => { const s = __nd.ui.story; return { beat: s.beat, ended: s.ended, playing: s.playing, cap: (document.querySelector('#st-cap') || {}).textContent || '', next: !!document.querySelector('#strip [data-act="next"]'), flight: __nd.engine.flight ? __nd.engine.flight.kind + ':' + __nd.engine.flight.dur : null }; })()`);
    const n = d.modBeats;
    for (let i = 0; i < n + 3; i++) {
      await sleep(250);
      const st = await read();
      rec.steps.push(st);
      if (st.ended) break;
      const tg = await page.call(pageTarget, '#strip [data-act="next"]');
      if (!tg) { rec.steps.push({ note: 'no 下一步 button' }); break; }
      if (tg.reach) await page.tap(tg.x, tg.y); else await page.call(pageClick, '#strip [data-act="next"]');
      await page.ev(`(${pageFrames.toString()})(3, 120)`);
    }
    rec.moves = await page.ev(`__nd.engine.moveLog.map((e) => e.kind + (e.dur ? '(' + Math.round(e.dur * 100) / 100 + ')' : '')).join(' ')`);
    const visited = rec.steps.filter((x) => 'beat' in x && !x.ended).map((x) => x.beat);
    const order = visited.every((v, i) => v === i) && visited.length === n;
    const playing = rec.steps.some((x) => x.playing);
    const caps = rec.steps.filter((x) => 'beat' in x && !x.ended).every((x) => x.cap === d.caps[x.beat]);
    const ended = rec.steps.some((x) => x.ended);
    const errs = page.errors().filter((e) => e.startsWith('exception'));
    rec.pass = order && !playing && caps && ended && !errs.length;
    rec.why = [!order && `visited beats ${visited.join(',')}`, playing && 'the story played by itself', !caps && 'a caption did not match its beat', !ended && 'never reached the end', errs.length && errs[0]].filter(Boolean).join('; ');
  } catch (e) { rec.pass = false; rec.why = String(e.message || e); }
  await page.send('Emulation.setEmulatedMedia', { features: [] });
  rec.ms = Date.now() - t0;
  rep.camera.push(rec);
  log(`  ${size.label.padEnd(9)} reduced         ${rec.pass ? 'ok' : 'FAIL ' + rec.why}  ${(rec.ms / 1000).toFixed(1)}s`);
}

/** the caption as laid out now */
function pageCaption() {
  const cap = document.querySelector('#st-cap');
  if (!cap || !(cap.checkVisibility ? cap.checkVisibility() : cap.offsetWidth)) return null;
  const range = document.createRange();
  range.selectNodeContents(cap);
  const tops = [];
  for (const r of range.getClientRects()) if (r.width > 0 && !tops.some((t) => Math.abs(t - r.top) < 3)) tops.push(r.top);
  const st = window.__nd.ui.story;
  return { text: cap.textContent, chars: cap.textContent.replace(/\s/g, '').length, sw: cap.scrollWidth, cw: cap.clientWidth, lines: tops.length, fs: parseFloat(getComputedStyle(cap).fontSize), beat: st?.beat ?? null, ended: !!st?.ended };
}

/** §12.4: "captions of 18 字 or fewer on one line at 375 px" — every beat, the end title and every lever caption */
async function runCaptions(page, d, o, rep) {
  const size = parseSize('375x812');
  await page.emulate(size);
  const rec = { size: size.label, items: [], src: Sources.stamp() + 1 };
  const t0 = Date.now();
  const judgeCap = (name, c) => {
    // a sentence of the story: up to 30 字 on at most two lines of the phone strip
    const pass = !!c && c.chars <= 30 && c.lines <= 2;
    rec.items.push({ name, pass, ...(c || { missing: true }) });
  };
  try {
    const b = await boot(page, `${o.base}?still#/d/${d.id}/1`, o, { story: d.id });
    if (!b.ok) throw new Error(b.why);
    for (let i = 0; i < d.modBeats; i++) {
      await page.ev(`(() => { __nd.ui.story.goto(${i}, { k: 1 }); return true; })()`);
      await page.call(pageFrames, 3, 80);
      judgeCap(`b${i + 1}`, await page.call(pageCaption));
    }
    await page.ev(`(() => { __nd.ui.story.toEnd(); return true; })()`);
    await page.call(pageFrames, 3, 80);
    judgeCap('end', await page.call(pageCaption));
    const L = d.modLever;
    // a lever's own caption replaces the title at the end (story.leverCaption)
    const levers = !L ? [] : L.kind === 'pick' ? [{ name: 'stamped-end', spec: { kind: 'pick', card: 0, stamped: true, at: 'end' } }]
      : (L.options || []).map((k) => ({ name: `lever-${k}-end`, spec: { kind: 'options', k, at: 'end', done: true } }));
    for (const lv of levers) {
      const bb = await boot(page, `${o.base}?still#/d/${d.id}/${(L.fromBeat ?? 0) + 1}`, o, { story: d.id });
      if (!bb.ok) { rec.items.push({ name: lv.name, pass: false, error: bb.why }); continue; }
      await page.call(pageLever, lv.spec);
      await page.call(pageFrames, 3, 80);
      judgeCap(lv.name, await page.call(pageCaption));
    }
  } catch (e) { rec.error = String(e.message || e); }
  rec.pass = !rec.error && rec.items.length > 0 && rec.items.every((x) => x.pass);
  rec.ms = Date.now() - t0;
  rep.captions = rec;
  const bad = rec.items.filter((x) => !x.pass);
  log(`  375x812   captions        ${rec.error ? 'ERROR ' + rec.error : bad.length ? 'FAIL ' + bad.map((x) => `${x.name} "${x.text ?? '-'}" (${x.chars ?? '?'} 字, ${x.sw}/${x.cw}px, ${x.lines} lines)`).join(' | ') : `ok (${rec.items.length}, longest ${Math.max(...rec.items.map((x) => x.sw || 0))}/${rec.items[0]?.cw}px)`}  ${(rec.ms / 1000).toFixed(1)}s`);
}

/** a cold first visit of the opening: paint timings (§12.4 "a readable first paint within 1 s") */
async function runFirstPaint(page, size, o, { throttle = false } = {}) {
  const rec = { size: size.label, mobile: size.mobile, throttle: throttle ? '4G (150 ms, 1.6 Mbit/s down) + CPU ×4' : 'none (local server)' };
  await page.emulate(size);
  let scriptId = null;
  try {
    // timings the page cannot report afterwards: when __nd, the boot and the first WebGL frame appeared
    const probe = `(() => { const t = {}; window.__vwPaint = t; const f = () => { const nd = window.__nd; const n = performance.now();
      if (!t.nd && nd) t.nd = n; if (!t.booted && nd && nd.ui && nd.ui.booted) t.booted = n;
      const fr = nd && nd.engine && nd.engine.renderer && nd.engine.renderer.info && nd.engine.renderer.info.render ? nd.engine.renderer.info.render.frame : 0;
      if (!t.frame && fr > 0) t.frame = n; if (!(t.booted && t.frame) && n < 120000) requestAnimationFrame(f); }; requestAnimationFrame(f); })();`;
    scriptId = (await page.send('Page.addScriptToEvaluateOnNewDocument', { source: probe })).identifier;
    await page.send('Network.clearBrowserCache');
    if (throttle) {
      await page.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
      await page.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    }
    const t0 = Date.now();
    await page.goto(`${o.base}?debug`);
    const up = await page.waitFor(`window.__vwPaint && window.__vwPaint.booted && window.__vwPaint.frame`, { timeout: (throttle ? 3 : 1) * o.timeout * 1000, every: 200 });
    await sleep(500);
    rec.timings = await page.ev(`new Promise((res) => {
      const nav = performance.getEntriesByType('navigation')[0] || {};
      const paint = Object.fromEntries(performance.getEntriesByType('paint').map((e) => [e.name, Math.round(e.startTime)]));
      let last = null;
      const desc = (el) => !el ? null : el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '');
      try { const po = new PerformanceObserver((l) => { for (const e of l.getEntries()) last = e; }); po.observe({ type: 'largest-contentful-paint', buffered: true });
        setTimeout(() => { po.disconnect(); done(); }, 300); } catch { done(); }
      function done() {
        const w = window.__vwPaint || {};
        const r = (v) => (v == null ? null : Math.round(v));
        res({ fcp: paint['first-contentful-paint'] ?? null, fp: paint['first-paint'] ?? null,
          lcp: last ? { t: r(last.startTime), el: desc(last.element), size: last.size, url: last.url ? last.url.split('/').pop() : '' } : null,
          domContentLoaded: r(nav.domContentLoadedEventEnd), load: r(nav.loadEventEnd), transferKB: Math.round(performance.getEntriesByType('resource').reduce((a, e) => a + (e.transferSize || e.encodedBodySize || 0), 0) / 1024),
          largest: performance.getEntriesByType('resource').map((e) => ({ name: e.name.split('/').slice(-2).join('/').split('?')[0], kb: Math.round((e.transferSize || e.encodedBodySize || 0) / 1024), end: r(e.responseEnd) })).sort((a, b) => b.kb - a.kb).slice(0, 6),
          resources: performance.getEntriesByType('resource').length, nd: r(w.nd), booted: r(w.booted), firstFrame: r(w.frame) });
      }
    })`);
    rec.booted = up;
    rec.ms = Date.now() - t0;
    const T = rec.timings;
    const readable = Math.max(T.fcp ?? Infinity, T.lcp?.t ?? T.fcp ?? Infinity);
    rec.readableMs = Number.isFinite(readable) ? readable : null;
    rec.pass = up && Number.isFinite(readable) && readable <= 1000;
    rec.level = throttle ? 'warn' : 'fail';
  } catch (e) { rec.error = String(e.message || e); rec.pass = false; rec.level = throttle ? 'warn' : 'fail'; }
  finally {
    if (throttle) {
      try { await page.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); } catch { /* */ }
      try { await page.send('Emulation.setCPUThrottlingRate', { rate: 1 }); } catch { /* */ }
    }
    if (scriptId) try { await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: scriptId }); } catch { /* */ }
  }
  const T = rec.timings || {};
  log(`  ${size.label.padEnd(9)} first paint${throttle ? ' 4G' : '   '}  ${rec.error ? 'ERROR ' + rec.error : (rec.pass ? 'ok' : rec.level === 'warn' ? 'slow' : 'FAIL')}  fcp ${T.fcp ?? '-'} ms · lcp ${T.lcp?.t ?? '-'} ms (${T.lcp?.el ?? '-'}${T.lcp?.url ? ' ' + T.lcp.url : ''}) · boot ${T.booted ?? '-'} ms · first frame ${T.firstFrame ?? '-'} ms · ${T.transferKB ?? '-'} KB`);
  return rec;
}

// ---------------------------------------------------------------------------------------------- contact sheet
const escH = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function contactHTML(d, rep, o, sizes) {
  const H = 360;
  const byState = new Map();
  for (const r of rep.states) { if (!byState.has(r.state)) byState.set(r.state, { label: r.label, cells: {} }); byState.get(r.state).cells[r.size] = r; }
  const cell = (r, size) => {
    if (!r) return `<td class="na">—</td>`;
    const w = Math.round((H * size.w) / size.h);
    const f = r.checks ? failed(r.checks) : ['run'];
    const wn = r.checks ? warned(r.checks) : [];
    const m = r.measure;
    let svg = '';
    if (m) {
      const rect = (b, cls) => (b && b.w > 0 ? `<rect class="${cls}" x="${b.x0}" y="${b.y0}" width="${b.w}" height="${b.h}"/>` : '');
      const fr = m.free;
      svg = `<svg viewBox="0 0 ${size.w} ${size.h}" preserveAspectRatio="none">
        <rect class="free" x="${fr.x}" y="${fr.y}" width="${fr.w}" height="${fr.h}"/>
        ${(m.parts || []).map((p) => rect(p.body && p.body.w > 0 ? p.body : p.proxy, (p.proxy && Math.max(p.proxy.w, p.proxy.h) >= 40 && (p.inside || (p.anchorIn !== false && p.visPx >= 40))) ? 'part' : 'part bad')).join('')}
        ${m.actor ? rect(m.actor.proxy, (m.actor.proxy?.h ?? 0) >= 60 ? 'actor' : 'actor bad') : ''}
      </svg>`;
    }
    const multi = (rep.sources || []).length > 1;
    const nums = (m ? `actor ${m.actor?.proxy?.h ?? '–'}px${m.actor?.body ? ` (body ${m.actor.body.h})` : ''} · nodes ${m.counts.nodes} · world ${Math.round(m.worldShare * 100)}%` : '') + (multi && r.src ? ` · files v${r.src}` : '');
    const detail = f.map((k) => {
      const c = r.checks[k];
      if (k === 'parts') return `parts: ${(c.fails || []).map((id) => { const p = c.value.find((x) => x.id === id); return `${id} ${p?.px ?? '?'}px${p && !p.inside ? ' out' : ''}`; }).join(', ')}`;
      if (k === 'overlap') return `overlap: ${(c.pairs || []).slice(0, 3).map((p) => `${p.a} × ${p.b}`).join('; ')}`;
      if (k === 'targets') return `targets: ${(c.items || []).slice(0, 3).join('; ')}`;
      if (k === 'text') return `text: ${(c.items || []).slice(0, 3).join('; ')}`;
      if (k === 'caption') return `caption: ${JSON.stringify(c.value)}`;
      if (k === 'actor') return `actor ${c.value}px < 60`;
      return `${k}: ${typeof c.value === 'object' ? JSON.stringify(c.value).slice(0, 80) : c.value}`;
    });
    return `<td><div class="img" style="width:${w}px;height:${H}px">${r.screenshot ? `<img src="${escH(r.screenshot)}" width="${w}" height="${H}">` : '<div class="err">no screenshot</div>'}${svg}</div>
      <div class="meta ${f.length ? 'bad' : 'good'}">${f.length ? 'FAIL' : 'ok'} <span>${escH(nums)}</span></div>
      ${detail.length ? `<ul>${detail.map((x) => `<li>${escH(x)}</li>`).join('')}</ul>` : ''}${wn.length ? `<div class="warn">warn: ${escH(wn.join(', '))}</div>` : ''}${r.error ? `<div class="err">${escH(r.error)}</div>` : ''}</td>`;
  };
  const rows = [...byState.entries()].map(([name, s]) => `<tr><th><b>${escH(name)}</b><br><small>${escH(s.label)}</small><br><small class="cap">${escH(Object.values(s.cells)[0]?.measure?.story?.caption || '')}</small></th>${sizes.map((z) => cell(s.cells[z.label], z)).join('')}</tr>`).join('');
  const cam = rep.camera.map((c) => c.scenario === 'reduced'
    ? `<li><b>${escH(c.size)} · reduced motion</b> ${c.pass ? '<span class="good">ok</span>' : `<span class="bad">FAIL ${escH(c.why)}</span>`} — beats ${c.steps.filter((x) => 'beat' in x).map((x) => (x.ended ? 'end' : x.beat + 1)).join(' → ')}</li>`
    : `<li><b>${escH(c.size)} · ${escH(c.scenario)}</b> ${c.error ? `<span class="bad">${escH(c.error)}</span>` : c.overall?.pass ? '<span class="good">ok</span>' : '<span class="bad">FAIL</span>'} — ${c.actions.map((a) => `${escH(a.name)}${a.skipped ? ' (skipped)' : a.pass ? '' : ` <span class="bad">✕ ${escH(a.why || '')}</span>`}`).join(' · ')}</li>`).join('');
  const contract = (rep.contract || []).map((c) => `<li class="${c.pass ? 'good' : c.level === 'warn' ? 'warnc' : 'bad'}">${c.pass ? 'ok' : c.level === 'warn' ? 'warn' : 'FAIL'} · ${escH(c.name)}${c.pass ? '' : ` — ${escH(JSON.stringify(c.detail).slice(0, 220))}`}</li>`).join('');
  const capRec = rep.captions;
  const caps = !capRec ? '<li>not run</li>' : capRec.error ? `<li class="bad">${escH(capRec.error)}</li>` : capRec.items.map((x) => `<li class="${x.pass ? 'good' : 'bad'}">${x.pass ? 'ok' : 'FAIL'} · ${escH(x.name)} 「${escH(x.text ?? '—')}」 ${x.chars ?? '?'} 字 · ${x.sw ?? '?'}/${x.cw ?? '?'} px · ${x.lines ?? '?'} line${x.lines === 1 ? '' : 's'}</li>`).join('');
  const paint = (o.firstPaint || []).map((p) => `<li class="${p.pass ? 'good' : p.level === 'warn' ? 'warnc' : 'bad'}">${p.pass ? 'ok' : p.level === 'warn' ? 'slow' : 'FAIL'} · ${escH(p.size)} · ${escH(p.throttle)} — ${p.error ? escH(p.error) : `FCP ${p.timings?.fcp ?? '–'} ms · LCP ${p.timings?.lcp?.t ?? '–'} ms (${escH(p.timings?.lcp?.el || '–')}) · boot ${p.timings?.booted ?? '–'} ms · first WebGL frame ${p.timings?.firstFrame ?? '–'} ms · ${p.timings?.transferKB ?? '–'} KB`}</li>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>contact ${escH(d.id)}</title><style>
    body { margin: 0; padding: 24px; background: #f4f0e8; color: #262423; font: 13px/1.4 system-ui, "Microsoft JhengHei", "Noto Sans TC", sans-serif; }
    h1 { font-size: 22px; margin: 0 0 4px; } .sub { color: #6a645c; margin-bottom: 16px; }
    table { border-collapse: separate; border-spacing: 12px 14px; } th { text-align: left; vertical-align: top; width: 150px; font-weight: 400; }
    th .cap { color: #6a645c; } td { vertical-align: top; } td.na { color: #aaa; }
    .img { position: relative; overflow: hidden; background: #ddd; box-shadow: 0 0 0 1px #c9c2b6; } .img img { display: block; }
    .img svg { position: absolute; inset: 0; width: 100%; height: 100%; }
    .img .free { fill: none; stroke: #2a7fd4; stroke-width: 2; stroke-dasharray: 8 6; vector-effect: non-scaling-stroke; }
    .img .actor { fill: none; stroke: #1b9e4b; stroke-width: 2; vector-effect: non-scaling-stroke; } .img .part { fill: none; stroke: #e08a00; stroke-width: 1.5; vector-effect: non-scaling-stroke; }
    .img .bad { stroke: #d62828; stroke-width: 2.5; }
    .meta { margin-top: 4px; font-weight: 700; } .meta span { font-weight: 400; color: #6a645c; }
    .good { color: #1b7a3d; } .bad { color: #c21f1f; } .warnc, .warn { color: #a06400; } .err { color: #c21f1f; }
    ul { margin: 2px 0 0; padding-left: 16px; max-width: 420px; color: #c21f1f; } li { margin: 1px 0; }
    .cols { display: flex; gap: 40px; margin: 8px 0 18px; } .cols > div { max-width: 900px; } .cols ul { color: inherit; max-width: none; }
    .legend span { display: inline-block; margin-right: 14px; }
  </style></head><body>
  <h1>${escH(d.pill)} (${escH(d.id)}) · verifier contact sheet</h1>
  <div class="sub">${escH(rep.when)} · ${escH(o.base)} · ${escH(rep.chrome || '')} · ${escH(rep.gl || '')} · <span class="legend"><span style="color:#2a7fd4">- - free rect</span><span style="color:#1b9e4b">□ main actor (hit proxy)</span><span style="color:#e08a00">□ emphasised parts (geometry)</span><span style="color:#d62828">□ failing</span></span></div>
  ${(rep.sources || []).length > 1 ? `<div class="warn">The files changed on disk during the run: ${rep.sources.slice(1).map((s) => `v${s.v} at ${escH(s.local || s.at.slice(11, 19))} (${escH(s.changed.map((f) => f.split('/').pop()).join(', '))})`).join(' · ')}. Each cell names the version it was measured on.</div>` : ''}
  <div class="cols"><div><b>Module contract</b><ul>${contract || '<li>—</li>'}</ul></div><div><b>Camera contract</b><ul>${cam || '<li>not run</li>'}</ul><b>Captions at 375 × 812</b><ul>${caps}</ul><b>First paint (cold, the opening)</b><ul>${paint || '<li>not run</li>'}</ul></div></div>
  <table><tr><th></th>${sizes.map((z) => `<th>${escH(z.label)}${z.mobile ? ` · phone @${z.dpr}` : ' · desktop'}</th>`).join('')}</tr>${rows}</table>
  </body></html>`;
}

async function renderContact(page, file, png) {
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  page.size = null;
  await page.goto(pathToFileURL(file).href);
  await page.waitFor(`document.readyState === 'complete' && [...document.images].every((i) => i.complete)`, { timeout: 30000 });
  const dim = await page.ev(`({ w: Math.ceil(document.documentElement.scrollWidth), h: Math.ceil(document.documentElement.scrollHeight) })`);
  const w = Math.min(8000, Math.max(800, dim.w)), h = Math.min(16000, Math.max(400, dim.h));
  await page.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await sleep(300);
  await page.shot(png);
  return { w, h };
}

// ---------------------------------------------------------------------------------------------- main
async function main() {
  let o;
  try { o = parseArgs(process.argv.slice(2)); } catch (e) { console.error(String(e.message)); process.exit(2); }
  if (o.help) {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split(/\r?\nimport /)[0].split(/\r?\n/).filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
    return 0;
  }
  LOGV = o.verbose;
  fs.mkdirSync(o.out, { recursive: true });
  const started = Date.now();
  log(`verify_world · ${o.base} · sizes ${o.sizeList.map((s) => s.label).join(', ')} · out ${o.out}`);
  let ch;
  const stop = async () => { if (ch) { const c = ch; ch = null; await c.close(); } };
  process.on('SIGINT', async () => { await stop(); process.exit(130); });
  const report = { when: new Date().toISOString(), base: o.base, sizes: o.sizeList, options: { only: o.only, still: o.still, camera: o.camera, autoplay: o.autoplay, captions: o.captions, paint: o.paint, swiftshader: o.swiftshader, overrides: o.overrides }, districts: {}, skipped: [], firstPaint: [], summary: {} };
  if (o.overrides.length) log(`overrides: ${o.overrides.map((x) => `${x.path} ← ${x.file}`).join(', ')}`);
  let exit = 0;
  let srv = null;
  const serveOwn = async (why) => {
    srv = await startServer(WORLD_DIR, o.servePort);
    o.ownServer = { from: o.base, url: srv.url, why };
    report.served = { root: WORLD_DIR, url: srv.url, insteadOf: o.base, why, at: new Date().toISOString() };
    log(`serving ${WORLD_DIR} from this tool at ${srv.url} (${why})`);
    o.base = srv.url;
  };
  try {
    // the app server: the shared one if it answers, else our own (an explicit --base must answer)
    if (o.serve) await serveOwn('--serve');
    else if (!(await reachable(o.base))) {
      if (o.baseGiven) throw new Error(`${o.base} does not answer (add --serve to let the tool serve world/ itself)`);
      await serveOwn(`${o.base} does not answer`);
    } else o.fallbackServe = () => serveOwn(`${o.base} stopped answering during the run`);
    ch = await launchChrome(o);
    report.chrome = ch.version.product;
    const page = ch.page;
    // ---- discover (one load, on the map)
    await page.emulate(o.sizeList.find((s) => !s.mobile) || o.sizeList[0]);
    const b0 = await boot(page, `${o.base}?still#/map`, o);
    if (!b0.ok) throw new Error(`the app did not boot on ?still#/map: ${b0.why} ${(b0.errors || []).join(' | ')}`);
    const disc = await page.call(pageDiscover);
    report.gl = disc.gl;
    report.programsOnMap = disc.programs;
    log(`renderer: ${disc.gl} · programs on #/map: ${disc.programs}`);
    const targets = [];
    for (const d of disc.districts) {
      if (o.only && !o.only.includes(d.id)) continue;
      if (!d.dataBeats && !d.modBeats) { if (o.only) report.skipped.push({ id: d.id, note: 'legacy district (no beats in the copy or the module)' }); continue; }
      if (!d.modBeats) { report.skipped.push({ id: d.id, note: `world.json has ${d.dataBeats} beats but the module exports none yet (not rebuilt): skipped` }); continue; }
      if (!d.dataBeats) { report.skipped.push({ id: d.id, note: `the module has ${d.modBeats} beats but world.json has none: the UI will not tell it as a story; skipped` }); continue; }
      targets.push(d);
    }
    for (const s of report.skipped) log(`skip ${s.id}: ${s.note}`);
    Sources.files = [...targets.map((d) => `assets/js/d-${d.id}.js`), ...WATCH];
    report.sources = Sources.list;
    Sources.stamp();
    if (o.only) for (const id of o.only) if (!disc.districts.some((d) => d.id === id)) report.skipped.push({ id, note: 'no such district' });
    // ---- the module contract per district (on this map page; it is reloaded afterwards)
    for (const d of targets) {
      const R = { id: d.id, pill: d.pill, discover: d, contract: [], contractSrc: Sources.stamp() + 1, states: [], camera: [], when: report.when, chrome: report.chrome, gl: report.gl, sources: Sources.list };
      report.districts[d.id] = R;
      try { R.contract = await page.call(pageContract, d.id); } catch (e) { R.contract = [{ name: 'contract run', pass: false, level: 'fail', detail: String(e.message || e) }]; }
      for (const c of R.contract) if (!c.pass) log(`  ${d.id} contract ${c.level === 'warn' ? 'warn' : 'FAIL'}: ${c.name} ${JSON.stringify(c.detail).slice(0, 200)}`);
      // the contract run poses the module directly: reload before anything is measured
      await boot(page, `${o.base}?still#/map`, o);
    }
    // ---- states and camera, size by size
    for (const size of o.sizeList) {
      await page.emulate(size);
      for (const d of targets) {
        const R = report.districts[d.id];
        log(`${d.id} @ ${size.label}${size.mobile ? ` (mobile, DPR ${size.dpr})` : ' (desktop)'}`);
        if (o.still) await runStill(page, d, size, o, R);
        if (o.camera) {
          await runCamera(page, d, size, o, R, 'end');
          if (o.autoplay) await runCamera(page, d, size, o, R, 'autoplay');
          await runReduced(page, d, size, o, R);
        }
      }
    }
    // ---- captions at 375 px, per district
    if (o.captions) for (const d of targets) { log(`${d.id} @ 375x812 (captions)`); await runCaptions(page, d, o, report.districts[d.id]); }
    // ---- first paint: the first phone size and the first desktop size, cold; the phone once more on a slow link
    if (o.paint) {
      log('first paint (cold, #/ opening)');
      const ph = o.sizeList.find((s) => s.mobile), dk = o.sizeList.find((s) => !s.mobile);
      for (const s of [ph, dk].filter(Boolean)) report.firstPaint.push(await runFirstPaint(page, s, o));
      if (ph) report.firstPaint.push(await runFirstPaint(page, ph, o, { throttle: true }));
    }
    // ---- contact sheets
    for (const d of targets) {
      const R = report.districts[d.id];
      const html = path.join(o.out, `contact-${d.id}.html`);
      fs.writeFileSync(html, contactHTML(d, R, { ...o, firstPaint: report.firstPaint }, o.sizeList));
      const png = path.join(o.out, `contact-${d.id}.png`);
      try { R.contactSheet = { html, png, ...(await renderContact(page, html, png)) }; } catch (e) { R.contactSheet = { html, error: String(e.message || e) }; }
      log(`contact sheet: ${png}`);
    }
    // ---- summary
    const S = report.summary;
    S.byCheck = {};
    let fails = 0, warns = 0, states = 0, camFails = 0, contractFails = 0, captionFails = 0;
    for (const R of Object.values(report.districts)) {
      for (const st of R.states) {
        states++;
        for (const [k, v] of Object.entries(st.checks || {})) {
          const e = (S.byCheck[k] ||= { pass: 0, fail: 0, warn: 0, failing: [] });
          if (v.pass) e.pass++;
          else if (v.level === 'warn') { e.warn++; warns++; }
          else { e.fail++; fails++; if (e.failing.length < 40) e.failing.push(`${R.id}/${st.size}/${st.state}`); }
        }
      }
      for (const c of R.camera) if (c.scenario === 'reduced' ? !c.pass : c.error || !c.overall?.pass) camFails++;
      for (const c of R.contract) if (!c.pass && c.level !== 'warn') contractFails++;
      if (R.captions && !R.captions.pass) captionFails++;
    }
    const paintFails = report.firstPaint.filter((p) => !p.pass && p.level !== 'warn').length;
    Object.assign(S, { districts: Object.keys(report.districts), skipped: report.skipped, states, stateCheckFails: fails, stateCheckWarns: warns, cameraFails: camFails, contractFails, captionFails, paintFails,
      firstPaint: report.firstPaint.map((p) => ({ size: p.size, throttle: p.throttle, pass: p.pass, level: p.level, readableMs: p.readableMs, fcp: p.timings?.fcp, lcp: p.timings?.lcp?.t, lcpElement: p.timings?.lcp?.el, booted: p.timings?.booted, firstFrame: p.timings?.firstFrame, error: p.error })),
      sourceVersions: Sources.list.length, changedDuringRun: dedupe(Sources.list.slice(1).flatMap((s) => s.changed)),
      seconds: Math.round((Date.now() - started) / 1000) });
    exit = fails || camFails || contractFails || captionFails || paintFails ? 1 : 0;
    if (!targets.length) { S.note = 'no district is told in beats yet: nothing was measured'; exit = 0; }
  } catch (e) {
    console.error('verify_world:', e.stack || e.message || e);
    report.error = String(e.message || e);
    exit = 2;
  } finally {
    await stop();
    if (srv) await srv.close();
  }
  const rp = path.join(o.out, 'report.json');
  fs.writeFileSync(rp, JSON.stringify(report, null, 1));
  const S = report.summary;
  log('');
  log(`report: ${rp}`);
  if (S.byCheck) {
    log(`states ${S.states} · failed checks ${S.stateCheckFails} · warnings ${S.stateCheckWarns} · camera failures ${S.cameraFails} · contract failures ${S.contractFails} · caption failures ${S.captionFails} · first-paint failures ${S.paintFails} · ${S.seconds}s`);
    for (const [k, v] of Object.entries(S.byCheck)) if (v.fail || v.warn) log(`  ${k.padEnd(12)} pass ${v.pass} fail ${v.fail} warn ${v.warn}${v.failing.length ? '  e.g. ' + v.failing.slice(0, 4).join(' ') : ''}`);
  }
  if (S.changedDuringRun?.length) log(`note: ${S.changedDuringRun.join(', ')} changed during the run (${S.sourceVersions} versions; every state records its version in "src")`);
  if (S.note) log(S.note);
  return exit;
}

main().then((c) => process.exit(c), (e) => { console.error(e); process.exit(2); });
