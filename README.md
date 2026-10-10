# Black Box Replacement

> A drop-in replacement for a 10-year-old banking message service with no source code and no documentation, rebuilt only from its responses. Built in one day for the Frontier hackathon (Lab10), Reto 2 "La caja negra".

**Design document:** https://frontier-caja-negra-site.vercel.app/docs · **Entrypoint:** `https://<tu-dominio>.up.railway.app`

## Problem

A service that receives messages over HTTP keeps a company running, and nobody knows exactly what it does. The goal is a replacement that returns the **same status and the same body** for every request, errors included, plus a specification that lets another engineer reimplement it and an experiment log that proves every claim.

## Approach: the original is the oracle

1. **Hypothesis**: one question per request.
2. **Probe**: `tools/probe.mjs` resets the original, sends the sequence and appends every request to `experimentos.jsonl`.
3. **Rule**: each conclusion is written with its confidence (confirmed, probable, assumed).
4. **Replay**: `tools/diff.mjs` replays every logged sequence against the replacement with the official comparison rules.
5. **Re-check**: the same sequences are replayed against the original to detect behavior changes during the day.

The experiment log is both the evidence for the specification and the regression suite for the replacement.

## What the black box turned out to be

A small core-banking protocol over `POST /msg` with `{"m": "COMMAND;args;CONTROL"}`:

- Six commands: `PING`, `ALTA`, `CONSULTA`, `DEPOSITO`, `TRANSFER`, `ANULA`.
- A mod-97 checksum: `control = 98 − (N mod 97)`.
- 17 error codes evaluated in a fixed order (the first failing check wins).
- Per-token state, a fixed transfer limit of 100,000, and an account lock after three consecutive limit rejections.
- One behavior change detected during the day (transfer limit, 10:36 → 10:44).

## Architecture

A layered monolith in a single process, on plain `node:http` + TypeScript:

```
service/src/
  server.ts     HTTP layer: routing, Bearer auth, X-Req, JSON replies, logs
  protocol.ts   Application layer: ordered validation pipeline + commands
  control.ts    Domain: checksum (pure function)
  store.ts      State: accounts, operations and id sequences per token, in memory
  errors.ts     Error catalog, bodies verbatim
  config.ts     Business limits from environment variables
```

Dependencies point downward only. Decisions and trade-offs are recorded in [`docs/adr/`](docs/adr/).

## Repository layout

```
service/        The replacement (deployed on Railway)
tools/          Exploration tooling: probe, diff, checksum, log helpers (never deployed)
experiments/    Experiment definitions and conclusions
pruebas/        Official examples from the challenge
docs/           Spec, requirements, architecture, ADRs, API, testing, AI workflow
site/           Documentation site (deployed on Vercel)
experimentos.jsonl   Official experiment log, one line per request to the original
```

## Run locally

Requirements: Node 20+.

1. Create `.env.tools` in the root (it is gitignored):
```
   ORIGINAL_URL=<original service URL>
   TOKEN=<token for the original>
   TEAM_TOKEN=<token the replacement accepts>
   REPLACEMENT_TOKEN=<same as TEAM_TOKEN>
   REPLACEMENT_URL=http://localhost:3000
   PORT=3000
```
2. Start the replacement:
```bash
   npm run setup
   npm run build
   npm run start:local
```
3. In another terminal, replay the official examples and every logged sequence:
```bash
   npm run replay
```

## Results

| Check | Result |
|---|---|
| Logged sequences replayed (current version) | all passing |
| Hidden evaluation set | _pending_ |

## Documentation

- [System design](https://frontier-caja-negra-site.vercel.app/docs) (EN/ES, with the experiment explorer)
- [Requirements](docs/requirements.md) · [API contract](docs/api.md) · [Testing](docs/testing.md) · [ADRs](docs/adr/) · [AI workflow](docs/ai-workflow.md)
- [Experiment log, readable view](docs/EXPERIMENTOS.md)

---

Built by [Jerónimo Rodríguez](https://linkedin.com/in/jerorodriguez) · [GitHub](https://github.com/Jerorsag)