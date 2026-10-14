import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Scratch-off. The words are printed under a panel of ink you can rub away
 * with the pen: drag across it and it comes off where you went, in pen-wide
 * strokes, until enough is gone and the rest flakes off on its own. Nothing
 * pops up, nothing covers anything else — it's your hand that does it.
 *
 * - trigger 'scroll' (a stat, a word in a bullet): if you don't scratch it,
 *   the panel scratches itself away a couple of seconds after it comes into
 *   view, so nobody misses what's under it.
 * - trigger 'hover' (the punchline in a blog title): it only comes off when
 *   you scratch it; on touch, a tap scrubs it away.
 *
 * The text is always in the DOM for screen readers; the panel is a canvas
 * marked aria-hidden. Reduced motion: the panel simply fades when it's due.
 *
 *   trigger: 'scroll' | 'hover'   tone: 'ink' | 'red'
 */
const PEN = 9; // px radius of the scratch
const DONE = 0.5; // share cleared before the rest flakes off
const TONES = { ink: ['#1c140e', '#3a2e24'], red: ['#c41d21', '#e0443f'] };

export default function Redacted({ children, trigger = 'scroll', tone = 'ink' }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let w = 0;
    let h = 0;
    let dpr = 1;
    let done = false;
    let last = null;
    let strokes = 0;
    let auto = 0;

    const paint = () => {
      const r = wrap.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.ceil(r.width + 6);
      h = Math.ceil(r.height + 4);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const [a, b] = TONES[tone] || TONES.ink;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = a;
      ctx.fillRect(0, 0, w, h);
      // the panel's tooth: fine diagonal scuffs, like a scratch card's foil
      ctx.strokeStyle = b;
      ctx.lineWidth = 0.7;
      for (let x = -h; x < w; x += 3.2) {
        ctx.beginPath();
        ctx.moveTo(x, h);
        ctx.lineTo(x + h, 0);
        ctx.stroke();
      }
    };
    paint();

    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(auto);
      gsap.to(canvas, {
        opacity: 0,
        duration: reduced ? 0.3 : 0.45,
        ease: 'power1.out',
        onComplete: () => setRevealed(true),
      });
    };

    const cleared = () => {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let gone = 0;
      let n = 0;
      for (let i = 3; i < data.length; i += 4 * 7) {
        n++;
        if (data[i] < 40) gone++;
      }
      return gone / Math.max(1, n);
    };

    const scratch = (x, y) => {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineCap = 'round';
      ctx.lineWidth = PEN * 2;
      ctx.beginPath();
      ctx.moveTo(last ? last.x : x, last ? last.y : y);
      ctx.lineTo(x, y);
      ctx.stroke();
      last = { x, y };
      if (++strokes % 6 === 0 && cleared() > DONE) finish();
    };

    const local = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMove = (e) => {
      if (done) return;
      if (e.pointerType === 'touch' && !e.buttons) return;
      clearTimeout(auto);
      const p = local(e);
      scratch(p.x, p.y);
    };
    const onLeave = () => (last = null);
    const onTap = (e) => {
      if (e.pointerType === 'touch') selfScratch();
    };

    // when nobody scratches: the pen scrubs it off by itself, in quick zigzags
    const selfScratch = () => {
      if (done) return;
      if (reduced) return finish();
      const pass = { t: 0 };
      last = null;
      gsap.to(pass, {
        t: 1,
        duration: 0.7,
        ease: 'power1.inOut',
        onUpdate: () => {
          const x = pass.t * (w + PEN);
          const y = h / 2 + Math.sin(pass.t * Math.PI * 7) * (h / 2);
          scratch(x, y);
        },
        onComplete: finish,
      });
    };

    let st = null;
    if (trigger === 'scroll') {
      st = ScrollTrigger.create({
        trigger: wrap,
        start: 'top 78%',
        once: true,
        onEnter: () => (auto = setTimeout(selfScratch, reduced ? 400 : 2200)),
      });
    }

    wrap.addEventListener('pointermove', onMove);
    wrap.addEventListener('pointerleave', onLeave);
    wrap.addEventListener('pointerdown', onTap);
    const ro = new ResizeObserver(() => !done && paint());
    ro.observe(wrap);
    return () => {
      clearTimeout(auto);
      st?.kill();
      ro.disconnect();
      wrap.removeEventListener('pointermove', onMove);
      wrap.removeEventListener('pointerleave', onLeave);
      wrap.removeEventListener('pointerdown', onTap);
    };
  }, [trigger, tone]);

  return (
    <span
      ref={wrapRef}
      className={`redacted${revealed ? ' is-revealed' : ''}`}
      data-scratch={trigger}
      data-pen={revealed ? undefined : 'eraser'}
    >
      <span className="redacted-text">{children}</span>
      {!revealed && <canvas ref={canvasRef} className="redacted-panel" aria-hidden="true" />}
    </span>
  );
}
