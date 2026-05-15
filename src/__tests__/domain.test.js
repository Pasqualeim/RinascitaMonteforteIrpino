import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  rmNormalizeTeam,
  rmNormalizeGroup,
  rmNormalizeTournamentData,
  rmHydrateTournamentData,
  rmComputeStandings,
  rmDeriveMatchesToday,
  rmBuildStripItems,
  rmGetTeamGroupId,
  rmIsAdminSession,
  RM_TOURNAMENT_SCHEMA_VERSION,
  RM_ADMIN_SESSION_KEY,
} from '../domain.js';

// ─── rmNormalizeTeam ───────────────────────────────────────────────────────────

describe('rmNormalizeTeam', () => {
  it('promotes legacy group field to group_id', () => {
    const team = { short: 'ITA', name: 'Italia', group: 'girone-a' };
    const result = rmNormalizeTeam(team);
    expect(result.group_id).toBe('girone-a');
    expect(result.group).toBeUndefined();
  });

  it('removes category field', () => {
    const team = { short: 'ITA', name: 'Italia', group_id: 'g1', category: 'Senior' };
    expect(rmNormalizeTeam(team).category).toBeUndefined();
  });

  it('removes _group field', () => {
    const team = { short: 'ITA', _group: 'old', group_id: 'g1' };
    expect(rmNormalizeTeam(team)._group).toBeUndefined();
  });

  it('returns non-objects unchanged', () => {
    expect(rmNormalizeTeam(null)).toBeNull();
    expect(rmNormalizeTeam(undefined)).toBeUndefined();
  });

  it('prefers explicit group_id over group', () => {
    const team = { short: 'ITA', group_id: 'new-id', group: 'old-id' };
    expect(rmNormalizeTeam(team).group_id).toBe('new-id');
  });
});

// ─── rmNormalizeGroup ──────────────────────────────────────────────────────────

describe('rmNormalizeGroup', () => {
  it('fills missing color with fallback', () => {
    const g = { id: 'g1', name: 'Girone A' };
    expect(rmNormalizeGroup(g).color).toBe('#00E676');
  });

  it('preserves existing color', () => {
    const g = { id: 'g1', name: 'Girone A', color: '#FF0000' };
    expect(rmNormalizeGroup(g).color).toBe('#FF0000');
  });

  it('returns non-objects unchanged', () => {
    expect(rmNormalizeGroup(null)).toBeNull();
  });
});

// ─── rmNormalizeTournamentData ─────────────────────────────────────────────────

describe('rmNormalizeTournamentData', () => {
  it('sets schema_version to current', () => {
    const result = rmNormalizeTournamentData({ teams: [], groups: [] });
    expect(result.schema_version).toBe(RM_TOURNAMENT_SCHEMA_VERSION);
  });

  it('removes runtime-only fields', () => {
    const saved = {
      teams: [], groups: [],
      matches_today: [{}], strip_items: ['x'],
      standings_a: [{}], standings_o40: [{}], standings_jr: [{}],
      _auth: 'secret',
    };
    const result = rmNormalizeTournamentData(saved);
    expect(result.matches_today).toBeUndefined();
    expect(result.strip_items).toBeUndefined();
    expect(result.standings_a).toBeUndefined();
    expect(result.standings_o40).toBeUndefined();
    expect(result.standings_jr).toBeUndefined();
    expect(result._auth).toBeUndefined();
  });

  it('normalizes all teams', () => {
    const saved = { teams: [{ short: 'ITA', group: 'g1', category: 'Senior' }], groups: [] };
    const result = rmNormalizeTournamentData(saved);
    expect(result.teams[0].group_id).toBe('g1');
    expect(result.teams[0].category).toBeUndefined();
  });

  it('preserves edition and tournament metadata', () => {
    const saved = { teams: [], groups: [], edition: { id: 'e1' }, tournament: { id: 't1' } };
    const result = rmNormalizeTournamentData(saved);
    expect(result.edition).toEqual({ id: 'e1' });
    expect(result.tournament).toEqual({ id: 't1' });
  });

  it('handles missing teams/groups gracefully', () => {
    const result = rmNormalizeTournamentData({});
    expect(result.teams).toEqual([]);
    expect(result.groups).toEqual([]);
  });

  it('returns non-objects unchanged', () => {
    expect(rmNormalizeTournamentData(null)).toBeNull();
  });
});

