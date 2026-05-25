import { useState, useRef, useEffect, useCallback } from 'react';

/* ─── Color tokens that match the portfolio theme ─── */
const C = {
  prompt: 'var(--color-interactive)',
  out: 'var(--color-text-secondary)',
  err: '#f87171',
  sys: 'var(--color-text-dim)',
  flag: 'var(--color-interactive)',
  path: 'var(--color-interactive)',
  dir: 'var(--color-text)',
};

/* ─── Filesystem structure ─── */
const FS = {
  '~': {
    type: 'dir',
    children: ['projects/', 'experience/', 'about/', 'easter-eggs/', 'interests.txt', 'resume.pdf'],
  },
  '~/projects': {
    type: 'dir',
    children: ['dime/', 'iam-threat-mapper/', 'claubi/', 'sudoku/', 'walletrip/', 'smarthire/', 'threatscope/'],
  },
  '~/experience': {
    type: 'dir',
    children: ['bci-swe.md', 'bci-security.md', 'uvic-ta.md', 'iit-ropar.md'],
  },
  '~/about': {
    type: 'dir',
    children: ['education.md', 'achievements.md', 'community.md', 'beyond-code.txt'],
  },
  '~/easter-eggs': {
    type: 'dir',
    children: ['sudoku', 'cowsay', 'rm-rf', 'neofetch', 'hire-me', '.secret/'],
  },
  '~/easter-eggs/.secret': {
    type: 'dir',
    children: ['ctf/', '.note', 'readme.txt'],
  },
  '~/easter-eggs/.secret/ctf': {
    type: 'dir',
    children: ['stage1.enc', 'stage2.log', 'stage3.seq', 'flag.locked'],
  },
};

/* ─── File contents ─── */
const FILES = {
  '~/interests.txt': [
    '', '  f1_strategy=obsessed',
    '  the_boys=current_binge',
    '  security_research=always',
    '  baking=stress_triggered',
    '  badminton=competitive',
    '  building_things=compulsive',
    '  running=survived_tc10k', '',
  ],
  '~/about/beyond-code.txt': [
    '', '  Trilingual: English, Hindi, Punjabi',
    '  TC10K finisher. Competitive badminton.',
    '  Watches F1 for strategy, The Boys for chaos.',
    '  Stress-baker. Readathon merit holder.', '',
  ],
  '~/easter-eggs/.secret/.note': [
    '', '  If you found this, you are probably the kind of',
    '  person I would enjoy working with.',
    '',
    '  Try: cd ~/easter-eggs/.secret/ctf && ls', '',
  ],
  '~/easter-eggs/.secret/readme.txt': [
    '', '  ================================',
    '  Welcome to the hidden layer.',
    '  ================================',
    '',
    '  This terminal has a few things',
    '  tucked away for the curious.',
    '',
    '  Start with: cd ~/easter-eggs/.secret/ctf', '',
  ],
};

/* ─── CTF stages ─── */
const CTF_STAGE1 = [
  '', '  STAGE 1: CRYPTO',
  '',
  '  The following message was intercepted.',
  '  Decode it to find the passphrase for Stage 2.',
  '',
  '  ENCODED: dGhlLXBhc3N3b3JkLWlzLWZlZGVyYXRlZA==',
  '',
  '  Hint: This encoding is as basic as they come.',
  '  When you have the answer: ctf unlock <passphrase>', '',
];

const CTF_STAGE2 = [
  '', '  STAGE 2: DEBUG',
  '',
  '  Analyze this error log. The first letter of each',
  '  error message spells the next passphrase.',
  '',
  '  [ERR] Runtime overflow in module_a',
  '  [ERR] Undefined reference at 0x4F2',
  '  [ERR] Segfault in thread_pool.rs',
  '  [ERR] Timeout waiting for lock_42',
  '',
  '  When you have it: ctf unlock <passphrase>', '',
];

const CTF_STAGE3 = [
  '', '  STAGE 3: PATTERN',
  '',
  '  What comes next in this sequence?',
  '',
  '  2, 3, 5, 7, 11, 13, ?',
  '',
  '  When you have it: ctf unlock <answer>', '',
];

