import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

// ====== À COMPLÉTER : identifiants de tes produits Gumroad ======
// (visibles dans le bloc « License key » de chaque produit). Laisse vide tant que ce n'est pas prêt.
const GUMROAD = {
  abo:  "OIaQJ5IUAssJHmr2mNLsKA==",   // identifiant du produit abonnement
  pass: "Af0rIUItOxgfSZS4-y6Mkg=="    // identifiant du produit pass 7 jours
};
// ================================================================

// ====== Réglages des limites ======
const LIMITE_JOUR = 20;         // demandes par jour et par code client
const LIMITE_CODE_TEST = 200;   // demandes par jour pour le code commun des testeurs (partagé)
// ===================================

const MODEL = "claude-haiku-4-5-20251001";
const LIMITS: Record<string, number> = { Tinder: 500, Hinge: 150, Bumble: 300, Happn: 300, Fruitz: 300, Meetic: 500, Grindr: 255, Romeo: 500, Autre: 300 };

// Langues : l'IA répond dans la langue choisie sur le site.
const LANGS: Record<string, { nom: string; aide: string }> = {
  fr: { nom: "français", aide: "en Belgique : Centre de Prévention du Suicide au 0800 32 123 ; en France : 3114" },
  en: { nom: "English (use informal \"you\")", aide: "Samaritans on 116 123 (UK and Ireland)" },
  es: { nom: "español (tutea)", aide: "el 024 (España)" },
  de: { nom: "Deutsch (duze die Person)", aide: "TelefonSeelsorge 0800 111 0 111 (Deutschland)" },
  nl: { nom: "Nederlands (spreek de persoon aan met je/jij)", aide: "113 of 0800-0113 (Nederland), 1813 (België)" },
  pt: { nom: "português europeu (trata a pessoa por tu)", aide: "SOS Voz Amiga 213 544 545 (Portugal), CVV 188 (Brasil)" },
  pl: { nom: "polski (zwracaj się na ty)", aide: "116 123 (Polska)" },
  ro: { nom: "română (tutuiește persoana)", aide: "0800 801 200 (România)" },
  it: { nom: "italiano (dai del tu)", aide: "Telefono Amico 02 2327 2327 (Italia)" },
  ar: { nom: "arabe standard moderne (tutoiement naturel, ton chaleureux)", aide: "le numéro d'urgence ou une ligne d'écoute de son pays" },
  zh: { nom: "chinois simplifié (ton amical, 你)", aide: "le numéro d'urgence ou une ligne d'écoute de son pays" },
  hi: { nom: "hindi (ton amical, तुम)", aide: "Tele-MANAS 14416 (Inde)" },
  ru: { nom: "russe (tutoiement, ты)", aide: "le numéro d'urgence ou une ligne d'écoute de son pays" },
  tr: { nom: "turc (tutoiement, sen)", aide: "le numéro d'urgence ou une ligne d'écoute de son pays" },
};
const langOf = (l: unknown) => (typeof l === "string" && LANGS[l] ? l : "fr");

// Règle de sécurité ajoutée à tous les outils.
const safety = (l: string) =>
  " Tu n'es pas psychologue et tu ne poses aucun diagnostic. Si la personne exprime une détresse importante, des idées noires ou l'envie de se faire du mal, " +
  "réponds avec douceur, sans coaching, et encourage-la à parler à un proche ou à contacter une ligne d'écoute (" + LANGS[l].aide +
  ", ou la ligne d'écoute de son pays), ou le 112 en cas de danger immédiat.";
const base = (l: string) =>
  "Tu es le coach de Second Regard, un service qui aide les adultes de toutes orientations à mieux vivre les rencontres en ligne : profil, messages, rendez-vous, et moments de découragement. " +
  "Tu écris TOUJOURS et UNIQUEMENT en " + LANGS[l].nom + ", quelle que soit la langue des consignes ou des données, sur un ton chaleureux et informel. Tu es bienveillant, concret et honnête, sans jugement ni clichés. Jamais de contenu sexuel explicite, jamais de manipulation ni de techniques pour forcer quelqu'un. " +
  "Tu encourages le respect du consentement et de l'autre personne." + safety(l);
const chatSystem = (l: string) => base(l) + " Réponds en 5 à 8 lignes maximum. Si la question sort du sujet des rencontres et de la confiance en soi, recentre gentiment.";

