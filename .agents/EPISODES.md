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