// ─── rmGetTeamGroupId ──────────────────────────────────────────────────────────

describe('rmGetTeamGroupId', () => {
  it('returns group_id when present', () => {
    expect(rmGetTeamGroupId({ group_id: 'g1', group: 'g2' })).toBe('g1');
  });

  it('falls back to group', () => {
    expect(rmGetTeamGroupId({ group: 'g2' })).toBe('g2');
  });

  it('returns empty string for no match', () => {
    expect(rmGetTeamGroupId({})).toBe('');
    expect(rmGetTeamGroupId(null)).toBe('');
  });
});

// ─── rmComputeStandings ────────────────────────────────────────────────────────

const GROUPS = [
  { id: 'g1', name: 'Girone A', color: '#00E676' },
  { id: 'g2', name: 'Girone B', color: '#FF5722' },
];

const TEAMS = [
  { short: 'ITA', name: 'Italia', group_id: 'g1' },
  { short: 'ESP', name: 'Spagna', group_id: 'g1' },
  { short: 'BRA', name: 'Brasile', group_id: 'g1' },
  { short: 'FRA', name: 'Francia', group_id: 'g2' },
  { short: 'GER', name: 'Germania', group_id: 'g2' },
];

function mkMatch(home, away, hs, as_, status = 'ft') {
  return { home: { short: home }, away: { short: away }, hs, as: as_, status };
}

describe('rmComputeStandings', () => {
  it('returns standings_groups with all groups', () => {
    const result = rmComputeStandings([], TEAMS, GROUPS);
    expect(result.standings_groups).toHaveLength(2);
    expect(result.standings_groups[0].name).toBe('Girone A');
  });

  it('returns empty legacy arrays', () => {
    const result = rmComputeStandings([], TEAMS, GROUPS);
    expect(result.standings_a).toEqual([]);
    expect(result.standings_o40).toEqual([]);
    expect(result.standings_jr).toEqual([]);
  });

  it('awards 3 pts to winner', () => {
    const giornata = [{ day: 'G1', items: [mkMatch('ITA', 'ESP', 2, 0)] }];
    const result = rmComputeStandings(giornata, TEAMS, GROUPS);
    const gA = result.standings_groups.find(g => g.id === 'g1');
    const ita = gA.rows.find(r => r.short === 'ITA');
    const esp = gA.rows.find(r => r.short === 'ESP');
    expect(ita.pt).toBe(3);
    expect(ita.v).toBe(1);
    expect(esp.pt).toBe(0);
    expect(esp.p).toBe(1);
  });

  it('awards 1 pt each for draw', () => {
    const giornata = [{ day: 'G1', items: [mkMatch('ITA', 'ESP', 1, 1)] }];
    const result = rmComputeStandings(giornata, TEAMS, GROUPS);
    const gA = result.standings_groups.find(g => g.id === 'g1');
    const ita = gA.rows.find(r => r.short === 'ITA');
    expect(ita.pt).toBe(1);
    expect(ita.n).toBe(1);
  });

  it('sorts by points then goal difference', () => {
    const giornata = [{
      day: 'G1',
      items: [
        mkMatch('ITA', 'ESP', 3, 0),
        mkMatch('BRA', 'ITA', 2, 1),
      ],
    }];
    const result = rmComputeStandings(giornata, TEAMS, GROUPS);
    const gA = result.standings_groups.find(g => g.id === 'g1');
    // ITA: 3pts (1W) + 0pts (1L) = 3pts; BRA: 3pts; ESP: 0pts
    // ITA GD = 3-0 + 1-2 = +2; BRA GD = 2-1 = +1
    expect(gA.rows[0].short).toBe('ITA');
    expect(gA.rows[1].short).toBe('BRA');
    expect(gA.rows[2].short).toBe('ESP');
  });

  it('ignores non-ft matches', () => {
    const giornata = [{ day: 'G1', items: [mkMatch('ITA', 'ESP', 2, 0, 'live')] }];
    const result = rmComputeStandings(giornata, TEAMS, GROUPS);
    const gA = result.standings_groups.find(g => g.id === 'g1');
    const ita = gA.rows.find(r => r.short === 'ITA');
    expect(ita.pt).toBe(0);
  });

  it('ignores cross-group matches', () => {
    const giornata = [{ day: 'G1', items: [mkMatch('ITA', 'FRA', 2, 0)] }];
    const result = rmComputeStandings(giornata, TEAMS, GROUPS);
    const gA = result.standings_groups.find(g => g.id === 'g1');
    const ita = gA.rows.find(r => r.short === 'ITA');
    expect(ita.pt).toBe(0);
  });

  it('tracks form correctly', () => {
    const giornata = [{
      day: 'G1',
      items: [
        mkMatch('ITA', 'ESP', 1, 0),
        mkMatch('ITA', 'BRA', 0, 0),
      ],
    }];
    const result = rmComputeStandings(giornata, TEAMS, GROUPS);
    const gA = result.standings_groups.find(g => g.id === 'g1');
    const ita = gA.rows.find(r => r.short === 'ITA');
    expect(ita.form).toEqual(['W', 'D']);
  });

  it('handles empty input gracefully', () => {
    expect(() => rmComputeStandings(null, null, null)).not.toThrow();
    const result = rmComputeStandings(null, null, null);
    expect(result.standings_groups).toEqual([]);
  });

  it('initializes all team stats to zero', () => {
    const result = rmComputeStandings([], TEAMS, GROUPS);
    const gA = result.standings_groups.find(g => g.id === 'g1');
    for (const row of gA.rows) {
      expect(row.g).toBe(0);
      expect(row.pt).toBe(0);
      expect(row.gf).toBe(0);
      expect(row.form).toEqual([]);
    }
  });
});

