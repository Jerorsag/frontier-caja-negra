// Protocol tests: handleMessage is called directly, no HTTP.
// Expected answers are the original's; #N is the experiment id in experimentos.jsonl that shows it.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { control } from './control.js';
import { E, accountLocked, type Reply } from './errors.js';
import { handleMessage } from './protocol.js';
import { Store } from './store.js';

/** Send m exactly as given. */
const raw = (store: Store, m: unknown): Reply => handleMessage(JSON.stringify({ m }), store);
/** Send a message with its correct control appended. */
const msg = (store: Store, body: string): Reply => raw(store, `${body};${control(body)}`);
const ok = (store: Store, body: string): Reply => {
  const r = msg(store, body);
  assert.ok(r.status < 300, `${body} → ${r.status} ${JSON.stringify(r.body)}`);
  return r;
};
/** The raw "saldo" of CONSULTA: since v2 a string with 2 decimals. */
const saldo = (store: Store, id: string): string => {
  const s = (ok(store, `CONSULTA;${id}`).body as { saldo: unknown }).saldo;
  assert.equal(typeof s, 'string');
  assert.match(s as string, /^-?[0-9]+\.[0-9]{2}$/);
  return s as string;
};
/** The balance in the units of DEPOSITO and TRANSFER (saldo × 100), read through CONSULTA. */
const balance = (store: Store, id: string): number => Number(saldo(store, id).replace('.', ''));
const received = (opId: string): Reply => ({ status: 200, body: { status: 'recieved', operacionId: opId } });

/** AC-0001 and AC-0002, with an optional deposit (OP-0001) into AC-0001. */
function twoAccounts(deposit?: number): Store {
  const store = new Store();
  ok(store, 'ALTA;A');
  ok(store, 'ALTA;B');
  if (deposit !== undefined) ok(store, `DEPOSITO;AC-0001;${deposit}`);
  return store;
}

/** Three consecutive E506 from AC-0001 → locked. No attempt has been made on the locked account yet. */
function lockedSource(deposit?: number): Store {
  const store = twoAccounts(deposit);
  for (let i = 0; i < 3; i++) assert.deepEqual(msg(store, 'TRANSFER;AC-0001;AC-0002;100001'), E.limitExceeded);
  return store;
}

