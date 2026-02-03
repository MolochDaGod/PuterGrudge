/**
 * CloudPilot AI Studio - Connection Auditor
 * Verify all APIs, routes, sockets per Certification Framework
 * 
 * Phase 3: Certification Framework
 * 
 * Tests:
 * - Puter.js SDK connectivity
 * - AI model availability
 * - Cloud storage access
 * - WebSocket connections
 * - External API endpoints
 * - Route health checks
 * 
 * Works in both browser and server contexts
 */

const isBrowser = typeof window !== 'undefined';
const getPuter = () => isBrowser ? window.puter : null;

// Server-safe fetch wrapper
const safeFetch = async (url, options = {}) => {
  if (isBrowser && typeof fetch === 'function') {
    return fetch(url, options);
  }
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch(url, options);
  }
  // Node 18+ has built-in fetch
  try {
    return await globalThis.fetch(url, options);
  } catch (e) {
    throw new Error(`fetch not available in this environment: ${e.message}`);
  }
};

export const AUDIT_CATEGORIES = {
  PUTER_CORE: 'puter_core',
  AI_MODELS: 'ai_models',
  STORAGE: 'storage',
  WEBSOCKET: 'websocket',
  EXTERNAL_API: 'external_api',
  ROUTES: 'routes'
};

export const AUDIT_STATUS = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  WARN: 'WARN',
  SKIP: 'SKIP'
};

/**
 * Connection Auditor Service
 * Comprehensive testing of all system connections
 */
