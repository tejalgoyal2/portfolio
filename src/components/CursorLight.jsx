import { useEffect, useRef } from 'react';

const HOVER_SELECTORS = 'a, button, [role="button"], input, .featured-card, .project-card, .about-panel, .contact-link, .skill-cell, .blog-strip-card';

export default function CursorLight() {
  const glowRef = useRef(null);
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const stateRef = useRef({ hovering: false, clicking: false });

  useEffect(() => {
    const glow = glowRef.current;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!glow || !dot || !ring) return;

    let mx = -600, my = -600;
    let gx = -600, gy = -600;
    let dx = -600, dy = -600;
    let rx = -600, ry = -600;
    let snapX = 0, snapY = 0;
    let snapActive = false;
    let ringScale = 1;
    let targetRingScale = 1;
    let ringOpacity = 0.3;
    let targetRingOpacity = 0.3;
    let glowIntensity = 0.07;
    let targetGlowIntensity = 0.07;
    let dotSize = 6;
    let targetDotSize = 6;
    let raf;

    const onMove = (e) => {
      mx = e.clientX;
      my = e.clientY;

      const el = document.elementFromPoint(e.clientX, e.clientY);
      const interactive = el && el.closest(HOVER_SELECTORS);

      if (interactive) {
        stateRef.current.hovering = true;
        targetRingScale = 2.2;
        targetRingOpacity = 0.15;
        targetGlowIntensity = 0.12;
        targetDotSize = 10;

        // Magnetic snap only for small elements (links, buttons, inputs)
        // Skip large cards to avoid jittery long-distance cursor pulls
        const rect = interactive.getBoundingClientRect();
        if (rect.width < 200 && rect.height < 80) {
          snapX = rect.left + rect.width / 2;
          snapY = rect.top + rect.height / 2;
          snapActive = true;
        } else {
          snapActive = false;
        }
      } else {
        stateRef.current.hovering = false;
        targetRingScale = 1;
        targetRingOpacity = 0.3;
        targetGlowIntensity = 0.07;
        targetDotSize = 6;
        snapActive = false;
      }
    };

    const onDown = () => {
      stateRef.current.clicking = true;
      targetRingScale = stateRef.current.hovering ? 1.8 : 0.7;
      targetDotSize = stateRef.current.hovering ? 8 : 4;
    };

    const onUp = () => {
      stateRef.current.clicking = false;
      targetRingScale = stateRef.current.hovering ? 2.2 : 1;
      targetDotSize = stateRef.current.hovering ? 10 : 6;
    };

    const tick = () => {
      gx += (mx - gx) * 0.05;
      gy += (my - gy) * 0.05;
      glowIntensity += (targetGlowIntensity - glowIntensity) * 0.08;
      glow.style.transform = `translate3d(${gx - 250}px, ${gy - 250}px, 0)`;
      glow.style.background = `radial-gradient(circle, rgba(139,142,255,${glowIntensity}) 0%, rgba(139,142,255,${glowIntensity * 0.3}) 40%, transparent 70%)`;

      let targetX = mx;
      let targetY = my;
      if (snapActive) {
        targetX = mx + (snapX - mx) * 0.04;
        targetY = my + (snapY - my) * 0.04;
      }

      dx += (targetX - dx) * 0.4;
      dy += (targetY - dy) * 0.4;

      dotSize += (targetDotSize - dotSize) * 0.15;
      const halfDot = dotSize / 2;
      dot.style.transform = `translate3d(${dx - halfDot}px, ${dy - halfDot}px, 0)`;
      dot.style.width = `${dotSize}px`;
      dot.style.height = `${dotSize}px`;

      rx += (targetX - rx) * 0.15;
      ry += (targetY - ry) * 0.15;
      ringScale += (targetRingScale - ringScale) * 0.12;
      ringOpacity += (targetRingOpacity - ringOpacity) * 0.1;
      ring.style.transform = `translate3d(${rx - 20}px, ${ry - 20}px, 0) scale(${ringScale})`;
      ring.style.opacity = ringOpacity;

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
    };
  }, []);

  return (
    <>
      <div
        ref={glowRef}
        className="fixed top-0 left-0 pointer-events-none"
        style={{
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,142,255,0.07) 0%, rgba(139,142,255,0.02) 40%, transparent 70%)',
          zIndex: 1,
          willChange: 'transform',
        }}
      />

      <div
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none"
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: 'var(--color-interactive)',
          zIndex: 9995,
          willChange: 'transform',
        }}
      />

      <div
        ref={ringRef}
        className="fixed top-0 left-0 pointer-events-none"
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '1.5px solid rgba(139,142,255,0.3)',
          zIndex: 9994,
          willChange: 'transform',
          opacity: 0.3,
        }}
      />
    </>
  );
}
