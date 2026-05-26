import { SUPABASE_FUNCTIONS_URL } from './supabase.js';
import { rmGetAdminSession, rmClearAdminSession } from './session.js';

const REQUEST_TIMEOUT_MS = 15000;

export async function rmAdminApi(path, options = {}) {
  const session = rmGetAdminSession();
  const headers = {
    'Content-Type': 'application/json',
    ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    ...(options.headers || {}),
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${SUPABASE_FUNCTIONS_URL}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Richiesta scaduta. Controlla la connessione e riprova.', { cause: err });
    throw new Error('Errore di rete. Controlla la connessione e riprova.', { cause: err });
  } finally {
    clearTimeout(timer);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) rmClearAdminSession();
    throw new Error(payload?.error || 'Richiesta admin fallita');
  }
  return payload;
}
