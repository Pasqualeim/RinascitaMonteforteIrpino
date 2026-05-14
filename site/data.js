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
const SUPABASE_URL = 'https://jummgmhkapvvibicnqos.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1bW1nbWhrYXB2dmliaWNucW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDMzMTUsImV4cCI6MjA5NDE3OTMxNX0.9kTpjZFC1FdH7pz_mU15YidkV7j24mD0P-KxKxqxCqM';

let _supabase = null;
if (window.supabase) {
  _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

function rmLoadLocal() {
  try {
    const raw = localStorage.getItem(RM_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
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
      localStorage.setItem(RM_STORAGE_KEY, JSON.stringify(data.content));
      return data.content;
    }
  } catch(e) {
    console.warn('Errore caricamento da Supabase, uso cache locale:', e);
  }
  return rmLoadLocal();
}

async function rmSaveData(data) {
  data.updated_at = new Date().toISOString();
  const toSave = { ...data };
  delete toSave.strip_items; // computed from matches_giornata, not persisted
  localStorage.setItem(RM_STORAGE_KEY, JSON.stringify(toSave));

  if (_supabase) {
    try {
      const { error } = await _supabase
        .from('site_data')
        .update({ content: toSave, updated_at: data.updated_at })
        .eq('id', 1);

      if (error) throw error;
    } catch(e) {
      console.error('Errore salvataggio su Supabase:', e);
    }
  }
}

// Genera strip_items automaticamente da matches_giornata
function buildStripItems(saved) {
  const giornata = saved?.matches_giornata || [];
  const items = [];
  for (const g of giornata) {
    for (const m of g.items || []) {
      if (!m.home || !m.away) continue;
      if (m.status === 'ft') {
        items.push(`${m.home.short} ${m.hs ?? 0}–${m.as ?? 0} ${m.away.short} · Finale`);
      } else if (m.status === 'live') {
        items.push(`🔴 LIVE · ${m.home.short} ${m.hs ?? 0}–${m.as ?? 0} ${m.away.short} · ${m.minute}'`);
      } else {
        items.push(`${m.home.short} vs ${m.away.short} · ${m.date || ''} ${m.time || ''} · ${g.day}`);
      }
    }
  }
  return items.length > 0 ? items : ['Rinascita Monteforte Cup 2026 · Al via il 15 Giugno · Campo Sportivo Monteforte Irpino'];
}

// Merge saved data with defaults
function rmMergeDefaults(saved) {
  return {
    teams:            saved?.teams            || DEFAULT_TEAMS,
    groups:           saved?.groups           || DEFAULT_GROUPS,
    standings_groups: saved?.standings_groups || DEFAULT_STANDINGS_GROUPS,
    standings_a:      [],
    standings_o40:    [],
    standings_jr:     [],
    live_match:       saved?.live_match       || DEFAULT_LIVE_MATCH,
    matches_today:    saved?.matches_today    || DEFAULT_MATCHES_TODAY,
    matches_giornata: saved?.matches_giornata || DEFAULT_MATCHES_GIORNATA,
    scorers:          saved?.scorers          || DEFAULT_SCORERS,
    news:             saved?.news             || DEFAULT_NEWS,
    events:           saved?.events           || DEFAULT_EVENTS,
    honors:           saved?.honors           || DEFAULT_HONORS,
    sponsors:         saved?.sponsors         || DEFAULT_SPONSORS,
    strip_items:      buildStripItems(saved),
    _auth:            saved?._auth            || { username: 'Admin', password: 'pasale98' },
    updated_at:       saved?.updated_at       || null,
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
  RM_STORAGE_KEY,
});