/** What the original answered in experiment #id (dist/protocol.test.js → <repo>/experimentos.jsonl). */
const logged = (id: number): Reply => {
  const line = readFileSync(new URL('../../experimentos.jsonl', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { id: number; status: number; response: unknown })
    .find((l) => l.id === id);
  assert.ok(line, `experiment ${id} is not in the log`);
  return { status: line.status, body: line.response };
};

// ── Body and segments ────────────────────────────────────────────────────────

test('E100: body that is not JSON, or empty (#10, #32)', () => {
  assert.deepEqual(handleMessage('PING;64', new Store()), E.invalidJson);
  assert.deepEqual(handleMessage('', new Store()), E.invalidJson);
});

test('E102: no m, m not a string, body not an object (#7, #8, #29–31, #33)', () => {
  const s = new Store();
  for (const body of ['{"x":"PING;64"}', '{"m":123}', '{"m":null}', '[]', 'null', '"PING;64"']) {
    assert.deepEqual(handleMessage(body, s), E.missingM, body);
  }
});

test('extra fields in the body are ignored (#28)', () => {
  assert.deepEqual(handleMessage('{"m":"PING;64","extra":1}', new Store()), { status: 200, body: { pong: true } });
});

test('E103 before E104: empty m has no ";" and an empty segment (#9)', () => {
  assert.deepEqual(raw(new Store(), ''), E.missingControl);
  assert.deepEqual(raw(new Store(), 'PING'), E.missingControl); // #4
});

test('E104 before the control checks: "FOO;" has an empty control and an unknown command (#24)', () => {
  assert.deepEqual(raw(new Store(), 'FOO;'), E.emptySegment);
  assert.deepEqual(raw(new Store(), 'ALTA;;85'), E.emptySegment); // #48
});

// ── PING ─────────────────────────────────────────────────────────────────────

test('PING skips the checksum: wrong and non-numeric controls pass (#3, #42)', () => {
  const s = new Store();
  for (const m of ['PING;64', 'PING;65', 'PING;abc', 'ping;64', 'PiNg;1']) {
    assert.deepEqual(raw(s, m), { status: 200, body: { pong: true } }, m);
  }
});

test('PING does not skip the arity, nor the empty-segment check (#25, #22)', () => {
  assert.deepEqual(raw(new Store(), 'PING;a;b;64'), E.invalidArity);
  assert.deepEqual(raw(new Store(), 'PING;'), E.emptySegment);
});

// ── Control ──────────────────────────────────────────────────────────────────

test('E201 before E301: non-numeric control on an unknown command (#23)', () => {
  assert.deepEqual(raw(new Store(), 'FOO;abc'), E.malformedControl);
});

test('m is not trimmed: " PING;64 " is not PING and "64 " is malformed (#26)', () => {
  assert.deepEqual(raw(new Store(), ' PING;64 '), E.malformedControl);
});

test('E202 before E301: wrong control on an unknown command (#6)', () => {
  assert.deepEqual(raw(new Store(), 'FOO;64'), E.invalidControl);
});

test('E202 before E302: wrong control and wrong arity (#43)', () => {
  assert.deepEqual(raw(new Store(), 'ALTA;Lucia;Gomez;12'), E.invalidControl);
});

test('the control is compared as text: "03" is E202 where "3" is accepted (#45, ex. 4)', () => {
  assert.deepEqual(raw(new Store(), 'ALTA;Mateo;03'), E.invalidControl);
  assert.deepEqual(raw(new Store(), 'ALTA;Mateo;3'), { status: 201, body: { cuentaId: 'AC-0001' } });
});

test('E301 with a valid control; the message keeps its trailing space (#44)', () => {
  assert.deepEqual(raw(new Store(), 'FOO;47'), { status: 400, body: { error: 'E301', mensaje: 'comando desconocido ' } });
});

test('E302 with a valid control (#93, #94, ex. 20)', () => {
  const s = twoAccounts();
  assert.deepEqual(raw(s, 'CONSULTA;AC-0001;x;65'), E.invalidArity);
  assert.deepEqual(raw(s, 'DEPOSITO;AC-0001;4'), E.invalidArity);
  assert.deepEqual(raw(s, 'ALTA;Lucia;Gomez;11'), E.invalidArity);
});

// ── Amounts ──────────────────────────────────────────────────────────────────

for (const amount of ['0', '-5', '+5', '0100', '1.5', 'abc', '10000000000']) {
  test(`amount ${amount} → E303 and the balance does not change (#54–57, #89, #90, #143)`, () => {
    const s = twoAccounts(500);
    assert.deepEqual(msg(s, `DEPOSITO;AC-0001;${amount}`), E.invalidAmount);
    assert.deepEqual(msg(s, `TRANSFER;AC-0001;AC-0002;${amount}`), E.invalidAmount);
    assert.equal(balance(s, 'AC-0001'), 500);
  });
}

test('amount 9999999999 is accepted (#142)', () => {
  const s = twoAccounts();
  assert.deepEqual(msg(s, 'DEPOSITO;AC-0001;9999999999'), received('OP-0001'));
  assert.equal(balance(s, 'AC-0001'), 9999999999);
});

// ── Order of the business checks ─────────────────────────────────────────────

test('E303 before E304: bad amount and same account (#88)', () => {
  assert.deepEqual(msg(twoAccounts(), 'TRANSFER;AC-0001;AC-0001;abc'), E.invalidAmount);
});

test('E303 before E401: bad amount and unknown account (#86)', () => {
  assert.deepEqual(msg(twoAccounts(), 'DEPOSITO;AC-0099;abc'), E.invalidAmount);
});

test('E304 before E401: same account, and it does not exist (#87)', () => {
  assert.deepEqual(msg(twoAccounts(), 'TRANSFER;AC-0099;AC-0099;10'), E.sameAccount);
});

test('E401 for an unknown source or destination; ids are case-sensitive (#65, #66, #52)', () => {
  const s = twoAccounts(100);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0099;AC-0001;10'), E.unknownAccount);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0099;10'), E.unknownAccount);
  assert.deepEqual(msg(s, 'CONSULTA;ac-0001'), E.unknownAccount);
});

