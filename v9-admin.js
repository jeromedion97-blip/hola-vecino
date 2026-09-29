// v9 : tableau de bord de statistiques et d'approbation pour les administrateurs
(window.HV_EXT = window.HV_EXT || []).push((H, ROUTES) => {
const { t, esc, $, $$, toast, date, dateTime, avatar, errMsg } = H;
const view = H.view;
ROUTES.unshift([/^#\/admin\/stats$/, () => stats(), true]);
const eur = c => new Intl.NumberFormat(H.lang, { style:"currency", currency:"EUR" }).format((c || 0) / 100);
const bars = (series, days) => {
  const map = Object.fromEntries((series || []).map(x => [x.d, x.n])), out = [];
  for (let i = days - 1; i >= 0; i--) { const d = new Date(Date.now() - i * 86400e3).toISOString().slice(0, 10); out.push([d, map[d] || 0]); }
  const max = Math.max(1, ...out.map(x => x[1]));
  return `<div class="chart">${out.map(([d, n]) => `<span class="col" title="${esc(d)} : ${n}"><span style="height:${Math.round(n / max * 100)}%"></span></span>`).join("")}</div>
    <div class="chart-axis small muted"><span>${esc(date(out[0][0]))}</span><span>${esc(date(out[out.length - 1][0]))}</span></div>`;
};

async function stats() {
  if (!H.isAdmin) { view.innerHTML = `<section class="narrow"><p class="notice">${esc(t("adm_denied"))}</p></section>`; return; }
  const sb = H.sb;
  view.innerHTML = `<section class="page wide"><a class="back" href="#/admin">${esc(t("back"))}</a><h1>📊 ${esc(t("as_title"))}</h1><div id="askpi"><p>${esc(t("loading"))}</p></div></section>`;
  const { data: s, error } = await sb.rpc("admin_stats");
  if (error || !s) { $("#askpi").innerHTML = `<p class="notice">${esc(errMsg(error))}</p>`; return; }
  const kpi = (n, k, sub) => `<div class="stat"><strong>${n}</strong><span>${esc(t(k))}</span>${sub ? `<span class="small muted">${esc(sub)}</span>` : ""}</div>`;
  $("#askpi").innerHTML = `<div class="stats">
      ${kpi(s.visits_today, "as_visits_today")}${kpi(s.visits_30d, "as_visits_30d", `${s.visitors_30d} ${t("as_visitors")}`)}
      ${kpi(s.members, "members", `+${s.members_7d} ${t("as_7d")} · +${s.members_30d} ${t("as_30d")}`)}${kpi(s.premium, "as_premium")}
      ${kpi(eur(s.revenue_30d), "as_revenue")}${kpi(s.listings_active, "as_listings", `${s.listings_draft} ${t("as_drafts")}`)}
      ${kpi(s.posts_30d, "as_posts")}${kpi(s.reviews_30d, "as_reviews")}${kpi(s.groups, "nav_groups")}${kpi(s.newsletter, "as_newsletter")}
    </div>
    <div class="admin-grid">
      <section class="card"><h2>${esc(t("as_chart_visits"))}</h2>${bars(s.visits_series, 30)}</section>
      <section class="card"><h2>${esc(t("as_chart_signups"))}</h2>${bars(s.signups_series, 30)}</section>
      <section class="card"><h2>${esc(t("as_top_pages"))}</h2><ol class="board">${(s.top_pages || []).map(p => `<li><span class="bn">${esc(p.p)}</span><strong>${p.n}</strong></li>`).join("") || `<li class="muted">—</li>`}</ol></section>
      <section class="card"><h2>🏆 ${esc(t("as_rewards"))}</h2><p class="small">${esc(t("as_rewards_d"))}</p><button class="btn primary" id="asreward">${esc(t("as_rewards_btn"))}</button><div id="asrewres" class="small"></div></section>
    </div>
    <h2>⚖️ ${esc(t("as_pro_queue"))} <span class="badge" ${s.pro_pending ? "" : "hidden"}>${s.pro_pending}</span></h2><div id="aspro"></div>
    <h2>⭐ ${esc(t("as_last_reviews"))}</h2><div id="asrev"></div>
    <h2>✉️ ${esc(t("nl_title"))}</h2><p><button class="btn small" id="ascsv">⬇ ${esc(t("as_export"))}</button></p>
    <p class="actions"><a class="btn small" href="#/admin">${esc(t("adm_title"))}</a><a class="btn small" href="#/videos">🎬 ${esc(t("nav_videos"))}</a><a class="btn small" href="#/admin/articles">✎ ${esc(t("art_admin"))}</a></p>`;

  // Récompenses du mois précédent
  $("#asreward").onclick = async () => {
    if (!confirm(t("as_rewards_confirm"))) return;
    const { data, error } = await sb.rpc("reward_monthly_top");
    $("#asrewres").innerHTML = error ? esc(errMsg(error)) : (data || []).length ? data.map(r => `${r.granted ? "✅" : "↺"} ${esc(r.name)} (${r.total})`).join("<br>") : esc(t("gm_board_empty"));
  };
  // Vérification des professionnels
  const loadPro = async () => {
    const { data } = await sb.from("profiles").select("id,display_name,avatar_url,city,pro_title,pro_number,created_at").eq("pro_status", "pending").limit(100);
    $("#aspro").innerHTML = (data || []).length ? `<ul class="admin-list">${data.map(p => `<li><div>${avatar(p, "tiny")} <a href="#/profil/${p.id}"><strong>${esc(p.display_name)}</strong></a> <span class="tag">${esc(p.pro_title || "?")}</span><p class="small">${esc(t("f_pro_number"))} : <strong>${esc(p.pro_number || "—")}</strong> · ${esc(p.city || "")}</p><p class="small muted">${esc(t("as_pro_check"))}</p></div>
      <div class="actions"><button class="btn small primary" data-pok="${p.id}">${esc(t("as_approve"))}</button><button class="btn small danger" data-pno="${p.id}">${esc(t("adm_reject"))}</button></div></li>`).join("")}</ul>` : `<p class="empty small">${esc(t("as_none"))}</p>`;
    $$("[data-pok]").forEach(b => b.onclick = async () => { const { error } = await sb.from("profiles").update({ pro_status:"verified" }).eq("id", b.dataset.pok); if (error) toast(errMsg(error)); loadPro(); });
    $$("[data-pno]").forEach(b => b.onclick = async () => { const { error } = await sb.from("profiles").update({ pro_status:"none" }).eq("id", b.dataset.pno); if (error) toast(errMsg(error)); loadPro(); });
  };
  loadPro();
  // Derniers avis (modération)
  const loadRev = async () => {
    const { data } = await sb.from("reviews").select("*").order("created_at", { ascending:false }).limit(20);
    const people = await H.profilesFor((data || []).map(r => r.author_id));
    $("#asrev").innerHTML = (data || []).length ? `<ul class="admin-list">${data.map(r => `<li><div><strong>${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</strong> ${esc((people[r.author_id] || {}).display_name || "?")} · <a href="${r.target_type === "listing" ? "#/annonce/" : "#/avis/contact/"}${r.target_id}">${esc(t(r.target_type === "listing" ? "tg_listing" : "contacts_title"))} #${r.target_id}</a><p class="small">${esc((r.body || "").slice(0, 200))}</p><p class="small muted">${esc(dateTime(r.created_at))}${(r.photos || []).length ? " · 📷 " + r.photos.length : ""}</p></div>
      <div class="actions"><button class="btn small danger" data-rdel="${r.id}">${esc(t("delete"))}</button></div></li>`).join("")}</ul>` : `<p class="empty small">${esc(t("as_none"))}</p>`;
    $$("[data-rdel]").forEach(b => b.onclick = async () => { if (!confirm(t("confirm_delete"))) return; await sb.from("reviews").delete().eq("id", b.dataset.rdel); loadRev(); });
  };
  loadRev();
  // Export de la newsletter
  $("#ascsv").onclick = async () => {
    const { data } = await sb.from("newsletter").select("*").order("created_at");
    const lines = ["email;lang;date", ...(data || []).map(x => `${x.email};${x.lang || ""};${x.created_at.slice(0, 10)}`)];
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + lines.join("\r\n")], { type:"text/csv" })); a.download = "newsletter-hola-vecino.csv"; a.click();
  };
}
// Bouton d'accès depuis l'administration
(window.HV_HOOKS = window.HV_HOOKS || {}).header = (window.HV_HOOKS.header || []).concat([() => {
  if (!H.isAdmin || !/^#\/admin$/.test(location.hash)) return;
  setTimeout(() => { const tb = $(".page .titlebar", view); if (tb && !$("#asgo", tb)) tb.insertAdjacentHTML("beforeend", `<a class="btn" id="asgo" href="#/admin/stats">📊 ${esc(t("as_title"))}</a>`); }, 300);
}]);
});
