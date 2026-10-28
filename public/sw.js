const STATIC = 'aa-static-v2'
const PAGES = 'aa-pages-v2'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => (k.startsWith('aa-static') || k.startsWith('aa-pages')) && k !== STATIC && k !== PAGES).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  )
})

// Offline: app files are kept after the first visit, and the student's pages open from the last copy when there is no data.
self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icon') || url.pathname === '/mascot.svg') {
    event.respondWith(
      caches.open(STATIC).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res })))
    )
    return
  }
  if (req.mode === 'navigate' && url.origin === self.location.origin && !url.pathname.startsWith('/api') && !url.pathname.startsWith('/auth')) {
    event.respondWith(
      fetch(req).then((res) => { if (res.ok && !res.redirected) caches.open(PAGES).then((c) => c.put(req, res.clone())); return res })
        .catch(async () => {
          const c = await caches.open(PAGES)
          const opts = { ignoreSearch: true, ignoreVary: true }
          return (await c.match(req, { ignoreVary: true })) || (await c.match(req, opts)) || (await c.match('/portal', opts)) || (await c.match('/partner', opts)) || (await c.match('/tutor', opts)) || new Response('<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><body style="font-family:sans-serif;text-align:center;padding:48px"><h2>You are offline</h2><p>Open the app once with data, then your pages and files work offline.</p>', { headers: { 'Content-Type': 'text/html' } })
        })
    )
  }
})

self.addEventListener('push', (event) => {
  let data = { title: 'Aid & Ace', body: '', url: '/' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          if ('navigate' in c) c.navigate(url)
          return c.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})


// The page tells us which files it loaded, so the very first visit is saved too (not only later ones).
self.addEventListener('message', (event) => {
  const d = event.data || {}
  if (d.type !== 'precache') return
  event.waitUntil((async () => {
    const st = await caches.open(STATIC)
    await Promise.all((d.urls || []).map((u) => st.match(u).then((hit) => hit || fetch(u).then((r) => { if (r.ok) return st.put(u, r) }).catch(() => {}))))
    if (d.page) {
      try { const r = await fetch(d.page, { credentials: 'same-origin' }); if (r.ok && !r.redirected) await (await caches.open(PAGES)).put(d.page, r) } catch (e) {}
    }
  })())
})