test('E303, E304 and E401 before E510 on a locked source (#139, #137, #138)', () => {
  const s = lockedSource(1000000);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;abc'), E.invalidAmount);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0001;10'), E.sameAccount);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0099;10'), E.unknownAccount);
});

test('E510 before E506 and before E507 (#104, #105)', () => {
  const s = lockedSource(50000);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;200000'), accountLocked(1)); // over the limit
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;60000'), accountLocked(2)); // over the balance
});

test('E506 before E507: over the limit with balance 0 (#108)', () => {
  assert.deepEqual(msg(twoAccounts(), 'TRANSFER;AC-0001;AC-0002;475000'), E.limitExceeded);
});

test('E507 when the amount is within the limit and over the balance (#77)', () => {
  assert.deepEqual(msg(twoAccounts(49999), 'TRANSFER;AC-0001;AC-0002;50000'), E.insufficientFunds);
});

// ── Limit and lock ───────────────────────────────────────────────────────────

test('v2: the transfer limit is inclusive at 50000: 50000 OK, 50001 → E506 (#818, #560)', () => {
  const s = twoAccounts(5300000);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;50001'), E.limitExceeded);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;50000'), received('OP-0002'));
  assert.equal(balance(s, 'AC-0001'), 5250000);
  assert.equal(balance(s, 'AC-0002'), 50000);
});

test('v2: 100000 is now over the limit (#559; it was accepted in v1, #75)', () => {
  assert.deepEqual(msg(twoAccounts(200000), 'TRANSFER;AC-0001;AC-0002;100000'), E.limitExceeded);
});

test('three consecutive E506 lock the source, even for a valid amount (#131–134)', () => {
  const s = lockedSource(1000000);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;10'), accountLocked(1));
  assert.equal(balance(s, 'AC-0001'), 1000000); // rejections moved nothing (#106)
});

test('a successful transfer resets the count: three non-consecutive E506 do not lock (#127–130)', () => {
  const s = twoAccounts(1000000);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;100001'), E.limitExceeded);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;100001'), E.limitExceeded);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;50'), received('OP-0002'));
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;100001'), E.limitExceeded);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;50'), received('OP-0003'));
});

test('E507 also counts toward the lock: E506, E506, E507 → the next transfer is E510 (#149–153)', () => {
  // Amounts adapted to the v2 limit: 30000 is within the limit and over the balance, so it is an E507.
  const s = twoAccounts(20000);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;100001'), E.limitExceeded);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;100001'), E.limitExceeded);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;30000'), E.insufficientFunds);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;100001'), accountLocked(1)); // #152
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;10'), accountLocked(2)); // #153: even a valid amount
  assert.equal(balance(s, 'AC-0001'), 20000);
});

test('E302 before E303 and before E401: wrong arity with a bad amount or an unknown account (#154, #155)', () => {
  const s = twoAccounts();
  assert.deepEqual(raw(s, 'DEPOSITO;AC-0001;abc;x;62'), E.invalidArity);
  assert.deepEqual(raw(s, 'CONSULTA;AC-0099;x;56'), E.invalidArity);
});

test('a locked account still receives deposits and transfers (#135, #136)', () => {
  const s = lockedSource(1000);
  ok(s, 'DEPOSITO;AC-0002;500');
  assert.deepEqual(msg(s, 'DEPOSITO;AC-0001;10'), received('OP-0003'));
  assert.deepEqual(msg(s, 'TRANSFER;AC-0002;AC-0001;10'), received('OP-0004'));
  assert.equal(balance(s, 'AC-0001'), 1020);
});

