import { useEffect, useId, useRef, useState } from 'react';
import { prefs } from '../life/prefs';
import Stamp from './Stamp';

/**
 * A project as a front-page story: a kicker, the headline, a three-line
 * deck, the picture, links, and "Read the full file" to unfold the rest.
 *
 * The picture is a short, muted screen recording of the live thing (or, for a
 * project with nothing public to film, a typographic poster in the press
 * style). It prints in the way a page does: as it comes into view the red and
 * blue plates under it sit off-register, then slide home into place, and the
 * loop starts. It's fetched only when it gets near the screen and plays only
 * while it's on it.
 *
 * Reduced motion: the plates are already in register and the loop doesn't
 * play by itself — it shows its still frame, with the controls to play it.
 */
const LINK_LABEL = { live: 'Live site', github: 'Source', youtube: 'Demo' };
const STAMP_TONE = { LIVE: 'red', REPO: 'ink', PROTOTYPE: 'ink' };

function Poster({ poster }) {
  return (
    <div className={`story-poster${poster.dark ? ' story-poster--dark' : ''}`} aria-hidden="true">
      <span className="story-poster-rule" />
      <span className="story-poster-word">{poster.word}</span>
      <span className="story-poster-line">{poster.line}</span>
      <span className="story-poster-pen">{poster.pen}</span>
      <span className="story-poster-rule" />
    </div>
  );
}

function Loop({ name, loop }) {
  const ref = useRef(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || prefs.reduced) return;
    let loaded = false;
    // fetch it as it gets near; play it only while it's on screen
    const near = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || loaded) return;
        loaded = true;
        v.preload = 'auto';
        v.load();
      },
      { rootMargin: '500px 0px' }
    );
    const seen = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.25 }
    );
    near.observe(v);
    seen.observe(v);
    return () => {
      near.disconnect();
      seen.disconnect();
    };
  }, []);
  return (
    <video
      ref={ref}
      className="story-loop"
      muted
      loop
      playsInline
      preload="none"
      poster={`/loops/${loop}.webp`}
      controls={prefs.reduced}
      aria-label={`A short screen recording of ${name}`}
      width="800"
      height="500"
    >
      <source src={`/loops/${loop}.webm`} type="video/webm" />
      <source src={`/loops/${loop}.mp4`} type="video/mp4" />
    </video>
  );
}

export default function Story({ project, lead = false, index }) {
  const { name, status, long, tech, links, story } = project;
  const [open, setOpen] = useState(false);
  const figRef = useRef(null);
  const id = useId();

  // the plates slide into register as the picture comes into view (once)
  useEffect(() => {
    const fig = figRef.current;
    if (!fig) return;
    if (prefs.reduced) {
      fig.classList.add('is-printed');
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        fig.classList.add('is-printed');
      },
      { threshold: 0.35 }
    );
    io.observe(fig);
    return () => io.disconnect();
  }, []);

  return (
    <article className={`story${lead ? ' story--lead' : ''}`} data-arrive="rise" data-depart="file" data-name={name}>
      <figure ref={figRef} className="story-fig">
        <span className="story-plate story-plate--r" aria-hidden="true" />
        <span className="story-plate story-plate--b" aria-hidden="true" />
        <div className="story-media">{story.loop ? <Loop name={name} loop={story.loop} /> : <Poster poster={story.poster} />}</div>
      </figure>

      <div className="story-text">
        <p className="story-kicker">
          <span className="story-no">{String(index).padStart(2, '0')}</span>
          <span className="story-name">{name}</span>
          <Stamp label={status} tone={STAMP_TONE[status] || 'ink'} rotate={-5} pressIn interactive={false} />
        </p>
        <h3 className="story-headline">{story.headline}</h3>
        <p className="story-deck" data-ink>
          {story.deck}
        </p>

        <div className="story-foot">
          {Object.entries(links || {}).map(([kind, href]) => (
            <a key={kind} className="story-link" href={href} target="_blank" rel="noopener noreferrer">
              {LINK_LABEL[kind] || kind} <span aria-hidden="true">↗</span>
            </a>
          ))}
          <button type="button" className="story-more" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
            {open ? 'Fold it back' : 'Read the full file'}
            <span aria-hidden="true">{open ? '−' : '+'}</span>
          </button>
        </div>

        <div className={`story-file${open ? ' is-open' : ''}`} id={id} inert={!open}>
          <div className="story-file-inner">
            <p className="story-long">{long}</p>
            <p className="story-tech">
              <span className="story-tech-label">Built with</span>
              {tech.map((t) => (
                <span className="cf-tag" key={t}>
                  {t}
                </span>
              ))}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
