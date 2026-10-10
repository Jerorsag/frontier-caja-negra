# ADR-0002: In-memory state, one store per token

- **Status**: Accepted
- **Date**: 2026-10-10

## Context
The original keeps separate state per token: accounts, balances, operations, lock counters and sequential ids (FR6). `POST /__reset` returns a token to its initial state, and the evaluator calls it before every test (FR1). Each step has 5 seconds (NFR2). The evaluator sends one step at a time and talks to one process.

## Options considered
1. **In-memory maps, one `Store` per token, on Node's single event loop**: no I/O, reset is replacing the store with a new instance. State is lost on restart and cannot be shared between instances.
2. **PostgreSQL**: durable and shareable between instances. Adds latency, a second failure mode and transactions, with no benefit when every test starts from a reset.
3. **In-memory state guarded by mutexes or transactions**: protects against interleaving. Unnecessary while every handler is synchronous.

## Decision
We chose **in-memory state with one store per token and no locks**. `server.ts` keeps a session per token (`Store` plus the `X-Req` counter); `__reset` replaces the store and leaves the counter (experiments 21, 41). Each request is handled synchronously after the body is read, so it runs to completion without interleaving.

## Consequences
- **Positive**: no database to deploy or fail; reset is trivial and exact; ids restart from `AC-0001` / `OP-0001` (experiment 71).
- **Negative / tradeoffs accepted**: state is lost on restart; the service must run as a single instance; handlers must stay free of `await`, or the no-lock argument stops holding.
- **Follow-ups**: if a handler ever needs I/O, revisit concurrency before merging it.
