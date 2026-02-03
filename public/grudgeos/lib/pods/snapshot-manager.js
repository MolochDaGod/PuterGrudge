class SnapshotManager {
  static SNAPSHOT_TYPES = {
    AGENT: 'agent',
    SQUAD: 'squad',
    WORKSPACE: 'workspace',
    PROJECT: 'project',
    FULL: 'full'
  };

  constructor() {
    this.namespace = 'snapshots';
    this.snapshots = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    await this.loadSnapshots();
    this.initialized = true;
    console.log('[SnapshotManager] Initialized with', this.snapshots.size, 'snapshots');
  }

  async loadSnapshots() {
    if (typeof puter === 'undefined' || !puter.kv) return;
    try {
      const data = await puter.kv.get(`${this.namespace}:list`);
      if (data) {
        const parsed = JSON.parse(data);
        parsed.forEach(snap => this.snapshots.set(snap.id, snap));
      }
    } catch (e) {
      console.log('[SnapshotManager] No saved snapshots');
    }
  }

  async saveSnapshots() {
    if (typeof puter === 'undefined' || !puter.kv) return;
    try {
      const list = Array.from(this.snapshots.values()).map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        version: s.version,
        size: s.size,
        createdAt: s.createdAt,
        createdBy: s.createdBy,
        tags: s.tags
      }));
      await puter.kv.set(`${this.namespace}:list`, JSON.stringify(list));
    } catch (e) {
      console.warn('[SnapshotManager] Failed to save snapshot list:', e.message);
    }
  }

  async createSnapshot(config) {
    const snapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: config.name || `Snapshot ${new Date().toLocaleDateString()}`,
      description: config.description || '',
      type: config.type || SnapshotManager.SNAPSHOT_TYPES.FULL,
      version: 1,
      data: {},
      createdAt: new Date().toISOString(),
      createdBy: config.createdBy || 'user',
      tags: config.tags || []
    };

    switch (snapshot.type) {
      case SnapshotManager.SNAPSHOT_TYPES.AGENT:
        snapshot.data = await this.captureAgentState(config.agentId);
        break;
      case SnapshotManager.SNAPSHOT_TYPES.SQUAD:
        snapshot.data = await this.captureSquadState(config.squadId);
        break;
      case SnapshotManager.SNAPSHOT_TYPES.WORKSPACE:
        snapshot.data = await this.captureWorkspaceState();
        break;
      case SnapshotManager.SNAPSHOT_TYPES.PROJECT:
        snapshot.data = await this.captureProjectState();
        break;
      case SnapshotManager.SNAPSHOT_TYPES.FULL:
      default:
        snapshot.data = await this.captureFullState();
        break;
    }

    snapshot.size = JSON.stringify(snapshot.data).length;
    snapshot.checksum = this.generateChecksum(snapshot.data);

    this.snapshots.set(snapshot.id, snapshot);
    
    if (typeof puter !== 'undefined' && puter.kv) {
      try {
        await puter.kv.set(`${this.namespace}:data:${snapshot.id}`, JSON.stringify(snapshot.data));
      } catch (e) {
        console.warn('[SnapshotManager] Failed to save snapshot data:', e.message);
      }
    }
    
    await this.saveSnapshots();
    return snapshot;
  }

  async captureAgentState(agentId) {
    const state = {
      agents: [],
      metadata: { capturedAt: new Date().toISOString() }
    };

    if (typeof window !== 'undefined' && window.agentSquad) {
      const squads = window.agentSquad.getAllSquads();
      for (const squad of squads) {
        if (!agentId || squad.agents?.includes(agentId)) {
          state.agents.push({
            id: agentId || 'all',
            squad: squad,
            terminals: squad.terminals,
            tasks: squad.taskQueue
          });
        }
      }
    }

    return state;
  }

  async captureSquadState(squadId) {
    const state = {
      squads: [],
      terminals: [],
      messages: [],
      metadata: { capturedAt: new Date().toISOString() }
    };

    if (typeof window !== 'undefined' && window.agentSquad) {
      const squads = window.agentSquad.getAllSquads();
      for (const squad of squads) {
        if (!squadId || squad.id === squadId) {
          state.squads.push(squad);
        }
      }
      state.messages = window.agentSquad.messageQueue || [];
    }

    return state;
  }

  async captureWorkspaceState() {
    const state = {
      squads: [],
      terminals: [],
      restClients: [],
      messages: [],
      environment: {},
      metadata: { capturedAt: new Date().toISOString() }
    };

    if (typeof window !== 'undefined') {
      if (window.agentSquad) {
        state.squads = window.agentSquad.getAllSquads();
        state.messages = window.agentSquad.messageQueue || [];
        
        for (const [agentId, client] of (window.agentSquad.agentRestClients || new Map())) {
          state.restClients.push({
            agentId,
            collections: client.collections || [],
            environment: client.environment || {}
          });
        }
      }

      if (window.podManager) {
        state.pods = window.podManager.getAllPods();
        state.jobs = window.podManager.getJobQueue();
      }
    }

    return state;
  }

  async captureProjectState() {
    const state = {
      ...await this.captureWorkspaceState(),
      files: [],
      metadata: { capturedAt: new Date().toISOString() }
    };

    return state;
  }

  async captureFullState() {
    const state = {
      ...await this.captureProjectState(),
      settings: {},
      metadata: { 
        capturedAt: new Date().toISOString(),
        type: 'full'
      }
    };

    return state;
  }

  async restoreSnapshot(snapshotId) {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) throw new Error('Snapshot not found');

    let data = snapshot.data;
    
    if (!data || Object.keys(data).length === 0) {
      if (typeof puter !== 'undefined' && puter.kv) {
        try {
          const stored = await puter.kv.get(`${this.namespace}:data:${snapshotId}`);
          if (stored) {
            data = JSON.parse(stored);
          }
        } catch (e) {
          throw new Error('Failed to load snapshot data');
        }
      }
    }

    if (!data) throw new Error('No snapshot data available');

    switch (snapshot.type) {
      case SnapshotManager.SNAPSHOT_TYPES.AGENT:
        await this.restoreAgentState(data);
        break;
      case SnapshotManager.SNAPSHOT_TYPES.SQUAD:
        await this.restoreSquadState(data);
        break;
      case SnapshotManager.SNAPSHOT_TYPES.WORKSPACE:
      case SnapshotManager.SNAPSHOT_TYPES.PROJECT:
      case SnapshotManager.SNAPSHOT_TYPES.FULL:
        await this.restoreFullState(data);
        break;
    }

    return { success: true, restored: snapshot.type };
  }

  async restoreAgentState(data) {
    if (typeof window === 'undefined' || !window.agentSquad) return;
    console.log('[SnapshotManager] Restoring agent state...');
  }

  async restoreSquadState(data) {
    if (typeof window === 'undefined' || !window.agentSquad) return;
    
    for (const squad of (data.squads || [])) {
      window.agentSquad.squads.set(squad.id, squad);
    }
    
    if (data.messages) {
      window.agentSquad.messageQueue = data.messages;
    }
    
    await window.agentSquad.saveSquads();
    console.log('[SnapshotManager] Squad state restored');
  }

  async restoreFullState(data) {
    await this.restoreSquadState(data);
    
    if (typeof window !== 'undefined' && window.podManager && data.pods) {
      for (const pod of data.pods) {
        window.podManager.pods.set(pod.id, pod);
      }
      await window.podManager.saveState();
    }
    
    console.log('[SnapshotManager] Full state restored');
  }

  generateChecksum(data) {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  async deleteSnapshot(snapshotId) {
    if (!this.snapshots.has(snapshotId)) return false;
    
    this.snapshots.delete(snapshotId);
    
    if (typeof puter !== 'undefined' && puter.kv) {
      try {
        await puter.kv.del(`${this.namespace}:data:${snapshotId}`);
      } catch (e) {}
    }
    
    await this.saveSnapshots();
    return true;
  }

  getSnapshot(snapshotId) {
    return this.snapshots.get(snapshotId);
  }

  listSnapshots(type = null) {
    const all = Array.from(this.snapshots.values());
    if (type) {
      return all.filter(s => s.type === type);
    }
    return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async exportSnapshot(snapshotId) {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) throw new Error('Snapshot not found');

    let data = snapshot.data;
    
    if (!data || Object.keys(data).length === 0) {
      if (typeof puter !== 'undefined' && puter.kv) {
        const stored = await puter.kv.get(`${this.namespace}:data:${snapshotId}`);
        if (stored) {
          data = JSON.parse(stored);
        }
      }
    }

    return JSON.stringify({
      ...snapshot,
      data,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  async importSnapshot(jsonData) {
    const imported = JSON.parse(jsonData);
    
    const snapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: `Imported: ${imported.name}`,
      description: imported.description,
      type: imported.type,
      version: imported.version || 1,
      data: imported.data,
      size: JSON.stringify(imported.data).length,
      checksum: this.generateChecksum(imported.data),
      createdAt: new Date().toISOString(),
      createdBy: 'import',
      tags: [...(imported.tags || []), 'imported']
    };

    this.snapshots.set(snapshot.id, snapshot);
    
    if (typeof puter !== 'undefined' && puter.kv) {
      await puter.kv.set(`${this.namespace}:data:${snapshot.id}`, JSON.stringify(snapshot.data));
    }
    
    await this.saveSnapshots();
    return snapshot;
  }
}

const snapshotManager = new SnapshotManager();

if (typeof window !== 'undefined') {
  window.SnapshotManager = SnapshotManager;
  window.snapshotManager = snapshotManager;
}

if (typeof module !== 'undefined') {
  module.exports = { SnapshotManager, snapshotManager };
}
