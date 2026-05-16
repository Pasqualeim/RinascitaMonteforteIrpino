import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { cors, ok, parsePath } from "./_lib/helpers.ts";
import { db } from "./_lib/db.ts";
import { buildBootstrap } from "./_lib/bootstrap.ts";
import { getActiveEdition } from "./_lib/session.ts";
import { authHandler } from "./handlers/auth-handler.ts";
import { editionsHandler } from "./handlers/editions-handler.ts";
import { competitionHandler } from "./handlers/competition-handler.ts";
import { contentHandler } from "./handlers/content-handler.ts";
import { legacyHandler } from "./handlers/legacy-handler.ts";

const allowedOrigin = Deno.env.get("ADMIN_ALLOWED_ORIGIN") || "*";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });

  const { base, id } = parsePath(req.url);
  const method = req.method;

  try {
    // Origin check for write operations
    if ((method === "POST" || method === "PUT" || method === "DELETE") && allowedOrigin !== "*") {
      const origin = req.headers.get("origin") || "";
      if (origin !== allowedOrigin) return ok(req, 403, { error: "Origin non autorizzata" });
    }

    // Public endpoints
    if (method === "GET" && base === "/bootstrap") {
      const slug = new URL(req.url).searchParams.get("edition");
      let edition;
      if (slug) {
        const { data } = await db.from("editions").select("*").eq("slug", slug).single();
        edition = data;
      } else {
        edition = await getActiveEdition();
      }
      if (!edition) return ok(req, 404, { error: "Nessuna edizione trovata" });
      return ok(req, 200, { ok: true, data: await buildBootstrap(edition.id) });
    }

    // Route to handlers — first match wins
    const response = await authHandler(req, base, id)
      ?? await editionsHandler(req, base, id)
      ?? await competitionHandler(req, base, id)
      ?? await contentHandler(req, base, id)
      ?? await legacyHandler(req, base, id);

    return response ?? ok(req, 404, { error: "Endpoint non trovato" });
  } catch (err) {
    console.error(err);
    return ok(req, 500, { error: err instanceof Error ? err.message : "Errore interno" });
  }
});
