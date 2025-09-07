const CACHE_NAME = 'wayan-ai-cache-v3'; // [PENTING] Naikkan versi cache lagi
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
  'https://i.postimg.cc/Wz2Gmx8X/IMG-2621.jpg', // Avatar,
  'https://cdn.tailwindcss.com', // This is the correct URL as used in index.html
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
        const cacheOffline = cache.add(new Request(OFFLINE_URL, {cache: 'reload'}));
        // Add all core assets
        const cacheCoreAssets = cache.addAll(URLS_TO_CACHE);
        return Promise.all([cacheOffline, cacheCoreAssets]);
      })
      .then(() => self.skipWaiting()) // Aktifkan service worker baru segera setelah instalasi
      .catch(error => {
        console.error('Gagal melakukan pre-caching saat instalasi:', error);
      })
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
  const url = new URL(event.request.url);

  // [PERBAIKAN] Abaikan request ke API Google/Firebase agar tidak di-cache.
  // Biarkan request ini langsung ke network.
  if (url.hostname.includes('google.com') || url.hostname.includes('gstatic.com') || url.hostname.includes('firebaseapp.com') || url.hostname.includes('firebasestorage.googleapis.com')) {
    return;
  }

  // [PERBAIKAN] Hanya tangani request GET untuk strategi caching.
  // Ini mencegah masalah dengan request POST, dll.
  if (event.request.method === 'GET') {
    // [DIUBAH] Strategi Network First untuk halaman utama (index.html)
    // Ini akan selalu mencoba mengambil dari jaringan terlebih dahulu untuk memastikan konten selalu terbaru.
    // Jika jaringan gagal (offline), baru akan mengambil dari cache.
    if (url.pathname === '/' || url.pathname === '/index.html') {
      event.respondWith(
        fetch(event.request)
          .then(networkResponse => {
            // Jika berhasil, simpan salinan baru ke cache untuk kunjungan offline berikutnya.
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
            return networkResponse;
          })
          .catch(() => {
            return caches.match(event.request).then(cachedResponse => cachedResponse || caches.match(OFFLINE_URL));
          })
      );
    } else if (event.request.mode === 'navigate') {
      // Untuk navigasi ke halaman lain (misal: /profile), gunakan Network first.
      event.respondWith(
        fetch(event.request).catch(() => caches.match(OFFLINE_URL))
      );
    }
    else {
      // Untuk aset lain (CSS, JS, gambar), gunakan Cache First, fallback ke Network.
      // Ini adalah strategi terbaik untuk aset yang tidak sering berubah.
      event.respondWith(
        caches.match(event.request)
          .then((cachedResponse) => {
            return cachedResponse || fetch(event.request).then(networkResponse => {
              // Simpan aset baru ke cache saat berhasil diambil dari network
              return caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, networkResponse.clone());
                return networkResponse;
              });
            }).catch(() => {
              // Jika aset adalah gambar dan gagal diambil, kita bisa mengembalikan gambar placeholder
              if (event.request.destination === 'image') {
                // Anda bisa membuat file 'placeholder.svg' dan menambahkannya ke URLS_TO_CACHE
                // return caches.match('/placeholder.svg'); 
              }
              return new Response('', { status: 503, statusText: 'Service Unavailable' });
            })
          })
      );
    }
  }
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

// [BARU] Listener untuk pesan 'SKIP_WAITING' dari klien
// Ini memungkinkan kita untuk secara manual memaksa service worker baru untuk aktif.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker: Menerima pesan SKIP_WAITING, mengaktifkan service worker baru.');
    self.skipWaiting();
  }
});
