/**
 * Production Configuration for Puter Monitor AI
 * Autonomous deployment and service management
 * 
 * This file defines all production services, their configurations,
 * and how they interconnect for autonomous operation.
 */

export interface ServiceConfig {
  name: string;
  type: 'database' | 'cache' | 'web' | 'worker' | 'cron' | 'storage';
  provider: 'supabase' | 'render' | 'puter' | 'vercel';
  region: string;
  credentials: {
    envKey: string;
    required: boolean;
  }[];
  healthCheck?: string;
  autoRestart?: boolean;
}

export const PRODUCTION_CONFIG = {
  // Application metadata
  app: {
    name: 'puter-monitor-ai',
    version: '2.0.0',
    environment: 'production',
  },

  // Service definitions
  services: {
    // Primary Database - Supabase
    database: {
      name: 'grudge-production-db',
      type: 'database',
      provider: 'supabase',
      region: 'us-east-1',
      credentials: [
        { envKey: 'SUPABASE_URL', required: true },
        { envKey: 'SUPABASE_ANON_KEY', required: true },
        { envKey: 'SUPABASE_SERVICE_KEY', required: true },
        { envKey: 'DATABASE_URL', required: true },
      ],
      healthCheck: '/api/health/db',
      autoRestart: true,
    } as ServiceConfig,

    // Redis Cache - Render Key-Value
    cache: {
      name: 'grudge-cache',
      type: 'cache',
      provider: 'render',
      region: 'virginia',
      credentials: [
        { envKey: 'REDIS_URL', required: true },
        { envKey: 'REDIS_HOST', required: false },
        { envKey: 'REDIS_PORT', required: false },
      ],
      healthCheck: '/api/health/cache',
      autoRestart: true,
    } as ServiceConfig,

    // Main Web Service - Render
    web: {
      name: 'puter-monitor-web',
      type: 'web',
      provider: 'render',
      region: 'virginia',
      credentials: [
        { envKey: 'PORT', required: true },
        { envKey: 'NODE_ENV', required: true },
        { envKey: 'SESSION_SECRET', required: true },
      ],
      healthCheck: '/api/health',
      autoRestart: true,
    } as ServiceConfig,

    // AI Evolution Cron Job - Render
    evolutionCron: {
      name: 'ai-evolution-cron',
      type: 'cron',
      provider: 'render',
      region: 'virginia',
      credentials: [
        { envKey: 'DATABASE_URL', required: true },
        { envKey: 'REDIS_URL', required: false },
      ],
      autoRestart: false,
    } as ServiceConfig,

    // Puter Cloud Storage
    storage: {
      name: 'grudge-storage',
      type: 'storage',
      provider: 'puter',
      region: 'global',
      credentials: [
        { envKey: 'PUTER_API_KEY', required: false },
      ],
    } as ServiceConfig,
  },

  // Autonomous deployment settings
  deployment: {
    autoDeploy: true,
    branch: 'main',
    buildCommand: 'npm run build',
    startCommand: 'npm start',
    healthCheckTimeout: 300,
    rollbackOnFailure: true,
  },

  // Monitoring and alerting
  monitoring: {
    enabled: true,
    healthCheckInterval: 60, // seconds
    alertOnFailure: true,
    metricsRetention: 30, // days
  },
};

// Environment variable template
export const ENV_TEMPLATE = `
# =============================================================================
# PUTER MONITOR AI - PRODUCTION ENVIRONMENT
# Generated: ${new Date().toISOString()}
# =============================================================================

# Application
NODE_ENV=production
PORT=5000
APP_URL=https://puter-monitor-ai.onrender.com

# Supabase Database
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
DATABASE_URL=postgresql://postgres:password@db.YOUR_PROJECT.supabase.co:5432/postgres

# Render Redis Cache
REDIS_URL=redis://red-xxx:6379

# Authentication
SESSION_SECRET=generate_with_openssl_rand_base64_32
JWT_SECRET=generate_with_openssl_rand_base64_32

# Puter Integration
PUTER_APP_ID=puter-monitor-ai
PUTER_API_KEY=optional_for_enhanced_features

# AI Services (via Puter - no keys needed for basic)
OPENAI_API_KEY=optional_for_embeddings
QDRANT_URL=optional_for_vector_search
`.trim();

export default PRODUCTION_CONFIG;

