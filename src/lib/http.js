import { SUPABASE_FUNCTIONS_URL } from './supabase.js';
import { rmGetAdminSession, rmClearAdminSession } from './session.js';

export async function rmAdminApi(path, options = {}) {
  const session = rmGetAdminSession();
  const headers = {
    'Content-Type': 'application/json',
    ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    ...(options.headers || {}),
  };
  const response = await fetch(`${SUPABASE_FUNCTIONS_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) rmClearAdminSession();
    throw new Error(payload?.error || 'Richiesta admin fallita');
  }
  return payload;
}
