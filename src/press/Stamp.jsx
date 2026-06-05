import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { fireImpact } from './PressImpacts';

/**
 * A rubber stamp — LIVE, REPO, PROTOTYPE, APPROVED, "— 30 —". Letter-spaced
 * mono inside a 2px box, rotated a few degrees, faintly distressed. Optional
 * press-in slam when it scrolls into view. Optional interactive mode — renders
 * as a <button>; click or Enter/Space fires a stamp impact + a brief audio tick
 * (user-gesture-gated, never autoplay).
 */
export default function Stamp({
  label,
  tone = 'red',
  rotate = -4,
  pressIn = false,
  interactive = false,
  className = '',
}) {
  const ref = useRef(null);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    if (!pressIn) return;
    const el = ref.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const st = gsap.fromTo(
      el,
      { scale: 1.6, opacity: 0, rotate: rotate - 8 },
      {
        scale: 1,
        opacity: 1,
        rotate,
        duration: 0.4,
        ease: 'back.out(2)',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      }
    );
    return () => st.scrollTrigger?.kill();
  }, [pressIn, rotate]);

  const playTick = () => {
    try {
      audioCtxRef.current ||= new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(85, t + 0.07);
      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.11);
    } catch { /* audio optional */ }
  };

  const handleStamp = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) fireImpact(label, r.left + r.width / 2, r.top + r.height / 2, tone);
    playTick();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleStamp();
    }
  };

  const Tag = interactive ? 'button' : 'span';
  const iProps = interactive
    ? {
        type: 'button',
        onClick: handleStamp,
        onKeyDown: handleKeyDown,
        'aria-label': `${label} — click to stamp`,
      }
    : {};

  return (
    <Tag
      ref={ref}
      className={`press-stamp press-stamp--${tone}${interactive ? ' press-stamp--interactive' : ''} ${className}`.trim()}
      style={{ '--stamp-rot': `${rotate}deg` }}
      data-magnetic
      {...iProps}
    >
      {label}
    </Tag>
  );
}
