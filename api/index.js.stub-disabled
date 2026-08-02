/**
 * Vercel Serverless API for puter-monitor-ai (PuterGrudge)
 * Health, fleet status, and graceful stubs for AI/auth when full server is offline.
 */

const SERVICE = 'puter-monitor-ai';
const VERSION = '2.1.0';

const FLEET = {
  app: 'https://puter-monitor-ai.vercel.app',
  grudgeId: 'https://id.grudge-studio.com',
  open: 'https://open.grudge-studio.com',
  forge: 'https://forge.grudge-studio.com',
  warlords: 'https://grudgewarlords.com',
  aiHub: 'https://ai.grudge-studio.com',
  objectStore: 'https://info.grudge-studio.com',
  puter: 'https://puter.com',
  github: 'https://github.com/MolochDaGod/PuterGrudge',
};

function normalizePath(url) {
  const raw = String(url || '/').split('?')[0];
  let path = raw
    .replace(/^\/api\/index\.js\/?/, '/')
    .replace(/^\/api\/?/, '/');
  if (!path.startsWith('/')) path = `/${path}`;
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path || '/';
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function envReady() {
  return {
    database: Boolean(process.env.DATABASE_URL),
    jwt: Boolean(process.env.JWT_SECRET),
    session: Boolean(process.env.SESSION_SECRET),
    openai: Boolean(process.env.OPENAI_API_KEY),
    puterKey: Boolean(process.env.PUTER_API_KEY),
    supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
    redis: Boolean(process.env.REDIS_URL),
  };
}

function parseBody(req) {
  return new Promise((resolve) => {
    if (req.body != null) {
      if (typeof req.body === 'object') return resolve(req.body);
      if (typeof req.body === 'string') {
        try {
          return resolve(JSON.parse(req.body));
        } catch {
          return resolve({ raw: req.body });
        }
      }
    }
    // Body already consumed / empty — do not hang on stream
    if (req.readableEnded || req.complete) {
      return resolve({});
    }
    let data = '';
    const timer = setTimeout(() => resolve({}), 2000);
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        clearTimeout(timer);
        resolve({});
      }
    });
    req.on('end', () => {
      clearTimeout(timer);
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({ raw: data });
      }
    });
    req.on('error', () => {
      clearTimeout(timer);
      resolve({});
    });
  });
}

export default async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();
  const path = normalizePath(req.url);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const env = envReady();
  const fullBackend = env.database && env.jwt;

  // --- Health ---
  if (path === '/' || path === '/health') {
    return json(res, 200, {
      status: 'ok',
      service: SERVICE,
      version: VERSION,
      mode: fullBackend ? 'full' : 'serverless',
      timestamp: new Date().toISOString(),
      env: env,
      message: fullBackend
        ? 'Full backend credentials detected (DB + JWT).'
        : 'Serverless mode: Puter AI runs client-side via Puter.js. Set DATABASE_URL + JWT_SECRET for auth/DB APIs.',
    });
  }

  if (path === '/health/ready' || path === '/ready') {
    return json(res, 200, {
      ready: true,
      service: SERVICE,
      checks: {
        api: true,
        puterClient: true,
        database: env.database,
        auth: env.jwt && env.session,
      },
    });
  }

  // --- Status / fleet map ---
  if (path === '/status' || path === '/fleet') {
    return json(res, 200, {
      service: SERVICE,
      version: VERSION,
      mode: fullBackend ? 'full' : 'serverless',
      fleet: FLEET,
      features: {
        puterAi: true,
        grudgeOsDesktop: true,
        cloudPilot: true,
        arena: true,
        serverAuth: fullBackend,
        vectorDb: env.database,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // --- Version ---
  if (path === '/version') {
    return json(res, 200, {
      service: SERVICE,
      version: VERSION,
      node: process.version,
      platform: 'vercel',
    });
  }

  // --- AI evolution (fire-and-forget from client) ---
  if (path.startsWith('/ai/evolution') || path === '/ai/evolution/record') {
    if (method === 'POST') {
      await parseBody(req);
      return json(res, 202, {
        accepted: true,
        stored: false,
        message: fullBackend
          ? 'Recorded (stub — wire full server routes for persistence).'
          : 'Accepted client-side learning event. Persistence requires DATABASE_URL.',
      });
    }
    return json(res, 200, {
      status: fullBackend ? 'available' : 'client-only',
      message: 'AI companion uses Puter.js in the browser. Server evolution needs full backend.',
    });
  }

  // --- AI / companion ---
  if (path.startsWith('/ai') || path.startsWith('/companion')) {
    return json(res, 200, {
      status: 'client',
      provider: 'puter.js',
      message:
        'Use window.puterAI / Puter.js in the browser. No server API key required for free Puter AI.',
      modelsHint: ['claude-sonnet-4', 'gpt-4o-mini', 'gemini-2.0-flash'],
    });
  }

  // --- Auth / user (honest stubs) ---
  if (path.startsWith('/user') || path.startsWith('/auth') || path.startsWith('/session')) {
    return json(res, 200, {
      authenticated: false,
      provider: 'stub',
      message: fullBackend
        ? 'Auth routes require full Express server (npm start), not this serverless stub.'
        : 'Sign in with Puter in the UI, or set DATABASE_URL + JWT secrets for server auth.',
      puter: true,
    });
  }

  // --- Admin ---
  if (path.startsWith('/admin')) {
    return json(res, 501, {
      error: 'not_implemented',
      message: 'Admin APIs need the full Express + Postgres deployment.',
    });
  }

  return json(res, 404, {
    error: 'not_found',
    path,
    message: `No handler for ${method} /api${path}`,
    try: ['/api/health', '/api/status', '/api/fleet', '/api/version'],
  });
}
