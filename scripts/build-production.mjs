/**
 * Production static build for puter-monitor-ai edge (Vercel).
 * Ships GrudgeOS from public/ + root index → desktop; API stays on Render via rewrites.
 */
import {
  cpSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist', 'edge');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// Full public tree (GrudgeOS + assets) — skip heavy offline packs on edge
function copyPublic(src, dest) {
  const skip = new Set(['maps', 'gapps']);
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const from = join(src, entry);
    const to = join(dest, entry);
    const st = statSync(from);
    if (st.isDirectory()) {
      if (skip.has(entry)) {
        console.log('[build-production] skip heavy', entry);
        continue;
      }
      copyPublic(from, to);
    } else {
      cpSync(from, to);
    }
  }
}
copyPublic(join(root, 'public'), out);

// Production root = GrudgeOS Desktop (with base href so relative libs resolve)
const desktopPath = join(root, 'public', 'grudgeos', 'desktop.html');
let desktop = readFileSync(desktopPath, 'utf8');

// Ensure absolute base for assets when served at /
if (!desktop.includes('<base ')) {
  desktop = desktop.replace(
    /<head>/i,
    `<head>\n  <base href="/grudgeos/">\n  <meta name="grudgeos-version" content="3.1.0" />\n  <meta name="application-name" content="Puter Monitor AI" />\n  <link rel="manifest" href="/grudgeos/manifest.json" />`,
  );
} else {
  desktop = desktop.replace(
    /content="3\.0\.0"/,
    'content="3.1.0"',
  );
}

// Strip leftover debug overlays if any remain in source
desktop = desktop
  .replace(/<!-- Static debug[\s\S]*?<\/div>\s*/i, '')
  .replace(/<div id="static-debug"[\s\S]*?<\/div>\s*/i, '')
  .replace(/let indicator = document\.getElementById\('icon-count-indicator'\)[\s\S]*?indicator\.textContent = 'Icons: ' \+ iconCount;\s*/g, '')
  .replace(/if \(ind\) ind\.textContent = 'Icons: ' \+ currentCount \+ ' \(verified\)';\s*/g, '');

// Inject fleet registry before first lib script if missing
if (!desktop.includes('fleet-registry.js')) {
  desktop = desktop.replace(
    '<script src="lib/icon-generator.js"></script>',
    `<script src="lib/fleet-registry.js"></script>\n  <script src="lib/icon-generator.js"></script>`,
  );
}

// Prefer DESKTOP_ICONS from fleet registry when present
desktop = desktop.replace(
  /const desktopApps = \[[^\]]*\];/,
  `const desktopApps = (window.GrudgeFleetRegistry && window.GrudgeFleetRegistry.DESKTOP_ICONS)
        ? window.GrudgeFleetRegistry.DESKTOP_ICONS.slice()
        : ['aivm', 'grudchat', 'agentsquad', 'fleethub', 'pods', 'snapshots', 'studio3d', 'wasmrunner', 'grudgecloud', 'aistudio', 'observer', 'gameeditor', 'networktools', 'warlords', 'openlauncher', 'forge'];`,
);

