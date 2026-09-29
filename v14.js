// v14 : Vente et donnerie (particuliers), « Trouver un professionnel », accueil orienté visiteurs,
// « Qui est près de moi ? », ambassadeur local, bandeau « Nouvelle version disponible »
(window.HV_EXT = window.HV_EXT || []).push((H, ROUTES) => {
const { t, esc, nl2br, $, $$, toast, date, dateTime, avatar, badges, errMsg } = H;
const view = H.view;
const qs = () => new URLSearchParams((location.hash.split("?")[1] || ""));
const eur = n => new Intl.NumberFormat(H.lang, { style: "currency", currency: "EUR", minimumFractionDigits: n % 1 ? 2 : 0 }).format(n);
const stars = (n, cls) => `<span class="stars ${cls || ""}" aria-label="${n}/5">${[1,2,3,4,5].map(i => `<span class="${i <= Math.round(n) ? "on" : ""}">★</span>`).join("")}</span>`;
ROUTES.unshift(
  [/^#\/vente\/nouveau$/, () => itemForm(null), true],
  [/^#\/vente\/modifier\/(\d+)$/, m => itemForm(+m[1]), true],
  [/^#\/vente\/(\d+)$/, m => itemPage(+m[1])],
  [/^#\/vente(?:\?.*)?$/, () => market()],
  [/^#\/pros(?:\?.*)?$/, () => directory()],
  [/^#\/contacts(?:\/(\w+))?$/, m => { location.replace("#/pros" + (m[1] ? "?cat=" + m[1] : "")); }]
);

// ================= VENTE ET DONNERIE =================
const CL_CATS = ["furniture", "appliances", "clothes", "kids", "garden", "vehicles", "leisure", "books", "other"];
const CL_COND = ["new", "very_good", "good", "repair"];
async function market() {
  const p = qs(), tab = p.get("t") || "sale";
  view.innerHTML = `<section class="page wide market-page"><div class="titlebar"><h1>♻️ ${esc(t("mk_title"))}</h1>
      ${H.me ? `<a class="btn primary" href="#/vente/nouveau">＋ ${esc(t("mk_new"))}</a>` : `<a class="btn primary" href="#/connexion?signup">＋ ${esc(t("mk_new"))}</a>`}</div>
    <p class="lead">${esc(t("mk_intro"))}</p>
    <nav class="tabs big-tabs">${[["sale", "mk_tab_sale", "🏷"], ["gift", "mk_tab_gift", "🎁"], ["mine", "mk_tab_mine", "📦"]].filter(x => x[0] !== "mine" || H.me).map(([k, l, ic]) => `<a class="tabbtn" href="#/vente?t=${k}" ${tab === k ? 'aria-current="page"' : ""}>${ic} ${esc(t(l))}</a>`).join("")}</nav>
    <div class="filters">
      <label>${esc(t("category"))}<select id="mkcat"><option value="">${esc(t("all"))}</option>${CL_CATS.map(c => `<option value="${c}">${esc(t("mk_c_" + c))}</option>`).join("")}</select></label>
      <label>${esc(t("filter_city"))}<input id="mkcity" type="search" value="${esc((H.myProfile || {}).city || "")}"></label>
      ${tab === "sale" ? `<label>${esc(t("mk_price_max"))}<input id="mkmax" type="number" min="0" step="1"></label>` : ""}
      <label>${esc(t("mk_sort"))}<select id="mksort"><option value="recent">${esc(t("mk_sort_recent"))}</option>${tab === "sale" ? `<option value="price">${esc(t("mk_sort_price"))}</option>` : ""}</select></label>
    </div>
    ${H.searchBox("mkq")}
    <div id="mklist" class="item-grid"><p>${esc(t("loading"))}</p></div>
    <aside class="safety"><strong>🛡 ${esc(t("mk_safety_t"))}</strong><p class="small">${esc(t("mk_safety"))}</p></aside></section>`;
  if (!H.configured) return;
  let q = H.sb.from("classifieds").select("*").order("created_at", { ascending: false }).limit(300);
  q = tab === "mine" ? q.eq("owner_id", H.me.id) : q.eq("kind", tab);
  const { data } = await q; const rows = data || [];
  const draw = () => {
    const cat = $("#mkcat").value, city = H.norm($("#mkcity").value), max = $("#mkmax") ? parseFloat($("#mkmax").value) : NaN, s = H.norm($("#mkq").value);
    let list = rows.filter(x => (!cat || x.category === cat) && (!city || H.norm(x.city || "").includes(city)) && (isNaN(max) || x.price == null || x.price <= max) && (!s || H.norm(`${x.title} ${x.description || ""} ${x.area || ""}`).includes(s)));
    if ($("#mksort").value === "price") list = list.slice().sort((a, b) => (a.price || 0) - (b.price || 0));
    $("#mklist").innerHTML = list.length ? list.map(itemCard).join("") : `<p class="empty">${esc(t(tab === "mine" ? "mk_none_mine" : "mk_none"))}</p>`;
  };
  ["#mkcat", "#mkcity", "#mkmax", "#mksort", "#mkq"].forEach(sel => { const el = $(sel); if (el) el.addEventListener("input", draw); });
  draw();
}
const itemCard = x => `<a class="item-card" href="#/vente/${x.id}">
  <div class="item-ph">${(x.photos || [])[0] ? `<img src="${esc(x.photos[0])}" alt="" loading="lazy">` : `<span aria-hidden="true">${x.kind === "gift" ? "🎁" : "🏷"}</span>`}
    ${x.status !== "available" ? `<span class="item-status st-${x.status}">${esc(t("mk_st_" + x.status))}</span>` : ""}</div>
  <div class="item-body"><strong>${esc(x.title)}</strong>
    <span class="item-price ${x.kind === "gift" ? "free" : ""}">${x.kind === "gift" ? esc(t("mk_free")) : x.price != null ? esc(eur(+x.price)) : "—"}</span>
    <span class="small muted">${esc([x.city, x.area].filter(Boolean).join(" · "))} · ${esc(date(x.created_at))}</span></div></a>`;

async function itemPage(id) {
  const { data: x } = await H.sb.from("classifieds").select("*").eq("id", id).maybeSingle();
  if (!x) { view.innerHTML = `<section class="narrow"><p class="notice">${esc(t("mk_gone"))}</p><a href="#/vente">${esc(t("back"))}</a></section>`; return; }
  const own = H.me && x.owner_id === H.me.id;
  const people = H.me ? await H.profilesFor([x.owner_id]) : {}; const o = people[x.owner_id];
  const url = location.origin + location.pathname + "#/vente/" + x.id;
  view.innerHTML = `<article class="page item-page"><a class="back" href="#/vente?t=${x.kind}">${esc(t("back"))}</a>
    <p class="tags"><span class="tag ${x.kind === "gift" ? "st-going" : ""}">${esc(t(x.kind === "gift" ? "mk_tab_gift" : "mk_tab_sale"))}</span>${x.category ? `<span class="tag">${esc(t("mk_c_" + x.category))}</span>` : ""}${x.status !== "available" ? `<span class="tag obj">${esc(t("mk_st_" + x.status))}</span>` : ""}</p>
    <h1>${esc(x.title)}</h1>
    <p class="item-price big ${x.kind === "gift" ? "free" : ""}">${x.kind === "gift" ? esc(t("mk_free")) : x.price != null ? esc(eur(+x.price)) : ""}</p>
    ${(x.photos || []).length ? `<div class="gallery g${Math.min(x.photos.length, 4)}">${x.photos.map((u, i) => `<button class="ph" data-ph="${i}"><img src="${esc(u)}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}
    ${x.description ? `<p class="post-body">${nl2br(x.description)}</p>` : ""}
    <dl class="facts">${x.condition ? `<div><dt>${esc(t("mk_condition"))}</dt><dd>${esc(t("mk_cd_" + x.condition))}</dd></div>` : ""}
      <div><dt>${esc(t("filter_city"))}</dt><dd>${esc([x.city, x.area].filter(Boolean).join(" · ") || "—")}</dd></div>
      <div><dt>${esc(t("mk_published"))}</dt><dd>${esc(date(x.created_at))}</dd></div></dl>
    ${own ? `<section class="card"><h2>${esc(t("mk_manage"))}</h2><div class="actions">
        ${["available", "reserved", "done"].map(s => `<button class="btn small ${x.status === s ? "primary" : ""}" data-st="${s}">${esc(t(s === "done" ? (x.kind === "gift" ? "mk_mark_given" : "mk_mark_sold") : "mk_st_" + s))}</button>`).join("")}
        <button class="btn small" id="renew">↻ ${esc(t("mk_renew"))}</button><a class="btn small" href="#/vente/modifier/${x.id}">✎ ${esc(t("lst_edit"))}</a><button class="linkbtn small" id="del">${esc(t("delete"))}</button></div>
        <p class="small muted">${esc(t("mk_expires"))} ${esc(date(x.expires_at))}</p></section>`
      : `<section class="card seller">${o ? `${avatar(o)} <div><a href="#/profil/${x.owner_id}"><strong>${esc(o.display_name)}</strong></a> ${badges(o)}</div>` : ""}
        ${H.me ? `<button class="btn primary" id="contact">💬 ${esc(t(x.kind === "gift" ? "mk_contact_gift" : "mk_contact_sale"))}</button>` : `<a class="btn primary" href="#/connexion?signup">💬 ${esc(t("mk_login_contact"))}</a>`}</section>`}
    <aside class="safety"><strong>🛡 ${esc(t("mk_safety_t"))}</strong><p class="small">${esc(t("mk_safety"))}</p></aside>
    <p class="actions"><button class="btn small" id="shr">↗ ${esc(t("ev_share"))}</button>${H.me && !own ? `<button class="linkbtn small" id="rep">${esc(t("report"))}</button>` : ""}</p>
  </article>`;
  $$("[data-ph]", view).forEach(b => b.onclick = () => H.lightbox ? H.lightbox(x.photos, +b.dataset.ph) : window.open(x.photos[+b.dataset.ph]));
  $("#shr").onclick = () => H.openShare ? H.openShare({ url, title: x.title }) : H.share(x.title, url);
  const rep = $("#rep"); if (rep) rep.onclick = () => H.report("classified", x.id);
  const c = $("#contact"); if (c) c.onclick = () => H.openChat ? H.openChat(x.owner_id) : (location.hash = "#/messages");
  $$("[data-st]", view).forEach(b => b.onclick = async () => { const { error } = await H.sb.from("classifieds").update({ status: b.dataset.st }).eq("id", x.id); if (error) return toast(errMsg(error)); itemPage(id); });
  const rn = $("#renew"); if (rn) rn.onclick = async () => { const { error } = await H.sb.from("classifieds").update({ expires_at: new Date(Date.now() + 60 * 86400e3).toISOString(), status: x.status === "done" ? "available" : x.status }).eq("id", x.id); if (error) return toast(errMsg(error)); toast("✓"); itemPage(id); };
  const dl = $("#del"); if (dl) dl.onclick = async () => { if (!confirm(t("confirm_delete"))) return; await H.sb.from("classifieds").delete().eq("id", x.id); location.hash = "#/vente?t=mine"; };
}

async function itemForm(id) {
  let x = { kind: qs().get("t") === "gift" ? "gift" : "sale", title: "", description: "", price: null, category: "", condition: "good", city: (H.myProfile || {}).city || "", area: "", photos: [] };
  if (id) { const { data } = await H.sb.from("classifieds").select("*").eq("id", id).eq("owner_id", H.me.id).maybeSingle(); if (!data) { location.hash = "#/vente"; return; } x = data; }
  let photos = (x.photos || []).slice(), files = [];
  view.innerHTML = `<section class="narrow"><a class="back" href="#/vente">${esc(t("back"))}</a><h1>${esc(t(id ? "mk_edit" : "mk_new"))}</h1>
    <form id="clf" class="stack">
      <div class="segmented"><label><input type="radio" name="kind" value="sale" ${x.kind === "sale" ? "checked" : ""}><span>🏷 ${esc(t("mk_tab_sale"))}</span></label><label><input type="radio" name="kind" value="gift" ${x.kind === "gift" ? "checked" : ""}><span>🎁 ${esc(t("mk_tab_gift"))}</span></label></div>
      <label>${esc(t("mk_f_title"))} *<input id="ctitle" required minlength="3" maxlength="100" value="${esc(x.title)}"></label>
      <div class="grid">
        <label id="pricewrap">${esc(t("mk_f_price"))} (€)<input id="cprice" type="number" min="0" step="0.5" value="${x.price != null ? esc(x.price) : ""}"></label>
        <label>${esc(t("category"))}<select id="ccat">${CL_CATS.map(c => `<option value="${c}" ${x.category === c ? "selected" : ""}>${esc(t("mk_c_" + c))}</option>`).join("")}</select></label>
        <label>${esc(t("mk_condition"))}<select id="ccond">${CL_COND.map(c => `<option value="${c}" ${x.condition === c ? "selected" : ""}>${esc(t("mk_cd_" + c))}</option>`).join("")}</select></label>
        <label>${esc(t("filter_city"))} *<input id="ccity2" required maxlength="80" value="${esc(x.city || "")}"></label>
        <label>${esc(t("mk_f_area"))}<input id="carea" maxlength="80" value="${esc(x.area || "")}"></label>
      </div>
      <label>${esc(t("mk_f_desc"))}<textarea id="cdesc" rows="5" maxlength="2000">${esc(x.description || "")}</textarea></label>
      <div class="field"><span class="label">${esc(t("mk_f_photos"))}</span><div class="thumbs" id="cthumbs"></div>
        <label class="btn small" for="cph">📷 ${esc(t("lp_add_photos"))}</label><input id="cph" type="file" accept="image/*" multiple class="sr"></div>
      <p class="small muted">${esc(t("mk_rules"))}</p>
      <div class="actions"><button class="btn primary">${esc(t(id ? "art_save" : "mk_publish"))}</button><span class="msg small" role="status"></span></div>
    </form></section>`;
  const F = $("#clf");
  const kindNow = () => F.querySelector("input[name=kind]:checked").value;
  const syncKind = () => { $("#pricewrap").hidden = kindNow() === "gift"; };
  $$("input[name=kind]", F).forEach(r => r.onchange = syncKind); syncKind();
  const drawTh = () => { $("#cthumbs").innerHTML = photos.map((u, i) => `<span class="thumb"><img src="${esc(u)}" alt=""><button type="button" data-rp="${i}">×</button></span>`).join("") + files.map((f, i) => `<span class="thumb"><img src="${URL.createObjectURL(f)}" alt=""><button type="button" data-rf="${i}">×</button></span>`).join("");
    $$("[data-rp]", F).forEach(b => b.onclick = () => { photos.splice(+b.dataset.rp, 1); drawTh(); }); $$("[data-rf]", F).forEach(b => b.onclick = () => { files.splice(+b.dataset.rf, 1); drawTh(); }); };
  $("#cph").onchange = e => { files = files.concat([...e.target.files].filter(f => f.type.startsWith("image/"))).slice(0, 6 - photos.length); e.target.value = ""; drawTh(); };
  drawTh();
  F.onsubmit = async e => {
    e.preventDefault(); const msg = $(".msg", F); msg.textContent = t("loading");
    try {
      const up = files.length && H.uploadPhotos ? await H.uploadPhotos(files, "item") : [];
      const row = { kind: kindNow(), title: $("#ctitle").value.trim(), price: kindNow() === "gift" || $("#cprice").value === "" ? null : +$("#cprice").value,
        category: $("#ccat").value, condition: $("#ccond").value, city: $("#ccity2").value.trim(), area: $("#carea").value.trim() || null,
        description: $("#cdesc").value.trim() || null, photos: photos.concat(up).slice(0, 6) };
      const res = id ? await H.sb.from("classifieds").update(row).eq("id", id).select().single() : await H.sb.from("classifieds").insert({ ...row, owner_id: H.me.id }).select().single();
      if (res.error) throw res.error;
      location.hash = "#/vente/" + res.data.id;
    } catch (err) { msg.textContent = (err.message || "").includes("CLASSIFIED_LIMIT") ? t("mk_limit") : errMsg(err); }
  };
}

// ================= TROUVER UN PROFESSIONNEL =================
const PRO_GROUPS = [["pd_g_legal", ["lawyer", "notary", "gestoria", "translator"]], ["pd_g_admin", ["admin", "embassy", "emergency"]],
  ["pd_g_home", ["realestate", "moving", "artisan"]], ["pd_g_money", ["bank", "insurance"]], ["pd_g_life", ["doctor", "school", "other"]]];
H.PRO_GROUPS = PRO_GROUPS;
const catLabel = c => { const k = "ct_" + c; const v = t(k); return v === k ? c : v; };
function proCatSelect(id, sel, allLabel) {
  return `<select id="${id}">${allLabel ? `<option value="">${esc(allLabel)}</option>` : ""}${PRO_GROUPS.map(([g, cs]) => `<optgroup label="${esc(t(g))}">${cs.map(c => `<option value="${c}" ${sel === c ? "selected" : ""}>${esc(catLabel(c))}</option>`).join("")}</optgroup>`).join("")}</select>`;
}
H.proCatSelect = proCatSelect;
async function directory() {
  const p = qs();
  view.innerHTML = `<section class="page wide"><h1>🔎 ${esc(t("pd_title"))}</h1><p class="lead">${esc(t("pd_intro"))}</p>
    <div class="finder">
      <label>${esc(t("pd_looking"))}${proCatSelect("pdcat", p.get("cat") || "", t("pd_all_pros"))}</label>
      <label>${esc(t("pd_in"))}<select id="pdcity"><option value="">${esc(t("pd_all_cities"))}</option></select></label>
      <label>${esc(t("pd_speaks"))}<select id="pdlang"><option value="">${esc(t("all"))}</option>${(H.SPOKEN || H.LANGS).map(l => `<option value="${l}" ${p.get("lang") === l ? "selected" : ""}>${esc(H.langName(l))}</option>`).join("")}</select></label>
      <label>${esc(t("pd_rating"))}<select id="pdmin"><option value="0">${esc(t("all"))}</option><option value="3">★ 3+</option><option value="4">★ 4+</option><option value="4.5">★ 4,5+</option></select></label>
      <label>${esc(t("mk_sort"))}<select id="pdsort"><option value="relevance">${esc(t("pd_sort_rel"))}</option><option value="rating">${esc(t("pd_sort_rating"))}</option><option value="reviews">${esc(t("pd_sort_reviews"))}</option></select></label>
    </div>
    <p class="small muted" id="pdcount"></p><div id="pdlist" class="pro-list"><p>${esc(t("loading"))}</p></div>
    <div class="actions"><button class="btn" id="pdmore" hidden>${esc(t("wall_more"))}</button></div>
    <section class="card"><h2>🤝 ${esc(t("pd_recommend_t"))}</h2><p class="small muted">${esc(t("pd_recommend_d"))}</p><div id="pdrec"></div></section>
    <p class="small muted">${esc(t("pd_legal"))}</p></section>`;
  if (!H.configured) return;
  const { data: cities } = await H.sb.rpc("directory_cities");
  $("#pdcity").innerHTML += (cities || []).map(c => `<option ${H.norm(c) === H.norm(p.get("city") || (H.myProfile || {}).city || "") ? "selected" : ""}>${esc(c)}</option>`).join("");
  let offset = 0, rows = [];
  const load = async (reset) => {
    if (reset) { offset = 0; rows = []; }
    const { data, error } = await H.sb.rpc("pro_directory", { p_category: $("#pdcat").value, p_city: $("#pdcity").value, p_lang: $("#pdlang").value, p_min: +$("#pdmin").value, p_sort: $("#pdsort").value, p_limit: 40, p_offset: offset });
    if (error) { $("#pdlist").innerHTML = `<p class="notice">${esc(errMsg(error))}</p>`; return; }
    rows = rows.concat(data.rows || []); offset += 40;
    $("#pdcount").textContent = `${data.total} ${t("pd_results")}`;
    $("#pdmore").hidden = rows.length >= data.total;
    $("#pdlist").innerHTML = rows.length ? rows.map(proCard).join("") : `<p class="empty">${esc(t("pd_none"))}</p>`;
  };
  ["#pdcat", "#pdcity", "#pdlang", "#pdmin", "#pdsort"].forEach(s => $(s).addEventListener("change", () => load(true)));
  $("#pdmore").onclick = () => load(false);
  load(true);
  // Recommander un professionnel
  if (!H.me) { $("#pdrec").innerHTML = `<p><a href="#/connexion?signup">${esc(t("login_to_suggest"))}</a></p>`; return; }
  $("#pdrec").innerHTML = `<form id="recf" class="stack"><div class="grid">
      <label>${esc(t("c_name"))} *<input id="rname" required maxlength="120"></label><label>${esc(t("category"))} *${proCatSelect("rcat", "lawyer")}</label>
      <label>${esc(t("filter_city"))}<input id="rcity" maxlength="80" value="${esc((H.myProfile || {}).city || "")}"></label><label>${esc(t("c_phone"))}<input id="rphone" type="tel" maxlength="40"></label>
      <label>E-mail<input id="remail" type="email" maxlength="120"></label><label>${esc(t("lp_site"))}<input id="rweb" maxlength="200"></label></div>
      <label>${esc(t("pd_why"))}<textarea id="rdesc" rows="3" maxlength="1000"></textarea></label>
      <div class="actions"><button class="btn primary">${esc(t("pd_recommend_btn"))}</button><span class="msg small" role="status"></span></div></form>`;
  $("#recf").onsubmit = async e => {
    e.preventDefault(); const f = e.target;
    const { error } = await H.sb.from("contacts").insert({ name: $("#rname").value.trim(), category: $("#rcat").value, city: $("#rcity").value.trim() || null, phone: $("#rphone").value.trim() || null,
      email: $("#remail").value.trim() || null, website: $("#rweb").value.trim() || null, description: $("#rdesc").value.trim() || null, languages: [H.lang], submitted_by: H.me.id });
    $(".msg", f).textContent = error ? errMsg(error) : t("pd_recommend_ok"); if (!error) f.reset();
  };
}
const safeUrl = u => /^https?:\/\//i.test(u || "") ? u : "https://" + u;
const proCard = x => {
  const href = x.src === "listing" ? `#/annonce/${x.id}` : `#/avis/contact/${x.id}`;
  const badge = { official: ["🏛", "pd_b_official"], recommended: ["👍", "pd_b_recommended"], sponsored: ["★", "sponsored"] }[x.badge];
  return `<article class="pro-card ${x.plan === "full" ? "is-full" : ""}">
    ${(x.photos || [])[0] ? `<a href="${href}" class="pro-ph"><img src="${esc(x.photos[0])}" alt="" loading="lazy"></a>` : ""}
    <div class="pro-body">
      <p class="tags"><span class="tag">${esc(catLabel(x.category))}</span>${badge ? `<span class="tag b-${x.badge}">${badge[0]} ${esc(t(badge[1]))}</span>` : ""}${x.verified ? `<span class="tag st-going">✓ ${esc(t("pro_verified"))}</span>` : ""}</p>
      <h3><a href="${href}">${esc(x.name)}</a></h3>
      <p class="pro-rate">${x.n ? `${stars(x.avg, "sm")} <strong>${String(x.avg).replace(".", ",")}</strong> <span class="small muted">(${x.n} ${esc(t("rv_count"))})</span>` : `<span class="small muted">☆ ${esc(t("rv_first"))}</span>`}</p>
      <p class="small muted">${esc([x.city, (x.languages || []).map(H.langName).join(", ")].filter(Boolean).join(" · "))}</p>
      ${x.description ? `<p class="small">${esc(x.description)}</p>` : ""}
      <div class="actions">${x.phone ? `<a class="btn small" href="tel:${esc(x.phone.replace(/\s/g, ""))}">📞 ${esc(t("pd_call"))}</a>` : ""}${x.website ? `<a class="btn small" href="${esc(safeUrl(x.website))}" target="_blank" rel="noopener">🌐 ${esc(t("lp_site"))}</a>` : ""}<a class="btn small primary" href="${href}">⭐ ${esc(t("pd_see"))}</a></div>
    </div></article>`;
};

// ================= ACCUEIL DES VISITEURS =================
(window.HV_HOOKS = window.HV_HOOKS || {}).home = (window.HV_HOOKS.home || []).concat([async () => {
  const hero = $(".hero", view); if (!hero) return;
  const box = document.createElement("div"); box.className = "home-v14";
  box.innerHTML = `<section class="paths">
      <a class="path before" href="#/guide"><span class="path-ic">🧳</span><strong>${esc(t("hp_before_t"))}</strong><span>${esc(t("hp_before_d"))}</span><span class="btn small primary">${esc(t("hp_before_cta"))} →</span></a>
      <a class="path after" href="#/connexion?signup"><span class="path-ic">🏡</span><strong>${esc(t("hp_after_t"))}</strong><span>${esc(t("hp_after_d"))}</span><span class="btn small primary">${esc(t("hp_after_cta"))} →</span></a>
    </section>
    <section class="quick-finder"><h2>🔎 ${esc(t("hp_find_t"))}</h2>
      <div class="qf-row"><span>${esc(t("pd_looking"))}</span>${proCatSelect("qfcat", "lawyer")}<span>${esc(t("pd_in"))}</span><input id="qfcity" placeholder="Alicante, Málaga…"><span>${esc(t("pd_speaks"))}</span>
        <select id="qflang">${H.LANGS.map(l => `<option value="${l}" ${l === H.lang ? "selected" : ""}>${esc(H.LANG_NAMES[l])}</option>`).join("")}</select><button class="btn primary" id="qfgo">${esc(t("hp_find_btn"))}</button></div></section>
    <section class="ask-box"><div><h2>💬 ${esc(t("hp_ask_t"))}</h2><p>${esc(t("hp_ask_d"))}</p></div>
      <div class="actions"><a class="btn primary" href="#/assistant">🤖 ${esc(t("hp_ask_ai"))}</a><a class="btn" href="#/forum">👥 ${esc(t("hp_ask_forum"))}</a></div></section>
    <section class="city-counts" id="hpcities" hidden></section>`;
  hero.insertAdjacentElement("afterend", box);
  $("#qfgo").onclick = () => { const q = new URLSearchParams({ cat: $("#qfcat").value, city: $("#qfcity").value.trim(), lang: $("#qflang").value }); location.hash = "#/pros?" + q.toString(); };
  if (!H.configured) return;
  const { data } = await H.sb.rpc("public_city_counts");
  if ((data || []).length) { const el = $("#hpcities"); el.hidden = false; el.innerHTML = `<h2>📍 ${esc(t("hp_cities_t"))}</h2><div class="chips">${data.map(c => `<a class="chip-btn" href="#/connexion?signup">${esc(c.city)} <strong>${c.n}</strong></a>`).join("")}</div>`; }
}]);

// ================= TABLEAU DE BORD : près de moi et ambassadeur =================
(window.HV_HOOKS.dashboard = window.HV_HOOKS.dashboard || []).push(async () => {
  const side = $(".dash-side", view), p = H.myProfile || {}; if (!side || !p.city) return;
  const sb = H.sb, me = H.me.id;
  const [{ count }, { data: near }, { data: grp }, amb] = await Promise.all([
    sb.from("profiles").select("id", { count: "exact", head: true }).ilike("city", p.city).neq("id", me),
    sb.from("profiles").select("id,display_name,avatar_url").ilike("city", p.city).neq("id", me).order("created_at", { ascending: false }).limit(8),
    sb.from("groups").select("id,name").ilike("city", p.city).eq("visibility", "public").limit(1),
    p.ambassador_id ? sb.from("profiles").select("id,display_name,avatar_url").eq("id", p.ambassador_id).maybeSingle() : Promise.resolve({ data: null })
  ]);
  const a = amb && amb.data;
  side.insertAdjacentHTML("afterbegin", `${a ? `<section class="amb-card">${avatar(a)}<div><p class="small muted">${esc(t("nb_amb_t"))} ${esc(p.city)}</p><strong>${esc(a.display_name)}</strong>
      <button class="btn small primary" id="ambmsg">💬 ${esc(t("nb_amb_write"))}</button></div></section>` : ""}
    <section class="near-card"><h3>📍 ${esc(t("nb_near_t"))}</h3><p><strong>${count || 0}</strong> ${esc(t("nb_members_in"))} ${esc(p.city)}</p>
      <div class="avatars">${(near || []).map(x => `<a href="#/profil/${x.id}" title="${esc(x.display_name)}">${avatar(x, "tiny")}</a>`).join("")}</div>
      <div class="actions">${(grp || [])[0] ? `<a class="btn small" href="#/groupes/${grp[0].id}">👥 ${esc(grp[0].name)}</a>` : `<a class="btn small" href="#/groupes">👥 ${esc(t("nb_create_group"))}</a>`}<a class="btn small" href="#/communaute">🗺 ${esc(t("nb_map"))}</a></div></section>`);
  const b = $("#ambmsg"); if (b) b.onclick = () => H.openChat && H.openChat(a.id);
});

// ================= BANDEAU « NOUVELLE VERSION DISPONIBLE » =================
if ("serviceWorker" in navigator) {
  let had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!had) { had = true; return; }
    if ($("#vbanner")) return;
    const b = document.createElement("div"); b.id = "vbanner"; b.className = "version-banner";
    b.innerHTML = `<span>✨ ${esc(t("vb_text"))}</span><button class="btn small primary">${esc(t("vb_btn"))}</button>`;
    b.querySelector("button").onclick = () => location.reload();
    document.body.appendChild(b);
  });
  navigator.serviceWorker.getRegistration().then(reg => {
    if (!reg) return;
    setInterval(() => reg.update().catch(() => {}), 30 * 60e3);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) reg.update().catch(() => {}); });
  });
}
});
