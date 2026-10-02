// Paiements Stripe : remplace gumroad.mjs (qui peut rester en place tant que Gumroad n'est pas arrêté).
// Variables à définir sur Netlify : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
// (déjà présentes : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL).
//
// Une seule adresse, quatre usages :
//   ?buy=premium            lien d'achat (à mettre dans GUMROAD_LINKS de config-extra.js) : ouvre la page de paiement Stripe
//   ?merci=cs_…             page de remerciement : téléchargement des PDF, lien « Gérer mon abonnement »
//   ?setup=1                crée dans Stripe les produits et tarifs manquants (sans danger : ne crée jamais deux fois)
//   POST (webhook Stripe)   crédite le compte de l'acheteur dans la table credits, comme le faisait gumroad.mjs
import { createHmac, timingSafeEqual } from "node:crypto";

const SITE = "hola-vecino";
const STRIPE_VERSION = "2024-06-20"; // version de l'API Stripe demandée à chaque appel : les réponses gardent la même forme
const GRACE_DAYS = 2; // marge pour que l'accès ne coupe pas le jour du renouvellement
const GUIDES_DIR = "Guides/"; // dossier des PDF dans le stockage privé « guides » de Supabase
const ALL_GUIDES = ["guide-complet.pdf", "guide-achat.pdf", "guide-impots.pdf", "guide-autonomo.pdf", "guide-retraite.pdf"];

// Tarifs en centimes d'euro, TTC. Gardez les mêmes montants que PRICES dans config.js et config-extra.js.
// month / year : abonnement ; once : paiement unique. credit : ligne créée dans la table credits. files : PDF livrés.
const CATALOG = {
  premium: { name: "Hola Vecino Premium", credit: "premium", month: 990, year: 7900 },
  pro: { name: "Hola Vecino - Annonce professionnelle", credit: "pro", month: 1490, year: 11900 },
  pro_full: { name: "Hola Vecino - Annonce professionnelle complète", credit: "pro_full", month: 4990, year: 49900 },
  all_in: { name: "Hola Vecino Tout compris", credit: "all_in", month: 5900, year: 59000 },
  youtube: { name: "Hola Vecino - Chaîne YouTube référencée", credit: "youtube", month: 490 },
  featured: { name: "Hola Vecino - Mise en vedette", credit: "featured", month: 500 },
  rental: { name: "Hola Vecino - Location d'un bien (30 jours)", credit: "rental", once: 990, days: 30 },
  course: { name: "Hola Vecino - Parler espagnol, cours complet", once: 1290, files: ["espagnol-fr.pdf", "espagnol-en.pdf", "espagnol-de.pdf", "espagnol-nl.pdf"] },
  guide_pack: { name: "Hola Vecino - Pack des 5 guides", once: 1990, files: ALL_GUIDES },
  guide_complete: { name: "Hola Vecino - Guide complet", once: 990, files: ["guide-complet.pdf"] },
  guide_achat: { name: "Hola Vecino - Guide achat immobilier", once: 490, files: ["guide-achat.pdf"] },
  guide_impots: { name: "Hola Vecino - Les impôts la première année en Espagne", once: 490, files: ["guide-impots.pdf"] },
  guide_autonomo: { name: "Hola Vecino - Guide pour devenir autónomo", once: 490, files: ["guide-autonomo.pdf"] },
  guide_retraite: { name: "Hola Vecino - Guide retraite", once: 490, files: ["guide-retraite.pdf"] }
};
const PLANS = ["month", "year", "once"];
const productId = key => `hv_${key}`;
const lookupKey = (key, plan) => `hv_${key}` + (plan === "once" ? "" : `_${plan}`);

