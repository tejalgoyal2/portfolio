// Switches for things that depend on something outside this site.

/** The car in Let's talk links to the driving game once it's live. Until then it says the garage opens soon. */
export const PLAY_LIVE = false;
export const PLAY_URL = 'https://play.tgoyal.me';

/**
 * The gratitude corner's Turnstile site key (public; the secret lives in the
 * Pages Functions settings). Empty: the corner still prints the words, but the
 * form says the letters desk opens soon. VITE_TURNSTILE_SITEKEY overrides it.
 */
export const TURNSTILE_SITEKEY = import.meta.env?.VITE_TURNSTILE_SITEKEY || '';
