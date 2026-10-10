// Shared helpers for the probe and diff tools. No dependencies (Node 20+).
import { readFileSync, existsSync } from 'node:fs';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Load KEY=VALUE pairs from .env.tools (gitignored) into process.env. */
export function loadEnv(file = '.env.tools') {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

/**
 * Send one request and return { status, response, xReq, rateLimited }.
 * step: { path='/msg', method='POST', request (JSON body) | raw (string body), auth=true, token, contentType }
 */
export async function send(baseUrl, defaultToken, step) {
  const path = step.path ?? '/msg';
  const method = step.method ?? 'POST';
  const headers = {};
  const auth = step.auth ?? true;
  if (auth) headers.Authorization = `Bearer ${step.token ?? defaultToken}`;
  let body;
  if (step.raw !== undefined) body = step.raw;
  else if (step.request !== undefined) body = JSON.stringify(step.request);
  if (body !== undefined) headers['Content-Type'] = step.contentType ?? 'application/json';
  if (step.headers) Object.assign(headers, step.headers);

  const res = await fetch(baseUrl.replace(/\/$/, '') + path, { method, headers, body });
  const text = await res.text();
  let response;
  try { response = JSON.parse(text); } catch { response = text; }
  return {
    status: res.status,
    response,
    rawText: text,
    xReq: res.headers.get('x-req'),
    rateLimited: res.headers.get('x-frontier-infra') === 'rate-limit',
  };
}

/** Same comparison rules as the official evaluation. */
export function sameBody(aText, bText) {
  let a, b;
  try { a = JSON.parse(aText); b = JSON.parse(bText); } catch { return aText === bText; }
  return deepEqual(a, b);
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => Object.hasOwn(b, k) && deepEqual(a[k], b[k]));
}

export function readJsonl(file) {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
}
