// A headless Chrome that leaves nothing behind, shared by the verifier and the screenshot / recording scripts.
//
//   • a fresh temporary profile under <tmp>/nd-chrome/ with a marker file, so only profiles this module made are ever
//     removed; a profile path the caller passes in is used as given and removed only if it carries the marker (it was
//     empty or new when the run started)
//   • no disk caches (HTTP, media, GPU shaders) and no background downloads (components, optimisation models, sync …):
//     a fresh profile used to grow to about 80 MB, mostly shader and model caches
//   • close() stops our Chrome (only processes whose command line holds the profile path; never chrome.exe by name)
//     and deletes the profile; the same happens if the caller exits, is interrupted or crashes, and profiles left by
//     dead runs are swept on the next launch
//
// Usage:
//   import { launch } from '…/tools/chrome_lite.mjs';
//   const ch = await launch({ tag: 'stills', windowSize: '1440,900' });   // → { ws, port, profile, proc, close }
//   … talk CDP to ch.ws …
//   await ch.close();
//
// Node 22, no dependencies.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const CHROME_CANDIDATES = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

/** no caches on disk, no background downloads into the profile */
export const LITE_FLAGS = [
  '--disk-cache-size=1', '--media-cache-size=1', '--disable-gpu-shader-disk-cache',
  '--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-pings',
  '--disable-domain-reliability', '--disable-breakpad', '--metrics-recording-only',
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--disable-features=OptimizationGuideModelDownloading,OptimizationHintsFetching,OptimizationTargetPrediction,OnDeviceModelService,Translate,MediaRouter,AutofillServerCommunication,CertificateTransparencyComponentUpdater',
];

/** the real GPU (ANGLE on D3D11 on Windows), or SwiftShader for a machine without a usable GPU */
export const gpuFlags = (swiftshader = false) => (swiftshader ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  : ['--enable-gpu', '--ignore-gpu-blocklist', ...(process.platform === 'win32' ? ['--use-angle=d3d11'] : [])]);

const ROOT = path.join(os.tmpdir(), 'nd-chrome');
const MARK = '.nd-chrome-profile';
const norm = (p) => p.replace(/\\/g, '/').toLowerCase();
const sleepSync = (ms) => { try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch { /* */ } };

export function findChrome() {
  return CHROME_CANDIDATES.find((p) => { try { return fs.statSync(p).isFile(); } catch { return false; } }) || null;
}

/** is this a profile this module made (or adopted while it was empty)? */
export function isOurs(dir) {
  try { return fs.statSync(path.join(dir, MARK)).isFile(); } catch { return false; }
}

function mark(dir) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, MARK), JSON.stringify({ pid: process.pid, started: new Date().toISOString() }));
}

/** a new temporary profile directory (marked) */
export function makeProfile(tag = 'run') {
  sweep();
  const dir = path.join(ROOT, `${String(tag).replace(/[^\w.-]+/g, '_')}-${process.pid}-${Date.now().toString(36)}`);
  mark(dir);
  return dir;
}

/** a caller's profile path: adopted (marked, removable) when new or empty; otherwise used as is and never removed */
export function adoptProfile(dir) {
  dir = path.resolve(dir);
  let entries = null;
  try { entries = fs.readdirSync(dir); } catch { /* does not exist */ }
  if (!entries || !entries.length) mark(dir);
  return dir;
}

/** chrome processes whose command line holds our profile path (never anything else) */
export function ownChromePids(profile) {
  const marker = norm(profile);
  if (process.platform !== 'win32') {
    try {
      const out = execFileSync('ps', ['-eo', 'pid=,args='], { encoding: 'utf8' });
      return out.split('\n').filter((l) => norm(l).includes(marker)).map((l) => +l.trim().split(/\s+/)[0]).filter(Boolean);
    } catch { return []; }
  }
  const ps = `Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | ForEach-Object { "$($_.ProcessId)\`t$($_.CommandLine)" }`;
  try {
    const out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8', windowsHide: true, maxBuffer: 64 << 20 });
    return out.split(/\r?\n/).map((l) => l.split('\t')).filter(([pid, cmd]) => pid && cmd && norm(cmd).includes(marker)).map(([pid]) => +pid);
  } catch { return []; }
}

export function killOwnChrome(profile) {
  const pids = ownChromePids(profile);
  for (const pid of pids) {
    try {
      if (process.platform === 'win32') execFileSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
      else process.kill(pid, 'SIGKILL');
    } catch { /* already gone */ }
  }
  return pids.length;
}

/** delete a profile this module made; Chrome may hold files for a moment after it exits, so retry.  The marker goes
 *  last: a profile that cannot be removed yet (a file still locked) keeps it, so a later sweep() finishes the job */