// openApp: handle external fleet apps
if (!desktop.includes('GrudgeFleetRegistry.openFleetApp')) {
  desktop = desktop.replace(
    /function openApp\(appId\) \{\s*const app = apps\[appId\];\s*if \(!app\) return;/,
    `function openApp(appId) {
      if (window.GrudgeFleetRegistry) {
        const reg = window.GrudgeFleetRegistry.APPS[appId];
        if (reg && reg.aliasOf) appId = reg.aliasOf;
        if (reg && reg.kind === 'external' && reg.url) {
          window.GrudgeFleetRegistry.openFleetApp(appId);
          return;
        }
      }
      const app = apps[appId];
      if (!app) return;`,
  );
}

// getAppContent fleethub
if (desktop.includes('function getAppContent') && !desktop.includes("case 'fleethub'")) {
  // inject near start of getAppContent switch if exists
  desktop = desktop.replace(
    /(function getAppContent\([^)]*\)\s*\{)/,
    `$1
      if (contentType === 'fleethub' && window.GrudgeFleetRegistry) {
        const html = window.GrudgeFleetRegistry.fleetHubHtml();
        setTimeout(() => {
          document.querySelectorAll('[data-fleet-app]').forEach(btn => {
            btn.addEventListener('click', () => openApp(btn.getAttribute('data-fleet-app')));
          });
        }, 0);
        return html;
      }
`,
  );
}

// Hide debug icon permanently
desktop = desktop.replace(
  'data-app="debug-static"',
  'data-app="debug-static" data-purged="true"',
);

writeFileSync(join(out, 'grudgeos', 'desktop.html'), desktop);
// Root entry
writeFileSync(join(out, 'index.html'), desktop);

// Root PWA / app meta
const manifest = {
  name: 'Puter Monitor AI — GrudgeOS',
  short_name: 'GrudgeOS',
  description: 'Grudge Studio collaborative WebOS: AI, fleet games, cloud deploy, Puter user-pays.',
  theme_color: '#0a0a12',
  background_color: '#0a0a12',
  display: 'standalone',
  orientation: 'any',
  start_url: '/',
  scope: '/',
  id: 'puter-monitor-ai',
  icons: [
    { src: '/grudgeos/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
    { src: '/grudgeos/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
    { src: '/grudgeos/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  categories: ['games', 'developer tools', 'productivity'],
  shortcuts: [
    { name: 'Warlords', url: 'https://grudgewarlords.com', description: 'Play Warlords' },
    { name: 'Forge', url: 'https://forge.grudge-studio.com', description: 'Map / scene editor' },
    { name: 'Open', url: 'https://open.grudge-studio.com', description: 'Open launcher' },
  ],
};
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
writeFileSync(join(out, 'grudgeos', 'manifest.json'), JSON.stringify(manifest, null, 2));

// Puter App package (static shell for puter.com/app)
const puterAppDir = join(out, 'puter-app-dist');
mkdirSync(puterAppDir, { recursive: true });
const puterShell = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Puter Monitor AI</title>
  <script src="https://js.puter.com/v2/"></script>
  <style>
    html,body{margin:0;height:100%;background:#0a0a12;color:#e8e8ff;font-family:system-ui,sans-serif}
    iframe{border:0;width:100%;height:100%}
    .bar{position:fixed;top:0;left:0;right:0;height:36px;display:flex;align-items:center;gap:12px;
      padding:0 12px;background:rgba(10,10,18,0.92);border-bottom:1px solid rgba(0,245,255,0.2);z-index:10;font-size:13px}
    .bar a{color:#00f5ff;text-decoration:none}
    iframe{margin-top:36px;height:calc(100% - 36px)}
  </style>
</head>
<body>
  <div class="bar">
    <strong>Puter Monitor AI</strong>
    <span style="opacity:.6">GrudgeOS v3</span>
    <a href="https://puter-monitor-ai.vercel.app/" target="_blank" rel="noopener">Open full screen</a>
    <a href="https://id.grudge-studio.com" target="_blank" rel="noopener">Grudge ID</a>
  </div>
  <iframe src="https://puter-monitor-ai.vercel.app/" title="GrudgeOS Desktop" allow="clipboard-read; clipboard-write"></iframe>
</body>
</html>`;
writeFileSync(join(puterAppDir, 'index.html'), puterShell);

// Fleet health (static JSON — no Render). Browser Puter AI is user-pays.
const health = {
  status: 'healthy',
  service: 'puter-monitor-ai',
  version: '3.2.0',
  os: 'GrudgeOS',
  mode: 'vercel-shell+railway-api',
  builtAt: new Date().toISOString(),
  stack: {
    shell: 'vercel',
    appApi: 'https://puter-monitor-api-production.up.railway.app',
    auth: 'https://id.grudge-studio.com',
    gameApi: 'https://grudge-api-production-0d46.up.railway.app',
    aiHub: 'https://ai.grudge-studio.com',
    puter: 'user-pays (js.puter.com)',
    assets: 'https://assets.grudge-studio.com',
    objectStore: 'https://objectstore.grudge-studio.com',
  },
  services: {
    puterAI: true,
    grudgeId: true,
    appRailway: true,
    fleetRailway: true,
    aiHub: true,
  },
  fleet: {
    warlords: 'https://grudgewarlords.com',
    open: 'https://open.grudge-studio.com',
    forge: 'https://forge.grudge-studio.com',
    character: 'https://character.grudge-studio.com',
  },
};
mkdirSync(join(out, 'api'), { recursive: true });
writeFileSync(join(out, 'api', 'health.json'), JSON.stringify(health, null, 2));
writeFileSync(join(out, 'edge-version.json'), JSON.stringify(health, null, 2));

console.log('[build-production] wrote', out);
console.log('[build-production] puter shell →', puterAppDir);
