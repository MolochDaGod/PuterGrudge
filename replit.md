# CloudPilot AI Studio - Autonomous Cloud Agent & Development Environment

## Overview
CloudPilot AI Studio is an autonomous AI cloud management agent and development studio designed to simplify cloud operations, enhance developer productivity, and enable seamless deployment of web applications and services. It provides a comprehensive environment for cloud resource management, application development, and AI-driven automation. Key capabilities include AI-assisted coding, multi-terminal access, file conversion tools, live server deployments, game hosting, and an extensible agent system with AI learning.

The project aims to be a unified, intelligent platform for cloud development and management, leveraging AI to automate complex tasks and adapt to user needs, targeting developers and cloud administrators for efficient and intelligent cloud workflows.

## User Preferences
I want iterative development.
I want to be asked before making major changes.
I prefer detailed explanations for complex steps.
I prefer functional programming paradigms where applicable.
I prefer concise and clear communication.
I want the agent to prioritize using Puter.js SDK features.
I want the agent to learn my coding style and preferences over time.
I want to ensure all data is persisted using Puter KV, never local storage.
I want to ensure terminal commands are sandboxed for security.
I want all secrets to be managed via environment variables.

## System Architecture

### UI/UX Decisions
The frontend uses pure HTML/CSS/JavaScript with a modular design, featuring a dashboard, a Code Studio with file tree and syntax-highlighting editor, a multi-tabbed terminal system, and a Discord-style chat application ("Grudge App"). It includes an app grid, favorites, activity feed, and keyboard shortcuts for navigation.

### Technical Implementations
The architecture is client-server, with a pure HTML/CSS/JavaScript frontend and an Express.js/TypeScript backend. All API endpoints are versioned (`/api/v1/*`) and use a standardized response envelope. Zod schemas ensure robust runtime validation, and centralized middleware handles error management.

### Feature Specifications
- **AI Studio**: Offers AI-powered code assistance, multi-terminal access (bash, Node.js, Python), and an AI Memory for learning user preferences.
- **Grudge App**: A real-time messaging system with server/channel architecture, Puter KV persistence, AI chat integration, and attachments.
- **Launcher Dashboard**: Visual grid for deployed apps, favorites, activity feed, and quick launch.
- **Autonomous Improvement Engine**: Analyzes user behavior to suggest optimizations and improvements.
- **Cloud Management**: AI agent for complex task execution, multi-provider AI support, Puter filesystem storage, static app deployment, serverless functions, and workflow automation.
- **Live Deployments**: One-click static website deployment to `*.puter.site` and hosting of multiplayer game servers from templates.
- **Agent Extensions**: Extensible system with built-in extensions for AI, deployment, storage, and automation.
- **File Conversion Tools**: 3D model (GLTF/GLB) and image (WebP, PNG, JPEG, AVIF) optimization and conversion.
- **Canvas Studio**: Fixed-size canvas with zoom/pan, drag-drop nodes, gizmo controls, layer management, undo/redo, JSON import/export, and AI versioning.
- **Agent Operations Hub**: Autonomous AI agent management with micro terminals, Code Ninja shells, compute pods for isolated task execution, and resource accounting.

### System Design Choices
- **API Architecture**: Versioned RESTful API with consistent response structure and error handling.
- **Data Persistence**: All persistent data is stored using Puter KV (Key-Value) storage.
- **Agent Constitution**: Agents adhere to strict laws: User Command Supremacy, Puter First, No Mock Data, Autonomous Execution, and Learn and Remember.
- **Modularity**: Codebase organized into `public/` (frontend), `server/` (backend), `shared/` (schemas), and `docs/` directories.
- **Compute Pods**: Micro-container execution for sandboxed task processing with job queuing and Puter KV persistence.
- **Snapshot System**: State persistence and restoration for agents, squads, and workspaces using Puter KV.
- **WebAssembly Runtime**: High-performance sandboxed execution for Wasm modules with WASI support.
- **WebGL Visualization**: 3D visualization for agents, pods, and network topology.
- **Game Controller System**: Unified cross-platform input handling (keyboard/mouse, gamepad, touch), orbital camera, and state machine character control.
- **Agent Types**: Core agents (Orchestrator, Code Agent, Art Agent, Analyst) and specialist agents (Lua, Rust, Three.js, Phaser, Colyseus, Network).

## External Dependencies

