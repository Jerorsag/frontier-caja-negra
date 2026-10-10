# API reference

Base URL: `http://localhost:3000` (from the web app: `/api`).

## Errors
Every error uses the same shape:

```json
{
  "statusCode": 404,
  "error": "NOT_FOUND",
  "message": "Item not found",
  "path": "/items/123",
  "timestamp": "2026-10-10T15:00:00.000Z"
}
```

Validation errors (`400`) return `message` as an array of strings. Unknown fields in a payload are rejected with `400`.

## Health

### GET /health
Checks the API and the database.

**200**
```json
{ "status": "ok", "database": "up", "timestamp": "2026-10-10T15:00:00.000Z" }
```
`status` is `degraded` and `database` is `down` when the database does not answer.

<!--
Template for each endpoint:

### METHOD /path
What it does, in one line.

**Request**
```json
{ }
```

**Responses**
| Status | When | Body |
|---|---|---|
| 201 | Created | … |
| 400 | Invalid payload | error shape |
| 404 | … | error shape |
| 409 | … | error shape |
-->
