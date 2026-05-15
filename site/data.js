/* global window */

const DEFAULT_NATIONS_2026 = [
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

const DEFAULT_TEAMS            = [];
const DEFAULT_GROUPS           = [];
const DEFAULT_STANDINGS_GROUPS = [];
const DEFAULT_STANDINGS_A      = [];
const DEFAULT_STANDINGS_O40    = [];
const DEFAULT_STANDINGS_JR     = [];
const DEFAULT_LIVE_MATCH       = { active: false, home: null, away: null, hs: 0, as: 0, minute: 0, pitch: '', events: [] };
const DEFAULT_MATCHES_TODAY    = [];
const DEFAULT_MATCHES_GIORNATA = [];
const DEFAULT_SCORERS          = [];
const DEFAULT_NEWS             = [];
const DEFAULT_EVENTS           = [];
const DEFAULT_HONORS           = [];
const DEFAULT_SPONSORS         = [];
const DEFAULT_STRIP_ITEMS      = [];

// ── Persistence ─────────────────────────────────────────────
const RM_STORAGE_KEY = 'rm_data_v2';
const RM_ADMIN_SESSION_KEY = window.RM_ADMIN_SESSION_KEY || 'rm_admin_session_v1';
const SUPABASE_URL = 'https://jummgmhkapvvibicnqos.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1bW1nbWhrYXB2dmliaWNucW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDMzMTUsImV4cCI6MjA5NDE3OTMxNX0.9kTpjZFC1FdH7pz_mU15YidkV7j24mD0P-KxKxqxCqM';
const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1/admin-api`;

let _supabase = null;
if (window.supabase) {
  _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

function rmGetSupabaseClient() {
  return _supabase;
}

function rmIsAdminPage() {
  try {
    const href = String(window.location.href || '').toLowerCase();
    return href.includes('/admin.html') || href.endsWith('admin.html') || href.includes('admin.html#');
  } catch (e) {
    return false;
  }
}

function rmGetAdminSession() {
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
  } catch (e) {
    return null;
  }
}

function rmSetAdminSession(session) {
  if (!session?.token || !session?.expires_at) throw new Error('Sessione admin non valida');
  sessionStorage.setItem(RM_ADMIN_SESSION_KEY, JSON.stringify({
    token: session.token,
    expires_at: session.expires_at,
    user: session.user || null,
  }));
  return rmGetAdminSession();
}

function rmClearAdminSession() {
  try {
    sessionStorage.removeItem(RM_ADMIN_SESSION_KEY);
  } catch (e) {}
}

function rmHasAdminSession() {
  return !!rmGetAdminSession();
}

function rmIsAdminSessionErrorMessage(message) {
  return /sessione admin assente|sessione non valida|sessione scaduta|utente disattivato/i.test(String(message || ''));
}

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

async function rmAdminLogin(username, password) {
  const payload = await rmAdminApi('/login', {
    method: 'POST',
    body: { username: String(username || '').trim(), password: String(password || '') },
  });
  return rmSetAdminSession(payload.session);
}

async function rmAdminMe() {
  const payload = await rmAdminApi('/me');
  const current = rmGetAdminSession();
  if (current) {
    rmSetAdminSession({ ...current, user: payload.user });
  }
  return payload;
}

async function rmAdminLogout() {
  try {
    if (rmHasAdminSession()) {
      await rmAdminApi('/logout', { method: 'POST' });
    }
  } finally {
    rmClearAdminSession();
  }
}

async function rmAdminUpdateCredentials({ username, password }) {
  const payload = await rmAdminApi('/credentials', {
    method: 'POST',
    body: {
      username: String(username || '').trim(),
      password: password ? String(password) : undefined,
    },
  });
  const current = rmGetAdminSession();
  if (current) {
    rmSetAdminSession({ ...current, user: payload.user });
  }
  return payload;
}

function rmLoadLocal() {
  try {
    const raw = localStorage.getItem(RM_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return window.rmNormalizeTournamentData ? window.rmNormalizeTournamentData(parsed) : parsed;
    }
  } catch(e) {}
  return null;
}

async function rmLoadData() {
  if (!_supabase) return rmLoadLocal();
  try {
    const { data, error } = await _supabase
      .from('site_data')
      .select('content')
      .eq('id', 1)
      .single();
    
    if (error) throw error;
    if (data && data.content && Object.keys(data.content).length > 0) {
      const normalized = window.rmNormalizeTournamentData ? window.rmNormalizeTournamentData(data.content) : data.content;
      localStorage.setItem(RM_STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    }
  } catch(e) {
    console.warn('Errore caricamento da Supabase, uso cache locale:', e);
  }
  return rmLoadLocal();
}

async function rmSaveData(data, options = {}) {
  const normalized = window.rmNormalizeTournamentData ? window.rmNormalizeTournamentData(data) : { ...data };
  normalized.updated_at = new Date().toISOString();
  localStorage.setItem(RM_STORAGE_KEY, JSON.stringify(normalized));

  const shouldAttemptRemote = options.remote !== false && rmIsAdminPage();
  if (!shouldAttemptRemote) {
    return { remoteSkipped: true, data: normalized };
  }

  if (options.requireAdmin && !rmHasAdminSession()) {
    throw new Error('Sessione admin assente o scaduta');
  }

  if (!rmHasAdminSession()) {
    return { remoteSkipped: true, data: normalized };
  }

  try {
    const payload = await rmAdminApi('/save', {
      method: 'POST',
      body: { content: normalized },
    });
    if (payload?.updated_at) normalized.updated_at = payload.updated_at;
    localStorage.setItem(RM_STORAGE_KEY, JSON.stringify(normalized));
  } catch(e) {
    console.error('Errore salvataggio admin-api:', e);
    return { remoteError: e?.message || 'Errore salvataggio remoto', data: normalized };
  }

  return { remoteSkipped: false, data: normalized };
}

// Merge saved data with defaults
function rmMergeDefaults(saved) {
  if (window.rmHydrateTournamentData) {
    return window.rmHydrateTournamentData(saved, {
      teams: DEFAULT_TEAMS,
      groups: DEFAULT_GROUPS,
      standings_groups: DEFAULT_STANDINGS_GROUPS,
      standings_a: DEFAULT_STANDINGS_A,
      standings_o40: DEFAULT_STANDINGS_O40,
      standings_jr: DEFAULT_STANDINGS_JR,
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
    });
  }

  const normalized = window.rmNormalizeTournamentData ? window.rmNormalizeTournamentData(saved) : saved;
  return {
    teams:            normalized?.teams            || DEFAULT_TEAMS,
    groups:           normalized?.groups           || DEFAULT_GROUPS,
    standings_groups: normalized?.standings_groups || DEFAULT_STANDINGS_GROUPS,
    standings_a:      [],
    standings_o40:    [],
    standings_jr:     [],
    live_match:       normalized?.live_match       || DEFAULT_LIVE_MATCH,
    matches_today:    DEFAULT_MATCHES_TODAY,
    matches_giornata: normalized?.matches_giornata || DEFAULT_MATCHES_GIORNATA,
    scorers:          normalized?.scorers          || DEFAULT_SCORERS,
    news:             normalized?.news             || DEFAULT_NEWS,
    events:           normalized?.events           || DEFAULT_EVENTS,
    honors:           normalized?.honors           || DEFAULT_HONORS,
    sponsors:         normalized?.sponsors         || DEFAULT_SPONSORS,
    strip_items:      DEFAULT_STRIP_ITEMS,
    updated_at:       normalized?.updated_at       || null,
  };
}

function rmGetAllData() {
  const saved = rmLoadLocal();
  return rmMergeDefaults(saved);
}

// Load and expose to window
const _initialData = rmGetAllData();
Object.assign(window, {
  ..._initialData,
  // Uppercase aliases — components/screens reference these as globals
  TEAMS:            _initialData.teams,
  T:                Object.fromEntries((_initialData.teams || []).map(t => [t.short, t])),
  GROUPS:           _initialData.groups,
  STANDINGS_GROUPS: _initialData.standings_groups,
  STANDINGS_A:      [],
  STANDINGS_O40:    [],
  STANDINGS_JR:     [],
  LIVE_MATCH:       _initialData.live_match,
  MATCHES_TODAY:    _initialData.matches_today,
  MATCHES_GIORNATA: _initialData.matches_giornata,
  SCORERS:          _initialData.scorers,
  NEWS:             _initialData.news,
  EVENTS:           _initialData.events,
  HONORS:           _initialData.honors,
  SPONSORS:         _initialData.sponsors,
  STRIP_ITEMS:      _initialData.strip_items,
  NATIONS_2026:     DEFAULT_NATIONS_2026,
  rmLoadData, rmSaveData, rmGetAllData, rmMergeDefaults,
  DEFAULT_TEAMS, DEFAULT_GROUPS, DEFAULT_NATIONS_2026,
  DEFAULT_STANDINGS_GROUPS,
  DEFAULT_LIVE_MATCH, DEFAULT_MATCHES_TODAY, DEFAULT_MATCHES_GIORNATA,
  DEFAULT_SCORERS, DEFAULT_NEWS, DEFAULT_EVENTS, DEFAULT_HONORS,
  DEFAULT_SPONSORS, DEFAULT_STRIP_ITEMS,
  RM_ADMIN_SESSION_KEY, RM_STORAGE_KEY,
  rmGetSupabaseClient, rmAdminLogin, rmAdminLogout, rmAdminMe,
  rmAdminUpdateCredentials, rmGetAdminSession, rmHasAdminSession,
  rmClearAdminSession, rmIsAdminSessionErrorMessage,
});
