import { useRef, useEffect } from 'react';
import SectionHeader from './SectionHeader';
import { gsap, ScrollTrigger } from '../hooks/useGSAP';

function ContactLink({ href, label, sublabel }) {
  return (
    <a
      href={href}
      target={href.startsWith('mailto') ? undefined : '_blank'}
      rel={href.startsWith('mailto') ? undefined : 'noopener noreferrer'}
      className="contact-link group rounded-lg p-5 no-underline transition-all duration-300 flex flex-col gap-1"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border-subtle)',
      }}
    >
      <span className="text-[13px] font-display font-medium transition-colors duration-300" style={{ color: 'var(--color-text)' }}>
        {label}
      </span>
      <span className="text-[11px] font-mono transition-colors duration-300" style={{ color: 'var(--color-text-dim)' }}>
        {sublabel}
      </span>
    </a>
  );
}

export default function Contact() {
  const sectionRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      if (contentRef.current) {
        gsap.fromTo(contentRef.current.children, {
          opacity: 0,
          y: 25,
        }, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: contentRef.current,
            start: 'top 85%',
            once: true,
          },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="pb-28">
      <div className="max-w-[1100px] mx-auto px-6">
        <SectionHeader id="contact" title="Get in Touch" sub="let's build something" />

        <div ref={contentRef}>
          <p
            className="text-[15px] leading-[1.8] mb-8 max-w-[500px]"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            I&rsquo;m easiest to bribe with interesting problems.
            If you&rsquo;ve got one, or just want to argue about F1 strategy, you know where to find me.
          </p>

          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
          >
            <ContactLink
              href="mailto:itejalgoyal@gmail.com"
              label="Email"
              sublabel="itejalgoyal@gmail.com"
            />
            <ContactLink
              href="https://github.com/tejalgoyal2"
              label="GitHub"
              sublabel="tejalgoyal2"
            />
            <ContactLink
              href="https://www.linkedin.com/in/tejalgoyal"
              label="LinkedIn"
              sublabel="in/tejalgoyal"
            />
            <ContactLink
              href="https://tejalgoyal2.github.io"
              label="Blog"
              sublabel="tejalgoyal2.github.io"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
