import { db } from "../_lib/db.ts";
import { ok } from "../_lib/helpers.ts";
import { requireSession } from "../_lib/session.ts";

export async function contentHandler(req: Request, base: string, id: string | null): Promise<Response | null> {
  const ROUTES = ["/news","/events","/honors","/sponsors","/strip"];
  if (!ROUTES.includes(base)) return null;

  const auth = await requireSession(req);
  if (auth.error) return ok(req, 401, { error: auth.error });
  const method = req.method;
  const body = method !== "GET" && method !== "DELETE" ? await req.json().catch(() => ({})) : {};

  // News
  if (base === "/news") {
    if (method === "POST") {
      const { edition_id, title, body: bodyText, category, tone, pinned } = body;
      if (!edition_id || !title) return ok(req, 400, { error: "edition_id e title obbligatori" });
      const { data, error } = await db.from("news").insert({ edition_id, title, body: bodyText || null, category: category || "generale", tone: tone || "info", pinned: pinned ?? false }).select().single();
      if (error) throw error;
      return ok(req, 201, { ok: true, data });
    }
    if (method === "PUT" && id) {
      const upd: Record<string, unknown> = {};
      if (body.title    !== undefined) upd.title    = body.title;
      if (body.body     !== undefined) upd.body     = body.body;
      if (body.category !== undefined) upd.category = body.category;
      if (body.tone     !== undefined) upd.tone     = body.tone;
      if (body.pinned   !== undefined) upd.pinned   = body.pinned;
      const { data, error } = await db.from("news").update(upd).eq("id", id).select().single();
      if (error) throw error;
      return ok(req, 200, { ok: true, data });
    }
    if (method === "DELETE" && id) {
      const { error } = await db.from("news").delete().eq("id", id);
      if (error) throw error;
      return ok(req, 200, { ok: true });
    }
  }

  // Events
  if (base === "/events") {
    if (method === "POST") {
      const { edition_id, title, event_date, event_time, event_type, description, sort_order } = body;
      if (!edition_id || !title) return ok(req, 400, { error: "edition_id e title obbligatori" });
      const { data, error } = await db.from("edition_events").insert({ edition_id, title, event_date: event_date || null, event_time: event_time || null, event_type: event_type || "partita", description, sort_order: sort_order ?? 0 }).select().single();
      if (error) throw error;
      return ok(req, 201, { ok: true, data });
    }
    if (method === "PUT" && id) {
      const allowed = ["title","event_date","event_time","event_type","description","sort_order"];
      const upd: Record<string, unknown> = {};
      for (const k of allowed) { if (k in body) upd[k] = body[k]; }
      const { data, error } = await db.from("edition_events").update(upd).eq("id", id).select().single();
      if (error) throw error;
      return ok(req, 200, { ok: true, data });
    }
    if (method === "DELETE" && id) {
      const { error } = await db.from("edition_events").delete().eq("id", id);
      if (error) throw error;
      return ok(req, 200, { ok: true });
    }
  }

  // Honors
  if (base === "/honors") {
    if (method === "POST") {
      const { edition_id, tournament_id, edition_name, year, winner, runner_up, third_place, mvp, top_scorer, notes } = body;
      if (!edition_name || !year) return ok(req, 400, { error: "edition_name e year obbligatori" });
      const { data, error } = await db.from("honors").insert({ edition_id: edition_id || null, tournament_id: tournament_id || null, edition_name, year, winner, runner_up, third_place, mvp, top_scorer, notes }).select().single();
      if (error) throw error;
      return ok(req, 201, { ok: true, data });
    }
    if (method === "PUT" && id) {
      const allowed = ["edition_name","year","winner","runner_up","third_place","mvp","top_scorer","notes"];
      const upd: Record<string, unknown> = {};
      for (const k of allowed) { if (k in body) upd[k] = body[k]; }
      const { data, error } = await db.from("honors").update(upd).eq("id", id).select().single();
      if (error) throw error;
      return ok(req, 200, { ok: true, data });
    }
    if (method === "DELETE" && id) {
      const { error } = await db.from("honors").delete().eq("id", id);
      if (error) throw error;
      return ok(req, 200, { ok: true });
    }
  }

  // Sponsors
  if (base === "/sponsors") {
    if (method === "POST") {
      const { edition_id, name, logo_url, website_url, tag, sort_order } = body;
      if (!name) return ok(req, 400, { error: "name obbligatorio" });
      const { data, error } = await db.from("sponsors").insert({ edition_id: edition_id || null, name, logo_url, website_url, tag, sort_order: sort_order ?? 0 }).select().single();
      if (error) throw error;
      return ok(req, 201, { ok: true, data });
    }
    if (method === "PUT" && id) {
      const allowed = ["name","logo_url","website_url","tag","sort_order"];
      const upd: Record<string, unknown> = {};
      for (const k of allowed) { if (k in body) upd[k] = body[k]; }
      const { data, error } = await db.from("sponsors").update(upd).eq("id", id).select().single();
      if (error) throw error;
      return ok(req, 200, { ok: true, data });
    }
    if (method === "DELETE" && id) {
      const { error } = await db.from("sponsors").delete().eq("id", id);
      if (error) throw error;
      return ok(req, 200, { ok: true });
    }
  }

  // Strip
  if (base === "/strip") {
    if (method === "POST") {
      const { edition_id, text, active, sort_order } = body;
      if (!text) return ok(req, 400, { error: "text obbligatorio" });
      const { data, error } = await db.from("strip_messages").insert({ edition_id: edition_id || null, text, active: active ?? true, sort_order: sort_order ?? 0 }).select().single();
      if (error) throw error;
      return ok(req, 201, { ok: true, data });
    }
    if (method === "PUT" && id) {
      const upd: Record<string, unknown> = {};
      if (body.text     !== undefined) upd.text     = body.text;
      if (body.active   !== undefined) upd.active   = body.active;
      if (body.sort_order !== undefined) upd.sort_order = body.sort_order;
      const { data, error } = await db.from("strip_messages").update(upd).eq("id", id).select().single();
      if (error) throw error;
      return ok(req, 200, { ok: true, data });
    }
    if (method === "DELETE" && id) {
      const { error } = await db.from("strip_messages").delete().eq("id", id);
      if (error) throw error;
      return ok(req, 200, { ok: true });
    }
  }

  return null;
}
