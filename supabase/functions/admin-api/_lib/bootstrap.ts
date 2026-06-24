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

    // Build auto-scorers from match_events goals.
    // NOTE: goalEvents already excludes own goals (event_type === "goal" only), so
    // an autogol never counts as a scorer. match_events for a match are written only
    // when the match ends (see admin live.jsx doTerminate), so the marcatori list
    // does NOT change while a match is live — this is intentional.
    //
    // Goals are aggregated by PLAYER NAME only (not name+team). A player keeps his
    // running goal tally when he changes team between phases (es. comprato da un'altra
    // squadra dopo i gironi): i suoi gol restano agganciati al nome e continuano a
    // sommarsi. The team/flag shown next to him is his CURRENT team — taken from the
    // roster he's now registered in (team_registrations.players); if he isn't in any
    // current roster, falls back to the team of his most recent goal.
    const nameKey = (s: string) => (s || "").trim().toLowerCase();

    // Chronological rank per match (matches already ordered by date/time/sort above).
    const matchOrder: Record<string, number> = {};
    matches.forEach((m: any, i: number) => { matchOrder[m.id] = i; });

    // Player full name -> current team(s) from rosters. Same `name` string the live
    // writes into match_events.player_name (built from "Nome Cognome"), so it matches.
    const rosterTeams: Record<string, { team_id: string; short: string; flag: string }[]> = {};
    for (const r of regs) {
      for (const p of (r.players || [])) {
        const k = nameKey(p.name || [p.nome, p.cognome].filter(Boolean).join(" "));
        if (!k) continue;
        (rosterTeams[k] ||= []).push({ team_id: r.teams.id, short: r.teams.short, flag: r.teams.flag });
      }
    }

    const autoMap: Record<string, {
      name: string; goals: number;
      lastTeamId: string; lastShort: string; lastFlag: string; lastRank: number;
    }> = {};
    for (const ev of goalEvents) {
      if (!ev.player_name) continue;
      const key = nameKey(ev.player_name);
      const short = (ev as any).teams?.short || "";
      const flag = (ev as any).teams?.flag || "";
      const rank = (matchOrder[ev.match_id] ?? 0) * 1000 + (ev.minute ?? 0);
      if (!autoMap[key]) autoMap[key] = { name: ev.player_name, goals: 0, lastTeamId: ev.team_id, lastShort: short, lastFlag: flag, lastRank: -1 };
      autoMap[key].goals++;
      if (rank >= autoMap[key].lastRank) {
        autoMap[key].lastRank = rank;
        autoMap[key].lastTeamId = ev.team_id;
        autoMap[key].lastShort = short;
        autoMap[key].lastFlag = flag;
      }
    }

    // Current team wins (the one matching his latest goal when in several rosters,
    // else the single/last roster); otherwise the team of his most recent goal.
    const resolveTeam = (key: string, a: { lastTeamId: string; lastShort: string; lastFlag: string }) => {
      const rosters = rosterTeams[key];
      if (rosters && rosters.length) {
        const pick = rosters.find(rt => rt.team_id === a.lastTeamId) || rosters[rosters.length - 1];
        return { team: pick.short, flag: pick.flag };
      }
      return { team: a.lastShort, flag: a.lastFlag };
    };

    // Merge: manual overrides auto (staff correction), auto fills new players
    const manualKeys = new Set(manualScorers.map((s: any) => nameKey(s.player_name)));
    const autoOnlyScorers = Object.entries(autoMap)
      .filter(([key]) => !manualKeys.has(key))
      .map(([key, a]) => {
        const t = resolveTeam(key, a);
        return { id: null, name: a.name, team: t.team, flag: t.flag, goals: a.goals };
      });
    const mergedScorers = [
      ...manualScorers.map((s: any) => ({ id: s.id, name: s.player_name, team: s.teams?.short || "", flag: s.teams?.flag || "", goals: s.goals })),
      ...autoOnlyScorers,
    ].sort((a, b) => b.goals - a.goals);

    // Per-team aggregate stats from standings_view (counts only status='ft' matches).
    const statsByTeam: Record<string, any> = {};
    for (const row of standingsRaw) {
      statsByTeam[row.team_id] = {
        played: row.g, won: row.v, drawn: row.n, lost: row.p,
        goals: row.gf, goalsAgainst: row.gs, points: row.pt,
      };
    }

    const teams = regs.map((r: any) => {
      const s = statsByTeam[r.teams.id] || {};
      return {
        id: r.teams.id, name: r.teams.name, short: r.teams.short,
        nation: r.teams.nation, flag: r.teams.flag, color: r.teams.color,
        group_id: r.group_id, captain: r.captain, players: r.players || [],
        registration_id: r.id,
        played: s.played ?? 0, won: s.won ?? 0, drawn: s.drawn ?? 0, lost: s.lost ?? 0,
        goals: s.goals ?? 0, goalsAgainst: s.goalsAgainst ?? 0, points: s.points ?? 0,
      };
    });

    const groupQualify: Record<string, number> = {};
    const groupOrder: Record<string, number> = {};
    groups.forEach((g: any, i: number) => {
      groupQualify[g.id] = g.qualify_count ?? 2;
      // Deterministic girone order for standings (A, B, C…). standings_view has no
      // ORDER BY, so without this the public table order is incidental and can flip.
      groupOrder[g.id] = g.sort_order ?? i;
    });

    const standingsMap: Record<string, any> = {};
    for (const row of standingsRaw) {
      if (!standingsMap[row.group_id])
        standingsMap[row.group_id] = { id: row.group_id, name: row.group_name, color: row.group_color, qualify_count: groupQualify[row.group_id] ?? 2, rows: [] };
      standingsMap[row.group_id].rows.push({
        short: row.team_short, name: row.team_name, flag: row.team_flag, color: row.team_color,
        g: row.g, v: row.v, n: row.n, p: row.p, gf: row.gf, gs: row.gs, gd: row.gd, pt: row.pt, form: [],
      });
    }

    const liveMatch = live ? {
      active: live.active,
      // Expose match_id so the admin live board keeps the link after a page reload.
      // Without it, lm.match_id becomes null on rehydrate → terminate skips persisting
      // match_events AND the public calendar can't attach live events to the match tile.
      match_id: live.match_id || null,
      home: live.home_team ? { short: live.home_team.short, flag: live.home_team.flag, name: live.home_team.name, color: live.home_team.color } : null,
      away: live.away_team ? { short: live.away_team.short, flag: live.away_team.flag, name: live.away_team.name, color: live.away_team.color } : null,
      hs: live.home_score, as: live.away_score, minute: live.minute, phase: live.phase || null, timer_started_at: live.timer_started_at || null, pitch: live.pitch || "", events: Array.isArray(live.events) ? live.events : [],
    } : { active: false, match_id: null, home: null, away: null, hs: 0, as: 0, minute: 0, pitch: "", events: [] };

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
      standings_groups: Object.values(standingsMap).sort(
        (a: any, b: any) => (groupOrder[a.id] ?? 99) - (groupOrder[b.id] ?? 99)
      ),
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
