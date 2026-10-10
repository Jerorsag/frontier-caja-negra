# Testing strategy

| Level | Tool | What it proves | Command |
|---|---|---|---|
| Unit | Jest | Business rules with dependencies mocked | `npm test` |
| E2E | Jest + Supertest + real PostgreSQL | HTTP contract: routes, status codes, response shapes | `npm run test:e2e` |
| Static | ESLint, tsc, Prettier | Type safety and style | `npm run check:api` |
| Frontend | tsc + Vite build + oxlint | The UI compiles against the API types | `npm run check:web` |

## Principles
- Tests are derived from the spec (docs/SPEC.md), not from the implementation.
- Every requirement in docs/requirements.md maps to at least one test.
- E2E tests use the same app configuration as production (`configureApp` in `backend/src/app.setup.ts`).
- All commands run from the repo root.

## Edge cases deliberately tested
-

## Not tested (and why)
-
