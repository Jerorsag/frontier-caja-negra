# Requirements matrix

FR1–FR7 and NFR1–NFR6 as published in the system design ([site/docs/index.html](../site/docs/index.html), section 02). Evidence numbers are `id` values in [experimentos.jsonl](../experimentos.jsonl) (readable view: [EXPERIMENTOS.md](EXPERIMENTOS.md)).

How to read **Status**:

- **Implemented**: the behavior is in `service/src`, the unit tests pass (`npm --prefix service test`) and the replay passes on every current-version sequence. Sequence s03 is skipped as superseded: it contains #64, recorded before the original changed its transfer limit.
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
| FR7 | Deliver the specification and `experimentos.jsonl` in the required format. | Brief (README-Reto2.md) | Manual review against the brief | Log delivered (145 lines); specification planned |

## Non-functional requirements

| ID | Requirement | Evidence (experiment ids) | Verified by (test or replay) | Status |
|---|---|---|---|---|
| NFR1 | Exactness: same status and same body (JSON key order free, strings and numbers identical) on 100% of replayed current-version sequences. | All 145 | `node tools/diff.mjs --examples` | Implemented: s01, s02, s04–s06 and the 20 examples pass locally; s03 skipped (superseded) |
| NFR2 | Latency: p95 < 50 ms per request on the deployed instance; hard budget 5 s per step. | — | 60 s burst at 10 req/s against the deployed URL | Planned; local baseline < 5 ms (from the design) |
| NFR3 | Availability: reachable from 20:00 until the end of demo day; health check green. | 16 | `GET /health` on the public URL | Assumed (deployment not verifiable from this repo) |
| NFR4 | Determinism: same input sequence gives the same outputs on every run. | 2 | Repeated replay; no randomness, clock or LLM in `service/src` | Implemented |
| NFR5 | Isolation: zero calls to the original or other replacements. | — | Code review: `service/src` imports only `node:http` and local modules | Implemented |
| NFR6 | Changeability: a detected behavior change is fixed, verified and redeployed in < 15 min. | 64 vs 125 | Limits are environment variables in `service/src/config.ts`; drift replay against the original | Implemented in code; the 15 min target is not measured |

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
| Does a deposit unlock an account that is already locked? | Yes: a successful deposit resets the rejection count (175–179) and lifts the lock (278–281) | confirmed (272–281) |
| Are E303, E304 and E401 evaluated before E510 on a locked source? | Yes, by the order of the code: E304 (418), E401 (419) and E303 (420) answer before E510 (421) | confirmed (412–421, s13) |
| Does an incoming transfer lift the lock on its destination? | No: the locked account accepts the transfer (422), and its next transfer out is still E510 (423) | confirmed (422–423, s13) |
