import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const sessionSecret = Deno.env.get("ADMIN_SESSION_SECRET") || "";
const sessionHours = Number(Deno.env.get("ADMIN_SESSION_HOURS") || "12");
const allowedOrigin = Deno.env.get("ADMIN_ALLOWED_ORIGIN") || "*";

if (!supabaseUrl || !serviceRoleKey || !sessionSecret) {
  throw new Error("Missing required environment variables");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin":
      allowedOrigin === "*" ? "*" : origin === allowedOrigin ? origin : allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}

function json(req: Request, status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), { status, headers: corsHeaders(req) });
}

function hasAllowedOrigin(req: Request) {
  if (allowedOrigin === "*") return true;
  const origin = req.headers.get("origin") || "";
  return origin === allowedOrigin;
}

// Returns { base: "/groups", id: "uuid-or-null" }
function parsePath(url: string): { base: string; id: string | null } {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("admin-api");
  const segments = idx >= 0 ? parts.slice(idx + 1) : parts.slice(-2);
  if (segments.length === 0) return { base: "/", id: null };
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (segments.length >= 2 && uuidRe.test(segments[segments.length - 1])) {
    return { base: "/" + segments.slice(0, -1).join("/"), id: segments[segments.length - 1] };
  }
  return { base: "/" + segments.join("/"), id: null };
}

function sanitizeUsername(v: unknown) { return String(v || "").trim(); }
function sanitizePassword(v: unknown) { return String(v || ""); }

function toBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256(input: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input + sessionSecret),
  );
  return toBase64Url(new Uint8Array(digest));
}

function addHours(h: number) {
  return new Date(Date.now() + h * 3600_000).toISOString();
}

function tokenFromAuthHeader(req: Request) {
  const h = req.headers.get("authorization") || "";
  return h.match(/^Bearer\s+(.+)$/i)?.[1] || "";
}

async function requireSession(req: Request) {
  const rawToken = tokenFromAuthHeader(req);
  if (!rawToken) return { error: "Sessione admin assente" };

  const tokenHash = await sha256(rawToken);
  const { data: row, error } = await supabase
    .from("admin_sessions")
    .select("id, user_id, expires_at, revoked_at, admin_users!inner(id, username, role, is_active)")
    .eq("session_token_hash", tokenHash)
    .is("revoked_at", null)
    .single();

  if (error || !row) return { error: "Sessione non valida" };

  const exp = new Date(row.expires_at).getTime();
  if (!Number.isFinite(exp) || exp <= Date.now()) {
    await supabase.from("admin_sessions").update({ revoked_at: new Date().toISOString() }).eq("id", row.id);
    return { error: "Sessione scaduta" };
  }

  const u = Array.isArray(row.admin_users) ? row.admin_users[0] : row.admin_users;
  if (!u?.is_active) return { error: "Utente disattivato" };

  await supabase.from("admin_sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", row.id);
  return { sessionId: row.id, user: { id: u.id, username: u.username, role: u.role } };
}

// Active edition: prefer status='active', fallback to latest 'upcoming'
async function getActiveEdition() {
  const { data } = await supabase
    .from("tournament_editions")
    .select("*, tournaments!inner(id, name, slug, location, description)")
    .in("status", ["active", "upcoming"])
    .order("status", { ascending: true })
    .order("year", { ascending: false })
    .limit(1)
    .single();
  return data;
}

