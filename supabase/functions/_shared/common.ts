// Shared helpers for Supabase Edge Functions (CORS, auth, DB, text sanitization, date).
export type Row = Record<string, any>;

export const ORIGINS = [
  "https://easywords.uz",
  "https://www.easywords.uz",
  "https://aliumirovux.github.io",
  "http://localhost:8766",
];

export const CYR = /[Ѐ-ӿ]/;

export function env(key: string, fallback = ""): string {
  const g = globalThis as Record<string, any>;
  if (g.Deno && g.Deno.env && typeof g.Deno.env.get === "function") {
    return g.Deno.env.get(key) ?? fallback;
  }
  if (g.process && g.process.env) {
    return g.process.env[key] ?? fallback;
  }
  return fallback;
}

export const cors = (origin: string | null, methods = "POST, OPTIONS") => ({
  "Access-Control-Allow-Origin": origin && ORIGINS.includes(origin) ? origin : ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": methods,
  "Vary": "Origin",
});

export const json = (body: unknown, status = 200, origin: string | null = null, withCors = true) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...(withCors ? cors(origin) : {}),
      "Content-Type": "application/json; charset=utf-8",
    },
  });

export const clip = (v: unknown, n: number) =>
  String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

export const enText = (v: unknown, n: number) => {
  const s = clip(v, n);
  return s && /[A-Za-z]/.test(s) && !CYR.test(s) ? s : "";
};

export const uzText = (v: unknown, n: number) => {
  const s = clip(v, n);
  return s && !CYR.test(s) ? s : "";
};

export const tashkentDay = (offset = 0) =>
  new Date(Date.now() + 5 * 3600e3 + offset * 864e5).toISOString().slice(0, 10);

export function safeEq(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

export function hasCronOrAgentAuth(req: Request): boolean {
  const cronKey = env("CRON_KEY");
  const agentKey = env("AGENT_KEY");
  const gotCron = req.headers.get("x-cron-key") || "";
  const gotAgent = req.headers.get("x-agent-key") || "";
  if (cronKey && safeEq(gotCron, cronKey)) return true;
  if (agentKey && (safeEq(gotAgent, agentKey) || safeEq(gotCron, agentKey))) return true;
  return false;
}

export async function verifyCronOrAgentAuth(req: Request): Promise<boolean> {
  if (hasCronOrAgentAuth(req)) return true;
  const gotCron = (req.headers.get("x-cron-key") || "").trim();
  if (!/^[0-9a-f]{64}$/.test(gotCron)) return false;
  try {
    const rows = await db(`agent_settings?cron_key=eq.${gotCron}&select=user_id&limit=1`);
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

export async function db(path: string, init: RequestInit = {}) {
  const sbUrl = env("SUPABASE_URL");
  const srv = env("SUPABASE_SERVICE_ROLE_KEY");
  const r = await fetch(`${sbUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: srv,
      Authorization: `Bearer ${srv}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!r.ok) throw new Error(`db ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

export async function whoUser(req: Request): Promise<{ id: string; email: string } | null> {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const sbUrl = env("SUPABASE_URL");
  const apiKey = env("SUPABASE_ANON_KEY") || env("SUPABASE_SERVICE_ROLE_KEY");
  const r = await fetch(`${sbUrl}/auth/v1/user`, {
    headers: { apikey: apiKey, Authorization: auth },
  });
  if (!r.ok) return null;
  const u = await r.json().catch(() => null);
  if (!u || !u.id) return null;
  return { id: String(u.id), email: String(u.email || "").toLowerCase() };
}

export async function who(req: Request): Promise<string | null> {
  const u = await whoUser(req);
  return u ? u.id : null;
}

export async function getProfile(uid: string): Promise<Row | null> {
  if (!uid) return null;
  try {
    const rows = await db(
      `profiles?user_id=eq.${uid}&select=user_id,display_name,level,avoid_topics,allow_ai,ai_daily_limit&limit=1`,
    );
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  } catch {
    return null;
  }
}
