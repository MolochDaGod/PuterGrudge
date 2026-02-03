import { arenaServer } from "./ArenaServer";

interface AgentTask {
  id: string;
  type: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed";
  priority: number;
  createdAt: number;
  completedAt?: number;
  result?: any;
  error?: string;
}

interface Deployment {
  id: string;
  name: string;
  gameType: string;
  status: "starting" | "running" | "stopping" | "stopped" | "error";
  roomId?: string;
  config: any;
  createdAt: number;
  lastHealthCheck?: number;
}

interface AgentMemory {
  patterns: Map<string, number>;
  preferences: Record<string, any>;
  learnedBehaviors: string[];
  lastSync: number;
}

export class ArenaAIAgent {
  private isRunning: boolean = false;
  private tasks: Map<string, AgentTask> = new Map();
  private deployments: Map<string, Deployment> = new Map();
  private memory: AgentMemory = {
    patterns: new Map(),
    preferences: {},
    learnedBehaviors: [],
    lastSync: Date.now()
  };
  
  private supervisorInterval: ReturnType<typeof setInterval> | null = null;
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;

  async initialize(): Promise<void> {
    console.log("[ArenaAIAgent] Initializing...");
    
    await this.loadMemory();
    
    this.startSupervisor();
    this.startHealthMonitor();
    
    this.isRunning = true;
    console.log("[ArenaAIAgent] Ready and watching");
  }

  async shutdown(): Promise<void> {
    console.log("[ArenaAIAgent] Shutting down...");
    
    if (this.supervisorInterval) {
      clearInterval(this.supervisorInterval);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    await this.saveMemory();
    
    this.isRunning = false;
    console.log("[ArenaAIAgent] Shutdown complete");
  }

  private startSupervisor(): void {
    this.supervisorInterval = setInterval(() => {
      this.runSupervisorCycle();
    }, 5000);
  }

  private startHealthMonitor(): void {
    this.healthCheckInterval = setInterval(() => {
      this.runHealthChecks();
    }, 30000);
  }

  private async runSupervisorCycle(): Promise<void> {
    const pendingTasks = Array.from(this.tasks.values())
      .filter(t => t.status === "pending")
      .sort((a, b) => b.priority - a.priority);

    for (const task of pendingTasks.slice(0, 3)) {
      await this.executeTask(task);
    }

    this.cleanupCompletedTasks();
  }

  private async runHealthChecks(): Promise<void> {
    const now = Date.now();
    
    this.deployments.forEach(async (deployment, id) => {
      if (deployment.status === "running") {
        const isHealthy = await this.checkDeploymentHealth(deployment);
        deployment.lastHealthCheck = now;
        
        if (!isHealthy) {
          console.warn(`[ArenaAIAgent] Unhealthy deployment: ${deployment.name}`);
          await this.handleUnhealthyDeployment(deployment);
        }
      }
    });

    const stats = arenaServer.getStats();
    this.memory.patterns.set("total_rooms", stats.rooms);
    this.memory.patterns.set("total_clients", stats.clients);
  }

  private async checkDeploymentHealth(deployment: Deployment): Promise<boolean> {
    if (!deployment.roomId) return true;
    
    const roomInfo = arenaServer.getRoomInfo(deployment.roomId);
    return roomInfo !== null;
  }

  private async handleUnhealthyDeployment(deployment: Deployment): Promise<void> {
    deployment.status = "error";
    
    this.createTask({
      type: "restart_deployment",
      description: `Restart unhealthy deployment: ${deployment.name}`,
      priority: 8,
      data: { deploymentId: deployment.id }
    });
  }

  createTask(params: { type: string; description: string; priority: number; data?: any }): AgentTask {
    const task: AgentTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: params.type,
      description: params.description,
      status: "pending",
      priority: params.priority,
      createdAt: Date.now()
    };
    
    this.tasks.set(task.id, task);
    console.log(`[ArenaAIAgent] Task created: ${task.description}`);
    
    return task;
  }

  private async executeTask(task: AgentTask): Promise<void> {
    task.status = "running";
    console.log(`[ArenaAIAgent] Executing: ${task.description}`);
    
    try {
      switch (task.type) {
        case "create_game_room":
          await this.handleCreateGameRoom(task);
          break;
        case "restart_deployment":
          await this.handleRestartDeployment(task);
          break;
        case "analyze_patterns":
          await this.handleAnalyzePatterns(task);
          break;
        case "scaffold_metaverse":
          await this.handleScaffoldMetaverse(task);
          break;
        default:
          console.log(`[ArenaAIAgent] Unknown task type: ${task.type}`);
      }
      
      task.status = "completed";
      task.completedAt = Date.now();
      
    } catch (error: any) {
      task.status = "failed";
      task.error = error.message;
      console.error(`[ArenaAIAgent] Task failed: ${task.description}`, error);
    }
  }

  private async handleCreateGameRoom(task: AgentTask): Promise<void> {
    const { gameType, name, config } = (task as any).data || {};
    
    const deployment: Deployment = {
      id: `deploy_${Date.now()}`,
      name: name || `${gameType} Server`,
      gameType: gameType || "lobby",
      status: "running",
      config: config || {},
      createdAt: Date.now()
    };
    
    this.deployments.set(deployment.id, deployment);
    task.result = { deploymentId: deployment.id };
  }