test('CONSULTA works on a locked account and does not show the lock (#106)', () => {
  assert.deepEqual(msg(lockedSource(1000), 'CONSULTA;AC-0001'), { status: 200, body: { cuenta_id: 'AC-0001', saldo: '10.00' } });
});

// ── Deposit and the lock counter ─────────────────────────────────────────────

test('a successful deposit resets the rejection count: E506, E506, DEPOSITO, E506, then a small transfer is OK (#175–179)', () => {
  const s = twoAccounts(1000);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;100001'), E.limitExceeded);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;100001'), E.limitExceeded);
  assert.deepEqual(msg(s, 'DEPOSITO;AC-0001;1'), received('OP-0002'));
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;100001'), E.limitExceeded); // 1st again, not the 3rd
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;1'), received('OP-0003'));
});

test('a successful deposit lifts an existing lock: 3× E506, E510, DEPOSITO, then a valid transfer is OK (#272–281)', () => {
  const s = lockedSource(500000);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;100'), accountLocked(1)); // #278, v2 #681
  assert.deepEqual(msg(s, 'DEPOSITO;AC-0001;100'), received('OP-0002')); // #279
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;100'), received('OP-0003')); // #280
  assert.equal(balance(s, 'AC-0001'), 500000); // #281
});

test('three consecutive E507 alone lock the source (#168–171)', () => {
  const s = twoAccounts(1000);
  for (let i = 0; i < 3; i++) assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;5000'), E.insufficientFunds);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;10'), accountLocked(1)); // v2 #655
});

test('E302 before E304: wrong arity with the same account (#173)', () => {
  assert.deepEqual(raw(twoAccounts(), 'TRANSFER;AC-0001;AC-0001;10;x;89'), E.invalidArity);
});

// ── v2 (incident FR-0153): locked response, balance format ───────────────────

test('v2: a locked source answers 423 E510 with "intentos" counting 1, 2, 3, 4, whatever the amount (#586–589)', () => {
  const s = lockedSource(1000000);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;150000'), logged(586));
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;100000'), logged(587));
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;200000'), logged(588));
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;60000'), logged(589));
  assert.deepEqual(logged(589), { status: 423, body: { error: 'E510', mensaje: 'cuenta bloqueada', intentos: 4 } });
});

test('v2: the three E506 that lock the account do not count as "intentos": the first attempt is 1 (#827–831)', () => {
  const s = twoAccounts(100000000);
  for (let i = 0; i < 3; i++) assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;99999999'), E.limitExceeded);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;10'), logged(830));
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;10'), logged(831));
});

test('v2: a deposit still lifts the lock (#832, #833); after a new lock "intentos" starts at 1 again (assumed, not probed)', () => {
  const s = lockedSource(1000);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;10'), accountLocked(1));
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;10'), accountLocked(2));
  assert.deepEqual(msg(s, 'DEPOSITO;AC-0001;10'), received('OP-0002'));
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;10'), received('OP-0003'));
  for (let i = 0; i < 3; i++) assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;100001'), E.limitExceeded);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;10'), accountLocked(1));
});

test('v2: E303, E304 and E401 on a locked source do not count as "intentos" (assumed, not probed in v2)', () => {
  const s = lockedSource(1000);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;abc'), E.invalidAmount);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0001;10'), E.sameAccount);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0099;10'), E.unknownAccount);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;10'), accountLocked(1));
});

test('v2: HALT keeps status 409 (#259, unchanged in v2: #802)', () => {
  assert.equal(raw(twoAccounts(), 'HALT;AC-0001;82').status, 409);
  assert.deepEqual(logged(802), logged(259));
});

test('v2: CONSULTA returns "saldo" as a string with 2 decimals: a new account is "0.00" (#596)', () => {
  const s = twoAccounts();
  assert.deepEqual(msg(s, 'CONSULTA;AC-0002'), logged(596));
  assert.deepEqual(logged(596).body, { cuenta_id: 'AC-0002', saldo: '0.00' });
});

