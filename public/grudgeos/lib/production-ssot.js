/**
 * GrudgeOS Production SSOT — base models + systems usage
 * Single source for puter-monitor-ai (Vercel shell + Railway API + fleet).
 *
 * Paths:
 *  - User-pays AI  → Puter.js (js.puter.com) — no keys on our servers
 *  - Fleet AI      → ai.grudge-studio.com (via same-origin /api/fleet/ai/* when paid/hub)
 *  - Users/auth DB → Railway puter-monitor-api
 *  - Characters    → Railway grudge-api-production-0d46
 *  - Identity      → id.grudge-studio.com
 */
(function (global) {
  const VERSION = '1.0.0';

  /** Production hosts — do not invent alternates */
  const SYSTEMS = {
    shell: {
      id: 'vercel',
      url: 'https://puter-monitor-ai.vercel.app',
      role: 'GrudgeOS UI / static apps',
    },
    appApi: {
      id: 'railway-puter-monitor',
      url: 'https://puter-monitor-api-production.up.railway.app',
      role: 'This app users, sessions, agent APIs',
      health: '/api/healthz',
    },
    grudgeId: {
      id: 'grudge-id',
      url: 'https://id.grudge-studio.com',
      role: 'Fleet identity / login',
    },
    gameApi: {
      id: 'railway-grudge-api',
      url: 'https://grudge-api-production-0d46.up.railway.app',
      role: 'Characters, account, bag, wallet SSOT',
    },
    aiHub: {
      id: 'ai-hub',
      url: 'https://ai.grudge-studio.com',
      role: 'Fleet LLM gateway (API key / JWT)',
    },
    puter: {
      id: 'puter-user-pays',
      url: 'https://js.puter.com/v2/',
      role: 'Browser AI / KV / FS — user pays',
    },
    assets: {
      id: 'cdn',
      url: 'https://assets.grudge-studio.com',
      role: 'Binary assets CDN',
    },
    objectStore: {
      id: 'objectstore',
      url: 'https://objectstore.grudge-studio.com',
      role: 'JSON catalogs / search',
    },
    open: { url: 'https://open.grudge-studio.com', role: 'Open launcher' },
    forge: { url: 'https://forge.grudge-studio.com', role: 'Map / scene editor' },
    warlords: { url: 'https://grudgewarlords.com', role: 'Warlords play' },
    character: { url: 'https://character.grudge-studio.com', role: 'Foundry create' },
  };

  /**
   * Base models for production (Puter-compatible IDs).
   * Prefer stable, widely available Puter free-tier routes.
   */
  const MODELS = {
    // Primary workhorses
    default: 'gpt-4o-mini',
    chat: 'gpt-4o-mini',
    code: 'claude-sonnet-4',
    code_fast: 'deepseek-coder',
    creative: 'gpt-4o',
    vision: 'gpt-4o',
    analysis: 'gemini-2.0-flash',
    reasoning: 'o1-mini',
    long_context: 'gemini-2.0-flash',
    quick: 'gpt-4o-mini',
    multilingual: 'mistral-large',

    // Agent defaults (Treaty)
    agent_orchestrator: 'gpt-4o-mini',
    agent_code: 'claude-sonnet-4',
    agent_creator: 'gpt-4o',
    agent_editor: 'gpt-4o-mini',

    // Legacy aliases → preferred
    aliases: {
      'claude-3-5-sonnet': 'claude-sonnet-4',
      'claude-3.5-sonnet': 'claude-sonnet-4',
      'gpt-4-turbo': 'gpt-4o',
      'gemini-1.5-flash': 'gemini-2.0-flash',
      'gemini-1.5-pro': 'gemini-2.0-flash',
    },
  };

  /** Task → model (used by PuterAIService.selectModel) */
  const TASK_MODELS = {
    code: MODELS.code,
    code_review: MODELS.code,
    quick_chat: MODELS.quick,
    chat: MODELS.chat,
    creative: MODELS.creative,
    analysis: MODELS.analysis,
    vision: MODELS.vision,
    reasoning: MODELS.reasoning,
    math: MODELS.reasoning,
    long_document: MODELS.long_context,
    multilingual: MODELS.multilingual,
    fast: MODELS.quick,
    chinese: 'deepseek-chat',
    treaty: MODELS.agent_orchestrator,
    agent_code: MODELS.agent_code,
    agent_creator: MODELS.agent_creator,
    agent_editor: MODELS.agent_editor,
  };

  /** Catalog entry for UI pickers */
  const MODEL_CATALOG = {
    'gpt-4o-mini': {
      provider: 'openai',
      label: 'GPT-4o mini',
      role: 'Default chat / Treaty hub (fast, free-tier friendly)',
      maxTokens: 4096,
      production: true,
    },
    'claude-sonnet-4': {
      provider: 'anthropic',
      label: 'Claude Sonnet 4',
      role: 'Code, agents, hard reasoning',
      maxTokens: 8192,
      production: true,
    },
    'gpt-4o': {
      provider: 'openai',
      label: 'GPT-4o',
      role: 'Vision + creative',
      maxTokens: 4096,
      production: true,
    },
    'gemini-2.0-flash': {
      provider: 'google',
      label: 'Gemini 2.0 Flash',
      role: 'Long context / analysis',
      maxTokens: 8192,
      production: true,
    },
    'deepseek-coder': {
      provider: 'deepseek',
      label: 'DeepSeek Coder',
      role: 'Fast code fallback',
      maxTokens: 4096,
      production: true,
    },
    'o1-mini': {
      provider: 'openai',
      label: 'o1-mini',
      role: 'Math / deep reasoning (when available)',
      maxTokens: 16384,
      production: true,
    },
    'mistral-large': {
      provider: 'mistral',
      label: 'Mistral Large',
      role: 'Multilingual',
      maxTokens: 4096,
      production: true,
    },
  };

  /**
   * How each subsystem should use AI + backends in production
   */
  const USAGE = {
    treaty: {
      primary: 'puter',
      model: MODELS.agent_orchestrator,
      agents: {
        orchestrator: MODELS.agent_orchestrator,
        code: MODELS.agent_code,
        creator: MODELS.agent_creator,
        editor: MODELS.agent_editor,
      },
      fallback: 'offline-stub',
      note: 'User-pays Puter first; no server keys required',
    },
    aivm: {
      primary: 'puter',
      model: MODELS.code,
      note: 'Code Editor / AI console use code model',
    },
    aistudio: {
      primary: 'puter',
      model: MODELS.code,
      creative: MODELS.creative,
    },
    companion: {
      primary: 'puter',
      model: MODELS.chat,
      fleetFallback: SYSTEMS.aiHub.url + '/v1/chat',
    },
    observer: {
      primary: 'puter',
      model: MODELS.analysis,
    },
    wasm: {
      primary: 'local-wasm',
      kit: 'WasmOsKit',
      note: 'No LLM — OS math/algo modules only',
    },
    studio3d: {
      primary: 'three-js',
      note: 'Client Three.js viewer; assets from CDN/user GLB',
    },
    auth: {
      primary: SYSTEMS.grudgeId.url,
      appUsers: SYSTEMS.appApi.url,
    },
    characters: {
      primary: SYSTEMS.gameApi.url,
      via: '/api/fleet/characters/*',
    },
  };

  function resolveModel(idOrTask) {
    if (!idOrTask) return MODELS.default;
    if (TASK_MODELS[idOrTask]) return TASK_MODELS[idOrTask];
    if (MODELS.aliases[idOrTask]) return MODELS.aliases[idOrTask];
    if (MODEL_CATALOG[idOrTask]) return idOrTask;
    return MODELS.default;
  }

  function productionModelsMap() {
    const map = {};
    for (const [id, meta] of Object.entries(MODEL_CATALOG)) {
      map[id] = {
        provider: meta.provider,
        capabilities: meta.role.split(/[+,]/).map((s) => s.trim().toLowerCase()),
        maxTokens: meta.maxTokens,
        label: meta.label,
        production: true,
      };
    }
    return map;
  }

  const api = {
    VERSION,
    SYSTEMS,
    MODELS,
    TASK_MODELS,
    MODEL_CATALOG,
    USAGE,
    resolveModel,
    productionModelsMap,
    defaultModel: MODELS.default,
  };

  global.GrudgeProductionSSOT = api;
  // Also mirror into fleet registry if present
  if (global.GrudgeFleetRegistry) {
    global.GrudgeFleetRegistry.PRODUCTION = api;
    global.GrudgeFleetRegistry.FLEET = {
      ...global.GrudgeFleetRegistry.FLEET,
      self: SYSTEMS.shell.url,
      appApi: SYSTEMS.appApi.url,
      grudgeId: SYSTEMS.grudgeId.url,
      railwayApi: SYSTEMS.gameApi.url,
      aiHub: SYSTEMS.aiHub.url,
      assets: SYSTEMS.assets.url,
      objectStore: SYSTEMS.objectStore.url,
      open: SYSTEMS.open.url,
      forge: SYSTEMS.forge.url,
      warlords: SYSTEMS.warlords.url,
      character: SYSTEMS.character.url,
    };
  }

  console.info(
    `[GrudgeProductionSSOT] v${VERSION} models default=${MODELS.default} code=${MODELS.code}`,
  );
})(typeof window !== 'undefined' ? window : globalThis);
