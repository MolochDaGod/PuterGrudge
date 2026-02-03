class AgentSquad {
  static SQUAD_STATUS = {
    IDLE: 'idle',
    WORKING: 'working',
    WAITING: 'waiting',
    PAUSED: 'paused',
    ERROR: 'error'
  };

  constructor() {
    this.namespace = 'agent_squad';
    this.squads = new Map();
    this.terminals = new Map();
    this.agentRestClients = new Map();
    this.messageQueue = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    await this.loadSquads();
    await this.loadMessageQueue();
    this.setupInterAgentMessaging();
    this.initialized = true;
    console.log('[AgentSquad] Initialized with', this.squads.size, 'squads');
  }

  async loadSquads() {
    if (typeof puter === 'undefined' || !puter.kv) return;
    try {
      const data = await puter.kv.get(`${this.namespace}:squads`);
      if (data) {
        const parsed = JSON.parse(data);
        parsed.forEach(squad => this.squads.set(squad.id, squad));
      }
    } catch (e) {
      console.log('[AgentSquad] No saved squads, starting fresh');
    }
  }

  async saveSquads() {
    if (typeof puter === 'undefined' || !puter.kv) return;
    try {
      const squadsArray = Array.from(this.squads.values());
      await puter.kv.set(`${this.namespace}:squads`, JSON.stringify(squadsArray));
    } catch (e) {
      console.warn('[AgentSquad] Failed to save squads:', e.message);
    }
  }

  async createSquad(config) {
    const squad = {
      id: `squad_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: config.name || 'New Squad',
      agents: config.agents || [],
      leader: config.leader || null,
      terminals: {},
      restCollections: [],
      status: AgentSquad.SQUAD_STATUS.IDLE,
      createdAt: Date.now(),
      lastActive: Date.now(),
      taskQueue: [],
      completedTasks: [],
      sharedContext: {},
      settings: {
        autoAssign: config.autoAssign !== false,
        parallelExecution: config.parallelExecution !== false,
        maxConcurrent: config.maxConcurrent || 3,
        interAgentComm: true
      }
    };

    this.squads.set(squad.id, squad);
    await this.saveSquads();
    return squad;
  }

  async assignAgentToSquad(squadId, agentId) {
    const squad = this.squads.get(squadId);
    if (!squad) throw new Error('Squad not found');

    if (!squad.agents.includes(agentId)) {
      squad.agents.push(agentId);
      const terminal = this.createTerminalForAgent(agentId, squadId);
      squad.terminals[agentId] = terminal;
      squad.lastActive = Date.now();
      
      // Initialize REST client for this agent
      if (typeof window !== 'undefined' && window.AIRestClient) {
        const restClient = new window.AIRestClient(agentId);
        await restClient.initialize();
        this.agentRestClients.set(agentId, restClient);
      }
      
      await this.saveSquads();
    }

    return squad;
  }

  createTerminalForAgent(agentId, squadId) {
    const terminal = {
      id: `term_${agentId}_${squadId}`,
      agentId,
      squadId,
      history: [],
      environment: {},
      cwd: '/',
      status: 'ready',
      createdAt: Date.now()
    };

    this.terminals.set(terminal.id, terminal);
    return terminal;
  }

  async executeCommand(terminalId, command) {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) throw new Error('Terminal not found');

    const execution = {
      id: `exec_${Date.now()}`,
      command,
      startTime: Date.now(),
      status: 'running'
    };

    terminal.history.push(execution);
    terminal.status = 'busy';

    try {
      const result = await this.simulateCommandExecution(command, terminal);
      execution.output = result.output;
      execution.exitCode = result.exitCode;
      execution.status = 'completed';
      execution.endTime = Date.now();
    } catch (error) {
      execution.output = error.message;
      execution.exitCode = 1;
      execution.status = 'error';
      execution.endTime = Date.now();
    }

    terminal.status = 'ready';
    return execution;
  }

  async simulateCommandExecution(command, terminal) {
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    const builtins = {
      'echo': () => ({ output: args.join(' '), exitCode: 0 }),
      'pwd': () => ({ output: terminal.cwd, exitCode: 0 }),
      'cd': () => {
        const dir = args[0] || '/';
        terminal.cwd = dir;
        return { output: '', exitCode: 0 };
      },
      'ls': () => ({ output: 'agent-config.json  tasks/  shared/  output/', exitCode: 0 }),
      'env': () => ({ output: Object.entries(terminal.environment).map(([k,v]) => `${k}=${v}`).join('\n') || '(no environment variables)', exitCode: 0 }),
      'export': () => {
        const [key, value] = args[0]?.split('=') || [];
        if (key) terminal.environment[key] = value || '';
        return { output: '', exitCode: 0 };
      },
      'clear': () => {
        terminal.history = [];
        return { output: '', exitCode: 0 };
      },
      'help': () => ({
        output: `Available commands:
  echo <text>     - Print text
  pwd             - Print working directory
  cd <dir>        - Change directory
  ls              - List files
  env             - Show environment variables
  export KEY=VAL  - Set environment variable
  clear           - Clear terminal
  rest <action>   - REST client commands
  agent <action>  - Agent commands
  task <action>   - Task commands`,
        exitCode: 0
      }),
      'rest': async () => await this.handleRestCommand(args, terminal),
      'agent': async () => await this.handleAgentCommand(args, terminal),
      'task': async () => await this.handleTaskCommand(args, terminal)
    };

    const handler = builtins[cmd];
    if (handler) {
      return await handler();
    }

    return { output: `${cmd}: command not found`, exitCode: 127 };
  }

  async handleRestCommand(args, terminal) {
    const action = args[0];
    
    // Get or create AIRestClient for this agent using unified helper
    const client = await this.getOrCreateRestClient(terminal.agentId);
    
    const restActions = {
      'list': () => {
        if (!client || client.collections.length === 0) {
          return { output: 'No REST collections. Use: rest new <name>', exitCode: 0 };
        }
        return { output: client.collections.map(c => `${c.name} (${c.requests.length} requests)`).join('\n'), exitCode: 0 };
      },
      'new': () => {
        const name = args[1] || 'Untitled Collection';
        if (client) {
          const coll = client.createCollection(name);
          return { output: `Created collection: ${name} (ID: ${coll.id})`, exitCode: 0 };
        }
        return { output: 'REST client not available', exitCode: 1 };
      },
      'add': () => {
        const method = (args[1] || 'GET').toUpperCase();
        const url = args[2] || '';
        const name = args.slice(3).join(' ') || `${method} Request`;
        
        if (!client || client.collections.length === 0) {
          return { output: 'Create a collection first: rest new <name>', exitCode: 1 };
        }
        
        const collId = client.collections[client.collections.length - 1].id;
        const req = client.createRequest(collId, { method, url, name });
        return { output: `Added request: ${name} (${method} ${url})`, exitCode: 0 };
      },
      'run': async () => {
        const requestName = args.slice(1).join(' ');
        if (!client) return { output: 'REST client not available', exitCode: 1 };
        
        // Find request by name
        let request = null;
        for (const coll of client.collections) {
          request = coll.requests.find(r => r.name.toLowerCase().includes(requestName.toLowerCase()));
          if (request) break;
        }
        
        if (!request) {
          return { output: `Request not found: ${requestName}`, exitCode: 1 };
        }
        
        try {
          const result = await client.executeRequest(request.id);
          return { output: `Status: ${result.status} ${result.statusText}\nTime: ${result.time}ms\nBody: ${JSON.stringify(result.body, null, 2).substring(0, 500)}`, exitCode: 0 };
        } catch (e) {
          return { output: `Error: ${e.message}`, exitCode: 1 };
        }
      },
      'env': () => {
        const key = args[1];
        const value = args.slice(2).join(' ');
        if (!key) return { output: 'Usage: rest env <key> <value>', exitCode: 1 };
        if (client) {
          client.setVariable(key, value);
          return { output: `Set ${key}=${value}`, exitCode: 0 };
        }
        return { output: 'REST client not available', exitCode: 1 };
      },
      'export': () => {
        if (!client || client.collections.length === 0) {
          return { output: 'No collections to export', exitCode: 1 };
        }
        const collId = client.collections[0].id;
        const exported = client.exportCollection(collId);
        return { output: `Exported: ${JSON.stringify(exported, null, 2).substring(0, 1000)}`, exitCode: 0 };
      },
      'history': () => {
        if (!client || client.history.length === 0) {
          return { output: 'No request history', exitCode: 0 };
        }
        return { output: client.history.slice(0, 10).map(h => `${h.request.method} ${h.request.url} - ${h.response.status}`).join('\n'), exitCode: 0 };
      },
      'help': () => ({
        output: `REST Client Commands:
  rest list              - List all collections
  rest new <name>        - Create new collection
  rest add <method> <url> [name] - Add request
  rest run <request>     - Execute a saved request
  rest env <key> <value> - Set REST environment variable
  rest export            - Export collection as JSON
  rest history           - Show request history`,
        exitCode: 0
      })
    };

    const handler = restActions[action];
    if (handler) {
      const result = await handler();
      return result;
    }
    return { output: `Unknown REST action: ${action}. Try: rest help`, exitCode: 1 };
  }

  async handleAgentCommand(args, terminal) {
    const action = args[0];
    const agentActions = {
      'status': () => {
        const squad = this.getSquadByTerminal(terminal.id);
        const myTasks = squad ? squad.taskQueue.filter(t => t.assignedTo === terminal.agentId).length : 0;
        const msgs = this.getMessagesFor(terminal.agentId);
        return { output: `Agent: ${terminal.agentId}\nStatus: Ready\nAssigned Tasks: ${myTasks}\nUnread Messages: ${msgs.length}`, exitCode: 0 };
      },
      'list': () => {
        const squad = this.getSquadByTerminal(terminal.id);
        if (!squad) return { output: 'No squad assigned', exitCode: 1 };
        return { output: squad.agents.map(a => `- ${a}`).join('\n'), exitCode: 0 };
      },
      'msg': async () => {
        const targetAgent = args[1];
        const message = args.slice(2).join(' ');
        if (!targetAgent || !message) return { output: 'Usage: agent msg <agent-id> <message>', exitCode: 1 };
        const msg = await this.sendInterAgentMessage(terminal.agentId, targetAgent, message, 'chat');
        return { output: `Message sent to ${targetAgent}: "${message}"`, exitCode: 0 };
      },
      'inbox': async () => {
        const msgs = this.getMessagesFor(terminal.agentId);
        if (msgs.length === 0) return { output: 'No messages', exitCode: 0 };
        const output = msgs.map(m => `[${m.from}] ${m.message}`).join('\n');
        await this.markMessagesRead(terminal.agentId);
        return { output, exitCode: 0 };
      },
      'ask': async () => {
        const targetAgent = args[1];
        const question = args.slice(2).join(' ');
        if (!targetAgent || !question) return { output: 'Usage: agent ask <agent-id> <question>', exitCode: 1 };
        
        await this.sendInterAgentMessage(terminal.agentId, targetAgent, question, 'question');
        
        // Simulate AI response using Puter
        if (typeof puter !== 'undefined' && puter.ai) {
          try {
            const response = await puter.ai.chat(`As ${targetAgent}, briefly answer: ${question}`);
            await this.sendInterAgentMessage(targetAgent, terminal.agentId, response, 'answer');
            return { output: `Asked ${targetAgent}: "${question}"\nResponse: ${response}`, exitCode: 0 };
          } catch (e) {
            return { output: `Asked ${targetAgent}: "${question}" (awaiting response)`, exitCode: 0 };
          }
        }
        return { output: `Asked ${targetAgent}: "${question}"`, exitCode: 0 };
      },
      'help': () => ({
        output: `Agent Commands:
  agent status           - Show your status and stats
  agent list             - List agents in squad
  agent msg <id> <text>  - Send message to agent
  agent inbox            - View received messages
  agent ask <id> <question> - Ask agent (gets AI response)`,
        exitCode: 0
      })
    };

    const handler = agentActions[action];
    if (handler) {
      const result = await handler();
      return result;
    }
    return { output: `Unknown agent action: ${action}. Try: agent help`, exitCode: 1 };
  }
  
  getMessagesFor(agentId) {
    return this.messageQueue.filter(m => m.to === agentId && m.status === 'pending');
  }
  
  async markMessagesRead(agentId) {
    this.messageQueue.forEach(m => {
      if (m.to === agentId && m.status === 'pending') {
        m.status = 'read';
      }
    });
    await this.saveMessageQueue();
  }
  
  async saveMessageQueue() {
    if (typeof puter === 'undefined' || !puter.kv) return;
    try {
      await puter.kv.set(`${this.namespace}:messages`, JSON.stringify(this.messageQueue));
    } catch (e) {
      console.warn('[AgentSquad] Failed to save messages:', e.message);
    }
  }
  
  async loadMessageQueue() {
    if (typeof puter === 'undefined' || !puter.kv) return;
    try {
      const data = await puter.kv.get(`${this.namespace}:messages`);
      if (data) {
        this.messageQueue = JSON.parse(data);
      }
    } catch (e) {
      console.log('[AgentSquad] No saved messages');
    }
  }

  async handleTaskCommand(args, terminal) {
    const action = args[0];
    const taskActions = {
      'list': () => {
        const squad = this.getSquadByTerminal(terminal.id);
        if (!squad || squad.taskQueue.length === 0) {
          return { output: 'No pending tasks', exitCode: 0 };
        }
        return { 
          output: squad.taskQueue.map((t, i) => `${i+1}. [${t.status}] ${t.name} ${t.assignedTo ? '-> ' + t.assignedTo : ''}`).join('\n'), 
          exitCode: 0 
        };
      },
      'add': async () => {
        const taskName = args.slice(1).join(' ');
        if (!taskName) return { output: 'Usage: task add <task name>', exitCode: 1 };
        
        const squad = this.getSquadByTerminal(terminal.id);
        if (squad) {
          squad.taskQueue.push({
            id: `task_${Date.now()}`,
            name: taskName,
            status: 'pending',
            assignedTo: null,
            createdBy: terminal.agentId,
            createdAt: Date.now()
          });
          await this.saveSquads();
          return { output: `Task added: ${taskName}`, exitCode: 0 };
        }
        return { output: 'No squad found', exitCode: 1 };
      },
      'claim': async () => {
        const taskIndex = parseInt(args[1]) - 1;
        const squad = this.getSquadByTerminal(terminal.id);
        if (squad && squad.taskQueue[taskIndex]) {
          squad.taskQueue[taskIndex].assignedTo = terminal.agentId;
          squad.taskQueue[taskIndex].status = 'in-progress';
          await this.saveSquads();
          await this.sendInterAgentMessage('system', terminal.agentId, `You claimed: ${squad.taskQueue[taskIndex].name}`, 'task_claim');
          return { output: `Claimed task: ${squad.taskQueue[taskIndex].name}`, exitCode: 0 };
        }
        return { output: 'Task not found', exitCode: 1 };
      },
      'complete': async () => {
        const taskIndex = parseInt(args[1]) - 1;
        const squad = this.getSquadByTerminal(terminal.id);
        if (squad && squad.taskQueue[taskIndex]) {
          const task = squad.taskQueue.splice(taskIndex, 1)[0];
          task.status = 'completed';
          task.completedAt = Date.now();
          task.completedBy = terminal.agentId;
          squad.completedTasks.push(task);
          await this.saveSquads();
          await this.broadcastToSquad(squad.id, `${terminal.agentId} completed: ${task.name}`);
          return { output: `Completed: ${task.name}`, exitCode: 0 };
        }
        return { output: 'Task not found', exitCode: 1 };
      },
      'delegate': async () => {
        const taskIndex = parseInt(args[1]) - 1;
        const targetAgent = args[2];
        const squad = this.getSquadByTerminal(terminal.id);
        if (!targetAgent) return { output: 'Usage: task delegate <num> <agent>', exitCode: 1 };
        if (squad && squad.taskQueue[taskIndex]) {
          squad.taskQueue[taskIndex].assignedTo = targetAgent;
          squad.taskQueue[taskIndex].status = 'assigned';
          await this.saveSquads();
          await this.sendInterAgentMessage(terminal.agentId, targetAgent, `Delegated task: ${squad.taskQueue[taskIndex].name}`, 'task_delegation');
          return { output: `Delegated to ${targetAgent}: ${squad.taskQueue[taskIndex].name}`, exitCode: 0 };
        }
        return { output: 'Task not found', exitCode: 1 };
      },
      'mine': () => {
        const squad = this.getSquadByTerminal(terminal.id);
        if (!squad) return { output: 'No squad found', exitCode: 1 };
        const myTasks = squad.taskQueue.filter(t => t.assignedTo === terminal.agentId);
        if (myTasks.length === 0) return { output: 'No tasks assigned to you', exitCode: 0 };
        return { output: myTasks.map((t, i) => `${i+1}. [${t.status}] ${t.name}`).join('\n'), exitCode: 0 };
      },
      'help': () => ({
        output: `Task Commands:
  task list              - List all pending tasks
  task mine              - List my assigned tasks  
  task add <name>        - Add new task
  task claim <num>       - Claim a task
  task complete <num>    - Mark task complete
  task delegate <num> <agent> - Delegate to agent`,
        exitCode: 0
      })
    };

    const handler = taskActions[action];
    if (handler) {
      const result = await handler();
      return result;
    }
    return { output: `Unknown task action: ${action}. Try: task help`, exitCode: 1 };
  }
  
  async broadcastToSquad(squadId, message) {
    const squad = this.squads.get(squadId);
    if (!squad) return;
    
    for (const agentId of squad.agents) {
      await this.sendInterAgentMessage('system', agentId, message, 'broadcast');
    }
  }

  getSquadByTerminal(terminalId) {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) return null;
    return this.squads.get(terminal.squadId);
  }

  setupInterAgentMessaging() {
    this.messageHandlers = new Map();
  }

  async sendInterAgentMessage(fromAgent, toAgent, message, type = 'text') {
    const msg = {
      id: `msg_${Date.now()}`,
      from: fromAgent,
      to: toAgent,
      message,
      type,
      timestamp: Date.now(),
      status: 'pending'
    };

    this.messageQueue.push(msg);
    
    const handler = this.messageHandlers.get(toAgent);
    if (handler) {
      handler(msg);
      msg.status = 'delivered';
    }

    await this.saveMessageQueue();
    return msg;
  }

  onAgentMessage(agentId, handler) {
    this.messageHandlers.set(agentId, handler);
  }

  async getOrCreateRestClient(agentId) {
    let client = this.agentRestClients.get(agentId);
    if (!client) {
      if (typeof window !== 'undefined' && window.AIRestClient) {
        client = new window.AIRestClient(agentId);
        await client.initialize();
      } else {
        // Provide stub client for non-browser contexts
        client = this.createStubRestClient(agentId);
      }
      this.agentRestClients.set(agentId, client);
    }
    return client;
  }
  
  createStubRestClient(agentId) {
    const stub = {
      agentId,
      collections: [],
      environment: {},
      globalEnvironment: {},
      history: [],
      async initialize() {},
      createCollection(name, description = '') {
        const coll = { 
          id: `coll_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`, 
          name, 
          description,
          requests: [],
          folders: [],
          variables: {},
          createdAt: Date.now()
        };
        this.collections.push(coll);
        return coll;
      },
      createRequest(collId, config) {
        const coll = this.collections.find(c => c.id === collId);
        if (!coll) return null;
        const req = { 
          id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`, 
          name: config.name || 'Request', 
          method: config.method || 'GET', 
          url: config.url || '',
          headers: config.headers || [],
          body: { type: 'none', content: null },
          auth: { type: 'none' },
          queryParams: [],
          createdAt: Date.now()
        };
        coll.requests.push(req);
        return req;
      },
      getRequest(reqId) {
        for (const c of this.collections) {
          const r = c.requests.find(r => r.id === reqId);
          if (r) return r;
        }
        return null;
      },
      async executeRequest(reqId) {
        const req = this.getRequest(reqId);
        const result = { 
          requestId: reqId,
          error: 'REST client stub - no network in this environment', 
          status: 0,
          time: 0,
          timestamp: Date.now()
        };
        if (req) {
          this.history.push({ request: req, response: result });
        }
        return result;
      },
      setVariable(key, val) { this.environment[key] = val; },
      getVariable(key) { return this.environment[key] || this.globalEnvironment[key]; },
      setGlobalVariable(key, val) { this.globalEnvironment[key] = val; },
      getEnvironment() { return { ...this.globalEnvironment, ...this.environment }; },
      exportCollection(collId) {
        const coll = this.collections.find(c => c.id === collId);
        if (!coll) return null;
        return JSON.stringify(coll, null, 2);
      },
      exportAllCollections() {
        return JSON.stringify({ collections: this.collections, environment: this.environment }, null, 2);
      },
      getHistory() { return this.history; },
      clearHistory() { this.history = []; },
      async saveState() {},
      async loadState() {}
    };
    return stub;
  }

  async createRestCollection(agentId, name) {
    const client = await this.getOrCreateRestClient(agentId);
    if (!client) return null;
    return client.createCollection(name);
  }

  async addRequestToCollection(agentId, collectionId, request) {
    const client = await this.getOrCreateRestClient(agentId);
    if (!client) return null;
    return client.createRequest(collectionId, request);
  }

  async executeRequest(agentId, requestId) {
    const client = await this.getOrCreateRestClient(agentId);
    if (!client) throw new Error('REST client not found');
    return await client.executeRequest(requestId);
  }

  interpolateVariables(str, env) {
    if (!str) return str;
    return str.replace(/\{\{(\w+)\}\}/g, (match, key) => env[key] || match);
  }

  runTests(tests, response) {
    if (!tests || tests.length === 0) return [];

    return tests.map(test => {
      try {
        let passed = false;
        switch (test.type) {
          case 'status':
            passed = response.status === parseInt(test.expected);
            break;
          case 'body_contains':
            passed = JSON.stringify(response.body).includes(test.expected);
            break;
          case 'header':
            passed = response.headers[test.header] === test.expected;
            break;
          case 'json_path':
            const value = this.getJsonPath(response.body, test.path);
            passed = value === test.expected;
            break;
          case 'response_time':
            passed = response.time < parseInt(test.expected);
            break;
        }
        return { ...test, passed };
      } catch (e) {
        return { ...test, passed: false, error: e.message };
      }
    });
  }

  getJsonPath(obj, path) {
    return path.split('.').reduce((o, k) => (o || {})[k], obj);
  }

  exportCollection(agentId, collectionId) {
    const client = this.restClients.get(agentId);
    if (!client) return null;

    const collection = client.collections.find(c => c.id === collectionId);
    if (!collection) return null;

    return {
      type: 'agent_squad_collection',
      version: '1.0',
      exportedAt: Date.now(),
      collection: { ...collection },
      environment: { ...client.environment }
    };
  }

  importCollection(agentId, data) {
    if (data.type !== 'agent_squad_collection') {
      throw new Error('Invalid collection format');
    }

    if (!this.restClients.has(agentId)) {
      this.restClients.set(agentId, {
        agentId,
        collections: [],
        environment: {},
        history: []
      });
    }

    const client = this.restClients.get(agentId);
    const newCollection = {
      ...data.collection,
      id: `coll_${Date.now()}`,
      importedAt: Date.now()
    };

    client.collections.push(newCollection);
    Object.assign(client.environment, data.environment || {});

    return newCollection;
  }

  getSquadStatus(squadId) {
    const squad = this.squads.get(squadId);
    if (!squad) return null;

    const agentStatuses = squad.agents.map(agentId => {
      const terminalId = squad.terminals[agentId]?.id;
      const terminal = terminalId ? this.terminals.get(terminalId) : null;
      return {
        agentId,
        terminalStatus: terminal?.status || 'unknown',
        lastCommand: terminal?.history.slice(-1)[0] || null
      };
    });

    return {
      squadId: squad.id,
      name: squad.name,
      status: squad.status,
      agentCount: squad.agents.length,
      agents: agentStatuses,
      pendingTasks: squad.taskQueue.length,
      completedTasks: squad.completedTasks.length,
      lastActive: squad.lastActive
    };
  }

  async delegateTask(squadId, task, targetAgentId = null) {
    const squad = this.squads.get(squadId);
    if (!squad) throw new Error('Squad not found');

    const taskObj = {
      id: `task_${Date.now()}`,
      name: task.name || task,
      description: task.description || '',
      priority: task.priority || 'normal',
      assignedTo: targetAgentId,
      status: targetAgentId ? 'assigned' : 'pending',
      createdAt: Date.now(),
      context: task.context || {}
    };

    if (!targetAgentId && squad.settings.autoAssign) {
      const availableAgent = squad.agents.find(agentId => {
        const termId = squad.terminals[agentId]?.id;
        const term = termId ? this.terminals.get(termId) : null;
        return term?.status === 'ready';
      });

      if (availableAgent) {
        taskObj.assignedTo = availableAgent;
        taskObj.status = 'assigned';
      }
    }

    squad.taskQueue.push(taskObj);
    squad.lastActive = Date.now();
    await this.saveSquads();

    if (taskObj.assignedTo) {
      await this.sendInterAgentMessage('system', taskObj.assignedTo, 
        `New task assigned: ${taskObj.name}`, 'task_assignment');
    }

    return taskObj;
  }

  getAllSquads() {
    return Array.from(this.squads.values()).map(squad => ({
      id: squad.id,
      name: squad.name,
      agentCount: squad.agents.length,
      status: squad.status,
      pendingTasks: squad.taskQueue.length
    }));
  }
}

const agentSquad = new AgentSquad();

if (typeof window !== 'undefined') {
  window.AgentSquad = AgentSquad;
  window.agentSquad = agentSquad;
}

if (typeof module !== 'undefined') {
  module.exports = { AgentSquad, agentSquad };
}
