/**
 * Shared settings for YT Shorts Autoscroll.
 *
 * Compiled with `"module": "none"`, so every file is a classic script and these
 * declarations are visible to content.ts and popup.ts without imports.
 */

interface Settings {
  /** Master on/off switch. */
  enabled: boolean;
  /** How many times a Short plays through before we move on. */
  playCount: number;
  /** Pause between the Short finishing and the scroll, in milliseconds. */
  delayMs: number;
  /** Skip past Shorts that have already been seen instead of replaying them. */
  skipSeen: boolean;
  /** Playback speed applied to every Short, e.g. 1.5 for 1.5x. */
  playbackRate: number;
}

const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  playCount: 1,
  delayMs: 0,
  skipSeen: false,
  playbackRate: 1
};

/** Reads settings from sync storage, filling in anything missing. */
function loadSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (stored) => {
      resolve({ ...DEFAULT_SETTINGS, ...(stored as Partial<Settings>) });
    });
  });
}

/**
 * History of watched Shorts.
 *
 * Kept in `chrome.storage.local` rather than sync: it grows far past sync's
 * 8KB-per-item quota and is only meaningful on the machine doing the watching.
 * Oldest ids fall off the front once the list is full.
 */
const SEEN_KEY = "seenShorts";
const SEEN_LIMIT = 2000;

/** Reads the watched-Shorts history, oldest first. */
function loadSeen(): Promise<string[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get({ [SEEN_KEY]: [] }, (stored) => {
      const ids = (stored as Record<string, unknown>)[SEEN_KEY];
      resolve(Array.isArray(ids) ? (ids as string[]) : []);
    });
  });
}

/** Writes the history back, trimmed to the newest SEEN_LIMIT ids. */
function saveSeen(ids: string[]): void {
  chrome.storage.local.set({ [SEEN_KEY]: ids.slice(-SEEN_LIMIT) });
}
