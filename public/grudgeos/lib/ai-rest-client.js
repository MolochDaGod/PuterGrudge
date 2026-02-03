class AIRestClient {
  static METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
  static BODY_TYPES = ['none', 'json', 'form', 'form-encoded', 'text', 'xml', 'binary', 'graphql'];
  static AUTH_TYPES = ['none', 'basic', 'bearer', 'api-key', 'aws'];

  constructor(agentId) {
    this.agentId = agentId;
    this.namespace = `rest_client_${agentId}`;
    this.collections = [];
    this.activeCollection = null;
    this.environment = {};
    this.globalEnvironment = {};
    this.history = [];
    this.cookies = new Map();
  }

  async initialize() {
    await this.loadState();
    console.log(`[AIRestClient:${this.agentId}] Initialized`);
  }

  async loadState() {
    if (typeof puter === 'undefined' || !puter.kv) return;
    try {
      const data = await puter.kv.get(this.namespace);
      if (data) {
        const state = JSON.parse(data);
        this.collections = state.collections || [];
        this.environment = state.environment || {};
        this.globalEnvironment = state.globalEnvironment || {};
        this.history = state.history || [];
      }
    } catch (e) {
      console.log('[AIRestClient] No saved state');
    }
  }

  async saveState() {
    if (typeof puter === 'undefined' || !puter.kv) return;
    try {
      await puter.kv.set(this.namespace, JSON.stringify({
        collections: this.collections,
        environment: this.environment,
        globalEnvironment: this.globalEnvironment,
        history: this.history.slice(-100)
      }));
    } catch (e) {
      console.warn('[AIRestClient] Failed to save state:', e.message);
    }
  }

  createCollection(name, description = '') {
    const collection = {
      id: `coll_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name,
      description,
      requests: [],
      folders: [],
      variables: {},
      preRequest: null,
      tests: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.collections.push(collection);
    this.activeCollection = collection.id;
    this.saveState();
    return collection;
  }

  createFolder(collectionId, name, parentId = null) {
    const collection = this.collections.find(c => c.id === collectionId);
    if (!collection) throw new Error('Collection not found');

    const folder = {
      id: `folder_${Date.now()}`,
      name,
      parentId,
      requests: [],
      createdAt: Date.now()
    };

    collection.folders.push(folder);
    collection.updatedAt = Date.now();
    this.saveState();
    return folder;
  }

  createRequest(collectionId, config, folderId = null) {
    const collection = this.collections.find(c => c.id === collectionId);
    if (!collection) throw new Error('Collection not found');

    const request = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: config.name || 'New Request',
      method: config.method || 'GET',
      url: config.url || '',
      description: config.description || '',
      queryParams: config.queryParams || [],
      headers: config.headers || [],
      auth: config.auth || { type: 'none' },
      body: {
        type: config.bodyType || 'none',
        content: config.body || null,
        formData: config.formData || [],
        graphql: config.graphql || { query: '', variables: '' }
      },
      preRequest: config.preRequest || null,
      tests: config.tests || [],
      notes: config.notes || '',
      folderId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    if (folderId) {
      const folder = collection.folders.find(f => f.id === folderId);
      if (folder) folder.requests.push(request.id);
    }

    collection.requests.push(request);
    collection.updatedAt = Date.now();
    this.saveState();
    return request;
  }

  async executeRequest(requestId) {
    // Check for browser environment with required APIs
    if (typeof fetch === 'undefined' || typeof FormData === 'undefined') {
      return {
        requestId,
        error: 'REST client requires browser environment with fetch API',
        status: 0,
        time: 0,
        timestamp: Date.now()
      };
    }

    let request = null;
    let collection = null;

    for (const coll of this.collections) {
      request = coll.requests.find(r => r.id === requestId);
      if (request) {
        collection = coll;
        break;
      }
    }

    if (!request) throw new Error('Request not found');

    const allVars = {
      ...this.globalEnvironment,
      ...this.environment,
      ...(collection?.variables || {})
    };

    let url = this.interpolate(request.url, allVars);

    if (request.queryParams.length > 0) {
      const params = new URLSearchParams();
      request.queryParams.forEach(p => {
        if (p.enabled !== false) {
          params.append(this.interpolate(p.key, allVars), this.interpolate(p.value, allVars));
        }
      });
      url += (url.includes('?') ? '&' : '?') + params.toString();
    }

    const headers = {};
    request.headers.forEach(h => {
      if (h.enabled !== false) {
        headers[this.interpolate(h.key, allVars)] = this.interpolate(h.value, allVars);
      }
    });

    this.applyAuth(request.auth, headers, allVars);

    let body = null;
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      switch (request.body.type) {
        case 'json':
          headers['Content-Type'] = 'application/json';
          body = this.interpolate(JSON.stringify(request.body.content), allVars);
          break;
        case 'form':
          const formData = new FormData();
          request.body.formData.forEach(f => {
            if (f.enabled !== false) {
              formData.append(this.interpolate(f.key, allVars), this.interpolate(f.value, allVars));
            }
          });
          body = formData;
          break;
        case 'form-encoded':
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
          const encoded = new URLSearchParams();
          request.body.formData.forEach(f => {
            if (f.enabled !== false) {
              encoded.append(this.interpolate(f.key, allVars), this.interpolate(f.value, allVars));
            }
          });
          body = encoded.toString();
          break;
        case 'text':
          headers['Content-Type'] = 'text/plain';
          body = this.interpolate(request.body.content, allVars);
          break;
        case 'xml':
          headers['Content-Type'] = 'application/xml';
          body = this.interpolate(request.body.content, allVars);
          break;
        case 'graphql':
          headers['Content-Type'] = 'application/json';
          body = JSON.stringify({
            query: this.interpolate(request.body.graphql.query, allVars),
            variables: JSON.parse(this.interpolate(request.body.graphql.variables || '{}', allVars))
          });
          break;
      }
    }

    const getTime = typeof performance !== 'undefined' ? () => performance.now() : () => Date.now();
    const startTime = getTime();
    
    try {
      const response = await fetch(url, {
        method: request.method,
        headers,
        body,
        credentials: 'include'
      });

      const endTime = getTime();
      const responseTime = Math.round(endTime - startTime);

      const responseHeaders = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const responseText = await response.text();
      let responseBody = responseText;
      let contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        try {
          responseBody = JSON.parse(responseText);
        } catch (e) {}
      }

      const result = {
        id: `res_${Date.now()}`,
        requestId,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        contentType,
        size: responseText.length,
        time: responseTime,
        timestamp: Date.now()
      };

      const testResults = this.runTests(request.tests, result, allVars);
      result.tests = testResults;

      this.history.unshift({
        request: { ...request },
        response: result,
        timestamp: Date.now()
      });

      if (this.history.length > 100) {
        this.history = this.history.slice(0, 100);
      }

      this.saveState();
      return result;

    } catch (error) {
      const endTime = performance.now();
      const result = {
        id: `res_${Date.now()}`,
        requestId,
        error: error.message,
        time: Math.round(endTime - startTime),
        timestamp: Date.now()
      };

      this.history.unshift({
        request: { ...request },
        response: result,
        timestamp: Date.now()
      });

      this.saveState();
      throw error;
    }
  }

  applyAuth(auth, headers, vars) {
    switch (auth?.type) {
      case 'basic':
        const credentials = btoa(`${this.interpolate(auth.username, vars)}:${this.interpolate(auth.password, vars)}`);
        headers['Authorization'] = `Basic ${credentials}`;
        break;
      case 'bearer':
        headers['Authorization'] = `Bearer ${this.interpolate(auth.token, vars)}`;
        break;
      case 'api-key':
        if (auth.addTo === 'header') {
          headers[this.interpolate(auth.key, vars)] = this.interpolate(auth.value, vars);
        }
        break;
    }
  }

  interpolate(str, vars) {
    if (!str || typeof str !== 'string') return str;
    return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return vars[key] !== undefined ? vars[key] : match;
    });
  }

  runTests(tests, response, vars) {
    if (!tests || tests.length === 0) return [];

    return tests.map(test => {
      try {
        let passed = false;
        let actual = null;

        switch (test.type) {
          case 'status':
            actual = response.status;
            passed = this.compare(actual, test.operator, parseInt(test.expected));
            break;

          case 'body_contains':
            actual = typeof response.body === 'string' ? response.body : JSON.stringify(response.body);
            passed = actual.includes(this.interpolate(test.expected, vars));
            break;

          case 'body_equals':
            actual = typeof response.body === 'string' ? response.body : JSON.stringify(response.body);
            passed = actual === this.interpolate(test.expected, vars);
            break;

          case 'json_value':
            actual = this.getJsonPath(response.body, test.path);
            passed = this.compare(actual, test.operator, this.interpolate(test.expected, vars));
            break;

          case 'header_exists':
            actual = response.headers[test.header.toLowerCase()];
            passed = actual !== undefined;
            break;

          case 'header_equals':
            actual = response.headers[test.header.toLowerCase()];
            passed = actual === this.interpolate(test.expected, vars);
            break;

          case 'response_time':
            actual = response.time;
            passed = actual < parseInt(test.expected);
            break;

          case 'content_type':
            actual = response.contentType;
            passed = actual.includes(this.interpolate(test.expected, vars));
            break;
        }

        return {
          ...test,
          passed,
          actual,
          message: passed ? 'Test passed' : `Expected ${test.expected}, got ${actual}`
        };
      } catch (error) {
        return {
          ...test,
          passed: false,
          error: error.message,
          message: `Test error: ${error.message}`
        };
      }
    });
  }

  compare(actual, operator, expected) {
    switch (operator) {
      case 'equals':
      case '==':
        return actual == expected;
      case 'not_equals':
      case '!=':
        return actual != expected;
      case 'greater':
      case '>':
        return actual > expected;
      case 'less':
      case '<':
        return actual < expected;
      case 'greater_equals':
      case '>=':
        return actual >= expected;
      case 'less_equals':
      case '<=':
        return actual <= expected;
      case 'contains':
        return String(actual).includes(String(expected));
      default:
        return actual === expected;
    }
  }

  getJsonPath(obj, path) {
    if (!path) return obj;
    return path.split('.').reduce((o, key) => {
      if (o === null || o === undefined) return undefined;
      if (key.includes('[')) {
        const [prop, indexStr] = key.split('[');
        const index = parseInt(indexStr.replace(']', ''));
        return o[prop]?.[index];
      }
      return o[key];
    }, obj);
  }

  setVariable(key, value, scope = 'environment') {
    switch (scope) {
      case 'global':
        this.globalEnvironment[key] = value;
        break;
      case 'collection':
        if (this.activeCollection) {
          const coll = this.collections.find(c => c.id === this.activeCollection);
          if (coll) coll.variables[key] = value;
        }
        break;
      default:
        this.environment[key] = value;
    }
    this.saveState();
  }

  getVariable(key) {
    const collection = this.collections.find(c => c.id === this.activeCollection);
    return collection?.variables[key] || this.environment[key] || this.globalEnvironment[key];
  }

  exportCollection(collectionId) {
    const collection = this.collections.find(c => c.id === collectionId);
    if (!collection) throw new Error('Collection not found');

    return {
      type: 'ai_rest_client_collection',
      version: '1.0',
      exportedAt: Date.now(),
      exportedBy: this.agentId,
      collection: JSON.parse(JSON.stringify(collection)),
      environment: { ...this.environment }
    };
  }

  importCollection(data) {
    if (data.type !== 'ai_rest_client_collection') {
      throw new Error('Invalid collection format');
    }

    const imported = {
      ...data.collection,
      id: `coll_${Date.now()}_imported`,
      importedAt: Date.now(),
      importedFrom: data.exportedBy
    };

    this.collections.push(imported);
    this.saveState();
    return imported;
  }

  generateCodeSnippet(requestId, language) {
    let request = null;
    for (const coll of this.collections) {
      request = coll.requests.find(r => r.id === requestId);
      if (request) break;
    }

    if (!request) throw new Error('Request not found');

    const generators = {
      javascript: this.generateJavaScript,
      python: this.generatePython,
      curl: this.generateCurl,
      nodejs: this.generateNodeJS,
      php: this.generatePHP
    };

    const generator = generators[language];
    if (!generator) throw new Error(`Language ${language} not supported`);

    return generator.call(this, request);
  }

  generateJavaScript(request) {
    const headers = request.headers.reduce((acc, h) => {
      if (h.enabled !== false) acc[h.key] = h.value;
      return acc;
    }, {});

    return `fetch('${request.url}', {
  method: '${request.method}',
  headers: ${JSON.stringify(headers, null, 2)},
  ${request.body.type !== 'none' ? `body: ${JSON.stringify(request.body.content)}` : ''}
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`;
  }

  generatePython(request) {
    const headers = request.headers.reduce((acc, h) => {
      if (h.enabled !== false) acc[h.key] = h.value;
      return acc;
    }, {});

    return `import requests

response = requests.${request.method.toLowerCase()}(
    '${request.url}',
    headers=${JSON.stringify(headers)},
    ${request.body.type !== 'none' ? `json=${JSON.stringify(request.body.content)}` : ''}
)

print(response.json())`;
  }

  generateCurl(request) {
    let cmd = `curl -X ${request.method} '${request.url}'`;
    
    request.headers.forEach(h => {
      if (h.enabled !== false) {
        cmd += ` \\\n  -H '${h.key}: ${h.value}'`;
      }
    });

    if (request.body.type === 'json' && request.body.content) {
      cmd += ` \\\n  -d '${JSON.stringify(request.body.content)}'`;
    }

    return cmd;
  }

  generateNodeJS(request) {
    return `const https = require('https');

const options = {
  hostname: new URL('${request.url}').hostname,
  path: new URL('${request.url}').pathname,
  method: '${request.method}',
  headers: ${JSON.stringify(request.headers.reduce((acc, h) => {
    if (h.enabled !== false) acc[h.key] = h.value;
    return acc;
  }, {}), null, 4)}
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log(JSON.parse(data)); });
});

req.on('error', (e) => { console.error(e); });
${request.body.type !== 'none' ? `req.write(JSON.stringify(${JSON.stringify(request.body.content)}));` : ''}
req.end();`;
  }

  generatePHP(request) {
    return `<?php
$ch = curl_init();

curl_setopt($ch, CURLOPT_URL, '${request.url}');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, '${request.method}');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
${request.headers.filter(h => h.enabled !== false).map(h => `    '${h.key}: ${h.value}'`).join(',\n')}
]);
${request.body.type !== 'none' ? `curl_setopt($ch, CURLOPT_POSTFIELDS, '${JSON.stringify(request.body.content)}');` : ''}

