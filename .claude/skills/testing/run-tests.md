---
description: Run the full GovernedAI test suite (lint, unit, e2e) and report results
model: sonnet
---

# /run-tests

Runs the same checks CI runs on every push (`.github/workflows/ci.yml`) against
this local machine, and reports a clear pass/fail summary. Use this before
pushing a batch of changes, or any time you want confidence the app still
works end to end without waiting on CI.

## Usage

```
/run-tests [--unit-only | --e2e-only]
```

No arguments runs everything (lint → unit → build → e2e), matching CI order.

## What this does

1. Check local Postgres is up: `docker exec governedai-postgres pg_isready -U governedai`.
   If it's not running, start it (`docker start governedai-postgres`) before
   continuing — the build step and e2e tests both need a real database.
2. `pnpm run lint`
3. `pnpm run test` (Vitest — permissions matrix, workflow logic, audit export
   formatting; no database needed)
4. `pnpm run build` (this also runs `prisma migrate deploy` against the local
   database — same script Vercel runs in production)
5. `pnpm run test:e2e` (Playwright — currently unauthenticated-only coverage:
   redirects, page rendering, unprovisioned-email handling. See the comment
   in `tests/e2e/auth-gate.spec.ts` for why a real signed-in flow isn't
   covered yet.)
6. `rm -rf .next test-results` — clean up build/test artifacts afterward so
   they don't clutter `git status`.

## Reporting results

- If everything passes: say so in one line, don't narrate each step.
- If something fails: identify which step, quote the actual error (file/line
  if it's a lint or type error), and investigate the root cause before
  proposing a fix — don't just re-run hoping it passes.
- If a test's assertion looks wrong rather than the code under test (this has
  happened before in this repo — see the audit-export.test.ts CSV-escaping
  fix), say so explicitly rather than "fixing" the code to match a bad test.

## When you touch app code and no test covers it

If you're finishing a change to `src/lib/*.ts` (pure logic) or an
authorization check in `src/app/systems/actions.ts` and there's no test for
it, flag that gap out loud — don't silently skip it, and don't block the
current task on writing one unless asked. New pure-logic functions are cheap
to cover in Vitest; new authenticated flows currently can't be covered by
Playwright without a test-only auth bypass (a known, not-yet-built gap).
