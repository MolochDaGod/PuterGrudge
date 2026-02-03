const OperationsRegistry = {
  OPERATION_TYPES: {
    COMMAND: 'command',
    SCRIPT: 'script',
    BUILD: 'build',
    DEPLOY: 'deploy',
    AI_TASK: 'ai-task',
    FILE_OP: 'file-op',
    NETWORK: 'network',
    WASM_EXEC: 'wasm-exec'
  },

  OPERATION_STATUS: {
    PENDING: 'pending',
    QUEUED: 'queued',
    RUNNING: 'running',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
  },

  operations: new Map(),
  history: [],
  maxHistory: 500,
  listeners: new Set(),

  generateId(type) {
    return `op:${type}:${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  },

  create(config) {
    const operation = {
      id: config.id || this.generateId(config.type),
      type: config.type,
      name: config.name || 'Unnamed Operation',
      description: config.description || '',
      shellId: config.shellId || null,
      agentId: config.agentId || null,
      podId: config.podId || null,
      input: config.input || null,
      output: null,
      error: null,
      status: this.OPERATION_STATUS.PENDING,
      progress: 0,
      startTime: null,
      endTime: null,
      createdAt: new Date().toISOString(),
      logs: [],
      metadata: config.metadata || {}
    };

    this.operations.set(operation.id, operation);
    this.notify('created', operation);
    return operation;
  },

  start(operationId) {
    const op = this.operations.get(operationId);
    if (!op) return null;

    op.status = this.OPERATION_STATUS.RUNNING;
    op.startTime = new Date().toISOString();
    this.notify('started', op);
    return op;
  },

  updateProgress(operationId, progress, message) {
    const op = this.operations.get(operationId);
    if (!op) return null;

    op.progress = Math.min(100, Math.max(0, progress));
    if (message) {
      op.logs.push({
        time: new Date().toISOString(),
        message
      });
    }
    this.notify('progress', op);
    return op;
  },

  complete(operationId, output) {
    const op = this.operations.get(operationId);
    if (!op) return null;

    op.status = this.OPERATION_STATUS.COMPLETED;
    op.progress = 100;
    op.output = output;
    op.endTime = new Date().toISOString();
    
    this.archiveOperation(op);
    this.notify('completed', op);
    return op;
  },

  fail(operationId, error) {
    const op = this.operations.get(operationId);
    if (!op) return null;

    op.status = this.OPERATION_STATUS.FAILED;
    op.error = typeof error === 'string' ? error : error.message;
    op.endTime = new Date().toISOString();
    
    this.archiveOperation(op);
    this.notify('failed', op);
    return op;
  },

  cancel(operationId) {
    const op = this.operations.get(operationId);
    if (!op) return null;

    op.status = this.OPERATION_STATUS.CANCELLED;
    op.endTime = new Date().toISOString();
    
    this.archiveOperation(op);
    this.notify('cancelled', op);
    return op;
  },

  archiveOperation(op) {
    this.history.unshift({
      ...op,
      archivedAt: new Date().toISOString()
    });

    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }

    this.operations.delete(op.id);
  },

  get(operationId) {
    return this.operations.get(operationId) || 
           this.history.find(h => h.id === operationId);
  },

  getActive() {
    return Array.from(this.operations.values());
  },

  getByShell(shellId) {
    return Array.from(this.operations.values())
      .filter(op => op.shellId === shellId);
  },

  getByAgent(agentId) {
    return Array.from(this.operations.values())
      .filter(op => op.agentId === agentId);
  },

  getByPod(podId) {
    return Array.from(this.operations.values())
      .filter(op => op.podId === podId);
  },

  getHistory(limit = 50) {
    return this.history.slice(0, limit);
  },

  getStats() {
    const active = this.getActive();
    return {
      active: active.length,
      byType: active.reduce((acc, op) => {
        acc[op.type] = (acc[op.type] || 0) + 1;
        return acc;
      }, {}),
      byStatus: active.reduce((acc, op) => {
        acc[op.status] = (acc[op.status] || 0) + 1;
        return acc;
      }, {}),
      historySize: this.history.length,
      recentCompleted: this.history.filter(h => h.status === this.OPERATION_STATUS.COMPLETED).length,
      recentFailed: this.history.filter(h => h.status === this.OPERATION_STATUS.FAILED).length
    };
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
        console.error('[OperationsRegistry] Listener error:', e);
      }
    });
  },

  describeOperation(operationId) {
    const op = this.get(operationId);
    if (!op) return null;

    const duration = op.endTime 
      ? new Date(op.endTime) - new Date(op.startTime)
      : op.startTime 
        ? Date.now() - new Date(op.startTime)
        : 0;

    return {
      ...op,
      durationMs: duration,
      durationFormatted: this.formatDuration(duration),
      typeDescription: this.describeType(op.type),
      statusDescription: this.describeStatus(op.status)
    };
  },

  describeType(type) {
    const descriptions = {
      [this.OPERATION_TYPES.COMMAND]: 'Shell command execution',
      [this.OPERATION_TYPES.SCRIPT]: 'Script or code execution',
      [this.OPERATION_TYPES.BUILD]: 'Build or compilation process',
      [this.OPERATION_TYPES.DEPLOY]: 'Deployment operation',
      [this.OPERATION_TYPES.AI_TASK]: 'AI agent task',
      [this.OPERATION_TYPES.FILE_OP]: 'File system operation',
      [this.OPERATION_TYPES.NETWORK]: 'Network request or transfer',
      [this.OPERATION_TYPES.WASM_EXEC]: 'WebAssembly module execution'
    };
    return descriptions[type] || 'Unknown operation type';
  },

  describeStatus(status) {
    const descriptions = {
      [this.OPERATION_STATUS.PENDING]: 'Waiting to start',
      [this.OPERATION_STATUS.QUEUED]: 'In queue',
      [this.OPERATION_STATUS.RUNNING]: 'Currently executing',
      [this.OPERATION_STATUS.PAUSED]: 'Temporarily paused',
      [this.OPERATION_STATUS.COMPLETED]: 'Finished successfully',
      [this.OPERATION_STATUS.FAILED]: 'Failed with error',
      [this.OPERATION_STATUS.CANCELLED]: 'Cancelled by user or system'
    };
    return descriptions[status] || 'Unknown status';
  },

  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }
};

if (typeof window !== 'undefined') {
  window.OperationsRegistry = OperationsRegistry;
}

if (typeof module !== 'undefined') {
  module.exports = { OperationsRegistry };
}
