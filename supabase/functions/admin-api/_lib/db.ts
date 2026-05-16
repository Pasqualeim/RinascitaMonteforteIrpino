import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl    = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

if (!supabaseUrl || !serviceRoleKey || !Deno.env.get("ADMIN_SESSION_SECRET")) {
  throw new Error("Missing required env vars");
}

export const db = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const sessionHours = Number(Deno.env.get("ADMIN_SESSION_HOURS") || "12");
