// Analyse IA du budget (Premium). Variables Netlify : ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY
const LANGS = { fr: "French", en: "English", es: "Spanish", de: "German", nl: "Dutch" };

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return Response.json({ error: "ANTHROPIC_API_KEY missing" }, { status: 500 });

  // Réservé aux membres Premium : vérifie le compte connecté auprès de Supabase
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "premium required" }, { status: 401 });
  try {
    const chk = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/is_premium`, {
      method: "POST",
      headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: "{}"
    });
    if (!chk.ok || (await chk.json()) !== true) return Response.json({ error: "premium required" }, { status: 403 });
  } catch (e) { return Response.json({ error: "check failed" }, { status: 502 }); }

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const language = LANGS[body.lang] || "English";
  const summary = String(body.summary || "").slice(0, 4000);
  if (!summary) return Response.json({ error: "empty" }, { status: 400 });

  const system = `You help people who are moving to Spain understand their budget. You receive a monthly budget estimate.
Answer in ${language}, in plain text (no markdown tables), under 300 words:
1) a short verdict on how realistic the budget is for that Spanish city,
2) the 2-3 items most likely underestimated or worth checking (e.g. deposits, community fees, IBI tax, private health insurance, summer electricity/AC, car costs, purchase taxes ITP/IVA),
3) 2-3 concrete ideas to improve the balance.
Be factual and cautious: figures are indicative, say so once, and recommend a gestoría or lawyer for tax/legal questions. Never invent precise legal thresholds you are not sure of.`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 900,
        system,
        messages: [{ role: "user", content: summary }]
      })
    });
    const data = await r.json();
    if (!r.ok) return Response.json({ error: data?.error?.message || "api error" }, { status: 502 });
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
    return Response.json({ text });
  } catch (e) {
    return Response.json({ error: "network" }, { status: 502 });
  }
};
