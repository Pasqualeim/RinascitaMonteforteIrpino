(function attachDomainHelpers(window) {
  const ADMIN_SESSION_KEY = 'rm_admin_session_v1';
  const GROUP_COLOR_FALLBACK = '#00E676';
  const TOURNAMENT_SCHEMA_VERSION = 2;

  /*
    TournamentData schema v2
    - teams[].group_id is the only supported team/group relation
    - matches_today and strip_items are always derived at runtime
    - standings_a / standings_o40 / standings_jr remain empty legacy aliases
    - category is no longer persisted on teams
  */

  function rmGetTeamGroupId(team) {
    return team?.group_id ?? team?.group ?? '';
  }

  function rmNormalizeTeam(team) {
    if (!team || typeof team !== 'object') return team;

    const normalized = { ...team };
    normalized.group_id = rmGetTeamGroupId(team);
    delete normalized.group;
    delete normalized._group;
    delete normalized.category;
    return normalized;
  }

  function rmNormalizeGroup(group) {
    if (!group || typeof group !== 'object') return group;
    return { ...group, color: group.color || GROUP_COLOR_FALLBACK };
  }

  function rmNormalizeTournamentData(saved) {
    if (!saved || typeof saved !== 'object') return saved;

    const normalized = { ...saved };
    normalized.teams = Array.isArray(saved.teams) ? saved.teams.map(rmNormalizeTeam) : [];
    normalized.groups = Array.isArray(saved.groups) ? saved.groups.map(rmNormalizeGroup) : [];
    normalized.schema_version = TOURNAMENT_SCHEMA_VERSION;

    delete normalized._auth;
    delete normalized.matches_today;
    delete normalized.strip_items;
    delete normalized.standings_a;
    delete normalized.standings_o40;
    delete normalized.standings_jr;

    return normalized;
  }

  function rmHydrateTournamentData(saved, defaults = {}) {
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
      schema_version: TOURNAMENT_SCHEMA_VERSION,
    };
  }

  function rmDeriveMatchesToday(matchesGiornata) {
    return (matchesGiornata || [])
      .flatMap(group => group.items || [])
      .filter(match => match?.home && match?.away && (match.status === 'live' || match.date === 'Oggi'))
      .slice(0, 5);
  }

  function rmBuildStripItems(matchesGiornata) {
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

  function rmComputeStandings(giornata, teams, groups) {
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
        rows: {},
      };
    }

    for (const team of teams || []) {
      const groupId = rmGetTeamGroupId(team);
      if (!groupId || !groupMap[groupId]) continue;

      groupMap[groupId].rows[team.short] = {
        short: team.short,
        name: team.name,
        color: team.color,
        flag: team.flag || '',
        g: 0,
        v: 0,
        n: 0,
        p: 0,
        gf: 0,
        gs: 0,
        pt: 0,
        form: [],
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

      homeRow.g += 1;
      awayRow.g += 1;
      homeRow.gf += match.hs;
      homeRow.gs += match.as;
      awayRow.gf += match.as;
      awayRow.gs += match.hs;

      if (match.hs > match.as) {
        homeRow.v += 1;
        homeRow.pt += 3;
        awayRow.p += 1;
        homeRow.form = [...homeRow.form.slice(-4), 'W'];
        awayRow.form = [...awayRow.form.slice(-4), 'L'];
      } else if (match.hs < match.as) {
        awayRow.v += 1;
        awayRow.pt += 3;
        homeRow.p += 1;
        homeRow.form = [...homeRow.form.slice(-4), 'L'];
        awayRow.form = [...awayRow.form.slice(-4), 'W'];
      } else {
        homeRow.n += 1;
        awayRow.n += 1;
        homeRow.pt += 1;
        awayRow.pt += 1;
        homeRow.form = [...homeRow.form.slice(-4), 'D'];
        awayRow.form = [...awayRow.form.slice(-4), 'D'];
      }
    }

    const standingsGroups = Object.values(groupMap).map(group => ({
      id: group.id,
      name: group.name,
      color: group.color,
      rows: Object.values(group.rows).sort((a, b) =>
        b.pt - a.pt || (b.gf - b.gs) - (a.gf - a.gs) || b.gf - a.gf
      ),
    }));

    return {
      standings_groups: standingsGroups,
      standings_a: [],
      standings_o40: [],
      standings_jr: [],
    };
  }

  function rmIsAdminSession() {
    try {
      const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
      if (!raw) return false;
      const session = JSON.parse(raw);
      const expiresAt = new Date(session?.expires_at || 0).getTime();
      return !!session?.token && Number.isFinite(expiresAt) && expiresAt > Date.now();
    } catch (error) {
      return false;
    }
  }

  function rmCanAttemptRemoteSync() {
    try {
      const href = (window.location.href || '').toLowerCase();
      return href.includes('/admin.html') || href.endsWith('admin.html') || href.includes('admin.html#')
        ? rmIsAdminSession()
        : false;
    } catch (error) {
      return false;
    }
  }

  Object.assign(window, {
    RM_TOURNAMENT_SCHEMA_VERSION: TOURNAMENT_SCHEMA_VERSION,
    RM_ADMIN_SESSION_KEY: ADMIN_SESSION_KEY,
    rmBuildStripItems,
    rmCanAttemptRemoteSync,
    rmComputeStandings,
    rmDeriveMatchesToday,
    rmGetTeamGroupId,
    rmNormalizeGroup,
    rmNormalizeTeam,
    rmNormalizeTournamentData,
    rmHydrateTournamentData,
  });
})(window);
