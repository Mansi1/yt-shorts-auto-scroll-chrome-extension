---
name: update-readme-features
description: This skill should be used when the user asks to "update the README", "document this feature", "add the new feature to the README", "sync the README", or after implementing a user-facing feature (a new popup option, setting, or behaviour) that README.md does not describe yet.
---

# Updating README.md with implemented features

`README.md` is the only documentation in this repo, so it has to match what the
code actually does. Update it in the same change as the feature - never leave it
for later.

## When to update

Update the README whenever a change is visible to someone using or building the
extension:

- a new or renamed setting in the popup
- a changed default, range, or unit for an existing setting
- new runtime behaviour (how a Short is detected, advanced, skipped, ...)
- a new source file, or a file that moved
- a change to the build, install, or load steps
- a new storage area or permission in `public/manifest.json`

Internal refactors that change none of the above need no README change.

## What to check before writing

Read the code, not the commit message - describe shipped behaviour:

- `src/settings.ts` - the `Settings` interface and `DEFAULT_SETTINGS` are the
  source of truth for the Options table (name, default, unit, range)
- `public/popup/popup.html` - the label the user actually sees, and the min/max
  on each control
- `src/content.ts` - the behaviour and the tuning constants at the top of the
  IIFE (`NEAR_END`, `COOLDOWN_MS`, `POLL_MS`, `MAX_SKIPS`, ...)
- `public/manifest.json` - permissions and matched hosts

Any number quoted in the README (a default, a cap, a poll interval) must appear
verbatim in the code. If you change the constant, change the prose.

## Which section to touch

| Change | Section |
| --- | --- |
| New or changed popup setting | **Options** table, one row per setting |
| Where a setting is stored | the paragraph under the Options table |
| New or changed runtime behaviour | **How it works** |
| New/moved source file | **Layout** tree |
| New build or install step | **Build & install** |

Add a row to the existing Options table rather than starting a new list, and
keep the table's column order: Setting, Default, What it does.

## House style

Match the surrounding prose - it is the review standard for this file:

- second person, present tense, plain sentences ("Jump straight past a Short
  that has played before")
- explain *why*, not only *what*, when the reason is not obvious - the existing
  text does this for the sync/local storage split and the loop detection
- wrap at ~80 columns
- plain ASCII: `-` for dashes, no em dashes or smart quotes
- code identifiers, filenames, and API names in backticks
- describe defaults as the user sees them ("1x", "0 ms", "off"), not as raw
  literals

## Finish

After editing, re-read the changed sections against the code once more, then run
`npm run typecheck` and `npm run build` if the same change touched `src/` - a
README describing a build that does not compile is worse than no README.
