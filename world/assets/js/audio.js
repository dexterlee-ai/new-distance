// Sound: off by default, started only by the reader's own click (never autoplay).
// A felt-piano bed loops with a crossfade; diving under the world swaps it for the undercurrent drone;
// reading ducks everything.  One-shots are sparse: a whoosh for long flights, a pencil stroke when a district
// opens, a page turn for the reader, typewriter taps when answering, a chime when the People Model answers.

const BASE = 'assets/audio/';
const BED = 'world.mp3', UNDER = 'under.mp3';
const SFX = {
  whoosh: ['whoosh_1.mp3', 'whoosh_2.mp3'],
  pencil: ['pencil_1.mp3', 'pencil_2.mp3', 'pencil_3.mp3'],
  page: ['page_1.mp3', 'page_2.mp3'],
  type: ['type_1.mp3', 'type_2.mp3', 'type_3.mp3'],
  chime: ['chime_1.mp3', 'chime_2.mp3'],
};
const LEVEL = { bed: 0.55, under: 0.7, sfx: { whoosh: 0.32, pencil: 0.45, page: 0.5, type: 0.35, chime: 0.4 } };

export class Sound {
  constructor() {
    this.on = false;
    this.ctx = null;
    this.buf = {};
    this.night = 0;
    this.duck = 1;
    this.loading = null;
  }

  async enable() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
      this.bedGain = this.ctx.createGain(); this.bedGain.connect(this.master);
      this.underGain = this.ctx.createGain(); this.underGain.gain.value = 0; this.underGain.connect(this.master);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(this.master);
      this.loading = this._loadAll();
      // a hidden tab goes quiet; coming back resumes only if the reader still wants sound
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.ctx.suspend();
        else if (this.on) this.ctx.resume();
      });
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    await this.loading;
    this.on = true;
    if (!this.bedTimer) this._startBed();
    if (!this.underSrc) this._startUnder();
    this.master.gain.setTargetAtTime(1, this.ctx.currentTime, 0.6);
    return true;
  }

  disable() {
    if (!this.ctx) return;
    this.on = false;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
    setTimeout(() => { if (!this.on) this.ctx.suspend(); }, 1200);
  }

  async _load(name) {
    if (this.buf[name]) return this.buf[name];
    const r = await fetch(BASE + name);
    if (!r.ok) throw new Error(name);
    const data = await r.arrayBuffer();
    this.buf[name] = await new Promise((res, rej) => this.ctx.decodeAudioData(data, res, rej));
    return this.buf[name];
  }

  _loadAll() {
    const names = [BED, UNDER, ...Object.values(SFX).flat()];
    return Promise.allSettled(names.map((n) => this._load(n)));
  }

  // the bed: overlapping copies so the loop point is a 6 s crossfade, not a gap
  _startBed() {
    const b = this.buf[BED];
    if (!b) return;
    const X = 6;
    const play = (at) => {
      const src = this.ctx.createBufferSource();
      src.buffer = b;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(LEVEL.bed, at + X);
      g.gain.setValueAtTime(LEVEL.bed, at + b.duration - X);
      g.gain.linearRampToValueAtTime(0, at + b.duration);
      src.connect(g).connect(this.bedGain);
      src.start(at);
      const next = at + b.duration - X;
      // context time stands still while suspended (sound off, tab hidden): wait instead of queueing copies
      const due = () => {
        if (this.ctx.state !== 'running') { this.bedTimer = setTimeout(due, 1000); return; }
        play(next);
      };
      this.bedTimer = setTimeout(due, Math.max(0, (next - this.ctx.currentTime - 2) * 1000));
    };
    play(this.ctx.currentTime + 0.05);
  }

  _startUnder() {
    const b = this.buf[UNDER];
    if (!b) return;
    const src = this.ctx.createBufferSource();
    src.buffer = b;
    src.loop = true;
    const g = this.ctx.createGain();
    g.gain.value = LEVEL.under;
    src.connect(g).connect(this.underGain);
    src.start();
    this.underSrc = src;
  }

  /** called every frame with the world's night amount (0 day … 1 under the disk) */
  frame(night, reading) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime;
    const duck = reading ? 0.45 : 1;
    if (Math.abs(night - this.night) > 0.01 || duck !== this.duck) {
      this.night = night; this.duck = duck;
      this.bedGain.gain.setTargetAtTime((1 - night * 0.85) * duck, t, 0.4);
      this.underGain.gain.setTargetAtTime(night * duck, t, 0.4);
    }
  }

  play(kind, vol = 1) {
    if (!this.on || !this.ctx) return;
    const list = SFX[kind];
    if (!list) return;
    const b = this.buf[list[Math.floor(Math.random() * list.length)]];
    if (!b) return;
    const src = this.ctx.createBufferSource();
    src.buffer = b;
    src.playbackRate.value = 0.94 + Math.random() * 0.12;
    const g = this.ctx.createGain();
    g.gain.value = (LEVEL.sfx[kind] || 0.4) * vol;
    src.connect(g).connect(this.sfxGain);
    src.start();
  }
}
