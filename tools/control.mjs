#!/usr/bin/env node
// Control (checksum) of a message, as inferred from pruebas/ejemplos.jsonl.
// control = 98 - (N mod 97); N = message without control, uppercased,
// letters A=1..Z=26, digits kept, any other char dropped, then "00" appended.
// Usage: node tools/control.mjs "ALTA;Lucia"      -> ALTA;Lucia;82
export function control(body) {
  let r = 0;
  const digits = [...body.toUpperCase()].map((c) =>
    /[0-9]/.test(c) ? c : /[A-Z]/.test(c) ? String(c.charCodeAt(0) - 64) : '').join('') + '00';
  for (const d of digits) r = (r * 10 + Number(d)) % 97;
  return 98 - r;
}
export const sign = (body) => `${body};${control(body)}`;
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('control.mjs')) {
  for (const a of process.argv.slice(2)) console.log(sign(a));
}
