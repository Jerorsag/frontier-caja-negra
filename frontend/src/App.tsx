import { api } from './api';
import { useApi } from './useApi';

interface Health {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
  timestamp: string;
}

/**
 * Starter screen: shows API health and demonstrates the state pattern
 * (loading / error / success) every data view should follow.
 * Replace with the challenge's screens.
 */
export default function App() {
  const { state, reload } = useApi(() => api<Health>('/health'));

  return (
    <main className="container">
      <header>
        <h1>Frontier App</h1>
        <p className="muted">Replace this screen with the challenge UI.</p>
      </header>

      <section className="card" aria-live="polite">
        <h2>API status</h2>
        {state.status === 'loading' && <p>Loading…</p>}
        {state.status === 'error' && (
          <p className="error" role="alert">
            Could not reach the API: {state.message}
          </p>
        )}
        {state.status === 'success' && (
          <dl>
            <dt>Status</dt>
            <dd className={state.data.status === 'ok' ? 'ok' : 'error'}>
              {state.data.status}
            </dd>
            <dt>Database</dt>
            <dd>{state.data.database}</dd>
            <dt>Checked at</dt>
            <dd>{new Date(state.data.timestamp).toLocaleTimeString()}</dd>
          </dl>
        )}
        <button type="button" onClick={reload}>
          Refresh
        </button>
      </section>
    </main>
  );
}
