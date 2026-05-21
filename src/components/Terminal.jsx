import { useState, useRef, useEffect, useCallback } from 'react';

/* ─── Static command outputs ─── */
const HELP = [
  '', '  NAVIGATION            INFO                  EXTRAS',
  '  ----------            ----                  ------',
  '  projects              whoami                play sudoku',
  '  experience            neofetch              rm -rf /',
  '  skills                cat interests.txt     echo <msg>',
  '  about                 ls achievements/      blog',
  '  contact               resume                clear / help',
  '',
  '  Tip: try exploring with ls and cat. Not everything is listed here.', '',
];

const WHOAMI = [
  '', '  Name     : Tejal Goyal',
  '  Role     : Software Engineer | Cybersecurity | ML',
  '  Location : Victoria, BC, Canada',
  '  Status   : Building and breaking things at BCI',
  '  Vibe     : Ships v1.0, writes about what broke', '',
];

const HIRE_ME = [
  '', '  [sudo] password for recruiter: ********',
  '  Verifying credentials...',
  '  ',
  '  REQUEST SENT to itejalgoyal@gmail.com',
  '  (Or just connect on LinkedIn. Seriously, it is easier.)', '',
];

const INTERESTS = [
  '', '  f1_strategy=obsessed',
  '  the_boys=current_binge',
  '  security_research=always',
  '  baking=stress_triggered',
  '  badminton=competitive',
  '  building_things=compulsive',
  '  breaking_things=responsibly',
  '  running=survived_tc10k', '',
];

const ACHIEVEMENTS = [
  '', '  drwxr-xr-x  published-paper-federated-learning/',
  '  drwxr-xr-x  academic-scholarship-4200-cad/',
  '  drwxr-xr-x  guest-speaker-uvic-meng/',
  '  drwxr-xr-x  tc10k-finisher/',
  '  drwxr-xr-x  thaparlympics-badminton-winner/',
  '  drwxr-xr-x  bubbles-ngo-cofounder/',
  '  drwxr-xr-x  readathon-merit-holder/', '',
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
  '                          Uptime: since May 2026',
  '',
];

const SECRET_LS = [
  '', '  -rw-------  .note',
  '  -rw-------  readme.txt',
  '  drwx------  ctf/', '',
];

const SECRET_NOTE = [
  '', '  If you found this, you are probably the kind of person',
  '  I would enjoy working with.',
  '',
  '  Try: ls .secret/ctf/', '',
];

const SECRET_README = [
  '', '  ================================',
  '  Welcome to the hidden layer.',
  '  ================================',
  '',
  '  This terminal has a few things',
  '  tucked away for the curious.',
  '',
  '  Start with: ls .secret/ctf/', '',
];

const CTF_LS = [
  '', '  -rw-r--r--  stage1.enc',
  '  -rw-r--r--  stage2.log',
  '  -rw-r--r--  stage3.seq',
  '  -rw-------  flag.locked', '',
];

const CTF_STAGE1 = [
  '', '  ── STAGE 1: CRYPTO ──',
  '',
  '  The following message was intercepted.',
  '  Decode it to find the passphrase for Stage 2.',
  '',
  '  ENCODED: dGhlLXBhc3N3b3JkLWlzLWZlZGVyYXRlZA==',
  '',
  '  Hint: This encoding is as basic as they come.',
  '  When you have the answer, type: ctf unlock <passphrase>', '',
];

const CTF_STAGE2 = [
  '', '  ── STAGE 2: DEBUG ──',
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
  '', '  ── STAGE 3: PATTERN ──',
  '',
  '  What comes next in this sequence?',
  '',
  '  2, 3, 5, 7, 11, 13, ?',
  '',
  '  When you have it: ctf unlock <answer>', '',
];

const CTF_FLAG = [
  '', '  ════════════════════════════════════════',
  '  ║                                      ║',
  '  ║   FLAG CAPTURED                       ║',
  '  ║                                      ║',
  '  ║   You made it through all 3 stages.  ║',
  '  ║   Consider this proof you should     ║',
  '  ║   probably reach out.                ║',
  '  ║                                      ║',
  '  ║   itejalgoyal@gmail.com              ║',
  '  ║                                      ║',
  '  ║   flag{curious_minds_build_better}   ║',
  '  ║                                      ║',
  '  ════════════════════════════════════════', '',
];

