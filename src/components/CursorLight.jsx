import { useEffect, useRef } from 'react';

const HOVER_SELECTORS = 'a, button, [role="button"], input, .featured-card, .project-card, .about-panel, .contact-link, .skill-cell, .blog-strip-card';

function parseHexToRGB(hex) {
  hex = hex.trim();
  if (!hex.startsWith('#')) return '139,142,255';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export default function CursorLight() {
  const glowRef = useRef(null);
  const dotRef = useRef(null);
  const stateRef = useRef({ hovering: false, clicking: false });

  useEffect(() => {
    const glow = glowRef.current;
    const dot = dotRef.current;
    if (!glow || !dot) return;

    // Read the theme's interactive color and track changes
    let interactiveRGB = parseHexToRGB(
      getComputedStyle(document.documentElement).getPropertyValue('--color-interactive')
    );

    const observer = new MutationObserver(() => {
      interactiveRGB = parseHexToRGB(
        getComputedStyle(document.documentElement).getPropertyValue('--color-interactive')
      );
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    let mx = -600, my = -600;
    let gx = -600, gy = -600;
    let dx = -600, dy = -600;
    let snapX = 0, snapY = 0;
    let snapActive = false;
    // Theme-aware glow: lighter in light mode so it doesn't overpower
    const getBaseGlow = () => document.documentElement.getAttribute('data-theme') === 'light' ? 0.03 : 0.07;
    const getHoverGlow = () => document.documentElement.getAttribute('data-theme') === 'light' ? 0.06 : 0.12;
    let glowIntensity = getBaseGlow();
    let targetGlowIntensity = getBaseGlow();
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
        targetGlowIntensity = getHoverGlow();
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
        targetGlowIntensity = getBaseGlow();
        targetDotSize = 6;
        snapActive = false;
      }
    };

    const onDown = () => {
      stateRef.current.clicking = true;
      targetDotSize = stateRef.current.hovering ? 8 : 4;
    };

    const onUp = () => {
      stateRef.current.clicking = false;
      targetDotSize = stateRef.current.hovering ? 10 : 6;
    };

    const tick = () => {
      gx += (mx - gx) * 0.05;
      gy += (my - gy) * 0.05;
      glowIntensity += (targetGlowIntensity - glowIntensity) * 0.08;
      glow.style.transform = `translate3d(${gx - 250}px, ${gy - 250}px, 0)`;
      glow.style.background = `radial-gradient(circle, rgba(${interactiveRGB},${glowIntensity}) 0%, rgba(${interactiveRGB},${glowIntensity * 0.3}) 40%, transparent 70%)`;

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
      observer.disconnect();
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
          background: 'radial-gradient(circle, color-mix(in srgb, var(--color-interactive) 7%, transparent) 0%, color-mix(in srgb, var(--color-interactive) 2%, transparent) 40%, transparent 70%)',
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
    </>
  );
}
