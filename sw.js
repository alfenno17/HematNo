const CACHE_NAME = 'hematno-v1';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
];

// ─── Install: simpan semua aset utama ke cache ──────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// ─── Activate: hapus cache versi lama ─────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ─── Fetch: Cache-First + Dynamic Caching untuk CDN ─────────────
self.addEventListener('fetch', (event) => {
  // Hanya proses request GET (bukan POST/PUT)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // Jika aset belum ada di cache, ambil dari network dan simpan otomatis
      return fetch(event.request).then((networkResponse) => {
        // Validasi response sebelum disimpan ke cache
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Fallback jika network gagal dan aset tidak ada di cache
      });
    })
  );
});
