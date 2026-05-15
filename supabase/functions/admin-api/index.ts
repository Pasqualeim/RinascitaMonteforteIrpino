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
    "Access-Control-Allow-Origin": allowedOrigin === "*" ? "*" : (origin === allowedOrigin ? origin : allowedOrigin),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

function getPath(url: string) {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter(Boolean);
  const adminApiIndex = parts.indexOf("admin-api");
  if (adminApiIndex >= 0) {
    return "/" + (parts.slice(adminApiIndex + 1).join("/") || "");
  }
  return "/" + parts.slice(-1).join("/");
}

function sanitizeUsername(value: unknown) {
  return String(value || "").trim();
}

function sanitizePassword(value: unknown) {
  return String(value || "");
}

function toBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256(input: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input + sessionSecret));
  return toBase64Url(new Uint8Array(digest));
}

function addHours(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function tokenFromAuthHeader(req: Request) {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

async function requireSession(req: Request) {
  const rawToken = tokenFromAuthHeader(req);
  if (!rawToken) return { error: "Sessione admin assente" };

  const tokenHash = await sha256(rawToken);
  const { data: sessionRow, error: sessionError } = await supabase
    .from("admin_sessions")
    .select("id, user_id, expires_at, revoked_at, admin_users!inner(id, username, role, is_active)")
    .eq("session_token_hash", tokenHash)
    .is("revoked_at", null)
    .single();

  if (sessionError || !sessionRow) return { error: "Sessione non valida" };

  const expiresAt = new Date(sessionRow.expires_at).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    await supabase.from("admin_sessions").update({ revoked_at: new Date().toISOString() }).eq("id", sessionRow.id);
    return { error: "Sessione scaduta" };
  }

  const adminUser = Array.isArray(sessionRow.admin_users) ? sessionRow.admin_users[0] : sessionRow.admin_users;
  if (!adminUser?.is_active) return { error: "Utente disattivato" };

  await supabase
    .from("admin_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", sessionRow.id);

  return {
    sessionId: sessionRow.id,
    user: {
      id: adminUser.id,
      username: adminUser.username,
      role: adminUser.role,
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  const path = getPath(req.url);

  try {
    if (req.method === "POST" && !hasAllowedOrigin(req)) {
      return json(req, 403, { error: "Origin non autorizzata" });
    }

    if (req.method === "POST" && path === "/login") {
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

      await supabase
        .from("admin_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("user_id", userRow.id)
        .is("revoked_at", null);

      const { error: insertError } = await supabase.from("admin_sessions").insert({
        user_id: userRow.id,
        session_token_hash: tokenHash,
        expires_at: expiresAt,
        user_agent: req.headers.get("user-agent"),
      });

      if (insertError) throw insertError;

      return json(req, 200, {
        ok: true,
        session: {
          token: rawToken,
          expires_at: expiresAt,
          user: { username: userRow.username, role: userRow.role },
        },
      });
    }

    if (req.method === "GET" && path === "/me") {
      const auth = await requireSession(req);
      if (auth.error) return json(req, 401, { error: auth.error });
      return json(req, 200, { ok: true, user: auth.user });
    }

    if (req.method === "POST" && path === "/logout") {
      const auth = await requireSession(req);
      if (auth.error) return json(req, 401, { error: auth.error });

      const { error } = await supabase
        .from("admin_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", auth.sessionId);

      if (error) throw error;
      return json(req, 200, { ok: true });
    }

    if (req.method === "POST" && path === "/credentials") {
      const auth = await requireSession(req);
      if (auth.error) return json(req, 401, { error: auth.error });

      const body = await req.json().catch(() => ({}));
      const username = sanitizeUsername(body.username);
      const password = sanitizePassword(body.password);

      if (username.length < 3) return json(req, 400, { error: "Username troppo corto" });

      const payload: Record<string, unknown> = { username };
      if (password) {
        if (password.length < 8) return json(req, 400, { error: "Password troppo corta" });
        payload.password_hash = await bcrypt.hash(password, 12);
      }

      const { data: updatedUser, error } = await supabase
        .from("admin_users")
        .update(payload)
        .eq("id", auth.user.id)
        .select("username, role")
        .single();

      if (error) {
        if (String(error.message || "").toLowerCase().includes("duplicate")) {
          return json(req, 409, { error: "Username già in uso" });
        }
        throw error;
      }

      return json(req, 200, {
        ok: true,
        user: {
          username: updatedUser.username,
          role: updatedUser.role,
        },
      });
    }

    if (req.method === "POST" && path === "/save") {
      const auth = await requireSession(req);
      if (auth.error) return json(req, 401, { error: auth.error });

      const body = await req.json().catch(() => ({}));
      const content = body.content;
      if (!content || typeof content !== "object" || Array.isArray(content)) {
        return json(req, 400, { error: "Payload content non valido" });
      }

      const updatedAt = new Date().toISOString();
      const { error } = await supabase
        .from("site_data")
        .update({ content, updated_at: updatedAt })
        .eq("id", 1);

      if (error) throw error;
      return json(req, 200, { ok: true, updated_at: updatedAt, saved_by: auth.user.username });
    }

    return json(req, 404, { error: "Endpoint non trovato" });
  } catch (error) {
    console.error(error);
    return json(req, 500, { error: error instanceof Error ? error.message : "Errore interno" });
  }
});
