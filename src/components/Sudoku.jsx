import { useState, useEffect, useCallback, useMemo } from 'react';

export default function Sudoku({ onClose }) {
  const puzzle = useMemo(() => {
    const sol = [[1,2,3,4],[3,4,1,2],[2,3,4,1],[4,1,2,3]];
    const board = sol.map(r => [...r]);
    [[0,1],[0,3],[1,0],[1,2],[2,1],[2,3],[3,0],[3,2]].forEach(([r,c]) => { board[r][c] = 0; });
    return { board, sol, fixed: board.map(r => r.map(v => v !== 0)) };
  }, []);

  const [board, setBoard] = useState(puzzle.board.map(r => [...r]));
  const [sel, setSel] = useState(null);
  const [won, setWon] = useState(false);

  const fillCell = useCallback((v) => {
    if (!sel || puzzle.fixed[sel[0]][sel[1]]) return;
    const nb = board.map(r => [...r]);
    nb[sel[0]][sel[1]] = v;
    setBoard(nb);
    if (nb.every((r, ri) => r.every((val, ci) => val === puzzle.sol[ri][ci]))) setWon(true);
  }, [sel, board, puzzle]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key >= '1' && e.key <= '4') fillCell(parseInt(e.key));
      else if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') fillCell(0);
      else if (sel) {
        const [r, c] = sel;
        if (e.key === 'ArrowUp' && r > 0) setSel([r - 1, c]);
        if (e.key === 'ArrowDown' && r < 3) setSel([r + 1, c]);
        if (e.key === 'ArrowLeft' && c > 0) setSel([r, c - 1]);
        if (e.key === 'ArrowRight' && c < 3) setSel([r, c + 1]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sel, fillCell, onClose]);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[10001] flex items-center justify-center font-mono"
      style={{ background: 'color-mix(in srgb, var(--color-bg) 92%, transparent)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="p-6 w-[90%] max-w-[300px] rounded-xl"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 24px 48px color-mix(in srgb, var(--color-text) 20%, transparent), 0 0 40px color-mix(in srgb, var(--color-interactive) 8%, transparent)',
        }}
      >
        <div className="flex justify-between items-center mb-3">
          <span
            className="text-[10px] font-mono tracking-[1.5px] uppercase"
            style={{ color: 'var(--color-interactive)', opacity: 0.7 }}
          >
            Quick Puzzle
          </span>
          <button
            onClick={onClose}
            className="bg-transparent border-none font-mono text-[10px] tracking-wider"
            style={{ color: 'var(--color-text-dim)' }}
          >
            ESC
          </button>
        </div>
        <div className="text-[10px] mb-3 leading-[1.6]" style={{ color: 'var(--color-text-dim)' }}>
          4x4 Sudoku. Arrow keys to move, 1-4 to fill, 0 to clear.
        </div>

        {won ? (
          <div className="text-center py-5">
            <div className="text-[15px] font-display mb-1.5" style={{ color: 'var(--color-interactive)' }}>
              SOLVED
            </div>
            <div className="text-[11px] mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Not bad. Back to the portfolio?
            </div>
            <div className="text-[10px] mb-4" style={{ color: 'var(--color-text-dim)' }}>
              Want more? Full game at{' '}
              <a
                href="https://sudoku.tgoyal.me"
                target="_blank"
                rel="noopener noreferrer"
                className="no-underline"
                style={{ color: 'var(--color-interactive)' }}
              >
                sudoku.tgoyal.me
              </a>
            </div>
            <button
              onClick={onClose}
              className="py-1.5 px-4 font-mono text-[11px] rounded-lg"
              style={{
                color: 'var(--color-interactive)',
                background: 'color-mix(in srgb, var(--color-interactive) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-interactive) 20%, transparent)',
              }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-0.5 mb-3">
              {board.map((row, ri) => row.map((val, ci) => {
                const isSel = sel && sel[0] === ri && sel[1] === ci;
                const isFixed = puzzle.fixed[ri][ci];
                const isWrong = val !== 0 && val !== puzzle.sol[ri][ci];
                return (
                  <div
                    key={`${ri}-${ci}`}
                    onClick={(e) => { e.stopPropagation(); if (!isFixed) setSel([ri, ci]); }}
                    className="aspect-square flex items-center justify-center transition-all duration-150 rounded-sm"
                    style={{
                      background: isSel
                        ? 'color-mix(in srgb, var(--color-interactive) 8%, transparent)'
                        : 'var(--color-bg)',
                      border: `1px solid ${isSel
                        ? 'color-mix(in srgb, var(--color-interactive) 30%, transparent)'
                        : 'var(--color-border-subtle)'}`,
                      color: isWrong
                        ? 'var(--color-red)'
                        : isFixed
                          ? 'var(--color-text-dim)'
                          : 'var(--color-interactive)',
                      fontSize: 17,
                      fontWeight: isFixed ? 400 : 700,
                      borderRight: ci === 1 ? '2px solid var(--color-border)' : undefined,
                      borderBottom: ri === 1 ? '2px solid var(--color-border)' : undefined,
                    }}
                  >
                    {val || ''}
                  </div>
                );
              }))}
            </div>
            <div className="flex gap-1.5 justify-center mb-3">
              {[1,2,3,4].map(n => (
                <button
                  key={n}
                  onClick={(e) => { e.stopPropagation(); fillCell(n); }}
                  className="w-9 h-8 text-sm font-mono flex items-center justify-center rounded-lg transition-colors duration-200"
                  style={{
                    color: 'var(--color-interactive)',
                    background: 'color-mix(in srgb, var(--color-interactive) 4%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--color-interactive) 15%, transparent)',
                  }}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={(e) => { e.stopPropagation(); fillCell(0); }}
                className="w-9 h-8 text-[10px] font-mono flex items-center justify-center rounded-lg transition-colors duration-200"
                style={{
                  color: 'var(--color-text-dim)',
                  background: 'color-mix(in srgb, var(--color-text) 3%, transparent)',
                  border: '1px solid var(--color-border)',
                }}
              >
                CLR
              </button>
            </div>
            <div className="text-[9px] text-center" style={{ color: 'var(--color-text-ghost)' }}>
              Full game at{' '}
              <a
                href="https://sudoku.tgoyal.me"
                target="_blank"
                rel="noopener noreferrer"
                className="no-underline"
                style={{ color: 'var(--color-text-dim)' }}
              >
                sudoku.tgoyal.me
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
