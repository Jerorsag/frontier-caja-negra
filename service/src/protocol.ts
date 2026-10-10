// POST /msg: an ordered pipeline. The first failing check wins, so ORDER IS CONTRACT.
// Each step cites the spec section; experiment ids are in docs/especificacion.md.
import { control } from './control.js';
import { config } from './config.js';
import { E, type Reply } from './errors.js';
import type { Account, Store } from './store.js';

const ARITY: Record<string, number> = { ALTA: 1, CONSULTA: 1, DEPOSITO: 2, TRANSFER: 3, ANULA: 1 };

export function handleMessage(rawBody: string, store: Store): Reply {
  // 1. Body must be JSON (E100), an object with a string m (E102).
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return E.invalidJson;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return E.missingM;
  const m = (parsed as Record<string, unknown>).m;
  if (typeof m !== 'string') return E.missingM;

  // 2. Segments: at least one ';' (E103), none empty (E104). No trimming.
  if (!m.includes(';')) return E.missingControl;
  const segments = m.split(';');
  if (segments.some((s) => s === '')) return E.emptySegment;

  const command = segments[0]!.toUpperCase();

  // 3. PING short-circuits: no checksum at all, only arity (PING;<anything>).
  if (command === 'PING') {
    return segments.length === 2 ? { status: 200, body: { pong: true } } : E.invalidArity;
  }

  // 4. Checksum: digits only (E201), exact text match (E202, "03" != "3").
  const ctrl = segments[segments.length - 1]!;
  if (!/^[0-9]+$/.test(ctrl)) return E.malformedControl;
  if (String(control(segments.slice(0, -1).join(';'))) !== ctrl) return E.invalidControl;

  // 5. Command (E301) and arity (E302).
  const arity = ARITY[command];
  if (arity === undefined) return E.unknownCommand;
  const args = segments.slice(1, -1);
  if (args.length !== arity) return E.invalidArity;

  switch (command) {
    case 'ALTA':
      return alta(store, args[0]!);
    case 'CONSULTA':
      return consulta(store, args[0]!);
    case 'DEPOSITO':
      return deposito(store, args[0]!, args[1]!);
    case 'TRANSFER':
      return transfer(store, args[0]!, args[1]!, args[2]!);
    default:
      return anula(store, args[0]!);
  }
}

/** Known command name of a body, for the request log only. Never returns free text from the message. */
export function commandOf(rawBody: string): string | undefined {
  try {
    const m = (JSON.parse(rawBody) as { m?: unknown } | null)?.m;
    if (typeof m !== 'string') return undefined;
    const command = m.split(';')[0]!.toUpperCase();
    return command === 'PING' || ARITY[command] !== undefined ? command : undefined;
  } catch {
    return undefined; // not JSON: handleMessage already answered E100
  }
}

/** Positive integer, no sign, no leading zero, at most N digits. */
function parseAmount(raw: string): number | null {
  const re = new RegExp(`^[1-9][0-9]{0,${config.maxAmountDigits - 1}}$`);
  return re.test(raw) ? Number(raw) : null;
}

function alta(store: Store, name: string): Reply {
  const id = store.nextAccountId();
  store.accounts.set(id, { id, name, balance: 0, consecutiveRejections: 0, locked: false });
  return { status: 201, body: { cuentaId: id } };
}

function consulta(store: Store, id: string): Reply {
  const acc = store.accounts.get(id);
  if (!acc) return E.unknownAccount;
  return { status: 200, body: { cuenta_id: acc.id, saldo: acc.balance } };
}

function deposito(store: Store, id: string, rawAmount: string): Reply {
  const amount = parseAmount(rawAmount);
  if (amount === null) return E.invalidAmount;
  const acc = store.accounts.get(id);
  if (!acc) return E.unknownAccount;
  acc.balance += amount; // allowed on locked accounts
  const opId = store.nextOperationId();
  store.operations.set(opId, { id: opId, kind: 'DEPOSITO', account: id, amount, reversed: false });
  return received(opId);
}

function transfer(store: Store, fromId: string, toId: string, rawAmount: string): Reply {
  const amount = parseAmount(rawAmount);
  if (amount === null) return E.invalidAmount; // E303 before E304
  if (fromId === toId) return E.sameAccount; // E304 before E401
  const from = store.accounts.get(fromId);
  const to = store.accounts.get(toId);
  if (!from || !to) return E.unknownAccount;
  if (from.locked) return E.accountLocked; // E510 before E506 / E507
  if (amount > config.transferLimit) {
    registerRejection(from);
    return E.limitExceeded; // E506 before E507
  }
  if (amount > from.balance) {
    registerRejection(from); // exp. 151-152: insufficient funds also counts toward the lock
    return E.insufficientFunds;
  }
  from.balance -= amount;
  to.balance += amount;
  from.consecutiveRejections = 0; // a successful transfer resets the counter
  const opId = store.nextOperationId();
  store.operations.set(opId, { id: opId, kind: 'TRANSFER', from: fromId, to: toId, amount, reversed: false });
  return received(opId);
}

/** Rejected transfers (limit or funds) count toward the lock; a successful transfer resets the count. */
function registerRejection(account: Account): void {
  account.consecutiveRejections += 1;
  if (account.consecutiveRejections >= config.lockAfter) account.locked = true;
}

function anula(store: Store, opId: string): Reply {
  const op = store.operations.get(opId);
  if (!op) return E.unknownOperation;
  if (op.reversed) return { status: 200, body: { ok: false, motivo: 'ya anulada' } };
  op.reversed = true;
  // Reversals ignore balances: they may leave an account negative.
  if (op.kind === 'DEPOSITO') {
    store.accounts.get(op.account)!.balance -= op.amount;
  } else {
    store.accounts.get(op.from)!.balance += op.amount;
    store.accounts.get(op.to)!.balance -= op.amount;
  }
  return { status: 200, body: { ok: true, anulada: opId } };
}

const received = (opId: string): Reply => ({ status: 200, body: { status: 'recieved', operacionId: opId } }); // typo is in the original
