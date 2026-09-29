// Reçoit les notifications de vente de Gumroad (« Ping ») et crédite le compte de l'acheteur.
// Variables à définir sur Netlify : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GUMROAD_PING_SECRET
// (facultatif) GUMROAD_SELLER_ID, GUMROAD_ALLOW_TEST=true pour accepter les achats de test.
//
// Chaque produit Gumroad doit avoir exactement ce lien personnalisé (permalink) :
const PRODUCTS = {
  "hv-premium":  { kind: "premium",  monthly: 30, yearly: 365 },   // 9,90 €/mois ou 79 €/an
  "hv-pro":      { kind: "pro",      monthly: 30, yearly: 365 },   // formule simple : 14,90 €/mois ou 119 €/an
  "hv-pro-complet": { kind: "pro_full", monthly: 30, yearly: 365 }, // formule complète : 49,90 €/mois ou 499 €/an
  "hv-tout-compris": { kind: "all_in", monthly: 30, yearly: 365 },  // membres « Tout compris » : 59 €/mois ou 590 €/an
  "hv-youtube":  { kind: "youtube",  monthly: 30, yearly: 365 },   // 4,90 €/mois
  "hv-location": { kind: "rental",   once: 30 },                   // 9,90 € pour 30 jours
  "hv-vedette":  { kind: "featured", monthly: 30, yearly: 365 }    // + 5 €/mois
};
const GRACE_DAYS = 2; // marge pour que l'accès ne coupe pas le jour du renouvellement

export default async (req) => {
  if (req.method !== "POST") return new Response("ok");
  const url = new URL(req.url);
  if (!process.env.GUMROAD_PING_SECRET || url.searchParams.get("secret") !== process.env.GUMROAD_PING_SECRET)
    return new Response("forbidden", { status: 403 });

  const f = new URLSearchParams(await req.text());
  if (process.env.GUMROAD_SELLER_ID && f.get("seller_id") !== process.env.GUMROAD_SELLER_ID) return new Response("forbidden", { status: 403 });
  if (f.get("refunded") === "true") return new Response("refund ignored");
  if (f.get("test") === "true" && process.env.GUMROAD_ALLOW_TEST !== "true") return new Response("test ignored");

  const permalink = (f.get("permalink") || f.get("short_product_id") || "").toLowerCase();
  // Si le lien personnalisé n'a pas été réglé, on reconnaît le produit par son nom
  const name = (f.get("product_name") || "").toLowerCase();
  const byName = name.includes("tout compris") ? "hv-tout-compris" : name.includes("premium") ? "hv-premium" : name.includes("vedette") ? "hv-vedette"
    : (name.includes("complète") || name.includes("complete")) ? "hv-pro-complet"
    : name.includes("youtube") ? "hv-youtube" : name.includes("location") ? "hv-location"
    : name.includes("professionnel") ? "hv-pro" : "";
  const p = PRODUCTS[permalink] || PRODUCTS[byName];
  const email = (f.get("email") || "").trim().toLowerCase();
  if (!p || !email) return new Response("unknown product", { status: 200 });

  const rec = (f.get("recurrence") || "").toLowerCase();
  const base = p.once || (rec === "yearly" ? p.yearly : p.monthly) || 30;
  const days = base + (p.once ? 0 : GRACE_DAYS);
  const qty = Math.max(1, parseInt(f.get("quantity") || "1", 10));

  const rows = Array.from({ length: qty }, (_, i) => ({
    email, kind: p.kind, days,
    sale_id: (f.get("sale_id") || crypto.randomUUID()) + (qty > 1 ? "-" + i : ""),
    amount_cents: parseInt(f.get("price") || "0", 10) || null
  }));
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/credits?on_conflict=sale_id`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates,return=minimal"
    },
    body: JSON.stringify(rows)
  });
  if (!r.ok) return new Response("db error: " + (await r.text()), { status: 500 });
  return new Response("ok");
};