/* ─── rm -rf / crash sequence ─── */
const CRASH_LINES = [
  'Removing /usr/bin/...',
  'Removing /etc/passwd...',
  'Removing /var/log/...',
  'Removing /home/visitor/...',
  'Removing /System/Library/...',
  'rm: cannot remove "/System": Operation not permitted',
  'Segmentation fault (core dumped)',
  '',
  'KERNEL PANIC - not syncing: Attempted to kill init!',
  '',
  '    ╔══════════════════════════════════════╗',
  '    ║                                      ║',
  '    ║   Just kidding. This is a website.   ║',
  '    ║                                      ║',
  '    ║   But you tried. Respect.            ║',
  '    ║                                      ║',
  '    ╚══════════════════════════════════════╝',
  '',
  'System restored. Type "help" to continue.',
];

/* ─── Helpers ─── */
const NAV_SECTIONS = ['projects', 'experience', 'skills', 'about', 'contact', 'blog'];
const COLOR_MAP = { in: '#6ee7b7', err: '#f87171', sys: '#fbbf24', out: 'var(--color-text)', flag: '#8b8eff' };

export default function Terminal({ show, onClose, onSudoku }) {
  const [inp, setInp] = useState('');
  const [hist, setHist] = useState([
    { type: 'sys', text: 'Type "help" for commands. Press ` to toggle.' },
  ]);
  const [cmdHistory, setCmdHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
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

  /* Crash animation: drip lines one at a time */
  const runCrash = useCallback(() => {
    setCrashing(true);
    let i = 0;
    const timer = setInterval(() => {
      if (i >= CRASH_LINES.length) {
        clearInterval(timer);
        setCrashing(false);
        return;
      }
      setHist(prev => [...prev, { type: i < 7 ? 'err' : 'sys', text: CRASH_LINES[i] }]);
      i++;
    }, 200);
  }, []);

  const push = (arr, type = 'out') => arr.map(text => ({ type, text }));

  const run = (cmd) => {
    const trimmed = cmd.trim().toLowerCase();
    const newHist = [...hist, { type: 'in', text: `visitor@tgoyal.me:~$ ${cmd}` }];
    setCmdHistory(prev => [cmd, ...prev]);
    setHistIdx(-1);

    // Clear
    if (trimmed === 'clear') {
      setHist([{ type: 'sys', text: 'Cleared.' }]);
      setInp('');
      return;
    }

    // Help
    if (trimmed === 'help') {
      setHist([...newHist, ...push(HELP)]);
      setInp('');
      return;
    }

    // Navigation
    if (NAV_SECTIONS.includes(trimmed)) {
      newHist.push({ type: 'out', text: `> Navigating to ${trimmed}...` });
      setHist(newHist);
      document.getElementById(`s-${trimmed}`)?.scrollIntoView({ behavior: 'smooth' });
      setInp('');
      return;
    }

    // Info commands
    if (trimmed === 'whoami') { setHist([...newHist, ...push(WHOAMI)]); setInp(''); return; }
    if (trimmed === 'sudo hire-me' || trimmed === 'sudo hire me') { setHist([...newHist, ...push(HIRE_ME)]); setInp(''); return; }
    if (trimmed === 'cat interests.txt') { setHist([...newHist, ...push(INTERESTS)]); setInp(''); return; }
    if (trimmed === 'ls achievements/' || trimmed === 'ls achievements') { setHist([...newHist, ...push(ACHIEVEMENTS)]); setInp(''); return; }
    if (trimmed === 'neofetch') { setHist([...newHist, ...push(NEOFETCH)]); setInp(''); return; }

    // Resume
    if (trimmed === 'resume') {
      newHist.push({ type: 'out', text: '> Opening resume...' });
      setHist(newHist);
      window.open('/resume.pdf', '_blank');
      setInp('');
      return;
    }

    // Blog
    if (trimmed === 'blog') {
      newHist.push({ type: 'out', text: '> Opening blog...' });
      setHist(newHist);
      window.open('https://tejalgoyal2.github.io', '_blank');
      setInp('');
      return;
    }

    // Play
    if (trimmed === 'play' || trimmed === 'play sudoku') {
      newHist.push({ type: 'out', text: '> Launching sudoku...' });
      setHist(newHist);
      onSudoku();
      setInp('');
      return;
    }

    // Echo
    if (trimmed.startsWith('echo ')) {
      newHist.push({ type: 'out', text: cmd.trim().slice(5) });
      setHist(newHist);
      setInp('');
      return;
    }

    // rm -rf /
    if (trimmed === 'rm -rf /' || trimmed === 'rm -rf /*') {
      setHist(newHist);
      setInp('');
      runCrash();
      return;
    }

    // .secret/ discovery
    if (trimmed === 'ls .secret' || trimmed === 'ls .secret/') {
      setHist([...newHist, ...push(SECRET_LS)]);
      setInp('');
      return;
    }
    if (trimmed === 'cat .secret/.note' || trimmed === 'cat .secret/note') {
      setHist([...newHist, ...push(SECRET_NOTE)]);
      setInp('');
      return;
    }
    if (trimmed === 'cat .secret/readme.txt' || trimmed === 'cat .secret/readme') {
      setHist([...newHist, ...push(SECRET_README)]);
      setInp('');
      return;
    }

    // CTF system
    if (trimmed === 'ls .secret/ctf' || trimmed === 'ls .secret/ctf/') {
      setHist([...newHist, ...push(CTF_LS)]);
      setInp('');
      return;
    }
    if (trimmed === 'cat .secret/ctf/stage1.enc') {
      setHist([...newHist, ...push(CTF_STAGE1)]);
      setInp('');
      return;
    }
    if (trimmed === 'cat .secret/ctf/stage2.log') {
      if (ctfStage < 1) {
        newHist.push({ type: 'err', text: 'Permission denied. Complete Stage 1 first.' });
        setHist(newHist);
      } else {
        setHist([...newHist, ...push(CTF_STAGE2)]);
      }
      setInp('');
      return;
    }
    if (trimmed === 'cat .secret/ctf/stage3.seq') {
      if (ctfStage < 2) {
        newHist.push({ type: 'err', text: `Permission denied. Complete Stage ${ctfStage < 1 ? '1' : '2'} first.` });
        setHist(newHist);
      } else {
        setHist([...newHist, ...push(CTF_STAGE3)]);
      }
      setInp('');
      return;
    }
    if (trimmed === 'cat .secret/ctf/flag.locked') {
      if (ctfStage < 3) {
        newHist.push({ type: 'err', text: 'Permission denied. Complete all 3 stages to unlock.' });
        setHist(newHist);
      } else {
        setHist([...newHist, ...push(CTF_FLAG, 'flag')]);
      }
      setInp('');
      return;
    }

    // CTF unlock
    if (trimmed.startsWith('ctf unlock ')) {
      const answer = trimmed.slice(11).trim();

      if (ctfStage === 0) {
        // Stage 1: base64 decode "dGhlLXBhc3N3b3JkLWlzLWZlZGVyYXRlZA==" = "the-password-is-federated"
        if (answer === 'the-password-is-federated' || answer === 'federated') {
          setCtfStage(1);
          newHist.push({ type: 'flag', text: '' });
          newHist.push({ type: 'flag', text: '  Stage 1 complete. You can now access stage2.log.' });
          newHist.push({ type: 'flag', text: '  Run: cat .secret/ctf/stage2.log' });
          newHist.push({ type: 'flag', text: '' });
        } else {
          newHist.push({ type: 'err', text: '  Incorrect. Try again.' });
        }
        setHist(newHist);
        setInp('');
        return;
      }

      if (ctfStage === 1) {
        // Stage 2: First letters of error messages: R, U, S, T
        if (answer === 'rust') {
          setCtfStage(2);
          newHist.push({ type: 'flag', text: '' });
          newHist.push({ type: 'flag', text: '  Stage 2 complete. You can now access stage3.seq.' });
          newHist.push({ type: 'flag', text: '  Run: cat .secret/ctf/stage3.seq' });
          newHist.push({ type: 'flag', text: '' });
        } else {
          newHist.push({ type: 'err', text: '  Incorrect. Read the error messages more carefully.' });
        }
        setHist(newHist);
        setInp('');
        return;
      }

      if (ctfStage === 2) {
        // Stage 3: Next prime after 13 is 17
        if (answer === '17') {
          setCtfStage(3);
          newHist.push({ type: 'flag', text: '' });
          newHist.push({ type: 'flag', text: '  All stages complete!' });
          newHist.push({ type: 'flag', text: '  Run: cat .secret/ctf/flag.locked' });
          newHist.push({ type: 'flag', text: '' });
        } else {
          newHist.push({ type: 'err', text: '  Incorrect. Think about what these numbers have in common.' });
        }
        setHist(newHist);
        setInp('');
        return;
      }

      newHist.push({ type: 'flag', text: '  CTF already completed! Run: cat .secret/ctf/flag.locked' });
      setHist(newHist);
      setInp('');
      return;
    }

    // CTF shorthand
    if (trimmed === 'ctf' || trimmed === 'ctf status') {
      if (ctfStage === 0) {
        newHist.push({ type: 'out', text: '  CTF Progress: 0/3 stages. Start with: cat .secret/ctf/stage1.enc' });
      } else if (ctfStage < 3) {
        newHist.push({ type: 'out', text: `  CTF Progress: ${ctfStage}/3 stages. Next: cat .secret/ctf/stage${ctfStage + 1}.${ctfStage === 0 ? 'enc' : ctfStage === 1 ? 'log' : 'seq'}` });
      } else {
        newHist.push({ type: 'flag', text: '  CTF Complete! Run: cat .secret/ctf/flag.locked' });
      }
      setHist(newHist);
      setInp('');
      return;
    }

    // ls (bare)
    if (trimmed === 'ls' || trimmed === 'ls .') {
      setHist([...newHist,
        { type: 'out', text: '' },
        { type: 'out', text: '  achievements/    interests.txt    .secret/' },
        { type: 'out', text: '' },
      ]);
      setInp('');
      return;
    }

    // pwd
    if (trimmed === 'pwd') {
      newHist.push({ type: 'out', text: '  /home/visitor' });
      setHist(newHist);
      setInp('');
      return;
    }

    // date
    if (trimmed === 'date') {
      newHist.push({ type: 'out', text: `  ${new Date().toString()}` });
      setHist(newHist);
      setInp('');
      return;
    }

    // cowsay / lolcat / sl easter eggs
    if (trimmed === 'cowsay' || trimmed.startsWith('cowsay ')) {
      const msg = trimmed === 'cowsay' ? 'moo' : cmd.trim().slice(7);
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
      setHist(newHist);
      setInp('');
      return;
    }

    // Not found
    newHist.push({ type: 'err', text: `command not found: ${trimmed}` });
    setHist(newHist);
    setInp('');
  };

  const handleKeyDown = (e) => {
    if (crashing) return;
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
        height: 260,
        background: '#0a0c10',
        borderTop: '1px solid rgba(110,231,183,0.15)',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
      }}
    >
      <div
        className="flex justify-between items-center py-1.5 px-3"
        style={{ background: '#0d0f14', borderBottom: '1px solid rgba(110,231,183,0.1)' }}
      >
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: '#f87171' }} />
            <div className="w-2 h-2 rounded-full" style={{ background: '#fbbf24' }} />
            <div className="w-2 h-2 rounded-full" style={{ background: '#6ee7b7' }} />
          </div>
          <span className="text-[10px] tracking-[1.5px] uppercase ml-2" style={{ color: '#6ee7b7' }}>terminal</span>
        </div>
        <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-[10px] font-mono tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>ESC</button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 text-[11px] leading-[1.6]">
        {hist.map((h, i) => (
          <div key={i} style={{ color: COLOR_MAP[h.type] || 'var(--color-text)', whiteSpace: 'pre' }}>
            {h.text}
          </div>
        ))}
      </div>
      <div
        className="flex items-center py-2 px-3"
        style={{ borderTop: '1px solid rgba(110,231,183,0.1)' }}
      >
        <span className="mr-2 text-[11px] shrink-0" style={{ color: '#6ee7b7' }}>visitor@tgoyal.me:~$</span>
        <input
          ref={inputRef}
          value={inp}
          onChange={e => setInp(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none text-[11px] font-mono"
          style={{ color: '#6ee7b7', caretColor: '#6ee7b7' }}
          placeholder={crashing ? '' : 'type a command...'}
          autoComplete="off"
          spellCheck={false}
          disabled={crashing}
        />
      </div>
    </div>
  );
}
