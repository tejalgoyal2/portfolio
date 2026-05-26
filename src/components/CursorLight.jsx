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

  useEffect(() => {
    const glow = glowRef.current;
    const dot = dotRef.current;
    if (!glow || !dot) return;

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
    let prevDx = -600, prevDy = -600;

    const getBaseGlow = () => document.documentElement.getAttribute('data-theme') === 'light' ? 0.03 : 0.07;
    const getHoverGlow = () => document.documentElement.getAttribute('data-theme') === 'light' ? 0.06 : 0.12;
    let glowIntensity = getBaseGlow();
    let targetGlowIntensity = getBaseGlow();

    let hovering = false;
    let clicking = false;
    let targetScale = 1;
    let currentScale = 1;
    let targetOpacity = 1;
    let currentOpacity = 1;
    let raf;

    const onMove = (e) => {
      mx = e.clientX;
      my = e.clientY;

      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el) return;

      const interactive = el.closest(HOVER_SELECTORS);

      if (interactive) {
        hovering = true;
        targetGlowIntensity = getHoverGlow();
        targetScale = 2.5;
        targetOpacity = 0.5;
      } else {
        hovering = false;
        targetScale = 1;
        targetOpacity = 1;
        targetGlowIntensity = getBaseGlow();
      }
    };

    const onDown = () => { clicking = true; };
    const onUp = () => { clicking = false; };

    const BASE_SIZE = 8;

    const tick = () => {
      // Glow follows with lag
      gx += (mx - gx) * 0.05;
      gy += (my - gy) * 0.05;
      glowIntensity += (targetGlowIntensity - glowIntensity) * 0.08;
      glow.style.transform = `translate3d(${gx - 250}px, ${gy - 250}px, 0)`;
      glow.style.background = `radial-gradient(circle, rgba(${interactiveRGB},${glowIntensity}) 0%, rgba(${interactiveRGB},${glowIntensity * 0.3}) 40%, transparent 70%)`;

      // Dot follows mouse tightly
      dx += (mx - dx) * 0.4;
      dy += (my - dy) * 0.4;

      // Velocity for subtle stretch
      const vx = dx - prevDx;
      const vy = dy - prevDy;
      const speed = Math.sqrt(vx * vx + vy * vy);
      const angle = Math.atan2(vy, vx) * (180 / Math.PI);
      const stretch = Math.min(speed * 0.06, 0.35);
      prevDx = dx;
      prevDy = dy;

      // Smooth scale and opacity transitions
      currentScale += (targetScale - currentScale) * 0.15;
      currentOpacity += (targetOpacity - currentOpacity) * 0.12;

      // Click squish
      let clickScaleX = 1;
      let clickScaleY = 1;
      if (clicking) {
        clickScaleX = 1.3;
        clickScaleY = 0.7;
      }

      const halfSize = (BASE_SIZE * currentScale) / 2;
      const stretchX = 1 + stretch;
      const stretchY = 1 - stretch * 0.5;
      const rotAngle = speed > 1 ? angle : 0;

      dot.style.transform = `translate3d(${dx - halfSize}px, ${dy - halfSize}px, 0) rotate(${rotAngle}deg) scale(${currentScale * stretchX * clickScaleX}, ${currentScale * stretchY * clickScaleY})`;
      dot.style.opacity = currentOpacity;

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
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: 'var(--color-interactive)',
          zIndex: 10002,
          willChange: 'transform',
        }}
      />
    </>
  );
}
