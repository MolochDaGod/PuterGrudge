import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { 
  users, 
  sessions, 
  auditLogs,
  apiKeys,
  loginSchema, 
  registerSchema,
  updateUserRoleSchema,
  createApiKeySchema,
  createApiResponse,
  createApiError,
  ERROR_CODES,
  type User
} from "@shared/schema";
import { 
  hashPassword, 
  verifyPassword, 
  generateTokenPair,
  verifyRefreshToken,
  generateApiKey,
  verifyApiKey
} from "../auth";
import { requireAuth, requireRole, auditLog, wrapAsync, ApiError } from "../middleware";

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user (admin-only)
 */
router.post("/register", requireAuth, requireRole("admin"), wrapAsync(async (req, res) => {
  const body = registerSchema.parse(req.body);
  
  // Check if user exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, body.email)
  });
  
  if (existingUser) {
    throw ApiError.badRequest("User with this email already exists");
  }
  
  // Hash password
  const passwordHash = await hashPassword(body.password);
  
  // Create user
  const [newUser] = await db.insert(users).values({
    username: body.username,
    email: body.email,
    password: passwordHash,
    role: body.role || "viewer",
  }).returning();
  
  // Log audit event
  await db.insert(auditLogs).values({
    userId: req.user!.id,
    action: "user.register",
    resource: "user",
    resourceId: newUser.id,
    details: { email: newUser.email, role: newUser.role },
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  // Remove password from response
  const { password: _, ...userWithoutPassword } = newUser;
  
  res.status(201).json(createApiResponse(userWithoutPassword, req.requestId));
}));

/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 */
router.post("/login", wrapAsync(async (req, res) => {
  const body = loginSchema.parse(req.body);
  
  // Find user
  const user = await db.query.users.findFirst({
    where: eq(users.email, body.email)
  });
  
  if (!user || !user.isActive) {
    throw ApiError.unauthorized("Invalid email or password");
  }
  
  // Verify password
  const isValid = await verifyPassword(body.password, user.password);
  
  if (!isValid) {
    throw ApiError.unauthorized("Invalid email or password");
  }
  
  // Generate tokens
  const tokens = generateTokenPair(user.id, user.email, user.role);
  
  // Store session
  await db.insert(sessions).values({
    userId: user.id,
    token: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
    refreshExpiresAt: tokens.refreshExpiresAt,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  // Update last login
  await db.update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));
  
  // Log audit event
  await db.insert(auditLogs).values({
    userId: user.id,
    action: "user.login",
    resource: "session",
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
  
  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;
  
  res.json(createApiResponse({
    user: userWithoutPassword,
    ...tokens,
  }, req.requestId));
}));

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post("/refresh", wrapAsync(async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    throw ApiError.badRequest("Refresh token required");
  }
  
  // Verify refresh token
  const payload = verifyRefreshToken(refreshToken);
  
  if (!payload) {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }
  
  // Find session
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.refreshToken, refreshToken)
  });
  
  if (!session || session.refreshExpiresAt < new Date()) {
    throw ApiError.unauthorized("Session expired or not found");
  }
  
  // Get user
  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.userId)
  });
  
  if (!user || !user.isActive) {
    throw ApiError.unauthorized("User not found or inactive");
  }
  
  // Generate new tokens
  const tokens = generateTokenPair(user.id, user.email, user.role);
  
  // Update session
  await db.update(sessions)
    .set({
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      refreshExpiresAt: tokens.refreshExpiresAt,
    })
    .where(eq(sessions.id, session.id));
  
  res.json(createApiResponse(tokens, req.requestId));
}));

/**
 * POST /api/auth/logout
 * Logout user and invalidate session
 */
router.post("/logout", requireAuth, wrapAsync(async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  
  if (token) {
    // Delete session
    await db.delete(sessions).where(eq(sessions.token, token));
    
    // Log audit event
    await db.insert(auditLogs).values({
      userId: req.user!.id,
      action: "user.logout",
      resource: "session",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }
  
  res.json(createApiResponse({ message: "Logged out successfully" }, req.requestId));
}));

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get("/me", requireAuth, wrapAsync(async (req, res) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, req.user!.id)
  });
  
  if (!user) {
    throw ApiError.notFound("User not found");
  }
  
  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;
  
  res.json(createApiResponse(userWithoutPassword, req.requestId));
}));

/**
 * GET /api/admin/users
 * Get all users (admin only)
 */
