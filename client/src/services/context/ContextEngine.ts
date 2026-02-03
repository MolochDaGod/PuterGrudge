/**
 * Context Engine - Tracks user activity and builds context for AI
 * Provides situational awareness to AI companion
 */

export interface UserContext {
  // Navigation
  currentRoute: string;
  previousRoute: string | null;
  routeHistory: string[];
  
  // Activity
  currentFile: string | null;
  openFiles: string[];
  recentCommands: string[];
  recentErrors: Array<{ message: string; timestamp: Date }>;
  
  // System state
  systemMetrics: {
    cpu: number;
    memory: number;
    timestamp: Date;
  } | null;
  
  // User behavior
  lastActivity: Date;
  sessionStart: Date;
  activityCount: number;
  
  // AI interaction
  conversationContext: string[];
  lastAIInteraction: Date | null;
  
  // Privacy
  allowFileAccess: boolean;
  allowSystemAccess: boolean;
  allowHistoryAccess: boolean;
}

export type ContextChangeCallback = (context: UserContext) => void;

class ContextEngineService {
  private context: UserContext;
  private listeners: ContextChangeCallback[] = [];
  private activityTimeout: NodeJS.Timeout | null = null;
  private readonly INACTIVITY_THRESHOLD = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.context = this.getInitialContext();
    this.startActivityMonitoring();
  }

  private getInitialContext(): UserContext {
    return {
      currentRoute: window.location.pathname,
      previousRoute: null,
      routeHistory: [window.location.pathname],
      currentFile: null,
      openFiles: [],
      recentCommands: [],
      recentErrors: [],
      systemMetrics: null,
      lastActivity: new Date(),
      sessionStart: new Date(),
      activityCount: 0,
      conversationContext: [],
      lastAIInteraction: null,
      allowFileAccess: true,
      allowSystemAccess: true,
      allowHistoryAccess: true,
    };
  }

  // ==================== NAVIGATION TRACKING ====================
  
  updateRoute(route: string) {
    this.context.previousRoute = this.context.currentRoute;
    this.context.currentRoute = route;
    this.context.routeHistory.push(route);
    
    // Keep last 50 routes
    if (this.context.routeHistory.length > 50) {
      this.context.routeHistory.shift();
    }
    
    this.recordActivity();
    this.notifyListeners();
  }

  // ==================== FILE TRACKING ====================
  
  openFile(filePath: string) {
    if (!this.context.allowFileAccess) return;
    
    this.context.currentFile = filePath;
    
    if (!this.context.openFiles.includes(filePath)) {
      this.context.openFiles.push(filePath);
    }
    
    // Keep last 20 open files
    if (this.context.openFiles.length > 20) {
      this.context.openFiles.shift();
    }
    
    this.recordActivity();
    this.notifyListeners();
  }

  closeFile(filePath: string) {
    if (!this.context.allowFileAccess) return;
    
    this.context.openFiles = this.context.openFiles.filter(f => f !== filePath);
    
    if (this.context.currentFile === filePath) {
      this.context.currentFile = this.context.openFiles[this.context.openFiles.length - 1] || null;
    }
    
    this.notifyListeners();
  }

  // ==================== COMMAND TRACKING ====================
  
  addCommand(command: string) {
    if (!this.context.allowHistoryAccess) return;
    
    this.context.recentCommands.push(command);
    
    // Keep last 50 commands
    if (this.context.recentCommands.length > 50) {
      this.context.recentCommands.shift();
    }
    
    this.recordActivity();
    this.notifyListeners();
  }

  // ==================== ERROR TRACKING ====================
  
  addError(message: string) {
    this.context.recentErrors.push({
      message,
      timestamp: new Date()
    });
    
    // Keep last 20 errors
    if (this.context.recentErrors.length > 20) {
      this.context.recentErrors.shift();
    }
    
    this.recordActivity();
    this.notifyListeners();
  }

  getRecentErrors(minutes: number = 5): Array<{ message: string; timestamp: Date }> {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.context.recentErrors.filter(e => e.timestamp > cutoff);
  }

  // ==================== SYSTEM METRICS ====================
  
  updateSystemMetrics(metrics: { cpu: number; memory: number }) {
    if (!this.context.allowSystemAccess) return;
    
    this.context.systemMetrics = {
      ...metrics,
      timestamp: new Date()
    };
    
    this.notifyListeners();
  }

  // ==================== AI CONVERSATION ====================
  
  addConversationContext(text: string) {
    this.context.conversationContext.push(text);
    this.context.lastAIInteraction = new Date();
    
    // Keep last 10 context items
    if (this.context.conversationContext.length > 10) {
      this.context.conversationContext.shift();
    }
    
    this.notifyListeners();
  }

  clearConversationContext() {
    this.context.conversationContext = [];
    this.notifyListeners();
  }

  // ==================== ACTIVITY MONITORING ====================
  
  private recordActivity() {
    this.context.lastActivity = new Date();
    this.context.activityCount++;
    
    // Reset inactivity timer
    if (this.activityTimeout) {
      clearTimeout(this.activityTimeout);
    }
    
    this.activityTimeout = setTimeout(() => {
      console.log('[ContextEngine] User inactive for 5 minutes');
    }, this.INACTIVITY_THRESHOLD);
  }

  private startActivityMonitoring() {
    // Track mouse movement
    document.addEventListener('mousemove', () => this.recordActivity());
    
    // Track keyboard
    document.addEventListener('keydown', () => this.recordActivity());
    
    // Track clicks
    document.addEventListener('click', () => this.recordActivity());
  }

  isUserActive(): boolean {
    const inactiveTime = Date.now() - this.context.lastActivity.getTime();
    return inactiveTime < this.INACTIVITY_THRESHOLD;
  }

  // ==================== CONTEXT BUILDING ====================
  
  buildAIContext(): string {
    const parts: string[] = [];
    
    // Current location
    parts.push(`Current location: ${this.context.currentRoute}`);
    
    // Current file
    if (this.context.currentFile && this.context.allowFileAccess) {
      parts.push(`Working on: ${this.context.currentFile}`);
    }
    
    // Recent errors
    const recentErrors = this.getRecentErrors();
    if (recentErrors.length > 0) {
      parts.push(`Recent errors (${recentErrors.length}): ${recentErrors.map(e => e.message).join(', ')}`);
    }
    
    // System status
    if (this.context.systemMetrics && this.context.allowSystemAccess) {
      const { cpu, memory } = this.context.systemMetrics;
      parts.push(`System: CPU ${cpu.toFixed(1)}%, Memory ${memory.toFixed(1)}%`);
    }
    
    // Session info
    const sessionDuration = Math.floor((Date.now() - this.context.sessionStart.getTime()) / 1000 / 60);
    parts.push(`Session: ${sessionDuration} minutes, ${this.context.activityCount} actions`);
    
    return parts.join('\n');
  }

  getContextSummary(): string {
    return this.buildAIContext();
  }

  // ==================== PRIVACY CONTROLS ====================
  
  setPrivacy(options: Partial<Pick<UserContext, 'allowFileAccess' | 'allowSystemAccess' | 'allowHistoryAccess'>>) {
    Object.assign(this.context, options);
    this.notifyListeners();
  }

  getPrivacySettings() {
    return {
      allowFileAccess: this.context.allowFileAccess,
      allowSystemAccess: this.context.allowSystemAccess,
      allowHistoryAccess: this.context.allowHistoryAccess,
    };
  }

  // ==================== STATE ACCESS ====================
  
  getContext(): Readonly<UserContext> {
    return { ...this.context };
  }

  // ==================== LISTENERS ====================
  
  subscribe(callback: ContextChangeCallback): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.getContext());
      } catch (error) {
        console.error('[ContextEngine] Listener error:', error);
      }
    });
  }

  // ==================== RESET ====================
  
  reset() {
    this.context = this.getInitialContext();
    this.notifyListeners();
  }
}

// Singleton instance
export const ContextEngine = new ContextEngineService();
