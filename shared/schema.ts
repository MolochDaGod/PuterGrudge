import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============ DATABASE TABLES ============

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("viewer"),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  refreshToken: text("refresh_token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  refreshExpiresAt: timestamp("refresh_expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  resourceId: text("resource_id"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: varchar("key_prefix", { length: 10 }).notNull(),
  permissions: jsonb("permissions").notNull(),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "moderator", "viewer"]).optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["admin", "moderator", "viewer"]),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1, "API key name is required"),
  permissions: z.array(z.string()).min(1, "At least one permission is required"),
  expiresInDays: z.number().positive().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
export type UpdateUserRole = z.infer<typeof updateUserRoleSchema>;
export type CreateApiKey = z.infer<typeof createApiKeySchema>;

// ============ API SCHEMAS - CORE ============

export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }).optional(),
  requestId: z.string().optional(),
  timestamp: z.string(),
});

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: any };
  requestId?: string;
  timestamp: string;
};

export const healthStatusSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  services: z.object({
    puterAI: z.boolean(),
    cryptopanic: z.boolean(),
    generativeArt: z.boolean(),
    gbux: z.boolean(),
    discord: z.boolean(),
  }),
  timestamp: z.string(),
  version: z.string().optional(),
});

export type HealthStatus = z.infer<typeof healthStatusSchema>;

export const appInfoSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  environment: z.enum(["development", "production"]).optional(),
});

export type AppInfo = z.infer<typeof appInfoSchema>;

// ============ API SCHEMAS - GRUDGE APP ============

export const grudgeServerSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  ownerId: z.string(),
  createdAt: z.string(),
});

export const insertGrudgeServerSchema = grudgeServerSchema.omit({ id: true, createdAt: true });
export type GrudgeServer = z.infer<typeof grudgeServerSchema>;
export type InsertGrudgeServer = z.infer<typeof insertGrudgeServerSchema>;

export const grudgeChannelSchema = z.object({
  id: z.string(),
  serverId: z.string(),
  name: z.string(),
  type: z.enum(["text", "voice", "announcement"]),
  description: z.string().optional(),
  createdAt: z.string(),
});

export const insertGrudgeChannelSchema = grudgeChannelSchema.omit({ id: true, createdAt: true });
export type GrudgeChannel = z.infer<typeof grudgeChannelSchema>;
export type InsertGrudgeChannel = z.infer<typeof insertGrudgeChannelSchema>;

export const grudgeMessageSchema = z.object({
  id: z.string(),
  channelId: z.string(),
  userId: z.string(),
  username: z.string(),
  content: z.string(),
  attachments: z.array(z.string()).optional(),
  reactions: z.record(z.array(z.string())).optional(),
  isAI: z.boolean().optional(),
  createdAt: z.string(),
  editedAt: z.string().optional(),
});

export const insertGrudgeMessageSchema = grudgeMessageSchema.omit({ id: true, createdAt: true });
export type GrudgeMessage = z.infer<typeof grudgeMessageSchema>;
export type InsertGrudgeMessage = z.infer<typeof insertGrudgeMessageSchema>;

export const grudgeMemberSchema = z.object({
  id: z.string(),
  serverId: z.string(),
  userId: z.string(),
  username: z.string(),
  status: z.enum(["online", "idle", "dnd", "offline"]),
  role: z.enum(["owner", "admin", "moderator", "member"]),
  joinedAt: z.string(),
});

export type GrudgeMember = z.infer<typeof grudgeMemberSchema>;

// ============ API SCHEMAS - LAUNCHER ============

export const launcherAppSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  type: z.enum(["app", "workflow", "deployment", "external"]),
  url: z.string().optional(),
  action: z.string().optional(),
  category: z.string().optional(),
  lastLaunched: z.string().optional(),
  launchCount: z.number().default(0),
});

export type LauncherApp = z.infer<typeof launcherAppSchema>;

export const launcherFavoriteSchema = z.object({
  id: z.string(),
  appId: z.string(),
  userId: z.string(),
  order: z.number(),
  addedAt: z.string(),
});

