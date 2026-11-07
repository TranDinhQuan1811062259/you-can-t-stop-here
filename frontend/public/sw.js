/**
 * =========================================================================
 * 📲 FREEDOM PWA SERVICE WORKER
 * =========================================================================
 * - Bộ nhớ đệm ngoại tuyến (Offline Caching) cho Smartphone, Tablet và Desktop
 * - Chiến lược:
 *    + HTML Navigation: Network-First với fallback ngoại tuyến
 *    + Static Assets (JS, CSS, Ảnh, Font): Stale-While-Revalidate
 *    + API Data: Network-First với cached fallback
 * - Hỗ trợ Push Notification & Background Sync
 */

const CACHE_NAME = 'freedom-shell-v1';
const DATA_CACHE_NAME = 'freedom-data-v1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512.svg',
  '/favicon.svg',
  '/apple-touch-icon.png',
];

// Cài đặt Service Worker và nạp sẵn Shell cơ bản
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Lỗi precache PWA:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Kích hoạt và dọn sạch Cache phiên bản cũ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
            return caches.delete(key);
          }
          return null;
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Xử lý các yêu cầu mạng (Fetch Event)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bỏ qua các scheme không phải HTTP/HTTPS (ví dụ chrome-extension://)
  if (!url.protocol.startsWith('http')) return;

  // 1. Đối với API: Network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200 && request.method === 'GET') {
            const respClone = response.clone();
            caches.open(DATA_CACHE_NAME).then((cache) => cache.put(request, respClone));
          }
          return response;
        })
        .catch(() => {
          // Trả về dữ liệu đệm từ lần trước nếu offline
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            return new Response(
              JSON.stringify({
                success: false,
                offline: true,
                message: 'Bạn đang không có kết nối Internet. Đang hiển thị bản lưu trên máy.',
              }),
              { headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }

  // 2. Đối với Navigation (khi người dùng đổi trang HTML): Network First với fallback index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // 3. Đối với Static Assets (JS, CSS, Fonts, Images): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && request.method === 'GET') {
            const respClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, respClone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// Hỗ trợ Push Notification khi có thông báo mới
self.addEventListener('push', (event) => {
  let data = { title: 'Freedom App', body: 'Bạn có thông báo mới từ cộng đồng!' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return null;
    })
  );
});
