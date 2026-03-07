import { useRef, useEffect } from 'react';

export default function MatrixBg() {
  const ref = useRef(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = c.getContext('2d');
    const resize = () => {
      c.width = c.parentElement.offsetWidth;
      c.height = c.parentElement.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const chars = '01アウエカキケサシスセソ>_{};TEJAL'.split('');
    let drops = [];

    const initDrops = () => {
      const cols = Math.floor(c.width / 16);
      drops = Array(cols).fill(0).map(() => Math.random() * -40);
    };
    initDrops();

    let raf;
    const draw = () => {
      ctx.fillStyle = 'rgba(10,10,10,0.07)';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.font = "13px 'IBM Plex Mono', monospace";

      const cols = Math.floor(c.width / 16);
      while (drops.length < cols) drops.push(Math.random() * -30);

      for (let i = 0; i < Math.min(drops.length, cols); i++) {
        if (drops[i] < 0) { drops[i]++; continue; }
        const ch = chars[Math.floor(Math.random() * chars.length)];
        const b = Math.random();
        ctx.fillStyle = b > 0.97
          ? 'rgba(255,255,255,0.8)'
          : b > 0.8
            ? 'rgba(0,255,65,0.3)'
            : `rgba(0,255,65,${0.03 + b * 0.1})`;
        ctx.fillText(ch, i * 16, drops[i] * 16);
        if (drops[i] * 16 > c.height && Math.random() > 0.98) drops[i] = Math.random() * -20;
        drops[i]++;
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <>
      <canvas ref={ref} className="absolute inset-0 opacity-35 pointer-events-none" />
      {/* Bottom gradient - taller and smoother with multiple stops */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: 280,
          background: `linear-gradient(
            to bottom,
            transparent 0%,
            rgba(10,10,10,0.1) 20%,
            rgba(10,10,10,0.4) 45%,
            rgba(10,10,10,0.75) 65%,
            #0a0a0a 100%
          )`,
        }}
      />
      {/* Subtle left fade for text readability */}
      <div
        className="absolute top-0 left-0 bottom-0 w-[80px] pointer-events-none"
        style={{ background: 'linear-gradient(90deg, rgba(10,10,10,0.4), transparent)' }}
      />
    </>
  );
}
