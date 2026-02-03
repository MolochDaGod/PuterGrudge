class PuterAuthService {
  constructor() {
    this.user = null;
    this.isAuthenticated = false;
    this.isOnline = false;
    this.listeners = [];
  }

  hasPuter() {
    return typeof puter !== 'undefined';
  }

  async init() {
    if (!this.hasPuter()) {
      console.log('[PuterAuth] Puter SDK not available - offline mode');
      this.isOnline = false;
      this.isAuthenticated = false;
      this.user = null;
      this.notifyListeners();
      return { success: false, offline: true };
    }

    try {
      this.user = await puter.auth.getUser();
      this.isAuthenticated = !!this.user;
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
      return { success: false, error: 'Puter SDK not available' };
    }

    try {
      await puter.auth.signIn();
      this.user = await puter.auth.getUser();
      this.isAuthenticated = !!this.user;
      this.isOnline = true;
      console.log('[PuterAuth] Login successful:', this.user?.username);
      this.notifyListeners();
      return { success: true, user: this.user };
    } catch (e) {
      console.log('[PuterAuth] Login cancelled or failed:', e.message);
      return { success: false, error: e.message };
    }
  }

  async signup() {
    if (!this.hasPuter()) {
      return { success: false, error: 'Puter SDK not available' };
    }

    try {
      await puter.auth.signIn();
      this.user = await puter.auth.getUser();
      this.isAuthenticated = !!this.user;
      this.isOnline = true;
      console.log('[PuterAuth] Signup/Login successful:', this.user?.username);
      this.notifyListeners();
      return { success: true, user: this.user };
    } catch (e) {
      console.log('[PuterAuth] Signup cancelled or failed:', e.message);
      return { success: false, error: e.message };
    }
  }

  async logout() {
    if (!this.hasPuter()) {
      return { success: false, error: 'Puter SDK not available' };
    }

    try {
      await puter.auth.signOut();
      this.user = null;
      this.isAuthenticated = false;
      console.log('[PuterAuth] Logged out');
      this.notifyListeners();
      return { success: true };
    } catch (e) {
      console.log('[PuterAuth] Logout error:', e.message);
      return { success: false, error: e.message };
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
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(cb => cb({
      user: this.user,
      isAuthenticated: this.isAuthenticated,
      isOnline: this.isOnline
    }));
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
