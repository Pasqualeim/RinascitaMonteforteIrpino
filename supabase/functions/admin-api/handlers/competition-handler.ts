import { db } from "../_lib/db.ts";
import { ok } from "../_lib/helpers.ts";
import { requireSession } from "../_lib/session.ts";

export async function competitionHandler(req: Request, base: string, id: string | null): Promise<Response | null> {
  const ROUTES = ["/groups","/teams","/registrations","/matches","/match-events","/live","/scorers","/knockout-ties"];
  if (!ROUTES.includes(base)) return null;

  const auth = await requireSession(req);
  if (auth.error) return ok(req, 401, { error: auth.error });
  const method = req.method;
  const body = method !== "GET" && method !== "DELETE" ? await req.json().catch(() => ({})) : {};

  // Groups
  if (base === "/groups") {
    if (method === "POST") {
      const { tournament_id, name, color, sort_order, qualify_count } = body;
      if (!tournament_id || !name) return ok(req, 400, { error: "tournament_id e name obbligatori" });
      const { data, error } = await db.from("groups").insert({ tournament_id, name: String(name).trim(), color: color || "#00E676", sort_order: sort_order ?? 0, qualify_count: qualify_count ?? 2 }).select().single();
      if (error) throw error;
      return ok(req, 201, { ok: true, data });
    }
    if (method === "PUT" && id) {
      const upd: Record<string, unknown> = {};
      if (body.name !== undefined) upd.name = String(body.name).trim();
      if (body.color !== undefined) upd.color = body.color;
      if (body.sort_order !== undefined) upd.sort_order = body.sort_order;
      if (body.qualify_count !== undefined) upd.qualify_count = body.qualify_count;
      const { data, error } = await db.from("groups").update(upd).eq("id", id).select().single();
      if (error) throw error;
      return ok(req, 200, { ok: true, data });
    }
    if (method === "DELETE" && id) {
      const { error } = await db.from("groups").delete().eq("id", id);
      if (error) throw error;
      return ok(req, 200, { ok: true });
    }
  }

  // Teams
  if (base === "/teams") {
    if (method === "POST") {
      const { name, short, nation, flag, color } = body;
      if (!name || !short) return ok(req, 400, { error: "name e short obbligatori" });
      const { data, error } = await db.from("teams").insert({ name: String(name).trim(), short: String(short).trim(), nation, flag, color }).select().single();
      if (error) throw error;
      return ok(req, 201, { ok: true, data });
    }
    if (method === "PUT" && id) {
      const upd: Record<string, unknown> = {};
      if (body.name !== undefined) upd.name = String(body.name).trim();
      if (body.short !== undefined) upd.short = String(body.short).trim();
      if (body.nation !== undefined) upd.nation = body.nation;
      if (body.flag !== undefined) upd.flag = body.flag;
      if (body.color !== undefined) upd.color = body.color;
      const { data, error } = await db.from("teams").update(upd).eq("id", id).select().single();
      if (error) throw error;
      return ok(req, 200, { ok: true, data });
    }
    if (method === "DELETE" && id) {
      const { error } = await db.from("teams").delete().eq("id", id);
      if (error) throw error;
      return ok(req, 200, { ok: true });
    }
  }

  // Registrations
  if (base === "/registrations") {
    if (method === "POST") {
      const { team_id, tournament_id, group_id, captain, players } = body;
      if (!team_id || !tournament_id) return ok(req, 400, { error: "team_id e tournament_id obbligatori" });
      const { data, error } = await db.from("team_registrations")
        .upsert({ team_id, tournament_id, group_id: group_id || null, captain, players: players || [] }, { onConflict: "team_id,tournament_id" })
        .select().single();
      if (error) throw error;
      return ok(req, 200, { ok: true, data });
    }
    if (method === "PUT" && id) {
      const upd: Record<string, unknown> = {};
      if (body.group_id !== undefined) upd.group_id = body.group_id;
      if (body.captain !== undefined) upd.captain = body.captain;
      if (body.players !== undefined) upd.players = body.players;
      // Penalità punti (es. -1 per sconfitta a tavolino / mancata presentazione).
      // Clamp >= 0: i punti vengono SOTTRATTI in standings_view, quindi qui è un valore positivo.
      if (body.penalty_points !== undefined) {
        const pen = Math.max(0, parseInt(String(body.penalty_points), 10) || 0);
        upd.penalty_points = pen;
      }
      // Override manuale posizione in classifica (staff, tab Classifica). null = torna automatico.
      if (body.rank_override !== undefined) {
        upd.rank_override = body.rank_override === null ? null : parseInt(String(body.rank_override), 10) || null;
      }
      const { data, error } = await db.from("team_registrations").update(upd).eq("id", id).select().single();
      if (error) throw error;
      return ok(req, 200, { ok: true, data });
    }
    if (method === "DELETE" && id) {
      const { error } = await db.from("team_registrations").delete().eq("id", id);
      if (error) throw error;
      return ok(req, 200, { ok: true });
    }
  }

  // Matches
  if (base === "/matches") {
    if (method === "POST") {
      const { tournament_id, group_id, home_team_id, away_team_id, home_score, away_score, status, phase, match_date, match_time, pitch, sort_order } = body;
      if (!tournament_id) return ok(req, 400, { error: "tournament_id obbligatorio" });
      const { data, error } = await db.from("matches").insert({ tournament_id, group_id: group_id || null, home_team_id: home_team_id || null, away_team_id: away_team_id || null, home_score: home_score ?? null, away_score: away_score ?? null, status: status || "sch", phase: phase || "Girone", match_date: match_date || null, match_time: match_time || null, pitch: pitch || "Campo Sportivo", sort_order: sort_order ?? 0 }).select().single();
      if (error) throw error;
      return ok(req, 201, { ok: true, data });
    }
    if (method === "PUT" && id) {
      // Optional: replace the whole cronaca for this match in one shot. Used when a
      // live match ends — delete existing events, then insert the final list.
      // Idempotent, so the admin can safely retry on a flaky connection.
      if (Array.isArray(body.events)) {
        const { error: delErr } = await db.from("match_events").delete().eq("match_id", id);
        if (delErr) throw delErr;
        if (body.events.length > 0) {
          const rows = body.events.map((e: any) => ({
            match_id: id,
            team_id: e.team_id || null,
            event_type: e.event_type,
            player_name: e.player_name ?? null,
            minute: e.minute ?? null,
          }));
          const { error: insErr } = await db.from("match_events").insert(rows);
          if (insErr) throw insErr;
        }
      }
      const allowed = ["group_id","home_team_id","away_team_id","home_score","away_score","status","phase","match_date","match_time","pitch","sort_order"];
      const upd: Record<string, unknown> = {};
      for (const k of allowed) { if (k in body) upd[k] = body[k]; }
      if (Object.keys(upd).length === 0) {
        const { data, error } = await db.from("matches").select().eq("id", id).single();
        if (error) throw error;
        return ok(req, 200, { ok: true, data });
      }
      const { data, error } = await db.from("matches").update(upd).eq("id", id).select().single();
      if (error) throw error;
      return ok(req, 200, { ok: true, data });
    }
    if (method === "DELETE" && id) {
      const { error } = await db.from("matches").delete().eq("id", id);
      if (error) throw error;
      return ok(req, 200, { ok: true });
    }
  }

  // Match events
  if (base === "/match-events") {
    if (method === "POST") {
      const { match_id, team_id, event_type, player_name, minute } = body;
      if (!match_id || !event_type) return ok(req, 400, { error: "match_id e event_type obbligatori" });
      const { data, error } = await db.from("match_events").insert({ match_id, team_id: team_id || null, event_type, player_name, minute }).select().single();
      if (error) throw error;
      return ok(req, 201, { ok: true, data });
    }
    if (method === "PUT" && id) {
      const allowed = ["event_type", "player_name", "team_id", "minute"];
      const upd: Record<string, unknown> = {};
      for (const k of allowed) { if (k in body) upd[k] = body[k]; }
      if (Object.keys(upd).length === 0) return ok(req, 400, { error: "Nessun campo da aggiornare" });
      const { data, error } = await db.from("match_events").update(upd).eq("id", id).select().single();
      if (error) throw error;
      return ok(req, 200, { ok: true, data });
    }
    if (method === "DELETE" && id) {
      const { error } = await db.from("match_events").delete().eq("id", id);
      if (error) throw error;
      return ok(req, 200, { ok: true });
    }
  }

  // Live
  if (base === "/live" && method === "PUT") {
    const { tournament_id, match_id, active, home_team_id, away_team_id, home_score, away_score, minute, phase, timer_started_at, pitch, events } = body;
    if (!tournament_id) return ok(req, 400, { error: "tournament_id obbligatorio" });
    const upd: Record<string, unknown> = { tournament_id, active: active ?? false, home_team_id: home_team_id || null, away_team_id: away_team_id || null, home_score: home_score ?? 0, away_score: away_score ?? 0, minute: minute ?? 0, phase: phase || null, timer_started_at: timer_started_at || null, pitch: pitch || "", events: Array.isArray(events) ? events : [], updated_at: new Date().toISOString() };
    if (match_id !== undefined) upd.match_id = match_id || null;
    const { data, error } = await db.from("live_match_state").upsert(upd, { onConflict: "tournament_id" }).select().single();
    if (error) throw error;
    return ok(req, 200, { ok: true, data });
  }

  // Scorers
  if (base === "/scorers") {
    if (method === "POST") {
      const { tournament_id, team_id, player_name, goals, sort_order } = body;
      if (!tournament_id || !player_name) return ok(req, 400, { error: "tournament_id e player_name obbligatori" });
      const { data, error } = await db.from("scorers").insert({ tournament_id, team_id: team_id || null, player_name, goals: goals ?? 0, sort_order: sort_order ?? 0 }).select().single();
      if (error) throw error;
      return ok(req, 201, { ok: true, data });
    }
    if (method === "PUT" && id) {
      const upd: Record<string, unknown> = {};
      if (body.player_name !== undefined) upd.player_name = body.player_name;
      if (body.team_id !== undefined) upd.team_id = body.team_id;
      if (body.goals !== undefined) upd.goals = body.goals;
      if (body.sort_order !== undefined) upd.sort_order = body.sort_order;
      const { data, error } = await db.from("scorers").update(upd).eq("id", id).select().single();
      if (error) throw error;
      return ok(req, 200, { ok: true, data });
    }
    if (method === "DELETE" && id) {
      const { error } = await db.from("scorers").delete().eq("id", id);
      if (error) throw error;
      return ok(req, 200, { ok: true });
    }
  }

  // Knockout ties (tabellone qualificazione, per tournament) — gestibili come partite
  if (base === "/knockout-ties") {
    if (method === "POST") {
      const { tournament_id, round, sort_order, home_label, away_label,
        home_team_id, away_team_id, match_date, match_time, pitch, status, home_score, away_score } = body;
      if (!tournament_id) return ok(req, 400, { error: "tournament_id obbligatorio" });
      const { data, error } = await db.from("knockout_ties").insert({
        tournament_id,
        round: String(round ?? "").trim(),
        sort_order: sort_order ?? 0,
        home_label: String(home_label ?? "").trim(),
        away_label: String(away_label ?? "").trim(),
        home_team_id: home_team_id || null,
        away_team_id: away_team_id || null,
        match_date: match_date || null,
        match_time: match_time || null,
        pitch: pitch || null,
        status: status || "sch",
        home_score: home_score ?? null,
        away_score: away_score ?? null,
      }).select().single();
      if (error) throw error;
      return ok(req, 201, { ok: true, data });
    }
    if (method === "PUT" && id) {
      const upd: Record<string, unknown> = {};
      if (body.round !== undefined) upd.round = String(body.round).trim();
      if (body.sort_order !== undefined) upd.sort_order = body.sort_order;
      if (body.home_label !== undefined) upd.home_label = String(body.home_label).trim();
      if (body.away_label !== undefined) upd.away_label = String(body.away_label).trim();
      if (body.home_team_id !== undefined) upd.home_team_id = body.home_team_id || null;
      if (body.away_team_id !== undefined) upd.away_team_id = body.away_team_id || null;
      if (body.match_date !== undefined) upd.match_date = body.match_date || null;
      if (body.match_time !== undefined) upd.match_time = body.match_time || null;
      if (body.pitch !== undefined) upd.pitch = body.pitch || null;
      if (body.status !== undefined) upd.status = body.status || "sch";
      if (body.home_score !== undefined) upd.home_score = body.home_score ?? null;
      if (body.away_score !== undefined) upd.away_score = body.away_score ?? null;
      if (Object.keys(upd).length === 0) return ok(req, 400, { error: "Nessun campo da aggiornare" });
      const { data, error } = await db.from("knockout_ties").update(upd).eq("id", id).select().single();
      if (error) throw error;
      return ok(req, 200, { ok: true, data });
    }
    if (method === "DELETE" && id) {
      const { error } = await db.from("knockout_ties").delete().eq("id", id);
      if (error) throw error;
      return ok(req, 200, { ok: true });
    }
  }

  return null;
}
