# ADR-0006: Deterministic rules, no LLM in the request path

- **Status**: Accepted
- **Date**: 2026-10-10

## Context
The brief allows an LLM inside the replacement as long as each step answers within 5 seconds. Scoring is exact match on status and body (NFR1), each step has a time budget (NFR2), and the same sequence must give the same outputs on every run (NFR4). The hidden set will contain inputs that were never probed.

## Options considered
1. **Deterministic rules only**: every answer comes from a coded rule backed by an experiment. Unseen inputs fall through to whatever the rules say, which may differ from the original.
2. **LLM fallback for unseen inputs**: might guess the original's answer for a case we never probed. Adds seconds and cost per request, and its variance is punished by exact-match scoring.

## Decision
We chose **deterministic rules with no LLM in the request path**. `service/src` has no network calls, no randomness and no clock dependence. Inputs that were never probed get a stated default, recorded as assumed (`supuesto`) in the specification and listed in [requirements.md](../requirements.md).

## Consequences
- **Positive**: repeatable outputs; responses in milliseconds; no external dependency that could fail or be mistaken for a call to another service.
- **Negative / tradeoffs accepted**: an unseen input gets our default, not a guess at the original's behavior; closing those gaps costs probes.
- **Follow-ups**: probe the open questions before 20:00 and move each default from assumed to confirmed.
