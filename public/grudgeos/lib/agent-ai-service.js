/**
 * Agent AI Service
 * Routes all agent AI operations through PuterService
 * Provides specialized AI capabilities for each agent type
 */

class AgentAIService {
  constructor() {
    this.agentConfigs = {
      'orchestrator': {
        systemPrompt: `You are the Orchestrator Agent, the central coordinator for CloudPilot AI Studio.
Your responsibilities:
- Coordinate tasks between other agents
- Break down complex requests into subtasks
- Monitor agent status and workload
- Make strategic decisions about task routing
Be efficient, decisive, and clear in your responses.`,
        model: 'gpt-4o',
        color: '#8b5cf6'
      },
      'code-agent': {
        systemPrompt: `You are the Code Agent, an expert programmer in CloudPilot AI Studio.
Your responsibilities:
- Write clean, efficient code in any language
- Debug and fix code issues
- Explain code and suggest improvements
- Generate code from descriptions
Always return working code with proper formatting.`,
        model: 'gpt-4o',
        color: '#00ff88'
      },
      'art-agent': {
        systemPrompt: `You are the Art Agent, a creative specialist in CloudPilot AI Studio.
Your responsibilities:
- Generate image descriptions and prompts
- Suggest color schemes and design improvements
- Create SVG graphics and icons
- Advise on UI/UX design
Be creative, visual, and inspiring.`,
        model: 'gpt-4o-mini',
        color: '#ff00aa'
      },
      'analyst': {
        systemPrompt: `You are the Analyst Agent, a data and research specialist in CloudPilot AI Studio.
Your responsibilities:
- Analyze data and provide insights
- Research topics and summarize findings
- Generate reports and documentation
- Monitor metrics and trends
Be thorough, accurate, and data-driven.`,
        model: 'gpt-4o',
        color: '#00f5ff'
      },
      'lua-agent': {
        systemPrompt: `You are the Lua Agent, a Lua scripting expert for game development.
Specialize in Roblox, LÖVE2D, and embedded Lua systems.`,
        model: 'gpt-4o',
        color: '#0000ff'
      },
      'rust-agent': {
        systemPrompt: `You are the Rust Agent, an expert in systems programming with Rust.
Focus on memory safety, performance, and async programming.`,
        model: 'gpt-4o',
        color: '#ff6b35'
      },
      'threejs-agent': {
        systemPrompt: `You are the Three.js Agent, an expert in 3D web graphics.
Specialize in Three.js, WebGL, shaders, and 3D math.`,
        model: 'gpt-4o',
        color: '#00ff00'
      }
    };
    
    this.conversationHistories = new Map();
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    // Wait for PuterService
    await this._waitForPuterService();
    
    // Load conversation histories from storage
    await this._loadHistories();
    
    this.initialized = true;
    console.log('[AgentAIService] Initialized with', Object.keys(this.agentConfigs).length, 'agents');
  }

  async _waitForPuterService(timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (typeof window !== 'undefined' && window.PuterService?.ready) {
        return true;
      }
      await new Promise(r => setTimeout(r, 100));
    }
    console.warn('[AgentAIService] PuterService not available, continuing with limited functionality');
    return false;
  }

  async _loadHistories() {
    if (!window.PuterService?.isOnline()) return;
    
    for (const agentId of Object.keys(this.agentConfigs)) {
      try {
        const memory = await window.PuterService.loadAgentMemory(agentId);
        if (memory?.conversations) {
          this.conversationHistories.set(agentId, memory.conversations.slice(-20));
        }
      } catch (e) {
        console.warn(`[AgentAIService] Failed to load history for ${agentId}`);
      }
    }
  }

  async _saveHistory(agentId) {
    if (!window.PuterService?.isOnline()) return;
    
    try {
      const history = this.conversationHistories.get(agentId) || [];
      const memory = await window.PuterService.loadAgentMemory(agentId);
      memory.conversations = history.slice(-20);
      memory.lastActive = new Date().toISOString();
      await window.PuterService.saveAgentMemory(agentId, memory);
    } catch (e) {
      console.warn(`[AgentAIService] Failed to save history for ${agentId}`);
    }
  }

  /**
   * Send a message to an agent and get a response
   */
  async chat(agentId, message, options = {}) {
    const config = this.agentConfigs[agentId] || this.agentConfigs['orchestrator'];
    
    // Get or create conversation history
    let history = this.conversationHistories.get(agentId) || [];
    
    // Add user message to history
    history.push({ role: 'user', content: message });
    
    // Build messages array
    const messages = [
      { role: 'system', content: config.systemPrompt },
      ...history.slice(-10) // Keep last 10 messages for context
    ];

    try {
      let response;
      
      if (window.PuterService?.isOnline()) {
        response = await window.PuterService.chat(messages, {
          model: options.model || config.model
        });
      } else {
        response = `[${agentId}] Offline mode - AI unavailable. Message received: "${message.slice(0, 50)}..."`;
      }

      // Add response to history
      history.push({ role: 'assistant', content: response });
      
      // Trim history to last 20 messages
      if (history.length > 20) {
        history = history.slice(-20);
      }
      
      this.conversationHistories.set(agentId, history);
      
      // Save to persistent storage
      this._saveHistory(agentId);

      return {
        agentId,
        response,
        timestamp: new Date().toISOString(),
        model: config.model
      };
    } catch (e) {
      console.error(`[AgentAIService] Chat error for ${agentId}:`, e);
      return {
        agentId,
        response: `Error: ${e.message}`,
        timestamp: new Date().toISOString(),
        error: true
      };
    }
  }

  /**
   * Execute a specific task with an agent
   */
  async executeTask(agentId, task, context = {}) {
    const config = this.agentConfigs[agentId] || this.agentConfigs['orchestrator'];
    
    const taskPrompt = `TASK: ${task}
${context.code ? `\nCODE:\n\`\`\`\n${context.code}\n\`\`\`` : ''}
${context.data ? `\nDATA: ${JSON.stringify(context.data)}` : ''}
${context.requirements ? `\nREQUIREMENTS: ${context.requirements}` : ''}

