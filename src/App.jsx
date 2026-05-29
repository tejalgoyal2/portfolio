import { usePressScroll } from './press/usePressScroll';
import Loader from './press/Loader';
import PaperBackdrop from './press/PaperBackdrop';
import PressCursor from './press/PressCursor';
import PressImpacts from './press/PressImpacts';
import InkBleed from './press/InkBleed';
import Hero from './sections/Hero';
import About from './sections/About';
import Skills from './sections/Skills';
import Projects from './sections/Projects';
import Experience from './sections/Experience';
import Blog from './sections/Blog';
import Contact from './sections/Contact';

/**
 * App root. usePressScroll wires the single Lenis↔GSAP loop that every section
 * animates off. Persistent layers mount once: PaperBackdrop (the warm paper
 * ground), PressCursor and PressImpacts (portaled). Sections mount inside <main>
 * in reading order. Cohesion comes from a continuous sheet — the cream spreads
 * flow into the dark ones across a single torn ink-bleed seam — and a shared
 * motion grammar, not a drawn connector.
 */
export default function App() {
  usePressScroll();

  return (
    <>
      <Loader />
      <PaperBackdrop />
      <PressCursor />
      <PressImpacts />

      <main id="top">
        <Hero />
        <About />
        <Skills />
        <Projects />
        <InkBleed tone="ink" />
        <Experience />
        <Blog />
        <Contact />
      </main>
    </>
  );
}
