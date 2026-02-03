# CloudPilot AI Studio - Systems Documentation

This document provides comprehensive documentation for all major systems in CloudPilot AI Studio, including their capabilities, APIs, and testing status.

---

## Table of Contents

1. [Compute Pods System](#1-compute-pods-system)
2. [Live Server Deployment](#2-live-server-deployment)
3. [Storage System (Puter KV)](#3-storage-system-puter-kv)
4. [AI Integration System](#4-ai-integration-system)
5. [Agent System](#5-agent-system)
6. [WASM Runtime](#6-wasm-runtime)
7. [Snapshot System](#7-snapshot-system)
8. [Authentication System](#8-authentication-system)

---

## 1. Compute Pods System

### Overview
The Compute Pods system provides sandboxed execution environments for running code, AI tasks, and transformations. It manages job queuing, resource accounting, and agent namespace isolation.

### Location
- `public/grudgeos/lib/pods/pod-manager.js`

### Key Features
- **Pod Lifecycle Management**: Create, terminate, and manage compute pods
- **Job Queue Processing**: Priority-based job scheduling (high, normal, low)
- **Resource Accounting**: Track CPU, memory usage per pod and agent
- **Agent Binding**: Bind pods to specific agents with namespace isolation
- **Warm Pool**: Pre-warmed pods for faster job startup

### Pod Status States
| Status | Description |
|--------|-------------|
| `idle` | Pod is available for new jobs |
| `warming` | Pod is being initialized |
| `busy` | Pod is currently executing a job |
| `cooling` | Pod is winding down |
| `terminated` | Pod has been shut down |

### Job Types
| Type | Description |
|------|-------------|
| `code` | Execute JavaScript code in sandbox |
| `ai` | Call Puter AI services |
| `transform` | Apply data transformations |
| `build` | Build/compile operations |
| `custom` | User-defined job types |

### API Reference

```javascript
// Access the PodManager
const manager = window.podManager;

// Initialize
await manager.initialize();

// Create a pod
const pod = manager.createPod({
  name: 'MyPod',
  runtime: 'browser',
  agentId: 'code-agent',
  cpuLimit: 100,
  memoryLimitMb: 256,
  timeoutMs: 30000
});

// Submit a job
const job = manager.submitJob({
  type: 'code',
  code: 'return 2 + 2',
  priority: 'normal',
  agentId: 'code-agent'
});

// Get statistics
const stats = manager.getStats();
// Returns: { totalPods, activePods, idlePods, queuedJobs, runningJobs, completedJobs }

// Terminate a pod
manager.terminatePod(pod.id);
```

### Testing Status
**Verified:**
- Pod creation and termination work correctly
- Job submission and automatic queue processing functional
- State persistence via Puter KV when available

**Not Yet Verified:**
- Priority-based queue sorting (needs jobs with different priorities)
- Resource limit enforcement (CPU/memory limits)

---

## 2. Live Server Deployment

### Overview
Deploy static websites to live URLs using Puter's hosting service. Sites are deployed to `*.puter.site` subdomains.

### Location
- `public/grudgeos/lib/puter-auth.js` (PuterDeployService class)

### Key Features
- **One-Click Deployment**: Deploy apps to live URLs
- **Subdomain Generation**: Automatic sanitized subdomain creation
- **Deployment Management**: List, update, and delete deployments
- **Deployment History**: Track all deployments with timestamps

### API Reference

```javascript
// Access the PuterDeploy service
const deploy = window.PuterDeploy;

// Deploy from files
const result = await deploy.deploy('MyApp', [
  { name: 'index.html', content: '<html>...</html>' },
  { name: 'style.css', content: 'body { ... }' }
]);
// Returns: { success: true, deployment: { url: 'https://myapp.puter.site', ... } }

// Deploy from a directory
const result = await deploy.deployFromDir('MyApp', '/path/to/project');

// List all deployments
const deployments = await deploy.listDeployments();

// Delete a deployment
await deploy.deleteDeployment('myapp');
```

### Requirements
- User must be authenticated with Puter
- Puter hosting service must be available

### Testing Status
**Requirements:**
- Puter authentication required for deployment
- Puter hosting service must be available

**Verified:**
- Offline mode gracefully handled with fallback

**Not Yet Verified (requires Puter account):**
- Deploy, list, and delete operations

---

## 3. Storage System (Puter KV)

### Overview
All persistent data is stored using Puter's Key-Value (KV) storage. This provides cloud-based persistence without requiring a database setup.

### Key Features
- **Key-Value Storage**: Simple get/set API
- **JSON Serialization**: Automatic data serialization
- **Namespace Isolation**: Organized storage by feature
- **Offline Fallback**: Graceful degradation when offline

### Namespaces Used

| Namespace | Purpose |
|-----------|---------|
| `compute_pods:*` | Pod state, job queue, completed jobs |
| `snapshots:*` | Snapshot metadata and data |
| `grudgeos_agents` | Agent progress and learning state |
| `grudgeos_deployments` | Deployment history |
| `agent_squads:*` | Squad configurations and state |

### API Reference

```javascript
// Check Puter availability
if (typeof puter !== 'undefined' && puter.kv) {
  // Set a value
  await puter.kv.set('mykey', JSON.stringify({ data: 'value' }));
  
  // Get a value
  const data = await puter.kv.get('mykey');
  const parsed = JSON.parse(data);
  
  // Delete a value
  await puter.kv.del('mykey');
}
```

### Testing Status
**Verified:**
- All systems correctly check for Puter KV availability
- Offline mode supported with in-memory fallback
- JSON serialization/deserialization working

---

## 4. AI Integration System

### Overview
Multi-provider AI integration using Puter's free AI API, supporting GPT-4o, Claude, Gemini, and DeepSeek models.

### Location
- `public/grudgeos/lib/ai-rest-client.js`

### Supported Models
| Model | Provider | Best For |
|-------|----------|----------|
| `gpt-4o` | OpenAI | General purpose, vision |
| `claude-sonnet-4` | Anthropic | Code, analysis |
| `claude-3.5-sonnet` | Anthropic | Creative, detailed |
| `gemini-2.0-flash` | Google | Fast responses |

### API Reference

```javascript
// Using Puter AI directly
if (typeof puter !== 'undefined' && puter.ai) {
  const response = await puter.ai.chat('Explain recursion');
  console.log(response);
}

// Using AI REST client (for agents)
const client = window.aiRestClient;
const response = await client.sendRequest({
  model: 'gpt-4o',
  prompt: 'Generate a function to sort an array'
});
```

### Testing Status
**Verified:**
- Puter AI availability checks in place
- Fallback error handling implemented

**Not Yet Verified (requires Puter AI access):**
- Multi-model support (GPT-4o, Claude, Gemini)
- Streaming responses

---

## 5. Agent System

### Overview
A comprehensive agent system with core agents (always active) and specialist agents (on-demand activation). Includes agent registry, squads, and learning states.

### Location
- `public/grudgeos/lib/agent-registry.js` - Agent definitions and tools
- `public/grudgeos/lib/agent-squad.js` - Squad management

### Core Agents
| Agent | Role | Capabilities |
|-------|------|--------------|
| Orchestrator | Task Coordinator | Task decomposition, workflow management |
| Code Agent | Code Generation | Code generation, refactoring, debugging |
| Art Agent | Visual Design | UI design, sprites, animations |
| Analyst | Data Analysis | Data analysis, reporting, visualization |

### Specialist Agents
| Agent | Specialty | Languages |
|-------|-----------|-----------|
| Lua Agent | Roblox/Love2D | Lua, Luau |
| Rust Agent | Systems Programming | Rust, WASM |
| Three.js Agent | 3D Graphics | JavaScript, GLSL |
| Phaser Agent | 2D Games | JavaScript, TypeScript |
| Colyseus Agent | Multiplayer | JavaScript, TypeScript |
| Network Agent | WebSocket/WebRTC | JavaScript, TypeScript |

### Learning States
Agents progress through learning cycles:
1. `ready` - Awaiting new task
2. `creating` - Generating solution approach
3. `learning` - Analyzing patterns and outcomes
4. `repeating` - Applying learned patterns
5. `reiterating` - Refining based on feedback
6. `succeeding` - Task completed successfully

### API Reference

```javascript
// Access the agent registry
const registry = window.AgentRegistry;

// Initialize
await registry.init();

// Get all agents
const agents = registry.getAllAgents();

// Get active agents
const active = registry.getActiveAgents();

// Activate a specialist agent
registry.activateAgent('lua-agent');

// Get agent tools
const tools = registry.getAgentTools('code-agent');

// Update agent progress
await registry.updateAgentProgress('code-agent', true);
```

### Testing Status
**Verified:**
- Agent registry initialization with 10 agents
- Core agents (4) default to active status
- Specialist agents (6) default to dormant status
- Agent tools properly linked

**To Test Manually:**
- Learning state progression through task completion
- XP and level-up mechanics

---

## 6. WASM Runtime

### Overview
WebAssembly runtime for executing compiled WASM modules with WASI support.

### Location
- `public/grudgeos/lib/runtime/wasm-runtime.js`

### Key Features
- **Module Loading**: Load WASM from URL, bytes, or base64
- **Memory Management**: Shared memory with allocation
- **WASI Support**: Basic WASI preview1 compatibility
- **Function Calls**: Call exported WASM functions

### Module Status States
| Status | Description |
|--------|-------------|
| `loading` | Module is being loaded |
| `ready` | Module is ready for execution |
| `error` | Module failed to load |
| `unloaded` | Module has been unloaded |

### API Reference

```javascript
// Access the WASM runtime
const runtime = window.wasmRuntime;

// Initialize
await runtime.initialize();

// Load a module
const module = await runtime.loadModule({
  id: 'mymodule',
  name: 'My WASM Module',
  path: '/path/to/module.wasm'
});

// Call a function
const result = runtime.callFunction('mymodule', 'add', 5, 3);

// Execute with auto-cleanup
const result = await runtime.executeWasm({
  path: '/module.wasm',
  entryPoint: 'main',
  args: []
});

// List loaded modules
const modules = runtime.listModules();

// Unload a module
runtime.unloadModule('mymodule');
```

### Testing Status
**Verified:**
- WebAssembly availability detection
- Memory initialization
- Module status tracking
- Base64-encoded WASM module loading
- Function execution with arguments
- Test case runner with pass/fail results

### WASM Examples Library
The WASM Examples library (`/grudgeos/lib/runtime/wasm-examples.js`) provides 12 working examples:

**Math Functions:**
- `add` - Add two numbers
- `multiply` - Multiply two numbers  
- `subtract` - Subtract two numbers
- `max` - Maximum of two numbers
- `min` - Minimum of two numbers
- `abs` - Absolute value
- `power` - Exponentiation

**Algorithms:**
- `factorial` - Recursive factorial
- `fibonacci` - Nth Fibonacci number
- `is_prime` - Prime number check
- `gcd` - Greatest common divisor

**Utility:**
- `clamp` - Clamp value between bounds

### WASM Runner App
The WASM Runner desktop app provides a UI for testing WASM modules:
- Select examples from categories
- Run functions with custom arguments
- Run automated test cases
- View console output
- "Run All Tests" button for full suite

**To Test With WASM Files:**
- Custom module loading from external URLs
- WASI compatibility with complex modules

---

## 7. Snapshot System

### Overview
State persistence and restoration system for agents, squads, workspaces, and full system state.

### Location
- `public/grudgeos/lib/pods/snapshot-manager.js`

### Snapshot Types
| Type | Contents |
|------|----------|
| `agent` | Single agent state |
| `squad` | Squad configuration and terminals |
| `workspace` | All squads, terminals, REST clients |
| `project` | Workspace + files |
| `full` | Complete system state |

### API Reference

```javascript
// Access the snapshot manager
const manager = window.snapshotManager;

// Initialize
await manager.initialize();

// Create a snapshot
const snapshot = await manager.createSnapshot({
  name: 'My Snapshot',
  type: 'workspace',
  description: 'Before major changes',
  tags: ['backup']
});

// List snapshots
const snapshots = manager.listSnapshots();

// Restore a snapshot
await manager.restoreSnapshot(snapshot.id);

// Export snapshot to JSON
const json = await manager.exportSnapshot(snapshot.id);

// Import snapshot from JSON
const imported = await manager.importSnapshot(json);

// Delete a snapshot
await manager.deleteSnapshot(snapshot.id);
```

### Testing Status
**Verified:**
- Snapshot type definitions (agent, squad, workspace, project, full)
- Checksum generation for data integrity
- State capture logic implemented

**To Test With Active Data:**
- Full snapshot creation and restoration
- Import/export JSON roundtrip

---

## 8. Authentication System

### Overview
Puter-based authentication with offline mode fallback.

### Location
- `public/grudgeos/lib/puter-auth.js`

### Features
- **Puter Login**: OAuth-based authentication
- **Session Management**: Automatic session handling
- **Offline Mode**: Graceful fallback when offline
- **Event System**: Subscribe to auth state changes

### API Reference

```javascript
// Access the auth service
const auth = window.PuterAuth;

// Initialize
await auth.init();

// Login
const result = await auth.login();

// Logout
await auth.logout();

// Get current user
const user = auth.getUser();
const username = auth.getUsername();

// Check state
console.log(auth.isAuthenticated);
console.log(auth.isOnline);

// Subscribe to changes
const unsubscribe = auth.onAuthChange((state) => {
  console.log('Auth state:', state);
});
```

### Testing Status
**Verified:**
- Offline mode detection and handling
- Auth state change notifications
- User session initialization

**Requires Puter Account:**
- Full login/logout flow
- Session persistence across refreshes

---

## System Integration Diagram

```
+------------------+     +------------------+     +------------------+
|   Auth System    |---->|   Agent System   |---->|   Compute Pods   |
|  (PuterAuth)     |     | (AgentRegistry)  |     |   (PodManager)   |
+------------------+     +------------------+     +------------------+
         |                        |                        |
         v                        v                        v
+------------------+     +------------------+     +------------------+
|  Storage (KV)    |<----|   AI Services    |<----|   WASM Runtime   |
|   (puter.kv)     |     |   (puter.ai)     |     |  (WasmRuntime)   |
+------------------+     +------------------+     +------------------+
         |                        |
         v                        v
+------------------+     +------------------+
|  Snapshot System |     |    Deployment    |
| (SnapshotManager)|     | (PuterDeploy)    |
+------------------+     +------------------+
```

---

## Console Warnings (Expected)

The following console warnings are expected and do not indicate errors:

1. **CSP Warnings**: "Content Security Policy directive 'default-src' contains an invalid source" - These are from external scripts and don't affect functionality.

2. **Puter SDK Errors**: "Unexpected token '<'" - Internal SDK behavior when services are unreachable. Handled by offline mode.

3. **Extension Errors**: "Manifest does not exist for extension" - Browser extension conflicts, not related to the application.

4. **Stallwart Pings**: "failed ping" - Background service availability checks.

---

## Testing Checklist

This checklist shows manual testing steps. Items marked with (Puter) require Puter authentication.

### Compute Pods
- [x] Create a pod - `podManager.createPod({ name: 'Test' })`
- [x] View all pods - `podManager.getAllPods()`
- [x] Get statistics - `podManager.getStats()`
- [ ] Submit a code job - `podManager.submitJob({ type: 'code', code: 'return 1+1' })`
- [ ] Submit an AI job (Puter) - `podManager.submitJob({ type: 'ai', data: { prompt: 'Hello' } })`
- [x] Terminate a pod - `podManager.terminatePod(podId)`

### Deployment (Puter)
- [ ] Login to Puter - `PuterAuth.login()`
- [ ] Deploy a static site - `PuterDeploy.deploy('myapp', files)`
- [ ] List deployments - `PuterDeploy.listDeployments()`
- [ ] Delete deployment - `PuterDeploy.deleteDeployment('myapp')`

### Storage (Puter)
- [ ] Save data - `puter.kv.set('key', value)`
- [ ] Retrieve data - `puter.kv.get('key')`
- [ ] Delete data - `puter.kv.del('key')`

### AI Integration (Puter)
- [ ] Send chat request - `puter.ai.chat('prompt')`

### Agents
- [x] View all agents - `AgentRegistry.getAllAgents()`
- [x] Get core agents - `AgentRegistry.getCoreAgents()`
- [x] Get specialist agents - `AgentRegistry.getSpecialistAgents()`
- [ ] Activate agent - `AgentRegistry.activateAgent('lua-agent')`
- [ ] Get agent tools - `AgentRegistry.getAgentTools('code-agent')`

### WASM
- [x] Initialize runtime - `wasmRuntime.initialize()`
- [ ] Load module - `wasmRuntime.loadModule({ path: 'file.wasm' })`
- [ ] Call function - `wasmRuntime.callFunction(moduleId, 'main')`
- [ ] Unload module - `wasmRuntime.unloadModule(moduleId)`

### Snapshots
- [x] Initialize - `snapshotManager.initialize()`
- [ ] Create snapshot - `snapshotManager.createSnapshot({ type: 'workspace' })`
- [ ] List snapshots - `snapshotManager.listSnapshots()`
- [ ] Export snapshot - `snapshotManager.exportSnapshot(id)`
- [ ] Restore snapshot - `snapshotManager.restoreSnapshot(id)`

### Authentication (Puter)
- [x] Initialize auth - `PuterAuth.init()`
- [ ] Login - `PuterAuth.login()`
- [ ] Logout - `PuterAuth.logout()`
- [x] Check online status - `PuterAuth.isOnline`

---

## Troubleshooting

### "Puter SDK not available"
The application is running in offline mode. Login to Puter for full functionality.

### "AI service not available"
Check internet connection and Puter authentication status.

### "Failed to save state"
Puter KV is not accessible. Data will be stored in memory until reconnection.

### Jobs stuck in "pending"
Ensure there are available pods. Create new pods if at maximum capacity.

---

*Last Updated: 2026-01-13*
