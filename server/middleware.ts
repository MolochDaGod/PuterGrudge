import type { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { createApiError, createApiResponse, ERROR_CODES, type User } from "@shared/schema";
import { ZodError } from "zod";
import { extractTokenFromHeader, verifyAccessToken, hasRole } from "./auth";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  req.requestId = req.headers["x-request-id"] as string || uuidv4();
  res.setHeader("X-Request-ID", req.requestId);
  next();
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  console.error(`[${req.requestId}] Error:`, err);

  if (err instanceof ZodError) {
    return res.status(400).json(
      createApiError(
        ERROR_CODES.VALIDATION_ERROR,
        "Validation failed",
        err.errors,
        req.requestId
      )
    );
  }

  const statusCode = (err as any).statusCode || 500;
  const code = (err as any).code || ERROR_CODES.INTERNAL_ERROR;
  
  res.status(statusCode).json(
    createApiError(
      code,
      err.message || "An unexpected error occurred",
      undefined,
      req.requestId
    )
  );
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json(
    createApiError(
      ERROR_CODES.NOT_FOUND,
      `Route ${req.method} ${req.path} not found`,
      undefined,
      req.requestId
    )
  );
}

export function wrapAsync(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(statusCode: number, code: string, message: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = "ApiError";
  }

  static badRequest(message: string, details?: any) {
    return new ApiError(400, ERROR_CODES.BAD_REQUEST, message, details);
  }

  static notFound(message: string) {
    return new ApiError(404, ERROR_CODES.NOT_FOUND, message);
  }

  static unauthorized(message: string = "Unauthorized") {
    return new ApiError(401, ERROR_CODES.UNAUTHORIZED, message);
  }

  static forbidden(message: string = "Forbidden") {
    return new ApiError(403, ERROR_CODES.FORBIDDEN, message);
  }

  static internal(message: string = "Internal server error") {
    return new ApiError(500, ERROR_CODES.INTERNAL_ERROR, message);
  }

  static serviceUnavailable(message: string) {
    return new ApiError(503, ERROR_CODES.SERVICE_UNAVAILABLE, message);
  }
}

/**
 * Authentication middleware - verifies JWT token
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractTokenFromHeader(req.headers.authorization);
  
  if (!token) {
    return res.status(401).json(
      createApiError(
        ERROR_CODES.UNAUTHORIZED,
        "No authentication token provided",
        undefined,
        req.requestId
      )
    );
  }
  
  const payload = verifyAccessToken(token);
  
  if (!payload) {
    return res.status(401).json(
      createApiError(
        ERROR_CODES.UNAUTHORIZED,
        "Invalid or expired token",
        undefined,
        req.requestId
      )
    );
  }
  
  // Attach user info to request
  req.user = {
    id: payload.userId,
    email: payload.email,
    role: payload.role,
  };
  
  next();
}

/**
 * Role-based authorization middleware
 */
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json(
        createApiError(
          ERROR_CODES.UNAUTHORIZED,
          "Authentication required",
          undefined,
          req.requestId
        )
      );
    }
    
    if (!hasRole(req.user.role, role)) {
      return res.status(403).json(
        createApiError(
          ERROR_CODES.FORBIDDEN,
          `Requires ${role} role or higher`,
          undefined,
          req.requestId
        )
      );
    }
    
    next();
  };
}

/**
 * Audit log middleware - logs user actions
 */
export function auditLog(action: string, resource: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.user) {
      // In a real implementation, this would write to the audit_logs table
      console.log(`[AUDIT] User ${req.user.email} performed ${action} on ${resource}`, {
        userId: req.user.id,
        action,
        resource,
        resourceId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
      });
    }
    next();
  };
}

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}
