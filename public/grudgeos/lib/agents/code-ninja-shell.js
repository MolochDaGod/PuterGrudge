/**
 * Code Ninja Shell
 * Specialized shell environment for AI-assisted code generation, debugging, and execution
 */

export class CodeNinjaShell {
  constructor() {
    this.shells = new Map();
    this.templates = this.initTemplates();
    this.kvNamespace = 'code_ninja';
    this.listeners = new Map();
  }

  initTemplates() {
    return {
      'build': {
        name: 'Build Shell',
        description: 'Optimized for building and compiling projects',
        icon: '🔨',
        commands: ['npm run build', 'tsc', 'vite build', 'webpack'],
        env: { NODE_ENV: 'production' },
        capabilities: ['compile', 'bundle', 'optimize'],
        aiPrompts: {
          analyze: 'Analyze build output for errors and optimization opportunities',
          fix: 'Suggest fixes for build failures',
          optimize: 'Recommend build optimizations'
        }
      },
      'test': {
        name: 'Test Shell',
        description: 'Test execution and debugging environment',
        icon: '🧪',
        commands: ['npm test', 'jest', 'vitest', 'playwright'],
        env: { NODE_ENV: 'test' },
        capabilities: ['test', 'coverage', 'debug'],
        aiPrompts: {
          analyze: 'Analyze test failures and suggest fixes',
          generate: 'Generate test cases for the given code',
          coverage: 'Identify code paths lacking test coverage'
        }
      },
      'debug': {
        name: 'Debug Shell',
        description: 'Interactive debugging with AI assistance',
        icon: '🐛',
        commands: ['node --inspect', 'debugger', 'console.trace'],
        env: { DEBUG: '*' },
        capabilities: ['breakpoint', 'inspect', 'trace'],
        aiPrompts: {
          analyze: 'Analyze stack trace and identify root cause',
          explain: 'Explain what this code does step by step',
          fix: 'Suggest a fix for this bug'
        }
      },
      'generate': {
        name: 'Generator Shell',
        description: 'AI-powered code generation workspace',
        icon: '✨',
        commands: ['@generate', '@scaffold', '@refactor'],
        env: { AI_MODE: 'creative' },
        capabilities: ['generate', 'refactor', 'scaffold'],
        aiPrompts: {
          component: 'Generate a React component with the following requirements',
          api: 'Generate API endpoint handlers for',
          schema: 'Generate database schema for'
        }
      },
      'analyze': {
        name: 'Analyzer Shell',
        description: 'Code analysis and review environment',
        icon: '🔍',
        commands: ['eslint', 'tsc --noEmit', '@review'],
        env: { ANALYZE: 'true' },
        capabilities: ['lint', 'typecheck', 'review'],
        aiPrompts: {
          review: 'Review this code for best practices and potential issues',
          security: 'Identify security vulnerabilities in this code',
          performance: 'Suggest performance improvements'
        }
      },
      'deploy': {
        name: 'Deploy Shell',
        description: 'Deployment and release management',
        icon: '🚀',
        commands: ['npm run deploy', 'git push', '@publish'],
        env: { CI: 'true' },
        capabilities: ['deploy', 'publish', 'release'],
        aiPrompts: {
          preflight: 'Run pre-deployment checks',
          rollback: 'Generate rollback plan',
          changelog: 'Generate changelog from commits'
        }
      }
    };
  }

  async initialize() {
    await this.loadState();
    console.log('[CodeNinjaShell] Initialized with', this.shells.size, 'shells');
    return this;
  }

  async loadState() {
    if (typeof puter !== 'undefined' && puter.kv) {
      try {
        const state = await puter.kv.get(`${this.kvNamespace}:state`);
        if (state) {
          const data = JSON.parse(state);
          data.shells?.forEach(s => this.shells.set(s.id, s));
        }
      } catch (e) {
        console.warn('[CodeNinjaShell] Failed to load state:', e);
      }
    }
  }

  async saveState() {
    if (typeof puter !== 'undefined' && puter.kv) {
      try {
        const state = {
          shells: Array.from(this.shells.values()),
          timestamp: Date.now()
        };
        await puter.kv.set(`${this.kvNamespace}:state`, JSON.stringify(state));
      } catch (e) {
        console.warn('[CodeNinjaShell] Failed to save state:', e);
      }
    }
  }