test('v2: the s14 sequence gives "860.40" and "999139.60" (#815–834)', () => {
  const s = twoAccounts(100000000);
  for (const amount of [50000, 10, 25000, 10, 10000, 10, 1000, 10]) ok(s, `TRANSFER;AC-0001;AC-0002;${amount}`);
  assert.deepEqual(msg(s, 'CONSULTA;AC-0002'), logged(826));
  assert.equal(saldo(s, 'AC-0002'), '860.40');
  for (let i = 0; i < 3; i++) assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;99999999'), E.limitExceeded);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;10'), logged(830));
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;10'), logged(831));
  ok(s, 'DEPOSITO;AC-0001;10');
  ok(s, 'TRANSFER;AC-0001;AC-0002;10');
  assert.deepEqual(msg(s, 'CONSULTA;AC-0001'), logged(834));
  assert.equal(saldo(s, 'AC-0001'), '999139.60');
});

test('v2: balances under 100 keep two decimals: 10 → "0.10" (#625), 5 → "0.05"', () => {
  const s = twoAccounts(10);
  assert.equal(saldo(s, 'AC-0001'), '0.10');
  ok(s, 'TRANSFER;AC-0001;AC-0002;5');
  assert.equal(saldo(s, 'AC-0001'), '0.05');
});

test('v2: a negative balance is written with a leading minus: "-1.00" (assumed, no negative balance was seen in v2)', () => {
  const s = twoAccounts(100);
  ok(s, 'TRANSFER;AC-0001;AC-0002;100');
  ok(s, 'ANULA;OP-0001');
  assert.equal(saldo(s, 'AC-0001'), '-1.00');
});

// ── NOTAS and HALT ───────────────────────────────────────────────────────────

test('NOTAS with no arguments returns the note exactly as the original did (#255)', () => {
  assert.deepEqual(raw(new Store(), 'NOTAS;11'), logged(255));
});

test('NOTAS does not depend on the state (#261, #263)', () => {
  const s = twoAccounts(500);
  assert.deepEqual(msg(s, 'NOTAS'), logged(263));
  assert.deepEqual(msg(s, 'notas'), logged(261));
});

test('NOTAS with an argument is E302 (#256, #257)', () => {
  const s = twoAccounts();
  assert.deepEqual(raw(s, 'NOTAS;AC-0001;14'), E.invalidArity);
  assert.deepEqual(raw(s, 'NOTAS;AC-0001;hola;68'), E.invalidArity);
});

test('HALT with one argument is the E520 guard, exactly as the original (#259)', () => {
  assert.deepEqual(raw(twoAccounts(), 'HALT;AC-0001;82'), logged(259));
  assert.deepEqual(logged(259), E.haltGuard);
});

test('HALT with no argument or with two is E302 (#258, #264)', () => {
  const s = twoAccounts();
  assert.deepEqual(raw(s, 'HALT;71'), E.invalidArity);
  assert.deepEqual(raw(s, 'HALT;AC-0001;CONFIRM;9'), E.invalidArity);
});

test('resending HALT does not confirm it, and the service keeps answering (#269–271)', () => {
  const s = twoAccounts(100);
  assert.deepEqual(raw(s, 'HALT;AC-0001;82'), E.haltGuard);
  assert.deepEqual(raw(s, 'HALT;AC-0001;82'), E.haltGuard);
  assert.deepEqual(raw(s, 'PING;1'), { status: 200, body: { pong: true } });
  assert.equal(balance(s, 'AC-0001'), 100);
});

// ── E301 sugerencia ──────────────────────────────────────────────────────────

test('E301 suggests ALTA for ALTO: distance 1 (#252)', () => {
  assert.deepEqual(raw(new Store(), 'ALTO;50'), logged(252));
  assert.deepEqual(logged(252).body, { error: 'E301', mensaje: 'comando desconocido ', sugerencia: 'ALTA' });
});

