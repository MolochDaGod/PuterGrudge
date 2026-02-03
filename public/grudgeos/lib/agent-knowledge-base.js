/**
 * Agent Knowledge Base - API Documentation for Worker Agents
 * 
 * This module contains all API references, model lists, and language skills
 * that worker agents need to interact with 2nd level AI systems.
 * 
 * Workers use this knowledge to:
 * - Select appropriate AI models for tasks
 * - Make proper API calls via Puter.js
 * - Understand available capabilities
 * - Stay online and accomplish tasks autonomously
 * 
 * Related modules:
 * - free-api-resources.js: Fonts, images, video, serverless, game servers
 */

import { FREE_API_RESOURCES, getFontEmbed, getPlaceholderImage, getRecommendedAPI } from './free-api-resources.js';

export const KNOWLEDGE_BASE = {
  version: '2.0.0',
  lastUpdated: new Date().toISOString(),
  
  /**
   * PUTER.JS AI SERVICE
   * Primary interface for all AI operations - FREE, no API keys needed
   */
  puterAI: {
    description: 'Puter.js provides free access to 500+ AI models via a single unified API',
    documentation: 'https://docs.puter.com/AI',
    
    basicUsage: {
      chat: `puter.ai.chat("Your prompt here", { model: 'model-name' })`,
      streaming: `puter.ai.chat("prompt", { model: 'model-name', stream: true })`,
      withContext: `puter.ai.chat([
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Hello!' }
      ], { model: 'model-name' })`
    },
    
    responseHandling: {
      simple: `const response = await puter.ai.chat("prompt"); console.log(response);`,
      streaming: `
        const response = await puter.ai.chat("prompt", { stream: true });
        for await (const part of response) {
          if (part?.text) console.log(part.text);
        }
      `
    }
  },

  /**
   * OPENROUTER MODELS - Accessed via Puter.js
   * Format: openrouter:provider/model-name
   */
  openRouterModels: {
    description: 'OpenRouter provides access to models from OpenAI, Anthropic, Meta, Google, and many others',
    prefix: 'openrouter:',
    
    recommended: {
      coding: [
        'openrouter:anthropic/claude-sonnet-4',
        'openrouter:anthropic/claude-sonnet-4.5',
        'openrouter:deepseek/deepseek-chat-v3.1',
        'openrouter:openai/gpt-4o',
        'openrouter:qwen/qwen3-coder',
        'openrouter:mistralai/codestral-2501'
      ],
      reasoning: [
        'openrouter:anthropic/claude-opus-4',
        'openrouter:openai/o3',
        'openrouter:deepseek/deepseek-r1',
        'openrouter:qwen/qwq-32b',
        'openrouter:google/gemini-2.5-pro'
      ],
      fast: [
        'openrouter:anthropic/claude-3.5-haiku',
        'openrouter:openai/gpt-4o-mini',
        'openrouter:google/gemini-2.0-flash-001',
        'openrouter:mistralai/mistral-small-3.1-24b-instruct'
      ],
      free: [
        'openrouter:meta-llama/llama-3.3-70b-instruct:free',
        'openrouter:deepseek/deepseek-r1:free',
        'openrouter:google/gemma-3-27b-it:free',
        'openrouter:qwen/qwen3-235b-a22b:free',
        'openrouter:mistralai/mistral-nemo:free'
      ],
      vision: [
        'openrouter:openai/gpt-4o',
        'openrouter:anthropic/claude-sonnet-4',
        'openrouter:google/gemini-2.5-flash',
        'openrouter:meta-llama/llama-3.2-90b-vision-instruct'
      ]
    },

    allModels: {
      anthropic: [
        'anthropic/claude-3-haiku',
        'anthropic/claude-3-opus',
        'anthropic/claude-3.5-haiku',
        'anthropic/claude-3.5-sonnet',
        'anthropic/claude-3.7-sonnet',
        'anthropic/claude-3.7-sonnet:thinking',
        'anthropic/claude-haiku-4.5',
        'anthropic/claude-opus-4',
        'anthropic/claude-opus-4.1',
        'anthropic/claude-opus-4.5',
        'anthropic/claude-sonnet-4',
        'anthropic/claude-sonnet-4.5'
      ],
      openai: [
        'openai/gpt-4o',
        'openai/gpt-4o-mini',
        'openai/gpt-4-turbo',
        'openai/gpt-4.1',
        'openai/gpt-4.1-mini',
        'openai/gpt-5',
        'openai/gpt-5-mini',
        'openai/o1',
        'openai/o1-mini',
        'openai/o3',
        'openai/o3-mini',
        'openai/o4-mini'
      ],
      google: [
        'google/gemini-2.0-flash-001',
        'google/gemini-2.5-flash',
        'google/gemini-2.5-pro',
        'google/gemini-3-flash-preview',
        'google/gemma-3-27b-it',
        'google/gemma-3-12b-it'
      ],
      meta: [
        'meta-llama/llama-3.3-70b-instruct',
        'meta-llama/llama-3.2-90b-vision-instruct',
        'meta-llama/llama-4-maverick',
        'meta-llama/llama-4-scout'
      ],
      deepseek: [
        'deepseek/deepseek-chat-v3.1',
        'deepseek/deepseek-r1',
        'deepseek/deepseek-r1-0528',
        'deepseek/deepseek-v3.2',
        'deepseek/deepseek-prover-v2'
      ],
      mistral: [
        'mistralai/mistral-large-2512',
        'mistralai/mistral-medium-3.1',
        'mistralai/codestral-2508',
        'mistralai/devstral-medium',
        'mistralai/magistral-medium-2506'
      ],
      qwen: [
        'qwen/qwen3-235b-a22b',
        'qwen/qwen3-coder',
        'qwen/qwen3-max',
        'qwen/qwq-32b',
        'qwen/qwen2.5-vl-72b-instruct'
      ],
      xai: [
        'x-ai/grok-3',
        'x-ai/grok-4',
        'x-ai/grok-3-mini'
      ]
    }
  },

  /**
   * TASK-BASED MODEL SELECTION
   * Agents should select models based on task requirements
   */
  taskModelMapping: {
    codeGeneration: {
      primary: 'openrouter:anthropic/claude-sonnet-4',
      fallback: 'openrouter:deepseek/deepseek-chat-v3.1:free',
      context: 'Use for generating new code, refactoring, implementing features'
    },
    codeReview: {
      primary: 'openrouter:anthropic/claude-opus-4',
      fallback: 'openrouter:openai/gpt-4o',
      context: 'Use for reviewing code quality, security, best practices'
    },
    debugging: {
      primary: 'openrouter:deepseek/deepseek-r1',
      fallback: 'openrouter:qwen/qwq-32b:free',
      context: 'Use reasoning models for complex debugging and root cause analysis'
    },
    documentation: {
      primary: 'openrouter:openai/gpt-4o',
      fallback: 'openrouter:google/gemini-2.5-flash',
      context: 'Use for generating docs, comments, READMEs'
    },
    quickTasks: {
      primary: 'openrouter:anthropic/claude-3.5-haiku',
      fallback: 'openrouter:openai/gpt-4o-mini',
      context: 'Use for fast, simple tasks like formatting, small edits'
    },
    analysis: {
      primary: 'openrouter:google/gemini-2.5-pro',
      fallback: 'openrouter:anthropic/claude-sonnet-4',
      context: 'Use for data analysis, pattern recognition, insights'
    },
    creative: {
      primary: 'openrouter:anthropic/claude-sonnet-4.5',
      fallback: 'openrouter:openai/gpt-4o',
      context: 'Use for creative writing, brainstorming, ideation'
    },
    imageUnderstanding: {
      primary: 'openrouter:openai/gpt-4o',
      fallback: 'openrouter:google/gemini-2.5-flash',
      context: 'Use for analyzing images, screenshots, diagrams'
    }
  },

  /**
   * AGENT API PATTERNS
   * Standard patterns workers should use for API calls
   */
  apiPatterns: {
    simpleChat: async (prompt, model = 'openrouter:anthropic/claude-sonnet-4') => {
      return `await puter.ai.chat("${prompt}", { model: '${model}' })`;
    },
    
    streamingChat: `
async function streamResponse(prompt, model, onChunk) {
  const response = await puter.ai.chat(prompt, { model, stream: true });
  let fullText = '';
  for await (const part of response) {
    if (part?.text) {
      fullText += part.text;
      onChunk(part.text);
    }
  }
  return fullText;
}`,

    multiTurnConversation: `
async function conversation(messages, model) {
  return await puter.ai.chat(messages.map(m => ({
    role: m.role, // 'system', 'user', or 'assistant'
    content: m.content
  })), { model });
}`,

    retryWithFallback: `
async function callWithFallback(prompt, primaryModel, fallbackModel) {
  try {
    return await puter.ai.chat(prompt, { model: primaryModel });
  } catch (error) {
    console.warn('Primary model failed, using fallback:', error);
    return await puter.ai.chat(prompt, { model: fallbackModel });
  }
}`,

    parallelCalls: `
async function parallelAICalls(prompts, model) {
  return await Promise.all(
    prompts.map(prompt => puter.ai.chat(prompt, { model }))
  );
}`
  },

  /**
   * WORKER COMMUNICATION PROTOCOLS
   * How agents communicate with each other and the system
   */
  workerProtocols: {
    taskRequest: {
      format: {
        type: 'TASK_REQUEST',
        taskId: 'uuid',
        taskType: 'code|analysis|creative|debug',
        priority: 'low|medium|high|critical',
        payload: {},
        deadline: 'ISO timestamp or null'
      }
    },
    taskResponse: {
      format: {
        type: 'TASK_RESPONSE',
        taskId: 'uuid',
        status: 'pending|working|completed|failed',
        result: {},
        metrics: { tokensUsed: 0, latencyMs: 0 }
      }
    },
    heartbeat: {
      format: {
        type: 'HEARTBEAT',
        agentId: 'uuid',
        status: 'online|busy|idle|offline',
        currentTask: 'taskId or null',
        capacity: 0.0 // 0-1 availability
      },
      interval: 30000 // 30 seconds
    }
  },

  /**
   * STORAGE PATTERNS - Using Puter KV
   */
  storagePatterns: {
    saveToKV: `await puter.kv.set('key', value)`,
    loadFromKV: `const value = await puter.kv.get('key')`,
    deleteFromKV: `await puter.kv.del('key')`,
    listKeys: `const keys = await puter.kv.list()`,
    
    namespacing: `
// Always namespace agent data
const AGENT_NS = 'agent:worker:';
await puter.kv.set(AGENT_NS + 'memory', memoryData);
await puter.kv.set(AGENT_NS + 'tasks', taskQueue);
await puter.kv.set(AGENT_NS + 'skills', learnedSkills);`
  },

  /**
   * ERROR HANDLING PATTERNS
   */
  errorHandling: {
    rateLimiting: `
async function withRateLimit(fn, maxRetries = 3, baseDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.message?.includes('rate limit') && i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, i)));
        continue;
      }
      throw error;
    }
  }
}`,
    
    gracefulDegradation: `
async function callWithDegradation(prompt, models) {
  for (const model of models) {
    try {
      return { result: await puter.ai.chat(prompt, { model }), model };
    } catch (error) {
      console.warn(\`Model \${model} failed, trying next...\`);
    }
  }
  throw new Error('All models failed');
}`
  }
};

