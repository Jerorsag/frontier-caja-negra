# Challenge spec: Reto 2 · La caja negra

The challenge in my own words. The original brief (Spanish) is [README-Reto2.md](../README-Reto2.md); when this file and the brief disagree, the brief wins.

## Problem

A service has been in production for 10 years and nobody knows what it does. It receives messages over HTTP and answers. There is no source code and no documentation. I have to understand it from its answers alone and build a replacement that answers exactly the same, errors included. Tools that do the work for me are not allowed; my own scripts and fuzzers are.

What it turned out to be: a small core-banking protocol over `POST /msg` (open accounts, check balances, deposit, transfer, reverse operations) with a mod-97 checksum per message, state per token, a transfer limit and an account lock. Details: [api.md](api.md).

## What I receive

- The URL of the original service.
- One token per person. Every request carries `Authorization: Bearer <token>`. Each token has its own state.
- `pruebas/ejemplos.jsonl`: 20 requests with their responses, one sequence recorded after a reset with the morning version of the service.

## Entrypoint contract (the replacement)

| Rule | Detail |
|---|---|
| Auth | `Authorization: Bearer <team token>` on every call. With another token or none, answer like the original. |
| `GET /health` | 200 when ready. |
| `POST /__reset` | Returns the replacement to its initial state. The evaluator calls it before every test. |
| Any other route | Exactly the same answer as the original, including routes that do not exist. |
| Messages | `POST /msg` with a JSON body such as `{"m": "PING;64"}`. |

## Deliverables (20:00)

1. **The replacement**, deployed and reachable from the internet.
2. **The specification**: lets another engineer reimplement the service without touching the original. Seven sections (Entrada, Integridad, Comandos, Memoria entre requests, Errores, Cambios durante el día, Riesgos), each with a table `ID | Comportamiento | Evidencia | Confianza`. Confidence is `confirmado` (probed and repeated), `probable` (seen once or inferred) or `supuesto` (not probed; the replacement's default).
3. **The experiment log** (`experimentos.jsonl`): one JSON line per request sent to the original, with fields `id`, `seq`, `x_req`, `hipotesis`, `request`, `status`, `response` and optional `conclusion`. Every sequence starts after a reset. The specification cites the `id` values.

## Evaluation rules

- **Hidden set: 100 tests.** 40 single requests, 45 sequences of 2–5 requests, 15 sequences of 6–12. None repeats the public examples. Every test starts with `POST /__reset`.
- A test passes when every compared response has the **same HTTP status** and the **same body**.
  - Both bodies JSON: object keys in any order, arrays in the same order, strings and numbers identical.
  - Otherwise: exact text, character by character.
- Headers are not compared. Each step has 5 seconds to answer.
- The set runs on every entrypoint validation in `/evento`; the run after 20:00 on the last entrypoint delivered on time is the one that counts.
- **Specification:** a judge reads it against the full list of behaviors. A behavior counts when it is well described and cites a log line that proves it. A false claim subtracts.

## Constraints

- The replacement must not call the original or another replacement. If it does, the set scores 0.
- An LLM inside the replacement is allowed if it answers within 5 seconds per step.
- 10 requests per second and 8,000 per day per token. Over the limit, the response carries `X-Frontier-Infra: rate-limit`; that response comes from the infrastructure, not the service.
- Nothing done with a token is irreversible: `POST /__reset` repairs it.
- The original can change during the day. The replacement is judged against the version live at 20:00.
- At 20:00 participant tokens stop working against the original.
- The evaluator talks to one process. Several instances would each hold their own state.
- Anything the replacement does not know how to answer gets a default, recorded in the specification as `supuesto`.

## North star

At least 95 of the 100 hidden tests passing at 20:00, every documented behavior backed by a cited experiment, and zero false claims in the specification.
