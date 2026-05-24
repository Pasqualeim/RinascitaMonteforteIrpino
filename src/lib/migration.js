import { rmAdminDomain } from './crud.js';

export const RM_TEAM_ID_MAP_KEY = 'rm_team_id_map_v1';

export function rmGetTeamIdMap() {
  try { return JSON.parse(localStorage.getItem(RM_TEAM_ID_MAP_KEY) || '{}'); } catch { return {}; }
}

export function rmSetTeamIdMap(map) {
  localStorage.setItem(RM_TEAM_ID_MAP_KEY, JSON.stringify(map));
}

export async function rmMigrateDataToRelational(data, editionId, tournamentId) {
  const results = { groups: 0, teams: 0, registrations: 0, matches: 0, scorers: 0, news: 0, events: 0, honors: 0, sponsors: 0, errors: [] };
  const groupIdMap = {};
  const teamIdMap  = {};

  for (const g of (data.groups || [])) {
    try {
      const res = await rmAdminDomain.createGroup({ tournament_id: tournamentId, name: g.name, color: g.color || '#00E676' });
      groupIdMap[g.id] = res?.data?.id || res?.id;
      results.groups++;
    } catch (e) { results.errors.push(`Girone ${g.name}: ${e.message}`); }
  }

  for (const t of (data.teams || [])) {
    try {
      const res = await rmAdminDomain.createTeam({ name: t.name, short: t.short, nation: t.nation, flag: t.flag, color: t.color });
      const teamId = res?.data?.id || res?.id;
      teamIdMap[t.short] = teamId;
      results.teams++;
      const localGroupId = t.group_id || t.group || '';
      await rmAdminDomain.upsertRegistration({
        team_id: teamId, tournament_id: tournamentId,
        group_id: groupIdMap[localGroupId] || null,
        captain: t.captain || null, players: t.players || [],
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
          tournament_id: tournamentId, group_id: groupId,
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
      await rmAdminDomain.createScorer({ tournament_id: tournamentId, player_name: s.name, team_id: teamIdMap[s.short] || null, goals: s.goals || 0 });
      results.scorers++;
    } catch (e) { results.errors.push(`Marcatore ${s.name}: ${e.message}`); }
  }

  for (const n of (data.news || [])) {
    try {
      // Support both 'category' (new) and 'cat' (legacy blob field name)
      await rmAdminDomain.createNews({ edition_id: editionId, title: n.title, body: n.text || n.body || null, category: n.category || n.cat || null, tone: n.tone, pinned: n.pinned ?? false });
      results.news++;
    } catch (e) { results.errors.push(`News: ${e.message}`); }
  }

  for (const ev of (data.events || [])) {
    try {
      // Support both relational shape {date,type,description} and legacy blob shape {day,month,kind,where}
      const MONTH_IT = { Gen:1,Feb:2,Mar:3,Apr:4,Mag:5,Giu:6,Lug:7,Ago:8,Set:9,Ott:10,Nov:11,Dic:12 };
      let eventDate = ev.date || null;
      if (!eventDate && ev.day && ev.month) {
        const m = MONTH_IT[ev.month] || MONTH_IT[ev.month?.slice(0,3)];
        if (m) eventDate = `${new Date().getFullYear()}-${String(m).padStart(2,'0')}-${String(ev.day).padStart(2,'0')}`;
      }
      const eventType = ev.type || ev.kind || 'partita';
      const description = ev.description || ev.desc || ev.where || null;
      await rmAdminDomain.createEvent({ edition_id: editionId, title: ev.title, event_date: eventDate, event_type: eventType, description });
      results.events++;
    } catch (e) { results.errors.push(`Evento: ${e.message}`); }
  }

  for (const h of (data.honors || [])) {
    try {
      // Support both 'runner_up'/'top_scorer' (DB) and 'runner'/'topScorer' (legacy blob)
      await rmAdminDomain.createHonor({
        edition_id: editionId, tournament_id: tournamentId || null,
        edition_name: h.edition || h.name || String(h.year || ''),
        year: parseInt(h.year) || 0,
        winner: h.winner || null,
        runner_up: h.runner_up || h.runner || h.second || null,
        third_place: h.third || null,
        mvp: h.mvp || null,
        top_scorer: h.top_scorer || h.topScorer || h.scorer || null,
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
