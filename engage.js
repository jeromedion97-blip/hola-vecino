// Engagement à long terme : tableau de bord personnel « Mon Espagne » et badges d'entraide
(window.HV_EXT = window.HV_EXT || []).push((H, ROUTES) => {
const { t, esc, $, $$, date, avatar, badges } = H;
const view = H.view;

// Page d'accueil : tableau de bord pour les membres connectés, vitrine pour les visiteurs
ROUTES.unshift([/^#\/?$/, () => (H.me && H.myProfile) ? dashboard() : H.home()]);

const monthsSince = d => { const a = new Date(d + "T12:00:00"), n = new Date(); return (n.getFullYear() - a.getFullYear()) * 12 + (n.getMonth() - a.getMonth()) - (n.getDate() < a.getDate() ? 1 : 0); };
const points = s => s ? s.replies * 2 + s.threads + s.events_organized * 10 + s.events_attended * 2 + s.ideas_done * 15 : 0;
function earned(p, s) {
  const out = [], m = p.arrival_date ? monthsSince(p.arrival_date) : null;
  if (p.status === "planning" || (m != null && m >= 0 && m < 6)) out.push(["newcomer", "🌱"]);
  if (m != null && m >= 24) out.push(["settled", "🏡"]);
  if (s && s.replies >= 50) out.push(["pillar", "🏛️"]); else if (s && s.replies >= 10) out.push(["helper", "🤝"]);
  if (s && s.events_organized >= 3) out.push(["organizer", "📅"]);
  if (s && s.ideas_done >= 1) out.push(["idea", "💡"]);
  return out;
}
const badgeList = list => list.map(([k, ic]) => `<span class="bd"><span aria-hidden="true">${ic}</span> ${esc(t("bd_" + k))}</span>`).join("");
async function stats(uid) { const { data } = await H.sb.rpc("member_stats", { uid }); return (data && data[0]) || null; }

// Badges et entraide sur chaque profil
(window.HV_HOOKS = window.HV_HOOKS || {}).profile = [async p => {
  const s = await stats(p.id), list = earned(p, s), page = $(".page", view);
  if (!page) return;
  const box = document.createElement("section"); box.className = "rep card";
  box.innerHTML = `<h2>${esc(t("rep_title"))} <span class="rep-points">${points(s)} ${esc(t("dash_points"))}</span></h2>
    ${list.length ? `<p class="bds">${badgeList(list)}</p>` : ""}
    ${s ? `<p class="small muted">${s.replies} ${esc(t("stat_replies"))} · ${s.events_organized} ${esc(t("stat_events_org"))} · ${s.events_attended} ${esc(t("stat_events_att"))}</p>` : ""}`;
  const facts = $(".facts", page); (facts || page.lastElementChild).insertAdjacentElement("afterend", box);
}];

async function dashboard() {
  const sb = H.sb, me = H.me, p = H.myProfile, city = (p.city || "").trim();
  const now = new Date(), in3w = new Date(Date.now() + 21 * 86400e3).toISOString();
  const recent = new Date(Date.now() - 90 * 86400e3).toISOString().slice(0, 10);
  view.innerHTML = `<section class="page wide dash"><p>${esc(t("loading"))}</p></section>`;

  let evq = sb.from("events").select("id,title,starts_at,city,place_hint,objective_type").eq("cancelled", false).gte("starts_at", now.toISOString()).lte("starts_at", in3w).order("starts_at").limit(4);
  let thq = sb.from("forum_threads").select("id,title,category,city,last_activity").order("last_activity", { ascending:false }).limit(5);
  let dq = sb.from("listings").select("id,title,kind,city,price_text,featured_until").eq("status", "active").gt("active_until", now.toISOString()).neq("kind", "youtube").order("created_at", { ascending:false }).limit(3);
  if (city) { evq = evq.ilike("city", city); thq = thq.ilike("city", city); dq = dq.ilike("city", city); }
  const nq = city ? sb.from("profiles").select("id,display_name,avatar_url,arrival_date,status,origin_country,verified,is_guide").ilike("city", city).neq("id", me.id).or(`status.eq.planning,arrival_date.gte.${recent}`).limit(6) : Promise.resolve({ data: [] });
  const [s, ev, th, dl, nw, hp] = await Promise.all([
    stats(me.id), evq, thq, dq, nq,
    sb.rpc("top_helpers", { p_city: city || null, p_limit: 5 })
  ]);
  const newcomers = (nw.data || []).filter(x => !H.blocks.has(x.id));
  const helpers = (hp.data || []).filter(x => x.points > 0);

  // Parcours : ancienneté et prochaine étape de vie
  let since = "", next = null;
  if (p.arrival_date) {
    const m = monthsSince(p.arrival_date), arr = new Date(p.arrival_date + "T12:00:00");
    if (m < 0 || arr > now) since = `${t("dash_arriving")} ${Math.max(1, Math.ceil((arr - now) / 86400e3))} ${t("days")}`;
    else since = `${t("dash_since")} ${m >= 24 ? Math.floor(m / 12) + " " + t("dur_years") : Math.max(m, 1) + " " + t("dur_months")}`;
    const eu = p.nationality ? (window.EU_CODES || []).includes(p.nationality) : null;
    next = (window.DEADLINES_PERSONAL || []).filter(d => d.who(eu)).map(d => { const dt = new Date(arr); dt.setDate(dt.getDate() + d.days); return { title: d.t[H.lang] || d.t.en, date: dt }; })
      .filter(x => x.date >= now).sort((a, b) => a.date - b.date)[0] || "done";
  } else if (p.status === "planning") since = t("dash_planning");

  const section = (title, link, body) => `<section class="dash-block"><div class="titlebar"><h2>${esc(title)}</h2>${link ? `<a class="small" href="${link}">${esc(t("dash_see_all"))}</a>` : ""}</div>${body}</section>`;
  const cal = d => { const x = new Date(d); return `<span class="cal" aria-hidden="true"><span>${esc(x.toLocaleDateString(H.lang, { month:"short" }))}</span><strong>${x.getDate()}</strong></span>`; };

  view.innerHTML = `<section class="page wide dash">
    <header class="dash-head">${avatar(p, "big")}<div><h1>${esc(t("dash_hello"))} ${esc(p.display_name)}</h1>
      <p class="muted">${[city, since].filter(Boolean).map(esc).join(" · ")}</p>
      <p class="bds">${badgeList(earned(p, s))}${p.verified || p.is_guide ? badges(p) : ""}</p></div></header>
    ${!city ? `<p class="notice">${esc(t("dash_no_city"))} <a href="#/mon-profil">${esc(t("nav_profile"))}</a></p>` : ""}
    <div class="dash-grid"><div class="dash-main">
      ${section(t("dash_events"), "#/evenements", (ev.data || []).length
        ? `<ul class="dash-events">${ev.data.map(e => `<li><a href="#/evenements/${e.id}">${cal(e.starts_at)}<span><strong>${esc(e.title)}</strong><span class="small muted">${esc(t("obj_" + e.objective_type))} · ${esc(new Date(e.starts_at).toLocaleTimeString(H.lang, { hour:"2-digit", minute:"2-digit" }))}${e.place_hint ? " · " + esc(e.place_hint) : ""}</span></span></a></li>`).join("")}</ul>`
        : `<p class="empty small">${esc(t("dash_no_events"))} <a href="#/evenements/nouveau">${esc(t("ev_new"))}</a></p>`)}
      ${newcomers.length ? section(t("dash_welcome"), "", `<p class="small muted">${esc(t("dash_welcome_help"))}</p><ul class="welcome">${newcomers.map(n => `<li>${avatar(n)}<span><a href="#/profil/${n.id}"><strong>${esc(n.display_name)}</strong></a><span class="small muted">${n.origin_country ? esc(H.dn("region", n.origin_country)) : ""}${n.status === "planning" ? " · " + esc(t("st_planning")) : ""}</span></span><a class="btn small" href="#/messages/${n.id}">${esc(t("dash_say_hello"))}</a></li>`).join("")}</ul>`) : ""}
      ${section(t("dash_threads"), "#/forum", (th.data || []).length
        ? `<ul class="threads">${th.data.map(x => `<li><a href="#/forum/${x.id}"><strong>${esc(x.title)}</strong></a><span class="muted small">${esc(t("cat_" + x.category))} · ${esc(date(x.last_activity))}</span></li>`).join("")}</ul>`
        : `<p class="empty small">${esc(t("no_threads"))} <a href="#/forum">${esc(t("new_thread"))}</a></p>`)}
      ${(dl.data || []).length ? section(t("dash_deals"), "#/bons-plans", `<ul class="threads">${dl.data.map(l => `<li><a href="#/bons-plans/${l.kind}"><strong>${esc(l.title)}</strong></a><span class="muted small"><span class="tag sponsored">${esc(t("sponsored"))}</span> ${esc(t("kind_" + l.kind))}${l.price_text ? " · " + esc(l.price_text) : ""}</span></li>`).join("")}</ul>`) : ""}
    </div><aside class="dash-side">
      ${section(t("dash_journey"), "#/guide/deadlines", `
        <p class="rep-big"><strong>${points(s)}</strong> ${esc(t("dash_points"))}</p>
        ${next === "done" ? `<p class="small">${esc(t("dash_all_done"))}</p>`
          : next ? `<p class="small muted">${esc(t("dash_next_step"))}</p><p><strong>${esc(date(next.date))}</strong><br>${esc(next.title)}</p>`
          : `<p class="small">${esc(t("dash_set_arrival"))} <a href="#/mon-profil">${esc(t("nav_profile"))}</a></p>`}`)}
      ${helpers.length ? section(t("dash_helpers"), "", `<p class="small muted">${esc(t("dash_helpers_help"))}</p><ol class="helpers">${helpers.map(x => `<li>${avatar(x, "tiny")} <a href="#/profil/${x.id}">${esc(x.display_name)}</a><span class="muted small">${x.points}</span></li>`).join("")}</ol>`) : ""}
      <nav class="dash-links">
        <a href="#/guide">${esc(t("nav_guide"))}</a><a href="#/finances">${esc(t("nav_finances"))}</a><a href="#/communaute">${esc(t("nav_community"))}</a><a href="#/youtube">${esc(t("nav_youtube"))}</a><a href="#/suggestions">${esc(t("nav_suggestions"))}</a>
      </nav>
    </aside></div>
  </section>`;
}
});
