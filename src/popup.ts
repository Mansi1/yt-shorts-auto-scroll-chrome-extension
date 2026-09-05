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

  /* ---------------------------------------------------------------- i18n */

  /**
   * Looks up a string from _locales. Returns "" for an unknown key, which the
   * callers treat as "keep whatever English text is already in popup.html".
   */
  const t = (key: string): string => chrome.i18n.getMessage(key);

  /** Fills in every [data-i18n] / [data-i18n-aria] element in the markup. */
  function translate(): void {
    document.documentElement.lang = chrome.i18n.getUILanguage();

    for (const el of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
      const message = t(el.dataset.i18n ?? "");
      if (message) el.textContent = message;
    }
    for (const el of document.querySelectorAll<HTMLElement>("[data-i18n-aria]")) {
      const message = t(el.dataset.i18nAria ?? "");
      if (message) el.setAttribute("aria-label", message);
    }
  }

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
    // Chrome's i18n has no plural rules, so the two forms are separate keys.
    playCountUnit.textContent = t(
      s.playCount === 1 ? "playCountUnitOne" : "playCountUnitOther"
    );
    document.body.classList.toggle("off", !s.enabled);
    status.textContent = t(s.enabled ? "statusOn" : "statusOff");
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

  translate();
  void loadSettings().then(render);

  for (const input of [enabled, playCount, delayMs, playbackRate, skipSeen]) {
    input.addEventListener("change", save);
  }
})();
