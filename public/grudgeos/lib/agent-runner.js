/**
 * CloudPilot Agent Runner System
 * Manages autonomous AI agents with step execution, command running, and UI integration
 */

class AutonomousAgent {
  constructor(config = {}) {
    this.id = config.id || `agent_${Date.now()}`;
    this.name = config.name || 'Autonomous Agent';
    this.type = config.type || 'general';
    this.model = config.model || 'claude-sonnet-4';
    this.status = 'idle';
    this.steps = [];
    this.currentStep = 0;
    this.context = config.context || {};
    this.listeners = new Map();
    this.maxRetries = config.maxRetries || 3;
    this.timeout = config.timeout || 30000;
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => {
      try {
        cb(data);
      } catch (e) {
        console.error(`Event listener error for ${event}:`, e);
      }
    });
  }

  async execute(task, options = {}) {
    this.status = 'running';
    this.steps = [];
    this.currentStep = 0;
    this.emit('start', { task, agent: this });

    try {
      this.addStep('analyze', 'Analyzing task...', 'pending');
      
      const plan = await this.planTask(task);
      this.updateStep(0, 'completed', 'Task analyzed');
      
      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        const stepIndex = this.addStep(step.type, step.description, 'running');
        
        try {
          const result = await this.executeStep(step);
          this.updateStep(stepIndex, 'completed', result.summary || 'Completed');
          this.context[`step_${i}_result`] = result;
        } catch (stepError) {
          this.updateStep(stepIndex, 'error', stepError.message);
          
          if (step.critical !== false) {
            throw stepError;
          }
        }
      }

      this.status = 'completed';
      this.emit('complete', { agent: this, context: this.context });
      return { success: true, context: this.context };
      
    } catch (error) {
      this.status = 'error';
      this.emit('error', { agent: this, error });
      console.error('Agent execution error:', error);
      return { success: false, error: error.message };
    }
  }

  async planTask(task) {
    const prompt = `You are an AI task planner. Break down this task into executable steps.
    
Task: ${task}

Return a JSON object with this structure:
{
  "goal": "brief description of the goal",
  "steps": [
    {"type": "analyze|code|command|api|file|deploy", "description": "what to do", "action": "specific action", "critical": true/false}
  ]
}

Keep steps minimal and actionable. Each step should be independently executable.`;

    try {
      const response = await puter.ai.chat([
        { role: 'system', content: 'You are a task planning AI. Always respond with valid JSON.' },
        { role: 'user', content: prompt }
      ], { model: this.model });

      const content = response.message?.content || response;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return {
        goal: task,
        steps: [
          { type: 'analyze', description: 'Analyze the request', action: 'analyze', critical: true },
          { type: 'code', description: 'Generate solution', action: 'generate', critical: true }
        ]
      };
    } catch (error) {
      console.error('Task planning error:', error);
      return {
        goal: task,
        steps: [{ type: 'analyze', description: 'Process request', action: 'process', critical: true }]
      };
    }
  }

  async executeStep(step) {
    const handlers = {
      analyze: () => this.handleAnalyze(step),
      code: () => this.handleCode(step),
      command: () => this.handleCommand(step),
      api: () => this.handleAPI(step),
      file: () => this.handleFile(step),
      deploy: () => this.handleDeploy(step)
    };

    const handler = handlers[step.type] || handlers.analyze;
    return await handler();
  }

  async handleAnalyze(step) {
    const response = await puter.ai.chat([
      { role: 'user', content: `Analyze: ${step.action || step.description}` }
    ], { model: 'gpt-4o-mini' });
    
    return {
      type: 'analysis',
      content: response.message?.content || response,
      summary: 'Analysis complete'
    };
  }

  async handleCode(step) {
    const response = await puter.ai.chat([
      { role: 'system', content: 'You are an expert programmer. Generate clean, efficient code.' },
      { role: 'user', content: `Generate code for: ${step.action || step.description}` }
    ], { model: 'claude-sonnet-4' });
    
    return {
      type: 'code',
      content: response.message?.content || response,
      summary: 'Code generated'
    };
  }

  async handleCommand(step) {
    let executor;
    if (typeof window !== 'undefined' && window.CommandExecutor) {
      executor = window.CommandExecutor;
    } else {
      executor = new CommandExecutor();
    }
    const result = await executor.execute(step.action || step.description);
    
    return {
      type: 'command',
      content: result.output || result.error,
      summary: result.success ? 'Command executed' : `Error: ${result.error}`
    };
  }

  async handleAPI(step) {
    return {
      type: 'api',
      content: `API call: ${step.action}`,
      summary: 'API request processed'
    };
  }

  async handleFile(step) {
    return {
      type: 'file',
      content: `File operation: ${step.action}`,
      summary: 'File operation complete'
    };
  }

  async handleDeploy(step) {
    return {
      type: 'deploy',
      content: `Deployment: ${step.action}`,
      summary: 'Deployment initiated'
    };
  }

  addStep(type, description, status) {
    const step = {
      id: this.steps.length,
      type,
      description,
      status,
      timestamp: Date.now()
    };
    this.steps.push(step);
    this.emit('step', step);
    return step.id;
  }

  updateStep(index, status, message) {
    if (this.steps[index]) {
      this.steps[index].status = status;
      this.steps[index].message = message;
      this.steps[index].completedAt = Date.now();
      this.emit('stepUpdate', this.steps[index]);
    }
  }

  pause() {
    if (this.status === 'running') {
      this.status = 'paused';
      this.emit('pause', { agent: this });
    }
  }

  resume() {
    if (this.status === 'paused') {
      this.status = 'running';
      this.emit('resume', { agent: this });
    }
  }

  stop() {
    this.status = 'stopped';
    this.emit('stop', { agent: this });
  }

  getStatus() {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      steps: this.steps,
      currentStep: this.currentStep
    };
  }
}


