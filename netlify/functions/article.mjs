// Rédaction et traduction des articles hebdomadaires (réservé aux administrateurs)
// Variables Netlify : ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY
const LANGS = { fr: "French", en: "English", es: "Spanish", de: "German", nl: "Dutch" };

async function isAdmin(token) {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/is_admin`, {
    method: "POST",
    headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: "{}"
  });
  if (!r.ok) return false;
  const v = await r.json().catch(() => null);
  return v === true;
}

export default async (req) => {
  try { return await handle(req); }
  catch (e) { console.error("article", e); return Response.json({ error: "crash: " + (e && e.message || e) }, { status: 500 }); }
};

async function handle(req) {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const missing = ["ANTHROPIC_API_KEY", "SUPABASE_URL", "SUPABASE_ANON_KEY"].filter(k => !process.env[k]);
  if (missing.length) return Response.json({ error: "Variable(s) Netlify manquante(s) : " + missing.join(", ") }, { status: 500 });
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token || !(await isAdmin(token))) return Response.json({ error: "admin only" }, { status: 403 });

  let b; try { b = await req.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  let system, user;
  if (b.mode === "draft") {
    const topic = String(b.topic || "").slice(0, 300);
    if (!topic) return Response.json({ error: "topic required" }, { status: 400 });
    system = `You write the weekly practical article of "Hola Vecino", a community website for people moving to or living in Spain (mostly from France, Belgium, the Netherlands, Germany and the UK).
Write in French, about 400 words, warm and practical. Format strictly as plain text:
- first line: the title only (no symbol before it),
- then the body: short paragraphs, "## " for subheadings, "- " for bullet points, **bold** for key words.
Be accurate and cautious: never invent figures, fees, deadlines or laws you are not sure of; say that rules can change and point to official sources.
For legal, tax or residency matters, explicitly advise consulting a lawyer or a gestoría. End with one short practical tip.`;
    user = `Topic: ${topic}`;
  } else if (b.mode === "translate") {
    const to = LANGS[b.to]; if (!to || b.to === "fr") return Response.json({ error: "bad language" }, { status: 400 });
    system = `Translate the article into ${to}. Keep exactly the same structure and markers ("## ", "- ", "**"). Natural, idiomatic language. Output: first line the translated title, then the translated body. Nothing else.`;
    user = `${String(b.title || "").slice(0, 300)}\n${String(b.body || "").slice(0, 12000)}`;
  } else return Response.json({ error: "bad mode" }, { status: 400 });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1800, system, messages: [{ role: "user", content: user }] })
    });
    const data = await r.json();
    if (!r.ok) { console.error("Anthropic", r.status, data?.error?.message); return Response.json({ error: `${r.status} ${data?.error?.message || "api error"}` }, { status: 502 }); }
    const text = (data.content || []).filter(x => x.type === "text").map(x => x.text).join("\n").trim();
    const nl = text.indexOf("\n");
    const title = (nl > 0 ? text.slice(0, nl) : text).replace(/^#+\s*/, "").replace(/\*\*/g, "").trim();
    const body = nl > 0 ? text.slice(nl + 1).trim() : "";
    return Response.json({ title, body });
  } catch (e) {
    return Response.json({ error: "network: " + (e && e.message) }, { status: 502 });
  }
}
