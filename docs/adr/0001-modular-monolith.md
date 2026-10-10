# ADR-0001: NestJS modular monolith

- **Status**: Accepted
- **Date**: 2026-10-07

## Context
One-day challenge, one or two developers, hidden tests on an HTTP contract. We need clear structure, testability and speed.

## Options considered
1. **NestJS modular monolith**: DI, one module per domain, first-class testing. More boilerplate.
2. **Plain Express**: minimal and fast to start; structure and validation are manual.
3. **Microservices**: independent scaling; distributed complexity with no benefit at this scale.

## Decision
NestJS modular monolith: one module per domain, a global validation pipe and a global error filter.

## Consequences
- **Positive**: consistent structure, easy unit and e2e tests, uniform errors.
- **Negative / tradeoffs accepted**: more files per feature; decorators add some indirection.
- **Follow-ups**: modules can be extracted into services later if a domain needs independent scaling.