export type LauncherFavorite = z.infer<typeof launcherFavoriteSchema>;

export const activityEventSchema = z.object({
  id: z.string(),
  type: z.enum(["app_launch", "deployment", "workflow_run", "file_change", "ai_interaction"]),
  appId: z.string().optional(),
  appName: z.string(),
  description: z.string(),
  timestamp: z.string(),
  metadata: z.record(z.any()).optional(),
});

export type ActivityEvent = z.infer<typeof activityEventSchema>;

// ============ API SCHEMAS - IMPROVEMENT ENGINE ============

export const interactionEventSchema = z.object({
  id: z.string(),
  type: z.enum([
    "message_sent", "channel_switch", "server_switch",
    "app_launch", "workflow_run", "ai_query",
    "file_open", "file_save", "deployment_create"
  ]),
  target: z.string(),
  metadata: z.record(z.any()).optional(),
  timestamp: z.string(),
});

export type InteractionEvent = z.infer<typeof interactionEventSchema>;

export const improvementSuggestionSchema = z.object({
  id: z.string(),
  type: z.enum(["pin_channel", "add_favorite", "create_shortcut", "optimize_workflow", "suggest_automation"]),
  title: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(1),
  actionData: z.record(z.any()),
  status: z.enum(["pending", "applied", "dismissed"]),
  createdAt: z.string(),
});

export type ImprovementSuggestion = z.infer<typeof improvementSuggestionSchema>;

export const interactionStatsSchema = z.object({
  totalInteractions: z.number(),
  byType: z.record(z.number()),
  byTarget: z.record(z.number()),
  period: z.object({
    start: z.string(),
    end: z.string(),
  }),
});

export type InteractionStats = z.infer<typeof interactionStatsSchema>;

// ============ API SCHEMAS - AI AGENT ============

export const agentJobStatusSchema = z.enum(["pending", "processing", "completed", "failed"]);

export const agentJobSchema = z.object({
  id: z.string(),
  status: agentJobStatusSchema,
  prompt: z.string(),
  context: z.string().optional(),
  model: z.string().default("gpt-4o-mini"),
  result: z.string().optional(),
  toolsUsed: z.array(z.string()).optional(),
  createdAt: z.string(),
  completedAt: z.string().optional(),
});

export const insertAgentJobSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  context: z.string().optional(),
  model: z.string().optional(),
  tools: z.array(z.string()).optional(),
});

export type AgentJob = z.infer<typeof agentJobSchema>;
export type InsertAgentJob = z.infer<typeof insertAgentJobSchema>;

// ============ API SCHEMAS - EXTENSIONS ============

export const extensionCategorySchema = z.enum([
  "ai", "deployment", "storage", "tools", "automation", "custom"
]);

export const extensionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string(),
  category: extensionCategorySchema,
  enabled: z.boolean(),
  config: z.record(z.any()),
  execute: z.string(),
});

export const insertExtensionSchema = extensionSchema.omit({ enabled: true }).extend({
  enabled: z.boolean().optional(),
});

export const updateExtensionSchema = z.object({
  enabled: z.boolean().optional(),
  config: z.record(z.any()).optional(),
});

export type Extension = z.infer<typeof extensionSchema>;
export type InsertExtension = z.infer<typeof insertExtensionSchema>;
export type UpdateExtension = z.infer<typeof updateExtensionSchema>;

// ============ API SCHEMAS - DEPLOYMENTS ============

export const deploymentTypeSchema = z.enum(["site", "game", "app"]);
export const deploymentStatusSchema = z.enum(["pending", "deploying", "live", "failed", "stopped"]);

export const deploymentSchema = z.object({
  id: z.string(),
  type: deploymentTypeSchema,
  name: z.string(),
  subdomain: z.string(),
  status: deploymentStatusSchema,
  url: z.string().optional(),
  template: z.string().optional(),
  config: z.record(z.any()),
  logs: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const insertDeploymentSchema = z.object({
  type: deploymentTypeSchema,
  name: z.string().min(1, "Name is required"),
  subdomain: z.string().min(1, "Subdomain is required"),
  template: z.string().optional(),
  config: z.record(z.any()).optional(),
  files: z.record(z.string()).optional(),
});

export type Deployment = z.infer<typeof deploymentSchema>;
export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;

export const gameTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  files: z.record(z.string()),
});

