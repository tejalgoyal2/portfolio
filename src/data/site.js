// Switches for things that depend on something outside this site.

/** The car in Let's talk links to the driving game once it's live. Until then it says the garage opens soon. */
export const PLAY_LIVE = false;
export const PLAY_URL = 'https://play.tgoyal.me';

/**
 * The gratitude sheet's Turnstile site key. It's public by design (every visitor's
 * browser sees it); the secret lives only in the Pages settings.
 * VITE_TURNSTILE_SITEKEY overrides it (Turnstile's test key, for local runs).
 */
export const TURNSTILE_SITEKEY = import.meta.env?.VITE_TURNSTILE_SITEKEY || '0x4AAAAAAFcLB_DEyKajOJ8i';
