class GrudgeCloud {
  constructor() {
    this.namespace = 'grudgecloud';
    this.initialized = false;
    this.apps = new Map();
    this.files = new Map();
    this.storage = {
      total: 50 * 1024 * 1024 * 1024,
      used: 0
    };
    this.callbacks = {
      onFileChange: null,
      onAppRegister: null,
      onSync: null
    };
  }

  async init() {
    if (this.initialized) return true;
    
    try {
      await this.loadApps();
      await this.loadFiles();
      await this.calculateStorage();
      this.initialized = true;
      console.log('[GrudgeCloud] Initialized successfully');
      return true;
    } catch (e) {
      console.error('[GrudgeCloud] Init failed:', e);
      return false;
    }
  }

  async loadApps() {
    if (typeof puter === 'undefined' || !puter.kv) return;
    try {
      const key = `${this.namespace}:apps`;
      const data = await puter.kv.get(key);
      if (data) {
        const parsed = JSON.parse(data);
        parsed.forEach(app => this.apps.set(app.id, app));
      }
    } catch (e) {
      console.log('[GrudgeCloud] No existing apps found');
    }
  }

  async saveApps() {
    if (typeof puter === 'undefined' || !puter.kv) return;
    try {
      const key = `${this.namespace}:apps`;
      await puter.kv.set(key, JSON.stringify(Array.from(this.apps.values())));
    } catch (e) {
      console.error('[GrudgeCloud] Failed to save apps:', e);
    }
  }

  async loadFiles() {
    if (typeof puter === 'undefined' || !puter.kv) return;
    try {
      const key = `${this.namespace}:files`;
      const data = await puter.kv.get(key);
      if (data) {
        const parsed = JSON.parse(data);
        parsed.forEach(file => this.files.set(file.id, file));
      }
    } catch (e) {
      console.log('[GrudgeCloud] No existing files found');
    }
  }

  async saveFiles() {
    if (typeof puter === 'undefined' || !puter.kv) return;
    try {
      const key = `${this.namespace}:files`;
      await puter.kv.set(key, JSON.stringify(Array.from(this.files.values())));
    } catch (e) {
      console.error('[GrudgeCloud] Failed to save files:', e);
    }
  }

  async calculateStorage() {
    let used = 0;
    this.files.forEach(file => {
      used += file.size || 0;
    });
    this.storage.used = used;
  }

  registerApp(appConfig) {
    const existing = this.apps.get(appConfig.id);
    
    if (existing) {
      existing.lastActive = new Date().toISOString();
      existing.status = 'active';
      this.apps.set(appConfig.id, existing);
      return existing;
    }

    const app = {
      id: appConfig.id,
      name: appConfig.name,
      icon: appConfig.icon,
      version: appConfig.version || '1.0.0',
      category: appConfig.category || 'general',
      permissions: appConfig.permissions || ['read', 'write'],
      dataPath: `/${appConfig.id}/data`,
      registeredAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      status: 'active',
      stats: {
        launches: 0,
        filesCreated: 0,
        dataSize: 0
      }
    };

    this.apps.set(app.id, app);
    this.saveApps();

    if (this.callbacks.onAppRegister) {
      this.callbacks.onAppRegister(app);
    }

    console.log(`[GrudgeCloud] App registered: ${app.name}`);
    return app;
  }

  getApp(appId) {
    return this.apps.get(appId);
  }

  getAllApps() {
    return Array.from(this.apps.values());
  }

  updateAppStats(appId, stats) {
    const app = this.apps.get(appId);
    if (app) {
      app.stats = { ...app.stats, ...stats };
      app.lastActive = new Date().toISOString();
      this.apps.set(appId, app);
      this.saveApps();
    }
  }

  async createFile(fileData) {
    const file = {
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: fileData.name,
      type: fileData.type || 'file',
      mimeType: fileData.mimeType || 'application/octet-stream',
      size: fileData.size || 0,
      path: fileData.path || '/',
      appId: fileData.appId,
      content: fileData.content,
      metadata: fileData.metadata || {},
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      starred: false,
      shared: false
    };

    this.files.set(file.id, file);
    await this.saveFiles();
    await this.calculateStorage();

    if (fileData.appId) {
      this.updateAppStats(fileData.appId, {
        filesCreated: (this.getApp(fileData.appId)?.stats?.filesCreated || 0) + 1
      });
    }

    if (this.callbacks.onFileChange) {
      this.callbacks.onFileChange({ action: 'create', file });
    }

    return file;
  }

