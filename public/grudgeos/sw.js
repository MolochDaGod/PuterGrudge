/**
 * GrudgeOS Service Worker - Caching and Background Sync
 * Provides offline support, asset caching, and background request handling
 */

const CACHE_NAME = 'grudgeos-v2';
const STATIC_CACHE = 'grudgeos-static-v2';
const API_CACHE = 'grudgeos-api-v2';

const STATIC_ASSETS = [
  '/grudgeos/desktop.html',
  '/grudgeos/agent-swarm.html',
  '/grudgeos/styles/common.css',
  '/grudgeos/lib/window-manager.js',
  '/grudgeos/lib/event-bus.js',
  '/grudgeos/lib/icon-generator.js',
  '/grudgeos/lib/agent-registry.js',
  '/grudgeos/assets/agents/cloudpilot.png',
  '/grudgeos/assets/agents/cloudpilot-alt.png',
  '/grudgeos/assets/favicon.png',
  '/favicon.png'
];

const API_ROUTES = [
  '/api/v1/execute',
  '/api/v1/pods',
  '/api/v1/executions',
  '/api/agents',
  '/api/extensions'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing GrudgeOS Service Worker v2');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS.filter(url => {
        return !url.includes('undefined');
      })).catch(err => {
        console.warn('[SW] Some assets failed to cache:', err);
      });
    })
  );
  
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating GrudgeOS Service Worker v2');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('grudgeos-') && !name.endsWith('-v2'))
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  if (event.request.method !== 'GET') {
    if (url.pathname.startsWith('/api/')) {
      event.respondWith(handleApiMutation(event.request));
    }
    return;
  }
  
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }
  
  if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticAsset(event.request));
    return;
  }
  
  event.respondWith(handleDynamicRequest(event.request));
});

function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ico'];
  return staticExtensions.some(ext => pathname.endsWith(ext)) || 
         pathname.includes('/assets/') ||
         pathname.includes('/lib/');
}

async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
    }).catch(() => {});
    
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.warn('[SW] Failed to fetch static asset:', request.url);
    return new Response('Asset not available offline', { status: 503 });
  }
}

async function handleApiRequest(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cache = await caches.open(API_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Returning cached API response:', request.url);
      return cachedResponse;
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Network unavailable',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleApiMutation(request) {
  try {
    return await fetch(request);
  } catch (error) {
    await queueBackgroundSync(request);
    
    return new Response(JSON.stringify({
      success: true,
      queued: true,
      message: 'Request queued for background sync'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleDynamicRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const response = await fetch(request);
    
    if (response.ok && request.url.includes('/grudgeos/')) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    if (request.destination === 'document') {
      const fallback = await cache.match('/grudgeos/desktop.html');
      if (fallback) return fallback;
    }
    
    return new Response('Content not available offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

async function queueBackgroundSync(request) {
  try {
    const body = await request.clone().text();
    const syncItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: body,
      timestamp: Date.now()
    };
    
    const db = await openSyncDB();
    const tx = db.transaction('queue', 'readwrite');
    tx.objectStore('queue').add(syncItem);
    
    if ('sync' in self.registration) {
      await self.registration.sync.register('grudgeos-sync');
    }
  } catch (e) {
    console.warn('[SW] Failed to queue sync:', e);
  }
}

function openSyncDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('grudgeos-sync', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id' });
      }
    };
  });
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'grudgeos-sync') {
    event.waitUntil(processSyncQueue());
  }
});

async function processSyncQueue() {
  try {
    const db = await openSyncDB();
    const tx = db.transaction('queue', 'readwrite');
    const store = tx.objectStore('queue');
    const items = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    for (const item of items) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body
        });
        
        if (response.ok) {
          store.delete(item.id);
          notifyClients({
            type: 'sync-complete',
            id: item.id,
            success: true
          });
        }
      } catch (e) {
        console.warn('[SW] Sync failed for item:', item.id);
      }
    }
  } catch (e) {
    console.error('[SW] Sync queue processing failed:', e);
  }
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => {
    client.postMessage(message);
  });
}

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CLEAR_CACHE':
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.startsWith('grudgeos-')) {
            caches.delete(name);
          }
        });
      });
      break;
      
    case 'CACHE_ASSETS':
      if (payload && Array.isArray(payload)) {
        caches.open(STATIC_CACHE).then(cache => {
          cache.addAll(payload);
        });
      }
      break;
  }
});

console.log('[SW] GrudgeOS Service Worker v2 loaded');
