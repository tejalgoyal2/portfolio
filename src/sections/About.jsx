/**
 * About — Drumspirit-style. Cream paper background, massive red "ABOUT"
 * cropped at the edges, editorial three-column body below with a
 * pull-quote, prose, and a stats column.
 */
export default function About() {
  return (
    <section className="about" id="about">
      <p className="about-meta">// 01 — Who I am</p>
      <h2 className="about-mark" aria-label="About">ABOUT</h2>

      <div className="about-grid">
        <p className="about-col-quote">
          “I build things, sometimes I break them — usually that&apos;s how I learn what they&apos;re actually made of.”
          <span className="about-quote-tag">— a true story</span>
        </p>

        <div className="about-col-prose">
          <p>
            I&apos;m a software engineer with a soft spot for security and the
            kind of problems where the right answer isn&apos;t in the docs yet.
            Currently working at the intersection of identity, threat
            detection, and the messy edges of large systems.
          </p>
          <p>
            Before that I lived in ML &amp; computer vision land for a stretch
            and wrote enough Python to last me a lifetime. Some of it ended
            up in production. Some of it ended up as cautionary tales.
          </p>
          <p>
            Outside the terminal — I write about what I&apos;m learning, ship
            small tools nobody asked for, and try to make the web feel like
            a place worth visiting.
          </p>
        </div>

        <dl className="about-col-stats">
          <div className="about-stat">
            <span className="about-stat-label">Based</span>
            <span className="about-stat-value">Victoria, BC</span>
          </div>
          <div className="about-stat">
            <span className="about-stat-label">Coding since</span>
            <span className="about-stat-value">2017</span>
          </div>
          <div className="about-stat">
            <span className="about-stat-label">Languages</span>
            <span className="about-stat-value">9+</span>
          </div>
          <div className="about-stat">
            <span className="about-stat-label">Projects shipped</span>
            <span className="about-stat-value">17</span>
          </div>
          <div className="about-stat">
            <span className="about-stat-label">Open to</span>
            <span className="about-stat-value">Full-time, Sec/SWE</span>
          </div>
          <div className="about-stat">
            <span className="about-stat-label">Coffee</span>
            <span className="about-stat-value">2 / day</span>
          </div>
        </dl>
      </div>
    </section>
  );
}