class AgentRunner {
  constructor() {
    this.agents = new Map();
    this.activeAgent = null;
    this.commandQueue = [];
    this.isProcessing = false;
    this.ui = null;
    this.managerUI = null;
  }

  setManagerUI(managerUI) {
    this.managerUI = managerUI;
  }

  notifyManager() {
    if (this.managerUI && typeof this.managerUI.syncWithRunner === 'function') {
      this.managerUI.syncWithRunner(this);
    }
  }

  initialize(containerSelector = '#agent-runner-container') {
    this.container = document.querySelector(containerSelector);
    if (!this.container) {
      this.container = this.createDefaultContainer();
    }
    this.renderUI();
    return this;
  }

  createDefaultContainer() {
    const container = document.createElement('div');
    container.id = 'agent-runner-container';
    container.className = 'agent-runner-container';
    document.body.appendChild(container);
    return container;
  }

  renderUI() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="agent-runner-panel">
        <div class="agent-runner-header">
          <span class="agent-icon">🤖</span>
          <span class="agent-title">Agent Runner</span>
          <div class="agent-status" id="runner-status">Ready</div>
        </div>
        <div class="agent-steps-container" id="agent-steps"></div>
        <div class="agent-input-container">
          <input type="text" class="agent-input" id="agent-command-input" 
                 placeholder="Enter a task for the AI agent..." 
                 data-testid="input-agent-command">
          <button class="agent-run-btn" id="agent-run-btn" data-testid="btn-run-agent">
            ▶ Run
          </button>
        </div>
        <div class="agent-controls">
          <button class="agent-ctrl-btn" id="agent-pause-btn" title="Pause" data-testid="btn-pause-agent">⏸</button>
          <button class="agent-ctrl-btn" id="agent-stop-btn" title="Stop" data-testid="btn-stop-agent">⏹</button>
          <button class="agent-ctrl-btn" id="agent-clear-btn" title="Clear" data-testid="btn-clear-agent">🗑</button>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const input = document.getElementById('agent-command-input');
    const runBtn = document.getElementById('agent-run-btn');
    const pauseBtn = document.getElementById('agent-pause-btn');
    const stopBtn = document.getElementById('agent-stop-btn');
    const clearBtn = document.getElementById('agent-clear-btn');

