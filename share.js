// v11 : partage partout (avec code de parrainage automatique) et parrainage récompensé
(window.HV_EXT = window.HV_EXT || []).push((H, ROUTES) => {
const { t, esc, $, $$, toast, date, avatar } = H;
const view = H.view;
ROUTES.unshift([/^#\/parrainage$/, () => referral(), true]);

// ---------- Lien avec code de parrainage ----------
H.refUrl = (url) => {
  const u = new URL(url || location.href, location.href);
  if (H.me) u.searchParams.set("ref", H.me.id); else u.searchParams.delete("ref");
  return u.toString();
};
const pageTitle = () => { const h = $("#view h1"); return (h ? h.textContent.trim() + " — " : "") + "¡Hola Vecino!"; };

// ---------- Image « story » (1080 x 1920) pour Instagram, TikTok, WhatsApp ----------
async function storyImage(title, subtitle) {
  const c = document.createElement("canvas"); c.width = 1080; c.height = 1920; const g = c.getContext("2d");
  const sky = g.createLinearGradient(0, 0, 0, 1920);
  [[0, "#26246a"], [0.35, "#7a3880"], [0.55, "#e86854"], [0.66, "#fca848"], [0.66, "#284678"], [1, "#142850"]].forEach(([k, col]) => sky.addColorStop(k, col));
  g.fillStyle = sky; g.fillRect(0, 0, 1080, 1920);
  g.fillStyle = "#ffe28c"; g.beginPath(); g.arc(540, 1267, 190, Math.PI, 0); g.fill();
  g.fillStyle = "#AA151B"; g.fillRect(0, 0, 1080, 44); g.fillStyle = "#F2B705"; g.fillRect(0, 44, 1080, 28);
  const logo = new Image(); logo.src = "logo-horizontal.png";
  await new Promise(r => { logo.onload = r; logo.onerror = r; });
  g.fillStyle = "#fff"; g.beginPath(); g.roundRect(150, 170, 780, 240, 40); g.fill();
  if (logo.naturalWidth) { const w = 680, h = w * logo.naturalHeight / logo.naturalWidth; g.drawImage(logo, 200, 290 - h / 2, w, h); }
  const lines = (txt, max, font) => { g.font = font; const out = []; let cur = ""; txt.split(/\s+/).forEach(w => { const tt = (cur + " " + w).trim(); if (g.measureText(tt).width > max && cur) { out.push(cur); cur = w; } else cur = tt; }); if (cur) out.push(cur); return out; };
  g.textAlign = "center"; g.lineJoin = "round";
  let y = 560;
  lines(title, 900, "bold 78px sans-serif").slice(0, 4).forEach(l => { g.font = "bold 78px sans-serif"; g.lineWidth = 12; g.strokeStyle = "rgba(20,16,48,.85)"; g.strokeText(l, 540, y); g.fillStyle = "#fff"; g.fillText(l, 540, y); y += 92; });
  y += 20;
  lines(subtitle, 880, "44px sans-serif").slice(0, 3).forEach(l => { g.font = "44px sans-serif"; g.lineWidth = 8; g.strokeStyle = "rgba(20,16,48,.8)"; g.strokeText(l, 540, y); g.fillStyle = "#FFE9B0"; g.fillText(l, 540, y); y += 58; });
  g.fillStyle = "#F2B705"; g.beginPath(); g.roundRect(190, 1500, 700, 110, 55); g.fill();
  g.fillStyle = "#14213D"; g.font = "bold 44px sans-serif"; g.fillText(t("sh_story_cta"), 540, 1571);
  g.fillStyle = "#fff"; g.font = "bold 50px sans-serif"; g.fillText(location.host, 540, 1720);
  return await new Promise(r => c.toBlob(r, "image/png"));
}

// ---------- Fenêtre de partage ----------
H.openShare = ({ url, title, text } = {}) => {
  url = H.refUrl(url || location.href); title = title || pageTitle(); text = text || title;
  const u = encodeURIComponent(url), tx = encodeURIComponent(text), both = encodeURIComponent(text + " " + url);
  const links = [
    ["wa", "WhatsApp", `https://wa.me/?text=${both}`],
    ["fb", "Facebook", `https://www.facebook.com/sharer/sharer.php?u=${u}`],
    ["ms", "Messenger", `fb-messenger://share/?link=${u}`],
    ["x", "X", `https://twitter.com/intent/tweet?url=${u}&text=${tx}`],
    ["tg", "Telegram", `https://t.me/share/url?url=${u}&text=${tx}`],
    ["li", "LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${u}`],
    ["em", "E-mail", `mailto:?subject=${tx}&body=${both}`],
    ["sms", "SMS", `sms:?&body=${both}`]
  ];
  const box = document.createElement("div"); box.className = "share-modal"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
  box.innerHTML = `<div class="share-panel"><button class="share-x" aria-label="${esc(t("close"))}">×</button>
    <h2>${esc(t("sh_title"))}</h2><p class="small muted">${esc(title)}</p>
    <div class="share-grid">${links.map(([k, n, h]) => `<a class="share-tile s-${k}" href="${esc(h)}" target="_blank" rel="noopener"><span class="si">${n.slice(0, 1)}</span>${esc(n)}</a>`).join("")}
      <button class="share-tile s-ig" data-native><span class="si">◎</span>${esc(t("sh_insta"))}</button>
      <button class="share-tile s-story" data-story><span class="si">▣</span>${esc(t("sh_story"))}</button>
      <button class="share-tile s-cp" data-copy><span class="si">⧉</span>${esc(t("sh_copy"))}</button></div>
    <p class="share-link"><code>${esc(url)}</code></p>
    ${H.me ? `<p class="ok small">🎁 ${esc(t("sh_ref_note"))}</p>` : `<p class="small muted">${esc(t("sh_join_note"))} <a href="#/connexion?signup">${esc(t("gm_join_free"))}</a></p>`}
  </div>`;
  document.body.appendChild(box);
  const close = () => { box.remove(); document.removeEventListener("keydown", key); };
  const key = e => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", key);
  box.onclick = e => { if (e.target === box || e.target.closest(".share-x")) close(); };
  $$(".share-tile[href]", box).forEach(a => a.addEventListener("click", () => setTimeout(close, 300)));
  $("[data-copy]", box).onclick = async () => { try { await navigator.clipboard.writeText(url); toast(t("link_copied")); } catch (e) { prompt("", url); } };
  $("[data-native]", box).onclick = async () => {
    if (navigator.share) { try { await navigator.share({ title, text, url }); close(); } catch (e) {} return; }
    try { await navigator.clipboard.writeText(url); } catch (e) {}
    toast(t("sh_insta_desktop"));
  };
  $("[data-story]", box).onclick = async () => {
    const blob = await storyImage(title.replace(/ — ¡Hola Vecino!$/, ""), text !== title ? text : t("sh_story_sub"));
    const file = new File([blob], "hola-vecino-story.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], text: url }); return; } catch (e) { return; } }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "hola-vecino-story.png"; a.click();
    toast(t("sh_story_saved"));
  };
};
// Les anciens boutons « Partager » du site ouvrent maintenant cette fenêtre
H.share = (title, url) => H.openShare({ title, url });
// Rangée de boutons en ligne (pages d'annonce, de profil…)
H.shareButtons = (url, text) => {
  const full = H.refUrl(url), both = encodeURIComponent(text + " " + full), u = encodeURIComponent(full);
  const id = "sb" + Math.random().toString(36).slice(2, 8);
  setTimeout(() => { const b = document.getElementById(id); if (b) b.onclick = () => H.openShare({ url, title: text }); }, 0);
  return `<div class="share-row">
    <a class="share-btn wa" href="https://wa.me/?text=${both}" target="_blank" rel="noopener">WhatsApp</a>
    <a class="share-btn fb" href="https://www.facebook.com/sharer/sharer.php?u=${u}" target="_blank" rel="noopener">Facebook</a>
    <button class="share-btn more" id="${id}">↗ ${esc(t("sh_more"))}</button>
  </div>`;
};

// ---------- Bouton flottant « Partager » sur toutes les pages ----------
const HIDE = /^#\/(connexion|mon-profil|messages|admin|annonces|mes-|notifications|drive|agenda)/;
(window.HV_HOOKS = window.HV_HOOKS || {}).header = (window.HV_HOOKS.header || []).concat([() => {
  let b = $("#sharefab");
  if (!b) { b = document.createElement("button"); b.id = "sharefab"; b.className = "share-fab"; b.onclick = () => H.openShare({}); document.body.appendChild(b); }
  b.innerHTML = `↗ <span>${esc(t("sh_title"))}</span>`;
  b.hidden = HIDE.test(location.hash || "#/");
}]);

// ---------- Page Parrainage ----------
const GOALS = [[3, "rf_goal_3"], [10, "rf_goal_10"]];
async function referral() {
  const url = H.refUrl(location.origin + location.pathname + "#/");
  const { data: r } = await H.sb.rpc("my_referrals");
  const info = r || { total: 0, active: 0, list: [] };
  const next = GOALS.find(g => info.active < g[0]) || GOALS[GOALS.length - 1];
  const pct = Math.min(100, Math.round(info.active / next[0] * 100));
  const msgs = [t("rf_msg_1"), t("rf_msg_2"), t("rf_msg_3")];
  view.innerHTML = `<section class="page referral">
    <h1>🤝 ${esc(t("rf_title"))}</h1><p class="lead">${esc(t("rf_intro2"))}</p>
    <div class="ref-rewards">
      <div class="ref-reward"><span class="rr-ic">🎁</span><strong>${esc(t("rf_r_friend_t"))}</strong><span>${esc(t("rf_r_friend_d"))}</span></div>
      <div class="ref-reward"><span class="rr-ic">⭐</span><strong>+50 ${esc(t("pt_points"))}</strong><span>${esc(t("rf_r_points_d"))}</span></div>
      <div class="ref-reward"><span class="rr-ic">🥉</span><strong>3 ${esc(t("rf_active_short"))}</strong><span>${esc(t("rf_goal_3"))}</span></div>
      <div class="ref-reward gold"><span class="rr-ic">🏆</span><strong>10 ${esc(t("rf_active_short"))}</strong><span>${esc(t("rf_goal_10"))}</span></div>
    </div>
    <section class="card"><h2>${esc(t("rf_progress"))}</h2>
      <p class="big-num"><strong>${info.active}</strong> / ${next[0]} ${esc(t("rf_active_short"))} <span class="small muted">(${info.total} ${esc(t("rf_count"))})</span></p>
      <p class="progress"><span class="bar"><span style="width:${pct}%"></span></span></p>
      <p class="small muted">${esc(t("rf_active_rule"))}</p></section>
    <section class="card"><h2>${esc(t("rf_link"))}</h2><p class="ref-link"><code>${esc(url)}</code></p>
      <div class="actions"><button class="btn primary" id="rfshare">↗ ${esc(t("rf_share_btn"))}</button><button class="btn" id="rfcopy">⧉ ${esc(t("sh_copy"))}</button><button class="btn" id="rfstory">▣ ${esc(t("sh_story"))}</button></div></section>
    <section class="card"><h2>${esc(t("rf_msgs"))}</h2><p class="small muted">${esc(t("rf_msgs_d"))}</p>
      ${msgs.map((m, i) => `<div class="ref-msg"><p>${esc(m)}</p><div class="actions"><a class="share-btn wa" href="https://wa.me/?text=${encodeURIComponent(m + " " + url)}" target="_blank" rel="noopener">WhatsApp</a><button class="share-btn more" data-msg="${i}">⧉ ${esc(t("sh_copy"))}</button></div></div>`).join("")}</section>
    <section class="card"><h2>${esc(t("rf_mine"))}</h2>
      ${(info.list || []).length ? `<ul class="threads">${info.list.map(p => `<li><span>${avatar({ display_name: p.name, avatar_url: p.avatar_url }, "tiny")} ${esc(p.name)}</span><span class="small ${p.active ? "ok" : "muted"}">${p.active ? "✓ " + esc(t("rf_active_one")) : esc(t("rf_pending"))} · ${esc(date(p.created_at))}</span></li>`).join("")}</ul>` : `<p class="empty small">${esc(t("rf_none"))}</p>`}</section>
  </section>`;
  $("#rfshare").onclick = () => H.openShare({ url: location.origin + location.pathname + "#/", title: "¡Hola Vecino!", text: t("rf_share_text") });
  $("#rfcopy").onclick = async () => { try { await navigator.clipboard.writeText(url); toast(t("link_copied")); } catch (e) { prompt("", url); } };
  $("#rfstory").onclick = () => { H.openShare({ url: location.origin + location.pathname + "#/", title: "¡Hola Vecino!", text: t("rf_share_text") }); setTimeout(() => { const s = document.querySelector("[data-story]"); if (s) s.click(); }, 50); };
  $$("[data-msg]", view).forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(msgs[+b.dataset.msg] + " " + url); toast(t("link_copied")); } catch (e) {} });
}

// ---------- Tableau de bord : encadré « Invitez vos amis » ----------
(window.HV_HOOKS.dashboard = window.HV_HOOKS.dashboard || []).push(async () => {
  const side = $(".dash-side", view); if (!side) return;
  const { data: r } = await H.sb.rpc("my_referrals"); const n = r ? r.active : 0;
  side.insertAdjacentHTML("beforeend", `<a class="invite-card" href="#/parrainage"><strong>🤝 ${esc(t("rf_card_t"))}</strong><span>${esc(t("rf_card_d"))}</span>
    <span class="progress"><span class="bar"><span style="width:${Math.min(100, Math.round(n / 3 * 100))}%"></span></span></span><span class="small">${n} / 3 ${esc(t("rf_active_short"))}</span></a>`);
});
});
