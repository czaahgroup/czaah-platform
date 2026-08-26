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

  const tag = data.tag || 'czaah-notification'
  const isCall = tag === 'czaah-incoming-call'
  const title = data.title || (isCall ? 'Incoming call' : 'CZAAH')
  const options = {
    body: data.body || (isCall ? 'You have an incoming call' : 'You have a new notification'),
    icon: '/favicon/favicon-96x96.png',
    badge: '/favicon/favicon-96x96.png',
    tag,
    requireInteraction: isCall,
    data: { callType: data.callType || 'voice', url: data.url || '/' },
  }

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      'setAppBadge' in navigator ? navigator.setAppBadge(1).catch(() => {}) : Promise.resolve(),
    ])
  )
})

// Notification click — navigate an already-open tab to where this
// notification is about (e.g. the messages page for a new message),
// or open a new one there if none is open. Calls keep landing on a
// generic page since each app section picks up the ring from its own
// persistent Realtime subscription once loaded.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('navigate' in client) return client.navigate(url).then((c) => c.focus())
        if ('focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
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
