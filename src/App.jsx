import { useEffect } from 'react';
import { usePressScroll } from './press/usePressScroll';
import { startInkLines } from './life/inkLines';
import { afterPrint } from './life/idle';
import Loader from './press/Loader';
import PaperBackdrop from './press/PaperBackdrop';
import PressCursor from './press/PressCursor';
import PressImpacts from './press/PressImpacts';
import PressTicker from './press/PressTicker';
import Seam from './press/Seam';
import Life from './life/Life';
import CubeStage from './gl/CubeStage';
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
 * in reading order. One warm hue runs the whole page (cream, then dark-red, then
 * red); the two real colour turns are torn deckle seams where the lower stock
 * shows through hand-torn paper. Cohesion comes from that continuous sheet and a
 * shared motion grammar, not a drawn connector.
 *
 * Life (src/life) is the layer that answers the visitor — the living type
 * field, registration marks, icon rain, ink roller — and CubeStage lazy-loads
 * the one WebGL canvas the cube lives on.
 */
export default function App() {
  usePressScroll();
  // after every section has mounted and the loader has lifted: paragraphs
  // marked data-ink ink in by line
  useEffect(() => afterPrint(() => startInkLines()), []);

  return (
    <>
      <Loader />
      <PaperBackdrop />
      <PressCursor />
      <PressImpacts />
      <Life />
      <CubeStage />

      <main id="top">
        <Hero />
        <PressTicker />
        <About />
        <Skills />
        <Projects />
        <Seam variant="cream-ink" />
        <Experience />
        <Blog />
        <Seam variant="ink-red" />
        <Contact />
      </main>
    </>
  );
}