// ─── rmDeriveMatchesToday ──────────────────────────────────────────────────────

describe('rmDeriveMatchesToday', () => {
  it('includes live matches', () => {
    const giornata = [{
      day: 'G1',
      items: [{ home: { short: 'ITA' }, away: { short: 'ESP' }, status: 'live', date: 'Dom 15' }],
    }];
    const result = rmDeriveMatchesToday(giornata);
    expect(result).toHaveLength(1);
    expect(result[0].home.short).toBe('ITA');
  });

  it('includes Oggi matches', () => {
    const giornata = [{
      day: 'G1',
      items: [{ home: { short: 'BRA' }, away: { short: 'FRA' }, status: 'sch', date: 'Oggi' }],
    }];
    expect(rmDeriveMatchesToday(giornata)).toHaveLength(1);
  });

  it('excludes ft and other dates', () => {
    const giornata = [{
      day: 'G1',
      items: [
        { home: { short: 'ITA' }, away: { short: 'ESP' }, status: 'ft', date: 'Sab 14' },
        { home: { short: 'BRA' }, away: { short: 'GER' }, status: 'sch', date: 'Dom 15' },
      ],
    }];
    expect(rmDeriveMatchesToday(giornata)).toHaveLength(0);
  });

  it('caps at 5 matches', () => {
    const items = Array.from({ length: 8 }, (_, i) => ({
      home: { short: `T${i}` }, away: { short: `T${i + 1}` }, status: 'live', date: 'Oggi',
    }));
    const giornata = [{ day: 'G1', items }];
    expect(rmDeriveMatchesToday(giornata)).toHaveLength(5);
  });

  it('handles null input', () => {
    expect(rmDeriveMatchesToday(null)).toEqual([]);
    expect(rmDeriveMatchesToday([])).toEqual([]);
  });
});

// ─── rmBuildStripItems ─────────────────────────────────────────────────────────

