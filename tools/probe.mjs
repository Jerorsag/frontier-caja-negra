#!/usr/bin/env node
// Runs an experiment against the ORIGINAL service and appends every request to experimentos.jsonl.
//
// Usage:
//   node tools/probe.mjs experiments/s01-ping.json
//
// Experiment file:
// {
//   "seq": "s01",               // unique per sequence; a reset is sent first
//   "reset": true,              // default true
//   "steps": [
//     { "hipotesis": "PING answers without state", "request": { "m": "PING;64" } },
//     { "hipotesis": "Unknown route", "path": "/nope", "method": "GET" },
//     { "hipotesis": "No token", "request": { "m": "PING;64" }, "auth": false },
//     { "hipotesis": "Body is not JSON", "raw": "hello" }
//   ]
// }
// Conclusions are added later by editing experimentos.jsonl (the "conclusion" field).
import { appendFileSync, readFileSync } from 'node:fs';
import { loadEnv, send, sleep, readJsonl } from './lib.mjs';

loadEnv();
const BASE = process.env.ORIGINAL_URL;
const TOKEN = process.env.TOKEN;
const LOG = 'experimentos.jsonl';
const STEPS_LOG = 'experiments/steps.jsonl'; // exact request + raw response text, for replay
const DELAY_MS = 150; // stays under 10 req/s

if (!BASE || !TOKEN) throw new Error('Set ORIGINAL_URL and TOKEN in .env.tools');
const file = process.argv[2];
if (!file) throw new Error('Usage: node tools/probe.mjs <experiment.json>');

const exp = JSON.parse(readFileSync(file, 'utf8'));
const existing = readJsonl(LOG);
if (existing.some((l) => l.seq === exp.seq)) throw new Error(`seq "${exp.seq}" already exists in the log`);
let nextId = existing.reduce((max, l) => Math.max(max, l.id), 0) + 1;

async function sendWithRetry(step) {
  for (;;) {
    const r = await send(BASE, TOKEN, step);
    if (!r.rateLimited) return r;
    console.warn('rate-limited by infrastructure, waiting 2s');
    await sleep(2000);
  }
}

if (exp.reset ?? true) {
  const r = await sendWithRetry({ path: '/__reset', method: 'POST' });
  if (r.status >= 300) console.warn(`reset returned ${r.status}`, r.response);
  await sleep(DELAY_MS);
}

for (const step of exp.steps) {
  if (!step.hipotesis) throw new Error('Every step needs a "hipotesis"');
  const r = await sendWithRetry(step);
  const line = {
    id: nextId++,
    seq: exp.seq,
    x_req: r.xReq === null ? null : Number.isNaN(Number(r.xReq)) ? r.xReq : Number(r.xReq),
    hipotesis: step.hipotesis,
    request: step.request ?? (step.raw !== undefined ? step.raw : null),
    status: r.status,
    response: r.response,
    conclusion: '',
  };
  // Non-default inputs are recorded so the log stays reproducible.
  if (step.path && step.path !== '/msg') line.path = step.path;
  if (step.method && step.method !== 'POST') line.method = step.method;
  if (step.auth === false) line.auth = false;
  if (step.token) line.token = 'OTHER';

  appendFileSync(LOG, JSON.stringify(line) + '\n');
  appendFileSync(STEPS_LOG, JSON.stringify({ id: line.id, seq: exp.seq, step, status: r.status, rawText: r.rawText }) + '\n');
  console.log(`#${line.id} [${r.status}] x_req=${line.x_req}  ${JSON.stringify(line.request)}  →  ${r.rawText}`);
  await sleep(DELAY_MS);
}
