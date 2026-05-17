import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

/**
 * A headline that sets like movable type — each glyph drops, rotates a touch,
 * and slams into the stick on a back-ease. This is THE motion signature of the
 * site. On the last letter landing a faint red ink-spread blooms behind it; an
 * optional red ghost rides 3px off register and snaps into alignment (the riso
 * tell). Reduced-motion → plain appearance.
 *
 *   as: tag name   font: 'name' (Fraunces) | 'impact' (Anton)   misregister: bool
 */
export default function KineticHeadline({
  children,
  as: Tag = 'h2',
  font = 'name',
  misregister = false,
  className = '',
  spread = true,
  intro = false,
}) {
  const rootRef = useRef(null);
  const text = String(children);
  const words = text.split(' ');

  useEffect(() => {
    const root = rootRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let detach;

    const ctx = gsap.context(() => {
      const chars = gsap.utils.toArray('.kh-char');
      if (reduced) {
        gsap.set(chars, { opacity: 1, yPercent: 0, rotateZ: 0 });
        return;
      }
      const tl = gsap.timeline({
        paused: intro,
        scrollTrigger: intro ? undefined : { trigger: root, start: 'top 82%', once: true },
      });
      tl.fromTo(
        chars,
        { yPercent: 115, opacity: 0, rotateZ: () => gsap.utils.random(-7, 7) },
        {
          yPercent: 0,
          opacity: 1,
          rotateZ: 0,
          ease: 'back.out(1.7)',
          stagger: 0.025,
          duration: 0.5,
        }
      );
      if (misregister) {
        tl.fromTo(
          '.kh-ghost',
          { x: 3, y: 3, opacity: 0.8 },
          { x: 0, y: 0, opacity: 0, duration: 0.5, ease: 'power2.out' },
          0.12
        );
      }
      if (spread) {
        tl.fromTo(
          '.kh-spread',
          { scale: 0.5, opacity: 0 },
          { scale: 1.5, opacity: 0.42, duration: 0.45, ease: 'power2.out' },
          '>-0.15'
        ).to('.kh-spread', { opacity: 0, scale: 1.7, duration: 0.5, ease: 'power1.out' });
      }

      // intro headlines wait for the loader to lift (press:loaded), or play at
      // once if the loader already ran this session.
      if (intro) {
        const play = () => tl.play(0);
        if (sessionStorage.getItem('press-loaded')) play();
        else {
          window.addEventListener('press:loaded', play, { once: true });
          detach = () => window.removeEventListener('press:loaded', play);
        }
      }
    }, root);

    return () => {
      detach?.();
      ctx.revert();
    };
  }, [text, misregister, spread, intro]);

  return (
    <Tag ref={rootRef} className={`kinetic kinetic--${font} ${className}`} aria-label={text}>
      {spread && <span className="kh-spread" aria-hidden="true" />}
      {misregister && (
        <span className="kh-ghost" aria-hidden="true">
          {text}
        </span>
      )}
      <span className="kh-set" aria-hidden="true">
        {words.map((word, wi) => (
          <span className="kh-word" key={wi}>
            {[...word].map((ch, ci) => (
              <span className="kh-char" key={ci}>
                {ch}
              </span>
            ))}
            {wi < words.length - 1 && <span className="kh-space">{' '}</span>}
          </span>
        ))}
      </span>
    </Tag>
  );
}