export type GameTemplate = z.infer<typeof gameTemplateSchema>;

// ============ API SCHEMAS - MEDIA TOOLS ============

export const imageConvertRequestSchema = z.object({
  format: z.enum(["webp", "png", "jpeg", "jpg", "avif"]).default("webp"),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  quality: z.number().min(1).max(100).default(80),
});

export type ImageConvertRequest = z.infer<typeof imageConvertRequestSchema>;

export const model3dConvertRequestSchema = z.object({
  format: z.enum(["glb", "gltf"]).default("glb"),
  optimize: z.enum(["none", "optimize"]).default("none"),
});

export type Model3dConvertRequest = z.infer<typeof model3dConvertRequestSchema>;

// ============ API SCHEMAS - INTEGRATIONS ============

export const cryptoNewsFilterSchema = z.enum(["hot", "rising", "bullish", "bearish", "important", "saved", "lol"]);

export const cryptoNewsRequestSchema = z.object({
  filter: cryptoNewsFilterSchema.default("hot"),
  currencies: z.string().optional(),
});

export type CryptoNewsRequest = z.infer<typeof cryptoNewsRequestSchema>;

export const artGenerateRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  style: z.string().optional(),
  width: z.number().positive().default(512),
  height: z.number().positive().default(512),
});

export type ArtGenerateRequest = z.infer<typeof artGenerateRequestSchema>;

// ============ GRUDACHAIN INTEGRATION ============

export const grudachainAccountSchema = z.object({
  username: z.string(),
  chainId: z.string().optional(),
  capabilities: z.array(z.string()),
  linkedAt: z.string(),
  syncedAt: z.string().optional(),
});

export type GrudachainAccount = z.infer<typeof grudachainAccountSchema>;

// ============ WORKFLOWS ============

export const workflowStepSchema = z.object({
  id: z.string(),
  action: z.string(),
  params: z.record(z.any()),
  condition: z.string().optional(),
});

export const workflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  steps: z.array(workflowStepSchema),
  trigger: z.enum(["manual", "schedule", "event"]),
  schedule: z.string().optional(),
  enabled: z.boolean(),
  createdAt: z.string(),
  lastRunAt: z.string().optional(),
});

export type Workflow = z.infer<typeof workflowSchema>;
export type WorkflowStep = z.infer<typeof workflowStepSchema>;

// ============ AI MEMORY ============

export const aiMemoryPreferenceSchema = z.object({
  key: z.string(),
  value: z.any(),
  confidence: z.number().min(0).max(1),
  learnedAt: z.string(),
});

export const aiMemorySchema = z.object({
  preferences: z.record(aiMemoryPreferenceSchema),
  codingStyle: z.record(z.object({
    value: z.string(),
    count: z.number(),
  })),
  conversationHistory: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
    timestamp: z.string(),
  })),
});

export type AIMemory = z.infer<typeof aiMemorySchema>;
export type AIMemoryPreference = z.infer<typeof aiMemoryPreferenceSchema>;

// ============ GRUDGEOS AI SCHEMAS ============

export const grudgeOSTaskTypeSchema = z.enum([
  "generate_game",
  "generate_scene", 
  "generate_code",
  "fix_code",
  "add_feature",
  "explain_code",
  "suggest_assets",
  "optimize_code",
  "generate_npc",
  "generate_quest"
]);

export type GrudgeOSTaskType = z.infer<typeof grudgeOSTaskTypeSchema>;

export const grudgeOSRequestSchema = z.object({
  task: grudgeOSTaskTypeSchema,
  prompt: z.string(),
  context: z.object({
    currentCode: z.string().optional(),
    gameType: z.enum(["rpg", "fps", "platformer", "racing", "puzzle", "sandbox", "other"]).optional(),
    assets: z.array(z.string()).optional(),
    language: z.enum(["javascript", "typescript", "python", "gdscript"]).optional(),
  }).optional(),
});