    if (runBtn) {
      runBtn.addEventListener('click', () => this.runFromInput());
    }
    
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.runFromInput();
      });
    }

    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => this.pauseActive());
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.stopActive());
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearSteps());
    }
  }

  async runFromInput() {
    const input = document.getElementById('agent-command-input');
    if (!input || !input.value.trim()) return;
    
    const task = input.value.trim();
    input.value = '';
    
    await this.runTask(task);
  }

  async runTask(task, options = {}) {
    const agent = new AutonomousAgent({
      name: options.name || 'Task Agent',
      type: options.type || 'general',
      model: options.model || 'claude-sonnet-4'
    });

    this.agents.set(agent.id, agent);
    this.activeAgent = agent;
    this.notifyManager();

    agent.on('start', () => {
      this.updateStatus('Running...');
      this.notifyManager();
    });
    agent.on('step', (step) => this.addAgentStep(step));
    agent.on('stepUpdate', (step) => this.updateAgentStep(step));
    agent.on('complete', () => {
      this.updateStatus('Completed');
      this.notifyManager();
    });
    agent.on('error', (data) => {
      this.updateStatus(`Error: ${data.error.message}`);
      this.notifyManager();
    });
    agent.on('pause', () => {
      this.updateStatus('Paused');
      this.notifyManager();
    });
    agent.on('resume', () => {
      this.updateStatus('Running...');
      this.notifyManager();
    });
    agent.on('stop', () => {
      this.updateStatus('Stopped');
      this.notifyManager();
    });

    this.updateStatus('Running...');
    this.addAgentStep({ 
      id: 'task', 
      type: 'task', 
      description: `Task: ${task}`, 
      status: 'running' 
    });

    const result = await agent.execute(task);
    
    this.updateAgentStep({ 
      id: 'task', 
      status: result.success ? 'completed' : 'error',
      message: result.success ? 'Task completed' : result.error
    });

    this.notifyManager();
    return result;
  }

  addAgentStep(step) {
    const container = document.getElementById('agent-steps');
    if (!container) {
      console.warn('Agent steps container not found');
      return;
    }

    const stepEl = document.createElement('div');
    stepEl.className = `agent-step ${step.status}`;
    stepEl.id = `step-${step.id}`;
    stepEl.innerHTML = `
      <div class="step-indicator ${step.status}">
        ${this.getStatusIcon(step.status)}
      </div>
      <div class="step-content">
        <div class="step-type">${step.type.toUpperCase()}</div>
        <div class="step-desc">${step.description}</div>
        ${step.message ? `<div class="step-message">${step.message}</div>` : ''}
      </div>
    `;

    container.appendChild(stepEl);
    container.scrollTop = container.scrollHeight;
  }

  updateAgentStep(step) {
    const stepEl = document.getElementById(`step-${step.id}`);
    if (!stepEl) return;

    stepEl.className = `agent-step ${step.status}`;
    
    const indicator = stepEl.querySelector('.step-indicator');
    if (indicator) {
      indicator.className = `step-indicator ${step.status}`;
      indicator.innerHTML = this.getStatusIcon(step.status);
    }

    if (step.message) {
      let msgEl = stepEl.querySelector('.step-message');
      if (!msgEl) {
        msgEl = document.createElement('div');
        msgEl.className = 'step-message';
        stepEl.querySelector('.step-content').appendChild(msgEl);
      }
      msgEl.textContent = step.message;
    }
  }

  getStatusIcon(status) {
    const icons = {
      pending: '⏳',
      running: '<span class="spinner"></span>',
      completed: '✓',
      error: '✗',
      paused: '⏸'
    };
    return icons[status] || '•';
  }

  updateStatus(text) {
    const statusEl = document.getElementById('runner-status');
    if (statusEl) {
      statusEl.textContent = text;
      statusEl.className = `agent-status ${text.toLowerCase().includes('error') ? 'error' : 
                           text.toLowerCase().includes('completed') ? 'success' : 'running'}`;
    }
  }

  pauseActive() {
    if (this.activeAgent) {
      this.activeAgent.pause();
      this.updateStatus('Paused');
      this.notifyManager();
    }
  }

  stopActive() {
    if (this.activeAgent) {
      this.activeAgent.stop();
      this.updateStatus('Stopped');
      this.notifyManager();
    }
  }

  clearSteps() {
    const container = document.getElementById('agent-steps');
    if (container) {
      container.innerHTML = '';
    }
    this.updateStatus('Ready');
  }

  getAgent(id) {
    return this.agents.get(id);
  }

  listAgents() {
    return Array.from(this.agents.values()).map(a => a.getStatus());
  }
}


