import { db } from "../_lib/db.ts";
import { ok } from "../_lib/helpers.ts";
import { requireSession } from "../_lib/session.ts";

export async function editionsHandler(req: Request, base: string, id: string | null): Promise<Response | null> {
  const method = req.method;

  if (method === "GET" && base === "/editions") {
    const { data, error } = await db.from("editions").select("*, tournaments(id,name,slug,sort_order)").order("year", { ascending: false });
    if (error) throw error;
    return ok(req, 200, { ok: true, data });
  }

  if (base === "/editions") {
    const auth = await requireSession(req);
    if (auth.error) return ok(req, 401, { error: auth.error });
    const body = await req.json().catch(() => ({}));

    if (method === "POST") {
      const { name, year, edition_number, slug, status, kickoff_date, start_date, end_date, location, description } = body;
      if (!name || !year || !slug) return ok(req, 400, { error: "name, year, slug obbligatori" });
      const { data, error } = await db.from("editions").insert({ name, year, edition_number, slug, status: status || "upcoming", kickoff_date, start_date, end_date, location, description }).select().single();
      if (error) throw error;
      return ok(req, 201, { ok: true, data });
    }
    if (method === "PUT" && id) {
      const allowed = ["name","status","kickoff_date","start_date","end_date","location","description"];
      const upd: Record<string, unknown> = {};
      for (const k of allowed) { if (k in body) upd[k] = body[k]; }
      const { data, error } = await db.from("editions").update(upd).eq("id", id).select().single();
      if (error) throw error;
      return ok(req, 200, { ok: true, data });
    }
  }

  if (base === "/tournaments") {
    const auth = await requireSession(req);
    if (auth.error) return ok(req, 401, { error: auth.error });
    const body = await req.json().catch(() => ({}));

    if (method === "POST") {
      const { edition_id, name, slug, sort_order, prize_first, prize_second, prize_third } = body;
      if (!edition_id || !name || !slug) return ok(req, 400, { error: "edition_id, name, slug obbligatori" });
      const { data, error } = await db.from("tournaments").insert({ edition_id, name, slug, sort_order: sort_order ?? 0, prize_first, prize_second, prize_third }).select().single();
      if (error) throw error;
      return ok(req, 201, { ok: true, data });
    }
    if (method === "PUT" && id) {
      const allowed = ["name","slug","sort_order","prize_first","prize_second","prize_third"];
      const upd: Record<string, unknown> = {};
      for (const k of allowed) { if (k in body) upd[k] = body[k]; }
      const { data, error } = await db.from("tournaments").update(upd).eq("id", id).select().single();
      if (error) throw error;
      return ok(req, 200, { ok: true, data });
    }
    if (method === "DELETE" && id) {
      const { error } = await db.from("tournaments").delete().eq("id", id);
      if (error) throw error;
      return ok(req, 200, { ok: true });
    }
  }

  return null;
}