export type GrudgeOSRequest = z.infer<typeof grudgeOSRequestSchema>;

export const grudgeOSResponseSchema = z.object({
  task: grudgeOSTaskTypeSchema,
  result: z.object({
    code: z.string().optional(),
    explanation: z.string().optional(),
    assets: z.array(z.object({
      name: z.string(),
      path: z.string(),
      type: z.enum(["model", "texture", "sound", "map"]),
    })).optional(),
    steps: z.array(z.string()).optional(),
  }),
  model: z.string(),
  tokensUsed: z.number().optional(),
});

export type GrudgeOSResponse = z.infer<typeof grudgeOSResponseSchema>;

// GrudgeOS Asset Catalog
export const grudgeOSAssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  type: z.enum(["model", "texture", "sound", "map", "geometry"]),
  category: z.string(),
  tags: z.array(z.string()),
  thumbnail: z.string().optional(),
});

export type GrudgeOSAsset = z.infer<typeof grudgeOSAssetSchema>;

// ============ VERSION CONTROL ============

export const checkpointSchema = z.object({
  id: z.string(),
  grdId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  hash: z.string(),
  data: z.any(),
  createdAt: z.string(),
});

export type Checkpoint = z.infer<typeof checkpointSchema>;

// ============ HELPER FUNCTIONS ============

export function createApiResponse<T>(data: T, requestId?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    requestId,
    timestamp: new Date().toISOString(),
  };
}

export function createApiError(code: string, message: string, details?: any, requestId?: string): ApiResponse {
  return {
    success: false,
    error: { code, message, details },
    requestId,
    timestamp: new Date().toISOString(),
  };
}

// ============ COMPUTE CONTAINER / JOB SCHEMAS ============

export const jobStatusSchema = z.enum(['pending', 'queued', 'running', 'completed', 'failed', 'cancelled']);
export type JobStatus = z.infer<typeof jobStatusSchema>;

export const jobSpecSchema = z.object({
  id: z.string(),
  type: z.enum(['code', 'ai', 'transform', 'build', 'deploy', 'custom']),
  runtime: z.enum(['node', 'wasm', 'deno', 'python', 'browser']).default('node'),
  input: z.object({
    code: z.string().optional(),
    data: z.any().optional(),
    files: z.array(z.string()).optional(),
    env: z.record(z.string()).optional(),
  }),
  resources: z.object({
    maxMemoryMb: z.number().default(256),
    maxCpuMs: z.number().default(30000),
    maxDurationMs: z.number().default(60000),
    priority: z.enum(['low', 'normal', 'high']).default('normal'),
  }).optional(),
  hooks: z.object({
    onStart: z.string().optional(),
    onComplete: z.string().optional(),
    onError: z.string().optional(),
  }).optional(),
  metadata: z.object({
    createdBy: z.string().optional(),
    agentId: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
});

export type JobSpec = z.infer<typeof jobSpecSchema>;

export const jobResultSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  status: jobStatusSchema,
  output: z.any().optional(),
  error: z.string().optional(),
  logs: z.array(z.string()).optional(),
  metrics: z.object({
    startTime: z.string(),
    endTime: z.string().optional(),
    durationMs: z.number().optional(),
    memoryUsedMb: z.number().optional(),
    cpuUsedMs: z.number().optional(),
  }).optional(),
  artifacts: z.array(z.object({
    name: z.string(),
    type: z.string(),
    path: z.string(),
    size: z.number().optional(),
  })).optional(),
});

export type JobResult = z.infer<typeof jobResultSchema>;

export const computePodSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['idle', 'warming', 'busy', 'cooling', 'terminated']),
  runtime: z.enum(['node', 'wasm', 'deno', 'python', 'browser']),
  currentJob: z.string().optional(),
  stats: z.object({
    jobsCompleted: z.number(),
    jobsFailed: z.number(),
    totalCpuMs: z.number(),
    uptime: z.number(),
  }),
  createdAt: z.string(),
  lastActiveAt: z.string().optional(),
});

