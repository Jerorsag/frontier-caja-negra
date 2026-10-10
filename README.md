# <Project name>

> One-sentence summary of what this solves.

## Problem
<!-- 3–5 lines in your own words. Full statement: docs/SPEC.md -->

## North star
<!-- The measurable goal you optimized for. Same sentence as CLAUDE.md. -->

## Repository layout

```
backend/     NestJS API (src/, test/, prisma/, Dockerfile)
frontend/    React + Vite app
docs/        Spec, requirements, architecture, ADRs, API, testing
.claude/     AI agents and skills used to build this project
```

## Quick start

Requirements: Node 20+, Docker. All commands run from the repo root.

```bash
npm run setup            # installs both apps, creates backend/.env, starts the DB, runs migrations
npm run dev:api          # API → http://localhost:3000/health
npm run dev:web          # UI  → http://localhost:5173 (in another terminal)
```

Checks:

```bash
npm run check            # backend: format, lint, types, unit · frontend: lint, build
npm run test:e2e         # HTTP tests against the real database
```

## Architecture

```
Frontend (React) → /api proxy → Controller (DTO validation) → Service (business rules) → Prisma → PostgreSQL
                                     ↓
                         Global exception filter (uniform errors)
```

Details: [System design](docs/architecture/system-design.md)

## Decisions & tradeoffs

| Decision | Alternatives considered | Why | Tradeoff accepted | Record |
|---|---|---|---|---|
| NestJS modular monolith | Plain Express, microservices | Clear structure, DI and testability for a one-day scope | More boilerplate | [ADR-0001](docs/adr/0001-modular-monolith.md) |
| PostgreSQL + Prisma | Raw SQL, in-memory store | Transactions, constraints, typed queries | Docker required; ORM hides locking details | [ADR-0002](docs/adr/0002-postgres-prisma.md) |
| React + Vite, typed client | Next.js, server views | Fast, independent UI with consistent errors | Two package.json files, no SSR | [ADR-0003](docs/adr/0003-react-vite-frontend.md) |

All records: [docs/adr/](docs/adr/)

## Edge cases handled
-

## Documentation
- [System design](docs/architecture/system-design.md): components, data model, flows, failure modes
- [API reference](docs/api.md)
- [Testing strategy](docs/testing.md)
- [Requirements matrix](docs/requirements.md): every requirement mapped to its tests
- [How I worked with AI](docs/ai-workflow.md)

## Known limitations & next steps
-
