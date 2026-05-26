/**
 * Contact — closing panel. Loops back to yellow + ink for symmetry with
 * the hero. Big "LET'S TALK" headline, hand-lettered aside, three
 * comic-button CTAs (Email, GitHub, LinkedIn). A small "fin." stamp
 * at the bottom.
 */
export default function Contact() {
  return (
    <section className="contact" id="contact">
      <p className="contact-meta">// 06 — Get in touch</p>
      <h2 className="contact-title">LET&apos;S&nbsp;TALK</h2>
      <p className="contact-aside">(yes — really)</p>

      <div className="contact-buttons">
        <a
          href="mailto:itejalgoyal@gmail.com"
          className="contact-btn"
        >
          Email me <span>→</span>
        </a>
        <a
          href="https://github.com/tejalgoyal2"
          target="_blank"
          rel="noopener noreferrer"
          className="contact-btn contact-btn--secondary"
        >
          GitHub <span>↗</span>
        </a>
        <a
          href="https://www.linkedin.com/in/tejalgoyal"
          target="_blank"
          rel="noopener noreferrer"
          className="contact-btn contact-btn--secondary"
        >
          LinkedIn <span>↗</span>
        </a>
      </div>

      <p className="contact-fin">fin.</p>
    </section>
  );
}
