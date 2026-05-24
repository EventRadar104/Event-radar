const CACHE = 'event-radar-v1'

// App shell — pages and assets that should work offline
const SHELL = ['/', '/search', '/saved', '/trip', '/manifest.json']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL))
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  // Only handle GET requests for same-origin or CDN assets
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') return

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached
      return fetch(event.request).then(response => {
        // Cache successful navigation and static asset responses
        if (
          response.ok &&
          (event.request.mode === 'navigate' ||
           url.pathname.startsWith('/_next/static/'))
        ) {
          const clone = response.clone()
          caches.open(CACHE).then(cache => cache.put(event.request, clone))
        }
        return response
      })
    })
  )
})
