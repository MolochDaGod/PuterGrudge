/**
 * Ensure core user tables exist (Railway Postgres) without drizzle-kit CLI.
 */
import { pool } from "./db";

const DDL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  role varchar(20) NOT NULL DEFAULT 'viewer',
  is_active boolean DEFAULT true,
  last_login_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  refresh_token text NOT NULL UNIQUE,
  expires_at timestamp NOT NULL,
  refresh_expires_at timestamp NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id varchar REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource text NOT NULL,
  resource_id text,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_prefix varchar(10) NOT NULL,
  permissions jsonb NOT NULL,
  last_used_at timestamp,
  expires_at timestamp,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_apikeys_user ON api_keys(user_id);
`;

export async function bootstrapDatabase(): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      await client.query(DDL);
      console.log("[db-bootstrap] users/sessions/audit_logs/api_keys ready");
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[db-bootstrap] failed:", err instanceof Error ? err.message : err);
    return false;
  }
}
