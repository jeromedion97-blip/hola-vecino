// Application installable : met en cache les fichiers du site pour un démarrage rapide.
// Changez VERSION à chaque mise à jour importante du site.
const VERSION = "hv-v13";
const SHELL = ["./", "index.html", "style.css", "manifest.webmanifest", "logo-horizontal.png", "favicon.png", "icon-192.png", "config.js", "config-extra.js", "i18n.js", "i18n-v2.js", "i18n-v3.js", "i18n-v4.js", "i18n-v5.js", "guide.js", "content-v2.js", "events.js", "admin.js", "market.js", "engage.js", "v5.js", "wall.js", "friends.js", "games.js", "v9-tools.js", "v9-social.js", "v9-admin.js", "i18n-v9.js", "i18n-v10.js", "i18n-v11.js", "i18n-v12.js", "share.js", "games-data.js", "i18n-v8.js", "i18n-v7.js", "i18n-v6.js", "app.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/.netlify/")) return;
  // Réseau d'abord (toujours la dernière version), cache si hors ligne
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
