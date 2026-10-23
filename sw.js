const CACHE_NAME = 'faiz-takip-v3';

// Her açılışta eski önbellekleri temizle ve en güncel dosyaları al
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Network-first: Önce güncel dosyayı sunucudan çek, internetsiz kalırsa önbelleğe bak
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