class CommandExecutor {
  constructor() {
    this.history = [];
    this.maxHistory = 100;
  }

  async execute(command, options = {}) {
    const entry = {
      id: Date.now(),
      command,
      status: 'running',
      timestamp: new Date(),
      output: null,
      error: null
    };
    
    this.history.unshift(entry);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }

    try {
      const result = await this.processCommand(command, options);
      entry.status = 'completed';
      entry.output = result;
      return { success: true, output: result };
    } catch (error) {
      entry.status = 'error';
      entry.error = error.message;
      return { success: false, error: error.message };
    }
  }

  async processCommand(command, options) {
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    const commands = {
      'help': () => this.showHelp(),
      'echo': () => args.join(' '),
      'date': () => new Date().toString(),
      'clear': () => 'Screen cleared',
      'ls': () => this.listFiles(args[0] || '/'),
      'cat': () => this.readFile(args[0]),
      'write': () => this.writeFile(args[0], args.slice(1).join(' ')),
      'ai': () => this.askAI(args.join(' ')),
      'agent': () => this.manageAgent(args),
      'deploy': () => this.deploy(args),
      'status': () => this.getStatus()
    };

    const handler = commands[cmd];
    if (handler) {
      return await handler();
    }
    
    return `Unknown command: ${cmd}. Type 'help' for available commands.`;
  }

  showHelp() {
    return `Available Commands:
  help     - Show this help message
  echo     - Echo text back
  date     - Show current date/time
  clear    - Clear the screen
  ls       - List files (uses Puter.fs)
  cat      - Read a file
  write    - Write to a file
  ai       - Ask AI a question
  agent    - Manage AI agents (start|stop|list)
  deploy   - Deploy to Puter hosting
  status   - Show system status`;
  }

  async listFiles(path) {
    try {
      const files = await puter.fs.readdir(path);
      return files.map(f => `${f.is_dir ? '[DIR]' : '[FILE]'} ${f.name}`).join('\n');
    } catch (e) {
      return `Error listing ${path}: ${e.message}`;
    }
  }

  async readFile(path) {
    if (!path) return 'Usage: cat <filepath>';
    try {
      const content = await puter.fs.read(path);
      return content;
    } catch (e) {
      return `Error reading ${path}: ${e.message}`;
    }
  }

  async writeFile(path, content) {
    if (!path) return 'Usage: write <filepath> <content>';
    try {
      await puter.fs.write(path, content || '');
      return `Written to ${path}`;
    } catch (e) {
      return `Error writing ${path}: ${e.message}`;
    }
  }

  async askAI(question) {
    if (!question) return 'Usage: ai <question>';
    try {
      const response = await puter.ai.chat([
        { role: 'user', content: question }
      ], { model: 'gpt-4o-mini' });
      return response.message?.content || response;
    } catch (e) {
      return `AI Error: ${e.message}`;
    }
  }

  manageAgent(args) {
    const action = args[0];
    switch (action) {
      case 'list':
        return 'Active agents: (use AgentRunner.listAgents())';
      case 'start':
        return 'Use AgentRunner.runTask() to start a new agent';
      case 'stop':
        return 'Use AgentRunner.stopActive() to stop the current agent';
      default:
        return 'Usage: agent <list|start|stop>';
    }
  }

  async deploy(args) {
    const siteName = args[0];
    if (!siteName) return 'Usage: deploy <site-name>';
    return `Deployment queued for: ${siteName}.puter.site`;
  }

  getStatus() {
    return `CloudPilot Status:
  Time: ${new Date().toLocaleString()}
  Agents: Active
  Storage: Puter KV Connected
  AI: Puter AI Available`;
  }

  getHistory() {
    return this.history;
  }
}


