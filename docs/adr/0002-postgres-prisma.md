# ADR-0002: PostgreSQL with Prisma

- **Status**: Accepted
- **Date**: 2026-10-07

## Context
Relational data, need for transactions and integrity constraints, typed access from TypeScript.

## Options considered
1. **PostgreSQL + Prisma**: ACID, constraints, typed client, versioned migrations. Less control over complex SQL.
2. **PostgreSQL + raw SQL or a query builder**: full control; more code and no generated types.
3. **In-memory store**: fastest to build; no persistence, and concurrency must be hand-rolled.

## Decision
PostgreSQL 16 with Prisma 6. Raw SQL through `$queryRaw` only where Prisma cannot express it (e.g. `SELECT … FOR UPDATE`).

## Consequences
- **Positive**: integrity enforced by the database, safe migrations, typed queries.
- **Negative / tradeoffs accepted**: Docker is required to run locally; the ORM abstracts away locking details.
- **Follow-ups**: none.