// ---------- Textes des deux petites pages (choix de la formule, remerciement) ----------
const TEXTS = {
  fr: { choose: "Choisissez votre formule", month: "par mois", year: "par an", thanks: "Merci pour votre achat", pending: "Paiement en attente de confirmation. Rechargez cette page dans un instant.", files: "Vos fichiers", files_note: "Les liens sont valables 1 heure. Gardez l'adresse de cette page : elle recrée les liens à chaque visite.", credit: "Votre paiement est enregistré au nom de {email}. Si c'est l'adresse de votre compte Hola Vecino, votre accès s'active à la prochaine connexion, ou avec le bouton « J'ai payé : actualiser mon accès ».", manage: "Gérer mon abonnement", back: "Retour à Hola Vecino", unknown: "Achat introuvable.", error: "Le paiement n'a pas pu être ouvert. Réessayez dans un instant.", waiver: "En payant, vous demandez l'accès immédiat à ce contenu numérique et vous renoncez à votre droit de rétractation de 14 jours." },
  en: { choose: "Choose your plan", month: "per month", year: "per year", thanks: "Thank you for your purchase", pending: "Payment awaiting confirmation. Reload this page in a moment.", files: "Your files", files_note: "Links are valid for 1 hour. Keep the address of this page: it creates new links on every visit.", credit: "Your payment is recorded under {email}. If this is the address of your Hola Vecino account, your access is activated at your next sign-in, or with the button \"I have paid: refresh my access\".", manage: "Manage my subscription", back: "Back to Hola Vecino", unknown: "Purchase not found.", error: "The payment page could not be opened. Please try again in a moment.", waiver: "By paying, you request immediate access to this digital content and waive your 14-day right of withdrawal." },
  es: { choose: "Elija su fórmula", month: "al mes", year: "al año", thanks: "Gracias por su compra", pending: "Pago pendiente de confirmación. Recargue esta página en un momento.", files: "Sus archivos", files_note: "Los enlaces son válidos durante 1 hora. Guarde la dirección de esta página: crea enlaces nuevos en cada visita.", credit: "Su pago está registrado a nombre de {email}. Si es la dirección de su cuenta Hola Vecino, su acceso se activa en la próxima conexión, o con el botón «He pagado: actualizar mi acceso».", manage: "Gestionar mi suscripción", back: "Volver a Hola Vecino", unknown: "Compra no encontrada.", error: "No se pudo abrir la página de pago. Inténtelo de nuevo en un momento.", waiver: "Al pagar, solicita el acceso inmediato a este contenido digital y renuncia a su derecho de desistimiento de 14 días." },
  de: { choose: "Wählen Sie Ihr Angebot", month: "pro Monat", year: "pro Jahr", thanks: "Vielen Dank für Ihren Kauf", pending: "Zahlung wartet auf Bestätigung. Laden Sie diese Seite gleich neu.", files: "Ihre Dateien", files_note: "Die Links sind 1 Stunde gültig. Bewahren Sie die Adresse dieser Seite auf: Sie erstellt bei jedem Besuch neue Links.", credit: "Ihre Zahlung ist unter {email} erfasst. Wenn dies die Adresse Ihres Hola-Vecino-Kontos ist, wird Ihr Zugang bei der nächsten Anmeldung aktiviert, oder mit der Schaltfläche „Ich habe bezahlt: Zugang aktualisieren“.", manage: "Mein Abonnement verwalten", back: "Zurück zu Hola Vecino", unknown: "Kauf nicht gefunden.", error: "Die Zahlungsseite konnte nicht geöffnet werden. Bitte versuchen Sie es gleich noch einmal.", waiver: "Mit der Zahlung verlangen Sie den sofortigen Zugang zu diesem digitalen Inhalt und verzichten auf Ihr 14-tägiges Widerrufsrecht." },
  nl: { choose: "Kies uw formule", month: "per maand", year: "per jaar", thanks: "Bedankt voor uw aankoop", pending: "Betaling wacht op bevestiging. Herlaad deze pagina over een ogenblik.", files: "Uw bestanden", files_note: "De links zijn 1 uur geldig. Bewaar het adres van deze pagina: bij elk bezoek worden nieuwe links aangemaakt.", credit: "Uw betaling is geregistreerd op naam van {email}. Als dit het adres van uw Hola Vecino-account is, wordt uw toegang geactiveerd bij de volgende aanmelding, of met de knop \"Ik heb betaald: mijn toegang vernieuwen\".", manage: "Mijn abonnement beheren", back: "Terug naar Hola Vecino", unknown: "Aankoop niet gevonden.", error: "De betaalpagina kon niet worden geopend. Probeer het zo meteen opnieuw.", waiver: "Door te betalen vraagt u onmiddellijke toegang tot deze digitale inhoud en ziet u af van uw herroepingsrecht van 14 dagen." }
};
const langOf = (q, req) => {
  const l = (q.get("lang") || req.headers.get("accept-language") || "fr").slice(0, 2).toLowerCase();
  return TEXTS[l] ? l : "fr";
};
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const euro = (cents, lang) => new Intl.NumberFormat(lang, { style: "currency", currency: "EUR", minimumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
const page = (lang, title, body, status = 200) => new Response(`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} · Hola Vecino</title>
<style>body{margin:0;font:16px/1.5 system-ui,sans-serif;background:#f6f3ee;color:#22303c}main{max-width:560px;margin:8vh auto;padding:28px;background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,.08)}h1{font-size:1.5rem;margin:0 0 12px}.btn{display:block;margin:10px 0;padding:14px 18px;border-radius:10px;background:#d9482b;color:#fff;text-decoration:none;font-weight:600;text-align:center}.btn.alt{background:#fff;color:#22303c;border:1px solid #c9c2b8}.muted{color:#5d6a75;font-size:.92rem}</style></head><body><main><h1>${esc(title)}</h1>${body}</main></body></html>`, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });

// ---------- Appels à Stripe et à Supabase ----------
const flat = (o, prefix = "", out = new URLSearchParams()) => {
  for (const [k, v] of Object.entries(o)) {
    if (v == null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") flat(v, key, out); else out.append(key, String(v));
  }
  return out;
};
async function stripe(path, params) {
  const key = (process.env.STRIPE_SECRET_KEY || "").trim();
  if (!key) throw new Error("Variable STRIPE_SECRET_KEY manquante sur Netlify.");
  const headers = { Authorization: `Bearer ${key}`, "Stripe-Version": STRIPE_VERSION };
  const r = await fetch(`https://api.stripe.com/v1${path}`, params
    ? { method: "POST", headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" }, body: flat(params) }
    : { headers });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error((d.error && d.error.message) || `Stripe ${r.status}`); e.code = d.error && d.error.code; throw e; }
  return d;
}
const supa = () => ({ url: (process.env.SUPABASE_URL || "").replace(/\/$/, ""), key: process.env.SUPABASE_SERVICE_ROLE_KEY || "" });

// Retrouve le tarif par sa « lookup key » ; le crée (et son produit) s'il manque ou si le montant a changé ici.
async function ensurePrice(key, plan) {
  const item = CATALOG[key], amount = item[plan], lk = lookupKey(key, plan);
  const found = await stripe(`/prices?active=true&limit=1&lookup_keys[]=${encodeURIComponent(lk)}`);
  const p = found.data && found.data[0];
  if (p && p.unit_amount === amount) return p.id;
  try { await stripe("/products", { id: productId(key), name: item.name, metadata: { site: SITE, kind: key } }); }
  catch (e) { if (e.code !== "resource_already_exists") throw e; }
  const created = await stripe("/prices", {
    product: productId(key), currency: "eur", unit_amount: amount, lookup_key: lk, transfer_lookup_key: true, tax_behavior: "inclusive",
    ...(plan === "once" ? {} : { recurring: { interval: plan } })
  });
  return created.id;
}

async function promoId(code) {
  code = String(code || "").trim();
  if (!/^[A-Za-z0-9-]{3,40}$/.test(code)) return null;
  const found = await stripe(`/promotion_codes?active=true&limit=1&code=${encodeURIComponent(code)}`).catch(() => null);
  return (found && found.data && found.data[0] && found.data[0].id) || null;
}

// ---------- ?buy= : lien d'achat ----------
async function buy(q, req, self, site) {
  const lang = langOf(q, req), T = TEXTS[lang], key = q.get("buy"), item = CATALOG[key];
  if (!item) return page(lang, T.unknown, `<a class="btn alt" href="${esc(site)}/">${esc(T.back)}</a>`, 404);
  const plans = PLANS.filter(p => item[p]);
  let plan = q.get("plan");
  if (!plans.includes(plan)) {
    if (plans.length > 1) return page(lang, T.choose, `<p>${esc(item.name)}</p>` + plans.map((p, i) =>
      `<a class="btn ${i ? "alt" : ""}" href="?buy=${encodeURIComponent(key)}&plan=${p}&lang=${lang}${q.get("code") ? "&code=" + encodeURIComponent(q.get("code")) : ""}">${esc(euro(item[p], lang))} ${esc(T[p])}</a>`).join(""));
    plan = plans[0];
  }
  const sub = plan !== "once";
  const params = {
    mode: sub ? "subscription" : "payment",
    line_items: [{ price: await ensurePrice(key, plan), quantity: 1 }],
    success_url: `${self}?merci={CHECKOUT_SESSION_ID}&lang=${lang}`,
    cancel_url: `${site}/`,
    locale: lang,
    metadata: { site: SITE, kind: key, plan },
    // Abonnement : pas de carte demandée si un code cadeau ramène le total à 0 €.
    ...(sub ? { subscription_data: { metadata: { site: SITE, kind: key } }, payment_method_collection: "if_required" }
      : { payment_intent_data: { metadata: { site: SITE, kind: key } } }),
    ...(item.files ? { custom_text: { submit: { message: T.waiver } } } : {})
  };
  // &code=… : code cadeau ou de réduction déjà appliqué (créé depuis Central). Sinon, l'acheteur peut en saisir un.
  const promo = await promoId(q.get("code"));
  if (promo) params.discounts = [{ promotion_code: promo }]; else params.allow_promotion_codes = true;
  const email = (q.get("email") || "").trim();
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) params.customer_email = email;
  const session = await stripe("/checkout/sessions", params);
  return new Response(null, { status: 303, headers: { Location: session.url, "Cache-Control": "no-store" } });
}

// ---------- ?merci= : page de remerciement et téléchargements ----------
async function signedUrl(file) {
  const { url, key } = supa();
  const r = await fetch(`${url}/storage/v1/object/sign/guides/${GUIDES_DIR}${file}`, {
    method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: 3600 })
  });
  const d = await r.json().catch(() => ({}));
  return r.ok && d.signedURL ? `${url}/storage/v1${d.signedURL}&download=${encodeURIComponent(file)}` : null;
}
async function paidSession(id) {
  if (!/^cs_[A-Za-z0-9_]+$/.test(id || "")) return null;
  const s = await stripe(`/checkout/sessions/${id}`).catch(() => null);
  return s && s.metadata && s.metadata.site === SITE ? s : null;
}
async function merci(q, req, self, site) {
  const lang = langOf(q, req), T = TEXTS[lang], back = `<a class="btn alt" href="${esc(site)}/">${esc(T.back)}</a>`;
  const s = await paidSession(q.get("merci")), item = s && CATALOG[s.metadata.kind];
  if (!item) return page(lang, T.unknown, back, 404);
  if (!["paid", "no_payment_required"].includes(s.payment_status)) return page(lang, T.thanks, `<p>${esc(T.pending)}</p>${back}`);
  let body = "";
  if (item.files) {
    const links = await Promise.all(item.files.map(async f => [f, await signedUrl(f)]));
    body += `<h2>${esc(T.files)}</h2>` + links.filter(l => l[1]).map(([f, u]) => `<a class="btn" href="${esc(u)}">${esc(f)}</a>`).join("") + `<p class="muted">${esc(T.files_note)}</p>`;
  }
  if (item.credit) body += `<p>${esc(T.credit.replace("{email}", (s.customer_details && s.customer_details.email) || ""))}</p>`;
  if (s.mode === "subscription") body += `<a class="btn alt" href="?portal=${encodeURIComponent(s.id)}">${esc(T.manage)}</a>`;
  return page(lang, T.thanks, `<p>${esc(item.name)}</p>${body}${back}`);
}

