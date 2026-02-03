/**
 * Terminal Orchestrator
 * Manages per-agent micro terminal instances with command streaming and isolation
 */

export class TerminalOrchestrator {
  constructor() {
    this.terminals = new Map();
    this.commandHistory = new Map();
    this.kvNamespace = 'terminal_orchestrator';
    this.maxHistoryPerTerminal = 1000;
    this.listeners = new Map();
  }

  async initialize() {
    await this.loadState();
    console.log('[TerminalOrchestrator] Initialized with', this.terminals.size, 'terminals');
    return this;
  }

  async loadState() {
    if (typeof puter !== 'undefined' && puter.kv) {
      try {
        const state = await puter.kv.get(`${this.kvNamespace}:state`);
        if (state) {
          const data = JSON.parse(state);
          data.terminals?.forEach(t => this.terminals.set(t.id, t));
        }
      } catch (e) {
        console.warn('[TerminalOrchestrator] Failed to load state:', e);
      }
    }
  }

  async saveState() {
    if (typeof puter !== 'undefined' && puter.kv) {
      try {
        const state = {
          terminals: Array.from(this.terminals.values()),
          timestamp: Date.now()
        };
        await puter.kv.set(`${this.kvNamespace}:state`, JSON.stringify(state));
      } catch (e) {
        console.warn('[TerminalOrchestrator] Failed to save state:', e);
      }
    }
  }

