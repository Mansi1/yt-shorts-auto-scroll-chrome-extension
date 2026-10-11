# CLI gist

<!-- Commands future agents need that the Makefile verbs do not cover (setup, env, data, deploy):
- VERIFIED[purpose] `cmd`: only after an observed success
- UNKNOWN[purpose] BC gap
Budget 2 KiB (`vae.py doctor --repo .`); entries are injected at session start. -->
- VERIFIED[unit tests] `node --test 'test/*.test.mjs'` BC passes; `node --test test/` treats the dir as one file and fails
- VERIFIED[e2e probe] break the rule in dist/ only (e.g. sed on dist/watch-progress.js) then `node e2e/run.mjs` BC fails the 3 s check; `npm run build` restores dist/
- VERIFIED[e2e probe] tsc splits `if (x) stmt` over two lines in dist/*.js, so probe with `perl -0pi -e 's/if \(x\)\s*stmt/.../' dist/content.js` BC one-line sed matched nothing 2026-10-12
