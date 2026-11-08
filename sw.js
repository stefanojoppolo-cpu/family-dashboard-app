const CACHE_NAME = 'duewell-v3';
const urlsToCache = ['./', './index.html', './app.html', './manifest.json', './icon-192.png', './icon-512.png', './privacy.html', './termini.html'];
// Componenti esterni necessari per avviare l'app anche senza rete (solo questi, mai i dati dell'utente)
const EXTERNAL = [/^https:\/\/www\.gstatic\.com\/firebasejs\//, /^https:\/\/fonts\.googleapis\.com\//, /^https:\/\/fonts\.gstatic\.com\//];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => Promise.all(urlsToCache.map((u) => cache.add(u).catch(() => {})))));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Toglie solo le vecchie versioni di questa app, senza toccare altre app sullo stesso dominio
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => (k.startsWith('fd-app-') || k.startsWith('duewell-')) && k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin === location.origin){
    // Prima la rete (aggiornamenti subito visibili), la copia salvata solo se offline.
    event.respondWith(
      fetch(req)
        .then((response) => {
          if(response && response.ok){ const clone = response.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)); }
          return response;
        })
        .catch(() => caches.match(req).then((r) => r || (req.mode === 'navigate' ? caches.match('./app.html') : undefined)))
    );
    return;
  }
  if(EXTERNAL.some((re) => re.test(req.url))){
    // Componenti esterni: copia salvata subito, aggiornata in background
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(req).then((hit) => {
          const net = fetch(req).then((response) => { if(response && (response.ok || response.type === 'opaque')) cache.put(req, response.clone()); return response; }).catch(() => hit);
          return hit || net;
        })
      )
    );
  }
});

// Un tocco sull'avviso apre (o riporta in primo piano) Duewell
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then((list) => {
    for(const c of list){ if('focus' in c) return c.focus(); }
    return self.clients.openWindow('./');
  }));
});
