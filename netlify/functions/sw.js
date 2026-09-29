// Application installable : met en cache les fichiers du site pour un démarrage rapide.
// Changez VERSION à chaque mise à jour importante du site.
const VERSION = "hv-v16";
const SHELL = ["./", "index.html", "style.css", "manifest.webmanifest", "logo-horizontal.png", "favicon.png", "icon-192.png", "config.js", "config-extra.js", "hv-app.js?v=hv-v16"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/.netlify/")) return;
  // Réseau d'abord (toujours la dernière version), cache si hors ligne
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
