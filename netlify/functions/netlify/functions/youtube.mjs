// Dernières vidéos de la chaîne YouTube (flux public, sans clé API)
const decode = s => String(s || "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

export default async (req) => {
  const id = new URL(req.url).searchParams.get("channel") || "";
  if (!/^UC[\w-]{22}$/.test(id)) return Response.json({ videos: [] });
  try {
    const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`);
    if (!r.ok) return Response.json({ videos: [] });
    const xml = await r.text();
    const videos = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, 12).map(m => {
      const e = m[1];
      return {
        id: (e.match(/<yt:videoId>([^<]+)/) || [])[1],
        title: decode((e.match(/<title>([^<]*)/) || [])[1]),
        published: (e.match(/<published>([^<]+)/) || [])[1]
      };
    }).filter(v => v.id);
    return new Response(JSON.stringify({ videos }), { headers: { "content-type": "application/json", "cache-control": "public, max-age=3600" } });
  } catch (e) {
    return Response.json({ videos: [] });
  }
};
