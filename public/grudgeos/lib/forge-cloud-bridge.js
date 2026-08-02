/**
 * Forge ↔ GrudgeOS cloud bridge (puter-monitor-ai.vercel.app)
 *
 * SSOT for how forge.grudge-studio.com projects live on Puter cloud and
 * how this OS lists / opens them.
 *
 * Puter layout (must match Forge puterDataProvider / projectStorage):
 *   KV index:  grudge:forge:projects:index   → ProjectRecord[]
 *   KV nextId: grudge:forge:nextId
 *   FS scenes: Grudge/forge/scenes/<id>.json
 *   FS scripts/assets/prefabs similarly under Grudge/forge/<collection>/
 *
 * Fleet binaries stay on assets.grudge-studio.com (R2) — not in Puter FS.
 * Player bag / wallet stay on Railway — not Forge projects.
 */
(function (global) {
  const VERSION = '1.0.0';

  const FLEET = {
    os: 'https://puter-monitor-ai.vercel.app',
    forge: 'https://forge.grudge-studio.com',
    forgeEditor: 'https://forge.grudge-studio.com/editor',
    assets: 'https://assets.grudge-studio.com',
    objectStore: 'https://objectstore.grudge-studio.com',
    grudgeId: 'https://id.grudge-studio.com',
    aiHub: 'https://ai.grudge-studio.com',
    railwayApi: 'https://grudge-api-production-0d46.up.railway.app',
  };

  /** Keys / paths shared with Grudge-Studio-Forge */
  const PATHS = {
    kvProjectsIndex: 'grudge:forge:projects:index',
    kvScenesIndex: 'grudge:forge:scenes:index',
    kvNextId: 'grudge:forge:nextId',
    fsRoot: 'Grudge/forge',
    collection: (name) => `Grudge/forge/${name}`,
  };

  function puterReady() {
    return typeof global.puter !== 'undefined' && !!global.puter;
  }

  async function isSignedIn() {
    if (!puterReady()) return false;
    try {
      if (global.puter.auth && typeof global.puter.auth.isSignedIn === 'function') {
        return !!(await global.puter.auth.isSignedIn());
      }
      if (global.puter.auth && global.puter.auth.user) return true;
    } catch {
      /* */
    }
    return false;
  }

  async function kvGet(key) {
    if (!puterReady() || !global.puter.kv) return null;
    try {
      const v = await global.puter.kv.get(key);
      if (v == null) return null;
      if (typeof v === 'string') {
        try {
          return JSON.parse(v);
        } catch {
          return v;
        }
      }
      return v;
    } catch (e) {
      console.warn('[ForgeCloudBridge] kv.get failed', key, e);
      return null;
    }
  }

  /**
   * @returns {Promise<{ok:boolean, signedIn:boolean, projects:Array, error?:string}>}
   */
  async function listForgeProjects() {
    const signedIn = await isSignedIn();
    if (!signedIn) {
      return {
        ok: false,
        signedIn: false,
        projects: [],
        error: 'Sign in with Puter on this OS to list Forge cloud projects.',
      };
    }
    const raw = await kvGet(PATHS.kvProjectsIndex);
    const projects = Array.isArray(raw) ? raw : [];
    return { ok: true, signedIn: true, projects, error: undefined };
  }

  /** Deep-link into Forge editor with project open (Puter session must match). */
  function forgeEditorUrl(opts = {}) {
    const u = new URL(FLEET.forgeEditor);
    if (opts.projectId != null) u.searchParams.set('project', String(opts.projectId));
    if (opts.edit !== false) u.searchParams.set('edit', '1');
    if (opts.from) u.searchParams.set('from', opts.from);
    else u.searchParams.set('from', 'grudgeos');
    return u.toString();
  }

  function openForgeProject(projectId, opts = {}) {
    const url = forgeEditorUrl({ projectId, ...opts });
    const win = global.open(url, '_blank', 'noopener,noreferrer');
    return { ok: !!win, url };
  }

  function openForgeHome() {
    const url = forgeEditorUrl({});
    const win = global.open(url, '_blank', 'noopener,noreferrer');
    return { ok: !!win, url };
  }

  /** HTML panel for desktop window contentType === 'forgecloud' */
  function forgeProjectsPanelHtml() {
    return `
      <div id="forge-cloud-panel" style="
        height:100%;display:flex;flex-direction:column;font-family:system-ui,sans-serif;
        color:#e8e8ff;background:radial-gradient(ellipse at top,rgba(139,92,246,0.18),transparent 55%),#0a0a12;
      ">
        <div style="padding:16px 18px;border-bottom:1px solid rgba(139,92,246,0.25);display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <div style="flex:1;min-width:180px;">
            <div style="font-weight:700;font-size:16px;letter-spacing:0.02em;">Grudge Studio · Forge</div>
            <div style="font-size:12px;opacity:0.65;margin-top:2px;">Cloud projects via Puter · AI billed in GBux on fleet</div>
          </div>
          <button type="button" data-forge-action="refresh" style="
            padding:8px 12px;border-radius:8px;border:1px solid rgba(0,245,255,0.35);
            background:rgba(0,245,255,0.1);color:#e8e8ff;cursor:pointer;font-size:12px;font-weight:600;
          ">Refresh</button>
          <button type="button" data-forge-action="open-editor" style="
            padding:8px 14px;border-radius:8px;border:none;
            background:linear-gradient(135deg,#8b5cf6,#f6c945);color:#1a1400;cursor:pointer;font-size:12px;font-weight:700;
          ">Open Editor</button>
        </div>
        <div style="padding:12px 18px;font-size:11px;opacity:0.7;line-height:1.55;border-bottom:1px solid rgba(255,255,255,0.06);">
          <div><strong>KV</strong> · <code style="opacity:0.9">${PATHS.kvProjectsIndex}</code></div>
          <div><strong>FS</strong> · <code style="opacity:0.9">${PATHS.fsRoot}/&lt;collection&gt;/&lt;id&gt;.json</code></div>
          <div><strong>CDN</strong> · ${FLEET.assets} · <strong>ObjectStore</strong> · ${FLEET.objectStore}</div>
        </div>
        <div id="forge-cloud-status" style="padding:10px 18px;font-size:12px;color:#a78bfa;">Loading…</div>
        <div id="forge-cloud-list" style="flex:1;overflow:auto;padding:8px 14px 18px;display:flex;flex-direction:column;gap:8px;"></div>
      </div>`;
  }

  async function mountForgeProjectsPanel(root) {
    if (!root) return;
    const statusEl = root.querySelector('#forge-cloud-status');
    const listEl = root.querySelector('#forge-cloud-list');

    const paint = async () => {
      if (statusEl) statusEl.textContent = 'Reading Puter cloud…';
      if (listEl) listEl.innerHTML = '';
      const res = await listForgeProjects();
      if (!res.signedIn) {
        if (statusEl) {
          statusEl.innerHTML =
            'Not signed in with Puter. Use the OS sign-in, then Refresh. Guest projects only exist inside the Forge browser tab.';
        }
        return;
      }
      if (!res.ok) {
        if (statusEl) statusEl.textContent = res.error || 'Failed to list projects';
        return;
      }
      if (statusEl) {
        statusEl.textContent =
          res.projects.length === 0
            ? 'No cloud projects yet — create one in Forge while signed in with Puter.'
            : `${res.projects.length} project(s) on Puter cloud (shared with forge.grudge-studio.com)`;
      }
      if (!listEl) return;
      for (const p of res.projects) {
        const card = document.createElement('button');
        card.type = 'button';
        card.style.cssText = `
          text-align:left;cursor:pointer;border:1px solid rgba(139,92,246,0.3);
          background:rgba(26,26,46,0.9);border-radius:10px;padding:12px 14px;color:#e8e8ff;
          display:flex;flex-direction:column;gap:4px;
        `;
        card.innerHTML = `
          <span style="font-weight:700;font-size:14px;">${escapeHtml(p.name || 'Untitled')}</span>
          <span style="font-size:11px;opacity:0.65;">id ${p.id}${p.updatedAt ? ' · ' + escapeHtml(String(p.updatedAt).slice(0, 19)) : ''}</span>
          ${p.description ? `<span style="font-size:11px;opacity:0.5;">${escapeHtml(p.description)}</span>` : ''}
        `;
        card.addEventListener('click', () => openForgeProject(p.id));
        listEl.appendChild(card);
      }
    };

    root.querySelectorAll('[data-forge-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const a = btn.getAttribute('data-forge-action');
        if (a === 'refresh') paint();
        if (a === 'open-editor') openForgeHome();
      });
    });

    await paint();
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Register with GrudgeCloud if present */
  function registerWithGrudgeCloud() {
    try {
      if (global.grudgeCloud && typeof global.grudgeCloud.registerApp === 'function') {
        global.grudgeCloud.registerApp({
          id: 'grudge-forge',
          name: 'Grudge Studio Forge',
          icon: 'creating',
          version: VERSION,
          category: 'create',
          permissions: ['read', 'write'],
          dataPath: PATHS.fsRoot,
        });
      }
    } catch (e) {
      console.warn('[ForgeCloudBridge] GrudgeCloud register skipped', e);
    }
  }

  function install() {
    global.ForgeCloudBridge = {
      VERSION,
      FLEET,
      PATHS,
      listForgeProjects,
      forgeEditorUrl,
      openForgeProject,
      openForgeHome,
      forgeProjectsPanelHtml,
      mountForgeProjectsPanel,
      registerWithGrudgeCloud,
      isSignedIn,
    };
    registerWithGrudgeCloud();
    console.info(`[ForgeCloudBridge] v${VERSION} · Forge cloud projects on Puter`);
  }

  install();
})(typeof window !== 'undefined' ? window : globalThis);
