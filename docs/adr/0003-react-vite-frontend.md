# ADR-0003: React + Vite frontend with a typed API client

- **Status**: Accepted
- **Date**: 2026-10-07

## Context
Some challenges may require a UI. It must be quick to build, typed end to end, and must not slow down the backend work.

## Options considered
1. **React + Vite + TypeScript, no UI library**: fast dev server, familiar, small surface. Styling is manual.
2. **Next.js**: routing and SSR built in; heavier, and its own server is unnecessary next to a NestJS API.
3. **Server-rendered views from NestJS**: one app; poor interactivity and slower to iterate.

## Decision
React + Vite in `frontend/`, a single typed client (`frontend/src/api.ts`), a `useApi` hook for async states, and a dev proxy from `/api` to the API.

## Consequences
- **Positive**: independent from the backend, no CORS friction in development, consistent error handling.
- **Negative / tradeoffs accepted**: separate dependencies per app (backend/, frontend/) plus a root orchestrator; no SSR.
- **Follow-ups**: add a router only if the challenge needs more than one or two screens.
