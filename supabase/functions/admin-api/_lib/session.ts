import { db } from "./db.ts";
import { sha256, bearer } from "./helpers.ts";

export async function requireSession(req: Request) {
  const raw = bearer(req);
  if (!raw) return { error: "Sessione admin assente" };
  const hash = await sha256(raw);
  const { data: row, error } = await db
    .from("admin_sessions")
    .select("id, expires_at, revoked_at, admin_users!inner(id, username, role, is_active)")
    .eq("session_token_hash", hash)
    .is("revoked_at", null)
    .single();
  if (error || !row) return { error: "Sessione non valida" };
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await db.from("admin_sessions").update({ revoked_at: new Date().toISOString() }).eq("id", row.id);
    return { error: "Sessione scaduta" };
  }
  const u = Array.isArray(row.admin_users) ? row.admin_users[0] : row.admin_users;
  if (!u?.is_active) return { error: "Utente disattivato" };
  await db.from("admin_sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", row.id);
  return { sessionId: row.id, user: { id: u.id, username: u.username, role: u.role } };
}

export async function getActiveEdition() {
  const { data } = await db
    .from("editions")
    .select("*")
    .in("status", ["active", "upcoming"])
    .order("status", { ascending: true })
    .order("year", { ascending: false })
    .limit(1)
    .single();
  return data;
}
