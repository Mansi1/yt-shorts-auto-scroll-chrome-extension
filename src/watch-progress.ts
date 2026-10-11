/**
 * How much of a Short has been watched, for deciding whether it counts as seen.
 *
 * Compiled as a classic script like settings.ts, so content.ts uses these
 * declarations without imports.
 *
 * VERIFIED: test/watch-progress.test.mjs covers both edges, the midpoint rule
 * and unknown durations against the compiled script.
 */

/** Seconds at the start and at the end a Short must play through to count as seen. */
const SEEN_EDGE = 3;

interface WatchProgress {
  /** Playback got beyond the opening SEEN_EDGE seconds. */
  pastStart: boolean;
  /** Playback reached the closing SEEN_EDGE seconds, or the end. */
  reachedEnd: boolean;
}

const newProgress = (): WatchProgress => ({ pastStart: false, reachedEnd: false });

/**
 * Folds one playback position into `progress`. A Short shorter than both edges
 * together counts from its midpoint, which it can always reach. An unknown
 * duration (metadata not loaded yet) tells us nothing.
 */
function trackProgress(progress: WatchProgress, time: number, duration: number): void {
  if (!Number.isFinite(duration) || duration <= 0) return;
  const edge = Math.min(SEEN_EDGE, duration / 2);
  if (time >= edge) progress.pastStart = true;
  if (time >= duration - edge) progress.reachedEnd = true;
}

/** True when the Short was watched through both edges and should be recorded as seen. */
const watchedThrough = (progress: WatchProgress): boolean =>
  progress.pastStart && progress.reachedEnd;
