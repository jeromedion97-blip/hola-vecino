(() => {
"use strict";
const C = window.APP_CONFIG, I18N = window.I18N, GUIDE = window.GUIDE;
const LANGS = ["fr","en","es","de","nl"];
const FLAGS = {
  fr:'<svg viewBox="0 0 3 2"><rect width="1" height="2" fill="#002395"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#ED2939"/></svg>',
  en:'<svg viewBox="0 0 60 30"><clipPath id="uk"><path d="M30,15h30v15zv15h-30zh-30v-15zv-15h30z"/></clipPath><path d="M0,0v30h60v-30z" fill="#012169"/><path d="M0,0 60,30M60,0 0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 60,30M60,0 0,30" clip-path="url(#uk)" stroke="#C8102E" stroke-width="4"/><path d="M30,0v30M0,15h60" stroke="#fff" stroke-width="10"/><path d="M30,0v30M0,15h60" stroke="#C8102E" stroke-width="6"/></svg>',
  es:'<svg viewBox="0 0 3 2"><rect width="3" height="2" fill="#AA151B"/><rect y=".5" width="3" height="1" fill="#F1BF00"/></svg>',
  de:'<svg viewBox="0 0 5 3"><rect width="5" height="1" fill="#000"/><rect y="1" width="5" height="1" fill="#DD0000"/><rect y="2" width="5" height="1" fill="#FFCE00"/></svg>',
  nl:'<svg viewBox="0 0 9 6"><rect width="9" height="2" fill="#AE1C28"/><rect y="2" width="9" height="2" fill="#fff"/><rect y="4" width="9" height="2" fill="#21468B"/></svg>'
};
const LANG_NAMES = { fr:"Français", en:"English", es:"Español", de:"Deutsch", nl:"Nederlands" };

// Listes d'options (les libellés sont dans i18n.js)
const OPT = {
  status:["resident","planning","seasonal","nomad","student"],
  gender:["woman","man","nb","na"],
  family:["single","couple","family","singleparent"],
  work:["employee","remote","self","retired","seeking","student","other"],
  looking:["friends","housing","job","language","activities","admin","business","childcare","advice"],
  housing:["renting","owner","searching","hosted"],
  spanish:["none","basic","mid","fluent","native"],
  forum:["admin","housing","work","health","family","taxes","social","market","general"],
  contact:["lawyer","gestoria","bank","doctor","realestate","insurance","translator","school","other"]
};
const SPOKEN = "fr en es de nl it pt ca eu gl pl ro ru uk ar zh sv da no fi cs hu el tr".split(" ");
const COUNTRIES = "AD AE AF AL AM AO AR AT AU AZ BA BD BE BG BO BR BY CA CH CL CN CO CR CU CY CZ DE DK DO DZ EC EE EG ES ET FI FR GB GE GH GR GT HN HR HU ID IE IL IN IQ IR IS IT JM JO JP KE KR KW KZ LB LT LU LV LY MA MC MD ME MK MX NG NI NL NO NZ PA PE PH PK PL PT PY QA RO RS RU SA SE SG SI SK SN SV SY TN TR UA US UY VE VN ZA".split(" ");

// Moyennes indicatives (€/mois) : loyers [petit centre, petit hors centre, grand centre, grand hors centre], prix au m², énergie/eau, transport, courses par adulte
const CITIES = {
  madrid:{n:"Madrid",r:[1400,1050,2300,1700],m2:5200,u:125,tr:25,f:260},
  barcelona:{n:"Barcelona",r:[1350,1050,2200,1650],m2:4800,u:125,tr:25,f:260},
  valencia:{n:"Valencia",r:[1050,800,1550,1150],m2:2800,u:115,tr:30,f:235},
  alicante:{n:"Alicante",r:[900,700,1300,1000],m2:2600,u:110,tr:30,f:225},
  malaga:{n:"Málaga",r:[1250,950,1800,1350],m2:3900,u:115,tr:30,f:235},
  marbella:{n:"Marbella",r:[1500,1150,2400,1750],m2:5200,u:120,tr:30,f:255},
  sevilla:{n:"Sevilla",r:[950,750,1400,1050],m2:2600,u:125,tr:35,f:225},
  granada:{n:"Granada",r:[750,600,1100,850],m2:2200,u:110,tr:35,f:215},
  murcia:{n:"Murcia",r:[700,550,1000,800],m2:1600,u:115,tr:30,f:215},
  torrevieja:{n:"Torrevieja",r:[800,650,1100,850],m2:2100,u:105,tr:20,f:215},
  palma:{n:"Palma de Mallorca",r:[1400,1100,2100,1600],m2:4800,u:120,tr:30,f:265},
  bilbao:{n:"Bilbao",r:[1050,850,1550,1200],m2:3700,u:125,tr:35,f:255},
  zaragoza:{n:"Zaragoza",r:[800,650,1150,900],m2:2100,u:115,tr:30,f:225},
  laspalmas:{n:"Las Palmas de Gran Canaria",r:[950,750,1350,1050],m2:2600,u:85,tr:35,f:235},
  tenerife:{n:"Santa Cruz de Tenerife",r:[900,700,1250,950],m2:2300,u:85,tr:35,f:235},
  other:{n:null,r:[950,750,1400,1050],m2:2500,u:115,tr:30,f:230}
};

// ---------- État ----------
let lang = (() => {
  try { const s = localStorage.getItem("lang"); if (LANGS.includes(s)) return s; } catch (e) {}
  const n = (navigator.language || "en").slice(0,2); return LANGS.includes(n) ? n : "en";
})();
const configured = !!(C.SUPABASE_URL && !C.SUPABASE_URL.includes("VOTRE") && window.supabase);
const sb = configured ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;
let me = null, myProfile = null, cleanup = [];

// ---------- Outils ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const view = $("#view");
const t = k => (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const nl2br = s => esc(s).replace(/\n/g, "<br>");
const dn = (type, code) => { try { return new Intl.DisplayNames([lang], { type }).of(code) || code; } catch (e) { return code; } };
const langName = c => { const s = dn("language", c); return s.charAt(0).toUpperCase() + s.slice(1); };
const money = n => new Intl.NumberFormat(lang, { style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(Math.round(n || 0));
const date = d => new Date(d).toLocaleDateString(lang, { day:"numeric", month:"short", year:"numeric" });
const dateTime = d => new Date(d).toLocaleString(lang, { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" });
const safeUrl = u => /^https?:\/\//i.test(u || "") ? u : (u ? "https://" + u : "");
const N = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const H0 = id => `<div class="searchbox"><label class="sr" for="${id}">${esc(t("search"))}</label><input id="${id}" type="search" placeholder="${esc(t("search"))}" autocomplete="off"></div>`;
const initials = n => esc((n || "?").trim().slice(0,2).toUpperCase());
const optLabel = (prefix, k) => k ? t(prefix + k) : "";
const PREFIX = { status:"st_", gender:"g_", family:"fa_", work:"w_", looking:"l_", housing:"h_", spanish:"sp_", forum:"cat_", contact:"ct_" };

const select = (name, group, val, first = t("choose")) =>
  `<select name="${name}" id="${name}"><option value="">${esc(first)}</option>${OPT[group].map(k => `<option value="${k}" ${val === k ? "selected" : ""}>${esc(t(PREFIX[group] + k))}</option>`).join("")}</select>`;
const countrySelect = (name, val) => {
  const list = COUNTRIES.map(c => [c, dn("region", c)]).sort((a, b) => a[1].localeCompare(b[1], lang));
  return `<select name="${name}" id="${name}"><option value="">${esc(t("choose"))}</option>${list.map(([c, n]) => `<option value="${c}" ${val === c ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>`;
};
const checks = (name, items, vals = []) =>
  `<div class="chips">${items.map(([v, label]) => `<label class="chip"><input type="checkbox" name="${name}" value="${v}" ${vals.includes(v) ? "checked" : ""}><span>${esc(label)}</span></label>`).join("")}</div>`;
const field = (label, input, id) => `<div class="field"><label for="${id}">${esc(label)}</label>${input}</div>`;

function toast(msg) {
  const el = $("#toast"); el.textContent = msg; el.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => el.hidden = true, 3500);
}
async function namesFor(ids) {
  const uniq = [...new Set(ids.filter(Boolean))]; if (!uniq.length) return {};
  const { data } = await sb.from("profiles").select("id,display_name").in("id", uniq);
  return Object.fromEntries((data || []).map(p => [p.id, p.display_name]));
}
async function report(type, id) {
  const reason = prompt(t("report_reason")); if (reason === null) return;
  const { error } = await sb.from("reports").insert({ reporter_id: me.id, target_type: type, target_id: String(id), reason: reason.slice(0, 1000) });
  toast(error ? t("error") + error.message : t("reported"));
}

// ---------- Outils v2 ----------
let isAdmin = false, isPremium = false, myBlocks = new Set(), installPrompt = null;
const lockBox = () => `<div class="locked"><p><strong>${esc(t("premium_locked"))}</strong></p><a class="btn primary" href="#/premium">${esc(t("premium_cta"))}</a></div>`;
const avatar = (p, cls = "") => p && p.avatar_url
  ? `<img class="avatar ${cls}" src="${esc(p.avatar_url)}" alt="" loading="lazy">`
  : `<div class="avatar ${cls}" aria-hidden="true">${initials(p && p.display_name)}</div>`;
const badges = p => (p.verified ? `<span class="tag verified">✓ ${esc(t("badge_verified"))}</span>` : "") + (p.is_guide ? `<span class="tag guide">${esc(t("badge_guide"))}</span>` : "");
const errMsg = e => { const m = (e && e.message) || String(e); if (m.includes("RATE_LIMIT")) return t("rate_limit"); if (m.includes("EVENT_FULL")) return t("ev_full_error"); return t("error") + m; };
const isEU = p => p && p.nationality ? (window.EU_CODES || []).includes(p.nationality) : null;
async function profilesFor(ids) {
  const uniq = [...new Set(ids.filter(Boolean))]; if (!uniq.length) return {};
  const { data } = await sb.from("profiles").select("id,display_name,avatar_url,verified").in("id", uniq);
  return Object.fromEntries((data || []).map(p => [p.id, p]));
}
// Fichier agenda (.ics) avec rappel : fonctionne sur téléphone et ordinateur, sans serveur
function icsDownload(name, items) {
  const pad = n => String(n).padStart(2, "0");
  const day = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const utc = d => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const e = s => String(s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, m => "\\" + m);
  const out = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//HolaVecino//EN", "CALSCALE:GREGORIAN"];
  items.forEach((it, i) => {
    out.push("BEGIN:VEVENT", `UID:${Date.now()}-${i}@hola-vecino`, `DTSTAMP:${utc(new Date())}`);
    if (it.allDay) { const end = new Date(it.start); end.setDate(end.getDate() + 1); out.push(`DTSTART;VALUE=DATE:${day(it.start)}`, `DTEND;VALUE=DATE:${day(end)}`); }
    else { out.push(`DTSTART:${utc(it.start)}`, `DTEND:${utc(it.end || new Date(it.start.getTime() + 2 * 3600e3))}`); }
    out.push(`SUMMARY:${e(it.title)}`);
    if (it.desc) out.push(`DESCRIPTION:${e(it.desc)}`);
    if (it.loc) out.push(`LOCATION:${e(it.loc)}`);
    if (it.alarmMinutes !== null || it.alarmDays) out.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${e(it.title)}`, `TRIGGER:-${it.alarmMinutes != null ? "PT" + it.alarmMinutes + "M" : "P" + (it.alarmDays || 3) + "D"}`, "END:VALARM");
    out.push("END:VEVENT");
  });
  out.push("END:VCALENDAR");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([out.join("\r\n")], { type:"text/calendar" }));
  a.download = name.replace(/[^\w-]+/g, "-").slice(0, 60) + ".ics";
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const BELL = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.84V3.5a1.5 1.5 0 0 0-3 0v.66A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z"/></svg>';

// ---------- En-tête ----------
function renderHeader() {
  document.documentElement.lang = lang;
  const br = $("#brand"); if (br) br.textContent = C.APP_NAME; document.title = C.APP_NAME;
  const links = [["#/", "nav_home"], ["#/guide", "nav_guide"], ["#/finances", "nav_finances"], ["#/communaute", "nav_community"], ["#/evenements", "nav_events"], ["#/forum", "nav_forum"], ["#/articles", "nav_articles"], ["#/bons-plans", "nav_deals"], ["#/youtube", "nav_youtube"], ["#/contacts", "nav_contacts"]];
  if (me) links.push(["#/messages", "nav_messages"]);
  if (isAdmin) links.push(["#/admin", "nav_admin"]);
  const cur = (location.hash || "#/").split("/").slice(0, 2).join("/");
  const badgeId = { nav_messages:"unread", nav_events:"evbadge" };
  $("#nav").innerHTML = links.map(([h, k]) => `<a href="${h}" ${cur === h || (h !== "#/" && cur.startsWith(h)) ? 'aria-current="page"' : ""}>${esc(t(k))}${badgeId[k] ? `<span class="badge" id="${badgeId[k]}" hidden></span>` : ""}</a>`).join("");
  $("#account").innerHTML = me
    ? `<a class="premium-link ${isPremium ? "on" : ""}" href="#/premium">★ ${esc(t("nav_premium"))}</a>
       <a class="bell" href="#/notifications" aria-label="${esc(t("nav_notifications"))}">${BELL}<span class="badge" id="notifcount" hidden></span></a>
       <div class="me-wrap"><button class="me-btn" id="mebtn" aria-haspopup="true" aria-expanded="false">${avatar(myProfile || { display_name: "?" }, "tiny")}<span class="me-name">${esc(((myProfile && myProfile.display_name) || t("nav_profile")).split(" ")[0])}</span><span aria-hidden="true">▾</span></button>
       <ul class="me-menu" id="memenu" hidden>${[["#/mon-profil","nav_profile"],["#/agenda","nav_agenda"],["#/drive","nav_drive"],["#/messages","nav_messages"],["#/notifications","nav_notifications"],["#/mes-annonces","nav_my_listings"],["#/premium","nav_premium"]].concat(isAdmin ? [["#/admin","nav_admin"]] : []).map(([h, k]) => `<li><a href="${h}">${esc(t(k))}</a></li>`).join("")}<li><button class="linkbtn" id="logout">${esc(t("nav_logout"))}</button></li></ul></div>`
    : `<a class="premium-link" href="#/premium">★ ${esc(t("nav_premium"))}</a><a class="btn small primary" href="#/connexion">${esc(t("nav_login"))}</a>`;
  if (me) {
    $("#logout").onclick = async () => { await sb.auth.signOut(); location.hash = "#/"; };
    const mb = $("#mebtn"), mm = $("#memenu");
    mb.onclick = e => { e.stopPropagation(); mm.hidden = !mm.hidden; mb.setAttribute("aria-expanded", String(!mm.hidden)); };
    mm.onclick = () => { mm.hidden = true; mb.setAttribute("aria-expanded", "false"); };
  }
  $("#langbtn").innerHTML = `<span class="flag">${FLAGS[lang]}</span><span class="sr">${LANG_NAMES[lang]}</span>`;
  $("#langlist").innerHTML = LANGS.map(l => `<li><button data-lang="${l}" ${l === lang ? 'aria-current="true"' : ""}><span class="flag">${FLAGS[l]}</span>${LANG_NAMES[l]}</button></li>`).join("");
  $("#footer").innerHTML = `<p class="footer-links"><a href="#/premium">${esc(t("nav_premium"))}</a> · <a href="${me ? "#/mes-annonces" : "#/bons-plans"}">${esc(t(me ? "nav_my_listings" : "publish_listing"))}</a> · <a href="#/suggestions">${esc(t("nav_suggestions"))}</a> · <a href="#/contact">${esc(t("nav_contact"))}</a></p>${window.HV_SOCIAL ? window.HV_SOCIAL(t("follow_us")) : ""}<p>${esc(t("footer_disclaimer"))}</p><p><a href="#/charte">${esc(t("charter_title"))}</a> · <a href="#/confidentialite">${esc(t("privacy_title"))}</a> · ${esc(C.APP_NAME)}</p>${installPrompt ? `<p><button class="btn small" id="installbtn">${esc(t("install_app"))}</button></p>` : ""}`;
  const ib = $("#installbtn"); if (ib) ib.onclick = async () => { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; renderHeader(); };
  if (me) refreshCounts();
}
function refreshCounts() {
  const show = (id, n) => { const b = $("#" + id); if (b) { b.textContent = n; b.hidden = !n; } };
  sb.from("messages").select("id", { count:"exact", head:true }).eq("recipient_id", me.id).eq("read", false).then(({ count }) => show("unread", count));
  sb.from("notifications").select("id", { count:"exact", head:true }).eq("user_id", me.id).eq("read", false).then(({ count }) => show("notifcount", count));
  sb.from("event_rsvps").select("event_id", { count:"exact", head:true }).eq("user_id", me.id).eq("status", "invited").then(({ count }) => show("evbadge", count));
}
$("#langbtn").onclick = () => { const l = $("#langlist"); l.hidden = !l.hidden; $("#langbtn").setAttribute("aria-expanded", String(!l.hidden)); };
$("#langlist").onclick = e => {
  const b = e.target.closest("button[data-lang]"); if (!b) return;
  lang = b.dataset.lang; try { localStorage.setItem("lang", lang); } catch (err) {}
  $("#langlist").hidden = true; $("#langbtn").setAttribute("aria-expanded", "false"); route();
};
document.addEventListener("click", e => { if (!e.target.closest(".lang")) $("#langlist").hidden = true; const mm = $("#memenu"); if (mm && !e.target.closest(".me-wrap")) mm.hidden = true; });

// ---------- Routeur ----------
const ROUTES = [
  [/^#\/?$/, () => home()],
  [/^#\/guide(?:\/(\w+))?$/, m => guide(m[1] || "steps")],
  [/^#\/finances$/, () => finances()],
  [/^#\/contacts(?:\/(\w+))?$/, m => contacts(m[1] || "")],
  [/^#\/confidentialite$/, () => privacy()],
  [/^#\/charte$/, () => charter()],
  [/^#\/connexion(\?signup)?$/, m => login("", !!m[1])],
  [/^#\/mon-profil$/, () => profileEdit(), true],
  [/^#\/communaute$/, () => community(), true],
  [/^#\/profil\/([\w-]+)$/, m => profileView(m[1]), true],
  [/^#\/forum$/, () => forum(), true],
  [/^#\/forum\/(\d+)$/, m => thread(+m[1]), true],
  [/^#\/messages$/, () => messages(), true],
  [/^#\/messages\/([\w-]+)$/, m => conversation(m[1]), true]
];
async function route() {
  cleanup.forEach(f => { try { f(); } catch (e) {} }); cleanup = [];
  const hash = location.hash || "#/";
  renderHeader();
  for (const [re, fn, needAuth] of ROUTES) {
    const m = hash.match(re); if (!m) continue;
    if (needAuth) {
      if (!configured) return notConfigured();
      if (!me) return login(t("login_required"), false);
      if (!myProfile && !hash.startsWith("#/mon-profil")) { location.hash = "#/mon-profil"; return; }
    }
    window.scrollTo(0, 0); view.focus({ preventScroll:true });
    return fn(m);
  }
  home();
}
window.addEventListener("hashchange", route);

async function loadMe() {
  if (!sb) return;
  const { data: { session } } = await sb.auth.getSession();
  me = session?.user || null; myProfile = null; isAdmin = false; isPremium = false; myBlocks = new Set();
  if (me) {
    const [{ data: p }, { data: a }, { data: b }] = await Promise.all([
      sb.from("profiles").select("*").eq("id", me.id).maybeSingle(),
      sb.from("admins").select("user_id").eq("user_id", me.id).maybeSingle(),
      sb.from("blocks").select("blocked_id").eq("blocker_id", me.id)
    ]);
    myProfile = p; isAdmin = !!a; myBlocks = new Set((b || []).map(x => x.blocked_id));
    if (myProfile) { try { const { data: until } = await sb.rpc("claim_premium"); if (until) myProfile.premium_until = until; } catch (e) {} }
  }
  isPremium = isAdmin || !!(myProfile && myProfile.premium_until && new Date(myProfile.premium_until) > new Date());
}

function notConfigured() {
  view.innerHTML = `<section class="narrow"><h1>Configuration</h1><p class="notice">Supabase n'est pas encore configuré : renseignez SUPABASE_URL et SUPABASE_ANON_KEY dans js/config.js (voir README).<br>Supabase is not configured yet: fill in js/config.js.</p></section>`;
}

// ---------- Accueil ----------
function home() {
  const doors = [["#/guide","guide"],["#/finances","fin"],["#/communaute","comm"],["#/contacts","contacts"],["#/bons-plans","deals"],["#/youtube","yt"]];
  view.innerHTML = `
  <section class="hero">
    <div class="hero-text">
      <h1>${esc(t("hero_title"))}</h1>
      <p class="lead">${esc(t("hero_text"))}</p>
      <div class="actions">
        ${me ? "" : `<a class="btn primary" href="#/connexion?signup">${esc(t("hero_join"))}</a>`}
        <a class="btn" href="#/guide">${esc(t("hero_guide"))}</a>
      </div>
    </div>
    <div class="hero-logo"><img src="logo-600.png" alt="${esc(C.APP_NAME)}" width="600" height="600"></div>
  </section>
  <section class="doors">
    ${doors.map(([h, k], i) => `<a class="door d${i}" href="${h}"><span class="door-tile" aria-hidden="true"></span><span><strong>${esc(t("home_" + k + "_t"))}</strong><span>${esc(t("home_" + k + "_d"))}</span></span></a>`).join("")}
  </section>`;
  (window.HV_HOOKS && window.HV_HOOKS.home || []).forEach(f => { try { f(); } catch (e) {} });
}

// ---------- Connexion ----------
function login(notice = "", signup = false) {
  if (!configured) return notConfigured();
  const draw = () => {
    view.innerHTML = `<section class="narrow">
      <h1>${esc(t(signup ? "signup_title" : "login_title"))}</h1>
      ${notice ? `<p class="notice">${esc(notice)}</p>` : ""}
      <form id="authf" class="stack">
        ${field(t("email"), `<input type="email" id="email" name="email" required autocomplete="email">`, "email")}
        ${field(t("password"), `<input type="password" id="password" name="password" minlength="8" required autocomplete="${signup ? "new-password" : "current-password"}">`, "password")}
        ${signup ? `<label class="check"><input type="checkbox" required> <span>${esc(t("accept_charter"))} (<a href="#/charte" target="_blank">${esc(t("charter_title"))}</a>, <a href="#/confidentialite" target="_blank">${esc(t("privacy_title"))}</a>)</span></label>` : ""}
        <button class="btn primary">${esc(t(signup ? "signup_btn" : "login_btn"))}</button>
        <p class="msg" role="status"></p>
      </form>
      <button class="linkbtn" id="toggle">${esc(t(signup ? "to_login" : "to_signup"))}</button>
    </section>`;
    $("#toggle").onclick = () => { signup = !signup; notice = ""; draw(); };
    $("#authf").onsubmit = async e => {
      e.preventDefault();
      const f = new FormData(e.target), email = f.get("email"), password = f.get("password"), msg = $(".msg");
      msg.textContent = t("loading");
      if (signup) {
        const { data, error } = await sb.auth.signUp({ email, password, options:{ emailRedirectTo: location.origin } });
        if (error) { msg.textContent = t("error") + error.message; return; }
        if (!data.session) msg.textContent = t("check_email");
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) msg.textContent = t("auth_error");
      }
    };
  };
  draw();
}

// ---------- Profil (édition) ----------
async function uploadAvatar(file) {
  const img = await createImageBitmap(file);
  const s = Math.min(img.width, img.height), size = 320, c = document.createElement("canvas");
  c.width = c.height = size;
  c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
  const blob = await new Promise(r => c.toBlob(r, "image/jpeg", .85));
  const path = `${me.id}/avatar-${Date.now()}.jpg`;
  const { error } = await sb.storage.from("avatars").upload(path, blob, { contentType:"image/jpeg", upsert:true });
  if (error) throw error;
  await removeAvatars(path);
  return sb.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}
async function removeAvatars(keep) {
  const { data: files } = await sb.storage.from("avatars").list(me.id);
  const old = (files || []).map(f => `${me.id}/${f.name}`).filter(p => p !== keep);
  if (old.length) await sb.storage.from("avatars").remove(old);
}
function profileEdit() {
  const p = myProfile || {};
  let avatarUrl = p.avatar_url || null;
  const spoken = SPOKEN.map(c => [c, langName(c)]);
  view.innerHTML = `<section class="page">
    <h1>${esc(t("profile_title"))}</h1><p class="muted">${esc(t("profile_intro"))}</p>
    <form id="pf" class="profile-form">
      <fieldset><legend>${esc(t("sec_identity"))}</legend>
      <div class="avatar-edit"><span id="avprev">${avatar({ ...p, avatar_url: avatarUrl, display_name: p.display_name || "?" }, "big")}</span>
        <div><span class="label">${esc(t("f_avatar"))}</span>
        <div class="actions"><label class="btn small" for="avfile">${esc(t("avatar_change"))}</label><input type="file" id="avfile" accept="image/*" class="sr">
        <button type="button" class="linkbtn" id="avrm" ${avatarUrl ? "" : "hidden"}>${esc(t("avatar_remove"))}</button><span class="msg small" id="avmsg"></span></div></div></div>
      <div class="grid">
        ${field(t("f_name") + " *", `<input id="display_name" name="display_name" required minlength="2" maxlength="40" value="${esc(p.display_name)}">`, "display_name")}
        ${field(t("f_age"), `<input id="age" name="age" type="number" min="16" max="110" value="${esc(p.age)}">`, "age")}
        ${field(t("f_gender"), select("gender", "gender", p.gender), "gender")}
        ${field(t("f_nationality"), countrySelect("nationality", p.nationality), "nationality")}
        ${field(t("f_origin"), countrySelect("origin_country", p.origin_country), "origin_country")}
        ${field(t("f_spanish"), select("spanish_level", "spanish", p.spanish_level), "spanish_level")}
      </div>
      <div class="field"><span class="label">${esc(t("f_languages"))}</span>${checks("languages", spoken, p.languages || [])}</div></fieldset>

      <fieldset><legend>${esc(t("sec_situation"))}</legend><div class="grid">
        ${field(t("f_status"), select("status", "status", p.status), "status")}
        ${field(t("f_arrival"), `<input id="arrival_date" name="arrival_date" type="date" value="${esc(p.arrival_date)}">`, "arrival_date")}
        ${field(t("f_city"), `<input id="city" name="city" maxlength="80" value="${esc(p.city)}">`, "city")}
        ${field(t("f_region"), `<input id="region" name="region" maxlength="80" value="${esc(p.region)}">`, "region")}
        ${field(t("f_housing"), select("housing", "housing", p.housing), "housing")}
        ${field(t("f_family"), select("family", "family", p.family), "family")}
        ${field(t("f_children"), `<input id="children" name="children" type="number" min="0" max="20" value="${esc(p.children ?? 0)}">`, "children")}
      </div>
      <label class="check"><input type="checkbox" name="pets" ${p.pets ? "checked" : ""}> ${esc(t("f_pets"))}</label></fieldset>

      <fieldset><legend>${esc(t("sec_life"))}</legend><div class="grid">
        ${field(t("f_work"), select("work_situation", "work", p.work_situation), "work_situation")}
        ${field(t("f_profession"), `<input id="profession" name="profession" maxlength="80" value="${esc(p.profession)}">`, "profession")}
      </div>
      <div class="field"><span class="label">${esc(t("f_looking"))}</span>${checks("looking_for", OPT.looking.map(k => [k, t("l_" + k)]), p.looking_for || [])}</div>
      <label class="check"><input type="checkbox" name="is_guide" ${p.is_guide ? "checked" : ""}> ${esc(t("f_is_guide"))}</label></fieldset>

      <fieldset><legend>${esc(t("sec_about"))}</legend>
        ${field(t("f_interests"), `<input id="interests" name="interests" maxlength="500" value="${esc(p.interests)}">`, "interests")}
        ${field(t("f_bio"), `<textarea id="bio" name="bio" rows="5" maxlength="1500">${esc(p.bio)}</textarea>`, "bio")}
      </fieldset>

      <fieldset><legend>${esc(t("sec_map"))}</legend>
        <label class="check"><input type="checkbox" name="show_on_map" id="show_on_map" ${p.show_on_map ? "checked" : ""}> ${esc(t("f_showmap"))}</label>
        <p class="muted small">${esc(t("f_map_help"))}</p>
        <div id="pickmap" class="map small-map" ${p.show_on_map ? "" : "hidden"}></div>
      </fieldset>

      <div class="actions"><button class="btn primary">${esc(t("save"))}</button><span class="msg" role="status"></span></div>
    </form>
    ${myProfile ? `<hr><div class="actions"><button class="btn" id="logout2">${esc(t("nav_logout"))}</button><button class="btn danger" id="del">${esc(t("delete_account"))}</button></div>` : ""}
  </section>`;

  const refreshPrev = () => { $("#avprev").innerHTML = avatar({ avatar_url: avatarUrl, display_name: $("#display_name").value || "?" }, "big"); $("#avrm").hidden = !avatarUrl; };
  $("#avfile").onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    $("#avmsg").textContent = t("avatar_uploading");
    try { avatarUrl = await uploadAvatar(file); $("#avmsg").textContent = ""; refreshPrev(); }
    catch (err) { $("#avmsg").textContent = errMsg(err); }
  };
  $("#avrm").onclick = async () => { await removeAvatars(null); avatarUrl = null; refreshPrev(); };

  let pos = p.lat != null ? [p.lat, p.lng] : null, map = null, marker = null;
  const mk = ll => L.circleMarker(ll, { radius:10, color:"#1E4E8C", fillColor:"#F2B705", fillOpacity:.9 });
  const initMap = () => {
    if (map || !window.L) return;
    map = L.map("pickmap").setView(pos || [40.2, -3.7], pos ? 11 : 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution:"© OpenStreetMap", maxZoom:14 }).addTo(map);
    if (pos) marker = mk(pos).addTo(map);
    map.on("click", e => {
      pos = [Math.round(e.latlng.lat * 100) / 100, Math.round(e.latlng.lng * 100) / 100];
      if (marker) marker.setLatLng(pos); else marker = mk(pos).addTo(map);
    });
    cleanup.push(() => map.remove());
  };
  if (p.show_on_map) initMap();
  $("#show_on_map").onchange = e => { $("#pickmap").hidden = !e.target.checked; if (e.target.checked) { initMap(); setTimeout(() => map.invalidateSize(), 50); } };

  $("#pf").onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target), msg = $("#pf .msg");
    const val = k => (f.get(k) || "").toString().trim() || null;
    const row = {
      id: me.id, display_name: val("display_name"), age: val("age") ? +val("age") : null,
      gender: val("gender"), nationality: val("nationality"), origin_country: val("origin_country"),
      languages: f.getAll("languages"), spanish_level: val("spanish_level"),
      status: val("status"), arrival_date: val("arrival_date"), city: val("city"), region: val("region"),
      housing: val("housing"), family: val("family"), children: +(val("children") || 0), pets: !!f.get("pets"),
      work_situation: val("work_situation"), profession: val("profession"), looking_for: f.getAll("looking_for"),
      is_guide: !!f.get("is_guide"), interests: val("interests"), bio: val("bio"), avatar_url: avatarUrl,
      show_on_map: !!f.get("show_on_map") && !!pos, lat: pos ? pos[0] : null, lng: pos ? pos[1] : null
    };
    if (!myProfile) row.charter_accepted_at = new Date().toISOString();
    msg.textContent = t("loading");
    const { data, error } = await sb.from("profiles").upsert(row).select().single();
    if (error) { msg.textContent = errMsg(error); return; }
    const first = !myProfile; myProfile = data; msg.textContent = t("saved"); renderHeader();
    if (first) location.hash = "#/communaute";
  };
  const lo = $("#logout2"); if (lo) lo.onclick = async () => { await sb.auth.signOut(); location.hash = "#/"; };
  const del = $("#del");
  if (del) del.onclick = async () => {
    if (!confirm(t("delete_confirm"))) return;
    try { await removeAvatars(null); } catch (e) {}
    try { const { data: docs } = await sb.from("documents").select("path"); if (docs && docs.length) await sb.storage.from("documents").remove(docs.map(d => d.path)); } catch (e) {}
    const { error } = await sb.rpc("delete_my_account");
    if (error) { toast(errMsg(error)); return; }
    await sb.auth.signOut(); location.hash = "#/";
  };
}

// ---------- Communauté (carte + liste) ----------
async function community() {
  const spoken = SPOKEN.map(c => [c, langName(c)]);
  view.innerHTML = `<section class="page wide">
    <h1>${esc(t("community_title"))}</h1><p class="muted">${esc(t("community_help"))}</p>
    <div class="filters">
      ${field(t("filter_city"), `<input id="fcity" type="search">`, "fcity")}
      ${field(t("filter_status"), select("fstatus", "status", "", t("all")), "fstatus")}
      ${field(t("filter_language"), `<select id="flang"><option value="">${esc(t("all"))}</option>${spoken.map(([c, n]) => `<option value="${c}">${esc(n)}</option>`).join("")}</select>`, "flang")}
      ${field(t("filter_looking"), select("flook", "looking", "", t("all")), "flook")}
    </div>
    ${H0("fq")}
    <label class="check"><input type="checkbox" id="fguide"> ${esc(t("filter_guides"))}</label>
    <div id="map" class="map"></div>
    <p class="count muted"></p>
    <div id="list" class="members"><p>${esc(t("loading"))}</p></div>
  </section>`;
  const { data, error } = await sb.from("profiles")
    .select("id,display_name,age,city,region,status,languages,looking_for,lat,lng,show_on_map,origin_country,spanish_level,avatar_url,verified,is_guide,profession,interests")
    .order("updated_at", { ascending:false }).limit(1000);
  if (error) { $("#list").innerHTML = `<p class="notice">${esc(errMsg(error))}</p>`; return; }
  const people = data.filter(p => !myBlocks.has(p.id));
  const map = L.map("map").setView([40.2, -3.7], 6);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution:"© OpenStreetMap", maxZoom:13 }).addTo(map);
  const layer = L.layerGroup().addTo(map);
  cleanup.push(() => map.remove());

  const apply = () => {
    const city = $("#fcity").value.trim().toLowerCase(), st = $("#fstatus").value, lg = $("#flang").value, lk = $("#flook").value, gd = $("#fguide").checked, fq = N($("#fq").value);
    const rows = people.filter(p =>
      (!city || `${p.city || ""} ${p.region || ""}`.toLowerCase().includes(city)) &&
      (!st || p.status === st) && (!lg || (p.languages || []).includes(lg)) && (!lk || (p.looking_for || []).includes(lk)) && (!gd || p.is_guide) &&
      (!fq || N(`${p.display_name} ${p.profession || ""} ${p.interests || ""}`).includes(fq)));
    layer.clearLayers();
    rows.filter(p => p.show_on_map && p.lat != null).forEach(p => {
      L.circleMarker([p.lat, p.lng], { radius:8, color:"#1E4E8C", weight:2, fillColor: p.id === me.id ? "#5C7A3A" : p.is_guide ? "#B3261E" : "#F2B705", fillOpacity:.9 })
        .bindPopup(`<strong>${esc(p.display_name)}</strong>${p.verified ? " ✓" : ""}<br>${esc(p.city || "")}<br><a href="#/profil/${p.id}">${esc(t("view_profile"))}</a>`).addTo(layer);
    });
    $(".count").textContent = `${rows.length} ${t("members")}`;
    $("#list").innerHTML = rows.length ? rows.map(memberCard).join("") : `<p class="empty">${esc(t("no_results"))}</p>`;
  };
  ["#fcity", "#fstatus", "#flang", "#flook", "#fguide", "#fq"].forEach(s => $(s).addEventListener("input", apply));
  apply();
}
function memberCard(p) {
  const meta = [p.age ? `${p.age} ${t("years")}` : "", p.city, p.origin_country ? dn("region", p.origin_country) : ""].filter(Boolean).map(esc).join(" · ");
  return `<article class="member ${p.is_guide ? "is-guide" : ""}">
    ${avatar(p)}
    <div class="member-body">
      <h3><a href="#/profil/${p.id}">${esc(p.display_name)}</a>${p.id === me.id ? ` <span class="muted small">(${esc(t("you"))})</span>` : ""}</h3>
      <p class="tags">${badges(p)}</p>
      <p class="muted small">${meta}</p>
      ${p.status ? `<p class="small">${esc(t("st_" + p.status))}</p>` : ""}
      ${(p.languages || []).length ? `<p class="small">${(p.languages || []).map(c => esc(langName(c))).join(", ")}</p>` : ""}
    </div>
    ${p.id !== me.id ? `<a class="btn small" href="#/messages/${p.id}">${esc(t("send_message"))}</a>` : ""}
  </article>`;
}

// ---------- Profil (lecture) ----------
async function profileView(id) {
  view.innerHTML = `<p>${esc(t("loading"))}</p>`;
  const { data: p } = await sb.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!p) { view.innerHTML = `<section class="narrow"><p class="notice">${esc(t("profile_missing"))}</p></section>`; return; }
  const rows = [
    ["f_age", p.age ? `${p.age} ${t("years")}` : ""], ["f_gender", optLabel("g_", p.gender)],
    ["f_nationality", p.nationality ? dn("region", p.nationality) : ""], ["f_origin", p.origin_country ? dn("region", p.origin_country) : ""],
    ["f_city", [p.city, p.region].filter(Boolean).join(", ")], ["f_status", optLabel("st_", p.status)],
    ["f_arrival", p.arrival_date ? date(p.arrival_date) : ""], ["f_family", optLabel("fa_", p.family)],
    ["f_children", p.children ? String(p.children) : ""], ["f_housing", optLabel("h_", p.housing)],
    ["f_work", optLabel("w_", p.work_situation)], ["f_profession", p.profession],
    ["f_spanish", optLabel("sp_", p.spanish_level)], ["f_languages", (p.languages || []).map(langName).join(", ")],
    ["f_looking", (p.looking_for || []).map(k => t("l_" + k)).join(", ")], ["f_interests", p.interests]
  ].filter(r => r[1]);
  const blocked = myBlocks.has(p.id), mine = p.id === me.id;
  view.innerHTML = `<section class="page">
    <a class="back" href="#/communaute">${esc(t("back"))}</a>
    <div class="profile-head">${avatar(p, "big")}<div><h1>${esc(p.display_name)}</h1><p class="tags">${badges(p)}</p></div></div>
    ${blocked ? `<p class="notice">${esc(t("blocked_notice"))}</p>` : ""}
    ${p.bio ? `<p class="bio">${nl2br(p.bio)}</p>` : ""}
    <dl class="facts">${rows.map(([k, v]) => `<div><dt>${esc(t(k))}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
    ${mine ? `<a class="btn" href="#/mon-profil">${esc(t("nav_profile"))}</a>` : `<div class="actions">
      ${blocked ? "" : `<a class="btn primary" href="#/messages/${p.id}">${esc(t("send_message"))}</a>`}
      <button class="linkbtn" id="blk">${esc(t(blocked ? "unblock" : "block"))}</button>
      <button class="linkbtn" id="rep">${esc(t("report"))}</button></div>`}
  </section>`;
  (window.HV_HOOKS && window.HV_HOOKS.profile || []).forEach(f => { try { f(p); } catch (e) {} });
  if (mine) return;
  $("#rep").onclick = () => report("profile", p.id);
  $("#blk").onclick = async () => {
    if (blocked) { await sb.from("blocks").delete().eq("blocker_id", me.id).eq("blocked_id", p.id); myBlocks.delete(p.id); }
    else { if (!confirm(t("block_confirm"))) return; const { error } = await sb.from("blocks").insert({ blocker_id: me.id, blocked_id: p.id }); if (error) return toast(errMsg(error)); myBlocks.add(p.id); }
    profileView(id);
  };
}

// ---------- Forum ----------
let forumCat = "", forumMyCity = false;
async function forum() {
  const myCity = myProfile && myProfile.city;
  view.innerHTML = `<section class="page">
    <div class="titlebar"><h1>${esc(t("forum_title"))}</h1><button class="btn primary" id="newbtn">${esc(t("new_thread"))}</button></div>
    <nav class="tabs" aria-label="${esc(t("category"))}">
      <button data-c="" ${forumCat === "" ? 'aria-pressed="true"' : ""}>${esc(t("all"))}</button>
      ${OPT.forum.map(c => `<button data-c="${c}" ${forumCat === c ? 'aria-pressed="true"' : ""}>${esc(t("cat_" + c))}</button>`).join("")}
    </nav>
    ${myCity ? `<label class="check"><input type="checkbox" id="mycity" ${forumMyCity ? "checked" : ""}> ${esc(t("my_city"))} : ${esc(myCity)}</label>` : ""}
    <form id="nt" class="stack card" hidden>
      ${field(t("category"), select("category", "forum", forumCat || "general"), "category")}
      ${field(t("thread_title"), `<input id="ttitle" name="title" required minlength="3" maxlength="140">`, "ttitle")}
      ${field(t("f_thread_city"), `<input id="tcity" name="city" maxlength="80" value="${esc(myCity || "")}">`, "tcity")}
      ${field(t("thread_body"), `<textarea id="tbody" name="body" rows="6" required maxlength="5000"></textarea>`, "tbody")}
      <div class="actions"><button class="btn primary">${esc(t("publish"))}</button><button type="button" class="linkbtn" id="ntcancel">${esc(t("cancel"))}</button></div>
    </form>
    ${H0("thq")}
    <div id="threads"><p>${esc(t("loading"))}</p></div>
  </section>`;
  $("#newbtn").onclick = () => { $("#nt").hidden = false; $("#ttitle").focus(); };
  $("#ntcancel").onclick = () => $("#nt").hidden = true;
  $$(".tabs button").forEach(b => b.onclick = () => { forumCat = b.dataset.c; forum(); });
  const mc = $("#mycity"); if (mc) mc.onchange = () => { forumMyCity = mc.checked; forum(); };
  $("#nt").onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target);
    const { data, error } = await sb.from("forum_threads").insert({ author_id: me.id, category: f.get("category"), title: f.get("title").trim(), city: (f.get("city") || "").trim() || null, body: f.get("body").trim() }).select().single();
    if (error) { toast(errMsg(error)); return; }
    location.hash = "#/forum/" + data.id;
  };
  let q = sb.from("forum_threads").select("id,title,category,city,author_id,created_at,last_activity,forum_replies(count)").order("last_activity", { ascending:false }).limit(100);
  if (forumCat) q = q.eq("category", forumCat);
  if (forumMyCity && myCity) q = q.ilike("city", myCity);
  const { data, error } = await q;
  if (error) { $("#threads").innerHTML = `<p class="notice">${esc(errMsg(error))}</p>`; return; }
  const rows = data.filter(th => !myBlocks.has(th.author_id));
  const names = await namesFor(rows.map(d => d.author_id));
  const drawT = () => { const q = N($("#thq").value); const shown = rows.filter(th => !q || N(th.title).includes(q));
  $("#threads").innerHTML = shown.length ? `<ul class="threads">${shown.map(th => `<li>
      <a href="#/forum/${th.id}"><strong>${esc(th.title)}</strong></a>
      <span class="muted small">${esc(t("cat_" + th.category))}${th.city ? ` · <span class="tag">${esc(th.city)}</span>` : ""} · ${esc(names[th.author_id] || "?")} · ${esc(date(th.last_activity))} · ${th.forum_replies?.[0]?.count || 0} ${esc(t("replies"))}</span>
    </li>`).join("")}</ul>` : `<p class="empty">${esc(q ? t("no_match") : t("no_threads"))}</p>`; };
  $("#thq").addEventListener("input", drawT); drawT();
}
async function thread(id) {
  view.innerHTML = `<p>${esc(t("loading"))}</p>`;
  const [{ data: th }, { data: replies }] = await Promise.all([
    sb.from("forum_threads").select("*").eq("id", id).maybeSingle(),
    sb.from("forum_replies").select("*").eq("thread_id", id).order("created_at")
  ]);
  if (!th) { location.hash = "#/forum"; return; }
  const visible = (replies || []).filter(r => !myBlocks.has(r.author_id));
  const people = await profilesFor([th.author_id, ...visible.map(r => r.author_id)]);
  const post = (x, type) => { const a = people[x.author_id] || { display_name:"?" }; return `<article class="post" data-type="${type}" data-id="${x.id}">
    <header>${avatar(a, "tiny")} <a href="#/profil/${x.author_id}"><strong>${esc(a.display_name)}</strong></a>${a.verified ? ' <span class="tag verified">✓</span>' : ""} <span class="muted small">${esc(dateTime(x.created_at))}</span></header>
    <p>${nl2br(x.body)}</p>
    <footer>${x.author_id === me.id || isAdmin ? `<button class="linkbtn" data-act="del">${esc(t("delete"))}</button>` : ""}${x.author_id !== me.id ? ` <button class="linkbtn" data-act="rep">${esc(t("report"))}</button>` : ""}</footer>
  </article>`; };
  view.innerHTML = `<section class="page">
    <a class="back" href="#/forum">${esc(t("back"))}</a>
    <p class="muted small">${esc(t("cat_" + th.category))}${th.city ? ` · <span class="tag">${esc(th.city)}</span>` : ""}</p>
    <h1>${esc(th.title)}</h1>
    ${post(th, "thread")}
    <div class="replies">${visible.map(r => post(r, "reply")).join("")}</div>
    <form id="rf" class="stack">
      ${field(t("reply"), `<textarea id="rbody" name="body" rows="4" required maxlength="5000"></textarea>`, "rbody")}
      <div class="actions"><button class="btn primary">${esc(t("reply"))}</button></div>
    </form>
  </section>`;
  view.querySelectorAll(".post footer button").forEach(b => b.onclick = async () => {
    const art = b.closest(".post"), type = art.dataset.type, pid = art.dataset.id;
    if (b.dataset.act === "rep") return report(type === "thread" ? "forum_thread" : "forum_reply", pid);
    if (!confirm(t("confirm_delete"))) return;
    const { error } = await sb.from(type === "thread" ? "forum_threads" : "forum_replies").delete().eq("id", pid);
    if (error) return toast(errMsg(error));
    if (type === "thread") location.hash = "#/forum"; else thread(id);
  });
  $("#rf").onsubmit = async e => {
    e.preventDefault(); const body = new FormData(e.target).get("body").trim(); if (!body) return;
    const { error } = await sb.from("forum_replies").insert({ thread_id: id, author_id: me.id, body });
    if (error) return toast(errMsg(error));
    thread(id);
  };
}

// ---------- Messagerie ----------
async function messages() {
  view.innerHTML = `<section class="page"><h1>${esc(t("messages_title"))}</h1><div id="convs"><p>${esc(t("loading"))}</p></div></section>`;
  const { data, error } = await sb.from("messages").select("*").or(`sender_id.eq.${me.id},recipient_id.eq.${me.id}`).order("created_at", { ascending:false }).limit(500);
  if (error) { $("#convs").innerHTML = `<p class="notice">${esc(errMsg(error))}</p>`; return; }
  const convs = new Map();
  data.forEach(m => {
    const other = m.sender_id === me.id ? m.recipient_id : m.sender_id;
    if (myBlocks.has(other)) return;
    if (!convs.has(other)) convs.set(other, { last: m, unread: 0 });
    if (m.recipient_id === me.id && !m.read) convs.get(other).unread++;
  });
  const people = await profilesFor([...convs.keys()]);
  $("#convs").innerHTML = convs.size ? `<ul class="convs">${[...convs].map(([o, c]) => { const p = people[o] || { display_name:"?" }; return `<li><a href="#/messages/${o}">
      ${avatar(p)}
      <span class="conv-body"><strong>${esc(p.display_name)}</strong>${c.unread ? ` <span class="badge">${c.unread}</span>` : ""}<span class="muted small">${esc(c.last.body.slice(0, 90))}</span></span>
      <span class="muted small">${esc(dateTime(c.last.created_at))}</span></a></li>`; }).join("")}</ul>` : `<p class="empty">${esc(t("no_conversations"))}</p>`;
}
async function conversation(other) {
  if (other === me.id) { location.hash = "#/messages"; return; }
  const { data: op } = await sb.from("profiles").select("id,display_name,avatar_url,verified").eq("id", other).maybeSingle();
  if (!op) { view.innerHTML = `<section class="narrow"><p class="notice">${esc(t("profile_missing"))}</p></section>`; return; }
  const blocked = myBlocks.has(other);
  view.innerHTML = `<section class="page chat">
    <a class="back" href="#/messages">${esc(t("back"))}</a>
    <h1 class="chat-head">${avatar(op)} <a href="#/profil/${op.id}">${esc(op.display_name)}</a></h1>
    <div id="thread" class="bubbles" aria-live="polite"></div>
    ${blocked ? `<p class="notice">${esc(t("blocked_notice"))}</p>` : `<form id="mf" class="composer"><label for="mbody" class="sr">${esc(t("write_message"))}</label>
      <textarea id="mbody" rows="2" maxlength="3000" placeholder="${esc(t("write_message"))}" required></textarea>
      <button class="btn primary">${esc(t("send"))}</button></form>`}
  </section>`;
  const box = $("#thread");
  const add = m => { box.insertAdjacentHTML("beforeend", `<div class="bubble ${m.sender_id === me.id ? "mine" : ""}"><p>${nl2br(m.body)}</p><time>${esc(dateTime(m.created_at))}</time></div>`); box.scrollTop = box.scrollHeight; };
  const { data } = await sb.from("messages").select("*")
    .or(`and(sender_id.eq.${me.id},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${me.id})`)
    .order("created_at").limit(500);
  (data || []).forEach(add);
  const markRead = () => sb.from("messages").update({ read:true }).eq("recipient_id", me.id).eq("sender_id", other).eq("read", false);
  await markRead(); refreshCounts();
  if (blocked) return;
  const ch = sb.channel("dm-" + other + "-" + Date.now())
    .on("postgres_changes", { event:"INSERT", schema:"public", table:"messages", filter:`recipient_id=eq.${me.id}` }, payload => {
      if (payload.new.sender_id === other) { add(payload.new); markRead(); }
    }).subscribe();
  cleanup.push(() => sb.removeChannel(ch));
  const ta = $("#mbody");
  ta.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#mf").requestSubmit(); } });
  $("#mf").onsubmit = async e => {
    e.preventDefault(); const body = ta.value.trim(); if (!body) return;
    const { data: m, error } = await sb.from("messages").insert({ sender_id: me.id, recipient_id: other, body }).select().single();
    if (error) return toast(error.message.includes("row-level security") ? t("cannot_send") : errMsg(error));
    ta.value = ""; add(m);
  };
}

// ---------- Contacts utiles ----------
async function contacts(preCat) {
  view.innerHTML = `<section class="page">
    <h1>${esc(t("contacts_title"))}</h1><p class="muted">${esc(t("contacts_help"))}</p>
    <div class="filters">
      ${field(t("filter_language"), `<select id="clang"><option value="">${esc(t("all"))}</option>${LANGS.map(l => `<option value="${l}" ${l === lang ? "selected" : ""}>${esc(LANG_NAMES[l])}</option>`).join("")}</select>`, "clang")}
      ${field(t("category"), select("ccat", "contact", "", t("all")), "ccat")}
      ${field(t("filter_city"), `<input id="ccity" type="search">`, "ccity")}
    </div>
    ${H0("cq")}
    <div id="clist"><p>${esc(t("loading"))}</p></div>
    <h2>${esc(t("suggest_title"))}</h2><div id="suggest"></div>
  </section>`;
  if (!configured) { $("#clist").innerHTML = `<p class="empty">${esc(t("no_contacts"))}</p>`; $("#suggest").innerHTML = ""; return; }
  const { data } = await sb.from("contacts").select("*").eq("approved", true).order("name").limit(1000);
  const list = data || [];
  if (preCat && OPT.contact.includes(preCat)) { $("#ccat").value = preCat; $("#clang").value = ""; }
  const apply = () => {
    const l = $("#clang").value, c = $("#ccat").value, city = $("#ccity").value.trim().toLowerCase(), cq = N($("#cq").value);
    const rows = list.filter(x => (!l || (x.languages || []).includes(l)) && (!c || x.category === c) && (!city || (x.city || "").toLowerCase().includes(city)) && (!cq || N(`${x.name} ${x.description || ""}`).includes(cq)));
    $("#clist").innerHTML = rows.length ? `<div class="contacts">${rows.map(x => `<article class="contact">
      <p class="muted small">${esc(t("ct_" + x.category))}${x.city ? " · " + esc(x.city) : ""}</p>
      <h3>${esc(x.name)}</h3>
      ${(x.languages || []).length ? `<p class="small">${esc(t("speaks"))} : ${(x.languages || []).map(c2 => esc(langName(c2))).join(", ")}</p>` : ""}
      ${x.description ? `<p>${nl2br(x.description)}</p>` : ""}
      <p class="contact-links">
        ${x.phone ? `<a href="tel:${esc(x.phone.replace(/\s/g, ""))}">${esc(x.phone)}</a>` : ""}
        ${x.email ? `<a href="mailto:${esc(x.email)}">${esc(x.email)}</a>` : ""}
        ${x.website ? `<a href="${esc(safeUrl(x.website))}" target="_blank" rel="noopener">${esc(x.website.replace(/^https?:\/\//, ""))}</a>` : ""}
      </p>
      ${x.address ? `<p class="small muted">${esc(x.address)}</p>` : ""}
    </article>`).join("")}</div>` : `<p class="empty">${esc(t("no_contacts"))}</p>`;
  };
  ["#clang", "#ccat", "#ccity", "#cq"].forEach(s => $(s).addEventListener("input", apply)); apply();

  if (!me) { $("#suggest").innerHTML = `<p><a href="#/connexion">${esc(t("login_to_suggest"))}</a></p>`; return; }
  $("#suggest").innerHTML = `<form id="sf" class="stack card"><div class="grid">
      ${field(t("c_name") + " *", `<input id="sname" name="name" required maxlength="120">`, "sname")}
      ${field(t("category") + " *", select("category", "contact", ""), "category").replace("<select ", "<select required ")}
      ${field(t("filter_city"), `<input id="scity" name="city" maxlength="80">`, "scity")}
      ${field(t("c_phone"), `<input id="sphone" name="phone" type="tel" maxlength="40">`, "sphone")}
      ${field(t("c_email"), `<input id="semail" name="email" type="email" maxlength="120">`, "semail")}
      ${field(t("c_website"), `<input id="sweb" name="website" maxlength="200">`, "sweb")}
      ${field(t("c_address"), `<input id="saddr" name="address" maxlength="200">`, "saddr")}
    </div>
    <div class="field"><span class="label">${esc(t("c_langs"))}</span>${checks("languages", SPOKEN.map(c => [c, langName(c)]))}</div>
    ${field(t("c_desc"), `<textarea id="sdesc" name="description" rows="3" maxlength="1000"></textarea>`, "sdesc")}
    <div class="actions"><button class="btn primary">${esc(t("suggest_btn"))}</button></div></form>`;
  $("#sf").onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target); const v = k => (f.get(k) || "").toString().trim() || null;
    const { error } = await sb.from("contacts").insert({ name: v("name"), category: v("category"), city: v("city"), phone: v("phone"), email: v("email"), website: v("website"), address: v("address"), description: v("description"), languages: f.getAll("languages"), submitted_by: me.id, approved: false });
    if (error) return toast(t("error") + error.message);
    e.target.reset(); toast(t("suggestion_sent"));
  };
}

// ---------- Guide des démarches ----------
let guideCountry = null;
function loadProgress() {
  if (myProfile) return { ...(myProfile.guide_progress || {}) };
  try { return JSON.parse(localStorage.getItem("guide") || "{}"); } catch (e) { return {}; }
}
async function saveProgress(prog) {
  if (myProfile) { myProfile.guide_progress = prog; await sb.from("profiles").update({ guide_progress: prog }).eq("id", me.id); }
  else { try { localStorage.setItem("guide", JSON.stringify(prog)); } catch (e) {} }
}
function guide(tab) {
  const tabs = ["steps", "checklist", "country", "deadlines", "lexicon"];
  if (!tabs.includes(tab)) tab = "steps";
  const L2 = x => x[lang] || x.en;
  let prog = loadProgress();
  const bar = (done, total) => `<p class="progress"><span class="bar"><span style="width:${total ? Math.round(done / total * 100) : 0}%"></span></span> ${done} ${esc(t("guide_progress"))} ${total}</p>`;
  const bindChecks = redraw => $$("input[data-id]", view).forEach(cb => cb.onchange = async () => {
    if (cb.checked) prog[cb.dataset.id] = true; else delete prog[cb.dataset.id];
    await saveProgress(prog); redraw();
  });
  const head = `<h1>${esc(t("guide_title"))}</h1>
    <nav class="tabs">${tabs.map(k => `<a href="#/guide/${k}" class="tab" ${k === tab ? 'aria-current="page"' : ""}>${esc(t("gtab_" + k))}</a>`).join("")}</nav>`;
  const foot = `${window.HV_LAWYER ? window.HV_LAWYER(t, esc) : ""}<p class="muted small">${esc(t("footer_disclaimer"))}</p>`;

  const draw = () => {
    let body = "";
    if (tab === "steps") {
      const done = GUIDE.filter(s => prog[s.id]).length;
      body = `<p class="lead">${esc(t("guide_intro"))}</p>${bar(done, GUIDE.length)}
      <ol class="steps">${GUIDE.map((s, i) => { const [title, text] = s[lang] || s.en; return `<li class="step ${prog[s.id] ? "done" : ""}">
        <span class="num" aria-hidden="true">${i + 1}</span>
        <div><h2>${esc(title)}</h2><p>${esc(text)}</p>
        <p class="small"><span class="muted">${esc(t("guide_links"))} :</span> ${s.links.map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(n)}</a>`).join(", ")}</p>
        <label class="check"><input type="checkbox" data-id="${s.id}" ${prog[s.id] ? "checked" : ""}> ${esc(t("guide_done"))}</label></div></li>`; }).join("")}</ol>`;
    }
    if ((tab === "checklist" || tab === "deadlines") && !isPremium) {
      body = `<p class="lead">${esc(t(tab === "checklist" ? "checklist_intro" : "deadlines_intro"))}</p>${lockBox()}`;
    } else if (tab === "checklist") {
      const p = myProfile || {}, eu = isEU(p);
      const items = CHECKLIST.filter(c => c.when(p, eu));
      const done = items.filter(c => prog["c_" + c.id]).length;
      body = `<p class="lead">${esc(t("checklist_intro"))}</p>
      ${!myProfile || !p.nationality || !p.work_situation ? `<p class="notice">${esc(t("checklist_hint"))} ${me ? `<a href="#/mon-profil">${esc(t("nav_profile"))}</a>` : `<a href="#/connexion?signup">${esc(t("hero_join"))}</a>`}</p>` : ""}
      ${bar(done, items.length)}
      <ul class="checklist">${items.map(c => `<li class="${prog["c_" + c.id] ? "done" : ""}"><label class="check"><input type="checkbox" data-id="c_${c.id}" ${prog["c_" + c.id] ? "checked" : ""}> <span>${esc(L2(c.t))}</span></label> <a class="doclink small" data-doc="${c.id}" href="#/drive/${c.id}">📎 <span>${esc(t("drive_upload"))}</span></a></li>`).join("")}</ul>`;
    }
    else if (tab === "country") {
      if (!guideCountry) guideCountry = (myProfile && COUNTRY_GUIDES.some(g => g.code === myProfile.origin_country)) ? myProfile.origin_country : COUNTRY_GUIDES[0].code;
      const g = COUNTRY_GUIDES.find(x => x.code === guideCountry);
      body = `<p class="lead">${esc(t("country_intro"))}</p>
      <div class="segmented country-pick" role="radiogroup" aria-label="${esc(t("country_choose"))}">${COUNTRY_GUIDES.map(x => `<label><input type="radio" name="cg" value="${x.code}" ${x.code === guideCountry ? "checked" : ""}><span>${esc(dn("region", x.code))}</span></label>`).join("")}</div>
      <h2>${esc(dn("region", g.code))}</h2>
      <ul class="country-points">${L2(g.p).map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      <p class="small"><span class="muted">${esc(t("guide_links"))} :</span> ${g.links.map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(n)}</a>`).join(", ")}</p>`;
    }
    else if (tab === "deadlines") {
      const now = new Date(), p = myProfile || {}, eu = isEU(p);
      const yearly = DEADLINES_YEARLY.map(d => { let dt = new Date(now.getFullYear(), d.md[0] - 1, d.md[1]); if (dt < now) dt = new Date(now.getFullYear() + 1, d.md[0] - 1, d.md[1]); return { id:d.id, title: L2(d.t), date: dt }; });
      const arrival = p.arrival_date ? new Date(p.arrival_date + "T12:00:00") : null;
      const personal = arrival ? DEADLINES_PERSONAL.filter(d => d.who(eu)).map(d => { const dt = new Date(arrival); dt.setDate(dt.getDate() + d.days); return { id:d.id, title: L2(d.t), date: dt }; }) : [];
      const row = x => `<li class="${x.date < now ? "past" : ""}"><time>${esc(date(x.date))}</time><span>${esc(x.title)}</span><button class="linkbtn small" data-ics="${x.id}">${esc(t("add_calendar"))}</button></li>`;
      body = `<p class="lead">${esc(t("deadlines_intro"))}</p>
      <h2>${esc(t("deadlines_yearly"))}</h2><ul class="deadlines">${yearly.map(row).join("")}</ul>
      <h2>${esc(t("deadlines_personal"))}</h2>
      ${personal.length ? `<ul class="deadlines">${personal.map(row).join("")}</ul>` : `<p class="notice">${esc(t("deadlines_need_arrival"))} ${me ? `<a href="#/mon-profil">${esc(t("nav_profile"))}</a>` : ""}</p>`}
      <button class="btn" id="icsall">${esc(t("add_all_calendar"))}</button>`;
      const all = [...yearly, ...personal.filter(x => x.date >= now)];
      setTimeout(() => {
        $$("[data-ics]", view).forEach(b => b.onclick = () => { const x = all.concat(personal).find(i => i.id === b.dataset.ics); icsDownload(x.title, [{ title: x.title, start: x.date, allDay: true, alarmDays: 7 }]); });
        $("#icsall").onclick = () => icsDownload(C.APP_NAME, all.map(x => ({ title: x.title, start: x.date, allDay: true, alarmDays: 7 })));
      });
    }
    if (tab === "lexicon") {
      body = `<p class="lead">${esc(t("lexicon_intro"))}</p><dl class="lexicon">${LEXICON.map(([term, d]) => `<div><dt>${esc(term)}</dt><dd>${esc(L2(d))}</dd></div>`).join("")}</dl>`;
    }
    view.innerHTML = `<section class="page">${head}${tab !== "deadlines" ? H0("gq") : ""}<div class="guide-body">${body}</div>${foot}</section>`;
    bindChecks(draw);
    const gq = $("#gq"); if (gq) gq.addEventListener("input", () => { const q = N(gq.value); $$(".guide-body li, .guide-body .lexicon > div", view).forEach(el => { el.hidden = !!q && !N(el.textContent).includes(q); }); });
    if (tab === "checklist") (window.HV_HOOKS && window.HV_HOOKS.checklist || []).forEach(f => { try { f(view); } catch (e) {} });
    $$("input[name=cg]", view).forEach(r => r.onchange = () => { guideCountry = r.value; draw(); });
  };
  draw();
}

// ---------- Estimation des finances ----------
function finances() {
  const num = (name, label, val, step = 1) => field(label, `<input type="number" inputmode="decimal" min="0" step="${step}" id="${name}" name="${name}" value="${val}">`, name);
  const cityOpts = Object.entries(CITIES).map(([k, c]) => `<option value="${k}">${esc(c.n || t("other_city"))}</option>`).join("");
  view.innerHTML = `<section class="page wide">
    <h1>${esc(t("fin_title"))}</h1><p class="lead">${esc(t("fin_intro"))}</p>
    <div class="fin">
      <form id="ff" class="fin-form">
        <fieldset><legend>${esc(t("fin_s_household"))}</legend><div class="grid">
          ${field(t("fin_city"), `<select id="city" name="city">${cityOpts}</select>`, "city")}
          ${num("adults", t("fin_adults"), 1)}${num("children", t("fin_children"), 0)}
          ${num("income", t("fin_income"), 2500, 50)}${num("savings", t("fin_savings"), 20000, 500)}
        </div></fieldset>
        <fieldset><legend>${esc(t("fin_s_housing"))}</legend>
          <div class="segmented" role="radiogroup" aria-label="${esc(t("fin_mode"))}">
            ${["rent","buy","owner"].map((m, i) => `<label><input type="radio" name="mode" value="${m}" ${i === 0 ? "checked" : ""}><span>${esc(t("mode_" + m))}</span></label>`).join("")}
          </div>
          <div class="grid">
            ${field(t("fin_size"), `<select id="size" name="size"><option value="small">${esc(t("size_small"))}</option><option value="large">${esc(t("size_large"))}</option></select>`, "size")}
            ${field(t("fin_zone"), `<select id="zone" name="zone"><option value="centre">${esc(t("zone_centre"))}</option><option value="outside">${esc(t("zone_outside"))}</option></select>`, "zone")}
            <div data-for="rent">${num("rent", t("fin_rent"), 0, 10)}</div>
            <div data-for="buy">${num("price", t("fin_price"), 0, 1000)}</div>
            <div data-for="buy">${num("down", t("fin_down"), 30)}</div>
            <div data-for="buy">${num("rate", t("fin_rate"), 3.2, .1)}</div>
            <div data-for="buy">${num("years", t("fin_years"), 25)}</div>
            <div data-for="buy">${num("buycosts", t("fin_buycosts"), 11, .5)}</div>
            <div data-for="buy owner">${num("fees", t("fin_fees"), 100, 10)}</div>
          </div></fieldset>
        <fieldset><legend>${esc(t("fin_s_monthly"))}</legend><div class="grid">
          ${num("utilities", t("fin_utilities"), 0, 5)}${num("telecom", t("fin_telecom"), 45, 5)}
          ${num("food", t("fin_food"), 0, 10)}${num("transport", t("fin_transport"), 0, 5)}
          ${num("car", t("fin_car"), 0, 10)}${num("health", t("fin_health"), 60, 5)}
          ${num("childcost", t("fin_childcost"), 250, 10)}${num("subs", t("fin_subs"), 40, 5)}
          ${num("leisure", t("fin_leisure"), 200, 10)}${num("other", t("fin_other"), 100, 10)}
        </div></fieldset>
        <fieldset><legend>${esc(t("fin_s_projects"))}</legend><div class="grid">
          ${num("oneoff", t("fin_oneoff"), 0, 500)}${num("energy_saving", t("fin_energy_saving"), 0, 5)}
          ${num("monthly_invest", t("fin_monthly_invest"), 0, 50)}
        </div></fieldset>
      </form>
      <aside class="fin-result" aria-live="polite"><div id="res"></div>
        ${isPremium ? `<button class="btn" id="printbtn" type="button">${esc(t("print_budget"))}</button>` : ""}
        ${C.AI_ENABLED && isPremium ? `<div class="ai">${field(t("fin_question"), `<textarea id="aiq" rows="2" maxlength="500"></textarea>`, "aiq")}<button class="btn primary" id="aibtn">${esc(t("ai_btn"))}</button><div id="aiout"></div></div>` : ""}
        <p class="muted small">${esc(t("fin_disclaimer"))}</p>
        ${window.HV_LAWYER ? window.HV_LAWYER(t, esc) : ""}
      </aside>
    </div>
    <section class="compare" id="cmp"></section>
  </section>`;
  const F = $("#ff"), v = n => Math.max(0, parseFloat(F.elements[n].value) || 0);
  const set = (n, x) => { F.elements[n].value = Math.round(x); };
  const mode = () => F.querySelector("input[name=mode]:checked").value;
  const prefillHousing = () => {
    const c = CITIES[F.elements.city.value], big = F.elements.size.value === "large", out = F.elements.zone.value === "outside";
    set("rent", c.r[(big ? 2 : 0) + (out ? 1 : 0)]);
    set("price", Math.round(c.m2 * (big ? 110 : 75) * (out ? .8 : 1) / 1000) * 1000);
  };
  const prefillCity = () => { const c = CITIES[F.elements.city.value]; set("utilities", c.u); set("food", c.f); set("transport", c.tr); prefillHousing(); };
  const showMode = () => { const m = mode(); $$("[data-for]", F).forEach(el => el.hidden = !el.dataset.for.split(" ").includes(m)); };

  let last = null;
  const calc = () => {
    const m = mode(), adults = Math.max(1, v("adults")), kids = v("children");
    let housing = 0, upfront = v("oneoff");
    if (m === "rent") { housing = v("rent"); upfront += 2 * v("rent"); }
    else if (m === "buy") {
      const P = v("price"), loan = P * (1 - Math.min(100, v("down")) / 100), r = v("rate") / 1200, n = v("years") * 12;
      const pay = n > 0 ? (r > 0 ? loan * r / (1 - Math.pow(1 + r, -n)) : loan / n) : 0;
      housing = pay + v("fees"); upfront += P * v("down") / 100 + P * v("buycosts") / 100;
    } else housing = v("fees");
    const lines = [
      ["res_housing", housing], ["res_utilities", Math.max(0, v("utilities") - v("energy_saving"))], ["res_telecom", v("telecom")],
      ["res_food", v("food") * adults], ["res_transport", v("transport") * adults], ["res_car", v("car")],
      ["res_health", v("health") * (adults + kids)], ["res_children", v("childcost") * kids],
      ["res_subs", v("subs")], ["res_leisure", v("leisure")], ["res_other", v("other")], ["res_invest", v("monthly_invest")]
    ].filter(l => l[1] > 0);
    const total = lines.reduce((s, l) => s + l[1], 0), income = v("income"), balance = income - total, max = Math.max(...lines.map(l => l[1]), 1);
    const ratio = income > 0 ? balance / income : -1;
    const verdict = ratio >= .2 ? ["good", t("verdict_good")] : ratio >= 0 ? ["tight", t("verdict_tight")] : ["bad", t("verdict_bad")];
    const gap = upfront - v("savings");
    $("#res").innerHTML = `<h2>${esc(t("res_title"))}</h2>
      <p class="big-figure ${verdict[0]}"><span>${esc(t("res_balance"))}</span><strong>${money(balance)}</strong></p>
      <p class="verdict ${verdict[0]}">${esc(verdict[1])}</p>
      <ul class="bars">${lines.map(([k, x]) => `<li><span>${esc(t(k))}</span><span class="bar"><span style="width:${(x / max * 100).toFixed(1)}%"></span></span><span class="amt">${money(x)}</span></li>`).join("")}</ul>
      <p class="total"><span>${esc(t("res_total"))}</span><strong>${money(total)}</strong></p>
      <div class="upfront"><p class="total"><span>${esc(t("res_upfront"))}</span><strong>${money(upfront)}</strong></p>
      <p class="muted small">${esc(t("res_upfront_detail"))}</p>
      <p class="small ${gap > 0 ? "warn" : "ok"}">${gap > 0 ? `${esc(t("savings_short"))} ${money(gap)}` : esc(t("savings_ok"))}</p></div>`;
    last = { city: CITIES[F.elements.city.value].n || "Spain (national average)", adults, kids, income, savings: v("savings"), mode: m,
      size: F.elements.size.value, zone: F.elements.zone.value, price: m === "buy" ? v("price") : null,
      lines: Object.fromEntries(lines.map(([k, x]) => [k.replace("res_", ""), Math.round(x)])), total: Math.round(total), balance: Math.round(balance), upfront: Math.round(upfront) };
  };
  const compute = ck => {
    const c = CITIES[ck], big = F.elements.size.value === "large", out = F.elements.zone.value === "outside", m = mode();
    const adults = Math.max(1, v("adults")), kids = v("children");
    const rent = c.r[(big ? 2 : 0) + (out ? 1 : 0)], price = Math.round(c.m2 * (big ? 110 : 75) * (out ? .8 : 1) / 1000) * 1000;
    let housing = 0, upfront = v("oneoff");
    if (m === "rent") { housing = rent; upfront += 2 * rent; }
    else if (m === "buy") {
      const loan = price * (1 - Math.min(100, v("down")) / 100), r = v("rate") / 1200, n = v("years") * 12;
      housing = (n > 0 ? (r > 0 ? loan * r / (1 - Math.pow(1 + r, -n)) : loan / n) : 0) + v("fees");
      upfront += price * v("down") / 100 + price * v("buycosts") / 100;
    } else housing = v("fees");
    const total = housing + Math.max(0, c.u - v("energy_saving")) + v("telecom") + c.f * adults + c.tr * adults + v("car")
      + v("health") * (adults + kids) + v("childcost") * kids + v("subs") + v("leisure") + v("other") + v("monthly_invest");
    return { total, left: v("income") - total, upfront };
  };
  const keys = Object.keys(CITIES).filter(k => k !== "other");
  let picks = [F.elements.city.value === "other" ? "valencia" : F.elements.city.value, "alicante", "malaga"];
  const renderCmp = () => {
    if (!isPremium) { $("#cmp").innerHTML = `<h2>${esc(t("cmp_title"))}</h2><p class="muted">${esc(t("cmp_intro"))}</p>${lockBox()}`; return; }
    const cityOpt = sel => keys.map(k => `<option value="${k}" ${k === sel ? "selected" : ""}>${esc(CITIES[k].n)}</option>`).join("");
    const res = picks.map(compute), best = Math.max(...res.map(r => r.left));
    $("#cmp").innerHTML = `<h2>${esc(t("cmp_title"))}</h2><p class="muted">${esc(t("cmp_intro"))}</p>
      <div class="table-wrap"><table class="cmp"><thead><tr><th></th>${picks.map((k, i) => `<th><label class="sr" for="cmp${i}">${esc(t("fin_city"))}</label><select id="cmp${i}" data-i="${i}">${cityOpt(k)}</select></th>`).join("")}</tr></thead>
      <tbody>
        <tr><th scope="row">${esc(t("cmp_monthly"))}</th>${res.map(r => `<td>${money(r.total)}</td>`).join("")}</tr>
        <tr><th scope="row">${esc(t("cmp_left"))}</th>${res.map(r => `<td class="${r.left < 0 ? "warn" : r.left === best ? "ok" : ""}"><strong>${money(r.left)}</strong></td>`).join("")}</tr>
        <tr><th scope="row">${esc(t("cmp_upfront"))}</th>${res.map(r => `<td>${money(r.upfront)}</td>`).join("")}</tr>
      </tbody></table></div>`;
    $$("#cmp select").forEach(s => s.onchange = () => { picks[+s.dataset.i] = s.value; renderCmp(); });
  };
  const calcAll = () => { calc(); renderCmp(); };
  F.elements.city.onchange = () => { prefillCity(); calcAll(); };
  F.elements.size.onchange = F.elements.zone.onchange = () => { prefillHousing(); calcAll(); };
  $$("input[name=mode]", F).forEach(r => r.onchange = () => { showMode(); calcAll(); });
  F.addEventListener("input", e => { if (!["city", "size", "zone"].includes(e.target.name)) calcAll(); });
  F.onsubmit = e => e.preventDefault();
  prefillCity(); showMode(); calcAll();

  const pb = $("#printbtn"); if (pb) pb.onclick = () => window.print();
  const ai = $("#aibtn");
  if (ai) ai.onclick = async () => {
    const out = $("#aiout"); out.innerHTML = `<p class="muted">${esc(t("ai_loading"))}</p>`; ai.disabled = true;
    try {
      const q = $("#aiq").value.trim();
      const { data: { session } } = await sb.auth.getSession();
      const r = await fetch("/.netlify/functions/analyse", { method:"POST", headers:{ "Content-Type":"application/json", Authorization: "Bearer " + (session ? session.access_token : "") },
        body: JSON.stringify({ lang, summary: "Monthly budget estimate (EUR) for a move to Spain:\n" + JSON.stringify(last, null, 1) + (q ? "\nUser question: " + q : "") }) });
      const d = await r.json(); if (!r.ok || !d.text) throw new Error(d.error || "error");
      out.innerHTML = `<div class="ai-text">${nl2br(d.text)}</div>`;
    } catch (e) { out.innerHTML = `<p class="notice">${esc(t("ai_error"))}</p>`; }
    ai.disabled = false;
  };
}

// ---------- Confidentialité ----------
function privacy() {
  view.innerHTML = `<section class="narrow"><h1>${esc(t("privacy_title"))}</h1><p>${esc(t("privacy_text"))}</p>
    <p>${esc(t("privacy_contact"))} <a href="mailto:${esc(C.CONTACT_EMAIL)}">${esc(C.CONTACT_EMAIL)}</a></p></section>`;
}

function charter() {
  const rules = CHARTER[lang] || CHARTER.en;
  view.innerHTML = `<section class="narrow"><h1>${esc(t("charter_title"))}</h1><p class="lead">${esc(t("charter_intro"))}</p>
    <ol class="charter">${rules.map(r => `<li>${esc(r)}</li>`).join("")}</ol></section>`;
}

// ---------- Démarrage ----------
const HV = {
  get sb() { return sb; }, get me() { return me; }, get myProfile() { return myProfile; }, get lang() { return lang; }, get isAdmin() { return isAdmin; }, get isPremium() { return isPremium; }, get blocks() { return myBlocks; },
  C, t, esc, nl2br, $, $$, view, field, select, checks, toast, namesFor, profilesFor, report, dn, langName, money, date, dateTime, avatar, badges, errMsg, icsDownload,
  route, renderHeader, refreshCounts, loadMe, home, OPT, PREFIX, SPOKEN, LANGS, LANG_NAMES, configured, login, notConfigured,
  onCleanup: f => cleanup.push(f)
};
(window.HV_EXT || []).forEach(ext => ext(HV, ROUTES));

window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installPrompt = e; renderHeader(); });
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});

(async () => {
  await loadMe();
  if (sb) {
    sb.auth.onAuthStateChange(ev => {
      if (ev !== "SIGNED_IN" && ev !== "SIGNED_OUT") return;
      setTimeout(async () => {
        const was = me?.id; await loadMe();
        if (ev === "SIGNED_IN" && was === me?.id) return renderHeader();
        if (ev === "SIGNED_IN" && (location.hash || "").startsWith("#/connexion")) { location.hash = myProfile ? "#/communaute" : "#/mon-profil"; return; }
        route();
      }, 0);
    });
    if (me) {
      const ch = sb.channel("notif-" + me.id)
        .on("postgres_changes", { event:"INSERT", schema:"public", table:"notifications", filter:`user_id=eq.${me.id}` }, () => refreshCounts())
        .on("postgres_changes", { event:"INSERT", schema:"public", table:"messages", filter:`recipient_id=eq.${me.id}` }, () => refreshCounts())
        .subscribe();
    }
  }
  route();
})();
})();
