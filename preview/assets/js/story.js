// A district told as beats: the picture changes first, then the caption names it (at the beat's keyAt).
// It plays itself once on a first visit; the first touch on the beat controls hands the pace to the reader.
// Everything shown is a pure function of (beat, k, lever) — the module's pose() — so jumping, replaying,
// reduced motion and ?still screenshots all land on the same frame.  Runs on the real clock.
import { clamp } from './kit.js';

export class Story {
  /**
   * @param {object} mod   district module (beats, pose, rest, emphasize, lever)
   * @param {object} copy  the district's world.json entry (beats[].cap, lever, …)
   * @param {object} o     { reduced, onState(state, why) }
   */
  constructor(mod, copy, { reduced = false, onState = () => {} } = {}) {
    this.mod = mod;
    this.copy = copy;
    this.reduced = reduced;
    this.onState = onState;
    this.n = mod.beats.length;
    // each caption is held long enough to be read
    this.holds = mod.beats.map((b, i) => b.hold ?? holdFor(copy.beats?.[i]?.cap));
    this.lever = mod.lever ? mod.lever.def : null;
    this.beat = 0;
    this.k = 0;          // 0…1 through the current beat's motion
    this.t = 0;          // seconds into the current beat
    this.playing = false;
    this.auto = false;   // autoplay (first visit) advances by itself; reader pacing does not
    this.ended = false;
    this.captionShown = false;
    this.focusPart = null;
  }

  get state() {
    return { beat: this.beat, k: this.k, t: this.t, playing: this.playing, auto: this.auto, ended: this.ended, lever: this.lever, captionShown: this.captionShown, n: this.n };
  }

  /** the caption the strip should show now: the beat's, once its key event has landed; the title at the end */
  caption() {
    if (this.ended) return this.leverCaption() || this.copy.title;
    // the reader's own choice (換你試試) changes what the replayed beats show, so its words name them
    const L = this.mod.lever;
    if (L && this.captionShown && this.beat === this.n - 1 && this.beat >= (L.fromBeat ?? 0) && typeof this.lever !== 'object') {
      const own = this.leverCaption();
      if (own) return own;
    }
    if (!this.captionShown) return this.beat > 0 ? this.copy.beats[this.beat - 1]?.cap ?? '' : '';
    return this.copy.beats[this.beat]?.cap ?? '';
  }

  leverCaption() {
    const L = this.copy.lever;
    if (!L || this.lever === null || this.lever === L.def) return '';
    // a pick-and-confirm lever (判斷力's 換你蓋章) names the reader's own act once it is done
    if (typeof this.lever === 'object') return this.lever.stamped ? L.cap || '' : '';
    return L.options?.find((o) => o.k === this.lever)?.cap || '';
  }

  _dur(i = this.beat) { return Math.max(0.01, this.mod.beats[i].dur); }
  _key(i = this.beat) { return this.mod.beats[i].keyAt ?? this._dur(i) * 0.4; }

  _apply(why) {
    const b = this.mod.beats[this.beat];
    this.mod.pose(this.beat, this.k, this.lever);
    this.mod.emphasize(this.focusPart ? [this.focusPart] : this.ended ? (this.mod.restParts || null) : b.parts || null);
    this.onState(this.state, why);
  }

  /** first visit: play from the first beat by itself */
  play() {
    this.ended = false;
    this.focusPart = null;
    this._enter(0);
    this.playing = !this.reduced;
    this.auto = !this.reduced;
    if (this.reduced) this._settle();
    this._apply('play');
  }

  /** a revisit, the map, ?still: the held result */
  toEnd() {
    this.playing = false;
    this.auto = false;
    this.focusPart = null;
    this.beat = this.n - 1;
    this.t = this._dur();
    this.k = 1;
    this.ended = true;
    this.captionShown = true;
    this._apply('end');
  }

  /** jump to a beat at progress k (1 = its end state); the reader leads from here */
  goto(i, { k = 1, why = 'goto' } = {}) {
    i = clamp(Math.round(i), 0, this.n - 1);
    this.playing = false;
    this.auto = false;
    this.ended = false;
    this.beat = i;
    this.k = clamp(k);
    this.t = this.k * this._dur(i);
    this.captionShown = this.t >= this._key(i);
    this._apply(why);
  }

  /** the reader's 下一步: play the next beat's motion (or reach the end state from the last beat) */
  next() {
    this.focusPart = null;
    if (this.ended) return;
    if (this.beat >= this.n - 1 && this.k >= 1) { this.toEnd(); return; }
    if (this.k >= 1) this._enter(this.beat + 1);
    this.auto = false;
    if (this.reduced) { this._settle(); this._apply('next'); return; }
    this.playing = true;
    this._apply('next');
  }

  prev() {
    this.focusPart = null;
    this.goto(this.ended ? this.n - 1 : Math.max(0, this.beat - 1), { k: 1, why: 'prev' });
  }

  pause() { if (!this.playing) return; this.playing = false; this.auto = false; this.onState(this.state, 'pause'); }
  resume() { if (this.ended || this.playing) return; this.playing = !this.reduced; this.onState(this.state, 'resume'); }

  replay() { this.play(); }