const CTF_FLAG = [
  '', '  ════════════════════════════════════════',
  '  ║   FLAG CAPTURED                       ║',
  '  ║                                       ║',
  '  ║   You made it through all 3 stages.   ║',
  '  ║   Consider this proof you should      ║',
  '  ║   probably reach out.                 ║',
  '  ║                                       ║',
  '  ║   itejalgoyal@gmail.com               ║',
  '  ║   flag{curious_minds_build_better}    ║',
  '  ════════════════════════════════════════', '',
];

const NEOFETCH = [
  '',
  '         ████████         visitor@tgoyal.me',
  '       ██        ██       ─────────────────',
  '     ██   ▄▄  ▄▄   ██    OS:     tgoyal.me v2.0',
  '     ██   ██  ██   ██    Host:   Victoria, BC',
  '     ██            ██    Kernel: React 19 + Vite 7',
  '       ██  ╰──╯  ██      Shell:  this terminal',
  '         ████████         Theme:  Dark [Purple]',
  '       ██  ████  ██       WM:     GSAP + Lenis',
  '     ██            ██    Font:   Space Grotesk',
  '                          GPU:    Three.js R3F',
  '                          Uptime: since May 2026', '',
];

const CRASH_LINES = [
  'Removing /usr/bin/...', 'Removing /etc/passwd...', 'Removing /var/log/...',
  'Removing /home/visitor/...', 'Removing /System/Library/...',
  'rm: cannot remove "/System": Operation not permitted',
  'Segmentation fault (core dumped)', '',
  'KERNEL PANIC - not syncing: Attempted to kill init!', '',
  '    ╔══════════════════════════════════════╗',
  '    ║   Just kidding. This is a website.   ║',
  '    ║   But you tried. Respect.            ║',
  '    ╚══════════════════════════════════════╝', '',
  'System restored. Type "help" to continue.',
];

const HIRE_ME = [
  '', '  [sudo] password for recruiter: ********',
  '  Verifying credentials...',
  '  ',
  '  REQUEST SENT to itejalgoyal@gmail.com',
  '  (Or just connect on LinkedIn. Seriously, it is easier.)', '',
];

/* ─── Nav sections ─── */
const NAV_SECTIONS = ['projects', 'experience', 'skills', 'about', 'contact', 'blog'];

function shortPath(p) {
  return p === '~' ? '~' : '~/' + p.replace('~/', '').split('/').pop();
}

