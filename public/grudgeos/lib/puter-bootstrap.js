/**
 * CloudPilot AI Studio - Puter Bootstrap Service
 * GRUDACHAIN account initialization with folder structure
 * 
 * Phase 4: User Onboarding
 * 
 * This module handles:
 * - First-time Puter account detection
 * - Core folder structure creation on GRUDACHAIN admin account
 * - User workspace provisioning
 * - Agent deployment initialization
 */

const GRUDACHAIN_CONFIG = {
  adminEmail: 'grudgedev@gmail.com',
  corePrefix: '/grudge-core/',
  workersPrefix: '/grudge-workers/',
  aiPrefix: '/grudge-ai/',
  usersPrefix: '/grudge-users/'
};

const FOLDER_STRUCTURE = {
  core: [
    'config',
    'templates',
    'legal',
    'wiki',
    'backups'
  ],
  workers: [
    'active',
    'templates',
    'logs',
    'cache'
  ],
  ai: [
    'models',
    'knowledge-bases',
    'prompts',
    'training-data',
    'cache'
  ],
  users: [
    'pending',
    'active',
    'archived'
  ]
};

/**
 * Puter Bootstrap Service
 * Handles all Puter-native initialization and provisioning
 */
export class PuterBootstrap {
  constructor() {
    this.puter = null;
    this.isInitialized = false;
    this.currentUser = null;
    this.adminMode = false;
  }