  /**
   * 換你試試: replay with the reader's choice, from the first beat whose picture the choice changes (the beats
   * before it would only repeat themselves word for word).  Picking without playing (a card picked before it is
   * stamped) shows the lever's own beat.
   */
  setLever(v, { play = true } = {}) {
    if (!this.mod.lever) return;
    const was = this.lever;
    const from0 = this.mod.lever.fromBeat ?? 0;
    const from = play ? this.firstDiff(was, v, from0) : from0;
    this.lever = v;
    this.focusPart = null;
    this.ended = false;
    this._enter(from);
    if (play && !this.reduced) { this.playing = true; this.auto = true; this._apply('lever'); }
    else { this._settle(); this._apply('lever'); }
  }

  /**
   * the first beat (from `from` on) at which the picture under choice b differs from the one under a: every
   * transform, visibility, instance and ink uniform of the district posed at a few moments of the beat, plus what
   * the UI says differs there (`differs(beat, a, b)`: words the data puts on objects per choice).  Pure: the caller
   * poses the module again.
   */
  firstDiff(a, b, from) {
    const g = this.mod.group;
    if (!g || JSON.stringify(a) === JSON.stringify(b)) return from;
    const sig = () => {
      const out = [];
      g.updateMatrixWorld(true);
      g.traverse((o) => {
        out.push(o.visible ? 1 : 0);
        if (!o.visible) return;
        const e = o.matrixWorld.elements;
        for (let i = 0; i < 16; i++) out.push(e[i]);
        if (o.isInstancedMesh) {
          out.push(o.count);
          const A = o.instanceMatrix.array, n = Math.min(A.length, o.count * 16);
          let t = 0;
          for (let i = 0; i < n; i++) t += A[i] * ((i % 7) + 1);
          out.push(t);
        }
        const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        for (const m of ms) {
          out.push(m.visible === false ? 0 : 1);
          const u = m.userData?.u;
          if (u) for (const k in u) { const v = u[k]?.value; if (typeof v === 'number') out.push(v); else if (v && typeof v.toArray === 'function' && !v.isTexture) out.push(...v.toArray()); }
        }
      });
      return out;
    };
    const same = (p, q) => p.length === q.length && p.every((x, i) => Math.abs(x - q[i]) < 1e-4);
    let found = -1;
    try {
      for (let i = Math.max(0, from); i < this.n && found < 0; i++) {
        if (this.differs?.(i, a, b)) { found = i; break; }
        for (const k of [0.35, 0.7, 1]) {
          this.mod.pose(i, k, a); const sa = sig();
          this.mod.pose(i, k, b); const sb = sig();
          if (!same(sa, sb)) { found = i; break; }
        }
      }
    } catch { found = -1; }
    // nothing in the picture changes: only the closing words do, so the last beat is replayed
    return found >= 0 ? found : Math.max(from, this.n - 1);
  }

  /** part focus: light one part (the rest drops to contour) and show its beat */
  focus(part, beat) {
    // mid-story a part shows its own beat; at the end the held result stays — unless the part is not in it (a cup that
    // left the table, a cloud that faded: not among the module's restParts), then its own beat comes back, so what is
    // lit is on screen
    if (beat !== undefined && beat !== null) {
      const gone = this.ended && Array.isArray(this.mod.restParts) && !this.mod.restParts.includes(part);
      // (a part that has left its beat by the beat's end is shown at the beat's key moment, while it is still there)
      if (gone) this.goto(beat, { k: clamp(this._key(beat) / Math.max(this._dur(beat), 1e-3)), why: 'part' });
      else if (!this.ended && beat > this.beat) this.goto(beat, { k: 1, why: 'part' });
      else if (!this.ended) { this.playing = false; this.auto = false; }
    }
    this.focusPart = part;
    this._apply('part');
  }

  clearFocus() { if (!this.focusPart) return; this.focusPart = null; this._apply('unfocus'); }

  _enter(i) {
    this.beat = i;
    this.t = 0;
    this.k = 0;
    this.captionShown = false;
  }

  _settle() { this.t = this._dur(); this.k = 1; this.captionShown = true; }

  /** advance on the real clock; returns true when something changed */
  update(dt) {
    if (!this.playing) return false;
    const dur = this._dur();
    this.t += dt;
    const key = this._key();
    let why = 'tick';
    if (!this.captionShown && this.t >= key) { this.captionShown = true; why = 'caption'; }
    // a beat's length covers its motion and the caption's reading time (keyAt + hold)
    const end = Math.max(dur, key + this.holds[this.beat]);
    this.k = clamp(this.t / dur);
    if (this.t >= end) {
      if (this.auto && this.beat < this.n - 1) { this._enter(this.beat + 1); why = 'beat'; }
      else if (this.auto && this.beat >= this.n - 1) { this.toEnd(); return true; }
      else { this.k = 1; this.playing = false; why = 'held'; }
    }
    this._apply(why);
    return true;
  }
}

/** the hold a caption needs to be read: 0.8 s + 0.2 s per character (spaces not counted) */
export function holdFor(text) {
  return 0.8 + 0.2 * String(text || '').replace(/\s/g, '').length;
}
