# Requirements matrix

FR1–FR7 and NFR1–NFR6 as published in the system design ([site/docs/index.html](../site/docs/index.html), section 02). Evidence numbers are `id` values in [experimentos.jsonl](../experimentos.jsonl) (readable view: [EXPERIMENTOS.md](EXPERIMENTOS.md)).

How to read **Status**:

- **Implemented**: the behavior is in `service/src`, the unit tests pass (`npm --prefix service test`) and the replay passes on every current-version sequence. The original changed to v2 during the incident FR-0153 (10/10, 15:30 local). The replacement implements v2. Sequences s03–s08, s12 and s13 were recorded under v1 and are superseded (`experiments/superseded.json`); s03 is superseded because it contains #64, recorded before the first transfer-limit change. The v2 behavior is verified by s14 (ids 815–834) and the post-incident drift runs.
- **Planned**: described in the design, not yet in the repo.
- **Assumed**: not verified by any source in this repo.

## Functional requirements

| ID | Requirement | Evidence (experiment ids) | Verified by (test or replay) | Status |
|---|---|---|---|---|
| FR1 | `GET /health` answers 200 when ready; `POST /__reset` restores the initial state of the caller's token. | 16, 40, 71 | Replay: `tools/diff.mjs` resets before each sequence and replays #16 and #40 | Implemented |
| FR2 | Any other route, method or body answers exactly like the original, unknown routes included. | 13–15, 18, 19, 35–38 | Replay of s01 and s02 | Implemented |
| FR3 | Requests without the team token, or with another token, answer like the original (401). | 11, 12, 17, 20, 39 | Replay of s01 and s02 | Implemented |
| FR4 | Validate message integrity (format, segments, checksum) in the original's order. | 4–10, 22–26, 43, 45 | Replay of s01–s02; error-order tests in `service/src/protocol.test.ts` | Implemented |
| FR5 | Implement the six commands (`PING`, `ALTA`, `CONSULTA`, `DEPOSITO`, `TRANSFER`, `ANULA`) with their effects and exact responses. Found later by probing and also implemented: two hidden commands, `NOTAS` and `HALT` (255–271), and the `sugerencia` field of E301 (180–253). | Public examples 1–20; s03–s06 (42–145) | Replay of s03–s06 and `--examples` | Implemented |
| FR6 | Keep memory between requests: accounts, balances, operations, lock counters, sequential ids. | 46–47, 59, 102, 134, 149–153 | Replay of s04–s07; lock tests in `service/src/protocol.test.ts` | Implemented |
| FR7 | Deliver the specification and `experimentos.jsonl` in the required format. | Brief (README-Reto2.md) | Manual review against the brief | Log delivered (845 lines, ids 1–845); specification written (`docs/especificacion.md`) |

## Non-functional requirements

| ID | Requirement | Evidence (experiment ids) | Verified by (test or replay) | Status |
|---|---|---|---|---|
| NFR1 | Exactness: same status and same body (JSON key order free, strings and numbers identical) on 100% of replayed current-version sequences. | All current-version (v2) sequences, including s14 (815–834) | `node tools/diff.mjs s14`; `node tools/diff.mjs --examples` | Implemented for v2: `s14` passes locally and on the deployed entrypoint (1 pass, 0 fail each). The public examples were recorded under v1 and do not pass: 5, 8, 10, 11 and 19 fail (saldo and limit), and 13, 14, 18 cascade (CAM-08). Decision pending on which version is judged |
| NFR2 | Latency: p95 < 50 ms per request on the deployed instance; hard budget 5 s per step. | — | 60 s burst at 10 req/s against the deployed URL | Planned; local baseline < 5 ms (from the design) |
| NFR3 | Availability: reachable from 20:00 until the end of demo day; health check green. | 16 | `GET /health` on the public URL | Assumed (deployment not verifiable from this repo) |
| NFR4 | Determinism: same input sequence gives the same outputs on every run. | 2 | Repeated replay; no randomness, clock or LLM in `service/src` | Implemented |
| NFR5 | Isolation: zero calls to the original or other replacements. | — | Code review: `service/src` imports only `node:http` and local modules | Implemented |
| NFR6 | Changeability: a detected behavior change is fixed, verified and redeployed in < 15 min. | 64 vs 125 (morning); 561–562, 815–834 (incident FR-0153) | Limits are environment variables in `service/src/config.ts` (`TRANSFER_LIMIT`, v2: 50000); `tools/drift.mjs` detects changes; `tools/diff.mjs s14` checks the fix locally and against the deployed entrypoint | Implemented in code; the 15 min target is not measured. Incident FR-0153: last v1 run 15:29 local; first changed run 16:05 local (s04-drift3) |