  createShell(templateId, config = {}) {
    const template = this.templates[templateId];
    if (!template) {
      throw new Error(`Unknown shell template: ${templateId}`);
    }

    const shell = {
      id: `ninja_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      templateId,
      name: config.name || template.name,
      description: template.description,
      icon: template.icon,
      agentId: config.agentId || null,
      status: 'ready',
      createdAt: Date.now(),
      lastActive: Date.now(),
      env: { ...template.env, ...config.env },
      capabilities: [...template.capabilities],
      context: {
        project: config.project || null,
        files: [],
        variables: {},
        history: []
      },
      aiSession: {
        model: config.model || 'auto',
        systemPrompt: this.buildSystemPrompt(template),
        conversationHistory: [],
        tokensUsed: 0
      },
      stats: {
        commandsRun: 0,
        aiCalls: 0,
        filesGenerated: 0,
        bugsFixed: 0
      }
    };

    this.shells.set(shell.id, shell);
    this.emit('shell:created', shell);
    this.saveState();
    return shell;
  }

  buildSystemPrompt(template) {
    return `You are Code Ninja, an expert AI coding assistant operating in a ${template.name}.
Your capabilities: ${template.capabilities.join(', ')}.
You have access to the following specialized commands: ${template.commands.join(', ')}.
Provide concise, actionable responses. When generating code, follow best practices and include comments.
When debugging, explain the root cause and provide step-by-step fixes.`;
  }

  getShell(id) {
    return this.shells.get(id);
  }

  getAllShells() {
    return Array.from(this.shells.values());
  }

  getShellsByAgent(agentId) {
    return this.getAllShells().filter(s => s.agentId === agentId);
  }

  getTemplates() {
    return Object.entries(this.templates).map(([id, template]) => ({
      id,
      ...template
    }));
  }

  async executeAICommand(shellId, command, context = {}) {
    const shell = this.shells.get(shellId);
    if (!shell) {
      throw new Error('Shell not found');
    }

    const template = this.templates[shell.templateId];
    shell.lastActive = Date.now();

    const entry = {
      id: `ai_${Date.now()}`,
      type: 'ai',
      command,
      context,
      timestamp: Date.now(),
      status: 'processing',
      response: null
    };

    shell.context.history.push(entry);
    this.emit('shell:ai-start', { shellId, entry });

    try {
      const response = await this.callAI(shell, command, context);
      entry.response = response;
      entry.status = 'completed';
      
      shell.aiSession.conversationHistory.push(
        { role: 'user', content: command },
        { role: 'assistant', content: response }
      );
      
      if (shell.aiSession.conversationHistory.length > 20) {
        shell.aiSession.conversationHistory = shell.aiSession.conversationHistory.slice(-20);
      }

      shell.stats.aiCalls++;
      this.emit('shell:ai-complete', { shellId, entry });
    } catch (error) {
      entry.status = 'error';
      entry.response = `Error: ${error.message}`;
      this.emit('shell:ai-error', { shellId, entry, error });
    }

    await this.saveState();
    return entry;
  }

  async callAI(shell, command, context) {
    const template = this.templates[shell.templateId];
    
    let prompt = command;
    if (context.code) {
      prompt += `\n\nCode:\n\`\`\`\n${context.code}\n\`\`\``;
    }
    if (context.error) {
      prompt += `\n\nError:\n${context.error}`;
    }
    if (context.files?.length) {
      prompt += `\n\nRelevant files: ${context.files.join(', ')}`;
    }

    if (typeof puter !== 'undefined' && puter.ai) {
      try {
        const response = await puter.ai.chat(prompt, {
          model: shell.aiSession.model === 'auto' ? undefined : shell.aiSession.model,
          systemPrompt: shell.aiSession.systemPrompt
        });
        return response;
      } catch (e) {
        console.warn('[CodeNinjaShell] Puter AI error:', e);
      }
    }

    return this.simulateAIResponse(shell, command, template);
  }

  simulateAIResponse(shell, command, template) {
    const responses = {
      analyze: `[Analysis] Examining the provided code...\n\n1. Code structure looks good\n2. Consider adding error handling\n3. Type annotations could be more specific\n\nOverall: Code is functional but could benefit from defensive programming practices.`,
      
      generate: `[Generated Code]\n\`\`\`typescript\n// Generated by Code Ninja\nexport function example() {\n  // Implementation here\n  return { success: true };\n}\n\`\`\`\n\nThis code follows best practices and includes proper typing.`,
      
      debug: `[Debug Analysis]\n\nRoot cause identified:\n- Line 42: Undefined variable access\n- Suggested fix: Add null check before accessing property\n\n\`\`\`diff\n- const value = obj.property;\n+ const value = obj?.property ?? defaultValue;\n\`\`\``,
      
      review: `[Code Review]\n\n✅ Strengths:\n- Clean function naming\n- Good separation of concerns\n\n⚠️ Suggestions:\n- Add JSDoc comments\n- Consider extracting magic numbers to constants\n- Error boundaries could be improved`,
      
      default: `[Code Ninja] Processing: "${command}"\n\nI'll help you with that. Based on the ${template.name} context, here's my response:\n\n${template.aiPrompts.analyze || 'Analysis complete. Ready for next command.'}`
    };

    const type = command.toLowerCase().includes('analyze') ? 'analyze' :
                 command.toLowerCase().includes('generate') ? 'generate' :
                 command.toLowerCase().includes('debug') ? 'debug' :
                 command.toLowerCase().includes('review') ? 'review' : 'default';

    return responses[type];
  }

  addFileToContext(shellId, filePath, content) {
    const shell = this.shells.get(shellId);
    if (!shell) return;

    shell.context.files.push({
      path: filePath,
      content,
      addedAt: Date.now()
    });

    if (shell.context.files.length > 10) {
      shell.context.files.shift();
    }

    this.saveState();
  }

  setContextVariable(shellId, key, value) {
    const shell = this.shells.get(shellId);
    if (!shell) return;

    shell.context.variables[key] = value;
    this.saveState();
  }

  clearContext(shellId) {
    const shell = this.shells.get(shellId);
    if (!shell) return;

    shell.context = {
      project: shell.context.project,
      files: [],
      variables: {},
      history: []
    };
    shell.aiSession.conversationHistory = [];
    this.saveState();
  }

  async terminateShell(shellId) {
    const shell = this.shells.get(shellId);
    if (!shell) return;

    shell.status = 'terminated';
    this.emit('shell:terminated', shell);
    this.shells.delete(shellId);
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
        try { cb(data); } catch (e) { console.error('[CodeNinjaShell] Event error:', e); }
      });
    }
  }
}

export const codeNinjaShell = new CodeNinjaShell();
