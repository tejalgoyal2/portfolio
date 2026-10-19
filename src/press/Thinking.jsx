import { useEffect, useRef, useState } from 'react';
import { prefs } from '../life/prefs';

/**
 * The masthead's status line, borrowed from a terminal that's thinking: a
 * little star that twinkles through its shapes, and one of Claude Code's own
 * -ing verbs, changing every few seconds with a shimmer running across it —
 * what I'm up to, more or less. Reduced motion: the star holds still, the
 * words still change.
 */
const GLYPHS = ['·', '✢', '✳', '✶', '✻', '✽', '✻', '✶', '✳', '✢'];
const WORDS = [
  'Accomplishing',
  'Actioning',
  'Actualizing',
  'Baking',
  'Befuddling',
  'Bloviating',
  'Boondoggling',
  'Booping',
  'Brewing',
  'Bunning',
  'Burrowing',
  'Calculating',
  'Canoodling',
  'Caramelizing',
  'Cascading',
  'Catapulting',
  'Cerebrating',
  'Channelling',
  'Choreographing',
  'Churning',
  'Clauding',
  'Coalescing',
  'Cogitating',
  'Combobulating',
  'Composing',
  'Computing',
  'Concocting',
  'Considering',
  'Contemplating',
  'Cooking',
  'Crafting',
  'Creating',
  'Crunching',
  'Crystallizing',
  'Cultivating',
  'Deciphering',
  'Deliberating',
  'Determining',
  'Dilly-dallying',
  'Discombobulating',
  'Doing',
  'Doodling',
  'Drizzling',
  'Ebbing',
  'Effecting',
  'Elucidating',
  'Embellishing',
  'Enchanting',
  'Envisioning',
  'Evaporating',
  'Fermenting',
  'Fiddle-faddling',
  'Finagling',
  'Flambéing',
  'Flibbertigibbeting',
  'Flowing',
  'Flummoxing',
  'Fluttering',
  'Forging',
  'Forming',
  'Frolicking',
  'Frosting',
  'Gallivanting',
  'Galloping',
  'Garnishing',
  'Generating',
  'Germinating',
  'Gitifying',
  'Grooving',
  'Gusting',
  'Harmonizing',
  'Hashing',
  'Hatching',
  'Herding',
  'Honking',
  'Hullaballooing',
  'Hyperspacing',
  'Ideating',
  'Imagining',
  'Improvising',
  'Incubating',
  'Inferring',
  'Infusing',
  'Ionizing',
  'Jitterbugging',
  'Julienning',
  'Kneading',
  'Leavening',
  'Levitating',
  'Lollygagging',
  'Manifesting',
  'Marinating',
  'Meandering',
  'Metamorphosing',
  'Misting',
  'Moonwalking',
  'Moseying',
  'Mulling',
  'Mustering',
  'Musing',
  'Nebulizing',
  'Nesting',
  'Noodling',
  'Nucleating',
  'Orbiting',
  'Orchestrating',
  'Osmosing',
  'Perambulating',
  'Percolating',
  'Perusing',
  'Philosophising',
  'Photosynthesizing',
  'Pollinating',
  'Pondering',
  'Pontificating',
  'Pouncing',
  'Precipitating',
  'Prestidigitating',
  'Processing',
  'Proofing',
  'Propagating',
  'Puttering',
  'Puzzling',
  'Quantumizing',
  'Razzle-dazzling',
  'Razzmatazzing',
  'Recombobulating',
  'Reticulating',
  'Roosting',
  'Ruminating',
  'Sautéing',
  'Scampering',
  'Schlepping',
  'Scurrying',
  'Seasoning',
  'Shenaniganing',
  'Shimmying',
  'Simmering',
  'Skedaddling',
  'Sketching',
  'Slithering',
  'Smooshing',
  'Sock-hopping',
  'Spelunking',
  'Spinning',
  'Sprouting',
  'Stewing',
  'Sublimating',
  'Swirling',
  'Swooping',
  'Symbioting',
  'Synthesizing',
  'Tempering',
  'Thinking',
  'Thundering',
  'Tinkering',
  'Tomfoolering',
  'Topsy-turvying',
  'Transfiguring',
  'Transmuting',
  'Twisting',
  'Undulating',
  'Unfurling',
  'Unravelling',
  'Vibing',
  'Waddling',
  'Wandering',
  'Warping',
  'Whatchamacalliting',
  'Whirlpooling',
  'Whirring',
  'Whisking',
  'Wibbling',
  'Working',
  'Wrangling',
  'Zesting',
  'Zigzagging',
];

export default function Thinking() {
  const [word, setWord] = useState(() => Math.floor(Math.random() * WORDS.length));
  const glyphRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    let g = 0;
    // only while it's on screen: off it, the words, the star and the shimmer all rest
    let seen = true;
    const io = new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      rootRef.current?.classList.toggle('is-resting', !seen);
    });
    if (rootRef.current) io.observe(rootRef.current);
    // a fresh word every few seconds, never the same twice running
    const words = setInterval(() => {
      if (!seen || document.hidden) return;
      setWord((w) => (w + 1 + Math.floor(Math.random() * (WORDS.length - 2))) % WORDS.length);
    }, 3200);
    const twinkle = setInterval(() => {
      if (!seen || document.hidden || prefs.reduced || !glyphRef.current) return;
      g = (g + 1) % GLYPHS.length;
      glyphRef.current.textContent = GLYPHS[g];
    }, 120);
    return () => {
      io.disconnect();
      clearInterval(words);
      clearInterval(twinkle);
    };
  }, []);

  const text = `${WORDS[word]}…`;
  return (
    // decoration that never stops changing: kept away from screen readers
    <span ref={rootRef} className="thinking" aria-hidden="true">
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
    </span>
  );
}
