// Every error the original returns: status + exact body. Names are the spec IDs.
export interface Reply {
  status: number;
  body: unknown;
}

const err = (status: number, error: string, mensaje: string): Reply => ({ status, body: { error, mensaje } });

export const E = {
  unauthorized: err(401, 'E001', 'no autorizado'),
  unknownRoute: err(404, 'E404', 'ruta desconocida'),
  invalidJson: err(400, 'E100', 'json inválido'),
  missingM: err(400, 'E102', 'falta m'),
  missingControl: err(400, 'E103', 'falta control'),
  emptySegment: err(400, 'E104', 'segmento vacío'),
  malformedControl: err(400, 'E201', 'control mal formado'),
  invalidControl: err(400, 'E202', 'control inválido'),
  unknownCommand: err(400, 'E301', 'comando desconocido '), // trailing space is in the original
  invalidArity: err(400, 'E302', 'aridad inválida'),
  invalidAmount: err(400, 'E303', 'monto inválido'),
  sameAccount: err(400, 'E304', 'origen y destino iguales'),
  unknownAccount: err(404, 'E401', 'cuenta inexistente'),
  unknownOperation: err(404, 'E402', 'operación inexistente'),
  limitExceeded: err(422, 'E506', 'límite excedido'),
  insufficientFunds: err(422, 'E507', 'saldo insuficiente'),
  accountLocked: err(409, 'E510', 'cuenta bloqueada'),
} as const;
