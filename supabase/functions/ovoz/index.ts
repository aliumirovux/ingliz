// Admin Google Cloud TTS (Chirp 3 HD) audio generator for vocabulary and sentences.
// Endpoint: POST /ovoz (modes: sample, gen; protected by x-admin SHA-256).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ADMIN_SHA = "";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
const sha = async (algo: string, s: string) => hex(await crypto.subtle.digest(algo, new TextEncoder().encode(s)));

export const norm = (s: string) => s.toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, " ").trim();

async function tts(key: string, text: string, voice: string, rate?: number) {
  const lang = voice.split("-").slice(0, 2).join("-");
  const body: Record<string, unknown> = { input: { text }, voice: { languageCode: lang, name: voice }, audioConfig: { audioEncoding: "MP3", ...(rate ? { speakingRate: rate } : {}) } };
  const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`tts ${r.status}: ${JSON.stringify(d).slice(0, 300)}`);
  return d.audioContent as string;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if ((await sha("SHA-256", req.headers.get("x-admin") || "")) !== ADMIN_SHA) return json({ error: "forbidden" }, 403);
  const key = Deno.env.get("GOOGLE_TTS_KEY");
  if (!key) return json({ error: "no_key" }, 503);
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
  const voice = String(b.voice || "en-US-Chirp3-HD-Charon");

  if (b.mode === "sample") {
    try { return json({ audio: await tts(key, String(b.text || "").slice(0, 300), voice, b.rate as number | undefined) }); }
    catch (e) { return json({ error: String(e) }, 502); }
  }

  if (b.mode === "gen") {
    const items = (Array.isArray(b.items) ? b.items : []).map(String).slice(0, 40);
    const dir = String(b.dir || "v1");
    const url = Deno.env.get("SUPABASE_URL")!, svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const out: Record<string, string> = {};
    for (const t of items) {
      const id = (await sha("SHA-1", norm(t))).slice(0, 16);
      try {
        const a = await tts(key, t, voice, b.rate as number | undefined);
        const bytes = Uint8Array.from(atob(a), (c) => c.charCodeAt(0));
        const up = await fetch(`${url}/storage/v1/object/ovoz/${dir}/${id}.mp3`, { method: "POST", headers: { Authorization: `Bearer ${svc}`, "Content-Type": "audio/mpeg", "x-upsert": "true", "Cache-Control": "max-age=31536000" }, body: bytes });
        out[t] = up.ok ? id : `upload ${up.status}`;
      } catch (e) { out[t] = `error ${String(e).slice(0, 120)}`; }
    }
    return json({ dir, out });
  }
  return json({ error: "mode" }, 400);
});