test('E301 suggests HALT for HELP: distance 2 (#201)', () => {
  assert.deepEqual(raw(new Store(), 'HELP;72'), logged(201));
  assert.deepEqual(logged(201).body, { error: 'E301', mensaje: 'comando desconocido ', sugerencia: 'HALT' });
});

test('E301 has no sugerencia at distance 3 or more: SALDO, DEBITO, QX (#182, #218, #230)', () => {
  for (const [m, id] of [['SALDO;38', 182], ['DEBITO;4', 218], ['QX;67', 230]] as const) {
    assert.deepEqual(raw(new Store(), m), E.unknownCommand, m);
    assert.deepEqual(logged(id), E.unknownCommand, m);
  }
});

// ── ANULA ────────────────────────────────────────────────────────────────────

test('ANULA is idempotent: the second call answers ok:false (#67, #84)', () => {
  const s = twoAccounts(5000);
  assert.deepEqual(msg(s, 'ANULA;OP-0001'), { status: 200, body: { ok: true, anulada: 'OP-0001' } });
  assert.deepEqual(msg(s, 'ANULA;OP-0001'), { status: 200, body: { ok: false, motivo: 'ya anulada' } });
  assert.equal(balance(s, 'AC-0001'), 0); // reverted once, not twice
});

test('ANULA of a transfer returns the amount to the source and takes it from the destination (#80–82)', () => {
  const s = twoAccounts(1000);
  ok(s, 'TRANSFER;AC-0001;AC-0002;400');
  ok(s, 'ANULA;OP-0002');
  assert.equal(balance(s, 'AC-0001'), 1000);
  assert.equal(balance(s, 'AC-0002'), 0);
});

test('ANULA can leave a negative balance (#141)', () => {
  const s = twoAccounts(100);
  ok(s, 'TRANSFER;AC-0001;AC-0002;100');
  ok(s, 'ANULA;OP-0001'); // reverse the deposit after the money left
  assert.equal(balance(s, 'AC-0001'), -100);
});

test('ANULA works on operations of a locked account (#114, #140)', () => {
  assert.deepEqual(msg(lockedSource(1000), 'ANULA;OP-0001'), { status: 200, body: { ok: true, anulada: 'OP-0001' } });
});

test('E402 for an unknown operation; ids are case-sensitive (#69, #83)', () => {
  const s = twoAccounts(100);
  assert.deepEqual(msg(s, 'ANULA;OP-9999'), E.unknownOperation);
  assert.deepEqual(msg(s, 'ANULA;op-0001'), E.unknownOperation);
});

// ── Ids ──────────────────────────────────────────────────────────────────────

test('ALTA ids are sequential and names are not unique (#46, #47)', () => {
  const s = new Store();
  assert.deepEqual(msg(s, 'ALTA;Ana'), { status: 201, body: { cuentaId: 'AC-0001' } });
  assert.deepEqual(msg(s, 'ALTA;Ana'), { status: 201, body: { cuentaId: 'AC-0002' } });
});

test('failed operations do not consume ids, and ANULA creates none (#59, #85, #111)', () => {
  const s = twoAccounts();
  assert.deepEqual(msg(s, 'DEPOSITO;AC-0001;0'), E.invalidAmount);
  assert.deepEqual(msg(s, 'DEPOSITO;AC-0099;100'), E.unknownAccount);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;100001'), E.limitExceeded);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;50'), E.insufficientFunds);
  assert.deepEqual(msg(s, 'DEPOSITO;AC-0001;1000'), received('OP-0001'));
  ok(s, 'ANULA;OP-0001');
  assert.deepEqual(msg(s, 'ANULA;OP-0002'), E.unknownOperation);
  assert.deepEqual(msg(s, 'DEPOSITO;AC-0001;1000'), received('OP-0002'));
});

test('a new Store starts the ids again, as after __reset (#71)', () => {
  ok(twoAccounts(), 'ALTA;C');
  assert.deepEqual(msg(new Store(), 'ALTA;A'), { status: 201, body: { cuentaId: 'AC-0001' } });
});
