export const RM_TOURNAMENT_SCHEMA_VERSION = 3;
export const RM_ADMIN_SESSION_KEY = 'rm_admin_session_v1';
const GROUP_COLOR_FALLBACK = '#00E676';

/*
  TournamentData schema v2
  - teams[].group_id is the only supported team/group relation
  - matches_today and strip_items are always derived at runtime
  - standings_a / standings_o40 / standings_jr remain empty legacy aliases
  - category is no longer persisted on teams
*/

export function rmGetTeamGroupId(team) {
  return team?.group_id ?? team?.group ?? '';
}

export function rmNormalizeTeam(team) {
  if (!team || typeof team !== 'object') return team;
  const normalized = { ...team };
  normalized.group_id = rmGetTeamGroupId(team);
  delete normalized.group;
  delete normalized._group;
  delete normalized.category;
  return normalized;
}

export function rmNormalizeGroup(group) {
  if (!group || typeof group !== 'object') return group;
  return { ...group, color: group.color || GROUP_COLOR_FALLBACK };
}

export function rmNormalizeTournamentData(saved) {
  if (!saved || typeof saved !== 'object') return saved;
  const normalized = { ...saved };
  normalized.teams = Array.isArray(saved.teams) ? saved.teams.map(rmNormalizeTeam) : [];
  normalized.groups = Array.isArray(saved.groups) ? saved.groups.map(rmNormalizeGroup) : [];
  normalized.schema_version = RM_TOURNAMENT_SCHEMA_VERSION;
  // V3 extras: preserve edition/tournament metadata if present
  if (saved.edition) normalized.edition = saved.edition;
  if (saved.tournament) normalized.tournament = saved.tournament;
  delete normalized._auth;
  delete normalized.matches_today;
  delete normalized.strip_items;
  delete normalized.standings_a;
  delete normalized.standings_o40;
  delete normalized.standings_jr;
  return normalized;
}

export function rmHydrateTournamentData(saved, defaults = {}) {
  const normalized = rmNormalizeTournamentData(saved) || {};
  const matchesGiornata = normalized.matches_giornata || defaults.matches_giornata || [];
  const teams = normalized.teams || defaults.teams || [];
  const groups = normalized.groups || defaults.groups || [];
  const computedStandings = rmComputeStandings(matchesGiornata, teams, groups);
  return {
    ...defaults,
    ...normalized,
    ...computedStandings,
    matches_today: rmDeriveMatchesToday(matchesGiornata),
    strip_items: rmBuildStripItems(matchesGiornata),
    schema_version: RM_TOURNAMENT_SCHEMA_VERSION,
  };
}

export function rmDeriveMatchesToday(matchesGiornata) {
  const todayISO = new Date().toISOString().slice(0, 10);
  const timeKey = (m) => (typeof m.time === 'string' && /^\d{1,2}:\d{2}$/.test(m.time)) ? m.time.padStart(5, '0') : '99:99';
  return (matchesGiornata || [])
    .flatMap(group => group.items || [])
    .filter(match => match?.home && match?.away && (match.status === 'live' || match.date === 'Oggi' || match.date === todayISO))
    .sort((a, b) => timeKey(a).localeCompare(timeKey(b)))
    .slice(0, 5);
}

export function rmBuildStripItems(matchesGiornata) {
  const items = [];
  for (const group of matchesGiornata || []) {
    for (const match of group.items || []) {
      if (!match?.home || !match?.away) continue;
      if (match.status === 'ft') {
        items.push(`${match.home.short} ${match.hs ?? 0}–${match.as ?? 0} ${match.away.short} · Finale`);
      } else if (match.status === 'live') {
        items.push(`🔴 LIVE · ${match.home.short} ${match.hs ?? 0}–${match.as ?? 0} ${match.away.short} · ${match.minute}'`);
      } else {
        items.push(`${match.home.short} vs ${match.away.short} · ${match.date || ''} ${match.time || ''} · ${group.day}`);
      }
    }
  }
  return items.length > 0
    ? items
    : ['Rinascita Monteforte Cup 2026 · Al via il 15 Giugno · Campo Sportivo Monteforte Irpino'];
}

// World-Cup style tiebreak: teams level on points are re-ordered using a mini
// classifica built only from FT matches played directly between the tied teams
// (h2h points → h2h goal difference → h2h goals scored), falling back to the
// overall goal difference/goals scored/name when the head-to-head is itself even
// (e.g. tied teams never played each other, or a 3-way cycle). Mirrors the
// server-side tiebreak in supabase/functions/admin-api/_lib/bootstrap.ts so
// admin and public always agree on group order.
export function rmApplyHeadToHeadTiebreak(rows, groupMatches) {
  const sortedByPt = [...rows].sort((a, b) => b.pt - a.pt);
  const clusters = [];
  let i = 0;
  while (i < sortedByPt.length) {
    let j = i + 1;
    while (j < sortedByPt.length && sortedByPt[j].pt === sortedByPt[i].pt) j++;
    clusters.push(sortedByPt.slice(i, j));
    i = j;
  }

  const result = [];
  for (const cluster of clusters) {
    if (cluster.length < 2) { result.push(...cluster); continue; }
    const shorts = new Set(cluster.map(r => r.short));
    const h2h = {};
    for (const r of cluster) h2h[r.short] = { pt: 0, gf: 0, gs: 0 };
    for (const m of groupMatches || []) {
      if (!m.home || !m.away || !shorts.has(m.home.short) || !shorts.has(m.away.short)) continue;
      const hs = m.hs ?? 0, as = m.as ?? 0;
      h2h[m.home.short].gf += hs; h2h[m.home.short].gs += as;
      h2h[m.away.short].gf += as; h2h[m.away.short].gs += hs;
      if (hs > as) h2h[m.home.short].pt += 3;
      else if (hs < as) h2h[m.away.short].pt += 3;
      else { h2h[m.home.short].pt += 1; h2h[m.away.short].pt += 1; }
    }
    const sortedCluster = [...cluster].sort((a, b) => {
      const ha = h2h[a.short], hb = h2h[b.short];
      if (hb.pt !== ha.pt) return hb.pt - ha.pt;
      const gdA = ha.gf - ha.gs, gdB = hb.gf - hb.gs;
      if (gdB !== gdA) return gdB - gdA;
      if (hb.gf !== ha.gf) return hb.gf - ha.gf;
      const ogdA = (a.gf ?? 0) - (a.gs ?? 0), ogdB = (b.gf ?? 0) - (b.gs ?? 0);
      if (ogdB !== ogdA) return ogdB - ogdA;
      if ((b.gf ?? 0) !== (a.gf ?? 0)) return (b.gf ?? 0) - (a.gf ?? 0);
      return String(a.name).localeCompare(String(b.name));
    });
    result.push(...sortedCluster);
  }
  return result;
}

