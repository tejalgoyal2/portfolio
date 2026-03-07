import { useState, useEffect, useRef } from 'react';

const LINES = [
  "POST v4.2.1 .............. OK",
  "Loading kernel modules ...",
  "Mounting /dev/portfolio ...",
  "Security stack ........... ACTIVE",
  "IAM services ............. ACTIVE",
  "EDR engine ............... ACTIVE",
  "Loading identity: TEJAL GOYAL",
  "Status: READY",
  "> Launching portfolio...",
];
const DELAYS = [80, 140, 110, 160, 80, 80, 220, 100, 280];

export default function BootSequence({ onDone }) {
  const [lines, setLines] = useState([]);
  const [fade, setFade] = useState(false);
  const skipped = useRef(false);
  const timer = useRef(null);

  useEffect(() => {
    let idx = 0;
    const next = () => {
      if (skipped.current) return;
      if (idx < LINES.length) {
        const line = LINES[idx];
        const delay = DELAYS[idx];
        idx++;
        setLines(prev => [...prev, line]);
        timer.current = setTimeout(next, delay);
      } else {
        timer.current = setTimeout(() => {
          if (!skipped.current) {
            setFade(true);
            timer.current = setTimeout(() => {
              if (!skipped.current) onDone();
            }, 500);
          }
        }, 350);
      }
    };
    next();
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [onDone]);

  const skip = () => {
    if (skipped.current) return;
    skipped.current = true;
    if (timer.current) clearTimeout(timer.current);
    onDone();
  };

  const lineColor = (l) => {
    if (l.includes('ACTIVE')) return 'text-green';
    if (l.includes('TEJAL')) return 'text-cyan';
    if (l.startsWith('>')) return 'text-amber';
    return 'text-text';
  };

  return (
    <div
      onClick={skip}
      className="fixed inset-0 bg-bg z-[10000] flex items-center justify-center font-mono cursor-pointer"
      style={{ transition: 'opacity 0.5s', opacity: fade ? 0 : 1 }}
    >
      <div className="max-w-[520px] w-full px-6">
        <div className="text-green text-[10px] mb-4 tracking-[2px] opacity-60">
          TGOYAL.ME // SYSTEM BOOT
        </div>
        {lines.map((line, i) => (
          <div
            key={i}
            className={`${lineColor(line)} text-xs leading-[1.9]`}
            style={{ animation: 'fadeIn 0.15s ease forwards', opacity: 0 }}
          >
            {line}
          </div>
        ))}
        <div className="mt-5 text-dim text-[9px] tracking-[1px]">
          [CLICK OR PRESS ANY KEY TO SKIP]
        </div>
      </div>
    </div>
  );
}
