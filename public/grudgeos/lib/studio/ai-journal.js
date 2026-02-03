/**
 * AI Journal - Track and revert AI-generated changes
 * Maintains separate history for AI operations vs manual edits
 * Supports undoing last 1, 2, or 3 AI updates
 */

class AIJournal {
  constructor() {
    this.entries = [];
    this.maxEntries = 50;
    this.kvNamespace = 'ai_journal';
  }

  async init() {
    await this.loadFromStorage();
    return this;
  }

  async loadFromStorage() {
    try {
      if (typeof puter !== 'undefined' && puter.kv) {
        const stored = await puter.kv.get(`${this.kvNamespace}:entries`);
        if (stored) {
          this.entries = JSON.parse(stored);
        }
      }
    } catch (e) {
      console.warn('AIJournal: Failed to load from storage', e);
      this.entries = [];
    }
  }

  async saveToStorage() {
    try {
      if (typeof puter !== 'undefined' && puter.kv) {
        await puter.kv.set(`${this.kvNamespace}:entries`, JSON.stringify(this.entries));
      }
    } catch (e) {
      console.warn('AIJournal: Failed to save to storage', e);
    }
  }

  async recordAIChange(change) {
    const entry = {
      id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: change.type || 'file_change',
      description: change.description || 'AI modification',
      agent: change.agent || 'unknown',
      model: change.model || 'auto',
      files: change.files || [],
      diff: change.diff || null,
      beforeState: change.beforeState || null,
      afterState: change.afterState || null,
      reverted: false,
      metadata: change.metadata || {}
    };

    this.entries.unshift(entry);

    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(0, this.maxEntries);
    }

    await this.saveToStorage();
    return entry;
  }

  getRecentChanges(count = 10) {
    return this.entries
      .filter(e => !e.reverted)
      .slice(0, count);
  }

  getRevertibleChanges() {
    return this.entries
      .filter(e => !e.reverted && e.beforeState)
      .slice(0, 10);
  }

  async undoAIChanges(count = 1) {
    const changesToRevert = this.getRevertibleChanges().slice(0, count);
    const results = [];

    for (const change of changesToRevert) {
      try {
        const result = await this.revertChange(change);
        results.push({
          id: change.id,
          success: true,
          description: change.description,
          ...result
        });
      } catch (e) {
        results.push({
          id: change.id,
          success: false,
          error: e.message,
          description: change.description
        });
      }
    }

    await this.saveToStorage();
    return results;
  }

  async revertChange(change) {
    if (!change.beforeState) {
      throw new Error('No before state available for this change');
    }

    const restoredFiles = [];

    if (change.files && change.beforeState.files) {
      for (const fileChange of change.files) {
        const beforeContent = change.beforeState.files[fileChange.path];
        
        if (beforeContent !== undefined) {
          try {
            if (typeof puter !== 'undefined' && puter.fs) {
              if (beforeContent === null) {
                await puter.fs.delete(fileChange.path);
                restoredFiles.push({ path: fileChange.path, action: 'deleted' });
              } else {
                await puter.fs.write(fileChange.path, beforeContent);
                restoredFiles.push({ path: fileChange.path, action: 'restored' });
              }
            }
          } catch (e) {
            console.warn(`Failed to restore ${fileChange.path}:`, e);
          }
        }
      }
    }

    change.reverted = true;
    change.revertedAt = Date.now();

    return {
      filesRestored: restoredFiles.length,
      restoredFiles
    };
  }

  async undoLast(n) {
    if (n < 1 || n > 3) {
      throw new Error('Can only undo 1, 2, or 3 AI changes at a time');
    }
    return this.undoAIChanges(n);
  }

  async undoLast1() { return this.undoLast(1); }
  async undoLast2() { return this.undoLast(2); }
  async undoLast3() { return this.undoLast(3); }

  getStats() {
    const total = this.entries.length;
    const reverted = this.entries.filter(e => e.reverted).length;
    const active = total - reverted;
    const byAgent = {};
    const byType = {};

    this.entries.forEach(e => {
      byAgent[e.agent] = (byAgent[e.agent] || 0) + 1;
      byType[e.type] = (byType[e.type] || 0) + 1;
    });

    return {
      total,
      active,
      reverted,
      byAgent,
      byType,
      oldestEntry: this.entries[this.entries.length - 1]?.timestamp,
      newestEntry: this.entries[0]?.timestamp
    };
  }

  createFileSnapshot(files) {
    const snapshot = { files: {} };
    
    files.forEach(file => {
      snapshot.files[file.path] = file.content;
    });

    return snapshot;
  }

  async trackFileOperation(operation) {
    const { agent, model, files, description, beforeFiles } = operation;

    const beforeState = beforeFiles 
      ? this.createFileSnapshot(beforeFiles)
      : null;

    const afterState = this.createFileSnapshot(files);

    return this.recordAIChange({
      type: 'file_operation',
      description: description || `AI ${agent} modified ${files.length} file(s)`,
      agent,
      model,
      files: files.map(f => ({ path: f.path, action: f.action || 'modified' })),
      beforeState,
      afterState,
      diff: this.generateDiff(beforeState, afterState)
    });
  }

  generateDiff(before, after) {
    if (!before || !after) return null;

    const diff = {
      added: [],
      modified: [],
      deleted: []
    };

    const afterPaths = new Set(Object.keys(after.files || {}));
    const beforePaths = new Set(Object.keys(before.files || {}));

    afterPaths.forEach(path => {
      if (!beforePaths.has(path)) {
        diff.added.push(path);
      } else if (after.files[path] !== before.files[path]) {
        diff.modified.push(path);
      }
    });

    beforePaths.forEach(path => {
      if (!afterPaths.has(path)) {
        diff.deleted.push(path);
      }
    });

    return diff;
  }

  getChangeById(id) {
    return this.entries.find(e => e.id === id);
  }

  async clearHistory() {
    this.entries = [];
    await this.saveToStorage();
  }

  async pruneOldEntries(maxAgeDays = 30) {
    const cutoff = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    this.entries = this.entries.filter(e => e.timestamp > cutoff);
    await this.saveToStorage();
  }

  exportJournal() {
    return JSON.stringify({
      version: '1.0',
      exportedAt: Date.now(),
      entries: this.entries
    }, null, 2);
  }

  async importJournal(json) {
    try {
      const data = typeof json === 'string' ? JSON.parse(json) : json;
      if (data.entries && Array.isArray(data.entries)) {
        this.entries = data.entries;
        await this.saveToStorage();
        return true;
      }
    } catch (e) {
      console.error('Failed to import journal:', e);
    }
    return false;
  }
}

const aiJournal = new AIJournal();

window.AIJournal = AIJournal;
window.aiJournal = aiJournal;

export { AIJournal, aiJournal };
