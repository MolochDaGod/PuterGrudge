class VMSandbox {
  constructor(options = {}) {
    this.options = {
      timeout: options.timeout || 5000,
      memoryLimit: options.memoryLimit || 128,
      allowAsync: options.allowAsync !== false,
      serverEndpoint: options.serverEndpoint || '/api/v1/execute',
      ...options
    };
    
    this.executions = [];
    this.ready = false;
    
    this.init();
  }
  
  async init() {
    this.ready = true;
    console.log('[VMSandbox] Browser sandbox initialized (server-delegated execution)');
  }
  
  async execute(code, context = {}) {
    return this.executeOnServer(code, context);
  }
  
  async executeOnServer(code, context = {}) {
    const execId = 'exec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const startTime = performance.now();
    
    try {
      const response = await fetch(this.options.serverEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          language: 'javascript',
          timeout: this.options.timeout,
          context: context,
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Server execution failed');
      }
      
      const execution = {
        id: data.result?.id || execId,
        status: data.result?.status || 'success',
        output: data.result?.output,
        logs: (data.result?.logs || []).map(log => ({
          level: 'log',
          message: String(log),
          time: Date.now(),
        })),
        error: data.result?.error,
        executionTime: data.result?.executionTime || (performance.now() - startTime),
        timestamp: new Date().toISOString(),
      };
      
      this.executions.push(execution);
      if (this.executions.length > 100) {
        this.executions.shift();
      }
      
      return execution;
      
    } catch (e) {
      const execution = {
        id: execId,
        status: 'error',
        error: e.message,
        logs: [],
        executionTime: performance.now() - startTime,
        timestamp: new Date().toISOString(),
      };
      
      this.executions.push(execution);
      return execution;
    }
  }
  
  async executeInWorker(code, context = {}) {
    return this.executeOnServer(code, context);
  }
  
  getExecutions(limit = 20) {
    return this.executions.slice(-limit);
  }
  
  clearExecutions() {
    this.executions = [];
  }
}

class AccessibilityService {
  constructor() {
    this.enabled = false;
    this.announcements = [];
  }
  
  announce(message, priority = 'polite') {
    const announcement = {
      id: 'announce_' + Date.now(),
      message,
      priority,
      timestamp: new Date().toISOString(),
    };
    
    this.announcements.push(announcement);
    
    let liveRegion = document.getElementById('a11y-live-region');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'a11y-live-region';
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;';
      document.body.appendChild(liveRegion);
    }
    
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.textContent = message;
    
    return announcement;
  }
  
  getAnnouncements(limit = 50) {
    return this.announcements.slice(-limit);
  }
  
  setupKeyboardNav(container) {
    const focusables = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const elements = Array.from(focusables);
    
    container.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const currentIndex = elements.indexOf(document.activeElement);
        
        if (e.shiftKey) {
          if (currentIndex <= 0) {
            e.preventDefault();
            elements[elements.length - 1]?.focus();
          }
        } else {
          if (currentIndex >= elements.length - 1) {
            e.preventDefault();
            elements[0]?.focus();
          }
        }
      }
    });
    
    return elements;
  }
  
  addSkipLink(targetId, label = 'Skip to main content') {
    const skipLink = document.createElement('a');
    skipLink.href = '#' + targetId;
    skipLink.className = 'skip-link';
    skipLink.textContent = label;
    skipLink.style.cssText = `
      position: absolute;
      left: -10000px;
      top: 10px;
      background: #000;
      color: #fff;
      padding: 8px 16px;
      z-index: 10000;
      text-decoration: none;
      border-radius: 4px;
    `;
    
    skipLink.addEventListener('focus', () => {
      skipLink.style.left = '10px';
    });
    
    skipLink.addEventListener('blur', () => {
      skipLink.style.left = '-10000px';
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);
    return skipLink;
  }
}

if (typeof window !== 'undefined') {
  window.VMSandbox = VMSandbox;
  window.AccessibilityService = AccessibilityService;
}
