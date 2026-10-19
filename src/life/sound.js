import { settings } from './settings';

/**
 * A soft, satisfying "thock" for a cube face landing — synthesised on the fly
 * (no audio files): a tiny filtered click for the plastic edge meeting, and a
 * low, quick thump under it for the body of the cube. Only ever played from a
 * click the visitor made (so the browser allows it), quiet, and switched off
 * in Page settings.
 */
let ac = null;

export function thock() {
  if (!settings.sound) return;
  try {
    ac ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime + 0.005;
    const out = ac.createGain();
    out.gain.value = 0.32;
    out.connect(ac.destination);

    // the click: a few ms of noise through a bandpass
    const len = Math.floor(ac.sampleRate * 0.03);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    const noise = ac.createBufferSource();
    noise.buffer = buf;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2100 + Math.random() * 500;
    bp.Q.value = 1.3;
    const ng = ac.createGain();
    ng.gain.setValueAtTime(0.9, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    noise.connect(bp).connect(ng).connect(out);
    noise.start(t);

    // the thock: a low sine that drops in pitch and dies fast
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190 + Math.random() * 20, t);
    osc.frequency.exponentialRampToValueAtTime(85, t + 0.07);
    const og = ac.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.7, t + 0.004);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    osc.connect(og).connect(out);
    osc.start(t);
    osc.stop(t + 0.13);
  } catch {
    /* no audio: silent cube */
  }
}
