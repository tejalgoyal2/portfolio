import { useEffect } from 'react';
import { usePressScroll } from './press/usePressScroll';
import { startInkLines } from './life/inkLines';
import { startArrivals } from './life/arrive';
import { startBanners } from './life/banners';
import { afterPrint } from './life/idle';
import { startFonts } from './life/fonts';
import Loader from './press/Loader';
import PaperBackdrop from './press/PaperBackdrop';
import PressCursor from './press/PressCursor';
import PressImpacts from './press/PressImpacts';
import PressTicker from './press/PressTicker';
import Seam from './press/Seam';
import Ridge from './press/Ridge';
import Life from './life/Life';
import CubeStage from './gl/CubeStage';
import Contents from './press/Contents';
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
 * in reading order. One warm system runs the whole page (cream, then ink-black,
 * then press red): the ink rises out of the cream as a mountain range (Ridge,
 * with a little car driving over it), and the red is a torn deckle seam.
 *
 * Life (src/life) is the layer that answers the visitor — drifting icons and
 * their ripples, registration marks, press-and-hold printing, the ink roller —
 * CubeStage lazy-loads the one WebGL canvas the cube lives on, and Contents is
 * the running head: every section, where you are, one click to anywhere.
 */
export default function App() {
  usePressScroll();
  // the first frame is set in the fonts' stand-ins; the faces come after it
  useEffect(startFonts, []);
  // after every section has mounted and the loader has lifted: paragraphs
  // marked data-ink ink in by line, and blocks arrive and leave as you scroll
  useEffect(
    () =>
      afterPrint(() => {
        const stopInk = startInkLines();
        const stopArrivals = startArrivals();
        const stopBanners = startBanners();
        return () => {
          stopInk();
          stopArrivals();
          stopBanners();
        };
      }),
    []
  );

  return (
    <>
      <Loader />
      <PaperBackdrop />
      <PressCursor />
      <PressImpacts />
      <Life />
      {/* the running head first, so the first Tab is the page's contents, not the cube */}
      <Contents />
      <CubeStage />

      <main id="top">
        <Hero />
        <PressTicker />
        <About />
        <Skills />
        <Projects />
        <Ridge />
        <Experience />
        <Blog />
        <Seam variant="ink-red" />
        <Contact />
      </main>
    </>
  );
}
