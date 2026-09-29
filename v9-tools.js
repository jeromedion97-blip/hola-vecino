// v9 : assistant IA, traducteur, météo, vidéos, guides PDF, pages par ville, profil public et partage,
// parrainage, points et récompenses, newsletter, page « Professionnels »
(window.HV_EXT = window.HV_EXT || []).push((H, ROUTES) => {
const { t, esc, nl2br, $, $$, toast, date, dateTime, avatar, badges, errMsg } = H;
const view = H.view, C = H.C;
const hooks = window.HV_HOOKS = window.HV_HOOKS || {};
const push = (k, f) => (hooks[k] = hooks[k] || []).push(f);
const price = n => new Intl.NumberFormat(H.lang, { style:"currency", currency:"EUR", minimumFractionDigits: n % 1 ? 2 : 0 }).format(n);
const slug = s => H.norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const joinCta = key => `<div class="join-cta"><p><strong>${esc(t(key || "gm_join_t"))}</strong></p><a class="btn primary" href="#/connexion?signup">${esc(t("hero_join"))}</a></div>`;

ROUTES.unshift(
  [/^#\/assistant$/, () => assistant()],
  [/^#\/traducteur$/, () => translator()],
  [/^#\/meteo$/, () => weather()],
  [/^#\/videos$/, () => videos()],
  [/^#\/boutique$/, () => shop()],
  [/^#\/ville\/([\w-]+)$/, m => cityPage(m[1])],
  [/^#\/p\/([\w-]+)$/, m => publicProfile(m[1])],
  [/^#\/parrainage$/, () => referral(), true],
  [/^#\/points$/, () => pointsPage()],
  [/^#\/pro$/, () => proPage()]
);

// ============ PARTAGE ============
H.shareButtons = (url, text) => {
  const u = encodeURIComponent(url), tx = encodeURIComponent(text || "");
  return `<div class="share-row">
    <a class="share-btn wa" href="https://wa.me/?text=${tx}%20${u}" target="_blank" rel="noopener">WhatsApp</a>
    <a class="share-btn fb" href="https://www.facebook.com/sharer/sharer.php?u=${u}" target="_blank" rel="noopener">Facebook</a>
    <a class="share-btn x" href="https://twitter.com/intent/tweet?url=${u}&text=${tx}" target="_blank" rel="noopener">X</a>
    <a class="share-btn tg" href="https://t.me/share/url?url=${u}&text=${tx}" target="_blank" rel="noopener">Telegram</a>
    <button class="share-btn cp" data-copy="${esc(url)}">🔗 ${esc(t("sh_copy"))}</button>
  </div>`;
};
const bindCopy = root => $$("[data-copy]", root).forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.copy); toast(t("link_copied")); } catch (e) { prompt("", b.dataset.copy); } });
H.bindCopy = bindCopy;

// ============ IA : appel commun et quota ============
async function aiCall(payload) {
  const { data: { session } } = await H.sb.auth.getSession();
  const r = await fetch("/.netlify/functions/ai", { method:"POST", headers:{ "Content-Type":"application/json", Authorization:"Bearer " + (session ? session.access_token : "") }, body: JSON.stringify({ ...payload, lang: H.lang }) });
  const d = await r.json().catch(() => ({}));
  if (r.status === 429) throw Object.assign(new Error("quota"), { quota: true });
  if (!r.ok || !d.text) throw new Error(d.error || ("HTTP " + r.status + (r.status === 404 ? " : fonction ai introuvable" : "")));
  return d;
}
async function quotaLine(el) {
  if (!el || !H.me) return;
  const { data: q } = await H.sb.rpc("my_ai_quota");
  if (!q) return;
  el.innerHTML = q.premium ? `✨ ${esc(t("ai_unlimited"))}` : `${esc(t("ai_left"))} <strong>${Math.max(0, 15 - q.day)}</strong> ${esc(t("ai_today"))} · <strong>${Math.max(0, 50 - q.week)}</strong> ${esc(t("ai_week"))} · <a href="#/premium">${esc(t("ai_more"))}</a>`;
}
const quotaMsg = () => `<div class="locked small"><p><strong>${esc(t("ai_quota_t"))}</strong></p><p>${esc(t("ai_quota_d"))}</p><a class="btn primary small" href="#/premium">${esc(t("premium_cta"))}</a></div>`;

// ============ ASSISTANT IA ============
function assistant() {
  if (!H.me || !H.myProfile) {
    view.innerHTML = `<section class="page"><h1>🤖 ${esc(t("ai_title"))}</h1><p class="lead">${esc(t("ai_intro"))}</p>
      <div class="chat-demo"><div class="bubble mine"><p>${esc(t("ai_s1"))}</p></div><div class="bubble"><p>${esc(t("ai_demo"))}</p></div></div>${joinCta("ai_join")}</section>`;
    return;
  }
  const key = "hv_ai_" + H.me.id;
  let hist = []; try { hist = JSON.parse(sessionStorage.getItem(key) || "[]"); } catch (e) {}
  view.innerHTML = `<section class="page assistant">
    <div class="titlebar"><h1>🤖 ${esc(t("ai_title"))}</h1><button class="linkbtn small" id="aiclear">${esc(t("ai_clear"))}</button></div>
    <p class="muted">${esc(t("ai_intro"))}</p><p class="small quota" id="aiq"></p>
    <div class="bubbles ai-box" id="aibox"></div>
    <div class="chips" id="aisug">${[1,2,3,4,5].map(i => `<button class="chip-btn" data-s="${i}">${esc(t("ai_s" + i))}</button>`).join("")}</div>
    <form class="composer" id="aif"><label class="sr" for="aiin">${esc(t("ai_ask"))}</label><textarea id="aiin" rows="2" maxlength="1500" placeholder="${esc(t("ai_ask"))}"></textarea><button class="btn primary">${esc(t("send"))}</button></form>
    ${window.HV_LAWYER ? window.HV_LAWYER(t, esc) : ""}
  </section>`;
  const box = $("#aibox");
  const draw = () => { box.innerHTML = hist.length ? hist.map(m => `<div class="bubble ${m.role === "user" ? "mine" : ""}"><p>${nl2br(m.content)}</p></div>`).join("") : `<p class="muted small">${esc(t("ai_hello"))}</p>`; box.scrollTop = box.scrollHeight; $("#aisug").hidden = hist.length > 0; };
  const save = () => { try { sessionStorage.setItem(key, JSON.stringify(hist.slice(-20))); } catch (e) {} };
  const ask = async q => {
    q = q.trim(); if (!q) return;
    hist.push({ role:"user", content:q }); draw(); save();
    box.insertAdjacentHTML("beforeend", `<div class="bubble typing" id="typing"><p>…</p></div>`); box.scrollTop = box.scrollHeight;
    try { const d = await aiCall({ mode:"assistant", history: hist.slice(-8) }); hist.push({ role:"assistant", content:d.text }); save(); draw(); }
    catch (e) { const ty = $("#typing"); if (ty) ty.remove(); hist.pop(); save(); draw(); box.insertAdjacentHTML("beforeend", e.quota ? quotaMsg() : `<p class="notice small">${esc(t("ai_error"))}${H.isAdmin ? `<br><code>${esc(e.message)}</code>` : ""}</p>`); }
    quotaLine($("#aiq"));
  };
  $("#aif").onsubmit = e => { e.preventDefault(); const v = $("#aiin").value; $("#aiin").value = ""; ask(v); };
  $("#aiin").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#aif").requestSubmit(); } });
  $$("[data-s]", view).forEach(b => b.onclick = () => ask(t("ai_s" + b.dataset.s)));
  $("#aiclear").onclick = () => { hist = []; save(); draw(); };
  draw(); quotaLine($("#aiq"));
}

// ============ TRADUCTEUR ============
const VOICE = { fr:"fr-FR", en:"en-GB", es:"es-ES", de:"de-DE", nl:"nl-NL" };
function speak(text, l) { if (!("speechSynthesis" in window) || !text) return; const u = new SpeechSynthesisUtterance(text); u.lang = VOICE[l] || "es-ES"; speechSynthesis.cancel(); speechSynthesis.speak(u); }
function translator() {
  const opts = sel => H.LANGS.map(l => `<option value="${l}" ${l === sel ? "selected" : ""}>${esc(H.LANG_NAMES[l])}</option>`).join("");
  view.innerHTML = `<section class="page translator"><h1>🌍 ${esc(t("tr_title"))}</h1><p class="lead">${esc(t("tr_intro"))}</p>
    ${H.me && H.myProfile ? `<p class="small quota" id="trq"></p>
    <div class="tr-grid">
      <div class="tr-col"><select id="trfrom" aria-label="${esc(t("tr_from"))}">${opts(H.lang)}</select>
        <textarea id="trin" rows="7" maxlength="2000" placeholder="${esc(t("tr_placeholder"))}"></textarea>
        <div class="actions"><span class="small muted" id="trcount">0 / 2000</span><button class="linkbtn small" id="trspk1">🔊 ${esc(t("gm_listen"))}</button></div></div>
      <button class="btn swap" id="trswap" aria-label="⇄">⇄</button>
      <div class="tr-col"><select id="trto" aria-label="${esc(t("tr_to"))}">${opts(H.lang === "es" ? "en" : "es")}</select>
        <textarea id="trout" rows="7" readonly></textarea>
        <div class="actions"><button class="linkbtn small" id="trcopy">📋 ${esc(t("sh_copy"))}</button><button class="linkbtn small" id="trspk2">🔊 ${esc(t("gm_listen"))}</button></div></div>
    </div>
    <div class="actions"><button class="btn primary" id="trgo">${esc(t("tr_go"))}</button><span class="msg" id="trmsg" role="status"></span></div>` : joinCta("tr_join")}
  </section>`;
  if (!H.me || !H.myProfile) return;
  $("#trin").oninput = () => { $("#trcount").textContent = `${$("#trin").value.length} / 2000`; };
  $("#trswap").onclick = () => { const a = $("#trfrom").value; $("#trfrom").value = $("#trto").value; $("#trto").value = a; const x = $("#trin").value; $("#trin").value = $("#trout").value; $("#trout").value = x; };
  $("#trspk1").onclick = () => speak($("#trin").value, $("#trfrom").value);
  $("#trspk2").onclick = () => speak($("#trout").value, $("#trto").value);
  $("#trcopy").onclick = async () => { try { await navigator.clipboard.writeText($("#trout").value); toast(t("link_copied")); } catch (e) {} };
  $("#trgo").onclick = async () => {
    const text = $("#trin").value.trim(); if (!text) return $("#trin").focus();
    if ($("#trfrom").value === $("#trto").value) { $("#trout").value = text; return; }
    $("#trmsg").textContent = t("loading");
    try { const d = await aiCall({ mode:"translate", from: $("#trfrom").value, to: $("#trto").value, text }); $("#trout").value = d.text; $("#trmsg").textContent = ""; }
    catch (e) { $("#trmsg").innerHTML = e.quota ? quotaMsg() : esc(t("ai_error")) + (H.isAdmin ? `<br><code>${esc(e.message)}</code>` : ""); }
    quotaLine($("#trq"));
  };
  quotaLine($("#trq"));
}

// ============ MÉTÉO ============
const CITIES = [
  ["Andalucía","Sevilla",37.39,-5.98],["Andalucía","Málaga",36.72,-4.42],["Andalucía","Granada",37.18,-3.60],["Andalucía","Almería",36.84,-2.46],["Andalucía","Cádiz",36.53,-6.29],["Andalucía","Marbella",36.51,-4.88],
  ["Comunitat Valenciana","Valencia",39.47,-0.38],["Comunitat Valenciana","Alicante",38.35,-0.49],["Comunitat Valenciana","Benidorm",38.54,-0.13],["Comunitat Valenciana","Torrevieja",37.98,-0.68],["Comunitat Valenciana","Castellón",39.99,-0.05],
  ["Región de Murcia","Murcia",37.99,-1.13],["Región de Murcia","Cartagena",37.60,-0.98],
  ["Catalunya","Barcelona",41.39,2.17],["Catalunya","Tarragona",41.12,1.25],["Catalunya","Girona",41.98,2.82],
  ["Madrid","Madrid",40.42,-3.70],["Illes Balears","Palma",39.57,2.65],["Illes Balears","Ibiza",38.91,1.43],
  ["Canarias","Las Palmas",28.12,-15.43],["Canarias","Santa Cruz de Tenerife",28.46,-16.25],
  ["País Vasco","Bilbao",43.26,-2.93],["País Vasco","San Sebastián",43.32,-1.98],["Galicia","A Coruña",43.36,-8.41],["Galicia","Vigo",42.24,-8.72],
  ["Aragón","Zaragoza",41.65,-0.89],["Asturias","Oviedo",43.36,-5.85]
];
H.HV_CITIES = CITIES;
const WX = c => c === 0 ? "☀️" : c <= 2 ? "🌤️" : c === 3 ? "☁️" : c <= 48 ? "🌫️" : c <= 57 ? "🌦️" : c <= 67 ? "🌧️" : c <= 77 ? "❄️" : c <= 82 ? "🌧️" : "⛈️";
async function forecast(list) {
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${list.map(c => c[2]).join(",")}&longitude=${list.map(c => c[3]).join(",")}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=4&timezone=auto`;
  const d = await (await fetch(u)).json();
  return Array.isArray(d) ? d : [d];
}
const dayName = s => new Date(s + "T12:00:00").toLocaleDateString(H.lang, { weekday:"short" });
const days4 = w => w.daily.time.map((d, i) => `<span class="wx-day"><span>${esc(dayName(d))}</span><span>${WX(w.daily.weather_code[i])}</span><span><strong>${Math.round(w.daily.temperature_2m_max[i])}°</strong> ${Math.round(w.daily.temperature_2m_min[i])}°</span></span>`).join("");
async function weather() {
  const regions = [...new Set(CITIES.map(c => c[0]))];
  view.innerHTML = `<section class="page wide"><h1>🌞 ${esc(t("wx_title"))}</h1><p class="lead">${esc(t("wx_intro"))}</p>
    <div class="tools"><label class="sr" for="wxr">${esc(t("wx_region"))}</label><select id="wxr"><option value="">${esc(t("wx_all"))}</option>${regions.map(r => `<option>${esc(r)}</option>`).join("")}</select></div>
    <div id="wxmap" class="map"></div><div id="wxlist" class="wx-grid"><p>${esc(t("loading"))}</p></div><p class="muted small">${esc(t("wx_source"))}</p></section>`;
  let data = [];
  try { data = await forecast(CITIES); } catch (e) { $("#wxlist").innerHTML = `<p class="notice">${esc(t("wx_error"))}</p>`; return; }
  let map = null, layer = null;
  if (window.L) { map = L.map("wxmap").setView([39.6, -3.7], 5); L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution:"© OpenStreetMap" }).addTo(map); layer = L.layerGroup().addTo(map); H.onCleanup(() => map.remove()); }
  const draw = () => {
    const r = $("#wxr").value, idx = CITIES.map((c, i) => i).filter(i => !r || CITIES[i][0] === r);
    if (layer) {
      layer.clearLayers();
      idx.forEach(i => { const c = CITIES[i], w = data[i]; if (!w || !w.current) return;
        L.marker([c[2], c[3]], { icon: L.divIcon({ className:"wx-pin", html:`<span>${WX(w.current.weather_code)} ${Math.round(w.current.temperature_2m)}°</span>`, iconSize:[64, 28] }) })
          .bindPopup(`<strong>${esc(c[1])}</strong><div class="wx-days">${days4(w)}</div>`).addTo(layer); });
      const pts = idx.map(i => [CITIES[i][2], CITIES[i][3]]);
      if (pts.length) map.fitBounds(pts, { padding:[30, 30], maxZoom: 8 });
    }
    $("#wxlist").innerHTML = idx.map(i => { const c = CITIES[i], w = data[i]; if (!w || !w.current) return "";
      return `<article class="wx-card"><header><a href="#/ville/${slug(c[1])}"><strong>${esc(c[1])}</strong></a><span class="wx-now">${WX(w.current.weather_code)} ${Math.round(w.current.temperature_2m)}°</span></header><p class="small muted">${esc(c[0])}</p><div class="wx-days">${days4(w)}</div></article>`; }).join("");
  };
  $("#wxr").onchange = draw; draw();
}
// Météo de ma ville sur le tableau de bord
push("dashboard", async () => {
  const side = $(".dash-side", view), city = ((H.myProfile || {}).city || "").trim(); if (!side || !city) return;
  try {
    let c = CITIES.find(x => H.norm(x[1]) === H.norm(city));
    if (!c) { const g = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&country=ES`)).json(); const r = (g.results || [])[0]; if (!r) return; c = ["", r.name, r.latitude, r.longitude]; }
    const [w] = await forecast([c]); if (!w || !w.current) return;
    side.insertAdjacentHTML("afterbegin", `<a class="wx-mini" href="#/meteo"><span class="wx-now">${WX(w.current.weather_code)} ${Math.round(w.current.temperature_2m)}°</span><span><strong>${esc(c[1])}</strong><span class="wx-days">${days4(w)}</span></span></a>`);
  } catch (e) {}
});

// ============ VIDÉOS ============
const ytId = u => { const m = (u || "").match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/)([\w-]{11})/); return m ? m[1] : null; };
function loadScript(src, done) { const old = document.querySelector(`script[src="${src}"]`); if (old) old.remove(); const s = document.createElement("script"); s.src = src; s.async = true; s.onload = done || null; document.body.appendChild(s); }
function embed(v) {
  if (v.platform === "youtube") { const id = ytId(v.url); return id ? `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1" title="${esc(v.title || "YouTube")}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>` : ""; }
  if (v.platform === "tiktok") { const id = (v.url.match(/video\/(\d+)/) || [])[1] || ""; setTimeout(() => loadScript("https://www.tiktok.com/embed.js"), 50); return `<blockquote class="tiktok-embed" cite="${esc(v.url)}" data-video-id="${esc(id)}"><section><a href="${esc(v.url)}" target="_blank" rel="noopener">TikTok</a></section></blockquote>`; }
  setTimeout(() => loadScript("https://www.instagram.com/embed.js", () => { if (window.instgrm) window.instgrm.Embeds.process(); }), 50);
  return `<blockquote class="instagram-media" data-instgrm-permalink="${esc(v.url)}" data-instgrm-version="14"><a href="${esc(v.url)}" target="_blank" rel="noopener">Instagram</a></blockquote>`;
}
async function videos() {
  view.innerHTML = `<section class="page wide"><h1>🎬 ${esc(t("vd_title"))}</h1><p class="lead">${esc(t("vd_intro"))}</p>
    <h2>${esc(t("yt_latest"))}</h2><div class="yt-grid" id="vlatest"><p class="muted">${esc(t("loading"))}</p></div>
    <h2>${esc(t("vd_shorts"))}</h2><p class="muted small">${esc(t("vd_privacy"))}</p>
    ${H.isAdmin ? `<form id="vadd" class="card stack"><strong>${esc(t("vd_add"))}</strong><input id="vurl" type="url" required placeholder="https://www.tiktok.com/@…/video/… · https://www.instagram.com/reel/… · https://youtube.com/shorts/…"><input id="vtitle" maxlength="120" placeholder="${esc(t("vd_title_ph"))}"><button class="btn primary small">${esc(t("vd_add_btn"))}</button></form>` : ""}
    <div class="shorts-grid" id="vshorts"></div>
    ${window.HV_SOCIAL ? window.HV_SOCIAL(t("follow_us")) : ""}</section>`;
  const id = (C.YOUTUBE_CHANNEL_ID || "").trim();
  if (id) {
    try {
      const d = await (await fetch(`/.netlify/functions/youtube?channel=${encodeURIComponent(id)}`)).json();
      $("#vlatest").innerHTML = (d.videos || []).length ? d.videos.map(v => `<article class="yt"><button class="yt-thumb" data-yt="${esc(v.id)}" aria-label="${esc(v.title)}"><img src="https://i.ytimg.com/vi/${esc(v.id)}/hqdefault.jpg" alt="" loading="lazy"><span class="yt-play" aria-hidden="true"></span></button><div class="yt-body"><strong>${esc(v.title)}</strong><p class="small muted">${esc(date(v.published))}</p></div></article>`).join("") : `<p class="empty">${esc(t("vd_none"))}</p>`;
      $$("[data-yt]", view).forEach(b => b.onclick = () => { b.outerHTML = `<div class="yt-thumb">${embed({ platform:"youtube", url:"https://youtu.be/" + b.dataset.yt })}</div>`; });
    } catch (e) { $("#vlatest").innerHTML = `<p class="empty">${esc(t("vd_none"))}</p>`; }
  } else $("#vlatest").innerHTML = `<p class="empty">${esc(t("vd_none"))}</p>`;
  const load = async () => {
    const { data } = H.configured ? await H.sb.from("videos").select("*").order("created_at", { ascending:false }).limit(60) : { data: [] };
    const rows = data || [];
    $("#vshorts").innerHTML = rows.length ? rows.map(v => `<article class="short" data-id="${v.id}"><div class="short-frame"><button class="short-play" data-play="${v.id}"><span class="pf pf-${v.platform}">${v.platform === "tiktok" ? "TikTok" : v.platform === "instagram" ? "Reels" : "Shorts"}</span><span class="yt-play" aria-hidden="true"></span><span class="small">${esc(t("vd_load"))}</span></button></div>
      <p class="small"><strong>${esc(v.title || "")}</strong></p>${H.isAdmin ? `<button class="linkbtn small" data-vdel="${v.id}">${esc(t("delete"))}</button>` : ""}</article>`).join("") : `<p class="empty">${esc(t("vd_none"))}</p>`;
    $$("[data-play]", view).forEach(b => b.onclick = () => { const v = rows.find(x => String(x.id) === b.dataset.play); b.parentElement.innerHTML = embed(v); });
    $$("[data-vdel]", view).forEach(b => b.onclick = async () => { if (!confirm(t("confirm_delete"))) return; await H.sb.from("videos").delete().eq("id", b.dataset.vdel); load(); });
  };
  const f = $("#vadd");
  if (f) f.onsubmit = async e => {
    e.preventDefault(); const url = $("#vurl").value.trim();
    const platform = /tiktok\.com/.test(url) ? "tiktok" : /instagram\.com/.test(url) ? "instagram" : /youtu/.test(url) ? "youtube" : null;
    if (!platform) return toast(t("vd_bad"));
    const { error } = await H.sb.from("videos").insert({ platform, url, title: $("#vtitle").value.trim() || null, added_by: H.me.id });
    if (error) return toast(errMsg(error)); f.reset(); load();
  };
  load();
}

// ============ BOUTIQUE : GUIDES PDF ============
const GUIDES = [["complete","guide-complet.pdf","📘"],["achat","guide-achat.pdf","🏠"],["impots","guide-impots.pdf","🧾"],["autonomo","guide-autonomo.pdf","💼"],["retraite","guide-retraite.pdf","🌅"]];
function shop() {
  const P = C.PRICES || {}, links = C.GUMROAD_LINKS || {}, p = H.myProfile || {};
  const annual = H.isAdmin || (["year", "all_in"].includes(p.premium_plan) && p.premium_until && new Date(p.premium_until) > new Date());
  const buy = k => (k === "course" ? links.course || "" : links["guide_" + k] || "").trim();
  view.innerHTML = `<section class="page wide"><h1>📚 ${esc(t("sp_title"))}</h1><p class="lead">${esc(t("sp_intro"))}</p>
    ${annual ? `<p class="ok">🎁 ${esc(t("sp_offered"))}</p>` : `<p class="notice small">🎁 ${esc(t("sp_offer_note"))} <a href="#/premium">${esc(t("premium_cta"))}</a></p>`}
    <article class="course-card"><div class="course-flags" aria-hidden="true">🇪🇸</div><div class="course-body">
      <p class="tag obj">${esc(t("sp_course_new"))}</p><h2>${esc(t("sp_course"))}</h2><p>${esc(t("sp_course_d"))}</p>
      <ul class="ticks small">${["sp_course_f1","sp_course_f2","sp_course_f3","sp_course_f4"].map(k => `<li>${esc(t(k))}</li>`).join("")}</ul>
      <p class="guide-price">${price(P.course || 12.9)}</p>
      <div class="actions">${buy("course") ? `<a class="btn primary" href="${esc(buy("course"))}" target="_blank" rel="noopener">${esc(t("lst_buy"))}</a>` : ""}
        ${annual ? ["fr","en","de","nl"].map(l => `<button class="btn ${l === (H.lang === "es" ? "en" : H.lang) ? "primary" : ""}" data-dl="espagnol-${l}.pdf">⬇ ${esc(H.LANG_NAMES[l])}</button>`).join("") : ""}</div></div></article>
    <div class="guide-grid">${GUIDES.map(([k, file, ic]) => `<article class="guide-card ${k === "complete" ? "gc-main" : ""}"><span class="guide-ic" aria-hidden="true">${ic}</span>
      <h2>${esc(t("sp_" + k))}</h2><p>${esc(t("sp_" + k + "_d"))}</p><p class="guide-price">${price(k === "complete" ? (P.guide_complete || 9.9) : (P.guide_theme || 4.9))}</p>
      <div class="actions">${buy(k) ? `<a class="btn primary" href="${esc(buy(k))}" target="_blank" rel="noopener">${esc(t("lst_buy"))}</a>` : ""}${annual ? `<button class="btn" data-dl="${file}">⬇ ${esc(t("sp_download"))}</button>` : ""}</div></article>`).join("")}
      <article class="guide-card pack"><span class="guide-ic" aria-hidden="true">🎁</span><h2>${esc(t("sp_pack"))}</h2><p>${esc(t("sp_pack_d"))}</p><p class="guide-price">${price(P.guide_pack || 19.9)}</p>
        <div class="actions">${buy("pack") ? `<a class="btn primary" href="${esc(buy("pack"))}" target="_blank" rel="noopener">${esc(t("lst_buy"))}</a>` : ""}</div></article>
    </div>${window.HV_LAWYER ? window.HV_LAWYER(t, esc) : ""}</section>`;
  $$("[data-dl]", view).forEach(b => b.onclick = async () => {
    const w = window.open("", "_blank");
    try {
      const { data: { session } } = await H.sb.auth.getSession();
      const r = await fetch("/.netlify/functions/pro-files", { method:"POST", headers:{ "Content-Type":"application/json", Authorization:"Bearer " + session.access_token }, body: JSON.stringify({ action:"guide", file: b.dataset.dl }) });
      const d = await r.json(); if (!d.url) throw 0; if (w) w.location = d.url; else location.href = d.url;
    } catch (e) { if (w) w.close(); toast(t("sp_dl_error")); }
  });
}

// ============ PAGES PAR VILLE ============
async function cityPage(s) {
  const c = CITIES.find(x => slug(x[1]) === s);
  if (!c) { location.hash = "#/meteo"; return; }
  view.innerHTML = `<section class="page city-page"><p class="muted">${esc(c[0])}</p><h1>${esc(t("ct_title"))} ${esc(c[1])}</h1>
    <p class="lead">${esc(t("ct_intro"))}</p><div id="cwx"></div><div class="stats-band" id="cst"></div>
    <div class="door-list">
      <a class="door" href="#/guide"><span class="door-tile" aria-hidden="true"></span><span><strong>${esc(t("home_guide_t"))}</strong><span>${esc(t("home_guide_d"))}</span></span></a>
      <a class="door" href="#/finances"><span class="door-tile" aria-hidden="true"></span><span><strong>${esc(t("home_fin_t"))}</strong><span>${esc(t("home_fin_d"))}</span></span></a>
      <a class="door" href="#/communaute"><span class="door-tile" aria-hidden="true"></span><span><strong>${esc(t("home_comm_t"))}</strong><span>${esc(t("home_comm_d"))}</span></span></a>
      <a class="door" href="#/bons-plans"><span class="door-tile" aria-hidden="true"></span><span><strong>${esc(t("home_deals_t"))}</strong><span>${esc(t("home_deals_d"))}</span></span></a>
    </div>${H.me ? "" : joinCta("ct_join")}</section>`;
  try { const [w] = await forecast([c]); $("#cwx").innerHTML = `<div class="wx-card"><header><strong>${esc(c[1])}</strong><span class="wx-now">${WX(w.current.weather_code)} ${Math.round(w.current.temperature_2m)}°</span></header><div class="wx-days">${days4(w)}</div></div>`; } catch (e) {}
  if (H.configured) { const { data: st } = await H.sb.rpc("city_stats", { p_city: c[1] });
    if (st) $("#cst").innerHTML = `<span><strong>${st.members}</strong> ${esc(t("members"))}</span><span><strong>${st.events}</strong> ${esc(t("gm_events_up"))}</span><span><strong>${st.listings}</strong> ${esc(t("nav_deals"))}</span>${H.me ? "" : `<a class="btn primary" href="#/connexion?signup">${esc(t("gm_join_free"))}</a>`}`; }
}
// Liens vers les villes sur l'accueil
push("home", () => {
  const box = document.createElement("section"); box.className = "home-block city-links";
  box.innerHTML = `<h2>${esc(t("ct_links"))}</h2><div class="chips">${CITIES.slice(0, 16).map(c => `<a class="chip-btn" href="#/ville/${slug(c[1])}">${esc(c[1])}</a>`).join("")}</div>`;
  view.appendChild(box);
});

// ============ PROFIL PUBLIC ET PARTAGE ============
const LEVELS = [[0,"lv_1"],[100,"lv_2"],[500,"lv_3"],[1000,"lv_4"],[2500,"lv_5"]];
const levelOf = pts => LEVELS.filter(l => (pts || 0) >= l[0]).pop();
H.levelOf = levelOf;
async function publicProfile(id) {
  view.innerHTML = `<p>${esc(t("loading"))}</p>`;
  const { data: p } = H.configured ? await H.sb.rpc("public_profile", { uid: id }) : { data: null };
  if (!p) { view.innerHTML = `<section class="narrow"><p class="notice">${esc(t("pp_private"))}</p>${H.me ? "" : joinCta("ct_join")}</section>`; return; }
  const url = location.origin + location.pathname + "#/p/" + p.id;
  view.innerHTML = `<section class="narrow public-card">
    <div class="pc-head">${avatar(p, "big")}<div><h1>${esc(p.display_name)}</h1><p class="tags">${badges(p)}<span class="tag obj">${esc(t(levelOf(p.points)[1]))}</span></p>
    <p class="muted">${esc([p.city, p.origin_country ? H.dn("region", p.origin_country) : ""].filter(Boolean).join(" · "))}</p></div></div>
    ${p.bio ? `<p class="bio">${nl2br(p.bio)}</p>` : ""}
    ${(p.languages || []).length ? `<p class="small">${esc(t("f_languages"))} : ${(p.languages || []).map(H.langName).map(esc).join(", ")}</p>` : ""}
    <p class="small">⭐ ${p.points || 0} ${esc(t("pt_points"))}</p>
    ${H.me && H.me.id !== p.id ? `<a class="btn primary" href="#/profil/${p.id}">${esc(t("view_profile"))}</a>` : ""}
    <h2>${esc(t("sh_title"))}</h2>${H.shareButtons(url, `${p.display_name} — Hola Vecino`)}
    ${H.me ? "" : joinCta("ct_join")}</section>`;
  bindCopy(view);
}
// Sur son propre profil : partager
(hooks.profile = hooks.profile || []).push(p => {
  if (!H.me || p.id !== H.me.id) return;
  const page = $(".page", view); if (!page) return;
  const url = location.origin + location.pathname + "#/p/" + p.id;
  page.insertAdjacentHTML("beforeend", `<section class="card"><h2>📣 ${esc(t("sh_mine"))}</h2>${p.public_profile ? H.shareButtons(url, `${p.display_name} — Hola Vecino`) : `<p class="small">${esc(t("sh_enable"))} <a href="#/mon-profil">${esc(t("nav_profile"))}</a></p>`}</section>`);
  bindCopy(page);
});

// ============ PARRAINAGE ============
async function referral() {
  const url = location.origin + location.pathname + "?ref=" + H.me.id;
  const { count } = await H.sb.from("profiles").select("id", { count:"exact", head:true }).eq("referred_by", H.me.id);
  view.innerHTML = `<section class="narrow"><h1>🤝 ${esc(t("rf_title"))}</h1><p class="lead">${esc(t("rf_intro"))}</p>
    <div class="card"><p class="small muted">${esc(t("rf_link"))}</p><p class="ref-link"><code>${esc(url)}</code></p>${H.shareButtons(url, t("rf_share_text"))}</div>
    <div class="stats-band"><span><strong>${count || 0}</strong> ${esc(t("rf_count"))}</span><span><strong>${(count || 0) * 50}</strong> ${esc(t("pt_points"))}</span></div>
    <p class="small muted">${esc(t("rf_rules"))} <a href="#/points">${esc(t("nav_points"))}</a></p></section>`;
  bindCopy(view);
}

// ============ POINTS ET RÉCOMPENSES ============
const RULES = [["pt_r_intro",20],["pt_r_post",10],["pt_r_review",15],["pt_r_event",20],["pt_r_group",10],["pt_r_recommend",10],["pt_r_reply",5],["pt_r_rsvp",5],["pt_r_friend",5],["pt_r_comment",2],["pt_r_game",2],["pt_r_referral",50]];
async function pointsPage() {
  const p = H.myProfile, pts = p ? (p.points || 0) : 0, lv = levelOf(pts), next = (Math.floor(pts / 1000) + 1) * 1000;
  view.innerHTML = `<section class="page"><h1>🏆 ${esc(t("pt_title"))}</h1><p class="lead">${esc(t("pt_intro"))}</p>
    ${p ? `<div class="points-hero"><div><p class="big">${pts} <span>${esc(t("pt_points"))}</span></p><p><span class="tag obj">${esc(t(lv[1]))}</span></p></div>
      <div class="pt-next"><p class="small">${esc(t("pt_next"))} : <strong>${next - pts}</strong> ${esc(t("pt_points"))}</p><p class="progress"><span class="bar"><span style="width:${Math.round((pts % 1000) / 10)}%"></span></span></p></div></div>` : joinCta("pt_join")}
    <div class="points-grid"><section class="card"><h2>${esc(t("pt_how"))}</h2><ul class="pt-rules">${RULES.map(([k, n]) => `<li><span>${esc(t(k))}</span><strong>+${n}</strong></li>`).join("")}</ul><p class="small muted">${esc(t("pt_caps"))}</p></section>
    <section class="card"><h2>${esc(t("pt_rewards"))}</h2><p>🎁 ${esc(t("pt_reward_1000"))}</p><p>🥇 ${esc(t("pt_reward_top"))}</p><p class="small muted">${esc(t("pt_review_note"))}</p><div class="board-box" id="ptboard"></div></section></div>
    ${p ? `<section class="card"><h2>${esc(t("pt_history"))}</h2><div id="pthist"><p class="muted small">${esc(t("loading"))}</p></div></section>` : ""}</section>`;
  if (!H.configured) return;
  const { data: top } = await H.sb.rpc("points_leaderboard", { p_days: 30 });
  $("#ptboard").innerHTML = `<h3>${esc(t("pt_month"))}</h3>` + ((top || []).length ? `<ol class="board">${top.map((r, i) => `<li class="${H.me && r.user_id === H.me.id ? "me" : ""}"><span class="rank">${["🥇","🥈","🥉"][i] || i + 1}</span>${avatar(r, "tiny")}<span class="bn">${esc(r.display_name)}</span><strong>${r.total}</strong></li>`).join("")}</ol>` : `<p class="muted small">${esc(t("gm_board_empty"))}</p>`);
  if (p) {
    const { data: h } = await H.sb.from("points_log").select("action,amount,created_at").order("created_at", { ascending:false }).limit(20);
    $("#pthist").innerHTML = (h || []).length ? `<ul class="pt-rules">${h.map(x => `<li><span>${esc(t("pt_r_" + x.action))} <span class="muted small">${esc(dateTime(x.created_at))}</span></span><strong>+${x.amount}</strong></li>`).join("")}</ul>` : `<p class="muted small">${esc(t("pt_none"))}</p>`;
  }
}

// ============ PAGE PROFESSIONNELS ============
function proPage() {
  const P = C.PRICES || {}, L = C.GUMROAD_LINKS || {};
  const feat = keys => `<ul class="ticks">${keys.map(k => `<li>${esc(t(k))}</li>`).join("")}</ul>`;
  view.innerHTML = `<section class="page"><h1>💼 ${esc(t("pro_title"))}</h1><p class="lead">${esc(t("pro_intro"))}</p><div id="prolaunch"></div>
    <div class="premium-grid">
      <div class="plan"><h2>${esc(t("pro_simple"))}</h2><p class="plan-price"><strong>${price(P.pro_month || 14.9)}</strong>${esc(t("per_month"))}</p><p class="muted">${price(P.pro_year || 119)}${esc(t("per_year"))}</p>
        ${feat(["pro_f_link","pro_f_short","pro_f_langs","pro_f_reviews"])}
        <div class="actions"><a class="btn" href="${H.me ? "#/annonces/nouvelle" : "#/connexion?signup"}">${esc(t("lst_new"))}</a>${L.pro ? `<a class="btn" href="${esc(L.pro)}" target="_blank" rel="noopener">${esc(t("lst_buy"))}</a>` : ""}</div></div>
      <div class="plan plan-premium"><h2>${esc(t("pro_full"))}</h2><p class="plan-price"><strong>${price(P.pro_full_month || 49.9)}</strong>${esc(t("per_month"))}</p><p class="muted">${price(P.pro_full_year || 499)}${esc(t("per_year"))}</p>
        ${feat(["pro_f_page","pro_f_photos","pro_f_hours","pro_f_reviews","pro_f_featured","pro_f_stats"])}
        <div class="actions"><a class="btn primary" href="${H.me ? "#/annonces/nouvelle" : "#/connexion?signup"}">${esc(t("lst_new"))}</a>${L.pro_full ? `<a class="btn" href="${esc(L.pro_full)}" target="_blank" rel="noopener">${esc(t("lst_buy"))}</a>` : ""}</div></div>
    </div>
    <section class="card"><h2>⚖️ ${esc(t("pro_legal_t"))}</h2><p>${esc(t("pro_legal_d"))}</p><a class="btn small" href="${H.me ? "#/mon-profil" : "#/connexion?signup"}">${esc(t("pro_verify"))}</a></section>
  </section>`;
  if (H.configured) H.sb.rpc("launch_offer_status").then(({ data: o }) => {
    if (!o || (o.full <= 0 && o.simple <= 0)) return;
    $("#prolaunch").innerHTML = `<section class="launch-box"><h2>🎁 ${esc(t("launch_title"))}</h2><p>${esc(t("launch_d"))}</p>
      <p class="launch-count"><span><strong>${o.full}</strong> ${esc(t("launch_left_full"))}</span><span><strong>${o.simple}</strong> ${esc(t("launch_left_simple"))}</span></p>
      <a class="btn primary" href="${H.me ? "#/annonces/nouvelle" : "#/connexion?signup"}">${esc(t("launch_start"))}</a></section>`;
  });
}

// ============ NEWSLETTER ============
async function subscribe(email, msgEl) {
  const { error } = await H.sb.from("newsletter").insert({ email: email.trim().toLowerCase(), lang: H.lang });
  const ok = !error || String(error.code) === "23505" || /duplicate/i.test(error.message || "");
  if (msgEl) msgEl.textContent = ok ? t("nl_ok") : t("nl_error");
  return ok;
}
const nlForm = id => `<form class="nl-form" id="${id}"><label class="sr" for="${id}-e">${esc(t("nl_email"))}</label><input id="${id}-e" type="email" required placeholder="${esc(t("nl_email"))}"><button class="btn small primary">${esc(t("nl_btn"))}</button><span class="msg small" role="status"></span></form>`;
push("header", () => {
  const f = $("#footer"); if (!f || !H.configured || $("#nlfoot", f)) return;
  f.insertAdjacentHTML("afterbegin", `<div class="nl-foot"><p><strong>✉️ ${esc(t("nl_title"))}</strong> <span class="small">${esc(t("nl_desc"))}</span></p>${nlForm("nlfoot")}</div>`);
  $("#nlfoot").onsubmit = e => { e.preventDefault(); subscribe($("#nlfoot-e").value, $("#nlfoot .msg")); };
  // Fenêtre d'invitation pour les visiteurs, une seule fois par mois
  if (H.me) return;
  let views = 0; try { views = +sessionStorage.getItem("hv_views") + 1; sessionStorage.setItem("hv_views", views); if (Date.now() - (+localStorage.getItem("hv_nl_later") || 0) < 30 * 86400e3) return; } catch (e) { return; }
  if (views !== 2) return;
  setTimeout(() => {
    if (H.me || $("#nlpop")) return;
    const pop = document.createElement("div"); pop.id = "nlpop"; pop.className = "nl-pop"; pop.setAttribute("role", "dialog");
    pop.innerHTML = `<button class="lb-close" aria-label="${esc(t("close"))}">×</button><p class="big">🌴 ${esc(t("nl_pop_t"))}</p><p>${esc(t("nl_pop_d"))}</p>${nlForm("nlpopf")}<p class="small"><a href="#/connexion?signup">${esc(t("gm_join_free"))}</a></p>`;
    document.body.appendChild(pop);
    const close = () => { pop.remove(); try { localStorage.setItem("hv_nl_later", String(Date.now())); } catch (e) {} };
    $(".lb-close", pop).onclick = close;
    $("#nlpopf").onsubmit = async e => { e.preventDefault(); if (await subscribe($("#nlpopf-e").value, $("#nlpopf .msg"))) setTimeout(close, 1500); };
    $("a", pop).addEventListener("click", close);
  }, 25000);
});
});
