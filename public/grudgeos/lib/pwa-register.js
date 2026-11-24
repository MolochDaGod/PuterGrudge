/**
 * GrudgeOS PWA registration (P1).
 * Registers the service worker at site scope, offers "Install app" where the
 * browser supports it, shows an Add to Home Screen hint on iPhone/iPad, and
 * offers a reload when a new version is ready. Text-only UI, no images.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || window.__grudgePwa) return;
  window.__grudgePwa = true;

  const DISMISS_KEY = 'grudgeos.pwa.hintDismissed';
  const isStandalone = () =>
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function pill(text, actionText, onAction) {
    const bar = document.createElement('div');
    bar.setAttribute('role', 'status');
    bar.style.cssText = 'position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom));transform:translateX(-50%);' +
      'z-index:2147483000;display:flex;gap:10px;align-items:center;padding:10px 14px;border-radius:12px;' +
      'background:rgba(10,10,18,.96);border:1px solid rgba(0,245,255,.35);color:#e8e8ff;font:13px system-ui,sans-serif;' +
      'box-shadow:0 8px 30px rgba(0,0,0,.5);max-width:calc(100vw - 32px)';
    const label = document.createElement('span');
    label.textContent = text;
    bar.appendChild(label);
    if (actionText) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = actionText;
      btn.style.cssText = 'padding:6px 12px;border-radius:8px;border:1px solid #00f5ff;background:transparent;color:#00f5ff;font:inherit;cursor:pointer';
      btn.addEventListener('click', () => { onAction(); bar.remove(); });
      bar.appendChild(btn);
    }
    const close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Dismiss');
    close.textContent = '×';
    close.style.cssText = 'border:0;background:transparent;color:#8888aa;font-size:18px;cursor:pointer';
    close.addEventListener('click', () => { try { localStorage.setItem(DISMISS_KEY, '1'); } catch (_) {} bar.remove(); });
    bar.appendChild(close);
    document.body.appendChild(bar);
    return bar;
  }

  function dismissed() { try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch (_) { return false; } }

  // Install prompt (Chrome, Edge, Android, desktop)
  let deferred = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    if (!isStandalone() && !dismissed()) {
      pill('Install GrudgeOS as an app', 'Install', async () => {
        deferred.prompt();
        try { await deferred.userChoice; } catch (_) {}
        deferred = null;
      });
    }
  });
  window.GrudgeOSInstall = () => (deferred ? deferred.prompt() : null);

  // iOS has no install prompt: show the Share → Add to Home Screen hint once.
  window.addEventListener('load', () => {
    if (isIos() && !isStandalone() && !dismissed()) {
      setTimeout(() => pill('Install: tap Share, then "Add to Home Screen"'), 2500);
    }
  });

  // Service worker at site scope ("/"); falls back to /grudgeos/ if the
  // Service-Worker-Allowed header is missing.
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', async () => {
    let reg;
    try {
      reg = await navigator.serviceWorker.register('/grudgeos/sw.js', { scope: '/' });
    } catch (_) {
      try { reg = await navigator.serviceWorker.register('/grudgeos/sw.js', { scope: '/grudgeos/' }); } catch (e) { return; }
    }
    const offerUpdate = (worker) => {
      pill('A new GrudgeOS version is ready', 'Reload', () => worker.postMessage({ type: 'SKIP_WAITING' }));
    };
    if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(nw);
      });
    });
    // Reload only when an existing controller is replaced (an update the
    // user accepted), not on the very first install.
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded || !hadController) return;
      reloaded = true;
      window.location.reload();
    });
  });
})();

// Manifest shortcuts open an app: /?open=terminal, /?open=grudchat, /?open=fleethub
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  let id = null;
  try { id = new URLSearchParams(window.location.search).get('open'); } catch (_) { return; }
  if (!id || !/^[a-z0-9-]{1,40}$/i.test(id)) return;
  window.addEventListener('load', () => {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (typeof window.openApp === 'function') {
        clearInterval(timer);
        window.openApp(id.toLowerCase());
      } else if (tries > 40) {
        clearInterval(timer);
      }
    }, 250);
  });
})();
