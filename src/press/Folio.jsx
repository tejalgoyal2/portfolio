import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

/**
 * Running folio — a fixed bottom-right chip that labels the active section
 * as you scroll, like the folio line on a broadsheet's inner pages.
 * One ScrollTrigger per section fires onEnter/onEnterBack to update the label.
 * Hidden until press:loaded; hidden on reduced-motion.
 */
const SECTIONS = [
  { sel: '.hero',       label: 'SEC. A · THE MASTHEAD' },
  { sel: '.about',      label: 'SEC. B · ON THE RECORD' },
  { sel: '.skills',     label: 'SEC. C · THE BACK SHOP' },
  { sel: '#work',       label: 'SEC. D · THE CASE FILES' },
  { sel: '#experience', label: 'SEC. E · THE LEDGER' },
  { sel: '#blog',       label: 'SEC. F · THE OP-ED DESK' },
  { sel: '#contact',    label: 'SEC. G · STOP THE PRESS' },
];

export default function Folio() {
  const [label, setLabel] = useState(SECTIONS[0].label);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const show = () => setVisible(true);
    if (sessionStorage.getItem('press-loaded')) show();
    else window.addEventListener('press:loaded', show, { once: true });

    const triggers = SECTIONS.map(({ sel, label: lbl }) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      return gsap.to({}, {
        scrollTrigger: {
          trigger: el,
          start: 'top 55%',
          end: 'bottom 55%',
          onEnter: () => setLabel(lbl),
          onEnterBack: () => setLabel(lbl),
        },
      });
    }).filter(Boolean);

    return () => {
      triggers.forEach((t) => t?.scrollTrigger?.kill());
      window.removeEventListener('press:loaded', show);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="press-folio" aria-hidden="true">
      {label}
    </div>
  );
}