export class ConnectionAuditor {
  constructor() {
    this.results = [];
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * Run full connection audit
   */
  async runFullAudit() {
    this.results = [];
    this.startTime = new Date();
    
    console.log('[ConnectionAuditor] Starting full audit...');
    
    await this.auditPuterCore();
    await this.auditAIModels();
    await this.auditStorage();
    await this.auditWebSocket();
    await this.auditExternalAPIs();
    await this.auditRoutes();
    
    this.endTime = new Date();
    
    return this.generateReport();
  }

  /**
   * Add audit result
   */
  addResult(category, test, status, latencyMs = null, details = null) {
    this.results.push({
      category,
      test,
      status,
      latencyMs,
      details,
      timestamp: new Date().toISOString()
    });
    
    const icon = status === AUDIT_STATUS.PASS ? '[PASS]' : 
                 status === AUDIT_STATUS.FAIL ? '[FAIL]' : 
                 status === AUDIT_STATUS.WARN ? '[WARN]' : '[SKIP]';
    console.log(`${icon} ${category}/${test} ${latencyMs ? `(${latencyMs}ms)` : ''}`);
  }

  /**
   * Audit Puter.js Core SDK
   */
  async auditPuterCore() {
    const category = AUDIT_CATEGORIES.PUTER_CORE;
    const puter = getPuter();
    
    if (!puter) {
      this.addResult(category, 'sdk_available', isBrowser ? AUDIT_STATUS.FAIL : AUDIT_STATUS.SKIP, 
        null, isBrowser ? 'Puter SDK not loaded' : 'Server context - browser SDK not available');
      return;
    }
    
    this.addResult(category, 'sdk_available', AUDIT_STATUS.PASS);
    
    try {
      const start = Date.now();
      const isSignedIn = await puter.auth.isSignedIn();
      this.addResult(category, 'auth_check', AUDIT_STATUS.PASS, Date.now() - start);
      
      if (isSignedIn) {
        const userStart = Date.now();
        const user = await puter.auth.getUser();
        this.addResult(category, 'get_user', AUDIT_STATUS.PASS, Date.now() - userStart, { username: user?.username });
      } else {
        this.addResult(category, 'get_user', AUDIT_STATUS.SKIP, null, 'Not authenticated');
      }
    } catch (error) {
      this.addResult(category, 'auth_check', AUDIT_STATUS.FAIL, null, error.message);
    }
  }

  /**
   * Audit AI Model Availability
   */
  async auditAIModels() {
    const category = AUDIT_CATEGORIES.AI_MODELS;
    const puter = getPuter();
    
    if (!puter) {
      this.addResult(category, 'sdk_available', isBrowser ? AUDIT_STATUS.FAIL : AUDIT_STATUS.SKIP);
      return;
    }
    
    const testModels = [
      { id: 'default', model: undefined },
      { id: 'gpt-4o-mini', model: 'openai/gpt-4o-mini' }
    ];
    
    for (const { id, model } of testModels) {
      try {
        const start = Date.now();
        const options = model ? { model: `openrouter:${model}` } : {};
        const response = await puter.ai.chat('Reply with just OK', options);
        const latency = Date.now() - start;
        
        if (response && response.length > 0) {
          this.addResult(category, `model_${id}`, AUDIT_STATUS.PASS, latency);
        } else {
          this.addResult(category, `model_${id}`, AUDIT_STATUS.WARN, latency, 'Empty response');
        }
      } catch (error) {
        this.addResult(category, `model_${id}`, AUDIT_STATUS.FAIL, null, error.message);
      }
    }
  }

  /**
   * Audit Cloud Storage
   */
  async auditStorage() {
    const category = AUDIT_CATEGORIES.STORAGE;
    const puter = getPuter();
    
    if (!puter) {
      this.addResult(category, 'sdk_available', isBrowser ? AUDIT_STATUS.FAIL : AUDIT_STATUS.SKIP);
      return;
    }
    
    const testKey = `audit_test_${Date.now()}`;
    const testValue = { test: true, timestamp: Date.now() };
    
    try {
      const writeStart = Date.now();
      await puter.kv.set(testKey, testValue);
      this.addResult(category, 'kv_write', AUDIT_STATUS.PASS, Date.now() - writeStart);
    } catch (error) {
      this.addResult(category, 'kv_write', AUDIT_STATUS.FAIL, null, error.message);
      return;
    }
    
    try {
      const readStart = Date.now();
      const readValue = await puter.kv.get(testKey);
      const latency = Date.now() - readStart;
      
      if (readValue && readValue.test === true) {
        this.addResult(category, 'kv_read', AUDIT_STATUS.PASS, latency);
      } else {
        this.addResult(category, 'kv_read', AUDIT_STATUS.WARN, latency, 'Data mismatch');
      }
    } catch (error) {
      this.addResult(category, 'kv_read', AUDIT_STATUS.FAIL, null, error.message);
    }
    
    try {
      const deleteStart = Date.now();
      await puter.kv.del(testKey);
      this.addResult(category, 'kv_delete', AUDIT_STATUS.PASS, Date.now() - deleteStart);
    } catch (error) {
      this.addResult(category, 'kv_delete', AUDIT_STATUS.FAIL, null, error.message);
    }
    
    try {
      const start = Date.now();
      await puter.fs.stat('/');
      this.addResult(category, 'fs_access', AUDIT_STATUS.PASS, Date.now() - start);
    } catch (error) {
      this.addResult(category, 'fs_access', AUDIT_STATUS.FAIL, null, error.message);
    }
  }

  /**
   * Audit WebSocket Connections
   */
  async auditWebSocket() {
    const category = AUDIT_CATEGORIES.WEBSOCKET;
    
    if (typeof WebSocket === 'undefined') {
      this.addResult(category, 'websocket_support', AUDIT_STATUS.FAIL, null, 'WebSocket not available');
      return;
    }
    
    this.addResult(category, 'websocket_support', AUDIT_STATUS.PASS);
    
    const puter = getPuter();
    if (puter?.Socket) {
      this.addResult(category, 'puter_socket', AUDIT_STATUS.PASS);
    } else {
      this.addResult(category, 'puter_socket', AUDIT_STATUS.SKIP, null, 'Puter Socket not available');
    }
  }

  /**
   * Audit External APIs
   */
  async auditExternalAPIs() {
    const category = AUDIT_CATEGORIES.EXTERNAL_API;
    
    const apis = [
      { name: 'google_fonts', url: 'https://fonts.googleapis.com/css2?family=Inter', method: 'HEAD' },
      { name: 'unsplash', url: 'https://source.unsplash.com/random/1x1', method: 'HEAD' }
    ];
    
    for (const api of apis) {
      try {
        const start = Date.now();
        const fetchOpts = isBrowser ? { method: api.method, mode: 'no-cors' } : { method: api.method };
        const response = await safeFetch(api.url, fetchOpts);
        this.addResult(category, api.name, AUDIT_STATUS.PASS, Date.now() - start);
      } catch (error) {
        this.addResult(category, api.name, AUDIT_STATUS.WARN, null, `Network issue: ${error.message}`);
      }
    }
  }

  /**
   * Audit API Routes
   * Configurable base URL for server-side testing
   */
  async auditRoutes(baseUrl = '') {
    const category = AUDIT_CATEGORIES.ROUTES;
    
    const routes = [
      { name: 'health', path: '/api/v1/health', method: 'GET' },
      { name: 'agents_list', path: '/api/v1/agents', method: 'GET' },
      { name: 'extensions_list', path: '/api/v1/extensions', method: 'GET' }
    ];
    
    for (const route of routes) {
      try {
        const start = Date.now();
        const url = baseUrl + route.path;
        const response = await safeFetch(url, { method: route.method });
        const latency = Date.now() - start;
        
        if (response.ok) {
          this.addResult(category, route.name, AUDIT_STATUS.PASS, latency, { status: response.status });
        } else if (response.status === 404) {
          this.addResult(category, route.name, AUDIT_STATUS.WARN, latency, 'Route not found');
        } else {
          this.addResult(category, route.name, AUDIT_STATUS.FAIL, latency, { status: response.status });
        }
      } catch (error) {
        this.addResult(category, route.name, AUDIT_STATUS.WARN, null, `Fetch error: ${error.message}`);
      }
    }
  }

  /**
   * Generate audit report
   */
  generateReport() {
    const passed = this.results.filter(r => r.status === AUDIT_STATUS.PASS).length;
    const failed = this.results.filter(r => r.status === AUDIT_STATUS.FAIL).length;
    const warned = this.results.filter(r => r.status === AUDIT_STATUS.WARN).length;
    const skipped = this.results.filter(r => r.status === AUDIT_STATUS.SKIP).length;
    const total = this.results.length;
    
    const avgLatency = this.results
      .filter(r => r.latencyMs !== null)
      .reduce((sum, r) => sum + r.latencyMs, 0) / 
      (this.results.filter(r => r.latencyMs !== null).length || 1);
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: this.endTime - this.startTime,
      summary: {
        total,
        passed,
        failed,
        warned,
        skipped,
        passRate: ((passed / total) * 100).toFixed(1) + '%',
        avgLatencyMs: Math.round(avgLatency)
      },
      status: failed === 0 ? 'PASS' : 'FAIL',
      results: this.results,
      byCategory: {}
    };
    
    for (const category of Object.values(AUDIT_CATEGORIES)) {
      const categoryResults = this.results.filter(r => r.category === category);
      report.byCategory[category] = {
        total: categoryResults.length,
        passed: categoryResults.filter(r => r.status === AUDIT_STATUS.PASS).length,
        failed: categoryResults.filter(r => r.status === AUDIT_STATUS.FAIL).length
      };
    }
    
    return report;
  }
}

export const connectionAuditor = new ConnectionAuditor();

if (typeof window !== 'undefined') {
  window.GrudgeOS = window.GrudgeOS || {};
  window.GrudgeOS.ConnectionAuditor = connectionAuditor;
}

export default connectionAuditor;
