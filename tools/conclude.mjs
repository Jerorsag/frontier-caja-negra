#!/usr/bin/env node
// Merges conclusions into experimentos.jsonl.  Usage: node tools/conclude.mjs experiments/conclusiones.json
// conclusiones.json: { "1": "texto", "2": "texto", ... }  (only fills/overwrites the given ids)
import { readFileSync, writeFileSync } from 'node:fs';
const map = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const lines = readFileSync('experimentos.jsonl', 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
let n = 0;
for (const l of lines) if (map[l.id] !== undefined) { l.conclusion = map[l.id]; n++; }
writeFileSync('experimentos.jsonl', lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
console.log(`${n} conclusiones aplicadas`);
