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
- VERIFIED[youtube.com/shorts 2026-10-12] pausing the next Short before it reaches "playing" parks YouTube's player paused off-screen; never pause mid-load BC Playwright probe with dist/ loaded
- UNKNOWN[make e2e@macOS] cause of one run failing 'left within its first 3 seconds' + 'opening a seen Short' checks on timing BC 8 following runs passed; settle by capturing a failing run's tick log
