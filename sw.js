// ── Cache version — bump CACHE_VERSION on every deploy ───────────────────
// Format: YYYYMMDDNN (date + sequence). Change this = instant cache bust.
const CACHE_VERSION = '2026032202';
const CACHE_NAME = 'tradediary-' + CACHE_VERSION;

const STATIC_ASSETS = [
  '/tradediary/',
  '/tradediary/index.html',
  '/tradediary/manifest.json',
];

// ── INSTALL ───────────────────────────────────────────────────────────────
self.addEventListener('install', e => {
  self.skipWaiting(); // activate immediately, don't wait for old tabs to close
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)).catch(() => {})
  );
});

// ── ACTIVATE ──────────────────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim(); // take control of all open tabs immediately
});

// ── FETCH ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Never intercept — let these go straight to network
  if (
    url.includes('firebaseio.com') ||
    url.includes('googleapis.com') ||
    url.includes('gstatic.com') ||
    url.includes('finance.yahoo.com') ||
    url.includes('identitytoolkit') ||
    url.includes('securetoken') ||
    url.includes('fonts.googleapis') ||
    url.includes('cdnjs.cloudflare.com')
  ) return;

  // HTML pages → Network First (always get fresh index.html from GitHub)
  if (e.request.mode === 'navigate' || url.endsWith('.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request)) // offline fallback
    );
    return;
  }

  // Everything else → Cache First, update in background
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      });
      return cached || fetchPromise;
    }).catch(() => caches.match('/tradediary/index.html'))
  );
});