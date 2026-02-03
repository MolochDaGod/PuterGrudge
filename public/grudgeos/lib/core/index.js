const CoreSystems = {
  initialized: false,
  
  async initialize() {
    if (this.initialized) return;

    console.log('[GrudgeOS Core] Initializing core systems...');

    if (typeof window !== 'undefined') {
      window.ShellRegistry = window.ShellRegistry || {};
      window.ConsoleStream = window.ConsoleStream || {};
      window.OperationsRegistry = window.OperationsRegistry || {};
    }

    this.initialized = true;
    console.log('[GrudgeOS Core] Core systems initialized');
  },

  getShellRegistry() {
    return typeof window !== 'undefined' ? window.ShellRegistry : null;
  },

  getConsoleStream() {
    return typeof window !== 'undefined' ? window.ConsoleStream : null;
  },

  getOperationsRegistry() {
    return typeof window !== 'undefined' ? window.OperationsRegistry : null;
  },

  createShellWithStreams(config) {
    const ShellRegistry = this.getShellRegistry();
    const ConsoleStream = this.getConsoleStream();

    if (!ShellRegistry || !ConsoleStream) {
      console.error('[GrudgeOS Core] Core systems not available');
      return null;
    }

    const shell = ShellRegistry.register(config);
    const streams = ConsoleStream.createShellStreams(shell.id, config.type);

    return {
      shell,
      streams,
      stdout: (msg) => ConsoleStream.log(streams.stdout.id, msg),
      stderr: (msg) => ConsoleStream.error(streams.stderr.id, msg),
      event: (msg) => ConsoleStream.log(streams.events.id, msg),
      getBuffer: (channel = 'stdout') => {
        const stream = channel === 'stderr' ? streams.stderr : 
                       channel === 'events' ? streams.events : streams.stdout;
        return ConsoleStream.getBuffer(stream.id);
      },
      subscribe: (channel, callback) => {
        const stream = channel === 'stderr' ? streams.stderr : 
                       channel === 'events' ? streams.events : streams.stdout;
        return ConsoleStream.subscribe(stream.id, callback);
      },
      destroy: () => {
        ConsoleStream.destroy(streams.stdout.id);
        ConsoleStream.destroy(streams.stderr.id);
        ConsoleStream.destroy(streams.events.id);
        ShellRegistry.unregister(shell.id);
      }
    };
  },

  createOperation(config) {
    const OperationsRegistry = this.getOperationsRegistry();
    const ConsoleStream = this.getConsoleStream();

    if (!OperationsRegistry) {
      console.error('[GrudgeOS Core] Operations registry not available');
      return null;
    }

    const operation = OperationsRegistry.create(config);
    
    let logStream = null;
    if (ConsoleStream) {
      logStream = ConsoleStream.create({
        source: 'operation',
        channel: operation.id,
        type: ConsoleStream.STREAM_TYPES.LOG,
        shellId: config.shellId
      });
    }

    return {
      operation,
      logStream,
      start: () => OperationsRegistry.start(operation.id),
      progress: (pct, msg) => {
        OperationsRegistry.updateProgress(operation.id, pct, msg);
        if (logStream) ConsoleStream.log(logStream.id, msg);
      },
      complete: (output) => {
        OperationsRegistry.complete(operation.id, output);
        if (logStream) ConsoleStream.success(logStream.id, 'Operation completed');
      },
      fail: (error) => {
        OperationsRegistry.fail(operation.id, error);
        if (logStream) ConsoleStream.error(logStream.id, `Error: ${error}`);
      },
      cancel: () => {
        OperationsRegistry.cancel(operation.id);
        if (logStream) ConsoleStream.warn(logStream.id, 'Operation cancelled');
      },
      log: (msg) => logStream && ConsoleStream.log(logStream.id, msg),
      getLogs: () => logStream ? ConsoleStream.getBuffer(logStream.id) : []
    };
  },

  getSystemStatus() {
    const ShellRegistry = this.getShellRegistry();
    const OperationsRegistry = this.getOperationsRegistry();
    const ConsoleStream = this.getConsoleStream();

    return {
      initialized: this.initialized,
      shells: ShellRegistry ? ShellRegistry.getStats() : null,
      operations: OperationsRegistry ? OperationsRegistry.getStats() : null,
      streams: ConsoleStream ? ConsoleStream.getAllStreams().length : 0
    };
  }
};

if (typeof window !== 'undefined') {
  window.GrudgeCore = CoreSystems;
}

if (typeof module !== 'undefined') {
  module.exports = { CoreSystems };
}
