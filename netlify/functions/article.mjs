// Hola Vecino — fonction "article"
// Génère un brouillon d'article et le traduit (FR, EN, ES, DE, NL) avec Claude.
// Emplacement : netlify/functions/article.mjs
// Utilise la variable d'environnement ANTHROPIC_API_KEY déjà configurée sur Netlify.

const MODEL = "claude-haiku-4-5-20251001"; // modèle rapide pour rester sous la limite de temps de Netlify
const LANGS = {
  fr: "français",
  en: "anglais",
  es: "espagnol",
  de: "allemand",
  nl: "néerlandais",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

async function askClaude(system, prompt, maxTokens) {
  const apiKey = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("Clé ANTHROPIC_API_KEY absente sur Netlify");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `Erreur Anthropic ${res.status}`;
    console.error("Anthropic:", res.status, msg);
    throw new Error(msg);
  }
  return (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

function parseJson(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  return JSON.parse(clean.slice(start, end + 1));
}

function packArticle(a) {
  const title = a.title || "";
  const excerpt = a.excerpt || "";
  const content = a.content || "";
  // Plusieurs noms de champs pour être compatible avec la page d'administration
  return { title, titre: title, excerpt, summary: excerpt, content, body: content, text: content, contenu: content };
}

async function generateDraft(subject) {
  const now = new Date();
  const month = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const system =
    "Tu rédiges des articles pour ¡Hola Vecino!, un site d'aide aux expatriés francophones, belges, néerlandais, allemands et britanniques installés en Espagne. " +
    "Ton chaleureux, clair et concret. N'invente jamais de dates, lieux ou chiffres précis dont tu n'es pas sûr : " +
    "dans ce cas, reste général et conseille de vérifier auprès de la mairie (ayuntamiento) ou de l'office de tourisme. " +
    "Réponds uniquement avec un objet JSON valide, sans texte autour ni balises Markdown.";

  const prompt =
    `Nous sommes en ${month}. Rédige en français un article sur le sujet suivant : « ${subject} ».\n` +
    "Environ 500 à 700 mots, avec une courte introduction, des intertitres sur leur propre ligne, des paragraphes séparés par une ligne vide, et une conclusion pratique.\n" +
    'Format de réponse : {"title": "...", "excerpt": "résumé de 1 à 2 phrases", "content": "texte complet"}';

  const text = await askClaude(system, prompt, 1800);
  return packArticle(parseJson(text));
}

async function translateOne(article, code) {
  const system =
    `Tu es traducteur professionnel. Traduis fidèlement vers le ${LANGS[code]}, en gardant la mise en forme (intertitres, paragraphes). ` +
    "Réponds uniquement avec un objet JSON valide, sans texte autour ni balises Markdown.";
  const prompt =
    "Traduis cet article.\n" +
    JSON.stringify({ title: article.title, excerpt: article.excerpt, content: article.content }) +
    '\nFormat de réponse : {"title": "...", "excerpt": "...", "content": "..."}';

  const text = await askClaude(system, prompt, 2500);
  return packArticle(parseJson(text));
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  let body = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Requête invalide" }, 400);
  }

  const action = String(body.action || body.mode || body.type || "").toLowerCase();
  const source = body.article || body;
  const title = source.title || source.titre || "";
  const content = source.content || source.body || source.text || source.contenu || "";
  const isTranslate =
    action.includes("trad") || action.includes("transl") || (!!content && !body.subject && !body.sujet && !body.topic);

  try {
    if (isTranslate) {
      if (!content) return json({ error: "Aucun texte à traduire" }, 400);
      const from = String(body.from || body.source_lang || body.lang || "fr").slice(0, 2).toLowerCase();
      let targets = body.languages || body.langs || body.targets || Object.keys(LANGS);
      targets = targets.map((l) => String(l).slice(0, 2).toLowerCase()).filter((l) => LANGS[l] && l !== from);

      const article = { title, excerpt: source.excerpt || source.summary || "", content };
      const results = await Promise.all(targets.map((code) => translateOne(article, code)));

      const translations = {};
      targets.forEach((code, i) => (translations[code] = results[i]));
      return json({ ok: true, translations, ...translations });
    }

    const subject = String(body.subject || body.sujet || body.topic || body.prompt || title || "").trim();
    if (!subject) return json({ error: "Sujet manquant" }, 400);

    const draft = await generateDraft(subject);
    return json({ ok: true, ...draft, article: draft });
  } catch (err) {
    return json({ error: err.message || "Erreur inconnue" }, 500);
  }
};
