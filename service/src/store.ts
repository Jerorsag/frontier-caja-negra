// In-memory state for one token. __reset replaces it with a fresh instance.
export interface Account {
  id: string;
  name: string;
  balance: number;
  consecutiveRejections: number;
  locked: boolean;
  lockedAttempts: number; // transfers attempted while locked: the "intentos" of E510 (v2)
}

export type Operation =
  | { id: string; kind: 'DEPOSITO'; account: string; amount: number; reversed: boolean }
  | { id: string; kind: 'TRANSFER'; from: string; to: string; amount: number; reversed: boolean };

export class Store {
  accounts = new Map<string, Account>();
  operations = new Map<string, Operation>();
  private accountSeq = 0;
  private operationSeq = 0;

  nextAccountId(): string {
    return `AC-${String(++this.accountSeq).padStart(4, '0')}`;
  }

  nextOperationId(): string {
    return `OP-${String(++this.operationSeq).padStart(4, '0')}`;
  }
}

/** Per-token session: business state (reset by __reset) + X-Req counter (NOT reset). */
export interface Session {
  store: Store;
  requestCount: number;
}
