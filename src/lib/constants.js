// Nazioni qualificate alla Coppa del Mondo FIFA 2026 (48 squadre).
export const DEFAULT_NATIONS = [
  // ── UEFA (16) ─────────────────────────────────────────────────
  { name: 'Austria',              flag: '🇦🇹', short: 'AUT' },
  { name: 'Belgio',               flag: '🇧🇪', short: 'BEL' },
  { name: 'Bosnia Erzegovina',    flag: '🇧🇦', short: 'BIH' },
  { name: 'Croazia',              flag: '🇭🇷', short: 'CRO' },
  { name: 'Francia',              flag: '🇫🇷', short: 'FRA' },
  { name: 'Germania',             flag: '🇩🇪', short: 'GER' },
  { name: 'Inghilterra',          flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', short: 'ENG' },
  { name: 'Norvegia',             flag: '🇳🇴', short: 'NOR' },
  { name: 'Olanda',               flag: '🇳🇱', short: 'NED' },
  { name: 'Portogallo',           flag: '🇵🇹', short: 'POR' },
  { name: 'Repubblica Ceca',      flag: '🇨🇿', short: 'CZE' },
  { name: 'Scozia',               flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', short: 'SCO' },
  { name: 'Spagna',               flag: '🇪🇸', short: 'ESP' },
  { name: 'Svezia',               flag: '🇸🇪', short: 'SWE' },
  { name: 'Svizzera',             flag: '🇨🇭', short: 'SUI' },
  { name: 'Turchia',              flag: '🇹🇷', short: 'TUR' },
  // ── CONMEBOL (6) ──────────────────────────────────────────────
  { name: 'Argentina',            flag: '🇦🇷', short: 'ARG' },
  { name: 'Brasile',              flag: '🇧🇷', short: 'BRA' },
  { name: 'Colombia',             flag: '🇨🇴', short: 'COL' },
  { name: 'Ecuador',              flag: '🇪🇨', short: 'ECU' },
  { name: 'Paraguay',             flag: '🇵🇾', short: 'PAR' },
  { name: 'Uruguay',              flag: '🇺🇾', short: 'URU' },
  // ── CONCACAF (6) ──────────────────────────────────────────────
  { name: 'Canada',               flag: '🇨🇦', short: 'CAN' },
  { name: 'Curaçao',              flag: '🇨🇼', short: 'CUW' },
  { name: 'Haiti',                flag: '🇭🇹', short: 'HAI' },
  { name: 'Messico',              flag: '🇲🇽', short: 'MEX' },
  { name: 'Panama',               flag: '🇵🇦', short: 'PAN' },
  { name: 'USA',                  flag: '🇺🇸', short: 'USA' },
  // ── CAF (10) ──────────────────────────────────────────────────
  { name: 'Algeria',              flag: '🇩🇿', short: 'ALG' },
  { name: 'Capo Verde',           flag: '🇨🇻', short: 'CPV' },
  { name: "Costa d'Avorio",       flag: '🇨🇮', short: 'CIV' },
  { name: 'Egitto',               flag: '🇪🇬', short: 'EGY' },
  { name: 'Ghana',                flag: '🇬🇭', short: 'GHA' },
  { name: 'Marocco',              flag: '🇲🇦', short: 'MAR' },
  { name: 'RD Congo',             flag: '🇨🇩', short: 'COD' },
  { name: 'Senegal',              flag: '🇸🇳', short: 'SEN' },
  { name: 'Sud Africa',           flag: '🇿🇦', short: 'RSA' },
  { name: 'Tunisia',              flag: '🇹🇳', short: 'TUN' },
  // ── AFC (9) ───────────────────────────────────────────────────
  { name: 'Arabia Saudita',       flag: '🇸🇦', short: 'KSA' },
  { name: 'Australia',            flag: '🇦🇺', short: 'AUS' },
  { name: 'Corea del Sud',        flag: '🇰🇷', short: 'KOR' },
  { name: 'Giappone',             flag: '🇯🇵', short: 'JPN' },
  { name: 'Giordania',            flag: '🇯🇴', short: 'JOR' },
  { name: 'Iran',                 flag: '🇮🇷', short: 'IRN' },
  { name: 'Iraq',                 flag: '🇮🇶', short: 'IRQ' },
  { name: 'Qatar',                flag: '🇶🇦', short: 'QAT' },
  { name: 'Uzbekistan',           flag: '🇺🇿', short: 'UZB' },
  // ── OFC (1) ───────────────────────────────────────────────────
  { name: 'Nuova Zelanda',        flag: '🇳🇿', short: 'NZL' },
];

// Backward compat alias
export const DEFAULT_NATIONS_2026 = DEFAULT_NATIONS;

export const DEFAULT_TEAMS            = [];
export const DEFAULT_GROUPS           = [];
export const DEFAULT_STANDINGS_GROUPS = [];
export const DEFAULT_LIVE_MATCH       = { active: false, home: null, away: null, hs: 0, as: 0, minute: 0, pitch: '', events: [] };
export const DEFAULT_MATCHES_TODAY    = [];
export const DEFAULT_MATCHES_GIORNATA = [];
export const DEFAULT_SCORERS          = [];
export const DEFAULT_SCORERS_GIRONE   = [];
export const DEFAULT_NEWS             = [];
export const DEFAULT_EVENTS           = [];
export const DEFAULT_HONORS           = [];
export const DEFAULT_SPONSORS         = [];
export const DEFAULT_STRIP_ITEMS      = [];

export const RM_STORAGE_KEY = 'rm_data_v2';
