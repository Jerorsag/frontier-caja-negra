#!/usr/bin/env node
// Replays every recorded sequence against a TARGET (your replacement, local or deployed)
// and compares status + body with the official rules. The experiment log IS the test suite.
//
// Usage:
//   node tools/diff.mjs                       # target = REPLACEMENT_URL (default http://localhost:3000)
//   node tools/diff.mjs s07                   # only one sequence
//   node tools/diff.mjs --target https://my-app.up.railway.app
//   node tools/diff.mjs --examples            # also replay pruebas/ejemplos.jsonl
//
// Sequences listed in experiments/superseded.json ({ "s03": "reason" }) recorded a version of the
// original that no longer exists: they stay in the log as evidence and are reported as SKIP.
// The token sent to the target is REPLACEMENT_TOKEN (falls back to TOKEN).
import { existsSync, readFileSync } from 'node:fs';
import { loadEnv, send, sameBody, readJsonl } from './lib.mjs';

loadEnv();
const args = process.argv.slice(2);
const tIdx = args.indexOf('--target');
const TARGET = tIdx >= 0 ? args[tIdx + 1] : process.env.REPLACEMENT_URL ?? 'http://localhost:3000';
const TOKEN = process.env.REPLACEMENT_TOKEN ?? process.env.TOKEN;
const SUPERSEDED_FILE = 'experiments/superseded.json';
const superseded = existsSync(SUPERSEDED_FILE) ? JSON.parse(readFileSync(SUPERSEDED_FILE, 'utf8')) : {};
const only = args.find((a) => !a.startsWith('--') && a !== TARGET);

const seqs = new Map();
for (const s of readJsonl('experiments/steps.jsonl')) {
  if (!seqs.has(s.seq)) seqs.set(s.seq, []);
  seqs.get(s.seq).push(s);
}
if (args.includes('--examples')) {
  seqs.set('ejemplos', readJsonl('pruebas/ejemplos.jsonl').map((e) => ({
    id: `ej${e.n}`, step: { request: e.request }, status: e.status, rawText: JSON.stringify(e.response),
  })));
}

let passSeq = 0, failSeq = 0, skipSeq = 0;
for (const [seq, steps] of seqs) {
  if (only && seq !== only) continue;
  if (Object.hasOwn(superseded, seq)) { skipSeq++; console.log(`SKIP ${seq}: ${superseded[seq]}`); continue; }
  await send(TARGET, TOKEN, { path: '/__reset', method: 'POST' });
  const fails = [];
  for (const s of steps) {
    const r = await send(TARGET, TOKEN, s.step);
    if (r.status !== s.status || !sameBody(s.rawText, r.rawText)) {
      fails.push(`  #${s.id} ${JSON.stringify(s.step.request ?? s.step.raw ?? s.step.path)}\n` +
        `     expected [${s.status}] ${s.rawText}\n     got      [${r.status}] ${r.rawText}`);
    }
  }
  if (fails.length) { failSeq++; console.log(`FAIL ${seq}\n${fails.join('\n')}`); }
  else passSeq++;
}
console.log(`\n${passSeq} sequences pass, ${failSeq} fail, ${skipSeq} skipped (target: ${TARGET})`);
process.exitCode = failSeq ? 1 : 0;
