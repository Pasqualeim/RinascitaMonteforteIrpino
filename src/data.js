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

// ── Team ID map (short → relational uuid, persisted after migration) ──
export const RM_TEAM_ID_MAP_KEY = 'rm_team_id_map_v1';
export function rmGetTeamIdMap() {
  try { return JSON.parse(localStorage.getItem(RM_TEAM_ID_MAP_KEY) || '{}'); } catch { return {}; }
}
export function rmSetTeamIdMap(map) {
  localStorage.setItem(RM_TEAM_ID_MAP_KEY, JSON.stringify(map));
}

// ── Migration: blob → relational tables ──────────────────────
export async function rmMigrateDataToRelational(data, editionId, tournamentId) {
  const results = { groups: 0, teams: 0, registrations: 0, matches: 0, scorers: 0, news: 0, events: 0, honors: 0, sponsors: 0, errors: [] };
  const groupIdMap = {};
  const teamIdMap  = {};

  for (const g of (data.groups || [])) {
    try {
      const res = await rmAdminDomain.createGroup({ edition_id: editionId, name: g.name, color: g.color || '#00E676' });
      groupIdMap[g.id] = res.data.id;
      results.groups++;
    } catch (e) { results.errors.push(`Girone ${g.name}: ${e.message}`); }
  }

  for (const t of (data.teams || [])) {
    try {
      const res = await rmAdminDomain.createTeam({ name: t.name, short: t.short, nation: t.nation, flag: t.flag, color: t.color });
      const teamId = res.data.id;
      teamIdMap[t.short] = teamId;
      results.teams++;
      const localGroupId = t.group_id || t.group || '';
      await rmAdminDomain.upsertRegistration({
        team_id: teamId, edition_id: editionId,
        group_id: groupIdMap[localGroupId] || null,
        captain: t.captain || null,
        players: t.players || [],
      });
      results.registrations++;
    } catch (e) { results.errors.push(`Squadra ${t.name}: ${e.message}`); }
  }
  rmSetTeamIdMap(teamIdMap);

  for (const phase of (data.matches_giornata || [])) {
    const groupEntry = (data.groups || []).find(g => g.name === phase.day);
    const groupId = groupEntry ? (groupIdMap[groupEntry.id] || null) : null;
    for (const m of (phase.items || [])) {
      try {
        await rmAdminDomain.createMatch({
          edition_id: editionId, group_id: groupId,
          home_team_id: teamIdMap[m.home?.short] || null,
          away_team_id: teamIdMap[m.away?.short] || null,
          home_score: m.hs ?? null, away_score: m.as ?? null,
          status: m.status || 'sch', phase: phase.day || 'Girone',
          match_date: m.date || null, match_time: m.time || null,
          pitch: m.pitch || 'Campo Sportivo',
        });
        results.matches++;
      } catch (e) { results.errors.push(`Partita: ${e.message}`); }
    }
  }

  for (const s of (data.scorers || [])) {
    try {
      await rmAdminDomain.createScorer({ edition_id: editionId, player_name: s.name, team_id: teamIdMap[s.short] || null, goals: s.goals || 0 });
      results.scorers++;
    } catch (e) { results.errors.push(`Marcatore ${s.name}: ${e.message}`); }
  }

  for (const n of (data.news || [])) {
    try {
      await rmAdminDomain.createNews({ edition_id: editionId, title: n.title, body: n.text || n.body || null, category: n.category, tone: n.tone, pinned: n.pinned ?? false });
      results.news++;
    } catch (e) { results.errors.push(`News: ${e.message}`); }
  }

  for (const ev of (data.events || [])) {
    try {
      await rmAdminDomain.createEvent({ edition_id: editionId, title: ev.title, event_date: ev.date || null, event_type: ev.type || 'partita', description: ev.desc || ev.description || null });
      results.events++;
    } catch (e) { results.errors.push(`Evento: ${e.message}`); }
  }

  for (const h of (data.honors || [])) {
    try {
      await rmAdminDomain.createHonor({
        tournament_id: tournamentId || null,
        edition_name: h.edition || h.name || String(h.year || ''),
        year: parseInt(h.year) || 0,
        winner: h.winner || null, runner_up: h.runner_up || h.second || null,
        third_place: h.third || null, mvp: h.mvp || null, top_scorer: h.top_scorer || h.scorer || null,
      });
      results.honors++;
    } catch (e) { results.errors.push(`Albo: ${e.message}`); }
  }

  for (const sp of (data.sponsors || [])) {
    try {
      await rmAdminDomain.createSponsor({ edition_id: editionId, name: sp.name, logo_url: sp.logo || null, website_url: sp.url || null, tag: sp.tag || null });
      results.sponsors++;
    } catch (e) { results.errors.push(`Sponsor ${sp.name}: ${e.message}`); }
  }

  return results;
}

// ── Bootstrap API (public, schema v3) ────────────────────────
let _cachedEditionId = null;

