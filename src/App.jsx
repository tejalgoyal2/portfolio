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
import Sheet from './press/Sheet';
import Life from './life/Life';
import CubeStage from './gl/CubeStage';
import Menu from './press/Menu';
import { SECTIONS } from './data/sections';
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
 * in reading order, each on its own Sheet: the page is a pile of printed sheets,
 * and each one slides up over the last as you scroll (src/life/sheets.js). One
 * warm system runs the whole page (cream, then ink-black, then press red); the
 * two real colour turns are sheets with torn deckle edges, showing the stock
 * beneath through the tear.
 *
 * Life (src/life) is the layer that answers the visitor — drifting icons and
 * their ripples, registration marks, press-and-hold printing, the ink roller —
 * CubeStage lazy-loads the one WebGL canvas the cube lives on, and Menu is the
 * running head and the index.
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
      <Menu />

      <main id="top">
        <Sheet ground="paper" label={SECTIONS[0]} z={1}>
          <Hero />
        </Sheet>
        <Sheet ground="paper" label={SECTIONS[1]} z={2}>
          <PressTicker />
          <About />
        </Sheet>
        <Sheet ground="paper" label={SECTIONS[2]} z={3}>
          <Skills />
        </Sheet>
        <Sheet ground="paper" label={SECTIONS[3]} z={4}>
          <Projects />
        </Sheet>
        <Sheet ground="ink" torn label={SECTIONS[4]} z={5}>
          <Seam variant="cream-ink" />
          <Experience />
        </Sheet>
        <Sheet ground="ink" label={SECTIONS[5]} z={6}>
          <Blog />
        </Sheet>
        <Sheet ground="red" torn label={SECTIONS[6]} z={7}>
          <Seam variant="ink-red" />
          <Contact />
        </Sheet>
      </main>
    </>
  );
}