// Override manuale staff (posizione fissata a mano dal tab Classifica): le righe
// con rank_override impostato vanno per prime, in quell'ordine; le altre restano
// nell'ordine calcolato automaticamente e chiudono la lista.
export function rmApplyManualOrder(rows) {
  const withOverride = rows.filter(r => r.rank_override != null);
  if (withOverride.length === 0) return rows;
  const sortedOverride = [...withOverride].sort((a, b) => a.rank_override - b.rank_override);
  const withoutOverride = rows.filter(r => r.rank_override == null);
  return [...sortedOverride, ...withoutOverride];
}

export function rmComputeStandings(giornata, teams, groups) {
  const teamGroup = {};
  for (const team of teams || []) {
    const groupId = rmGetTeamGroupId(team);
    if (groupId) teamGroup[team.short] = groupId;
  }

  const groupMap = {};
  for (const group of groups || []) {
    groupMap[group.id] = {
      id: group.id,
      name: group.name,
      color: group.color || GROUP_COLOR_FALLBACK,
      qualify_count: group.qualify_count ?? 2,
      rows: {},
      matches: [],
    };
  }

  for (const team of teams || []) {
    const groupId = rmGetTeamGroupId(team);
    if (!groupId || !groupMap[groupId]) continue;
    groupMap[groupId].rows[team.short] = {
      short: team.short, name: team.name, color: team.color, flag: team.flag || '',
      g: 0, v: 0, n: 0, p: 0, gf: 0, gs: 0, pt: 0, form: [],
      pen: Math.max(0, parseInt(team.penalty_points, 10) || 0),
      rank_override: team.rank_override ?? null,
    };
  }

  const allMatches = (giornata || []).flatMap(group => group.items || []);
  for (const match of allMatches) {
    if (match.status !== 'ft' || match.hs == null || match.as == null || !match.home || !match.away) continue;
    const homeGroupId = teamGroup[match.home.short];
    const awayGroupId = teamGroup[match.away.short];
    if (!homeGroupId || homeGroupId !== awayGroupId || !groupMap[homeGroupId]) continue;
    const homeRow = groupMap[homeGroupId].rows[match.home.short];
    const awayRow = groupMap[homeGroupId].rows[match.away.short];
    if (!homeRow || !awayRow) continue;

    groupMap[homeGroupId].matches.push(match);

    homeRow.g += 1; awayRow.g += 1;
    homeRow.gf += match.hs; homeRow.gs += match.as;
    awayRow.gf += match.as; awayRow.gs += match.hs;

    if (match.hs > match.as) {
      homeRow.v += 1; homeRow.pt += 3; awayRow.p += 1;
      homeRow.form = [...homeRow.form.slice(-4), 'W'];
      awayRow.form = [...awayRow.form.slice(-4), 'L'];
    } else if (match.hs < match.as) {
      awayRow.v += 1; awayRow.pt += 3; homeRow.p += 1;
      homeRow.form = [...homeRow.form.slice(-4), 'L'];
      awayRow.form = [...awayRow.form.slice(-4), 'W'];
    } else {
      homeRow.n += 1; awayRow.n += 1; homeRow.pt += 1; awayRow.pt += 1;
      homeRow.form = [...homeRow.form.slice(-4), 'D'];
      awayRow.form = [...awayRow.form.slice(-4), 'D'];
    }
  }

  // Penalità (es. -1 a tavolino) sottratte dai punti calcolati dai risultati FT.
  for (const group of Object.values(groupMap)) {
    for (const row of Object.values(group.rows)) {
      row.pt -= row.pen || 0;
    }
  }

  const standingsGroups = Object.values(groupMap).map(group => ({
    id: group.id, name: group.name, color: group.color, qualify_count: group.qualify_count,
    rows: rmApplyManualOrder(rmApplyHeadToHeadTiebreak(Object.values(group.rows), group.matches)),
  }));

  return { standings_groups: standingsGroups, standings_a: [], standings_o40: [], standings_jr: [] };
}

export function rmIsAdminSession() {
  try {
    const raw = sessionStorage.getItem(RM_ADMIN_SESSION_KEY);
    if (!raw) return false;
    const session = JSON.parse(raw);
    const expiresAt = new Date(session?.expires_at || 0).getTime();
    return !!session?.token && Number.isFinite(expiresAt) && expiresAt > Date.now();
  } catch {
    return false;
  }
}

export function rmCanAttemptRemoteSync() {
  try {
    const href = (window.location.href || '').toLowerCase();
    return href.includes('/admin.html') || href.endsWith('admin.html') || href.includes('admin.html#')
      ? rmIsAdminSession()
      : false;
  } catch {
    return false;
  }
}
