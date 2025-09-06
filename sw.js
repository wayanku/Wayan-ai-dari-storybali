const CACHE_NAME = 'wayan-ai-cache-v1';
const OFFLINE_URL = 'offline.html';

// Daftar aset inti yang akan di-cache saat instalasi
const URLS_TO_CACHE = [
  '/',
  'index.html',
  'offline.html',
  'favicon-96x96.png',
  'favicon.svg',
  'favicon.ico',
  'apple-touch-icon.png',
  'site.webmanifest',
  'https://i.postimg.cc/Wz2Gmx8X/IMG-2621.jpg', // Avatar
  'https://cdn.tailwindcss.com?plugins=forms,typography,aspect-ratio,line-clamp', // Ganti dengan URL skrip yang benar
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Menginstall...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Membuka cache dan menambahkan aset inti');
        // Cache halaman offline terlebih dahulu
        cache.add(new Request(OFFLINE_URL, {cache: 'reload'}));
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => self.skipWaiting()) // Aktifkan service worker baru segera setelah instalasi
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Diaktifkan.');
  // Hapus cache lama yang tidak digunakan lagi
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
    }).then(() => self.clients.claim()) // Ambil kontrol atas semua halaman
  );
});

self.addEventListener('fetch', (event) => {
  // Kita hanya menangani request GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Strategi Cache First
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Jika ada di cache, kembalikan dari cache
        if (cachedResponse) {
          return cachedResponse;
        }

        // Jika tidak ada di cache, coba ambil dari network
        return fetch(event.request).catch(() => {
          // Jika network gagal (offline), kembalikan halaman offline
          // Hanya untuk request navigasi (halaman HTML)
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
        });
      })
  );
});

let inactivityTimer = null;

self.addEventListener('message', (event) => {
  if (event.data.type === 'START_INACTIVITY_TIMER') {
    // Hapus timer lama jika ada
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }

    // Mulai timer baru
    inactivityTimer = setTimeout(() => {
      self.registration.showNotification('Wayan AI', {
        body: 'Mau udahan ngobrol sama Wayan?',
        icon: 'favicon-96x96.png',
        badge: 'favicon.svg'
      });
    }, 30000); // 30 detik

  } else if (event.data.type === 'CANCEL_INACTIVITY_TIMER') {
    // Batalkan timer jika pengguna kembali
    clearTimeout(inactivityTimer);
  }
});
