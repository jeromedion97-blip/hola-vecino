/* Vigie : signale à Central les erreurs JavaScript de ce site (aucune donnée personnelle).
   Balise à placer en premier dans <head>, avant les autres scripts :
   <script src="/vigie.js" data-site="identifiant-du-site" data-partie="site"></script>
   data-site    : identifiant du site dans Central (vide pour Central lui-même)
   data-partie  : site, logiciel ou central
   data-adresse : adresse de réception (par défaut, celle de Central)
   Sur localhost, rien n'est envoyé, sauf avec data-test="1".
   Pour signaler une erreur à la main : window.vigieSignaler('message', { details }). */
(function () {
  'use strict';
  var script = document.currentScript;
  var conf = function (nom, defaut) {
    var v = script && script.getAttribute('data-' + nom);
    return v === null || v === undefined || v === '' ? defaut : v;
  };
  var ADRESSE = conf('adresse', 'https://tableau-central.netlify.app/api/erreur');
  var SITE = conf('site', '');
  var PARTIE = conf('partie', 'site');
  var VERSION = conf('version', '');
  var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || /\.(localhost|test)$/.test(location.hostname);
  var MAX_ENVOIS = 5;
  var envois = 0;
  var deja = {};

  // Retire les paramètres d'adresse, les adresses e-mail et les jetons d'un texte.
  function nettoyer(texte, max) {
    var t = String(texte == null ? '' : texte);
    // Adresses : on retire la requête (?ref=…) et la suite des routes qui désignent une personne.
    t = t.replace(/(https?:\/\/[^\s?#"')]+)\?[^\s#"')]*/gi, '$1');
    t = t.replace(/(#\/?(?:user|chat|u|c|profile?|messages?|conversations?|signer|voir|l)\/)[^\s"')]+/gi, '$1…');
    t = t.replace(/([?&#][a-z_]*(?:token|key|code|secret|signature|sig|password|mdp|email|state)[a-z_]*=)[^&#\s"']+/gi, '$1…');
    t = t.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[e-mail]');
    t = t.replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g, '[jeton]');
    t = t.replace(/\b(sb_(?:secret|publishable)_[A-Za-z0-9_-]{8,})/g, '[clé]');
    return t.length > max ? t.slice(0, max) + '…' : t;
  }
  // Remplace dans un chemin les morceaux qui ressemblent à un identifiant (uuid, nombre, jeton).
  function masquerIds(chemin) {
    return chemin.split('/').map(function (s) {
      var id = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(s) || /^\d{4,}$/.test(s) || (s.length >= 20 && /^[A-Za-z0-9_.~-]+$/.test(s) && /\d/.test(s));
      return id ? '…' : s;
    }).join('/');
  }
  // Adresse de la page sans les paramètres (?…) ; la route (#…) est gardée sans paramètres ni identifiants.
  function page() {
    var hash = location.hash.split('?')[0];
    // Un fragment qui porte des valeurs (retour de connexion avec jetons) n'est jamais envoyé.
    if (/[=&]/.test(hash)) hash = '';
    // Routes qui désignent une personne ou un document privé : seul le premier mot est gardé.
    if (/^#\/?(signer|l|voir|user|chat|u|c|profile?|messages?|conversations?)\//i.test(hash)) hash = hash.replace(/^(#\/?[a-z]+\/).*/i, '$1…');
    return location.origin + masquerIds(location.pathname) + masquerIds(hash);
  }
  function ignorer(message, fichier) {
    var m = String(message || '');
    if (!m) return true;
    if (/^Script error\.?$/i.test(m) && !fichier) return true; // erreur d'un autre domaine, sans détail
    if (/ResizeObserver loop/i.test(m)) return true;
    if (/(chrome|moz|safari(-web)?)-extension:\/\//i.test(String(fichier || '') + m)) return true;
    return false;
  }

  function envoyer(rapport) {
    try {
      if (!rapport || envois >= MAX_ENVOIS) return;
      if (ignorer(rapport.message, rapport.fichier)) return;
      var cle = [rapport.type, rapport.message, rapport.fichier, rapport.ligne].join('|');
      if (deja[cle]) return;
      deja[cle] = true;
      try {
        var vus = JSON.parse(sessionStorage.getItem('vigie.vus') || '{}');
        if (vus[cle]) return;
        vus[cle] = 1;
        sessionStorage.setItem('vigie.vus', JSON.stringify(vus));
      } catch (e) { /* stockage indisponible : on envoie quand même */ }
      envois++;
      if (local && conf('test', '') !== '1') {
        if (window.console && console.info) console.info('[vigie] non envoyé (poste local) :', rapport.message);
        return;
      }
      var corps = JSON.stringify({
        v: 1,
        site: SITE,
        partie: PARTIE,
        source: 'navigateur',
        type: rapport.type,
        message: nettoyer(rapport.message, 1000),
        fichier: nettoyer(rapport.fichier, 300),
        ligne: rapport.ligne || null,
        colonne: rapport.colonne || null,
        pile: nettoyer(rapport.pile, 4000),
        details: rapport.details ? nettoyer(JSON.stringify(rapport.details), 1500) : '',
        page: nettoyer(page(), 300),
        langue: (document.documentElement.lang || navigator.language || '').slice(0, 10),
        navigateur: String(navigator.userAgent || '').slice(0, 300),
        ecran: (window.innerWidth || 0) + 'x' + (window.innerHeight || 0),
        version: VERSION,
        moment: new Date().toISOString()
      });
      var envoye = false;
      if (navigator.sendBeacon) {
        try { envoye = navigator.sendBeacon(ADRESSE, new Blob([corps], { type: 'text/plain' })); } catch (e) { envoye = false; }
      }
      if (!envoye && window.fetch) {
        fetch(ADRESSE, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'content-type': 'text/plain' }, body: corps })['catch'](function () {});
      }
    } catch (e) { /* la vigie ne doit jamais casser la page */ }
  }

  window.addEventListener('error', function (ev) {
    try {
      var cible = ev && ev.target;
      if (cible && cible !== window && cible.tagName) {
        // Échec de chargement d'un script ou d'une feuille de style (les images sont ignorées).
        var tag = String(cible.tagName).toLowerCase();
        if (tag !== 'script' && tag !== 'link') return;
        envoyer({ type: 'ressource', message: 'Fichier non chargé : ' + (cible.src || cible.href || tag), fichier: cible.src || cible.href || '' });
        return;
      }
      var err = ev.error;
      envoyer({
        type: 'erreur',
        message: (err && err.message) || ev.message,
        fichier: ev.filename,
        ligne: ev.lineno,
        colonne: ev.colno,
        pile: err && err.stack
      });
    } catch (e) { /* rien */ }
  }, true);

  window.addEventListener('unhandledrejection', function (ev) {
    try {
      var r = ev && ev.reason;
      var message = r && r.message ? r.message : (typeof r === 'string' ? r : 'Promesse rejetée sans message');
      envoyer({ type: 'promesse', message: message, pile: r && r.stack, fichier: '' });
    } catch (e) { /* rien */ }
  });

  document.addEventListener('securitypolicyviolation', function (ev) {
    try {
      envoyer({
        type: 'csp',
        message: 'Bloqué par la politique de sécurité (' + ev.effectiveDirective + ') : ' + (ev.blockedURI || 'script en ligne'),
        fichier: ev.sourceFile,
        ligne: ev.lineNumber,
        colonne: ev.columnNumber
      });
    } catch (e) { /* rien */ }
  });

  // Signalement manuel, par exemple dans un catch : window.vigieSignaler('Envoi du formulaire impossible', { statut: 500 })
  window.vigieSignaler = function (message, details) {
    var err = message instanceof Error ? message : null;
    envoyer({
      type: 'manuel',
      message: err ? err.message : String(message || ''),
      pile: err ? err.stack : '',
      fichier: '',
      details: details || null
    });
  };
})();