const GENERIC_FORMAT = `Réponds UNIQUEMENT en JSON valide, sans texte autour, au format :
{"alerte":false,"intro":"1 ou 2 phrases","sections":[{"titre":"...","points":["..."]}],"messages":[{"label":"...","texte":"..."}]}
"alerte" vaut true seulement si la personne semble en réelle détresse ; dans ce cas l'intro l'oriente avec douceur vers de l'aide et le reste peut être vide.
"messages" contient les textes prêts à copier (vide si aucun n'est demandé).
Les valeurs de "titre", "points", "label", "texte" et "intro" sont rédigées dans la langue demandée ; les noms des clés JSON restent tels quels.`;

const clip = (v: unknown, n: number) => String(v ?? "").slice(0, n);
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function callClaude(system: string, messages: { role: string; content: any }[], maxTokens: number) {
  const key = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("missing_key");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages }),
  });
  if (!r.ok) throw new Error("api_" + r.status + " " + (await r.text()));
  const data = await r.json();
  return (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
}
const parse = (text: string) => JSON.parse(text.replace(/```json|```/g, "").trim());

// Consignes de chaque outil. d = données du formulaire (déjà limitées en taille).
const TOOLS: Record<string, (d: Record<string, string>) => string> = {
  opener: d => `Outil : premier message à un match.
Appli : ${d.app}. Ton souhaité : ${d.ton}.
Ce que dit le profil du match : ${JSON.stringify(d.profil)}
Points communs éventuels : ${JSON.stringify(d.commun)}
Donne 1 section "Ce qui peut accrocher" (3 points tirés du profil) et 5 premiers messages courts, personnalisés, qui appellent une réponse. Pas de phrases toutes faites ni de compliments sur le physique.
${GENERIC_FORMAT}`,

  convo: d => `Outil : analyse d'une conversation.
Objectif de la personne : ${d.objectif}.
Conversation (les lignes peuvent être incomplètes) : ${JSON.stringify(d.conversation)}
Donne 3 sections : "Ce qui se passe" (lecture honnête et nuancée de la dynamique, sans prétendre lire dans les pensées), "Ce qui fonctionne", "À ajuster". Puis 3 réponses possibles adaptées à l'objectif. Si l'autre personne semble peu intéressée, dis-le avec tact et propose de ne pas insister.
${GENERIC_FORMAT}`,

  date: d => `Outil : préparer un premier rendez-vous.
Type de rendez-vous envisagé : ${d.type}.
Ce que la personne sait de son match : ${JSON.stringify(d.infos)}
Ce qui la stresse : ${JSON.stringify(d.stress)}
Donne 4 sections : "Idées de lieux ou d'organisation" (concrètes, sans nommer d'établissements précis), "Sujets de conversation" (liés aux infos), "Pour gérer le stress", "Sécurité" (lieu public, prévenir un proche, repartir par ses propres moyens). Puis 2 messages : un pour proposer le rendez-vous, un pour le confirmer la veille.
${GENERIC_FORMAT}`,

  rebond: d => `Outil : rebondir après une déception.
Situation : ${d.situation}.
Ce que la personne raconte : ${JSON.stringify(d.recit)}
Souhaite un message à envoyer : ${d.message}.
Commence par valider ce qu'elle ressent, sans minimiser. Donne 3 sections : "Ce que ça ne dit pas de toi" (recadrer sans fausses promesses), "Ce que tu peux faire maintenant" (actions concrètes et douces), "Pour la suite" (ajustements utiles si pertinent). Si un message est souhaité, propose 2 messages dignes et courts (clore poliment ou prendre des nouvelles une seule fois), sinon laisse "messages" vide.
${GENERIC_FORMAT}`,
};
const FIELDS: Record<string, Record<string, number>> = {
  opener: { app: 20, ton: 40, profil: 1500, commun: 400 },
  convo: { objectif: 80, conversation: 5000 },
  date: { type: 60, infos: 1000, stress: 500 },
  rebond: { situation: 80, recit: 1500, message: 10 },
};


// ---------- Accès : code testeurs + abonnements Gumroad ----------
// Code commun : variable Netlify ACCESS_CODE. Produits Gumroad : bloc GUMROAD en haut de ce fichier.
const PASS_DAYS = 7;
const cache = new Map<string, { until: number; res: Access }>();
type Access = { ok: boolean; error?: string; plan?: string; fin?: string };

async function verifyGumroad(productId: string, key: string) {
  const r = await fetch("https://api.gumroad.com/v2/licenses/verify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ product_id: productId, license_key: key, increment_uses_count: "false" }),
  });
  if (r.status === 404) return null;               // clé inconnue pour ce produit
  if (!r.ok) throw new Error("gumroad_" + r.status + " " + (await r.text()));
  const data = await r.json();
  return data && data.success ? data.purchase : null;
}

