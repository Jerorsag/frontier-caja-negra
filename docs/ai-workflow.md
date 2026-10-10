# How I worked with AI

## Setup
Claude Code with a project CLAUDE.md, 6 subagents (planner, test-engineer, backend-engineer, frontend-engineer, reviewer, docs-writer) and 4 skills (spec-breakdown, adr, nest-module, pre-submit).

## Division of work

| I decided or did | Delegated to agents |
|---|---|
| Problem interpretation and ambiguities | Requirements matrix draft (`/spec-breakdown`) |
| Architecture and tradeoffs | Design critique (planner) |
| Critical test cases | Additional edge-case tests (test-engineer) |
| Final review of every diff | Implementation (backend / frontend engineer), review (reviewer), docs (docs-writer) |

## Where I did not trust the agent
<!-- Concrete examples: a bug it introduced, a wrong assumption, a test it tried to weaken, and what I did. -->
-

## What worked and what I would change
-