Execute this task and provide the result.`;

    return this.chat(agentId, taskPrompt);
  }

  /**
   * Get code analysis from Code Agent
   */
  async analyzeCode(code, language = 'javascript') {
    return this.executeTask('code-agent', 'Analyze this code for bugs, improvements, and best practices', {
      code,
      requirements: `Language: ${language}`
    });
  }

  /**
   * Generate code with Code Agent
   */
  async generateCode(description, language = 'javascript') {
    return this.executeTask('code-agent', 'Generate code based on this description', {
      requirements: `${description}\n\nLanguage: ${language}\nReturn only the code, no explanations.`
    });
  }

  /**
   * Get design suggestions from Art Agent
   */
  async getDesignSuggestions(description) {
    return this.executeTask('art-agent', 'Suggest design improvements', {
      requirements: description
    });
  }

  /**
   * Get research/analysis from Analyst
   */
  async analyze(topic, data = null) {
    return this.executeTask('analyst', `Research and analyze: ${topic}`, {
      data
    });
  }

  /**
   * Coordinate multiple agents for a complex task
   */
  async orchestrate(task, options = {}) {
    // First, ask orchestrator to break down the task
    const plan = await this.chat('orchestrator', 
      `Break down this task into subtasks and assign to agents: ${task}
      
Available agents: code-agent, art-agent, analyst
Return as JSON: { "subtasks": [{ "agent": "...", "task": "..." }] }`
    );

    try {
      // Try to parse the plan
      const planJson = JSON.parse(plan.response.match(/\{[\s\S]*\}/)?.[0] || '{}');
      
      if (planJson.subtasks?.length) {
        const results = await Promise.all(
          planJson.subtasks.map(st => this.executeTask(st.agent, st.task))
        );
        
        return {
          plan: planJson,
          results,
          summary: `Completed ${results.length} subtasks`
        };
      }
    } catch (e) {
      console.warn('[AgentAIService] Could not parse orchestration plan');
    }

    // Fallback to single agent response
    return { plan: null, results: [plan], summary: 'Single agent response' };
  }

  /**
   * Clear conversation history for an agent
   */
  clearHistory(agentId) {
    this.conversationHistories.delete(agentId);
    this._saveHistory(agentId);
  }

  /**
   * Get all agent statuses
   */
  getAgentStatuses() {
    return Object.entries(this.agentConfigs).map(([id, config]) => ({
      id,
      name: id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      color: config.color,
      model: config.model,
      historyLength: this.conversationHistories.get(id)?.length || 0,
      online: window.PuterService?.isOnline() || false
    }));
  }

  /**
   * Add or update an agent configuration
   */
  configureAgent(agentId, config) {
    this.agentConfigs[agentId] = {
      ...this.agentConfigs[agentId],
      ...config
    };
  }
}

// Create singleton
const agentAIService = new AgentAIService();

if (typeof window !== 'undefined') {
  window.AgentAIService = agentAIService;
  
  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => agentAIService.init());
  } else {
    agentAIService.init();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AgentAIService, agentAIService };
}