### Core Libraries
- **Puter.js**: Provides free AI API (GPT-4o, Claude, Gemini, DeepSeek), cloud filesystem (`puter.fs`), key-value storage (`puter.kv`), hosting (`puter.hosting`), and user authentication (`puter.auth`).
- **Express.js**: Backend web framework.
- **TypeScript**: Used for type-safe backend development.
- **Zod**: Used for runtime schema validation.

### Code Execution & Sandboxing
- **@tootallnate/quickjs-emscripten**: QuickJS JavaScript engine compiled to WebAssembly for secure sandboxed JS execution. This is the ONLY code execution method - all user code runs in this isolated WASM environment with no access to Node.js globals or filesystem.

### Terminal & Screen Management
- **@pm2/blessed**: Virtual terminal UI rendering for PM2 Blessed screens.
- **puppeteer-screen-recorder**: Screen recording sessions for compute pod visualization.

### Accessibility & System Integration
- **@guidepup/virtual-screen-reader**: Screen reader for accessibility testing.
- **os-browserify**: Node's os module for browsers.
- **bare-os**: Minimal OS interface for system operations.

### Processing Libraries
- **Sharp**: Node.js library for high-performance image processing.
- **@gltf-transform/core** and **@gltf-transform/functions**: Libraries for 3D model processing.

### API Integrations
- **OpenAI API**: Supported for enhanced AI capabilities (via `ALE_AI` secret key).
- **CryptoPanic API**: For cryptocurrency news feeds (via `CRYPTOPANIC_API` secret).
- **Generative Art API**: For AI image generation (via `GENERATIVE_ART_API` secret).
- **GBUX Token Integration**: For GBUX token status (via `GBUX_TOKEN` secret).
- **Discord OAuth**: For Discord integration (via `DISCORD_CLIENT_SECRET` secret).

## Asset System
- **Custom Agent Avatars**: Located in `public/grudgeos/assets/agents/` with 5 color variants (purple, green, blue, orange, red)
- **Favicon**: Custom CloudPilot favicon at `public/favicon.png` and `public/grudgeos/assets/favicon.png`
- **Server-Side Icon Generator**: Sharp-based PNG icon generation via `server/utils/generate-icons.ts`
  - Generates 58 compressed 32x32 PNG icons (0.3-0.75KB each) with real SVG path graphics
  - Icons use actual graphical symbols (robot/brain for AI, gear for settings, volume waves for audio, network symbols, etc.)
  - NO text letters allowed - all icons are real graphical symbols rendered from SVG paths
  - Icons stored in `public/grudgeos/assets/icons/generated/`
  - Run with `npx tsx server/utils/generate-icons.ts` to regenerate
- **No Emojis/CSS Badges/Text Letters**: User strictly requires real graphical icons only
- **Icon Implementation**: Apps use `iconPath` property pointing to `/grudgeos/assets/icons/generated/*.png`
  - Helper function `makeIconImg(iconName, size)` generates `<img>` tags for icons
  - All desktop.html elements updated to use `<img>` tags instead of CSS badges

## Desktop Grid System
- **Grid Snap**: 20px grid for window positioning, 100x110px cells for desktop icons
- **Drag-Drop**: Icons and windows snap to grid on drop with viewport clamping
- **Resize Snap**: Window sizes snap to 20px increments on resize end
- **GRID constants** defined in desktop.html for consistent positioning

## Puter Integration Architecture
- **PuterService**: Unified wrapper (`public/grudgeos/lib/puter-service.js`) for all Puter.js SDK capabilities:
  - AI: Multi-model chat (GPT-4o, Claude, Gemini, DeepSeek) - FREE with no API keys
  - KV: Key-Value storage with localStorage fallback for offline mode
  - FS: Cloud filesystem for files and assets
  - Auth: User authentication (signIn/signOut)
  - Hosting: One-click deployment to *.puter.site
- **AgentAIService**: Routes all agent AI operations through PuterService with specialized prompts for 7 agent types
- **DeployService**: One-click deployment with templates (hello, landing, dashboard)
- **GrudChatService**: Persistent messaging via Puter KV with offline fallback
- **React Hooks**: usePuter, usePuterAI, usePuterStorage, useDeploy for React component integration
- **UI Integration**: Launcher footer shows user status (Online/Guest/Offline) with login/logout buttons
- **Documentation**: Full setup guide at `docs/puter-authentication.md`

