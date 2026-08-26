const CACHE_NAME = 'czaah-v1'

// Assets to cache for offline
const PRECACHE_URLS = [
  '/',
  '/favicon/favicon.svg',
  '/favicon/favicon-96x96.png',
  '/markhor-mark-fixed.svg',
]

// Install — cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  )
  self.clients.claim()
})

// Push — incoming call notification, reaches the user even without a
// focused/open tab (as long as the browser/OS allows background push).
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }

  const title = data.title || 'Incoming call'
  const options = {
    body: data.body || 'You have an incoming call',
    icon: '/favicon/favicon-96x96.png',
    badge: '/favicon/favicon-96x96.png',
    tag: 'czaah-incoming-call',
    requireInteraction: true,
    data: { callType: data.callType || 'voice' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Notification click — focus an already-open tab if there is one, otherwise
// open a new one, landing wherever calls actually ring (each app section
// picks up the ring from its own persistent Realtime subscription once
// loaded, so a generic landing page is enough here).
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow('/')
    })
  )
})

// Fetch — network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return

  // Skip API calls and Supabase requests — always go to network
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for static assets
        if (response.ok && (url.pathname.match(/\.(js|css|png|jpg|svg|woff2?)$/) || url.pathname === '/')) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})
