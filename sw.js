const CACHE_NAME = 'wayan-ai-cache-v27'; // [PENTING] Versi cache dinaikkan
const OFFLINE_URL = 'offline.html';

// Daftar aset inti yang akan di-cache saat instalasi
const URLS_TO_CACHE = [
  '/',
  'index.html',
  'offline.html',
  'favicon-96x96.png',
  'favicon.svg',
  'apple-touch-icon.png',
  'site.webmanifest',
  'web-app-manifest-512x512.png',
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
  // Abaikan permintaan non-GET dan permintaan ke ekstensi Chrome
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  const url = new URL(event.request.url);

  // [OPTIMASI] Gunakan strategi Stale-While-Revalidate untuk aset utama (HTML)
  // Ini akan menyajikan dari cache terlebih dahulu (cepat), lalu memperbarui di latar belakang.
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preloadResponse = await event.preloadResponse;
        if (preloadResponse) {
          return preloadResponse;
        }

        const networkResponse = await fetch(event.request);
        // Perbarui cache dengan versi baru
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, networkResponse.clone());
        return networkResponse;
      } catch (error) {
        // Jika jaringan gagal, ambil dari cache
        console.log('Fetch failed; returning offline page instead.', error);
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(event.request);
        return cachedResponse || cache.match(OFFLINE_URL);
      }
    })());
  }
  // [OPTIMASI] Gunakan strategi Cache First untuk aset statis lainnya
  else if (URLS_TO_CACHE.includes(url.pathname)) {
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

  // Untuk permintaan lainnya (misal: ke Firebase, Google Fonts, CDN), biarkan browser menanganinya (network-only).
  // Ini adalah perilaku default, jadi kita tidak perlu menambahkan `return;` secara eksplisit.
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
