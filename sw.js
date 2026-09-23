/* Service worker: keeps the app working offline.
   When you change any app file, bump VERSION so phones pick up the new copy. */
const VERSION = 'v11';
const CACHE = 'workout-log-' + VERSION;
const FONTS = 'workout-log-fonts';
const ASSETS = [
  './', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'
];

// The page asks which version is running so it can show it next to the title.
self.addEventListener('message', e => {
  if(e.data === 'version' && e.ports && e.ports[0]) e.ports[0].postMessage(VERSION);
});

self.addEventListener('install', e => {
  // cache:'reload' skips the browser's own HTTP cache (GitHub Pages allows 10 minutes), so a new version never stores old files
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, {cache:'reload'})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('workout-log-') && k !== CACHE && k !== FONTS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if(!sameOrigin && !isFont) return;

  e.respondWith((async () => {
    const cache = await caches.open(sameOrigin ? CACHE : FONTS);
    const hit = await cache.match(req, {ignoreSearch: sameOrigin});
    const network = sameOrigin ? fetch(req.mode === 'navigate' ? req.url : req, {cache:'no-cache'}) : fetch(req);   // always revalidate our own files
    const refresh = network.then(res => {
      if(res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if(hit){ e.waitUntil(refresh); return hit; }          // instant from the cache, refreshed for next time
    const res = await refresh;
    if(res) return res;
    if(req.mode === 'navigate'){                            // offline and never cached: fall back to the app shell
      const shell = await cache.match('index.html');
      if(shell) return shell;
    }
    return new Response('', {status: 504, statusText: 'Offline'});
  })());
});
