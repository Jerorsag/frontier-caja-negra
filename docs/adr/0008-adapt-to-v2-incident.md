# ADR-0008: Adapt the replacement to v2 during incident FR-0153

- **Status**: Accepted
- **Date**: 2026-10-10

## Context
Mid-event, the original released v2 and changed three behaviors without a version or notice (RIE-12 in `docs/especificacion.md`):

1. The locked-source answer changed from `409 E510` to `423 E510` with a per-account `"intentos":N` counter (CAM-05).
2. `CONSULTA` `saldo` changed from a number to a 2-decimal string (CAM-06).
3. The transfer limit changed from 100,000 to 50,000 inclusive (CAM-07).

The replacement is judged against the version live at 20:00 ([ADR-0005](0005-business-limits-in-configuration.md)), and a detected change must be fixed, verified and redeployed in under 15 minutes (NFR6). Detection came from the daily drift replay `tools/drift.mjs`, which first flagged a changed response in s04-drift3 (16:05 local, ids 555–562). The v2 behavior was then isolated and recorded from the original with experiment s14 (ids 815–834).

## Options considered
1. **Limit through configuration, the other two in code**: the limit is a value, so `TRANSFER_LIMIT` absorbs it with an environment edit and a restart (ADR-0005). The `intentos` counter and the string format are rules, so they need code. Keeps the principle "business limits in configuration, rules in code".
2. **Everything in code, including the limit**: one place to change, but a value change would need a build and a deploy, and it contradicts ADR-0005.

(These two options are the ones weighed when this ADR was written; the choice of option 1 is the one implemented in commit `7d464cf`.)

## Decision
We chose **option 1**: `TRANSFER_LIMIT` in `service/src/config.ts` is set to 50000 (inclusive), and the locked-account answer (423 with `intentos`, counting consecutive attempts against the locked account from 1; the three E506 that lock it do not count) and the `CONSULTA` saldo string (stored integer / 100, computed with integer arithmetic) are implemented in `service/src`. The fix is commit `7d464cf`. The error order is unchanged: E510 is still checked before E506 and E507, and E303 before E510 (ERR-45). Verification: replaying s14 with `tools/diff.mjs` gives 1 pass, 0 fail against the local build and against the deployed entrypoint on Railway. The public examples (`pruebas/ejemplos.jsonl`), recorded under v1, do not pass against v2 (CAM-08) and were not modified.

## Consequences
- **Positive**: the limit change needed no code change; the replacement answers the observed v2 contract for the three changes, backed by experiment ids.
- **Negative / tradeoffs accepted**: the v1 recordings (s04–s08, s12, s13) are superseded (`experiments/superseded.json`) and no longer serve as regression tests for the current version. Verification moved from full-log replay to s14 plus drift replays. Whether `intentos` restarts after a deposit that lifts the lock is **assumed** (MEM-26): no run locked the account again after an unlock. The public examples fail, and which version is judged is still an open decision.
- **Follow-ups**: decide which version is judged at 20:00 and, if v1, which fixes to revert; probe the unlock-and-relock case for `intentos` (MEM-26); re-probe E304 and E401 on a locked source in v2 (ERR-43, ERR-44 remain probable).
