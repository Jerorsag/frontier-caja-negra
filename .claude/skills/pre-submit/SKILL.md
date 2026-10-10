---
name: pre-submit
description: Final pre-submission checklist. Run before delivering the challenge.
disable-model-invocation: true
---

Run from the repo root and report each item as PASS or FAIL with evidence:

1. `npm run check` passes (backend: format, lint, types, unit; frontend: lint, build).
2. `npm run test:e2e` passes.
3. Every row of docs/requirements.md has a test and Status = DONE, or an explained gap.
4. The README quick start works exactly as written: check that each command exists in the root, backend or frontend package.json.
5. No leftover TODOs or console.log in `backend/src` or `frontend/src` (grep). List any found.
6. docs/api.md matches the real controllers (compare routes and status codes).
7. Frontend types in `frontend/src` match docs/api.md.
8. Every row in the README decisions table links an existing ADR.
9. `backend/.env` is not committed; `backend/.env.example` has every variable used in the code.
10. docs/ai-workflow.md has concrete examples, not placeholders.
11. `git status` is clean.

End with: READY or NOT READY, plus the list of fixes needed in priority order.
