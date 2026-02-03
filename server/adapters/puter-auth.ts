/**
 * Puter Authentication Adapter
 * 
 * Integrates Puter's authentication with Grudge Auth backend
 * Provides seamless auth flow between Puter frontend and Express backend
 */

import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users, sessions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { generateTokenPair, hashPassword } from "../auth";

interface PuterUser {
  username: string;
  email?: string;
  uuid: string;
  [key: string]: any;
}

/**
 * Puter Auth Middleware
 * 
 * Checks for Puter authentication in headers/cookies
 * Creates or syncs user in local database
 * Attaches JWT token for downstream services
 */
export async function puterAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Check for Puter auth token in headers
    const puterToken = req.headers['x-puter-auth'] || req.cookies?.puterAuth;
    
    if (!puterToken) {
      // No Puter auth - proceed without user (guest mode)
      return next();
    }

    // Verify Puter token (in production, call Puter API to verify)
    const puterUser = await verifyPuterToken(puterToken as string);
    
    if (!puterUser) {
      return next();
    }

    // Sync Puter user with local database
    const localUser = await syncPuterUser(puterUser);
    
    // Generate JWT for internal use
    const tokens = generateTokenPair(localUser.id, localUser.email, localUser.role);
    
    // Attach user and token to request
    req.user = {
      id: localUser.id,
      email: localUser.email,
      role: localUser.role,
      puterUuid: puterUser.uuid,
    };
    
    req.headers.authorization = `Bearer ${tokens.accessToken}`;
    
    // Set JWT in response cookie for frontend
    res.cookie('auth_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    
    next();
  } catch (error) {
    console.error('Puter auth middleware error:', error);
    // Don't block request on auth errors
    next();
  }
}

/**
 * Verify Puter token
 * 
 * In development: Mock verification
 * In production: Call Puter API to verify token
 */
async function verifyPuterToken(token: string): Promise<PuterUser | null> {
  try {
    // Development mode: Mock Puter user
    if (process.env.NODE_ENV === 'development') {
      return {
        username: 'puter_dev_user',
        email: 'dev@puter.local',
        uuid: 'dev-uuid-12345',
      };
    }

    // Production: Verify with Puter API
    const response = await fetch('https://api.puter.com/auth/verify', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Puter token verification failed:', error);
    return null;
  }
}

/**
 * Sync Puter user with local database
 * 
 * Creates user if doesn't exist
 * Updates user info if changed
 */
async function syncPuterUser(puterUser: PuterUser) {
  const email = puterUser.email || `${puterUser.username}@puter.local`;
  
  // Check if user exists
  let user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    // Create new user from Puter account
    const randomPassword = await hashPassword(crypto.randomUUID());
    
    const [newUser] = await db.insert(users).values({
      username: puterUser.username,
      email: email,
      password: randomPassword, // Random password - user logs in via Puter
      role: 'viewer', // Default role for Puter users
    }).returning();
    
    user = newUser;
    
    console.log(`[Puter Auth] Created user: ${user.username}`);
  } else {
    // Update username if changed
    if (user.username !== puterUser.username) {
      await db.update(users)
        .set({ username: puterUser.username, updatedAt: new Date() })
        .where(eq(users.id, user.id));
      
      user.username = puterUser.username;
    }
  }

  return user;
}

/**
 * Puter KV Storage Integration
 * 
 * Use Puter's key-value storage for sessions and cache
 */
export class PuterKVAdapter {
  private namespace: string;

  constructor(namespace: string = 'puter-monitor') {
    this.namespace = namespace;
  }

  async get(key: string): Promise<any> {
    try {
      if (typeof window !== 'undefined' && typeof (window as any).puter !== 'undefined') {
        const value = await (window as any).puter.kv.get(`${this.namespace}:${key}`);
        return value ? JSON.parse(value) : null;
      }
      return null;
    } catch (error) {
      console.error('Puter KV get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && typeof (window as any).puter !== 'undefined') {
        await (window as any).puter.kv.set(
          `${this.namespace}:${key}`,
          JSON.stringify(value),
          ttl ? { ttl } : undefined
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Puter KV set error:', error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && typeof (window as any).puter !== 'undefined') {
        await (window as any).puter.kv.del(`${this.namespace}:${key}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Puter KV delete error:', error);
      return false;
    }
  }

  async list(prefix?: string): Promise<string[]> {
    try {
      if (typeof window !== 'undefined' && typeof (window as any).puter !== 'undefined') {
        const fullPrefix = prefix 
          ? `${this.namespace}:${prefix}` 
          : `${this.namespace}:`;
        
        const keys = await (window as any).puter.kv.list(fullPrefix);
        return keys.map((k: string) => k.replace(`${this.namespace}:`, ''));
      }
      return [];
    } catch (error) {
      console.error('Puter KV list error:', error);
      return [];
    }
  }
}

/**
 * Session store using Puter KV
 */
export class PuterSessionStore {
  private kv: PuterKVAdapter;

  constructor() {
    this.kv = new PuterKVAdapter('sessions');
  }

  async get(sessionId: string) {
    return this.kv.get(sessionId);
  }

  async set(sessionId: string, data: any, maxAge: number) {
    return this.kv.set(sessionId, data, maxAge);
  }

  async destroy(sessionId: string) {
    return this.kv.delete(sessionId);
  }

  async listActive() {
    return this.kv.list();
  }
}

export default {
  middleware: puterAuthMiddleware,
  KVAdapter: PuterKVAdapter,
  SessionStore: PuterSessionStore,
};
