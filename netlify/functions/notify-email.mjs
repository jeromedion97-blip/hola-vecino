// Tâche automatique toutes les 15 minutes :
// 1) e-mails récapitulatifs des notifications et messages non lus (si le membre l'accepte)
// 2) rappel avant la fin de l'abonnement Premium
// 3) avertissement puis effacement des documents du drive 3 mois après la fin du Premium
// Variables Netlify : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BREVO_API_KEY, MAIL_FROM, SITE_URL
export const config = { schedule: "*/15 * * * *" };

const URL_ = () => process.env.SUPABASE_URL;
const svc = () => ({ apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" });
const get = async path => { const r = await fetch(`${URL_()}/rest/v1/${path}`, { headers: svc() }); return r.ok ? r.json() : []; };
const patch = (path, body) => fetch(`${URL_()}/rest/v1/${path}`, { method: "PATCH", headers: { ...svc(), Prefer: "return=minimal" }, body: JSON.stringify(body) });
const iso = ms => new Date(Date.now() + ms).toISOString();
const esc = s => String(s || "").replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));

const T = {
  fr: { subj:"Du nouveau sur Hola Vecino", hi:"Bonjour", msg:"nouveau(x) message(s)", reply:"a répondu à votre sujet", invite:"vous invite à un événement", rsvp:"participe à votre événement", reminder_share:"a partagé un rappel avec vous", post_comment:"a commenté votre publication", friend_request:"vous a envoyé une demande d'ami", friend_accept:"a accepté votre demande d'ami", group_invite:"vous invite dans un groupe", client_access:"vous a donné accès à son dossier", reward:"Vous avez gagné 1 mois de Premium offert !", open:"Ouvrir Hola Vecino", stop:"Pour ne plus recevoir ces e-mails, décochez l'option dans Mon profil.",
    endSubj:"Votre abonnement Premium se termine bientôt", endTxt:"Votre abonnement Premium se termine le", endMore:"Sans renouvellement, vous perdrez l'accès à l'analyse IA, au comparateur, à la checklist, aux rappels, au drive et à la création d'événements. Vos données restent conservées 3 mois.",
    purgeSubj:"Vos documents seront bientôt effacés", purgeTxt:"Votre Premium est terminé depuis 2 mois. Les documents de votre drive seront effacés définitivement dans 30 jours. Réabonnez-vous pour les retrouver." },
  en: { subj:"New on Hola Vecino", hi:"Hello", msg:"new message(s)", reply:"replied to your topic", invite:"invited you to an event", rsvp:"is going to your event", reminder_share:"shared a reminder with you", post_comment:"commented on your post", friend_request:"sent you a friend request", friend_accept:"accepted your friend request", group_invite:"invited you to a group", client_access:"gave you access to their file", reward:"You won 1 free month of Premium!", open:"Open Hola Vecino", stop:"To stop these emails, untick the option in My profile.",
    endSubj:"Your Premium subscription ends soon", endTxt:"Your Premium subscription ends on", endMore:"Without renewal you will lose AI analysis, the city comparison, your checklist, reminders, drive and event creation. Your data is kept for 3 months.",
    purgeSubj:"Your documents will soon be deleted", purgeTxt:"Your Premium ended 2 months ago. The documents in your drive will be permanently deleted in 30 days. Subscribe again to keep them." }
};
T.es = { ...T.en, subj:"Novedades en Hola Vecino", hi:"Hola", msg:"mensaje(s) nuevo(s)", open:"Abrir Hola Vecino", reward:"¡Has ganado 1 mes de Premium gratis!" };
T.de = { ...T.en, subj:"Neues auf Hola Vecino", hi:"Hallo", msg:"neue Nachricht(en)", open:"Hola Vecino öffnen", reward:"Du hast 1 Gratismonat Premium gewonnen!" };
T.nl = { ...T.en, subj:"Nieuw op Hola Vecino", hi:"Hallo", msg:"nieuwe bericht(en)", open:"Hola Vecino openen", reward:"Je hebt 1 gratis maand Premium gewonnen!" };

