import { createClient } from '@supabase/supabase-js';
import {
  RM_ADMIN_SESSION_KEY,
  rmHydrateTournamentData,
  rmNormalizeTournamentData,
} from './domain.js';

// ── Defaults ─────────────────────────────────────────────────
export const DEFAULT_NATIONS_2026 = [
  // Paesi ospitanti
  { name: 'USA',           flag: '🇺🇸', short: 'USA' },
  { name: 'Canada',        flag: '🇨🇦', short: 'CAN' },
  { name: 'Messico',       flag: '🇲🇽', short: 'MEX' },
  // CONMEBOL
  { name: 'Argentina',     flag: '🇦🇷', short: 'ARG' },
  { name: 'Brasile',       flag: '🇧🇷', short: 'BRA' },
  { name: 'Colombia',      flag: '🇨🇴', short: 'COL' },
  { name: 'Uruguay',       flag: '🇺🇾', short: 'URU' },
  { name: 'Ecuador',       flag: '🇪🇨', short: 'ECU' },
  { name: 'Venezuela',     flag: '🇻🇪', short: 'VEN' },
  // UEFA
  { name: 'Germania',      flag: '🇩🇪', short: 'GER' },
  { name: 'Inghilterra',   flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', short: 'ENG' },
  { name: 'Francia',       flag: '🇫🇷', short: 'FRA' },
  { name: 'Spagna',        flag: '🇪🇸', short: 'ESP' },
  { name: 'Portogallo',    flag: '🇵🇹', short: 'POR' },
  { name: 'Olanda',        flag: '🇳🇱', short: 'NED' },
  { name: 'Croazia',       flag: '🇭🇷', short: 'CRO' },
  { name: 'Austria',       flag: '🇦🇹', short: 'AUT' },
  { name: 'Svizzera',      flag: '🇨🇭', short: 'SUI' },
  { name: 'Ungheria',      flag: '🇭🇺', short: 'HUN' },
  { name: 'Serbia',        flag: '🇷🇸', short: 'SRB' },
  { name: 'Danimarca',     flag: '🇩🇰', short: 'DEN' },
  { name: 'Scozia',        flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', short: 'SCO' },
  { name: 'Albania',       flag: '🇦🇱', short: 'ALB' },
  { name: 'Ucraina',       flag: '🇺🇦', short: 'UKR' },
  { name: 'Italia',        flag: '🇮🇹', short: 'ITA' },
  // AFC
  { name: 'Giappone',      flag: '🇯🇵', short: 'JPN' },
  { name: 'Corea del Sud', flag: '🇰🇷', short: 'KOR' },
  { name: 'Iran',          flag: '🇮🇷', short: 'IRN' },
  { name: 'Australia',     flag: '🇦🇺', short: 'AUS' },
  { name: 'Arabia Saudita',flag: '🇸🇦', short: 'KSA' },
  { name: 'Qatar',         flag: '🇶🇦', short: 'QAT' },
  { name: 'Uzbekistan',    flag: '🇺🇿', short: 'UZB' },
  { name: 'Giordania',     flag: '🇯🇴', short: 'JOR' },
  // CAF
  { name: 'Marocco',       flag: '🇲🇦', short: 'MAR' },
  { name: 'Nigeria',       flag: '🇳🇬', short: 'NGA' },
  { name: 'Senegal',       flag: '🇸🇳', short: 'SEN' },
  { name: 'Sud Africa',    flag: '🇿🇦', short: 'RSA' },
  { name: 'Egitto',        flag: '🇪🇬', short: 'EGY' },
  { name: 'Ghana',         flag: '🇬🇭', short: 'GHA' },
  { name: "Costa d'Avorio",flag: '🇨🇮', short: 'CIV' },
  { name: 'Camerun',       flag: '🇨🇲', short: 'CMR' },
  { name: 'Tunisia',       flag: '🇹🇳', short: 'TUN' },
  // CONCACAF (non-ospitanti)
  { name: 'Panama',        flag: '🇵🇦', short: 'PAN' },
  { name: 'Costa Rica',    flag: '🇨🇷', short: 'CRC' },
  { name: 'Jamaica',       flag: '🇯🇲', short: 'JAM' },
  { name: 'Honduras',      flag: '🇭🇳', short: 'HON' },
  { name: 'El Salvador',   flag: '🇸🇻', short: 'SLV' },
  // OFC
  { name: 'Nuova Zelanda', flag: '🇳🇿', short: 'NZL' },
];

export const DEFAULT_TEAMS            = [];
export const DEFAULT_GROUPS           = [];
export const DEFAULT_STANDINGS_GROUPS = [];
export const DEFAULT_LIVE_MATCH       = { active: false, home: null, away: null, hs: 0, as: 0, minute: 0, pitch: '', events: [] };
export const DEFAULT_MATCHES_TODAY    = [];
export const DEFAULT_MATCHES_GIORNATA = [];
export const DEFAULT_SCORERS          = [];
export const DEFAULT_NEWS             = [];
export const DEFAULT_EVENTS           = [];
export const DEFAULT_HONORS           = [];
export const DEFAULT_SPONSORS         = [];
export const DEFAULT_STRIP_ITEMS      = [];

// ── Config ───────────────────────────────────────────────────
export const RM_STORAGE_KEY = 'rm_data_v2';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_ADMIN_API_URL;

const _supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// ── Session helpers ──────────────────────────────────────────
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

// ── Admin API ────────────────────────────────────────────────
async function rmAdminApi(path, options = {}) {
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

// ── Data persistence ─────────────────────────────────────────
function rmIsAdminPage() {
  try {
    const href = String(window.location.href || '').toLowerCase();
    return href.includes('/admin.html') || href.endsWith('admin.html') || href.includes('admin.html#');
  } catch {
    return false;
  }
}

const DEFAULTS = {
  teams: DEFAULT_TEAMS,
  groups: DEFAULT_GROUPS,
  standings_groups: DEFAULT_STANDINGS_GROUPS,
  standings_a: [],
  standings_o40: [],
  standings_jr: [],
  live_match: DEFAULT_LIVE_MATCH,
  matches_today: DEFAULT_MATCHES_TODAY,
  matches_giornata: DEFAULT_MATCHES_GIORNATA,
  scorers: DEFAULT_SCORERS,
  news: DEFAULT_NEWS,
  events: DEFAULT_EVENTS,
  honors: DEFAULT_HONORS,
  sponsors: DEFAULT_SPONSORS,
  strip_items: DEFAULT_STRIP_ITEMS,
  updated_at: null,
};

export function rmMergeDefaults(saved) {
  return rmHydrateTournamentData(saved, DEFAULTS);
}

function rmLoadLocal() {
  try {
    const raw = localStorage.getItem(RM_STORAGE_KEY);
    if (raw) return rmNormalizeTournamentData(JSON.parse(raw));
  } catch {}
  return null;
}

export function rmGetAllData() {
  return rmMergeDefaults(rmLoadLocal());
}

export async function rmLoadData() {
  if (!_supabase) return rmLoadLocal();
  try {
    const { data, error } = await _supabase
      .from('site_data')
      .select('content')
      .eq('id', 1)
      .single();
    if (error) throw error;
    if (data?.content && Object.keys(data.content).length > 0) {
      const normalized = rmNormalizeTournamentData(data.content);
      localStorage.setItem(RM_STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    }
  } catch (e) {
    console.warn('Errore caricamento da Supabase, uso cache locale:', e);
  }
  return rmLoadLocal();
}

export async function rmSaveData(data, options = {}) {
  const normalized = rmNormalizeTournamentData(data) || { ...data };
  normalized.updated_at = new Date().toISOString();
  localStorage.setItem(RM_STORAGE_KEY, JSON.stringify(normalized));

  const shouldAttemptRemote = options.remote !== false && rmIsAdminPage();
  if (!shouldAttemptRemote) return { remoteSkipped: true, data: normalized };

  if (options.requireAdmin && !rmHasAdminSession()) {
    throw new Error('Sessione admin assente o scaduta');
  }
  if (!rmHasAdminSession()) return { remoteSkipped: true, data: normalized };

  try {
    const payload = await rmAdminApi('/save', { method: 'POST', body: { content: normalized } });
    if (payload?.updated_at) normalized.updated_at = payload.updated_at;
    localStorage.setItem(RM_STORAGE_KEY, JSON.stringify(normalized));
  } catch (e) {
    console.error('Errore salvataggio admin-api:', e);
    return { remoteError: e?.message || 'Errore salvataggio remoto', data: normalized };
  }

  return { remoteSkipped: false, data: normalized };
}
