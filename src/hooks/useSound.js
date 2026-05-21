/**
 * Minimal sound system using Web Audio API.
 * Generates subtle UI feedback sounds programmatically.
 * All sounds are opt-in: only plays after first user interaction.
 */

let audioCtx = null;
let enabled = false;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

// Resume audio context on first interaction
function init() {
  if (enabled) return;
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    enabled = true;
  } catch {
    // Audio not supported
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('click', init, { once: true });
  window.addEventListener('keydown', init, { once: true });
}

/**
 * Soft tick sound for hover
 */
export function playHoverTick() {
  if (!enabled) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(4200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(3800, ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.015, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.04);
  } catch {
    // Silently fail
  }
}

/**
 * Soft click sound
 */
export function playClick() {
  if (!enabled) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  } catch {
    // Silently fail
  }
}

/**
 * Attach hover tick to nav items globally.
 * Call once from a top-level component.
 */
export function attachNavSounds() {
  if (typeof window === 'undefined') return;

  document.addEventListener('mouseenter', (e) => {
    const el = e.target;
    if (el.matches && (
      el.matches('nav a, nav button') ||
      el.matches('.hero-link') ||
      el.matches('.contact-link')
    )) {
      playHoverTick();
    }
  }, true);

  document.addEventListener('click', (e) => {
    const el = e.target;
    if (el.matches && el.matches('a, button, [role="button"]')) {
      playClick();
    }
  }, true);
}
