import { useEffect, useRef, useState } from 'react';
import { prefs } from '../life/prefs';

/**
 * The resume, where the letter's stamp used to be: a little cartoon of one,
 * in ink on white (a photo, a name, a rule, a few blocks of lines, and not a
 * word you could read), sitting on the red. Point at it and it lifts off the
 * page; click it and the real one opens over the site in a window of its own,
 * with a way to open it in a tab, download it, or put it away (Esc does too).
 * On a phone, or without a dialog, it's just a link to the PDF in a new tab.
 *
 * The PDF is public/resume.pdf: upload a new one over it and the next deploy
 * serves it. It's only fetched once the window opens.
 */
const HREF = '/resume.pdf';

export default function Resume() {
  const dialogRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // the page underneath holds still while it's open
  useEffect(() => {
    if (!open) return;
    window.__lenis?.stop();
    return () => window.__lenis?.start();
  }, [open]);

  const show = (e) => {
    const d = dialogRef.current;
    // a phone's PDF viewer is better than a box on a small screen
    if (!d || typeof d.showModal !== 'function' || !window.matchMedia('(min-width: 721px)').matches) return;
    e.preventDefault();
    setOpen(true);
    d.showModal();
  };
  const hide = () => dialogRef.current?.close();

  return (
    <>
      <a
        className="resume"
        href={HREF}
        target="_blank"
        rel="noopener noreferrer"
        onClick={show}
        data-pen="rocket"
        aria-haspopup="dialog"
      >
        <span className="sr-only">My resume (PDF)</span>
        <svg className="resume-art" viewBox="0 0 96 124" aria-hidden="true">
          {/* the sheet's shadow, printed flat behind it, and the sheet with its corner turned */}
          <path className="ra-shadow" d="M11 9h59l21 21v88a4 4 0 0 1-4 4H11a4 4 0 0 1-4-4V13a4 4 0 0 1 4-4Z" />
          <path className="ra-sheet" d="M7 4h59l21 21v88a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4Z" />
          <path className="ra-fold" d="M66 4v17a4 4 0 0 0 4 4h17" />
          {/* a photo */}
          <circle className="ra-line" cx="22" cy="26" r="10.5" />
          <circle className="ra-ink" cx="22" cy="23.5" r="3.6" />
          <path className="ra-ink" d="M14.6 33.2a8.6 8.6 0 0 1 14.8 0 10.4 10.4 0 0 1-14.8 0Z" />
          {/* the name, and a line under it */}
          <path className="ra-bar ra-bar--name" d="M39 21h20" />
          <path className="ra-bar ra-bar--sub" d="M39 31h26" />
          <path className="ra-rule" d="M12 46h66" />
          {/* blocks of lines: a heading each, then the text */}
          <path className="ra-bar ra-bar--head" d="M12 56h18" />
          <path className="ra-bar" d="M12 65h62M12 72h55M12 79h60" />
          <path className="ra-bar ra-bar--head" d="M12 91h22" />
          <path className="ra-bar" d="M12 100h58M12 107h40" />
        </svg>
        <span className="resume-tip" aria-hidden="true">
          my resume, have a look
        </span>
      </a>

      <dialog
        ref={dialogRef}
        className={`resume-window${prefs.reduced ? ' is-still' : ''}`}
        aria-label="My resume"
        onClose={() => {
          setOpen(false);
          setLoaded(false);
        }}
        // a click on the dim around it puts it away
        onClick={(e) => e.target === dialogRef.current && hide()}
      >
        <div className="resume-window-paper">
          <header className="resume-window-bar">
            <p className="resume-window-kicker">The resume</p>
            <div className="resume-window-actions">
              <a href={HREF} target="_blank" rel="noopener noreferrer" data-pen="rocket">
                Open in a tab <span aria-hidden="true">↗</span>
              </a>
              <a href={HREF} download="Tejal-Goyal-Resume.pdf" data-pen="rocket">
                Download
              </a>
              <button type="button" className="resume-window-close" onClick={hide} data-pen="rocket">
                Close <span aria-hidden="true">×</span>
              </button>
            </div>
          </header>
          <div className={`resume-window-page${loaded ? ' is-loaded' : ''}`}>
            {open && (
              <iframe
                className="resume-window-frame"
                src={`${HREF}#view=FitH`}
                title="My resume"
                onLoad={() => setLoaded(true)}
              />
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
