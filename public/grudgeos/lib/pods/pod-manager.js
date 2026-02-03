class PodManager {
  static POD_STATUS = {
    IDLE: 'idle',
    WARMING: 'warming',
    BUSY: 'busy',
    COOLING: 'cooling',
    TERMINATED: 'terminated'
  };

  static JOB_STATUS = {
    PENDING: 'pending',
    QUEUED: 'queued',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
  };

  constructor() {
    this.namespace = 'compute_pods';
    this.pods = new Map();
    this.jobQueue = [];
    this.runningJobs = new Map();
    this.completedJobs = [];
    this.initialized = false;
    this.maxPods = 8;
    this.pollInterval = null;
    
    this.agentNamespaces = new Map();
    this.warmPool = [];
    this.warmPoolSize = 2;
    this.resourceAccounting = new Map();
    this.listeners = new Map();
  }

  async initialize() {
    if (this.initialized) return;
    
    await this.loadState();
    this.startJobProcessor();
    this.initialized = true;
    console.log('[PodManager] Initialized with', this.pods.size, 'pods');
  }

  async loadState() {
    if (typeof puter === 'undefined' || !puter.kv) return;
    try {
      const podsData = await puter.kv.get(`${this.namespace}:pods`);
      if (podsData) {
        const parsed = JSON.parse(podsData);
        parsed.forEach(pod => this.pods.set(pod.id, pod));
      }
      
      const queueData = await puter.kv.get(`${this.namespace}:queue`);
      if (queueData) {
        this.jobQueue = JSON.parse(queueData);
      }
      
      const completedData = await puter.kv.get(`${this.namespace}:completed`);
      if (completedData) {
        this.completedJobs = JSON.parse(completedData);
      }
    } catch (e) {
      console.log('[PodManager] No saved state');
    }
  }

  async saveState() {
    if (typeof puter === 'undefined' || !puter.kv) return;
    try {
      await puter.kv.set(`${this.namespace}:pods`, JSON.stringify(Array.from(this.pods.values())));
      await puter.kv.set(`${this.namespace}:queue`, JSON.stringify(this.jobQueue));
      await puter.kv.set(`${this.namespace}:completed`, JSON.stringify(this.completedJobs.slice(-100)));
    } catch (e) {
      console.warn('[PodManager] Failed to save state:', e.message);
    }
  }

  createPod(config = {}) {
    const pod = {
      id: `pod_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: config.name || `Pod-${this.pods.size + 1}`,
      status: PodManager.POD_STATUS.IDLE,
      runtime: config.runtime || 'browser',
      currentJob: null,
      agentId: config.agentId || null,
      namespace: config.namespace || 'default',
      stats: {
        jobsCompleted: 0,
        jobsFailed: 0,
        totalCpuMs: 0,
        memoryPeakMb: 0,
        uptime: 0
      },
      resources: {
        cpuLimit: config.cpuLimit || 100,
        memoryLimitMb: config.memoryLimitMb || 256,
        timeoutMs: config.timeoutMs || 30000,
        cpuUsed: 0,
        memoryUsedMb: 0
      },
      createdAt: new Date().toISOString(),
      lastActiveAt: null,
      environment: config.environment || {},
      capabilities: config.capabilities || ['code', 'ai', 'transform'],
      affinity: config.affinity || null
    };

    this.pods.set(pod.id, pod);
    
    if (pod.agentId) {
      this.bindPodToAgent(pod.id, pod.agentId);
    }
    
    this.emit('pod:created', pod);
    this.saveState();
    return pod;
  }

  bindPodToAgent(podId, agentId) {
    const pod = this.pods.get(podId);
    if (!pod) return;

    pod.agentId = agentId;
    pod.namespace = `agent_${agentId}`;

    if (!this.agentNamespaces.has(agentId)) {
      this.agentNamespaces.set(agentId, {
        agentId,
        pods: [],
        totalJobs: 0,
        resourceUsage: { cpu: 0, memory: 0 }
      });
    }

    const ns = this.agentNamespaces.get(agentId);
    if (!ns.pods.includes(podId)) {
      ns.pods.push(podId);
    }

    this.emit('pod:bound', { podId, agentId });
    this.saveState();
  }

  unbindPodFromAgent(podId) {
    const pod = this.pods.get(podId);
    if (!pod || !pod.agentId) return;

    const ns = this.agentNamespaces.get(pod.agentId);
    if (ns) {
      ns.pods = ns.pods.filter(p => p !== podId);
    }

    pod.agentId = null;
    pod.namespace = 'default';
    this.emit('pod:unbound', { podId });
    this.saveState();
  }

  getAgentPods(agentId) {
    return Array.from(this.pods.values()).filter(p => p.agentId === agentId);
  }

  getAgentNamespace(agentId) {
    return this.agentNamespaces.get(agentId) || null;
  }

  async warmUpPool() {
    while (this.warmPool.length < this.warmPoolSize) {
      const pod = this.createPod({
        name: `Warm-${this.warmPool.length + 1}`,
        runtime: 'browser'
      });
      pod.status = PodManager.POD_STATUS.WARMING;
      this.warmPool.push(pod.id);
    }
    this.emit('pool:warmed', { count: this.warmPool.length });
  }

  acquireWarmPod(config = {}) {
    if (this.warmPool.length > 0) {
      const podId = this.warmPool.shift();
      const pod = this.pods.get(podId);
      if (pod) {
        pod.status = PodManager.POD_STATUS.IDLE;
        pod.name = config.name || pod.name;
        if (config.agentId) {
          this.bindPodToAgent(podId, config.agentId);
        }
        this.warmUpPool();
        return pod;
      }
    }
    return this.createPod(config);
  }

  updateResourceAccounting(podId, usage) {
    const pod = this.pods.get(podId);
    if (!pod) return;

    pod.resources.cpuUsed += usage.cpu || 0;
    pod.resources.memoryUsedMb = Math.max(pod.resources.memoryUsedMb, usage.memory || 0);
    pod.stats.memoryPeakMb = Math.max(pod.stats.memoryPeakMb, usage.memory || 0);

    if (pod.agentId) {
      const ns = this.agentNamespaces.get(pod.agentId);
      if (ns) {
        ns.resourceUsage.cpu += usage.cpu || 0;
        ns.resourceUsage.memory = Math.max(ns.resourceUsage.memory, usage.memory || 0);
      }
    }

    this.resourceAccounting.set(podId, {
      ...this.resourceAccounting.get(podId),
      lastUpdate: Date.now(),
      ...usage
    });
  }

  getResourceUsage(podId) {
    return this.resourceAccounting.get(podId) || { cpu: 0, memory: 0 };
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
        try { cb(data); } catch (e) { console.error('[PodManager] Event error:', e); }
      });
    }
  }

  terminatePod(podId) {
    const pod = this.pods.get(podId);
    if (!pod) return false;
    
    if (pod.currentJob) {
      const job = this.runningJobs.get(pod.currentJob);
      if (job) {
        job.status = PodManager.JOB_STATUS.CANCELLED;
        this.runningJobs.delete(pod.currentJob);
      }
    }
    
    pod.status = PodManager.POD_STATUS.TERMINATED;
    this.pods.delete(podId);
    this.saveState();
    return true;
  }

  submitJob(jobSpec) {
    const job = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type: jobSpec.type || 'code',
      runtime: jobSpec.runtime || 'browser',
      status: PodManager.JOB_STATUS.PENDING,
      input: {
        code: jobSpec.code || jobSpec.input?.code,
        data: jobSpec.data || jobSpec.input?.data,
        files: jobSpec.files || jobSpec.input?.files,
        env: jobSpec.env || jobSpec.input?.env || {}
      },
      resources: {
        maxMemoryMb: jobSpec.maxMemoryMb || jobSpec.resources?.maxMemoryMb || 256,
        maxCpuMs: jobSpec.maxCpuMs || jobSpec.resources?.maxCpuMs || 30000,
        maxDurationMs: jobSpec.maxDurationMs || jobSpec.resources?.maxDurationMs || 60000,
        priority: jobSpec.priority || jobSpec.resources?.priority || 'normal'
      },
      metadata: {
        createdBy: jobSpec.createdBy || 'user',
        agentId: jobSpec.agentId || null,
        tags: jobSpec.tags || []
      },
      result: null,
      logs: [],
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null
    };

    this.jobQueue.push(job);
    this.jobQueue.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.resources.priority] - priorityOrder[b.resources.priority];
    });
    
    this.saveState();
    return job;
  }

  getAvailablePod(runtime = 'browser') {
    for (const [id, pod] of this.pods) {
      if (pod.status === PodManager.POD_STATUS.IDLE && pod.runtime === runtime) {
        return pod;
      }
    }
    
    if (this.pods.size < this.maxPods) {
      return this.createPod({ runtime });
    }
    
    return null;
  }

  startJobProcessor() {
    if (this.pollInterval) return;
    
    this.pollInterval = setInterval(() => {
      this.processJobQueue();
    }, 500);
  }

  stopJobProcessor() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async processJobQueue() {
    const pendingJobs = this.jobQueue.filter(j => j.status === PodManager.JOB_STATUS.PENDING);
    
    for (const job of pendingJobs) {
      const pod = this.getAvailablePod(job.runtime);
      if (pod) {
        await this.assignJobToPod(job, pod);
      }
    }
  }

  async assignJobToPod(job, pod) {
    job.status = PodManager.JOB_STATUS.RUNNING;
    job.startedAt = new Date().toISOString();
    pod.status = PodManager.POD_STATUS.BUSY;
    pod.currentJob = job.id;
    pod.lastActiveAt = new Date().toISOString();
    
    this.runningJobs.set(job.id, job);
    
    try {
      const result = await this.executeJob(job, pod);
      job.result = result;
      job.status = PodManager.JOB_STATUS.COMPLETED;
      pod.stats.jobsCompleted++;
    } catch (error) {
      job.result = { error: error.message };
      job.status = PodManager.JOB_STATUS.FAILED;
      job.logs.push(`Error: ${error.message}`);
      pod.stats.jobsFailed++;
    }
    
    job.completedAt = new Date().toISOString();
    const duration = new Date(job.completedAt) - new Date(job.startedAt);
    pod.stats.totalCpuMs += duration;
    
    pod.status = PodManager.POD_STATUS.IDLE;
    pod.currentJob = null;
    
    this.runningJobs.delete(job.id);
    this.jobQueue = this.jobQueue.filter(j => j.id !== job.id);
    this.completedJobs.unshift(job);
    
    if (this.completedJobs.length > 100) {
      this.completedJobs = this.completedJobs.slice(0, 100);
    }
    
    await this.saveState();
    return job;
  }

  async executeJob(job, pod) {
    const startTime = Date.now();
    job.logs.push(`[${new Date().toISOString()}] Job started on ${pod.name}`);
    
    switch (job.type) {
      case 'code':
        return await this.executeCodeJob(job, pod);
      case 'ai':
        return await this.executeAIJob(job, pod);
      case 'transform':
        return await this.executeTransformJob(job, pod);
      case 'build':
        return await this.executeBuildJob(job, pod);
      default:
        return await this.executeCustomJob(job, pod);
    }
  }

  async executeCodeJob(job, pod) {
    const code = job.input.code;
    if (!code) throw new Error('No code provided');
    
    job.logs.push('Executing code...');
    
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const sandbox = this.createSandbox(job.input.env);
    
    try {
      const fn = new AsyncFunction('env', 'data', `
        "use strict";
        ${code}
      `);
      
      const result = await Promise.race([
        fn(sandbox, job.input.data),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Execution timeout')), job.resources.maxDurationMs)
        )
      ]);
      
      job.logs.push('Execution completed successfully');
      return { output: result, success: true };
    } catch (error) {
      job.logs.push(`Execution error: ${error.message}`);
      throw error;
    }
  }

  async executeAIJob(job, pod) {
    const prompt = job.input.data?.prompt || job.input.code;
    if (!prompt) throw new Error('No prompt provided');
    
    job.logs.push('Calling AI service...');
    
    if (typeof puter !== 'undefined' && puter.ai) {
      try {
        const response = await puter.ai.chat(prompt);
        job.logs.push('AI response received');
        return { output: response, success: true };
      } catch (e) {
        throw new Error(`AI service error: ${e.message}`);
      }
    }
    
    throw new Error('AI service not available');
  }

  async executeTransformJob(job, pod) {
    const data = job.input.data;
    const transform = job.input.code;
    
    if (!data || !transform) throw new Error('Data and transform required');
    
    job.logs.push('Applying transformation...');
    
    try {
      const fn = new Function('data', `
        "use strict";
        return (${transform})(data);
      `);
      
      const result = fn(data);
      job.logs.push('Transform completed');
      return { output: result, success: true };
    } catch (error) {
      throw new Error(`Transform error: ${error.message}`);
    }
  }

  async executeBuildJob(job, pod) {
    job.logs.push('Build job started...');
    return { output: 'Build completed', success: true, artifacts: [] };
  }

  async executeCustomJob(job, pod) {
    job.logs.push('Custom job executed');
    return { output: job.input.data, success: true };
  }

  createSandbox(env = {}) {
    return {
      ...env,
      console: {
        log: (...args) => { },
        error: (...args) => { },
        warn: (...args) => { }
      },
      setTimeout: undefined,
      setInterval: undefined,
      fetch: undefined
    };
  }

  getJob(jobId) {
    const running = this.runningJobs.get(jobId);
    if (running) return running;
    
    const queued = this.jobQueue.find(j => j.id === jobId);
    if (queued) return queued;
    
    return this.completedJobs.find(j => j.id === jobId);
  }

  cancelJob(jobId) {
    const job = this.jobQueue.find(j => j.id === jobId);
    if (job && job.status === PodManager.JOB_STATUS.PENDING) {
      job.status = PodManager.JOB_STATUS.CANCELLED;
      this.jobQueue = this.jobQueue.filter(j => j.id !== jobId);
      this.completedJobs.unshift(job);
      this.saveState();
      return true;
    }
    return false;
  }

  getStats() {
    const pods = Array.from(this.pods.values());
    return {
      totalPods: pods.length,
      activePods: pods.filter(p => p.status === PodManager.POD_STATUS.BUSY).length,
      idlePods: pods.filter(p => p.status === PodManager.POD_STATUS.IDLE).length,
      queuedJobs: this.jobQueue.length,
      runningJobs: this.runningJobs.size,
      completedJobs: this.completedJobs.length,
      totalJobsProcessed: pods.reduce((sum, p) => sum + p.stats.jobsCompleted + p.stats.jobsFailed, 0),
      totalCpuMs: pods.reduce((sum, p) => sum + p.stats.totalCpuMs, 0)
    };
  }

  getAllPods() {
    return Array.from(this.pods.values());
  }

  getJobQueue() {
    return [...this.jobQueue];
  }

  getCompletedJobs(limit = 20) {
    return this.completedJobs.slice(0, limit);
  }
}

const podManager = new PodManager();

if (typeof window !== 'undefined') {
  window.PodManager = PodManager;
  window.podManager = podManager;
}

export { PodManager };
export default PodManager;

if (typeof module !== 'undefined') {
  module.exports = { PodManager, podManager };
}
