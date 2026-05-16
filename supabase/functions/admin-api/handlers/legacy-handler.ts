import { db } from "../_lib/db.ts";
import { ok } from "../_lib/helpers.ts";
import { requireSession } from "../_lib/session.ts";

export async function legacyHandler(req: Request, base: string, _id: string | null): Promise<Response | null> {
  if (req.method !== "POST" || base !== "/save") return null;

  const auth = await requireSession(req);
  if (auth.error) return ok(req, 401, { error: auth.error });
  const body = await req.json().catch(() => ({}));
  if (!body.content || typeof body.content !== "object" || Array.isArray(body.content))
    return ok(req, 400, { error: "Payload content non valido" });
  const updatedAt = new Date().toISOString();
  const { error } = await db.from("site_data").update({ content: body.content, updated_at: updatedAt }).eq("id", 1);
  if (error) throw error;
  return ok(req, 200, { ok: true, updated_at: updatedAt, saved_by: auth.user.username });
}
