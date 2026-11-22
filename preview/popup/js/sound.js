// Paper sounds, synthesised on the spot: no audio files to load.
export function makeSound() {
  let ctx = null, on = true;
  const ac = () => { try { ctx ||= new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume().catch(() => {}); } catch { ctx = null; } return ctx; };
  function env(c, peak, a, d) { const g = c.createGain(), t = c.currentTime; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); g.connect(c.destination); return g; }
  function noise(c, dur, freq, q, peak, type = 'bandpass') {
    const b = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate), v = b.getChannelData(0); for (let i = 0; i < v.length; i++) v[i] = (Math.random() * 2 - 1) * (.5 + .5 * Math.sin(i * .004) ** 2);
    const s = c.createBufferSource(), f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; s.buffer = b; s.connect(f); f.connect(env(c, peak, .012, dur)); s.start();
  }
  function tone(c, f0, f1, dur, peak, type = 'sine', delay = 0) { const o = c.createOscillator(), t = c.currentTime + delay; o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur); g.connect(c.destination); o.connect(g); o.start(t); o.stop(t + dur + .02); }
  const kinds = {
    turn: (c) => { noise(c, .32, 1700, .8, .06); noise(c, .18, 3200, 1.2, .025); },
    rise: (c) => { noise(c, .5, 900, .6, .04); tone(c, 300, 520, .28, .03, 'triangle', .12); },
    pop: (c) => tone(c, 520, 780, .13, .06, 'triangle'),
    tap: (c) => tone(c, 380, 300, .07, .05, 'triangle'),
    tick: (c) => tone(c, 900, 700, .05, .03, 'square'),
    soft: (c) => tone(c, 260, 200, .22, .04, 'sine'),
    stamp: (c) => { tone(c, 150, 55, .22, .22, 'sine'); noise(c, .1, 500, .7, .08, 'lowpass'); },
    whoosh: (c) => noise(c, .4, 1200, .5, .05),
    done: (c) => { [523, 659, 784, 1047].forEach((f, i) => tone(c, f, f, .34, .05, 'triangle', i * .09)); },
  };
  return {
    play(name) { if (!on) return; const c = ac(); if (!c) return; try { kinds[name]?.(c); } catch { /* sound is optional */ } },
    get on() { return on; }, set on(v) { on = Boolean(v); if (on) ac(); },
  };
}
