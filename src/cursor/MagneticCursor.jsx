import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

/**
 * Buttermax-inspired magnetic LERP cursor.
 *
 * Two layered fixed elements:
 *   - glow: a soft cyan radial gradient that lags HEAVILY (0.025) for the
 *     dreamy trail.
 *   - pointer: a small ink-outlined circle that lags moderately (0.18) and,
 *     when over an interactive element, morphs to FRAME the element (its
 *     dimensions + border-radius interpolate toward the target).
 *
 * Magnetic DOM pull: when the cursor is over a magnetic element, the element
 * itself is pulled toward the actual mouse position via gsap.quickTo. On
 * leave, the element springs back to origin with an elastic ease.
 *
 * The pointer uses `mix-blend-mode: difference` so it stays readable against
 * any background.
 */
const MAGNETIC_SELECTORS = 'a, button, [role="button"], [data-magnetic]';
const FRAME_SELECTORS = `${MAGNETIC_SELECTORS}, input, .speech-bubble, .comic-panel`;

const POINTER_BASE = 14;       // base size when not framing
const POINTER_LERP = 0.18;     // medium follow
const GLOW_LERP = 0.025;       // heavy follow
const MORPH_LERP = 0.22;       // morph speed on width/height/radius
const DOM_PULL_STRENGTH = 0.22;

export default function MagneticCursor() {
  const glowRef = useRef(null);
  const pointerRef = useRef(null);

  useEffect(() => {
    const glow = glowRef.current;
    const pointer = pointerRef.current;
    if (!glow || !pointer) return;

    // bail on touch devices — no hover, no point
    const isTouch = matchMedia('(hover: none)').matches;
    if (isTouch) {
      glow.style.display = 'none';
      pointer.style.display = 'none';
      document.body.style.cursor = 'auto';
      return;
    }

    // state
    let mx = -200, my = -200;          // actual mouse
    let gx = -200, gy = -200;          // glow position
    let px = -200, py = -200;          // pointer position
    let cw = POINTER_BASE, ch = POINTER_BASE;  // current width/height
    let tw = POINTER_BASE, th = POINTER_BASE;  // target width/height
    let cr = 50, tr = 50;              // current/target border-radius %
    let clicking = false;

    // magnetic DOM state
    let currentMag = null;
    let qx = null, qy = null;

    const setupMag = (el) => {
      if (currentMag === el) return;
      cleanupMag();
      currentMag = el;
      qx = gsap.quickTo(el, 'x', { duration: 0.45, ease: 'power3.out' });
      qy = gsap.quickTo(el, 'y', { duration: 0.45, ease: 'power3.out' });
    };

    const cleanupMag = () => {
      if (!currentMag) return;
      gsap.to(currentMag, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.42)' });
      currentMag = null;
      qx = null;
      qy = null;
    };

    const onMove = (e) => {
      mx = e.clientX;
      my = e.clientY;

      // detect hover target
      const el = document.elementFromPoint(mx, my);
      if (!el) return;

      const frame = el.closest(FRAME_SELECTORS);
      const mag = el.closest(MAGNETIC_SELECTORS);

      if (frame) {
        // morph pointer to frame the element
        const rect = frame.getBoundingClientRect();
        tw = rect.width + 12;
        th = rect.height + 10;
        // pull radius from computed style or default
        const cs = getComputedStyle(frame);
        const csR = parseFloat(cs.borderRadius) || 0;
        if (csR > 0 && csR < Math.min(rect.width, rect.height) / 2) {
          // percent equivalent
          tr = (csR / Math.min(rect.width, rect.height)) * 100;
        } else if (csR >= Math.min(rect.width, rect.height) / 2) {
          tr = 50;
        } else {
          tr = 8;
        }

        if (mag) {
          setupMag(mag);
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          qx?.((mx - cx) * DOM_PULL_STRENGTH);
          qy?.((my - cy) * DOM_PULL_STRENGTH);
        } else {
          cleanupMag();
        }
      } else {
        tw = POINTER_BASE;
        th = POINTER_BASE;
        tr = 50;
        cleanupMag();
      }
    };

    const onDown = () => { clicking = true; };
    const onUp = () => { clicking = false; };

    let raf;
    const tick = () => {
      // glow follows heavily lagged
      gx += (mx - gx) * GLOW_LERP;
      gy += (my - gy) * GLOW_LERP;
      glow.style.transform = `translate3d(${gx - 250}px, ${gy - 250}px, 0)`;

      // pointer lags less; when framing, snap toward the framed element's center
      let targetX = mx;
      let targetY = my;
      if (currentMag) {
        const rect = currentMag.getBoundingClientRect();
        // halfway between mouse and element center
        targetX = (rect.left + rect.width / 2) * 0.55 + mx * 0.45;
        targetY = (rect.top + rect.height / 2) * 0.55 + my * 0.45;
      }
      px += (targetX - px) * POINTER_LERP;
      py += (targetY - py) * POINTER_LERP;

      cw += (tw - cw) * MORPH_LERP;
      ch += (th - ch) * MORPH_LERP;
      cr += (tr - cr) * MORPH_LERP;

      const clickScale = clicking ? 0.7 : 1;

      pointer.style.width = `${cw}px`;
      pointer.style.height = `${ch}px`;
      pointer.style.borderRadius = `${cr}%`;
      pointer.style.transform =
        `translate3d(${px - cw / 2}px, ${py - ch / 2}px, 0) scale(${clickScale})`;

      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      cancelAnimationFrame(raf);
      cleanupMag();
    };
  }, []);

  return (
    <>
      <div
        ref={glowRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 500,
          height: 500,
          pointerEvents: 'none',
          zIndex: 9990,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, color-mix(in oklch, var(--cyan), transparent 88%) 0%, color-mix(in oklch, var(--cyan), transparent 96%) 40%, transparent 70%)',
          mixBlendMode: 'screen',
          willChange: 'transform',
        }}
      />
      <div
        ref={pointerRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: POINTER_BASE,
          height: POINTER_BASE,
          pointerEvents: 'none',
          zIndex: 10000,
          border: '1.5px solid var(--paper)',
          background: 'transparent',
          borderRadius: '50%',
          mixBlendMode: 'difference',
          willChange: 'transform, width, height, border-radius',
        }}
      />
    </>
  );
}