async function buildBootstrapPayload(editionId: string) {
  const [
    editionRes, groupsRes, regsRes, matchesRes, liveRes,
    scorersRes, newsRes, eventsRes, honorsRes, sponsorsRes, stripRes, standingsRes,
  ] = await Promise.all([
    supabase.from("tournament_editions")
      .select("*, tournaments!inner(id, name, slug, location)")
      .eq("id", editionId).single(),
    supabase.from("groups").select("*").eq("edition_id", editionId).order("sort_order"),
    supabase.from("team_registrations")
      .select("*, teams!inner(id, name, short, nation, flag, color)")
      .eq("edition_id", editionId),
    supabase.from("matches")
      .select("*, home_team:home_team_id(id,name,short,flag,color), away_team:away_team_id(id,name,short,flag,color)")
      .eq("edition_id", editionId)
      .order("match_date", { ascending: true, nullsFirst: false })
      .order("match_time", { ascending: true, nullsFirst: false })
      .order("sort_order"),
    supabase.from("live_match_state")
      .select("*, home_team:home_team_id(id,name,short,flag), away_team:away_team_id(id,name,short,flag)")
      .eq("edition_id", editionId).maybeSingle(),
    supabase.from("scorers").select("*, teams(short,flag)")
      .eq("edition_id", editionId).order("goals", { ascending: false }).order("sort_order"),
    supabase.from("news").select("*").eq("edition_id", editionId)
      .order("pinned", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("edition_events").select("*").eq("edition_id", editionId)
      .order("sort_order").order("event_date"),
    supabase.from("honors").select("*").order("year", { ascending: false }),
    supabase.from("sponsors").select("*").eq("edition_id", editionId).order("sort_order"),
    supabase.from("strip_messages").select("*").eq("edition_id", editionId)
      .eq("active", true).order("sort_order"),
    supabase.from("standings_view").select("*").eq("edition_id", editionId),
  ]);

  const edition = editionRes.data;
  const groups = groupsRes.data || [];
  const regs = regsRes.data || [];
  const matches = matchesRes.data || [];
  const live = liveRes.data;
  const scorers = scorersRes.data || [];
  const news = newsRes.data || [];
  const events = eventsRes.data || [];
  const honors = honorsRes.data || [];
  const sponsors = sponsorsRes.data || [];
  const strip = stripRes.data || [];
  const standingsRaw = standingsRes.data || [];

  // Teams: merge registration + team entity
  const teams = regs.map((r: any) => ({
    id: r.teams.id,
    name: r.teams.name,
    short: r.teams.short,
    nation: r.teams.nation,
    flag: r.teams.flag,
    color: r.teams.color,
    group_id: r.group_id,
    captain: r.captain,
    players: r.players || [],
    registration_id: r.id,
  }));

  // standings_groups from standings_view
  const standingsMap: Record<string, any> = {};
  for (const row of standingsRaw) {
    if (!standingsMap[row.group_id]) {
      standingsMap[row.group_id] = {
        id: row.group_id, name: row.group_name, color: row.group_color, rows: [],
      };
    }
    standingsMap[row.group_id].rows.push({
      short: row.team_short, name: row.team_name, flag: row.team_flag, color: row.team_color,
      g: row.g, v: row.v, n: row.n, p: row.p, gf: row.gf, gs: row.gs, gd: row.gd, pt: row.pt, form: [],
    });
  }

  // live_match in legacy shape for frontend compat
  const liveMatch = live ? {
    active: live.active,
    home: live.home_team
      ? { short: live.home_team.short, flag: live.home_team.flag, name: live.home_team.name }
      : null,
    away: live.away_team
      ? { short: live.away_team.short, flag: live.away_team.flag, name: live.away_team.name }
      : null,
    hs: live.home_score, as: live.away_score, minute: live.minute, pitch: live.pitch || "", events: [],
    match_id: live.match_id,
  } : { active: false, home: null, away: null, hs: 0, as: 0, minute: 0, pitch: "", events: [] };

  // matches_giornata grouped by phase (legacy shape)
  const phaseMap: Record<string, any> = {};
  for (const m of matches) {
    const phase = m.phase || "Girone";
    if (!phaseMap[phase]) phaseMap[phase] = { day: phase, items: [] };
    phaseMap[phase].items.push({
      id: m.id,
      home: m.home_team
        ? { short: m.home_team.short, flag: m.home_team.flag, name: m.home_team.name }
        : null,
      away: m.away_team
        ? { short: m.away_team.short, flag: m.away_team.flag, name: m.away_team.name }
        : null,
      hs: m.home_score, as: m.away_score, status: m.status,
      date: m.match_date, time: m.match_time, pitch: m.pitch, phase: m.phase, group_id: m.group_id,
    });
  }

  return {
    schema_version: 3,
    edition: {
      id: edition?.id, name: edition?.name, year: edition?.year, slug: edition?.slug,
      status: edition?.status, kickoff_date: edition?.kickoff_date,
      start_date: edition?.start_date, end_date: edition?.end_date,
      prize_first: edition?.prize_first, prize_second: edition?.prize_second,
      prize_third: edition?.prize_third, location: edition?.location,
    },
    tournament: edition?.tournaments ?? null,
    groups,
    teams,
    standings_groups: Object.values(standingsMap),
    live_match: liveMatch,
    matches,
    matches_giornata: Object.values(phaseMap),
    scorers: scorers.map((s: any) => ({
      id: s.id, name: s.player_name, team: s.teams?.short || "", flag: s.teams?.flag || "", goals: s.goals,
    })),
    news: news.map((n: any) => ({
      id: n.id, title: n.title, body: n.body, category: n.category,
      tone: n.tone, pinned: n.pinned, date: n.created_at,
    })),
    events: events.map((e: any) => ({
      id: e.id, title: e.title, date: e.event_date, time: e.event_time,
      type: e.event_type, description: e.description,
    })),
    honors: honors.map((h: any) => ({
      id: h.id, edition: h.edition_name, year: h.year, winner: h.winner,
      runner_up: h.runner_up, third: h.third_place, mvp: h.mvp, top_scorer: h.top_scorer,
    })),
    sponsors: sponsors.map((s: any) => ({
      id: s.id, name: s.name, logo: s.logo_url, url: s.website_url, tag: s.tag,
    })),
    strip_items: strip.map((s: any) => s.text),
    updated_at: new Date().toISOString(),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  const { base, id } = parsePath(req.url);
  const method = req.method;

  try {
    if (
      (method === "POST" || method === "PUT" || method === "DELETE") &&
      !hasAllowedOrigin(req)
    ) {
      return json(req, 403, { error: "Origin non autorizzata" });
    }

    // ── Public endpoints (no auth) ──────────────────────────
    if (method === "GET" && base === "/bootstrap") {
      const qs = new URL(req.url).searchParams;
      const editionSlug = qs.get("edition");
      let edition;
      if (editionSlug) {
        const { data } = await supabase
          .from("tournament_editions")
          .select("*, tournaments!inner(id, name, slug, location, description)")
          .eq("slug", editionSlug)
          .single();
        edition = data;
      } else {
        edition = await getActiveEdition();
      }
      if (!edition) return json(req, 404, { error: "Nessuna edizione trovata" });
      const payload = await buildBootstrapPayload(edition.id);
      return json(req, 200, { ok: true, data: payload });
    }

    if (method === "GET" && base === "/editions") {
      const { data, error } = await supabase
        .from("tournament_editions")
        .select("*, tournaments!inner(id, name, slug, location)")
        .order("year", { ascending: false });
      if (error) throw error;
      return json(req, 200, { ok: true, data });
    }

    // ── Auth endpoints ──────────────────────────────────────
    if (method === "POST" && base === "/login") {
      const body = await req.json().catch(() => ({}));
      const username = sanitizeUsername(body.username);
      const password = sanitizePassword(body.password);
      if (username.length < 3 || password.length < 8) {
        return json(req, 400, { error: "Credenziali non valide" });
      }
      const { data: userRow, error: userError } = await supabase
        .from("admin_users")
        .select("id, username, password_hash, role, is_active")
        .eq("username", username)
        .single();
      if (userError || !userRow || !userRow.is_active) {
        return json(req, 401, { error: "Credenziali non valide" });
      }
      const ok = await bcrypt.compare(password, userRow.password_hash);
      if (!ok) return json(req, 401, { error: "Credenziali non valide" });
      const rawToken = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
      const tokenHash = await sha256(rawToken);
      const expiresAt = addHours(sessionHours);
      await supabase.from("admin_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("user_id", userRow.id).is("revoked_at", null);
      const { error: insertErr } = await supabase.from("admin_sessions").insert({
        user_id: userRow.id, session_token_hash: tokenHash, expires_at: expiresAt,
        user_agent: req.headers.get("user-agent"),
      });
      if (insertErr) throw insertErr;
      return json(req, 200, {
        ok: true,
        session: { token: rawToken, expires_at: expiresAt, user: { username: userRow.username, role: userRow.role } },
      });
    }

    if (method === "GET" && base === "/me") {
      const auth = await requireSession(req);
      if (auth.error) return json(req, 401, { error: auth.error });
      return json(req, 200, { ok: true, user: auth.user });
    }

    if (method === "POST" && base === "/logout") {
      const auth = await requireSession(req);
      if (auth.error) return json(req, 401, { error: auth.error });
      await supabase.from("admin_sessions")
        .update({ revoked_at: new Date().toISOString() }).eq("id", auth.sessionId);
      return json(req, 200, { ok: true });
    }

    if (method === "POST" && base === "/credentials") {
      const auth = await requireSession(req);
      if (auth.error) return json(req, 401, { error: auth.error });
      const body = await req.json().catch(() => ({}));
      const username = sanitizeUsername(body.username);
      const password = sanitizePassword(body.password);
      if (username.length < 3) return json(req, 400, { error: "Username troppo corto" });
      const upd: Record<string, unknown> = { username };
      if (password) {
        if (password.length < 8) return json(req, 400, { error: "Password troppo corta" });
        upd.password_hash = await bcrypt.hash(password, 12);
      }
      const { data: updUser, error } = await supabase
        .from("admin_users").update(upd).eq("id", auth.user.id).select("username, role").single();
      if (error) {
        if (String(error.message || "").toLowerCase().includes("duplicate")) {
          return json(req, 409, { error: "Username già in uso" });
        }
        throw error;
      }
      return json(req, 200, { ok: true, user: { username: updUser.username, role: updUser.role } });
    }

    // ── Legacy: save full JSON blob (backward compat) ───────
    if (method === "POST" && base === "/save") {
      const auth = await requireSession(req);
      if (auth.error) return json(req, 401, { error: auth.error });
      const body = await req.json().catch(() => ({}));
      const content = body.content;
      if (!content || typeof content !== "object" || Array.isArray(content)) {
        return json(req, 400, { error: "Payload content non valido" });
      }
      const updatedAt = new Date().toISOString();
      const { error } = await supabase.from("site_data").update({ content, updated_at: updatedAt }).eq("id", 1);
      if (error) throw error;
      return json(req, 200, { ok: true, updated_at: updatedAt, saved_by: auth.user.username });
    }

    // ── Domain CRUD — all require auth ──────────────────────
    const auth = await requireSession(req);
    if (auth.error) return json(req, 401, { error: auth.error });

    const body =
      method !== "GET" && method !== "DELETE"
        ? await req.json().catch(() => ({}))
        : {};

    // Editions (admin update)
    if (base === "/editions") {
      if (method === "PUT" && id) {
        const allowed = ["status","name","kickoff_date","start_date","end_date","location","prize_first","prize_second","prize_third","format_notes"];
        const upd: Record<string, unknown> = {};
        for (const k of allowed) { if (k in body) upd[k] = body[k]; }
        const { data, error } = await supabase
          .from("tournament_editions").update(upd).eq("id", id).select("*, tournaments!inner(id,name,slug)").single();
        if (error) throw error;
        return json(req, 200, { ok: true, data });
      }
      if (method === "POST") {
        const { tournament_id, year, edition_number, name, slug, status, kickoff_date, start_date, end_date, location, prize_first, prize_second, prize_third } = body;
        if (!tournament_id || !year || !name || !slug) return json(req, 400, { error: "tournament_id, year, name, slug obbligatori" });
        const { data, error } = await supabase.from("tournament_editions")
          .insert({ tournament_id, year, edition_number, name, slug, status: status || "upcoming", kickoff_date, start_date, end_date, location, prize_first, prize_second, prize_third })
          .select().single();
        if (error) throw error;
        return json(req, 201, { ok: true, data });
      }
    }

    // Tournaments (admin update)
    if (base === "/tournaments") {
      if (method === "GET") {
        const { data, error } = await supabase.from("tournaments").select("*").order("name");
        if (error) throw error;
        return json(req, 200, { ok: true, data });
      }
      if (method === "POST") {
        const { name, slug, description, location } = body;
        if (!name || !slug) return json(req, 400, { error: "name e slug obbligatori" });
        const { data, error } = await supabase.from("tournaments").insert({ name, slug, description, location }).select().single();
        if (error) throw error;
        return json(req, 201, { ok: true, data });
      }
    }

    // Groups
    if (base === "/groups") {
      if (method === "POST") {
        const { edition_id, name, color, sort_order } = body;
        if (!edition_id || !name) return json(req, 400, { error: "edition_id e name obbligatori" });
        const { data, error } = await supabase.from("groups")
          .insert({ edition_id, name: String(name).trim(), color: color || "#00E676", sort_order: sort_order ?? 0 })
          .select().single();
        if (error) throw error;
        return json(req, 201, { ok: true, data });
      }
      if (method === "PUT" && id) {
        const upd: Record<string, unknown> = {};
        if (body.name !== undefined) upd.name = String(body.name).trim();
        if (body.color !== undefined) upd.color = body.color;
        if (body.sort_order !== undefined) upd.sort_order = body.sort_order;
        const { data, error } = await supabase.from("groups").update(upd).eq("id", id).select().single();
        if (error) throw error;
        return json(req, 200, { ok: true, data });
      }
      if (method === "DELETE" && id) {
        const { error } = await supabase.from("groups").delete().eq("id", id);
        if (error) throw error;
        return json(req, 200, { ok: true });
      }
    }

    // Teams
    if (base === "/teams") {
      if (method === "POST") {
        const { name, short, nation, flag, color } = body;
        if (!name || !short) return json(req, 400, { error: "name e short obbligatori" });
        const { data, error } = await supabase.from("teams")
          .insert({ name: String(name).trim(), short: String(short).trim(), nation, flag, color })
          .select().single();
        if (error) throw error;
        return json(req, 201, { ok: true, data });
      }
      if (method === "PUT" && id) {
        const upd: Record<string, unknown> = {};
        if (body.name !== undefined) upd.name = String(body.name).trim();
        if (body.short !== undefined) upd.short = String(body.short).trim();
        if (body.nation !== undefined) upd.nation = body.nation;
        if (body.flag !== undefined) upd.flag = body.flag;
        if (body.color !== undefined) upd.color = body.color;
        const { data, error } = await supabase.from("teams").update(upd).eq("id", id).select().single();
        if (error) throw error;
        return json(req, 200, { ok: true, data });
      }
      if (method === "DELETE" && id) {
        const { error } = await supabase.from("teams").delete().eq("id", id);
        if (error) throw error;
        return json(req, 200, { ok: true });
      }
    }

    // Team registrations
    if (base === "/registrations") {
      if (method === "POST") {
        const { team_id, edition_id, group_id, captain, players } = body;
        if (!team_id || !edition_id) return json(req, 400, { error: "team_id e edition_id obbligatori" });
        const { data, error } = await supabase.from("team_registrations")
          .upsert(
            { team_id, edition_id, group_id: group_id || null, captain, players: players || [] },
            { onConflict: "team_id,edition_id" },
          ).select().single();
        if (error) throw error;
        return json(req, 200, { ok: true, data });
      }
      if (method === "PUT" && id) {
        const upd: Record<string, unknown> = {};
        if (body.group_id !== undefined) upd.group_id = body.group_id;
        if (body.captain !== undefined) upd.captain = body.captain;
        if (body.players !== undefined) upd.players = body.players;
        const { data, error } = await supabase.from("team_registrations").update(upd).eq("id", id).select().single();
        if (error) throw error;
        return json(req, 200, { ok: true, data });
      }
      if (method === "DELETE" && id) {
        const { error } = await supabase.from("team_registrations").delete().eq("id", id);
        if (error) throw error;
        return json(req, 200, { ok: true });
      }
    }

    // Matches
    if (base === "/matches") {
      if (method === "POST") {
        const { edition_id, group_id, home_team_id, away_team_id, home_score, away_score, status, phase, match_date, match_time, pitch, sort_order } = body;
        if (!edition_id) return json(req, 400, { error: "edition_id obbligatorio" });
        const { data, error } = await supabase.from("matches").insert({
          edition_id,
          group_id: group_id || null,
          home_team_id: home_team_id || null,
          away_team_id: away_team_id || null,
          home_score: home_score ?? null,
          away_score: away_score ?? null,
          status: status || "sch",
          phase: phase || "Girone",
          match_date: match_date || null,
          match_time: match_time || null,
          pitch: pitch || "Campo Sportivo",
          sort_order: sort_order ?? 0,
        }).select().single();
        if (error) throw error;
        return json(req, 201, { ok: true, data });
      }
      if (method === "PUT" && id) {
        const allowed = ["group_id","home_team_id","away_team_id","home_score","away_score","status","phase","match_date","match_time","pitch","sort_order"];
        const upd: Record<string, unknown> = {};
        for (const k of allowed) { if (k in body) upd[k] = body[k]; }
        const { data, error } = await supabase.from("matches").update(upd).eq("id", id).select().single();
        if (error) throw error;
        return json(req, 200, { ok: true, data });
      }
      if (method === "DELETE" && id) {
        const { error } = await supabase.from("matches").delete().eq("id", id);
        if (error) throw error;
        return json(req, 200, { ok: true });
      }
    }

    // Match events
    if (base === "/match-events") {
      if (method === "POST") {
        const { match_id, team_id, event_type, player_name, minute } = body;
        if (!match_id || !event_type) return json(req, 400, { error: "match_id e event_type obbligatori" });
        const { data, error } = await supabase.from("match_events")
          .insert({ match_id, team_id: team_id || null, event_type, player_name, minute })
          .select().single();
        if (error) throw error;
        return json(req, 201, { ok: true, data });
      }
      if (method === "DELETE" && id) {
        const { error } = await supabase.from("match_events").delete().eq("id", id);
        if (error) throw error;
        return json(req, 200, { ok: true });
      }
    }

    // Live match state
    if (base === "/live" && method === "PUT") {
      const { edition_id, match_id, active, home_team_id, away_team_id, home_score, away_score, minute, pitch } = body;
      if (!edition_id) return json(req, 400, { error: "edition_id obbligatorio" });
      const upd: Record<string, unknown> = {
        edition_id,
        active: active ?? false,
        home_team_id: home_team_id || null,
        away_team_id: away_team_id || null,
        home_score: home_score ?? 0,
        away_score: away_score ?? 0,
        minute: minute ?? 0,
        pitch: pitch || "",
        updated_at: new Date().toISOString(),
      };
      if (match_id !== undefined) upd.match_id = match_id || null;
      const { data, error } = await supabase.from("live_match_state")
        .upsert(upd, { onConflict: "edition_id" }).select().single();
      if (error) throw error;
      return json(req, 200, { ok: true, data });
    }

    // Scorers
    if (base === "/scorers") {
      if (method === "POST") {
        const { edition_id, team_id, player_name, goals, sort_order } = body;
        if (!edition_id || !player_name) return json(req, 400, { error: "edition_id e player_name obbligatori" });
        const { data, error } = await supabase.from("scorers")
          .insert({ edition_id, team_id: team_id || null, player_name, goals: goals ?? 0, sort_order: sort_order ?? 0 })
          .select().single();
        if (error) throw error;
        return json(req, 201, { ok: true, data });
      }
      if (method === "PUT" && id) {
        const upd: Record<string, unknown> = {};
        if (body.player_name !== undefined) upd.player_name = body.player_name;
        if (body.team_id !== undefined) upd.team_id = body.team_id;
        if (body.goals !== undefined) upd.goals = body.goals;
        if (body.sort_order !== undefined) upd.sort_order = body.sort_order;
        const { data, error } = await supabase.from("scorers").update(upd).eq("id", id).select().single();
        if (error) throw error;
        return json(req, 200, { ok: true, data });
      }
      if (method === "DELETE" && id) {
        const { error } = await supabase.from("scorers").delete().eq("id", id);
        if (error) throw error;
        return json(req, 200, { ok: true });
      }
    }

    // News
    if (base === "/news") {
      if (method === "POST") {
        const { edition_id, title, body: bodyText, category, tone, pinned } = body;
        if (!edition_id || !title) return json(req, 400, { error: "edition_id e title obbligatori" });
        const { data, error } = await supabase.from("news")
          .insert({ edition_id, title, body: bodyText || null, category: category || "generale", tone: tone || "info", pinned: pinned ?? false })
          .select().single();
        if (error) throw error;
        return json(req, 201, { ok: true, data });
      }
      if (method === "PUT" && id) {
        const upd: Record<string, unknown> = {};
        if (body.title !== undefined) upd.title = body.title;
        if (body.body !== undefined) upd.body = body.body;
        if (body.category !== undefined) upd.category = body.category;
        if (body.tone !== undefined) upd.tone = body.tone;
        if (body.pinned !== undefined) upd.pinned = body.pinned;
        const { data, error } = await supabase.from("news").update(upd).eq("id", id).select().single();
        if (error) throw error;
        return json(req, 200, { ok: true, data });
      }
      if (method === "DELETE" && id) {
        const { error } = await supabase.from("news").delete().eq("id", id);
        if (error) throw error;
        return json(req, 200, { ok: true });
      }
    }

    // Edition events
    if (base === "/events") {
      if (method === "POST") {
        const { edition_id, title, event_date, event_time, event_type, description, sort_order } = body;
        if (!edition_id || !title) return json(req, 400, { error: "edition_id e title obbligatori" });
        const { data, error } = await supabase.from("edition_events")
          .insert({ edition_id, title, event_date: event_date || null, event_time: event_time || null, event_type: event_type || "partita", description, sort_order: sort_order ?? 0 })
          .select().single();
        if (error) throw error;
        return json(req, 201, { ok: true, data });
      }
      if (method === "PUT" && id) {
        const allowed = ["title","event_date","event_time","event_type","description","sort_order"];
        const upd: Record<string, unknown> = {};
        for (const k of allowed) { if (k in body) upd[k] = body[k]; }
        const { data, error } = await supabase.from("edition_events").update(upd).eq("id", id).select().single();
        if (error) throw error;
        return json(req, 200, { ok: true, data });
      }
      if (method === "DELETE" && id) {
        const { error } = await supabase.from("edition_events").delete().eq("id", id);
        if (error) throw error;
        return json(req, 200, { ok: true });
      }
    }

    // Honors
    if (base === "/honors") {
      if (method === "POST") {
        const { tournament_id, edition_name, year, winner, runner_up, third_place, mvp, top_scorer, notes } = body;
        if (!edition_name || !year) return json(req, 400, { error: "edition_name e year obbligatori" });
        const { data, error } = await supabase.from("honors")
          .insert({ tournament_id: tournament_id || null, edition_name, year, winner, runner_up, third_place, mvp, top_scorer, notes })
          .select().single();
        if (error) throw error;
        return json(req, 201, { ok: true, data });
      }
      if (method === "PUT" && id) {
        const allowed = ["edition_name","year","winner","runner_up","third_place","mvp","top_scorer","notes"];
        const upd: Record<string, unknown> = {};
        for (const k of allowed) { if (k in body) upd[k] = body[k]; }
        const { data, error } = await supabase.from("honors").update(upd).eq("id", id).select().single();
        if (error) throw error;
        return json(req, 200, { ok: true, data });
      }
      if (method === "DELETE" && id) {
        const { error } = await supabase.from("honors").delete().eq("id", id);
        if (error) throw error;
        return json(req, 200, { ok: true });
      }
    }

    // Sponsors
    if (base === "/sponsors") {
      if (method === "POST") {
        const { edition_id, name, logo_url, website_url, tag, sort_order } = body;
        if (!name) return json(req, 400, { error: "name obbligatorio" });
        const { data, error } = await supabase.from("sponsors")
          .insert({ edition_id: edition_id || null, name, logo_url, website_url, tag, sort_order: sort_order ?? 0 })
          .select().single();
        if (error) throw error;
        return json(req, 201, { ok: true, data });
      }
      if (method === "PUT" && id) {
        const allowed = ["name","logo_url","website_url","tag","sort_order"];
        const upd: Record<string, unknown> = {};
        for (const k of allowed) { if (k in body) upd[k] = body[k]; }
        const { data, error } = await supabase.from("sponsors").update(upd).eq("id", id).select().single();
        if (error) throw error;
        return json(req, 200, { ok: true, data });
      }
      if (method === "DELETE" && id) {
        const { error } = await supabase.from("sponsors").delete().eq("id", id);
        if (error) throw error;
        return json(req, 200, { ok: true });
      }
    }

    // Strip messages
    if (base === "/strip") {
      if (method === "POST") {
        const { edition_id, text, active, sort_order } = body;
        if (!text) return json(req, 400, { error: "text obbligatorio" });
        const { data, error } = await supabase.from("strip_messages")
          .insert({ edition_id: edition_id || null, text, active: active ?? true, sort_order: sort_order ?? 0 })
          .select().single();
        if (error) throw error;
        return json(req, 201, { ok: true, data });
      }
      if (method === "PUT" && id) {
        const upd: Record<string, unknown> = {};
        if (body.text !== undefined) upd.text = body.text;
        if (body.active !== undefined) upd.active = body.active;
        if (body.sort_order !== undefined) upd.sort_order = body.sort_order;
        const { data, error } = await supabase.from("strip_messages").update(upd).eq("id", id).select().single();
        if (error) throw error;
        return json(req, 200, { ok: true, data });
      }
      if (method === "DELETE" && id) {
        const { error } = await supabase.from("strip_messages").delete().eq("id", id);
        if (error) throw error;
        return json(req, 200, { ok: true });
      }
    }

    return json(req, 404, { error: "Endpoint non trovato" });
  } catch (err) {
    console.error(err);
    return json(req, 500, { error: err instanceof Error ? err.message : "Errore interno" });
  }
});
