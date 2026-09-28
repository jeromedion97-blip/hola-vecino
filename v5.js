// v5 : recherche, installation sur téléphone, agenda et rappels partagés, drive personnel,
// articles hebdomadaires, conseil avocat, chaîne YouTube, réseaux sociaux
(() => {
const escA = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

// Encadré « consultez un avocat » (utilisé par le guide, le simulateur et les articles)
window.HV_LAWYER = (t, esc) => `<aside class="lawyer"><strong><span aria-hidden="true">⚖️</span> ${esc(t("lawyer_title"))}</strong><p>${esc(t("lawyer_text"))}</p><a class="btn small" href="#/contacts/lawyer">${esc(t("lawyer_btn"))}</a></aside>`;

// Icônes génériques (pas de logos de marque) pour les réseaux sociaux
const ICON = {
  youtube: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4" fill="currentColor"/><path d="M10 9v6l5-3z" fill="#fff"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14 3h3a4 4 0 0 0 4 4v3a7 7 0 0 1-4-1.3V15a6 6 0 1 1-6-6v3.2A2.8 2.8 0 1 0 14 15z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="17.3" cy="6.7" r="1.3" fill="currentColor"/></svg>'
};
const LABEL = { youtube:"YouTube", tiktok:"TikTok", instagram:"Instagram" };
window.HV_SOCIAL = (title) => {
  const s = (window.APP_CONFIG && window.APP_CONFIG.SOCIAL) || {};
  const keys = Object.keys(ICON).filter(k => /^https:\/\//.test(s[k] || ""));
  if (!keys.length) return "";
  return `<div class="social">${title ? `<span class="social-title">${escA(title)}</span>` : ""}${keys.map(k => `<a href="${escA(s[k])}" target="_blank" rel="noopener" aria-label="${LABEL[k]}">${ICON[k]}<span>${LABEL[k]}</span></a>`).join("")}</div>`;
};
})();

(window.HV_EXT = window.HV_EXT || []).push((H, ROUTES) => {
const { t, esc, nl2br, $, $$, field, toast, date, dateTime, avatar, errMsg, icsDownload } = H;
const view = H.view, C = H.C;
const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
H.norm = norm;
H.searchBox = (id) => `<div class="searchbox"><label class="sr" for="${id}">${esc(t("search"))}</label><input id="${id}" type="search" placeholder="${esc(t("search"))}" autocomplete="off"></div>`;
const hooks = window.HV_HOOKS = window.HV_HOOKS || {};
const push = (k, f) => (hooks[k] = hooks[k] || []).push(f);
const L = x => x ? (x[H.lang] || x.fr || x.en || "") : "";

ROUTES.unshift(
  [/^#\/agenda$/, () => agenda(), true],
  [/^#\/drive(?:\/(\w+))?$/, m => drive(m[1] || ""), true],
  [/^#\/articles$/, () => articles()],
  [/^#\/articles\/(\d+)$/, m => articlePage(+m[1])],
  [/^#\/admin\/articles$/, () => adminArticles(), true],
  [/^#\/admin\/articles\/(\d+|nouveau)$/, m => articleEditor(m[1]), true]
);

// ============ Proposition d'installation sur téléphone ============
let deferred = null;
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || matchMedia("(max-width: 820px)").matches;
const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
function installBar() {
  if (!isMobile() || standalone() || $("#installbar")) return;
  try { if (Date.now() - (+localStorage.getItem("hv_install_later") || 0) < 14 * 86400e3) return; } catch (e) {}
  if (!deferred && !isIOS) return;
  const bar = document.createElement("div");
  bar.id = "installbar"; bar.className = "installbar"; bar.setAttribute("role", "dialog");
  bar.innerHTML = `<img src="icon-192.png" alt=""><div><strong>${esc(t("install_title"))}</strong><p>${esc(deferred ? t("install_text") : t("install_ios"))}</p></div>
    <div class="installbar-actions">${deferred ? `<button class="btn small primary" id="ib-yes">${esc(t("install_btn"))}</button>` : ""}<button class="linkbtn small" id="ib-no">${esc(t("install_later"))}</button></div>`;
  document.body.appendChild(bar);
  const close = () => { bar.remove(); try { localStorage.setItem("hv_install_later", String(Date.now())); } catch (e) {} };
  $("#ib-no").onclick = close;
  const y = $("#ib-yes"); if (y) y.onclick = async () => { deferred.prompt(); await deferred.userChoice; deferred = null; bar.remove(); };
}
window.addEventListener("beforeinstallprompt", e => { deferred = e; setTimeout(installBar, 1500); });
setTimeout(installBar, 3000);

// ============ Encadrés partagés ============
async function channelBlock(el) {
  const yt = ((C.SOCIAL || {}).youtube || "").trim(), id = (C.YOUTUBE_CHANNEL_ID || "").trim();
  if (!el || (!yt && !id)) return;
  const sub = yt ? yt + (yt.includes("?") ? "&" : "?") + "sub_confirmation=1" : "";
  el.innerHTML = `<section class="channel"><div class="titlebar"><h2><span class="yt-dot" aria-hidden="true">▶</span> ${esc(t("yt_our"))}</h2>${sub ? `<a class="btn small primary" href="${esc(sub)}" target="_blank" rel="noopener">${esc(t("yt_subscribe"))}</a>` : ""}</div><div class="yt-mini-grid" id="chv"></div></section>`;
  if (!id) return;
  try {
    const d = await (await fetch(`/.netlify/functions/youtube?channel=${encodeURIComponent(id)}`)).json();
    const box = $("#chv", el); if (!box) return;
    box.innerHTML = (d.videos || []).slice(0, 3).map(v => `<a class="yt-mini" href="https://www.youtube.com/watch?v=${esc(v.id)}" target="_blank" rel="noopener"><img src="https://i.ytimg.com/vi/${esc(v.id)}/hqdefault.jpg" alt="" loading="lazy"><span>${esc(v.title)}</span></a>`).join("");
  } catch (e) {}
}
push("youtube", channelBlock);

async function latestArticles(n) {
  if (!H.configured) return [];
  const { data } = await H.sb.from("articles").select("id,title,body,published_at").eq("status", "published").order("published_at", { ascending:false }).limit(n);
  return data || [];
}
const plain = s => String(s || "").replace(/\*\*/g, "").replace(/^##\s*/gm, "").replace(/^[-•]\s*/gm, "").replace(/\s+/g, " ").trim();
const articleCard = a => `<a class="article-card" href="#/articles/${a.id}"><span class="muted small">${esc(date(a.published_at))}</span><strong>${esc(L(a.title))}</strong><span class="small">${esc(plain(L(a.body)).slice(0, 170))}…</span></a>`;

// Accueil visiteur : derniers articles + chaîne
push("home", async () => {
  const wrap = document.createElement("div"); wrap.className = "home-extra"; view.appendChild(wrap);
  const list = await latestArticles(3);
  if (list.length) wrap.insertAdjacentHTML("beforeend", `<section class="home-block"><div class="titlebar"><h2>${esc(t("art_latest"))}</h2><a class="small" href="#/articles">${esc(t("dash_see_all"))}</a></div><div class="articles">${list.map(articleCard).join("")}</div></section>`);
  const ch = document.createElement("div"); wrap.appendChild(ch); channelBlock(ch);
});

// Tableau de bord : prochains rappels + article de la semaine
push("dashboard", async () => {
  const main = $(".dash-main", view); if (!main) return;
  const now = new Date().toISOString(), in14 = new Date(Date.now() + 14 * 86400e3).toISOString();
  const [{ data: rem }, arts] = await Promise.all([
    H.sb.from("reminders").select("id,title,starts_at,all_day").gte("starts_at", now).lte("starts_at", in14).order("starts_at").limit(3),
    latestArticles(1)
  ]);
  let html = "";
  if (arts[0]) html += `<section class="dash-block"><div class="titlebar"><h2>${esc(t("dash_article"))}</h2><a class="small" href="#/articles">${esc(t("dash_see_all"))}</a></div>${articleCard(arts[0])}</section>`;
  html += `<section class="dash-block"><div class="titlebar"><h2>${esc(t("dash_reminders"))}</h2><a class="small" href="#/agenda">${esc(t("nav_agenda"))}</a></div>
    ${(rem || []).length ? `<ul class="threads">${rem.map(r => `<li><a href="#/agenda"><strong>${esc(r.title)}</strong></a><span class="muted small">${esc(r.all_day ? date(r.starts_at) : dateTime(r.starts_at))}</span></li>`).join("")}</ul>` : `<p class="empty small">${esc(t("ag_empty"))} <a href="#/agenda">${esc(t("rem_new"))}</a></p>`}</section>`;
  main.insertAdjacentHTML("afterbegin", html);
});

// Checklist : nombre de documents rangés pour chaque étape
push("checklist", async root => {
  if (!H.isPremium) return;
  const { data } = await H.sb.from("documents").select("checklist_id");
  const n = {}; (data || []).forEach(d => { if (d.checklist_id) n[d.checklist_id] = (n[d.checklist_id] || 0) + 1; });
  $$("[data-doc]", root).forEach(a => { const c = n[a.dataset.doc]; if (c) a.querySelector("span").textContent = `${c} ${t("drive_docs")}`; });
});

// ============ AGENDA ============
const REMIND = [["", "rb_none"], ["15", "rb_15"], ["60", "rb_60"], ["1440", "rb_1440"], ["10080", "rb_10080"]];
async function agenda() {
  const sb = H.sb, me = H.me, p = H.myProfile || {};
  const pad = n => String(n).padStart(2, "0"), today = new Date(), iso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  view.innerHTML = `<section class="page">
    <h1>${esc(t("agenda_title"))}</h1><p class="lead">${esc(t("agenda_intro"))}</p>
    <details class="card remform" id="remwrap"><summary class="btn primary">＋ ${esc(t("rem_new"))}</summary>
      <form id="remf" class="stack"><div class="grid">
        ${field(t("rem_title") + " *", `<input id="rt" name="title" required maxlength="140">`, "rt")}
        ${field(t("rem_date") + " *", `<input id="rd" name="date" type="date" required value="${iso}">`, "rd")}
        ${field(t("rem_time"), `<input id="rh" name="time" type="time">`, "rh")}
        ${field(t("rem_before"), `<select id="rb" name="remind">${REMIND.map(([v, k]) => `<option value="${v}" ${v === "1440" ? "selected" : ""}>${esc(t(k))}</option>`).join("")}</select>`, "rb")}
      </div>
      ${field(t("rem_note"), `<textarea id="rn" name="note" rows="2" maxlength="1000"></textarea>`, "rn")}
      <div class="field"><span class="label">${esc(t("rem_share"))}</span><p class="muted small">${esc(t("rem_share_help"))}</p>
        <div class="chips" id="shchips"></div><input id="shq" type="search" placeholder="${esc(t("ev_invite_search"))}" autocomplete="off"><ul class="iresults" id="shres"></ul></div>
      <div class="actions"><button class="btn primary">${esc(t("rem_save"))}</button><span class="msg" role="status"></span></div></form>
    </details>
    <div class="tools">${H.searchBox("agq")}<button class="btn small" id="icsall">${esc(t("ag_export_all"))}</button></div>
    <div id="aglist"><p>${esc(t("loading"))}</p></div>
  </section>`;

  // Choix des membres avec qui partager
  const chosen = new Map(); let timer;
  const drawChips = () => { $("#shchips").innerHTML = [...chosen].map(([id, name]) => `<span class="chip on">${esc(name)} <button type="button" class="linkbtn" data-rm="${id}" aria-label="×">×</button></span>`).join(""); $$("[data-rm]", view).forEach(b => b.onclick = () => { chosen.delete(b.dataset.rm); drawChips(); }); };
  $("#shq").oninput = () => { clearTimeout(timer); timer = setTimeout(async () => {
    const q = $("#shq").value.trim().replace(/[%_,()]/g, "");
    if (q.length < 2) { $("#shres").innerHTML = ""; return; }
    const { data } = await sb.from("profiles").select("id,display_name,avatar_url,city").ilike("display_name", `%${q}%`).limit(8);
    const res = (data || []).filter(x => x.id !== me.id && !chosen.has(x.id) && !H.blocks.has(x.id));
    $("#shres").innerHTML = res.map(x => `<li>${avatar(x, "tiny")} <span>${esc(x.display_name)} <span class="muted small">${esc(x.city || "")}</span></span><button type="button" class="btn small" data-add="${x.id}" data-name="${esc(x.display_name)}">＋</button></li>`).join("");
    $$("[data-add]", view).forEach(b => b.onclick = () => { chosen.set(b.dataset.add, b.dataset.name); $("#shres").innerHTML = ""; $("#shq").value = ""; drawChips(); });
  }, 250); };

  $("#remf").onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target), msg = $("#remf .msg"), tm = (f.get("time") || "").toString();
    const start = new Date(`${f.get("date")}T${tm || "12:00"}`);
    const row = { owner_id: me.id, title: f.get("title").toString().trim(), note: (f.get("note") || "").toString().trim() || null, starts_at: start.toISOString(), all_day: !tm, remind_minutes: f.get("remind") ? +f.get("remind") : null };
    msg.textContent = t("loading");
    const { data: r, error } = await sb.from("reminders").insert(row).select().single();
    if (error) { msg.textContent = errMsg(error); return; }
    if (chosen.size) { const { error: e2 } = await sb.from("reminder_shares").insert([...chosen.keys()].map(user_id => ({ reminder_id: r.id, user_id }))); if (e2) toast(errMsg(e2)); }
    toast(t("rem_saved")); agenda();
  };

  // Chargement : rappels (miens et partagés), événements, échéances
  const now = new Date(), from = new Date(Date.now() - 86400e3).toISOString(), until = new Date(Date.now() + 400 * 86400e3).toISOString();
  const [{ data: rem }, { data: shares }, { data: going }, { data: mine }] = await Promise.all([
    sb.from("reminders").select("*").gte("starts_at", from).lte("starts_at", until).order("starts_at"),
    sb.from("reminder_shares").select("reminder_id,user_id"),
    sb.from("event_rsvps").select("event_id").eq("user_id", me.id).eq("status", "going"),
    sb.from("events").select("*").eq("creator_id", me.id).eq("cancelled", false).gte("starts_at", from)
  ]);
  const goingIds = (going || []).map(x => x.event_id).filter(id => !(mine || []).some(e => e.id === id));
  const extra = goingIds.length ? ((await sb.from("events").select("*").in("id", goingIds).eq("cancelled", false).gte("starts_at", from)).data || []) : [];
  const people = await H.profilesFor([...(rem || []).map(r => r.owner_id), ...(shares || []).map(s => s.user_id)]);
  const items = [];
  (rem || []).forEach(r => {
    const own = r.owner_id === me.id;
    const withIds = (shares || []).filter(s => s.reminder_id === r.id && s.user_id !== me.id).map(s => s.user_id);
    items.push({ kind:"reminder", id:r.id, own, date:new Date(r.starts_at), allDay:r.all_day, title:r.title, note:r.note, remind:r.remind_minutes,
      who: own ? (withIds.length ? `${t("ag_shared_with")} ${withIds.map(i => (people[i] || {}).display_name || "?").join(", ")}` : "") : `${t("ag_shared_by")} ${(people[r.owner_id] || {}).display_name || "?"}` });
  });
  [...(mine || []), ...extra].forEach(e => items.push({ kind:"event", id:e.id, date:new Date(e.starts_at), end:e.ends_at ? new Date(e.ends_at) : null, title:e.title, note:[e.place_hint, e.city].filter(Boolean).join(", "), vis:e.visibility, remind:1440 }));
  if (H.isPremium && p.arrival_date) {
    const eu = p.nationality ? (window.EU_CODES || []).includes(p.nationality) : null, arr = new Date(p.arrival_date + "T12:00:00");
    (window.DEADLINES_PERSONAL || []).filter(d => d.who(eu)).forEach(d => { const dt = new Date(arr); dt.setDate(dt.getDate() + d.days); if (dt >= now) items.push({ kind:"deadline", date:dt, allDay:true, title:L(d.t), remind:10080 }); });
    (window.DEADLINES_YEARLY || []).forEach(d => { let dt = new Date(now.getFullYear(), d.md[0] - 1, d.md[1], 12); if (dt < now) dt = new Date(now.getFullYear() + 1, d.md[0] - 1, d.md[1], 12); items.push({ kind:"deadline", date:dt, allDay:true, title:L(d.t), remind:10080 }); });
  }
  items.sort((a, b) => a.date - b.date);
  const toIcs = it => ({ title: it.title, start: it.date, end: it.end, allDay: !!it.allDay, desc: it.note || "", alarmMinutes: it.remind == null ? null : it.remind });

  const draw = () => {
    const q = norm($("#agq").value);
    const shown = items.filter(it => !q || norm(`${it.title} ${it.note || ""} ${it.who || ""}`).includes(q));
    if (!shown.length) { $("#aglist").innerHTML = `<p class="empty">${esc(q ? t("no_match") : t("ag_empty"))}</p>`; return; }
    let html = "", lastDay = "";
    shown.forEach((it, i) => {
      const day = it.date.toLocaleDateString(H.lang, { weekday:"long", day:"numeric", month:"long", year:"numeric" });
      if (day !== lastDay) { html += `${lastDay ? "</ul>" : ""}<h2 class="ag-day">${esc(day)}</h2><ul class="ag-items">`; lastDay = day; }
      const tag = it.kind === "event" ? `<span class="tag obj">${esc(t("ag_event"))}</span>${it.vis === "private" ? ` <span class="tag">${esc(t("vis_private"))}</span>` : ""}`
        : it.kind === "deadline" ? `<span class="tag st-going">${esc(t("ag_deadline"))}</span>` : `<span class="tag">${esc(t("ag_reminder"))}</span>`;
      const time = it.allDay ? t("ag_all_day") : it.date.toLocaleTimeString(H.lang, { hour:"2-digit", minute:"2-digit" });
      html += `<li class="ag-item ag-${it.kind} ${it.date < now ? "past" : ""}"><span class="ag-time">${esc(time)}</span><div class="ag-body"><p class="tags">${tag}</p>
        <strong>${it.kind === "event" ? `<a href="#/evenements/${it.id}">${esc(it.title)}</a>` : esc(it.title)}</strong>
        ${it.note ? `<p class="small muted">${nl2br(it.note)}</p>` : ""}${it.who ? `<p class="small">${esc(it.who)}</p>` : ""}
        <div class="actions"><button class="linkbtn small" data-ics="${i}">📅 ${esc(t("add_calendar"))}</button>
        ${it.kind === "reminder" ? (it.own ? `<button class="linkbtn small" data-del="${it.id}">${esc(t("delete"))}</button>` : `<button class="linkbtn small" data-leave="${it.id}">${esc(t("ag_leave"))}</button>`) : ""}</div></div></li>`;
    });
    $("#aglist").innerHTML = html + "</ul>";
    $$("[data-ics]", view).forEach(b => b.onclick = () => { const it = shown[+b.dataset.ics]; icsDownload(it.title, [toIcs(it)]); });
    $$("[data-del]", view).forEach(b => b.onclick = async () => { if (!confirm(t("confirm_delete"))) return; const { error } = await sb.from("reminders").delete().eq("id", b.dataset.del); if (error) return toast(errMsg(error)); agenda(); });
    $$("[data-leave]", view).forEach(b => b.onclick = async () => { const { error } = await sb.from("reminder_shares").delete().eq("reminder_id", b.dataset.leave).eq("user_id", me.id); if (error) return toast(errMsg(error)); agenda(); });
  };
  $("#agq").addEventListener("input", draw);
  $("#icsall").onclick = () => { const fut = items.filter(it => it.date >= now); if (fut.length) icsDownload(C.APP_NAME + " agenda", fut.map(toIcs)); };
  draw();
}

// ============ DRIVE PERSONNEL ============
const CATS = ["identity","residence","housing","work","health","taxes","bank","vehicle","family","other"];
const fmtSize = b => { const fr = H.lang === "fr"; return b > 1048576 ? (b / 1048576).toFixed(1) + (fr ? " Mo" : " MB") : Math.max(1, Math.round(b / 1024)) + (fr ? " Ko" : " KB"); };
async function drive(pre) {
  const sb = H.sb, me = H.me;
  if (!H.isPremium) {
    view.innerHTML = `<section class="narrow"><h1>${esc(t("drive_title"))}</h1><p class="lead">${esc(t("drive_intro"))}</p><div class="locked"><p><strong>${esc(t("premium_locked"))}</strong></p><p>${esc(t("pf_drive"))}</p><a class="btn primary" href="#/premium">${esc(t("premium_cta"))}</a></div></section>`;
    return;
  }
  const quota = (C.DRIVE_QUOTA_MB || 50) * 1048576, maxFile = (C.DRIVE_FILE_MB || 10) * 1048576;
  const checklist = window.CHECKLIST || [];
  view.innerHTML = `<section class="page">
    <h1>${esc(t("drive_title"))}</h1><p class="lead">${esc(t("drive_intro"))}</p>
    <p class="notice small"><span aria-hidden="true">🔒</span> ${esc(t("drive_privacy"))}</p>
    <p class="progress"><span class="bar"><span id="qbar" style="width:0%"></span></span> <span id="qtxt"></span></p>
    <details class="card" id="upwrap" ${pre ? "open" : ""}><summary class="btn primary">＋ ${esc(t("drive_upload"))}</summary>
      <form id="upf" class="stack">
        ${field(t("drive_file") + " *", `<input id="uf" name="file" type="file" required accept="application/pdf,image/*">`, "uf")}
        <div class="grid">
          ${field(t("drive_name") + " *", `<input id="un" name="name" required maxlength="200">`, "un")}
          ${field(t("drive_cat"), `<select id="uc" name="category">${CATS.map(c => `<option value="${c}">${esc(t("dc_" + c))}</option>`).join("")}</select>`, "uc")}
          ${field(t("drive_link"), `<select id="ul" name="checklist"><option value="">${esc(t("drive_none_link"))}</option>${checklist.map(c => `<option value="${c.id}" ${c.id === pre ? "selected" : ""}>${esc(L(c.t))}</option>`).join("")}</select>`, "ul")}
        </div>
        <div class="actions"><button class="btn primary">${esc(t("drive_upload"))}</button><span class="msg" role="status"></span></div>
      </form></details>
    <div class="tools">${H.searchBox("dq")}<select id="dcat" aria-label="${esc(t("drive_cat"))}"><option value="">${esc(t("all"))}</option>${CATS.map(c => `<option value="${c}">${esc(t("dc_" + c))}</option>`).join("")}</select></div>
    <div id="dlist"><p>${esc(t("loading"))}</p></div>
  </section>`;
  $("#uf").onchange = e => { const f = e.target.files[0]; if (f && !$("#un").value) $("#un").value = f.name.replace(/\.[^.]+$/, ""); };

  let docs = [];
  const load = async () => { docs = (await sb.from("documents").select("*").order("created_at", { ascending:false })).data || []; draw(); };
  const draw = () => {
    const used = docs.reduce((s, d) => s + d.size_bytes, 0);
    $("#qbar").style.width = Math.min(100, used / quota * 100).toFixed(1) + "%";
    $("#qtxt").textContent = `${fmtSize(used)} ${t("drive_used")} ${fmtSize(quota)}`;
    const q = norm($("#dq").value), c = $("#dcat").value;
    const shown = docs.filter(d => (!c || d.category === c) && (!q || norm(d.name).includes(q)));
    $("#dlist").innerHTML = shown.length ? `<ul class="docs">${shown.map(d => { const step = checklist.find(x => x.id === d.checklist_id);
      return `<li><span class="doc-ico" aria-hidden="true">${/pdf/.test(d.mime || "") ? "📄" : "🖼️"}</span><div><strong>${esc(d.name)}</strong>
        <p class="small muted">${esc(t("dc_" + d.category))} · ${esc(date(d.created_at))} · ${fmtSize(d.size_bytes)}${step ? ` · ✓ ${esc(L(step.t))}` : ""}</p></div>
        <div class="actions"><button class="btn small" data-open="${d.id}">${esc(t("drive_open"))}</button><button class="linkbtn small" data-del="${d.id}">${esc(t("delete"))}</button></div></li>`; }).join("")}</ul>`
      : `<p class="empty">${esc(q || c ? t("no_match") : t("drive_empty"))}</p>`;
    $$("[data-open]", view).forEach(b => b.onclick = async () => {
      const d = docs.find(x => String(x.id) === b.dataset.open), w = window.open("", "_blank");
      const { data, error } = await sb.storage.from("documents").createSignedUrl(d.path, 120);
      if (error || !data) { if (w) w.close(); return toast(errMsg(error)); }
      if (w) w.location = data.signedUrl; else location.href = data.signedUrl;
    });
    $$("[data-del]", view).forEach(b => b.onclick = async () => {
      if (!confirm(t("confirm_delete"))) return;
      const d = docs.find(x => String(x.id) === b.dataset.del);
      await sb.storage.from("documents").remove([d.path]);
      const { error } = await sb.from("documents").delete().eq("id", d.id);
      if (error) return toast(errMsg(error)); load();
    });
  };
  $("#dq").addEventListener("input", draw); $("#dcat").addEventListener("input", draw);

  $("#upf").onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target), file = $("#uf").files[0], msg = $("#upf .msg");
    if (!file) return;
    if (file.size > maxFile) { msg.textContent = t("drive_too_big"); return; }
    if (docs.reduce((s, d) => s + d.size_bytes, 0) + file.size > quota) { msg.textContent = t("drive_quota"); return; }
    msg.textContent = t("drive_uploading");
    const safe = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w.-]+/g, "-").slice(-80);
    const path = `${me.id}/${Date.now()}-${safe}`;
    const up = await sb.storage.from("documents").upload(path, file, { contentType: file.type || "application/octet-stream", upsert:false });
    if (up.error) { msg.textContent = errMsg(up.error); return; }
    const { error } = await sb.from("documents").insert({ owner_id: me.id, name: f.get("name").toString().trim(), category: f.get("category"), checklist_id: f.get("checklist") || null, path, size_bytes: file.size, mime: file.type || null });
    if (error) { await sb.storage.from("documents").remove([path]); msg.textContent = (error.message || "").includes("QUOTA_EXCEEDED") ? t("drive_quota") : errMsg(error); return; }
    e.target.reset(); msg.textContent = ""; toast(t("drive_added")); load();
  };
  load();
}

// ============ ARTICLES ============
function md(s) {
  let html = "", list = false, para = [];
  const flush = () => { if (para.length) { html += `<p>${para.join("<br>")}</p>`; para = []; } };
  const endList = () => { if (list) { html += "</ul>"; list = false; } };
  esc(s || "").split(/\r?\n/).forEach(raw => {
    const l = raw.trim();
    if (l.startsWith("## ")) { flush(); endList(); html += `<h2>${l.slice(3)}</h2>`; }
    else if (/^[-•] /.test(l)) { flush(); if (!list) { html += "<ul>"; list = true; } html += `<li>${l.slice(2)}</li>`; }
    else if (!l) { flush(); endList(); }
    else { endList(); para.push(l); }
  });
  flush(); endList();
  return html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}
async function articles() {
  view.innerHTML = `<section class="page"><div class="titlebar"><h1>${esc(t("art_title"))}</h1>${H.isAdmin ? `<a class="btn small" href="#/admin/articles">${esc(t("art_admin"))} ✎</a>` : ""}</div>
    <p class="lead">${esc(t("art_intro"))}</p>${H.searchBox("aq")}<div id="alist"><p>${esc(t("loading"))}</p></div></section>`;
  const list = await latestArticles(200);
  const draw = () => {
    const q = norm($("#aq").value);
    const shown = list.filter(a => !q || norm(L(a.title) + " " + L(a.body)).includes(q));
    $("#alist").innerHTML = shown.length ? `<div class="articles">${shown.map(articleCard).join("")}</div>` : `<p class="empty">${esc(q ? t("no_match") : t("art_none"))}</p>`;
  };
  $("#aq").addEventListener("input", draw); draw();
}
async function articlePage(id) {
  view.innerHTML = `<p>${esc(t("loading"))}</p>`;
  const { data: a } = await H.sb.from("articles").select("*").eq("id", id).maybeSingle();
  if (!a) { location.hash = "#/articles"; return; }
  view.innerHTML = `<article class="page article">
    <a class="back" href="#/articles">${esc(t("back"))}</a>
    <p class="muted small">${a.published_at ? esc(date(a.published_at)) : `<span class="tag">${esc(t("art_status_draft"))}</span>`}</p>
    <h1>${esc(L(a.title))}</h1>
    <div class="article-body">${md(L(a.body))}</div>
    ${window.HV_LAWYER(t, esc)}
    <div class="actions"><button class="btn small" id="share">${esc(t("ev_share"))}</button>${H.isAdmin ? `<a class="btn small" href="#/admin/articles/${a.id}">✎ ${esc(t("lst_edit"))}</a>` : ""}</div>
    ${window.HV_SOCIAL(t("follow_us"))}
  </article>`;
  $("#share").onclick = () => H.share(L(a.title), location.href);
}

// Partage d'une page (téléphone : menu natif ; ordinateur : copie du lien)
H.share = async (title, url) => {
  try { if (navigator.share) { await navigator.share({ title, url }); return; } } catch (e) { return; }
  try { await navigator.clipboard.writeText(url); toast(t("link_copied")); } catch (e) { prompt("", url); }
};

// ---------- Administration des articles ----------
const IDEAS = ["Ouvrir un compte bancaire en Espagne : les étapes", "Le padrón : pourquoi et comment s'inscrire", "Louer un logement : les pièges à éviter", "Comprendre sa facture d'électricité espagnole", "La première déclaration d'impôts en Espagne", "Scolariser ses enfants en Espagne", "Santé : système public ou assurance privée ?", "Apprendre l'espagnol : les méthodes qui marchent", "Les fêtes locales à ne pas manquer ce mois-ci", "Importer sa voiture ou en acheter une en Espagne", "Travailler à distance depuis l'Espagne", "Se faire des amis quand on vient d'arriver"];
async function adminArticles() {
  if (!H.isAdmin) { view.innerHTML = `<section class="narrow"><p class="notice">${esc(t("adm_denied"))}</p></section>`; return; }
  const { data } = await H.sb.from("articles").select("id,title,status,published_at,created_at").order("created_at", { ascending:false }).limit(200);
  const rows = data || [];
  const lastPub = rows.filter(r => r.published_at).map(r => new Date(r.published_at)).sort((a, b) => b - a)[0];
  view.innerHTML = `<section class="page">
    <a class="back" href="#/admin">${esc(t("back"))}</a>
    <div class="titlebar"><h1>${esc(t("art_admin"))}</h1><a class="btn primary" href="#/admin/articles/nouveau">＋ ${esc(t("art_new"))}</a></div>
    ${lastPub ? `<p class="small">${esc(t("art_last"))} ${esc(date(lastPub))}</p>` : ""}
    ${!lastPub || Date.now() - lastPub > 7 * 86400e3 ? `<p class="notice small">${esc(t("art_late"))}</p>` : ""}
    <ul class="admin-list">${rows.map(r => `<li><div><a href="#/admin/articles/${r.id}"><strong>${esc(L(r.title) || "—")}</strong></a>
      <p class="small"><span class="tag ${r.status === "published" ? "st-going" : ""}">${esc(t(r.status === "published" ? "art_status_published" : "art_status_draft"))}</span> <span class="muted">${esc(date(r.published_at || r.created_at))}</span></p></div></li>`).join("")}</ul>
    <h2>${esc(t("art_ideas"))}</h2><div class="chips">${IDEAS.map((x, i) => `<button class="chip-btn" data-idea="${i}">${esc(x)}</button>`).join("")}</div>
  </section>`;
  $$("[data-idea]", view).forEach(b => b.onclick = () => { try { sessionStorage.setItem("hv_topic", IDEAS[+b.dataset.idea]); } catch (e) {} location.hash = "#/admin/articles/nouveau"; });
}
async function callArticleAI(payload) {
  const { data: { session } } = await H.sb.auth.getSession();
  const r = await fetch("/.netlify/functions/article", { method:"POST", headers:{ "Content-Type":"application/json", Authorization:"Bearer " + (session ? session.access_token : "") }, body: JSON.stringify(payload) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.title) throw new Error(d.error || "error");
  return d;
}
async function articleEditor(key) {
  if (!H.isAdmin) { view.innerHTML = `<section class="narrow"><p class="notice">${esc(t("adm_denied"))}</p></section>`; return; }
  const sb = H.sb, LANGS = H.LANGS;
  let a = { title:{}, body:{}, status:"draft", topic:"" };
  if (key !== "nouveau") { const { data } = await sb.from("articles").select("*").eq("id", +key).maybeSingle(); if (!data) { location.hash = "#/admin/articles"; return; } a = data; }
  else { try { a.topic = sessionStorage.getItem("hv_topic") || ""; sessionStorage.removeItem("hv_topic"); } catch (e) {} }
  let cur = "fr";
  view.innerHTML = `<section class="page">
    <a class="back" href="#/admin/articles">${esc(t("back"))}</a>
    <h1>${esc(key === "nouveau" ? t("art_new") : L(a.title) || t("art_new"))}</h1>
    <p class="notice small">${esc(t("art_review"))}</p>
    <div class="card stack">
      ${field(t("art_topic"), `<input id="atopic" maxlength="300" value="${esc(a.topic || "")}">`, "atopic")}
      <div class="actions"><button class="btn" id="agen">✨ ${esc(t("art_generate"))}</button><button class="btn" id="atr">🌍 ${esc(t("art_translate"))}</button><span class="msg" id="aimsg" role="status"></span></div>
    </div>
    <nav class="tabs" id="altabs">${LANGS.map(l => `<button data-l="${l}" ${l === cur ? 'aria-pressed="true"' : ""}>${esc(H.LANG_NAMES[l])}</button>`).join("")}</nav>
    <div class="stack wide-stack">
      ${field(t("art_title_field"), `<input id="atitle" maxlength="200">`, "atitle")}
      ${field(t("art_body_field"), `<textarea id="abody" rows="18"></textarea>`, "abody")}
    </div>
    <div class="actions"><button class="btn" id="asave">${esc(t("art_save"))}</button>
      <button class="btn primary" id="apub">${esc(t(a.status === "published" ? "art_unpublish" : "art_publish"))}</button>
      ${a.id ? `<a class="btn small" href="#/articles/${a.id}">👁</a><button class="linkbtn" id="adel">${esc(t("delete"))}</button>` : ""}
      <span class="msg" id="amsg" role="status"></span></div>
  </section>`;
  const keep = () => { a.title[cur] = $("#atitle").value; a.body[cur] = $("#abody").value; };
  const show = () => { $("#atitle").value = a.title[cur] || ""; $("#abody").value = a.body[cur] || ""; $$("#altabs button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.l === cur))); };
  $$("#altabs button").forEach(b => b.onclick = () => { keep(); cur = b.dataset.l; show(); });
  show();
  $("#agen").onclick = async () => {
    const topic = $("#atopic").value.trim(); if (!topic) return $("#atopic").focus();
    keep(); $("#aimsg").textContent = t("art_generating");
    try { const d = await callArticleAI({ mode:"draft", topic }); a.topic = topic; a.title.fr = d.title; a.body.fr = d.body; cur = "fr"; show(); $("#aimsg").textContent = ""; }
    catch (e) { $("#aimsg").textContent = t("art_ai_error"); }
  };
  $("#atr").onclick = async () => {
    keep(); if (!a.title.fr || !a.body.fr) { cur = "fr"; show(); return $("#atitle").focus(); }
    for (const l of LANGS.filter(x => x !== "fr")) {
      $("#aimsg").textContent = `${t("art_translating")} ${H.LANG_NAMES[l]}…`;
      try { const d = await callArticleAI({ mode:"translate", to:l, title:a.title.fr, body:a.body.fr }); a.title[l] = d.title; a.body[l] = d.body; }
      catch (e) { $("#aimsg").textContent = t("art_ai_error"); return; }
    }
    $("#aimsg").textContent = "✓"; show();
  };
  const save = async (status) => {
    keep();
    const row = { topic: $("#atopic").value.trim() || null, title: a.title, body: a.body, status: status || a.status, updated_at: new Date().toISOString() };
    if (row.status === "published" && !a.published_at) row.published_at = new Date().toISOString();
    if (row.status === "draft") row.published_at = null;
    const res = a.id ? await sb.from("articles").update(row).eq("id", a.id).select().single() : await sb.from("articles").insert({ ...row, author_id: H.me.id }).select().single();
    if (res.error) { $("#amsg").textContent = errMsg(res.error); return; }
    toast(t("art_saved"));
    const target = "#/admin/articles/" + res.data.id;
    if (location.hash !== target) location.hash = target;
    else if (status) articleEditor(String(res.data.id));
    else a = res.data;
  };
  $("#asave").onclick = () => save();
  $("#apub").onclick = () => save(a.status === "published" ? "draft" : "published");
  const del = $("#adel"); if (del) del.onclick = async () => { if (!confirm(t("confirm_delete"))) return; await sb.from("articles").delete().eq("id", a.id); location.hash = "#/admin/articles"; };
}
});
