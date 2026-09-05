/**
 * YT Shorts Autoscroll - content script.
 *
 * YouTube Shorts loop by default, so the <video> element usually never fires
 * "ended". A finish is detected two ways:
 *   1. the "ended" event (when looping happens to be off), and
 *   2. a jump backwards to the start from within NEAR_END seconds of the end,
 *      which is what a loop looks like from the outside.
 *
 * Every Short reached is recorded by video id; with "skip seen" on, landing on
 * a recorded id advances again straight away instead of replaying it.
 */
(() => {
  "use strict";

  const NEAR_END = 1.5; // seconds before the end that count as "finished"
  const COOLDOWN_MS = 1200; // ignore finishes right after we advance
  const POLL_MS = 400; // how often we re-check which video is active
  const MAX_SKIPS = 25; // consecutive seen Shorts to jump before giving up
  const TRAIL_LIMIT = 100; // Shorts of this tab's route we keep for direction
  const GESTURE_MS = 1500; // how long a scroll gesture explains a navigation

  let settings: Settings = { ...DEFAULT_SETTINGS };
  let video: HTMLVideoElement | null = null;
  let shortId: string | null = null;
  let lastTime = 0;
  let plays = 0; // completed plays of the current Short
  let lastAdvance = 0;
  let pendingAdvance: number | undefined;

  let seenIds: string[] = []; // watched Short ids, oldest first
  let seenSet = new Set<string>();
  let seenReady = false; // history loaded - writing before this would erase it
  let skips = 0; // seen Shorts jumped in a row

  let trail: string[] = []; // Shorts visited in this tab, in order
  let trailIndex = -1; // where in that trail we are now
  let lastUp = 0; // timestamp of the last upward scroll gesture
  let lastDown = 0; // ... and the last downward one

  /* ---------------------------------------------------------------- helpers */

  const onShorts = (): boolean => location.pathname.startsWith("/shorts/");
  const currentShortId = (): string | null => location.pathname.split("/")[2] || null;

  function getActiveVideo(): HTMLVideoElement | null {
    const active = document.querySelector<HTMLVideoElement>(
      "ytd-reel-video-renderer[is-active] video"
    );
    if (active) return active;

    // Fallback: the video sitting across the vertical middle of the viewport.
    const middle = window.innerHeight / 2;
    for (const v of document.querySelectorAll("video")) {
      const r = v.getBoundingClientRect();
      if (r.height > 100 && r.top < middle && r.bottom > middle) return v;
    }
    return null;
  }

  function findScroller(): Element | null {
    const candidates = [
      document.querySelector("#shorts-inner-container"),
      document.querySelector("ytd-shorts"),
      document.scrollingElement
    ];
    return candidates.find((el) => el && el.scrollHeight > el.clientHeight + 10) ?? null;
  }

  function goNext(): void {
    // 1. The chevron YouTube renders next to the player.
    const btn = document.querySelector<HTMLButtonElement>(
      "#navigation-button-down button, ytd-shorts #navigation-button-down button"
    );
    if (btn && !btn.disabled && btn.getAttribute("aria-disabled") !== "true") {
      btn.click();
      return;
    }

    // 2. Keyboard navigation.
    for (const type of ["keydown", "keyup"]) {
      document.dispatchEvent(
        new KeyboardEvent(type, {
          key: "ArrowDown",
          code: "ArrowDown",
          keyCode: 40,
          which: 40,
          bubbles: true,
          cancelable: true
        } as KeyboardEventInit)
      );
    }

    // 3. Scroll the snap container down by one viewport.
    findScroller()?.scrollBy({ top: window.innerHeight, behavior: "smooth" });
  }

  function finished(): void {
    if (!settings.enabled) return;
    if (Date.now() - lastAdvance < COOLDOWN_MS) return;

    plays += 1;
    if (plays < Math.max(1, settings.playCount)) return;

    lastAdvance = Date.now();
    clearTimeout(pendingAdvance);
    pendingAdvance = setTimeout(goNext, Math.max(0, settings.delayMs));
  }

  /* ------------------------------------------------------------- seen Shorts */

  /** Records a Short as watched, dropping the oldest ids once full. */
  function remember(id: string): void {
    if (!seenReady || seenSet.has(id)) return;
    seenSet.add(id);
    seenIds.push(id);
    if (seenIds.length > SEEN_LIMIT) {
      for (const dropped of seenIds.splice(0, seenIds.length - SEEN_LIMIT)) {
        seenSet.delete(dropped);
      }
    }
    saveSeen(seenIds);
  }

  /* -------------------------------------------------------------- direction */

  /**
   * Records which way the user last asked to move. Our own advance dispatches
   * an ArrowDown, so only trusted events count - a synthetic one would read as
   * the user scrolling down and defeat the check below.
   */
  function onWheel(e: WheelEvent): void {
    if (!e.isTrusted || Math.abs(e.deltaY) < 1) return;
    if (e.deltaY < 0) lastUp = Date.now();
    else lastDown = Date.now();
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (!e.isTrusted) return;
    if (e.key === "ArrowUp" || e.key === "PageUp" || e.key === "Home") lastUp = Date.now();
    else if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === "End") lastDown = Date.now();
  }

  const gestureWasUp = (): boolean =>
    lastUp > lastDown && Date.now() - lastUp < GESTURE_MS;

  /**
   * Moves the trail onto `id` and reports whether that was a step back up the
   * feed.
   *
   * The trail answers it exactly for any Short already on it, including when
   * YouTube's own up chevron is used, which fires no scroll event at all. For
   * a Short the trail has never held, the last scroll gesture is the best
   * evidence there is.
   */
  function stepTrail(id: string): boolean {
    if (trail[trailIndex] === id) return false; // re-checking the same Short
    if (trailIndex > 0 && trail[trailIndex - 1] === id) {
      trailIndex -= 1;
      return true;
    }
    if (trail[trailIndex + 1] === id) {
      trailIndex += 1;
      return false;
    }

    const backwards = gestureWasUp();
    trail.splice(trailIndex + 1, trail.length, id);
    trailIndex = trail.length - 1;
    if (trail.length > TRAIL_LIMIT) {
      trail.shift();
      trailIndex -= 1;
    }
    return backwards;
  }

  /** True when this Short has been watched before and should be jumped over. */
  function shouldSkip(id: string): boolean {
    return (
      seenReady &&
      settings.enabled &&
      settings.skipSeen &&
      seenSet.has(id) &&
      skips < MAX_SKIPS
    );
  }

  /* ----------------------------------------------------------- playback rate */

  function applyRate(): void {
    if (!video) return;
    const rate = Math.max(0.25, Math.min(4, settings.playbackRate || 1));
    if (Math.abs(video.playbackRate - rate) > 0.01) video.playbackRate = rate;
  }

  /* --------------------------------------------------------- video listeners */

  function onTimeUpdate(): void {
    if (!video) return;
    const now = video.currentTime;
    const duration = video.duration;

    // A loop: we were near the end and the clock jumped back to the start.
    if (
      Number.isFinite(duration) &&
      duration > 0 &&
      now < lastTime - 0.5 &&
      lastTime >= duration - NEAR_END
    ) {
      finished();
    }
    lastTime = now;
  }

  function onEnded(): void {
    finished();
  }

  function detach(): void {
    if (!video) return;
    video.removeEventListener("timeupdate", onTimeUpdate);
    video.removeEventListener("ended", onEnded);
    video.removeEventListener("play", applyRate);
    video.removeEventListener("loadeddata", applyRate);
    video = null;
  }

  function attach(next: HTMLVideoElement): void {
    detach();
    video = next;
    lastTime = next.currentTime || 0;
    plays = 0;
    next.addEventListener("timeupdate", onTimeUpdate);
    next.addEventListener("ended", onEnded);
    // YouTube resets the rate on each new video, so re-apply as playback starts.
    next.addEventListener("play", applyRate);
    next.addEventListener("loadeddata", applyRate);
    applyRate();
  }

  /* ------------------------------------------------------------------- loop */

  function tick(): void {
    if (!onShorts()) {
      if (shortId) remember(shortId); // leaving the feed finishes that Short
      detach();
      shortId = null;
      return;
    }

    const active = getActiveVideo();
    if (!active) return;

    const id = currentShortId();
    const isNewShort = id !== shortId;

    if (isNewShort) {
      // A Short counts as seen once you move off it, not when you land on it.
      // Marking on arrival meant the one you were watching was already in the
      // history, so scrolling back up to it would skip it away again.
      if (shortId) remember(shortId);

      const backwards = id ? stepTrail(id) : false;
      shortId = id;

      // Only ever skip forwards. Scrolling up is a deliberate request for that
      // Short, seen or not, and skipping would drag the user straight back.
      if (!backwards && id && shouldSkip(id)) {
        // Jump straight past it; the next tick picks up whatever we land on.
        skips += 1;
        detach();
        clearTimeout(pendingAdvance);
        lastAdvance = Date.now();
        goNext();
        return;
      }
      skips = 0;
    }

    if (active !== video || isNewShort) attach(active);
  }

  setInterval(tick, POLL_MS);
  document.addEventListener("yt-navigate-finish", tick);
  addEventListener("wheel", onWheel, { capture: true, passive: true });
  addEventListener("keydown", onKeyDown, true);
  tick();

  /* --------------------------------------------------------------- settings */

  void Promise.all([loadSettings(), loadSeen()]).then(([s, ids]) => {
    settings = s;
    seenIds = ids;
    seenSet = new Set(ids);
    seenReady = true;
    // Re-run against the Short already on screen now that the history is here.
    shortId = null;
    tick();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      // Another tab watched something - pick up its history.
      const seen = changes[SEEN_KEY];
      if (seen && Array.isArray(seen.newValue)) {
        seenIds = seen.newValue as string[];
        seenSet = new Set(seenIds);
      }
      return;
    }
    if (area !== "sync") return;
    if (changes.enabled) settings.enabled = Boolean(changes.enabled.newValue);
    if (changes.playCount) settings.playCount = Number(changes.playCount.newValue);
    if (changes.delayMs) settings.delayMs = Number(changes.delayMs.newValue);
    if (changes.skipSeen) settings.skipSeen = Boolean(changes.skipSeen.newValue);
    if (changes.playbackRate) {
      settings.playbackRate = Number(changes.playbackRate.newValue);
      applyRate();
    }
    if (!settings.enabled) clearTimeout(pendingAdvance);
  });
})();
