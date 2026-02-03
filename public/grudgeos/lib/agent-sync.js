/**
 * AgentSync - Agent State Persistence and Cross-Account Replication
 * Enables agents to sync, backup, restore, and replicate across Puter accounts
 */

class AgentSync {
  constructor() {
    this.namespace = 'cloudpilot_agents';
    this.version = '1.0.0';
    this.syncInterval = null;
    this.lastSync = null;
  }
  
  // Helper to check Puter availability
  hasPuterKV() {
    return typeof puter !== 'undefined' && puter.kv;
  }
  
  // ============ AGENT STATE PERSISTENCE ============
  
  async saveAgentState(agentId, state) {
    if (!this.hasPuterKV()) {
      return { success: false, error: 'Puter not available' };
    }
    
    const key = `${this.namespace}:state:${agentId}`;
    const payload = {
      agentId,
      state,
      version: this.version,
      savedAt: new Date().toISOString(),
      checksum: this.generateChecksum(state)
    };
    
    try {
      await puter.kv.set(key, JSON.stringify(payload));
      return { success: true, key };
    } catch (e) {
      console.error('Failed to save agent state:', e);
      return { success: false, error: e.message };
    }
  }
  
  async loadAgentState(agentId) {
    if (!this.hasPuterKV()) return null;
    
    const key = `${this.namespace}:state:${agentId}`;
    
    try {
      const data = await puter.kv.get(key);
      if (!data) return null;
      
      const payload = JSON.parse(data);
      
      // Verify checksum
      if (this.generateChecksum(payload.state) !== payload.checksum) {
        console.warn('Agent state checksum mismatch');
      }
      
      return payload.state;
    } catch (e) {
      console.error('Failed to load agent state:', e);
      return null;
    }
  }
  
  async listAgents() {
    if (!this.hasPuterKV()) return [];
    
    const prefix = `${this.namespace}:state:`;
    
    try {
      const keys = await puter.kv.list({ prefix }) || [];
      return keys.map(k => k.replace(prefix, ''));
    } catch (e) {
      return [];
    }
  }
  
  // ============ FULL SYSTEM EXPORT/IMPORT ============
  
  async exportFullSystem() {
    const exportData = {
      version: this.version,
      exportedAt: new Date().toISOString(),
      agents: {},
      memories: {},
      preferences: {},
      rules: [],
      skills: [],
      conversations: {},
      metrics: {}
    };
    
    // Return empty export if Puter not available
    if (!this.hasPuterKV()) return exportData;
    
    // Export all agent states
    const agentIds = await this.listAgents();
    for (const agentId of agentIds) {
      exportData.agents[agentId] = await this.loadAgentState(agentId);
    }
    
    // Export memories
    const memoryPrefixes = [
      'user_prefs', 'code_patterns', 'solutions', 
      'error_fixes', 'context', 'skills', 'rules'
    ];
    
    for (const prefix of memoryPrefixes) {
      const fullPrefix = `cloudpilot_agent_memory:${prefix}:`;
      try {
        const keys = await puter.kv.list({ prefix: fullPrefix }) || [];
        exportData.memories[prefix] = {};
        
        for (const key of keys) {
          const shortKey = key.replace(fullPrefix, '');
          const value = await puter.kv.get(key);
          if (value) {
            exportData.memories[prefix][shortKey] = JSON.parse(value);
          }
        }
      } catch (e) {
        console.warn(`Failed to export ${prefix}:`, e);
      }
    }
    
    // Export growth metrics
    try {
      const metrics = await puter.kv.get('cloudpilot_agent_memory:agent_state:growth_metrics');
      if (metrics) {
        exportData.metrics = JSON.parse(metrics);
      }
    } catch (e) {}
    
    return exportData;
  }
  
  async importFullSystem(exportData) {
    if (!exportData || !exportData.version) {
      throw new Error('Invalid export data');
    }
    
    if (!this.hasPuterKV()) {
      throw new Error('Puter not available');
    }
    
    const results = {
      agentsImported: 0,
      memoriesImported: 0,
      errors: []
    };
    
    // Import agent states
    for (const [agentId, state] of Object.entries(exportData.agents || {})) {
      try {
        await this.saveAgentState(agentId, state);
        results.agentsImported++;
      } catch (e) {
        results.errors.push(`Agent ${agentId}: ${e.message}`);
      }
    }
    
    // Import memories
    for (const [prefix, memories] of Object.entries(exportData.memories || {})) {
      for (const [key, value] of Object.entries(memories)) {
        try {
          const fullKey = `cloudpilot_agent_memory:${prefix}:${key}`;
          await puter.kv.set(fullKey, JSON.stringify(value));
          results.memoriesImported++;
        } catch (e) {
          results.errors.push(`Memory ${prefix}/${key}: ${e.message}`);
        }
      }
    }
    
    // Import metrics
    if (exportData.metrics) {
      try {
        await puter.kv.set(
          'cloudpilot_agent_memory:agent_state:growth_metrics',
          JSON.stringify(exportData.metrics)
        );
      } catch (e) {}
    }
    
    return results;
  }
  
  // ============ ACCOUNT REPLICATION ============
  
