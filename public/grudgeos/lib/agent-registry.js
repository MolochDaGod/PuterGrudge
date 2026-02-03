class AgentRegistry {
  constructor() {
    this.agents = new Map();
    this.tools = new Map();
    this.initialized = false;
  }

  getDefaultAgents() {
    const basePath = '/grudgeos/assets/agents/';
    return [
      {
        id: 'orchestrator',
        name: 'Orchestrator',
        icon: basePath + 'agent-purple.png',
        iconType: 'image',
        role: 'Task Coordinator',
        description: 'Coordinates complex tasks across multiple agents, breaks down problems, and manages workflows',
        type: 'core',
        status: 'active',
        languages: ['all'],
        preferredModel: 'claude-sonnet-4',
        capabilities: ['task-decomposition', 'workflow-management', 'agent-coordination', 'priority-assignment'],
        learningState: 'ready',
        level: 1,
        xp: 0,
        tasksCompleted: 0
      },
      {
        id: 'code-agent',
        name: 'Code Agent',
        icon: basePath + 'agent-green.png',
        iconType: 'image',
        role: 'Code Generation & Refactoring',
        description: 'Generates, refactors, and optimizes code across multiple languages with best practices',
        type: 'core',
        status: 'active',
        languages: ['javascript', 'typescript', 'python', 'html', 'css'],
        preferredModel: 'claude-sonnet-4',
        capabilities: ['code-generation', 'refactoring', 'debugging', 'optimization', 'documentation'],
        learningState: 'ready',
        level: 1,
        xp: 0,
        tasksCompleted: 0
      },
      {
        id: 'art-agent',
        name: 'Art Agent',
        icon: basePath + 'agent-blue.png',
        iconType: 'image',
        role: 'Visual Design & Assets',
        description: 'Creates visual designs, UI concepts, sprites, and provides artistic direction',
        type: 'core',
        status: 'active',
        languages: ['css', 'svg', 'webgl'],
        preferredModel: 'gpt-4o',
        capabilities: ['ui-design', 'sprite-creation', 'color-theory', 'animation-design', 'asset-generation'],
        learningState: 'ready',
        level: 1,
        xp: 0,
        tasksCompleted: 0
      },
      {
        id: 'analyst',
        name: 'Analyst',
        icon: basePath + 'agent-orange.png',
        iconType: 'image',
        role: 'Data Analysis & Insights',
        description: 'Analyzes data patterns, provides insights, and generates reports with visualizations',
        type: 'core',
        status: 'active',
        languages: ['sql', 'python', 'javascript'],
        preferredModel: 'gemini-2.0-flash',
        capabilities: ['data-analysis', 'pattern-recognition', 'reporting', 'visualization', 'forecasting'],
        learningState: 'ready',
        level: 1,
        xp: 0,
        tasksCompleted: 0
      },
      {
        id: 'lua-agent',
        name: 'Lua Agent',
        icon: basePath + 'agent-red.png',
        iconType: 'image',
        role: 'Lua/Luau Specialist',
        description: 'Expert in Lua scripting, Roblox development, Love2D game framework, and embedded systems',
        type: 'specialist',
        status: 'dormant',
        languages: ['lua', 'luau'],
        preferredModel: 'claude-3.5-sonnet',
        capabilities: ['roblox-dev', 'love2d', 'game-scripting', 'embedded-lua', 'coroutines'],
        tools: ['run-lua', 'lua-lint'],
        learningState: 'ready',
        level: 1,
        xp: 0,
        tasksCompleted: 0
      },
      {
        id: 'rust-agent',
        name: 'Rust Agent',
        icon: basePath + 'agent-orange.png',
        iconType: 'image',
        role: 'Systems Programming',
        description: 'Systems programming expert for Rust, WASM compilation, Bevy game engine, and performance optimization',
        type: 'specialist',
        status: 'dormant',
        languages: ['rust', 'wasm'],
        preferredModel: 'claude-sonnet-4',
        capabilities: ['systems-programming', 'wasm-compilation', 'bevy-engine', 'memory-safety', 'concurrency'],
        tools: ['cargo-run', 'wasm-pack'],
        learningState: 'ready',
        level: 1,
        xp: 0,
        tasksCompleted: 0
      },
      {
        id: 'threejs-agent',
        name: 'Three.js Agent',
        icon: basePath + 'agent-blue.png',
        iconType: 'image',
        role: '3D Graphics Specialist',
        description: 'Expert in Three.js, WebGL, WebGPU, shaders, 3D modeling, and real-time graphics',
        type: 'specialist',
        status: 'dormant',
        languages: ['javascript', 'glsl', 'wgsl'],
        preferredModel: 'gpt-4o',
        capabilities: ['3d-graphics', 'shader-programming', 'webgl', 'webgpu', 'scene-optimization'],
        tools: ['threejs-viewer', 'glsl-sandbox'],
        learningState: 'ready',
        level: 1,
        xp: 0,
        tasksCompleted: 0
      },
      {
        id: 'phaser-agent',
        name: 'Phaser Agent',
        icon: basePath + 'agent-green.png',
        iconType: 'image',
        role: '2D Game Development',
        description: 'Specializes in Phaser.js 2D game development, arcade physics, tilemaps, and game mechanics',
        type: 'specialist',
        status: 'dormant',
        languages: ['javascript', 'typescript'],
        preferredModel: 'claude-3.5-sonnet',
        capabilities: ['2d-games', 'arcade-physics', 'tilemaps', 'sprite-animation', 'game-mechanics'],
        tools: ['phaser-preview', 'tilemap-editor'],
        learningState: 'ready',
        level: 1,
        xp: 0,
        tasksCompleted: 0
      },
      {
        id: 'colyseus-agent',
        name: 'Colyseus Agent',
        icon: basePath + 'agent-purple.png',
        iconType: 'image',
        role: 'Multiplayer Networking',
        description: 'Expert in Colyseus.js multiplayer framework, state synchronization, and real-time game networking',
        type: 'specialist',
        status: 'dormant',
        languages: ['javascript', 'typescript'],
        preferredModel: 'claude-sonnet-4',
        capabilities: ['multiplayer-sync', 'room-management', 'state-sync', 'matchmaking', 'lobby-systems'],
        tools: ['colyseus-monitor', 'network-debugger'],
        learningState: 'ready',
        level: 1,
        xp: 0,
        tasksCompleted: 0
      },
      {
        id: 'network-agent',
        name: 'Network Agent',
        icon: basePath + 'agent-red.png',
        iconType: 'image',
        role: 'WebSocket/WebRTC/P2P',
        description: 'Handles WebSocket connections, WebRTC peer-to-peer, signaling servers, and network protocols',
        type: 'specialist',
        status: 'dormant',
        languages: ['javascript', 'typescript'],
        preferredModel: 'claude-3.5-sonnet',
        capabilities: ['websocket', 'webrtc', 'p2p', 'signaling', 'network-protocols'],
        tools: ['ws-monitor', 'rtc-debugger'],
        learningState: 'ready',
        level: 1,
        xp: 0,
        tasksCompleted: 0
      }
    ];
  }

  getDefaultTools() {
    const iconPath = '/grudgeos/assets/icons/';
    return [
      {
        id: 'run-exe',
        name: 'Run Executable',
        icon: iconPath + 'run-exe.png',
        iconType: 'image',
        iconFallback: '#22c55e',
        description: 'Execute compiled programs and binaries',
        category: 'execution',
        supportedLanguages: ['all'],
        command: 'run-exe'
      },
      {
        id: 'run-task',
        name: 'Run Task',
        icon: iconPath + 'run-task.png',
        iconType: 'image',
        iconFallback: '#eab308',
        description: 'Execute predefined build and run tasks',
        category: 'execution',
        supportedLanguages: ['all'],
        command: 'run-task'
      },
      {
        id: 'haskell-run',
        name: 'Haskell Run',
        icon: iconPath + 'haskell.png',
        iconType: 'image',
        iconFallback: '#a855f7',
        description: 'Run Haskell programs with GHCi interpreter',
        category: 'execution',
        supportedLanguages: ['haskell'],
        command: 'ghci'
      },
      {
        id: 'html5-preview',
        name: 'HTML5 Preview',
        icon: iconPath + 'preview.png',
        iconType: 'image',
        iconFallback: '#3b82f6',
        description: 'Live preview HTML5 applications with hot reload',
        category: 'preview',
        supportedLanguages: ['html', 'css', 'javascript'],
        command: 'html5-preview'
      },
      {
        id: 'threejs-viewer',
        name: 'Three.js Viewer',
        icon: iconPath + '3d-viewer.png',
        iconType: 'image',
        iconFallback: '#06b6d4',
        description: 'Interactive 3D scene viewer and debugger',
        category: 'preview',
        supportedLanguages: ['javascript', 'glsl'],
        command: 'threejs-viewer'
      },
      {
        id: 'stack-scopes',
        name: 'Stack Scopes',
        icon: iconPath + 'debug.png',
        iconType: 'image',
        iconFallback: '#ef4444',
        description: 'Visualize call stacks and variable scopes during debugging',
        category: 'debugging',
        supportedLanguages: ['all'],
        command: 'stack-scopes'
      },
      {
        id: 'run-lua',
        name: 'Lua Runner',
        icon: iconPath + 'lua.png',
        iconType: 'image',
        iconFallback: '#1e40af',
        description: 'Execute Lua/Luau scripts with REPL support',
        category: 'execution',
        supportedLanguages: ['lua', 'luau'],
        command: 'lua'
      },
      {
        id: 'cargo-run',
        name: 'Cargo Run',
        icon: iconPath + 'rust.png',
        iconType: 'image',
        iconFallback: '#dc2626',
        description: 'Build and run Rust projects with Cargo',
        category: 'execution',
        supportedLanguages: ['rust'],
        command: 'cargo run'
      },
      {
        id: 'wasm-pack',
        name: 'WASM Pack',
        icon: iconPath + 'build.png',
        iconType: 'image',
        iconFallback: '#7c3aed',
        description: 'Compile and package WebAssembly modules',
        category: 'build',
        supportedLanguages: ['rust', 'c', 'cpp'],
        command: 'wasm-pack build'
      },
      {
        id: 'phaser-preview',
        name: 'Phaser Preview',
        icon: iconPath + 'games-launcher.png',
        iconType: 'image',
        iconFallback: '#16a34a',
        description: 'Live preview Phaser.js games with debug overlay',
        category: 'preview',
        supportedLanguages: ['javascript', 'typescript'],
        command: 'phaser-preview'
      },
      {
        id: 'glsl-sandbox',
        name: 'GLSL Sandbox',
        icon: iconPath + 'shader.png',
        iconType: 'image',
        iconFallback: '#ec4899',
        description: 'Interactive shader editor and preview',
        category: 'preview',
        supportedLanguages: ['glsl', 'wgsl'],
        command: 'glsl-sandbox'
      },
      {
        id: 'ai-code-review',
        name: 'AI Code Review',
        icon: iconPath + 'ai-tool.png',
        iconType: 'image',
        iconFallback: '#8b5cf6',
        description: 'Get AI-powered code review using free Puter models',
        category: 'ai',
        supportedLanguages: ['all'],
        command: 'ai-review'
      },
      {
        id: 'ai-docs-gen',
        name: 'AI Docs Generator',
        icon: iconPath + 'ai-tool.png',
        iconType: 'image',
        iconFallback: '#8b5cf6',
        description: 'Generate documentation using Claude/GPT models',
        category: 'ai',
        supportedLanguages: ['all'],
        command: 'ai-docs'
      },
      {
        id: 'ai-test-gen',
        name: 'AI Test Generator',
        icon: iconPath + 'ai-tool.png',
        iconType: 'image',
        iconFallback: '#8b5cf6',
        description: 'Generate unit tests using AI models',
        category: 'ai',
        supportedLanguages: ['all'],
        command: 'ai-tests'
      },
      {
        id: 'network-debugger',
        name: 'Network Debugger',
        icon: iconPath + 'network.png',
        iconType: 'image',
        iconFallback: '#3b82f6',
        description: 'Monitor WebSocket/HTTP traffic and latency',
        category: 'debugging',
        supportedLanguages: ['all'],
        command: 'network-debug'
      }
    ];
  }

  async init() {
    if (this.initialized) return;

    const defaultAgents = this.getDefaultAgents();
    const defaultTools = this.getDefaultTools();

    defaultAgents.forEach(agent => {
      this.agents.set(agent.id, { ...agent, createdAt: Date.now() });
    });

    defaultTools.forEach(tool => {
      this.tools.set(tool.id, tool);
    });

    if (typeof puter !== 'undefined' && puter.kv) {
      try {
        const saved = await puter.kv.get('grudgeos_agents');
        if (saved) {
          const savedAgents = JSON.parse(saved);
          savedAgents.forEach(agent => {
            if (this.agents.has(agent.id)) {
              this.agents.set(agent.id, { ...this.agents.get(agent.id), ...agent });
            }
          });
        }
      } catch (e) {
        console.log('[AgentRegistry] Using defaults:', e.message);
      }
    }

    this.initialized = true;
    console.log(`[AgentRegistry] Initialized with ${this.agents.size} agents and ${this.tools.size} tools`);
  }

  async save() {
    if (typeof puter !== 'undefined' && puter.kv) {
      try {
        const agentData = Array.from(this.agents.values()).map(a => ({
          id: a.id,
          status: a.status,
          level: a.level,
          xp: a.xp,
          tasksCompleted: a.tasksCompleted,
          learningState: a.learningState
        }));
        await puter.kv.set('grudgeos_agents', JSON.stringify(agentData));
      } catch (e) {
        console.error('[AgentRegistry] Save error:', e);
      }
    }
  }

  getAgent(id) {
    return this.agents.get(id);
  }

  getAllAgents() {
    return Array.from(this.agents.values());
  }

  getCoreAgents() {
    return this.getAllAgents().filter(a => a.type === 'core');
  }

  getSpecialistAgents() {
    return this.getAllAgents().filter(a => a.type === 'specialist');
  }

  getActiveAgents() {
    return this.getAllAgents().filter(a => a.status === 'active');
  }

  getDormantAgents() {
    return this.getAllAgents().filter(a => a.status === 'dormant');
  }

  activateAgent(id) {
    const agent = this.agents.get(id);
    if (agent) {
      agent.status = 'active';
      this.save();
      console.log(`[AgentRegistry] Activated agent: ${agent.name}`);
      return true;
    }
    return false;
  }

  deactivateAgent(id) {
    const agent = this.agents.get(id);
    if (agent && agent.type !== 'core') {
      agent.status = 'dormant';
      this.save();
      return true;
    }
    return false;
  }

  getTool(id) {
    return this.tools.get(id);
  }

  getAllTools() {
    return Array.from(this.tools.values());
  }

  getToolsByCategory(category) {
    return this.getAllTools().filter(t => t.category === category);
  }

  getToolsForLanguage(language) {
    return this.getAllTools().filter(t => 
      t.supportedLanguages.includes('all') || t.supportedLanguages.includes(language)
    );
  }

  getAgentTools(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent || !agent.tools) return [];
    return agent.tools.map(tid => this.tools.get(tid)).filter(Boolean);
  }

  async updateAgentProgress(agentId, taskSuccess) {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    agent.tasksCompleted++;
    
    const xpGain = taskSuccess ? 10 : 2;
    agent.xp += xpGain;

    const xpNeeded = agent.level * 100;
    if (agent.xp >= xpNeeded) {
      agent.level++;
      agent.xp -= xpNeeded;
      console.log(`[AgentRegistry] ${agent.name} leveled up to ${agent.level}!`);
    }

    this.updateLearningState(agent, taskSuccess);

    await this.save();
    return agent;
  }

  updateLearningState(agent, taskSuccess) {
    const states = ['creating', 'learning', 'repeating', 'reiterating', 'succeeding'];
    const currentIndex = states.indexOf(agent.learningState);
    
    if (agent.learningState === 'ready') {
      agent.learningState = 'creating';
    } else if (taskSuccess && currentIndex < states.length - 1) {
      agent.learningState = states[currentIndex + 1];
    } else if (!taskSuccess && currentIndex > 0) {
      agent.learningState = states[Math.max(0, currentIndex - 1)];
    }

    if (agent.learningState === 'succeeding' && agent.tasksCompleted % 5 === 0) {
      agent.learningState = 'ready';
    }
  }

  getLearningCycleInfo(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    const states = ['ready', 'creating', 'learning', 'repeating', 'reiterating', 'succeeding'];
    const stateDescriptions = {
      ready: 'Awaiting new task',
      creating: 'Generating solution approach',
      learning: 'Analyzing patterns and outcomes',
      repeating: 'Applying learned patterns',
      reiterating: 'Refining based on feedback',
      succeeding: 'Task completed successfully'
    };

    return {
      currentState: agent.learningState,
      description: stateDescriptions[agent.learningState],
      stateIndex: states.indexOf(agent.learningState),
      totalStates: states.length,
      progress: (states.indexOf(agent.learningState) / (states.length - 1)) * 100
    };
  }
}

const agentRegistry = new AgentRegistry();

if (typeof window !== 'undefined') {
  window.AgentRegistry = agentRegistry;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AgentRegistry, agentRegistry };
}