  async updateFile(fileId, updates) {
    const file = this.files.get(fileId);
    if (!file) return null;

    const updated = {
      ...file,
      ...updates,
      modifiedAt: new Date().toISOString()
    };

    this.files.set(fileId, updated);
    await this.saveFiles();
    await this.calculateStorage();

    if (this.callbacks.onFileChange) {
      this.callbacks.onFileChange({ action: 'update', file: updated });
    }

    return updated;
  }

  async deleteFile(fileId) {
    const file = this.files.get(fileId);
    if (!file) return false;

    this.files.delete(fileId);
    await this.saveFiles();
    await this.calculateStorage();

    if (this.callbacks.onFileChange) {
      this.callbacks.onFileChange({ action: 'delete', file });
    }

    return true;
  }

  getFile(fileId) {
    return this.files.get(fileId);
  }

  getFilesByApp(appId) {
    return Array.from(this.files.values()).filter(f => f.appId === appId);
  }

  getFilesByPath(path) {
    return Array.from(this.files.values()).filter(f => f.path === path || f.path.startsWith(path + '/'));
  }

  getAllFiles() {
    return Array.from(this.files.values());
  }

  getRecentFiles(limit = 10) {
    return Array.from(this.files.values())
      .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt))
      .slice(0, limit);
  }

  getStarredFiles() {
    return Array.from(this.files.values()).filter(f => f.starred);
  }

  async setAppData(appId, key, value) {
    if (typeof puter === 'undefined' || !puter.kv) return false;
    const dataKey = `${this.namespace}:appdata:${appId}:${key}`;
    try {
      await puter.kv.set(dataKey, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`[GrudgeCloud] Failed to set app data:`, e);
      return false;
    }
  }

  async getAppData(appId, key) {
    if (typeof puter === 'undefined' || !puter.kv) return null;
    const dataKey = `${this.namespace}:appdata:${appId}:${key}`;
    try {
      const data = await puter.kv.get(dataKey);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`[GrudgeCloud] Failed to get app data:`, e);
      return null;
    }
  }

  async deleteAppData(appId, key) {
    if (typeof puter === 'undefined' || !puter.kv) return false;
    const dataKey = `${this.namespace}:appdata:${appId}:${key}`;
    try {
      await puter.kv.del(dataKey);
      return true;
    } catch (e) {
      console.error(`[GrudgeCloud] Failed to delete app data:`, e);
      return false;
    }
  }

  async broadcast(event, data) {
    const message = {
      event,
      data,
      timestamp: Date.now(),
      source: 'grudgecloud'
    };

    this.apps.forEach(app => {
      if (app.onMessage && typeof app.onMessage === 'function') {
        app.onMessage(message);
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('grudgecloud:message', { detail: message }));
    }
  }

  subscribe(callback) {
    if (typeof window !== 'undefined') {
      window.addEventListener('grudgecloud:message', (e) => callback(e.detail));
    }
  }

  getStorageInfo() {
    return {
      total: this.storage.total,
      used: this.storage.used,
      available: this.storage.total - this.storage.used,
      percentUsed: ((this.storage.used / this.storage.total) * 100).toFixed(2)
    };
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async sync() {
    await this.saveApps();
    await this.saveFiles();
    await this.calculateStorage();
    
    if (this.callbacks.onSync) {
      this.callbacks.onSync({
        apps: this.apps.size,
        files: this.files.size,
        storage: this.getStorageInfo()
      });
    }

    console.log('[GrudgeCloud] Synced successfully');
  }

  getStats() {
    return {
      apps: {
        total: this.apps.size,
        active: Array.from(this.apps.values()).filter(a => a.status === 'active').length
      },
      files: {
        total: this.files.size,
        starred: this.getStarredFiles().length,
        shared: Array.from(this.files.values()).filter(f => f.shared).length
      },
      storage: this.getStorageInfo()
    };
  }
}

class GrudgeCloudUI {
  constructor(cloud) {
    this.cloud = cloud;
    this.currentPath = '/';
    this.selectedFiles = new Set();
    this.viewMode = 'list';
  }

  render(container) {
    const stats = this.cloud.getStats();
    const files = this.cloud.getFilesByPath(this.currentPath);
    const recentFiles = this.cloud.getRecentFiles(5);
    const apps = this.cloud.getAllApps();
    const storageInfo = this.cloud.getStorageInfo();

    container.innerHTML = `
      <div class="grudgecloud-container">
        <div class="cloud-sidebar">
          <div class="cloud-nav-section">
            <div class="cloud-nav-title">Navigation</div>
            <div class="cloud-nav-item active" data-path="/" data-testid="nav-home">
              <span class="nav-icon">🏠</span>
              <span>Home</span>
            </div>
            <div class="cloud-nav-item" data-path="/starred" data-testid="nav-starred">
              <span class="nav-icon">⭐</span>
              <span>Starred</span>
              <span class="nav-badge">${stats.files.starred}</span>
            </div>
            <div class="cloud-nav-item" data-path="/shared" data-testid="nav-shared">
              <span class="nav-icon">🔗</span>
              <span>Shared</span>
              <span class="nav-badge">${stats.files.shared}</span>
            </div>
            <div class="cloud-nav-item" data-path="/recent" data-testid="nav-recent">
              <span class="nav-icon">🕐</span>
              <span>Recent</span>
            </div>
          </div>
          
          <div class="cloud-nav-section">
            <div class="cloud-nav-title">Connected Apps</div>
            ${apps.length > 0 ? apps.map(app => `
              <div class="cloud-nav-item app-item" data-app="${app.id}" data-testid="nav-app-${app.id}">
                <span class="nav-icon">${app.icon}</span>
                <span>${app.name}</span>
                <span class="nav-status ${app.status}"></span>
              </div>
            `).join('') : '<div class="cloud-nav-empty">No apps connected</div>'}
          </div>
          
          <div class="cloud-storage-widget">
            <div class="storage-header">Storage</div>
            <div class="storage-bar">
              <div class="storage-fill" style="width: ${storageInfo.percentUsed}%"></div>
            </div>
            <div class="storage-text">
              ${this.cloud.formatBytes(storageInfo.used)} of ${this.cloud.formatBytes(storageInfo.total)} used
            </div>
          </div>
        </div>
        
        <div class="cloud-main">
          <div class="cloud-toolbar">
            <div class="cloud-breadcrumb">
              <span class="breadcrumb-item" data-path="/">☁️ GrudgeCloud</span>
              ${this.currentPath !== '/' ? `<span class="breadcrumb-sep">›</span><span class="breadcrumb-item">${this.currentPath}</span>` : ''}
            </div>
            <div class="cloud-actions">
              <button class="cloud-btn primary" data-action="upload" data-testid="btn-upload">
                <span>📤</span> Upload
              </button>
              <button class="cloud-btn" data-action="newfolder" data-testid="btn-newfolder">
                <span>📁</span> New Folder
              </button>
              <button class="cloud-btn" data-action="sync" data-testid="btn-sync">
                <span>🔄</span> Sync
              </button>
              <div class="view-toggle">
                <button class="view-btn ${this.viewMode === 'grid' ? 'active' : ''}" data-view="grid">▦</button>
                <button class="view-btn ${this.viewMode === 'list' ? 'active' : ''}" data-view="list">☰</button>
              </div>
            </div>
          </div>
          
          <div class="cloud-content ${this.viewMode}">
            ${files.length > 0 ? files.map(file => this.renderFileItem(file)).join('') : `
              <div class="cloud-empty">
                <div class="empty-icon">📂</div>
                <div class="empty-text">No files here yet</div>
                <div class="empty-hint">Upload files or create folders to get started</div>
              </div>
            `}
          </div>
          
          ${recentFiles.length > 0 ? `
            <div class="cloud-recent">
              <div class="recent-header">Recent Activity</div>
              <div class="recent-list">
                ${recentFiles.map(file => `
                  <div class="recent-item" data-file="${file.id}">
                    <span class="recent-icon">${this.getFileIcon(file.type)}</span>
                    <span class="recent-name">${file.name}</span>
                    <span class="recent-time">${this.formatTime(file.modifiedAt)}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    this.attachEvents(container);
  }

  renderFileItem(file) {
    const icon = this.getFileIcon(file.type);
    const size = this.cloud.formatBytes(file.size);
    const modified = this.formatTime(file.modifiedAt);

    if (this.viewMode === 'grid') {
      return `
        <div class="file-card ${this.selectedFiles.has(file.id) ? 'selected' : ''}" data-file="${file.id}" data-testid="file-${file.id}">
          <div class="file-card-icon">${icon}</div>
          <div class="file-card-name">${file.name}</div>
          <div class="file-card-size">${size}</div>
          ${file.starred ? '<div class="file-star">⭐</div>' : ''}
        </div>
      `;
    }

    return `
      <div class="file-row ${this.selectedFiles.has(file.id) ? 'selected' : ''}" data-file="${file.id}" data-testid="file-${file.id}">
        <div class="file-icon">${icon}</div>
        <div class="file-name">${file.name}</div>
        <div class="file-size">${size}</div>
        <div class="file-modified">${modified}</div>
        <div class="file-app">${file.appId ? this.cloud.getApp(file.appId)?.icon || '📱' : '-'}</div>
        <div class="file-actions">
          ${file.starred ? '⭐' : '☆'}
          <span class="file-menu">⋮</span>
        </div>
      </div>
    `;
  }

  getFileIcon(type) {
    const icons = {
      folder: '📁',
      image: '🖼️',
      video: '🎬',
      audio: '🎵',
      document: '📄',
      code: '💻',
      archive: '📦',
      model: '🎮',
      data: '📊',
      file: '📄'
    };
    return icons[type] || icons.file;
  }

  formatTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

    return date.toLocaleDateString();
  }

  attachEvents(container) {
    container.querySelectorAll('.cloud-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const path = item.dataset.path;
        if (path) {
          this.currentPath = path;
          this.render(container);
        }
      });
    });

    container.querySelectorAll('.cloud-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        this.handleAction(action, container);
      });
    });

    container.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.viewMode = btn.dataset.view;
        this.render(container);
      });
    });

    container.querySelectorAll('[data-file]').forEach(item => {
      item.addEventListener('click', (e) => {
        const fileId = item.dataset.file;
        if (e.ctrlKey || e.metaKey) {
          if (this.selectedFiles.has(fileId)) {
            this.selectedFiles.delete(fileId);
          } else {
            this.selectedFiles.add(fileId);
          }
        } else {
          this.selectedFiles.clear();
          this.selectedFiles.add(fileId);
        }
        this.render(container);
      });

      item.addEventListener('dblclick', () => {
        const file = this.cloud.getFile(item.dataset.file);
        if (file && file.type === 'folder') {
          this.currentPath = file.path + '/' + file.name;
          this.render(container);
        }
      });
    });
  }

  async handleAction(action, container) {
    switch (action) {
      case 'upload':
        await this.showUploadDialog(container);
        break;
      case 'newfolder':
        await this.createNewFolder(container);
        break;
      case 'sync':
        await this.cloud.sync();
        this.render(container);
        break;
    }
  }

  async showUploadDialog(container) {
    const fileName = prompt('Enter file name:');
    if (fileName) {
      await this.cloud.createFile({
        name: fileName,
        type: 'file',
        size: Math.floor(Math.random() * 1024 * 1024),
        path: this.currentPath
      });
      this.render(container);
    }
  }

  async createNewFolder(container) {
    const folderName = prompt('Enter folder name:');
    if (folderName) {
      await this.cloud.createFile({
        name: folderName,
        type: 'folder',
        size: 0,
        path: this.currentPath
      });
      this.render(container);
    }
  }
}

const grudgeCloud = new GrudgeCloud();
const grudgeCloudUI = new GrudgeCloudUI(grudgeCloud);

if (typeof window !== 'undefined') {
  window.GrudgeCloud = grudgeCloud;
  window.GrudgeCloudUI = grudgeCloudUI;
  console.log('[GrudgeCloud] Classes registered on window');
}
