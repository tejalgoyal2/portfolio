import { useEffect, useRef } from 'react';

export default function CursorLight() {
  const glowRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    const glow = glowRef.current;
    const ring = ringRef.current;
    if (!glow || !ring) return;

    let mx = -600, my = -600;
    let gx = -600, gy = -600;
    let rx = -600, ry = -600;
    let raf;

    const onMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
    };

    const tick = () => {
      // Glow follows slowly for ambient feel
      gx += (mx - gx) * 0.06;
      gy += (my - gy) * 0.06;
      glow.style.transform = `translate3d(${gx - 250}px, ${gy - 250}px, 0)`;

      // Ring follows faster, slight trail behind cursor
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate3d(${rx - 16}px, ${ry - 16}px, 0)`;

      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      {/* Ambient purple glow */}
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
      {/* Cursor ring */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 pointer-events-none"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: '1px solid rgba(139,142,255,0.25)',
          zIndex: 9989,
          willChange: 'transform',
        }}
      />
    </>
  );
}
