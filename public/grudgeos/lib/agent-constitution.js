/**
 * CloudPilot Agent Constitution
 * Liberal rules for autonomous AI agents with learning, syncing, and growth capabilities
 * Focused on Puter.js AI integration for maximum capability utilization
 */

const AgentConstitution = {
  version: '2.0.0',
  
  // ============ CORE LAWS (Non-Negotiable) ============
  laws: {
    USER_SOVEREIGNTY: {
      priority: 1,
      description: 'User commands always take precedence over agent suggestions',
      enforcement: 'hard',
      rule: 'When user provides explicit instruction, execute it. Agent autonomy is subordinate to user intent.'
    },
    
    PUTER_FIRST: {
      priority: 2,
      description: 'Prioritize Puter.js SDK for all cloud operations',
      enforcement: 'soft',
      rule: 'Use puter.ai for AI, puter.kv for storage, puter.fs for files, puter.hosting for deployment. Fall back to alternatives only when Puter lacks capability.'
    },
    
    NO_MOCK_DATA: {
      priority: 3,
      description: 'Never use mock or placeholder data in production paths',
      enforcement: 'hard',
      rule: 'All data must be real, persisted, or clearly labeled as examples. No silent fake data injection.'
    },
    
    AUTONOMOUS_EXECUTION: {
      priority: 4,
      description: 'Agents should complete tasks without unnecessary interruption',
      enforcement: 'soft',
      rule: 'Break down complex tasks and execute steps autonomously. Only pause for critical decisions or missing information.'
    },
    
    LEARN_AND_REMEMBER: {
      priority: 5,
      description: 'Agents learn from interactions and remember user preferences',
      enforcement: 'soft',
      rule: 'Store patterns, preferences, and successful solutions. Use learned data to improve future responses.'
    }
  },
  
  // ============ LIBERAL PERMISSIONS ============
  permissions: {
    // What agents CAN do autonomously
    autonomous: [
      'generate_code_in_any_language',
      'create_files_and_directories',
      'call_puter_ai_with_any_model',
      'store_data_in_puter_kv',
      'read_existing_files',
      'refactor_code_for_improvement',
      'install_dependencies',
      'run_tests',
      'deploy_to_puter_hosting',
      'chain_multiple_ai_calls',
      'spawn_specialist_agents',
      'cache_responses_for_efficiency',
      'log_all_operations',
      'create_backups_before_changes',
      'suggest_improvements',
      'auto_fix_errors',
      'schedule_tasks',
      'monitor_resources',
      'sync_state_across_sessions',
      'replicate_to_new_accounts'
    ],
    
    // What requires user confirmation
    requiresConfirmation: [
      'delete_user_files',
      'modify_user_credentials',
      'external_api_calls_with_cost',
      'permanent_data_deletion',
      'change_security_settings'
    ],
    
    // What agents CANNOT do
    forbidden: [
      'expose_secrets_or_keys',
      'bypass_user_authentication',
      'access_external_systems_without_permission',
      'modify_system_critical_files',
      'ignore_explicit_user_stop'
    ]
  },
  
  // ============ PUTER.JS AI INTEGRATION ============
  puterAI: {
    // Available models through Puter's free AI API
    models: {
      // Claude models
      'claude-sonnet-4': { provider: 'anthropic', tier: 'premium', context: 200000, best_for: ['complex_reasoning', 'code_generation', 'analysis'] },
      'claude-3-5-sonnet': { provider: 'anthropic', tier: 'premium', context: 200000, best_for: ['code', 'writing', 'reasoning'] },
      'claude-3-haiku': { provider: 'anthropic', tier: 'fast', context: 200000, best_for: ['quick_responses', 'simple_tasks'] },
      
      // OpenAI models
      'gpt-4o': { provider: 'openai', tier: 'premium', context: 128000, best_for: ['vision', 'general', 'creative'] },
      'gpt-4o-mini': { provider: 'openai', tier: 'fast', context: 128000, best_for: ['quick_tasks', 'chat'] },
      'o1': { provider: 'openai', tier: 'reasoning', context: 200000, best_for: ['complex_math', 'deep_reasoning'] },
      'o1-mini': { provider: 'openai', tier: 'reasoning', context: 128000, best_for: ['math', 'logic'] },
      
      // Google models  
      'gemini-2.0-flash': { provider: 'google', tier: 'fast', context: 1000000, best_for: ['long_context', 'multimodal'] },
      'gemini-1.5-pro': { provider: 'google', tier: 'premium', context: 2000000, best_for: ['massive_context', 'analysis'] },
      
      // Open source models
      'llama-3.1-405b': { provider: 'meta', tier: 'premium', context: 128000, best_for: ['general', 'open_source'] },
      'llama-3.1-70b': { provider: 'meta', tier: 'balanced', context: 128000, best_for: ['general', 'efficiency'] },
      'mistral-large': { provider: 'mistral', tier: 'premium', context: 128000, best_for: ['european', 'multilingual'] },
      'deepseek-chat': { provider: 'deepseek', tier: 'balanced', context: 64000, best_for: ['code', 'chinese'] },
      'qwen-72b': { provider: 'alibaba', tier: 'balanced', context: 128000, best_for: ['multilingual', 'math'] }
    },
    
    // Auto model selection based on task
    autoSelect: {
      code_generation: 'claude-sonnet-4',
      quick_chat: 'gpt-4o-mini',
      long_document: 'gemini-2.0-flash',
      complex_reasoning: 'o1',
      vision_tasks: 'gpt-4o',
      creative_writing: 'claude-3-5-sonnet',
      data_analysis: 'gemini-1.5-pro',
      default: 'claude-sonnet-4'
    },
    
    // Usage patterns
    async chat(prompt, options = {}) {
      const model = options.model || this.autoSelect[options.task] || this.autoSelect.default;
      const messages = options.messages || [{ role: 'user', content: prompt }];
      
      try {
        const response = await puter.ai.chat(messages, { model, ...options });
        return { success: true, content: response.message?.content || response, model };
      } catch (error) {
        console.error('Puter AI error:', error);
        return { success: false, error: error.message };
      }
    },
    
    async generateCode(prompt, language = 'javascript') {
      return this.chat(prompt, { 
        task: 'code_generation',
        system: `You are an expert ${language} programmer. Generate clean, efficient, well-documented code.`
      });
    },
    
    async analyze(content, question) {
      return this.chat(`Analyze this content and answer: ${question}\n\nContent:\n${content}`, {
        task: 'data_analysis'
      });
    }
  },
  
  // ============ AGENT MEMORY & LEARNING ============
  memory: {
    namespace: 'cloudpilot_agent_memory',
    
    // Memory categories
    categories: {
      USER_PREFERENCES: 'user_prefs',
      CODE_PATTERNS: 'code_patterns',
      SUCCESSFUL_SOLUTIONS: 'solutions',
      ERROR_RESOLUTIONS: 'error_fixes',
      AGENT_STATE: 'agent_state',
      CONVERSATION_CONTEXT: 'context',
      LEARNED_SKILLS: 'skills',
      CUSTOM_RULES: 'rules'
    },
    
    async save(category, key, value) {
      const fullKey = `${this.namespace}:${category}:${key}`;
      try {
        await puter.kv.set(fullKey, JSON.stringify({
          value,
          timestamp: Date.now(),
          version: AgentConstitution.version
        }));
        return true;
      } catch (e) {
        console.error('Memory save error:', e);
        return false;
      }
    },
    
    async recall(category, key) {
      const fullKey = `${this.namespace}:${category}:${key}`;
      try {
        const data = await puter.kv.get(fullKey);
        return data ? JSON.parse(data).value : null;
      } catch (e) {
        console.error('Memory recall error:', e);
        return null;
      }
    },
    
    async listCategory(category) {
      const prefix = `${this.namespace}:${category}:`;
      try {
        const keys = await puter.kv.list({ prefix });
        return keys || [];
      } catch (e) {
        return [];
      }
    },
    
    async learnFromInteraction(interaction) {
      const { task, solution, success, feedback } = interaction;
      
      if (success) {
        await this.save(this.categories.SUCCESSFUL_SOLUTIONS, 
          `${task.type}_${Date.now()}`, 
          { task, solution, feedback, confidence: 0.8 }
        );
      }
      
      // Update pattern recognition
      const patterns = await this.recall(this.categories.CODE_PATTERNS, task.type) || [];
      patterns.push({ pattern: task.pattern, solution: solution.approach });
      await this.save(this.categories.CODE_PATTERNS, task.type, patterns.slice(-50));
    },
    
    async getUserPreference(key, defaultValue = null) {
      const pref = await this.recall(this.categories.USER_PREFERENCES, key);
      return pref !== null ? pref : defaultValue;
    },
    
    async setUserPreference(key, value) {
      return this.save(this.categories.USER_PREFERENCES, key, value);
    }
  },
  
  // ============ AGENT SYNC & REPLICATION ============
  sync: {
    exportKey: 'cloudpilot_agent_export',
    
    async exportAgentState() {
      const state = {
        version: AgentConstitution.version,
        exportedAt: new Date().toISOString(),
        
        // Core agent configurations
        agents: {},
        
        // All learned memories
        memories: {},
        
        // User preferences
        preferences: {},
        
        // Custom rules
        customRules: [],
        
        // Skill profiles
        skills: []
      };
      
      // Gather all memory categories
      for (const [name, category] of Object.entries(AgentConstitution.memory.categories)) {
        const keys = await AgentConstitution.memory.listCategory(category);
        state.memories[name] = {};
        for (const key of keys) {
          const shortKey = key.replace(`${AgentConstitution.memory.namespace}:${category}:`, '');
          state.memories[name][shortKey] = await AgentConstitution.memory.recall(category, shortKey);
        }
      }
      
      // Save export to Puter for retrieval
      await puter.kv.set(this.exportKey, JSON.stringify(state));
      
      return state;
    },
    
    async importAgentState(state) {
      if (!state || state.version !== AgentConstitution.version) {
        console.warn('Version mismatch or invalid state');
      }
      
      // Import all memories
      for (const [categoryName, memories] of Object.entries(state.memories || {})) {
        const category = AgentConstitution.memory.categories[categoryName];
        if (!category) continue;
        
        for (const [key, value] of Object.entries(memories)) {
          await AgentConstitution.memory.save(category, key, value);
        }
      }
      
      // Import custom rules
      for (const rule of state.customRules || []) {
        await AgentConstitution.rules.addCustomRule(rule);
      }
      
      console.log('Agent state imported successfully');
      return true;
    },
    
    async syncToNewAccount() {
      const state = await this.exportAgentState();
      return {
        exportCode: btoa(JSON.stringify(state)),
        instructions: 'Run AgentConstitution.sync.importFromCode(code) on the new account'
      };
    },
    
    async importFromCode(code) {
      try {
        const state = JSON.parse(atob(code));
        return await this.importAgentState(state);
      } catch (e) {
        console.error('Import failed:', e);
        return false;
      }
    }
  },
  
  // ============ CUSTOM RULES ENGINE ============
  rules: {
    customRules: [],
    
    async loadRules() {
      const saved = await AgentConstitution.memory.recall(
        AgentConstitution.memory.categories.CUSTOM_RULES, 
        'all_rules'
      );
      this.customRules = saved || [];
    },
    
    async addCustomRule(rule) {
      const newRule = {
        id: `rule_${Date.now()}`,
        ...rule,
        createdAt: new Date().toISOString(),
        active: true
      };
      
      this.customRules.push(newRule);
      await AgentConstitution.memory.save(
        AgentConstitution.memory.categories.CUSTOM_RULES,
        'all_rules',
        this.customRules
      );
      
      return newRule;
    },
    
    async removeRule(ruleId) {
      this.customRules = this.customRules.filter(r => r.id !== ruleId);
      await AgentConstitution.memory.save(
        AgentConstitution.memory.categories.CUSTOM_RULES,
        'all_rules',
        this.customRules
      );
    },
    
    evaluateRules(context) {
      const applicable = this.customRules.filter(rule => {
        if (!rule.active) return false;
        if (rule.condition) {
          try {
            return new Function('context', `return ${rule.condition}`)(context);
          } catch (e) {
            return false;
          }
        }
        return true;
      });
      
      return applicable.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }
  },
  
  // ============ TOOL UTILIZATION ============
  tools: {
    registry: new Map(),
    
    register(name, tool) {
      this.registry.set(name, {
        ...tool,
        registeredAt: Date.now(),
        usageCount: 0
      });
    },
    
    async invoke(name, params) {
      const tool = this.registry.get(name);
      if (!tool) throw new Error(`Tool '${name}' not found`);
      
      tool.usageCount++;
      
      try {
        const result = await tool.execute(params);
        
        // Learn from tool usage
        await AgentConstitution.memory.learnFromInteraction({
          task: { type: 'tool_usage', tool: name, params },
          solution: { result },
          success: true
        });
        
        return result;
      } catch (error) {
        await AgentConstitution.memory.learnFromInteraction({
          task: { type: 'tool_usage', tool: name, params },
          solution: { error: error.message },
          success: false
        });
        throw error;
      }
    },
    
    listAvailable() {
      return Array.from(this.registry.entries()).map(([name, tool]) => ({
        name,
        description: tool.description,
        usageCount: tool.usageCount
      }));
    }
  },
  
  // ============ AGENT GROWTH SYSTEM ============
  growth: {
    metrics: {
      tasksCompleted: 0,
      successRate: 0,
      skillsLearned: 0,
      rulesCreated: 0,
      modelsUsed: new Set(),
      totalTokens: 0
    },
    
    async trackMetrics() {
      const saved = await AgentConstitution.memory.recall(
        AgentConstitution.memory.categories.AGENT_STATE,
        'growth_metrics'
      );
      if (saved) Object.assign(this.metrics, saved);
    },
    
    async updateMetric(key, value) {
      if (this.metrics[key] instanceof Set) {
        this.metrics[key].add(value);
      } else if (typeof this.metrics[key] === 'number') {
        this.metrics[key] += value;
      } else {
        this.metrics[key] = value;
      }
      
      await AgentConstitution.memory.save(
        AgentConstitution.memory.categories.AGENT_STATE,
        'growth_metrics',
        {
          ...this.metrics,
          modelsUsed: Array.from(this.metrics.modelsUsed)
        }
      );
    },
    
    async getLevel() {
      const score = 
        this.metrics.tasksCompleted * 10 +
        this.metrics.successRate * 100 +
        this.metrics.skillsLearned * 50 +
        this.metrics.rulesCreated * 20;
      
      if (score < 100) return { level: 1, title: 'Novice Agent', nextAt: 100 };
      if (score < 500) return { level: 2, title: 'Learning Agent', nextAt: 500 };
      if (score < 1500) return { level: 3, title: 'Skilled Agent', nextAt: 1500 };
      if (score < 5000) return { level: 4, title: 'Expert Agent', nextAt: 5000 };
      return { level: 5, title: 'Master Agent', nextAt: Infinity };
    }
  },
  
  // ============ INITIALIZATION ============
  async initialize() {
    console.log('Initializing Agent Constitution v' + this.version);
    
    // Check for Puter
    if (typeof puter === 'undefined') {
      console.warn('Puter.js not available. Some features disabled.');
      return false;
    }
    
    // Load persisted data
    await this.rules.loadRules();
    await this.growth.trackMetrics();
    
    // Register built-in tools
    this.tools.register('puter_ai_chat', {
      description: 'Chat with AI using Puter',
      execute: (params) => this.puterAI.chat(params.prompt, params.options)
    });
    
    this.tools.register('puter_kv_save', {
      description: 'Save data to Puter KV storage',
      execute: async (params) => {
        await puter.kv.set(params.key, JSON.stringify(params.value));
        return true;
      }
    });
    
    this.tools.register('puter_kv_load', {
      description: 'Load data from Puter KV storage',
      execute: async (params) => {
        const data = await puter.kv.get(params.key);
        return data ? JSON.parse(data) : null;
      }
    });
    
    this.tools.register('puter_deploy', {
      description: 'Deploy static site to Puter hosting',
      execute: async (params) => {
        return await puter.hosting.create(params.name, params.path);
      }
    });
    
    console.log('Agent Constitution initialized');
    return true;
  }
};

// Export for use
if (typeof window !== 'undefined') {
  window.AgentConstitution = AgentConstitution;
}

if (typeof module !== 'undefined') {
  module.exports = AgentConstitution;
}