async function checkAccess(code: string): Promise<Access> {
  const common = Netlify.env.get("ACCESS_CODE");
  const aboId = GUMROAD.abo.trim();
  const passId = GUMROAD.pass.trim();
  if (!common && !aboId && !passId) return { ok: true, plan: "libre" };
  if (!code) return { ok: false, error: "code_required" };
  if (common && code === common) return { ok: true, plan: "test" };
  if (!/^[A-Za-z0-9]{8}(-[A-Za-z0-9]{8}){3}$/.test(code)) return { ok: false, error: "code_required" };

  const hit = cache.get(code);
  if (hit && hit.until > Date.now()) return hit.res;

  const now = Date.now();
  let res: Access = { ok: false, error: "code_required" };
  const bad = (p: any) => p.refunded || p.chargebacked || p.disputed;

  if (aboId) {
    const p = await verifyGumroad(aboId, code);
    if (p) {
      const ends = [p.subscription_ended_at, p.subscription_cancelled_at, p.subscription_failed_at]
        .filter(Boolean).map((t: string) => Date.parse(t)).filter((t: number) => !isNaN(t));
      const fin = ends.length ? Math.min(...ends) : null;
      res = bad(p) || (fin !== null && fin <= now)
        ? { ok: false, error: "code_expired" }
        : { ok: true, plan: "abonnement", fin: fin ? new Date(fin).toISOString() : undefined };
    }
  }
  if (!res.ok && res.error === "code_required" && passId) {
    const p = await verifyGumroad(passId, code);
    if (p) {
      const fin = Date.parse(p.sale_timestamp) + PASS_DAYS * 86400000;
      res = bad(p) || !(fin > now)
        ? { ok: false, error: "code_expired" }
        : { ok: true, plan: "pass", fin: new Date(fin).toISOString() };
    }
  }
  cache.set(code, { until: now + 10 * 60 * 1000, res });   // on ne redemande à Gumroad qu'une fois toutes les 10 min
  return res;
}

