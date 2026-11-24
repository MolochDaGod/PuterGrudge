/**
 * GrudgeOS service worker (P1).
 *
 * - Navigations: network first, then the cached shell, then a small offline page.
 * - Same-origin static files (/grudgeos/lib, styles, fonts, sounds): stale-while-revalidate.
 * - Brand icons from assets.grudge-studio.com/branding/: cache first.
 * - Never caches /api, /auth, /login, non-GET requests, or other origins (Puter, AI, GrudgeID).
 *
 * Bump VERSION to roll every client to a new cache.
 */
const VERSION = 'grudgeos-v3-p1';
const SHELL_CACHE = `${VERSION}-shell`;
const STATIC_CACHE = `${VERSION}-static`;
const CDN_CACHE = `${VERSION}-cdn`;

const SHELL = [
  '/',
  '/grudgeos/desktop.html',
  '/grudgeos/manifest.json',
  '/grudgeos/lib/gsh.js',
  '/grudgeos/lib/pwa-register.js',
];

const NEVER = [/^\/api\//, /^\/auth\//, /^\/login/];
const STATIC = [/^\/grudgeos\/(lib|styles|fonts|sounds)\//, /^\/grudgeos\/.*\.(css|js|woff2?|json)$/];
const CDN_HOST = 'assets.grudge-studio.com';
const CDN_PATH = /^\/branding\//;
const MAX_STATIC_ENTRIES = 200;

const OFFLINE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>GrudgeOS offline</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0a12;color:#e8e8ff;font:15px system-ui,sans-serif}
main{max-width:420px;padding:24px;text-align:center}button{margin-top:16px;padding:10px 18px;border:1px solid #00f5ff;background:transparent;color:#00f5ff;border-radius:8px;font:inherit}</style>
</head><body><main><h1>You're offline</h1><p>GrudgeOS needs a connection the first time it loads. Once it has, the desktop and your Grudge Shell files work offline.</p>
<button onclick="location.reload()">Try again</button></main></body></html>`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      Promise.all(SHELL.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => null))),
    ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k.startsWith('grudgeos-') && !k.startsWith(VERSION)).map((k) => caches.delete(k)),
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function networkFirstNavigation(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put('/', res.clone());
    }
    return res;
  } catch (_) {
    const cached = (await caches.match(request)) || (await caches.match('/')) || (await caches.match('/grudgeos/desktop.html'));
    return cached || new Response(OFFLINE_HTML, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

async function staleWhileRevalidate(event, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(event.request);
  const network = fetch(event.request).then((res) => {
    if (res.ok && (res.type === 'basic' || res.type === 'cors')) {
      cache.put(event.request, res.clone());
      trim(cacheName, MAX_STATIC_ENTRIES);
    }
    return res;
  }).catch(() => cached);
  if (cached) { event.waitUntil(network); return cached; }
  return network;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (NEVER.some((re) => re.test(url.pathname))) return;
    if (request.mode === 'navigate') { event.respondWith(networkFirstNavigation(request)); return; }
    if (STATIC.some((re) => re.test(url.pathname))) { event.respondWith(staleWhileRevalidate(event, STATIC_CACHE)); return; }
    return;
  }

  if (url.hostname === CDN_HOST && CDN_PATH.test(url.pathname)) {
    event.respondWith(cacheFirst(request, CDN_CACHE));
  }
});
