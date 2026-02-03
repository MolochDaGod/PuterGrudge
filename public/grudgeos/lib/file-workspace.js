/**
 * FileWorkspace - Safe File/Folder Management for Agents
 * 
 * Provides guardrails for agent file operations:
 * - Scoped operations per project (no system file access)
 * - Allowlist enforcement for file types
 * - Transaction support with rollback
 * - Dry-run preview before mutations
 * - Audit logging for all operations
 * 
 * Uses Puter.js filesystem - NO Apache/VM needed
 */

export const FILE_PERMISSIONS = {
  allowedExtensions: [
    '.html', '.css', '.js', '.ts', '.jsx', '.tsx', '.json', '.md',
    '.txt', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp',
    '.woff', '.woff2', '.ttf', '.eot',
    '.glb', '.gltf', '.obj', '.fbx',
    '.mp3', '.wav', '.ogg',
    '.mp4', '.webm',
    '.yaml', '.yml', '.toml', '.env.example',
  ],

  blockedPatterns: [
    /^\.git\//,
    /^node_modules\//,
    /^\.env$/,
    /\.exe$/,
    /\.dll$/,
    /\.so$/,
    /\.sh$/,
    /\.bat$/,
    /\.cmd$/,
  ],

  maxFileSize: 10 * 1024 * 1024,
  maxFilesPerProject: 500,
};

