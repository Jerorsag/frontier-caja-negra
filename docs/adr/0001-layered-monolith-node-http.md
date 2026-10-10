# ADR-0001: Layered monolith on plain node:http

- **Status**: Accepted
- **Date**: 2026-10-10

## Context
The replacement must answer every request exactly like the original: same status and same body, including unknown routes and malformed bodies (FR2, NFR1). The domain is small (six commands, two entities). The evaluator talks to one process, and state is shared in memory. One engineer, one day.

## Options considered
1. **Layered monolith on plain `node:http` + TypeScript**: full control of every response byte; no dependencies. Routing and body parsing are written by hand.
2. **NestJS or Express, as a modular monolith**: structure and tooling out of the box. Frameworks answer unknown routes and bad JSON with their own bodies, which would have to be overridden one by one; per-domain modules add structure for a single domain.
3. **Microservices**: independent scaling and deployment. Adds network hops and failure modes, and breaks the single-process, shared-state requirement.

## Decision
We chose **a single-process layered monolith on plain `node:http`** because exact responses are the scoring rule and a framework's default bodies are a liability. Layers: transport (`server.ts`), application and domain (`protocol.ts`, `control.ts`), state (`store.ts`), cross-cutting (`errors.ts`, `config.ts`). Dependencies point only downward: `server → protocol → store / control / errors / config`.

## Consequences
- **Positive**: every status and body is ours; the protocol is a pure function of (body, store) and can be tested without HTTP; no runtime dependencies.
- **Negative / tradeoffs accepted**: routing and body parsing by hand; no independent scaling or deployment of parts.
- **Follow-ups**: none.
