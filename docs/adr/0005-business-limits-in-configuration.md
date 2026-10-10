# ADR-0005: Business limits in configuration

- **Status**: Accepted
- **Date**: 2026-10-10

## Context
The original can change during the day, and the replacement is judged against the version live at 20:00. It already changed once: a 100,001 transfer was accepted at 10:36 (experiment 64) and rejected with E506 under identical conditions later (experiment 125). A detected change must be fixed, verified and redeployed in under 15 minutes (NFR6).

## Options considered
1. **Limits read from environment variables, with the observed values as defaults**: a limit change is an environment edit and a restart, with no code change or build. One more place to check during review.
2. **Constants in code**: everything in one place. Every change needs an edit, a build and a deploy.

## Decision
We chose **environment variables with defaults** in `service/src/config.ts`:

| Variable | Default | Meaning | Evidence |
|---|---|---|---|
| `TRANSFER_LIMIT` | 100000 | E506 when the amount is greater (the limit is inclusive) | 74–75, 125–126 |
| `LOCK_AFTER_LIMIT_FAILURES` | 3 | Consecutive E506 before the source is locked (E510) | 99–102, 131–134 |
| `MAX_AMOUNT_DIGITS` | 10 | 9999999999 is valid, 10000000000 is E303 | 142–143 |

`PORT` and `TEAM_TOKEN` are read from the environment as well.

## Consequences
- **Positive**: the kind of change already seen once is handled without touching code.
- **Negative / tradeoffs accepted**: the running behavior depends on the deployment's environment, so a review must check both code and variables; a non-numeric value becomes `NaN` and is not validated at startup.
- **Follow-ups**: rules that are not numeric limits (for example the order of checks) still need a code change.
