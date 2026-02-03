/**
 * AI Orchestration Layer
 * Intelligent routing, multi-agent coordination, and task optimization
 */

import { logger } from './logger';
import { unifiedMemory } from './unified-memory';
import { aiAPIManager } from './ai-api-manager';

export interface AITask {
  id: string;
  type: 'code_generation' | 'code_review' | 'debugging' | 'explanation' | 'refactoring' | 'testing' | 'documentation';
  prompt: string;
  context?: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  deadline?: Date;
}

export interface AIAgent {
  id: string;
  role: string;
  model: string;
  specialization: string[];
  performance: {
    tasksCompleted: number;
    averageLatency: number;
    successRate: number;
  };
}

export interface TaskResult {
  taskId: string;
  agentId: string;
  result: string;
  confidence: number;
  latency: number;
  tokensUsed: number;
}

class AIOrchestrator {
  private agents: Map<string, AIAgent> = new Map();
  private taskQueue: AITask[] = [];
  private activeTasksCount = 0;
  private maxConcurrentTasks = 5;

  constructor() {
    this.initializeAgents();
  }

  private initializeAgents() {
    // Define specialized agents
    const agentConfigs: Omit<AIAgent, 'performance'>[] = [
      {
        id: 'coder-claude',
        role: 'Code Generation',
        model: 'claude-sonnet-4',
        specialization: ['code_generation', 'refactoring', 'testing'],
      },
      {
        id: 'reviewer-gpt',
        role: 'Code Review',
        model: 'gpt-4o',
        specialization: ['code_review', 'debugging'],
      },
      {
        id: 'explainer-gemini',
        role: 'Documentation',
        model: 'gemini-2.0-flash',
        specialization: ['explanation', 'documentation'],
      },
      {
        id: 'debugger-deepseek',
        role: 'Debugging',
        model: 'deepseek-chat',
        specialization: ['debugging', 'code_review'],
      },
      {
        id: 'reasoner-o1',
        role: 'Complex Reasoning',
        model: 'o1',
        specialization: ['debugging', 'refactoring'],
      },
    ];

    agentConfigs.forEach(config => {
      this.agents.set(config.id, {
        ...config,
        performance: {
          tasksCompleted: 0,
          averageLatency: 0,
          successRate: 1.0,
        },
      });
    });

    logger.info(`[AIOrchestrator] Initialized ${this.agents.size} agents`);
  }

  /**
   * Route task to the best agent based on specialization and performance
   */
  private selectAgent(task: AITask): AIAgent | null {
    const candidates = Array.from(this.agents.values()).filter(agent =>
      agent.specialization.includes(task.type)
    );

    if (candidates.length === 0) return null;

    // Score agents based on performance and availability
    const scored = candidates.map(agent => ({
      agent,
      score: this.calculateAgentScore(agent, task),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored[0].agent;
  }

  private calculateAgentScore(agent: AIAgent, task: AITask): number {
    let score = agent.performance.successRate * 100;

    // Prefer faster agents for high priority tasks
    if (task.priority === 'critical' || task.priority === 'high') {
      score += (1000 - agent.performance.averageLatency) / 10;
    }

    // Penalize overloaded agents
    score -= this.activeTasksCount * 5;

    return score;
  }

  /**
   * Execute task with the best agent
   */
  async executeTask(task: AITask): Promise<TaskResult> {
    const agent = this.selectAgent(task);

    if (!agent) {
      throw new Error(`No suitable agent found for task type: ${task.type}`);
    }

    logger.info(`[AIOrchestrator] Assigning task ${task.id} to ${agent.id}`);

    const startTime = Date.now();
    this.activeTasksCount++;

    try {
      // Check cache first
      const cacheKey = `task:${task.type}:${this.hashPrompt(task.prompt)}`;
      const cached = await unifiedMemory.cacheGet<string>(cacheKey);

      if (cached) {
        logger.info(`[AIOrchestrator] Cache hit for task ${task.id}`);
        return {
          taskId: task.id,
          agentId: agent.id,
          result: cached,
          confidence: 0.95,
          latency: Date.now() - startTime,
          tokensUsed: 0,
        };
      }

      // Execute with AI
      const result = await this.callAI(agent.model, task.prompt, task.context);
      const latency = Date.now() - startTime;

      // Update agent performance
      this.updateAgentPerformance(agent.id, latency, true);

      // Cache result
      await unifiedMemory.cacheSet(cacheKey, result, 3600);

      return {
        taskId: task.id,
        agentId: agent.id,
        result,
        confidence: 0.9,
        latency,
        tokensUsed: this.estimateTokens(task.prompt + result),
      };
    } catch (error) {
      logger.error(`[AIOrchestrator] Task ${task.id} failed:`, error);
      this.updateAgentPerformance(agent.id, Date.now() - startTime, false);
      throw error;
    } finally {
      this.activeTasksCount--;
    }
  }

  private async callAI(model: string, prompt: string, context?: Record<string, any>): Promise<string> {
    // Use the AI API Manager for resilient AI calls
    return await aiAPIManager.executeAIRequest('puter-ai', async () => {
      // Build context-enhanced prompt
      let enhancedPrompt = prompt;
      if (context) {
        const contextStr = Object.entries(context)
          .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
          .join('\n');
        enhancedPrompt = `Context:\n${contextStr}\n\nTask: ${prompt}`;
      }

      // Make the actual API call to Puter AI via fetch
      // This will be called from the server, so we use the internal API
      const response = await fetch('http://localhost:5000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: enhancedPrompt,
          model: model,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.content || data.message || 'No response generated';
    }, { priority: 1, maxRetries: 2, timeout: 60000 });
  }

  private updateAgentPerformance(agentId: string, latency: number, success: boolean) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.performance.tasksCompleted++;
    agent.performance.averageLatency =
      (agent.performance.averageLatency * (agent.performance.tasksCompleted - 1) + latency) /
      agent.performance.tasksCompleted;

    if (success) {
      agent.performance.successRate =
        (agent.performance.successRate * (agent.performance.tasksCompleted - 1) + 1) /
        agent.performance.tasksCompleted;
    } else {
      agent.performance.successRate =
        (agent.performance.successRate * (agent.performance.tasksCompleted - 1)) /
        agent.performance.tasksCompleted;
    }
  }

  private hashPrompt(prompt: string): string {
    // Simple hash for caching
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      hash = ((hash << 5) - hash) + prompt.charCodeAt(i);
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  private estimateTokens(text: string): number {
    // Rough estimate: ~4 chars per token
    return Math.ceil(text.length / 4);
  }

  getAgentStats() {
    return Array.from(this.agents.values()).map(agent => ({
      id: agent.id,
      role: agent.role,
      model: agent.model,
      performance: agent.performance,
    }));
  }
}

export const aiOrchestrator = new AIOrchestrator();

