class PuterAuthService {
  constructor() {
    this.user = null;
    this.isAuthenticated = false;
    this.isOnline = false;
    this.listeners = [];
    this._initPromise = null;
  }

  hasPuter() {
    return typeof puter !== 'undefined';
  }

  // Wait for Puter SDK with timeout
  async _waitForPuter(timeout = 5000) {
    const start = Date.now();
    while (!this.hasPuter() && Date.now() - start < timeout) {
      await new Promise(r => setTimeout(r, 100));
    }
    return this.hasPuter();
  }

  async init() {
    if (this._initPromise) return this._initPromise;
    this._initPromise = this._doInit();
    return this._initPromise;
  }

  async _doInit() {
    const puterReady = await this._waitForPuter();

    if (!puterReady) {
      console.log('[PuterAuth] Puter SDK not available - offline mode');
      this.isOnline = false;
      this.isAuthenticated = false;
      this.user = null;
      this.notifyListeners();
      return { success: false, offline: true };
    }

    try {
      // Get user with timeout to avoid hanging
      this.user = await Promise.race([
        puter.auth.getUser(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
      ]).catch(() => null);

      // Check if it's a real user (not anonymous)
      if (this.user?.username?.startsWith('anon')) {
        this.user = null;
      }

      this.isAuthenticated = !!this.user && !this.user.username?.startsWith('anon');
      this.isOnline = true;
      console.log('[PuterAuth] Initialized:', this.isAuthenticated ? `Logged in as ${this.user.username}` : 'Guest mode');
      this.notifyListeners();
      return { success: true, user: this.user, authenticated: this.isAuthenticated };
    } catch (e) {
      console.log('[PuterAuth] Init error (guest mode):', e.message);
      this.isOnline = true;
      this.isAuthenticated = false;
      this.notifyListeners();
      return { success: true, authenticated: false };
    }
  }

  async login() {
    if (!this.hasPuter()) {
      return { success: false, error: 'Puter not available. Please visit puter.com' };
    }

    try {
      console.log('[PuterAuth] Starting sign-in...');
      await puter.auth.signIn();
      this.user = await puter.auth.getUser();

      // Check if sign-in was successful (not anonymous)
      if (this.user?.username?.startsWith('anon')) {
        this.user = null;
        this.isAuthenticated = false;
        console.log('[PuterAuth] Sign-in cancelled');
        return { success: false, error: 'Sign-in was cancelled' };
      }

      this.isAuthenticated = !!this.user;
      this.isOnline = true;
      console.log('[PuterAuth] Login successful:', this.user?.username);
      this.notifyListeners();
      return { success: true, user: this.user };
    } catch (e) {
      console.log('[PuterAuth] Login error:', e.message);
      const msg = e.message || String(e);

      // Provide specific error messages
      if (msg.includes('cancel') || msg.includes('closed')) {
        return { success: false, error: 'Sign-in cancelled' };
      }
      if (msg.includes('popup') || msg.includes('blocked')) {
        return { success: false, error: 'Popup blocked! Please allow popups for this site.' };
      }

      return { success: false, error: msg || 'Sign-in failed. Please try again.' };
    }
  }

  async signup() {
    // Puter uses the same flow for signup and login
    return this.login();
  }

  async logout() {
    try {
      if (this.hasPuter()) {
        await puter.auth.signOut().catch(() => {});
      }
      this.user = null;
      this.isAuthenticated = false;
      console.log('[PuterAuth] Logged out');
      this.notifyListeners();
      return { success: true };
    } catch (e) {
      console.log('[PuterAuth] Logout error:', e.message);
      // Still clear local state even if signOut fails
      this.user = null;
      this.isAuthenticated = false;
      this.notifyListeners();
      return { success: true };
    }
  }

  getUser() {
    return this.user;
  }

  getUsername() {
    return this.user?.username || 'Guest';
  }

  onAuthChange(callback) {
    this.listeners.push(callback);
    // Immediately call with current state
    callback({
      user: this.user,
      isAuthenticated: this.isAuthenticated,
      isOnline: this.isOnline
    });
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners() {
    const state = {
      user: this.user,
      isAuthenticated: this.isAuthenticated,
      isOnline: this.isOnline
    };
    this.listeners.forEach(cb => {
      try { cb(state); } catch (e) { console.error('[PuterAuth] Listener error:', e); }
    });
  }
}

class PuterDeployService {
  constructor() {
    this.deployments = [];
  }

  hasPuter() {
    return typeof puter !== 'undefined' && puter.hosting;
  }

  async deploy(appName, files) {
    if (!this.hasPuter()) {
      return { success: false, error: 'Puter hosting not available' };
    }

    try {
      const subdomain = appName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      const result = await puter.hosting.create(subdomain, files);
      
      const deployment = {
        id: Date.now().toString(),
        appName,
        subdomain,
        url: `https://${subdomain}.puter.site`,
        timestamp: new Date().toISOString(),
        status: 'deployed'
      };
      
      this.deployments.push(deployment);
      await this.saveDeployments();
      
      console.log('[PuterDeploy] Deployed:', deployment.url);
      return { success: true, deployment };
    } catch (e) {
      console.log('[PuterDeploy] Deploy error:', e.message);
      return { success: false, error: e.message };
    }
  }

  async deployFromDir(appName, dirPath) {
    if (!this.hasPuter()) {
      return { success: false, error: 'Puter hosting not available' };
    }

    try {
      const subdomain = appName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      const result = await puter.hosting.create(subdomain, dirPath);
      
      const deployment = {
        id: Date.now().toString(),
        appName,
        subdomain,
        url: `https://${subdomain}.puter.site`,
        timestamp: new Date().toISOString(),
        status: 'deployed'
      };
      
      this.deployments.push(deployment);
      await this.saveDeployments();
      
      console.log('[PuterDeploy] Deployed from directory:', deployment.url);
      return { success: true, deployment };
    } catch (e) {
      console.log('[PuterDeploy] Deploy error:', e.message);
      return { success: false, error: e.message };
    }
  }

  async listDeployments() {
    await this.loadDeployments();
    return this.deployments;
  }

  async deleteDeployment(subdomain) {
    if (!this.hasPuter()) {
      return { success: false, error: 'Puter hosting not available' };
    }

    try {
      await puter.hosting.delete(subdomain);
      this.deployments = this.deployments.filter(d => d.subdomain !== subdomain);
      await this.saveDeployments();
      console.log('[PuterDeploy] Deleted:', subdomain);
      return { success: true };
    } catch (e) {
      console.log('[PuterDeploy] Delete error:', e.message);
      return { success: false, error: e.message };
    }
  }

  async saveDeployments() {
    if (typeof puter !== 'undefined' && puter.kv) {
      try {
        await puter.kv.set('grudgeos_deployments', JSON.stringify(this.deployments));
      } catch (e) {
        console.log('[PuterDeploy] Save error:', e.message);
      }
    }
  }

  async loadDeployments() {
    if (typeof puter !== 'undefined' && puter.kv) {
      try {
        const saved = await puter.kv.get('grudgeos_deployments');
        if (saved) {
          this.deployments = JSON.parse(saved);
        }
      } catch (e) {
        console.log('[PuterDeploy] Load error:', e.message);
      }
    }
    return this.deployments;
  }
}

window.PuterAuth = new PuterAuthService();
window.PuterDeploy = new PuterDeployService();

console.log('[PuterAuth] Service loaded');
