import { rmAdminApi } from './http.js';
import { rmSetAdminSession, rmGetAdminSession, rmHasAdminSession, rmClearAdminSession } from './session.js';

export async function rmAdminLogin(username, password) {
  const payload = await rmAdminApi('/login', {
    method: 'POST',
    body: { username: String(username || '').trim(), password: String(password || '') },
  });
  return rmSetAdminSession(payload.session);
}

export async function rmAdminMe() {
  const payload = await rmAdminApi('/me');
  const current = rmGetAdminSession();
  if (current) rmSetAdminSession({ ...current, user: payload.user });
  return payload;
}

export async function rmAdminLogout() {
  try {
    if (rmHasAdminSession()) await rmAdminApi('/logout', { method: 'POST' });
  } finally {
    rmClearAdminSession();
  }
}

export async function rmAdminUpdateCredentials({ username, password }) {
  const payload = await rmAdminApi('/credentials', {
    method: 'POST',
    body: { username: String(username || '').trim(), password: password ? String(password) : undefined },
  });
  const current = rmGetAdminSession();
  if (current) rmSetAdminSession({ ...current, user: payload.user });
  return payload;
}
