import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Custom error for missing database configuration
export class DatabaseUnavailableError extends Error {
  status = 503;
  constructor(message: string = 'Database not configured. Set DATABASE_URL in deployment secrets.') {
    super(message);
    this.name = 'DatabaseUnavailableError';
  }
}

// Custom error for transient DB connection failures (pool exhausted, stale connection, etc.)
// These should NOT trigger a client-side logout — they are temporary.
export class DatabaseTransientError extends Error {
  status = 503;
  constructor(message: string = 'Database temporarily unavailable. Please retry.') {
    super(message);
    this.name = 'DatabaseTransientError';
  }
}

// Database connection with graceful handling for production deployments
let pool: Pool | null = null;
let internalDb: ReturnType<typeof drizzle> | null = null;

const dbUrl = process.env.NEON_DB_URL || process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (dbUrl) {
  try {
    pool = new Pool({
      connectionString: dbUrl,
      // Proactively close idle connections before they go stale.
      // Neon serverless WebSocket connections become silently dead after ~5 min of inactivity
      // (e.g. when the iPad sleeps). Setting idleTimeoutMillis forces the pool to close
      // idle connections and open fresh ones on the next request, preventing the stale
      // connection error that was causing the mobile app to see 500 "Authentication failed"
      // and incorrectly log the user out.
      idleTimeoutMillis: 15000,       // 15 s — recycle idle connections before Neon drops them
      connectionTimeoutMillis: 10000, // 10 s — fail fast if we cannot get a connection
      max: 10,                        // match Neon's default connection limit
    });
    internalDb = drizzle({ client: pool, schema });
    const isNeon = dbUrl.includes('neon.tech');
    console.log(`✓ Database connection initialized (${isNeon ? 'Neon' : 'local'})`);
  } catch (error) {
    console.error('⚠ Failed to initialize database connection:', error);
    console.error('  Server will run in degraded mode');
  }
} else {
  console.warn('⚠ DATABASE_URL not set - running without database');
  console.warn('  Set DATABASE_URL in deployment secrets to enable full functionality');
}

// Type-safe getter that throws ServiceUnavailableError when database is not available
export function getDb() {
  if (!internalDb) {
    throw new DatabaseUnavailableError();
  }
  return internalDb;
}

// Export for compatibility (null when not available)
export { pool };
export const db = internalDb;
