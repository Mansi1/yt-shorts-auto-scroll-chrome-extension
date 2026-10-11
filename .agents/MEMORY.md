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
- VERIFIED[gate review|docs attestation] Claude Code auto mode denies the agent writing tmp/vae/*/review.json on its own BC denial 2026-10-11; ask the human to approve first
- UNKNOWN[e2e/run.mjs@ubuntu CI] whether headless Chromium on ubuntu-latest plays the silent WAV fixture BC e2e only observed passing on macOS
