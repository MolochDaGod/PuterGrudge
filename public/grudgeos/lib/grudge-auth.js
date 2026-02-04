/**
 * GrudgeAuth - Robust Puter Authentication Handler
 * Fixes sign-in issues across all contexts (Puter desktop, puter.site, standalone)
 */
(function() {
  'use strict';

  // Suppress Puter SDK errors globally
  const suppress = msg => msg && (
    msg.includes('appInstance') || msg.includes('postMessage') || 
    msg.includes('Unexpected token') || msg.includes('readdir') ||
    msg.includes('puter') && msg.includes('undefined')
  );
  
  window.addEventListener('error', e => { if (suppress(e.message)) { e.preventDefault(); return true; } }, true);
  window.addEventListener('unhandledrejection', e => { 
    if (suppress(e.reason?.message || String(e.reason))) e.preventDefault(); 
  }, true);

  const GrudgeAuth = {
    user: null,
    ready: false,
    _listeners: [],
    _initPromise: null,

    // Detect environment
    get isInPuter() { return window.parent !== window || location.hostname.endsWith('.puter.site'); },
    get isLocal() { return location.protocol === 'file:' || location.hostname === 'localhost'; },
    get hasPuter() { return typeof puter !== 'undefined'; },

    // Initialize - call this on page load
    async init() {
      if (this._initPromise) return this._initPromise;
      this._initPromise = this._doInit();
      return this._initPromise;
    },

    async _doInit() {
      // Wait for Puter SDK to load
      for (let i = 0; i < 20 && !this.hasPuter; i++) {
        await new Promise(r => setTimeout(r, 150));
      }

      if (!this.hasPuter) {
        console.log('[GrudgeAuth] Puter SDK not available - offline mode');
        this.ready = true;
        this._notify();
        return { offline: true };
      }

      // Try to get current user (without triggering sign-in)
      try {
        const user = await Promise.race([
          puter.auth.getUser(),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
        ]).catch(() => null);

        if (user && user.username && !user.username.startsWith('anon')) {
          this.user = user;
          console.log('[GrudgeAuth] Authenticated:', user.username);
        } else {
          console.log('[GrudgeAuth] Guest mode');
        }
      } catch (e) {
        console.log('[GrudgeAuth] Auth check skipped:', e.message);
      }

      this.ready = true;
      this._notify();
      return { user: this.user, ready: true };
    },

    // Sign in - handles all contexts
    async signIn() {
      if (!this.hasPuter) {
        return { error: 'Puter not available. Please visit puter.com to sign in.' };
      }

      try {
        console.log('[GrudgeAuth] Starting sign-in...');
        
        // The signIn() call opens the auth popup/dialog
        await puter.auth.signIn();
        
        // After sign-in completes, get the user
        this.user = await puter.auth.getUser();
        
        if (this.user && !this.user.username?.startsWith('anon')) {
          console.log('[GrudgeAuth] Sign-in successful:', this.user.username);
          this._notify();
          return { user: this.user };
        } else {
          return { error: 'Sign-in was cancelled or failed' };
        }
      } catch (e) {
        console.error('[GrudgeAuth] Sign-in error:', e);
        
        // Check if it's a known error type
        const msg = e.message || String(e);
        if (msg.includes('cancel') || msg.includes('closed')) {
          return { error: 'Sign-in cancelled' };
        }
        if (msg.includes('popup') || msg.includes('blocked')) {
          return { error: 'Popup blocked. Please allow popups for this site.' };
        }
        
        return { error: msg || 'Sign-in failed. Please try again.' };
      }
    },

    // Sign out
    async signOut() {
      if (this.hasPuter) {
        try { await puter.auth.signOut(); } catch {}
      }
      this.user = null;
      this._notify();
      console.log('[GrudgeAuth] Signed out');
    },

    // Getters
    getUser() { return this.user; },
    getUsername() { return this.user?.username || 'Guest'; },
    isSignedIn() { return !!this.user && !this.user.username?.startsWith('anon'); },

    // Subscribe to auth changes
    onAuthChange(callback) {
      this._listeners.push(callback);
      // Immediately call with current state
      callback({ user: this.user, ready: this.ready, isSignedIn: this.isSignedIn() });
      return () => { this._listeners = this._listeners.filter(l => l !== callback); };
    },

    _notify() {
      const state = { user: this.user, ready: this.ready, isSignedIn: this.isSignedIn() };
      this._listeners.forEach(cb => { try { cb(state); } catch {} });
    },

    // === Storage (with fallbacks) ===
    async kvGet(key, def = null) {
      const k = 'grudge_' + key;
      try { const l = localStorage.getItem(k); if (l) return JSON.parse(l); } catch {}
      if (this.hasPuter && puter.kv) {
        try {
          const v = await puter.kv.get(key);
          if (v != null) { const p = typeof v === 'string' ? JSON.parse(v) : v; try { localStorage.setItem(k, JSON.stringify(p)); } catch {} return p; }
        } catch {}
      }
      return def;
    },

    async kvSet(key, val) {
      const s = JSON.stringify(val);
      try { localStorage.setItem('grudge_' + key, s); } catch {}
      if (this.hasPuter && puter.kv) { try { await puter.kv.set(key, s); } catch {} }
      return true;
    },

    // === AI Chat ===
    async chat(prompt, opts = {}) {
      if (!this.hasPuter || !puter.ai) return '[Offline] Sign in to Puter for AI';
      try {
        const msgs = Array.isArray(prompt) ? prompt : [{ role: 'user', content: prompt }];
        if (opts.system) msgs.unshift({ role: 'system', content: opts.system });
        const r = await puter.ai.chat(msgs, { model: opts.model || 'gpt-4o-mini' });
        return typeof r === 'string' ? r : r?.message?.content || r?.content || String(r);
      } catch (e) { return `[Error] ${e.message}`; }
    }
  };

  // Export globally
  window.GrudgeAuth = GrudgeAuth;
  
  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => GrudgeAuth.init());
  } else {
    GrudgeAuth.init();
  }

  console.log('[GrudgeAuth] Loaded');
})();

