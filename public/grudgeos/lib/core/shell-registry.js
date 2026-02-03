const ShellRegistry = {
  SHELL_TYPES: {
    TERMINAL: 'terminal',
    CODE_NINJA: 'code-ninja',
    MICRO_TERMINAL: 'micro-terminal',
    POD_SHELL: 'pod-shell',
    AI_SHELL: 'ai-shell',
    WASM_SHELL: 'wasm-shell'
  },

  EXECUTION_CONTEXTS: {
    USER: 'user',
    SYSTEM: 'system',
    AGENT: 'agent',
    POD: 'pod',
    SANDBOX: 'sandbox'
  },

  INPUT_SOURCES: {
    USER_KEYBOARD: 'user:keyboard',
    USER_VOICE: 'user:voice',
    AGENT_COMMAND: 'agent:command',
    WORKFLOW_TRIGGER: 'workflow:trigger',
    API_REQUEST: 'api:request',
    SCRIPT_EXEC: 'script:exec'
  },

  OUTPUT_DESTINATIONS: {
    CONSOLE_LOG: 'console:log',
    CONSOLE_ERROR: 'console:error',
    CONSOLE_WARN: 'console:warn',
    FILE_WRITE: 'file:write',
    NETWORK_SEND: 'network:send',
    UI_DISPLAY: 'ui:display',
    AGENT_MEMORY: 'agent:memory'
  },

  shells: new Map(),
  listeners: new Set(),

  generateId(type) {
    return `shell:${type}:${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  },

  register(config) {
    const shell = {
      id: config.id || this.generateId(config.type),
      type: config.type,
      name: config.name || `${config.type} Shell`,
      description: config.description || '',
      executionContext: config.executionContext || this.EXECUTION_CONTEXTS.USER,
      inputSources: config.inputSources || [this.INPUT_SOURCES.USER_KEYBOARD],
      outputDestinations: config.outputDestinations || [this.OUTPUT_DESTINATIONS.CONSOLE_LOG],
      backingService: config.backingService || null,
      parentId: config.parentId || null,
      status: 'idle',
      createdAt: new Date().toISOString(),
      metadata: config.metadata || {}
    };

    this.shells.set(shell.id, shell);
    this.notify('register', shell);
    console.log(`[ShellRegistry] Registered: ${shell.id} (${shell.type})`);
    return shell;
  },

  unregister(shellId) {
    const shell = this.shells.get(shellId);
    if (shell) {
      this.shells.delete(shellId);
      this.notify('unregister', shell);
      console.log(`[ShellRegistry] Unregistered: ${shellId}`);
      return true;
    }
    return false;
  },

  get(shellId) {
    return this.shells.get(shellId);
  },

  getByType(type) {
    return Array.from(this.shells.values()).filter(s => s.type === type);
  },

  getByContext(context) {
    return Array.from(this.shells.values()).filter(s => s.executionContext === context);
  },

  getChildren(parentId) {
    return Array.from(this.shells.values()).filter(s => s.parentId === parentId);
  },

  getAll() {
    return Array.from(this.shells.values());
  },

  updateStatus(shellId, status) {
    const shell = this.shells.get(shellId);
    if (shell) {
      shell.status = status;
      shell.lastStatusChange = new Date().toISOString();
      this.notify('statusChange', shell);
      return true;
    }
    return false;
  },

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  },

  notify(event, data) {
    this.listeners.forEach(cb => {
      try {
        cb(event, data);
      } catch (e) {
        console.error('[ShellRegistry] Listener error:', e);
      }
    });
  },

  getStats() {
    const shells = this.getAll();
    return {
      total: shells.length,
      byType: Object.values(this.SHELL_TYPES).reduce((acc, type) => {
        acc[type] = shells.filter(s => s.type === type).length;
        return acc;
      }, {}),
      byContext: Object.values(this.EXECUTION_CONTEXTS).reduce((acc, ctx) => {
        acc[ctx] = shells.filter(s => s.executionContext === ctx).length;
        return acc;
      }, {}),
      byStatus: shells.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {})
    };
  },

  describeShell(shellId) {
    const shell = this.shells.get(shellId);
    if (!shell) return null;

    return {
      ...shell,
      inputDescription: shell.inputSources.map(s => {
        const [category, type] = s.split(':');
        return `${type} (${category})`;
      }).join(', '),
      outputDescription: shell.outputDestinations.map(d => {
        const [category, type] = d.split(':');
        return `${type} (${category})`;
      }).join(', '),
      contextDescription: this.describeContext(shell.executionContext),
      typeDescription: this.describeType(shell.type)
    };
  },

  describeType(type) {
    const descriptions = {
      [this.SHELL_TYPES.TERMINAL]: 'Primary command-line interface for user commands',
      [this.SHELL_TYPES.CODE_NINJA]: 'IDE-integrated shell for code execution and debugging',
      [this.SHELL_TYPES.MICRO_TERMINAL]: 'Lightweight embedded terminal for quick commands',
      [this.SHELL_TYPES.POD_SHELL]: 'Isolated execution environment for compute pods',
      [this.SHELL_TYPES.AI_SHELL]: 'AI-powered conversational interface',
      [this.SHELL_TYPES.WASM_SHELL]: 'WebAssembly runtime execution environment'
    };
    return descriptions[type] || 'Unknown shell type';
  },

  describeContext(context) {
    const descriptions = {
      [this.EXECUTION_CONTEXTS.USER]: 'Runs with user permissions and direct interaction',
      [this.EXECUTION_CONTEXTS.SYSTEM]: 'Runs with elevated system-level access',
      [this.EXECUTION_CONTEXTS.AGENT]: 'Runs on behalf of an AI agent',
      [this.EXECUTION_CONTEXTS.POD]: 'Runs in an isolated compute pod',
      [this.EXECUTION_CONTEXTS.SANDBOX]: 'Runs in a sandboxed environment with no external access'
    };
    return descriptions[context] || 'Unknown context';
  }
};

if (typeof window !== 'undefined') {
  window.ShellRegistry = ShellRegistry;
}

if (typeof module !== 'undefined') {
  module.exports = { ShellRegistry };
}
