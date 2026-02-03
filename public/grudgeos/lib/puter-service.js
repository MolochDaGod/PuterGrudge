/**
 * Unified Puter Service
 * Centralizes all Puter.js SDK capabilities for CloudPilot AI Studio
 * 
 * Features:
 * - AI: Multi-model chat (GPT-4o, Claude, Gemini, DeepSeek) - FREE
 * - KV: Key-Value storage for persistent data
 * - FS: Cloud filesystem for files and assets
 * - Auth: User authentication
 * - Hosting: One-click deployment to *.puter.site
 */

class PuterService {
  constructor() {
    this.ready = false;
    this.offlineMode = false;
    this.initPromise = null;
    this.listeners = new Set();
    this.cache = new Map();
    this.AI_MODELS = {
      GPT4O: 'gpt-4o',
      GPT4O_MINI: 'gpt-4o-mini',
      CLAUDE_SONNET: 'claude-3-5-sonnet',
      CLAUDE_HAIKU: 'claude-3-haiku',
      GEMINI_PRO: 'gemini-1.5-pro',
      DEEPSEEK: 'deepseek-chat',
      MISTRAL: 'mistral-large'
    };
  }

  async init() {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this._doInit();
    return this.initPromise;
  }

  async _doInit() {
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        if (typeof puter === 'undefined') {
          console.log('[PuterService] Puter SDK not loaded, waiting...');
          await this._waitForPuter(5000);
        }

        if (typeof puter !== 'undefined') {
          await puter.kv.get('__puter_test__');
          this.ready = true;
          this.offlineMode = false;
          console.log('[PuterService] Initialized successfully');
          this._notify('ready', { online: true });
          return true;
        }
      } catch (e) {
        console.log(`[PuterService] Init attempt ${i + 1} failed:`, e.message);
        if (i < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }

    console.log('[PuterService] Running in offline mode');
    this.ready = true;
    this.offlineMode = true;
    this._notify('ready', { online: false });
    return true;
  }

