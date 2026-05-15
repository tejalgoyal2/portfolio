import { useRef, useCallback } from 'react';

export function useSplitText() {
  const elementsRef = useRef([]);

  const split = useCallback((element, type = 'chars') => {
    if (!element) return [];

    const text = element.textContent;
    element.textContent = '';
    element.setAttribute('aria-label', text);

    const fragments = [];

    if (type === 'chars') {
      for (const char of text) {
        const span = document.createElement('span');
        span.textContent = char === ' ' ? ' ' : char;
        span.style.display = 'inline-block';
        span.setAttribute('aria-hidden', 'true');
        element.appendChild(span);
        fragments.push(span);
      }
    } else if (type === 'words') {
      const words = text.split(/(\s+)/);
      words.forEach((word) => {
        if (/^\s+$/.test(word)) {
          const space = document.createElement('span');
          space.innerHTML = '&nbsp;';
          space.style.display = 'inline-block';
          element.appendChild(space);
          return;
        }
        const span = document.createElement('span');
        span.textContent = word;
        span.style.display = 'inline-block';
        span.setAttribute('aria-hidden', 'true');
        element.appendChild(span);
        fragments.push(span);
      });
    } else if (type === 'lines') {
      const words = text.split(' ');
      const tempDiv = document.createElement('div');
      tempDiv.style.cssText = window.getComputedStyle(element).cssText;
      tempDiv.style.position = 'absolute';
      tempDiv.style.visibility = 'hidden';
      tempDiv.style.width = `${element.offsetWidth}px`;
      document.body.appendChild(tempDiv);

      let currentLine = '';
      const lines = [];

      words.forEach((word) => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        tempDiv.textContent = testLine;
        if (tempDiv.offsetHeight > parseInt(getComputedStyle(tempDiv).lineHeight) && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });
      if (currentLine) lines.push(currentLine);
      document.body.removeChild(tempDiv);

      lines.forEach((line) => {
        const span = document.createElement('span');
        span.textContent = line;
        span.style.display = 'block';
        span.setAttribute('aria-hidden', 'true');
        element.appendChild(span);
        fragments.push(span);
      });
    }

    elementsRef.current = fragments;
    return fragments;
  }, []);

  return { split, elements: elementsRef };
}
