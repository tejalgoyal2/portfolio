import { useState, useRef, useEffect } from 'react';

const COMMANDS = {
  help: [
    '', '  NAVIGATION            EXTRAS',
    '  ----------            ------',
    '  projects              whoami',
    '  experience            sudo hire-me',
    '  skills                cat interests.txt',
    '  about                 ls achievements/',
    '  contact               play',
    '                        clear / help', '',
  ],
  whoami: [
    '', '  Name     : Tejal Goyal',
    '  Role     : Cybersecurity Analyst | ML Engineer',
    '  Location : Victoria, BC, Canada',
    '  Status   : Open to opportunities',
    '  Hobbies  : Marathon training, baking, CoD Mobile', '',
  ],
  'sudo hire-me': [
    '', '  [sudo] password for recruiter: ********',
    '  Verifying credentials...',
    '  ',
    '  REQUEST SENT to tejalgoyal@uvic.ca',
    '  (Or just connect on LinkedIn.)', '',
  ],
  'cat interests.txt': [
    '', '  quantum_computing=true',
    '  mathematics=true',
    '  security_research=true',
    '  data_science=true',
    '  breaking_things_responsibly=true',
    '  marathon=in_progress',
    '  baking=stress_triggered',
    '  cod_mobile=competitive', '',
  ],
  'ls achievements/': [
    '', '  drwxr-xr-x  hacktu-2.0-first-place/',
    '  drwxr-xr-x  academic-scholarship-4200-cad/',
    '  drwxr-xr-x  google-cloud-facilitator-2022/',
    '  drwxr-xr-x  readathon-first-award/',
    '  drwxr-xr-x  thaparlympics-badminton/',
    '  drwxr-xr-x  bubbles-ngo-founder/', '',
  ],
};

const NAV_SECTIONS = ['projects', 'experience', 'skills', 'about', 'contact'];
const COLOR_MAP = { in: 'var(--color-green)', err: 'var(--color-red)', sys: 'var(--color-amber)', out: 'var(--color-text)' };

export default function Terminal({ show, onClose, onSudoku }) {
  const [inp, setInp] = useState('');
  const [hist, setHist] = useState([{ type: 'sys', text: 'Type "help" for commands.' }]);
  const [cmdHistory, setCmdHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (show && inputRef.current) inputRef.current.focus();
  }, [show]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [hist]);

  const run = (cmd) => {
    const trimmed = cmd.trim().toLowerCase();
    const newHist = [...hist, { type: 'in', text: `visitor@tgoyal.me:~$ ${cmd}` }];
    setCmdHistory(prev => [cmd, ...prev]);
    setHistIdx(-1);

    if (trimmed === 'clear') {
      setHist([{ type: 'sys', text: 'Cleared.' }]);
    } else if (COMMANDS[trimmed]) {
      COMMANDS[trimmed].forEach(l => newHist.push({ type: 'out', text: l }));
      setHist(newHist);
    } else if (NAV_SECTIONS.includes(trimmed)) {
      newHist.push({ type: 'out', text: `> Navigating to ${trimmed}...` });
      setHist(newHist);
      document.getElementById(`s-${trimmed}`)?.scrollIntoView({ behavior: 'smooth' });
    } else if (trimmed === 'play') {
      newHist.push({ type: 'out', text: '> Launching sudoku...' });
      setHist(newHist);
      onSudoku();
    } else {
      newHist.push({ type: 'err', text: `command not found: ${trimmed}` });
      setHist(newHist);
    }
    setInp('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inp.trim()) {
      run(inp);
    } else if (e.key === 'ArrowUp' && cmdHistory.length > 0) {
      e.preventDefault();
      const newIdx = Math.min(histIdx + 1, cmdHistory.length - 1);
      setHistIdx(newIdx);
      setInp(cmdHistory[newIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx <= 0) { setHistIdx(-1); setInp(''); }
      else { setHistIdx(histIdx - 1); setInp(cmdHistory[histIdx - 1]); }
    }
  };

  if (!show) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] font-mono flex flex-col"
      style={{
        height: 230,
        background: 'var(--color-bg)',
        borderTop: '1px solid rgba(0,255,65,0.13)',
      }}
    >
      <div
        className="flex justify-between items-center py-1 px-3"
        style={{ background: 'var(--color-panel)', borderBottom: '1px solid var(--color-border)' }}
      >
        <span className="text-green text-[10px] tracking-[1px]">TERMINAL</span>
        <button onClick={onClose} className="bg-transparent border-none text-red cursor-pointer font-mono text-xs">[X]</button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2.5 text-xs">
        {hist.map((h, i) => (
          <div key={i} style={{ color: COLOR_MAP[h.type] || 'var(--color-text)', lineHeight: 1.5, whiteSpace: 'pre' }}>
            {h.text}
          </div>
        ))}
      </div>
      <div
        className="flex items-center py-1.5 px-3"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <span className="text-green mr-2 text-[11px] shrink-0">visitor@tgoyal.me:~$</span>
        <input
          ref={inputRef}
          value={inp}
          onChange={e => setInp(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none text-green text-xs font-mono"
          style={{ caretColor: 'var(--color-green)' }}
          placeholder="type a command..."
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
