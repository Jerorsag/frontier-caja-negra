---
name: pre-submit
description: Final pre-submission checklist. Run before delivering the challenge.
disable-model-invocation: true
---

Run from the repo root and report each item as PASS or FAIL with evidence. Never run `tools/probe.mjs` as part of this checklist.

1. `npm --prefix service ci` and `npm --prefix service test` succeed.
2. With the service running locally (`npm --prefix service run start:local`; `TEAM_TOKEN` must equal `REPLACEMENT_TOKEN` in `.env.tools`), `node tools/diff.mjs --examples` reports 0 fail. The only accepted SKIP is s03 (see `experiments/superseded.json`).
3. The same replay passes against the deployed URL: `node tools/diff.mjs --examples --target <url>`.
4. `GET /health` on the deployed URL answers 200 with the team token and 401 without it.
5. Isolation: grep `service/` for `fetch(`, `http.request`, `https` and the original's host. There must be no outbound call.
6. `experimentos.jsonl`: every line parses as JSON and has `id`, `seq`, `x_req`, `hipotesis`, `request`, `status`, `response`; ids are unique.
7. `site/docs/data/experimentos.jsonl` is identical to `experimentos.jsonl` (run `node tools/build-site.mjs` if not), and docs/EXPERIMENTOS.md is current (`node tools/view.mjs`).
8. The specification exists, has the seven sections of the brief, and every row cites at least one log id and a confidence (`confirmado`, `probable`, `supuesto`).
9. docs/api.md matches `service/src/errors.ts` (18 codes, exact bodies) and the order of checks in `service/src/protocol.ts`.
10. Every row of docs/requirements.md has a status; every "assumed" item is also `supuesto` in the specification.
11. Every ADR in docs/adr/ is listed in CLAUDE.md and linked from docs/architecture/system-design.md.
12. No secrets: `.env.tools` is not tracked, and no token appears in the repo (`git grep` for the token value and for `Bearer `).
13. No leftover TODOs or `console.log` debugging in `service/src` (the startup line in `server.ts` is expected). List any found.
14. docs/ai-workflow.md has concrete examples, not placeholders.
15. `git status` is clean.

End with: READY or NOT READY, plus the list of fixes needed in priority order.
