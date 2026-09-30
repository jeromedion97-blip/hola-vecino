// Plan des articles pour Google, mis à jour automatiquement : /sitemap-articles.xml
export const config = { path: "/sitemap-articles.xml" };
export default async (req) => {
  const site = (process.env.SITE_URL || new URL(req.url).origin).replace(/\/$/, "");
  let rows = [];
  try {
    const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/articles?select=slug,updated_at,published_at&status=eq.published&slug=not.is.null&order=published_at.desc&limit=1000`,
      { headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}` } });
    rows = await r.json();
  } catch (e) {}
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    (Array.isArray(rows) ? rows : []).map(a => `  <url><loc>${site}/articles/${a.slug}</loc><lastmod>${String(a.updated_at || a.published_at || "").slice(0, 10)}</lastmod></url>`).join("\n") + `\n</urlset>\n`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
};