// ---------- Compteur quotidien et essai gratuit (Netlify Blobs) ----------
const usageStore = () => getStore({ name: "sr-usage", consistency: "strong" });
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(new Date());
async function sha(txt: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
async function usage(code: string, plan: string) {
  const limit = plan === "test" ? LIMITE_CODE_TEST : LIMITE_JOUR;
  const key = "jour/" + today() + "/" + (await sha("code:" + code));
  let used = 0;
  try { used = Number(await usageStore().get(key)) || 0; } catch (e) { console.error(e); }
  return { key, used, limit, reste: Math.max(0, limit - used) };
}
async function bump(key: string, used: number) {
  try { await usageStore().set(key, String(used + 1)); } catch (e) { console.error(e); }
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }

  // Contrôle d'accès : code commun (testeurs) ou code personnel Gumroad (abonnés).
  const code = clip(body.code, 100).trim();
  let acces: Access;
  try { acces = await checkAccess(code); }
  catch (e) { console.error(e); return json({ error: "server" }, 500); }

  // Essai gratuit : une bio offerte par visiteur sans code.
  let essaiKey = "";
  if (!acces.ok) {
    if (acces.error === "code_required" && !code && body.mode === "bio") {
      essaiKey = "essai/" + (await sha("sr-essai:" + (context.ip || "inconnu")));
      let deja = true;
      try { deja = (await usageStore().get(essaiKey)) !== null; } catch (e) { console.error(e); }
      if (deja) return json({ error: "essai_utilise" }, 401);
    } else {
      return json({ error: acces.error }, 401);
    }
  }

  // Limite quotidienne par code (pas pour l'essai ni si le site est ouvert).
  let quota: { key: string; used: number; limit: number; reste: number } | null = null;
  if (acces.ok && code && acces.plan !== "libre") {
    quota = await usage(code, acces.plan || "");
    if (body.mode === "check") return json({ ok: true, plan: acces.plan, fin: acces.fin || null, reste: quota.reste });
    if (quota.reste <= 0) return json({ error: "quota" }, 429);
  } else if (body.mode === "check") {
    return json({ ok: true, plan: acces.plan, fin: acces.fin || null });
  }
  const done = async () => {
    if (quota) await bump(quota.key, quota.used);
    if (essaiKey) { try { await usageStore().set(essaiKey, today()); } catch (e) { console.error(e); } }
    return quota ? { reste: Math.max(0, quota.reste - 1) } : essaiKey ? { essai: true } : {};
  };

  try {
    const d = body.data || {};
    const lang = langOf(body.lang);

    if (body.mode === "bio") {
      const age = parseInt(d.age, 10);
      if (!age || age < 18) return json({ error: "age" }, 400);
      const app = LIMITS[d.app] ? d.app : "Autre";
      const limit = LIMITS[app];
      const profile = {
        pseudo: clip(d.pseudo, 40), genre: clip(d.genre, 40), cherche: clip(d.cherche, 40), age, app,
        recherche: clip(d.recherche, 80), passions: clip(d.passions, 600),
        amis: clip(d.amis, 200), ton: clip(d.ton, 40), bio_actuelle: clip(d.bio_actuelle, 600),
      };
      const prompt = `Profil du client (données JSON) : ${JSON.stringify(profile)}
Contraintes :
- Adapte les bios à qui la personne est (genre) et à qui elle cherche à plaire.
- 3 bios différentes pour ${app}, chacune de ${limit} caractères maximum, au ton ${profile.ton}.
- Naturelles, concrètes, qui donnent envie d'écrire (inclure une accroche ou une question). Pas de clichés, pas de contenu sexuel explicite, pas de dénigrement.
- N'invente aucun fait absent des données.
- 4 conseils photos adaptés au profil, courts.
- 3 premiers messages à envoyer à un match, courts et personnalisables.
Réponds UNIQUEMENT en JSON valide, sans texte autour :
{"bios":[{"style":"nom court du style","texte":"..."}],"photos":["..."],"messages":["..."]}`;
      const text = await callClaude(base(lang), [{ role: "user", content: prompt + `\nLes textes (bios, conseils, messages, noms de style) sont rédigés en ${LANGS[lang].nom} ; les clés JSON restent telles quelles.` }], 1500);
      const result = parse(text);
      return json({ result, limit, ...(await done()) });
    }

    if (body.mode === "photo") {
      const img = String(d.image || "");
      const media = ["image/jpeg", "image/png", "image/webp"].includes(d.media) ? d.media : "image/jpeg";
      if (!img || img.length > 2_500_000 || !/^[A-Za-z0-9+/=]+$/.test(img)) return json({ error: "bad_request" }, 400);
      const prompt = `Outil : analyse d'une photo de profil de rencontre.
Appli : ${clip(d.app, 20)}. Place de la photo dans le profil : ${clip(d.position, 40)}.
Analyse uniquement ce que la personne peut améliorer : lumière, netteté, cadrage, expression, regard, arrière-plan, tenue, ce que la photo raconte, et si elle convient à sa place (une photo principale doit montrer le visage clairement, seul).
Ne juge JAMAIS le physique, le corps, le poids, l'âge apparent, l'origine ni la beauté de la personne. Sois bienveillant, précis et encourageant.
Si l'image ne montre aucune personne, montre une personne qui semble mineure, ou contient de la nudité ou du contenu sexuel, ne l'analyse pas : explique-le brièvement et poliment dans "intro" et laisse "sections" et "messages" vides.
Sinon, donne 3 sections : "Ce qui fonctionne", "À améliorer" (3 à 5 conseils concrets et faciles à appliquer), "Idées de photos à ajouter" (3 idées). "messages" reste vide.
${GENERIC_FORMAT}`;
      const text = await callClaude(base(lang), [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: media, data: img } },
        { type: "text", text: prompt },
      ] }], 1200);
      const result = parse(text);
      return json({ result, ...(await done()) });
    }

    if (TOOLS[body.mode]) {
      const clean: Record<string, string> = {};
      for (const [k, n] of Object.entries(FIELDS[body.mode])) clean[k] = clip(d[k], n);
      const text = await callClaude(base(lang), [{ role: "user", content: TOOLS[body.mode](clean) }], 1400);
      const result = parse(text);
      return json({ result, ...(await done()) });
    }

    if (body.mode === "chat") {
      const msgs = (Array.isArray(body.messages) ? body.messages : [])
        .slice(-10)
        .filter((m: any) => m && (m.role === "user" || m.role === "assistant"))
        .map((m: any) => ({ role: m.role, content: clip(m.content, 1500) }));
      if (!msgs.length || msgs[msgs.length - 1].role !== "user") return json({ error: "bad_request" }, 400);
      const text = await callClaude(chatSystem(lang), msgs, 700);
      return json({ text, ...(await done()) });
    }

    return json({ error: "bad_request" }, 400);
  } catch (e: any) {
    console.error(e);
    return json({ error: "server" }, 500);
  }
};

export const config: Config = { path: "/api/claude" };
