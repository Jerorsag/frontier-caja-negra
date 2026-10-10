#!/usr/bin/env node
// Copies the official log into the website so the page always shows the latest experiments.
// Run before every commit:  node tools/build-site.mjs
import { copyFileSync, mkdirSync } from 'node:fs';
mkdirSync('site/docs/data', { recursive: true });
copyFileSync('experimentos.jsonl', 'site/docs/data/experimentos.jsonl');
console.log('site/docs/data/experimentos.jsonl updated');
