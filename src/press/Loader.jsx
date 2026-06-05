import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { fireImpact } from './PressImpacts';

/**
 * Press start — a blank cream sheet feeds in, an ink roller lays the nameplate
 * TEJAL GOYAL with a CHA-CHUNK, a red plate rides off-register and snaps home,
 * the edition line stamps. ~1.2s, skippable (any key/click), once per session.
 * On finish it sets sessionStorage and dispatches `press:loaded` so the masthead
 * sets its lead story, then the sheet feeds up and away to reveal the page.
 */
const SESSION_KEY = 'press-loaded';

export default function Loader() {
  const [done, setDone] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === '1'
  );
  const rootRef = useRef(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    // Already printed this session — let the masthead set, then stay unmounted.
    if (done) {
      window.dispatchEvent(new Event('press:loaded'));
      return;
    }

    const root = rootRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Hold the page still while the press warms up.
    window.__lenis?.stop();
    document.documentElement.classList.add('press-booting');

    let detachSkip;
    const finish = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      detachSkip?.();

      sessionStorage.setItem(SESSION_KEY, '1');
      window.dispatchEvent(new Event('press:loaded'));

      const unlock = () => {
        window.__lenis?.start();
        document.documentElement.classList.remove('press-booting');
        setDone(true);
      };

      if (reduced) gsap.to(root, { opacity: 0, duration: 0.3, onComplete: unlock });
      else gsap.to(root, { yPercent: -100, duration: 0.7, ease: 'power4.inOut', onComplete: unlock });
    };

    const ctx = gsap.context(() => {
      if (reduced) {
        gsap.set('.loader-plate, .loader-edition, .loader-kicker', { opacity: 1, clipPath: 'inset(0)' });
        gsap.delayedCall(0.6, finish);
        return;
      }

      const tl = gsap.timeline({ onComplete: finish });
      tl.to('.loader-kicker', { opacity: 1, duration: 0.3, ease: 'power1.out' })
        // ink roller lays the nameplate left → right
        .fromTo(
          '.loader-plate',
          { clipPath: 'inset(0 100% 0 0)', opacity: 1 },
          { clipPath: 'inset(0 0% 0 0)', duration: 0.6, ease: 'power3.inOut' },
          0.1
        )
        // registration settle
        .fromTo('.loader-plate', { scale: 1.03 }, { scale: 1, duration: 0.4, ease: 'back.out(1.8)' }, '<')
        // red plate rides off-register then snaps home (the riso tell)
        .fromTo(
          '.loader-ghost',
          { clipPath: 'inset(0 100% 0 0)', x: 5, y: 4, opacity: 0.85 },
          { clipPath: 'inset(0 0% 0 0)', x: 0, y: 0, opacity: 0, duration: 0.6, ease: 'power3.inOut' },
          0.18
        )
        // the slam
        .add(() => fireImpact('CHA-CHUNK', window.innerWidth / 2, window.innerHeight / 2 - 30, 'ink'), 0.55)
        // edition line stamps
        .fromTo(
          '.loader-edition',
          { scale: 1.5, opacity: 0, rotate: -6 },
          { scale: 1, opacity: 1, rotate: 0, duration: 0.4, ease: 'back.out(2)' },
          0.6
        )
        .to({}, { duration: 0.25 }); // hold the front page a beat
    }, root);

    const skip = () => finish();
    window.addEventListener('keydown', skip);
    window.addEventListener('pointerdown', skip);
    detachSkip = () => {
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
    };

    return () => {
      detachSkip?.();
      ctx.revert();
      // never strand the page locked
      window.__lenis?.start();
      document.documentElement.classList.remove('press-booting');
    };
  }, [done]);

  if (done) return null;

  return (
    <div ref={rootRef} className="press-loader" role="status" aria-label="Starting the press">
      <div className="loader-sheet">
        <span className="loader-kicker">THE PERSONAL PRESS</span>
        <div className="loader-plate-wrap">
          <span className="loader-ghost" aria-hidden="true">TEJAL GOYAL</span>
          <h1 className="loader-plate">TEJAL GOYAL</h1>
        </div>
        <span className="loader-edition">VOL.&nbsp;I · NO.&nbsp;1 · VICTORIA, BC · EST.&nbsp;2002</span>
      </div>
    </div>
  );
}