export class FileWorkspace {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || '/workspaces';
    this.puter = options.puter || (typeof window !== 'undefined' ? window.puter : null);
    this.auditLog = [];
    this.pendingOperations = [];
    this.dryRun = options.dryRun || false;
  }

  log(action, path, details = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      action,
      path,
      ...details,
    };
    this.auditLog.push(entry);
    console.log(`[FileWorkspace] ${action}: ${path}`);
    return entry;
  }

  validatePath(path) {
    const normalized = path.replace(/\\/g, '/');
    
    if (!normalized.startsWith(this.projectRoot)) {
      throw new Error(`Access denied: Path must be within project root`);
    }

    for (const pattern of FILE_PERMISSIONS.blockedPatterns) {
      const relativePath = normalized.replace(this.projectRoot + '/', '');
      if (pattern.test(relativePath)) {
        throw new Error(`Access denied: Blocked path pattern`);
      }
    }

    return normalized;
  }

  validateExtension(filename) {
    const ext = '.' + filename.split('.').pop().toLowerCase();
    if (!FILE_PERMISSIONS.allowedExtensions.includes(ext)) {
      throw new Error(`File type not allowed: ${ext}`);
    }
    return true;
  }

  async createWorkspace(workspaceId, options = {}) {
    const workspacePath = `${this.projectRoot}/${workspaceId}`;
    
    this.log('CREATE_WORKSPACE', workspacePath);

    if (this.dryRun) {
      return { 
        dryRun: true, 
        action: 'createWorkspace', 
        path: workspacePath 
      };
    }

    if (this.puter) {
      await this.puter.fs.mkdir(workspacePath, { recursive: true });
    }

    const workspace = {
      id: workspaceId,
      path: workspacePath,
      createdAt: new Date().toISOString(),
      files: [],
      metadata: options.metadata || {},
    };

    if (this.puter) {
      await this.puter.kv.set(`workspace:${workspaceId}`, JSON.stringify(workspace));
    }

    return workspace;
  }

  async writeFile(workspaceId, filename, content, options = {}) {
    const filePath = `${this.projectRoot}/${workspaceId}/${filename}`;
    
    this.validatePath(filePath);
    this.validateExtension(filename);

    if (content.length > FILE_PERMISSIONS.maxFileSize) {
      throw new Error(`File too large: ${content.length} bytes (max: ${FILE_PERMISSIONS.maxFileSize})`);
    }

    this.log('WRITE_FILE', filePath, { size: content.length });

    if (this.dryRun) {
      this.pendingOperations.push({
        action: 'writeFile',
        path: filePath,
        content: content,
        size: content.length,
      });
      return { dryRun: true, action: 'writeFile', path: filePath };
    }

    if (this.puter) {
      const dir = filePath.substring(0, filePath.lastIndexOf('/'));
      await this.puter.fs.mkdir(dir, { recursive: true });
      await this.puter.fs.write(filePath, content);
    }

    return { success: true, path: filePath, size: content.length };
  }

  async readFile(workspaceId, filename) {
    const filePath = `${this.projectRoot}/${workspaceId}/${filename}`;
    
    this.validatePath(filePath);
    this.log('READ_FILE', filePath);

    if (this.puter) {
      const content = await this.puter.fs.read(filePath);
      return content;
    }

    return null;
  }

  async deleteFile(workspaceId, filename) {
    const filePath = `${this.projectRoot}/${workspaceId}/${filename}`;
    
    this.validatePath(filePath);
    this.log('DELETE_FILE', filePath);

    if (this.dryRun) {
      this.pendingOperations.push({
        action: 'deleteFile',
        path: filePath,
      });
      return { dryRun: true, action: 'deleteFile', path: filePath };
    }

    if (this.puter) {
      await this.puter.fs.delete(filePath);
    }

    return { success: true, path: filePath };
  }

  async createFolder(workspaceId, folderPath) {
    const fullPath = `${this.projectRoot}/${workspaceId}/${folderPath}`;
    
    this.validatePath(fullPath);
    this.log('CREATE_FOLDER', fullPath);

    if (this.dryRun) {
      this.pendingOperations.push({
        action: 'createFolder',
        path: fullPath,
      });
      return { dryRun: true, action: 'createFolder', path: fullPath };
    }

    if (this.puter) {
      await this.puter.fs.mkdir(fullPath, { recursive: true });
    }

    return { success: true, path: fullPath };
  }

  async listFiles(workspaceId, folderPath = '') {
    const fullPath = `${this.projectRoot}/${workspaceId}/${folderPath}`.replace(/\/$/, '');
    
    this.validatePath(fullPath);
    this.log('LIST_FILES', fullPath);

    if (this.puter) {
      const items = await this.puter.fs.readdir(fullPath);
      return items.map(item => ({
        name: item.name,
        type: item.is_dir ? 'folder' : 'file',
        size: item.size || 0,
        modified: item.modified || null,
      }));
    }

    return [];
  }

  async moveFile(workspaceId, fromPath, toPath) {
    const fullFromPath = `${this.projectRoot}/${workspaceId}/${fromPath}`;
    const fullToPath = `${this.projectRoot}/${workspaceId}/${toPath}`;
    
    this.validatePath(fullFromPath);
    this.validatePath(fullToPath);
    this.validateExtension(toPath.split('/').pop());
    
    this.log('MOVE_FILE', fullFromPath, { to: fullToPath });

    if (this.dryRun) {
      this.pendingOperations.push({
        action: 'moveFile',
        from: fullFromPath,
        to: fullToPath,
      });
      return { dryRun: true, action: 'moveFile', from: fullFromPath, to: fullToPath };
    }

    if (this.puter) {
      await this.puter.fs.rename(fullFromPath, fullToPath);
    }

    return { success: true, from: fullFromPath, to: fullToPath };
  }

  async copyFile(workspaceId, fromPath, toPath) {
    const fullFromPath = `${this.projectRoot}/${workspaceId}/${fromPath}`;
    const fullToPath = `${this.projectRoot}/${workspaceId}/${toPath}`;
    
    this.validatePath(fullFromPath);
    this.validatePath(fullToPath);
    this.validateExtension(toPath.split('/').pop());
    
    this.log('COPY_FILE', fullFromPath, { to: fullToPath });

    let sourceContent = null;
    if (this.puter) {
      try {
        sourceContent = await this.puter.fs.read(fullFromPath);
      } catch (e) {
        throw new Error(`Source file not found: ${fromPath}`);
      }
    }

    if (this.dryRun) {
      this.pendingOperations.push({
        action: 'copyFile',
        from: fullFromPath,
        to: fullToPath,
        content: sourceContent,
      });
      return { dryRun: true, action: 'copyFile', from: fullFromPath, to: fullToPath };
    }

    if (this.puter) {
      await this.puter.fs.copy(fullFromPath, fullToPath);
    }

    return { success: true, from: fullFromPath, to: fullToPath };
  }

  enableDryRun() {
    this.dryRun = true;
    this.pendingOperations = [];
  }

  disableDryRun() {
    this.dryRun = false;
    this.pendingOperations = [];
  }

  getPendingOperations() {
    return [...this.pendingOperations];
  }

  async commitOperations() {
    if (!this.dryRun) {
      throw new Error('Not in dry-run mode');
    }

    const operations = [...this.pendingOperations];
    this.dryRun = false;
    this.pendingOperations = [];

    const results = [];
    const committed = [];

    for (const op of operations) {
      try {
        let result;
        
        if (this.puter) {
          switch (op.action) {
            case 'writeFile':
              if (!op.content && op.content !== '') {
                throw new Error(`writeFile operation missing content for ${op.path}`);
              }
              const dir = op.path.substring(0, op.path.lastIndexOf('/'));
              await this.puter.fs.mkdir(dir, { recursive: true });
              
              let previousWriteContent = null;
              try {
                previousWriteContent = await this.puter.fs.read(op.path);
              } catch (e) {}
              
              await this.puter.fs.write(op.path, op.content);
              result = { ...op, status: 'committed', bytesWritten: op.content.length };
              
              if (previousWriteContent !== null) {
                committed.push({ action: 'restore', path: op.path, content: previousWriteContent });
              } else {
                committed.push({ action: 'delete', path: op.path });
              }
              break;
              
            case 'deleteFile':
              let existedBefore = false;
              let previousContent = null;
              try {
                previousContent = await this.puter.fs.read(op.path);
                existedBefore = true;
              } catch (e) {}
              
              if (existedBefore) {
                await this.puter.fs.delete(op.path);
                committed.push({ action: 'restore', path: op.path, content: previousContent });
              }
              result = { ...op, status: 'committed' };
              break;
              
            case 'createFolder':
              await this.puter.fs.mkdir(op.path, { recursive: true });
              result = { ...op, status: 'committed' };
              break;
              
            case 'moveFile':
              await this.puter.fs.rename(op.from, op.to);
              committed.push({ action: 'move', from: op.to, to: op.from });
              result = { ...op, status: 'committed' };
              break;
              
            case 'copyFile':
              if (!op.content && op.content !== '') {
                throw new Error(`copyFile operation missing source content for ${op.from}`);
              }
              const copyDir = op.to.substring(0, op.to.lastIndexOf('/'));
              await this.puter.fs.mkdir(copyDir, { recursive: true });
              await this.puter.fs.write(op.to, op.content);
              committed.push({ action: 'delete', path: op.to });
              result = { ...op, status: 'committed' };
              break;
              
            default:
              result = { ...op, status: 'skipped', reason: 'unknown action' };
          }
        } else {
          result = { ...op, status: 'simulated' };
        }
        
        results.push(result);
        this.log('COMMIT', op.path || op.from, { action: op.action });
        
      } catch (error) {
        results.push({ ...op, status: 'failed', error: error.message });
        this.log('COMMIT_ERROR', op.path || op.from, { error: error.message });
        
        for (const rollbackOp of committed.reverse()) {
          try {
            await this.executeRollback(rollbackOp);
            this.log('ROLLBACK', rollbackOp.path || rollbackOp.from, { action: rollbackOp.action });
          } catch (rollbackError) {
            this.log('ROLLBACK_ERROR', rollbackOp.path || rollbackOp.from, { error: rollbackError.message });
          }
        }
        
        throw new Error(`Transaction failed at ${op.action}: ${error.message}`);
      }
    }

    return results;
  }

  async executeRollback(op) {
    if (!this.puter) return;
    
    switch (op.action) {
      case 'delete':
        await this.puter.fs.delete(op.path);
        break;
      case 'restore':
        await this.puter.fs.write(op.path, op.content);
        break;
      case 'move':
        await this.puter.fs.rename(op.from, op.to);
        break;
    }
  }

  getAuditLog() {
    return [...this.auditLog];
  }

  clearAuditLog() {
    this.auditLog = [];
  }
}

