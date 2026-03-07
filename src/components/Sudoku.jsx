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
      style={{ background: 'rgba(0,0,0,0.88)' }}
    >
      <div className="panel p-6 w-[90%] max-w-[300px]">
        <div className="flex justify-between items-center mb-3">
          <span className="text-amber text-[13px] font-display tracking-[1px]">QUICK PUZZLE</span>
          <button onClick={onClose} className="bg-transparent border-none text-red cursor-pointer font-mono text-xs">
            [X] ESC
          </button>
        </div>
        <div className="text-dim text-[10px] mb-2.5 leading-[1.5]">
          4x4 Sudoku. Arrow keys to move, 1-4 to fill, 0 to clear.
        </div>

        {won ? (
          <div className="text-center py-5">
            <div className="text-green text-[15px] font-display mb-1.5">SOLVED</div>
            <div className="text-text text-[11px] mb-3">Not bad. Back to the portfolio?</div>
            <button
              onClick={onClose}
              className="panel py-1.5 px-4 text-green cursor-pointer font-mono text-[11px]"
              style={{ borderColor: 'rgba(0,255,65,0.19)' }}
            >
              [CLOSE]
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-0.5 mb-2.5">
              {board.map((row, ri) => row.map((val, ci) => {
                const isSel = sel && sel[0] === ri && sel[1] === ci;
                const isFixed = puzzle.fixed[ri][ci];
                const isWrong = val !== 0 && val !== puzzle.sol[ri][ci];
                return (
                  <div
                    key={`${ri}-${ci}`}
                    onClick={(e) => { e.stopPropagation(); if (!isFixed) setSel([ri, ci]); }}
                    className="aspect-square flex items-center justify-center transition-all duration-150"
                    style={{
                      background: isSel ? 'rgba(0,255,65,0.06)' : 'var(--color-bg)',
                      border: `1px solid ${isSel ? 'rgba(0,255,65,0.27)' : 'var(--color-border)'}`,
                      color: isWrong ? 'var(--color-red)' : isFixed ? 'var(--color-muted)' : 'var(--color-green)',
                      fontSize: 17, fontWeight: isFixed ? 400 : 700,
                      cursor: isFixed ? 'default' : 'pointer',
                      borderRight: ci === 1 ? '2px solid rgba(85,85,85,0.19)' : undefined,
                      borderBottom: ri === 1 ? '2px solid rgba(85,85,85,0.19)' : undefined,
                    }}
                  >
                    {val || ''}
                  </div>
                );
              }))}
            </div>
            <div className="flex gap-1.5 justify-center">
              {[1,2,3,4].map(n => (
                <button
                  key={n}
                  onClick={(e) => { e.stopPropagation(); fillCell(n); }}
                  className="panel w-9 h-8 text-green cursor-pointer text-sm font-mono flex items-center justify-center"
                  style={{ borderColor: 'rgba(0,255,65,0.12)' }}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={(e) => { e.stopPropagation(); fillCell(0); }}
                className="panel w-9 h-8 text-red cursor-pointer text-[10px] font-mono flex items-center justify-center"
                style={{ borderColor: 'rgba(255,51,51,0.12)' }}
              >
                CLR
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
