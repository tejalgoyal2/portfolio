import { useEffect, useId, useRef, useState } from 'react';
import { NIBS, SYSTEM, nib, setNib, onNib } from '../life/nib';
import { DRIFT_LEVELS, settings, setSetting, onSettings } from '../life/settings';
import { prefs } from '../life/prefs';

/**
 * Page settings — a small card that drops from the running head with the
 * things on this page you can play with: your pen, how many icons float on the
 * paper, whether a click ripples,
 * whether the cube keeps you company. Nothing here is needed to read the page.
 * Escape, a click elsewhere or the button again closes it.
 */
export default function PageSettings() {
  const [open, setOpen] = useState(false);
  const [pen, setPen] = useState(nib());
  const [s, setS] = useState({ ...settings });
  const [icons, setIcons] = useState(null);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const id = useId();

  useEffect(() => {
    const a = onNib(setPen);
    const b = onSettings((next) => setS({ ...next }));
    return () => {
      a();
      b();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    if (!icons) import('../life/icons').then(({ ICON }) => setIcons(ICON));
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    const onDown = (e) => {
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [open, icons]);


  return (
    <div ref={wrapRef} className={`rh-settings${open ? ' is-open' : ''}`}>
      <button
        ref={btnRef}
        type="button"
        className="rh-settings-btn"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="rh-settings-word">Page settings</span>
        <svg className="rh-settings-glyph" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M3 6h9M15 6h2M3 14h2M8 14h9" />
          <circle cx="13.5" cy="6" r="1.8" />
          <circle cx="6.5" cy="14" r="1.8" />
        </svg>
      </button>

      <div id={id} className="rh-panel" role="group" aria-label="Page settings" hidden={!open}>
        <p className="rh-panel-title">Page settings</p>

        {prefs.fine && (
          <fieldset className="rh-opt">
            <legend>Your pen</legend>
            <div className="rh-pens">
              {NIBS.map((n) => (
                <button
                  key={n.name}
                  type="button"
                  className="rh-pen-pick"
                  aria-pressed={pen.name === n.name}
                  aria-label={n.label}
                  title={n.label}
                  onClick={() => setNib(n.name)}
                >
                  <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: icons?.[n.name] || '' }} />
                </button>
              ))}
            </div>
            <label className="rh-switch">
              <input
                type="checkbox"
                checked={pen.name === SYSTEM.name}
                onChange={(e) => setNib(e.target.checked ? SYSTEM.name : NIBS[0].name)}
              />
              <span>Use my own cursor</span>
            </label>
          </fieldset>
        )}

        <fieldset className="rh-opt">
          <legend>Floating icons</legend>
          <div className="rh-seg">
            {DRIFT_LEVELS.map((l) => (
              <button
                key={l.label}
                type="button"
                aria-pressed={s.drift === l.v}
                onClick={() => setSetting('drift', l.v)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="rh-opt">
          <legend>Play</legend>
          <label className="rh-switch">
            <input type="checkbox" checked={s.ripples} onChange={(e) => setSetting('ripples', e.target.checked)} />
            <span>A click ripples the paper</span>
          </label>
          <label className="rh-switch">
            <input type="checkbox" checked={s.cube} onChange={(e) => setSetting('cube', e.target.checked)} />
            <span>The cube keeps me company</span>
          </label>
          <label className="rh-switch">
            <input type="checkbox" checked={s.sound} onChange={(e) => setSetting('sound', e.target.checked)} />
            <span>A twist goes thock</span>
          </label>
        </fieldset>

      </div>
    </div>
  );
}