export type ComputePod = z.infer<typeof computePodSchema>;

// ============ SNAPSHOT SCHEMAS ============

export const snapshotTypeSchema = z.enum(['agent', 'squad', 'workspace', 'project', 'full']);
export type SnapshotType = z.infer<typeof snapshotTypeSchema>;

export const snapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: snapshotTypeSchema,
  version: z.number().default(1),
  data: z.object({
    agents: z.array(z.any()).optional(),
    squads: z.array(z.any()).optional(),
    terminals: z.array(z.any()).optional(),
    restClients: z.array(z.any()).optional(),
    messages: z.array(z.any()).optional(),
    environment: z.record(z.any()).optional(),
    files: z.array(z.object({
      path: z.string(),
      content: z.string(),
      encoding: z.enum(['utf8', 'base64']).default('utf8'),
    })).optional(),
    metadata: z.record(z.any()).optional(),
  }),
  size: z.number().optional(),
  checksum: z.string().optional(),
  createdAt: z.string(),
  createdBy: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type Snapshot = z.infer<typeof snapshotSchema>;

export const insertSnapshotSchema = snapshotSchema.omit({ 
  id: true, 
  createdAt: true, 
  size: true, 
  checksum: true 
});

export type InsertSnapshot = z.infer<typeof insertSnapshotSchema>;

// ============ WEBGL/WASM SCHEMAS ============

export const wasmModuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  path: z.string(),
  exports: z.array(z.string()),
  memory: z.object({
    initial: z.number().default(256),
    maximum: z.number().default(512),
  }).optional(),
  status: z.enum(['loading', 'ready', 'error', 'unloaded']),
  loadedAt: z.string().optional(),
});

export type WasmModule = z.infer<typeof wasmModuleSchema>;

export const webglSceneSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['network', 'agents', 'pods', 'metrics', 'custom']),
  camera: z.object({
    position: z.tuple([z.number(), z.number(), z.number()]),
    target: z.tuple([z.number(), z.number(), z.number()]),
    fov: z.number().default(60),
  }).optional(),
  nodes: z.array(z.object({
    id: z.string(),
    type: z.string(),
    position: z.tuple([z.number(), z.number(), z.number()]),
    scale: z.tuple([z.number(), z.number(), z.number()]).optional(),
    color: z.string().optional(),
    data: z.any().optional(),
  })).optional(),
  edges: z.array(z.object({
    from: z.string(),
    to: z.string(),
    weight: z.number().optional(),
    color: z.string().optional(),
  })).optional(),
  settings: z.record(z.any()).optional(),
});

export type WebGLScene = z.infer<typeof webglSceneSchema>;

// ============ TERMINAL UI SCHEMAS ============

export const terminalSessionSchema = z.object({
  sessionId: z.string().min(1),
  type: z.enum(['blessed', 'xterm']).default('blessed'),
});

export const terminalScreenSchema = z.object({
  sessionId: z.string().min(1),
  screenId: z.string().min(1),
  title: z.string().optional(),
  width: z.number().int().min(40).max(500).default(80),
  height: z.number().int().min(10).max(200).default(24),
});

export const terminalWriteSchema = z.object({
  sessionId: z.string().min(1),
  screenId: z.string().min(1),
  text: z.string(),
});

export type TerminalSession = z.infer<typeof terminalSessionSchema>;
export type TerminalScreen = z.infer<typeof terminalScreenSchema>;
export type TerminalWrite = z.infer<typeof terminalWriteSchema>;

// ============ SCREEN RECORDER SCHEMAS ============

export const screenRecordingStartSchema = z.object({
  sessionId: z.string().optional(),
  url: z.string().url().optional().default('about:blank'),
});

export const screenRecordingStopSchema = z.object({
  sessionId: z.string().min(1),
});

export type ScreenRecordingStart = z.infer<typeof screenRecordingStartSchema>;
export type ScreenRecordingStop = z.infer<typeof screenRecordingStopSchema>;

export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  RATE_LIMITED: "RATE_LIMITED",
  BAD_REQUEST: "BAD_REQUEST",
} as const;