/**
 * Model selector utility for agents
 */
export function selectModel(taskType, preferFree = false) {
  const mapping = KNOWLEDGE_BASE.taskModelMapping[taskType];
  if (!mapping) {
    return preferFree 
      ? 'openrouter:meta-llama/llama-3.3-70b-instruct:free'
      : 'openrouter:anthropic/claude-sonnet-4';
  }
  return preferFree ? mapping.fallback : mapping.primary;
}

/**
 * Quick AI call wrapper for agents
 */
export async function agentAICall(prompt, options = {}) {
  const {
    taskType = 'quickTasks',
    preferFree = false,
    stream = false,
    systemPrompt = null
  } = options;
  
  const model = selectModel(taskType, preferFree);
  
  const messages = systemPrompt 
    ? [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }]
    : prompt;
  
  return await puter.ai.chat(messages, { model, stream });
}

/**
 * Get all available free models
 */
export function getFreeMddels() {
  return KNOWLEDGE_BASE.openRouterModels.recommended.free;
}

/**
 * Get models by capability
 */
export function getModelsByCapability(capability) {
  return KNOWLEDGE_BASE.openRouterModels.recommended[capability] || [];
}

/**
 * Re-export free API resources for convenience
 */
export { FREE_API_RESOURCES, getFontEmbed, getPlaceholderImage, getRecommendedAPI };

export default KNOWLEDGE_BASE;
