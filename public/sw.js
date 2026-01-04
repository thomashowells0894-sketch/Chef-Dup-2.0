/**
 * NutriChef Service Worker
 * Provides offline functionality, caching, and background sync
 */

const CACHE_NAME = 'nutrichef-v1.0.0';
const STATIC_CACHE = 'nutrichef-static-v1.0.0';
const DYNAMIC_CACHE = 'nutrichef-dynamic-v1.0.0';
const IMAGE_CACHE = 'nutrichef-images-v1.0.0';
const API_CACHE = 'nutrichef-api-v1.0.0';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
];

// External resources to cache
const EXTERNAL_RESOURCES = [
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
  'https://cdn.tailwindcss.com',
];

// API endpoints that should be cached
const CACHEABLE_API_PATTERNS = [
  /world\.openfoodfacts\.org/,
  /image\.pollinations\.ai/,
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');

  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Cache external resources
      caches.open(DYNAMIC_CACHE).then((cache) => {
        console.log('[SW] Caching external resources');
        return Promise.all(
          EXTERNAL_RESOURCES.map((url) =>
            fetch(url)
              .then((response) => cache.put(url, response))
              .catch((err) => console.log('[SW] Failed to cache:', url, err))
          )
        );
      }),
    ]).then(() => {
      console.log('[SW] Installation complete');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== CACHE_NAME &&
            cacheName !== STATIC_CACHE &&
            cacheName !== DYNAMIC_CACHE &&
            cacheName !== IMAGE_CACHE &&
            cacheName !== API_CACHE
          ) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle API requests
  if (CACHEABLE_API_PATTERNS.some((pattern) => pattern.test(url.href))) {
    event.respondWith(networkFirstWithCache(request, API_CACHE));
    return;
  }

  // Handle image requests
  if (request.destination === 'image') {
    event.respondWith(cacheFirstWithNetwork(request, IMAGE_CACHE));
    return;
  }

  // Handle navigation requests (HTML)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Handle static assets
  if (
    url.origin === location.origin ||
    url.href.includes('fonts.googleapis.com') ||
    url.href.includes('fonts.gstatic.com') ||
    url.href.includes('cdn.tailwindcss.com') ||
    url.href.includes('esm.sh')
  ) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // Default: try network, fall back to cache
  event.respondWith(networkFirstWithCache(request, DYNAMIC_CACHE));
});

// Strategy: Cache First with Network Fallback (for images)
async function cacheFirstWithNetwork(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Update cache in background
    fetch(request)
      .then((response) => {
        if (response.ok) {
          cache.put(request, response.clone());
        }
      })
      .catch(() => {});

    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return a placeholder image for failed image requests
    return new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <rect fill="#f1f5f9" width="200" height="200"/>
        <text x="50%" y="50%" fill="#94a3b8" text-anchor="middle" dy=".3em" font-family="system-ui">Image</text>
      </svg>`,
      {
        headers: { 'Content-Type': 'image/svg+xml' },
      }
    );
  }
}

// Strategy: Network First with Cache Fallback (for API)
async function networkFirstWithCache(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Strategy: Stale While Revalidate (for static assets)
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => null);

  return cachedResponse || fetchPromise;
}

// Background Sync for offline data
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'sync-food-log') {
    event.waitUntil(syncFoodLog());
  }

  if (event.tag === 'sync-workout-log') {
    event.waitUntil(syncWorkoutLog());
  }
});

// Sync food log data when back online
async function syncFoodLog() {
  console.log('[SW] Syncing food log...');
  // Implementation would sync IndexedDB data to server
}

// Sync workout log data when back online
async function syncWorkoutLog() {
  console.log('[SW] Syncing workout log...');
  // Implementation would sync IndexedDB data to server
}

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let data = {
    title: 'NutriChef',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'nutrichef-notification',
    data: {},
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        const targetUrl = event.notification.data?.url || '/';
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Message handler for communication with main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }

  if (event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
    event.ports[0].postMessage({ success: true });
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync:', event.tag);

  if (event.tag === 'daily-reminder') {
    event.waitUntil(showDailyReminder());
  }
});

async function showDailyReminder() {
  const hour = new Date().getHours();
  let message = '';

  if (hour >= 6 && hour < 10) {
    message = "Good morning! Don't forget to log your breakfast.";
  } else if (hour >= 11 && hour < 14) {
    message = "Lunch time! Track your meal to stay on goal.";
  } else if (hour >= 17 && hour < 20) {
    message = "Time for dinner! Log your meal and check your progress.";
  }

  if (message) {
    await self.registration.showNotification('NutriChef Reminder', {
      body: message,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'daily-reminder',
    });
  }
}

console.log('[SW] Service Worker loaded');
