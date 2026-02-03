/**
 * PuterAIService - Comprehensive Puter.js AI Integration
 * Provides unified access to all AI models available through Puter's free API
 */

class PuterAIService {
  constructor() {
    this.initialized = false;
    this.models = {};
    this.defaultModel = 'claude-sonnet-4';
    this.conversationHistory = new Map();
    this.tokenUsage = { total: 0, byModel: {} };
    this.callbacks = { onMessage: null, onError: null, onStream: null };
  }
  
  // ============ INITIALIZATION ============
  async init() {
    if (this.initialized) return true;
    
    if (typeof puter === 'undefined') {
      console.error('Puter.js SDK not loaded');
      return false;
    }
    
    // Populate available models
    this.models = {
      // Anthropic Claude
      'claude-sonnet-4': { provider: 'anthropic', capabilities: ['chat', 'code', 'analysis', 'vision'], maxTokens: 8192 },
      'claude-3-5-sonnet': { provider: 'anthropic', capabilities: ['chat', 'code', 'analysis'], maxTokens: 8192 },
      'claude-3-haiku': { provider: 'anthropic', capabilities: ['chat', 'quick'], maxTokens: 4096 },
      'claude-3-opus': { provider: 'anthropic', capabilities: ['chat', 'code', 'analysis', 'creative'], maxTokens: 4096 },
      
      // OpenAI
      'gpt-4o': { provider: 'openai', capabilities: ['chat', 'vision', 'code', 'creative'], maxTokens: 4096 },
      'gpt-4o-mini': { provider: 'openai', capabilities: ['chat', 'quick'], maxTokens: 4096 },
      'gpt-4-turbo': { provider: 'openai', capabilities: ['chat', 'code', 'analysis'], maxTokens: 4096 },
      'o1': { provider: 'openai', capabilities: ['reasoning', 'math', 'logic'], maxTokens: 32768 },
      'o1-mini': { provider: 'openai', capabilities: ['reasoning', 'math'], maxTokens: 32768 },
      
      // Google
      'gemini-2.0-flash': { provider: 'google', capabilities: ['chat', 'vision', 'long-context'], maxTokens: 8192 },
      'gemini-1.5-pro': { provider: 'google', capabilities: ['chat', 'vision', 'analysis', 'ultra-long-context'], maxTokens: 8192 },
      'gemini-1.5-flash': { provider: 'google', capabilities: ['chat', 'quick', 'vision'], maxTokens: 8192 },
      
      // Meta
      'llama-3.1-405b': { provider: 'meta', capabilities: ['chat', 'code', 'analysis'], maxTokens: 4096 },
      'llama-3.1-70b': { provider: 'meta', capabilities: ['chat', 'code'], maxTokens: 4096 },
      'llama-3.1-8b': { provider: 'meta', capabilities: ['chat', 'quick'], maxTokens: 4096 },
      
      // Mistral
      'mistral-large': { provider: 'mistral', capabilities: ['chat', 'code', 'multilingual'], maxTokens: 4096 },
      'mistral-medium': { provider: 'mistral', capabilities: ['chat', 'code'], maxTokens: 4096 },
      'mixtral-8x7b': { provider: 'mistral', capabilities: ['chat', 'code'], maxTokens: 4096 },
      
      // DeepSeek
      'deepseek-chat': { provider: 'deepseek', capabilities: ['chat', 'code', 'chinese'], maxTokens: 4096 },
      'deepseek-coder': { provider: 'deepseek', capabilities: ['code', 'analysis'], maxTokens: 4096 },
      
      // Other providers
      'qwen-72b': { provider: 'alibaba', capabilities: ['chat', 'multilingual', 'math'], maxTokens: 4096 },
      'yi-large': { provider: 'yi', capabilities: ['chat', 'analysis'], maxTokens: 4096 }
    };
    
    this.initialized = true;
    console.log(`PuterAIService initialized with ${Object.keys(this.models).length} models`);
    return true;
  }
  
