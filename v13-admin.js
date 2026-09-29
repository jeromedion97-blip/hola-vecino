// v13 : espace « Pilotage » de l'administrateur — membres, message de bienvenue et annonces, idées et analyses de l'IA
(window.HV_EXT = window.HV_EXT || []).push((H, ROUTES) => {
const { t, esc, nl2br, $, $$, toast, date, dateTime, avatar, errMsg } = H;
const view = H.view;
ROUTES.unshift([/^#\/admin\/pilotage(?:\/(\w+))?$/, m => pilot(m[1] || "membres"), true]);
const LANGS = ["fr", "en", "es", "de", "nl"];

async function pilot(tab) {
  if (!H.isAdmin) { view.innerHTML = `<section class="narrow"><p class="notice">${esc(t("adm_denied"))}</p></section>`; return; }
  view.innerHTML = `<section class="page wide"><a class="back" href="#/admin">${esc(t("back"))}</a><h1>🧭 ${esc(t("ap_title"))}</h1>
    <nav class="tabs">${[["membres", "ap_tab_members"], ["bienvenue", "ap_tab_welcome"], ["idees", "ap_tab_ideas"]].map(([k, l]) => `<a class="tabbtn" href="#/admin/pilotage/${k}" ${tab === k ? 'aria-current="page"' : ""}>${esc(t(l))}</a>`).join("")}</nav>
    <div id="ap"></div></section>`;
  if (tab === "bienvenue") return welcome($("#ap"));
  if (tab === "idees") return ideas($("#ap"));
  return members($("#ap"));
}

// ============ MEMBRES ============
let mFilter = "all", mSearch = "", mOffset = 0;
async function members(box) {
  box.innerHTML = `<div class="tools"><div class="searchbox"><input id="mq" type="search" placeholder="${esc(t("ap_search"))}" value="${esc(mSearch)}"></div>
    <nav class="tabs">${["all", "new", "premium", "inactive", "pro"].map(f => `<button data-f="${f}" ${mFilter === f ? 'aria-pressed="true"' : ""}>${esc(t("ap_f_" + f))}</button>`).join("")}</nav></div>
    <p class="small muted" id="mcount"></p><div id="mlist"><p>${esc(t("loading"))}</p></div>
    <div class="actions"><button class="btn small" id="mprev">‹</button><button class="btn small" id="mnext">›</button></div>`;
  const load = async () => {
    const { data, error } = await H.sb.rpc("admin_users", { p_search: mSearch, p_filter: mFilter, p_limit: 50, p_offset: mOffset });
    if (error) { $("#mlist").innerHTML = `<p class="notice">${esc(errMsg(error))}</p>`; return; }
    const rows = data.rows || [], now = new Date();
    $("#mcount").textContent = `${data.total} ${t("members")} · ${mOffset + 1}–${Math.min(mOffset + 50, data.total)}`;
    $("#mprev").disabled = mOffset === 0; $("#mnext").disabled = mOffset + 50 >= data.total;
    $("#mlist").innerHTML = rows.length ? `<ul class="admin-list member-admin">${rows.map(u => {
      const prem = u.premium_until && new Date(u.premium_until) > now;
      return `<li><div class="mu-main">${avatar(u, "tiny")} <div><a href="#/profil/${u.id}"><strong>${esc(u.display_name)}</strong></a>
          ${u.is_admin ? `<span class="tag obj">admin</span>` : ""}${u.verified ? `<span class="tag st-going">✓</span>` : ""}${prem ? `<span class="tag obj">★ ${esc(u.premium_plan === "all_in" ? t("allin_title") : "Premium")} → ${esc(date(u.premium_until))}</span>` : ""}${u.pro_status === "pending" ? `<span class="tag">⚖️ ${esc(t("pro_pending"))}</span>` : ""}
          <p class="small muted">${esc(u.email || "")} · ${esc([u.city, u.origin_country, (u.lang || "").toUpperCase()].filter(Boolean).join(" · "))}</p>
          <p class="small muted">${esc(t("ap_joined"))} ${esc(date(u.created_at))} · ${esc(t("ap_last"))} ${u.last_sign_in_at ? esc(dateTime(u.last_sign_in_at)) : "—"} · ⭐ ${u.points} · 📝 ${u.posts}</p></div></div>
        <div class="actions">
          <button class="btn small" data-msg="${u.id}">💬 ${esc(t("send_message"))}</button>
          <button class="btn small" data-prem="${u.id}" data-days="30">+30 j Premium</button>
          ${prem ? `<button class="linkbtn small" data-noprem="${u.id}">${esc(t("ap_remove_premium"))}</button>` : ""}
          <button class="linkbtn small" data-ver="${u.id}" data-v="${u.verified ? 1 : 0}">${esc(t(u.verified ? "adm_unverify" : "adm_verify"))}</button>
        </div></li>`; }).join("")}</ul>` : `<p class="empty">${esc(t("no_match"))}</p>`;
    $$("[data-msg]", box).forEach(b => b.onclick = () => H.openChat ? H.openChat(b.dataset.msg) : (location.hash = "#/messages"));
    $$("[data-prem]", box).forEach(b => b.onclick = async () => {
      const u = rows.find(x => x.id === b.dataset.prem);
      const base = u.premium_until && new Date(u.premium_until) > new Date() ? new Date(u.premium_until) : new Date();
      const { error } = await H.sb.from("profiles").update({ premium_until: new Date(base.getTime() + 30 * 86400e3).toISOString() }).eq("id", u.id);
      if (error) return toast(errMsg(error)); toast("✓"); load();
    });
    $$("[data-noprem]", box).forEach(b => b.onclick = async () => { if (!confirm(t("ap_remove_premium") + " ?")) return; const { error } = await H.sb.from("profiles").update({ premium_until: new Date().toISOString() }).eq("id", b.dataset.noprem); if (error) return toast(errMsg(error)); load(); });
    $$("[data-ver]", box).forEach(b => b.onclick = async () => { const { error } = await H.sb.from("profiles").update({ verified: b.dataset.v !== "1" }).eq("id", b.dataset.ver); if (error) return toast(errMsg(error)); load(); });
  };
  let tm; $("#mq").oninput = e => { clearTimeout(tm); tm = setTimeout(() => { mSearch = e.target.value.trim(); mOffset = 0; load(); }, 300); };
  $$("[data-f]", box).forEach(b => b.onclick = () => { mFilter = b.dataset.f; mOffset = 0; members(box); });
  $("#mprev").onclick = () => { mOffset = Math.max(0, mOffset - 50); load(); };
  $("#mnext").onclick = () => { mOffset += 50; load(); };
  load();
}

// ============ BIENVENUE ET ANNONCES ============
async function aiTranslate(text, to) {
  const { data: { session } } = await H.sb.auth.getSession();
  const r = await fetch("/.netlify/functions/ai", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token }, body: JSON.stringify({ mode: "translate", from: "fr", to, text, lang: "fr" }) });
  const d = await r.json().catch(() => ({})); if (!r.ok || !d.text) throw new Error(d.error || "HTTP " + r.status); return d.text;
}
function langEditor(prefix, values) {
  return `<nav class="tabs" id="${prefix}tabs">${LANGS.map((l, i) => `<button data-l="${l}" ${i === 0 ? 'aria-pressed="true"' : ""}>${esc(H.LANG_NAMES[l])}</button>`).join("")}</nav>
    <textarea id="${prefix}txt" rows="9" maxlength="3000"></textarea>`;
}
function bindLangEditor(prefix, values) {
  let cur = "fr"; const ta = $("#" + prefix + "txt");
  const show = () => { ta.value = values[cur] || ""; $$(`#${prefix}tabs button`).forEach(b => b.setAttribute("aria-pressed", String(b.dataset.l === cur))); };
  $$(`#${prefix}tabs button`).forEach(b => b.onclick = () => { values[cur] = ta.value; cur = b.dataset.l; show(); });
  show();
  return { keep: () => { values[cur] = ta.value; }, show };
}
async function translateAll(values, msgEl, ed) {
  ed.keep(); if (!(values.fr || "").trim()) return;
  for (const l of LANGS.filter(x => x !== "fr")) {
    msgEl.textContent = `${t("art_translating")} ${H.LANG_NAMES[l]}…`;
    try { values[l] = await aiTranslate(values.fr, l); } catch (e) { msgEl.innerHTML = `${esc(t("art_ai_error"))}<br><code>${esc(e.message)}</code>`; return; }
  }
  msgEl.textContent = "✓"; ed.show();
}
async function suggest(action, extra) {
  const { data: { session } } = await H.sb.auth.getSession();
  const r = await fetch("/.netlify/functions/admin-insights", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
    body: JSON.stringify({ action, name: ((H.myProfile || {}).display_name || "").split(" ")[0], lang: H.lang, ...extra }) });
  const d = await r.json().catch(() => ({})); if (!r.ok || !d.variants) throw new Error(d.error || "HTTP " + r.status); return d.variants;
}
function showVariants(el, variants, onPick) {
  el.innerHTML = `<p class="small muted">${esc(t("ap_pick"))}</p><div class="variants">${variants.map((v, i) => `<article class="variant"><p class="tag obj">${esc(v.label || "")}</p><p class="small">${nl2br(v.text)}</p><button class="btn small primary" data-pick="${i}">${esc(t("ap_use"))}</button></article>`).join("")}</div>`;
  $$("[data-pick]", el).forEach(b => b.onclick = () => { onPick(variants[+b.dataset.pick].text); el.innerHTML = `<p class="ok small">✓ ${esc(t("ap_picked"))}</p>`; });
}
async function welcome(box) {
  const { data: row } = await H.sb.from("site_settings").select("value,updated_at").eq("key", "welcome").maybeSingle();
  const cfg = (row && row.value) || { enabled: false, text: {} }; cfg.text = cfg.text || {};
  const { count } = await H.sb.from("profiles").select("id", { count: "exact", head: true });
  const bc = { fr: "", en: "", es: "", de: "", nl: "" };
  box.innerHTML = `<section class="card"><h2>👋 ${esc(t("ap_welcome_t"))}</h2><p class="small muted">${esc(t("ap_welcome_d"))}</p>
      <label class="check"><input type="checkbox" id="wen" ${cfg.enabled ? "checked" : ""}> ${esc(t("ap_welcome_on"))}</label>
      ${row && row.updated_at ? `<p class="small muted">${esc(t("ap_last_edit"))} ${esc(dateTime(row.updated_at))}</p>` : ""}
      <div class="actions"><button class="btn" id="wsug">✨ ${esc(t("ap_suggest"))}</button><span class="msg small" id="wsugmsg"></span></div><div id="wvar"></div>
      <p class="small">${esc(t("ap_placeholder"))}</p>${langEditor("w", cfg.text)}
      <div class="actions"><button class="btn" id="wtr">🌍 ${esc(t("art_translate"))}</button><button class="btn primary" id="wsave">${esc(t("art_save"))}</button><span class="msg small" id="wmsg"></span></div>
      <details><summary class="small">${esc(t("ap_preview"))}</summary><div class="bubble" id="wprev"></div></details></section>
    <section class="card"><h2>📣 ${esc(t("ap_broadcast_t"))}</h2><p class="small muted">${esc(t("ap_broadcast_d"))}</p>
      <div class="field"><label for="btopic">${esc(t("ap_bc_topic"))}</label><input id="btopic" maxlength="300" placeholder="${esc(t("ap_bc_topic_ph"))}"></div>
      <div class="actions"><button class="btn" id="bsug">✨ ${esc(t("ap_suggest"))}</button><span class="msg small" id="bsugmsg"></span></div><div id="bvar"></div>
      <p class="small">${esc(t("ap_placeholder"))}</p>${langEditor("b", bc)}
      <div class="actions"><button class="btn" id="btr">🌍 ${esc(t("art_translate"))}</button><button class="btn primary" id="bsend">📣 ${esc(t("ap_broadcast_btn"))} (${Math.max(0, (count || 1) - 1)})</button><span class="msg small" id="bmsg"></span></div></section>`;
  const we = bindLangEditor("w", cfg.text), be = bindLangEditor("b", bc);
  const preview = () => { we.keep(); $("#wprev").innerHTML = `<p>${nl2br((cfg.text.fr || "").replace(/\{prenom\}/g, ((H.myProfile || {}).display_name || "Marie").split(" ")[0]))}</p>`; };
  $("#wtxt").addEventListener("input", preview); preview();
  const toFr = (values, ed, prefix, text) => { values.fr = text; const fr = $(`#${prefix}tabs button[data-l="fr"]`); if (fr) fr.click(); $("#" + prefix + "txt").value = text; ed.keep(); };
  $("#wsug").onclick = async () => {
    we.keep(); $("#wsugmsg").textContent = t("ap_suggesting");
    try { const v = await suggest("welcome", { current: cfg.text.fr || "" }); $("#wsugmsg").textContent = ""; showVariants($("#wvar"), v, txt => { toFr(cfg.text, we, "w", txt); preview(); $("#wmsg").textContent = t("ap_then_translate"); }); }
    catch (e) { $("#wsugmsg").innerHTML = `${esc(t("art_ai_error"))}<br><code>${esc(e.message)}</code>`; }
  };
  $("#bsug").onclick = async () => {
    $("#bsugmsg").textContent = t("ap_suggesting");
    try { const v = await suggest("broadcast", { topic: $("#btopic").value.trim() }); $("#bsugmsg").textContent = ""; showVariants($("#bvar"), v, txt => { toFr(bc, be, "b", txt); $("#bmsg").textContent = t("ap_then_translate"); }); }
    catch (e) { $("#bsugmsg").innerHTML = `${esc(t("art_ai_error"))}<br><code>${esc(e.message)}</code>`; }
  };
  $("#wtr").onclick = () => translateAll(cfg.text, $("#wmsg"), we);
  $("#btr").onclick = () => translateAll(bc, $("#bmsg"), be);
  $("#wsave").onclick = async () => {
    we.keep();
    const value = { enabled: $("#wen").checked, sender: cfg.sender || H.me.id, text: cfg.text };
    const { error } = await H.sb.from("site_settings").upsert({ key: "welcome", value, updated_at: new Date().toISOString() });
    $("#wmsg").textContent = error ? errMsg(error) : "✓ " + t("art_saved");
  };
  $("#bsend").onclick = async () => {
    be.keep(); if (!(bc.fr || "").trim()) { $("#bmsg").textContent = t("ap_broadcast_empty"); return; }
    if (!confirm(t("ap_broadcast_confirm"))) return;
    $("#bmsg").textContent = t("loading");
    const { data: n, error } = await H.sb.rpc("admin_broadcast", { p_text: bc });
    $("#bmsg").textContent = error ? errMsg(error) : `✓ ${n} ${t("ap_broadcast_sent")}`;
  };
}

// ============ IDÉES ET ANALYSES DE L'IA ============
async function ideas(box) {
  const { data: row } = await H.sb.from("site_settings").select("value,updated_at").eq("key", "insights").maybeSingle();
  box.innerHTML = `<section class="card"><h2>🤖 ${esc(t("ap_ideas_t"))}</h2><p class="small muted">${esc(t("ap_ideas_d"))}</p>
      <div class="actions"><button class="btn primary" id="irun">✨ ${esc(t("ap_ideas_run"))}</button><span class="msg small" id="imsg"></span></div></section>
    <div id="iout"></div>`;
  const draw = out => {
    if (!out) { $("#iout").innerHTML = `<p class="empty">${esc(t("ap_ideas_none"))}</p>`; return; }
    const li = a => (a || []).map(x => `<li>${esc(x)}</li>`).join("") || `<li class="muted">—</li>`;
    const imp = { high: "🔥", medium: "👍", low: "·" };
    $("#iout").innerHTML = `<p class="small muted">${esc(t("ap_ideas_date"))} ${esc(dateTime(out.generated_at))}${out.volume ? ` · ${esc(t("ap_ideas_volume"))} ${Object.values(out.volume).reduce((a, b) => a + b, 0)}` : ""}</p>
      <section class="card ideas-summary"><p>${esc(out.summary || "")}</p></section>
      <div class="admin-grid">
        <section class="card"><h3>😊 ${esc(t("ap_pos"))}</h3><ul>${li(out.feedback && out.feedback.positives)}</ul></section>
        <section class="card"><h3>😕 ${esc(t("ap_neg"))}</h3><ul>${li(out.feedback && out.feedback.complaints)}</ul></section>
        <section class="card"><h3>🙋 ${esc(t("ap_req"))}</h3><ul>${li(out.feedback && out.feedback.requests)}</ul></section>
      </div>
      <section class="card"><h2>📰 ${esc(t("ap_articles"))}</h2><ul class="admin-list">${(out.article_ideas || []).map((a, i) => `<li><div><strong>${esc(a.title)}</strong><p class="small">${esc(a.angle || "")}</p><p class="small muted">${esc(a.why || "")}</p></div>
        <div class="actions"><button class="btn small primary" data-write="${i}">✎ ${esc(t("ap_write"))}</button></div></li>`).join("")}</ul></section>
      <section class="card"><h2>🛠 ${esc(t("ap_improve"))}</h2><ul class="admin-list">${(out.improvements || []).map(a => `<li><div><strong>${imp[a.impact] || ""} ${esc(a.idea)}</strong><p class="small muted">${esc(t("ap_impact"))} : ${esc(t("ap_lvl_" + (a.impact || "")))} · ${esc(t("ap_effort"))} : ${esc(t("ap_lvl_" + (a.effort || "")))} — ${esc(a.why || "")}</p></div></li>`).join("")}</ul></section>
      <section class="card"><h2>✅ ${esc(t("ap_actions"))}</h2><ul class="checklist">${(out.actions || []).map(a => `<li><label class="check"><input type="checkbox"> <span><strong>${esc(a.task)}</strong> <span class="small muted">${esc(a.why || "")}</span></span></label></li>`).join("")}</ul></section>
      ${(out.moderation || []).length ? `<section class="card warn-card"><h2>⚠️ ${esc(t("ap_moderation"))}</h2><ul>${li(out.moderation)}</ul></section>` : ""}`;
    $$("[data-write]", box).forEach(b => b.onclick = () => { const a = out.article_ideas[+b.dataset.write]; try { sessionStorage.setItem("hv_topic", a.title + (a.angle ? " — " + a.angle : "")); } catch (e) {} location.hash = "#/admin/articles/nouveau"; });
  };
  draw(row && row.value);
  $("#irun").onclick = async () => {
    $("#imsg").textContent = t("ap_ideas_running"); $("#irun").disabled = true;
    try {
      const { data: { session } } = await H.sb.auth.getSession();
      const r = await fetch("/.netlify/functions/admin-insights", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token }, body: JSON.stringify({ lang: H.lang }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "HTTP " + r.status + (r.status === 404 ? " : fonction admin-insights introuvable" : ""));
      $("#imsg").textContent = ""; draw(d);
    } catch (e) { $("#imsg").innerHTML = `${esc(t("art_ai_error"))}<br><code>${esc(e.message)}</code>`; }
    $("#irun").disabled = false;
  };
}

});
