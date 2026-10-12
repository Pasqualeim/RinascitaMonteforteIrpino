import { db } from "./db.ts";

// World-Cup style tiebreak: teams level on points are re-ordered using a mini
// classifica built only from FT matches played directly between the tied teams
// (h2h points → h2h goal difference → h2h goals scored), falling back to the
// overall goal difference/goals scored/name when the head-to-head is itself even
// (e.g. tied teams never played each other, or a 3-way cycle).
function applyHeadToHeadTiebreak(rows: any[], groupMatches: any[]) {
  const sortedByPt = [...rows].sort((a, b) => b.pt - a.pt);
  const clusters: any[][] = [];
  let i = 0;
  while (i < sortedByPt.length) {
    let j = i + 1;
    while (j < sortedByPt.length && sortedByPt[j].pt === sortedByPt[i].pt) j++;
    clusters.push(sortedByPt.slice(i, j));
    i = j;
  }

  const result: any[] = [];
  for (const cluster of clusters) {
    if (cluster.length < 2) { result.push(...cluster); continue; }
    const ids = new Set(cluster.map((r) => r.team_id));
    const h2h: Record<string, { pt: number; gf: number; gs: number }> = {};
    for (const r of cluster) h2h[r.team_id] = { pt: 0, gf: 0, gs: 0 };
    for (const m of groupMatches) {
      if (!ids.has(m.home_team_id) || !ids.has(m.away_team_id)) continue;
      const hs = m.home_score ?? 0, as = m.away_score ?? 0;
      h2h[m.home_team_id].gf += hs; h2h[m.home_team_id].gs += as;
      h2h[m.away_team_id].gf += as; h2h[m.away_team_id].gs += hs;
      if (hs > as) h2h[m.home_team_id].pt += 3;
      else if (hs < as) h2h[m.away_team_id].pt += 3;
      else { h2h[m.home_team_id].pt += 1; h2h[m.away_team_id].pt += 1; }
    }
    const sortedCluster = [...cluster].sort((a, b) => {
      const ha = h2h[a.team_id], hb = h2h[b.team_id];
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
function applyManualOrder(rows: any[]) {
  const withOverride = rows.filter((r) => r.rank_override != null);
  if (withOverride.length === 0) return rows;
  const sortedOverride = [...withOverride].sort((a, b) => a.rank_override - b.rank_override);
  const withoutOverride = rows.filter((r) => r.rank_override == null);
  return [...sortedOverride, ...withoutOverride];
}

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
    const [groupsRes, regsRes, matchesRes, liveRes, scorersRes, standingsRes, koRes] = await Promise.all([
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
      db.from("knockout_ties")
        .select("*, home_team:home_team_id(id,name,short,flag,color), away_team:away_team_id(id,name,short,flag,color)")
        .eq("tournament_id", t.id).order("sort_order"),
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

    // Build auto-scorers from match_events goals, split gironi vs eliminatorie (decisione
    // staff: i gol dei gironi non contano per la classifica marcatori ufficiale — il
    // conteggio inizia solo dalle fasi eliminatorie). matches.group_id è il segnale
    // affidabile: non nullo = partita di girone, nullo = eliminatoria.
    //
    // NOTE: goalEvents already excludes own goals (event_type === "goal" only), so
    // an autogol never counts as a scorer. match_events for a match are written only
    // when the match ends (see admin live.jsx doTerminate), so the marcatori list
    // does NOT change while a match is live — this is intentional.
    //
    // Within each bucket, goals are aggregated by PLAYER NAME only (not name+team), so a
    // player keeps his running tally within that bucket if his goal-event team changes
    // (es. comprato da un'altra squadra dopo i gironi). The eliminatorie bucket shows his
    // CURRENT team (from team_registrations.players — updated by staff when they move a
    // player), so a transfer takes effect immediately. The gironi bucket instead shows the
    // team recorded on the goal itself (frozen historical), since those goals happened
    // before any transfer and the list is purely informational.
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

    const matchIsGroupStage: Record<string, boolean> = {};
    for (const m of matches) matchIsGroupStage[m.id] = m.group_id != null;

    function buildScorersList(events: any[], manualRows: any[], useRosterOverride: boolean) {
      const autoMap: Record<string, {
        name: string; goals: number;
        lastTeamId: string; lastShort: string; lastFlag: string; lastRank: number;
      }> = {};
      for (const ev of events) {
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

      // Eliminatorie: current team wins (the one matching his latest goal when in several
      // rosters, else the single/last roster); otherwise the team of his most recent goal.
      // Gironi: always the team of his most recent (group-stage) goal — never overridden by
      // a later roster change, so the list stays historically accurate.
      const resolveTeam = (key: string, a: { lastTeamId: string; lastShort: string; lastFlag: string }) => {
        if (useRosterOverride) {
          const rosters = rosterTeams[key];
          if (rosters && rosters.length) {
            const pick = rosters.find(rt => rt.team_id === a.lastTeamId) || rosters[rosters.length - 1];
            return { team: pick.short, flag: pick.flag };
          }
        }
        return { team: a.lastShort, flag: a.lastFlag };
      };

      // Merge: manual overrides auto (staff correction), auto fills new players
      const manualKeys = new Set(manualRows.map((s: any) => nameKey(s.player_name)));
      const autoOnlyScorers = Object.entries(autoMap)
        .filter(([key]) => !manualKeys.has(key))
        .map(([key, a]) => {
          const t = resolveTeam(key, a);
          return { id: null, name: a.name, team: t.team, flag: t.flag, goals: a.goals };
        });
      return [
        ...manualRows.map((s: any) => ({ id: s.id, name: s.player_name, team: s.teams?.short || "", flag: s.teams?.flag || "", goals: s.goals })),
        ...autoOnlyScorers,
      ].sort((a, b) => b.goals - a.goals);
    }

    const goalEventsGirone = goalEvents.filter((ev: any) => matchIsGroupStage[ev.match_id]);
    const goalEventsKo = goalEvents.filter((ev: any) => !matchIsGroupStage[ev.match_id]);
    const manualScorersGirone = manualScorers.filter((s: any) => s.phase === "girone");
    const manualScorersKo = manualScorers.filter((s: any) => s.phase !== "girone");

    const mergedScorersGirone = buildScorersList(goalEventsGirone, manualScorersGirone, false);
    const mergedScorersKo = buildScorersList(goalEventsKo, manualScorersKo, true);

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
        registration_id: r.id, penalty_points: r.penalty_points ?? 0,
        rank_override: r.rank_override ?? null,
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

    const regByTeamId: Record<string, any> = {};
    for (const r of regs) regByTeamId[r.team_id] = r;

    const standingsMap: Record<string, any> = {};
    for (const row of standingsRaw) {
      if (!standingsMap[row.group_id])
        standingsMap[row.group_id] = { id: row.group_id, name: row.group_name, color: row.group_color, qualify_count: groupQualify[row.group_id] ?? 2, rows: [] };
      standingsMap[row.group_id].rows.push({
        team_id: row.team_id,
        short: row.team_short, name: row.team_name, flag: row.team_flag, color: row.team_color,
        g: row.g, v: row.v, n: row.n, p: row.p, gf: row.gf, gs: row.gs, gd: row.gd,
        pen: row.penalty_points ?? 0, pt: row.pt, form: [],
        rank_override: regByTeamId[row.team_id]?.rank_override ?? null,
      });
    }
    for (const groupId of Object.keys(standingsMap)) {
      const groupMatches = matches.filter((m: any) => m.group_id === groupId && m.status === "ft");
      standingsMap[groupId].rows = applyManualOrder(applyHeadToHeadTiebreak(standingsMap[groupId].rows, groupMatches));
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
      // Minuti per tempo della categoria: il pubblico calcola il minuto del 2° tempo come half_duration + trascorso.
      half_duration: t.half_duration ?? null,
    } : { active: false, match_id: null, home: null, away: null, hs: 0, as: 0, minute: 0, pitch: "", events: [], half_duration: t.half_duration ?? null };

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

    // Tabellone qualificazione (fase a eliminazione) — incroci gestibili come partite.
    // home_label/away_label restano come fallback finché le squadre reali non sono note.
    const bracket = (koRes.data || []).map((k: any) => ({
      id: k.id, round: k.round || "", sort_order: k.sort_order ?? 0,
      home_label: k.home_label || "", away_label: k.away_label || "",
      home_team: k.home_team ? { id: k.home_team.id, name: k.home_team.name, short: k.home_team.short, flag: k.home_team.flag, color: k.home_team.color } : null,
      away_team: k.away_team ? { id: k.away_team.id, name: k.away_team.name, short: k.away_team.short, flag: k.away_team.flag, color: k.away_team.color } : null,
      home_score: k.home_score ?? null, away_score: k.away_score ?? null,
      status: k.status || "sch",
      date: k.match_date || null, time: k.match_time || null, pitch: k.pitch || "",
    }));

    return {
      id: t.id, name: t.name, slug: t.slug, sort_order: t.sort_order,
      prize_first: t.prize_first, prize_second: t.prize_second, prize_third: t.prize_third, prizes: t.prizes || [],
      registration_fee: t.registration_fee ?? null, min_teams: t.min_teams ?? null, max_teams: t.max_teams ?? null,
      registration_open: t.registration_open ?? null, registration_notes: t.registration_notes ?? null,
      bracket_intro: t.bracket_intro ?? null, bracket,
      half_duration: t.half_duration ?? null,
      groups, teams,
      standings_groups: Object.values(standingsMap).sort(
        (a: any, b: any) => (groupOrder[a.id] ?? 99) - (groupOrder[b.id] ?? 99)
      ),
      live_match: liveMatch,
      matches,
      matches_giornata: Object.values(phaseMap),
      // scorers = classifica marcatori UFFICIALE (solo gol da fasi eliminatorie).
      // scorers_girone = lista informativa gol fase a gironi, non ufficiale/non conta.
      scorers: mergedScorersKo,
      scorers_girone: mergedScorersGirone,
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
    scorers_girone:   first?.scorers_girone || [],
    bracket:          first?.bracket || [],
    bracket_intro:    first?.bracket_intro ?? null,
    news:    (newsRes.data    || []).map((n: any) => ({ id: n.id, title: n.title, body: n.body, category: n.category, tone: n.tone, pinned: n.pinned, date: n.created_at })),
    events:  (eventsRes.data  || []).map((e: any) => ({ id: e.id, title: e.title, date: e.event_date, time: e.event_time, type: e.event_type, description: e.description })),
    honors:  (honorsRes.data  || []).map((h: any) => ({ id: h.id, edition: h.edition_name, year: h.year, winner: h.winner, runner_up: h.runner_up, third: h.third_place, mvp: h.mvp, top_scorer: h.top_scorer })),
    sponsors:(sponsorsRes.data|| []).map((s: any) => ({ id: s.id, name: s.name, logo_url: s.logo_url, website_url: s.website_url, tag: s.tag })),
    strip_items: (stripRes.data || []).map((s: any) => s.text),
    updated_at: new Date().toISOString(),
  };
}
