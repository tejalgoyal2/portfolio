import { EXPERIENCE } from '../data/experience';

/**
 * Experience — cream editorial timeline. Two-column rows: period (mono)
 * on the left, role + org + description on the right. Active role
 * picks up a red hand-lettered "currently" tag.
 */
export default function Experience() {
  return (
    <section className="experience" id="experience">
      <header className="experience-header">
        <p className="experience-meta">// 04 — Trajectory</p>
        <h2 className="experience-title">EXPERIENCE</h2>
      </header>

      <ul className="experience-list">
        {EXPERIENCE.map((entry, i) => (
          <li key={i} className="experience-row">
            <div className="experience-period">{entry.period}</div>
            <div>
              <h3 className="experience-role">
                {entry.role}
                {entry.active && (
                  <span className="experience-current-tag">— currently</span>
                )}
              </h3>
              <p className="experience-org">{entry.org}</p>
              <p className="experience-desc">{entry.desc}</p>
              {entry.details && entry.details.length > 0 && (
                <ul className="experience-details">
                  {entry.details.slice(0, 4).map((d, j) => (
                    <li key={j}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