  generateReplicationCode() {
    return new Promise(async (resolve, reject) => {
      if (!this.hasPuterKV()) {
        reject(new Error('Puter not available'));
        return;
      }
      
      try {
        const exportData = await this.exportFullSystem();
        const jsonStr = JSON.stringify(exportData);
        
        // Compress using simple encoding
        const code = btoa(unescape(encodeURIComponent(jsonStr)));
        
        // Store in Puter for retrieval
        const shareKey = `${this.namespace}:share:${Date.now()}`;
        await puter.kv.set(shareKey, code);
        
        resolve({
          code: code.slice(0, 100) + '...',
          fullCode: code,
          shareKey,
          size: code.length,
          expiresIn: '7 days'
        });
      } catch (e) {
        reject(e);
      }
    });
  }
  
  async replicateFromCode(code) {
    try {
      const jsonStr = decodeURIComponent(escape(atob(code)));
      const exportData = JSON.parse(jsonStr);
      
      return await this.importFullSystem(exportData);
    } catch (e) {
      throw new Error('Invalid replication code: ' + e.message);
    }
  }
  
  // ============ AUTO-SYNC ============
  
  startAutoSync(intervalMs = 60000) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(async () => {
      await this.performSync();
    }, intervalMs);
    
    console.log(`Auto-sync started (every ${intervalMs / 1000}s)`);
  }
  
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  async performSync() {
    if (typeof puter === 'undefined' || !puter.kv) {
      return { synced: false, error: 'Puter not available' };
    }
    
    const syncKey = `${this.namespace}:lastsync`;
    
    try {
      // Get current state
      const currentExport = await this.exportFullSystem();
      const currentHash = this.generateChecksum(currentExport);
      
      // Check last sync hash
      const lastSyncData = await puter.kv.get(syncKey);
      let lastHash = null;
      
      if (lastSyncData) {
        const parsed = JSON.parse(lastSyncData);
        lastHash = parsed.hash;
      }
      
      // Only update if changed
      if (currentHash !== lastHash) {
        await puter.kv.set(`${this.namespace}:backup:${Date.now()}`, JSON.stringify(currentExport));
        await puter.kv.set(syncKey, JSON.stringify({
          hash: currentHash,
          syncedAt: new Date().toISOString()
        }));
        
        this.lastSync = new Date();
        console.log('Sync completed:', this.lastSync);
      }
      
      return { synced: true, changed: currentHash !== lastHash };
    } catch (e) {
      console.error('Sync failed:', e);
      return { synced: false, error: e.message };
    }
  }
  
  // ============ BACKUP & RESTORE ============
  
  async createBackup(name = null) {
    if (typeof puter === 'undefined' || !puter.kv) {
      throw new Error('Puter not available');
    }
    
    const backupName = name || `backup_${Date.now()}`;
    const key = `${this.namespace}:backup:${backupName}`;
    
    const exportData = await this.exportFullSystem();
    await puter.kv.set(key, JSON.stringify(exportData));
    
    return { name: backupName, key, createdAt: new Date().toISOString() };
  }
  
  async listBackups() {
    if (typeof puter === 'undefined' || !puter.kv) {
      return [];
    }
    
    const prefix = `${this.namespace}:backup:`;
    
    try {
      const keys = await puter.kv.list({ prefix }) || [];
      return keys.map(k => ({
        name: k.replace(prefix, ''),
        key: k
      }));
    } catch (e) {
      return [];
    }
  }
  
  async restoreBackup(backupName) {
    if (!this.hasPuterKV()) {
      throw new Error('Puter not available');
    }
    
    const key = `${this.namespace}:backup:${backupName}`;
    
    try {
      const data = await puter.kv.get(key);
      if (!data) throw new Error('Backup not found');
      
      const exportData = JSON.parse(data);
      return await this.importFullSystem(exportData);
    } catch (e) {
      throw new Error('Restore failed: ' + e.message);
    }
  }
  
  async deleteBackup(backupName) {
    if (!this.hasPuterKV()) {
      throw new Error('Puter not available');
    }
    
    const key = `${this.namespace}:backup:${backupName}`;
    await puter.kv.del(key);
    return true;
  }
  
  // ============ UTILITIES ============
  
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
  
  async getStorageStats() {
    if (!this.hasPuterKV()) {
      return { totalKeys: 0, lastSync: null, autoSyncActive: false };
    }
    
    const prefixes = [
      `${this.namespace}:state:`,
      `${this.namespace}:backup:`,
      'cloudpilot_agent_memory:'
    ];
    
    let totalKeys = 0;
    
    for (const prefix of prefixes) {
      try {
        const keys = await puter.kv.list({ prefix }) || [];
        totalKeys += keys.length;
      } catch (e) {}
    }
    
    return {
      totalKeys,
      lastSync: this.lastSync,
      autoSyncActive: !!this.syncInterval
    };
  }
}

// Create global instance
const agentSync = new AgentSync();

// Export
if (typeof window !== 'undefined') {
  window.AgentSync = AgentSync;
  window.agentSync = agentSync;
}

if (typeof module !== 'undefined') {
  module.exports = { AgentSync, agentSync };
}
