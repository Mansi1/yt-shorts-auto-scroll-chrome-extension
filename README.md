# YT Shorts Autoscroll

<img src="public/icons/icon128.png" alt="" width="64" height="64" />

Chrome extension (Manifest V3, TypeScript) that scrolls to the next YouTube Short
as soon as the current one finishes, so a Shorts feed plays hands-free.

## Build & install

```bash
npm install
npm run build      # produces a complete, loadable extension in dist/
```

Then in Chrome:

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. **Load unpacked** -> select the **`dist/`** folder (not the repo root)
4. Open `youtube.com/shorts/...`

`npm run watch` copies the static files once and then recompiles TypeScript on
save; press reload on the extension card and refresh the tab to pick up changes.
`npm run typecheck` checks types without emitting.

## Options

Click the toolbar icon:

| Setting | Default | What it does |
| --- | --- | --- |
| On/off | on | Master switch; off leaves Shorts looping as normal |
| Play each Short | 1 time | How many full plays before moving on |
| Wait before scrolling | 0 ms | Pause between the finish and the scroll |
| Playback speed | 1x | Speed every Short plays at, 0.75x - 2x |
| Skip Shorts I've seen | off | Jump straight past a Short that has played before |
| Language | Browser language | Language of the popup itself; see Translations |

Settings live in `chrome.storage.sync`, so they follow your Chrome profile and
apply immediately to any open Shorts tab. The watched-Shorts history behind
"skip seen" lives in `chrome.storage.local` instead - it outgrows sync's
8KB-per-item quota and is per-machine - and keeps the newest 2000 video ids.

## How it works

Shorts loop by default, so the `<video>` element normally never fires `ended`.
`src/content.ts` therefore treats a Short as finished when either:

- `ended` fires (looping happens to be off), or
- playback jumps backwards to the start from within 1.5s of the end - what a
  loop looks like from the outside. A backwards seek from the middle of the
  video is ignored, so scrubbing doesn't trigger a skip.

To advance it clicks YouTube's own "next" chevron, falling back to an
`ArrowDown` key event and then to scrolling the snap container by one viewport.
A short cooldown after each advance prevents double skips, and the active video
is re-detected on a 400ms poll plus YouTube's `yt-navigate-finish` event, since
Shorts is a single-page app that swaps video elements as you scroll.

A Short is recorded by the video id in its URL once you move off it, not when
you land on it - marking it on arrival would put the Short you are currently
watching straight into the history. With "skip seen" on, arriving at an id that
is already in the history advances again immediately instead of playing it, at
most 25 in a row, so a feed of nothing but repeats stops rather than scrolling
forever.

Skipping only ever happens going forwards: scrolling back up to a Short is a
deliberate request for it, seen or not. Direction comes from a trail of the
Shorts visited in the tab, which is exact for anything already on it - including
YouTube's own up chevron, which fires no scroll event - and from the last wheel
or arrow-key gesture for a Short the trail has never held. Only trusted events
count there, since advancing dispatches an `ArrowDown` of its own that would
otherwise read as the user scrolling down.

The chosen playback speed is re-applied on every `play` and `loadeddata`,
because YouTube resets the rate per video.

## Translations

The UI ships in English, German, and Spanish. Chrome picks the catalog from
`public/_locales/<locale>/messages.json` based on the browser's language and
falls back to `en`, the `default_locale`, for anything missing.

The **Language** dropdown overrides that choice for the popup. Because
`chrome.i18n.getMessage` is fixed to the browser's UI locale and cannot be
pointed at another one, `src/i18n.ts` reads the catalog out of `_locales`
itself when a language is picked, falling back to the English catalog for a
missing key and to `chrome.i18n` if a catalog will not load. On "Browser
language" it does nothing and Chrome stays in charge. The extension's name and
description in `chrome://extensions` come from the manifest, so they follow the
browser and not this dropdown.