## Recent Changes
- **2026-01-17**: Fixed NetworkTools UI rendering issue - tool cards now display correctly in Available Tools tab using pre-rendered HTML and event delegation pattern for reliable tab switching and button handling
- **2026-01-13**: Created unified PuterService wrapper (`public/grudgeos/lib/puter-service.js`) integrating all Puter.js SDK capabilities: AI (free GPT-4o, Claude, Gemini, DeepSeek), KV storage, filesystem, auth, and hosting
- **2026-01-13**: Created AgentAIService routing all AI operations through free Puter AI API with specialized system prompts for 7 agent types
- **2026-01-13**: Created DeployService for one-click deployment to *.puter.site with templates (hello, landing, dashboard)
- **2026-01-13**: Added React hooks: usePuter (AI, KV, auth), usePuterAI (code analysis/generation), usePuterStorage (persistent state), useDeploy (deployments)
- **2026-01-13**: Updated GrudChatService to use unified PuterService with proper localStorage fallback for offline mode
- **2026-01-13**: Created unified Shell & Console architecture with ShellRegistry, ConsoleStream, and OperationsRegistry
- **2026-01-13**: Added ShellTerminal component using new architecture with proper shell ID tracking and I/O streams
- **2026-01-13**: Created SHELL_CONSOLE_ARCHITECTURE.md documentation for shells, consoles, inputs, operations
- **2026-01-13**: Added useShell and useOperation React hooks for shell/console integration
- **2026-01-13**: Added WASM Runner desktop app with 12 working WebAssembly examples (add, multiply, fibonacci, factorial, is_prime, gcd, max, min, abs, power, clamp, subtract) - all using base64-encoded WASM modules
- **2026-01-13**: Created WASM Examples library at `/grudgeos/lib/runtime/wasm-examples.js` with categories: math, algorithms, utility
- **2026-01-13**: Fixed onboarding to persist completion status in localStorage so users only see it once
- **2026-01-13**: Created comprehensive SYSTEMS_DOCUMENTATION.md covering all 8 major systems with API examples and testing checklists
- **2026-01-13**: Enhanced Game Editor Pro with professional Unity/Unreal-style layout: scene hierarchy, inspector, asset browser, viewport tabs, input configuration, camera system modes (FPS, third-person, RTS, cinematic, orbital), action mapping, controller dead zones, and script templates
- **2026-01-13**: Added ZeroTier VPN Manager app with network connection, creation, game server hosting, and peer management
- **2026-01-13**: Made Terminal app fully functional with command input, history navigation, and built-in commands
- **2026-01-13**: Fixed XSS vulnerability in terminal prompt rendering using textContent instead of innerHTML
- **2026-01-13**: Added PuterAuthService and PuterDeployService for Puter authentication and deployment
- **2026-01-13**: Added login/logout UI to launcher footer with dynamic auth state display
- **2026-01-13**: Added comprehensive Puter availability checks throughout agent-sync.js and grudge-cloud.js
- **2026-01-13**: GrudgeCloud initialization now retries 3 times and gracefully falls back to offline mode
- **2026-01-13**: All puter.kv operations protected with hasPuterKV() helper method checks
- **2026-01-12**: Replaced 2-letter text icons with REAL graphical SVG path icons (robot, gear, volume, network symbols)
- **2026-01-12**: Fixed Welcome to GrudgeOS notification close button
- **2026-01-12**: Added grid snap system for accurate drag-drop and window sizing (20px grid, 100x110 icon cells)
- **2026-01-12**: Icons are 0.3-0.75KB each with gradient fills and real graphical symbols
- **2026-01-12**: Secured sandboxed code execution - only JavaScript allowed via QuickJS WASM (no Python/browser eval for security)
- **2026-01-12**: Browser VMSandbox now delegates all execution to secure server-side QuickJS
- **2026-01-12**: Created accessibility service with screen reader announcements and keyboard navigation
- **2026-01-12**: Added Zod validation schemas for terminal UI and screen recorder services
- **2026-01-12**: Integrated @pm2/blessed for terminal UI and puppeteer-screen-recorder for screen recording

## Known Issues
- **Puter SDK JSON Errors**: The Puter.js SDK may log "Unexpected token '<'" errors when its services are unreachable. This is internal SDK behavior and does not affect application functionality. The app gracefully handles this with offline mode fallbacks.