# CLAUDE.md

Working agreement for this repo. Read it fully before any task.

## North star
<!-- Fill this in during the first hour of the challenge. One measurable sentence. -->
_TBD: e.g. "All spec cases pass, including edge cases X and Y; API responds < 200 ms; repo runs from scratch with README steps."_

The challenge spec lives in `docs/SPEC.md`; its breakdown in `docs/requirements.md`. When the spec and this file disagree, **the spec wins**.

## Roles
- **Human (Jero)**: problem understanding, architecture, tradeoffs, final review of every diff.
- **Main agent**: orchestrates. Delegates to subagents, integrates their work, never decides architecture silently: propose, then wait.
- **Subagents** (`.claude/agents/`):

| Agent | Writes code? | When |
|---|---|---|
| planner | No | Before building: critique the design against the spec |
| test-engineer | Tests only | Before or alongside each requirement |
| backend-engineer | Yes (`backend/`) | Implement API modules |
| frontend-engineer | Yes (`frontend/`) | Only if the challenge needs a UI |
| reviewer | No | After every change (proactive) |
| docs-writer | Docs only | After each feature or decision (proactive) |

## Skills (`.claude/skills/`)
- `/spec-breakdown`: first step after pasting the statement into docs/SPEC.md.
- `/adr <title>`: record every real decision.
- `nest-module`: conventions for new backend modules (loaded automatically).
- `/pre-submit`: final checklist before delivering.

## Repo layout
```
backend/     NestJS API: src/, test/, prisma/, Dockerfile, .env
frontend/    React + Vite app: src/
docs/        SPEC, requirements, architecture, ADRs, API, testing, AI workflow
.claude/     agents and skills
package.json root scripts that orchestrate both apps (run commands from the root)
```

## Workflow (always)
1. **Understand**: run `/spec-breakdown`, then confirm the ambiguities with the human.
2. **Plan**: short written plan with files to touch; planner critiques it. Wait for approval on non-trivial changes. Record real decisions with `/adr`.
3. **Test first**: test-engineer writes failing tests that encode the spec.
4. **Implement**: backend-engineer (or frontend-engineer) makes the smallest change that passes the tests.
5. **Verify**: `npm run check` and `npm run test:e2e` from the root. All green before saying "done".
6. **Review**: reviewer, then the human runs `/diff` and `/code-review`; fix findings.
7. **Document**: docs-writer updates docs/ and the Status column of requirements.md.
8. **Commit**: one logical change per commit, imperative message (`feat: add rate limiter`).

## Commands (from the repo root)
| Purpose | Command |
|---|---|
| First-time setup (deps, .env, DB, migrations) | `npm run setup` |
| Full check (backend + frontend) | `npm run check` |
| Backend only: format, lint, types, unit | `npm run check:api` |
| Frontend only: lint + build | `npm run check:web` |
| Unit tests | `npm test` |
| E2E tests (needs DB) | `npm run test:e2e` |
| Start / stop DB | `npm run db:up` / `npm run db:down` |
| New migration | `npm run migrate -- --name <change>` |
| Regenerate Prisma client | `npm --prefix backend run prisma:generate` |
| API dev server (:3000) | `npm run dev:api` |
| Web dev server (:5173, proxy /api → :3000) | `npm run dev:web` |

## Conventions
- **Stack**: NestJS 11, TypeScript strict, Prisma 6, PostgreSQL 16, Jest. Web: React 19 + Vite + TypeScript.
- **Structure**: one Nest module per domain in `backend/src/<domain>/` (see the nest-module skill).
- **Controllers are thin**: parse, validate (DTO + class-validator), delegate. Logic lives in services.
- **Validation**: every input goes through a DTO. The global `ValidationPipe` rejects unknown fields.
- **Errors**: throw Nest `HttpException` subclasses. The global filter formats them. Never return error objects with status 200.
- **Types**: no `any`. Explicit return types on public methods.
- **Names and formats**: match the spec **exactly** (field names, routes, status codes, output formats). Hidden tests depend on it.
- **DB**: schema changes only through Prisma migrations. Transactions for multi-step writes.
- **Frontend**: all HTTP through `frontend/src/api.ts`; every view handles loading, empty, error and success.
- **No new dependencies** without asking. Prefer the standard library.
- **Determinism**: no hidden randomness or wall-clock dependence in logic; inject a clock if time matters.

## Definition of done
- [ ] Requirement covered by at least one test, including edge cases (docs/requirements.md updated).
- [ ] `npm run check` and `npm run test:e2e` pass (from the root).
- [ ] Error paths tested (invalid input, not found, conflicts, empty collections, boundaries).
- [ ] Real decisions recorded as ADRs and linked from the README.
- [ ] docs/api.md matches the controllers.

## Documentation map
README (overview + decisions) → docs/architecture/system-design.md → docs/adr/ → docs/api.md → docs/testing.md → docs/requirements.md → docs/ai-workflow.md

## Decisions
<!-- One line per decision: ADR-XXXX — decision — why. Added by the adr skill. -->
- ADR-0001 — NestJS modular monolith — structure and testability for a one-day scope
- ADR-0002 — PostgreSQL + Prisma — transactions, constraints, typed access
- ADR-0003 — React + Vite frontend with a typed client — fast, independent, consistent errors

## Things to never do
- Edit tests just to make them pass without explaining why the test was wrong.
- Write the implementation and the only tests for it in the same step.
- Swallow errors (`catch {}` without handling or rethrow).
- Leave TODOs in delivered code without a note in the README.
