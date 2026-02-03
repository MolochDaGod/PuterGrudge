import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ContextEngine, type UserContext } from '@/services/context/ContextEngine';

// Declare global puterAI from public/grudgeos/lib/puter-ai-service.js
// Note: puter is already declared in usePuter.ts
declare global {
  interface Window {
    puterAI: any;
  }
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
  duration?: number;
}

export interface AIState {
  initialized: boolean;
  available: boolean;
  currentModel: string;
  conversationId: string;
  messages: AIMessage[];
  isThinking: boolean;
  error: string | null;
  context: UserContext | null;
}

export interface AIContextValue extends AIState {
  // Core functions
  sendMessage: (content: string, options?: SendMessageOptions) => Promise<void>;
  setModel: (model: string) => void;
  setConversationId: (id: string) => void;
  clearConversation: () => void;

  // Specialized functions
  generateCode: (prompt: string, language?: string) => Promise<string | null>;
  analyzeCode: (code: string, question?: string) => Promise<string | null>;
  fixCode: (code: string, error: string, language?: string) => Promise<string | null>;
  askQuestion: (question: string) => Promise<string | null>;

  // Context management
  updateContext: (contextUpdate: Partial<UserContext>) => void;
  getContextSummary: () => string;

  // State management
  exportConversation: () => any;
  importConversation: (data: any) => void;
}

export interface SendMessageOptions {
  model?: string;
  includeContext?: boolean;
  temperature?: number;
  maxTokens?: number;
}

const AIContext = createContext<AIContextValue | null>(null);