  createTerminal(config = {}) {
    const terminal = {
      id: `term_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: config.name || 'Terminal',
      type: config.type || 'bash',
      agentId: config.agentId || null,
      status: 'ready',
      cwd: config.cwd || '/',
      env: { ...config.env },
      createdAt: Date.now(),
      lastActive: Date.now(),
      history: [],
      output: [],
      isRunning: false,
      currentCommand: null,
      quotas: {
        maxCommands: config.maxCommands || 1000,
        maxOutput: config.maxOutput || 100000,
        timeout: config.timeout || 30000
      },
      stats: {
        commandsRun: 0,
        bytesOutput: 0,
        errors: 0
      }
    };

    this.terminals.set(terminal.id, terminal);
    this.commandHistory.set(terminal.id, []);
    this.emit('terminal:created', terminal);
    this.saveState();
    return terminal;
  }

  getTerminal(id) {
    return this.terminals.get(id);
  }

  getAllTerminals() {
    return Array.from(this.terminals.values());
  }

  getTerminalsByAgent(agentId) {
    return this.getAllTerminals().filter(t => t.agentId === agentId);
  }

  async executeCommand(terminalId, command) {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      throw new Error('Terminal not found');
    }

    if (terminal.isRunning) {
      throw new Error('Terminal is busy');
    }

    if (terminal.stats.commandsRun >= terminal.quotas.maxCommands) {
      throw new Error('Command quota exceeded');
    }

    terminal.isRunning = true;
    terminal.currentCommand = command;
    terminal.lastActive = Date.now();

    const entry = {
      id: `cmd_${Date.now()}`,
      command,
      timestamp: Date.now(),
      status: 'running',
      output: '',
      exitCode: null,
      duration: 0
    };

    terminal.history.push(entry);
    this.emit('terminal:command-start', { terminalId, entry });

    try {
      const result = await this.runCommand(terminal, command);
      entry.output = result.output;
      entry.exitCode = result.exitCode;
      entry.status = result.exitCode === 0 ? 'success' : 'error';
      entry.duration = Date.now() - entry.timestamp;

      terminal.output.push({
        type: 'command',
        content: command,
        timestamp: entry.timestamp
      });
      terminal.output.push({
        type: 'output',
        content: result.output,
        exitCode: result.exitCode,
        timestamp: Date.now()
      });

      terminal.stats.commandsRun++;
      terminal.stats.bytesOutput += result.output.length;

      if (result.exitCode !== 0) {
        terminal.stats.errors++;
      }

      this.emit('terminal:command-complete', { terminalId, entry });
    } catch (error) {
      entry.status = 'error';
      entry.output = error.message;
      entry.exitCode = -1;
      entry.duration = Date.now() - entry.timestamp;
      terminal.stats.errors++;
      this.emit('terminal:command-error', { terminalId, entry, error });
    } finally {
      terminal.isRunning = false;
      terminal.currentCommand = null;
      this.saveState();
    }

    return entry;
  }

  async runCommand(terminal, command) {
    const sanitized = this.sanitizeCommand(command);
    
    return new Promise((resolve) => {
      const lines = [];
      const startTime = Date.now();
      
      const mockExecution = () => {
        if (sanitized.startsWith('echo ')) {
          lines.push(sanitized.slice(5));
        } else if (sanitized === 'pwd') {
          lines.push(terminal.cwd);
        } else if (sanitized === 'whoami') {
          lines.push(`agent:${terminal.agentId || 'system'}`);
        } else if (sanitized.startsWith('cd ')) {
          const newDir = sanitized.slice(3).trim();
          terminal.cwd = newDir.startsWith('/') ? newDir : `${terminal.cwd}/${newDir}`;
          lines.push(`Changed directory to ${terminal.cwd}`);
        } else if (sanitized === 'ls') {
          lines.push('src/  package.json  README.md  node_modules/');
        } else if (sanitized === 'date') {
          lines.push(new Date().toISOString());
        } else if (sanitized === 'uptime') {
          const uptime = Math.floor((Date.now() - terminal.createdAt) / 1000);
          lines.push(`Terminal uptime: ${uptime}s`);
        } else if (sanitized.startsWith('export ')) {
          const [key, value] = sanitized.slice(7).split('=');
          terminal.env[key] = value?.replace(/['"]/g, '') || '';
          lines.push(`Set ${key}=${terminal.env[key]}`);
        } else if (sanitized === 'env') {
          Object.entries(terminal.env).forEach(([k, v]) => lines.push(`${k}=${v}`));
        } else if (sanitized === 'history') {
          terminal.history.slice(-20).forEach((h, i) => lines.push(`${i + 1}  ${h.command}`));
        } else if (sanitized === 'clear') {
          terminal.output = [];
          lines.push('');
        } else if (sanitized === 'help') {
          lines.push('Available commands: echo, pwd, cd, ls, date, uptime, export, env, history, clear, help');
          lines.push('AI-assisted commands: @analyze, @generate, @debug, @explain');
        } else if (sanitized.startsWith('@')) {
          lines.push(`[AI] Processing: ${sanitized.slice(1)}`);
          lines.push('[AI] Response will be streamed...');
        } else {
          lines.push(`$ ${sanitized}`);
          lines.push(`Simulated output for: ${sanitized}`);
        }

        resolve({
          output: lines.join('\n'),
          exitCode: 0,
          duration: Date.now() - startTime
        });
      };

      setTimeout(mockExecution, 50);
    });
  }

  sanitizeCommand(command) {
    const dangerous = ['rm -rf', 'sudo', 'chmod 777', ':(){:|:&};:', 'mkfs', 'dd if='];
    const lower = command.toLowerCase();
    
    for (const pattern of dangerous) {
      if (lower.includes(pattern)) {
        throw new Error(`Blocked potentially dangerous command: ${pattern}`);
      }
    }
    
    return command.trim();
  }

  writeToTerminal(terminalId, content, type = 'system') {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) return;

    terminal.output.push({
      type,
      content,
      timestamp: Date.now()
    });

    terminal.stats.bytesOutput += content.length;
    this.emit('terminal:output', { terminalId, content, type });
  }

  clearTerminal(terminalId) {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) return;

    terminal.output = [];
    this.emit('terminal:cleared', { terminalId });
    this.saveState();
  }

  getTerminalOutput(terminalId, limit = 100) {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) return [];
    return terminal.output.slice(-limit);
  }

  getCommandHistory(terminalId, limit = 50) {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) return [];
    return terminal.history.slice(-limit);
  }

  async terminateTerminal(terminalId) {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) return;

    terminal.status = 'terminated';
    this.emit('terminal:terminated', terminal);
    this.terminals.delete(terminalId);
    this.commandHistory.delete(terminalId);
    await this.saveState();
  }

  async bindToAgent(terminalId, agentId) {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) return;

    terminal.agentId = agentId;
    this.emit('terminal:bound', { terminalId, agentId });
    await this.saveState();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const idx = callbacks.indexOf(callback);
      if (idx > -1) callbacks.splice(idx, 1);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try { cb(data); } catch (e) { console.error('[TerminalOrchestrator] Event error:', e); }
      });
    }
  }
}

export const terminalOrchestrator = new TerminalOrchestrator();
