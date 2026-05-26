import { useLenis } from './hooks/useLenis';
import SvgFilters from './fx/SvgFilters';
import OnomatopoeiaTrail from './fx/OnomatopoeiaTrail';
import MagneticCursor from './cursor/MagneticCursor';
import Hero from './sections/Hero';
import About from './sections/About';
import Skills from './sections/Skills';
import Projects from './sections/Projects';
import Experience from './sections/Experience';
import Blog from './sections/Blog';
import Contact from './sections/Contact';

/**
 * App root. Mounts persistent layers (SVG filter defs, magnetic cursor,
 * onomatopoeia click trail) and the sections in order. Lenis is wired up
 * for smooth scroll. No always-on WebGL background — the only canvas is
 * inside the Hero, scoped to its viewport.
 */
export default function App() {
  useLenis();

  return (
    <>
      <SvgFilters />
      <MagneticCursor />
      <OnomatopoeiaTrail />

      <main id="top">
        <Hero />
        <About />
        <Skills />
        <Projects />
        <Experience />
        <Blog />
        <Contact />
      </main>
    </>
  );
}
