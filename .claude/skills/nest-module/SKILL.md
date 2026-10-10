---
name: nest-module
description: Conventions and steps for adding a NestJS domain module in backend/. Use when creating a new resource, endpoint group or domain.
---

Structure for domain `<name>`:

```
backend/src/<name>/
  <name>.module.ts            registers controller + service
  <name>.controller.ts        routes only: parse, validate, delegate
  <name>.service.ts           business rules; uses PrismaService
  dto/create-<name>.dto.ts    class-validator decorators on every field
  <name>.service.spec.ts      unit tests with PrismaService mocked
```

Steps:
1. Prisma model in `backend/prisma/schema.prisma`, then `npm run migrate -- --name add-<name>` from the repo root.
2. DTOs with class-validator (IsString, Length, IsInt, Min, Matches…). Unknown fields are already rejected globally.
3. Service: throw NotFoundException, ConflictException or BadRequestException. Never return null to the controller to signal an error.
4. Map Prisma errors: P2002 (unique constraint) → ConflictException; P2025 (record not found) → NotFoundException.
5. Multi-step writes: `this.prisma.$transaction(async (tx) => { … })`. For stock, counters or balances, use an atomic conditional update (`updateMany` with a `where` guard, then check `count`) or `SELECT … FOR UPDATE` via `$queryRaw` inside the transaction.
6. Register the module in `backend/src/app.module.ts`.
7. Status codes: POST create → 201, GET → 200, DELETE → 200 or 204. Always follow the spec if it says otherwise.
8. Run `npm run check:api` and `npm run test:e2e` from the repo root.
