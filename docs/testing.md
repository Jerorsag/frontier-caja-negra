# Testing strategy

The replacement is scored by exact comparison with the original, so the main test is a replay of what the original actually answered. Decision: [ADR-0004](adr/0004-experiment-log-as-regression-suite.md).

| Level | What it proves | How | State |
|---|---|---|---|
| Replay of the log | Same status and body as the original on every logged sequence | `node tools/diff.mjs` | In place: every current-version sequence passes; s03 is skipped as superseded |
| Public examples | The 20 examples of `pruebas/ejemplos.jsonl` pass in order after a reset | `node tools/diff.mjs --examples` | In place |
| Unit tests | Checksum, amount parser, limit, lock counter, reversals, ids | `npm --prefix service test` | In place: 79 tests |
| Error-order tests | One test per pair of checks, with both faults in one message | `npm --prefix service test` | In place |
| Drift check | The original still answers as logged | New logged probe of an existing experiment | Manual |
| CI | Build and replay on every push | Workflow not adapted yet | Planned |

## Replay of the log

`tools/probe.mjs` writes two files for every request sent to the original:

- `experimentos.jsonl`: the official log (hypothesis, request, status, response, conclusion).
- `experiments/steps.jsonl`: the exact step (path, method, auth, raw body) and the raw response text, used for replay.

`tools/diff.mjs` reads `experiments/steps.jsonl`, and for each sequence sends `POST /__reset` to the target and then every step in order. A step fails when the status differs or the body differs under the official rules (`sameBody` in `tools/lib.mjs`: JSON compared with free key order, anything else as exact text). This is the same shape as the hidden set: reset, then a sequence.

```bash
node tools/diff.mjs                          # target = REPLACEMENT_URL, default http://localhost:3000
node tools/diff.mjs s06                      # one sequence
node tools/diff.mjs --examples               # also replay pruebas/ejemplos.jsonl
node tools/diff.mjs --target https://<app>   # the deployed replacement
```

The token sent to the target is `REPLACEMENT_TOKEN` from `.env.tools` (it falls back to `TOKEN`); the replacement must be started with the same value in `TEAM_TOKEN`. `npm run start:local` in `service/` builds and starts the replacement with the variables of `.env.tools`. The exit code is 1 when any sequence fails.

### Superseded sequences

Experiment 64 was recorded at 10:36, before the original changed its transfer limit, so sequence s03 no longer describes the current version. `experiments/superseded.json` maps a sequence to the reason it is superseded:

```json
{ "s03": "recorded 10:36, before the transfer-limit change detected at 10:44 (#64 vs #125); kept as evidence, not as a test" }
```

`tools/diff.mjs` reports those sequences as `SKIP` with the reason, and does not count them as failures. The lines stay in `experimentos.jsonl` as evidence of the change. Skipping is per sequence, so the other 28 steps of s03 are not replayed either; the rules they cover are replayed by s04–s06 and by the unit tests.

## Unit tests

`npm --prefix service test` compiles with `tsc` and runs `node --test` on the compiled files. It uses `node:test` and `node:assert`: no dependencies. Expected values are the original's answers; each test name cites the experiment that shows it.

**`service/src/control.test.ts`** (checksum):

- Matches every message of `pruebas/ejemplos.jsonl` that passed the checksum (17 messages).
- Is case-insensitive.
- Rejects `ALTA;Lucia;83`: the control is 82.
- Ignores characters outside A–Z and 0–9: `ALTA;Lucía` → 14.

**`service/src/protocol.test.ts`** calls `handleMessage(rawBody, store)` directly, with no HTTP server:

- Amounts: 0, -5, +5, 0100, 1.5, abc and 10000000000 are E303 and leave the balance unchanged; 9999999999 is accepted.
- Limit: inclusive at 100,000.
- Lock: three consecutive rejected transfers (E506 or E507) lock the source; a successful transfer resets the count; a locked account still receives deposits and transfers.
- `ANULA`: idempotent, reverses transfers on both accounts, can leave a negative balance.
- Ids: failed operations consume none, and `ANULA` creates none.
- `PING` skips the checksum but not the arity.
- Deposit: a successful deposit resets the rejection count (#175–179) and lifts an existing lock (#272–281).
- `NOTAS` and `HALT`: the note and the E520 guard are compared with the logged responses (#255, #259); wrong arity is E302; resending `HALT` does not confirm it.
- E301 `sugerencia`: `ALTO` → `ALTA`, `HELP` → `HALT`, and none at distance 3 or more (#252, #201, #182).

## Error-order tests

Also in `service/src/protocol.test.ts`: one test per pair of checks, each request carrying both faults.

| Pair | Message with both faults | Evidence |
|---|---|---|
| E103 before E104 | empty `m` | 9 |
| E104 before the control | `FOO;` | 24 |
| E201 before E301 | `FOO;abc` | 23 |
| E202 before E301 | `FOO;64` | 6 |
| E202 before E302 | `ALTA;Lucia;Gomez;12` | 43 |
| Control as text | `ALTA;Mateo;03` vs `ALTA;Mateo;3` | 45 |
| E302 before E303 | wrong arity, bad amount | 154 |
| E302 before E401 | wrong arity, unknown account | 155 |
| E302 before E304 | wrong arity, same account | 173 |
| E303 before E304 | bad amount, same account | 88 |
| E303 before E401 | bad amount, unknown account | 86 |
| E304 before E401 | same account that does not exist | 87 |
| E303, E304, E401 before E510 | each fault on a locked source | 139, 137, 138 |
| E510 before E506 and E507 | locked source, over the limit and over the balance | 104, 105 |
| E506 before E507 | over the limit with balance 0 | 108 |

E100 and E102 are tested on their own: a body cannot be both. 

## Non-functional checks (planned)

- Latency: 60 s burst at 10 req/s against the deployed URL; target p95 < 50 ms.
- Restart, then health check.
- Requests without a token and with a wrong token on every route.
- A 1 MB body.

## CI

`.github/workflows/ci.yml` is still the workflow of the NestJS template: it builds `backend/` and `frontend/`, which no longer exist, and it triggers on pushes to `main` while this repo uses `master`. It does not test this project. The intended pipeline is: `npm --prefix service ci`, `npm --prefix service run build`, start the service with a test token, then `node tools/diff.mjs --examples`.

## Drift checks against the original

The original can change during the day, so logged answers can go stale.

**Rule: every request to the original must be logged.** The only tool allowed to call the original is `tools/probe.mjs`. Never point `tools/diff.mjs` at the original: its requests would not be written to `experimentos.jsonl`.

To check for drift:

1. Copy an existing experiment file in `experiments/` and give it a new `seq` (the probe refuses a `seq` that is already in the log).
2. Run `node tools/probe.mjs experiments/<file>.json`. Every request is appended to the log.
3. Compare the new lines with the old ones. A difference is a behavior change: record it in the specification (section "Cambios durante el día"), change one rule or one configuration value, replay everything, redeploy.

This is how the only change so far was confirmed: #64 was re-probed under identical conditions as #125.

Each drift check costs probe budget (8,000 requests per day per token, 10 per second). The log has 145 lines.

## Acceptance criteria

- All 20 public examples pass in order after a reset.
- `npm --prefix service test` passes.
- All current-version logged sequences pass, locally and deployed.
- The replacement makes zero outbound requests (verified in code review).
- Health is green at the public URL from 20:00.
- Every specification row cites at least one log id, with its confidence.
