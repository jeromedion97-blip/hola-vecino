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
  if (b.mode === "seo") return seo(b);
  if (b.mode === "draft") {
    const topic = String(b.topic || "").slice(0, 300);
    if (!topic) return Response.json({ error: "topic required" }, { status: 400 });
    system = `You write the weekly practical article of "Hola Vecino", a community website for people moving to or living in Spain (mostly from France, Belgium, the Netherlands, Germany and the UK).
Write in French, about 400 words, warm and practical. Format strictly as plain text:
- first line: the title only (no symbol before it),
- then the body: short paragraphs, "## " for subheadings, "- " for bullet points, **bold** for key words.
Be accurate and cautious: never invent figures, fees, deadlines or laws you are not sure of; say that rules can change and point to official sources.
For legal, tax or residency matters, explicitly advise consulting a lawyer or a gestoría. End with one short practical tip.`;
    user = `Topic: ${topic}` + (b.keyword ? `\nMain search keyword to use naturally in the title and in one subheading: ${String(b.keyword).slice(0, 80)}` : "");
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
    const raw = await r.text();
    let data;
    try { data = JSON.parse(raw); }
    catch { console.error("Anthropic non-JSON", r.status, raw.slice(0, 300)); return Response.json({ error: `${r.status} réponse inattendue de l'IA : ${raw.slice(0, 220)}` }, { status: 502 }); }
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

// Optimisation pour Google : adresse, titre, description, mot-clé et conseils
async function seo(b) {
  const lang = LANGS[b.lang] || "French";
  const searches = (Array.isArray(b.searches) ? b.searches : []).slice(0, 25).map(x => String(x).slice(0, 60));
  const system = `You are an SEO editor for "Hola Vecino", a website for people moving to or living in Spain. Optimise one article for Google search, in ${lang}.
Rules: title for Google 45-60 characters, including the main keyword near the start; meta description 120-155 characters, concrete, ending with a light call to action; slug in lowercase ascii words separated by hyphens, 3-7 words, no accents; one main keyword (2-5 words) that real people type; 3 to 5 short, concrete tips to improve the article text (headings, missing questions people ask, internal links to guides such as the NIE or padrón pages, length). Never invent facts.
Reply with ONLY a JSON object: {"slug":"...","title":"...","description":"...","keyword":"...","tips":["..."]}`;
  const user = `Article title: ${String(b.title || "").slice(0, 200)}\nArticle text:\n${String(b.body || "").slice(0, 6000)}` +
    (searches.length ? `\n\nWhat visitors search for on the site (most frequent first): ${searches.join(" | ")}` : "");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 900, system, messages: [{ role: "user", content: user }] })
  });
  const raw = await r.text(); let data;
  try { data = JSON.parse(raw); } catch { return Response.json({ error: `${r.status} réponse inattendue de l'IA : ${raw.slice(0, 220)}` }, { status: 502 }); }
  if (!r.ok) return Response.json({ error: `${r.status} ${data?.error?.message || "api error"}` }, { status: 502 });
  const text = (data.content || []).filter(x => x.type === "text").map(x => x.text).join("\n");
  const m = text.match(/\{[\s\S]*\}/);
  let out; try { out = JSON.parse(m ? m[0] : text); } catch { return Response.json({ error: "L'IA a répondu dans un format inattendu. Réessayez." }, { status: 502 }); }
  out.slug = String(out.slug || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  return Response.json(out);
}
