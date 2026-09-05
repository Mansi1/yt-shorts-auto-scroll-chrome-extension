---
name: committing-changes-and-managing-branches
description: This skill should be used when the user asks to "commit changes", "make a commit", "create a commit", "write a commit message", "create a branch", "name a branch", or needs to follow commit message conventions or branch naming conventions.
---

# Commit messages

Follows conventional commits. Each commit message must have the following format:

```
<TYPE>: <SUBJECT>

<BODY>

<CO-AUTHORS>
```

## Commit TYPEs

- `fix` for commits that fix bugs that are already live on the `main` branch
- `feat` for new features
- `prep` for preparational commits (commits that introduce new code, which is not used yet, but will be used in later commits)
- `refactor`
- `chore`
- `perf`
- `ci`
- `infra`
- `test`

Important: The `fix` type is reserved for severe bugs that are already live on the `main` branch.
If you are fixing an issue from a previous commit on the same feature branch, use `refactor` instead,
or ideally fixup (squash) the new commit into the previous one.

## Commit SUBJECT

Max 72 chars, must be meaningful (not "fix PR remarks")

## Commit BODY

Optional, line-wrapped at 72 chars, 1 blank line after SUBJECT

## CO-AUTHORS

List of co-authors. If the changes were made by AI (e.g. Claude Code or Devin), always add that in the co-authors.

# Fixup/squash policy

When adding commits that adjust changes from previous commits on the same branch, fixup/squash them into
the previous commits when there is a clear opportunity (e.g., a follow-up commit that only fixes a mistake
from an earlier commit). If in doubt whether to squash, ask the user.

# Force-push policy

Force-push (with lease) is allowed on feature branches during development (e.g. after fixup/squash).
Force-pushes are forbidden on `main`.
