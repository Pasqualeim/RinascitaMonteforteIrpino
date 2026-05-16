import { RM_ADMIN_SESSION_KEY } from '../domain.js';

export function rmGetAdminSession() {
  try {
    const raw = sessionStorage.getItem(RM_ADMIN_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    const expiresAt = new Date(session?.expires_at || 0).getTime();
    if (!session?.token || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      sessionStorage.removeItem(RM_ADMIN_SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function rmSetAdminSession(session) {
  if (!session?.token || !session?.expires_at) throw new Error('Sessione admin non valida');
  sessionStorage.setItem(RM_ADMIN_SESSION_KEY, JSON.stringify({
    token: session.token,
    expires_at: session.expires_at,
    user: session.user || null,
  }));
  return rmGetAdminSession();
}

export function rmClearAdminSession() {
  try { sessionStorage.removeItem(RM_ADMIN_SESSION_KEY); } catch {}
}

export function rmHasAdminSession() {
  return !!rmGetAdminSession();
}

export function rmIsAdminSessionErrorMessage(message) {
  return /sessione admin assente|sessione non valida|sessione scaduta|utente disattivato/i.test(String(message || ''));
}
