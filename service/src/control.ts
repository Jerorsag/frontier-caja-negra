// Message checksum (spec: Integridad).
// control = 98 - (N mod 97), N = message without the control, uppercased,
// letters A=1..Z=26, digits kept, every other character dropped, then "00" appended.
export function control(body: string): number {
  let r = 0;
  for (const ch of body.toUpperCase()) {
    let digits = '';
    if (ch >= '0' && ch <= '9') digits = ch;
    else if (ch >= 'A' && ch <= 'Z') digits = String(ch.charCodeAt(0) - 64);
    for (const d of digits) r = (r * 10 + Number(d)) % 97;
  }
  r = (r * 100) % 97; // the appended "00"
  return 98 - r;
}
