# ADR-0007: Railway with a single replica; documentation on Vercel

- **Status**: Accepted
- **Date**: 2026-10-10

## Context
The replacement must be reachable from the internet at 20:00 with a green health check (NFR3). The brief states that the evaluator talks to one process and that several instances would each hold their own state; our state is in memory ([ADR-0002](0002-in-memory-state-per-token.md)). The design document and the experiment log are published as a static site (`site/`).

## Options considered
1. **Railway, one replica, for the replacement; Vercel for the static site**: one process holds all state; the platform restarts it on crash. The documentation is static files with no runtime. No redundancy, and two deployments.
2. **Several replicas behind a load balancer**: survives the loss of one instance. Requests of the same test could land on different instances with different state, which breaks sequences.
3. **Serve the documentation from the replacement**: one deployment. Adds routes the original does not have, which conflicts with answering every other route exactly like the original (FR2).

## Decision
We chose **Railway with exactly one replica for the replacement, and Vercel (root directory `site`) for the documentation**, served under `/docs`. The site only serves the `site/` folder, so it links to the ADRs on GitHub.

## Consequences
- **Positive**: state is consistent because there is a single process; the replacement exposes only the three routes of the contract; the documentation can be redeployed without touching the replacement.
- **Negative / tradeoffs accepted**: no redundancy, and a restart loses state (acceptable because every test starts with a reset); two deployments to keep in sync; `node tools/build-site.mjs` must run before publishing so the site shows the current log.
- **Follow-ups**: the Railway and Vercel configuration is not stored in this repo; confirm the replica count in the Railway settings before delivery (assumed until checked).