export function AIProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AIState>({
    initialized: false,
    available: false,
    currentModel: 'claude-sonnet-4',
    conversationId: 'default',
    messages: [],
    isThinking: false,
    error: null,
    context: null,
  });

  const contextUnsubscribe = useRef<(() => void) | null>(null);

  // Initialize AI service and context engine
  useEffect(() => {
    const init = async () => {
      try {
        // Wait for puterAI to be available
        if (!window.puterAI) {
          console.warn('[AIContext] PuterAI not available, waiting... - AIContext.tsx:83');

          // Retry every 500ms for up to 5 seconds
          let retries = 10;
          while (!window.puterAI && retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
            retries--;
          }

          if (!window.puterAI) {
            throw new Error('PuterAI service not loaded');
          }
        }

        const success = await window.puterAI.init();

        // Subscribe to context changes
        contextUnsubscribe.current = ContextEngine.subscribe((context) => {
          setState(prev => ({ ...prev, context }));
        });

        // Load conversation from Puter KV if available
        await loadConversation();

        setState(prev => ({
          ...prev,
          initialized: true,
          available: success,
          context: ContextEngine.getContext(),
        }));

        console.log('[AIContext] Initialized successfully - AIContext.tsx:114');
      } catch (error) {
        console.error('[AIContext] Initialization failed: - AIContext.tsx:116', error);
        setState(prev => ({
          ...prev,
          initialized: true,
          available: false,
          error: error instanceof Error ? error.message : 'Failed to initialize AI',
        }));
      }
    };

    init();

    return () => {
      if (contextUnsubscribe.current) {
        contextUnsubscribe.current();
      }
    };
  }, []);

  // Load conversation from Puter KV
  const loadConversation = async () => {
    try {
      if (!window.puter?.kv) return;

      const saved = await window.puter.kv.get('ai_conversation_default');
      if (saved) {
        const data = JSON.parse(saved);
        const messages = data.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        setState(prev => ({ ...prev, messages }));
      }
    } catch (error) {
      console.warn('[AIContext] Failed to load conversation: - AIContext.tsx:150', error);
    }
  };

  // Save conversation to Puter KV
  const saveConversation = useCallback(async (messages: AIMessage[]) => {
    try {
      if (!window.puter?.kv) return;

      const data = {
        conversationId: state.conversationId,
        messages: messages.map(m => ({
          ...m,
          timestamp: m.timestamp.toISOString()
        })),
        savedAt: new Date().toISOString()
      };

      await window.puter.kv.set(`ai_conversation_${state.conversationId}`, JSON.stringify(data));
    } catch (error) {
      console.warn('[AIContext] Failed to save conversation: - AIContext.tsx:170', error);
    }
  }, [state.conversationId]);

  // Send message to AI
  const sendMessage = useCallback(async (content: string, options: SendMessageOptions = {}) => {
    if (!state.available || !window.puterAI) {
      console.error('[AIContext] AI service not available - AIContext.tsx:177');
      return;
    }

    const userMessage: AIMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isThinking: true,
      error: null,
    }));

    try {
      // Build context-aware prompt
      let finalPrompt = content;
      if (options.includeContext !== false) {
        const contextSummary = ContextEngine.getContextSummary();
        if (contextSummary) {
          finalPrompt = `Context:\n${contextSummary}\n\nUser: ${content}`;
        }
      }

      // Call AI
      const model = options.model || state.currentModel;
      const response = await window.puterAI.chat(finalPrompt, {
        model,
        conversationId: state.conversationId,
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens,
      });

      if (response.success) {
        const assistantMessage: AIMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.content,
          timestamp: new Date(),
          model: response.model,
          duration: response.duration,
        };

        const newMessages = [...state.messages, userMessage, assistantMessage];
        setState(prev => ({
          ...prev,
          messages: newMessages,
          isThinking: false,
        }));

        // Save conversation
        await saveConversation(newMessages);

        // Update context engine
        ContextEngine.addConversationContext(content);

        // Record interaction for AI evolution learning (fire and forget)
        fetch('/api/ai/evolution/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: content,
            output: response.content,
            context: { route: window.location.pathname },
            modelUsed: response.model || model,
            latency: response.duration || 0,
            tokensUsed: Math.ceil((content.length + response.content.length) / 4),
          }),
        }).catch(() => { }); // Silent fail - learning is optional
      } else {
        throw new Error(response.error || 'AI request failed');
      }
    } catch (error) {
      console.error('[AIContext] Send message error: - AIContext.tsx:240', error);
      setState(prev => ({
        ...prev,
        isThinking: false,
        error: error instanceof Error ? error.message : 'Failed to send message',
      }));
    }
  }, [state.available, state.currentModel, state.conversationId, state.messages, saveConversation]);

  // Specialized: Generate code
  const generateCode = useCallback(async (prompt: string, language: string = 'javascript'): Promise<string | null> => {
    if (!window.puterAI) return null;

    try {
      const response = await window.puterAI.generateCode(prompt, language);
      return response.success ? response.content : null;
    } catch (error) {
      console.error('[AIContext] Generate code error: - AIContext.tsx:257', error);
      return null;
    }
  }, []);

  // Specialized: Analyze code
  const analyzeCode = useCallback(async (code: string, question: string = 'What does this code do?'): Promise<string | null> => {
    if (!window.puterAI) return null;

    try {
      const response = await window.puterAI.analyzeCode(code, question);
      return response.success ? response.content : null;
    } catch (error) {
      console.error('[AIContext] Analyze code error: - AIContext.tsx:270', error);
      return null;
    }
  }, []);

  // Specialized: Fix code
  const fixCode = useCallback(async (code: string, error: string, language: string = 'javascript'): Promise<string | null> => {
    if (!window.puterAI) return null;

    try {
      const response = await window.puterAI.fixCode(code, error, language);
      return response.success ? response.content : null;
    } catch (error) {
      console.error('[AIContext] Fix code error: - AIContext.tsx:283', error);
      return null;
    }
  }, []);

  // Quick question
  const askQuestion = useCallback(async (question: string): Promise<string | null> => {
    if (!window.puterAI) return null;

    try {
      const response = await window.puterAI.chat(question, {
        conversationId: 'quick-question',
        useHistory: false,
      });
      return response.success ? response.content : null;
    } catch (error) {
      console.error('[AIContext] Ask question error: - AIContext.tsx:299', error);
      return null;
    }
  }, []);

  // Model management
  const setModel = useCallback((model: string) => {
    setState(prev => ({ ...prev, currentModel: model }));
  }, []);

  const setConversationId = useCallback((id: string) => {
    setState(prev => ({ ...prev, conversationId: id }));
  }, []);

  const clearConversation = useCallback(async () => {
    setState(prev => ({ ...prev, messages: [] }));
    if (window.puterAI) {
      window.puterAI.clearConversation(state.conversationId);
    }
    ContextEngine.clearConversationContext();

    // Clear from Puter KV
    try {
      if (window.puter?.kv) {
        await window.puter.kv.delete(`ai_conversation_${state.conversationId}`);
      }
    } catch (error) {
      console.warn('[AIContext] Failed to clear conversation: - AIContext.tsx:326', error);
    }
  }, [state.conversationId]);

  // Context management
  const updateContext = useCallback((contextUpdate: Partial<UserContext>) => {
    // This would be called by components to update context
    // For now, context is managed by ContextEngine directly
    console.log('[AIContext] Context update: - AIContext.tsx:334', contextUpdate);
  }, []);

  const getContextSummary = useCallback(() => {
    return ContextEngine.getContextSummary();
  }, []);

  // Export/Import
  const exportConversation = useCallback(() => {
    return {
      conversationId: state.conversationId,
      messages: state.messages,
      model: state.currentModel,
      exportedAt: new Date().toISOString(),
    };
  }, [state.conversationId, state.messages, state.currentModel]);

  const importConversation = useCallback(async (data: any) => {
    if (data.messages && Array.isArray(data.messages)) {
      const messages = data.messages.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp)
      }));
      setState(prev => ({
        ...prev,
        messages,
        conversationId: data.conversationId || 'imported',
        currentModel: data.model || prev.currentModel,
      }));
      await saveConversation(messages);
    }
  }, [saveConversation]);

  const value: AIContextValue = {
    ...state,
    sendMessage,
    setModel,
    setConversationId,
    clearConversation,
    generateCode,
    analyzeCode,
    fixCode,
    askQuestion,
    updateContext,
    getContextSummary,
    exportConversation,
    importConversation,
  };

  return <AIContext.Provider value={ value }> { children } </AIContext.Provider>;
}

export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within AIProvider');
  }
  return context;
}
