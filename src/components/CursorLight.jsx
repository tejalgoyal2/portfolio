import { useEffect, useRef } from 'react';
import { gsap } from '../hooks/useGSAP';

const MAGNETIC_SELECTORS = 'a, button, [role="button"], input[type="range"]';
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

    // --- State ---
    let mx = -600, my = -600;       // actual mouse position
    let gx = -600, gy = -600;       // glow position (heaviest lag)
    let dx = -600, dy = -600;       // dot position (medium lag)
    let prevDx = -600, prevDy = -600;

    const getBaseGlow = () => document.documentElement.getAttribute('data-theme') === 'light' ? 0.03 : 0.07;
    const getHoverGlow = () => document.documentElement.getAttribute('data-theme') === 'light' ? 0.06 : 0.12;
    let glowIntensity = getBaseGlow();
    let targetGlowIntensity = getBaseGlow();

    let clicking = false;
    let raf;

    // --- Dot shape state (for morphing) ---
    const BASE_SIZE = 8;
    let currentWidth = BASE_SIZE;
    let currentHeight = BASE_SIZE;
    let targetWidth = BASE_SIZE;
    let targetHeight = BASE_SIZE;
    let currentRadius = 50; // percentage
    let targetRadius = 50;
    let currentScale = 1;
    let targetScale = 1;
    let currentOpacity = 1;
    let targetOpacity = 1;

    // --- Magnetic DOM pull tracking ---
    let currentMagneticEl = null;
    let magneticQuickX = null;
    let magneticQuickY = null;

    const setupMagnetic = (el) => {
      if (currentMagneticEl === el) return;
      // Clean up previous
      cleanupMagnetic();
      currentMagneticEl = el;
      magneticQuickX = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
      magneticQuickY = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
    };

    const cleanupMagnetic = () => {
      if (currentMagneticEl) {
        gsap.to(currentMagneticEl, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
        currentMagneticEl = null;
        magneticQuickX = null;
        magneticQuickY = null;
      }
    };

    const onMove = (e) => {
      mx = e.clientX;
      my = e.clientY;

      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el) return;

      const interactive = el.closest(HOVER_SELECTORS);
      const magnetic = el.closest(MAGNETIC_SELECTORS);

      if (interactive) {
        targetGlowIntensity = getHoverGlow();
        targetOpacity = 0.6;

        if (magnetic) {
          // --- Magnetic cursor: morph dot to frame the element ---
          const rect = magnetic.getBoundingClientRect();
          targetWidth = rect.width + 16;
          targetHeight = rect.height + 12;
          targetScale = 1;
          targetRadius = 30; // rounded rect, not circle

          // --- Pull the DOM element toward cursor ---
          setupMagnetic(magnetic);
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const offsetX = (mx - centerX) * 0.2;
          const offsetY = (my - centerY) * 0.2;
          if (magneticQuickX) magneticQuickX(offsetX);
          if (magneticQuickY) magneticQuickY(offsetY);
        } else {
          // Non-magnetic interactive: just scale up the dot
          targetWidth = BASE_SIZE;
          targetHeight = BASE_SIZE;
          targetScale = 3;
          targetRadius = 50;
          cleanupMagnetic();
        }
      } else {
        // Default state
        targetScale = 1;
        targetOpacity = 1;
        targetGlowIntensity = getBaseGlow();
        targetWidth = BASE_SIZE;
        targetHeight = BASE_SIZE;
        targetRadius = 50;
        cleanupMagnetic();
      }
    };

    const onDown = () => { clicking = true; };
    const onUp = () => { clicking = false; };

    const tick = () => {
      // --- Glow follows with heavy lag (Buttermax-style dreamy trail) ---
      gx += (mx - gx) * 0.03;
      gy += (my - gy) * 0.03;
      glowIntensity += (targetGlowIntensity - glowIntensity) * 0.06;
      glow.style.transform = `translate3d(${gx - 250}px, ${gy - 250}px, 0)`;
      glow.style.background = `radial-gradient(circle, rgba(${interactiveRGB},${glowIntensity}) 0%, rgba(${interactiveRGB},${glowIntensity * 0.3}) 40%, transparent 70%)`;

      // --- Dot follows mouse with medium lag (heavier than before for Buttermax feel) ---
      dx += (mx - dx) * 0.18;
      dy += (my - dy) * 0.18;

      // Velocity for stretch
      const vx = dx - prevDx;
      const vy = dy - prevDy;
      const speed = Math.sqrt(vx * vx + vy * vy);
      const angle = Math.atan2(vy, vx) * (180 / Math.PI);
      const stretch = Math.min(speed * 0.04, 0.25);
      prevDx = dx;
      prevDy = dy;

      // --- Smooth morph transitions ---
      currentWidth += (targetWidth - currentWidth) * 0.12;
      currentHeight += (targetHeight - currentHeight) * 0.12;
      currentRadius += (targetRadius - currentRadius) * 0.12;
      currentScale += (targetScale - currentScale) * 0.12;
      currentOpacity += (targetOpacity - currentOpacity) * 0.1;

      // Click squish
      let clickScaleX = 1;
      let clickScaleY = 1;
      if (clicking) {
        clickScaleX = 1.3;
        clickScaleY = 0.7;
      }

      const halfW = currentWidth / 2;
      const halfH = currentHeight / 2;

      // Only apply stretch when in default dot mode (not morphed)
      const isMorphed = targetWidth > BASE_SIZE + 4;
      const stretchX = isMorphed ? 1 : 1 + stretch;
      const stretchY = isMorphed ? 1 : 1 - stretch * 0.5;
      const rotAngle = (speed > 1 && !isMorphed) ? angle : 0;

      dot.style.width = `${currentWidth}px`;
      dot.style.height = `${currentHeight}px`;
      dot.style.borderRadius = `${currentRadius}%`;
      dot.style.transform = `translate3d(${dx - halfW}px, ${dy - halfH}px, 0) rotate(${rotAngle}deg) scale(${currentScale * stretchX * clickScaleX}, ${currentScale * stretchY * clickScaleY})`;
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
      cleanupMagnetic();
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
          border: '1.5px solid var(--color-interactive)',
          background: 'transparent',
          zIndex: 10002,
          willChange: 'transform',
          mixBlendMode: 'difference',
        }}
      />
    </>
  );
}
