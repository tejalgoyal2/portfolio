import { settings } from './settings';

/**
 * The sound of a cube face turning, the way a speedcube sounds: two hard
 * plastic pieces letting go with a light tick, a faint dry slide as the layer
 * goes round, and a crisp double clack as it snaps home (the corner and the
 * edge pieces landing a hair apart). Synthesised on the fly from one short
 * buffer of noise (no audio files): band-passed bursts a few milliseconds
 * long, high and bright, with only a whisper of body under the snap — no
 * thump. Only ever played from a click the visitor made (so the browser
 * allows it), quiet, and switched off in Page settings.
 */
let ac = null;
let noise = null;

function burst(t, { at, len, freq, q, gain, out, type = 'bandpass' }) {
  const src = ac.createBufferSource();
  src.buffer = noise;
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t + at);
  g.gain.exponentialRampToValueAtTime(gain, t + at + 0.0015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + at + len);
  src.connect(f).connect(g).connect(out);
  // a different stretch of the noise each time, so no two clicks are the same
  src.start(t + at, Math.random() * 0.2, len + 0.01);
}

/** One face turning, `dur` seconds from letting go to snapping home. */
export function clack(dur = 0.3) {
  if (!settings.sound) return;
  try {
    ac ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    if (!noise) {
      noise = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.25), ac.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = ac.currentTime + 0.004;
    const out = ac.createGain();
    out.gain.value = 0.42;
    out.connect(ac.destination);
    const v = () => 0.9 + Math.random() * 0.2;

    // letting go: a light, high tick
    burst(t, { at: 0, len: 0.012, freq: 3600 * v(), q: 2.2, gain: 0.32, out });
    // the slide: a faint dry rasp while the layer goes round
    const slide = Math.max(0.05, dur * 0.7);
    const src = ac.createBufferSource();
    src.buffer = noise;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(1700, t + 0.01);
    bp.frequency.linearRampToValueAtTime(2600, t + 0.01 + slide);
    const sg = ac.createGain();
    sg.gain.setValueAtTime(0.0001, t + 0.01);
    sg.gain.linearRampToValueAtTime(0.035, t + 0.01 + slide * 0.4);
    sg.gain.linearRampToValueAtTime(0.0001, t + 0.01 + slide);
    src.connect(bp).connect(sg).connect(out);
    src.start(t + 0.01, Math.random() * 0.05, slide + 0.02);
    // snapping home: two crisp clacks a hair apart, bright, with a whisper of body
    const home = Math.max(0.06, dur * 0.92);
    burst(t, { at: home, len: 0.016, freq: 4300 * v(), q: 3.2, gain: 0.9, out });
    burst(t, { at: home + 0.007 + Math.random() * 0.004, len: 0.02, freq: 2800 * v(), q: 2.6, gain: 0.55, out });
    burst(t, { at: home, len: 0.03, freq: 1250 * v(), q: 5, gain: 0.12, out });
  } catch {
    /* no audio: a silent cube */
  }
}
