import MatrixBg from './MatrixBg';
import { useTypingText } from '../hooks/useTypingText';

const ROLES = ['Cybersecurity Analyst', 'IAM Specialist', 'ML Engineer', 'Data Scientist', 'Builder of Things'];

export default function Hero() {
  const typed = useTypingText(ROLES);

  return (
    <section className="min-h-screen flex items-center relative overflow-hidden w-full">
      <MatrixBg />
      {/* Content constrained to max-width, centered */}
      <div className="relative z-[1] w-full max-w-[1060px] mx-auto px-5">
        <div className="max-w-[580px]" style={{ animation: 'heroIn 0.6s ease' }}>
        <div className="text-dim text-[11px] mb-2 tracking-[1px]">
          {'>'} HELLO, WORLD. I'M
        </div>
        <h1 className="glow-green font-display font-bold tracking-[3px] m-0 leading-[1.1]"
          style={{ fontSize: 'clamp(30px, 5vw, 52px)' }}>
          TEJAL GOYAL
        </h1>
        <div className="mt-3 font-display text-amber" style={{ fontSize: 'clamp(14px, 2.2vw, 18px)' }}>
          {typed}
          <span className="text-green" style={{ animation: 'blink 1s step-end infinite' }}>_</span>
        </div>

        <p className="text-text text-[13px] leading-[1.8] mt-5">
          MEng student at UVic. Building security infrastructure by day, ML systems by night.
          I break things to understand how to protect them — and build tools to make that process visible.
        </p>

        {/* Status line */}
        <div className="text-dim text-[11px] mt-4 font-mono">
          <span className="text-muted text-[10px] tracking-[1px]">STATUS</span>
          <span className="text-dim mx-1.5">:</span>
          <span className="text-text">Cybersecurity Co-op @ BCI</span>
          <span className="text-border mx-2">|</span>
          <span className="text-text">Training for TC10K</span>
          <span className="text-border mx-2">|</span>
          <span className="text-text">Building Meme Finder</span>
        </div>

        <div className="flex gap-3.5 mt-6">
          <a href="https://github.com/tejalgoyal2" target="_blank" rel="noopener noreferrer"
            className="text-green text-xs font-mono no-underline">[GitHub]</a>
          <a href="https://www.linkedin.com/in/tejalgoyal" target="_blank" rel="noopener noreferrer"
            className="text-cyan text-xs font-mono no-underline">[LinkedIn]</a>
          <a href="mailto:tejalgoyal@uvic.ca"
            className="text-amber text-xs font-mono no-underline">[Email]</a>
        </div>

        <div className="text-dim text-[9.5px] mt-9 tracking-[1px]">
          [SCROLL DOWN] // press ` to open terminal
        </div>
        </div>
      </div>
    </section>
  );
}
