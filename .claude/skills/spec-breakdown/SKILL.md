---
name: spec-breakdown
description: Turns docs/SPEC.md into a numbered requirements matrix in docs/requirements.md. Use first, right after pasting the challenge statement.
disable-model-invocation: true
---

Read docs/SPEC.md carefully, twice.

Rewrite docs/requirements.md with this table:

| ID | Requirement | Type | Source (quote ≤ 10 words) | Edge cases | Tests | Status |
|---|---|---|---|---|---|---|

- ID: R1, R2, … Type: explicit or implicit.
- Split compound sentences into atomic requirements.
- Implicit requirements to look for: validation, error codes, idempotency, ordering, concurrency, limits, empty states.
- Tests column starts empty. Status starts as TODO.

Then add these sections below the table:
- **Ambiguities**: each with 2 possible readings and a recommended one.
- **Risks**: what is most likely to break hidden tests.
- **Suggested build order**: smallest end-to-end slice first.

Do not write code. Stop and wait for the human to confirm the interpretations.
