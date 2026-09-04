const CACHE_NAME = 'md2html-v4';
const ASSETS = [
  './',
  './index.html',
  './favicon.svg',
  './pwa-192x192.png',
  './pwa-512x512.png',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // 1. Intercept Share Target POST request
  if (e.request.method === 'POST' && (url.pathname.endsWith('index.html') || url.pathname.endsWith('/'))) {
    e.respondWith(
      (async () => {
        try {
          const formData = await e.request.formData();
          const text = formData.get('text') || '';
          const title = formData.get('title') || '';
          const urlParam = formData.get('url') || '';

          const shareData = {
            text,
            title,
            url: urlParam,
            timestamp: Date.now()
          };

          const cache = await caches.open('share-target-cache');
          await cache.put(
            new Request('https://share-target-data/'),
            new Response(JSON.stringify(shareData))
          );
        } catch (err) {
          console.error('Failed to store shared content in sw:', err);
        }

        // Redirect using 303 See Other
        return Response.redirect('./index.html?shared=true', 303);
      })()
    );
    return;
  }

  // Ignore non-GET requests
  if (e.request.method !== 'GET') return;
  
  // If it has text/title/url query params directly (legacy GET share target), let network handle it
  if (url.searchParams.has('text') || url.searchParams.has('title') || url.searchParams.has('url')) {
    return;
  }

  // Network-First for HTML/root pages to ensure users get the latest updates
  const isHtml = url.pathname.endsWith('index.html') || url.pathname === '/' || url.pathname.endsWith('/');
  if (isHtml) {
    e.respondWith(
      fetch(e.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return caches.match(e.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return caches.match('./index.html');
        });
      })
    );
    return;
  }

  // Cache-First for static assets (JS, CSS, images)
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Offline fallback
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// 2. Listen for messages from client requesting shared data
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_SHARED_DATA') {
    event.waitUntil(
      (async () => {
        try {
          const cache = await caches.open('share-target-cache');
          const response = await cache.match('https://share-target-data/');
          let data = {};
          if (response) {
            data = await response.json();
            // Delete after consumption
            await cache.delete('https://share-target-data/');
          }
          event.ports[0].postMessage({
            type: 'SHARED_DATA',
            data
          });
        } catch (err) {
          console.error('Failed to serve shared data from sw:', err);
          event.ports[0].postMessage({
            type: 'SHARED_DATA',
            data: {}
          });
        }
      })()
    );
  }
});
