import { useRef, useEffect } from 'react';
import { gsap, ScrollTrigger } from '../hooks/useGSAP';

export default function SectionHeader({ id, title, sub }) {
  const containerRef = useRef(null);
  const titleRef = useRef(null);
  const lineRef = useRef(null);
  const subRef = useRef(null);
  const charsRef = useRef([]);
  const rippleReady = useRef(false);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;

    const text = el.textContent;
    el.textContent = '';
    el.setAttribute('aria-label', text);

    // Split into individual characters for ripple effect
    const chars = [];
    const words = text.split(' ');
    words.forEach((word, wi) => {
      for (let ci = 0; ci < word.length; ci++) {
        const span = document.createElement('span');
        span.textContent = word[ci];
        span.style.display = 'inline-block';
        span.style.opacity = '0';
        span.style.transformOrigin = 'bottom center';
        span.setAttribute('aria-hidden', 'true');
        el.appendChild(span);
        chars.push(span);
      }
      if (wi < words.length - 1) {
        const space = document.createElement('span');
        space.innerHTML = '&nbsp;';
        space.style.display = 'inline-block';
        space.style.minWidth = '0.3em';
        el.appendChild(space);
      }
    });

    charsRef.current = chars;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 85%',
          once: true,
        },
      });

      // Character-level entrance stagger
      tl.fromTo(chars, {
        opacity: 0,
        y: 30,
        rotateX: -40,
      }, {
        opacity: 1,
        y: 0,
        rotateX: 0,
        duration: 0.7,
        stagger: 0.025,
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

      // Enable ripple after entrance completes
      tl.eventCallback('onComplete', () => { rippleReady.current = true; });
    }, containerRef);

    // Hover ripple: wave of characters jumping up + color flash
    const handleEnter = () => {
      if (!rippleReady.current) return;

      gsap.timeline()
        .to(chars, {
          y: -14,
          scale: 1.15,
          color: 'var(--color-interactive)',
          duration: 0.25,
          stagger: { each: 0.025 },
          ease: 'power2.out',
          overwrite: 'auto',
        })
        .to(chars, {
          y: 0,
          scale: 1,
          color: 'var(--color-text)',
          duration: 0.6,
          stagger: { each: 0.025 },
          ease: 'elastic.out(1.2, 0.4)',
        }, '-=0.2');
    };

    el.style.cursor = 'none';
    el.addEventListener('mouseenter', handleEnter);

    return () => {
      ctx.revert();
      el.removeEventListener('mouseenter', handleEnter);
    };
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
