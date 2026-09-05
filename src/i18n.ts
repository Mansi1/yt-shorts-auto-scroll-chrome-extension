/**
 * Message lookup for the popup, with a manual language override.
 *
 * `chrome.i18n.getMessage` is fixed to the browser's UI locale and cannot be
 * pointed at another one, so picking a language in the popup means reading the
 * catalog out of _locales ourselves. "auto" leaves Chrome in charge.
 *
 * Compiled with `"module": "none"`, so these are globals shared with popup.ts,
 * the same way settings.ts shares Settings.
 */

/** Locales with a catalog in public/_locales, minus the default. */
const LANGUAGES = ["en", "de", "es"] as const;

interface Catalog {
  [key: string]: { message: string } | undefined;
}

/** Catalog for the chosen language; null while "auto" is in effect. */
let chosen: Catalog | null = null;
/** English catalog, used when the chosen language is missing a key. */
let chosenFallback: Catalog | null = null;
/** Locale code the UI is currently showing. */
let activeLanguage = "auto";

async function fetchCatalog(language: string): Promise<Catalog> {
  const url = chrome.runtime.getURL(`_locales/${language}/messages.json`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return (await response.json()) as Catalog;
}

/**
 * Switches the language used by `t`. Anything other than a locale we ship -
 * including "auto" - hands the job back to `chrome.i18n`.
 */
async function loadLanguage(language: string): Promise<void> {
  activeLanguage = language;

  if (!(LANGUAGES as readonly string[]).includes(language)) {
    chosen = null;
    chosenFallback = null;
    return;
  }

  try {
    const [primary, english] = await Promise.all([
      fetchCatalog(language),
      language === "en" ? Promise.resolve(null) : fetchCatalog("en")
    ]);
    chosen = primary;
    chosenFallback = english ?? primary;
  } catch (err) {
    // A catalog we could not read is not worth breaking the popup over.
    console.warn("falling back to the browser language:", err);
    chosen = null;
    chosenFallback = null;
    activeLanguage = "auto";
  }
}

/** Looks up a message, or "" when no catalog defines the key. */
function t(key: string): string {
  if (chosen) {
    return chosen[key]?.message ?? chosenFallback?.[key]?.message ?? chrome.i18n.getMessage(key);
  }
  return chrome.i18n.getMessage(key);
}

/** BCP 47 tag for the language actually on screen, for `<html lang>`. */
function activeLanguageTag(): string {
  return chosen ? activeLanguage : chrome.i18n.getUILanguage();
}