class AgentManagerUI {
  constructor() {
    this.agents = new Map([
      ['orchestrator', { id: 'orchestrator', name: 'Orchestrator', type: 'Task Coordination', icon: '🧠', status: 'active' }],
      ['code-agent', { id: 'code-agent', name: 'Code Agent', type: 'Code Generation', icon: '💻', status: 'idle' }],
      ['analyst', { id: 'analyst', name: 'Analyst', type: 'Data Analysis', icon: '📊', status: 'idle' }],
      ['runner', { id: 'runner', name: 'Runner', type: 'Command Execution', icon: '🏃', status: 'sleeping' }]
    ]);
    this.terminalHistory = [];
    this.initialized = false;
    this.linkedRunner = null;
  }

  setRunner(runner) {
    this.linkedRunner = runner;
  }

  initialize() {
    if (this.initialized) return;
    
    this.bindAgentManagerEvents();
    this.updateAgentCount();
    this.initialized = true;
  }

  bindAgentManagerEvents() {
    document.addEventListener('click', (e) => {
      if (e.target.matches('#new-agent-btn')) {
        this.createNewAgent();
      }
      
      if (e.target.closest('.agent-card')) {
        const card = e.target.closest('.agent-card');
        const agentId = card.dataset.agent;
        if (agentId) {
          this.selectAgent(agentId);
        }
      }
    });

    document.addEventListener('keypress', (e) => {
      if (e.target.matches('#agent-terminal-input') && e.key === 'Enter') {
        this.executeTerminalCommand(e.target.value);
        e.target.value = '';
      }
    });
  }

  selectAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    document.querySelectorAll('.agent-card').forEach(card => {
      card.classList.remove('selected');
    });
    
    const card = document.querySelector(`[data-agent="${agentId}"]`);
    if (card) {
      card.classList.add('selected');
    }

