// Springs described by response (seconds) and damping ratio (1 = no bounce).
// They always start from the current value and keep their velocity when retargeted.

export class Spring {
  constructor(value = 0, response = 0.35, dampingRatio = 1) {
    this.value = value;
    this.velocity = 0;
    this.target = value;
    this.configure(response, dampingRatio);
  }

  configure(response, dampingRatio) {
    const w = (2 * Math.PI) / Math.max(1e-3, response);
    this.k = w * w;
    this.c = 2 * dampingRatio * w;
    return this;
  }

  step(dt) {
    // semi-implicit Euler, sub-stepped so stiff springs stay stable
    const n = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = -this.k * (this.value - this.target) - this.c * this.velocity;
      this.velocity += a * h;
      this.value += this.velocity * h;
    }
    return this.value;
  }

  snap(v) {
    this.value = v;
    this.target = v;
    this.velocity = 0;
    return this;
  }

  get settled() {
    return Math.abs(this.value - this.target) < 1e-3 && Math.abs(this.velocity) < 1e-3;
  }
}

/** Frame-rate independent exponential smoothing. */
export const damp = (current, target, lambda, dt) => target + (current - target) * Math.exp(-lambda * dt);

export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** Index-seeded randomness: deterministic, stable across frames. */
export const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
