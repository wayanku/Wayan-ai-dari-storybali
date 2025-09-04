self.addEventListener('install', (event) => {
  console.log('Service Worker: Menginstall...');
  self.skipWaiting(); // Aktifkan service worker baru segera
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Diaktifkan.');
  return self.clients.claim(); // Ambil kontrol atas halaman yang terbuka
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

