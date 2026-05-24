import { useEffect, useRef } from 'react';
import { BLOG_POSTS } from '../data/blog';

/**
 * Blog — horizontal auto-scrolling strip on the ink canvas. Cards have
 * a subtle vertical stagger driven by a sine curve (the "fluid mushing"
 * idea from Drumspirit, scaled down for restraint). Hover pauses the
 * marquee and lifts/rotates the active card.
 */

function formatDate(d) {
  if (!d) return '';
  const date = new Date(`${d}T00:00:00`);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Blog() {
  const stripRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const strip = stripRef.current;
    const container = containerRef.current;
    if (!strip || !container) return;

    let raf;
    let paused = false;
    let visible = true;
    let offset = 0;

    // Apply per-card sine-wave vertical stagger
    const cards = Array.from(strip.querySelectorAll('.blog-card'));
    cards.forEach((card, i) => {
      const dy = Math.sin(i * 0.6) * 14;
      card.style.transform = `translateY(${dy}px)`;
    });

    const halfWidth = () => strip.scrollWidth / 2;

    const tick = () => {
      if (!paused && visible) {
        offset += 0.4;
        if (offset >= halfWidth()) offset -= halfWidth();
        strip.style.transform = `translateX(${-offset}px)`;
      }
      raf = requestAnimationFrame(tick);
    };

    const onEnter = () => (paused = true);
    const onLeave = () => (paused = false);
    strip.addEventListener('mouseenter', onEnter);
    strip.addEventListener('mouseleave', onLeave);

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => (visible = e.isIntersecting)),
      { threshold: 0 }
    );
    io.observe(container);

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      strip.removeEventListener('mouseenter', onEnter);
      strip.removeEventListener('mouseleave', onLeave);
      io.disconnect();
    };
  }, []);

  // Duplicate posts for seamless marquee
  const displayPosts = [...BLOG_POSTS, ...BLOG_POSTS];

  return (
    <section className="blog" id="blog">
      <header className="blog-header">
        <div>
          <p className="blog-meta">// 05 — Field notes</p>
          <h2 className="blog-title">JOURNAL</h2>
        </div>
        <p className="blog-sub">
          What I&apos;m reading,<br />
          breaking, building.
        </p>
      </header>

      <div ref={containerRef} className="blog-strip-wrap">
        <div ref={stripRef} className="blog-strip">
          {displayPosts.map((post, i) => (
            <a
              key={`${post.title}-${i}`}
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="blog-card"
            >
              <p className="blog-card-date">{formatDate(post.date)}</p>
              <h3 className="blog-card-title">{post.title}</h3>
              <p className="blog-card-preview">{post.preview}</p>
              {post.tags && (
                <div className="blog-card-tags">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="blog-card-tag">{tag}</span>
                  ))}
                </div>
              )}
              <span className="blog-card-cta">read &rarr;</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
