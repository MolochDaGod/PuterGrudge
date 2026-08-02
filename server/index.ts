import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { requestIdMiddleware, errorHandler } from "./middleware";
import { testDatabaseConnection } from "./db";
import { bootstrapDatabase } from "./db-bootstrap";
import path from "path";
import fs from "fs";


const app = express();
const httpServer = createServer(app);

/** Fleet + local origins allowed to call this API (Grudge best practice). */
const DEFAULT_CORS = [
  "https://puter-monitor-ai.vercel.app",
  "https://puter-monitor-ai-grudgenexus.vercel.app",
  "https://id.grudge-studio.com",
  "https://open.grudge-studio.com",
  "https://grudgewarlords.com",
  "https://forge.grudge-studio.com",
  "http://localhost:5000",
  "http://localhost:5173",
  "http://localhost:3000",
];

function corsOrigins(): string[] {
  const extra = (process.env.CORS_ORIGIN || process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([...DEFAULT_CORS, ...extra])];
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Trust Railway / reverse proxies
app.set("trust proxy", 1);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = corsOrigins();
  if (origin && (allowed.includes(origin) || /\.vercel\.app$/.test(origin) || /\.puter\.site$/.test(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, X-Grudge-Token",
    );
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  }
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
    limit: "10mb",
  }),
);

app.use(express.urlencoded({ extended: false }));

// Add request ID to all requests
app.use(requestIdMiddleware);

// Lightweight health for Railway (before heavy routes)
app.get("/api/healthz", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "puter-monitor-ai",
    role: "railway-api",
    time: new Date().toISOString(),
  });
});


export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // DB required for user auth tables — bootstrap schema when reachable
  const dbOk = await testDatabaseConnection().catch(() => false);
  if (!dbOk) {
    log("DATABASE_URL not ready — auth/user tables unavailable until Postgres is linked", "db");
  } else {
    log("database connected", "db");
    await bootstrapDatabase();
  }

  await registerRoutes(httpServer, app);

  // Use custom error handler
  app.use(errorHandler);

  // Production: optional static GrudgeOS from public/ (Vercel is primary shell)
  if (process.env.NODE_ENV === "production") {
    const publicDir = path.resolve(process.cwd(), "public");
    if (fs.existsSync(publicDir)) {
      app.use(express.static(publicDir));
    }
    try {
      const distPublic = path.resolve(process.cwd(), "dist", "public");
      if (fs.existsSync(distPublic)) {
        serveStatic(app);
      }
    } catch {
      // API-only is fine on Railway
    }
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    log(`puter-monitor-ai API on :${port} (db=${dbOk ? "up" : "down"})`);
  });
})();
