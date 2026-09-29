// Amis (demandes, liste) et bulle de messagerie accessible depuis toutes les pages
(window.HV_EXT = window.HV_EXT || []).push((H, ROUTES) => {
const { t, esc, nl2br, $, $$, toast, dateTime, avatar, badges, errMsg } = H;
const view = H.view;
ROUTES.unshift([/^#\/amis$/, () => friendsPage(), true]);

// ---------- Données d'amitié ----------
async function myLinks() {
  const me = H.me.id;
  const { data } = await H.sb.from("friendships").select("*").or(`requester_id.eq.${me},addressee_id.eq.${me}`);
  const rows = data || [];
  return {
    rows,
    friends: rows.filter(r => r.status === "accepted").map(r => r.requester_id === me ? r.addressee_id : r.requester_id),
    received: rows.filter(r => r.status === "pending" && r.addressee_id === me).map(r => r.requester_id),
    sent: rows.filter(r => r.status === "pending" && r.requester_id === me).map(r => r.addressee_id)
  };
}
H.friendIds = async () => (await myLinks()).friends;
const pair = other => `and(requester_id.eq.${H.me.id},addressee_id.eq.${other}),and(requester_id.eq.${other},addressee_id.eq.${H.me.id})`;
const addFriend = other => H.sb.from("friendships").insert({ requester_id: H.me.id, addressee_id: other });
const accept = other => H.sb.from("friendships").update({ status: "accepted" }).eq("requester_id", other).eq("addressee_id", H.me.id);
const removeLink = other => H.sb.from("friendships").delete().or(pair(other));

// ---------- Page « Mes amis » ----------
let ftab = "friends";
async function friendsPage() {
  view.innerHTML = `<section class="page"><h1>${esc(t("fr_title"))}</h1>
    <nav class="tabs" id="ftabs"></nav>${H.searchBox("fq")}<div id="flist"><p>${esc(t("loading"))}</p></div></section>`;
  const L = await myLinks();
  const ids = ftab === "friends" ? L.friends : ftab === "received" ? L.received : L.sent;
  $("#ftabs").innerHTML = [["friends", "fr_friends", L.friends.length], ["received", "fr_received", L.received.length], ["sent", "fr_sent", L.sent.length]]
    .map(([k, lab, n]) => `<button data-t="${k}" ${ftab === k ? 'aria-pressed="true"' : ""}>${esc(t(lab))} <span class="badge" ${n ? "" : "hidden"}>${n}</span></button>`).join("");
  $$("#ftabs button").forEach(b => b.onclick = () => { ftab = b.dataset.t; friendsPage(); });
  const { data } = ids.length ? await H.sb.from("profiles").select("id,display_name,avatar_url,city,origin_country,verified,is_guide").in("id", ids) : { data: [] };
  const people = (data || []).filter(p => !H.blocks.has(p.id));
  const draw = () => {
    const q = H.norm($("#fq").value);
    const shown = people.filter(p => !q || H.norm(`${p.display_name} ${p.city || ""}`).includes(q));
    $("#flist").innerHTML = shown.length ? `<div class="members">${shown.map(p => `<article class="member">${avatar(p)}
      <div class="member-body"><h3><a href="#/profil/${p.id}">${esc(p.display_name)}</a></h3><p class="tags">${badges(p)}</p><p class="muted small">${esc([p.city, p.origin_country ? H.dn("region", p.origin_country) : ""].filter(Boolean).join(" · "))}</p></div>
      <div class="actions">${ftab === "friends" ? `<button class="btn small primary" data-msg="${p.id}">💬 ${esc(t("send_message"))}</button><button class="linkbtn small" data-rm="${p.id}">${esc(t("fr_remove"))}</button>`
        : ftab === "received" ? `<button class="btn small primary" data-ok="${p.id}">${esc(t("fr_accept"))}</button><button class="linkbtn small" data-no="${p.id}">${esc(t("fr_decline"))}</button>`
        : `<button class="linkbtn small" data-no="${p.id}">${esc(t("fr_cancel"))}</button>`}</div></article>`).join("")}</div>`
      : `<p class="empty">${esc(q ? t("no_match") : ftab === "friends" ? t("fr_none") : t("fr_no_requests"))}</p>`;
    $$("[data-msg]", view).forEach(b => b.onclick = () => chat.open(b.dataset.msg));
    $$("[data-ok]", view).forEach(b => b.onclick = async () => { const { error } = await accept(b.dataset.ok); if (error) return toast(errMsg(error)); ftab = "friends"; friendsPage(); });
    $$("[data-no]", view).forEach(b => b.onclick = async () => { await removeLink(b.dataset.no); friendsPage(); });
    $$("[data-rm]", view).forEach(b => b.onclick = async () => { if (!confirm(t("fr_remove_confirm"))) return; await removeLink(b.dataset.rm); friendsPage(); });
  };
  $("#fq").addEventListener("input", draw); draw();
}

// ---------- Bouton d'amitié sur les profils ----------
(window.HV_HOOKS = window.HV_HOOKS || {}).profile = (window.HV_HOOKS.profile || []).concat([async p => {
  const page = $(".page", view); if (!page) return;
  const { data: acc } = await H.sb.from("friendships").select("requester_id").eq("status", "accepted").or(`requester_id.eq.${p.id},addressee_id.eq.${p.id}`);
  const count = (acc || []).length;
  const head = $(".profile-head div", page);
  if (head) head.insertAdjacentHTML("beforeend", `<p class="small muted">👥 ${count} ${esc(t("fr_count"))}</p>`);
  if (p.id === H.me.id || H.blocks.has(p.id)) return;
  const box = document.createElement("div"); box.className = "friend-box"; head ? head.appendChild(box) : page.appendChild(box);
  const render = async () => {
    const { data } = await H.sb.from("friendships").select("*").or(pair(p.id));
    const r = (data || [])[0];
    box.innerHTML = !r ? `<button class="btn small primary" data-f="add">➕ ${esc(t("fr_add"))}</button>`
      : r.status === "accepted" ? `<span class="tag st-going">✓ ${esc(t("fr_is_friend"))}</span> <button class="btn small" data-f="msg">💬 ${esc(t("send_message"))}</button>`
      : r.requester_id === H.me.id ? `<span class="tag">${esc(t("fr_pending_sent"))}</span> <button class="linkbtn small" data-f="rm">${esc(t("fr_cancel"))}</button>`
      : `<span class="small">${esc(p.display_name)} ${esc(t("fr_wants"))}</span> <button class="btn small primary" data-f="ok">${esc(t("fr_accept"))}</button> <button class="linkbtn small" data-f="rm">${esc(t("fr_decline"))}</button>`;
    $$("[data-f]", box).forEach(b => b.onclick = async () => {
      const a = b.dataset.f;
      if (a === "msg") return chat.open(p.id);
      const { error } = a === "add" ? await addFriend(p.id) : a === "ok" ? await accept(p.id) : await removeLink(p.id);
      if (error) toast(errMsg(error)); render();
    });
  };
  render();
}]);

// ============ BULLE DE MESSAGERIE ============
const chat = (() => {
  let fab = null, panel = null, other = null, channel = null, uid = null;
  const ensure = () => {
    const me = H.me;
    if (!me || !H.myProfile) { if (fab) { fab.remove(); panel.remove(); fab = panel = null; } if (channel) { H.sb.removeChannel(channel); channel = null; } uid = null; return; }
    if (fab && uid === me.id) return;
    uid = me.id;
    fab = document.createElement("button"); fab.className = "chat-fab"; fab.id = "chatfab"; fab.setAttribute("aria-label", t("chat_open"));
    fab.innerHTML = `<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/></svg><span class="badge" id="chatbadge" hidden></span>`;
    panel = document.createElement("section"); panel.className = "chat-panel"; panel.hidden = true; panel.setAttribute("aria-label", t("chat_title"));
    document.body.append(fab, panel);
    fab.onclick = () => { if (panel.hidden) { panel.hidden = false; other ? openConv(other) : list(); } else panel.hidden = true; };
    channel = H.sb.channel("chat-" + me.id + "-" + Date.now())
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"messages", filter:`recipient_id=eq.${me.id}` }, pl => {
        if (!panel.hidden && other === pl.new.sender_id) { addBubble(pl.new); markRead(other); }
        else if (!panel.hidden && !other) list();
        H.refreshCounts();
      }).subscribe();
    H.refreshCounts();
  };
  const head = (title, back) => `<header class="chat-head">${back ? `<button class="chat-icon" data-back aria-label="${esc(t("chat_back"))}">‹</button>` : ""}<strong>${title}</strong><a class="chat-icon small" href="#/messages" title="${esc(t("messages_title"))}">⤢</a><button class="chat-icon" data-close aria-label="${esc(t("close"))}">×</button></header>`;
  const wire = () => { const c = $("[data-close]", panel); if (c) c.onclick = () => { panel.hidden = true; }; const b = $("[data-back]", panel); if (b) b.onclick = () => { other = null; list(); }; };
  async function list() {
    other = null;
    const me = H.me.id;
    panel.innerHTML = head(esc(t("chat_title"))) + `<div class="chat-body"><p class="muted small">${esc(t("loading"))}</p></div>`; wire();
    const [{ data: msgs }, friends] = await Promise.all([
      H.sb.from("messages").select("*").or(`sender_id.eq.${me},recipient_id.eq.${me}`).order("created_at", { ascending:false }).limit(300),
      H.friendIds()
    ]);
    const convs = new Map();
    (msgs || []).forEach(m => { const o = m.sender_id === me ? m.recipient_id : m.sender_id; if (H.blocks.has(o)) return; if (!convs.has(o)) convs.set(o, { last:m, unread:0 }); if (m.recipient_id === me && !m.read) convs.get(o).unread++; });
    const people = await H.profilesFor([...convs.keys(), ...friends]);
    const quick = friends.filter(f => !convs.has(f) && people[f]).slice(0, 8);
    const { data: gm } = await H.sb.from("group_members").select("group_id").eq("user_id", me).eq("status", "member");
    const gids = (gm || []).map(x => x.group_id);
    const { data: grs } = gids.length ? await H.sb.from("groups").select("id,name").in("id", gids).limit(12) : { data: [] };
    $(".chat-body", panel).innerHTML = `${quick.length ? `<p class="chat-label">${esc(t("chat_new"))}</p><div class="chat-friends">${quick.map(f => `<button data-o="${f}" title="${esc(people[f].display_name)}">${avatar(people[f])}<span>${esc(people[f].display_name.split(" ")[0])}</span></button>`).join("")}</div>` : ""}
      ${(grs || []).length ? `<p class="chat-label">👥 ${esc(t("nav_groups"))}</p><div class="chat-groups">${grs.map(g => `<a class="chip-btn" href="#/groupes/${g.id}" data-close-chat>${esc(g.name)}</a>`).join("")}</div>` : ""}
      ${convs.size ? `<ul class="chat-convs">${[...convs].map(([o, c]) => { const p = people[o] || { display_name:"?" }; return `<li><button data-o="${o}">${avatar(p, "tiny")}<span class="cc-body"><strong>${esc(p.display_name)}</strong><span class="muted small">${esc(c.last.body.slice(0, 60))}</span></span>${c.unread ? `<span class="badge">${c.unread}</span>` : ""}</button></li>`; }).join("")}</ul>` : `<p class="empty small">${esc(t("chat_empty"))}</p>`}`;
    $$("[data-o]", panel).forEach(b => b.onclick = () => openConv(b.dataset.o));
    $$("[data-close-chat]", panel).forEach(a => a.addEventListener("click", () => { panel.hidden = true; }));
  }
  const addBubble = m => { const box = $(".chat-bubbles", panel); if (!box) return; box.insertAdjacentHTML("beforeend", `<div class="bubble ${m.sender_id === H.me.id ? "mine" : ""}"><p>${nl2br(m.body)}</p><time>${esc(dateTime(m.created_at))}</time></div>`); box.scrollTop = box.scrollHeight; };
  const markRead = async o => { await H.sb.from("messages").update({ read:true }).eq("recipient_id", H.me.id).eq("sender_id", o).eq("read", false); H.refreshCounts(); };
  async function openConv(o) {
    other = o; panel.hidden = false;
    const { data: p } = await H.sb.from("profiles").select("id,display_name,avatar_url").eq("id", o).maybeSingle();
    if (!p) { list(); return; }
    panel.innerHTML = head(`<a href="#/profil/${p.id}">${avatar(p, "tiny")} ${esc(p.display_name)}</a>`, true) +
      `<div class="chat-bubbles bubbles"></div>
       ${H.blocks.has(o) ? `<p class="notice small">${esc(t("blocked_notice"))}</p>` : `<form class="chat-compose"><label class="sr" for="chatin">${esc(t("write_message"))}</label><textarea id="chatin" rows="1" maxlength="3000" placeholder="${esc(t("write_message"))}"></textarea><button class="btn small primary" aria-label="${esc(t("send"))}">➤</button></form>`}`;
    wire();
    const me = H.me.id;
    const { data } = await H.sb.from("messages").select("*").or(`and(sender_id.eq.${me},recipient_id.eq.${o}),and(sender_id.eq.${o},recipient_id.eq.${me})`).order("created_at").limit(300);
    (data || []).forEach(addBubble); markRead(o);
    const form = $(".chat-compose", panel); if (!form) return;
    const ta = $("#chatin", panel); ta.focus();
    ta.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
    form.onsubmit = async e => {
      e.preventDefault(); const body = ta.value.trim(); if (!body) return;
      const { data: m, error } = await H.sb.from("messages").insert({ sender_id: me, recipient_id: o, body }).select().single();
      if (error) return toast((error.message || "").includes("row-level security") ? t("cannot_send") : errMsg(error));
      ta.value = ""; addBubble(m);
    };
  }
  return { ensure, open: o => { ensure(); if (panel) openConv(o); } };
})();
H.openChat = chat.open;
(window.HV_HOOKS.header = window.HV_HOOKS.header || []).push(() => chat.ensure());
});
