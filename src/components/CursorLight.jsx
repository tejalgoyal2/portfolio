import { useEffect, useRef } from 'react';

const HOVER_SELECTORS = 'a, button, [role="button"], input, .featured-card, .project-card, .about-panel, .contact-link, .skill-cell, .blog-strip-card';
const BUTTON_SELECTORS = 'button, [role="button"], .btn-live, .link-source, .nav-link-resume, .hero-link';
const LINK_SELECTORS = 'a:not(.btn-live):not(.link-source):not(.nav-link-resume):not(.hero-link):not(.contact-link)';
const CARD_SELECTORS = '.featured-card, .project-card, .about-panel, .contact-link, .skill-cell, .blog-strip-card';

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
  const labelRef = useRef(null);

  useEffect(() => {
    const glow = glowRef.current;
    const dot = dotRef.current;
    const label = labelRef.current;
    if (!glow || !dot || !label) return;

    // Read theme interactive color
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
    let snapX = 0, snapY = 0;
    let snapActive = false;

    const getBaseGlow = () => document.documentElement.getAttribute('data-theme') === 'light' ? 0.03 : 0.07;
    const getHoverGlow = () => document.documentElement.getAttribute('data-theme') === 'light' ? 0.06 : 0.12;
    let glowIntensity = getBaseGlow();
    let targetGlowIntensity = getBaseGlow();

    // Cursor state
    let hovering = false;
    let clicking = false;
    let cursorMode = 'default'; // default | button | link | card
    let targetScale = 1;
    let currentScale = 1;
    let targetBorderRadius = 50; // percentage
    let currentBorderRadius = 50;
    let targetOpacity = 1;
    let currentOpacity = 1;
    let showLabel = false;
    let labelText = '';
    let raf;

    const onMove = (e) => {
      mx = e.clientX;
      my = e.clientY;

      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el) return;

      const interactive = el.closest(HOVER_SELECTORS);
      const isButton = el.closest(BUTTON_SELECTORS);
      const isLink = el.closest(LINK_SELECTORS);
      const isCard = el.closest(CARD_SELECTORS);

      if (interactive) {
        hovering = true;
        targetGlowIntensity = getHoverGlow();

        if (isButton) {
          cursorMode = 'button';
          targetScale = 5;
          targetBorderRadius = 30;
          targetOpacity = 0.15;
          showLabel = true;
          labelText = 'click';
        } else if (isCard) {
          cursorMode = 'card';
          targetScale = 0.6;
          targetOpacity = 1;
          targetBorderRadius = 50;
          showLabel = false;
        } else if (isLink) {
          cursorMode = 'link';
          targetScale = 4;
          targetBorderRadius = 50;
          targetOpacity = 0.12;
          showLabel = true;
          labelText = 'view';
        } else {
          cursorMode = 'default';
          targetScale = 1.6;
          targetBorderRadius = 50;
          targetOpacity = 1;
          showLabel = false;
        }

        // Magnetic snap for small elements
        const rect = interactive.getBoundingClientRect();
        if (rect.width < 200 && rect.height < 80) {
          snapX = rect.left + rect.width / 2;
          snapY = rect.top + rect.height / 2;
          snapActive = true;
        } else {
          snapActive = false;
        }
      } else {
        hovering = false;
        cursorMode = 'default';
        targetScale = 1;
        targetBorderRadius = 50;
        targetOpacity = 1;
        targetGlowIntensity = getBaseGlow();
        snapActive = false;
        showLabel = false;
      }
    };

    const onDown = () => {
      clicking = true;
    };

    const onUp = () => {
      clicking = false;
    };

    const BASE_SIZE = 8;

    const tick = () => {
      // Glow
      gx += (mx - gx) * 0.05;
      gy += (my - gy) * 0.05;
      glowIntensity += (targetGlowIntensity - glowIntensity) * 0.08;
      glow.style.transform = `translate3d(${gx - 250}px, ${gy - 250}px, 0)`;
      glow.style.background = `radial-gradient(circle, rgba(${interactiveRGB},${glowIntensity}) 0%, rgba(${interactiveRGB},${glowIntensity * 0.3}) 40%, transparent 70%)`;

      // Dot target position
      let targetX = mx;
      let targetY = my;
      if (snapActive) {
        targetX = mx + (snapX - mx) * 0.04;
        targetY = my + (snapY - my) * 0.04;
      }

      dx += (targetX - dx) * 0.4;
      dy += (targetY - dy) * 0.4;

      // Velocity for stretch
      const vx = dx - prevDx;
      const vy = dy - prevDy;
      const speed = Math.sqrt(vx * vx + vy * vy);
      const angle = Math.atan2(vy, vx) * (180 / Math.PI);
      const stretch = Math.min(speed * 0.08, 0.5);
      prevDx = dx;
      prevDy = dy;

      // Animate scale and shape
      currentScale += (targetScale - currentScale) * 0.15;
      currentBorderRadius += (targetBorderRadius - currentBorderRadius) * 0.15;
      currentOpacity += (targetOpacity - currentOpacity) * 0.12;

      // Click squish
      let clickScaleX = 1;
      let clickScaleY = 1;
      if (clicking) {
        clickScaleX = 1.4;
        clickScaleY = 0.6;
      }

      const halfSize = (BASE_SIZE * currentScale) / 2;
      const stretchX = cursorMode === 'default' ? 1 + stretch : 1;
      const stretchY = cursorMode === 'default' ? 1 - stretch * 0.5 : 1;
      const rotAngle = cursorMode === 'default' && speed > 1 ? angle : 0;

      dot.style.transform = `translate3d(${dx - halfSize}px, ${dy - halfSize}px, 0) rotate(${rotAngle}deg) scale(${currentScale * stretchX * clickScaleX}, ${currentScale * stretchY * clickScaleY})`;
      dot.style.borderRadius = `${currentBorderRadius}%`;
      dot.style.opacity = currentOpacity;

      // Mix-blend-mode for link/button states
      if (cursorMode === 'button' || cursorMode === 'link') {
        dot.style.mixBlendMode = 'difference';
        dot.style.background = '#fff';
      } else {
        dot.style.mixBlendMode = 'normal';
        dot.style.background = `rgba(${interactiveRGB},1)`;
      }

      // Label
      if (showLabel && currentScale > 2) {
        label.style.opacity = '1';
        label.textContent = labelText;
      } else {
        label.style.opacity = '0';
      }
      label.style.transform = `translate3d(${dx - 16}px, ${dy - 5}px, 0)`;

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
          transition: 'border-radius 0.2s, background 0.15s',
        }}
      />

      <span
        ref={labelRef}
        className="fixed top-0 left-0 pointer-events-none font-mono"
        style={{
          fontSize: '8px',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: 'var(--color-interactive)',
          zIndex: 10003,
          opacity: 0,
          willChange: 'transform',
          transition: 'opacity 0.2s',
        }}
      />
    </>
  );
}
