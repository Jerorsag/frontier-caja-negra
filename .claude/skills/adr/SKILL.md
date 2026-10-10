---
name: adr
description: Creates an Architecture Decision Record in docs/adr/. Use when an architectural or technical decision with real alternatives is made.
argument-hint: "[decision title]"
---

Create a new ADR for: $ARGUMENTS

1. Find the highest number in docs/adr/ and use the next one, as 4 digits plus a kebab-case title, e.g. `docs/adr/0008-skip-superseded-lines-in-replay.md`.
2. Follow docs/adr/0000-template.md exactly. Status: Accepted. Date: today.
3. Always list at least 2 real alternatives with honest pros and cons.
4. Tie the context to the requirement it serves (FR1–FR7, NFR1–NFR6 in docs/requirements.md) and cite experiment ids from `experimentos.jsonl` when the decision rests on observed behavior.
5. Consequences must include the negative ones (the tradeoff accepted).
6. Add a row to the decisions table in section 06 of docs/architecture/system-design.md, linking the ADR.
7. Add one line under "Decisions" in CLAUDE.md: `ADR-XXXX — decision — why`.
8. Tell the human that the published site (site/docs/index.html, section 06) needs the same row and a card; do not edit `site/` yourself.
