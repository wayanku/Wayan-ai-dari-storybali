// GANTI SELURUH ISI FILE sw.js DENGAN KODE INI

const CACHE_NAME = 'wayan-ai-cache-v2'; // Ganti nama cache untuk memastikan pembaruan
const OFFLINE_URL = 'offline.html';

// [PERBAIKAN] Pisahkan aset inti yang WAJIB berhasil di-cache
const CORE_ASSETS = [
  './', // Gunakan './' untuk path relatif yang lebih aman
  './index.html',
  './offline.html',
  './favicon-96x96.png',
  './favicon.svg',
  './favicon.ico',
  './apple-touch-icon.png',
  './site.webmanifest'
];

// [PERBAIKAN] Daftar aset pihak ketiga yang "nice to have" tapi boleh gagal
const THIRD_PARTY_ASSETS = [
  'https://i.postimg.cc/Wz2Gmx8X/IMG-2621.jpg',
  'https://cdn.tailwindcss.com', // Cukup cache domain utamanya
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Fungsi untuk men-cache aset pihak ketiga secara aman (boleh gagal)
const cacheThirdPartyAssets = (cache) => {
  console.log('Service Worker: Mencoba men-cache aset pihak ketiga...');
  THIRD_PARTY_ASSETS.forEach(url => {
    // Gunakan cache.add() untuk setiap URL secara terpisah
    // Ini tidak akan menghentikan instalasi jika salah satu gagal
    cache.add(url).catch(error => {
      console.warn(`Service Worker: Gagal men-cache ${url}:`, error);
    });
  });
};

self.addEventListener('install', (event) => {
  console.log('Service Worker: Menginstall...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Membuka cache dan menambahkan aset inti (wajib berhasil)');
        // Pertama, cache halaman offline
        cache.add(new Request(OFFLINE_URL, {cache: 'reload'}));
        // Kedua, cache semua aset inti. Ini HARUS berhasil.
        return cache.addAll(CORE_ASSETS).then(() => {
          // Ketiga, setelah aset inti berhasil, coba cache aset pihak ketiga
          cacheThirdPartyAssets(cache);
        });
      })
      .then(() => self.skipWaiting())
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

  // Abaikan request ke API Google/Firebase/IP Address, dll.
  if (url.hostname.includes('google.com') || url.hostname.includes('gstatic.com') || url.hostname.includes('firebaseapp.com') || url.hostname.includes('ipify.org')) {
    return;
  }

  // Hanya tangani request GET
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).catch(() => {
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
          });
        })
    );
  }
});

// Bagian notifikasi Anda sudah bagus, tidak perlu diubah.
let inactivityTimer = null;
self.addEventListener('message', (event) => {
  if (event.data.type === 'START_INACTIVITY_TIMER') {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      self.registration.showNotification('Wayan AI', {
        body: 'Mau udahan ngobrol sama Wayan?',
        icon: 'favicon-96x96.png',
        badge: 'favicon.svg'
      });
    }, 30000);
  } else if (event.data.type === 'CANCEL_INACTIVITY_TIMER') {
    clearTimeout(inactivityTimer);
  }
});
