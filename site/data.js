/* global window */
const DEFAULT_TEAMS = [
  { short: 'RM', name: 'Rinascita FC',     color: '#00E676', category: 'Senior',  captain: 'F. Rega',     played: 4, won: 4, goals: 11, points: 12 },
  { short: 'SI', name: 'Sporting Irpinia', color: '#F5C518', category: 'Senior',  captain: 'M. Rossi',    played: 4, won: 3, goals: 9,  points: 9 },
  { short: 'MI', name: 'ASD Monteforte',   color: '#A66BFF', category: 'Senior',  captain: 'D. Capone',   played: 4, won: 2, goals: 7,  points: 7 },
  { short: 'GF', name: 'Good Fellas',      color: '#FF9800', category: 'Senior',  captain: 'V. Esposito', played: 4, won: 2, goals: 6,  points: 6 },
  { short: 'PA', name: 'Parco Aquilone',   color: '#39B0FF', category: 'Senior',  captain: 'L. Iandolo',  played: 4, won: 1, goals: 6,  points: 5 },
  { short: 'MS', name: 'Mi Sfizio Soccer', color: '#FF6B6B', category: 'Senior',  captain: 'A. Bruno',    played: 4, won: 0, goals: 2,  points: 0 },
  { short: 'OV', name: 'Old Veterans',     color: '#22C55E', category: 'Over 40', captain: 'G. Petrone',  played: 3, won: 3, goals: 8,  points: 9 },
  { short: 'CB', name: 'Cuori Blu',        color: '#0EA5E9', category: 'Over 40', captain: 'R. Mauro',    played: 3, won: 2, goals: 5,  points: 6 },
  { short: 'JR', name: 'Junior Rinascita', color: '#00E676', category: 'Junior',  captain: 'Mister Lupo', played: 2, won: 2, goals: 6,  points: 6 },
  { short: 'AQ', name: 'Aquilotti AV',     color: '#F472B6', category: 'Junior',  captain: 'Mister Sala', played: 2, won: 1, goals: 4,  points: 3 },
];

const DEFAULT_T = Object.fromEntries(DEFAULT_TEAMS.map(t => [t.short, t]));
const DT = DEFAULT_T;

const DEFAULT_STANDINGS_A = [
  { ...DT.RM, g: 4, v: 4, n: 0, p: 0, gf: 11, gs: 3,  pt: 12, form: ['W','W','W','W'] },
  { ...DT.SI, g: 4, v: 3, n: 0, p: 1, gf: 9,  gs: 5,  pt: 9,  form: ['W','L','W','W'] },
  { ...DT.MI, g: 4, v: 2, n: 1, p: 1, gf: 7,  gs: 5,  pt: 7,  form: ['D','W','W','L'] },
  { ...DT.PA, g: 4, v: 1, n: 2, p: 1, gf: 6,  gs: 6,  pt: 5,  form: ['W','D','D','L'] },
  { ...DT.GF, g: 4, v: 1, n: 1, p: 2, gf: 5,  gs: 7,  pt: 4,  form: ['L','W','D','L'] },
  { ...DT.MS, g: 4, v: 0, n: 0, p: 4, gf: 2,  gs: 14, pt: 0,  form: ['L','L','L','L'] },
];
const DEFAULT_STANDINGS_O40 = [
  { ...DT.OV, g: 3, v: 3, n: 0, p: 0, gf: 8, gs: 2, pt: 9, form: ['W','W','W'] },
  { ...DT.CB, g: 3, v: 2, n: 0, p: 1, gf: 5, gs: 4, pt: 6, form: ['W','L','W'] },
];
const DEFAULT_STANDINGS_JR = [
  { ...DT.JR, g: 2, v: 2, n: 0, p: 0, gf: 6, gs: 1, pt: 6, form: ['W','W'] },
  { ...DT.AQ, g: 2, v: 1, n: 0, p: 1, gf: 4, gs: 3, pt: 3, form: ['W','L'] },
];

const DEFAULT_LIVE_MATCH = {
  active: true,
  home: DT.RM, away: DT.SI, hs: 2, as: 1, minute: 67, pitch: 'Campo A',
  events: [
    { min: 12, type: 'goal',   player: 'F. Rega',     team: 'Rinascita FC' },
    { min: 28, type: 'yellow', player: 'M. Rossi',    team: 'Sporting Irpinia' },
    { min: 41, type: 'goal',   player: 'L. Solimene', team: 'Sporting Irpinia', note: 'pareggio' },
    { min: 56, type: 'goal',   player: 'A. Pirozzi',  team: 'Rinascita FC',     note: 'colpo di testa su corner' },
    { min: 64, type: 'sub',    player: 'M. Cibelli',  team: 'Rinascita FC',     note: 'in entrata' },
  ]
};

