---
name: adr
description: Creates an Architecture Decision Record in docs/adr/. Use when an architectural or technical decision with real alternatives is made.
argument-hint: "[decision title]"
---

Create a new ADR for: $ARGUMENTS

1. Find the highest number in docs/adr/ and use the next one, as 4 digits plus a kebab-case title, e.g. `docs/adr/0003-use-row-locking-for-reservations.md`.
2. Follow docs/adr/0000-template.md exactly. Status: Accepted. Date: today.
3. Always list at least 2 real alternatives with honest pros and cons.
4. Consequences must include the negative ones (the tradeoff accepted).
5. Add a row to the "Decisions & tradeoffs" table in README.md linking the ADR.
6. Add one line under "Decisions" in CLAUDE.md: `ADR-XXXX — decision — why`.
