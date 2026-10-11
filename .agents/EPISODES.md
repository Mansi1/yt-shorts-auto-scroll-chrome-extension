# Episodes

<!-- Newest last. The gate appends FAIL|DONE|FINDING; past 100 entries it trims only its own oldest DONE|FAIL|learned
FINDING (git keeps them). Leads (LESSON, FINDING learn=none) stay until wrap settles them; doctor fails above 30.
Agents append `<UTC ISO> s=<session> LESSON <VAE-DIALECT>` only for a falsified HYPOTHESIS, a dead end, or a root cause.
Session start injects the 3 newest open entries: LESSON, FINDING learn=none, FAIL without a later DONE.
Wrap: EVERY lead → test | .agents/VERIFY.py rule | one MEMORY line with BC, then delete; OR delete BC evidence. -->

2026-10-11T21:51:49Z s=f5bca3dc FAIL docs.pages,layout,gitignore,tests.exist,lint=?,tests.unit=?,tests.e2e=?,coverage=?
2026-10-11T21:56:40Z s=f5bca3dc FAIL docs.pages,package
2026-10-11T21:57:20Z s=f5bca3dc FAIL package
2026-10-11T22:02:42Z s=f5bca3dc DONE fp=cfd362604dc3 cov=100.0% paths=.github/workflows/verify.yml,.oxlintrc.json,AGENTS.md,ARCH.md(+9)
2026-10-11T23:01:29Z s=d4c272bc DONE fp=eb2b0cd6e783 cov=100.0% paths=README.md,e2e/run.mjs,src/content.ts
2026-10-11T23:01:29Z s=d4c272bc FINDING e2e/run.mjs pause probe learn=test: e2e check 'a seen Short is paused, skipped, and the next one plays' covers it
2026-10-11T23:17:47Z s=d4c272bc DONE fp=ffc5f14ec260 cov=100.0% paths=README.md,e2e/run.mjs,public/manifest.json,src/content.ts
2026-10-11T23:17:47Z s=d4c272bc FINDING e2e/run.mjs fixture learn=test: 'scrolling onto a seen Short skips it without it ever playing'
2026-10-11T23:17:47Z s=d4c272bc FINDING public/manifest.json run_at learn=test: 'opening a seen Short skips it without it ever playing'
