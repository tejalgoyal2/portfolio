import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { fireImpact } from './PressImpacts';

/**
 * Declassify reveal — text loads under an ink bar; the bar wipes away to the
 * right to un-redact. This is the press's "leaked source" mechanic: primary
 * treatment for the Blog (hover) and security bullets (scroll). On reveal a
 * faint STAMP impact lands over the word. Reduced-motion reveals instantly.
 *
 *   trigger: 'scroll' | 'hover'   tone: 'ink' | 'red'
 */
export default function Redacted({ children, trigger = 'scroll', tone = 'ink', stamp = true }) {
  const wrapRef = useRef(null);
  const barRef = useRef(null);
  const [revealed, setRevealed] = useState(false);

  const reveal = () => {
    if (revealed) return;
    setRevealed(true);
    const bar = barRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const fire = () => {
      if (!stamp) return;
      const r = wrapRef.current.getBoundingClientRect();
      fireImpact('STAMP', r.left + r.width / 2, r.top + r.height / 2, tone);
    };

    if (reduced) {
      gsap.set(bar, { clipPath: 'inset(0 0 0 100%)' });
      fire();
      return;
    }
    gsap.to(bar, {
      clipPath: 'inset(0 0 0 100%)',
      duration: 0.45,
      ease: 'power3.inOut',
      onComplete: fire,
    });
  };

  useEffect(() => {
    if (trigger !== 'scroll') return;
    const el = wrapRef.current;
    const st = gsap.to({}, {
      duration: 0.01,
      scrollTrigger: { trigger: el, start: 'top 75%', once: true, onEnter: reveal },
    });
    return () => st.scrollTrigger?.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return (
    <span
      ref={wrapRef}
      className={`redacted ${revealed ? 'is-revealed' : ''}`}
      onPointerEnter={trigger === 'hover' ? reveal : undefined}
      data-magnetic={trigger === 'hover' ? '' : undefined}
    >
      <span className="redacted-text">{children}</span>
      <span ref={barRef} className={`redacted-bar redacted-bar--${tone}`} aria-hidden="true" />
    </span>
  );
}
