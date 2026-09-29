// Assistant IA et traducteur, avec quotas : 15 demandes/jour et 50/semaine (gratuit), 100/jour (Premium)
// Variables Netlify : ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
const LANGS = { fr: "French", en: "English", es: "Spanish", de: "German", nl: "Dutch" };
const URL_ = () => process.env.SUPABASE_URL;
const svc = { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` };

async function userFromToken(token) {
  const r = await fetch(`${URL_()}/auth/v1/user`, { headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } });
  return r.ok ? r.json() : null;
}
async function countSince(uid, iso) {
  const r = await fetch(`${URL_()}/rest/v1/ai_calls?select=id&user_id=eq.${uid}&created_at=gte.${encodeURIComponent(iso)}`, { headers: { ...svc, Prefer: "count=exact", Range: "0-0" } });
  const range = r.headers.get("content-range") || "*/0";
  return parseInt(range.split("/")[1] || "0", 10) || 0;
}

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const user = token ? await userFromToken(token) : null;
  if (!user || !user.id) return Response.json({ error: "login" }, { status: 401 });
  let b; try { b = await req.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }

  // Quota
  const pr = await fetch(`${URL_()}/rest/v1/profiles?select=premium_until,premium_plan&id=eq.${user.id}`, { headers: svc });
  const prof = ((await pr.json()) || [])[0] || {};
  const premium = prof.premium_until && new Date(prof.premium_until) > new Date();
  const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
  const day = await countSince(user.id, dayStart.toISOString());
  const week = await countSince(user.id, new Date(Date.now() - 7 * 86400e3).toISOString());
  const allIn = premium && prof.premium_plan === "all_in";
  const limDay = allIn ? 300 : premium ? 100 : 15, limWeek = allIn ? 2000 : premium ? 700 : 50;
  if (day >= limDay || week >= limWeek) return Response.json({ error: "quota", premium, day, week }, { status: 429 });

  const lang = LANGS[b.lang] || "English";
  let system, messages, max = 900;
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "ANTHROPIC_API_KEY manquante dans Netlify" }, { status: 500 });
  if (b.mode === "translate") {
    const from = LANGS[b.from] || "the detected language", to = LANGS[b.to];
    const text = String(b.text || "").slice(0, 2000);
    if (!to || !text.trim()) return Response.json({ error: "bad request" }, { status: 400 });
    system = `You are a professional translator. Translate the user's text from ${from} into ${to}. Keep the meaning, tone and formatting. Output only the translation, nothing else.`;
    messages = [{ role: "user", content: text }]; max = 1500;
  } else {
    system = `You are the assistant of "Hola Vecino", a community website for people moving to or living in Spain (mostly from France, Belgium, the Netherlands, Germany and the UK).
Answer in ${lang}, clearly and warmly, in plain text (no tables), in 200 words maximum unless asked for more.
Be practical and accurate: residency (NIE, TIE, EU registration), padrón, social security, healthcare, banks, housing, taxes, driving, schools, daily life and culture.
Never invent figures, fees, deadlines or laws you are not sure of: say that rules change and point to official sources (sede.administracionespublicas.gob.es, seg-social.es, agenciatributaria.es).
For any personal legal, tax or residency situation, recommend consulting a lawyer or a gestoría. You can suggest the site's sections: Paperwork guide, Finance estimate, Useful contacts, Events, Forum.`;
    const hist = Array.isArray(b.history) ? b.history.slice(-8) : [];
    messages = hist.filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
    if (!messages.length || messages[messages.length - 1].role !== "user") return Response.json({ error: "bad request" }, { status: 400 });
  }
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: max, system, messages })
    });
    const data = await r.json();
    if (!r.ok) { console.error("Anthropic", r.status, data?.error?.message); return Response.json({ error: `${r.status} ${data?.error?.message || "api error"}` }, { status: 502 }); }
    const text = (data.content || []).filter(x => x.type === "text").map(x => x.text).join("\n").trim();
    await fetch(`${URL_()}/rest/v1/ai_calls`, { method: "POST", headers: { ...svc, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ user_id: user.id, kind: b.mode === "translate" ? "translate" : "assistant" }) });
    return Response.json({ text, premium, left_day: limDay - day - 1, left_week: limWeek - week - 1 });
  } catch (e) {
    console.error("ai network", e);
    return Response.json({ error: "network: " + (e && e.message) }, { status: 502 });
  }
};
