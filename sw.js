// Cache-first so the page also works offline after one visit.
const V = 'lb0811-v3';
const ASSETS = ['./', 'index.html', 'style.css', 'app.js', 'fonts/fonts.css',
  'fonts/DMSans-normal-400_700.woff2', 'fonts/InstrumentSerif-italic-400.woff2', 'fonts/InstrumentSerif-normal-400.woff2',
  'fonts/SpaceMono-normal-400.woff2', 'fonts/SpaceMono-normal-700.woff2',
  'img/lowlands.webp', 'img/lowlands-map.png', 'img/lift.webp', 'img/lift-map.png', 'img/safari.webp', 'img/safari-map.png',
  'img/kenya.webp', 'img/kenya-map.png', 'img/kenya-edit.webp', 'img/kenya-reveal.png', 'img/lamu.webp', 'img/lamu-map.png',
  'img/frankrijk.webp', 'img/frankrijk-map.png', 'img/griekenland.webp', 'img/griekenland-map.png',
  'img/parijs.webp', 'img/parijs-map.png', 'img/samen-cutout.webp',
  'audio/party.m4a', 'audio/reveal.m4a', 'audio/lift.m4a'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});
