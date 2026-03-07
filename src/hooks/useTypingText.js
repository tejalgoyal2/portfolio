import { useState, useEffect } from 'react';

export function useTypingText(strings, speed = 65, pause = 2000) {
  const [text, setText] = useState('');
  const [strIdx, setStrIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = strings[strIdx];
    let timer;

    if (!deleting && charIdx < current.length) {
      timer = setTimeout(() => {
        setText(current.slice(0, charIdx + 1));
        setCharIdx(charIdx + 1);
      }, speed);
    } else if (!deleting) {
      timer = setTimeout(() => setDeleting(true), pause);
    } else if (charIdx > 0) {
      timer = setTimeout(() => {
        setText(current.slice(0, charIdx - 1));
        setCharIdx(charIdx - 1);
      }, speed / 2);
    } else {
      setDeleting(false);
      setStrIdx((strIdx + 1) % strings.length);
    }

    return () => clearTimeout(timer);
  }, [charIdx, deleting, strIdx, strings, speed, pause]);

  return text;
}