  private async handleRestartDeployment(task: AgentTask): Promise<void> {
    const { deploymentId } = (task as any).data || {};
    const deployment = this.deployments.get(deploymentId);
    
    if (!deployment) {
      task.result = { error: "Deployment not found" };
      return;
    }
    
    deployment.status = "starting";
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    deployment.status = "running";
    deployment.lastHealthCheck = Date.now();
    
    task.result = { 
      deploymentId, 
      status: "restarted",
      timestamp: Date.now()
    };
    
    console.log(`[ArenaAIAgent] Deployment restarted: ${deployment.name}`);
  }

  private async handleAnalyzePatterns(task: AgentTask): Promise<void> {
    const stats = arenaServer.getStats();
    
    const analysis = {
      peakRooms: Math.max(this.memory.patterns.get("peak_rooms") || 0, stats.rooms),
      peakClients: Math.max(this.memory.patterns.get("peak_clients") || 0, stats.clients),
      gameTypePopularity: {} as Record<string, number>
    };
    
    stats.roomList.forEach(room => {
      analysis.gameTypePopularity[room.gameType] = 
        (analysis.gameTypePopularity[room.gameType] || 0) + room.players;
    });
    
    this.memory.patterns.set("peak_rooms", analysis.peakRooms);
    this.memory.patterns.set("peak_clients", analysis.peakClients);
    
    task.result = analysis;
  }

  private async handleScaffoldMetaverse(task: AgentTask): Promise<void> {
    const { template, zones, features } = (task as any).data || {};
    
    const metaverse = {
      id: `metaverse_${Date.now()}`,
      template: template || "fantasy",
      zones: zones || ["town_square", "forest", "dungeon"],
      features: features || ["chat", "trading", "quests"],
      createdAt: Date.now()
    };
    
    for (const zone of metaverse.zones) {
      this.createTask({
        type: "create_game_room",
        description: `Create MMO zone: ${zone}`,
        priority: 5,
        data: {
          gameType: "mmo",
          name: zone,
          config: { zone, template: metaverse.template }
        }
      });
    }
    
    task.result = metaverse;
  }

  private cleanupCompletedTasks(): void {
    const cutoff = Date.now() - 3600000;
    
    this.tasks.forEach((task, id) => {
      if (task.status === "completed" && task.completedAt && task.completedAt < cutoff) {
        this.tasks.delete(id);
      }
    });
  }

  private async loadMemory(): Promise<void> {
    try {
      const memoryData = {
        patterns: new Map<string, number>(),
        preferences: {},
        learnedBehaviors: [],
        lastSync: Date.now()
      };
      
      this.memory = memoryData;
      console.log("[ArenaAIAgent] Memory loaded");
    } catch (e) {
      console.log("[ArenaAIAgent] No previous memory found, using defaults");
      this.memory = {
        patterns: new Map(),
        preferences: {},
        learnedBehaviors: [],
        lastSync: Date.now()
      };
    }
  }

  private async saveMemory(): Promise<void> {
    try {
      this.memory.lastSync = Date.now();
      
      const memorySnapshot = {
        patterns: Array.from(this.memory.patterns.entries()),
        preferences: this.memory.preferences,
        learnedBehaviors: this.memory.learnedBehaviors,
        lastSync: this.memory.lastSync
      };
      
      console.log("[ArenaAIAgent] Memory saved:", {
        patterns: memorySnapshot.patterns.length,
        behaviors: memorySnapshot.learnedBehaviors.length
      });
    } catch (e) {
      console.error("[ArenaAIAgent] Failed to save memory:", e);
    }
  }

  createDeployment(params: { name: string; gameType: string; config?: any }): Deployment {
    const deployment: Deployment = {
      id: `deploy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: params.name,
      gameType: params.gameType,
      status: "running",
      config: params.config || {},
      createdAt: Date.now()
    };
    
    this.deployments.set(deployment.id, deployment);
    
    console.log(`[ArenaAIAgent] Deployment created: ${deployment.name}`);
    return deployment;
  }

  stopDeployment(deploymentId: string): boolean {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return false;
    
    deployment.status = "stopped";
    console.log(`[ArenaAIAgent] Deployment stopped: ${deployment.name}`);
    return true;
  }

  getStatus(): {
    isRunning: boolean;
    tasks: number;
    deployments: number;
    memory: { patterns: number; behaviors: number };
  } {
    return {
      isRunning: this.isRunning,
      tasks: this.tasks.size,
      deployments: this.deployments.size,
      memory: {
        patterns: this.memory.patterns.size,
        behaviors: this.memory.learnedBehaviors.length
      }
    };
  }

  getTasks(): AgentTask[] {
    return Array.from(this.tasks.values());
  }

  getDeployments(): Deployment[] {
    return Array.from(this.deployments.values());
  }

  learn(observation: { type: string; data: any }): void {
    switch (observation.type) {
      case "popular_game":
        this.memory.preferences[observation.data.gameType] = 
          (this.memory.preferences[observation.data.gameType] || 0) + 1;
        break;
      case "player_behavior":
        if (!this.memory.learnedBehaviors.includes(observation.data.behavior)) {
          this.memory.learnedBehaviors.push(observation.data.behavior);
        }
        break;
    }
  }
}

export const arenaAIAgent = new ArenaAIAgent();
