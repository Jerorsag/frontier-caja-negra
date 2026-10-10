// HTTP layer with plain node:http: we control every byte of every response,
// including unknown routes and malformed bodies (frameworks would add their own).
import http from 'node:http';
import { config } from './config.js';
import { E, type Reply } from './errors.js';
import { commandOf, handleMessage } from './protocol.js';
import { Store, type Session } from './store.js';

const sessions = new Map<string, Session>();
const session = (token: string): Session => {
  let s = sessions.get(token);
  if (!s) {
    s = { store: new Store(), requestCount: 0 };
    sessions.set(token, s);
  }
  return s;
};

const ROUTES = new Set(['POST /msg', 'GET /health', 'POST /__reset']);

function tokenOf(req: http.IncomingMessage): string | null {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return null;
  const t = h.slice('Bearer '.length);
  return config.teamToken && t === config.teamToken ? t : null;
}

function send(res: http.ServerResponse, reply: Reply, headers: Record<string, string> = {}): void {
  const body = JSON.stringify(reply.body);
  res.writeHead(reply.status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(body);
}

/** One JSON line per request. Never the token or the message body: only a known command name. */
function logRequest(route: string, reply: Reply, startedAt: number, command?: string): void {
  const error = (reply.body as { error?: unknown } | null)?.error;
  console.log(JSON.stringify({
    msg: 'request',
    route,
    ...(command ? { command } : {}),
    status: reply.status,
    ...(typeof error === 'string' ? { error } : {}),
    ms: Math.round((performance.now() - startedAt) * 100) / 100,
  }));
}

const server = http.createServer((req, res) => {
  const startedAt = performance.now(); // for the log only; no rule depends on time
  const chunks: Buffer[] = [];
  req.on('data', (c: Buffer) => chunks.push(c));
  req.on('end', () => {
    const path = (req.url ?? '/').split('?')[0]; // assumed: query string ignored
    const route = `${req.method} ${path}`;
    const respond = (reply: Reply, headers?: Record<string, string>, command?: string): void => {
      send(res, reply, headers);
      logRequest(route.slice(0, 200), reply, startedAt, command);
    };

    // Order observed: unknown route (404) before auth (401).
    if (!ROUTES.has(route)) return respond(E.unknownRoute);
    const token = tokenOf(req);
    if (!token) return respond(E.unauthorized);

    const s = session(token);
    if (route === 'GET /health') return respond({ status: 200, body: { ok: true } });
    if (route === 'POST /__reset') {
      s.store = new Store(); // X-Req counter survives a reset (observed)
      return respond({ status: 200, body: { ok: true } });
    }

    s.requestCount += 1;
    const rawBody = Buffer.concat(chunks).toString('utf8');
    const reply = handleMessage(rawBody, s.store);
    respond(reply, { 'X-Req': String(s.requestCount) }, commandOf(rawBody));
  });
});

server.listen(config.port, () => {
  console.log(JSON.stringify({ msg: 'listening', port: config.port, tokenConfigured: Boolean(config.teamToken) }));
});
