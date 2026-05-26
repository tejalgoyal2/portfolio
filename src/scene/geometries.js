/**
 * Shape samplers for the morphing protagonist.
 *
 * Every sampler returns a Float32Array of `n * 3` floats — N points,
 * each (x, y, z) — sampled from the target shape. All shapes are sized
 * to roughly fit a unit cube so the morph reads cleanly without rescaling.
 *
 * Add new shapes by writing a sampler that returns N points evenly
 * representing the target silhouette, then add it to MORPH_SEQUENCE.
 */

const PHI = Math.PI * (Math.sqrt(5) - 1);
const TAU = Math.PI * 2;

// ── Sphere — Fibonacci distribution on a unit sphere ─────────────────
export function sphere(n, radius = 1) {
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = PHI * i;
    out[i * 3 + 0] = Math.cos(theta) * r * radius;
    out[i * 3 + 1] = y * radius;
    out[i * 3 + 2] = Math.sin(theta) * r * radius;
  }
  return out;
}

// ── Glasses — two torus rings + a bridge ─────────────────────────────
export function glasses(n) {
  const out = new Float32Array(n * 3);
  const perLens = Math.floor(n * 0.42);
  const bridgeN = Math.floor(n * 0.06);
  const templesN = n - perLens * 2 - bridgeN;

  let k = 0;
  for (let lens = 0; lens < 2; lens++) {
    const cx = lens === 0 ? -0.62 : 0.62;
    for (let i = 0; i < perLens; i++) {
      // Bias for "thicker rim" feel by jittering radius slightly
      const theta = (i / perLens) * TAU;
      const rim = 0.42 + (Math.random() - 0.5) * 0.02;
      out[k++] = cx + Math.cos(theta) * rim;
      out[k++] = Math.sin(theta) * rim;
      out[k++] = (Math.random() - 0.5) * 0.04;
    }
  }
  // Bridge between lenses
  for (let i = 0; i < bridgeN; i++) {
    out[k++] = -0.2 + (0.4 * i) / bridgeN + (Math.random() - 0.5) * 0.03;
    out[k++] = 0.05 + (Math.random() - 0.5) * 0.02;
    out[k++] = (Math.random() - 0.5) * 0.04;
  }
  // Temples sticking out the sides
  for (let i = 0; i < templesN; i++) {
    const side = i < templesN / 2 ? -1 : 1;
    const t = (i % (templesN / 2)) / (templesN / 2);
    out[k++] = side * (1.04 + t * 0.35);
    out[k++] = (Math.random() - 0.5) * 0.05;
    out[k++] = (Math.random() - 0.5) * 0.05;
  }
  return out;
}

// ── Padlock — U-shackle on top, rounded body below ───────────────────
export function padlock(n) {
  const out = new Float32Array(n * 3);
  const bodyN = Math.floor(n * 0.65);
  const shackleN = n - bodyN;

  // Body — filled rounded rect, sampled densely
  const bodyW = 1.05, bodyH = 0.9;
  const bodyCx = 0, bodyCy = -0.4;
  const cornerR = 0.18;
  let k = 0;
  for (let i = 0; i < bodyN; i++) {
    let x, y;
    // Reject-sample inside the rounded rect
    let tries = 0;
    do {
      x = (Math.random() - 0.5) * bodyW;
      y = (Math.random() - 0.5) * bodyH;
      tries++;
    } while (!insideRoundedRect(x, y, bodyW, bodyH, cornerR) && tries < 8);
    out[k++] = bodyCx + x;
    out[k++] = bodyCy + y;
    out[k++] = (Math.random() - 0.5) * 0.08;
  }

  // Shackle — U arc above body
  for (let i = 0; i < shackleN; i++) {
    const t = i / shackleN;
    const theta = Math.PI * (1 - t); // 180° → 0°
    const r = 0.42;
    out[k++] = Math.cos(theta) * r;
    out[k++] = 0.18 + Math.sin(theta) * r;
    out[k++] = (Math.random() - 0.5) * 0.05;
  }
  return out;
}

function insideRoundedRect(x, y, w, h, r) {
  const dx = Math.max(Math.abs(x) - (w / 2 - r), 0);
  const dy = Math.max(Math.abs(y) - (h / 2 - r), 0);
  return dx * dx + dy * dy <= r * r;
}

// ── Terminal cursor — a tall block "▌" ───────────────────────────────
export function terminal(n) {
  const out = new Float32Array(n * 3);
  const w = 0.42, h = 1.1;
  for (let i = 0; i < n; i++) {
    out[i * 3 + 0] = (Math.random() - 0.5) * w;
    out[i * 3 + 1] = (Math.random() - 0.5) * h;
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
  }
  return out;
}

// ── Brain — sphere distorted into two hemispheres with sulci noise ────
export function brain(n) {
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = PHI * i;
    let x = Math.cos(theta) * r;
    let z = Math.sin(theta) * r;
    // Squish vertically + horizontally to brain proportions
    let bx = x * 0.95;
    let by = y * 0.78 + 0.05;
    let bz = z * 0.7;
    // Hemisphere split — push left/right slightly apart along x
    bx += Math.sign(bx) * 0.04;
    // Sulci wrinkle noise
    const wrinkle = 0.08 * Math.sin(8 * theta + 4 * y) * (1 - Math.abs(y));
    bx += wrinkle * x;
    bz += wrinkle * z;
    out[i * 3 + 0] = bx;
    out[i * 3 + 1] = by;
    out[i * 3 + 2] = bz;
  }
  return out;
}

// ── Quill — tapered line with a feathered fan at the top ──────────────
export function quill(n) {
  const out = new Float32Array(n * 3);
  const stemN = Math.floor(n * 0.65);
  const featherN = n - stemN;
  let k = 0;
  for (let i = 0; i < stemN; i++) {
    const t = i / stemN;
    const taper = 0.04 * (1 - t * 0.7);
    out[k++] = (Math.random() - 0.5) * taper * 2;
    out[k++] = -1 + t * 1.3;
    out[k++] = (Math.random() - 0.5) * 0.05;
  }
  for (let i = 0; i < featherN; i++) {
    const t = i / featherN;
    const angle = (Math.random() - 0.5) * 0.7;
    const arm = 0.45 + Math.random() * 0.35;
    out[k++] = Math.sin(angle) * arm;
    out[k++] = 0.3 + Math.cos(angle) * arm * 0.55;
    out[k++] = (Math.random() - 0.5) * 0.06;
  }
  return out;
}

// ── The sequence ──────────────────────────────────────────────────────
// Each entry is a sampler producing N points. Scroll progress 0..1 walks
// through the sequence with wraparound — i.e. the last shape morphs back
// to the first.
export const MORPH_SEQUENCE = [
  { id: 'sphere',   build: sphere },
  { id: 'glasses',  build: glasses },
  { id: 'padlock',  build: padlock },
  { id: 'terminal', build: terminal },
  { id: 'brain',    build: brain },
  { id: 'quill',    build: quill },
];

/**
 * Build all target arrays once at startup. Returns an array of Float32Array,
 * one per shape, all of length n * 3.
 */
export function buildAllTargets(n) {
  return MORPH_SEQUENCE.map((shape) => shape.build(n));
}
