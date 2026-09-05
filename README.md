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

Each Short reached is recorded by the video id in its URL. With "skip seen" on,
landing on an id that is already in the history advances again immediately
instead of playing it - at most 25 in a row, so a feed of nothing but repeats
stops rather than scrolling forever. The chosen playback speed is re-applied on
every `play` and `loadeddata`, because YouTube resets the rate per video.

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
src/content.ts       finish detection and scrolling
src/popup.ts         popup logic
public/manifest.json MV3 manifest (paths relative to dist/)
public/popup/        popup markup and styles
public/icons/        extension icons
scripts/build.mjs    tsc + copy public/ -> dist/
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