describe('rmBuildStripItems', () => {
  it('formats ft match correctly', () => {
    const giornata = [{
      day: 'G1',
      items: [{ home: { short: 'ITA' }, away: { short: 'ESP' }, status: 'ft', hs: 2, as: 1 }],
    }];
    const result = rmBuildStripItems(giornata);
    expect(result[0]).toContain('ITA 2–1 ESP');
    expect(result[0]).toContain('Finale');
  });

  it('formats live match with minute', () => {
    const giornata = [{
      day: 'G1',
      items: [{ home: { short: 'GER' }, away: { short: 'FRA' }, status: 'live', hs: 1, as: 0, minute: 67 }],
    }];
    const result = rmBuildStripItems(giornata);
    expect(result[0]).toContain('LIVE');
    expect(result[0]).toContain("67'");
  });

  it('formats scheduled match with date/time', () => {
    const giornata = [{
      day: 'Giornata 1',
      items: [{ home: { short: 'BRA' }, away: { short: 'ARG' }, status: 'sch', date: 'Dom 15', time: '20:00' }],
    }];
    const result = rmBuildStripItems(giornata);
    expect(result[0]).toContain('BRA vs ARG');
    expect(result[0]).toContain('Dom 15');
  });

  it('returns default message when no matches', () => {
    const result = rmBuildStripItems([]);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('Rinascita');
  });

  it('skips matches with missing home/away', () => {
    const giornata = [{ day: 'G1', items: [{ status: 'ft', hs: 1, as: 0 }] }];
    const result = rmBuildStripItems(giornata);
    expect(result[0]).toContain('Rinascita');
  });

  it('live match with minute 0 renders "0\'"', () => {
    const giornata = [{
      day: 'G1',
      items: [{ home: { short: 'ITA' }, away: { short: 'ESP' }, status: 'live', hs: 0, as: 0, minute: 0 }],
    }];
    const result = rmBuildStripItems(giornata);
    expect(result[0]).toContain("0'");
  });

  it('scheduled match with no date or time renders gracefully', () => {
    const giornata = [{
      day: 'Giornata 2',
      items: [{ home: { short: 'BRA' }, away: { short: 'GER' }, status: 'sch' }],
    }];
    const result = rmBuildStripItems(giornata);
    expect(result[0]).toContain('BRA vs GER');
    expect(result[0]).toContain('Giornata 2');
  });

  it('flattens multiple giornate into one list', () => {
    const giornata = [
      { day: 'G1', items: [{ home: { short: 'ITA' }, away: { short: 'ESP' }, status: 'ft', hs: 1, as: 0 }] },
      { day: 'G2', items: [{ home: { short: 'BRA' }, away: { short: 'GER' }, status: 'ft', hs: 2, as: 2 }] },
    ];
    expect(rmBuildStripItems(giornata)).toHaveLength(2);
  });
});

// ─── rmHydrateTournamentData ───────────────────────────────────────────────────

describe('rmHydrateTournamentData', () => {
  const defaults = {
    teams: [{ short: 'ITA', name: 'Italia', group_id: 'g1' }],
    groups: [{ id: 'g1', name: 'Girone A', color: '#00E676' }],
    matches_giornata: [],
  };

  it('always sets schema_version to current', () => {
    const result = rmHydrateTournamentData({}, defaults);
    expect(result.schema_version).toBe(RM_TOURNAMENT_SCHEMA_VERSION);
  });

  it('derives matches_today from matches_giornata', () => {
    const saved = {
      matches_giornata: [{
        day: 'G1',
        items: [{ home: { short: 'ITA' }, away: { short: 'ESP' }, status: 'live', date: 'Oggi' }],
      }],
    };
    const result = rmHydrateTournamentData(saved, defaults);
    expect(result.matches_today).toHaveLength(1);
  });

  it('derives strip_items from matches_giornata', () => {
    const saved = {
      matches_giornata: [{
        day: 'G1',
        items: [{ home: { short: 'ITA' }, away: { short: 'ESP' }, status: 'ft', hs: 2, as: 1 }],
      }],
    };
    const result = rmHydrateTournamentData(saved, defaults);
    expect(result.strip_items[0]).toContain('ITA 2–1 ESP');
  });

  it('computes standings from matches_giornata', () => {
    const saved = {
      teams: [
        { short: 'ITA', name: 'Italia', group_id: 'g1' },
        { short: 'ESP', name: 'Spagna', group_id: 'g1' },
      ],
      groups: [{ id: 'g1', name: 'Girone A', color: '#00E676' }],
      matches_giornata: [{
        day: 'G1',
        items: [{ home: { short: 'ITA' }, away: { short: 'ESP' }, status: 'ft', hs: 1, as: 0 }],
      }],
    };
    const result = rmHydrateTournamentData(saved, {});
    const gA = result.standings_groups[0];
    expect(gA.rows[0].short).toBe('ITA');
    expect(gA.rows[0].pt).toBe(3);
  });

  it('falls back to defaults when saved fields are absent', () => {
    const result = rmHydrateTournamentData(null, defaults);
    expect(result.teams).toEqual(defaults.teams.map(t => ({ ...t })));
  });

  it('normalizes teams in saved (removes legacy group field)', () => {
    const saved = { teams: [{ short: 'ITA', group: 'g1' }], groups: [] };
    const result = rmHydrateTournamentData(saved, {});
    expect(result.teams[0].group_id).toBe('g1');
    expect(result.teams[0].group).toBeUndefined();
  });
});