## Open questions

From section 08 of the design. Each one is a default in the replacement until an experiment says otherwise; the ones answered by sequence s07 are marked confirmed.

Also confirmed by s07: arity (E302) is evaluated before the amount (E303, experiment 154) and before a missing account (E401, experiment 155).

| Question | Current default in `service/src` | Confidence |
|---|---|---|
| Does an E507 between two E506 reset the lock counter? | No, and it counts: three consecutive rejected transfers (E506 or E507) lock the source | confirmed (149–153) |
| Does a lock expire with time or with another command? | No: only `POST /__reset` clears it | assumed |
| Are query strings ignored when matching routes? | Yes: the path is cut at `?` | confirmed (160–161) |
| Body size limit, duplicate JSON keys, non-UTF-8 bytes | No size limit; `JSON.parse` semantics | assumed |
| `HEAD` and `OPTIONS` on known routes | 404 E404, like any other unknown method | assumed |
| What happens after `AC-9999` or `OP-9999`? | The number keeps growing (`AC-10000`) | assumed |
| What does `HALT` do once confirmed, and how is it confirmed? | Unknown. A second argument is E302 and resending is E520 again (264–270). The replacement always answers E520 and never stops | assumed |
| Does `HALT` validate its argument? | No: any single argument answers E520. Only an existing account id was probed (259) | assumed |
| Which command does E301 suggest when two are equally near? | The first in the order `PING`, `ALTA`, `CONSULTA`, `DEPOSITO`, `TRANSFER`, `ANULA`, `NOTAS`, `HALT`. No tie was probed | assumed |
| Does a deposit unlock an account that is already locked? | Yes: a successful deposit resets the rejection count (175–179) and lifts the lock (278–281). Still true in v2 (602, 619, 661, 732, 749, 791, 812, 832) | confirmed (272–281 v1; v2 ids above) |
| Are E303, E304 and E401 evaluated before E510 on a locked source? | Yes, by the order of the code. E303 is confirmed in v1 (420) and v2 (572, 702). E304 (418) and E401 (419) were seen once each in v1 and were not re-probed in v2 | E303: confirmed (420, 572, 702). E304, E401: probable (418, 419) |
| Does an incoming transfer lift the lock on its destination? | No: the locked account accepts the transfer (422), and its next transfer out is still E510 (423) | confirmed (422–423, s13, v1) |
| What does a locked account answer in v2, and what does `intentos` count? | 423 with `"intentos":N`: N is the consecutive attempts against the locked account, from 1. The three E506 that lock it do not count | confirmed (561–562, 586–589, 612–618, 742–748, 811, 830–831) |
| Does `POST /__reset` reset `intentos`? | Yes | confirmed (719, 742) |
| Does `intentos` restart at 1 after a deposit unlocks the account and the account is locked again? | Assumed: no run locked the account again after an unlock | assumed (MEM-26) |
| What format does `CONSULTA` `saldo` have in v2? | A string with 2 decimals: the stored integer divided by 100 (`"0.00"`, `"860.40"`) | confirmed (563, 625, 684, 826, 834) |
| What is the transfer limit in v2? | 50000, inclusive: 50000 is accepted, 50001 and 100000 answer 422 E506 | confirmed (818, 559, 560, 690) |
