import { useState, useEffect } from 'react';

/**
 * Live masthead date — formats today's date once on mount and rolls it
 * at midnight if the tab stays open through the day. Pure render; no timers
 * if the date hasn't actually changed.
 */
function getDate() {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());
}

export default function Dateline() {
  const [date, setDate] = useState(getDate);

  useEffect(() => {
    const now = new Date();
    const msToMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
    const timer = setTimeout(() => setDate(getDate()), msToMidnight);
    return () => clearTimeout(timer);
  }, []);

  return <>{date}</>;
}
