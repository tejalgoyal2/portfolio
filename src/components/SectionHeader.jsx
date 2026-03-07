import { useScrollReveal } from '../hooks/useScrollReveal';

export default function SectionHeader({ id, title, sub }) {
  const ref = useScrollReveal();
  return (
    <div ref={ref} id={`s-${id}`} className="reveal mb-6 pt-20">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-green text-xs">{'>'}</span>
        <h2 className="glow-green text-2xl font-bold font-display tracking-[2px] uppercase m-0">
          {title}
        </h2>
      </div>
      {sub && (
        <p className="text-dim text-[11px] font-mono ml-5 mt-0.5">{sub}</p>
      )}
      <div
        className="h-px mt-2"
        style={{ background: 'linear-gradient(90deg, rgba(0,255,65,0.19), transparent 60%)' }}
      />
    </div>
  );
}
