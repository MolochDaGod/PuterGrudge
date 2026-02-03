# Shell & Console Architecture

This document describes the unified architecture for shells, consoles, inputs, and operations in CloudPilot AI Studio.

## Overview

The system uses three core registries to manage execution environments:

1. **ShellRegistry** - Tracks all shell instances and their execution contexts
2. **ConsoleStream** - Manages input/output streams with buffering and subscriptions
3. **OperationsRegistry** - Tracks all operations with progress and history

## Shell Types

| Type | ID Prefix | Description | Execution Context |
|------|-----------|-------------|-------------------|
| Terminal | `shell:terminal:*` | Primary command-line interface | User |
| Code Ninja | `shell:code-ninja:*` | IDE-integrated shell | User |
| Micro Terminal | `shell:micro-terminal:*` | Lightweight embedded terminal | User/Agent |
| Pod Shell | `shell:pod-shell:*` | Compute pod execution environment | Pod (Sandbox) |
| AI Shell | `shell:ai-shell:*` | AI conversational interface | Agent |
| WASM Shell | `shell:wasm-shell:*` | WebAssembly runtime | Sandbox |

## Execution Contexts

| Context | Permissions | Use Case |
|---------|-------------|----------|
| `user` | Full user permissions | Direct user interaction |
| `system` | Elevated access | System operations |
| `agent` | Agent permissions | AI agent tasks |
| `pod` | Pod-scoped access | Compute pod jobs |
| `sandbox` | No external access | Untrusted code execution |

## Input Sources

```
user:keyboard    - Direct keyboard input from user
user:voice       - Voice commands (speech-to-text)
agent:command    - Commands from AI agents
workflow:trigger - Automated workflow triggers
api:request      - External API requests
script:exec      - Script/code execution
```

## Output Destinations

```
console:log      - Standard console output
console:error    - Error output (stderr)
console:warn     - Warning messages
file:write       - File system writes
network:send     - Network transmissions
ui:display       - Visual UI updates
agent:memory     - Agent memory storage
```

## Stream Architecture

Each shell automatically creates three streams:
- **stdout** - Standard output for normal messages
- **stderr** - Error output for errors and warnings
- **events** - System events (status changes, lifecycle)

### Stream ID Format
```
stream:{source}:{channel}:{timestamp}
```

Example: `stream:terminal:stdout:1705123456789`

## Operation Lifecycle

```
PENDING → QUEUED → RUNNING → COMPLETED
                          → FAILED
                          → CANCELLED
```

### Operation Types

| Type | Description |
|------|-------------|
| `command` | Shell command execution |
| `script` | Script or code execution |
| `build` | Build/compilation process |
| `deploy` | Deployment operation |
| `ai-task` | AI agent task |
| `file-op` | File system operation |
| `network` | Network request |
| `wasm-exec` | WASM module execution |

## Usage Examples

### Creating a Shell with Streams

```javascript
const shell = GrudgeCore.createShellWithStreams({
  type: ShellRegistry.SHELL_TYPES.TERMINAL,
  name: 'Main Terminal',
  executionContext: ShellRegistry.EXECUTION_CONTEXTS.USER,
  inputSources: [ShellRegistry.INPUT_SOURCES.USER_KEYBOARD],
  outputDestinations: [
    ShellRegistry.OUTPUT_DESTINATIONS.CONSOLE_LOG,
    ShellRegistry.OUTPUT_DESTINATIONS.UI_DISPLAY
  ]
});

// Write to stdout
shell.stdout('Command executed successfully');

// Write to stderr
shell.stderr('Error: File not found');

// Subscribe to output
shell.subscribe('stdout', (entry) => {
  console.log('New output:', entry.message);
});

// Cleanup
shell.destroy();
```

### Creating an Operation

```javascript
const op = GrudgeCore.createOperation({
  type: OperationsRegistry.OPERATION_TYPES.BUILD,
  name: 'Build Project',
  shellId: shell.shell.id
});

op.start();
op.progress(25, 'Compiling TypeScript...');
op.progress(50, 'Bundling assets...');
op.progress(75, 'Optimizing...');
op.complete({ artifacts: ['dist/bundle.js'] });

// Or on failure
op.fail('Build failed: syntax error');
```

### Querying the Registry

```javascript
// Get all active shells
const shells = ShellRegistry.getAll();

// Get shells by type
const terminals = ShellRegistry.getByType('terminal');

// Get operation statistics
const stats = OperationsRegistry.getStats();

// Get shell description
const info = ShellRegistry.describeShell(shellId);
```

## File Locations

```
public/grudgeos/lib/core/
├── shell-registry.js      # Shell type definitions and registry
├── console-stream.js      # Stream management and buffering
├── operations-registry.js # Operation tracking and history
└── index.js               # Core systems initialization
```

## ID Naming Conventions

| Entity | Format | Example |
|--------|--------|---------|
| Shell | `shell:{type}:{timestamp}_{random}` | `shell:terminal:1705123456789_abc123` |
| Stream | `stream:{source}:{channel}:{timestamp}` | `stream:terminal:stdout:1705123456789` |
| Operation | `op:{type}:{timestamp}_{random}` | `op:build:1705123456789_xyz789` |
| Entry | `entry_{timestamp}_{random}` | `entry_1705123456789_def4` |

## Integration with Existing Systems

### Compute Pods
When a pod is created, a Pod Shell is automatically registered:
```javascript
const podShell = ShellRegistry.register({
  type: ShellRegistry.SHELL_TYPES.POD_SHELL,
  executionContext: ShellRegistry.EXECUTION_CONTEXTS.POD,
  backingService: 'pod-manager',
  metadata: { podId: pod.id }
});
```

### AI Agents
Agents use AI Shells for conversational interfaces:
```javascript
const aiShell = ShellRegistry.register({
  type: ShellRegistry.SHELL_TYPES.AI_SHELL,
  executionContext: ShellRegistry.EXECUTION_CONTEXTS.AGENT,
  backingService: 'agent-registry',
  metadata: { agentId: agent.id }
});
```

### WASM Runtime
WASM execution uses sandboxed WASM Shells:
```javascript
const wasmShell = ShellRegistry.register({
  type: ShellRegistry.SHELL_TYPES.WASM_SHELL,
  executionContext: ShellRegistry.EXECUTION_CONTEXTS.SANDBOX,
  backingService: 'wasm-runtime'
});
```
