// Premium, annonces payantes (bons plans, YouTube, locations), suggestions et contact
(window.HV_EXT = window.HV_EXT || []).push((H, ROUTES) => {
const { t, esc, nl2br, $, $$, field, select, checks, toast, langName, date, errMsg } = H;
const view = H.view, C = H.C;
const KINDS = ["restaurant","hotel","service","rental"];
const TOPICS = ["admin","housing","work","health","family","taxes","social","general"];
const creditKind = (k, plan) => ["restaurant","hotel","service"].includes(k) ? (plan === "full" ? "pro_full" : "pro") : k;

ROUTES.unshift(
  [/^#\/premium$/, () => premium()],
  [/^#\/bons-plans(?:\/(\w+))?$/, m => deals(m[1] || "")],
  [/^#\/youtube$/, () => youtube()],
  [/^#\/contact$/, () => contact()],
  [/^#\/mes-annonces$/, () => myListings(), true],
  [/^#\/annonces\/nouvelle$/, () => listingForm(null), true],
  [/^#\/annonces\/(\d+)$/, m => listingForm(+m[1]), true],
  [/^#\/suggestions$/, () => suggestions(), true]
);

const price = n => new Intl.NumberFormat(H.lang, { style:"currency", currency:"EUR", minimumFractionDigits: n % 1 ? 2 : 0 }).format(n);
const buyUrl = kind => {
  const exact = ((C.GUMROAD_LINKS || {})[kind] || "").trim();
  const base = /^https:\/\//.test(exact) ? exact : C.GUMROAD_STORE + ((C.GUMROAD_PRODUCTS || {})[kind] || (kind === "pro_full" ? "hv-pro-complet" : kind));
  return base + (base.includes("?") ? "&" : "?") + "wanted=true";
};
const buyBtn = (kind, label, primary) => `<a class="btn ${primary ? "primary" : ""}" href="${esc(buyUrl(kind))}" target="_blank" rel="noopener">${esc(label)}</a>`;
const safeUrl = u => /^https?:\/\//i.test(u || "") ? u : (u ? "https://" + u : "");
const mapErr = e => { const m = (e && e.message) || ""; if (m.includes("NO_CREDIT")) return t("no_credit"); if (m.includes("OFFER_FULL")) return t("launch_full"); if (m.includes("ALREADY_CLAIMED")) return t("launch_already"); if (m.includes("LICENCE_REQUIRED")) return t("licence_required"); return errMsg(e); };
const PRICE_ROWS = () => [
  [t("ck_premium"), `${price(C.PRICES.premium_month)}${t("per_month")} · ${price(C.PRICES.premium_year)}${t("per_year")}`],
  [t("ck_pro"), `${price(C.PRICES.pro_month)}${t("per_month")} · ${price(C.PRICES.pro_year)}${t("per_year")}`],
  [t("ck_pro_full"), `${price(C.PRICES.pro_full_month || 49.9)}${t("per_month")} · ${price(C.PRICES.pro_full_year || 499)}${t("per_year")}`],
  [t("ck_youtube"), `${price(C.PRICES.youtube_month)}${t("per_month")}`],
  [t("ck_rental"), `${price(C.PRICES.rental_30)} ${t("pr_rental")}`],
  [t("ck_featured"), `+ ${price(C.PRICES.featured_month)} ${t("pr_featured")}`]
];

// ---------- Premium ----------
async function premium() {
  const me = H.me, p = H.myProfile;
  const until = p && p.premium_until && new Date(p.premium_until) > new Date() ? new Date(p.premium_until) : null;
  view.innerHTML = `<section class="page">
    <h1>${esc(t("premium_title"))}</h1><p class="lead">${esc(t("premium_intro"))}</p>
    <div class="premium-grid">
      <div class="plan plan-premium">
        <h2>${esc(t("premium_title"))}</h2>
        <p class="plan-price"><strong>${price(C.PRICES.premium_month)}</strong>${esc(t("per_month"))}</p>
        <p class="muted">${esc(t("buy_year"))} : <strong>${price(C.PRICES.premium_year)}</strong>${esc(t("per_year"))}</p>
        <ul class="ticks">${["pf_ai","pf_compare","pf_checklist","pf_deadlines","pf_drive","pf_export","pf_events"].map(k => `<li>${esc(t(k))}</li>`).join("")}</ul>
        <div id="pstate"></div>
      </div>
      <div class="plan plan-allin"><p class="tag obj">★ ${esc(t("allin_badge"))}</p><h2>${esc(t("allin_title"))}</h2>
        <p class="plan-price"><strong>${price(C.PRICES.all_in_month || 59)}</strong>${esc(t("per_month"))}</p>
        <p class="muted">${esc(t("buy_year"))} : <strong>${price(C.PRICES.all_in_year || 590)}</strong>${esc(t("per_year"))}</p>
        <ul class="ticks">${["allin_f_premium","allin_f_ai","allin_f_guides","allin_f_course","allin_f_new"].map(k => `<li>${esc(t(k))}</li>`).join("")}</ul>
        <div id="astate"></div></div>
      <div class="plan"><h2>${esc(t("free_title"))}</h2><p>${esc(t("free_text"))}</p></div>
    </div>
    <p class="muted small">${esc(t("cancel_info"))}</p>
    <section class="card cancel-box"><h2>⚠️ ${esc(t("cx_title"))}</h2><p>${esc(t("cx_lose"))}</p>
      <ul class="cx-list">${["pf_ai","pf_compare","pf_checklist","pf_deadlines","pf_drive","pf_events"].map(k => `<li>✗ ${esc(t(k))}</li>`).join("")}<li>✗ ${esc(t("cx_quota"))}</li></ul>
      <p class="ok small">🛟 ${esc(t("cx_keep"))}</p></section>
  </section>`;
  const st = $("#pstate");
  if (!H.configured) return;
  if (!me) { st.innerHTML = `<p class="notice">${esc(t("login_first"))}</p><a class="btn primary" href="#/connexion?signup">${esc(t("hero_join"))}</a>`; return; }
  const allIn = until && p.premium_plan === "all_in";
  $("#astate").innerHTML = allIn ? `<p class="ok">${esc(t("allin_active"))} ${esc(date(until))}</p><a class="btn" href="#/boutique">📚 ${esc(t("nav_shop"))}</a>`
    : ((C.GUMROAD_LINKS || {}).all_in ? `<div class="actions">${buyBtn("all_in", t("allin_cta"), true)}</div><p class="muted small">${esc(t("allin_after"))}</p>` : "");
  st.innerHTML = `${until && !allIn ? `<p class="ok">${esc(t("premium_active"))} ${esc(date(until))}</p>` : ""}
    <p class="notice small">${esc(t("same_email"))}<br><strong>${esc(t("your_email"))} ${esc(me.email || "")}</strong></p>
    <div class="actions">${buyBtn("premium", t("premium_cta"), true)}
    <button class="btn" id="claim">${esc(t("premium_refresh"))}</button></div>`;
  $("#claim").onclick = async () => {
    const before = H.myProfile && H.myProfile.premium_until;
    await H.loadMe();
    const after = H.myProfile && H.myProfile.premium_until;
    toast(after && after !== before ? t("premium_refreshed") : (after && new Date(after) > new Date() ? t("premium_refreshed") : t("premium_none")));
    H.renderHeader(); premium();
  };
}

// ---------- Cartes d'annonces ----------
const isFeatured = l => l.featured_until && new Date(l.featured_until) > new Date();
const sortListings = rows => rows.sort((a, b) => (isFeatured(b) - isFeatured(a)) || (new Date(b.created_at) - new Date(a.created_at)));
function listingCard(l) {
  const links = [
    l.phone ? `<a href="tel:${esc(l.phone.replace(/\s/g, ""))}">${esc(l.phone)}</a>` : "",
    l.email ? `<a href="mailto:${esc(l.email)}">${esc(l.email)}</a>` : "",
    l.website ? `<a href="${esc(safeUrl(l.website))}" target="_blank" rel="noopener sponsored">${esc(l.website.replace(/^https?:\/\//, "").slice(0, 40))}</a>` : ""
  ].filter(Boolean).join("");
  return `<article class="listing ${isFeatured(l) ? "is-featured" : ""}">
    <p class="tags"><span class="tag sponsored">${esc(t("sponsored"))}</span>${isFeatured(l) ? `<span class="tag obj">${esc(t("featured"))}</span>` : ""}<span class="tag">${esc(t("kind_" + l.kind))}</span></p>
    <h3><a href="#/annonce/${l.id}">${esc(l.title)}</a></h3>
    <p class="rate" data-rate="listing" data-id="${l.id}"></p>
    <p class="muted small">${[l.city, l.price_text].filter(Boolean).map(esc).join(" · ")}</p>
    ${l.description ? `<p>${nl2br(l.plan === "full" ? l.description.slice(0, 260) + (l.description.length > 260 ? "…" : "") : l.description.slice(0, 300))}</p>` : ""}
    ${(l.languages || []).length ? `<p class="small">${esc(t("speaks"))} : ${(l.languages || []).map(c => esc(langName(c))).join(", ")}</p>` : ""}
    ${l.address ? `<p class="small muted">${esc(l.address)}</p>` : ""}
    ${l.kind === "rental" && l.licence_number ? `<p class="small">${esc(t("lst_licence"))} : <strong>${esc(l.licence_number)}</strong></p>` : ""}
    <p class="contact-links">${links}</p>
    ${H.me ? `<button class="linkbtn small" data-rep="${l.id}">${esc(t("report"))}</button>` : ""}
  </article>`;
}
const bindReports = () => $$("[data-rep]", view).forEach(b => b.onclick = () => H.report("listing", b.dataset.rep));
const ctaPublish = () => `<div class="publish-cta"><a class="btn" href="${H.me ? "#/annonces/nouvelle" : "#/connexion?signup"}">${esc(t("publish_listing"))}</a></div>`;

// ---------- Bons plans ----------
async function deals(kind) {
  if (kind && !KINDS.includes(kind)) kind = "";
  view.innerHTML = `<section class="page wide">
    <div class="titlebar"><h1>${esc(t("deals_title"))}</h1>${ctaPublish()}</div>
    <p class="muted">${esc(t("deals_intro"))}</p>
    <nav class="tabs"><a class="tab" href="#/bons-plans" ${!kind ? 'aria-current="page"' : ""}>${esc(t("all"))}</a>${KINDS.map(k => `<a class="tab" href="#/bons-plans/${k}" ${kind === k ? 'aria-current="page"' : ""}>${esc(t("kind_" + k))}</a>`).join("")}</nav>
    <div class="filters">
      ${field(t("filter_city"), `<input id="dcity" type="search">`, "dcity")}
      ${field(t("filter_language"), `<select id="dlang"><option value="">${esc(t("all"))}</option>${H.LANGS.map(l => `<option value="${l}">${esc(H.LANG_NAMES[l])}</option>`).join("")}</select>`, "dlang")}
    </div>
    ${H.searchBox("dsq")}
    <div id="dlist"><p>${esc(t("loading"))}</p></div>
  </section>`;
  if (!H.configured) { $("#dlist").innerHTML = `<p class="empty">${esc(t("no_listings"))}</p>`; return; }
  let q = H.sb.from("listings").select("*").eq("status", "active").gt("active_until", new Date().toISOString()).neq("kind", "youtube").limit(500);
  if (kind) q = q.eq("kind", kind);
  const { data } = await q;
  const rows = sortListings(data || []);
  const apply = () => {
    const city = $("#dcity").value.trim().toLowerCase(), lg = $("#dlang").value, q = H.norm($("#dsq").value);
    const shown = rows.filter(l => (!city || (l.city || "").toLowerCase().includes(city)) && (!lg || (l.languages || []).includes(lg)) && (!q || H.norm(`${l.title} ${l.description || ""}`).includes(q)));
    $("#dlist").innerHTML = shown.length ? `<div class="listings">${shown.map(listingCard).join("")}</div>` : `<p class="empty">${esc(t("no_listings"))}</p>`;
    bindReports(); if (H.fillRatings) H.fillRatings(view, "listing");
  };
  ["#dcity", "#dlang", "#dsq"].forEach(s => $(s).addEventListener("input", apply)); apply();
}

// ---------- Chaînes YouTube ----------
const ytId = u => { const m = (u || "").match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/)([\w-]{11})/); return m ? m[1] : null; };
const isYouTube = u => /^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(u || "");
async function youtube() {
  view.innerHTML = `<section class="page wide">
    <div class="titlebar"><h1>${esc(t("yt_title"))}</h1>${ctaPublish()}</div>
    <div id="ychannel"></div>
    <p class="muted">${esc(t("yt_intro"))}</p>
    <div class="filters">
      ${field(t("filter_language"), `<select id="ylang"><option value="">${esc(t("all"))}</option>${H.LANGS.map(l => `<option value="${l}" ${l === H.lang ? "selected" : ""}>${esc(H.LANG_NAMES[l])}</option>`).join("")}</select>`, "ylang")}
      ${field(t("lst_topics"), `<select id="ytopic"><option value="">${esc(t("all"))}</option>${TOPICS.map(k => `<option value="${k}">${esc(t("cat_" + k))}</option>`).join("")}</select>`, "ytopic")}
    </div>
    ${H.searchBox("ysq")}
    <div id="ylist"><p>${esc(t("loading"))}</p></div>
  </section>`;
  (window.HV_HOOKS && window.HV_HOOKS.youtube || []).forEach(f => { try { f($("#ychannel")); } catch (e) {} });
  if (!H.configured) { $("#ylist").innerHTML = `<p class="empty">${esc(t("no_listings"))}</p>`; return; }
  const { data } = await H.sb.from("listings").select("*").eq("kind", "youtube").eq("status", "active").gt("active_until", new Date().toISOString()).limit(500);
  const rows = sortListings(data || []);
  const apply = () => {
    const lg = $("#ylang").value, tp = $("#ytopic").value, q = H.norm($("#ysq").value);
    const shown = rows.filter(l => (!lg || (l.languages || []).includes(lg)) && (!tp || (l.topics || []).includes(tp)) && (!q || H.norm(`${l.title} ${l.description || ""}`).includes(q)));
    $("#ylist").innerHTML = shown.length ? `<div class="yt-grid">${shown.map(l => { const id = ytId(l.youtube_url), url = isYouTube(l.youtube_url) ? l.youtube_url : "";
      return `<article class="yt ${isFeatured(l) ? "is-featured" : ""}">
        <a class="yt-thumb" href="${esc(url)}" target="_blank" rel="noopener sponsored" aria-label="${esc(t("yt_watch"))} : ${esc(l.title)}">${id ? `<img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy">` : `<span class="yt-play" aria-hidden="true"></span>`}</a>
        <div class="yt-body"><p class="tags"><span class="tag sponsored">${esc(t("sponsored"))}</span>${isFeatured(l) ? `<span class="tag obj">${esc(t("featured"))}</span>` : ""}</p>
        <h3>${esc(l.title)}</h3>
        ${l.description ? `<p class="small">${nl2br(l.description)}</p>` : ""}
        <p class="small muted">${(l.languages || []).map(c => esc(langName(c))).join(", ")}${(l.topics || []).length ? " · " + (l.topics || []).map(k => esc(t("cat_" + k))).join(", ") : ""}</p>
        ${url ? `<a class="btn small" href="${esc(url)}" target="_blank" rel="noopener sponsored">${esc(t("yt_watch"))}</a>` : ""}
        ${H.me ? ` <button class="linkbtn small" data-rep="${l.id}">${esc(t("report"))}</button>` : ""}</div></article>`; }).join("")}</div>`
      : `<p class="empty">${esc(t("no_listings"))}</p>`;
    bindReports();
  };
  ["#ylang", "#ytopic", "#ysq"].forEach(s => $(s).addEventListener("input", apply)); apply();
}

// ---------- Mes annonces ----------
async function myListings() {
  const sb = H.sb;
  view.innerHTML = `<section class="page">
    <div class="titlebar"><h1>${esc(t("lst_mine"))}</h1><a class="btn primary" href="#/annonces/nouvelle">${esc(t("lst_new"))}</a></div>
    <p class="notice small">${esc(t("lst_how"))}<br><strong>${esc(t("your_email"))} ${esc(H.me.email || "")}</strong></p>
    <div id="launchbox"></div>
    <h2>${esc(t("credits_title"))}</h2><div id="credits"></div>
    <div id="mylist"><p>${esc(t("loading"))}</p></div>
    <h2>${esc(t("prices_title"))}</h2>
    <div class="table-wrap"><table><tbody>${PRICE_ROWS().slice(1).map(([k, v], i) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td><td>${buyBtn(["pro","pro_full","youtube","rental","featured"][i], t("lst_buy"))}</td></tr>`).join("")}</tbody></table></div>
  </section>`;
  const [{ data: ls }, { data: cr }, { data: lo }] = await Promise.all([
    sb.from("listings").select("*").eq("owner_id", H.me.id).order("created_at", { ascending:false }),
    sb.from("credits").select("kind,days").is("used_at", null),
    sb.rpc("launch_offer_status")
  ]);
  const offer = lo || { full: 0, simple: 0, claimed: true };
  if (!offer.claimed && (offer.full > 0 || offer.simple > 0))
    $("#launchbox").innerHTML = `<section class="launch-box"><h2>🎁 ${esc(t("launch_title"))}</h2><p>${esc(t("launch_d"))}</p>
      <p class="launch-count"><span><strong>${offer.full}</strong> ${esc(t("launch_left_full"))}</span><span><strong>${offer.simple}</strong> ${esc(t("launch_left_simple"))}</span></p></section>`;
  const canLaunch = l => !offer.claimed && ["restaurant","hotel","service"].includes(l.kind) && l.status !== "rejected" && (offer[l.plan === "full" ? "full" : "simple"] || 0) > 0;
  const counts = {}; (cr || []).filter(c => c.kind !== "premium").forEach(c => counts[c.kind] = (counts[c.kind] || 0) + 1);
  $("#credits").innerHTML = Object.keys(counts).length ? `<p class="tags">${Object.entries(counts).map(([k, n]) => `<span class="tag st-going">${esc(t("ck_" + k))} × ${n}</span>`).join("")}</p>` : `<p class="muted">${esc(t("credits_none"))}</p>`;
  const now = new Date();
  $("#mylist").innerHTML = (ls || []).length ? `<ul class="admin-list">${ls.map(l => {
    const active = l.status === "active" && l.active_until && new Date(l.active_until) > now;
    const state = l.status === "rejected" ? t("ls_rejected") : active ? `${t("ls_active")} ${date(l.active_until)}` : l.active_until ? t("ls_expired") : t("ls_draft");
    return `<li><div><strong>${esc(l.title)}</strong> <span class="tag">${esc(t("kind_" + l.kind))}</span>
      <p class="small ${active ? "ok" : "muted"}">${esc(state)}${isFeatured(l) ? ` · ${esc(t("featured_until"))} ${esc(date(l.featured_until))}` : ""}</p></div>
      <div class="actions">${!active && canLaunch(l) ? `<button class="btn small launch" data-launch="${l.id}">${esc(t("launch_claim"))}</button>` : ""}${l.status !== "rejected" ? `<button class="btn small primary" data-act="${l.id}">${esc(t(active ? "lst_extend" : "lst_activate"))}</button>${active ? `<button class="btn small" data-feat="${l.id}">${esc(t("lst_feature"))}</button>` : ""}` : ""}
      <a class="btn small" href="#/annonces/${l.id}">${esc(t("lst_edit"))}</a>
      <a class="linkbtn small" href="${esc(buyUrl(creditKind(l.kind, l.plan)))}" target="_blank" rel="noopener">${esc(t("lst_buy"))}</a>
      <button class="linkbtn small" data-del="${l.id}">${esc(t("delete"))}</button></div></li>`; }).join("")}</ul>`
    : `<p class="empty">${esc(t("lst_none"))}</p>`;
  const run = async (id, featured) => {
    const { error } = await sb.rpc("activate_listing", { p_listing: +id, p_featured: featured });
    if (error) return toast(mapErr(error));
    myListings();
  };
  $$("[data-act]", view).forEach(b => b.onclick = () => run(b.dataset.act, false));
  $$("[data-launch]", view).forEach(b => b.onclick = async () => {
    if (!confirm(t("launch_confirm"))) return;
    const { error } = await sb.rpc("claim_launch_offer", { p_listing: +b.dataset.launch });
    if (error) return toast(mapErr(error));
    toast(t("launch_ok")); myListings();
  });
  $$("[data-feat]", view).forEach(b => b.onclick = () => run(b.dataset.feat, true));
  $$("[data-del]", view).forEach(b => b.onclick = async () => { if (!confirm(t("confirm_delete"))) return; await sb.from("listings").delete().eq("id", b.dataset.del); myListings(); });
}

// ---------- Formulaire d'annonce ----------
async function listingForm(id) {
  let l = { kind:"restaurant", languages:[H.lang], topics:[] };
  if (id) {
    const { data } = await H.sb.from("listings").select("*").eq("id", id).eq("owner_id", H.me.id).maybeSingle();
    if (!data) { location.hash = "#/mes-annonces"; return; }
    l = data;
  }
  const inp = (name, label, type = "text", max = 200, extra = "") => field(label, `<input id="l_${name}" name="${name}" type="${type}" maxlength="${max}" value="${esc(l[name] || "")}" ${extra}>`, "l_" + name);
  view.innerHTML = `<section class="page">
    <a class="back" href="#/mes-annonces">${esc(t("back"))}</a>
    <h1>${esc(t(id ? "lst_edit" : "lst_new"))}</h1>
    <form id="lf" class="profile-form"><fieldset><legend>${esc(t("lst_kind"))}</legend>
      <div class="segmented wrap">${["restaurant","hotel","service","rental","youtube"].map(k => `<label><input type="radio" name="kind" value="${k}" ${l.kind === k ? "checked" : ""} ${id ? "disabled" : ""}><span>${esc(t("kind_" + k))}</span></label>`).join("")}</div>
      <div class="grid">
        ${inp("title", t("lst_title") + " *", "text", 120, "required minlength=3")}
        <div data-k="restaurant hotel service rental">${inp("city", t("filter_city"), "text", 80)}</div>
        <div data-k="restaurant hotel service rental">${inp("price_text", t("lst_price"), "text", 120)}</div>
        <div data-k="restaurant hotel service rental">${inp("address", t("lst_address"), "text", 200)}</div>
        <div data-k="restaurant hotel service rental">${inp("phone", t("c_phone"), "tel", 40)}</div>
        <div data-k="restaurant hotel service rental">${inp("email", t("c_email"), "email", 120)}</div>
        <div data-k="restaurant hotel service rental">${inp("website", t("lst_website"), "text", 200)}</div>
        <div data-k="youtube">${inp("youtube_url", t("lst_youtube") + " *", "url", 300)}</div>
      </div>
      <div data-k="rental">${inp("licence_number", t("lst_licence") + " *", "text", 80)}<p class="muted small">${esc(t("lst_licence_help"))}</p></div>
      <div data-k="youtube" class="field"><span class="label">${esc(t("lst_topics"))}</span>${checks("topics", TOPICS.map(k => [k, t("cat_" + k)]), l.topics || [])}</div>
      <div class="field"><span class="label">${esc(t("lst_langs"))}</span>${checks("languages", H.SPOKEN.map(c => [c, langName(c)]), l.languages || [])}</div>
      <div data-k="restaurant hotel service" class="field"><span class="label">${esc(t("lp_plan"))}</span>
        <div class="segmented wrap"><label><input type="radio" name="plan" value="simple" ${l.plan !== "full" ? "checked" : ""}><span>${esc(t("pro_simple"))} · ${price(C.PRICES.pro_month)}${esc(t("per_month"))}</span></label><label><input type="radio" name="plan" value="full" ${l.plan === "full" ? "checked" : ""}><span>★ ${esc(t("pro_full"))} · ${price(C.PRICES.pro_full_month || 49.9)}${esc(t("per_month"))}</span></label></div>
        <p class="muted small" id="planhelp"></p></div>
      ${field(t("lst_desc"), `<textarea id="l_desc" name="description" rows="5" maxlength="2000">${esc(l.description || "")}</textarea><span class="small muted" id="desccount"></span>`, "l_desc")}
      <div id="fullwrap">
        ${field(t("lp_hours"), `<textarea id="l_hours" name="hours" rows="3" maxlength="300" placeholder="${esc(t("lp_hours_ph"))}">${esc(l.hours || "")}</textarea>`, "l_hours")}
        <div class="field"><span class="label">${esc(t("lp_photos"))}</span><div class="thumbs" id="lphotos"></div><label class="btn small" for="lpin">📷 ${esc(t("lp_add_photos"))}</label><input id="lpin" type="file" accept="image/*" multiple class="sr"></div>
      </div>
    </fieldset>
    <div class="actions"><button class="btn primary">${esc(t("lst_save"))}</button><span class="msg" role="status"></span></div></form>
  </section>`;
  const F = $("#lf");
  const kindNow = () => id ? l.kind : F.querySelector("input[name=kind]:checked").value;
  const show = () => { const k = kindNow(); $$("[data-k]", F).forEach(el => { const on = el.dataset.k.split(" ").includes(k); el.hidden = !on; $$("input", el).forEach(i => { if (i.name === "youtube_url") i.required = on; if (i.name === "licence_number") i.required = on; }); }); };
  $$("input[name=kind]", F).forEach(r => r.onchange = () => { show(); planUI(); }); show();
  let photos = (l.photos || []).slice(), newFiles = [];
  const isPro = () => ["restaurant","hotel","service"].includes(kindNow());
  const planNow = () => isPro() ? (F.querySelector("input[name=plan]:checked") || {}).value || "simple" : "simple";
  const drawPhotos = () => { $("#lphotos").innerHTML = photos.map((u, i) => `<span class="thumb"><img src="${esc(u)}" alt=""><button type="button" data-rp="${i}">×</button></span>`).join("") + newFiles.map((x, i) => `<span class="thumb"><img src="${URL.createObjectURL(x)}" alt=""><button type="button" data-rn="${i}">×</button></span>`).join("");
    $$("[data-rp]", F).forEach(b => b.onclick = () => { photos.splice(+b.dataset.rp, 1); drawPhotos(); }); $$("[data-rn]", F).forEach(b => b.onclick = () => { newFiles.splice(+b.dataset.rn, 1); drawPhotos(); }); };
  const planUI = () => {
    const full = planNow() === "full";
    $("#fullwrap").hidden = !full || !isPro();
    $("#l_desc").maxLength = full || !isPro() ? 2000 : 300;
    $("#planhelp").textContent = t(full ? "lp_full_help" : "lp_simple_help");
    $("#desccount").textContent = `${$("#l_desc").value.length} / ${$("#l_desc").maxLength}`;
  };
  $$("input[name=plan]", F).forEach(r => r.onchange = planUI);
  $("#l_desc").addEventListener("input", planUI);
  $("#lpin").onchange = e => { newFiles = newFiles.concat([...e.target.files].filter(x => x.type.startsWith("image/"))).slice(0, 8 - photos.length); e.target.value = ""; drawPhotos(); };
  drawPhotos(); planUI();
  F.onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(F), v = k => (f.get(k) || "").toString().trim() || null, k = kindNow(), msg = $(".msg", F);
    if (k === "youtube" && !isYouTube(v("youtube_url"))) { msg.textContent = t("lst_youtube"); return; }
    const row = { title: v("title"), description: v("description"), languages: f.getAll("languages") };
    if (k === "youtube") Object.assign(row, { youtube_url: v("youtube_url"), topics: f.getAll("topics") });
    else Object.assign(row, { city: v("city"), price_text: v("price_text"), address: v("address"), phone: v("phone"), email: v("email"), website: v("website"), licence_number: k === "rental" ? v("licence_number") : null });
    msg.textContent = t("loading");
    if (isPro()) {
      row.plan = planNow();
      if (row.plan === "full") {
        row.hours = v("hours");
        try { const up = newFiles.length && H.uploadPhotos ? await H.uploadPhotos(newFiles, "listing") : []; row.photos = photos.concat(up).slice(0, 8); }
        catch (err) { msg.textContent = mapErr(err); return; }
      } else if (row.description) row.description = row.description.slice(0, 300);
    }
    const { error } = id
      ? await H.sb.from("listings").update(row).eq("id", id)
      : await H.sb.from("listings").insert({ ...row, kind: k, owner_id: H.me.id });
    if (error) { msg.textContent = mapErr(error); return; }
    toast(t("lst_saved")); location.hash = "#/mes-annonces";
  };
}

// ---------- Suggestions ----------
async function suggestions() {
  const sb = H.sb, me = H.me;
  view.innerHTML = `<section class="page">
    <h1>${esc(t("sugg_title"))}</h1><p class="lead">${esc(t("sugg_intro"))}</p>
    <form id="sgf" class="stack card"><h2>${esc(t("sugg_new"))}</h2>
      ${field(t("sugg_field_title"), `<input id="sgt" name="title" required minlength="3" maxlength="140">`, "sgt")}
      ${field(t("sugg_field_body"), `<textarea id="sgb" name="body" rows="3" maxlength="2000"></textarea>`, "sgb")}
      <div class="actions"><button class="btn primary">${esc(t("sugg_send"))}</button></div></form>
    <div id="sglist"><p>${esc(t("loading"))}</p></div>
  </section>`;
  $("#sgf").onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target);
    const { error } = await sb.from("suggestions").insert({ author_id: me.id, title: f.get("title").trim(), body: (f.get("body") || "").trim() || null });
    if (error) return toast(errMsg(error)); suggestions();
  };
  const { data } = await sb.from("suggestions").select("*, suggestion_votes(user_id)").order("created_at", { ascending:false }).limit(300);
  const rows = (data || []).map(s => ({ ...s, votes: (s.suggestion_votes || []).length, mine: (s.suggestion_votes || []).some(v => v.user_id === me.id) }))
    .sort((a, b) => (a.status === "done") - (b.status === "done") || b.votes - a.votes);
  $("#sglist").innerHTML = rows.length ? `<ul class="suggestions">${rows.map(s => `<li>
    <button class="vote ${s.mine ? "on" : ""}" data-vote="${s.id}" aria-pressed="${s.mine}" aria-label="${esc(t("sugg_vote"))}"><span aria-hidden="true">▲</span><strong>${s.votes}</strong></button>
    <div><h3>${esc(s.title)}</h3>${s.body ? `<p class="small">${nl2br(s.body)}</p>` : ""}
    <p class="small"><span class="tag ss-${s.status}">${esc(t("ss_" + s.status))}</span> <span class="muted">${esc(date(s.created_at))}</span>
    ${H.isAdmin ? ` <select data-st="${s.id}" aria-label="status">${["new","planned","done","declined"].map(x => `<option value="${x}" ${x === s.status ? "selected" : ""}>${esc(t("ss_" + x))}</option>`).join("")}</select>` : ""}
    ${s.author_id === me.id || H.isAdmin ? ` <button class="linkbtn small" data-sdel="${s.id}">${esc(t("delete"))}</button>` : ""}</p></div></li>`).join("")}</ul>`
    : `<p class="empty">${esc(t("sugg_none"))}</p>`;
  $$("[data-vote]", view).forEach(b => b.onclick = async () => {
    const sid = +b.dataset.vote;
    const { error } = b.classList.contains("on")
      ? await sb.from("suggestion_votes").delete().eq("suggestion_id", sid).eq("user_id", me.id)
      : await sb.from("suggestion_votes").insert({ suggestion_id: sid, user_id: me.id });
    if (error) return toast(errMsg(error)); suggestions();
  });
  $$("[data-st]", view).forEach(s => s.onchange = async () => { const { error } = await sb.from("suggestions").update({ status: s.value }).eq("id", s.dataset.st); if (error) toast(errMsg(error)); });
  $$("[data-sdel]", view).forEach(b => b.onclick = async () => { if (!confirm(t("confirm_delete"))) return; await sb.from("suggestions").delete().eq("id", b.dataset.sdel); suggestions(); });
}

// ---------- Contact (Netlify Forms : chaque message arrive par e-mail) ----------
function contact() {
  const tel = (C.CONTACT_PHONE || "").replace(/[^\d+]/g, "");
  view.innerHTML = `<section class="narrow">
    <h1>${esc(t("contact_title"))}</h1><p class="lead">${esc(t("contact_intro"))}</p>
    <form id="cf" class="stack" name="contact">
      <p class="sr"><label>Ne pas remplir <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>
      ${field(t("contact_name") + " *", `<input id="cname" name="name" required maxlength="100" value="${esc((H.myProfile || {}).display_name || "")}">`, "cname")}
      ${field(t("contact_email") + " *", `<input id="cmail" name="email" type="email" required maxlength="120" value="${esc((H.me || {}).email || "")}">`, "cmail")}
      ${field(t("contact_subject"), `<input id="csubj" name="subject" maxlength="140">`, "csubj")}
      ${field(t("contact_message") + " *", `<textarea id="cmsg" name="message" rows="6" required maxlength="5000"></textarea>`, "cmsg")}
      <div class="actions"><button class="btn primary">${esc(t("contact_send"))}</button></div>
      <p class="msg" role="status"></p>
    </form>
    <p>${esc(t("contact_direct"))}</p>
    <p class="contact-links"><a href="mailto:${esc(C.CONTACT_EMAIL)}">${esc(C.CONTACT_EMAIL)}</a>${tel ? `<a href="tel:${esc(tel)}">${esc(t("phone"))} : ${esc(C.CONTACT_PHONE)}</a>` : ""}</p>
    ${window.HV_SOCIAL ? `<div class="contact-social">${window.HV_SOCIAL(t("follow_us"))}</div>` : ""}
  </section>`;
  $("#cf").onsubmit = async e => {
    e.preventDefault();
    const body = new URLSearchParams({ "form-name": "contact", ...Object.fromEntries(new FormData(e.target)) });
    const msg = $("#cf .msg"); msg.textContent = t("loading");
    try {
      const r = await fetch("/", { method:"POST", headers:{ "Content-Type":"application/x-www-form-urlencoded" }, body: body.toString() });
      if (!r.ok) throw new Error(r.status);
      e.target.reset(); msg.textContent = t("contact_sent");
    } catch (err) { msg.textContent = t("contact_error"); }
  };
}
});