Strings reach the UI two ways. The manifest uses `__MSG_extName__` style
placeholders, which Chrome substitutes as it loads the extension. The popup
carries its English text in `popup.html` as a fallback and marks each element
with `data-i18n="<key>"` (or `data-i18n-aria` for a screen-reader label);
`translate()` in `src/popup.ts` swaps in the localized string on open and sets
`<html lang>` from `chrome.i18n.getUILanguage()`. Text that changes at runtime
- the on/off status line and the singular/plural play-count unit - is looked up
by key in `render()` instead.

To add a locale, copy `public/_locales/en/messages.json` into a new folder named
for the locale code, translate every `message` value, and leave the keys and the
`description` notes alone. Add the code to `LANGUAGES` in `src/i18n.ts` and an
`<option>` to the language dropdown in `public/popup/popup.html`, labelled in
its own language. Then:

```bash
npm run check:locales
```

That compares every catalog against `en` and fails on a missing, empty, or
unknown key, on a `__MSG_` placeholder the manifest uses but `en` does not
define, and on a `$PLACEHOLDER$` dropped in translation. Chrome silently falls
back to English in all of those cases, so nothing else would tell you a
translation went stale. The release workflow runs it on every push.

Two things worth knowing when translating:

- Chrome has no plural rules, so each form is its own key
  (`playCountUnitOne` / `playCountUnitOther`). German uses "Mal" for both,
  Spanish "vez" and "veces".
- The popup is 300px wide and labels wrap, but a long compound word can still
  overflow - prefer "Wiedergabetempo" over "Wiedergabegeschwindigkeit".

## Releases

Pushing to `main` runs `.github/workflows/release.yml`, which typechecks and
then hands over to semantic-release. The version comes from the commit
messages since the last tag, following the conventional-commit types this repo
already uses: `feat` gives a minor bump, `fix` and `perf` a patch, and a
`BREAKING CHANGE:` footer a major. A push with only `chore`, `ci`, or `test`
commits releases nothing.

Each release then gets:

- a `CHANGELOG.md` entry, grouped into Features, Bug Fixes, Performance,
  Reverts, and Refactoring
- a GitHub release and a `v<version>` tag with the same notes
- `yt-shorts-autoscroll-<version>.zip` attached to it - the contents of
  `dist/`, ready to load unpacked or upload to the Web Store
- a `chore: release <version>` commit carrying the bumped `package.json`,
  `public/manifest.json`, and the changelog

`scripts/prepare-release.mjs` stamps the version into `public/manifest.json`
and builds the zip. It rewrites only the version line, so a release commit
shows a one-line manifest diff, and it drops any prerelease suffix on the way
in - Chrome accepts one to four dot-separated integers and nothing else, so
`1.2.0-beta.1` reaches the manifest as `1.2.0` while the zip keeps the full
version.

Nothing is published to npm; `package.json` is `private` and the npm plugin
only bumps the version field.

## Layout

Sources live at the repo root; `dist/` is the extension itself.

```
src/settings.ts      shared Settings type + storage helper
src/i18n.ts          popup message lookup with a language override
src/content.ts       finish detection and scrolling
src/popup.ts         popup logic
public/manifest.json MV3 manifest (paths relative to dist/)
public/popup/        popup markup and styles
public/icons/        extension icons
public/_locales/     en, de, es message catalogs
scripts/build.mjs    tsc + copy public/ -> dist/
scripts/check-locales.mjs
                     checks every locale against en
scripts/prepare-release.mjs
                     stamps the version, builds, zips dist/ for a release
.releaserc.json      semantic-release plugins
.github/workflows/release.yml
                     runs semantic-release on every push to main
```

```
dist/                <- load this in Chrome
  manifest.json
  settings.js  content.js  popup.js
  popup/popup.html  popup/popup.css
  icons/icon16.png  icon48.png  icon128.png
```

The TypeScript is compiled with `"module": "none"`, so each file is a classic
script and `settings.js` is listed before the other two - no bundler needed.
