import { usePressScroll } from './press/usePressScroll';
import Loader from './press/Loader';
import PaperBackdrop from './press/PaperBackdrop';
import RedThread from './press/RedThread';
import PressCursor from './press/PressCursor';
import PressImpacts from './press/PressImpacts';
import InkBleed from './press/InkBleed';
import Folio from './press/Folio';
import Hero from './sections/Hero';
import About from './sections/About';
import Skills from './sections/Skills';
import Projects from './sections/Projects';
import Experience from './sections/Experience';
import Blog from './sections/Blog';
import Contact from './sections/Contact';

/**
 * THE PRESS — app root. usePressScroll wires the single Lenis↔GSAP loop that
 * every section animates off. Persistent press layers mount once: PaperBackdrop
 * (running ground), RedThread (the spine, inside the page), PressCursor and
 * PressImpacts (portaled). Sections mount inside <main> in reading order; they
 * are added here as each department is built.
 */
export default function App() {
  usePressScroll();

  return (
    <>
      <Loader />
      <PaperBackdrop />
      <PressCursor />
      <PressImpacts />
      <Folio />

      <main id="top">
        <RedThread />
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
