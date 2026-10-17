const CACHE_NAME = 'casa-famiglia-v2';
const urlsToCache = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Toglie solo le vecchie versioni di questa app (prefisso fd-app-), senza toccare altre app sullo stesso dominio
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('fd-app-') && k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Prima la rete (aggiornamenti subito visibili), la copia salvata solo se offline.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if(url.origin !== location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
