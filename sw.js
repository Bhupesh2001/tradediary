const CACHE = 'tradediary-v1';
const ASSETS = [
  '/tradediary/',
  '/tradediary/index.html',
  '/tradediary/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // network first for Firebase, cache first for static assets
  if (e.request.url.includes('firebaseio') || e.request.url.includes('googleapis') || e.request.url.includes('gstatic')) {
    return; // let Firebase handle its own requests
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      });
    }).catch(() => caches.match('/tradediary/index.html'))
  );
});
