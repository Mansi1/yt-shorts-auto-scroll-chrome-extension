# Agent memory

<!-- One tagged line per durable fact NOT derivable from code, git or docs:
- VERIFIED[scope] fact BC evidence
- HYPOTHESIS[scope] claim BC observation; falsifier=`cmd`
- UNKNOWN[scope] gap BC missing evidence
[scope] = the narrowest path|module|command|condition the evidence covers, not a topic: the entry decides nothing
outside it, and recurrence inside one subsystem never widens it.
Every line carries its BC and stays ≤240 chars. Replace stale lines instead of appending.
Mechanizable lessons belong in tests or .agents/VERIFY.py.
Budget 4 KiB (`vae.py doctor --repo .`); entries are injected at session start. -->
- UNKNOWN[gate review|docs attestation@auto mode] whether the agent may write tmp/vae/*/review.json BC denied 2026-10-11, Write succeeded 2026-10-12; settle by noting the mode at the next denial
- UNKNOWN[e2e/run.mjs@ubuntu CI] whether headless Chromium on ubuntu-latest plays the silent WAV fixture BC e2e only observed passing on macOS
- UNKNOWN[src/content.ts onPlay@youtube.com] whether YouTube fires "play" on the next Short before the URL names it BC e2e fixture always pushStates first; falsifier: log location.pathname on play in a real feed
