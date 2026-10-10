# How I worked with AI

The brief says: "No uses herramientas que hagan el trabajo por ti." Own scripts and fuzzers are allowed. This file records where AI assistants helped and what stayed with me.

> Draft. The sections below were written from the repo's contents. The TODO list at the end marks what I still have to write in my own words.

## Setup

Claude Code with a project guide ([CLAUDE.md](../CLAUDE.md)), five agents in `.claude/agents/` (planner, test-engineer, backend-engineer, reviewer, docs-writer) and three skills in `.claude/skills/` (spec-breakdown, adr, pre-submit). The repo started from a NestJS template; the template's code, ADRs and agents were removed once the real design was clear.

## Where AI assistants were used

| Area | What the assistant did | Output in the repo |
|---|---|---|
| Exploration tooling | Wrote the scripts that send experiments, log every request, replay sequences and compare with the official rules | `tools/probe.mjs`, `tools/diff.mjs`, `tools/lib.mjs`, `tools/conclude.mjs`, `tools/view.mjs` |
| Checksum search | Helped search letter-to-number mappings until every valid example matched `98 − (N mod 97)` | `tools/control.mjs`, `service/src/control.ts` |
| Code | Wrote the replacement from the logged behavior | `service/src/*.ts` |
| Documentation | Wrote the design site and these documents from the log, the conclusions and the code | `site/`, `docs/` |

## What I decided and reviewed myself

- Which hypotheses to test, in what order, and how to spend the probe budget: the experiment files in `experiments/`.
- The reading of each result: the conclusions in `experiments/conclusiones.json`.
- The architecture and its trade-offs: the seven ADRs in [docs/adr/](adr/).
- The confidence level of each statement (confirmed, probable, assumed).

## TODO (for me, in my own words)

- [ ] How I noticed the checksum was a mod-97 check, and what I asked the assistant to search.
- [ ] One concrete case where the assistant was wrong and how I caught it.
- [ ] One concrete case where I rejected or rewrote generated code, and why.
- [ ] How I reviewed the diffs (what I read line by line, what I only tested).
- [ ] Why this use of AI respects the "no tools that do the work for you" rule.
- [ ] What worked, and what I would do differently next time.
- [ ] Confirm or correct the two tables above: they describe the division of work as inferred from the repo, not as I lived it.
