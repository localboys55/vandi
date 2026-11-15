// Vandi service worker: works offline after the first visit
const VERSION = 'vandi-v7';
const CORE = ['./', './index.html', './manifest.webmanifest', './js/three.min.js', './js/data.js', './js/models.js', './js/world.js', './js/interiors.js', './js/data2.js', './js/systems.js', './js/game.js', './icons/icon-192.png', './icons/icon-512.png',
  './fonts/baloo-chettan-2-latin-600-normal.woff2','./fonts/baloo-chettan-2-latin-700-normal.woff2','./fonts/baloo-chettan-2-latin-800-normal.woff2',
  './fonts/baloo-chettan-2-malayalam-600-normal.woff2','./fonts/baloo-chettan-2-malayalam-700-normal.woff2','./fonts/baloo-chettan-2-malayalam-800-normal.woff2',
  './fonts/baloo-thambi-2-tamil-600-normal.woff2','./fonts/baloo-thambi-2-tamil-700-normal.woff2','./fonts/baloo-thambi-2-tamil-800-normal.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // network first for game files so updates arrive, cache fallback offline
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return r; }).catch(() => caches.match(req, {ignoreSearch:true}).then(r => r || caches.match('./index.html'))));
  } else if (url.host.includes('fonts.googleapis.com') || url.host.includes('fonts.gstatic.com')) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return r; }).catch(() => hit)));
  }
});