const DEFAULT_MATCHES_TODAY = [
  { home: DT.RM, away: DT.SI, hs: 2, as: 1, status: 'live',  minute: 67, date: 'Oggi', time: '19:00', pitch: 'Campo A', id: 'm1' },
  { home: DT.MI, away: DT.GF, hs: 3, as: 0, status: 'ft',    date: 'Oggi', time: '17:30', pitch: 'Campo A', id: 'm2' },
  { home: DT.PA, away: DT.MS, hs: null, as: null, status: 'sch', date: 'Oggi', time: '21:00', pitch: 'Campo B', id: 'm3' },
];

const DEFAULT_MATCHES_GIORNATA = [
  { day: 'Lun 29 Giu', items: [
    { home: DT.RM, away: DT.SI, hs: 2, as: 1, status: 'live',  minute: 67, date: 'Oggi', time: '19:00', pitch: 'Campo A', id: 'm1' },
    { home: DT.MI, away: DT.GF, hs: 3, as: 0, status: 'ft',    date: 'Oggi', time: '17:30', pitch: 'Campo A', id: 'm2' },
    { home: DT.PA, away: DT.MS, hs: null, as: null, status: 'sch', date: 'Oggi', time: '21:00', pitch: 'Campo B', id: 'm3' },
  ]},
  { day: 'Mar 30 Giu', items: [
    { home: DT.OV, away: DT.CB, hs: null, as: null, status: 'sch', date: 'Domani', time: '19:30', pitch: 'Campo A', id: 'm4' },
    { home: DT.SI, away: DT.MI, hs: null, as: null, status: 'sch', date: 'Domani', time: '21:00', pitch: 'Campo A', id: 'm5' },
  ]},
  { day: 'Mer 1 Lug',  items: [
    { home: DT.JR, away: DT.AQ, hs: null, as: null, status: 'sch', date: '1 Lug', time: '18:00', pitch: 'Campo B', id: 'm6' },
    { home: DT.GF, away: DT.RM, hs: null, as: null, status: 'sch', date: '1 Lug', time: '20:30', pitch: 'Campo A', id: 'm7' },
  ]},
  { day: 'Ven 3 Lug',  items: [
    { home: DT.MS, away: DT.MI, hs: null, as: null, status: 'sch', date: '3 Lug', time: '19:00', pitch: 'Campo A', id: 'm8' },
    { home: DT.PA, away: DT.GF, hs: null, as: null, status: 'sch', date: '3 Lug', time: '21:00', pitch: 'Campo A', id: 'm9' },
  ]},
];

const DEFAULT_SCORERS = [
  { name: 'F. Rega',      team: 'Rinascita FC',     short: 'RM', color: '#00E676', goals: 7 },
  { name: 'L. Solimene',  team: 'Sporting Irpinia', short: 'SI', color: '#F5C518', goals: 6 },
  { name: 'D. Capone',    team: 'ASD Monteforte',   short: 'MI', color: '#A66BFF', goals: 5 },
  { name: 'A. Pirozzi',   team: 'Rinascita FC',     short: 'RM', color: '#00E676', goals: 4 },
  { name: 'V. Esposito',  team: 'Good Fellas',      short: 'GF', color: '#FF9800', goals: 3 },
];

const DEFAULT_NEWS = [
  { id: 'n1', pinned: true, cat: 'Avviso', tone: 'alert', date: '29 Giu · 14:20',
    title: "Partita PA–MS posticipata alle 21:00",
    body: "Per le condizioni del manto erboso dopo la pioggia, la sfida tra Parco Aquilone e Mi Sfizio Soccer si gioca alle 21:00 sul Campo B. Riscaldamento dalle 20:30." },
  { id: 'n2', cat: 'News', date: '28 Giu · 18:45',
    title: "Tutti gli highlights della 3ª giornata",
    body: "Video integrali, gol e migliori parate disponibili sul nostro profilo Instagram. Doppietta di F. Rega contro Good Fellas." },
  { id: 'n3', cat: 'Regolamento', tone: 'warn', date: '27 Giu',
    title: "Aggiornamento sulle squalifiche",
    body: "Dalla 4ª giornata scatta la sospensione automatica dopo 2 cartellini gialli. Lista aggiornata in bacheca." },
  { id: 'n4', cat: 'Eventi', date: '25 Giu',
    title: "Cena di gala · Sabato 11 Luglio",
    body: "La cena di chiusura si terrà presso il Ristorante Da Peppe. Prenotazioni entro il 5 Luglio." },
  { id: 'n5', cat: 'Sponsor', date: '20 Giu',
    title: "Benvenuti ai nuovi sponsor 2026",
    body: "Da quest'anno con noi: Pizzeria Don Ciccio, Caffè Centrale, Officina Mauro e Edicola Sport." },
];

