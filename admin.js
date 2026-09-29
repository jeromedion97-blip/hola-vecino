// Espace administrateur : signalements, contacts à valider, membres (badge vérifié)
(window.HV_EXT = window.HV_EXT || []).push((H, ROUTES) => {
const { t, esc, nl2br, $, $$, field, select, checks, toast, langName, dateTime, avatar, badges, errMsg } = H;
H.date = H.date || (d => new Date(d).toLocaleDateString());
const view = H.view;
ROUTES.unshift([/^#\/admin$/, () => admin(), true]);

const TABLE = { profile:"profiles", forum_thread:"forum_threads", forum_reply:"forum_replies", event:"events", listing:"listings", post:"posts" };
async function linkFor(r) {
  if (r.target_type === "profile") return "#/profil/" + r.target_id;
  if (r.target_type === "forum_thread") return "#/forum/" + r.target_id;
  if (r.target_type === "event") return "#/evenements/" + r.target_id;
  if (r.target_type === "listing") return "#/bons-plans";
  if (r.target_type === "post") return "#/voisins/" + r.target_id;
  if (r.target_type === "forum_reply") { const { data } = await H.sb.from("forum_replies").select("thread_id").eq("id", r.target_id).maybeSingle(); return data ? "#/forum/" + data.thread_id : ""; }
  return "";
}

async function admin() {
  if (!H.isAdmin) { view.innerHTML = `<section class="narrow"><p class="notice">${esc(t("adm_denied"))}</p></section>`; return; }
  const sb = H.sb;
  view.innerHTML = `<section class="page wide"><div class="titlebar"><h1>${esc(t("adm_title"))}</h1><span class="actions"><a class="btn primary" href="#/admin/stats">📊 ${esc(t("as_title"))}</a><a class="btn" href="#/admin/articles">✎ ${esc(t("art_admin"))}</a></span></div>
    <div id="stats" class="stats"></div>
    <h2>${esc(t("adm_reports"))}</h2><div id="reports"><p>${esc(t("loading"))}</p></div>
    <h2>${esc(t("adm_listings"))}</h2><div id="alist"></div>
    <h2>${esc(t("adm_credits"))}</h2><div id="acredits"></div>
    <h2>${esc(t("adm_pending"))}</h2><div id="pending"></div>
    <h2>${esc(t("adm_add_contact"))}</h2><div id="addc"></div>
    <h2>${esc(t("adm_members"))}</h2>${field(t("adm_search"), `<input id="msearch" type="search">`, "msearch")}<ul id="mres" class="iresults"></ul>
  </section>`;

  // Chiffres
  const count = tb => sb.from(tb).select("*", { count:"exact", head:true }).then(r => r.count || 0);
  const [m, th, ev, ct] = await Promise.all([count("profiles"), count("forum_threads"), count("events"), count("contacts")]);
  $("#stats").innerHTML = [[t("members"), m], [t("forum_title"), th], [t("ev_title"), ev], [t("contacts_title"), ct]]
    .map(([k, n]) => `<div class="stat"><strong>${n}</strong><span>${esc(k)}</span></div>`).join("");

  // Signalements
  const loadReports = async () => {
    const { data } = await sb.from("reports").select("*").order("created_at", { ascending:false }).limit(200);
    const rows = data || [];
    const people = await H.profilesFor(rows.map(r => r.reporter_id));
    const links = await Promise.all(rows.map(linkFor));
    $("#reports").innerHTML = rows.length ? `<ul class="admin-list">${rows.map((r, i) => `<li>
      <div><strong>${esc(t("tg_" + r.target_type))}</strong> <span class="muted small">${esc(dateTime(r.created_at))} · ${esc(t("adm_by"))} ${esc((people[r.reporter_id] || {}).display_name || "?")}</span>
      ${r.reason ? `<p><span class="muted">${esc(t("adm_reason"))} :</span> ${nl2br(r.reason)}</p>` : ""}</div>
      <div class="actions">${links[i] ? `<a class="btn small" href="${links[i]}">${esc(t("adm_open"))}</a>` : ""}
        <button class="btn small danger" data-del="${r.id}">${esc(t("adm_delete"))}</button>
        <button class="linkbtn" data-dis="${r.id}">${esc(t("adm_dismiss"))}</button></div></li>`).join("")}</ul>` : `<p class="empty">${esc(t("adm_no_reports"))}</p>`;
    $$("[data-dis]").forEach(b => b.onclick = async () => { await sb.from("reports").delete().eq("id", b.dataset.dis); loadReports(); });
    $$("[data-del]").forEach(b => b.onclick = async () => {
      const r = rows.find(x => String(x.id) === b.dataset.del);
      if (!confirm(t("confirm_delete"))) return;
      const { error } = await sb.from(TABLE[r.target_type]).delete().eq("id", r.target_id);
      if (error) return toast(errMsg(error));
      await sb.from("reports").delete().eq("target_type", r.target_type).eq("target_id", r.target_id);
      loadReports();
    });
  };
  loadReports();

  // Annonces : refuser, remettre en ligne, publier 30 jours sans paiement (partenaires)
  const loadListings = async () => {
    const { data } = await sb.from("listings").select("*").order("created_at", { ascending:false }).limit(200);
    const rows = data || [], now = new Date();
    const people = await H.profilesFor(rows.map(l => l.owner_id));
    $("#alist").innerHTML = rows.length ? `<ul class="admin-list">${rows.map(l => { const active = l.status === "active" && l.active_until && new Date(l.active_until) > now;
      return `<li><div><strong>${esc(l.title)}</strong> <span class="tag">${esc(t("kind_" + l.kind))}</span> <span class="muted small">${esc((people[l.owner_id] || {}).display_name || "?")}</span>
      <p class="small ${active ? "ok" : "muted"}">${esc(l.status === "rejected" ? t("ls_rejected") : active ? t("ls_active") + " " + H.date(l.active_until) : t("ls_draft"))}${l.licence_number ? " · " + esc(l.licence_number) : ""}</p></div>
      <div class="actions"><button class="btn small" data-pub="${l.id}">${esc(t("adm_publish30"))}</button>${l.status !== "rejected" ? `<button class="btn small danger" data-rej="${l.id}">${esc(t("adm_reject"))}</button>` : ""}</div></li>`; }).join("")}</ul>`
      : `<p class="empty">${esc(t("adm_no_listings"))}</p>`;
    $$("[data-pub]").forEach(b => b.onclick = async () => {
      const l = rows.find(x => String(x.id) === b.dataset.pub), base = l.active_until && new Date(l.active_until) > now ? new Date(l.active_until) : now;
      const { error } = await sb.from("listings").update({ status:"active", active_until: new Date(base.getTime() + 30 * 86400e3).toISOString() }).eq("id", l.id);
      if (error) toast(errMsg(error)); loadListings();
    });
    $$("[data-rej]").forEach(b => b.onclick = async () => { if (!confirm(t("confirm_delete"))) return; const { error } = await sb.from("listings").update({ status:"rejected" }).eq("id", b.dataset.rej); if (error) toast(errMsg(error)); loadListings(); });
  };
  loadListings();

  // Derniers achats Gumroad
  const { data: cr } = await sb.from("credits").select("*").order("created_at", { ascending:false }).limit(50);
  $("#acredits").innerHTML = (cr || []).length ? `<div class="table-wrap"><table><tbody>${cr.map(c => `<tr><td>${esc(H.date(c.created_at))}</td><td>${esc(c.email)}</td><td>${esc(t("ck_" + c.kind))}</td><td>${c.days} ${esc(t("days"))}</td><td>${c.amount_cents ? (c.amount_cents / 100).toFixed(2) + " €" : ""}</td><td class="${c.used_at ? "muted" : "ok"}">${c.used_at ? "✓" : "•"}</td></tr>`).join("")}</tbody></table></div>`
    : `<p class="empty">${esc(t("adm_no_credits"))}</p>`;

  // Contacts en attente
  const loadPending = async () => {
    const { data } = await sb.from("contacts").select("*").eq("approved", false).order("created_at");
    const rows = data || [];
    $("#pending").innerHTML = rows.length ? `<ul class="admin-list">${rows.map(c => `<li>
      <div><strong>${esc(c.name)}</strong> <span class="muted small">${esc(t("ct_" + c.category))}${c.city ? " · " + esc(c.city) : ""}</span>
      <p class="small">${[c.phone, c.email, c.website, c.address].filter(Boolean).map(esc).join(" · ")}</p>
      ${(c.languages || []).length ? `<p class="small">${esc(t("speaks"))} : ${(c.languages || []).map(l => esc(langName(l))).join(", ")}</p>` : ""}
      ${c.description ? `<p class="small">${nl2br(c.description)}</p>` : ""}</div>
      <div class="actions"><button class="btn small primary" data-ok="${c.id}">${esc(t("adm_approve"))}</button><button class="btn small danger" data-no="${c.id}">${esc(t("delete"))}</button></div></li>`).join("")}</ul>`
      : `<p class="empty">${esc(t("adm_no_pending"))}</p>`;
    $$("[data-ok]").forEach(b => b.onclick = async () => { const { error } = await sb.from("contacts").update({ approved:true }).eq("id", b.dataset.ok); if (error) toast(errMsg(error)); loadPending(); });
    $$("[data-no]").forEach(b => b.onclick = async () => { if (!confirm(t("confirm_delete"))) return; await sb.from("contacts").delete().eq("id", b.dataset.no); loadPending(); });
  };
  loadPending();

  // Ajouter un contact vérifié
  $("#addc").innerHTML = `<form id="acf" class="stack card"><div class="grid">
      ${field(t("c_name") + " *", `<input id="aname" name="name" required maxlength="120">`, "aname")}
      ${field(t("category") + " *", select("acat", "contact", ""), "acat").replace("<select ", '<select required name="category" ')}
      ${field(t("filter_city"), `<input id="acity" name="city" maxlength="80">`, "acity")}
      ${field(t("c_phone"), `<input id="aphone" name="phone" maxlength="40">`, "aphone")}
      ${field(t("c_email"), `<input id="aemail" name="email" type="email" maxlength="120">`, "aemail")}
      ${field(t("c_website"), `<input id="aweb" name="website" maxlength="200">`, "aweb")}
      ${field(t("c_address"), `<input id="aaddr" name="address" maxlength="200">`, "aaddr")}
    </div>
    <div class="field"><span class="label">${esc(t("c_langs"))}</span>${checks("languages", H.SPOKEN.map(c => [c, langName(c)]))}</div>
    ${field(t("c_desc"), `<textarea id="adesc" name="description" rows="2" maxlength="1000"></textarea>`, "adesc")}
    <div class="actions"><button class="btn primary">${esc(t("adm_approve"))}</button></div></form>`;
  $("#acf").onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target), v = k => (f.get(k) || "").toString().trim() || null;
    const { error } = await sb.from("contacts").insert({ name: v("name"), category: v("category"), city: v("city"), phone: v("phone"), email: v("email"), website: v("website"), address: v("address"), description: v("description"), languages: f.getAll("languages"), approved: true, submitted_by: H.me.id });
    if (error) return toast(errMsg(error));
    e.target.reset(); toast(t("saved"));
  };

  // Membres : vérification et suppression
  let timer;
  $("#msearch").oninput = () => { clearTimeout(timer); timer = setTimeout(async () => {
    const term = $("#msearch").value.trim().replace(/[%_,()]/g, "");
    if (term.length < 2) { $("#mres").innerHTML = ""; return; }
    const { data } = await sb.from("profiles").select("id,display_name,avatar_url,city,verified,is_guide").ilike("display_name", `%${term}%`).limit(20);
    $("#mres").innerHTML = (data || []).map(p => `<li>${avatar(p, "tiny")} <span><a href="#/profil/${p.id}">${esc(p.display_name)}</a> ${badges(p)} <span class="muted small">${esc(p.city || "")}</span></span>
      <button class="btn small" data-ver="${p.id}" data-v="${p.verified ? 1 : 0}">${esc(t(p.verified ? "adm_unverify" : "adm_verify"))}</button>
      <button class="btn small" data-prem="${p.id}">${esc(t("adm_grant"))}</button>
      <button class="linkbtn" data-delp="${p.id}">${esc(t("adm_delete_profile"))}</button></li>`).join("");
    $$("[data-prem]").forEach(b => b.onclick = async () => {
      const { data: pr } = await sb.from("profiles").select("premium_until").eq("id", b.dataset.prem).single();
      const base = pr && pr.premium_until && new Date(pr.premium_until) > new Date() ? new Date(pr.premium_until) : new Date();
      const { error } = await sb.from("profiles").update({ premium_until: new Date(base.getTime() + 30 * 86400e3).toISOString() }).eq("id", b.dataset.prem);
      toast(error ? errMsg(error) : t("saved"));
    });
    $$("[data-ver]").forEach(b => b.onclick = async () => {
      const { error } = await sb.from("profiles").update({ verified: b.dataset.v !== "1" }).eq("id", b.dataset.ver);
      if (error) return toast(errMsg(error)); $("#msearch").dispatchEvent(new Event("input"));
    });
    $$("[data-delp]").forEach(b => b.onclick = async () => {
      if (!confirm(t("confirm_delete"))) return;
      const { error } = await sb.from("profiles").delete().eq("id", b.dataset.delp);
      if (error) return toast(errMsg(error)); $("#msearch").dispatchEvent(new Event("input"));
    });
  }, 250); };
}
});
