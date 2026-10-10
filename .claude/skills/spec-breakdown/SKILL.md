---
name: spec-breakdown
description: Rebuilds the requirements matrix in docs/requirements.md from the challenge brief, docs/SPEC.md and the experiment log. Use after the brief changes or after new experiments are logged.
disable-model-invocation: true
---

Read README-Reto2.md and docs/SPEC.md carefully, twice. Then read `experiments/conclusiones.json` (or docs/EXPERIMENTOS.md) for what has been proven.

Rewrite docs/requirements.md with one table for functional and one for non-functional requirements:

| ID | Requirement | Evidence (experiment ids) | Verified by (test or replay) | Status |
|---|---|---|---|---|

- Keep the ids FR1–FR7 and NFR1–NFR6 and their wording as published in site/docs/index.html, section 02. Add new ids at the end; never renumber.
- Evidence: `id` values from `experimentos.jsonl`. Leave "—" when nothing was probed; never invent an id.
- Verified by: the replay (`node tools/diff.mjs`, name the sequences) or a named test.
- Status: Implemented, Planned or Assumed. A requirement without evidence cannot be Implemented without a note.

Then add below the tables:
- **Open questions**: behaviors not probed yet, each with the replacement's current default (read `service/src`) and the confidence "assumed".
- **Risks**: what is most likely to break hidden tests (two faults in one message, boundaries, a change in the original).
- **Suggested experiments**: the cheapest probes that would close the open questions, as hypotheses, not as files.

Do not write code. Do not run `tools/probe.mjs`. Stop and wait for the human to confirm the interpretations.
