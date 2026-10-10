#!/usr/bin/env node
// Drift detector for the ORIGINAL service: re-sends recorded sequences to the ORIGINAL and reports
// every response that no longer matches the one recorded in experiments/steps.jsonl.
//
// Usage:
//   node tools/drift.mjs                   # default sequences: s04 s05 s06 s07 s08 s11 s12
//   node tools/drift.mjs s05 s08           # subset
//   node tools/drift.mjs --dry-run [seq…]  # print what would be sent; no request, no write
//
// For each sequence: POST /__reset (not logged, as in tools/probe.mjs), then every recorded step in
// its original order. Each step is appended to experimentos.jsonl as seq "<seq>-driftN", N being one
// run index shared by the whole invocation. experiments/steps.jsonl is read-only here, so tools/diff.mjs
// is unaffected. Only ORIGINAL_URL is ever contacted. Exit code 1 if any sequence CHANGED.
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { loadEnv, send, sleep, sameBody, readJsonl } from './lib.mjs';

loadEnv();
const LOG = 'experimentos.jsonl';
const STEPS_LOG = 'experiments/steps.jsonl';
const SUPERSEDED_FILE = 'experiments/superseded.json';
// s13 does not exist in experiments/ (yet), so it is not in the defaults.
const DEFAULT_SEQS = ['s04', 's05', 's06', 's07', 's08', 's11', 's12'];
const MIN_INTERVAL_MS = 170; // every send starts >= 170 ms after the previous one: at most ~5.9 req/s

const BASE = process.env.ORIGINAL_URL;
const TOKEN = process.env.TOKEN;
if (!BASE || !TOKEN) throw new Error('Set ORIGINAL_URL and TOKEN in .env.tools');
if (process.env.REPLACEMENT_URL && process.env.REPLACEMENT_URL.replace(/\/$/, '') === BASE.replace(/\/$/, '')) {
  throw new Error('ORIGINAL_URL and REPLACEMENT_URL are the same: refusing to run');
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const requested = args.filter((a) => !a.startsWith('--'));
const seqs = [...new Set(requested.length ? requested : DEFAULT_SEQS)];

const superseded = existsSync(SUPERSEDED_FILE) ? JSON.parse(readFileSync(SUPERSEDED_FILE, 'utf8')) : {};
const recorded = new Map(); // seq -> recorded steps, in order
for (const s of readJsonl(STEPS_LOG)) {
  if (!recorded.has(s.seq)) recorded.set(s.seq, []);
  recorded.get(s.seq).push(s);
}

// Validate everything before sending anything.
const toRun = [];
for (const seq of seqs) {
  if (/-drift\d+$/.test(seq)) throw new Error(`"${seq}" is a drift sequence; pass the original name`);
  if (Object.hasOwn(superseded, seq)) { console.log(`SKIP ${seq}: ${superseded[seq]}`); continue; }
  if (!recorded.has(seq)) throw new Error(`no recorded steps for "${seq}" in ${STEPS_LOG}`);
  toRun.push(seq);
}

const existing = readJsonl(LOG);
let nextId = existing.reduce((max, l) => Math.max(max, l.id), 0) + 1;
const runIndex = existing.reduce((max, l) => {
  const m = /-drift(\d+)$/.exec(l.seq);
  return m ? Math.max(max, Number(m[1])) : max;
}, 0) + 1;
const suffix = `-drift${runIndex}`;

/** Same record layout as tools/probe.mjs. */
function logLine(id, seq, step, r, hipotesis) {
  const line = {
    id,
    seq,
    x_req: r.xReq === null ? null : Number.isNaN(Number(r.xReq)) ? r.xReq : Number(r.xReq),
    hipotesis,
    request: step.request ?? (step.raw !== undefined ? step.raw : null),
    status: r.status,
    response: r.response,
    conclusion: '',
  };
  if (step.path && step.path !== '/msg') line.path = step.path;
  if (step.method && step.method !== 'POST') line.method = step.method;
  if (step.auth === false) line.auth = false;
  if (step.token) line.token = 'OTHER';
  return line;
}

/** Human-readable request label. Tokens are never printed. */
function label(step) {
  const parts = [step.method ?? 'POST', step.path ?? '/msg'];
  if (step.auth === false) parts.push('(no token)');
  if (step.token) parts.push('(other token)');
  parts.push(JSON.stringify(step.request ?? step.raw ?? null));
  return parts.join(' ');
}

if (dryRun) {
  console.log(`DRY RUN: nothing is sent to the ORIGINAL and nothing is written.`);
  console.log(`Drift run ${runIndex}, suffix "${suffix}". Target host: ${new URL(BASE).host} (REPLACEMENT_URL is never used).`);
  console.log(`Throttle: sends start >= ${MIN_INTERVAL_MS} ms apart; rate-limited answers are retried after 2 s, as in probe.mjs.`);
  let total = 0;
  for (const seq of toRun) {
    const steps = recorded.get(seq);
    console.log(`\n${seq} -> logged as ${seq}${suffix}: POST /__reset (not logged), then ${steps.length} requests`);
    for (const s of steps) console.log(`  #${s.id} ${label(s.step)}`);
    total += steps.length + 1;
  }
  console.log(`\nTotal: ${total} requests to the ORIGINAL: ${toRun.length} resets (not logged) + ${total - toRun.length} steps (logged to experimentos.jsonl only).`);
  process.exitCode = 0;
} else {
  let lastStart = 0;
  async function sendThrottled(step) {
    const wait = lastStart + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    for (;;) {
      lastStart = Date.now();
      const r = await send(BASE, TOKEN, step);
      if (!r.rateLimited) return r;
      console.warn('rate-limited by infrastructure, waiting 2s');
      await sleep(2000);
    }
  }

  const ok = [];
  const changed = [];
  let sent = 0;
  for (const seq of toRun) {
    const name = seq + suffix;
    const hipotesis = `drift check of ${seq} at ${new Date().toISOString()}`;

    const reset = await sendThrottled({ path: '/__reset', method: 'POST' }); // not logged, as in probe.mjs
    sent++;
    if (reset.status >= 300) {
      throw new Error(`reset returned ${reset.status} for ${seq}: ${reset.rawText}. Aborting: the original state is unknown.`);
    }

    const steps = recorded.get(seq);
    const diffs = [];
    for (const s of steps) {
      const r = await sendThrottled(s.step);
      const line = logLine(nextId++, name, s.step, r, hipotesis);
      appendFileSync(LOG, JSON.stringify(line) + '\n');
      sent++;
      if (r.status !== s.status || !sameBody(s.rawText, r.rawText)) {
        diffs.push({ old: s, now: r, driftId: line.id });
      }
    }

    if (diffs.length === 0) {
      ok.push(seq);
      console.log(`OK      ${seq}  ${steps.length} responses match (logged as ${name})`);
    } else {
      changed.push(seq);
      console.log(`CHANGED ${seq}  ${diffs.length} of ${steps.length} differ (logged as ${name})`);
      for (const d of diffs) {
        console.log(`  #${d.old.id} ${label(d.old.step)}  [drift line #${d.driftId}]`);
        console.log(`    old [${d.old.status}] ${d.old.rawText}`);
        console.log(`    new [${d.now.status}] ${d.now.rawText}`);
      }
    }
  }

  console.log(`\nDrift run ${runIndex}: ${ok.length} OK, ${changed.length} CHANGED` +
    `${changed.length ? ` (${changed.join(', ')})` : ''}; ${sent} requests sent to the ORIGINAL`);
  process.exitCode = changed.length ? 1 : 0;
}