  /**
   * Initialize the Puter SDK
   */
  async init() {
    if (this.isInitialized) return;
    
    if (typeof window !== 'undefined' && window.puter) {
      this.puter = window.puter;
      this.isInitialized = true;
      console.log('[PuterBootstrap] Puter SDK initialized');
    } else {
      throw new Error('Puter SDK not available');
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    await this.init();
    return await this.puter.auth.isSignedIn();
  }

  /**
   * Get current user info
   */
  async getCurrentUser() {
    await this.init();
    
    if (!await this.isAuthenticated()) {
      return null;
    }
    
    this.currentUser = await this.puter.auth.getUser();
    return this.currentUser;
  }

  /**
   * Sign in user if not authenticated
   */
  async ensureAuthenticated() {
    await this.init();
    
    if (!await this.isAuthenticated()) {
      await this.puter.auth.signIn();
    }
    
    return await this.getCurrentUser();
  }

  /**
   * Create GRUDACHAIN core folder structure
   * Only run once on initial deployment
   */
  async initializeCoreStructure() {
    await this.ensureAuthenticated();
    
    console.log('[PuterBootstrap] Initializing GRUDACHAIN core structure...');
    
    const results = {
      success: [],
      failed: [],
      skipped: []
    };
    
    const prefixes = [
      { prefix: GRUDACHAIN_CONFIG.corePrefix, folders: FOLDER_STRUCTURE.core },
      { prefix: GRUDACHAIN_CONFIG.workersPrefix, folders: FOLDER_STRUCTURE.workers },
      { prefix: GRUDACHAIN_CONFIG.aiPrefix, folders: FOLDER_STRUCTURE.ai },
      { prefix: GRUDACHAIN_CONFIG.usersPrefix, folders: FOLDER_STRUCTURE.users }
    ];
    
    for (const { prefix, folders } of prefixes) {
      await this.ensureDirectory(prefix.slice(0, -1), results);
      
      for (const folder of folders) {
        const fullPath = prefix + folder;
        await this.ensureDirectory(fullPath, results);
      }
    }
    
    console.log('[PuterBootstrap] Core structure initialized:', results);
    return results;
  }

  /**
   * Ensure a directory exists
   */
  async ensureDirectory(path, results) {
    try {
      const stat = await this.puter.fs.stat(path);
      if (stat) {
        results.skipped.push(path);
        return true;
      }
    } catch (e) {
      try {
        await this.puter.fs.mkdir(path);
        results.success.push(path);
        console.log(`[PuterBootstrap] Created: ${path}`);
        return true;
      } catch (mkdirError) {
        results.failed.push({ path, error: mkdirError.message });
        console.error(`[PuterBootstrap] Failed to create ${path}:`, mkdirError);
        return false;
      }
    }
    return false;
  }

  /**
   * Provision new user workspace
   */
  async provisionUserWorkspace(userId) {
    await this.ensureAuthenticated();
    
    const userPath = `${GRUDACHAIN_CONFIG.usersPrefix}active/${userId}`;
    const results = { success: [], failed: [], skipped: [] };
    
    const userFolders = [
      userPath,
      `${userPath}/agents`,
      `${userPath}/projects`,
      `${userPath}/data`,
      `${userPath}/logs`,
      `${userPath}/config`
    ];
    
    for (const folder of userFolders) {
      await this.ensureDirectory(folder, results);
    }
    
    const configPath = `${userPath}/config/settings.json`;
    try {
      await this.puter.fs.write(configPath, JSON.stringify({
        userId,
        createdAt: new Date().toISOString(),
        version: '1.0.0',
        preferences: {
          theme: 'dark',
          defaultModel: 'openrouter:anthropic/claude-sonnet-4',
          enableCaching: true
        },
        limits: {
          maxAgents: 5,
          maxProjects: 10,
          storageQuotaMB: 1000
        }
      }, null, 2));
      results.success.push(configPath);
    } catch (error) {
      results.failed.push({ path: configPath, error: error.message });
    }
    
    return results;
  }

  /**
   * Deploy user's first agent
   */
  async deployFirstAgent(userId, agentName = 'Assistant') {
    await this.ensureAuthenticated();
    
    const agentId = `agent-${userId}-${Date.now()}`;
    const agentPath = `${GRUDACHAIN_CONFIG.usersPrefix}active/${userId}/agents/${agentId}`;
    
    const results = { agentId, path: agentPath, files: [] };
    
    await this.ensureDirectory(agentPath, { success: [], failed: [], skipped: [] });
    
    const agentConfig = {
      id: agentId,
      name: agentName,
      owner: userId,
      createdAt: new Date().toISOString(),
      status: 'active',
      capabilities: [
        'chat',
        'code-generation',
        'document-analysis',
        'task-execution'
      ],
      models: {
        primary: 'openrouter:anthropic/claude-sonnet-4',
        fast: 'openrouter:anthropic/claude-3.5-haiku',
        fallback: 'openrouter:meta-llama/llama-3.3-70b-instruct:free'
      },
      systemPrompt: `You are ${agentName}, a personal AI assistant for ${userId} on GrudgeOS.

Your capabilities:
- Execute tasks and generate content
- Write and review code
- Analyze documents and data
- Coordinate with other agents

Always be helpful, accurate, and honest.
Log significant actions for audit trail.
Use appropriate AI models for each task.`,
      knowledgeBases: [
        'agent-kb',
        'model-kb',
        'worker-kb'
      ],
      settings: {
        enableLearning: true,
        enableCaching: true,
        maxContextTokens: 8000,
        temperature: 0.7
      }
    };
    
    try {
      await this.puter.fs.write(
        `${agentPath}/config.json`,
        JSON.stringify(agentConfig, null, 2)
      );
      results.files.push('config.json');
      
      await this.puter.fs.write(
        `${agentPath}/memory.json`,
        JSON.stringify({
          conversations: [],
          learnedPreferences: {},
          taskHistory: []
        }, null, 2)
      );
      results.files.push('memory.json');
      
      await this.puter.fs.write(
        `${agentPath}/log.json`,
        JSON.stringify({
          entries: [],
          lastUpdated: new Date().toISOString()
        }, null, 2)
      );
      results.files.push('log.json');
      
    } catch (error) {
      console.error('[PuterBootstrap] Agent deployment failed:', error);
      throw error;
    }
    
    return results;
  }

  /**
   * Deploy HelloWorld site
   */
  async deployHelloWorld(userId, subdomain = null) {
    await this.ensureAuthenticated();
    
    const siteSubdomain = subdomain || `${userId}-hello`;
    const sitePath = `${GRUDACHAIN_CONFIG.usersPrefix}active/${userId}/projects/hello-world`;
    
    await this.ensureDirectory(sitePath, { success: [], failed: [], skipped: [] });
    
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to GrudgeOS</title>
  <script src="https://js.puter.com/v2/"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #fff;
    }
    .container {
      text-align: center;
      padding: 2rem;
      background: rgba(255,255,255,0.05);
      border-radius: 1rem;
      backdrop-filter: blur(10px);
      max-width: 600px;
    }
    h1 {
      font-size: 2.5rem;
      margin-bottom: 1rem;
      background: linear-gradient(90deg, #00d4ff, #7b2cbf);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p { color: #ccc; margin-bottom: 1rem; }
    .status {
      padding: 0.5rem 1rem;
      background: #00d4ff20;
      border-radius: 0.5rem;
      font-family: monospace;
      margin-top: 1rem;
    }
    .btn {
      margin-top: 1rem;
      padding: 0.75rem 1.5rem;
      background: linear-gradient(90deg, #00d4ff, #7b2cbf);
      border: none;
      border-radius: 0.5rem;
      color: #fff;
      font-size: 1rem;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .btn:hover { transform: scale(1.05); }
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome to GrudgeOS!</h1>
    <p>Your AI-powered cloud development environment is ready.</p>
    <p>User: <strong>${userId}</strong></p>
    <div class="status" id="status">Checking Puter connection...</div>
    <button class="btn" onclick="testAI()">Test AI</button>
  </div>
  <script>
    (async () => {
      const statusEl = document.getElementById('status');
      try {
        if (await puter.auth.isSignedIn()) {
          const user = await puter.auth.getUser();
          statusEl.textContent = 'Connected as ' + user.username;
          statusEl.style.background = '#00ff8820';
        } else {
          statusEl.textContent = 'Not signed in - Click to connect';
          statusEl.style.cursor = 'pointer';
          statusEl.onclick = () => puter.auth.signIn();
        }
      } catch (e) {
        statusEl.textContent = 'Error: ' + e.message;
        statusEl.style.background = '#ff000020';
      }
    })();
    
    async function testAI() {
      const statusEl = document.getElementById('status');
      statusEl.textContent = 'Calling AI...';
      try {
        const response = await puter.ai.chat('Say hello to ${userId}!');
        puter.ui.alert(response);
        statusEl.textContent = 'AI test successful!';
        statusEl.style.background = '#00ff8820';
      } catch (e) {
        statusEl.textContent = 'AI error: ' + e.message;
        statusEl.style.background = '#ff000020';
      }
    }
  </script>
</body>
</html>`;
    
    await this.puter.fs.write(`${sitePath}/index.html`, indexHtml);
    
    try {
      const site = await this.puter.hosting.create(siteSubdomain, sitePath);
      return {
        success: true,
        subdomain: siteSubdomain,
        url: `https://${siteSubdomain}.puter.site`,
        path: sitePath
      };
    } catch (error) {
      console.error('[PuterBootstrap] Hosting deployment failed:', error);
      return {
        success: false,
        error: error.message,
        path: sitePath,
        localOnly: true
      };
    }
  }

  /**
   * Check if user is a new user (first visit)
   */
  async isNewUser(userId) {
    try {
      const userPath = `${GRUDACHAIN_CONFIG.usersPrefix}active/${userId}`;
      const stat = await this.puter.fs.stat(`${userPath}/config/settings.json`);
      return !stat;
    } catch (e) {
      return true;
    }
  }

  /**
   * Complete new user onboarding
   */
  async onboardNewUser() {
    const user = await this.ensureAuthenticated();
    const userId = user.username || user.uuid || `user-${Date.now()}`;
    
    if (!await this.isNewUser(userId)) {
      console.log('[PuterBootstrap] User already onboarded:', userId);
      return { alreadyOnboarded: true, userId };
    }
    
    console.log('[PuterBootstrap] Starting onboarding for:', userId);
    
    const workspaceResult = await this.provisionUserWorkspace(userId);
    console.log('[PuterBootstrap] Workspace provisioned');
    
    const agentResult = await this.deployFirstAgent(userId, 'CloudPilot');
    console.log('[PuterBootstrap] First agent deployed:', agentResult.agentId);
    
    const siteResult = await this.deployHelloWorld(userId);
    console.log('[PuterBootstrap] HelloWorld deployed:', siteResult.url || 'local only');
    
    return {
      success: true,
      userId,
      workspace: workspaceResult,
      agent: agentResult,
      site: siteResult
    };
  }

  /**
   * Get usage statistics
   */
  async getUsageStats() {
    await this.ensureAuthenticated();
    
    try {
      const usage = await this.puter.auth.getMonthlyUsage();
      return usage;
    } catch (e) {
      console.error('[PuterBootstrap] Failed to get usage:', e);
      return null;
    }
  }
}

export const puterBootstrap = new PuterBootstrap();

if (typeof window !== 'undefined') {
  window.GrudgeOS = window.GrudgeOS || {};
  window.GrudgeOS.PuterBootstrap = puterBootstrap;
}

export default puterBootstrap;
