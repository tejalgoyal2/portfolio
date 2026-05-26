import { useRef } from 'react';
import SectionHeader from './SectionHeader';
import SkillsPhysics from './SkillsPhysics';

export default function Skills() {
  const sectionRef = useRef(null);

  return (
    <section ref={sectionRef} className="pb-28">
      <div className="max-w-[1100px] mx-auto px-6">
        <SectionHeader id="skills" title="Skills" sub="what I work with" />
        <SkillsPhysics />
      </div>
    </section>
  );
}