  // ============ MODEL SELECTION ============
  selectModel(task) {
    const taskModels = {
      'code': 'claude-sonnet-4',
      'code_review': 'claude-sonnet-4',
      'quick_chat': 'gpt-4o-mini',
      'creative': 'claude-3-5-sonnet',
      'analysis': 'gemini-1.5-pro',
      'vision': 'gpt-4o',
      'reasoning': 'o1',
      'math': 'o1-mini',
      'long_document': 'gemini-2.0-flash',
      'multilingual': 'mistral-large',
      'chinese': 'deepseek-chat',
      'fast': 'claude-3-haiku'
    };
    
    return taskModels[task] || this.defaultModel;
  }
  
  getModelInfo(modelId) {
    return this.models[modelId] || null;
  }
  
  listModels(filter = {}) {
    return Object.entries(this.models)
      .filter(([id, model]) => {
        if (filter.provider && model.provider !== filter.provider) return false;
        if (filter.capability && !model.capabilities.includes(filter.capability)) return false;
        return true;
      })
      .map(([id, model]) => ({ id, ...model }));
  }
  
  // ============ CHAT API ============
  async chat(prompt, options = {}) {
    await this.init();
    
    const model = options.model || this.defaultModel;
    const conversationId = options.conversationId || 'default';
    
    // Build messages array
    let messages = [];
    
    // Add system prompt if provided
    if (options.system) {
      messages.push({ role: 'system', content: options.system });
    }
    
    // Add conversation history if maintaining context
    if (options.useHistory !== false) {
      const history = this.conversationHistory.get(conversationId) || [];
      messages = messages.concat(history);
    }
    
    // Add current user message
    messages.push({ role: 'user', content: prompt });
    
    try {
      const startTime = Date.now();
      
      const response = await puter.ai.chat(messages, {
        model,
        max_tokens: options.maxTokens || this.models[model]?.maxTokens || 4096,
        temperature: options.temperature ?? 0.7,
        stream: options.stream || false
      });
      
      const duration = Date.now() - startTime;
      
      // Extract content
      const content = response.message?.content || response.content || response;
      
      // Update conversation history
      if (options.useHistory !== false) {
        const history = this.conversationHistory.get(conversationId) || [];
        history.push({ role: 'user', content: prompt });
        history.push({ role: 'assistant', content });
        
        // Keep last 20 messages
        if (history.length > 40) {
          history.splice(0, history.length - 40);
        }
        
        this.conversationHistory.set(conversationId, history);
      }
      
      // Track usage
      this.tokenUsage.total += 1;
      this.tokenUsage.byModel[model] = (this.tokenUsage.byModel[model] || 0) + 1;
      
      if (this.callbacks.onMessage) {
        this.callbacks.onMessage({ model, content, duration });
      }
      
      return {
        success: true,
        content,
        model,
        duration,
        conversationId
      };
      
    } catch (error) {
      console.error('PuterAI chat error:', error);
      
      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }
      
      return {
        success: false,
        error: error.message || 'AI request failed',
        model
      };
    }
  }
  
  // ============ SPECIALIZED METHODS ============
  async generateCode(prompt, language = 'javascript', options = {}) {
    const systemPrompt = `You are an expert ${language} programmer. Generate clean, efficient, well-documented ${language} code. Follow best practices and modern patterns. Only output code, no explanations unless specifically asked.`;
    
    return this.chat(prompt, {
      ...options,
      model: options.model || 'claude-sonnet-4',
      system: systemPrompt,
      temperature: 0.3
    });
  }
  
  async analyzeCode(code, question = 'What does this code do?', options = {}) {
    const prompt = `Analyze this code:\n\`\`\`\n${code}\n\`\`\`\n\n${question}`;
    
    return this.chat(prompt, {
      ...options,
      model: options.model || 'claude-sonnet-4',
      temperature: 0.2
    });
  }
  
  async fixCode(code, error, language = 'javascript', options = {}) {
    const prompt = `Fix this ${language} code that has the following error:\n\nError: ${error}\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\`\n\nProvide only the fixed code.`;
    
    return this.chat(prompt, {
      ...options,
      model: options.model || 'claude-sonnet-4',
      system: 'You are a code debugging expert. Fix the provided code and return only the corrected code without explanations.',
      temperature: 0.1
    });
  }
  
  async summarize(text, options = {}) {
    const prompt = `Summarize the following text concisely:\n\n${text}`;
    
    return this.chat(prompt, {
      ...options,
      model: options.model || 'claude-3-haiku',
      temperature: 0.3
    });
  }
  
  async translate(text, targetLanguage, options = {}) {
    const prompt = `Translate the following text to ${targetLanguage}. Preserve the meaning and tone:\n\n${text}`;
    
    return this.chat(prompt, {
      ...options,
      model: options.model || 'mistral-large',
      temperature: 0.3
    });
  }
  
  async brainstorm(topic, options = {}) {
    const prompt = `Generate creative ideas and suggestions for: ${topic}`;
    
    return this.chat(prompt, {
      ...options,
      model: options.model || 'claude-3-5-sonnet',
      temperature: 0.9
    });
  }
  
  async reason(problem, options = {}) {
    const prompt = `Think step by step to solve this problem:\n\n${problem}`;
    
    return this.chat(prompt, {
      ...options,
      model: options.model || 'o1',
      temperature: 0.1
    });
  }
  
  async json(prompt, schema = null, options = {}) {
    let systemPrompt = 'Respond only with valid JSON. No markdown, no explanations, just the JSON object.';
    if (schema) {
      systemPrompt += `\n\nThe JSON should follow this structure: ${JSON.stringify(schema)}`;
    }
    
    const response = await this.chat(prompt, {
      ...options,
      system: systemPrompt,
      temperature: 0.1
    });
    
    if (response.success) {
      try {
        const jsonContent = response.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        response.parsed = JSON.parse(jsonContent);
      } catch (e) {
        response.parseError = e.message;
      }
    }
    
    return response;
  }
  
  // ============ MULTI-AGENT ORCHESTRATION ============
  async orchestrate(task, agents = []) {
    const results = [];
    
    for (const agent of agents) {
      const agentPrompt = `${agent.systemPrompt || ''}\n\nTask: ${task}`;
      const result = await this.chat(agentPrompt, {
        model: agent.model || this.defaultModel,
        conversationId: `agent_${agent.id}`,
        temperature: agent.temperature || 0.7
      });
      
      results.push({
        agentId: agent.id,
        agentName: agent.name,
        result
      });
    }
    
    return results;
  }
  
  async chainPrompts(prompts, options = {}) {
    const results = [];
    let context = '';
    
    for (const prompt of prompts) {
      const fullPrompt = context ? `Context:\n${context}\n\n${prompt}` : prompt;
      const result = await this.chat(fullPrompt, options);
      
      results.push(result);
      
      if (result.success) {
        context = result.content;
      }
    }
    
    return results;
  }
  
  // ============ CONVERSATION MANAGEMENT ============
  clearConversation(conversationId = 'default') {
    this.conversationHistory.delete(conversationId);
  }
  
  getConversationHistory(conversationId = 'default') {
    return this.conversationHistory.get(conversationId) || [];
  }
  
  exportConversation(conversationId = 'default') {
    return {
      conversationId,
      messages: this.getConversationHistory(conversationId),
      exportedAt: new Date().toISOString()
    };
  }
  
  importConversation(data) {
    if (data.messages && data.conversationId) {
      this.conversationHistory.set(data.conversationId, data.messages);
      return true;
    }
    return false;
  }
  
  // ============ CALLBACKS & EVENTS ============
  on(event, callback) {
    if (this.callbacks.hasOwnProperty(event)) {
      this.callbacks[event] = callback;
    }
  }
  
  off(event) {
    if (this.callbacks.hasOwnProperty(event)) {
      this.callbacks[event] = null;
    }
  }
  
  // ============ USAGE STATS ============
  getUsageStats() {
    return {
      totalRequests: this.tokenUsage.total,
      byModel: { ...this.tokenUsage.byModel },
      activeConversations: this.conversationHistory.size,
      availableModels: Object.keys(this.models).length
    };
  }
}

// Create global instance
const puterAI = new PuterAIService();

// Export
if (typeof window !== 'undefined') {
  window.PuterAIService = PuterAIService;
  window.puterAI = puterAI;
}

if (typeof module !== 'undefined') {
  module.exports = { PuterAIService, puterAI };
}