$response = curl_exec($ch);
curl_close($ch);

echo $response;
?>`;
  }

  getHistory(limit = 50) {
    return this.history.slice(0, limit);
  }

  clearHistory() {
    this.history = [];
    this.saveState();
  }

  deleteCollection(collectionId) {
    const index = this.collections.findIndex(c => c.id === collectionId);
    if (index !== -1) {
      this.collections.splice(index, 1);
      if (this.activeCollection === collectionId) {
        this.activeCollection = this.collections[0]?.id || null;
      }
      this.saveState();
    }
  }

  deleteRequest(requestId) {
    for (const collection of this.collections) {
      const index = collection.requests.findIndex(r => r.id === requestId);
      if (index !== -1) {
        const request = collection.requests[index];
        collection.requests.splice(index, 1);
        
        if (request.folderId) {
          const folder = collection.folders.find(f => f.id === request.folderId);
          if (folder) {
            const folderIndex = folder.requests.indexOf(requestId);
            if (folderIndex !== -1) folder.requests.splice(folderIndex, 1);
          }
        }
        
        collection.updatedAt = Date.now();
        this.saveState();
        return true;
      }
    }
    return false;
  }

  duplicateRequest(requestId) {
    for (const collection of this.collections) {
      const request = collection.requests.find(r => r.id === requestId);
      if (request) {
        const duplicate = {
          ...JSON.parse(JSON.stringify(request)),
          id: `req_${Date.now()}_copy`,
          name: `${request.name} (Copy)`,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        collection.requests.push(duplicate);
        collection.updatedAt = Date.now();
        this.saveState();
        return duplicate;
      }
    }
    return null;
  }
}

if (typeof window !== 'undefined') {
  window.AIRestClient = AIRestClient;
}

if (typeof module !== 'undefined') {
  module.exports = { AIRestClient };
}