export async function rmLoadDataFromBootstrap() {
  if (!SUPABASE_FUNCTIONS_URL) return null;
  try {
    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/bootstrap`);
    if (!res.ok) return null;
    const { data } = await res.json();
    if (!data || data.schema_version !== 3) return null;
    return data;
  } catch {
    return null;
  }
}

export async function rmGetActiveEditionId() {
  if (_cachedEditionId) return _cachedEditionId;
  const data = await rmLoadDataFromBootstrap();
  if (data?.edition?.id) {
    _cachedEditionId = data.edition.id;
  }
  return _cachedEditionId || null;
}

// ── Admin CRUD API (domain endpoints, auth required) ─────────
async function rmAdminApiCrud(method, path, body) {
  return rmAdminApi(path, { method, body });
}

export const rmAdminDomain = {
  // Groups
  createGroup: (p)    => rmAdminApiCrud('POST', '/groups', p),
  updateGroup: (id,p) => rmAdminApiCrud('PUT', `/groups/${id}`, p),
  deleteGroup: (id)   => rmAdminApiCrud('DELETE', `/groups/${id}`),
  // Teams
  createTeam: (p)     => rmAdminApiCrud('POST', '/teams', p),
  updateTeam: (id,p)  => rmAdminApiCrud('PUT', `/teams/${id}`, p),
  deleteTeam: (id)    => rmAdminApiCrud('DELETE', `/teams/${id}`),
  // Registrations
  upsertRegistration: (p)    => rmAdminApiCrud('POST', '/registrations', p),
  updateRegistration: (id,p) => rmAdminApiCrud('PUT', `/registrations/${id}`, p),
  deleteRegistration: (id)   => rmAdminApiCrud('DELETE', `/registrations/${id}`),
  // Matches
  createMatch: (p)    => rmAdminApiCrud('POST', '/matches', p),
  updateMatch: (id,p) => rmAdminApiCrud('PUT', `/matches/${id}`, p),
  deleteMatch: (id)   => rmAdminApiCrud('DELETE', `/matches/${id}`),
  // Match events
  createMatchEvent: (p)  => rmAdminApiCrud('POST', '/match-events', p),
  deleteMatchEvent: (id) => rmAdminApiCrud('DELETE', `/match-events/${id}`),
  // Live
  updateLive: (p) => rmAdminApiCrud('PUT', '/live', p),
  // Scorers
  createScorer: (p)    => rmAdminApiCrud('POST', '/scorers', p),
  updateScorer: (id,p) => rmAdminApiCrud('PUT', `/scorers/${id}`, p),
  deleteScorer: (id)   => rmAdminApiCrud('DELETE', `/scorers/${id}`),
  // News
  createNews: (p)    => rmAdminApiCrud('POST', '/news', p),
  updateNews: (id,p) => rmAdminApiCrud('PUT', `/news/${id}`, p),
  deleteNews: (id)   => rmAdminApiCrud('DELETE', `/news/${id}`),
  // Events
  createEvent: (p)    => rmAdminApiCrud('POST', '/events', p),
  updateEvent: (id,p) => rmAdminApiCrud('PUT', `/events/${id}`, p),
  deleteEvent: (id)   => rmAdminApiCrud('DELETE', `/events/${id}`),
  // Honors
  createHonor: (p)    => rmAdminApiCrud('POST', '/honors', p),
  updateHonor: (id,p) => rmAdminApiCrud('PUT', `/honors/${id}`, p),
  deleteHonor: (id)   => rmAdminApiCrud('DELETE', `/honors/${id}`),
  // Sponsors
  createSponsor: (p)    => rmAdminApiCrud('POST', '/sponsors', p),
  updateSponsor: (id,p) => rmAdminApiCrud('PUT', `/sponsors/${id}`, p),
  deleteSponsor: (id)   => rmAdminApiCrud('DELETE', `/sponsors/${id}`),
  // Strip messages
  createStrip: (p)    => rmAdminApiCrud('POST', '/strip', p),
  updateStrip: (id,p) => rmAdminApiCrud('PUT', `/strip/${id}`, p),
  deleteStrip: (id)   => rmAdminApiCrud('DELETE', `/strip/${id}`),
};

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
  // Try bootstrap API first (schema v3 — relational tables)
  // Only use if it has real teams data (migration complete)
  if (SUPABASE_FUNCTIONS_URL) {
    try {
      const bootstrapData = await rmLoadDataFromBootstrap();
      if (bootstrapData && Array.isArray(bootstrapData.teams) && bootstrapData.teams.length > 0) {
        const normalized = rmNormalizeTournamentData(bootstrapData);
        localStorage.setItem(RM_STORAGE_KEY, JSON.stringify(normalized));
        return normalized;
      }
    } catch (e) {
      console.warn('Bootstrap API fallita, uso site_data:', e);
    }
  }

  // Fallback: Supabase site_data direct read (legacy blob)
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