export function removeProfile(dir) {
  if (!dir || !isOurs(dir)) return false;
  for (let i = 0; i < 12; i++) {
    let left = 0;
    for (const name of fs.readdirSync(dir)) {
      if (name === MARK) continue;
      try { fs.rmSync(path.join(dir, name), { recursive: true, force: true, maxRetries: 2, retryDelay: 100 }); } catch { left++; }
    }
    if (!left) {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* locked */ }
      if (!fs.existsSync(dir)) return true;
    }
    sleepSync(250);
  }
  return !fs.existsSync(dir);
}

const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };

/** profiles left by runs that died (their process is gone), older than ten minutes */
export function sweep() {
  let list = [];
  try { list = fs.readdirSync(ROOT); } catch { return 0; }
  let n = 0;
  for (const name of list) {
    const dir = path.join(ROOT, name);
    try {
      let m;
      try { m = JSON.parse(fs.readFileSync(path.join(dir, MARK), 'utf8')); } catch {
        // a profile whose removal was cut short before this module kept the marker for last: it is still one of ours
        // when it sits in ROOT under makeProfile's name (<tag>-<pid>-<time>) and holds a Chrome profile
        const g = /^[\w.-]+-(\d+)-([0-9a-z]+)$/.exec(name);
        if (!g || !fs.existsSync(path.join(dir, 'Local State'))) continue;
        m = { pid: +g[1], started: new Date(parseInt(g[2], 36)).toISOString() };
        if (alive(m.pid) || Date.now() - Date.parse(m.started) < 10 * 60e3 || ownChromePids(dir).length) continue;
        mark(dir);
      }
      if (alive(m.pid) || Date.now() - Date.parse(m.started) < 10 * 60e3) continue;
      if (ownChromePids(dir).length) continue;
      if (removeProfile(dir)) n++;
    } catch { /* not ours, or unreadable */ }
  }
  return n;
}

const live = new Set();
let hooked = false;
function hookExit() {
  if (hooked) return;
  hooked = true;
  const cleanAll = () => { for (const p of live) { killOwnChrome(p); removeProfile(p); } live.clear(); };
  process.on('exit', cleanAll);
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.once(sig, () => { cleanAll(); process.exit(130); });
  process.once('uncaughtException', (e) => { cleanAll(); console.error(e); process.exit(2); });
}

/**
 * Start a headless Chrome.
 * @param {object} o  { tag, profile?, keep?, chrome?, swiftshader?, windowSize?, args? (extra flags), port? (0 = any) }
 * @returns {Promise<{ ws: string, port: number, profile: string, proc, close: () => Promise<void> }>}
 */
export async function launch(o = {}) {
  const chrome = o.chrome || findChrome();
  if (!chrome) throw new Error('Chrome not found (set CHROME=…)');
  const profile = o.profile ? adoptProfile(o.profile) : makeProfile(o.tag || 'run');
  const removable = !o.keep && isOurs(profile);
  if (killOwnChrome(profile)) sleepSync(800);
  const portFile = path.join(profile, 'DevToolsActivePort');
  try { fs.rmSync(portFile); } catch { /* none */ }
  const extra = o.args || [];
  const flags = [...new Set(['--headless=new', '--disable-gpu-sandbox', ...gpuFlags(o.swiftshader), '--hide-scrollbars', '--mute-audio',
    ...LITE_FLAGS, ...extra])].filter((f) => !f.startsWith('--user-data-dir') && !f.startsWith('--remote-debugging-port'));
  const args = [...flags, `--user-data-dir=${profile}`, `--remote-debugging-port=${o.port ?? 0}`, `--window-size=${o.windowSize || '1440,900'}`, 'about:blank'];
  const proc = spawn(chrome, args, { stdio: 'ignore', windowsHide: true });
  if (removable) { live.add(profile); hookExit(); }
  let ws = null, port = 0;
  for (let i = 0; i < 160 && !ws; i++) {
    await new Promise((r) => setTimeout(r, 250));
    try {
      const [p, url] = fs.readFileSync(portFile, 'utf8').split(/\r?\n/);
      if (p && url) { port = +p; ws = `ws://127.0.0.1:${p}${url}`; }
    } catch { /* not yet */ }
  }
  const close = async () => {
    killOwnChrome(profile);
    try { proc.kill(); } catch { /* */ }
    await new Promise((r) => setTimeout(r, 400));
    if (removable) { removeProfile(profile); live.delete(profile); }
  };
  if (!ws) { await close(); throw new Error('Chrome did not open its DevTools port'); }
  return { ws, port, profile, proc, close };
}
