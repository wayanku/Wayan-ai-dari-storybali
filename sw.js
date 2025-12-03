const CACHE_NAME = 'wayan-ai-cache-v20'; // [PENTING] Naikkan versi cache untuk menerapkan perubahan
const OFFLINE_URL = 'offline.html';

// Daftar aset inti yang akan di-cache saat instalasi
const URLS_TO_CACHE = [
  '/',
  'index.html',
  // 'style.css' tidak ada sebagai file terpisah, jadi saya hapus. CSS ada di dalam index.html
  'offline.html',
  'favicon-96x96.png',
  'favicon.svg',
  'apple-touch-icon.png',
  'site.webmanifest',
  'web-app-manifest-512x512.png',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Menginstall...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Membuka cache dan menambahkan aset inti');
        const cacheOffline = cache.add(new Request(OFFLINE_URL, {cache: 'reload'}));
        const cacheCoreAssets = cache.addAll(URLS_TO_CACHE);
        return Promise.all([cacheOffline, cacheCoreAssets]);
      })
      .then(() => self.skipWaiting())
      .catch(error => {
        console.error('Gagal melakukan pre-caching saat instalasi:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Diaktifkan.');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Menghapus cache lama', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.hostname.includes('google.com') || url.hostname.includes('gstatic.com') || url.hostname.includes('firebaseapp.com') || url.hostname.includes('firebasestorage.googleapis.com')) {
    return;
  }

  if (event.request.method === 'GET') {
    if (url.pathname === '/' || url.pathname.endsWith('/index.html')) {
      event.respondWith(
        fetch(event.request)
          .then(networkResponse => {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
            return networkResponse;
          })
          .catch(() => caches.match(event.request).then(cachedResponse => cachedResponse || caches.match(OFFLINE_URL)))
      );
    } else if (event.request.mode === 'navigate') {
      event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
    } else {
      event.respondWith(
        caches.match(event.request).then(cachedResponse => {
          return cachedResponse || fetch(event.request).then(networkResponse => {
            return caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            });
          }).catch(() => new Response('', { status: 503, statusText: 'Service Unavailable' }));
        })
      );
    }
  }
});

let inactivityTimer = null;

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'START_INACTIVITY_TIMER') {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      self.registration.showNotification('Wayan AI', {
        body: 'Mau udahan ngobrol sama Wayan?',
        icon: 'favicon-96x96.png',
        badge: 'favicon.svg'
      });
    }, 300000); // 5 menit
  } else if (event.data && event.data.type === 'CANCEL_INACTIVITY_TIMER') {
    clearTimeout(inactivityTimer);
  } else if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker: Menerima pesan SKIP_WAITING, mengaktifkan service worker baru.');
    self.skipWaiting();
  }
});
