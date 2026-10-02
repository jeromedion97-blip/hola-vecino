/* Compteur de visites anonyme pour Central.
   À ajouter dans une page du site : <script src="/compteur-visites.js" data-site="IDENTIFIANT" defer></script>
   IDENTIFIANT = l'identifiant du site dans Central (second-regard, hola-vecino, cana-book, cliccockpit).
   Envoie : l'identifiant du site et un code tiré au hasard dans ce navigateur. Rien d'autre
   (ni adresse IP, ni page vue, ni texte). Respecte « Ne pas me suivre ». Au plus un envoi par page ouverte. */
(function () {
  try {
    var me = document.currentScript, site = me && me.getAttribute('data-site');
    if (!site || navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
    if (/bot|crawl|spider|headless/i.test(navigator.userAgent)) return;
    var id = null;
    try { id = localStorage.getItem('cv_id'); } catch (e) { /* stockage bloqué */ }
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + String(Date.now())).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32);
      try { localStorage.setItem('cv_id', id); } catch (e) { /* tant pis : un code par visite */ }
    }
    fetch('https://osdhvzehauqzjgdpvebk.supabase.co/rest/v1/rpc/site_hit', {
      method: 'POST', keepalive: true,
      headers: { 'Content-Type': 'application/json', apikey: 'sb_publishable_8B343B1gtqTbbClQHNDYYw_wVZhefBR' },
      body: JSON.stringify({ p_site: site, p_visitor: id })
    }).catch(function () {});
  } catch (e) { /* ne jamais gêner le site */ }
})();
