import SectionHeader from './SectionHeader';
import { useScrollReveal } from '../hooks/useScrollReveal';

function Panel({ title, children }) {
  const ref = useScrollReveal();
  return (
    <div ref={ref} className="reveal panel p-4">
      <h3 className="text-muted text-xs font-display mb-2.5 tracking-[1px]">{title}</h3>
      {children}
    </div>
  );
}

export default function About() {
  const narrativeRef = useScrollReveal();

  return (
    <section>
      <SectionHeader id="about" title="About" sub="// cat README.md" />

      {/* Narrative */}
      <div ref={narrativeRef} className="reveal panel p-6 mb-4">
        <p className="text-text text-[13.5px] leading-[2] m-0">
          I'm a cybersecurity analyst and data science grad student at the University of Victoria,
          originally from India. My work sits at the intersection of security, machine learning, and
          making complex systems visible. I've built ML models that catch phishing emails at 98.7%
          accuracy, deployed enterprise MFA solutions, and led a team that engineered assistive AI
          glasses for the visually impaired. I learn by doing, build to understand, and believe the
          best security comes from making the invisible visible.
        </p>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))' }}>
        <Panel title="EDUCATION">
          <div className="mb-2.5">
            <div className="text-text text-xs font-bold">MEng, Applied Data Science</div>
            <div className="text-dim text-[10.5px]">University of Victoria | 2025 - Present</div>
            <div className="text-dim text-[10.5px] mt-0.5">
              Optimization for ML, Data Mining, Secure Communication, Massive Datasets
            </div>
          </div>
          <div>
            <div className="text-text text-xs font-bold">BEng, Electronics & Computer Engineering</div>
            <div className="text-dim text-[10.5px]">Thapar Institute | 2020 - 2024</div>
            <div className="text-dim text-[10.5px] mt-0.5">
              Cyber Security, AI/NLP/CV, Deep Learning, Cloud Computing, DSA
            </div>
          </div>
        </Panel>

        <Panel title="ACHIEVEMENTS">
          <div className="flex flex-col gap-1.5 text-[11.5px] leading-[1.6] text-text">
            <div>1st Place — HackTU 2.0 Hackathon (2021)</div>
            <div>$4,200 CAD Academic Performance Scholarship</div>
            <div>Google Cloud Ready Facilitator (2022)</div>
            <div>1st Award — Readathon, Nava Nalanda Library</div>
            <div>Winner — Thaparlympics Badminton</div>
          </div>
        </Panel>

        <Panel title="COMMUNITY">
          <div className="flex flex-col gap-1.5 text-[11.5px] leading-[1.6] text-text">
            <div>Founder — Bubbles NGO (1,000+ trees, COVID bridge courses, anti-stubble-burning camps)</div>
            <div>NSS Coordinator — Blood drives, plantation drives, campus initiatives</div>
            <div>PFA Core Member — Campus animal welfare & emergency response</div>
            <div>Better Life Foundation — 100+ school enrollments</div>
          </div>
        </Panel>

        <Panel title="BEYOND THE TERMINAL">
          <p className="text-text text-xs leading-[1.9] m-0">
            Currently training for the TC10K marathon. Competitive Call of Duty Mobile player.
            Stress-bakes when deadlines approach. Fascinated by quantum computing and mathematics.
            Believes the best way to learn security is to break things — responsibly.
          </p>
        </Panel>
      </div>
    </section>
  );
}