export default function Terminal({ show, onClose, onSudoku }) {
  const [inp, setInp] = useState('');
  const [hist, setHist] = useState([
    { type: 'sys', text: 'Welcome. Type "help" or explore with "ls" and "cd".' },
  ]);
  const [cmdHistory, setCmdHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [cwd, setCwd] = useState('~');
  const [ctfStage, setCtfStage] = useState(0);
  const [crashing, setCrashing] = useState(false);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (show && inputRef.current) inputRef.current.focus();
  }, [show]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [hist]);

  const runCrash = useCallback(() => {
    setCrashing(true);
    let i = 0;
    const timer = setInterval(() => {
      if (i >= CRASH_LINES.length) { clearInterval(timer); setCrashing(false); return; }
      setHist(prev => [...prev, { type: i < 7 ? 'err' : 'sys', text: CRASH_LINES[i] }]);
      i++;
    }, 200);
  }, []);

  const push = (arr, type = 'out') => arr.map(text => ({ type, text }));

  const resolvePath = (input) => {
    if (input.startsWith('~/') || input === '~') return input;
    if (input.startsWith('/')) return input;
    // Relative path
    let base = cwd;
    const parts = input.split('/');
    for (const p of parts) {
      if (p === '..') {
        const i = base.lastIndexOf('/');
        base = i > 0 ? base.slice(0, i) : '~';
      } else if (p && p !== '.') {
        base = base + '/' + p.replace(/\/$/, '');
      }
    }
    return base;
  };

  const run = (cmd) => {
    const trimmed = cmd.trim();
    const lower = trimmed.toLowerCase();
    const newHist = [...hist, { type: 'prompt', text: `${shortPath(cwd)} $ ${cmd}` }];
    setCmdHistory(prev => [cmd, ...prev]);
    setHistIdx(-1);

    if (lower === 'clear') { setHist([{ type: 'sys', text: 'Cleared.' }]); setInp(''); return; }

    if (lower === 'help') {
      setHist([...newHist,
        { type: 'out', text: '' },
        { type: 'sys', text: '  NAVIGATE           EXPLORE              DO THINGS' },
        { type: 'sys', text: '  ────────           ───────              ─────────' },
        { type: 'out', text: '  cd <dir>           ls                   sudoku' },
        { type: 'out', text: '  projects           cat <file>           neofetch' },
        { type: 'out', text: '  experience         whoami               cowsay <msg>' },
        { type: 'out', text: '  skills             resume               sudo hire-me' },
        { type: 'out', text: '  about              blog                 rm -rf /' },
        { type: 'out', text: '  contact            echo <msg>           clear / help' },
        { type: 'out', text: '' },
        { type: 'sys', text: '  Tip: cd ~/easter-eggs to find the fun stuff.' },
        { type: 'out', text: '' },
      ]);
      setInp('');
      return;
    }

    // cd
    if (lower.startsWith('cd ') || lower === 'cd') {
      const target = lower === 'cd' ? '~' : resolvePath(trimmed.slice(3).trim());
      if (FS[target]) {
        setCwd(target);
        newHist.push({ type: 'path', text: `  ${target}` });
      } else {
        newHist.push({ type: 'err', text: `  cd: no such directory: ${trimmed.slice(3).trim()}` });
      }
      setHist(newHist);
      setInp('');
      return;
    }

    // ls
    if (lower === 'ls' || lower === 'ls .') {
      const dir = FS[cwd];
      if (dir) {
        newHist.push({ type: 'out', text: '' });
        newHist.push({ type: 'out', text: '  ' + dir.children.join('    ') });
        newHist.push({ type: 'out', text: '' });
      }
      setHist(newHist);
      setInp('');
      return;
    }

    if (lower.startsWith('ls ')) {
      const target = resolvePath(trimmed.slice(3).trim());
      const dir = FS[target];
      if (dir) {
        newHist.push({ type: 'out', text: '' });
        newHist.push({ type: 'out', text: '  ' + dir.children.join('    ') });
        newHist.push({ type: 'out', text: '' });
      } else {
        newHist.push({ type: 'err', text: `  ls: cannot access '${trimmed.slice(3).trim()}'` });
      }
      setHist(newHist);
      setInp('');
      return;
    }

    // cat
    if (lower.startsWith('cat ')) {
      const target = resolvePath(trimmed.slice(4).trim());
      if (FILES[target]) {
        setHist([...newHist, ...push(FILES[target])]);
        setInp('');
        return;
      }
      // CTF files
      if (target === '~/easter-eggs/.secret/ctf/stage1.enc') {
        setHist([...newHist, ...push(CTF_STAGE1)]); setInp(''); return;
      }
      if (target === '~/easter-eggs/.secret/ctf/stage2.log') {
        if (ctfStage < 1) { newHist.push({ type: 'err', text: '  Permission denied. Complete Stage 1 first.' }); }
        else { setHist([...newHist, ...push(CTF_STAGE2)]); setInp(''); return; }
        setHist(newHist); setInp(''); return;
      }
      if (target === '~/easter-eggs/.secret/ctf/stage3.seq') {
        if (ctfStage < 2) { newHist.push({ type: 'err', text: `  Permission denied. Complete Stage ${ctfStage < 1 ? '1' : '2'} first.` }); }
        else { setHist([...newHist, ...push(CTF_STAGE3)]); setInp(''); return; }
        setHist(newHist); setInp(''); return;
      }
      if (target === '~/easter-eggs/.secret/ctf/flag.locked') {
        if (ctfStage < 3) { newHist.push({ type: 'err', text: '  Permission denied. Complete all 3 stages.' }); }
        else { setHist([...newHist, ...push(CTF_FLAG, 'flag')]); setInp(''); return; }
        setHist(newHist); setInp(''); return;
      }
      newHist.push({ type: 'err', text: `  cat: ${trimmed.slice(4).trim()}: No such file` });
      setHist(newHist); setInp(''); return;
    }

    // pwd
    if (lower === 'pwd') {
      newHist.push({ type: 'out', text: `  /home/visitor/${cwd.replace('~', '')}` });
      setHist(newHist); setInp(''); return;
    }

    // Navigation
    if (NAV_SECTIONS.includes(lower)) {
      newHist.push({ type: 'out', text: `  Navigating to ${lower}...` });
      setHist(newHist);
      document.getElementById(`s-${lower}`)?.scrollIntoView({ behavior: 'smooth' });
      setInp(''); return;
    }

    // whoami
    if (lower === 'whoami') {
      setHist([...newHist, ...push([
        '', '  Name     : Tejal Goyal',
        '  Role     : Software Engineer | Cybersecurity | ML',
        '  Location : Victoria, BC, Canada',
        '  Status   : Building MCP servers and enterprise apps at BCI',
        '  Vibe     : Ships v1.0, writes about what broke', '',
      ])]);
      setInp(''); return;
    }

    // sudoku
    if (lower === 'sudoku') {
      newHist.push({ type: 'out', text: '  Launching quick puzzle...' });
      newHist.push({ type: 'sys', text: '  Full game at sudoku.tgoyal.me' });
      setHist(newHist);
      onSudoku();
      setInp(''); return;
    }

    // neofetch
    if (lower === 'neofetch') { setHist([...newHist, ...push(NEOFETCH)]); setInp(''); return; }

    // resume
    if (lower === 'resume') {
      newHist.push({ type: 'out', text: '  Opening resume...' });
      setHist(newHist);
      window.open('/resume.pdf', '_blank');
      setInp(''); return;
    }

    // blog
    if (lower === 'blog') {
      newHist.push({ type: 'out', text: '  Opening blog...' });
      setHist(newHist);
      window.open('https://tejalgoyal2.github.io', '_blank');
      setInp(''); return;
    }

    // sudo hire-me
    if (lower === 'sudo hire-me' || lower === 'sudo hire me') {
      setHist([...newHist, ...push(HIRE_ME)]); setInp(''); return;
    }

    // echo
    if (lower.startsWith('echo ')) {
      newHist.push({ type: 'out', text: '  ' + cmd.trim().slice(5) });
      setHist(newHist); setInp(''); return;
    }

    // date
    if (lower === 'date') {
      newHist.push({ type: 'out', text: `  ${new Date().toString()}` });
      setHist(newHist); setInp(''); return;
    }

    // rm -rf /
    if (lower === 'rm -rf /' || lower === 'rm -rf /*') {
      setHist(newHist); setInp(''); runCrash(); return;
    }

    // cowsay
    if (lower === 'cowsay' || lower.startsWith('cowsay ')) {
      const msg = lower === 'cowsay' ? 'moo' : cmd.trim().slice(7);
      const border = '_'.repeat(msg.length + 2);
      newHist.push({ type: 'out', text: '' });
      newHist.push({ type: 'out', text: `   ${border}` });
      newHist.push({ type: 'out', text: `  < ${msg} >` });
      newHist.push({ type: 'out', text: `   ${'-'.repeat(msg.length + 2)}` });
      newHist.push({ type: 'out', text: '          \\   ^__^' });
      newHist.push({ type: 'out', text: '           \\  (oo)\\_______' });
      newHist.push({ type: 'out', text: '              (__)\\       )\\/\\' });
      newHist.push({ type: 'out', text: '                  ||----w |' });
      newHist.push({ type: 'out', text: '                  ||     ||' });
      newHist.push({ type: 'out', text: '' });
      setHist(newHist); setInp(''); return;
    }

    // CTF unlock
    if (lower.startsWith('ctf unlock ')) {
      const answer = lower.slice(11).trim();
      if (ctfStage === 0) {
        if (answer === 'the-password-is-federated' || answer === 'federated') {
          setCtfStage(1);
          newHist.push({ type: 'flag', text: '' });
          newHist.push({ type: 'flag', text: '  Stage 1 complete. You can now access stage2.log.' });
          newHist.push({ type: 'flag', text: '  Run: cat stage2.log' });
          newHist.push({ type: 'flag', text: '' });
        } else {
          newHist.push({ type: 'err', text: '  Incorrect. Try again.' });
        }
      } else if (ctfStage === 1) {
        if (answer === 'rust') {
          setCtfStage(2);
          newHist.push({ type: 'flag', text: '' });
          newHist.push({ type: 'flag', text: '  Stage 2 complete. You can now access stage3.seq.' });
          newHist.push({ type: 'flag', text: '  Run: cat stage3.seq' });
          newHist.push({ type: 'flag', text: '' });
        } else {
          newHist.push({ type: 'err', text: '  Incorrect. Read the error messages more carefully.' });
        }
      } else if (ctfStage === 2) {
        if (answer === '17') {
          setCtfStage(3);
          newHist.push({ type: 'flag', text: '' });
          newHist.push({ type: 'flag', text: '  All stages complete!' });
          newHist.push({ type: 'flag', text: '  Run: cat flag.locked' });
          newHist.push({ type: 'flag', text: '' });
        } else {
          newHist.push({ type: 'err', text: '  Incorrect. Think about what these numbers have in common.' });
        }
      } else {
        newHist.push({ type: 'flag', text: '  CTF already completed! Run: cat flag.locked' });
      }
      setHist(newHist); setInp(''); return;
    }

    // ctf status
    if (lower === 'ctf' || lower === 'ctf status') {
      if (ctfStage === 0) {
        newHist.push({ type: 'out', text: '  CTF Progress: 0/3. Start: cd ~/easter-eggs/.secret/ctf && cat stage1.enc' });
      } else if (ctfStage < 3) {
        newHist.push({ type: 'out', text: `  CTF Progress: ${ctfStage}/3. Next: cat stage${ctfStage + 1}.${ctfStage === 0 ? 'enc' : ctfStage === 1 ? 'log' : 'seq'}` });
      } else {
        newHist.push({ type: 'flag', text: '  CTF Complete! Run: cat flag.locked' });
      }
      setHist(newHist); setInp(''); return;
    }

    // Not found
    newHist.push({ type: 'err', text: `  command not found: ${trimmed}` });
    newHist.push({ type: 'sys', text: '  Type "help" for available commands.' });
    setHist(newHist); setInp('');
  };

  const handleKeyDown = (e) => {
    if (crashing) return;
    if (e.key === 'Enter' && inp.trim()) { run(inp); }
    else if (e.key === 'ArrowUp' && cmdHistory.length > 0) {
      e.preventDefault();
      const newIdx = Math.min(histIdx + 1, cmdHistory.length - 1);
      setHistIdx(newIdx); setInp(cmdHistory[newIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx <= 0) { setHistIdx(-1); setInp(''); }
      else { setHistIdx(histIdx - 1); setInp(cmdHistory[histIdx - 1]); }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Basic tab completion: list children of cwd
      const dir = FS[cwd];
      if (dir && inp.trim()) {
        const match = dir.children.find(c => c.startsWith(inp.trim()));
        if (match) setInp(match.replace(/\/$/, ''));
      }
    }
  };

  if (!show) return null;

  const colorFor = (type) => C[type] || C.out;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] font-mono flex flex-col"
      style={{
        height: 280,
        background: 'var(--color-bg)',
        borderTop: '1px solid var(--color-border)',
        boxShadow: '0 -8px 32px color-mix(in srgb, var(--color-text) 20%, transparent)',
      }}
    >
      <div
        className="flex justify-between items-center py-1.5 px-3"
        style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: '#f87171' }} />
            <div className="w-2 h-2 rounded-full" style={{ background: '#fbbf24' }} />
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-green)' }} />
          </div>
          <span className="text-[10px] tracking-[1.5px] uppercase ml-2" style={{ color: 'var(--color-interactive)' }}>
            terminal
          </span>
          <span className="text-[9px] ml-1" style={{ color: 'var(--color-text-dim)' }}>
            {shortPath(cwd)}
          </span>
        </div>
        <button onClick={onClose} className="bg-transparent border-none text-[10px] font-mono tracking-wider" style={{ color: 'var(--color-text-dim)' }}>ESC</button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 text-[11px] leading-[1.7]">
        {hist.map((h, i) => (
          <div key={i} style={{ color: colorFor(h.type), whiteSpace: 'pre' }}>
            {h.text}
          </div>
        ))}
      </div>
      <div
        className="flex items-center py-2 px-3"
        style={{ borderTop: '1px solid var(--color-border-subtle)' }}
      >
        <span className="mr-2 text-[11px] shrink-0" style={{ color: 'var(--color-interactive)' }}>
          {shortPath(cwd)} $
        </span>
        <input
          ref={inputRef}
          value={inp}
          onChange={e => setInp(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none text-[11px] font-mono"
          style={{ color: 'var(--color-text)', caretColor: 'var(--color-interactive)' }}
          placeholder={crashing ? '' : 'type a command...'}
          autoComplete="off"
          spellCheck={false}
          disabled={crashing}
        />
      </div>
    </div>
  );
}
