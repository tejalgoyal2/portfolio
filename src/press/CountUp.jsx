import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

/**
 * A headline number that counts up once as it scrolls into view ("163+",
 * "86%", "1,200+", "~15%"). The final figure is what's in the HTML, so no-JS
 * and reduced motion just read it; the box is locked to the final figure's
 * width and set in tabular figures, so the line never shifts while it counts.
 */
const PARSE = /^([^\d]*)([\d,]*\.?\d+)(.*)$/;

export default function CountUp({ value }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    const m = String(value).match(PARSE);
    if (!el || !m || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const [, pre, num, post] = m;
    const target = parseFloat(num.replace(/,/g, ''));
    const decimals = (num.split('.')[1] || '').length;
    const commas = num.includes(',');
    const fmt = (n) => {
      const s = n.toFixed(decimals);
      return pre + (commas ? Number(s).toLocaleString('en-US', { minimumFractionDigits: decimals }) : s) + post;
    };

    el.style.minWidth = `${el.getBoundingClientRect().width}px`;
    el.textContent = fmt(0);
    const counter = { n: 0 };
    const tween = gsap.to(counter, {
      n: target,
      duration: 0.9,
      ease: 'power2.out',
      paused: true,
      onUpdate: () => (el.textContent = fmt(counter.n)),
    });
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          tween.play();
          io.disconnect();
        }
      },
      // everything above the fold counts too, so a fast scroll past never leaves a 0 behind
      { rootMargin: '100000px 0px -12% 0px' }
    );
    io.observe(el);

    return () => {
      io.disconnect();
      tween.kill();
      el.textContent = value;
      el.style.minWidth = '';
    };
  }, [value]);

  return (
    <span ref={ref} className="count-up">
      {value}
    </span>
  );
}
