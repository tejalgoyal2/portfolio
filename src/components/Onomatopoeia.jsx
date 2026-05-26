import { useState, useEffect, useCallback } from 'react';

const WORDS = ['GO', 'CLICK!', 'LFG', 'ZAP', 'POW'];

export default function Onomatopoeia() {
  const [pops, setPops] = useState([]);

  const cleanup = useCallback((id) => {
    setPops(prev => prev.filter(p => p.id !== id));
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const btn = e.target.closest('a, button, [role="button"]');
      if (!btn) return;

      // Skip nav links and minor buttons
      if (btn.closest('nav')) return;

      const word = WORDS[Math.floor(Math.random() * WORDS.length)];
      const rotation = (Math.random() - 0.5) * 16;
      const id = Date.now() + Math.random();

      setPops(prev => [...prev, {
        id,
        word,
        x: e.clientX,
        y: e.clientY,
        rotation,
      }]);

      setTimeout(() => cleanup(id), 500);
    };

    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [cleanup]);

  if (pops.length === 0) return null;

  return (
    <>
      {pops.map(p => (
        <span
          key={p.id}
          className="onomatopoeia-pop fixed"
          style={{
            left: p.x,
            top: p.y,
            '--ono-rot': `${p.rotation}deg`,
          }}
        >
          {p.word}
        </span>
      ))}
    </>
  );
}
