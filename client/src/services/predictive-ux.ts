/**
 * Predictive UX Service
 * Anticipates user needs and provides proactive suggestions
 */

import { ContextEngine } from './context/ContextEngine';

export interface Prediction {
  id: string;
  type: 'suggestion' | 'warning' | 'tip' | 'shortcut';
  title: string;
  description: string;
  action?: () => void;
  confidence: number;
  priority: number;
}

export interface UserPattern {
  action: string;
  frequency: number;
  lastOccurrence: Date;
  context: string[];
}

class PredictiveUXService {
  private patterns: Map<string, UserPattern> = new Map();
  private predictions: Prediction[] = [];
  private listeners: Set<(predictions: Prediction[]) => void> = new Set();

  constructor() {
    this.startPatternAnalysis();
  }

  /**
   * Analyze user behavior patterns
   */
  private startPatternAnalysis() {
    setInterval(() => {
      this.analyzePatternsAndPredict();
    }, 5000); // Analyze every 5 seconds
  }

  /**
   * Track user action
   */
  trackAction(action: string, context: string[] = []) {
    const existing = this.patterns.get(action);
    
    if (existing) {
      existing.frequency++;
      existing.lastOccurrence = new Date();
      existing.context = [...new Set([...existing.context, ...context])];
    } else {
      this.patterns.set(action, {
        action,
        frequency: 1,
        lastOccurrence: new Date(),
        context,
      });
    }
  }

  /**
   * Analyze patterns and generate predictions
   */
  private analyzePatternsAndPredict() {
    const newPredictions: Prediction[] = [];
    const contextSummary = ContextEngine.getContextSummary();

    // Detect repeated errors
    const recentErrors = ContextEngine.getContext().errors.slice(-3);
    if (recentErrors.length >= 2) {
      const similarErrors = recentErrors.filter(e => 
        e.message.includes(recentErrors[0].message.split(' ')[0])
      );
      
      if (similarErrors.length >= 2) {
        newPredictions.push({
          id: 'repeated-error',
          type: 'warning',
          title: 'Repeated Error Detected',
          description: `You've encountered "${recentErrors[0].message.slice(0, 50)}..." multiple times. Would you like AI help?`,
          confidence: 0.9,
          priority: 10,
        });
      }
    }

    // Detect idle time
    const lastActivity = ContextEngine.getContext().activity.lastActivity;
    const idleTime = Date.now() - lastActivity.getTime();
    
    if (idleTime > 60000 && idleTime < 120000) { // 1-2 minutes idle
      newPredictions.push({
        id: 'idle-suggestion',
        type: 'tip',
        title: 'Taking a Break?',
        description: 'Would you like me to summarize what you were working on?',
        confidence: 0.7,
        priority: 3,
      });
    }

    // Detect file switching pattern
    const recentFiles = ContextEngine.getContext().files.recentFiles.slice(-5);
    if (recentFiles.length >= 3) {
      const uniqueFiles = new Set(recentFiles);
      if (uniqueFiles.size >= 3) {
        newPredictions.push({
          id: 'multi-file-work',
          type: 'suggestion',
          title: 'Working Across Multiple Files?',
          description: 'I can help you refactor or find connections between these files.',
          confidence: 0.8,
          priority: 5,
        });
      }
    }

    // Detect high CPU/memory usage
    const systemMetrics = ContextEngine.getContext().system;
    if (systemMetrics.cpu > 80 || systemMetrics.memory > 85) {
      newPredictions.push({
        id: 'high-resource-usage',
        type: 'warning',
        title: 'High Resource Usage',
        description: `${systemMetrics.cpu > 80 ? 'CPU' : 'Memory'} usage is high. Consider closing unused applications.`,
        confidence: 1.0,
        priority: 8,
      });
    }

    // Detect frequent command usage
    const frequentCommands = Array.from(this.patterns.values())
      .filter(p => p.action.startsWith('command:'))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3);

    if (frequentCommands.length > 0 && frequentCommands[0].frequency > 5) {
      newPredictions.push({
        id: 'frequent-command',
        type: 'shortcut',
        title: 'Create a Shortcut?',
        description: `You've used "${frequentCommands[0].action.replace('command:', '')}" ${frequentCommands[0].frequency} times. Want to create a keyboard shortcut?`,
        confidence: 0.85,
        priority: 4,
      });
    }

    // Detect long session without breaks
    const sessionDuration = ContextEngine.getContext().activity.sessionDuration;
    if (sessionDuration > 7200000) { // 2 hours
      newPredictions.push({
        id: 'long-session',
        type: 'tip',
        title: 'Time for a Break?',
        description: "You've been coding for over 2 hours. Taking breaks improves productivity!",
        confidence: 0.9,
        priority: 6,
      });
    }

    // Update predictions
    this.predictions = newPredictions;
    this.notifyListeners();
  }

  /**
   * Get current predictions
   */
  getPredictions(): Prediction[] {
    return [...this.predictions].sort((a, b) => b.priority - a.priority);
  }

  /**
   * Dismiss a prediction
   */
  dismissPrediction(id: string) {
    this.predictions = this.predictions.filter(p => p.id !== id);
    this.notifyListeners();
  }

  /**
   * Subscribe to prediction updates
   */
  subscribe(callback: (predictions: Prediction[]) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.predictions));
  }

  /**
   * Get user patterns for analysis
   */
  getPatterns(): UserPattern[] {
    return Array.from(this.patterns.values())
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Clear all patterns and predictions
   */
  clear() {
    this.patterns.clear();
    this.predictions = [];
    this.notifyListeners();
  }
}

export const predictiveUX = new PredictiveUXService();

