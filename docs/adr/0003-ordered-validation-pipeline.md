# ADR-0003: Validation as one ordered pipeline

- **Status**: Accepted
- **Date**: 2026-10-10

## Context
When a message has two faults, the original reports only the first one in its own order (FR4). That order is part of the contract: a hidden test with two faults fails if we check them the other way round. The order was discovered pair by pair (for example checksum before command in experiment 6, amount before same-account in 88, lock before limit in 104) and may need to change when a new experiment disagrees.

## Options considered
1. **One ordered pipeline; the first failing check answers**: the order is readable top to bottom and a pair can be swapped by moving a line. Needs more structure up front.
2. **Nested if/else inside each command**: quick to write. The order ends up scattered across commands and is hard to compare with the experiments.

## Decision
We chose **a single ordered pipeline** in `protocol.ts`: JSON and `m` → segments → `PING` short-circuit → checksum format and value → command → arity → amount → same account → existence → lock → limit → balance → effect. Effects run only after every check has passed.

## Consequences
- **Positive**: the code reads in the same order as the error table in [api.md](../api.md); each adjacent pair maps to an experiment; failed requests cannot leave partial state.
- **Negative / tradeoffs accepted**: more structure up front than per-command branches; the amount, account and lock checks still live inside each command function, so their order must be kept consistent by review.
- **Follow-ups**: none; one test per pair of checks is in `service/src/protocol.test.ts` (see [testing.md](../testing.md)).