// ─── rmIsAdminSession ──────────────────────────────────────────────────────────

describe('rmIsAdminSession', () => {
  let store = {};

  beforeEach(() => {
    store = {};
    global.sessionStorage = {
      getItem: (key) => store[key] ?? null,
      setItem: (key, val) => { store[key] = String(val); },
      removeItem: (key) => { delete store[key]; },
      clear: () => { store = {}; },
    };
  });

  afterEach(() => {
    delete global.sessionStorage;
  });

  it('returns false when no session key exists', () => {
    expect(rmIsAdminSession()).toBe(false);
  });

  it('returns false when token is missing', () => {
    global.sessionStorage.setItem(RM_ADMIN_SESSION_KEY, JSON.stringify({
      expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    }));
    expect(rmIsAdminSession()).toBe(false);
  });

  it('returns false when session is expired', () => {
    global.sessionStorage.setItem(RM_ADMIN_SESSION_KEY, JSON.stringify({
      token: 'abc123',
      expires_at: new Date(Date.now() - 1000).toISOString(),
    }));
    expect(rmIsAdminSession()).toBe(false);
  });

  it('returns true for valid non-expired session', () => {
    global.sessionStorage.setItem(RM_ADMIN_SESSION_KEY, JSON.stringify({
      token: 'abc123',
      expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    }));
    expect(rmIsAdminSession()).toBe(true);
  });

  it('returns false when JSON is malformed', () => {
    global.sessionStorage.setItem(RM_ADMIN_SESSION_KEY, 'not{json');
    expect(rmIsAdminSession()).toBe(false);
  });
});

// ─── rmComputeStandings (additional edge cases) ────────────────────────────────