  async _waitForPuter(timeout) {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        if (typeof puter !== 'undefined') {
          resolve(true);
        } else if (Date.now() - start > timeout) {
          resolve(false);
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  isOnline() {
    return this.ready && !this.offlineMode;
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notify(event, data) {
    this.listeners.forEach(cb => {
      try { cb(event, data); } catch (e) { console.error('[PuterService] Listener error:', e); }
    });
  }

  // ==================== AI ====================
  
  /**
   * Chat with AI - FREE multi-model access
   * @param {string} prompt - The message or prompt
   * @param {object} options - { model, systemPrompt, temperature, stream }
   * @returns {Promise<string>} AI response
   */
  async chat(prompt, options = {}) {
    if (!this.isOnline()) {
      return this._offlineAIFallback(prompt);
    }

    try {
      const model = options.model || this.AI_MODELS.GPT4O_MINI;
      const messages = [];

      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }
      
      if (Array.isArray(prompt)) {
        messages.push(...prompt);
      } else {
        messages.push({ role: 'user', content: prompt });
      }

      const response = await puter.ai.chat(messages, { model });
      
      if (typeof response === 'string') {
        return response;
      }
      
      return response?.message?.content || response?.content || String(response);
    } catch (e) {
      console.error('[PuterService] AI chat error:', e);
      return this._offlineAIFallback(prompt);
    }
  }

  /**
   * Stream AI response
   */
  async *chatStream(prompt, options = {}) {
    if (!this.isOnline()) {
      yield this._offlineAIFallback(prompt);
      return;
    }

    try {
      const model = options.model || this.AI_MODELS.GPT4O_MINI;
      const response = await puter.ai.chat(prompt, { model, stream: true });
      
      for await (const chunk of response) {
        yield chunk?.text || chunk?.content || chunk;
      }
    } catch (e) {
      console.error('[PuterService] AI stream error:', e);
      yield this._offlineAIFallback(prompt);
    }
  }

  /**
   * Analyze code with AI
   */
  async analyzeCode(code, language = 'javascript') {
    return this.chat(code, {
      model: this.AI_MODELS.GPT4O,
      systemPrompt: `You are an expert ${language} code analyst. Analyze the code for bugs, improvements, and best practices. Be concise.`
    });
  }

  /**
   * Generate code with AI
   */
  async generateCode(description, language = 'javascript') {
    return this.chat(description, {
      model: this.AI_MODELS.GPT4O,
      systemPrompt: `You are an expert ${language} developer. Generate clean, working code based on the description. Return only code, no explanations.`
    });
  }

  /**
   * AI agent task execution
   */
  async executeAgentTask(agentId, task, context = {}) {
    const systemPrompt = `You are ${agentId}, an AI agent in CloudPilot AI Studio. 
Execute tasks efficiently and return structured results.
Context: ${JSON.stringify(context)}`;

    return this.chat(task, {
      model: this.AI_MODELS.GPT4O,
      systemPrompt
    });
  }

  _offlineAIFallback(prompt) {
    return `[Offline Mode] AI unavailable. Your request: "${String(prompt).slice(0, 100)}..."`;
  }

  // ==================== KV Storage ====================
  
  /**
   * Get value from KV storage
   */
  async kvGet(key, defaultValue = null) {
    if (!this.isOnline()) {
      return this._localGet(key, defaultValue);
    }

    try {
      const value = await puter.kv.get(key);
      if (value === null || value === undefined) {
        return defaultValue;
      }
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (e) {
      console.error('[PuterService] KV get error:', e);
      return this._localGet(key, defaultValue);
    }
  }

  /**
   * Set value in KV storage
   */
  async kvSet(key, value) {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    
    if (!this.isOnline()) {
      return this._localSet(key, serialized);
    }

    try {
      await puter.kv.set(key, serialized);
      this._localSet(key, serialized); // Sync to local cache
      return true;
    } catch (e) {
      console.error('[PuterService] KV set error:', e);
      return this._localSet(key, serialized);
    }
  }

  /**
   * Delete from KV storage
   */
  async kvDelete(key) {
    if (!this.isOnline()) {
      localStorage.removeItem(`puter_kv_${key}`);
      return true;
    }

    try {
      await puter.kv.del(key);
      localStorage.removeItem(`puter_kv_${key}`);
      return true;
    } catch (e) {
      console.error('[PuterService] KV delete error:', e);
      return false;
    }
  }

  /**
   * List all KV keys with prefix
   */
  async kvList(prefix = '') {
    if (!this.isOnline()) {
      return this._localListKeys(prefix);
    }

    try {
      const keys = await puter.kv.list();
      return keys.filter(k => k.startsWith(prefix));
    } catch (e) {
      console.error('[PuterService] KV list error:', e);
      return this._localListKeys(prefix);
    }
  }

  _localGet(key, defaultValue) {
    try {
      const value = localStorage.getItem(`puter_kv_${key}`);
      if (!value) return defaultValue;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch {
      return defaultValue;
    }
  }

  _localSet(key, value) {
    try {
      localStorage.setItem(`puter_kv_${key}`, value);
      return true;
    } catch {
      return false;
    }
  }

  _localListKeys(prefix) {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('puter_kv_')) {
        const realKey = key.replace('puter_kv_', '');
        if (realKey.startsWith(prefix)) {
          keys.push(realKey);
        }
      }
    }
    return keys;
  }

  // ==================== Filesystem ====================
  
  /**
   * Read file from Puter filesystem
   */
  async fsRead(path) {
    if (!this.isOnline()) {
      throw new Error('Filesystem unavailable in offline mode');
    }

    try {
      const file = await puter.fs.read(path);
      return file;
    } catch (e) {
      console.error('[PuterService] FS read error:', e);
      throw e;
    }
  }

  /**
   * Write file to Puter filesystem
   */
  async fsWrite(path, content, options = {}) {
    if (!this.isOnline()) {
      throw new Error('Filesystem unavailable in offline mode');
    }

    try {
      await puter.fs.write(path, content, options);
      return true;
    } catch (e) {
      console.error('[PuterService] FS write error:', e);
      throw e;
    }
  }

  /**
   * List directory
   */
  async fsList(path = '/') {
    if (!this.isOnline()) {
      return [];
    }

    try {
      const items = await puter.fs.readdir(path);
      return items;
    } catch (e) {
      console.error('[PuterService] FS list error:', e);
      return [];
    }
  }

  /**
   * Create directory
   */
  async fsMkdir(path) {
    if (!this.isOnline()) {
      throw new Error('Filesystem unavailable in offline mode');
    }

    try {
      await puter.fs.mkdir(path, { recursive: true });
      return true;
    } catch (e) {
      console.error('[PuterService] FS mkdir error:', e);
      throw e;
    }
  }

  /**
   * Delete file or directory
   */
  async fsDelete(path) {
    if (!this.isOnline()) {
      throw new Error('Filesystem unavailable in offline mode');
    }

    try {
      await puter.fs.delete(path);
      return true;
    } catch (e) {
      console.error('[PuterService] FS delete error:', e);
      throw e;
    }
  }

  // ==================== Auth ====================
  
  /**
   * Get current user
   */
  async getUser() {
    if (!this.isOnline()) {
      return { username: 'guest', isGuest: true };
    }

    try {
      const user = await puter.auth.getUser();
      return user || { username: 'guest', isGuest: true };
    } catch (e) {
      console.error('[PuterService] Auth getUser error:', e);
      return { username: 'guest', isGuest: true };
    }
  }

  /**
   * Check if user is signed in
   */
  async isSignedIn() {
    if (!this.isOnline()) return false;
    
    try {
      const user = await puter.auth.getUser();
      return !!user && !user.isGuest;
    } catch {
      return false;
    }
  }

  /**
   * Sign in (shows Puter login UI)
   */
  async signIn() {
    if (!this.isOnline()) {
      throw new Error('Sign in unavailable in offline mode');
    }

    try {
      await puter.auth.signIn();
      const user = await this.getUser();
      this._notify('signIn', user);
      return user;
    } catch (e) {
      console.error('[PuterService] Sign in error:', e);
      throw e;
    }
  }

  /**
   * Sign out
   */
  async signOut() {
    if (!this.isOnline()) return;

    try {
      await puter.auth.signOut();
      this._notify('signOut', null);
    } catch (e) {
      console.error('[PuterService] Sign out error:', e);
    }
  }

  // ==================== Hosting ====================
  
  /**
   * Deploy app to *.puter.site
   * @param {string} subdomain - The subdomain (e.g., 'my-app' -> my-app.puter.site)
   * @param {string} sourcePath - Path to files in Puter filesystem
   */
  async deploy(subdomain, sourcePath) {
    if (!this.isOnline()) {
      throw new Error('Deployment unavailable in offline mode');
    }

    try {
      const result = await puter.hosting.create(subdomain, sourcePath);
      this._notify('deploy', { subdomain, url: `https://${subdomain}.puter.site` });
      return result;
    } catch (e) {
      console.error('[PuterService] Deploy error:', e);
      throw e;
    }
  }

  /**
   * List deployed sites
   */
  async listDeployments() {
    if (!this.isOnline()) return [];

    try {
      const sites = await puter.hosting.list();
      return sites || [];
    } catch (e) {
      console.error('[PuterService] List deployments error:', e);
      return [];
    }
  }

  /**
   * Delete deployment
   */
  async undeploy(subdomain) {
    if (!this.isOnline()) {
      throw new Error('Undeploy unavailable in offline mode');
    }

    try {
      await puter.hosting.delete(subdomain);
      this._notify('undeploy', { subdomain });
      return true;
    } catch (e) {
      console.error('[PuterService] Undeploy error:', e);
      throw e;
    }
  }

  // ==================== Agent Memory ====================
  
  /**
   * Save agent memory/state
   */
  async saveAgentMemory(agentId, memory) {
    return this.kvSet(`agent_memory_${agentId}`, memory);
  }

  /**
   * Load agent memory/state
   */
  async loadAgentMemory(agentId) {
    return this.kvGet(`agent_memory_${agentId}`, {
      conversations: [],
      learnings: [],
      preferences: {},
      lastActive: null
    });
  }

  /**
   * Add to agent's learned knowledge
   */
  async agentLearn(agentId, learning) {
    const memory = await this.loadAgentMemory(agentId);
    memory.learnings = memory.learnings || [];
    memory.learnings.push({
      ...learning,
      timestamp: new Date().toISOString()
    });
    
    // Keep last 100 learnings
    if (memory.learnings.length > 100) {
      memory.learnings = memory.learnings.slice(-100);
    }
    
    return this.saveAgentMemory(agentId, memory);
  }

  // ==================== Utilities ====================
  
  /**
   * Get storage stats
   */
  async getStorageStats() {
    if (!this.isOnline()) {
      return { used: 0, total: 0, available: 0 };
    }

    try {
      const usage = await puter.fs.df();
      return usage;
    } catch (e) {
      console.error('[PuterService] Storage stats error:', e);
      return { used: 0, total: 0, available: 0 };
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      ready: this.ready,
      online: !this.offlineMode,
      services: {
        ai: this.isOnline(),
        kv: true, // Always available with localStorage fallback
        fs: this.isOnline(),
        auth: this.isOnline(),
        hosting: this.isOnline()
      }
    };
  }
}

// Create singleton instance
const puterService = new PuterService();

// Auto-initialize
if (typeof window !== 'undefined') {
  window.PuterService = puterService;
  puterService.init().catch(console.error);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PuterService, puterService };
}
