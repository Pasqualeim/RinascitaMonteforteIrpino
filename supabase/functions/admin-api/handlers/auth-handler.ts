import { db, sessionHours } from "../_lib/db.ts";
import { ok, san, sanPass, b64, sha256, addHrs } from "../_lib/helpers.ts";
import { requireSession } from "../_lib/session.ts";
import bcrypt from "npm:bcryptjs@2.4.3";

export async function authHandler(req: Request, base: string, id: string | null): Promise<Response | null> {
  const method = req.method;

  if (method === "POST" && base === "/login") {
    const body = await req.json().catch(() => ({}));
    const username = san(body.username), password = sanPass(body.password);
    if (username.length < 3 || password.length < 8) return ok(req, 400, { error: "Credenziali non valide" });
    const { data: u, error: ue } = await db.from("admin_users").select("id,username,password_hash,role,is_active").eq("username", username).single();
    if (ue || !u || !u.is_active) return ok(req, 401, { error: "Credenziali non valide" });
    if (!await bcrypt.compare(password, u.password_hash)) return ok(req, 401, { error: "Credenziali non valide" });
    const raw = b64(crypto.getRandomValues(new Uint8Array(32)));
    const hash = await sha256(raw);
    const exp  = addHrs(sessionHours);
    await db.from("admin_sessions").update({ revoked_at: new Date().toISOString() }).eq("user_id", u.id).is("revoked_at", null);
    const { error: ie } = await db.from("admin_sessions").insert({ user_id: u.id, session_token_hash: hash, expires_at: exp, user_agent: req.headers.get("user-agent") });
    if (ie) throw ie;
    return ok(req, 200, { ok: true, session: { token: raw, expires_at: exp, user: { username: u.username, role: u.role } } });
  }

  if (method === "GET" && base === "/me") {
    const auth = await requireSession(req);
    if (auth.error) return ok(req, 401, { error: auth.error });
    return ok(req, 200, { ok: true, user: auth.user });
  }

  if (method === "POST" && base === "/logout") {
    const auth = await requireSession(req);
    if (auth.error) return ok(req, 401, { error: auth.error });
    await db.from("admin_sessions").update({ revoked_at: new Date().toISOString() }).eq("id", auth.sessionId);
    return ok(req, 200, { ok: true });
  }

  if (method === "POST" && base === "/credentials") {
    const auth = await requireSession(req);
    if (auth.error) return ok(req, 401, { error: auth.error });
    const body = await req.json().catch(() => ({}));
    const username = san(body.username), password = sanPass(body.password);
    if (username.length < 3) return ok(req, 400, { error: "Username troppo corto" });
    const upd: Record<string, unknown> = { username };
    if (password) {
      if (password.length < 8) return ok(req, 400, { error: "Password troppo corta" });
      upd.password_hash = await bcrypt.hash(password, 12);
    }
    const { data: updU, error } = await db.from("admin_users").update(upd).eq("id", auth.user.id).select("username,role").single();
    if (error) {
      if (String(error.message || "").toLowerCase().includes("duplicate")) return ok(req, 409, { error: "Username già in uso" });
      throw error;
    }
    return ok(req, 200, { ok: true, user: { username: updU.username, role: updU.role } });
  }

  return null;
}