describe('rmComputeStandings — edge cases', () => {
  const GROUPS2 = [{ id: 'g1', name: 'Girone A', color: '#00E676' }];
  const TEAMS3 = [
    { short: 'ITA', name: 'Italia', group_id: 'g1' },
    { short: 'ESP', name: 'Spagna', group_id: 'g1' },
    { short: 'BRA', name: 'Brasile', group_id: 'g1' },
  ];

  it('accumulates stats across multiple matchdays', () => {
    const giornata = [
      { day: 'G1', items: [{ home: { short: 'ITA' }, away: { short: 'ESP' }, status: 'ft', hs: 1, as: 0 }] },
      { day: 'G2', items: [{ home: { short: 'ITA' }, away: { short: 'BRA' }, status: 'ft', hs: 2, as: 1 }] },
    ];
    const result = rmComputeStandings(giornata, TEAMS3, GROUPS2);
    const ita = result.standings_groups[0].rows.find(r => r.short === 'ITA');
    expect(ita.g).toBe(2);
    expect(ita.pt).toBe(6);
    expect(ita.gf).toBe(3);
  });

  it('goal difference tiebreaker: higher GD ranks first', () => {
    const giornata = [{
      day: 'G1',
      items: [
        { home: { short: 'ITA' }, away: { short: 'BRA' }, status: 'ft', hs: 3, as: 0 },
        { home: { short: 'ESP' }, away: { short: 'BRA' }, status: 'ft', hs: 1, as: 0 },
      ],
    }];
    const result = rmComputeStandings(giornata, TEAMS3, GROUPS2);
    const rows = result.standings_groups[0].rows;
    expect(rows[0].short).toBe('ITA');
    expect(rows[1].short).toBe('ESP');
  });

  it('goals scored tiebreaker: higher GF ranks first when pts and GD equal', () => {
    const giornata = [{
      day: 'G1',
      items: [
        { home: { short: 'ITA' }, away: { short: 'BRA' }, status: 'ft', hs: 2, as: 1 },
        { home: { short: 'ESP' }, away: { short: 'BRA' }, status: 'ft', hs: 3, as: 2 },
      ],
    }];
    const result = rmComputeStandings(giornata, TEAMS3, GROUPS2);
    const rows = result.standings_groups[0].rows;
    const espRow = rows.find(r => r.short === 'ESP');
    const itaRow = rows.find(r => r.short === 'ITA');
    expect(espRow.gf).toBeGreaterThan(itaRow.gf);
    expect(rows.indexOf(espRow)).toBeLessThan(rows.indexOf(itaRow));
  });

  it('form caps at last 5 entries', () => {
    const items = [
      { home: { short: 'ITA' }, away: { short: 'ESP' }, status: 'ft', hs: 1, as: 0 },
      { home: { short: 'ITA' }, away: { short: 'BRA' }, status: 'ft', hs: 1, as: 0 },
      { home: { short: 'ESP' }, away: { short: 'ITA' }, status: 'ft', hs: 0, as: 1 },
      { home: { short: 'BRA' }, away: { short: 'ITA' }, status: 'ft', hs: 0, as: 1 },
      { home: { short: 'ITA' }, away: { short: 'ESP' }, status: 'ft', hs: 0, as: 1 },
      { home: { short: 'ITA' }, away: { short: 'BRA' }, status: 'ft', hs: 1, as: 0 },
    ];
    const result = rmComputeStandings(
      [{ day: 'G1', items }], TEAMS3, GROUPS2
    );
    const ita = result.standings_groups[0].rows.find(r => r.short === 'ITA');
    expect(ita.form).toHaveLength(5);
  });

  it('unknown team in match does not throw', () => {
    const giornata = [{
      day: 'G1',
      items: [{ home: { short: 'XXX' }, away: { short: 'YYY' }, status: 'ft', hs: 1, as: 0 }],
    }];
    expect(() => rmComputeStandings(giornata, TEAMS3, GROUPS2)).not.toThrow();
  });
});

// ─── rmDeriveMatchesToday (additional edge cases) ─────────────────────────────

describe('rmDeriveMatchesToday — edge cases', () => {
  it('includes ft match when date is Oggi', () => {
    const giornata = [{
      day: 'G1',
      items: [{ home: { short: 'ITA' }, away: { short: 'ESP' }, status: 'ft', date: 'Oggi' }],
    }];
    expect(rmDeriveMatchesToday(giornata)).toHaveLength(1);
  });

  it('excludes match missing home', () => {
    const giornata = [{
      day: 'G1',
      items: [{ away: { short: 'ESP' }, status: 'live', date: 'Oggi' }],
    }];
    expect(rmDeriveMatchesToday(giornata)).toHaveLength(0);
  });

  it('combines live and Oggi matches from multiple matchdays', () => {
    const giornata = [
      { day: 'G1', items: [{ home: { short: 'ITA' }, away: { short: 'ESP' }, status: 'live', date: 'Oggi' }] },
      { day: 'G2', items: [{ home: { short: 'BRA' }, away: { short: 'GER' }, status: 'sch', date: 'Oggi' }] },
    ];
    expect(rmDeriveMatchesToday(giornata)).toHaveLength(2);
  });
});
