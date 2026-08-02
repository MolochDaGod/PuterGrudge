/**
 * GrudgeOS Fleet Registry v3 — SSOT for production surfaces + desktop apps
 * Used by desktop.html (launcher, dock, fleet hub).
 */
(function (global) {
  const VERSION = '3.0.0';

  /** Production fleet hosts (never invent alternate domains). */
  const FLEET = {
    self: 'https://puter-monitor-ai.vercel.app',
    render: 'https://puter-monitor-ai.onrender.com',
    grudgeId: 'https://id.grudge-studio.com',
    open: 'https://open.grudge-studio.com',
    forge: 'https://forge.grudge-studio.com',
    warlords: 'https://grudgewarlords.com',
    character: 'https://character.grudge-studio.com',
    aiHub: 'https://ai.grudge-studio.com',
    objectStore: 'https://info.grudge-studio.com',
    ui: 'https://ui.grudge-studio.com',
    puter: 'https://puter.com',
    github: 'https://github.com/MolochDaGod/PuterGrudge',
  };

  /**
   * Desktop apps — production catalog.
   * kind: 'native' = window content in desktop; 'iframe' = url; 'external' = new tab
   * status: 'live' | 'legacy' | 'removed'
   */
  const APPS = {
    // —— Core OS ——
    aivm: {
      id: 'aivm',
      name: 'AI VM',
      iconPath: 'ai-studio',
      color: 'linear-gradient(135deg, #8b5cf6, #00f5ff)',
      width: 1000,
      height: 700,
      content: 'aivm',
      kind: 'native',
      status: 'live',
      category: 'ai',
    },
    aistudio: {
      id: 'aistudio',
      name: 'AI Studio',
      iconPath: 'ai-studio',
      color: 'linear-gradient(135deg, #8b5cf6, #ff00aa)',
      width: 900,
      height: 600,
      content: 'aistudio',
      kind: 'native',
      status: 'live',
      category: 'ai',
    },
    grudchat: {
      id: 'grudchat',
      name: 'GrudChat',
      iconPath: 'grudge-chat',
      color: 'linear-gradient(135deg, #8b5cf6, #00f5ff)',
      width: 900,
      height: 600,
      content: 'grudchat',
      kind: 'native',
      status: 'live',
      category: 'comms',
    },
    agentsquad: {
      id: 'agentsquad',
      name: 'Agent Squad',
      iconPath: 'agent-swarm',
      color: 'linear-gradient(135deg, #ff00aa, #8b5cf6)',
      width: 1000,
      height: 700,
      content: 'agentsquad',
      kind: 'native',
      status: 'live',
      category: 'ai',
    },
    // agentswarm merged into agentsquad — keep alias for old shortcuts
    agentswarm: {
      id: 'agentswarm',
      name: 'Agent Squad',
      iconPath: 'agent-swarm',
      color: 'linear-gradient(135deg, #ff00aa, #8b5cf6)',
      width: 1000,
      height: 700,
      content: 'agentsquad',
      kind: 'native',
      status: 'legacy',
      category: 'ai',
      aliasOf: 'agentsquad',
    },
    observer: {
      id: 'observer',
      name: 'Observer',
      iconPath: 'observer',
      color: 'linear-gradient(135deg, #00ff88, #00f5ff)',
      width: 1200,
      height: 700,
      content: 'observer',
      kind: 'native',
      status: 'live',
      category: 'ops',
    },
    terminal: {
      id: 'terminal',
      name: 'Terminal',
      iconPath: 'terminal',
      color: 'linear-gradient(135deg, #1a1a2e, #00ff88)',
      width: 600,
      height: 400,
      content: 'terminal',
      kind: 'native',
      status: 'live',
      category: 'system',
    },
    settings: {
      id: 'settings',
      name: 'Settings',
      iconPath: 'settings',
      color: 'linear-gradient(135deg, #505070, #8b5cf6)',
      width: 680,
      height: 520,
      content: 'settings',
      kind: 'native',
      status: 'live',
      category: 'system',
    },
    systemmonitor: {
      id: 'systemmonitor',
      name: 'System Monitor',
      iconPath: 'system-monitor',
      color: 'linear-gradient(135deg, #8b5cf6, #00f5ff)',
      width: 750,
      height: 600,
      content: 'systemmonitor',
      kind: 'native',
      status: 'live',
      category: 'ops',
    },
    taskmanager: {
      id: 'taskmanager',
      name: 'Task Manager',
      iconPath: 'task-manager',
      color: 'linear-gradient(135deg, #00ff88, #00f5ff)',
      width: 700,
      height: 550,
      content: 'taskmanager',
      kind: 'native',
      status: 'live',
      category: 'ops',
    },
    networktools: {
      id: 'networktools',
      name: 'Network Tools',
      iconPath: 'network-tools',
      color: 'linear-gradient(135deg, #ff6b35, #00f5ff)',
      width: 800,
      height: 600,
      content: 'networktools',
      kind: 'native',
      status: 'live',
      category: 'ops',
    },
    pods: {
      id: 'pods',
      name: 'Compute Pods',
      iconPath: 'compute-pods',
      color: 'linear-gradient(135deg, #00ff88, #3b82f6)',
      width: 900,
      height: 650,
      content: 'pods',
      kind: 'native',
      status: 'live',
      category: 'compute',
    },
    snapshots: {
      id: 'snapshots',
      name: 'Snapshots',
      iconPath: 'storage',
      color: 'linear-gradient(135deg, #a855f7, #8b5cf6)',
      width: 700,
      height: 550,
      content: 'snapshots',
      kind: 'native',
      status: 'live',
      category: 'compute',
    },
    wasmrunner: {
      id: 'wasmrunner',
      name: 'WASM Runner',
      iconPath: 'wasm-runner',
      color: 'linear-gradient(135deg, #ff6b35, #8b5cf6)',
      width: 800,
      height: 600,
      content: 'wasmrunner',
      kind: 'native',
      status: 'live',
      category: 'dev',
    },
    studio3d: {
      id: 'studio3d',
      name: '3D Studio',
      iconPath: 'creating',
      color: 'linear-gradient(135deg, #ff00aa, #00f5ff)',
      width: 1000,
      height: 700,
      content: 'studio3d',
      kind: 'native',
      status: 'live',
      category: 'create',
    },
    gameeditor: {
      id: 'gameeditor',
      name: 'Game Editor',
      iconPath: 'games-launcher',
      color: 'linear-gradient(135deg, #ff6b35, #00ff88)',
      width: 1100,
      height: 700,
      content: 'gameeditor',
      kind: 'native',
      status: 'live',
      category: 'create',
    },
    grudgecloud: {
      id: 'grudgecloud',
      name: 'GrudgeCloud',
      iconPath: 'deploy',
      color: 'linear-gradient(135deg, #00f5ff, #3b82f6)',
      width: 700,
      height: 500,
      content: 'grudgecloud',
      kind: 'native',
      status: 'live',
      category: 'cloud',
    },
    agentmanager: {
      id: 'agentmanager',
      name: 'Agent Manager',
      iconPath: 'agent-manager',
      color: 'linear-gradient(135deg, #00f5ff, #8b5cf6)',
      width: 720,
      height: 600,
      content: 'agentmanager',
      kind: 'native',
      status: 'live',
      category: 'ai',
    },
    aisystem: {
      id: 'aisystem',
      name: 'AI System',
      iconPath: 'system-overview',
      color: 'linear-gradient(135deg, #00ff88, #00f5ff)',
      width: 550,
      height: 500,
      content: 'aisystem',
      kind: 'native',
      status: 'live',
      category: 'ai',
    },
    audiopackages: {
      id: 'audiopackages',
      name: 'Audio Packages',
      iconPath: 'audio-packages',
      color: 'linear-gradient(135deg, #ff00aa, #ff6b35)',
      width: 500,
      height: 450,
      content: 'audiopackages',
      kind: 'native',
      status: 'live',
      category: 'create',
    },
    fleethub: {
      id: 'fleethub',
      name: 'Fleet Hub',
      iconPath: 'cloud',
      color: 'linear-gradient(135deg, #3b82f6, #00f5ff)',
      width: 720,
      height: 560,
      content: 'fleethub',
      kind: 'native',
      status: 'live',
      category: 'fleet',
    },
    // —— External fleet (best production hosts) ——
    warlords: {
      id: 'warlords',
      name: 'Warlords',
      iconPath: 'games-launcher',
      color: 'linear-gradient(135deg, #b8860b, #ff6b35)',
      width: 400,
      height: 200,
      kind: 'external',
      url: FLEET.warlords,
      status: 'live',
      category: 'fleet',
    },
    openlauncher: {
      id: 'openlauncher',
      name: 'Open',
      iconPath: 'deploy',
      color: 'linear-gradient(135deg, #00ff88, #3b82f6)',
      width: 400,
      height: 200,
      kind: 'external',
      url: FLEET.open,
      status: 'live',
      category: 'fleet',
    },
    forge: {
      id: 'forge',
      name: 'Forge',
      iconPath: 'creating',
      color: 'linear-gradient(135deg, #8b5cf6, #ff00aa)',
      width: 400,
      height: 200,
      kind: 'external',
      url: FLEET.forge,
      status: 'live',
      category: 'fleet',
    },
    grudgeid: {
      id: 'grudgeid',
      name: 'Grudge ID',
      iconPath: 'settings',
      color: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
      width: 400,
      height: 200,
      kind: 'external',
      url: FLEET.grudgeId,
      status: 'live',
      category: 'fleet',
    },
    aihub: {
      id: 'aihub',
      name: 'AI Hub',
      iconPath: 'ai-brain',
      color: 'linear-gradient(135deg, #00f5ff, #8b5cf6)',
      width: 400,
      height: 200,
      kind: 'external',
      url: FLEET.aiHub,
      status: 'live',
      category: 'fleet',
    },
  };

  /** Desktop icons shown by default (no dead/debug/duplicate swarm). */
  const DESKTOP_ICONS = [
    'aivm',
    'grudchat',
    'agentsquad',
    'fleethub',
    'pods',
    'snapshots',
    'studio3d',
    'wasmrunner',
    'grudgecloud',
    'aistudio',
    'observer',
    'gameeditor',
    'networktools',
    'warlords',
    'openlauncher',
    'forge',
  ];

  /** Apps removed from catalog (do not spawn icons). */
  const PURGED = [
    'debug-static',
    'zerotier', // no production VPN backend on this host
  ];

  function getLiveApps() {
    const out = {};
    for (const [id, app] of Object.entries(APPS)) {
      if (app.status === 'removed') continue;
      if (PURGED.includes(id)) continue;
      out[id] = app;
    }
    return out;
  }

  function openFleetApp(appId) {
    const app = APPS[appId];
    if (!app) return { ok: false, error: 'unknown_app' };
    if (app.aliasOf) return openFleetApp(app.aliasOf);
    if (app.kind === 'external' && app.url) {
      window.open(app.url, '_blank', 'noopener,noreferrer');
      return { ok: true, external: true, url: app.url };
    }
    return { ok: true, external: false, app };
  }

  function fleetHubHtml() {
    const cards = Object.values(APPS)
      .filter((a) => a.category === 'fleet' && a.status === 'live')
      .map(
        (a) => `
      <button type="button" class="fleet-card" data-fleet-app="${a.id}" style="
        text-align:left;cursor:pointer;border:1px solid rgba(0,245,255,0.25);
        background:rgba(26,26,46,0.9);border-radius:12px;padding:14px 16px;color:#e8e8ff;
        display:flex;flex-direction:column;gap:6px;min-width:140px;flex:1;
      ">
        <span style="font-weight:700;font-size:15px;">${a.name}</span>
        <span style="font-size:12px;opacity:0.7;">${a.kind === 'external' ? a.url : 'In-OS'}</span>
      </button>`,
      )
      .join('');

    return `
      <div style="padding:20px;font-family:system-ui,sans-serif;color:#e8e8ff;height:100%;overflow:auto;
        background:radial-gradient(ellipse at top,rgba(59,130,246,0.15),transparent 60%),#0a0a12;">
        <div style="margin-bottom:16px;">
          <h2 style="margin:0 0 6px;font-size:22px;letter-spacing:0.02em;">Fleet Hub</h2>
          <p style="margin:0;opacity:0.7;font-size:13px;">GrudgeOS v${VERSION} · production surfaces</p>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:20px;">${cards}</div>
        <div style="font-size:12px;opacity:0.65;line-height:1.6;">
          <div><strong>API</strong> → Render Express (secrets / OpenAI / Qdrant / Puter AI)</div>
          <div><strong>Edge</strong> → ${FLEET.self}</div>
          <div><strong>Origin</strong> → ${FLEET.render}</div>
        </div>
      </div>`;
  }

  /** Patch desktop globals after apps object exists. */
  function install() {
    global.GrudgeFleetRegistry = {
      VERSION,
      FLEET,
      APPS,
      DESKTOP_ICONS,
      PURGED,
      getLiveApps,
      openFleetApp,
      fleetHubHtml,
    };

    // If desktop already defined `apps`, merge live catalog
    if (global.apps && typeof global.apps === 'object') {
      const live = getLiveApps();
      for (const [id, app] of Object.entries(live)) {
        global.apps[id] = { ...global.apps[id], ...app };
      }
      for (const id of PURGED) {
        delete global.apps[id];
      }
    }

    console.info(`[GrudgeFleetRegistry] v${VERSION} ready · ${Object.keys(getLiveApps()).length} apps`);
  }

  install();
})(typeof window !== 'undefined' ? window : globalThis);
