/**
 * GrudgeID - Unified Identity & Connectivity System
 * Single source of truth for auth, storage, and AI across all GrudgeOS apps
 */
class GrudgeIDService {
  constructor() {
    this.user = null;
    this.ready = false;
    this.listeners = [];
    this.isLocal = location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    this._cache = new Map();
  }

  hasPuter() {
    return typeof puter !== 'undefined';
  }

  async init() {
    // Wait for Puter SDK
    for (let i = 0; i < 15 && !this.hasPuter(); i++) {
      await new Promise(r => setTimeout(r, 200));
    }

    if (!this.hasPuter()) {
      console.warn('[GrudgeID] Offline mode - Puter SDK not available');
      this.ready = true;
      this._notify();
      return { offline: true, ready: true };
    }

    try {
      this.user = await puter.auth.getUser().catch(() => null);
      this.ready = true;
      console.log('[GrudgeID] Initialized:', this.user ? `${this.user.username}` : 'Guest');
      this._notify();
      return { user: this.user, ready: true };
    } catch (e) {
      console.warn('[GrudgeID] Init warning:', e.message);
      this.ready = true;
      this._notify();
      return { ready: true, warning: e.message };
    }
  }

  async signIn() {
    if (!this.hasPuter()) return { error: 'Puter not available' };
    try {
      await puter.auth.signIn();
      this.user = await puter.auth.getUser();
      console.log('[GrudgeID] Signed in:', this.user?.username);
      this._notify();
      return { user: this.user };
    } catch (e) {
      console.error('[GrudgeID] Sign in error:', e);
      return { error: e.message || 'Sign in cancelled' };
    }
  }

  async signOut() {
    if (this.hasPuter()) {
      try { await puter.auth.signOut(); } catch {}
    }
    this.user = null;
    this._notify();
    console.log('[GrudgeID] Signed out');
  }

  getUser() { return this.user; }
  getUsername() { return this.user?.username || 'Guest'; }
  isSignedIn() { return !!this.user && !this.user.username?.includes('anonymous'); }

  onAuthChange(callback) {
    this.listeners.push(callback);
    // Immediately call with current state
    callback({ user: this.user, ready: this.ready, isSignedIn: this.isSignedIn() });
    return () => { this.listeners = this.listeners.filter(l => l !== callback); };
  }

  _notify() {
    const state = { user: this.user, ready: this.ready, isSignedIn: this.isSignedIn() };
    this.listeners.forEach(cb => { try { cb(state); } catch (e) { console.error('[GrudgeID] Listener error:', e); } });
  }

  // === Key-Value Storage with localStorage fallback ===
  async kvGet(key, defaultValue = null) {
    const fullKey = 'grudge:' + key;
    
    // Check cache first
    if (this._cache.has(fullKey)) {
      return this._cache.get(fullKey);
    }

    // Try Puter KV
    if (this.hasPuter() && puter.kv) {
      try {
        const val = await puter.kv.get(fullKey);
        if (val != null) {
          const parsed = typeof val === 'string' ? JSON.parse(val) : val;
          this._cache.set(fullKey, parsed);
          return parsed;
        }
      } catch (e) {
        console.warn('[GrudgeID] KV get fallback:', e.message);
      }
    }

    // Fallback to localStorage
    const local = localStorage.getItem(fullKey);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        this._cache.set(fullKey, parsed);
        return parsed;
      } catch { return local; }
    }
    return defaultValue;
  }

  async kvSet(key, value) {
    const fullKey = 'grudge:' + key;
    const serialized = JSON.stringify(value);
    
    // Update cache and localStorage immediately
    this._cache.set(fullKey, value);
    localStorage.setItem(fullKey, serialized);

    // Sync to Puter KV
    if (this.hasPuter() && puter.kv) {
      try { await puter.kv.set(fullKey, serialized); } 
      catch (e) { console.warn('[GrudgeID] KV set warning:', e.message); }
    }
    return true;
  }

  async kvDelete(key) {
    const fullKey = 'grudge:' + key;
    this._cache.delete(fullKey);
    localStorage.removeItem(fullKey);
    if (this.hasPuter() && puter.kv) {
      try { await puter.kv.del(fullKey); } catch {}
    }
    return true;
  }

  // === AI Chat ===
  async chat(prompt, options = {}) {
    if (!this.hasPuter() || !puter.ai) {
      return '[Offline] Connect to Puter for AI features.';
    }
    try {
      const model = options.model || 'gpt-4o-mini';
      const messages = Array.isArray(prompt) ? prompt : [{ role: 'user', content: prompt }];
      if (options.system) messages.unshift({ role: 'system', content: options.system });
      const resp = await puter.ai.chat(messages, { model });
      return typeof resp === 'string' ? resp : resp?.message?.content || resp?.content || String(resp);
    } catch (e) {
      console.error('[GrudgeID] AI error:', e);
      return `[AI Error] ${e.message}`;
    }
  }
}

// Create singleton and export
window.GrudgeID = window.GrudgeID || new GrudgeIDService();
console.log('[GrudgeID] Service loaded');