const DEFAULT_EVENTS = [
  { id: 'e1', day: '01', month: 'Giu', kind: 'cer',   kindLabel: 'Cerimonia',   title: "Apertura iscrizioni Senior",                   time: 'Tutto il giorno', where: 'Online',             highlight: false },
  { id: 'e2', day: '05', month: 'Giu', kind: 'cer',   kindLabel: 'Cerimonia',   title: "Sorteggio gironi",                             time: '19:00',           where: 'Bar Centrale',       highlight: false },
  { id: 'e3', day: '15', month: 'Giu', kind: 'match', kindLabel: 'Partita',     title: "Calcio d'inizio · Rinascita – Sporting Irpinia", time: '20:00',           where: 'Campo A',            highlight: true },
  { id: 'e4', day: '20', month: 'Giu', kind: 'party', kindLabel: 'Festa',       title: "Festa dell'estate · Musica live + grigliata",   time: '20:30',           where: 'Pinetina del paese', highlight: false },
  { id: 'e5', day: '29', month: 'Giu', kind: 'match', kindLabel: 'Partita',     title: "Giornata 4 · 3 partite Senior + Over 40",       time: '17:30 – 22:00',   where: 'Campo A & B',        highlight: false },
  { id: 'e6', day: '08', month: 'Lug', kind: 'match', kindLabel: 'Partita',     title: "Semifinali Senior",                            time: '19:00',           where: 'Campo A',            highlight: false },
  { id: 'e7', day: '11', month: 'Lug', kind: 'party', kindLabel: 'Cena',        title: "Cena di gala del Torneo",                      time: '20:30',           where: 'Ristorante Da Peppe', highlight: false, extra: 'Su prenotazione' },
  { id: 'e8', day: '15', month: 'Lug', kind: 'cer',   kindLabel: 'Premiazione', title: "Finale + Premiazione Cup 2026",                time: '20:30',           where: 'Campo A',            highlight: true },
];

const DEFAULT_HONORS = [
  { id: 'h1', year: '2025', edition: '2ª Edizione · Cup 2025', winner: 'Sporting Irpinia',  runner: 'Rinascita FC',   topScorer: 'L. Solimene (11)', mvp: 'L. Solimene' },
  { id: 'h2', year: '2024', edition: '1ª Edizione · Cup 2024', winner: 'Rinascita FC',      runner: 'ASD Monteforte', topScorer: 'F. Rega (9)',      mvp: 'F. Rega', alt: true },
];

const DEFAULT_SPONSORS = [
  { id: 's1', name: 'Pizzeria Don Ciccio', tag: 'Food partner' },
  { id: 's2', name: 'Caffè Centrale',      tag: 'Coffee break partner' },
  { id: 's3', name: 'Officina Mauro',      tag: 'Trasporti' },
  { id: 's4', name: 'Edicola Sport',       tag: 'Stampe & gadget' },
];

const DEFAULT_STRIP_ITEMS = [
  "Iscrizioni Senior aperte fino al 1° Giugno",
  "Sorteggio gironi · 5 Giugno · ore 19:00",
  "Calcio d'inizio · 15 Giugno 2026",
  "Junior · iscrizioni gratuite",
  "Finale · 15 Luglio Campo Sportivo",
];

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
  rmLoadData, rmSaveData, rmGetAllData, rmMergeDefaults,
  DEFAULT_TEAMS, DEFAULT_STANDINGS_A, DEFAULT_STANDINGS_O40, DEFAULT_STANDINGS_JR,
  DEFAULT_LIVE_MATCH, DEFAULT_MATCHES_TODAY, DEFAULT_MATCHES_GIORNATA,
  DEFAULT_SCORERS, DEFAULT_NEWS, DEFAULT_EVENTS, DEFAULT_HONORS,
  DEFAULT_SPONSORS, DEFAULT_STRIP_ITEMS,
  RM_STORAGE_KEY,
});
