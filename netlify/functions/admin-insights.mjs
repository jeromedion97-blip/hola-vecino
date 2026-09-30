// Analyse IA du site pour l'administrateur : ce que disent les membres, idées d'articles, améliorations, actions
// Variables Netlify : ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
const URL_ = () => process.env.SUPABASE_URL;
const svc = () => ({ apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` });
const get = async path => { const r = await fetch(`${URL_()}/rest/v1/${path}`, { headers: svc() }); return r.ok ? r.json() : []; };
const clip = (s, n = 280) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);
const since = d => encodeURIComponent(new Date(Date.now() - d * 86400e3).toISOString());

async function isAdmin(token) {
  const r = await fetch(`${URL_()}/rest/v1/rpc/is_admin`, { method: "POST", headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: "{}" });
  if (!r.ok) return false; const v = await r.json().catch(() => null); return v === true;
}

export default async (req) => {
  try { return await handle(req); }
  catch (e) { console.error("insights", e); return Response.json({ error: "crash: " + (e && e.message || e) }, { status: 500 }); }
};

async function compose(b) {
  const who = String(b.name || "l'équipe").slice(0, 60);
  const topic = String(b.topic || "").slice(0, 400);
  const current = String(b.current || "").slice(0, 2000);
  const task = b.action === "welcome"
    ? `Write the private welcome message sent automatically to every new member of the site, signed by ${who}, the founder. Goal: make them feel welcome, and get them to complete their profile, introduce themselves in the "Présentations" section and follow their paperwork checklist. Invite them to reply with questions or ideas.`
    : `Write an announcement message sent to all members of the site, signed by ${who}. Subject of the announcement: ${topic || "a general update: new features and improvements on the site"}. Clear, friendly, with one call to action.`;
  const system = `You write messages for "Hola Vecino", a friendly community website for people moving to or living in Spain (paperwork guide and checklist, budget simulator, member map, introductions feed, groups, events, forum, AI assistant, games, PDF guides and a Spanish course).
${task}
Write in French. Use {prenom} where the member's first name should appear. Plain text only (line breaks allowed, at most 2 emojis, no markdown). Never invent features, prices or promises that are not listed.
${current ? "The current message, for inspiration (improve on it, do not copy it): " + current : ""}
Reply with ONLY a JSON array of exactly 3 objects: [{"label": "Chaleureux", "text": "..."}, {"label": "Court", "text": "..."}, {"label": "Pratique", "text": "..."}]. Each text under 900 characters.`;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1800, system, messages: [{ role: "user", content: "Propose the 3 versions." }] })
  });
  const raw = await r.text(); let resp;
  try { resp = JSON.parse(raw); } catch { return Response.json({ error: `${r.status} réponse inattendue de l'IA : ${raw.slice(0, 220)}` }, { status: 502 }); }
  if (!r.ok) return Response.json({ error: `${r.status} ${resp?.error?.message || "api error"}` }, { status: 502 });
  const text = (resp.content || []).filter(x => x.type === "text").map(x => x.text).join("\n");
  const m = text.match(/\[[\s\S]*\]/);
  let out; try { out = JSON.parse(m ? m[0] : text); } catch { return Response.json({ error: "L'IA a répondu dans un format inattendu. Réessayez." }, { status: 502 }); }
  return Response.json({ variants: (Array.isArray(out) ? out : []).filter(v => v && v.text).slice(0, 3) });
}

async function handle(req) {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const missing = ["ANTHROPIC_API_KEY", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"].filter(k => !process.env[k]);
  if (missing.length) return Response.json({ error: "Variable(s) Netlify manquante(s) : " + missing.join(", ") }, { status: 500 });
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token || !(await isAdmin(token))) return Response.json({ error: "admin only" }, { status: 403 });
  let b = {}; try { b = await req.json(); } catch {}
  const lang = { fr: "French", en: "English", es: "Spanish", de: "German", nl: "Dutch" }[b.lang] || "French";
  if (b.action === "welcome" || b.action === "broadcast") return compose(b);
  if (b.action === "search_ideas") return searchIdeas(b, lang);

  // Contenus récents (sans aucun nom de membre)
  const [sugg, comments, posts, reviews, threads, replies, arts, views, profiles] = await Promise.all([
    get(`suggestions?select=title,body,status,created_at&order=created_at.desc&limit=60`),
    get(`post_comments?select=body&created_at=gte.${since(60)}&order=created_at.desc&limit=150`),
    get(`posts?select=kind,body,city&kind=neq.article&created_at=gte.${since(60)}&order=created_at.desc&limit=80`),
    get(`reviews?select=target_type,rating,body&created_at=gte.${since(90)}&order=created_at.desc&limit=60`),
    get(`forum_threads?select=title,category&created_at=gte.${since(90)}&order=created_at.desc&limit=60`),
    get(`forum_replies?select=body&created_at=gte.${since(60)}&order=created_at.desc&limit=100`),
    get(`articles?select=title,status&order=created_at.desc&limit=80`),
    get(`page_views?select=path&created_at=gte.${since(30)}&limit=20000`),
    get(`profiles?select=city,origin_country,status,created_at&limit=5000`)
  ]);
  const count = (arr, key) => Object.entries(arr.reduce((m, x) => { const k = x[key] || "?"; m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const data = {
    members: { total: profiles.length, new_30_days: profiles.filter(p => new Date(p.created_at) > new Date(Date.now() - 30 * 86400e3)).length,
               top_cities: count(profiles, "city"), origins: count(profiles, "origin_country"), status: count(profiles, "status") },
    top_pages_30_days: count(views, "path"),
    member_suggestions: sugg.map(s => `[${s.status}] ${clip(s.title, 140)} — ${clip(s.body, 220)}`),
    feed_posts: posts.map(p => `(${p.kind}${p.city ? ", " + p.city : ""}) ${clip(p.body)}`),
    comments: comments.map(c => clip(c.body, 200)),
    reviews: reviews.map(r => `${r.rating}/5 (${r.target_type}) ${clip(r.body, 200)}`),
    forum_topics: threads.map(t => `[${t.category}] ${clip(t.title, 140)}`),
    forum_replies: replies.map(r => clip(r.body, 200)),
    existing_articles: arts.map(a => `${(a.title && (a.title.fr || a.title.en)) || "?"} (${a.status})`)
  };
  let json = JSON.stringify(data); if (json.length > 60000) json = json.slice(0, 60000);

  const system = `You are the growth and community advisor of "Hola Vecino", a website and community for people moving to or living in Spain (mostly from France, Belgium, the Netherlands, Germany and the UK).
Features: paperwork guide and checklist, budget simulator, member map, introductions feed, groups, events, forum, messaging, AI assistant and translator, weather, games, business listings with reviews, PDF guides and a Spanish course, Premium subscriptions, points and referral rewards.
You receive anonymised recent activity data. Write everything in ${lang}. Be concrete, practical and honest: base your feedback analysis only on the data provided; if there is little data, say so and suggest how to get more feedback.
Reply with ONLY a valid JSON object, no markdown, with exactly these keys:
{"summary": "2-3 sentences",
 "feedback": {"positives": ["..."], "complaints": ["..."], "requests": ["..."]},
 "article_ideas": [{"title": "...", "angle": "one sentence", "why": "one sentence"}],
 "improvements": [{"idea": "...", "impact": "high|medium|low", "effort": "small|medium|large", "why": "one sentence"}],
 "actions": [{"task": "...", "why": "one sentence"}],
 "moderation": ["comments or topics that may need attention, quoted briefly, or empty"]}
Give 5 article ideas (not duplicating existing articles, useful for expats, seasonal when relevant — today is ${new Date().toISOString().slice(0, 10)}), 5 improvements, 5 actions for this week.`;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 3000, system, messages: [{ role: "user", content: "Activity data:\n" + json }] })
  });
  const raw = await r.text(); let resp;
  try { resp = JSON.parse(raw); } catch { return Response.json({ error: `${r.status} réponse inattendue de l'IA : ${raw.slice(0, 220)}` }, { status: 502 }); }
  if (!r.ok) return Response.json({ error: `${r.status} ${resp?.error?.message || "api error"}` }, { status: 502 });
  const text = (resp.content || []).filter(x => x.type === "text").map(x => x.text).join("\n");
  const m = text.match(/\{[\s\S]*\}/);
  let out; try { out = JSON.parse(m ? m[0] : text); } catch { return Response.json({ error: "L'IA a répondu dans un format inattendu. Réessayez." }, { status: 502 }); }
  out.generated_at = new Date().toISOString();
  out.volume = { suggestions: sugg.length, comments: comments.length, posts: posts.length, reviews: reviews.length, forum: threads.length + replies.length };
  // Mémorise la dernière analyse
  await fetch(`${URL_()}/rest/v1/site_settings`, { method: "POST", headers: { ...svc(), "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ key: "insights", value: out, updated_at: out.generated_at }) });
  return Response.json(out);
}

// Transformer les recherches des visiteurs en idées d'articles et d'actions
async function searchIdeas(b, lang) {
  const data = JSON.stringify(b.searches || {}).slice(0, 12000);
  const system = `You are the content and growth advisor of "Hola Vecino", a website and community for people moving to or living in Spain (paperwork guide, budget simulator, directory of professionals, buy-sell-give section, groups, events, articles).
You receive what visitors searched for on the site: top terms, searches with NO result, rising terms, and the topics of questions asked to the AI assistant. Write in ${lang}.
Turn this into concrete opportunities: articles to write (with the main keyword people use), professionals to recruit in the directory (for searches without results), and pages or features to add. Base everything on the data; if there is little data, say so briefly.
Reply with ONLY a JSON object: {"summary":"2 sentences","article_ideas":[{"title":"...","keyword":"...","why":"..."}],"actions":[{"task":"...","why":"..."}]} with 5 article ideas and 3 to 5 actions.`;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1800, system, messages: [{ role: "user", content: "Search data:\n" + data }] })
  });
  const raw = await r.text(); let resp;
  try { resp = JSON.parse(raw); } catch { return Response.json({ error: `${r.status} réponse inattendue de l'IA : ${raw.slice(0, 220)}` }, { status: 502 }); }
  if (!r.ok) return Response.json({ error: `${r.status} ${resp?.error?.message || "api error"}` }, { status: 502 });
  const text = (resp.content || []).filter(x => x.type === "text").map(x => x.text).join("\n");
  const m = text.match(/\{[\s\S]*\}/);
  try { return Response.json(JSON.parse(m ? m[0] : text)); } catch { return Response.json({ error: "L'IA a répondu dans un format inattendu. Réessayez." }, { status: 502 }); }
}
