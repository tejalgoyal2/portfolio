import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { OnomatopoeiaBurst, pickOnomFor } from '../comic/OnomatopoeiaBurst';

/**
 * Global click-burst dispatcher.
 *  - Listens for clicks on <a>/<button>/[data-onom] and fires a comic word
 *    burst at the click point.
 *  - Also listens for a custom 'onom-burst' event for imperative callers
 *    (skill physics collisions, etc.).
 *  - Throttles to avoid spam: max 6 active bursts at once.
 */
const MAX_BURSTS = 8;
const COOLDOWN_MS = 35; // permissive so physics collisions can chain

export default function OnomatopoeiaTrail() {
  const [bursts, setBursts] = useState([]);
  const lastFireRef = useRef(0);
  const seqRef = useRef(0);

  useEffect(() => {
    const fire = (detail) => {
      const now = performance.now();
      if (now - lastFireRef.current < COOLDOWN_MS) return;
      lastFireRef.current = now;

      setBursts((prev) => {
        const next = [...prev, { id: ++seqRef.current, ...detail }];
        return next.length > MAX_BURSTS ? next.slice(next.length - MAX_BURSTS) : next;
      });
    };

    const onClick = (e) => {
      const el = e.target.closest?.('a, button, [data-onom]');
      if (!el) return;
      // Skip if the element explicitly opts out
      if (el.dataset.noOnom != null) return;

      const word = el.dataset.onom || pickOnomFor(el);
      const rotation = (Math.random() - 0.5) * 22;
      fire({ word, x: e.clientX, y: e.clientY, rotation });
    };

    const onCustom = (e) => {
      fire(e.detail);
    };

    document.addEventListener('click', onClick, { capture: true });
    window.addEventListener('onom-burst', onCustom);
    return () => {
      document.removeEventListener('click', onClick, { capture: true });
      window.removeEventListener('onom-burst', onCustom);
    };
  }, []);

  const handleDone = (id) => {
    setBursts((prev) => prev.filter((b) => b.id !== id));
  };

  // Portal to body so bursts paint above any stacking context in the React
  // tree and never inherit a transformed/filtered ancestor's quirks.
  return createPortal(
    <>
      {bursts.map((b) => (
        <OnomatopoeiaBurst
          key={b.id}
          word={b.word}
          x={b.x}
          y={b.y}
          rotation={b.rotation}
          color={b.color}
          fontSize={b.fontSize}
          onDone={() => handleDone(b.id)}
        />
      ))}
    </>,
    document.body
  );
}
