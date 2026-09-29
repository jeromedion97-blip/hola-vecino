// Événements (objectif, questionnaire, invitations) et notifications
(window.HV_EXT = window.HV_EXT || []).push((H, ROUTES) => {
const { t, esc, nl2br, $, $$, field, select, checks, toast, langName, date, dateTime, avatar, badges, errMsg, icsDownload } = H;
const view = H.view;
H.OPT.objective = ["friends","admin","language","outing","sport","culture","food","family","pro","other"];
H.PREFIX.objective = "obj_";

ROUTES.unshift(
  [/^#\/evenements$/, () => list(), true],
  [/^#\/evenements\/nouveau$/, () => create(), true],
  [/^#\/evenements\/(\d+)$/, m => detail(+m[1]), true],
  [/^#\/notifications$/, () => notifications(), true]
);

const timeRange = e => {
  const s = new Date(e.starts_at), opts = { hour:"2-digit", minute:"2-digit" };
  const d = s.toLocaleDateString(H.lang, { weekday:"long", day:"numeric", month:"long", year:"numeric" });
  return `${d}, ${s.toLocaleTimeString(H.lang, opts)}${e.ends_at ? " – " + new Date(e.ends_at).toLocaleTimeString(H.lang, opts) : ""}`;
};
const toIcs = (e, addr) => ({ title: e.title, start: new Date(e.starts_at), end: e.ends_at ? new Date(e.ends_at) : null,
  desc: `${t("obj_" + e.objective_type)} — ${e.objective}`, loc: [addr, e.place_hint, e.city].filter(Boolean).join(", "), alarmDays: 1 });

// ---------- Liste ----------
let tab = "upcoming";
async function list() {
  const sb = H.sb, me = H.me;
  view.innerHTML = `<section class="page">
    <div class="titlebar"><h1>${esc(t("ev_title"))}</h1><a class="btn primary" href="#/evenements/nouveau">${esc(t("ev_new"))}</a></div>
    <nav class="tabs">${["upcoming","invitations","mine"].map(k => `<button data-t="${k}" ${tab === k ? 'aria-pressed="true"' : ""}>${esc(t("ev_" + k))}</button>`).join("")}</nav>
    <div class="filters">
      ${field(t("filter_city"), `<input id="ecity" type="search" value="">`, "ecity")}
      ${field(t("ev_obj_type"), select("eobj", "objective", "", t("all")), "eobj")}
    </div>
    ${H.searchBox("evq")}
    <div id="evlist"><p>${esc(t("loading"))}</p></div>
  </section>`;
  $$(".tabs button", view).forEach(b => b.onclick = () => { tab = b.dataset.t; list(); });
  const since = new Date(Date.now() - 6 * 3600e3).toISOString();
  let rows = [];
  if (tab === "invitations") {
    const { data: r } = await sb.from("event_rsvps").select("event_id").eq("user_id", me.id).eq("status", "invited");
    const ids = (r || []).map(x => x.event_id);
    if (ids.length) rows = (await sb.from("events").select("*").in("id", ids).gte("starts_at", since).order("starts_at")).data || [];
  } else if (tab === "mine") {
    const { data: r } = await sb.from("event_rsvps").select("event_id").eq("user_id", me.id).eq("status", "going");
    const ids = (r || []).map(x => x.event_id);
    let q = sb.from("events").select("*").gte("starts_at", since).order("starts_at");
    q = ids.length ? q.or(`creator_id.eq.${me.id},id.in.(${ids.join(",")})`) : q.eq("creator_id", me.id);
    rows = (await q).data || [];
  } else {
    rows = (await sb.from("events").select("*").gte("starts_at", since).eq("cancelled", false).order("starts_at").limit(200)).data || [];
  }
  rows = rows.filter(e => !H.blocks.has(e.creator_id));
  const ids = rows.map(e => e.id), counts = {};
  if (ids.length) {
    const { data: g } = await sb.from("event_rsvps").select("event_id").in("event_id", ids).eq("status", "going");
    (g || []).forEach(x => counts[x.event_id] = (counts[x.event_id] || 0) + 1);
  }
  const apply = () => {
    const city = $("#ecity").value.trim().toLowerCase(), obj = $("#eobj").value, q = H.norm($("#evq").value);
    const shown = rows.filter(e => (!city || e.city.toLowerCase().includes(city)) && (!obj || e.objective_type === obj) && (!q || H.norm(`${e.title} ${e.objective}`).includes(q)));
    $("#evlist").innerHTML = shown.length ? `<div class="events">${shown.map(e => card(e, counts[e.id] || 0)).join("")}</div>` : `<p class="empty">${esc(t("ev_none"))}</p>`;
  };
  ["#ecity", "#eobj", "#evq"].forEach(s => $(s).addEventListener("input", apply));
  apply();
}
function card(e, n) {
  const s = new Date(e.starts_at), full = e.max_participants && n >= e.max_participants;
  return `<a class="event-card ${e.cancelled ? "cancelled" : ""}" href="#/evenements/${e.id}">
    <span class="cal" aria-hidden="true"><span>${s.toLocaleDateString(H.lang, { month:"short" })}</span><strong>${s.getDate()}</strong></span>
    <span class="event-body">
      <strong class="event-title">${esc(e.title)}</strong>
      <span class="tags"><span class="tag obj">${esc(t("obj_" + e.objective_type))}</span>${e.visibility !== "public" ? `<span class="tag">${esc(t("vis_" + e.visibility))}</span>` : ""}${e.cancelled ? `<span class="tag danger">${esc(t("ev_cancelled"))}</span>` : ""}${full ? `<span class="tag">${esc(t("ev_full"))}</span>` : ""}</span>
      <span class="muted small">${esc(s.toLocaleTimeString(H.lang, { hour:"2-digit", minute:"2-digit" }))} · ${esc(e.city)}${e.place_hint ? " · " + esc(e.place_hint) : ""}</span>
      <span class="small">${esc(e.objective.slice(0, 140))}${e.objective.length > 140 ? "…" : ""}</span>
      <span class="small muted">${n}${e.max_participants ? " / " + e.max_participants : ""} ${esc(t("ev_participants"))}</span>
    </span></a>`;
}

// ---------- Création ----------
function create() {
  if (!H.isPremium) { view.innerHTML = `<section class="narrow"><a class="back" href="#/evenements">${esc(t("back"))}</a><h1>${esc(t("ev_new"))}</h1><div class="locked"><p><strong>${esc(t("premium_locked"))}</strong></p><p>${esc(t("pf_events"))}</p><a class="btn primary" href="#/premium">${esc(t("premium_cta"))}</a></div></section>`; return; }
  const p = H.myProfile || {};
  const spoken = H.SPOKEN.map(c => [c, langName(c)]);
  const pad = n => String(n).padStart(2, "0"), d = new Date(Date.now() + 86400e3);
  const minLocal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00`;
  view.innerHTML = `<section class="page">
    <a class="back" href="#/evenements">${esc(t("back"))}</a>
    <h1>${esc(t("ev_new"))}</h1>
    <form id="evf" class="profile-form">
      <fieldset><legend>${esc(t("ev_s_what"))}</legend><div class="grid">
        ${field(t("ev_name") + " *", `<input id="etitle" name="title" required minlength="3" maxlength="120">`, "etitle")}
        ${field(t("ev_obj_type") + " *", select("objective_type", "objective", ""), "objective_type").replace("<select ", "<select required ")}
        ${field(t("ev_start") + " *", `<input id="estart" name="starts_at" type="datetime-local" required value="${minLocal}">`, "estart")}
        ${field(t("ev_end"), `<input id="eend" name="ends_at" type="datetime-local">`, "eend")}
        ${field(t("ev_city") + " *", `<input id="ecity2" name="city" required maxlength="80" value="${esc(p.city || "")}">`, "ecity2")}
        ${field(t("ev_place_hint"), `<input id="ehint" name="place_hint" maxlength="120">`, "ehint")}
        ${field(t("ev_max"), `<input id="emax" name="max_participants" type="number" min="2" max="500" value="10">`, "emax")}
      </div>
      ${field(t("ev_address"), `<input id="eaddr" name="address" maxlength="300">`, "eaddr")}
      <span class="label">${esc(t("ev_visibility"))}</span>
      <div class="segmented"><label><input type="radio" name="visibility" value="public" checked><span>${esc(t("vis_public"))}</span></label><label><input type="radio" name="visibility" value="invite"><span>${esc(t("vis_invite"))}</span></label><label><input type="radio" name="visibility" value="private"><span>${esc(t("vis_private"))}</span></label></div>
      </fieldset>

      <fieldset><legend>${esc(t("ev_s_objective"))}</legend>
        ${field(t("ev_objective") + " *", `<textarea id="eobjtxt" name="objective" rows="3" required minlength="10" maxlength="1000" aria-describedby="eobjhelp"></textarea><span class="muted small" id="eobjhelp">${esc(t("ev_objective_help"))}</span>`, "eobjtxt")}
        ${field(t("ev_desc"), `<textarea id="edesc" name="description" rows="4" maxlength="3000"></textarea>`, "edesc")}
      </fieldset>

      <fieldset><legend>${esc(t("ev_s_audience"))}</legend>
        <div class="field"><span class="label">${esc(t("ev_langs"))}</span>${checks("langs", spoken, [H.lang])}</div>
        <div class="grid">
          ${field(t("ev_age_min"), `<input id="eamin" name="age_min" type="number" min="16" max="110">`, "eamin")}
          ${field(t("ev_age_max"), `<input id="eamax" name="age_max" type="number" min="16" max="110">`, "eamax")}
          ${field(t("ev_spanish"), select("spanish", "spanish", ""), "spanish")}
        </div>
        <label class="check"><input type="checkbox" name="kids"> ${esc(t("ev_kids"))}</label>
        <label class="check"><input type="checkbox" name="pets"> ${esc(t("ev_pets"))}</label>
        <label class="check"><input type="checkbox" name="access"> ${esc(t("ev_access"))}</label>
      </fieldset>

      <fieldset><legend>${esc(t("ev_s_practical"))}</legend><div class="grid">
        ${field(t("ev_cost"), `<input id="ecost" name="cost" maxlength="120" aria-describedby="ecosthelp"><span class="muted small" id="ecosthelp">${esc(t("ev_cost_help"))}</span>`, "ecost")}
        ${field(t("ev_bring"), `<input id="ebring" name="bring" maxlength="200">`, "ebring")}
      </div></fieldset>

      <fieldset><legend>${esc(t("ev_s_questions"))}</legend>
        <p class="muted small">${esc(t("ev_q_help"))}</p>
        <div id="qs"></div>
        <button type="button" class="btn small" id="qadd">${esc(t("ev_q_add"))}</button>
      </fieldset>

      <p class="notice small">${esc(t("ev_safety"))}</p>
      <div class="actions"><button class="btn primary">${esc(t("ev_publish"))}</button><span class="msg" role="status"></span></div>
    </form>
  </section>`;

  let qn = 0, dupData = null;
  try { dupData = JSON.parse(sessionStorage.getItem("ev_dup") || "null"); sessionStorage.removeItem("ev_dup"); } catch (err) {}
  const addQ = (preset) => {
    qn++;
    const div = document.createElement("div"); div.className = "qblock card"; div.dataset.q = qn;
    div.innerHTML = `${field(t("ev_q_label"), `<input id="ql${qn}" class="ql" maxlength="200" required>`, "ql" + qn)}
      <div class="grid">${field(t("ev_q_type"), `<select id="qt${qn}" class="qt"><option value="text">${esc(t("q_text"))}</option><option value="choice">${esc(t("q_choice"))}</option><option value="yesno">${esc(t("q_yesno"))}</option></select>`, "qt" + qn)}
      <div class="qopts" hidden>${field(t("ev_q_options"), `<input id="qo${qn}" class="qo" maxlength="400">`, "qo" + qn)}</div></div>
      <div class="actions"><label class="check"><input type="checkbox" class="qr"> ${esc(t("ev_q_required"))}</label><button type="button" class="linkbtn qdel">${esc(t("ev_q_remove"))}</button></div>`;
    $("#qs").appendChild(div);
    $(".qt", div).onchange = e => { $(".qopts", div).hidden = e.target.value !== "choice"; $(".qo", div).required = e.target.value === "choice"; };
    $(".qdel", div).onclick = () => div.remove();
    if (preset && preset.label) {
      $(".ql", div).value = preset.label; $(".qt", div).value = preset.type; $(".qr", div).checked = !!preset.required;
      if (preset.type === "choice") { $(".qopts", div).hidden = false; $(".qo", div).value = (preset.options || []).join(", "); $(".qo", div).required = true; }
    } else $(".ql", div).focus();
  };
  $("#qadd").onclick = () => addQ();
  if (dupData) {
    const F = $("#evf"), set = (n, v) => { if (F.elements[n] != null && v != null) F.elements[n].value = v; };
    const pad = n => String(n).padStart(2, "0"), loc = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const plus7 = iso => { const d = new Date(iso); do { d.setDate(d.getDate() + 7); } while (d < new Date()); return d; };
    const st = plus7(dupData.starts_at);
    set("title", dupData.title); set("objective_type", dupData.objective_type); set("objective", dupData.objective); set("description", dupData.description);
    set("city", dupData.city); set("place_hint", dupData.place_hint); set("address", dupData.address); set("max_participants", dupData.max_participants);
    set("starts_at", loc(st));
    if (dupData.ends_at) set("ends_at", loc(new Date(st.getTime() + (new Date(dupData.ends_at) - new Date(dupData.starts_at)))));
    $$("input[name=visibility]", F).forEach(r => r.checked = r.value === dupData.visibility);
    const a = dupData.audience || {};
    $$("input[name=langs]", F).forEach(c => c.checked = (a.langs || []).includes(c.value));
    set("age_min", a.age_min); set("age_max", a.age_max); set("spanish", a.spanish || ""); set("cost", a.cost); set("bring", a.bring);
    ["kids", "pets", "access"].forEach(k => F.elements[k].checked = !!a[k]);
    (dupData.questions || []).forEach(q => addQ(q));
  }

  $("#evf").onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target), msg = $("#evf .msg"), v = k => (f.get(k) || "").toString().trim() || null;
    const start = new Date(v("starts_at")), end = v("ends_at") ? new Date(v("ends_at")) : null;
    if (end && end <= start) { msg.textContent = t("ev_date_error"); return; }
    const questions = $$(".qblock", view).map((b, i) => ({
      id: "q" + (i + 1), label: $(".ql", b).value.trim(), type: $(".qt", b).value, required: $(".qr", b).checked,
      options: $(".qt", b).value === "choice" ? $(".qo", b).value.split(",").map(s => s.trim()).filter(Boolean) : []
    })).filter(q => q.label);
    const audience = { langs: f.getAll("langs"), age_min: v("age_min") ? +v("age_min") : null, age_max: v("age_max") ? +v("age_max") : null,
      spanish: v("spanish"), kids: !!f.get("kids"), pets: !!f.get("pets"), access: !!f.get("access"), cost: v("cost"), bring: v("bring") };
    msg.textContent = t("loading");
    const { data: ev, error } = await H.sb.from("events").insert({
      creator_id: H.me.id, title: v("title"), objective_type: v("objective_type"), objective: v("objective"), description: v("description"),
      city: v("city"), place_hint: v("place_hint"), starts_at: start.toISOString(), ends_at: end ? end.toISOString() : null,
      max_participants: v("max_participants") ? +v("max_participants") : null, visibility: f.get("visibility"), audience, questions
    }).select().single();
    if (error) { msg.textContent = errMsg(error); return; }
    if (v("address")) await H.sb.from("event_private").insert({ event_id: ev.id, address: v("address") });
    location.hash = "#/evenements/" + ev.id;
  };
}

// ---------- Détail ----------
async function detail(id) {
  const sb = H.sb, me = H.me;
  view.innerHTML = `<p>${esc(t("loading"))}</p>`;
  const { data: e } = await sb.from("events").select("*").eq("id", id).maybeSingle();
  if (!e) { location.hash = "#/evenements"; return; }
  const creator = e.creator_id === me.id;
  const [{ data: rs }, { data: priv }, ans] = await Promise.all([
    sb.from("event_rsvps").select("*").eq("event_id", id),
    sb.from("event_private").select("address").eq("event_id", id).maybeSingle(),
    creator ? sb.from("event_answers").select("*").eq("event_id", id) : sb.from("event_answers").select("*").eq("event_id", id).eq("user_id", me.id)
  ]);
  const rsvps = rs || [], answers = Object.fromEntries((ans.data || []).map(a => [a.user_id, a.answers || {}]));
  const people = await H.profilesFor([e.creator_id, ...rsvps.map(r => r.user_id)]);
  const mine = rsvps.find(r => r.user_id === me.id), going = rsvps.filter(r => r.status === "going");
  const full = e.max_participants && going.length >= e.max_participants;
  const a = e.audience || {}, qs = e.questions || [], org = people[e.creator_id] || { display_name:"?" };
  const facts = [
    [t("ev_langs"), (a.langs || []).map(langName).join(", ")],
    [t("ev_age"), a.age_min || a.age_max ? `${a.age_min || "16"} – ${a.age_max || "…"}` : ""],
    [t("ev_spanish"), a.spanish ? t("sp_" + a.spanish) : ""],
    [t("ev_cost"), a.cost || t("ev_free")],
    [t("ev_bring"), a.bring || ""],
    ["", [a.kids && t("ev_kids"), a.pets && t("ev_pets"), a.access && t("ev_access")].filter(Boolean).join(" · ")]
  ].filter(x => x[1]);

  let actions = "";
  if (!e.cancelled && !creator) {
    if (mine && mine.status === "invited") actions = `<p class="notice">${esc(t("ev_invited_msg"))}</p><div class="actions"><button class="btn primary" data-go="join">${esc(t("ev_accept"))}</button><button class="btn" data-go="decline">${esc(t("ev_decline"))}</button></div>`;
    else if (mine && mine.status === "going") actions = `<p class="ok">${esc(t("ev_going"))}</p><div class="actions"><button class="btn" data-go="ics">${esc(t("ev_calendar"))}</button><button class="linkbtn" data-go="decline">${esc(t("ev_leave"))}</button></div>`;
    else if (mine && mine.status === "declined") actions = `<p class="muted">${esc(t("ev_declined_msg"))}</p>${full ? "" : `<button class="btn" data-go="join">${esc(t("ev_join"))}</button>`}`;
    else if (e.visibility === "public") actions = full ? `<p class="notice">${esc(t("ev_full_error"))}</p>` : `<button class="btn primary" data-go="join">${esc(t("ev_join"))}</button>`;
  }
  const qForm = qs.length ? `<form id="qf" class="stack card" hidden><h2>${esc(t("ev_answer_title"))}</h2>${qs.map(q => {
      const name = "a_" + q.id, req = q.required ? "required" : "", lbl = esc(q.label) + (q.required ? " *" : ""), prev = (answers[me.id] || {})[q.id] || "";
      if (q.type === "yesno") return `<div class="field"><span class="label">${lbl}</span><div class="segmented"><label><input type="radio" name="${name}" value="yes" ${req} ${prev === "yes" ? "checked" : ""}><span>${esc(t("yes"))}</span></label><label><input type="radio" name="${name}" value="no" ${prev === "no" ? "checked" : ""}><span>${esc(t("no"))}</span></label></div></div>`;
      if (q.type === "choice") return field(lbl, `<select id="${name}" name="${name}" ${req}><option value="">${esc(t("choose"))}</option>${q.options.map(o => `<option ${prev === o ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`, name);
      return field(lbl, `<textarea id="${name}" name="${name}" rows="2" maxlength="500" ${req}>${esc(prev)}</textarea>`, name);
    }).join("")}<div class="actions"><button class="btn primary">${esc(t("ev_confirm"))}</button><span class="msg" role="status"></span></div></form>` : "";

  const guestRows = creator ? rsvps.map(r => { const p = people[r.user_id] || { display_name:"?" }, an = answers[r.user_id] || {};
    return `<tr><td><a href="#/profil/${r.user_id}">${esc(p.display_name)}</a></td><td><span class="tag st-${r.status}">${esc(t("rs_" + r.status))}</span></td>${qs.map(q => `<td>${esc(q.type === "yesno" ? (an[q.id] ? t(an[q.id]) : "") : (an[q.id] || ""))}</td>`).join("")}</tr>`; }).join("") : "";

  view.innerHTML = `<section class="page event-page">
    <a class="back" href="#/evenements">${esc(t("back"))}</a>
    <p class="tags"><span class="tag obj">${esc(t("obj_" + e.objective_type))}</span>${e.visibility !== "public" ? `<span class="tag">${esc(t("vis_" + e.visibility))}</span>` : ""}${e.cancelled ? `<span class="tag danger">${esc(t("ev_cancelled"))}</span>` : ""}</p>
    <h1>${esc(e.title)}</h1>
    <p class="event-when"><strong>${esc(timeRange(e))}</strong><br>${esc(e.city)}${e.place_hint ? " · " + esc(e.place_hint) : ""}</p>
    <p class="organizer">${avatar(org, "tiny")} ${esc(t("ev_organizer"))} <a href="#/profil/${e.creator_id}">${esc(org.display_name)}</a> ${badges(org)}</p>
    <div class="objective"><h2>${esc(t("ev_s_objective"))}</h2><p>${nl2br(e.objective)}</p></div>
    ${e.description ? `<p>${nl2br(e.description)}</p>` : ""}
    ${facts.length ? `<dl class="facts">${facts.map(([k, v]) => `<div>${k ? `<dt>${esc(k)}</dt>` : ""}<dd>${esc(v)}</dd></div>`).join("")}</dl>` : ""}
    ${priv && priv.address ? `<p class="address"><strong>${esc(priv.address)}</strong></p>` : `<p class="muted small">${esc(t("ev_address_hidden"))}</p>`}
    <h2>${going.length}${e.max_participants ? " / " + e.max_participants : ""} ${esc(t("ev_participants"))}${e.max_participants && !full ? ` <span class="muted small">(${e.max_participants - going.length} ${esc(t("ev_spots_left"))})</span>` : ""}</h2>
    <div class="avatars">${going.map(r => `<a href="#/profil/${r.user_id}" title="${esc((people[r.user_id] || {}).display_name)}">${avatar(people[r.user_id] || { display_name:"?" })}</a>`).join("")}</div>
    <p class="muted small">${esc(t("ev_safety"))}</p>
    ${actions}${qForm}
    ${e.visibility === "public" && !e.cancelled ? `<p><button class="btn small" id="evshare">↗ ${esc(t("ev_share"))}</button></p>` : ""}
    ${creator && !e.cancelled && e.visibility !== "private" ? `
      <section class="card"><h2>${esc(t("ev_invite_title"))}</h2>
        ${field(t("ev_invite_search"), `<input id="isearch" type="search" autocomplete="off">`, "isearch")}
        <ul id="iresults" class="iresults"></ul></section>` : ""}
    ${creator ? `<section><h2>${esc(t("ev_guests"))}</h2>
      ${rsvps.length ? `<div class="table-wrap"><table class="guests"><thead><tr><th>${esc(t("f_name"))}</th><th></th>${qs.map(q => `<th>${esc(q.label)}</th>`).join("")}</tr></thead><tbody>${guestRows}</tbody></table></div>
      ${qs.length ? `<button class="btn small" id="csv">${esc(t("ev_export"))}</button>` : ""}` : `<p class="muted">—</p>`}
      <div class="actions"><button class="btn small primary" id="dupev">${esc(t("ev_next_edition"))}</button><button class="btn small" data-go="ics">${esc(t("ev_calendar"))}</button>${e.cancelled ? "" : `<button class="btn small danger" id="cancelev">${esc(t("ev_cancel"))}</button>`}</div>
      <p class="muted small">${esc(t("ev_edit_note"))}</p></section>` : `<p><button class="linkbtn small" id="rep">${esc(t("report"))}</button></p>`}
  </section>`;

  const setStatus = async status => {
    const { error } = mine
      ? await sb.from("event_rsvps").update({ status }).eq("event_id", id).eq("user_id", me.id)
      : await sb.from("event_rsvps").insert({ event_id: id, user_id: me.id, status });
    if (error) { toast(errMsg(error)); return false; }
    return true;
  };
  $$("[data-go]", view).forEach(b => b.onclick = async () => {
    const go = b.dataset.go;
    if (go === "ics") return icsDownload(e.title, [toIcs(e, priv && priv.address)]);
    if (go === "decline") { if (await setStatus("declined")) { H.refreshCounts(); detail(id); } return; }
    if (go === "join") {
      if (qs.length) { $("#qf").hidden = false; $("#qf").scrollIntoView({ behavior:"smooth" }); return; }
      if (await setStatus("going")) { H.refreshCounts(); detail(id); }
    }
  });
  const qf = $("#qf");
  if (qf) qf.onsubmit = async ev => {
    ev.preventDefault();
    const f = new FormData(qf), out = {};
    qs.forEach(q => { const val = (f.get("a_" + q.id) || "").toString().trim(); if (val) out[q.id] = val; });
    if (qs.some(q => q.required && !out[q.id])) { $(".msg", qf).textContent = t("required_missing"); return; }
    if (mine) { if (!(await setStatus("going"))) return; }
    else if (!(await setStatus("going"))) return;
    const { error } = await sb.from("event_answers").upsert({ event_id: id, user_id: me.id, answers: out, updated_at: new Date().toISOString() });
    if (error) toast(errMsg(error));
    H.refreshCounts(); detail(id);
  };
  const rep = $("#rep"); if (rep) rep.onclick = () => H.report("event", id);
  const sh = $("#evshare"); if (sh) sh.onclick = () => H.share(e.title, location.href);
  const dup = $("#dupev");
  if (dup) dup.onclick = async () => {
    const { data: pv } = await sb.from("event_private").select("address").eq("event_id", id).maybeSingle();
    try { sessionStorage.setItem("ev_dup", JSON.stringify({ ...e, address: pv && pv.address })); } catch (err) {}
    location.hash = "#/evenements/nouveau";
  };
  const cancel = $("#cancelev");
  if (cancel) cancel.onclick = async () => {
    if (!confirm(t("ev_cancel_confirm"))) return;
    const { error } = await sb.from("events").update({ cancelled: true }).eq("id", id);
    if (error) return toast(errMsg(error)); detail(id);
  };
  const csv = $("#csv");
  if (csv) csv.onclick = () => {
    const q = s => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const lines = [[t("f_name"), "", ...qs.map(x => x.label)].map(q).join(";"),
      ...rsvps.map(r => [(people[r.user_id] || {}).display_name, t("rs_" + r.status), ...qs.map(x => (answers[r.user_id] || {})[x.id] || "")].map(q).join(";"))];
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\ufeff" + lines.join("\r\n")], { type:"text/csv" }));
    link.download = e.title.replace(/[^\w-]+/g, "-").slice(0, 50) + ".csv"; link.click();
  };
  const is = $("#isearch");
  if (is) {
    let timer;
    const taken = new Set([me.id, ...rsvps.map(r => r.user_id)]);
    is.oninput = () => { clearTimeout(timer); timer = setTimeout(async () => {
      const term = is.value.trim().replace(/[%_,()]/g, "");
      if (term.length < 2) { $("#iresults").innerHTML = ""; return; }
      const { data } = await sb.from("profiles").select("id,display_name,avatar_url,city,verified").ilike("display_name", `%${term}%`).limit(10);
      const res = (data || []).filter(p => !taken.has(p.id) && !H.blocks.has(p.id));
      $("#iresults").innerHTML = res.map(p => `<li>${avatar(p, "tiny")} <span>${esc(p.display_name)}${p.city ? ` <span class="muted small">${esc(p.city)}</span>` : ""}</span><button class="btn small" data-inv="${p.id}">${esc(t("ev_invite_btn"))}</button></li>`).join("");
      $$("[data-inv]", view).forEach(b => b.onclick = async () => {
        const { error } = await sb.from("event_rsvps").insert({ event_id: id, user_id: b.dataset.inv, status: "invited", invited_by: me.id });
        if (error) return toast(errMsg(error));
        taken.add(b.dataset.inv); b.replaceWith(Object.assign(document.createElement("span"), { className:"tag st-invited", textContent: t("rs_invited") }));
      });
    }, 250); };
  }
}

// ---------- Notifications ----------
async function notifications() {
  const sb = H.sb, me = H.me;
  view.innerHTML = `<section class="page"><div class="titlebar"><h1>${esc(t("notif_title"))}</h1><button class="btn small" id="allread">${esc(t("notif_mark_all"))}</button></div><div id="nl"><p>${esc(t("loading"))}</p></div></section>`;
  const { data } = await sb.from("notifications").select("*").eq("user_id", me.id).order("created_at", { ascending:false }).limit(100);
  const rows = (data || []).filter(n => !H.blocks.has(n.actor_id));
  const people = await H.profilesFor(rows.map(n => n.actor_id));
  const href = n => n.type === "reply" ? "#/forum/" + n.ref : n.type === "reminder_share" ? "#/agenda" : n.type === "post_comment" ? "#/voisins/" + n.ref : n.type === "friend_request" ? "#/amis" : n.type === "group_invite" ? "#/groupes/" + n.ref : n.type === "reward" ? "#/points" : n.type === "client_access" ? "#/mes-clients" : n.type === "friend_accept" ? "#/profil/" + n.ref : "#/evenements/" + n.ref;
  $("#nl").innerHTML = rows.length ? `<ul class="notifs">${rows.map(n => { const p = people[n.actor_id] || { display_name:"?" };
    return `<li class="${n.read ? "" : "unread"}"><a href="${href(n)}" data-id="${n.id}">${avatar(p, "tiny")}<span><strong>${esc(p.display_name)}</strong> ${esc(t("notif_" + n.type))}<br><span class="muted small">${esc(dateTime(n.created_at))}</span></span></a></li>`; }).join("")}</ul>`
    : `<p class="empty">${esc(t("notif_none"))}</p>`;
  $$("#nl a[data-id]").forEach(a => a.addEventListener("click", () => { sb.from("notifications").update({ read:true }).eq("id", a.dataset.id).then(() => {}); }));
  $("#allread").onclick = async () => { await sb.from("notifications").update({ read:true }).eq("user_id", me.id).eq("read", false); H.refreshCounts(); notifications(); };
}
});
