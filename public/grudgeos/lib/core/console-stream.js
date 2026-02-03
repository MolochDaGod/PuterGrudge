const ConsoleStream = {
  STREAM_TYPES: {
    STDOUT: 'stdout',
    STDERR: 'stderr',
    STDIN: 'stdin',
    LOG: 'log',
    EVENT: 'event',
    SYSTEM: 'system'
  },

  LOG_LEVELS: {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    SUCCESS: 'success'
  },

  streams: new Map(),
  buffers: new Map(),
  subscribers: new Map(),

  generateStreamId(source, channel) {
    return `stream:${source}:${channel}:${Date.now()}`;
  },

  create(config) {
    const streamId = config.id || this.generateStreamId(config.source, config.channel);
    
    const stream = {
      id: streamId,
      source: config.source,
      channel: config.channel || 'default',
      type: config.type || this.STREAM_TYPES.LOG,
      shellId: config.shellId || null,
      maxBufferSize: config.maxBufferSize || 1000,
      createdAt: new Date().toISOString(),
      metadata: config.metadata || {}
    };

    this.streams.set(streamId, stream);
    this.buffers.set(streamId, []);
    this.subscribers.set(streamId, new Set());

    console.log(`[ConsoleStream] Created: ${streamId}`);
    return stream;
  },

  write(streamId, message, level = this.LOG_LEVELS.INFO) {
    const stream = this.streams.get(streamId);
    if (!stream) {
      console.warn(`[ConsoleStream] Stream not found: ${streamId}`);
      return false;
    }

    const entry = {
      id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      level,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      raw: message,
      streamId,
      source: stream.source,
      channel: stream.channel
    };

    const buffer = this.buffers.get(streamId);
    buffer.push(entry);

    if (buffer.length > stream.maxBufferSize) {
      buffer.shift();
    }

    const subs = this.subscribers.get(streamId);
    subs.forEach(cb => {
      try {
        cb(entry);
      } catch (e) {
        console.error('[ConsoleStream] Subscriber error:', e);
      }
    });

    return entry;
  },

  log(streamId, message) {
    return this.write(streamId, message, this.LOG_LEVELS.INFO);
  },

  debug(streamId, message) {
    return this.write(streamId, message, this.LOG_LEVELS.DEBUG);
  },

  warn(streamId, message) {
    return this.write(streamId, message, this.LOG_LEVELS.WARN);
  },

  error(streamId, message) {
    return this.write(streamId, message, this.LOG_LEVELS.ERROR);
  },

  success(streamId, message) {
    return this.write(streamId, message, this.LOG_LEVELS.SUCCESS);
  },

  subscribe(streamId, callback) {
    const subs = this.subscribers.get(streamId);
    if (!subs) {
      console.warn(`[ConsoleStream] Stream not found: ${streamId}`);
      return () => {};
    }

    subs.add(callback);
    return () => subs.delete(callback);
  },

  getBuffer(streamId, limit = 100) {
    const buffer = this.buffers.get(streamId);
    if (!buffer) return [];
    return buffer.slice(-limit);
  },

  clearBuffer(streamId) {
    const buffer = this.buffers.get(streamId);
    if (buffer) {
      buffer.length = 0;
      return true;
    }
    return false;
  },

  destroy(streamId) {
    this.streams.delete(streamId);
    this.buffers.delete(streamId);
    this.subscribers.delete(streamId);
    console.log(`[ConsoleStream] Destroyed: ${streamId}`);
  },

  getStream(streamId) {
    return this.streams.get(streamId);
  },

  getBySource(source) {
    return Array.from(this.streams.values()).filter(s => s.source === source);
  },

  getByShell(shellId) {
    return Array.from(this.streams.values()).filter(s => s.shellId === shellId);
  },

  getAllStreams() {
    return Array.from(this.streams.values());
  },

  createShellStreams(shellId, source) {
    const stdout = this.create({
      source,
      channel: 'stdout',
      type: this.STREAM_TYPES.STDOUT,
      shellId
    });

    const stderr = this.create({
      source,
      channel: 'stderr',
      type: this.STREAM_TYPES.STDERR,
      shellId
    });

    const events = this.create({
      source,
      channel: 'events',
      type: this.STREAM_TYPES.EVENT,
      shellId
    });

    return { stdout, stderr, events };
  },

  formatEntry(entry, options = {}) {
    const { showTimestamp = true, showLevel = true, showSource = false } = options;
    
    let parts = [];
    
    if (showTimestamp) {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      parts.push(`[${time}]`);
    }
    
    if (showLevel) {
      parts.push(`[${entry.level.toUpperCase()}]`);
    }
    
    if (showSource) {
      parts.push(`[${entry.source}:${entry.channel}]`);
    }
    
    parts.push(entry.message);
    
    return parts.join(' ');
  },

  getLevelColor(level) {
    const colors = {
      [this.LOG_LEVELS.DEBUG]: '#8b8b9b',
      [this.LOG_LEVELS.INFO]: '#e8e8ff',
      [this.LOG_LEVELS.WARN]: '#f59e0b',
      [this.LOG_LEVELS.ERROR]: '#ff6b6b',
      [this.LOG_LEVELS.SUCCESS]: '#00ff88'
    };
    return colors[level] || '#e8e8ff';
  }
};

if (typeof window !== 'undefined') {
  window.ConsoleStream = ConsoleStream;
}

if (typeof module !== 'undefined') {
  module.exports = { ConsoleStream };
}
