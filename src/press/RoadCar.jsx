import { useEffect, useRef } from 'react';
import { PLAY_LIVE, PLAY_URL } from '../data/site';
import Hand from './Hand';

/**
 * The road along the bottom of Let's talk, and the little rally car on it
 * (src/gl/car-stage.js draws and drives it). The car is fetched only as the
 * road gets near. Over it, an invisible hit area takes the pointer: it
 * stops the car, winks its headlights, and shows the pen note — a link to the driving game once it's live
 * (src/data/site.js), until then just word that the garage opens soon.
 */
export default function RoadCar() {
  const roadRef = useRef(null);

  useEffect(() => {
    const road = roadRef.current;
    if (!road) return;
    let stop = null;
    let cancelled = false;
    const near = new IntersectionObserver(
      async ([e]) => {
        if (!e.isIntersecting) return;
        near.disconnect();
        const { startCarStage } = await import('../gl/car-stage');
        if (cancelled) return;
        stop = await startCarStage({
          road,
          canvas: road.querySelector('.car-canvas'),
          hit: road.querySelector('.car-hit'),
          note: road.querySelector('.car-note'),
          beam: road.querySelector('.car-beam'),
        });
        if (cancelled) stop?.();
      },
      { rootMargin: '600px 0px' }
    );
    near.observe(road);
    return () => {
      cancelled = true;
      near.disconnect();
      stop?.();
    };
  }, []);

  const Hit = PLAY_LIVE ? 'a' : 'button';
  const hitProps = PLAY_LIVE
    ? { href: PLAY_URL, 'aria-label': 'Take the car out for a spin (opens the driving game)' }
    : { type: 'button', 'aria-label': 'The car. The garage opens soon.' };

  return (
    <div ref={roadRef} className="contact-road">
      <span className="car-beam" aria-hidden="true" />
      <canvas className="car-canvas" aria-hidden="true" />
      <Hit className="car-hit" {...hitProps} />
      <p className="car-note" aria-hidden="true">
        <Hand className="car-note-text">{PLAY_LIVE ? 'Want to drive it? Take it out for a spin →' : 'The garage opens soon'}</Hand>
      </p>
    </div>
  );
}
