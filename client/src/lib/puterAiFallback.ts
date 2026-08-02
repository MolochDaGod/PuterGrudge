/**
 * Minimal Puter AI client used when /grudgeos/lib/puter-ai-service.js fails to load.
 * Matches the window.puterAI surface that AIContext expects.
 */

export type PuterAIChatResult = {
  success: boolean;
  content?: string;
  model?: string;
  duration?: number;
  conversationId?: string;
  error?: string;
};

type ChatOptions = {
  model?: string;
  conversationId?: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  useHistory?: boolean;
  stream?: boolean;
};

declare global {
  interface Window {
    puter?: {
      ai?: {
        chat: (messages: unknown, options?: Record<string, unknown>) => Promise<unknown>;
      };
      kv?: {
        get: (key: string) => Promise<string | null>;
        set: (key: string, value: string) => Promise<void>;
      };
      auth?: { isSignedIn: () => boolean | Promise<boolean>; signIn: () => Promise<void> };
    };
    puterAI?: PuterAIFallback;
    PuterAIService?: typeof PuterAIFallback;
  }
}

export class PuterAIFallback {
  initialized = false;
  defaultModel = 'claude-sonnet-4';
  private history = new Map<string, Array<{ role: string; content: string }>>();
  private models: Record<string, { provider: string; maxTokens: number }> = {
    'claude-sonnet-4': { provider: 'anthropic', maxTokens: 8192 },
    'claude-3-5-sonnet': { provider: 'anthropic', maxTokens: 8192 },
    'gpt-4o': { provider: 'openai', maxTokens: 4096 },
    'gpt-4o-mini': { provider: 'openai', maxTokens: 4096 },
    'gemini-2.0-flash': { provider: 'google', maxTokens: 8192 },
  };

  async init(): Promise<boolean> {
    if (this.initialized) return true;
    if (typeof window === 'undefined' || !window.puter?.ai?.chat) {
      console.warn('[PuterAIFallback] puter.ai.chat not available yet');
      return false;
    }
    this.initialized = true;
    return true;
  }

  async chat(prompt: string, options: ChatOptions = {}): Promise<PuterAIChatResult> {
    const ready = await this.init();
    if (!ready || !window.puter?.ai?.chat) {
      return { success: false, error: 'Puter AI SDK not loaded. Open puter.com or wait for js.puter.com.' };
    }

    const model = options.model || this.defaultModel;
    const conversationId = options.conversationId || 'default';
    const messages: Array<{ role: string; content: string }> = [];

    if (options.system) {
      messages.push({ role: 'system', content: options.system });
    }
    if (options.useHistory !== false) {
      messages.push(...(this.history.get(conversationId) || []));
    }
    messages.push({ role: 'user', content: prompt });

    const start = Date.now();
    try {
      const response = (await window.puter.ai.chat(messages, {
        model,
        max_tokens: options.maxTokens || this.models[model]?.maxTokens || 4096,
        temperature: options.temperature ?? 0.7,
        stream: false,
      })) as {
        message?: { content?: string };
        content?: string;
      };

      const content =
        (typeof response === 'string' ? response : null) ||
        response?.message?.content ||
        response?.content ||
        String(response ?? '');

      if (options.useHistory !== false) {
        const hist = this.history.get(conversationId) || [];
        hist.push({ role: 'user', content: prompt });
        hist.push({ role: 'assistant', content });
        if (hist.length > 40) hist.splice(0, hist.length - 40);
        this.history.set(conversationId, hist);
      }

      return {
        success: true,
        content,
        model,
        duration: Date.now() - start,
        conversationId,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI request failed';
      return { success: false, error: message, model };
    }
  }

  async generateCode(prompt: string, language = 'javascript', options: ChatOptions = {}) {
    return this.chat(prompt, {
      ...options,
      system: `You are an expert ${language} programmer. Return clean code. Prefer modern patterns.`,
      temperature: options.temperature ?? 0.3,
    });
  }

  async analyzeCode(code: string, question = 'What does this code do?', options: ChatOptions = {}) {
    return this.chat(`Analyze this code:\n\`\`\`\n${code}\n\`\`\`\n\n${question}`, {
      ...options,
      temperature: options.temperature ?? 0.2,
    });
  }

  async fixCode(code: string, error: string, language = 'javascript', options: ChatOptions = {}) {
    return this.chat(
      `Fix this ${language} code.\nError: ${error}\n\n\`\`\`${language}\n${code}\n\`\`\`\nReturn only fixed code.`,
      { ...options, temperature: 0.1 },
    );
  }

  clearConversation(conversationId = 'default') {
    this.history.delete(conversationId);
  }

  getConversationHistory(conversationId = 'default') {
    return this.history.get(conversationId) || [];
  }

  exportConversation(conversationId = 'default') {
    return {
      conversationId,
      messages: this.getConversationHistory(conversationId),
      exportedAt: new Date().toISOString(),
    };
  }

  importConversation(data: { conversationId?: string; messages?: Array<{ role: string; content: string }> }) {
    if (data?.conversationId && Array.isArray(data.messages)) {
      this.history.set(data.conversationId, data.messages);
      return true;
    }
    return false;
  }
}

/** Install fallback on window if full puterAI script did not load. */
export function ensurePuterAI(): PuterAIFallback {
  if (typeof window === 'undefined') {
    return new PuterAIFallback();
  }
  if (window.puterAI && typeof window.puterAI.chat === 'function') {
    return window.puterAI as PuterAIFallback;
  }
  const fallback = new PuterAIFallback();
  window.puterAI = fallback;
  window.PuterAIService = PuterAIFallback;
  console.info('[PuterAIFallback] installed window.puterAI');
  return fallback;
}

/** Wait briefly for Puter SDK + optional global script. */
export async function waitForPuterAI(timeoutMs = 8000): Promise<PuterAIFallback | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (window.puterAI?.chat) return window.puterAI as PuterAIFallback;
    if (window.puter?.ai?.chat) return ensurePuterAI();
    await new Promise((r) => setTimeout(r, 200));
  }
  // Last attempt: install fallback even if puter is late
  if (window.puter?.ai?.chat) return ensurePuterAI();
  return window.puterAI ? (window.puterAI as PuterAIFallback) : null;
}