// ---------- ?portal= : « Gérer mon abonnement » (portail client Stripe) ----------
async function portal(q, req, site) {
  const lang = langOf(q, req), T = TEXTS[lang];
  const s = await paidSession(q.get("portal"));
  if (!s || !s.customer) return page(lang, T.unknown, `<a class="btn alt" href="${esc(site)}/">${esc(T.back)}</a>`, 404);
  const p = await stripe("/billing_portal/sessions", { customer: s.customer, return_url: `${site}/` });
  return new Response(null, { status: 303, headers: { Location: p.url, "Cache-Control": "no-store" } });
}

// ---------- ?setup=1 : crée dans Stripe ce qui manque ----------
async function setup() {
  const lines = [];
  for (const key of Object.keys(CATALOG)) for (const plan of PLANS) if (CATALOG[key][plan]) {
    const id = await ensurePrice(key, plan);
    lines.push(`${lookupKey(key, plan)}  ${(CATALOG[key][plan] / 100).toFixed(2)} EUR  ${id}`);
  }
  return new Response(lines.join("\n") + "\n", { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

// ---------- POST : webhook Stripe ----------
function signatureOk(raw, header) {
  const secret = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  if (!secret || !header) return false;
  const parts = header.split(",").map(x => x.trim());
  const t = (parts.find(x => x.startsWith("t=")) || "").slice(2);
  if (!t || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex"));
  return parts.filter(x => x.startsWith("v1=")).some(x => { const s = Buffer.from(x.slice(3)); return s.length === expected.length && timingSafeEqual(s, expected); });
}
async function credit(row) {
  if (!row.email) return new Response("no email");
  const { url, key } = supa();
  const r = await fetch(`${url}/rest/v1/credits?on_conflict=sale_id`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify([{ ...row, email: row.email.trim().toLowerCase() }])
  });
  if (!r.ok) return new Response("db error: " + (await r.text()), { status: 500 });
  return new Response("ok");
}
async function webhook(req) {
  const raw = await req.text();
  if (!signatureOk(raw, req.headers.get("stripe-signature"))) return new Response("forbidden", { status: 403 });
  const ev = JSON.parse(raw), o = (ev.data && ev.data.object) || {};

  // Paiement unique (location 30 jours). Les PDF n'ont pas de crédit : ils se téléchargent sur la page de remerciement.
  if (ev.type === "checkout.session.completed" || ev.type === "checkout.session.async_payment_succeeded") {
    const meta = o.metadata || {}, item = CATALOG[meta.kind];
    if (o.mode !== "payment" || meta.site !== SITE || !item || !item.credit) return new Response("ignored");
    if (!["paid", "no_payment_required"].includes(o.payment_status)) return new Response("not paid");
    return credit({ email: (o.customer_details && o.customer_details.email) || o.customer_email, kind: item.credit, days: item.days || 30, sale_id: o.id, amount_cents: o.amount_total || null });
  }

  // Abonnement : première facture et chaque renouvellement ajoutent la période suivante.
  if (ev.type === "invoice.paid") {
    const line = (o.lines && o.lines.data && o.lines.data[0]) || {};
    const meta = (o.parent && o.parent.subscription_details && o.parent.subscription_details.metadata) || (o.subscription_details && o.subscription_details.metadata) || line.metadata || {};
    const product = (line.pricing && line.pricing.price_details && line.pricing.price_details.product) || (line.price && line.price.product) || "";
    // Le compte Stripe sert aussi à d'autres sites : on ne garde que les abonnements Hola Vecino.
    if (meta.site ? meta.site !== SITE : !String(product).startsWith("hv_")) return new Response("other site");
    const item = CATALOG[meta.kind] || CATALOG[String(product).replace(/^hv_/, "")];
    if (!item || !item.credit) return new Response("unknown product");
    const span = line.period ? (line.period.end - line.period.start) / 86400 : 30;
    return credit({ email: o.customer_email, kind: item.credit, days: (span > 300 ? 365 : 30) + GRACE_DAYS, sale_id: o.id, amount_cents: o.amount_paid || null });
  }
  return new Response("ignored");
}

export default async (req) => {
  const url = new URL(req.url), q = url.searchParams;
  const site = (process.env.SITE_URL || url.origin).replace(/\/$/, ""), self = `${site}/.netlify/functions/stripe`;
  try {
    if (req.method === "POST") return await webhook(req);
    if (q.has("buy")) return await buy(q, req, self, site);
    if (q.has("merci")) return await merci(q, req, self, site);
    if (q.has("portal")) return await portal(q, req, site);
    if (q.has("setup")) return await setup();
    return new Response("ok");
  } catch (e) {
    console.error("stripe.mjs", e);
    if (req.method === "POST") return new Response("error", { status: 500 });
    const lang = langOf(q, req);
    return page(lang, TEXTS[lang].error, `<a class="btn alt" href="${esc(site)}/">${esc(TEXTS[lang].back)}</a>`, 502);
  }
};