export class TransactionManager {
  constructor(workspace) {
    this.workspace = workspace;
    this.snapshots = new Map();
    this.activeTransaction = null;
    this.fileCount = 0;
  }

  async beginTransaction(name = 'default') {
    if (this.activeTransaction) {
      throw new Error('Transaction already in progress');
    }

    this.workspace.enableDryRun();
    this.activeTransaction = {
      id: `tx-${Date.now().toString(36)}`,
      name,
      startedAt: new Date().toISOString(),
      operations: [],
      fileCount: 0,
    };

    return this.activeTransaction;
  }

  async addOperation(operation) {
    if (!this.activeTransaction) {
      throw new Error('No active transaction');
    }

    if (operation.action === 'writeFile' || operation.action === 'copyFile') {
      this.activeTransaction.fileCount++;
      
      if (this.activeTransaction.fileCount > FILE_PERMISSIONS.maxFilesPerProject) {
        throw new Error(`Transaction exceeds maximum files limit (${FILE_PERMISSIONS.maxFilesPerProject})`);
      }
    }

    this.activeTransaction.operations.push({
      ...operation,
      addedAt: new Date().toISOString(),
    });

    return operation;
  }

  async commit() {
    if (!this.activeTransaction) {
      throw new Error('No active transaction');
    }

    const transaction = this.activeTransaction;
    
    try {
      const results = await this.workspace.commitOperations();
      this.activeTransaction = null;

      return {
        ...transaction,
        completedAt: new Date().toISOString(),
        results,
        status: 'committed',
      };
    } catch (error) {
      this.activeTransaction = null;
      this.workspace.disableDryRun();
      
      return {
        ...transaction,
        failedAt: new Date().toISOString(),
        error: error.message,
        status: 'failed_with_rollback',
      };
    }
  }

  async rollback() {
    if (!this.activeTransaction) {
      throw new Error('No active transaction');
    }

    this.workspace.disableDryRun();
    const transaction = this.activeTransaction;
    this.activeTransaction = null;

    return {
      ...transaction,
      cancelledAt: new Date().toISOString(),
      operationsDiscarded: transaction.operations.length,
      status: 'rolled_back',
    };
  }

  preview() {
    if (!this.activeTransaction) {
      throw new Error('No active transaction');
    }

    return {
      transactionId: this.activeTransaction.id,
      name: this.activeTransaction.name,
      operations: this.workspace.getPendingOperations(),
      fileCount: this.activeTransaction.fileCount,
      maxFiles: FILE_PERMISSIONS.maxFilesPerProject,
    };
  }

  isActive() {
    return this.activeTransaction !== null;
  }

  getActiveTransaction() {
    return this.activeTransaction;
  }
}

export default FileWorkspace;
