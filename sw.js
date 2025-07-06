const CACHE_NAME = 'japanese-analyzer-cache-v2';
const APP_SHELL_URL = './'; // The main URL for the app shell

const urlsToCache = [
  APP_SHELL_URL,
  './index.html',
  './manifest.json',
  './icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache and caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Strategy: Network-first for navigation requests (the app shell).
  // This ensures users get the latest version of the app when online.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // If fetch is successful, cache the new response
          return caches.open(CACHE_NAME).then(cache => {
            // Use the original request URL as the key.
            cache.put(event.request.url, response.clone());
            return response;
          });
        })
        .catch(() => {
          // If network fails, serve the app shell from the cache.
          // Fallback to the base URL if the specific URL isn't cached.
          return caches.match(event.request.url) || caches.match(APP_SHELL_URL);
        })
    );
    return;
  }
  
  // Strategy: Cache-first for all other assets (JS, CSS, fonts, etc.).
  // These are fingerprinted by Vite, so new versions will have new URLs.
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Not in cache, fetch from network, then cache it.
        return fetch(event.request).then(
          (response) => {
            if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});