// Protocol tests: handleMessage is called directly, no HTTP.
// Expected answers are the original's; #N is the experiment id in experimentos.jsonl that shows it.
import assert from 'node:assert/strict';
import test from 'node:test';
import { control } from './control.js';
import { E, type Reply } from './errors.js';
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
const balance = (store: Store, id: string): number => (ok(store, `CONSULTA;${id}`).body as { saldo: number }).saldo;
const received = (opId: string): Reply => ({ status: 200, body: { status: 'recieved', operacionId: opId } });

/** AC-0001 and AC-0002, with an optional deposit (OP-0001) into AC-0001. */
function twoAccounts(deposit?: number): Store {
  const store = new Store();
  ok(store, 'ALTA;A');
  ok(store, 'ALTA;B');
  if (deposit !== undefined) ok(store, `DEPOSITO;AC-0001;${deposit}`);
  return store;
}

/** Three consecutive E506 from AC-0001 → locked. */
function lockedSource(deposit?: number): Store {
  const store = twoAccounts(deposit);
  for (let i = 0; i < 3; i++) assert.deepEqual(msg(store, 'TRANSFER;AC-0001;AC-0002;100001'), E.limitExceeded);
  return store;
}

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
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;200000'), E.accountLocked); // over the limit
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;60000'), E.accountLocked); // over the balance
});

test('E506 before E507: over the limit with balance 0 (#108)', () => {
  assert.deepEqual(msg(twoAccounts(), 'TRANSFER;AC-0001;AC-0002;475000'), E.limitExceeded);
});

test('E507 when the amount is within the limit and over the balance (#77)', () => {
  assert.deepEqual(msg(twoAccounts(49999), 'TRANSFER;AC-0001;AC-0002;50000'), E.insufficientFunds);
});

// ── Limit and lock ───────────────────────────────────────────────────────────

test('the transfer limit is inclusive at 100000 (#125, #126)', () => {
  const s = twoAccounts(5300000);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;100001'), E.limitExceeded);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;100000'), received('OP-0002'));
  assert.equal(balance(s, 'AC-0001'), 5200000);
  assert.equal(balance(s, 'AC-0002'), 100000);
});

test('three consecutive E506 lock the source, even for a valid amount (#131–134)', () => {
  const s = lockedSource(1000000);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;10'), E.accountLocked);
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
  const s = twoAccounts(50000);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;100001'), E.limitExceeded);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;100001'), E.limitExceeded);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;60000'), E.insufficientFunds);
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;100001'), E.accountLocked); // #152
  assert.deepEqual(msg(s, 'TRANSFER;AC-0001;AC-0002;10'), E.accountLocked); // #153: even a valid amount
  assert.equal(balance(s, 'AC-0001'), 50000);
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
  assert.deepEqual(msg(lockedSource(1000), 'CONSULTA;AC-0001'), { status: 200, body: { cuenta_id: 'AC-0001', saldo: 1000 } });
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
