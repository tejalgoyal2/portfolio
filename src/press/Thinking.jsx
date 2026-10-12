import { useEffect, useRef, useState } from 'react';
import { prefs } from '../life/prefs';

/**
 * The masthead's status line, borrowed from a terminal that's thinking: a
 * little star that twinkles through its shapes, and a verb in the -ing that
 * changes every few seconds with a shimmer running across it — what I'm up to,
 * more or less. Plus the seconds you've been here, because the terminal
 * counts too. Reduced motion: the star holds still, the words still change.
 */
const GLYPHS = ['·', '✢', '✳', '✶', '✻', '✽', '✻', '✶', '✳', '✢'];
const WORDS = [
  'Shipping',
  'Debugging',
  'Caffeinating',
  'Refactoring',
  'Overthinking',
  'Rubber-ducking',
  'Pipelining',
  'Prompting',
  'Yak-shaving',
  'Tinkering',
  'Noodling',
  'Cubing',
  'Doodling',
  'Benchmarking',
  'Scheming',
  'Inking',
  'Tejal-ing',
];

export default function Thinking() {
  const [word, setWord] = useState(0);
  const [secs, setSecs] = useState(0);
  const glyphRef = useRef(null);

  useEffect(() => {
    const t0 = performance.now();
    let g = 0;
    // a fresh word every few seconds, never the same twice running
    const words = setInterval(() => {
      setWord((w) => (w + 1 + Math.floor(Math.random() * (WORDS.length - 2))) % WORDS.length);
    }, 3200);
    const clock = setInterval(() => setSecs(Math.floor((performance.now() - t0) / 1000)), 1000);
    const twinkle = setInterval(() => {
      if (prefs.reduced || !glyphRef.current) return;
      g = (g + 1) % GLYPHS.length;
      glyphRef.current.textContent = GLYPHS[g];
    }, 120);
    return () => {
      clearInterval(words);
      clearInterval(clock);
      clearInterval(twinkle);
    };
  }, []);

  const text = `${WORDS[word]}…`;
  return (
    // decoration that never stops changing: kept away from screen readers
    <span className="thinking" aria-hidden="true">
      <span ref={glyphRef} className="thinking-glyph">
        ✻
      </span>
      <span className="thinking-word" key={word}>
        {[...text].map((ch, i) => (
          <span key={i} style={{ '--i': i }}>
            {ch}
          </span>
        ))}
      </span>
      <span className="thinking-secs">
        ({secs}s)
      </span>
    </span>
  );
}
