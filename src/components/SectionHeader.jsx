import { useRef, useEffect } from 'react';
import { gsap, ScrollTrigger } from '../hooks/useGSAP';

export default function SectionHeader({ id, title, sub }) {
  const containerRef = useRef(null);
  const titleRef = useRef(null);
  const lineRef = useRef(null);
  const subRef = useRef(null);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;

    const text = el.textContent;
    el.textContent = '';
    el.setAttribute('aria-label', text);

    const words = text.split(' ');
    const spans = words.map((word, i) => {
      const span = document.createElement('span');
      span.textContent = word;
      span.style.display = 'inline-block';
      span.style.opacity = '0';
      span.setAttribute('aria-hidden', 'true');
      el.appendChild(span);
      if (i < words.length - 1) {
        const space = document.createTextNode(' ');
        el.appendChild(space);
      }
      return span;
    });

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 85%',
          once: true,
        },
      });

      tl.fromTo(spans, {
        opacity: 0,
        y: 30,
        rotateX: -40,
      }, {
        opacity: 1,
        y: 0,
        rotateX: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: 'power3.out',
      });

      if (lineRef.current) {
        tl.fromTo(lineRef.current, {
          scaleX: 0,
        }, {
          scaleX: 1,
          duration: 0.8,
          ease: 'power2.inOut',
        }, '-=0.3');
      }

      if (subRef.current) {
        tl.fromTo(subRef.current, {
          opacity: 0,
          x: -10,
        }, {
          opacity: 1,
          x: 0,
          duration: 0.5,
          ease: 'power2.out',
        }, '-=0.4');
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} id={`s-${id}`} className="mb-10 pt-24" style={{ perspective: '600px' }}>
      <h2
        ref={titleRef}
        className="font-display font-bold tracking-[-0.02em] m-0"
        style={{
          fontSize: 'clamp(28px, 4vw, 44px)',
          color: 'var(--color-text)',
        }}
      >
        {title}
      </h2>
      <div
        ref={lineRef}
        className="h-[1px] mt-3 origin-left"
        style={{
          background: 'linear-gradient(90deg, var(--color-interactive), transparent 70%)',
          transform: 'scaleX(0)',
        }}
      />
      {sub && (
        <p
          ref={subRef}
          className="text-[12px] font-mono mt-2 tracking-[0.3px]"
          style={{ color: 'var(--color-text-dim)', opacity: 0 }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