async function emailOf(uid) {
  const r = await fetch(`${URL_()}/auth/v1/admin/users/${uid}`, { headers: svc() });
  if (!r.ok) return null; const u = await r.json(); return u.email || (u.user && u.user.email) || null;
}
async function send(to, subject, lines, t) {
  const site = process.env.SITE_URL || "https://hola-vecino.netlify.app";
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#14213D">
    <p style="font-size:18px;font-weight:bold;color:#1E4E8C">¡Hola Vecino!</p>${lines.map(l => `<p>${l}</p>`).join("")}
    <p><a href="${site}" style="display:inline-block;background:#1E4E8C;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">${esc(t.open)}</a></p>
    <p style="font-size:12px;color:#56637A">${esc(t.stop)}</p></div>`;
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST", headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender: { name: "Hola Vecino", email: process.env.MAIL_FROM }, to: [{ email: to }], subject, htmlContent: html })
  });
  return r.ok;
}

export default async () => {
  if (!process.env.BREVO_API_KEY || !process.env.MAIL_FROM) return new Response("brevo not configured");
  // 1) Notifications et messages non lus
  const notifs = await get(`notifications?select=id,user_id,type,actor_id&emailed_at=is.null&created_at=gte.${encodeURIComponent(iso(-2 * 86400e3))}&limit=500`);
  const msgs = await get(`messages?select=id,recipient_id&read=eq.false&emailed=eq.false&created_at=lte.${encodeURIComponent(iso(-10 * 60e3))}&created_at=gte.${encodeURIComponent(iso(-2 * 86400e3))}&limit=500`);
  const users = [...new Set([...notifs.map(n => n.user_id), ...msgs.map(m => m.recipient_id)])];
  if (users.length) {
    const profs = await get(`profiles?select=id,display_name,email_alerts,lang&id=in.(${users.join(",")})`);
    const actorIds = [...new Set(notifs.map(n => n.actor_id).filter(Boolean))];
    const actors = actorIds.length ? await get(`profiles?select=id,display_name&id=in.(${actorIds.join(",")})`) : [];
    const name = id => (actors.find(a => a.id === id) || {}).display_name || "?";
    for (const p of profs) {
      if (p.email_alerts === false) continue;
      const t = T[p.lang] || T.fr, lines = [];
      const nm = msgs.filter(m => m.recipient_id === p.id).length;
      if (nm) lines.push(`💬 <strong>${nm}</strong> ${esc(t.msg)}`);
      notifs.filter(n => n.user_id === p.id).slice(0, 12).forEach(n => lines.push(n.type === "reward" ? `🏆 ${esc(t.reward)}` : `🔔 <strong>${esc(name(n.actor_id))}</strong> ${esc(t[n.type] || "")}`));
      if (!lines.length) continue;
      const to = await emailOf(p.id);
      if (to) await send(to, t.subj, [`${esc(t.hi)} ${esc(p.display_name)},`, ...lines], t);
    }
    if (notifs.length) await patch(`notifications?id=in.(${notifs.map(n => n.id).join(",")})`, { emailed_at: new Date().toISOString() });
    if (msgs.length) await patch(`messages?id=in.(${msgs.map(m => m.id).join(",")})`, { emailed: true });
  }
  // 2) Fin d'abonnement dans les 3 jours
  const ending = await get(`profiles?select=id,display_name,lang,premium_until,premium_reminded_at&premium_until=gte.${encodeURIComponent(iso(0))}&premium_until=lte.${encodeURIComponent(iso(3 * 86400e3))}`);
  for (const p of ending) {
    if (p.premium_reminded_at && new Date(p.premium_reminded_at) > new Date(Date.now() - 10 * 86400e3)) continue;
    const t = T[p.lang] || T.fr, to = await emailOf(p.id);
    if (to) await send(to, t.endSubj, [`${esc(t.hi)} ${esc(p.display_name)},`, `${esc(t.endTxt)} ${new Date(p.premium_until).toLocaleDateString(p.lang || "fr")}.`, esc(t.endMore)], t);
    await patch(`profiles?id=eq.${p.id}`, { premium_reminded_at: new Date().toISOString() });
  }
  // 3) Documents : avertissement à 60 jours, effacement à 90 jours après la fin du Premium
  const docs = await get(`documents?select=id,owner_id,path&limit=1000`);
  const owners = [...new Set(docs.map(d => d.owner_id))];
  if (owners.length) {
    const ps = await get(`profiles?select=id,display_name,lang,premium_until,premium_purge_warned_at&id=in.(${owners.join(",")})`);
    for (const p of ps) {
      if (!p.premium_until) continue;
      const ended = Date.now() - new Date(p.premium_until).getTime();
      if (ended > 90 * 86400e3) {
        const mine = docs.filter(d => d.owner_id === p.id);
        await fetch(`${URL_()}/storage/v1/object/documents`, { method: "DELETE", headers: svc(), body: JSON.stringify({ prefixes: mine.map(d => d.path) }) });
        await fetch(`${URL_()}/rest/v1/documents?owner_id=eq.${p.id}`, { method: "DELETE", headers: svc() });
      } else if (ended > 60 * 86400e3 && !p.premium_purge_warned_at) {
        const t = T[p.lang] || T.fr, to = await emailOf(p.id);
        if (to) await send(to, t.purgeSubj, [`${esc(t.hi)} ${esc(p.display_name)},`, esc(t.purgeTxt)], t);
        await patch(`profiles?id=eq.${p.id}`, { premium_purge_warned_at: new Date().toISOString() });
      }
    }
  }
  return new Response("ok");
};
