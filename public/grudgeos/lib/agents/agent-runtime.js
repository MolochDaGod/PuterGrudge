/**
 * Agent Runtime Controller
 * Manages autonomous AI agent lifecycle, identity, presence, and task delegation
 */

export class AgentRuntime {
  constructor() {
    this.agents = new Map();
    this.taskQueue = [];
    this.delegationGraph = new Map();
    this.heartbeatInterval = 5000;
    this.kvNamespace = 'agent_runtime';
    this.listeners = new Map();
  }

  async initialize() {
    await this.loadState();
    this.startHeartbeat();
    console.log('[AgentRuntime] Initialized with', this.agents.size, 'agents');
    return this;
  }

  async loadState() {
    if (typeof puter !== 'undefined' && puter.kv) {
      try {
        const state = await puter.kv.get(`${this.kvNamespace}:state`);
        if (state) {
          const data = JSON.parse(state);
          data.agents?.forEach(a => this.agents.set(a.id, a));
          this.taskQueue = data.taskQueue || [];
        }
      } catch (e) {
        console.warn('[AgentRuntime] Failed to load state:', e);
      }
    }
  }

  async saveState() {
    if (typeof puter !== 'undefined' && puter.kv) {
      try {
        const state = {
          agents: Array.from(this.agents.values()),
          taskQueue: this.taskQueue,
          timestamp: Date.now()
        };
        await puter.kv.set(`${this.kvNamespace}:state`, JSON.stringify(state));
      } catch (e) {
        console.warn('[AgentRuntime] Failed to save state:', e);
      }
    }
  }

