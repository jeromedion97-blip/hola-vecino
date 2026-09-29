// v9 : groupes et discussions de groupe, avis avec étoiles et photos, pages d'annonce,
// accès des avocats et gestores au dossier de leurs clients
(window.HV_EXT = window.HV_EXT || []).push((H, ROUTES) => {
const { t, esc, nl2br, $, $$, toast, date, dateTime, avatar, badges, errMsg } = H;
const view = H.view;
ROUTES.unshift(
  [/^#\/groupes$/, () => groups(), true],
  [/^#\/groupes\/(\d+)$/, m => groupPage(+m[1]), true],
  [/^#\/annonce\/(\d+)$/, m => listingPage(+m[1])],
  [/^#\/avis\/contact\/(\d+)$/, m => contactReviews(+m[1])],
  [/^#\/mes-pros$/, () => myPros(), true],
  [/^#\/mes-clients$/, () => myClients(), true],
  [/^#\/mes-clients\/([\w-]+)$/, m => clientFile(m[1]), true]
);
const stars = (n, cls) => `<span class="stars ${cls || ""}" aria-label="${n}/5">${[1,2,3,4,5].map(i => `<span class="${i <= Math.round(n) ? "on" : ""}">★</span>`).join("")}</span>`;
async function shrink(file) {
  const img = await createImageBitmap(file), r = Math.min(1, 1280 / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return await new Promise(res => c.toBlob(res, "image/jpeg", .82));
}
H.uploadPhotos = async (files, prefix) => {
  const urls = [];
  for (const [i, f] of files.entries()) {
    const blob = await shrink(f), path = `${H.me.id}/${prefix}-${Date.now()}-${i}.jpg`;
    const up = await H.sb.storage.from("photos").upload(path, blob, { contentType:"image/jpeg" });
    if (up.error) throw up.error;
    urls.push(H.sb.storage.from("photos").getPublicUrl(path).data.publicUrl);
  }
  return urls;
};
const openImg = (list, i) => H.lightbox ? H.lightbox(list, i) : window.open(list[i], "_blank");

// ============ NOTES ET AVIS ============
H.fillRatings = async (root, type) => {
  const els = $$(`[data-rate="${type}"]`, root); if (!els.length || !H.configured) return;
  const ids = [...new Set(els.map(e => +e.dataset.id))];
  const { data } = await H.sb.from("reviews").select("target_id,rating").eq("target_type", type).in("target_id", ids);
  els.forEach(e => { const r = (data || []).filter(x => x.target_id === +e.dataset.id);
    e.innerHTML = r.length ? `${stars(r.reduce((s, x) => s + x.rating, 0) / r.length, "sm")} <span class="small">${(r.reduce((s, x) => s + x.rating, 0) / r.length).toFixed(1)} (${r.length})</span>` : `<span class="small muted">☆ ${esc(t("rv_first"))}</span>`; });
};
async function reviewsBlock(type, id, el, ownerId) {
  const sb = H.sb, me = H.me;
  const { data } = await sb.from("reviews").select("*").eq("target_type", type).eq("target_id", id).order("created_at", { ascending:false });
  const rows = (data || []).filter(r => !(H.blocks && H.blocks.has(r.author_id)));
  const people = rows.length && H.me ? await H.profilesFor(rows.map(r => r.author_id)) : {};
  const avg = rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : 0;
  const mine = me && rows.find(r => r.author_id === me.id);
  const canWrite = me && H.myProfile && !mine && me.id !== ownerId;
  const dist = [5,4,3,2,1].map(n => [n, rows.filter(r => r.rating === n).length]);
  el.innerHTML = `<section class="reviews"><h2>${esc(t("rv_title"))}</h2>
    ${rows.length ? `<div class="rv-summary"><div class="rv-avg"><strong>${avg.toFixed(1)}</strong>${stars(avg)}<span class="small muted">${rows.length} ${esc(t("rv_count"))}</span></div>
      <div class="rv-dist">${dist.map(([n, c]) => `<div><span>${n}★</span><span class="bar"><span style="width:${rows.length ? c / rows.length * 100 : 0}%"></span></span><span class="small">${c}</span></div>`).join("")}</div></div>` : `<p class="muted">${esc(t("rv_none"))}</p>`}
    ${canWrite ? `<form class="card rv-form" id="rvf"><p><strong>${esc(t("rv_write"))}</strong></p>
      <div class="star-pick" role="radiogroup" aria-label="${esc(t("rv_rating"))}">${[1,2,3,4,5].map(i => `<button type="button" data-st="${i}" aria-label="${i}/5">★</button>`).join("")}</div>
      <textarea id="rvbody" rows="3" maxlength="1500" placeholder="${esc(t("rv_placeholder"))}"></textarea>
      <div class="thumbs" id="rvthumbs"></div>
      <div class="actions"><label class="btn small" for="rvph">📷 ${esc(t("wall_photos"))}</label><input id="rvph" type="file" accept="image/*" multiple class="sr"><button class="btn primary">${esc(t("rv_send"))}</button><span class="msg small" role="status"></span></div>
      <p class="small muted">${esc(t("pt_review_note"))}</p></form>` : !me ? `<p class="small"><a href="#/connexion?signup">${esc(t("rv_login"))}</a></p>` : ""}
    <div class="rv-list">${rows.map(r => { const a = people[r.author_id] || { display_name: t("rv_member") }; return `<article class="rv">
      <header>${avatar(a, "tiny")} <strong>${esc(a.display_name)}</strong> ${stars(r.rating, "sm")} <span class="small muted">${esc(date(r.created_at))}</span></header>
      ${r.body ? `<p>${nl2br(r.body)}</p>` : ""}${(r.photos || []).length ? `<div class="rv-photos">${r.photos.map((u, i) => `<button class="ph" data-rv="${r.id}" data-i="${i}"><img src="${esc(u)}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}
      ${me && (r.author_id === me.id || H.isAdmin) ? `<button class="linkbtn small" data-rvdel="${r.id}">${esc(t("delete"))}</button>` : me ? `<button class="linkbtn small" data-rvrep="${r.id}">${esc(t("report"))}</button>` : ""}</article>`; }).join("")}</div></section>`;
  $$("[data-rv]", el).forEach(b => b.onclick = () => openImg(rows.find(r => String(r.id) === b.dataset.rv).photos, +b.dataset.i));
  $$("[data-rvdel]", el).forEach(b => b.onclick = async () => { if (!confirm(t("confirm_delete"))) return; await sb.from("reviews").delete().eq("id", b.dataset.rvdel); reviewsBlock(type, id, el, ownerId); });
  $$("[data-rvrep]", el).forEach(b => b.onclick = () => H.report("review", b.dataset.rvrep));
  const f = $("#rvf", el); if (!f) return;
  let rating = 0, files = [];
  const paint = () => $$("[data-st]", f).forEach(b => b.classList.toggle("on", +b.dataset.st <= rating));
  $$("[data-st]", f).forEach(b => b.onclick = () => { rating = +b.dataset.st; paint(); });
  $("#rvph", f).onchange = e => { files = files.concat([...e.target.files].filter(x => x.type.startsWith("image/"))).slice(0, 4); e.target.value = ""; $("#rvthumbs", f).innerHTML = files.map(x => `<span class="thumb"><img src="${URL.createObjectURL(x)}" alt=""></span>`).join(""); };
  f.onsubmit = async e => {
    e.preventDefault(); const msg = $(".msg", f);
    if (!rating) { msg.textContent = t("rv_need_rating"); return; }
    msg.textContent = t("loading");
    try {
      const photos = files.length ? await H.uploadPhotos(files, "rev") : [];
      const { error } = await sb.from("reviews").insert({ target_type: type, target_id: id, author_id: me.id, rating, body: $("#rvbody", f).value.trim() || null, photos });
      if (error) throw error;
      toast(t("rv_thanks")); reviewsBlock(type, id, el, ownerId);
    } catch (err) { msg.textContent = (err.message || "").includes("OWN_LISTING") ? t("rv_own") : errMsg(err); }
  };
}
H.reviewsBlock = reviewsBlock;

// ============ PAGE D'UNE ANNONCE ============
async function listingPage(id) {
  if (!H.configured) return;
  view.innerHTML = `<p>${esc(t("loading"))}</p>`;
  const { data: l } = await H.sb.from("listings").select("*").eq("id", id).maybeSingle();
  if (!l) { view.innerHTML = `<section class="narrow"><p class="notice">${esc(t("no_listings"))}</p><a href="#/bons-plans">${esc(t("back"))}</a></section>`; return; }
  const full = l.plan === "full", own = H.me && l.owner_id === H.me.id;
  const safe = u => /^https?:\/\//i.test(u || "") ? u : (u ? "https://" + u : "");
  const desc = full ? (l.description || "") : (l.description || "").slice(0, 300);
  const url = location.origin + location.pathname + "#/annonce/" + l.id;
  view.innerHTML = `<article class="page listing-page ${full ? "is-full" : ""}">
    <a class="back" href="${l.kind === "youtube" ? "#/youtube" : "#/bons-plans"}">${esc(t("back"))}</a>
    <p class="tags"><span class="tag sponsored">${esc(t("sponsored"))}</span><span class="tag">${esc(t("kind_" + l.kind))}</span>${full ? `<span class="tag obj">★ ${esc(t("pro_full"))}</span>` : ""}</p>
    <h1>${esc(l.title)}</h1><p class="muted">${esc([l.city, l.price_text].filter(Boolean).join(" · "))}</p><p id="lrate" data-rate="listing" data-id="${l.id}"></p>
    ${full && (l.photos || []).length ? `<div class="gallery g${Math.min(l.photos.length, 4)}">${l.photos.slice(0, 8).map((u, i) => `<button class="ph" data-lp="${i}"><img src="${esc(u)}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}
    ${desc ? `<p class="post-body">${nl2br(desc)}</p>` : ""}
    <dl class="facts">
      ${full && l.hours ? `<div><dt>${esc(t("lp_hours"))}</dt><dd>${nl2br(l.hours)}</dd></div>` : ""}
      ${(l.languages || []).length ? `<div><dt>${esc(t("lst_langs"))}</dt><dd>${(l.languages || []).map(H.langName).map(esc).join(", ")}</dd></div>` : ""}
      ${l.address ? `<div><dt>${esc(t("lst_address"))}</dt><dd>${esc(l.address)} · <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(l.address + " " + (l.city || ""))}" target="_blank" rel="noopener">${esc(t("lp_route"))}</a></dd></div>` : ""}
      ${l.kind === "rental" && l.licence_number ? `<div><dt>${esc(t("lst_licence"))}</dt><dd>${esc(l.licence_number)}</dd></div>` : ""}
    </dl>
    <p class="contact-links">${full && l.phone ? `<a class="btn small" href="tel:${esc(l.phone.replace(/\s/g, ""))}">📞 ${esc(l.phone)}</a>` : ""}${full && l.email ? `<a class="btn small" href="mailto:${esc(l.email)}">✉️ ${esc(l.email)}</a>` : ""}${l.website ? `<a class="btn small primary" href="${esc(safe(l.website))}" target="_blank" rel="noopener sponsored">🌐 ${esc(t("lp_site"))}</a>` : ""}${l.youtube_url ? `<a class="btn small primary" href="${esc(l.youtube_url)}" target="_blank" rel="noopener sponsored">▶ ${esc(t("yt_watch"))}</a>` : ""}</p>
    ${own ? `<div class="card"><p id="lviews" class="small"></p><a class="btn small" href="#/annonces/${l.id}">✎ ${esc(t("lst_edit"))}</a> <a class="btn small" href="#/mes-annonces">${esc(t("lst_mine"))}</a></div>` : ""}
    <div id="lreviews"></div>
    <h2>${esc(t("sh_title"))}</h2>${H.shareButtons ? H.shareButtons(url, l.title) : ""}
  </article>`;
  $$("[data-lp]", view).forEach(b => b.onclick = () => openImg(l.photos, +b.dataset.lp));
  if (H.bindCopy) H.bindCopy(view);
  H.fillRatings(view, "listing");
  reviewsBlock("listing", l.id, $("#lreviews"), l.owner_id);
  if (own) { const { data: n } = await H.sb.rpc("listing_views", { p_listing: l.id, p_days: 30 }); if (n != null) $("#lviews").textContent = `👁 ${n} ${t("lp_views")}`; }
}
async function contactReviews(id) {
  if (!H.configured) return;
  const { data: c } = await H.sb.from("contacts").select("*").eq("id", id).maybeSingle();
  if (!c) { location.hash = "#/contacts"; return; }
  view.innerHTML = `<section class="page"><a class="back" href="#/contacts">${esc(t("back"))}</a><p class="muted small">${esc(t("ct_" + c.category))}${c.city ? " · " + esc(c.city) : ""}</p><h1>${esc(c.name)}</h1>
    ${c.description ? `<p>${nl2br(c.description)}</p>` : ""}<div id="creviews"></div></section>`;
  reviewsBlock("contact", c.id, $("#creviews"), null);
}

// ============ GROUPES ============
let gtab = "mine";
async function groups() {
  const sb = H.sb, me = H.me, p = H.myProfile || {};
  view.innerHTML = `<section class="page"><div class="titlebar"><h1>👥 ${esc(t("gr_title"))}</h1><button class="btn primary" id="gnew">＋ ${esc(t("gr_new"))}</button></div>
    <p class="lead">${esc(t("gr_intro"))}</p>
    <form id="gform" class="card stack" hidden>
      ${H.field ? "" : ""}<label>${esc(t("gr_name"))} *<input id="gname" required minlength="3" maxlength="80"></label>
      <label>${esc(t("gr_desc"))}<textarea id="gdesc" rows="2" maxlength="1000"></textarea></label>
      <label>${esc(t("filter_city"))}<input id="gcity" maxlength="80" value="${esc(p.city || "")}"></label>
      <div class="segmented"><label><input type="radio" name="gvis" value="public" checked><span>${esc(t("gr_public"))}</span></label><label><input type="radio" name="gvis" value="private"><span>${esc(t("gr_private"))}</span></label></div>
      <div class="actions"><button class="btn primary">${esc(t("gr_create"))}</button><button type="button" class="linkbtn" id="gcancel">${esc(t("cancel"))}</button></div></form>
    <nav class="tabs">${["mine","discover","invites"].map(k => `<button data-gt="${k}" ${gtab === k ? 'aria-pressed="true"' : ""}>${esc(t("gr_tab_" + k))}</button>`).join("")}</nav>
    ${H.searchBox("gq")}<div id="glist"><p>${esc(t("loading"))}</p></div></section>`;
  $("#gnew").onclick = () => { $("#gform").hidden = false; $("#gname").focus(); };
  $("#gcancel").onclick = () => { $("#gform").hidden = true; };
  $$("[data-gt]", view).forEach(b => b.onclick = () => { gtab = b.dataset.gt; groups(); });
  $("#gform").onsubmit = async e => {
    e.preventDefault();
    const { data: g, error } = await sb.from("groups").insert({ owner_id: me.id, name: $("#gname").value.trim(), description: $("#gdesc").value.trim() || null, city: $("#gcity").value.trim() || null, visibility: view.querySelector("input[name=gvis]:checked").value }).select().single();
    if (error) return toast(errMsg(error)); location.hash = "#/groupes/" + g.id;
  };
  const { data: mem } = await sb.from("group_members").select("group_id,status").eq("user_id", me.id);
  const memberOf = (mem || []).filter(m => m.status === "member").map(m => m.group_id), invited = (mem || []).filter(m => m.status === "invited").map(m => m.group_id);
  let q = sb.from("groups").select("*").order("created_at", { ascending:false }).limit(200);
  if (gtab === "mine") q = memberOf.length ? q.in("id", memberOf) : null;
  else if (gtab === "invites") q = invited.length ? q.in("id", invited) : null;
  else q = q.eq("visibility", "public");
  const rows = q ? ((await q).data || []) : [];
  const ids = rows.map(g => g.id);
  const { data: counts } = ids.length ? await sb.from("group_members").select("group_id").in("group_id", ids).eq("status", "member") : { data: [] };
  const n = id => (counts || []).filter(c => c.group_id === id).length;
  const draw = () => {
    const s = H.norm($("#gq").value);
    const shown = rows.filter(g => !s || H.norm(`${g.name} ${g.description || ""} ${g.city || ""}`).includes(s));
    $("#glist").innerHTML = shown.length ? `<div class="members">${shown.map(g => `<a class="member group-card" href="#/groupes/${g.id}"><span class="avatar" aria-hidden="true">👥</span><div class="member-body"><h3>${esc(g.name)}</h3>
      <p class="tags">${g.visibility === "private" ? `<span class="tag">🔒 ${esc(t("gr_private"))}</span>` : ""}${memberOf.includes(g.id) ? `<span class="tag st-going">✓ ${esc(t("gr_member"))}</span>` : ""}${invited.includes(g.id) ? `<span class="tag obj">${esc(t("rs_invited"))}</span>` : ""}</p>
      <p class="small muted">${esc([g.city, `${n(g.id)} ${t("members")}`].filter(Boolean).join(" · "))}</p>${g.description ? `<p class="small">${esc(g.description.slice(0, 120))}</p>` : ""}</div></a>`).join("")}</div>`
      : `<p class="empty">${esc(s ? t("no_match") : t("gr_none_" + gtab))}</p>`;
  };
  $("#gq").addEventListener("input", draw); draw();
}
async function groupPage(id) {
  const sb = H.sb, me = H.me;
  const { data: g } = await sb.from("groups").select("*").eq("id", id).maybeSingle();
  if (!g) { location.hash = "#/groupes"; return; }
  const { data: mem } = await sb.from("group_members").select("*").eq("group_id", id);
  const members = (mem || []).filter(m => m.status === "member"), mine = (mem || []).find(m => m.user_id === me.id);
  const isMember = mine && mine.status === "member", owner = g.owner_id === me.id;
  const people = await H.profilesFor(members.map(m => m.user_id));
  view.innerHTML = `<section class="page group-page"><a class="back" href="#/groupes">${esc(t("back"))}</a>
    <div class="titlebar"><h1>👥 ${esc(g.name)}</h1>${g.visibility === "private" ? `<span class="tag">🔒 ${esc(t("gr_private"))}</span>` : ""}</div>
    ${g.description ? `<p>${nl2br(g.description)}</p>` : ""}<p class="small muted">${esc([g.city, `${members.length} ${t("members")}`].filter(Boolean).join(" · "))}</p>
    <div class="avatars">${members.slice(0, 30).map(m => `<a href="#/profil/${m.user_id}" title="${esc((people[m.user_id] || {}).display_name || "")}">${avatar(people[m.user_id] || { display_name:"?" })}</a>`).join("")}</div>
    <div class="actions">${isMember ? (owner ? `<button class="btn small danger" id="gdel">${esc(t("gr_delete"))}</button>` : `<button class="linkbtn" id="gleave">${esc(t("gr_leave"))}</button>`)
      : mine && mine.status === "invited" ? `<button class="btn primary" id="gaccept">${esc(t("fr_accept"))}</button><button class="linkbtn" id="gleave">${esc(t("fr_decline"))}</button>`
      : g.visibility === "public" ? `<button class="btn primary" id="gjoin">${esc(t("gr_join"))}</button>` : ""}<button class="linkbtn small" id="grep">${esc(t("report"))}</button></div>
    ${owner ? `<section class="card"><h2>${esc(t("ev_invite_title"))}</h2><input id="gis" type="search" placeholder="${esc(t("ev_invite_search"))}"><ul class="iresults" id="gires"></ul></section>` : ""}
    ${isMember ? `<div class="bubbles group-chat" id="gchat"></div><form class="composer" id="gmf"><label class="sr" for="gmin">${esc(t("write_message"))}</label><textarea id="gmin" rows="2" maxlength="3000" placeholder="${esc(t("write_message"))}"></textarea><button class="btn primary">${esc(t("send"))}</button></form>` : `<p class="notice small">${esc(t("gr_join_to_chat"))}</p>`}
  </section>`;
  const reload = () => groupPage(id);
  const b = sel => $(sel, view);
  if (b("#gjoin")) b("#gjoin").onclick = async () => { const { error } = await sb.from("group_members").insert({ group_id: id, user_id: me.id }); if (error) return toast(errMsg(error)); reload(); };
  if (b("#gaccept")) b("#gaccept").onclick = async () => { await sb.from("group_members").update({ status:"member" }).eq("group_id", id).eq("user_id", me.id); reload(); };
  if (b("#gleave")) b("#gleave").onclick = async () => { await sb.from("group_members").delete().eq("group_id", id).eq("user_id", me.id); location.hash = "#/groupes"; };
  if (b("#gdel")) b("#gdel").onclick = async () => { if (!confirm(t("confirm_delete"))) return; await sb.from("groups").delete().eq("id", id); location.hash = "#/groupes"; };
  b("#grep").onclick = () => H.report("group", id);
  if (owner) { let tm; b("#gis").oninput = () => { clearTimeout(tm); tm = setTimeout(async () => {
    const q = b("#gis").value.trim().replace(/[%_,()]/g, ""); if (q.length < 2) { b("#gires").innerHTML = ""; return; }
    const { data } = await sb.from("profiles").select("id,display_name,avatar_url,city").ilike("display_name", `%${q}%`).limit(8);
    const taken = new Set((mem || []).map(m => m.user_id));
    b("#gires").innerHTML = (data || []).filter(x => !taken.has(x.id) && !H.blocks.has(x.id)).map(x => `<li>${avatar(x, "tiny")} <span>${esc(x.display_name)} <span class="muted small">${esc(x.city || "")}</span></span><button class="btn small" data-gi="${x.id}">${esc(t("ev_invite_btn"))}</button></li>`).join("");
    $$("[data-gi]", view).forEach(x => x.onclick = async () => { const { error } = await sb.from("group_members").insert({ group_id: id, user_id: x.dataset.gi, status:"invited" }); if (error) return toast(errMsg(error)); x.replaceWith(Object.assign(document.createElement("span"), { className:"tag st-invited", textContent: t("rs_invited") })); });
  }, 250); }; }
  if (!isMember) return;
  const box = b("#gchat"), names = { ...people };
  const add = m => { const a = names[m.sender_id] || { display_name:"?" }; box.insertAdjacentHTML("beforeend", `<div class="bubble ${m.sender_id === me.id ? "mine" : ""}">${m.sender_id === me.id ? "" : `<span class="bname">${esc(a.display_name)}</span>`}<p>${nl2br(m.body)}</p><time>${esc(dateTime(m.created_at))}</time></div>`); box.scrollTop = box.scrollHeight; };
  const { data: msgs } = await sb.from("group_messages").select("*").eq("group_id", id).order("created_at", { ascending:false }).limit(200);
  (msgs || []).reverse().forEach(add);
  const ch = sb.channel("grp-" + id + "-" + Date.now()).on("postgres_changes", { event:"INSERT", schema:"public", table:"group_messages", filter:`group_id=eq.${id}` }, async pl => {
    if (pl.new.sender_id === me.id) return;
    if (!names[pl.new.sender_id]) Object.assign(names, await H.profilesFor([pl.new.sender_id]));
    add(pl.new);
  }).subscribe();
  H.onCleanup(() => sb.removeChannel(ch));
  const ta = b("#gmin");
  ta.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); b("#gmf").requestSubmit(); } });
  b("#gmf").onsubmit = async e => { e.preventDefault(); const body = ta.value.trim(); if (!body) return;
    const { data: m, error } = await sb.from("group_messages").insert({ group_id: id, sender_id: me.id, body }).select().single();
    if (error) return toast(errMsg(error)); ta.value = ""; add(m); };
}

// ============ ACCÈS DES PROFESSIONNELS ============
const SCOPES = ["checklist","drive","agenda"];
async function myPros() {
  const sb = H.sb, me = H.me;
  view.innerHTML = `<section class="page"><h1>⚖️ ${esc(t("pa_title"))}</h1><p class="lead">${esc(t("pa_intro"))}</p>
    <p class="notice small">🔒 ${esc(t("pa_privacy"))}</p>
    <section class="card"><h2>${esc(t("pa_add"))}</h2><input id="pas" type="search" placeholder="${esc(t("pa_search"))}"><ul class="iresults" id="pares"></ul></section>
    <h2>${esc(t("pa_current"))}</h2><div id="palist"><p>${esc(t("loading"))}</p></div>
    <h2>${esc(t("pa_log"))}</h2><div id="palog"></div></section>`;
  const load = async () => {
    const { data: acc } = await sb.from("client_access").select("*").eq("client_id", me.id);
    const people = await H.profilesFor((acc || []).map(a => a.pro_id));
    $("#palist").innerHTML = (acc || []).length ? `<ul class="admin-list">${acc.map(a => { const p = people[a.pro_id] || { display_name:"?" }; return `<li><div>${avatar(p, "tiny")} <strong>${esc(p.display_name)}</strong> <span class="tag ${a.status === "active" ? "st-going" : ""}">${esc(t("pa_" + a.status))}</span>
      <p class="small">${SCOPES.map(s => `<label class="check small"><input type="checkbox" data-scope="${s}" data-pro="${a.pro_id}" ${a.scopes.includes(s) ? "checked" : ""}> ${esc(t("pa_s_" + s))}</label>`).join(" ")}</p></div>
      <div class="actions">${a.status === "active" ? `<button class="btn small danger" data-rev="${a.pro_id}">${esc(t("pa_revoke"))}</button>` : `<button class="btn small" data-act="${a.pro_id}">${esc(t("pa_reactivate"))}</button>`}<button class="linkbtn small" data-del="${a.pro_id}">${esc(t("delete"))}</button></div></li>`; }).join("")}</ul>` : `<p class="empty">${esc(t("pa_none"))}</p>`;
    $$("[data-scope]", view).forEach(c => c.onchange = async () => { const a = acc.find(x => x.pro_id === c.dataset.pro); const sc = new Set(a.scopes); c.checked ? sc.add(c.dataset.scope) : sc.delete(c.dataset.scope); await sb.from("client_access").update({ scopes: [...sc] }).eq("client_id", me.id).eq("pro_id", a.pro_id); load(); });
    $$("[data-rev]", view).forEach(x => x.onclick = async () => { await sb.from("client_access").update({ status:"revoked" }).eq("client_id", me.id).eq("pro_id", x.dataset.rev); load(); });
    $$("[data-act]", view).forEach(x => x.onclick = async () => { await sb.from("client_access").update({ status:"active" }).eq("client_id", me.id).eq("pro_id", x.dataset.act); load(); });
    $$("[data-del]", view).forEach(x => x.onclick = async () => { if (!confirm(t("confirm_delete"))) return; await sb.from("client_access").delete().eq("client_id", me.id).eq("pro_id", x.dataset.del); load(); });
    const { data: log } = await sb.from("access_log").select("*").eq("client_id", me.id).order("created_at", { ascending:false }).limit(30);
    $("#palog").innerHTML = (log || []).length ? `<ul class="threads">${log.map(l => `<li><span>${esc((people[l.pro_id] || {}).display_name || "?")} · ${esc(t("pa_act_" + l.action.split(":")[0]) || l.action)}</span><span class="small muted">${esc(dateTime(l.created_at))}</span></li>`).join("")}</ul>` : `<p class="muted small">${esc(t("pa_log_none"))}</p>`;
  };
  let tm; $("#pas").oninput = () => { clearTimeout(tm); tm = setTimeout(async () => {
    const q = $("#pas").value.trim().replace(/[%_,()]/g, ""); if (q.length < 2) { $("#pares").innerHTML = ""; return; }
    const { data } = await sb.from("profiles").select("id,display_name,avatar_url,city,pro_title").eq("pro_status", "verified").ilike("display_name", `%${q}%`).limit(8);
    $("#pares").innerHTML = (data || []).filter(x => x.id !== me.id).map(x => `<li>${avatar(x, "tiny")} <span>${esc(x.display_name)} <span class="muted small">${esc(t("ct_" + x.pro_title) || "")} ${esc(x.city || "")}</span></span><button class="btn small primary" data-grant="${x.id}">${esc(t("pa_grant"))}</button></li>`).join("") || `<li class="muted small">${esc(t("no_match"))}</li>`;
    $$("[data-grant]", view).forEach(x => x.onclick = async () => { if (!confirm(t("pa_confirm"))) return; const { error } = await sb.from("client_access").upsert({ client_id: me.id, pro_id: x.dataset.grant, status:"active", scopes: SCOPES }); if (error) return toast(errMsg(error)); $("#pares").innerHTML = ""; $("#pas").value = ""; load(); });
  }, 250); };
  load();
}
async function myClients() {
  const p = H.myProfile || {};
  if (p.pro_status !== "verified") { view.innerHTML = `<section class="narrow"><h1>${esc(t("pc_title"))}</h1><p class="notice">${esc(t("pc_not_verified"))}</p><a class="btn" href="#/mon-profil">${esc(t("nav_profile"))}</a></section>`; return; }
  const { data: acc } = await H.sb.from("client_access").select("*").eq("pro_id", H.me.id).eq("status", "active");
  const people = await H.profilesFor((acc || []).map(a => a.client_id));
  view.innerHTML = `<section class="page"><h1>💼 ${esc(t("pc_title"))}</h1><p class="lead">${esc(t("pc_intro"))}</p>
    ${(acc || []).length ? `<div class="members">${acc.map(a => { const c = people[a.client_id] || { display_name:"?" }; return `<a class="member" href="#/mes-clients/${a.client_id}">${avatar(c)}<div class="member-body"><h3>${esc(c.display_name)}</h3><p class="small muted">${a.scopes.map(s => esc(t("pa_s_" + s))).join(" · ")}</p></div></a>`; }).join("")}</div>` : `<p class="empty">${esc(t("pc_none"))}</p>`}</section>`;
}
async function clientFile(cid) {
  const sb = H.sb;
  const { data: a } = await sb.from("client_access").select("*").eq("client_id", cid).eq("pro_id", H.me.id).eq("status", "active").maybeSingle();
  if (!a) { location.hash = "#/mes-clients"; return; }
  const { data: c } = await sb.from("profiles").select("*").eq("id", cid).maybeSingle();
  sb.from("access_log").insert({ client_id: cid, pro_id: H.me.id, action: "view" }).then(() => {});
  view.innerHTML = `<section class="page"><a class="back" href="#/mes-clients">${esc(t("back"))}</a><div class="profile-head">${avatar(c || {}, "big")}<div><h1>${esc((c || {}).display_name || "?")}</h1><p class="muted small">${esc(t("pc_file"))}</p></div></div>
    ${a.scopes.includes("checklist") ? `<section class="card"><h2>✅ ${esc(t("gtab_checklist"))}</h2><div id="pcck"></div></section>` : ""}
    ${a.scopes.includes("drive") ? `<section class="card"><h2>📁 ${esc(t("drive_title"))}</h2><div id="pcdocs"><p class="muted small">${esc(t("loading"))}</p></div></section>` : ""}
    ${a.scopes.includes("agenda") ? `<section class="card"><h2>📅 ${esc(t("agenda_title"))}</h2><div id="pcag"></div>
      <form id="pcrem" class="stack"><strong>${esc(t("pc_add_rem"))}</strong><input id="pcrt" required maxlength="140" placeholder="${esc(t("rem_title"))}"><div class="grid"><input id="pcrd" type="date" required><input id="pcrh" type="time"></div><textarea id="pcrn" rows="2" maxlength="1000" placeholder="${esc(t("rem_note"))}"></textarea><button class="btn small primary">${esc(t("rem_save"))}</button></form></section>` : ""}
  </section>`;
  if ($("#pcck")) {
    const prog = (c && c.guide_progress) || {}, eu = c && c.nationality ? (window.EU_CODES || []).includes(c.nationality) : null;
    const items = (window.CHECKLIST || []).filter(x => x.when(c || {}, eu));
    $("#pcck").innerHTML = `<p class="progress"><span class="bar"><span style="width:${items.length ? Math.round(items.filter(x => prog["c_" + x.id]).length / items.length * 100) : 0}%"></span></span></p><ul class="checklist">${items.map(x => `<li class="${prog["c_" + x.id] ? "done" : ""}">${prog["c_" + x.id] ? "✅" : "⬜"} <span>${esc(x.t[H.lang] || x.t.en)}</span></li>`).join("")}</ul>`;
  }
  if ($("#pcdocs")) {
    const { data: docs } = await sb.from("documents").select("id,name,category,created_at,size_bytes").eq("owner_id", cid).order("created_at", { ascending:false });
    $("#pcdocs").innerHTML = (docs || []).length ? `<ul class="docs">${docs.map(d => `<li><span class="doc-ico">📄</span><div><strong>${esc(d.name)}</strong><p class="small muted">${esc(t("dc_" + d.category))} · ${esc(date(d.created_at))}</p></div><button class="btn small" data-pdoc="${d.id}">${esc(t("drive_open"))}</button></li>`).join("")}</ul>` : `<p class="muted small">${esc(t("drive_empty"))}</p>`;
    $$("[data-pdoc]", view).forEach(x => x.onclick = async () => {
      const w = window.open("", "_blank");
      try { const { data: { session } } = await sb.auth.getSession();
        const r = await fetch("/.netlify/functions/pro-files", { method:"POST", headers:{ "Content-Type":"application/json", Authorization:"Bearer " + session.access_token }, body: JSON.stringify({ action:"client_doc", doc_id: x.dataset.pdoc }) });
        const d = await r.json(); if (!d.url) throw 0; if (w) w.location = d.url; else location.href = d.url; }
      catch (e) { if (w) w.close(); toast(t("sp_dl_error")); }
    });
  }
  if ($("#pcag")) {
    const loadAg = async () => {
      const { data: rem } = await sb.from("reminders").select("*").eq("owner_id", cid).gte("starts_at", new Date(Date.now() - 86400e3).toISOString()).order("starts_at").limit(30);
      $("#pcag").innerHTML = (rem || []).length ? `<ul class="threads">${rem.map(r => `<li><strong>${esc(r.title)}</strong><span class="small muted">${esc(r.all_day ? date(r.starts_at) : dateTime(r.starts_at))}</span></li>`).join("")}</ul>` : `<p class="muted small">${esc(t("ag_empty"))}</p>`;
    };
    loadAg();
    $("#pcrem").onsubmit = async e => {
      e.preventDefault(); const tm = $("#pcrh").value, start = new Date(`${$("#pcrd").value}T${tm || "12:00"}`);
      const { data: r, error } = await sb.from("reminders").insert({ owner_id: H.me.id, title: $("#pcrt").value.trim(), note: $("#pcrn").value.trim() || null, starts_at: start.toISOString(), all_day: !tm, remind_minutes: 1440 }).select().single();
      if (error) return toast(errMsg(error));
      const { error: e2 } = await sb.from("reminder_shares").insert({ reminder_id: r.id, user_id: cid });
      if (e2) return toast(errMsg(e2));
      e.target.reset(); toast(t("rem_saved"));
    };
  }
}
});
