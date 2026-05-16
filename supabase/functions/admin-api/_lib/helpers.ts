export function cors(req: Request) {
  const allowedOrigin = Deno.env.get("ADMIN_ALLOWED_ORIGIN") || "*";
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigin === "*" ? "*" : origin === allowedOrigin ? origin : allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}

export const ok = (req: Request, status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: cors(req) });

export function parsePath(url: string): { base: string; id: string | null } {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("admin-api");
  const segs = idx >= 0 ? parts.slice(idx + 1) : parts.slice(-2);
  if (!segs.length) return { base: "/", id: null };
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (segs.length >= 2 && uuid.test(segs[segs.length - 1]))
    return { base: "/" + segs.slice(0, -1).join("/"), id: segs[segs.length - 1] };
  return { base: "/" + segs.join("/"), id: null };
}

export const san     = (v: unknown) => String(v || "").trim();
export const sanPass = (v: unknown) => String(v || "");
export const b64     = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
export const addHrs  = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();
export const bearer  = (req: Request) =>
  (req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i)?.[1] || "";

const sessionSecret = Deno.env.get("ADMIN_SESSION_SECRET") || "";

export async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s + sessionSecret));
  return b64(new Uint8Array(d));
}
