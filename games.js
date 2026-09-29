// Jeux (Memory des tapas, Quiz Espagne, mot du jour), classement, parcours de bienvenue, accroches d'inscription
(window.HV_EXT = window.HV_EXT || []).push((H, ROUTES) => {
const { t, esc, $, $$, toast, avatar } = H;
const view = H.view;
ROUTES.unshift([/^#\/jeux(?:\/(\w+))?$/, m => games(m[1] || "")]);
const hooks = window.HV_HOOKS = window.HV_HOOKS || {};
const push = (k, f) => (hooks[k] = hooks[k] || []).push(f);

// ---------- Mot du jour ----------
const dayIndex = n => Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400e3) % n;
function wordCard(compact) {
  const W = window.HV_WORDS || []; if (!W.length) return "";
  const w = W[dayIndex(W.length)], col = { fr:1, en:2, de:3, nl:4 }[H.lang];
  return `<section class="word-card ${compact ? "compact" : ""}">
    <p class="word-label">🇪🇸 ${esc(t("gm_word"))}</p>
    <p class="word"><strong>${esc(w[0])}</strong> <button class="speak" data-say="${esc(w[0])}" aria-label="${esc(t("gm_listen"))}">🔊</button></p>
    ${col ? `<p class="word-tr">${esc(w[col])}</p>` : ""}
    <p class="word-ex"><em>« ${esc(w[5])} »</em> <button class="speak small" data-say="${esc(w[5])}" aria-label="${esc(t("gm_listen"))}">🔊</button></p>
    ${t("sp_learn") !== "sp_learn" ? `<p class="small"><a href="#/boutique">${esc(t("sp_learn"))} →</a></p>` : ""}
  </section>`;
}
function bindSpeak(root) {
  $$("[data-say]", root).forEach(b => b.onclick = () => {
    if (!("speechSynthesis" in window)) return toast(t("gm_no_voice"));
    const u = new SpeechSynthesisUtterance(b.dataset.say); u.lang = "es-ES"; u.rate = .9;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  });
}

// ---------- Classement ----------
async function board(game, el) {
  if (!H.configured || !el) return;
  const { data } = await H.sb.rpc("leaderboard", { p_game: game, p_days: 7 });
  const rows = data || [];
  el.innerHTML = `<h3>🏆 ${esc(t("gm_board"))}</h3>` + (rows.length ? `<ol class="board">${rows.map((r, i) => `<li class="${H.me && r.user_id === H.me.id ? "me" : ""}"><span class="rank">${["🥇","🥈","🥉"][i] || i + 1}</span>${avatar(r, "tiny")}<span class="bn">${esc(r.display_name)}</span><strong>${r.best}</strong></li>`).join("")}</ol>` : `<p class="muted small">${esc(t("gm_board_empty"))}</p>`);
}
async function saveScore(game, score, el) {
  if (!H.me || !H.myProfile) {
    el.insertAdjacentHTML("beforeend", `<div class="join-cta"><p><strong>${esc(t("gm_join_t"))}</strong></p><p>${esc(t("gm_join_d"))}</p><a class="btn primary" href="#/connexion?signup">${esc(t("hero_join"))}</a></div>`);
    return;
  }
  const { error } = await H.sb.from("game_scores").insert({ user_id: H.me.id, game, score });
  if (!error) el.insertAdjacentHTML("beforeend", `<p class="ok small">✓ ${esc(t("gm_saved"))}</p>`);
}

// ---------- Page Jeux ----------
async function games(which) {
  if (which === "memory") return memory();
  if (which === "quiz") return quiz();
  view.innerHTML = `<section class="page">
    <h1>🎮 ${esc(t("gm_title"))}</h1><p class="lead">${esc(t("gm_intro"))}</p>
    <div class="game-doors">
      <a class="game-door memory-door" href="#/jeux/memory"><span class="gd-emoji" aria-hidden="true">🥘🍤🫒</span><strong>${esc(t("gm_memory"))}</strong><span>${esc(t("gm_memory_d"))}</span><span class="btn small primary">${esc(t("gm_play"))}</span></a>
      <a class="game-door quiz-door" href="#/jeux/quiz"><span class="gd-emoji" aria-hidden="true">🇪🇸❓</span><strong>${esc(t("gm_quiz"))}</strong><span>${esc(t("gm_quiz_d"))}</span><span class="btn small primary">${esc(t("gm_play"))}</span></a>
    </div>
    ${wordCard(false)}
  </section>`;
  bindSpeak(view);
}

// ---------- Memory des tapas ----------
const EMO = ["🥘","🍤","🫒","🍅","🍷","🧀","🍊","🌞"];
function memory() {
  const deck = EMO.concat(EMO).map(e => ({ e, r: Math.random() })).sort((a, b) => a.r - b.r).map(x => x.e);
  let first = null, lock = false, found = 0, moves = 0, start = null, timer = null;
  view.innerHTML = `<section class="page game">
    <a class="back" href="#/jeux">${esc(t("back"))}</a>
    <h1>${esc(t("gm_memory"))}</h1><p class="muted">${esc(t("gm_memory_rules"))}</p>
    <p class="game-stats"><span>⏱ <strong id="gtime">0</strong> s</span><span>👆 <strong id="gmoves">0</strong> ${esc(t("gm_moves"))}</span></p>
    <div class="memory" id="mem">${deck.map((e, i) => `<button class="mcard" data-i="${i}" aria-label="?"><span class="mfront">${e}</span><span class="mback" aria-hidden="true"></span></button>`).join("")}</div>
    <div id="gend"></div><div class="board-box" id="gboard"></div>
  </section>`;
  board("memory", $("#gboard"));
  H.onCleanup(() => clearInterval(timer));
  $$(".mcard", view).forEach(c => c.onclick = () => {
    if (lock || c.classList.contains("up") || c.classList.contains("done")) return;
    if (!start) { start = Date.now(); timer = setInterval(() => { const g = $("#gtime"); if (g) g.textContent = Math.floor((Date.now() - start) / 1000); }, 500); }
    c.classList.add("up"); c.setAttribute("aria-label", deck[+c.dataset.i]);
    if (!first) { first = c; return; }
    moves++; $("#gmoves").textContent = moves;
    if (deck[+first.dataset.i] === deck[+c.dataset.i]) {
      first.classList.add("done"); c.classList.add("done"); first = null; found++;
      if (found === EMO.length) {
        clearInterval(timer);
        const secs = Math.max(1, Math.round((Date.now() - start) / 1000));
        const score = Math.max(100, 2000 - secs * 10 - Math.max(0, moves - 8) * 25);
        const end = $("#gend");
        end.innerHTML = `<div class="game-end"><p class="big">🎉 ${esc(t("gm_bravo"))}</p><p>${secs} s · ${moves} ${esc(t("gm_moves"))} · <strong>${score} ${esc(t("gm_points"))}</strong></p><div class="actions"><button class="btn primary" id="again">${esc(t("gm_again"))}</button><button class="btn" id="shareg">↗ ${esc(t("ev_share"))}</button></div></div>`;
        $("#again").onclick = memory;
        $("#shareg").onclick = () => H.share(`${t("gm_memory")} : ${score} ${t("gm_points")} ! ${t("gm_challenge")}`, location.href);
        saveScore("memory", score, end).then(() => board("memory", $("#gboard")));
      }
    } else {
      lock = true; const a = first; first = null;
      setTimeout(() => { a.classList.remove("up"); c.classList.remove("up"); a.setAttribute("aria-label", "?"); c.setAttribute("aria-label", "?"); lock = false; }, 800);
    }
  });
}

// ---------- Quiz ----------
function quiz() {
  const pool = (window.HV_QUIZ || []).slice().map(q => ({ q, r: Math.random() })).sort((a, b) => a.r - b.r).slice(0, 5).map(x => x.q);
  let n = 0, good = 0;
  const L = x => Array.isArray(x) ? x : (x[H.lang] || x.en);
  view.innerHTML = `<section class="page game"><a class="back" href="#/jeux">${esc(t("back"))}</a>
    <h1>${esc(t("gm_quiz"))}</h1><div id="qbox"></div><div class="board-box" id="gboard"></div></section>`;
  board("quiz", $("#gboard"));
  const ask = () => {
    const item = pool[n];
    const opts = L(item.opts).map((o, i) => ({ o, ok: i === item.a, r: Math.random() })).sort((a, b) => a.r - b.r);
    $("#qbox").innerHTML = `<p class="quiz-prog">${esc(t("gm_question"))} ${n + 1} / ${pool.length} · ✓ ${good}</p>
      <p class="quiz-q">${esc(L(item.q))}</p>
      <div class="quiz-opts">${opts.map((x, i) => `<button class="qopt" data-i="${i}">${esc(x.o)}</button>`).join("")}</div><div id="qfb"></div>`;
    $$(".qopt", view).forEach(b => b.onclick = () => {
      const pick = opts[+b.dataset.i];
      $$(".qopt", view).forEach((x, i) => { x.disabled = true; if (opts[i].ok) x.classList.add("right"); });
      if (pick.ok) good++; else b.classList.add("wrong");
      $("#qfb").innerHTML = `<p class="quiz-why ${pick.ok ? "ok" : "warn"}">${pick.ok ? "✓ " + esc(t("gm_right")) : "✗ " + esc(t("gm_wrong"))} ${esc(L(item.why))}</p>
        <button class="btn primary" id="qnext">${esc(n + 1 < pool.length ? t("gm_next") : t("gm_result"))}</button>`;
      $("#qnext").onclick = () => { n++; n < pool.length ? ask() : finish(); };
    });
  };
  const finish = () => {
    const score = good * 100;
    const msg = good === pool.length ? t("gm_q_perfect") : good >= 3 ? t("gm_q_good") : t("gm_q_try");
    $("#qbox").innerHTML = `<div class="game-end"><p class="big">${good === pool.length ? "🏆" : good >= 3 ? "🎉" : "💪"} ${good} / ${pool.length}</p><p>${esc(msg)}</p><p><strong>${score} ${esc(t("gm_points"))}</strong></p>
      <div class="actions"><button class="btn primary" id="again">${esc(t("gm_again"))}</button><button class="btn" id="shareg">↗ ${esc(t("ev_share"))}</button><a class="btn" href="#/guide">${esc(t("nav_guide"))}</a></div></div>`;
    $("#again").onclick = quiz;
    $("#shareg").onclick = () => H.share(`${t("gm_quiz")} : ${good}/${pool.length} ! ${t("gm_challenge")}`, location.href);
    saveScore("quiz", score, $(".game-end", view)).then(() => board("quiz", $("#gboard")));
  };
  ask();
}

// ---------- Accueil visiteur : mot du jour, jeux, chiffres ----------
push("home", async () => {
  const wrap = document.createElement("div"); wrap.className = "home-play";
  const doors = $(".doors", view); doors ? doors.insertAdjacentElement("afterend", wrap) : view.appendChild(wrap);
  wrap.innerHTML = `<div class="home-play-grid">${wordCard(true)}
    <a class="play-teaser" href="#/jeux"><span class="gd-emoji" aria-hidden="true">🎮</span><strong>${esc(t("gm_teaser_t"))}</strong><span>${esc(t("gm_teaser_d"))}</span><span class="btn small primary">${esc(t("gm_play"))}</span></a></div>`;
  bindSpeak(wrap);
  if (!H.configured || H.me) return;
  const { data: s } = await H.sb.rpc("public_stats");
  if (s && s.members >= 10) {
    wrap.insertAdjacentHTML("afterbegin", `<div class="stats-band"><span><strong>${s.members}</strong> ${esc(t("members"))}</span><span><strong>${s.cities}</strong> ${esc(t("gm_cities"))}</span>${s.events ? `<span><strong>${s.events}</strong> ${esc(t("gm_events_up"))}</span>` : ""}<a class="btn primary" href="#/connexion?signup">${esc(t("gm_join_free"))}</a></div>`);
  }
});

// ---------- Tableau de bord : parcours de bienvenue + mot du jour ----------
push("dashboard", async () => {
  const side = $(".dash-side", view), main = $(".dash-main", view); if (!main) return;
  if (side) { side.insertAdjacentHTML("afterbegin", wordCard(true)); bindSpeak(side); }
  try { if (localStorage.getItem("hv_welcome_done_" + H.me.id)) return; } catch (e) {}
  const me = H.me.id, p = H.myProfile || {}, sb = H.sb;
  const count = async q => { const { count } = await q; return count || 0; };
  const [intro, friends, groups, welcomed] = await Promise.all([
    count(sb.from("posts").select("id", { count:"exact", head:true }).eq("author_id", me).eq("kind", "intro")),
    count(sb.from("friendships").select("requester_id", { count:"exact", head:true }).eq("status", "accepted").or(`requester_id.eq.${me},addressee_id.eq.${me}`)),
    count(sb.from("group_members").select("group_id", { count:"exact", head:true }).eq("user_id", me).eq("status", "member")),
    sb.from("post_comments").select("post_id").eq("author_id", me).limit(50).then(async ({ data }) => {
      const ids = [...new Set((data || []).map(x => x.post_id))]; if (!ids.length) return 0;
      const { count } = await sb.from("posts").select("id", { count:"exact", head:true }).in("id", ids).eq("kind", "intro").neq("author_id", me); return count || 0; })
  ]);
  const { data: cg } = p.city ? await sb.from("groups").select("id").ilike("city", p.city).eq("visibility", "public").limit(1) : { data: [] };
  const steps = [
    ["wl_photo", !!p.avatar_url, "#/mon-profil"], ["wl_city", !!p.city, "#/mon-profil"], ["wl_intro", intro > 0, "#/voisins"],
    ["wl_group", groups > 0 || friends > 0, (cg || [])[0] ? "#/groupes/" + cg[0].id : "#/groupes"], ["wl_welcome", welcomed > 0, "#/voisins"], ["wl_friend", friends > 0, "#/communaute"]
  ];
  const done = steps.filter(s => s[1]).length;
  if (done === steps.length) {
    const { data: ok } = await sb.rpc("complete_onboarding");
    if (ok) { try { localStorage.setItem("hv_welcome_done_" + me, "1"); } catch (e) {} toast(t("wl_bonus_ok")); }
    return;
  }
  const left = Math.max(0, 48 * 3600e3 - (Date.now() - new Date(p.created_at || Date.now()).getTime()));
  main.insertAdjacentHTML("afterbegin", `<section class="welcome-card"><div class="titlebar"><h2>🌴 ${esc(t("wl_title"))}</h2><span class="small muted">${done} / ${steps.length}</span></div>
    <p class="small">${left > 0 ? `⏳ ${esc(t("wl_48h"))} <strong>${Math.ceil(left / 3600e3)} h</strong> · ` : ""}🎁 ${esc(t("wl_bonus"))}</p>
    <p class="progress"><span class="bar"><span style="width:${Math.round(done / steps.length * 100)}%"></span></span></p>
    <ul class="welcome-steps">${steps.map(([k, ok, h]) => `<li class="${ok ? "done" : ""}"><a href="${h}"><span aria-hidden="true">${ok ? "✅" : "⬜"}</span> ${esc(t(k))}</a></li>`).join("")}</ul></section>`);
});
});
