/**
 * Checks public/_locales against the default locale (en).
 *
 * A missing key is not a build error in Chrome - it silently falls back to
 * English - so nothing would tell you a translation went stale. This does.
 *
 * Run with `npm run check:locales`.
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const localesDir = join(root, "public", "_locales");
const DEFAULT_LOCALE = "en";

const read = (locale) =>
  JSON.parse(readFileSync(join(localesDir, locale, "messages.json"), "utf8"));

const locales = readdirSync(localesDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

if (!locales.includes(DEFAULT_LOCALE)) {
  console.error(`no _locales/${DEFAULT_LOCALE} - manifest default_locale has no catalog`);
  process.exit(1);
}

const base = read(DEFAULT_LOCALE);
const baseKeys = Object.keys(base);
const problems = [];

// Every message the manifest asks for must exist.
const manifest = readFileSync(join(root, "public", "manifest.json"), "utf8");
for (const [, key] of manifest.matchAll(/__MSG_([A-Za-z0-9_@]+)__/g)) {
  if (!baseKeys.includes(key)) problems.push(`manifest.json uses __MSG_${key}__, missing from ${DEFAULT_LOCALE}`);
}

// So must every message the popup asks for.
const popupHtml = readFileSync(join(root, "public", "popup", "popup.html"), "utf8");
for (const [, key] of popupHtml.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)) {
  if (!baseKeys.includes(key)) problems.push(`popup.html uses "${key}", missing from ${DEFAULT_LOCALE}`);
}

for (const locale of locales) {
  if (locale === DEFAULT_LOCALE) continue;
  const messages = read(locale);

  for (const key of baseKeys) {
    if (!messages[key]) problems.push(`${locale}: missing "${key}"`);
    else if (!messages[key].message?.trim()) problems.push(`${locale}: "${key}" is empty`);
  }
  for (const key of Object.keys(messages)) {
    if (!baseKeys.includes(key)) problems.push(`${locale}: "${key}" is not in ${DEFAULT_LOCALE}`);
  }

  // A placeholder dropped in translation would render as a literal $1.
  for (const key of baseKeys) {
    const expected = [...(base[key].message.match(/\$[A-Za-z0-9_]+\$/g) ?? [])].sort();
    const actual = [...(messages[key]?.message.match(/\$[A-Za-z0-9_]+\$/g) ?? [])].sort();
    if (expected.join() !== actual.join()) {
      problems.push(`${locale}: "${key}" placeholders ${actual.join(", ") || "(none)"} != ${expected.join(", ") || "(none)"}`);
    }
  }
}

if (problems.length) {
  console.error(`${problems.length} locale problem(s):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(`${locales.length} locales in sync (${locales.join(", ")}), ${baseKeys.length} messages each`);
