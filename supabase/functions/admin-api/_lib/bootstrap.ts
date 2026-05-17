import { db } from "./db.ts";

export async function buildBootstrap(editionId: string) {
  const [editionRes, tourRes, newsRes, eventsRes, honorsRes, sponsorsRes, stripRes] = await Promise.all([
    db.from("editions").select("*").eq("id", editionId).single(),
    db.from("tournaments").select("*").eq("edition_id", editionId).order("sort_order"),
    db.from("news").select("*").eq("edition_id", editionId)
      .order("pinned", { ascending: false }).order("created_at", { ascending: false }),
    db.from("edition_events").select("*").eq("edition_id", editionId)
      .order("sort_order").order("event_date"),
    db.from("honors").select("*").eq("edition_id", editionId).order("year", { ascending: false }),
    db.from("sponsors").select("*").eq("edition_id", editionId).order("sort_order"),
    db.from("strip_messages").select("*").eq("edition_id", editionId)
      .eq("active", true).order("sort_order"),
  ]);

  const edition = editionRes.data;
  const tournamentRows = tourRes.data || [];

  const tournaments = await Promise.all(tournamentRows.map(async (t: any) => {
    const [groupsRes, regsRes, matchesRes, liveRes, scorersRes, standingsRes] = await Promise.all([
      db.from("groups").select("*").eq("tournament_id", t.id).order("sort_order"),
      db.from("team_registrations").select("*, teams!inner(id,name,short,nation,flag,color)").eq("tournament_id", t.id),
      db.from("matches")
        .select("*, home_team:home_team_id(id,name,short,flag,color), away_team:away_team_id(id,name,short,flag,color)")
        .eq("tournament_id", t.id)
        .order("match_date", { ascending: true, nullsFirst: false })
        .order("match_time", { ascending: true, nullsFirst: false })
        .order("sort_order"),
      db.from("live_match_state")
        .select("*, home_team:home_team_id(id,name,short,flag,color), away_team:away_team_id(id,name,short,flag,color)")
        .eq("tournament_id", t.id).maybeSingle(),
      db.from("scorers").select("*, teams(short,flag)")
        .eq("tournament_id", t.id).order("goals", { ascending: false }).order("sort_order"),
      db.from("standings_view").select("*").eq("tournament_id", t.id),
    ]);

    const groups   = groupsRes.data || [];
    const regs     = regsRes.data || [];
    const matches  = matchesRes.data || [];
    const live     = liveRes.data;
    const scorers  = scorersRes.data || [];
    const standingsRaw = standingsRes.data || [];

    const teams = regs.map((r: any) => ({
      id: r.teams.id, name: r.teams.name, short: r.teams.short,
      nation: r.teams.nation, flag: r.teams.flag, color: r.teams.color,
      group_id: r.group_id, captain: r.captain, players: r.players || [],
      registration_id: r.id,
    }));

    const standingsMap: Record<string, any> = {};
    for (const row of standingsRaw) {
      if (!standingsMap[row.group_id])
        standingsMap[row.group_id] = { id: row.group_id, name: row.group_name, color: row.group_color, rows: [] };
      standingsMap[row.group_id].rows.push({
        short: row.team_short, name: row.team_name, flag: row.team_flag, color: row.team_color,
        g: row.g, v: row.v, n: row.n, p: row.p, gf: row.gf, gs: row.gs, gd: row.gd, pt: row.pt, form: [],
      });
    }

    const liveMatch = live ? {
      active: live.active,
      home: live.home_team ? { short: live.home_team.short, flag: live.home_team.flag, name: live.home_team.name, color: live.home_team.color } : null,
      away: live.away_team ? { short: live.away_team.short, flag: live.away_team.flag, name: live.away_team.name, color: live.away_team.color } : null,
      hs: live.home_score, as: live.away_score, minute: live.minute, phase: live.phase || null, timer_started_at: live.timer_started_at || null, pitch: live.pitch || "", events: Array.isArray(live.events) ? live.events : [],
    } : { active: false, home: null, away: null, hs: 0, as: 0, minute: 0, pitch: "", events: [] };

    const phaseMap: Record<string, any> = {};
    for (const m of matches) {
      const phase = m.phase || "Girone";
      if (!phaseMap[phase]) phaseMap[phase] = { day: phase, items: [] };
      phaseMap[phase].items.push({
        id: m.id,
        home: m.home_team ? { short: m.home_team.short, flag: m.home_team.flag, name: m.home_team.name, color: m.home_team.color } : null,
        away: m.away_team ? { short: m.away_team.short, flag: m.away_team.flag, name: m.away_team.name, color: m.away_team.color } : null,
        hs: m.home_score, as: m.away_score, status: m.status,
        date: m.match_date, time: m.match_time, pitch: m.pitch, phase: m.phase, group_id: m.group_id,
      });
    }

    return {
      id: t.id, name: t.name, slug: t.slug, sort_order: t.sort_order,
      prize_first: t.prize_first, prize_second: t.prize_second, prize_third: t.prize_third, prizes: t.prizes || [],
      groups, teams,
      standings_groups: Object.values(standingsMap),
      live_match: liveMatch,
      matches,
      matches_giornata: Object.values(phaseMap),
      scorers: scorers.map((s: any) => ({ id: s.id, name: s.player_name, team: s.teams?.short || "", flag: s.teams?.flag || "", goals: s.goals })),
    };
  }));

  const first = tournaments[0];
  return {
    schema_version: 3,
    edition: {
      id: edition?.id, name: edition?.name, year: edition?.year, slug: edition?.slug,
      status: edition?.status, kickoff_date: edition?.kickoff_date,
      start_date: edition?.start_date, end_date: edition?.end_date, location: edition?.location,
    },
    tournaments,
    groups:           first?.groups || [],
    teams:            first?.teams || [],
    standings_groups: first?.standings_groups || [],
    live_match:       first?.live_match || { active: false, home: null, away: null, hs: 0, as: 0, minute: 0, pitch: "", events: [] },
    matches:          first?.matches || [],
    matches_giornata: first?.matches_giornata || [],
    scorers:          first?.scorers || [],
    news:    (newsRes.data    || []).map((n: any) => ({ id: n.id, title: n.title, body: n.body, category: n.category, tone: n.tone, pinned: n.pinned, date: n.created_at })),
    events:  (eventsRes.data  || []).map((e: any) => ({ id: e.id, title: e.title, date: e.event_date, time: e.event_time, type: e.event_type, description: e.description })),
    honors:  (honorsRes.data  || []).map((h: any) => ({ id: h.id, edition: h.edition_name, year: h.year, winner: h.winner, runner_up: h.runner_up, third: h.third_place, mvp: h.mvp, top_scorer: h.top_scorer })),
    sponsors:(sponsorsRes.data|| []).map((s: any) => ({ id: s.id, name: s.name, logo: s.logo_url, url: s.website_url, tag: s.tag })),
    strip_items: (stripRes.data || []).map((s: any) => s.text),
    updated_at: new Date().toISOString(),
  };
}