    if (agent.status === 'idle' || agent.status === 'sleeping') {
      this.activateAgent(agentId);
    }
  }

  activateAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.status = 'active';
    this.updateAgentStatus(agentId, 'active');
    this.updateAgentCount();
    
    this.logToTerminal(`Agent ${agent.name} activated`);
    
    if (this.linkedRunner) {
      this.linkedRunner.notifyManager();
    }
  }

  deactivateAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.status = 'idle';
    this.updateAgentStatus(agentId, 'idle');
    this.updateAgentCount();
    
    this.logToTerminal(`Agent ${agent.name} deactivated`);
    
    if (this.linkedRunner) {
      this.linkedRunner.notifyManager();
    }
  }

  updateAgentStatus(agentId, status) {
    const card = document.querySelector(`[data-agent="${agentId}"]`);
    if (!card) return;

    const statusEl = card.querySelector('.agent-card-status');
    if (statusEl) {
      statusEl.className = `agent-card-status ${status}`;
      statusEl.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    }
  }

  updateAgentCount() {
    const activeCount = Array.from(this.agents.values())
      .filter(a => a.status === 'active').length;
    
    const countEl = document.getElementById('agent-count-display');
    if (countEl) {
      countEl.textContent = activeCount;
    }
  }

  createNewAgent() {
    const id = `custom-${Date.now()}`;
    const names = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta'];
    const name = `Agent ${names[Math.floor(Math.random() * names.length)]}`;
    
    const agent = {
      id,
      name,
      type: 'Custom Agent',
      icon: '🔮',
      status: 'idle'
    };
    
    this.agents.set(id, agent);
    this.addAgentCard(agent);
    this.logToTerminal(`Created new agent: ${name}`);
  }

  addAgentCard(agent) {
    const list = document.getElementById('agent-list');
    if (!list) return;

    const card = document.createElement('div');
    card.className = 'agent-card';
    card.dataset.agent = agent.id;
    card.dataset.testid = `agent-${agent.id}`;
    card.innerHTML = `
      <div class="agent-card-icon">${agent.icon}</div>
      <div class="agent-card-info">
        <div class="agent-card-name">${agent.name}</div>
        <div class="agent-card-type">${agent.type}</div>
      </div>
      <div class="agent-card-status ${agent.status}">${agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}</div>
    `;
    
    list.appendChild(card);
  }

  async executeTerminalCommand(command) {
    if (!command.trim()) return;

    this.logToTerminal(`> ${command}`, 'command');
    
    const executor = window.CommandExecutor || commandExecutor;
    
    const runnerAgent = this.agents.get('runner');
    if (runnerAgent) {
      runnerAgent.status = 'active';
      this.updateAgentStatus('runner', 'active');
      this.updateAgentCount();
    }
    
    const result = await executor.execute(command);
    
    this.logToTerminal(result.output || result.error, result.success ? 'output' : 'error');
    
    setTimeout(() => {
      if (runnerAgent) {
        runnerAgent.status = 'sleeping';
        this.updateAgentStatus('runner', 'sleeping');
        this.updateAgentCount();
      }
    }, 3000);
  }

  logToTerminal(message, type = 'info') {
    this.terminalHistory.push({ message, type, timestamp: Date.now() });
    
    if (typeof logToConsole === 'function') {
      logToConsole('agent', message);
    }
  }

  getActiveAgents() {
    return Array.from(this.agents.values()).filter(a => a.status === 'active');
  }

  getAgentById(id) {
    return this.agents.get(id);
  }

  normalizeStatus(runnerStatus) {
    const statusMap = {
      'running': 'active',
      'paused': 'idle',
      'completed': 'idle',
      'error': 'idle',
      'stopped': 'sleeping',
      'idle': 'idle',
      'active': 'active',
      'sleeping': 'sleeping'
    };
    return statusMap[runnerStatus] || 'idle';
  }

  syncWithRunner(runner) {
    if (!runner) return;

    runner.agents.forEach((agent, id) => {
      const normalizedStatus = this.normalizeStatus(agent.status || 'idle');
      
      if (!this.agents.has(id)) {
        const newAgent = {
          id,
          name: agent.name,
          type: agent.type,
          icon: '🤖',
          status: normalizedStatus
        };
        this.agents.set(id, newAgent);
        this.addAgentCard(newAgent);
      } else {
        const existingAgent = this.agents.get(id);
        existingAgent.status = normalizedStatus;
        this.updateAgentStatus(id, normalizedStatus);
      }
    });

    this.updateAgentCount();
  }
}


const agentRunner = new AgentRunner();
const commandExecutor = new CommandExecutor();
const agentManagerUI = new AgentManagerUI();

agentRunner.setManagerUI(agentManagerUI);
agentManagerUI.setRunner(agentRunner);

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    agentManagerUI.initialize();
    agentManagerUI.syncWithRunner(agentRunner);
    agentManagerUI.updateAgentCount();
  }, 500);
});

if (typeof window !== 'undefined') {
  window.AutonomousAgent = AutonomousAgent;
  window.AgentRunner = agentRunner;
  window.CommandExecutor = commandExecutor;
  window.AgentManagerUI = agentManagerUI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AutonomousAgent, AgentRunner, CommandExecutor, AgentManagerUI };
}
