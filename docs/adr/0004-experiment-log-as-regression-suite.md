# ADR-0004: The experiment log is the regression suite

- **Status**: Accepted
- **Date**: 2026-10-10

## Context
`experimentos.jsonl` is a required deliverable: one line per request sent to the original, with the hypothesis behind it (FR7). The replacement is scored by exact comparison with the original (NFR1). The only source of truth for expected answers is the original itself.

## Options considered
1. **Replay the log as the test suite**: `tools/probe.mjs` records every request and the raw response; `tools/diff.mjs` replays each sequence against the replacement after a reset and compares with the official rules. Expected values come from the oracle, never from our reading of it. Covers only what was probed.
2. **Hand-written tests only**: can target any case. Expected values would be typed by hand, so a misunderstanding of the original is copied into both the code and its test.

## Decision
We chose **the experiment log as the regression suite**. Every request to the original goes through `tools/probe.mjs`, which appends to `experimentos.jsonl` and to `experiments/steps.jsonl` (exact request and raw response text, used for replay). `node tools/diff.mjs --examples` replays every sequence plus the 20 public examples.

## Consequences
- **Positive**: each rule is proven against the original and replayed automatically; the same file serves the specification's evidence and the tests; the replay has the same shape as the hidden set (reset, then a sequence).
- **Negative / tradeoffs accepted**: it covers only what was probed, so edge cases have to be probed on purpose; a sequence recorded before a behavior change (s03, experiment 64) has to be listed in `experiments/superseded.json` and is skipped whole.
- **Follow-ups**: none. Superseded sequences are reported as SKIP by `tools/diff.mjs`; unit tests for the checksum, the amounts and the lock counter are in `service/src`.
