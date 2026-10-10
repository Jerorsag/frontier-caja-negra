// Checksum tests. Expected values come from the original's answers (pruebas/ejemplos.jsonl and the log).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { control } from './control.js';

interface Example {
  n: number;
  request: { m: string };
  response: { error?: string };
}

// dist/control.test.js → <repo>/pruebas/ejemplos.jsonl
const examples: Example[] = readFileSync(new URL('../../pruebas/ejemplos.jsonl', import.meta.url), 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((l) => JSON.parse(l) as Example);

const split = (m: string): { body: string; ctrl: string } => {
  const i = m.lastIndexOf(';');
  return { body: m.slice(0, i), ctrl: m.slice(i + 1) };
};

// A message passed the checksum when the original did not answer E201/E202. PING never checks it.
const valid = examples.filter(
  (e) => !e.request.m.toUpperCase().startsWith('PING;') && e.response.error !== 'E201' && e.response.error !== 'E202',
);

test('the public examples include messages that passed the checksum', () => {
  assert.ok(valid.length >= 15, `only ${valid.length} valid examples found`);
});

for (const e of valid) {
  test(`example ${e.n}: ${e.request.m}`, () => {
    const { body, ctrl } = split(e.request.m);
    assert.equal(String(control(body)), ctrl);
  });
}

test('is case-insensitive (ex. 11: CONSULTa has the control of CONSULTA)', () => {
  assert.equal(control('CONSULTa;AC-0001'), 14);
  assert.equal(control('consulta;ac-0001'), control('CONSULTA;AC-0001'));
});

test('rejects ALTA;Lucia;83 (ex. 2): the control is 82', () => {
  assert.equal(control('ALTA;Lucia'), 82);
  assert.notEqual(control('ALTA;Lucia'), 83);
});

test('ignores characters outside A–Z and 0–9 (#49: ALTA;Lucía → 14)', () => {
  assert.equal(control('ALTA;Lucía'), 14);
  assert.equal(control('ALTA;Luca'), 14); // the accented letter contributes nothing
  assert.equal(control('ALTA;Ana Maria'), control('ALTA;AnaMaria')); // #120: spaces are dropped
  assert.equal(control('ALTA;Ana Maria'), 44);
});
