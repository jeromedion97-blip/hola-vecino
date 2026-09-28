// Rubrique « Présentations » : se présenter, publier des photos, commenter, réagir
(window.HV_EXT = window.HV_EXT || []).push((H, ROUTES) => {
const { t, esc, nl2br, $, $$, toast, date, dateTime, avatar, badges, errMsg } = H;
const view = H.view;
const PAGE = 30;
ROUTES.unshift(
  [/^#\/voisins$/, () => wall({}), true],
  [/^#\/voisins\/membre\/([\w-]+)$/, m => wall({ author: m[1] }), true],
  [/^#\/voisins\/(\d+)$/, m => wall({ post: +m[1] }), true]
);

// ---------- Photos : réduction avant envoi (1280 px, JPEG) ----------
async function shrink(file) {
  const img = await createImageBitmap(file);
  const r = Math.min(1, 1280 / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return await new Promise(res => c.toBlob(res, "image/jpeg", .82));
}
const pathOf = url => { const i = (url || "").indexOf("/photos/"); return i >= 0 ? decodeURIComponent(url.slice(i + 8).split("?")[0]) : null; };

// ---------- Visionneuse ----------
function lightbox(list, start) {
  let i = start;
  const box = document.createElement("div"); box.className = "lightbox"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
  const draw = () => { box.innerHTML = `<button class="lb-close" aria-label="${esc(t("close"))}">×</button>${list.length > 1 ? `<button class="lb-prev" aria-label="‹">‹</button><button class="lb-next" aria-label="›">›</button>` : ""}<img src="${esc(list[i])}" alt="">`; };
  const close = () => { box.remove(); document.removeEventListener("keydown", key); };
  const key = e => { if (e.key === "Escape") close(); if (e.key === "ArrowRight") { i = (i + 1) % list.length; draw(); } if (e.key === "ArrowLeft") { i = (i - 1 + list.length) % list.length; draw(); } };
  box.onclick = e => {
    if (e.target.closest(".lb-next")) { i = (i + 1) % list.length; draw(); return; }
    if (e.target.closest(".lb-prev")) { i = (i - 1 + list.length) % list.length; draw(); return; }
    if (e.target.tagName !== "IMG") close();
  };
  document.addEventListener("keydown", key); draw(); document.body.appendChild(box);
}

// ---------- Fil ----------
let tab = "all", myCity = false;
async function wall(opts) {
  const sb = H.sb, me = H.me, p = H.myProfile || {};
  const { data: mine } = await sb.from("posts").select("id").eq("author_id", me.id).eq("kind", "intro").limit(1);
  const hasIntro = (mine || []).length > 0;
  let authorName = "";
  if (opts.author) { const { data } = await sb.from("profiles").select("display_name").eq("id", opts.author).maybeSingle(); authorName = data ? data.display_name : ""; }

  view.innerHTML = `<section class="page wall">
    ${opts.post || opts.author ? `<a class="back" href="#/voisins">${esc(t("back"))}</a>` : ""}
    <h1>${esc(opts.author ? `${t("wall_member_posts")} : ${authorName}` : t("wall_title"))}</h1>
    ${opts.post || opts.author ? "" : `<p class="lead">${esc(t("wall_intro"))}</p>
    ${hasIntro ? "" : `<div class="intro-cta"><span class="intro-wave" aria-hidden="true">👋</span><div><strong>${esc(t("wall_intro_cta_t"))}</strong><p>${esc(t("wall_intro_cta_d"))}</p><button class="btn primary" id="startintro">${esc(t("wall_intro_btn"))}</button></div></div>`}
    <form id="pf" class="composer-card">
      <div class="composer-head">${avatar(p, "tiny")}<label class="sr" for="pbody">${esc(t("wall_write"))}</label>
        <textarea id="pbody" rows="3" maxlength="3000" placeholder="${esc(t("wall_write"))}" required></textarea></div>
      <div class="thumbs" id="pthumbs"></div>
      <div class="composer-actions">
        <label class="btn small" for="pphotos">📷 ${esc(t("wall_photos"))}</label><input id="pphotos" type="file" accept="image/*" multiple class="sr">
        <label class="check small"><input type="checkbox" id="pintro" ${hasIntro ? "" : "checked"}> ${esc(t("wall_is_intro"))}</label>
        <span class="msg small" role="status"></span>
        <button class="btn primary">${esc(t("wall_publish"))}</button>
      </div>
    </form>
    <p class="muted small">🔒 ${esc(t("wall_privacy"))}</p>
    <div class="tools">
      <nav class="tabs">${["all", "intro", "photos"].map(k => `<button data-tab="${k}" ${tab === k ? 'aria-pressed="true"' : ""}>${esc(t("wall_tab_" + k))}</button>`).join("")}</nav>
      ${p.city ? `<label class="check small"><input type="checkbox" id="pcity" ${myCity ? "checked" : ""}> ${esc(t("wall_my_city"))} : ${esc(p.city)}</label>` : ""}
    </div>
    ${H.searchBox("pq")}`}
    <div id="feed"><p>${esc(t("loading"))}</p></div>
    <div class="actions" id="morewrap" hidden><button class="btn" id="more">${esc(t("wall_more"))}</button></div>
  </section>`;

  // ---- Rédaction d'une publication ----
  let files = [];
  const F = $("#pf");
  if (F) {
    const drawThumbs = () => { $("#pthumbs").innerHTML = files.map((f, i) => `<span class="thumb"><img src="${URL.createObjectURL(f)}" alt=""><button type="button" data-rm="${i}" aria-label="×">×</button></span>`).join(""); $$("[data-rm]", F).forEach(b => b.onclick = () => { files.splice(+b.dataset.rm, 1); drawThumbs(); }); };
    $("#pphotos").onchange = e => {
      const add = [...e.target.files].filter(f => f.type.startsWith("image/"));
      if (files.length + add.length > 4) toast(t("wall_too_many"));
      files = files.concat(add).slice(0, 4); e.target.value = ""; drawThumbs();
    };
    const si = $("#startintro");
    if (si) si.onclick = () => { $("#pintro").checked = true; const b = $("#pbody"); if (!b.value) b.value = t("wall_intro_template"); b.focus(); b.scrollIntoView({ behavior:"smooth", block:"center" }); };
    F.onsubmit = async e => {
      e.preventDefault();
      const body = $("#pbody").value.trim(), msg = $(".msg", F); if (!body) return;
      msg.textContent = t("wall_publishing");
      const urls = [];
      for (const [i, f] of files.entries()) {
        try {
          const blob = await shrink(f), path = `${me.id}/${Date.now()}-${i}.jpg`;
          const up = await sb.storage.from("photos").upload(path, blob, { contentType:"image/jpeg" });
          if (up.error) throw up.error;
          urls.push(sb.storage.from("photos").getPublicUrl(path).data.publicUrl);
        } catch (err) { msg.textContent = errMsg(err); return; }
      }
      const { error } = await sb.from("posts").insert({ author_id: me.id, kind: $("#pintro").checked ? "intro" : "post", body, city: p.city || null, photos: urls });
      if (error) {
        if (urls.length) await sb.storage.from("photos").remove(urls.map(pathOf).filter(Boolean));
        msg.textContent = (error.message || "").includes("POST_LIMIT") ? t("wall_limit") : errMsg(error); return;
      }
      files = []; wall(opts);
    };
    $$("[data-tab]", view).forEach(b => b.onclick = () => { tab = b.dataset.tab; wall(opts); });
    const pc = $("#pcity"); if (pc) pc.onchange = () => { myCity = pc.checked; wall(opts); };
  }

  // ---- Chargement du fil ----
  let posts = [], offset = 0;
  const load = async () => {
    let q = sb.from("posts").select("*").order("created_at", { ascending:false }).range(offset, offset + PAGE - 1);
    if (opts.post) q = sb.from("posts").select("*").eq("id", opts.post);
    else {
      if (opts.author) q = q.eq("author_id", opts.author);
      if (tab === "intro") q = q.eq("kind", "intro");
      if (tab === "photos") q = q.neq("photos", "{}");
      if (myCity && p.city) q = q.ilike("city", p.city);
    }
    const { data, error } = await q;
    if (error) { $("#feed").innerHTML = `<p class="notice">${esc(errMsg(error))}</p>`; return; }
    const rows = (data || []).filter(x => !H.blocks.has(x.author_id));
    const ids = rows.map(x => x.id);
    const [people, likes, comments] = await Promise.all([
      H.profilesFor(rows.map(x => x.author_id)),
      ids.length ? sb.from("post_likes").select("post_id,user_id").in("post_id", ids) : { data: [] },
      ids.length ? sb.from("post_comments").select("post_id").in("post_id", ids) : { data: [] }
    ]);
    rows.forEach(x => {
      const l = (likes.data || []).filter(k => k.post_id === x.id);
      x._author = people[x.author_id] || { display_name:"?" }; x._likes = l.length; x._liked = l.some(k => k.user_id === me.id);
      x._comments = (comments.data || []).filter(c => c.post_id === x.id).length;
    });
    posts = posts.concat(rows); offset += PAGE;
    $("#morewrap").hidden = !!opts.post || rows.length < PAGE;
    draw();
    if (opts.post && posts[0]) openComments(posts[0].id);
  };

  const card = x => `<article class="post-card" data-id="${x.id}">
    <header>${avatar(x._author)}<div><a href="#/profil/${x.author_id}"><strong>${esc(x._author.display_name)}</strong></a> ${badges(x._author)}
      <p class="small muted">${x.kind === "intro" ? `<span class="tag obj">${esc(t("wall_intro_tag"))}</span> ` : ""}${x.city ? esc(x.city) + " · " : ""}<a href="#/voisins/${x.id}" class="muted">${esc(dateTime(x.created_at))}</a></p></div></header>
    <p class="post-body">${nl2br(x.body)}</p>
    ${(x.photos || []).length ? `<div class="gallery g${Math.min(x.photos.length, 4)}">${x.photos.map((u, i) => `<button class="ph" data-ph="${i}"><img src="${esc(u)}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}
    <footer>
      <button class="ole ${x._liked ? "on" : ""}" data-like aria-pressed="${x._liked}">💃 ${esc(t("wall_ole"))} <strong>${x._likes || ""}</strong></button>
      <button class="linkbtn" data-com>💬 ${x._comments} ${esc(t("wall_comments"))}</button>
      <button class="linkbtn small" data-share>↗ ${esc(t("ev_share"))}</button>
      ${x.author_id === me.id || H.isAdmin ? `<button class="linkbtn small" data-del>${esc(t("delete"))}</button>` : `<button class="linkbtn small" data-rep>${esc(t("report"))}</button>`}
    </footer>
    <div class="comments" hidden></div>
  </article>`;

  const draw = () => {
    const q = $("#pq") ? H.norm($("#pq").value) : "";
    const shown = posts.filter(x => !q || H.norm(`${x.body} ${x._author.display_name} ${x.city || ""}`).includes(q));
    $("#feed").innerHTML = shown.length ? shown.map(card).join("") : `<p class="empty">${esc(q ? t("no_match") : t("wall_empty"))}</p>`;
    $$(".post-card", view).forEach(el => {
      const x = posts.find(y => String(y.id) === el.dataset.id);
      $$("[data-ph]", el).forEach(b => b.onclick = () => lightbox(x.photos, +b.dataset.ph));
      $("[data-like]", el).onclick = async () => {
        const { error } = x._liked ? await sb.from("post_likes").delete().eq("post_id", x.id).eq("user_id", me.id) : await sb.from("post_likes").insert({ post_id: x.id, user_id: me.id });
        if (error) return toast(errMsg(error));
        x._liked = !x._liked; x._likes += x._liked ? 1 : -1; draw();
      };
      $("[data-com]", el).onclick = () => openComments(x.id);
      $("[data-share]", el).onclick = () => H.share(C_NAME(), location.href.split("#")[0] + "#/voisins/" + x.id);
      const d = $("[data-del]", el); if (d) d.onclick = async () => {
        if (!confirm(t("confirm_delete"))) return;
        const { error } = await sb.from("posts").delete().eq("id", x.id); if (error) return toast(errMsg(error));
        if (x.author_id === me.id && (x.photos || []).length) await sb.storage.from("photos").remove(x.photos.map(pathOf).filter(Boolean));
        posts = posts.filter(y => y.id !== x.id); draw();
      };
      const r = $("[data-rep]", el); if (r) r.onclick = () => H.report("post", x.id);
    });
  };
  const C_NAME = () => H.C.APP_NAME;

  async function openComments(id) {
    const el = $(`.post-card[data-id="${id}"]`, view); if (!el) return;
    const box = $(".comments", el);
    if (!box.hidden && !opts.post) { box.hidden = true; return; }
    box.hidden = false; box.innerHTML = `<p class="small muted">${esc(t("loading"))}</p>`;
    const { data } = await sb.from("post_comments").select("*").eq("post_id", id).order("created_at");
    const rows = (data || []).filter(c => !H.blocks.has(c.author_id));
    const people = await H.profilesFor(rows.map(c => c.author_id));
    box.innerHTML = `${rows.map(c => { const a = people[c.author_id] || { display_name:"?" }; return `<div class="comment">${avatar(a, "tiny")}<div><a href="#/profil/${c.author_id}"><strong>${esc(a.display_name)}</strong></a> <span class="muted small">${esc(dateTime(c.created_at))}</span><p>${nl2br(c.body)}</p>${c.author_id === me.id || H.isAdmin ? `<button class="linkbtn small" data-cdel="${c.id}">${esc(t("delete"))}</button>` : ""}</div></div>`; }).join("")}
      <form class="comment-form">${avatar(H.myProfile || {}, "tiny")}<label class="sr" for="c${id}">${esc(t("wall_write_comment"))}</label><input id="c${id}" maxlength="1000" placeholder="${esc(t("wall_write_comment"))}" required><button class="btn small primary">${esc(t("wall_comment"))}</button></form>`;
    $$("[data-cdel]", box).forEach(b => b.onclick = async () => { if (!confirm(t("confirm_delete"))) return; await sb.from("post_comments").delete().eq("id", b.dataset.cdel); box.hidden = true; openComments(id); });
    $(".comment-form", box).onsubmit = async e => {
      e.preventDefault(); const input = $("input", e.target), body = input.value.trim(); if (!body) return;
      const { error } = await sb.from("post_comments").insert({ post_id: id, author_id: me.id, body });
      if (error) return toast(errMsg(error));
      const x = posts.find(y => y.id === id); if (x) x._comments++;
      $("[data-com]", el).innerHTML = `💬 ${x ? x._comments : ""} ${esc(t("wall_comments"))}`;
      box.hidden = true; openComments(id);
    };
  }

  const pq = $("#pq"); if (pq) pq.addEventListener("input", draw);
  $("#more").onclick = load;
  load();
}

// Lien « Ses publications » sur chaque profil
(window.HV_HOOKS = window.HV_HOOKS || {}).profile = (window.HV_HOOKS.profile || []).concat([p => {
  const page = $(".page", view); if (!page) return;
  page.insertAdjacentHTML("beforeend", `<p><a class="btn small" href="#/voisins/membre/${p.id}">📸 ${esc(t("wall_member_posts"))}</a></p>`);
}]);

// Tableau de bord : derniers partages
(window.HV_HOOKS.dashboard = window.HV_HOOKS.dashboard || []).push(async () => {
  const main = $(".dash-main", view); if (!main) return;
  const { data } = await H.sb.from("posts").select("id,author_id,body,photos,created_at").order("created_at", { ascending:false }).limit(4);
  const rows = (data || []).filter(x => !H.blocks.has(x.author_id)); if (!rows.length) return;
  const people = await H.profilesFor(rows.map(x => x.author_id));
  main.insertAdjacentHTML("beforeend", `<section class="dash-block"><div class="titlebar"><h2>${esc(t("dash_wall"))}</h2><a class="small" href="#/voisins">${esc(t("dash_see_all"))}</a></div>
    <div class="mini-posts">${rows.map(x => `<a class="mini-post" href="#/voisins/${x.id}">${(x.photos || [])[0] ? `<img src="${esc(x.photos[0])}" alt="" loading="lazy">` : `<span class="mini-txt">${esc(x.body.slice(0, 90))}</span>`}<span class="small"><strong>${esc((people[x.author_id] || {}).display_name || "?")}</strong></span></a>`).join("")}</div></section>`);
});
});
