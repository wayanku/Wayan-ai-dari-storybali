self.addEventListener('install', (event) => {
  console.log('Service Worker: Menginstall...');
  self.skipWaiting(); // Aktifkan service worker baru segera
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker: Diaktifkan.');
    // [PERBAIKAN] Memastikan service worker segera mengambil kontrol atas halaman yang terbuka
    event.waitUntil(self.clients.claim());
});

let inactivityTimer = null;

self.addEventListener('message', (event) => {
  if (event.data.type === 'START_INACTIVITY_TIMER') {
    console.log('Service Worker: Menerima pesan untuk memulai timer.');
    // Hapus timer lama jika ada
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    
    // Mulai timer baru
    inactivityTimer = setTimeout(() => {
      console.log('Service Worker: Menampilkan notifikasi.');
      self.registration.showNotification('Wayan AI', {
        body: 'Mau udahan ngobrol sama Wayan?',
        // [PERBAIKAN] Menggunakan path relatif agar lebih portabel
        icon: 'favicon-96x96.png',
        badge: 'favicon.svg'
      });
    }, 30000); // 30 detik

  } else if (event.data.type === 'CANCEL_INACTIVITY_TIMER') {
    // Batalkan timer jika pengguna kembali
    console.log('Service Worker: Menerima pesan untuk membatalkan timer.');
    clearTimeout(inactivityTimer);
  }
});
