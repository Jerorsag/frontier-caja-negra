#!/usr/bin/env node
// Readable view of experimentos.jsonl → docs/EXPERIMENTOS.md (one table per sequence).
// The .jsonl stays the official deliverable; this file is only for humans.
import { mkdirSync, writeFileSync } from 'node:fs';
import { readJsonl } from './lib.mjs';

const lines = readJsonl('experimentos.jsonl');
const cell = (v) => String(typeof v === 'string' ? v : JSON.stringify(v)).replace(/\|/g, '\\|');
const bySeq = new Map();
for (const l of lines) (bySeq.get(l.seq) ?? bySeq.set(l.seq, []).get(l.seq)).push(l);

let md = `# Experiment log (readable view)\n\nGenerated from \`experimentos.jsonl\` — ${lines.length} requests in ${bySeq.size} sequences. Each sequence starts after \`POST /__reset\`.\n`;
for (const [seq, ls] of bySeq) {
  md += `\n## ${seq}\n\n| id | Hypothesis | Request | Status | Response | Conclusion |\n|---|---|---|---|---|---|\n`;
  for (const l of ls) {
    const req = [l.method, l.path].filter(Boolean).join(' ') + (l.auth === false ? ' (no token)' : l.token ? ' (other token)' : '');
    md += `| ${l.id} | ${cell(l.hipotesis)} | ${req ? cell(req) + ' ' : ''}\`${cell(l.request)}\` | ${l.status} | \`${cell(l.response)}\` | ${cell(l.conclusion ?? '')} |\n`;
  }
}
mkdirSync('docs', { recursive: true });
writeFileSync('docs/EXPERIMENTOS.md', md);
console.log(`docs/EXPERIMENTOS.md: ${lines.length} rows`);
