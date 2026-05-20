import { useRef, useEffect, useState } from 'react';
import { BLOG_POSTS } from '../data/blog';
import SectionHeader from './SectionHeader';
import { gsap } from '../hooks/useGSAP';

const DWELL_MS = 2500;

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function BlogCard({ post }) {
  const [hov, setHov] = useState(false);
  const [dwell, setDwell] = useState(false);
  const timerRef = useRef(null);

  const handleEnter = () => {
    setHov(true);
    timerRef.current = setTimeout(() => setDwell(true), DWELL_MS);
  };

  const handleLeave = () => {
    setHov(false);
    setDwell(false);
    clearTimeout(timerRef.current);
  };

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0 w-[340px] rounded-xl no-underline relative overflow-hidden transition-all duration-500"
      style={{
        background: hov ? 'var(--color-surface-elevated)' : 'var(--color-surface)',
        border: `1px solid ${dwell ? 'var(--color-interactive)' : hov ? 'var(--color-border)' : 'var(--color-border-subtle)'}`,
        transform: dwell ? 'translateY(-10px) scale(1.02)' : hov ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: dwell
          ? '0 24px 48px rgba(139,142,255,0.08), 0 0 20px rgba(139,142,255,0.04)'
          : hov ? '0 12px 24px rgba(0,0,0,0.2)' : 'none',
        scrollSnapAlign: 'start',
      }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* Dwell accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] transition-all duration-500"
        style={{
          background: 'linear-gradient(to right, var(--color-interactive), transparent)',
          opacity: dwell ? 1 : 0,
        }}
      />

      <div className="px-7 py-6">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-dim)' }}>
            {formatDate(post.date)}
          </span>
          {post.tags.slice(0, 2).map(tag => (
            <span
              key={tag}
              className="text-[9px] font-mono py-0.5 px-2 rounded-full"
              style={{ color: 'var(--color-text-dim)', border: '1px solid var(--color-border-subtle)' }}
            >
              {tag}
            </span>
          ))}
        </div>

        <h3
          className="text-[16px] font-display font-bold leading-[1.4] mb-3 transition-colors duration-300"
          style={{ color: dwell ? 'var(--color-interactive)' : 'var(--color-text)' }}
        >
          {post.title}
        </h3>

        <p className="text-[12px] leading-[1.8] mb-4 m-0" style={{ color: 'var(--color-text-secondary)' }}>
          {post.preview}
        </p>

        <span
          className="text-[11px] font-mono transition-all duration-500 inline-block"
          style={{
            color: dwell ? 'var(--color-interactive)' : 'var(--color-text-ghost)',
            transform: dwell ? 'translateX(6px)' : hov ? 'translateX(3px)' : 'translateX(0)',
          }}
        >
          {dwell ? 'Read this one →' : 'Read →'}
        </span>
      </div>
    </a>
  );
}

export default function Blog() {
  const sectionRef = useRef(null);
  const scrollRef = useRef(null);
  const trackRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let paused = false;
    let raf;

    const tick = () => {
      if (!paused) {
        container.scrollLeft += 0.4;
        const max = container.scrollWidth - container.offsetWidth;
        if (container.scrollLeft >= max - 5) {
          container.scrollLeft = 0;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    const pause = () => { paused = true; };
    const resume = () => { paused = false; };

    container.addEventListener('mouseenter', pause);
    container.addEventListener('mouseleave', resume);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      container.removeEventListener('mouseenter', pause);
      container.removeEventListener('mouseleave', resume);
    };
  }, []);

  // Entrance animation
  useEffect(() => {
    if (!trackRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(trackRef.current.children, {
        opacity: 0,
        y: 30,
        scale: 0.96,
      }, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.6,
        stagger: 0.06,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: scrollRef.current,
          start: 'top 85%',
          once: true,
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef}>
      <div className="max-w-[1100px] mx-auto px-6">
        <SectionHeader id="blog" title="Blog" sub="things I've written about" />
      </div>

      {/* Auto-scrolling strip */}
      <div
        ref={scrollRef}
        className="overflow-x-auto blog-scroll-hide"
        style={{ scrollSnapType: 'x proximity', WebkitOverflowScrolling: 'touch' }}
      >
        <div
          ref={trackRef}
          className="flex gap-5"
          style={{
            width: 'max-content',
            paddingLeft: 'max(2rem, calc((100vw - 1100px) / 2 + 1.5rem))',
            paddingRight: '3rem',
            paddingBottom: '1rem',
          }}
        >
          {BLOG_POSTS.map((post) => (
            <BlogCard key={post.title} post={post} />
          ))}
          <div className="shrink-0 w-4" />
        </div>
      </div>
    </section>
  );
}
