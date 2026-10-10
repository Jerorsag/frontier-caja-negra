// Business parameters observed on the original. Kept in env so a behavior change
// during the day is a config change, not a code change.
const num = (name: string, fallback: number): number => {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : Number(v);
};

export const config = {
  port: num('PORT', 3000),
  teamToken: process.env.TEAM_TOKEN ?? '',
  transferLimit: num('TRANSFER_LIMIT', 50000), // E506 when amount > limit (inclusive). v2, exp. 818 (50000 ok) and 560 (50001 → E506); it was 100000 in v1
  lockAfter: num('LOCK_AFTER_LIMIT_FAILURES', 3), // consecutive E506 before E510
  maxAmountDigits: num('MAX_AMOUNT_DIGITS', 10), // 9999999999 ok, 10000000000 → E303
};
