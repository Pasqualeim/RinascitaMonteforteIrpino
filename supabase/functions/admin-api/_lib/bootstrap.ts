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

    const matchIds = (matchesRes.data || []).map((m: any) => m.id);
    let allMatchEvents: any[] = [];
    if (matchIds.length > 0) {
      const evRes = await db.from("match_events")
        .select("id, match_id, player_name, team_id, event_type, minute, teams!match_events_team_id_fkey(short, flag)")
        .in("match_id", matchIds)
        .order("minute", { ascending: true });
      if (evRes.error) {
        // Fallback: fetch without join, team info resolved later via team_id
        const evResFallback = await db.from("match_events")
          .select("id, match_id, player_name, team_id, event_type, minute")
          .in("match_id", matchIds)
          .order("minute", { ascending: true });
        allMatchEvents = evResFallback.data || [];
      } else {
        allMatchEvents = evRes.data || [];
      }
    }
    const goalEventsRes = { data: allMatchEvents.filter((e: any) => e.event_type === "goal") };

    const groups      = groupsRes.data || [];
    const regs        = regsRes.data || [];
    const matches     = matchesRes.data || [];
    const live        = liveRes.data;
    const manualScorers = scorersRes.data || [];
    const goalEvents  = goalEventsRes.data || [];
    const standingsRaw = standingsRes.data || [];

    // Build auto-scorers from match_events goals
    const autoMap: Record<string, { name: string; team: string; flag: string; goals: number }> = {};
    for (const ev of goalEvents) {
      if (!ev.player_name) continue;
      const key = `${ev.player_name}__${(ev as any).teams?.short || ev.team_id}`;
      if (!autoMap[key]) autoMap[key] = { name: ev.player_name, team: (ev as any).teams?.short || "", flag: (ev as any).teams?.flag || "", goals: 0 };
      autoMap[key].goals++;
    }
    // Also count goals from the live match — but ONLY when they are not already
    // persisted as match_events. During a normal relational live match each goal is
    // written to match_events in real time AND kept in live.events, so counting both
    // would double the live match's scorers. Fall back to live.events only when the
    // live match has no persisted goal events (legacy match with no match_id, or a
    // failed event sync).
    const liveMatchId = live?.match_id || null;
    const liveMatchHasPersistedGoals = !!liveMatchId &&
      goalEvents.some((e: any) => e.match_id === liveMatchId);
    if (live?.active && Array.isArray(live.events) && !liveMatchHasPersistedGoals) {
      for (const ev of live.events) {
        if (ev.type !== 'goal' || !ev.player) continue;
        const teamShort = ev._ts || "";
        const key = `${ev.player}__${teamShort}`;
        if (!autoMap[key]) autoMap[key] = { name: ev.player, team: teamShort, flag: "", goals: 0 };
        autoMap[key].goals++;
      }
    }
    // Merge: manual overrides auto (staff correction), auto fills new players
    const manualKeys = new Set(manualScorers.map((s: any) => s.player_name));
    const autoOnlyScorers = Object.values(autoMap).filter(a => !manualKeys.has(a.name));
    const mergedScorers = [
      ...manualScorers.map((s: any) => ({ id: s.id, name: s.player_name, team: s.teams?.short || "", flag: s.teams?.flag || "", goals: s.goals })),
      ...autoOnlyScorers.map(a => ({ id: null, name: a.name, team: a.team, flag: a.flag, goals: a.goals })),
    ].sort((a, b) => b.goals - a.goals);

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

    const eventsPerMatch: Record<string, any[]> = {};
    for (const ev of allMatchEvents) {
      if (!eventsPerMatch[ev.match_id]) eventsPerMatch[ev.match_id] = [];
      eventsPerMatch[ev.match_id].push({
        id: ev.id,
        type: ev.event_type,
        player: ev.player_name || "",
        team: (ev as any).teams?.short || "",
        flag: (ev as any).teams?.flag || "",
        minute: ev.minute ?? null,
      });
    }

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
        events: eventsPerMatch[m.id]?.length > 0
          ? eventsPerMatch[m.id]
          : (live?.match_id === m.id && Array.isArray(live.events)
              ? live.events.map((ev: any) => ({ type: ev.type, player: ev.player || "", team: ev._ts || "", flag: "", minute: ev.min ?? null }))
              : []),
      });
    }

    return {
      id: t.id, name: t.name, slug: t.slug, sort_order: t.sort_order,
      prize_first: t.prize_first, prize_second: t.prize_second, prize_third: t.prize_third, prizes: t.prizes || [],
      registration_fee: t.registration_fee ?? null, min_teams: t.min_teams ?? null, max_teams: t.max_teams ?? null,
      registration_open: t.registration_open ?? null, registration_notes: t.registration_notes ?? null,
      groups, teams,
      standings_groups: Object.values(standingsMap),
      live_match: liveMatch,
      matches,
      matches_giornata: Object.values(phaseMap),
      scorers: mergedScorers,
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
    sponsors:(sponsorsRes.data|| []).map((s: any) => ({ id: s.id, name: s.name, logo_url: s.logo_url, website_url: s.website_url, tag: s.tag })),
    strip_items: (stripRes.data || []).map((s: any) => s.text),
    updated_at: new Date().toISOString(),
  };
}
