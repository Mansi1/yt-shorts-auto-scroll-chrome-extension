/** YT Shorts Autoscroll - popup UI. */
(() => {
  "use strict";

  const $ = <T extends HTMLElement>(id: string): T => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`missing element #${id}`);
    return el as T;
  };

  const enabled = $<HTMLInputElement>("enabled");
  const playCount = $<HTMLInputElement>("playCount");
  const playCountUnit = $<HTMLSpanElement>("playCountUnit");
  const delayMs = $<HTMLInputElement>("delayMs");
  const playbackRate = $<HTMLSelectElement>("playbackRate");
  const skipSeen = $<HTMLInputElement>("skipSeen");
  const status = $<HTMLParagraphElement>("status");

  /** Rounds an input to a whole number inside its own min/max. */
  function clamp(input: HTMLInputElement, fallback: number): number {
    const n = Number(input.value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(Number(input.max), Math.max(Number(input.min), Math.round(n)));
  }

  function render(s: Settings): void {
    enabled.checked = s.enabled;
    playCount.value = String(s.playCount);
    delayMs.value = String(s.delayMs);
    playbackRate.value = String(s.playbackRate);
    // A stored speed with no matching <option> would leave the select blank.
    if (!playbackRate.value) playbackRate.value = String(DEFAULT_SETTINGS.playbackRate);
    skipSeen.checked = s.skipSeen;
    playCountUnit.textContent = s.playCount === 1 ? "time" : "times";
    document.body.classList.toggle("off", !s.enabled);
    status.textContent = s.enabled
      ? "Scrolls to the next Short when this one finishes."
      : "Paused - Shorts will keep looping.";
  }

  function save(): void {
    const s: Settings = {
      enabled: enabled.checked,
      playCount: clamp(playCount, DEFAULT_SETTINGS.playCount),
      delayMs: clamp(delayMs, DEFAULT_SETTINGS.delayMs),
      skipSeen: skipSeen.checked,
      playbackRate: Number(playbackRate.value) || DEFAULT_SETTINGS.playbackRate
    };
    chrome.storage.sync.set(s, () => render(s));
  }

  void loadSettings().then(render);

  for (const input of [enabled, playCount, delayMs, playbackRate, skipSeen]) {
    input.addEventListener("change", save);
  }
})();
