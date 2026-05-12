/* global window */
const DEFAULT_TEAMS            = [];
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
  // Salva in locale immediatamente
  localStorage.setItem(RM_STORAGE_KEY, JSON.stringify(data));
  
  // Salva in Supabase
  if (_supabase) {
    try {
      const { error } = await _supabase
        .from('site_data')
        .update({ content: data, updated_at: data.updated_at })
        .eq('id', 1);
      
      if (error) throw error;
    } catch(e) {
      console.error('Errore salvataggio su Supabase:', e);
    }
  }
}

// Merge saved data with defaults
function rmMergeDefaults(saved) {
  return {
    teams:            saved?.teams            || DEFAULT_TEAMS,
    standings_a:      saved?.standings_a      || DEFAULT_STANDINGS_A,
    standings_o40:    saved?.standings_o40    || DEFAULT_STANDINGS_O40,
    standings_jr:     saved?.standings_jr     || DEFAULT_STANDINGS_JR,
    live_match:       saved?.live_match       || DEFAULT_LIVE_MATCH,
    matches_today:    saved?.matches_today    || DEFAULT_MATCHES_TODAY,
    matches_giornata: saved?.matches_giornata || DEFAULT_MATCHES_GIORNATA,
    scorers:          saved?.scorers          || DEFAULT_SCORERS,
    news:             saved?.news             || DEFAULT_NEWS,
    events:           saved?.events           || DEFAULT_EVENTS,
    honors:           saved?.honors           || DEFAULT_HONORS,
    sponsors:         saved?.sponsors         || DEFAULT_SPONSORS,
    strip_items:      saved?.strip_items      || DEFAULT_STRIP_ITEMS,
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
  STANDINGS_A:      _initialData.standings_a,
  STANDINGS_O40:    _initialData.standings_o40,
  STANDINGS_JR:     _initialData.standings_jr,
  LIVE_MATCH:       _initialData.live_match,
  MATCHES_TODAY:    _initialData.matches_today,
  MATCHES_GIORNATA: _initialData.matches_giornata,
  SCORERS:          _initialData.scorers,
  NEWS:             _initialData.news,
  EVENTS:           _initialData.events,
  HONORS:           _initialData.honors,
  SPONSORS:         _initialData.sponsors,
  STRIP_ITEMS:      _initialData.strip_items,
  rmLoadData, rmSaveData, rmGetAllData, rmMergeDefaults,
  DEFAULT_TEAMS, DEFAULT_STANDINGS_A, DEFAULT_STANDINGS_O40, DEFAULT_STANDINGS_JR,
  DEFAULT_LIVE_MATCH, DEFAULT_MATCHES_TODAY, DEFAULT_MATCHES_GIORNATA,
  DEFAULT_SCORERS, DEFAULT_NEWS, DEFAULT_EVENTS, DEFAULT_HONORS,
  DEFAULT_SPONSORS, DEFAULT_STRIP_ITEMS,
  RM_STORAGE_KEY,
});