  createAgent(config) {
    const agent = {
      id: `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: config.name || 'Unnamed Agent',
      type: config.type || 'general',
      specialty: config.specialty || null,
      status: 'idle',
      presence: 'online',
      createdAt: Date.now(),
      lastActive: Date.now(),
      memory: {
        shortTerm: [],
        longTerm: [],
        context: {},
        preferences: {}
      },
      capabilities: config.capabilities || ['chat', 'code', 'analyze'],
      terminals: [],
      pods: [],
      tasks: {
        active: null,
        completed: [],
        failed: []
      },
      stats: {
        tasksCompleted: 0,
        tokensUsed: 0,
        uptime: 0
      }
    };

    this.agents.set(agent.id, agent);
    this.emit('agent:created', agent);
    this.saveState();
    return agent;
  }

  getAgent(id) {
    return this.agents.get(id);
  }

  getAllAgents() {
    return Array.from(this.agents.values());
  }

  getActiveAgents() {
    return this.getAllAgents().filter(a => a.presence === 'online');
  }

  async updateAgentStatus(agentId, status) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      agent.lastActive = Date.now();
      this.emit('agent:status', { agentId, status });
      await this.saveState();
    }
  }

  async updateAgentPresence(agentId, presence) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.presence = presence;
      agent.lastActive = Date.now();
      this.emit('agent:presence', { agentId, presence });
      await this.saveState();
    }
  }

  async addMemory(agentId, type, data) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    const memory = {
      id: `mem_${Date.now()}`,
      type,
      data,
      timestamp: Date.now()
    };

    if (type === 'short') {
      agent.memory.shortTerm.push(memory);
      if (agent.memory.shortTerm.length > 100) {
        agent.memory.shortTerm.shift();
      }
    } else {
      agent.memory.longTerm.push(memory);
    }

    await this.saveAgentMemory(agentId);
  }

  async saveAgentMemory(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    if (typeof puter !== 'undefined' && puter.kv) {
      try {
        await puter.kv.set(
          `${this.kvNamespace}:memory:${agentId}`,
          JSON.stringify(agent.memory)
        );
      } catch (e) {
        console.warn('[AgentRuntime] Failed to save agent memory:', e);
      }
    }
  }

  async loadAgentMemory(agentId) {
    if (typeof puter !== 'undefined' && puter.kv) {
      try {
        const data = await puter.kv.get(`${this.kvNamespace}:memory:${agentId}`);
        if (data) {
          const agent = this.agents.get(agentId);
          if (agent) {
            agent.memory = JSON.parse(data);
          }
        }
      } catch (e) {
        console.warn('[AgentRuntime] Failed to load agent memory:', e);
      }
    }
  }

  createTask(config) {
    const task = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: config.type || 'general',
      priority: config.priority || 'normal',
      description: config.description || '',
      input: config.input || {},
      status: 'pending',
      assignedTo: null,
      delegatedBy: config.delegatedBy || null,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      result: null,
      subtasks: [],
      logs: []
    };

    this.taskQueue.push(task);
    this.emit('task:created', task);
    this.saveState();
    return task;
  }

  async assignTask(taskId, agentId) {
    const task = this.taskQueue.find(t => t.id === taskId);
    const agent = this.agents.get(agentId);

    if (!task || !agent) return null;

    task.assignedTo = agentId;
    task.status = 'assigned';
    agent.tasks.active = taskId;
    agent.status = 'working';

    this.emit('task:assigned', { task, agent });
    await this.saveState();
    return task;
  }

  async startTask(taskId) {
    const task = this.taskQueue.find(t => t.id === taskId);
    if (!task) return null;

    task.status = 'running';
    task.startedAt = Date.now();
    task.logs.push({ time: Date.now(), message: 'Task started' });

    const agent = this.agents.get(task.assignedTo);
    if (agent) {
      agent.status = 'executing';
      this.emit('agent:status', { agentId: agent.id, status: 'executing' });
    }

    this.emit('task:started', task);
    await this.saveState();
    return task;
  }

  async completeTask(taskId, result) {
    const task = this.taskQueue.find(t => t.id === taskId);
    if (!task) return null;

    task.status = 'completed';
    task.completedAt = Date.now();
    task.result = result;
    task.logs.push({ time: Date.now(), message: 'Task completed' });

    const agent = this.agents.get(task.assignedTo);
    if (agent) {
      agent.tasks.completed.push(taskId);
      agent.tasks.active = null;
      agent.status = 'idle';
      agent.stats.tasksCompleted++;
      this.emit('agent:status', { agentId: agent.id, status: 'idle' });
    }

    this.emit('task:completed', task);
    await this.saveState();
    return task;
  }

  async failTask(taskId, error) {
    const task = this.taskQueue.find(t => t.id === taskId);
    if (!task) return null;

    task.status = 'failed';
    task.completedAt = Date.now();
    task.result = { error: error.message || error };
    task.logs.push({ time: Date.now(), message: `Task failed: ${error}` });

    const agent = this.agents.get(task.assignedTo);
    if (agent) {
      agent.tasks.failed.push(taskId);
      agent.tasks.active = null;
      agent.status = 'idle';
    }

    this.emit('task:failed', task);
    await this.saveState();
    return task;
  }

  delegateTask(parentTaskId, childConfig, fromAgentId, toAgentId) {
    const childTask = this.createTask({
      ...childConfig,
      delegatedBy: fromAgentId
    });

    if (!this.delegationGraph.has(parentTaskId)) {
      this.delegationGraph.set(parentTaskId, []);
    }
    this.delegationGraph.get(parentTaskId).push(childTask.id);

    const parentTask = this.taskQueue.find(t => t.id === parentTaskId);
    if (parentTask) {
      parentTask.subtasks.push(childTask.id);
    }

    if (toAgentId) {
      this.assignTask(childTask.id, toAgentId);
    }

    this.emit('task:delegated', { parent: parentTaskId, child: childTask });
    return childTask;
  }

  bindTerminal(agentId, terminalId) {
    const agent = this.agents.get(agentId);
    if (agent && !agent.terminals.includes(terminalId)) {
      agent.terminals.push(terminalId);
      this.emit('agent:terminal-bound', { agentId, terminalId });
      this.saveState();
    }
  }

  unbindTerminal(agentId, terminalId) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.terminals = agent.terminals.filter(t => t !== terminalId);
      this.emit('agent:terminal-unbound', { agentId, terminalId });
      this.saveState();
    }
  }

  bindPod(agentId, podId) {
    const agent = this.agents.get(agentId);
    if (agent && !agent.pods.includes(podId)) {
      agent.pods.push(podId);
      this.emit('agent:pod-bound', { agentId, podId });
      this.saveState();
    }
  }

  unbindPod(agentId, podId) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.pods = agent.pods.filter(p => p !== podId);
      this.emit('agent:pod-unbound', { agentId, podId });
      this.saveState();
    }
  }

  startHeartbeat() {
    setInterval(() => {
      const now = Date.now();
      this.agents.forEach(agent => {
        if (agent.presence === 'online') {
          agent.stats.uptime += this.heartbeatInterval / 1000;
          if (now - agent.lastActive > 60000) {
            agent.presence = 'away';
            this.emit('agent:presence', { agentId: agent.id, presence: 'away' });
          }
        }
      });
      this.emit('heartbeat', { timestamp: now, agents: this.getActiveAgents().length });
    }, this.heartbeatInterval);
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
        try { cb(data); } catch (e) { console.error('[AgentRuntime] Event error:', e); }
      });
    }
  }

  async terminateAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.presence = 'offline';
    agent.status = 'terminated';

    this.emit('agent:terminated', agent);
    this.agents.delete(agentId);
    await this.saveState();
  }
}

export const agentRuntime = new AgentRuntime();
