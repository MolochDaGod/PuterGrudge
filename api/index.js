/**
 * Vercel Serverless API Handler
 * Provides basic API endpoints for the PuterGrudge frontend.
 * Full backend features (DB, AI, sessions) require environment variables.
 */
export default function handler(req, res) {
  const { url, method } = req;
  // Normalize path: strip query string and /api prefix from rewrites
  const raw = String(url || '/').split('?')[0];
  let path = raw
    .replace(/^\/api\/index\.js\/?/, '/')
    .replace(/^\/api\/?/, '/');
  if (!path.startsWith('/')) path = `/${path}`;
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health check
  if (path === '/health' || path === '/' || path === '') {
    return res.status(200).json({
      status: 'ok',
      service: 'puter-monitor-ai',
      timestamp: new Date().toISOString(),
      message: 'API running on Vercel serverless. Configure DATABASE_URL and other env vars for full functionality.'
    });
  }

  // AI companion status
  if (path.startsWith('/ai') || path.startsWith('/companion')) {
    return res.status(200).json({
      status: 'offline',
      message: 'AI companion requires backend services. Set OPENAI_API_KEY or PUTER_API_KEY in Vercel environment variables.'
    });
  }

  // User/auth endpoints
  if (path.startsWith('/user') || path.startsWith('/auth') || path.startsWith('/session')) {
    return res.status(200).json({
      authenticated: false,
      message: 'Authentication requires DATABASE_URL to be configured in Vercel environment variables.'
    });
  }

  // Default: endpoint not configured
  return res.status(404).json({
    error: 'not_found',
    message: `API endpoint ${path} is not available in serverless mode. Deploy the full server for complete functionality.`
  });
}