router.get("/admin/users", requireAuth, requireRole("admin"), wrapAsync(async (req, res) => {
  const allUsers = await db.query.users.findMany({
    columns: {
      password: false,
    },
    orderBy: (users, { desc }) => [desc(users.createdAt)],
  });
  
  res.json(createApiResponse(allUsers, req.requestId));
}));

/**
 * PUT /api/admin/users/:id/role
 * Update user role (admin only)
 */
router.put("/admin/users/:id/role", 
  requireAuth, 
  requireRole("admin"), 
  auditLog("user.update_role", "user"),
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const body = updateUserRoleSchema.parse(req.body);
    
    // Don't allow users to change their own role
    if (id === req.user!.id) {
      throw ApiError.badRequest("Cannot change your own role");
    }
    
    const [updatedUser] = await db.update(users)
      .set({ role: body.role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) {
      throw ApiError.notFound("User not found");
    }
    
    const { password: _, ...userWithoutPassword } = updatedUser;
    
    res.json(createApiResponse(userWithoutPassword, req.requestId));
  })
);

/**
 * DELETE /api/admin/users/:id
 * Delete user (admin only)
 */
router.delete("/admin/users/:id", 
  requireAuth, 
  requireRole("admin"),
  auditLog("user.delete", "user"),
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    
    // Don't allow users to delete themselves
    if (id === req.user!.id) {
      throw ApiError.badRequest("Cannot delete your own account");
    }
    
    const [deletedUser] = await db.delete(users)
      .where(eq(users.id, id))
      .returning();
    
    if (!deletedUser) {
      throw ApiError.notFound("User not found");
    }
    
    res.json(createApiResponse({ message: "User deleted successfully" }, req.requestId));
  })
);

/**
 * GET /api/admin/audit-log
 * Get audit logs (admin/moderator)
 */
router.get("/admin/audit-log", 
  requireAuth, 
  requireRole("moderator"), 
  wrapAsync(async (req, res) => {
    const { limit = 100, offset = 0 } = req.query;
    
    const logs = await db.query.auditLogs.findMany({
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
      orderBy: (auditLogs, { desc }) => [desc(auditLogs.createdAt)],
      with: {
        userId: true,
      },
    });
    
    res.json(createApiResponse(logs, req.requestId));
  })
);

/**
 * POST /api/admin/api-keys
 * Create API key (authenticated users)
 */
router.post("/admin/api-keys", 
  requireAuth,
  auditLog("api_key.create", "api_key"),
  wrapAsync(async (req, res) => {
    const body = createApiKeySchema.parse(req.body);
    
    // Generate API key
    const { key, prefix, hash } = generateApiKey();
    
    // Calculate expiration
    const expiresAt = body.expiresInDays 
      ? new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000)
      : null;
    
    // Store API key
    const [apiKeyRecord] = await db.insert(apiKeys).values({
      userId: req.user!.id,
      name: body.name,
      keyHash: hash,
      keyPrefix: prefix,
      permissions: body.permissions,
      expiresAt,
    }).returning();
    
    // Return the key ONCE (never stored in plain text)
    res.status(201).json(createApiResponse({
      id: apiKeyRecord.id,
      name: apiKeyRecord.name,
      key, // Only returned once!
      keyPrefix: prefix,
      permissions: apiKeyRecord.permissions,
      expiresAt: apiKeyRecord.expiresAt,
      createdAt: apiKeyRecord.createdAt,
    }, req.requestId));
  })
);

/**
 * GET /api/admin/api-keys
 * Get user's API keys
 */
router.get("/admin/api-keys", requireAuth, wrapAsync(async (req, res) => {
  const keys = await db.query.apiKeys.findMany({
    where: eq(apiKeys.userId, req.user!.id),
    columns: {
      keyHash: false,
    },
    orderBy: (apiKeys, { desc }) => [desc(apiKeys.createdAt)],
  });
  
  res.json(createApiResponse(keys, req.requestId));
}));

/**
 * DELETE /api/admin/api-keys/:id
 * Delete API key
 */
router.delete("/admin/api-keys/:id", 
  requireAuth,
  auditLog("api_key.delete", "api_key"),
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    
    const [deletedKey] = await db.delete(apiKeys)
      .where(and(
        eq(apiKeys.id, id),
        eq(apiKeys.userId, req.user!.id)
      ))
      .returning();
    
    if (!deletedKey) {
      throw ApiError.notFound("API key not found");
    }
    
    res.json(createApiResponse({ message: "API key deleted successfully" }, req.requestId));
  })
);

export default router;
