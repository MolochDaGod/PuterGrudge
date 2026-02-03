/**
 * Deployment Service
 * One-click deployment to *.puter.site via Puter Hosting API
 */

class DeployService {
  constructor() {
    this.deployments = new Map();
    this.listeners = new Set();
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    await this._waitForPuterService();
    await this.loadDeployments();
    
    this.initialized = true;
    console.log('[DeployService] Initialized');
    return true;
  }

  async _waitForPuterService(timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (window.PuterService?.ready) return true;
      await new Promise(r => setTimeout(r, 100));
    }
    return false;
  }

  /**
   * Load saved deployments from storage
   */
  async loadDeployments() {
    try {
      const saved = await window.PuterService?.kvGet('deploy_history', []) || [];
      saved.forEach(d => this.deployments.set(d.subdomain, d));
    } catch (e) {
      console.error('[DeployService] Load deployments error:', e);
    }
  }

  /**
   * Save deployments to storage
   */
  async saveDeployments() {
    try {
      await window.PuterService?.kvSet('deploy_history', Array.from(this.deployments.values()));
    } catch (e) {
      console.error('[DeployService] Save deployments error:', e);
    }
  }

  /**
   * Deploy to puter.site
   * @param {string} subdomain - The subdomain (e.g., 'my-app' -> my-app.puter.site)
   * @param {string} sourcePath - Path to files in Puter filesystem (or base64 content)
   * @param {object} options - Additional options
   */
  async deploy(subdomain, sourcePath, options = {}) {
    if (!window.PuterService?.isOnline()) {
      throw new Error('Deployment unavailable in offline mode');
    }

    const cleanSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    this._notify('deployStart', { subdomain: cleanSubdomain });
    
    try {
      // Create index.html if sourcePath is HTML content
      let deployPath = sourcePath;
      
      if (options.htmlContent) {
        // Write HTML content to a temp file in Puter FS first
        const tempPath = `/tmp/deploy_${cleanSubdomain}/index.html`;
        await window.PuterService.fsMkdir(`/tmp/deploy_${cleanSubdomain}`);
        await window.PuterService.fsWrite(tempPath, options.htmlContent);
        deployPath = `/tmp/deploy_${cleanSubdomain}`;
      }

      // Deploy using Puter hosting
      const result = await window.PuterService.deploy(cleanSubdomain, deployPath);
      
      const deployment = {
        subdomain: cleanSubdomain,
        url: `https://${cleanSubdomain}.puter.site`,
        deployedAt: new Date().toISOString(),
        sourcePath: deployPath,
        status: 'active',
        ...result
      };

      this.deployments.set(cleanSubdomain, deployment);
      await this.saveDeployments();
      
      this._notify('deployComplete', deployment);
      
      return deployment;
    } catch (e) {
      this._notify('deployError', { subdomain: cleanSubdomain, error: e.message });
      throw e;
    }
  }

  /**
   * Deploy static HTML/CSS/JS directly
   */
  async deployStatic(subdomain, files) {
    if (!window.PuterService?.isOnline()) {
      throw new Error('Deployment unavailable in offline mode');
    }

    const cleanSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const deployDir = `/tmp/deploy_${cleanSubdomain}_${Date.now()}`;
    
    try {
      // Create deploy directory
      await window.PuterService.fsMkdir(deployDir);
      
      // Write all files
      for (const [filename, content] of Object.entries(files)) {
        await window.PuterService.fsWrite(`${deployDir}/${filename}`, content);
      }
      
      // Deploy
      return await this.deploy(cleanSubdomain, deployDir);
    } catch (e) {
      throw new Error(`Static deploy failed: ${e.message}`);
    }
  }

  /**
   * Quick deploy a single HTML page
   */
  async quickDeploy(subdomain, htmlContent) {
    return this.deployStatic(subdomain, { 'index.html': htmlContent });
  }

  /**
   * Deploy from a template
   */
  async deployTemplate(subdomain, templateName) {
    const templates = {
      'hello': `<!DOCTYPE html>
<html>
<head><title>Hello World</title></head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#1a1a2e;color:#fff;">
<h1>Hello from CloudPilot AI Studio!</h1>
</body>
</html>`,
      'landing': `<!DOCTYPE html>
<html>
<head>
<title>Landing Page</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16161d 100%); min-height: 100vh; color: #fff; }
.hero { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; padding: 2rem; }
h1 { font-size: 3rem; margin-bottom: 1rem; background: linear-gradient(90deg, #8b5cf6, #00f5ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
p { font-size: 1.25rem; color: #a0a0c0; max-width: 600px; margin-bottom: 2rem; }
.btn { padding: 1rem 2rem; background: linear-gradient(135deg, #8b5cf6, #00f5ff); border: none; border-radius: 8px; color: #fff; font-size: 1rem; font-weight: 600; cursor: pointer; transition: transform 0.2s; }
.btn:hover { transform: translateY(-2px); }
</style>
</head>
<body>
<div class="hero">
<h1>Welcome to Your Site</h1>
<p>This is a beautiful landing page deployed via CloudPilot AI Studio on puter.site</p>
<button class="btn">Get Started</button>
</div>
</body>
</html>`,
      'dashboard': `<!DOCTYPE html>
<html>
<head>
<title>Dashboard</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', sans-serif; background: #0a0a12; color: #fff; }
.sidebar { position: fixed; left: 0; top: 0; width: 240px; height: 100vh; background: #12121f; border-right: 1px solid #2a2a40; padding: 1rem; }
.main { margin-left: 240px; padding: 2rem; }
.logo { font-size: 1.5rem; font-weight: 700; color: #8b5cf6; margin-bottom: 2rem; }
.nav-item { padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 0.5rem; color: #a0a0c0; cursor: pointer; }
.nav-item:hover { background: rgba(139,92,246,0.1); }
.nav-item.active { background: rgba(139,92,246,0.2); color: #8b5cf6; }
h1 { font-size: 2rem; margin-bottom: 1.5rem; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; }
.card { background: #16161f; border-radius: 8px; padding: 1.5rem; border: 1px solid #2a2a40; }
.card-title { color: #a0a0c0; font-size: 0.875rem; margin-bottom: 0.5rem; }
.card-value { font-size: 2rem; font-weight: 700; color: #00f5ff; }
</style>
</head>
<body>
<div class="sidebar">
<div class="logo">Dashboard</div>
<div class="nav-item active">Overview</div>
<div class="nav-item">Analytics</div>
<div class="nav-item">Settings</div>
</div>
<div class="main">
<h1>Overview</h1>
<div class="cards">
<div class="card"><div class="card-title">Total Users</div><div class="card-value">1,234</div></div>
<div class="card"><div class="card-title">Revenue</div><div class="card-value">$12.5K</div></div>
<div class="card"><div class="card-title">Active Now</div><div class="card-value">89</div></div>
</div>
</div>
</body>
</html>`
    };

    const template = templates[templateName];
    if (!template) {
      throw new Error(`Unknown template: ${templateName}. Available: ${Object.keys(templates).join(', ')}`);
    }

    return this.quickDeploy(subdomain, template);
  }

  /**
   * List all deployments
   */
  async listDeployments() {
    // Get from Puter hosting API if available
    if (window.PuterService?.isOnline()) {
      try {
        const live = await window.PuterService.listDeployments();
        // Merge with local cache
        live.forEach(d => {
          if (!this.deployments.has(d.subdomain)) {
            this.deployments.set(d.subdomain, d);
          }
        });
      } catch (e) {
        console.warn('[DeployService] Could not fetch live deployments');
      }
    }

    return Array.from(this.deployments.values());
  }

  /**
   * Get a specific deployment
   */
  getDeployment(subdomain) {
    return this.deployments.get(subdomain);
  }

  /**
   * Delete/undeploy a site
   */
  async undeploy(subdomain) {
    if (!window.PuterService?.isOnline()) {
      throw new Error('Undeploy unavailable in offline mode');
    }

    try {
      await window.PuterService.undeploy(subdomain);
      this.deployments.delete(subdomain);
      await this.saveDeployments();
      
      this._notify('undeploy', { subdomain });
      return true;
    } catch (e) {
      throw new Error(`Undeploy failed: ${e.message}`);
    }
  }

  /**
   * Subscribe to deployment events
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notify(event, data) {
    this.listeners.forEach(cb => {
      try { cb(event, data); } catch (e) { console.error('[DeployService] Listener error:', e); }
    });
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      online: window.PuterService?.isOnline() || false,
      deploymentCount: this.deployments.size
    };
  }
}

// Create singleton
const deployService = new DeployService();

if (typeof window !== 'undefined') {
  window.DeployService = deployService;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DeployService, deployService };
}
