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
| FR5 | Implement the six commands (`PING`, `ALTA`, `CONSULTA`, `DEPOSITO`, `TRANSFER`, `ANULA`) with their effects and exact responses. | Public examples 1–20; s03–s06 (42–145) | Replay of s03–s06 and `--examples` | Implemented |
| FR6 | Keep memory between requests: accounts, balances, operations, lock counters, sequential ids. | 46–47, 59, 102, 134 | Replay of s03–s06 | Implemented |
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

## Open questions (not probed yet)

From section 08 of the design. Each one is a default in the replacement until an experiment says otherwise.

| Question | Current default in `service/src` | Confidence |
|---|---|---|
| Does an E507 between two E506 reset the lock counter? | No: E507 leaves the counter unchanged | assumed |
| Does a lock expire with time or with another command? | No: only `POST /__reset` clears it | assumed |
| Are query strings ignored when matching routes? | Yes: the path is cut at `?` | assumed |
| Body size limit, duplicate JSON keys, non-UTF-8 bytes | No size limit; `JSON.parse` semantics | assumed |
| `HEAD` and `OPTIONS` on known routes | 404 E404, like any other unknown method | assumed |
| What happens after `AC-9999` or `OP-9999`? | The number keeps growing (`AC-10000`) | assumed |
