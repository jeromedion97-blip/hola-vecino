// Liens sécurisés et temporaires : documents d'un client (pour son avocat ou gestor autorisé)
// et guides PDF offerts aux abonnés Premium annuels.
// Variables Netlify : SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
const GUIDES = ["guide-complet.pdf", "guide-achat.pdf", "guide-impots.pdf", "guide-autonomo.pdf", "guide-retraite.pdf",
  "espagnol-fr.pdf", "espagnol-en.pdf", "espagnol-de.pdf", "espagnol-nl.pdf"];
const URL_ = () => process.env.SUPABASE_URL;
const svc = { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` };
const get = async path => { const r = await fetch(`${URL_()}/rest/v1/${path}`, { headers: svc }); return r.ok ? r.json() : []; };
async function sign(bucket, path) {
  const r = await fetch(`${URL_()}/storage/v1/object/sign/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST", headers: { ...svc, "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: 120 })
  });
  const d = await r.json().catch(() => ({}));
  return d.signedURL ? `${URL_()}/storage/v1${d.signedURL}` : null;
}

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const ur = token ? await fetch(`${URL_()}/auth/v1/user`, { headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } }) : null;
  const user = ur && ur.ok ? await ur.json() : null;
  if (!user || !user.id) return Response.json({ error: "login" }, { status: 401 });
  let b; try { b = await req.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }

  if (b.action === "client_doc") {
    const doc = (await get(`documents?select=id,owner_id,path&id=eq.${parseInt(b.doc_id, 10)}`))[0];
    if (!doc) return Response.json({ error: "not found" }, { status: 404 });
    const acc = (await get(`client_access?select=scopes,status&client_id=eq.${doc.owner_id}&pro_id=eq.${user.id}`))[0];
    if (!acc || acc.status !== "active" || !(acc.scopes || []).includes("drive")) return Response.json({ error: "forbidden" }, { status: 403 });
    const url = await sign("documents", doc.path);
    await fetch(`${URL_()}/rest/v1/access_log`, { method: "POST", headers: { ...svc, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ client_id: doc.owner_id, pro_id: user.id, action: "doc:" + doc.id }) });
    return url ? Response.json({ url }) : Response.json({ error: "sign" }, { status: 500 });
  }
  if (b.action === "guide") {
    if (!GUIDES.includes(b.file)) return Response.json({ error: "not found" }, { status: 404 });
    const p = (await get(`profiles?select=premium_until,premium_plan&id=eq.${user.id}`))[0] || {};
    const admin = (await get(`admins?select=user_id&user_id=eq.${user.id}`)).length > 0;
    const ok = admin || (["year", "all_in"].includes(p.premium_plan) && p.premium_until && new Date(p.premium_until) > new Date());
    if (!ok) return Response.json({ error: "forbidden" }, { status: 403 });
    const url = await sign("guides", b.file);
    return url ? Response.json({ url }) : Response.json({ error: "missing file" }, { status: 404 });
  }
  return Response.json({ error: "bad action" }, { status: 400 });
};
