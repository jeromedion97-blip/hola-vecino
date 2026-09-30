// Page publique et lisible par Google de chaque article publié : /articles/<adresse>
export const config = { path: "/articles/*" };
const LANGS = ["fr", "en", "es", "de", "nl"];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g, '<a href="$2">$1</a>');
function md(text) {
  const out = []; let list = null;
  for (const line of String(text || "").split("\n")) {
    const l = line.trim();
    if (/^[-•]\s+/.test(l)) { if (!list) { list = []; } list.push(`<li>${inline(l.replace(/^[-•]\s+/, ""))}</li>`); continue; }
    if (list) { out.push(`<ul>${list.join("")}</ul>`); list = null; }
    if (!l) continue;
    if (/^##\s+/.test(l)) out.push(`<h2>${inline(l.replace(/^##\s+/, ""))}</h2>`);
    else out.push(`<p>${inline(l)}</p>`);
  }
  if (list) out.push(`<ul>${list.join("")}</ul>`);
  return out.join("\n");
}
const T = {
  fr: { cta: "Préparez votre installation avec ¡Hola Vecino!", join: "Créer mon compte gratuit", react: "Réagir et commenter", more: "À lire aussi", note: "Informations générales qui ne remplacent pas l'avis d'un avocat ou d'un gestor. Vérifiez toujours auprès des sources officielles." },
  en: { cta: "Prepare your move with ¡Hola Vecino!", join: "Create my free account", react: "React and comment", more: "Read also", note: "General information that does not replace advice from a lawyer or gestor. Always check official sources." },
  es: { cta: "Prepara tu llegada con ¡Hola Vecino!", join: "Crear mi cuenta gratis", react: "Reaccionar y comentar", more: "Leer también", note: "Información general que no sustituye el consejo de un abogado o gestor. Consulta siempre las fuentes oficiales." },
  de: { cta: "Bereite deinen Umzug mit ¡Hola Vecino! vor", join: "Kostenloses Konto erstellen", react: "Reagieren und kommentieren", more: "Weiterlesen", note: "Allgemeine Informationen, die keine Beratung durch Anwalt oder Gestor ersetzen. Prüfe immer die offiziellen Quellen." },
  nl: { cta: "Bereid je verhuizing voor met ¡Hola Vecino!", join: "Gratis account maken", react: "Reageren en commentaar geven", more: "Lees ook", note: "Algemene informatie die het advies van een advocaat of gestor niet vervangt. Controleer altijd de officiële bronnen." }
};
export default async (req) => {
  const url = new URL(req.url);
  const slug = decodeURIComponent(url.pathname.replace(/^\/articles\/?/, "").replace(/\/$/, "")).toLowerCase();
  const site = (process.env.SITE_URL || url.origin).replace(/\/$/, "");
  if (!slug || !/^[a-z0-9-]{1,90}$/.test(slug)) return Response.redirect(site + "/#/articles", 302);
  const h = { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}` };
  let a;
  try {
    const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/articles?select=id,slug,title,body,cover_url,published_at,updated_at,seo_title,seo_description&status=eq.published&slug=eq.${encodeURIComponent(slug)}&limit=1`, { headers: h });
    a = (await r.json())[0];
  } catch (e) {}
  if (!a) return new Response(`<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Article introuvable</title><p style="font-family:sans-serif;padding:40px">Cet article n'existe plus. <a href="/#/articles">Voir tous les articles</a></p>`, { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
  const langs = LANGS.filter(l => a.title && a.title[l] && a.body && a.body[l]);
  const lang = langs.includes(url.searchParams.get("lang")) ? url.searchParams.get("lang") : (langs.includes("fr") ? "fr" : langs[0] || "fr");
  const title = (a.title || {})[lang] || "", body = (a.body || {})[lang] || "", t = T[lang] || T.fr;
  const seoTitle = ((a.seo_title || {})[lang] || title).slice(0, 70);
  const plain = body.replace(/\*\*/g, "").replace(/^##\s*/gm, "").replace(/^[-•]\s*/gm, "").replace(/\s+/g, " ").trim();
  const desc = ((a.seo_description || {})[lang] || plain.slice(0, 155)).slice(0, 170);
  const canon = `${site}/articles/${a.slug}` + (lang !== "fr" ? `?lang=${lang}` : "");
  let related = [];
  try { const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/articles?select=slug,title&status=eq.published&slug=not.is.null&id=neq.${a.id}&order=published_at.desc&limit=4`, { headers: h }); related = await r.json(); } catch (e) {}
  const ld = { "@context": "https://schema.org", "@type": "Article", headline: seoTitle, description: desc, image: a.cover_url || `${site}/logo-600.png`,
    datePublished: a.published_at, dateModified: a.updated_at || a.published_at, inLanguage: lang, publisher: { "@type": "Organization", name: "¡Hola Vecino!", logo: { "@type": "ImageObject", url: `${site}/logo-600.png` } }, mainEntityOfPage: canon };
  const html = `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(seoTitle)} | ¡Hola Vecino!</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(canon)}">
${langs.map(l => `<link rel="alternate" hreflang="${l}" href="${esc(`${site}/articles/${a.slug}` + (l !== "fr" ? `?lang=${l}` : ""))}">`).join("")}
<meta property="og:type" content="article"><meta property="og:title" content="${esc(seoTitle)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(canon)}"><meta property="og:image" content="${esc(a.cover_url || site + "/logo-600.png")}">
<meta name="twitter:card" content="summary_large_image"><link rel="icon" type="image/png" href="/favicon.png">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
<style>:root{--cobalt:#1E4E8C;--red:#AA151B;--sun:#F2B705;--ink:#14213D;--muted:#56637A;--line:#D6DEEA;--bg:#F7F9FC;--card:#fff}
@media (prefers-color-scheme:dark){:root{--cobalt:#8DB8F2;--ink:#E6ECF5;--muted:#A3B0C6;--line:#2C3B57;--bg:#0F1726;--card:#18233A}}
*{box-sizing:border-box}body{margin:0;font:17px/1.7 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:var(--bg)}
.stripe{height:10px;background:linear-gradient(90deg,var(--red) 33%,var(--sun) 33% 66%,var(--red) 66%)}header,main,footer{max-width:780px;margin:0 auto;padding:0 20px}
header{display:flex;justify-content:space-between;align-items:center;padding:14px 20px;gap:12px}header img{height:44px;background:#fff;border-radius:10px;padding:3px}
.btn{display:inline-block;padding:11px 20px;border-radius:10px;background:#1E4E8C;color:#fff;text-decoration:none;font-weight:700}.btn.alt{background:transparent;color:var(--cobalt);border:2px solid var(--cobalt)}
h1{font-size:2.1rem;line-height:1.2;margin:14px 0}h2{color:var(--cobalt);margin-top:1.6em}a{color:var(--cobalt)}.cover{width:100%;aspect-ratio:1200/630;object-fit:cover;border-radius:14px}
.meta{color:var(--muted);font-size:.9rem}.langs a{margin-right:10px}.cta{margin:34px 0;padding:22px;border-radius:16px;background:var(--card);border:2px solid var(--sun)}
.note{font-size:.9rem;color:var(--muted);border-left:4px solid var(--line);padding-left:12px}.related a{display:block;margin:6px 0}
footer{padding:30px 20px;color:var(--muted);font-size:.9rem;border-top:1px solid var(--line);margin-top:40px}</style></head>
<body><div class="stripe"></div>
<header><a href="/" aria-label="¡Hola Vecino!"><img src="/logo-horizontal.png" alt="¡Hola Vecino!"></a><a class="btn" href="/#/connexion?signup">${esc(t.join)}</a></header>
<main><article>
<p class="meta">${a.published_at ? new Date(a.published_at).toLocaleDateString(lang, { day: "numeric", month: "long", year: "numeric" }) : ""}${langs.length > 1 ? ` · <span class="langs">${langs.filter(l => l !== lang).map(l => `<a href="/articles/${esc(a.slug)}${l !== "fr" ? "?lang=" + l : ""}" hreflang="${l}">${l.toUpperCase()}</a>`).join("")}</span>` : ""}</p>
<h1>${esc(title)}</h1>
${a.cover_url ? `<img class="cover" src="${esc(a.cover_url)}" alt="${esc(title)}">` : ""}
${md(body)}
<section class="cta"><h2 style="margin-top:0">${esc(t.cta)}</h2><p><a class="btn" href="/#/connexion?signup">${esc(t.join)}</a> <a class="btn alt" href="/#/articles/${a.id}">💬 ${esc(t.react)}</a></p></section>
<p class="note">${esc(t.note)}</p>
${related.length ? `<section class="related"><h2>${esc(t.more)}</h2>${related.map(r => `<a href="/articles/${esc(r.slug)}">${esc((r.title || {}).fr || (r.title || {}).en || r.slug)} →</a>`).join("")}</section>` : ""}
</article></main>
<footer>© ¡Hola Vecino! · <a href="/">Accueil</a> · <a href="/#/mentions-legales">Mentions légales</a> · <a href="/#/confidentialite">Confidentialité</a></footer>
</body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } });
};
