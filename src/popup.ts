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
  const language = $<HTMLSelectElement>("language");
  const status = $<HTMLParagraphElement>("status");

  /* ---------------------------------------------------------------- i18n */

  /**
   * Fills in every [data-i18n] / [data-i18n-aria] element in the markup. An
   * unknown key leaves the English text that popup.html already carries.
   */
  function translate(): void {
    document.documentElement.lang = activeLanguageTag();

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
    language.value = s.language;
    if (!language.value) language.value = DEFAULT_SETTINGS.language;
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
      playbackRate: Number(playbackRate.value) || DEFAULT_SETTINGS.playbackRate,
      language: language.value
    };
    chrome.storage.sync.set(s, () => void show(s));
  }

  /** Loads the chosen language, then paints the popup with it. */
  async function show(s: Settings): Promise<void> {
    await loadLanguage(s.language);
    translate();
    render(s);
  }

  void loadSettings().then(show);

  for (const input of [enabled, playCount, delayMs, playbackRate, skipSeen, language]) {
    input.addEventListener("change", save);
  }
})();
