import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { config } from '@/lib/config';

// Initialize variables as null
let client: any = null;
let dbInstance: any = null;

export function getDb() {
  if (dbInstance) return dbInstance;
  if (!client) {
    if (!config.db.url) {
      console.warn('[DB] No DATABASE_URL provided — defaulting to local Postgres URL.');
    } else if (!config.db.authToken) {
      console.warn('[DB] DATABASE_AUTH_TOKEN is not set. If your Postgres requires an auth token, set it in env.');
    }
    client = postgres(config.db.url || 'postgresql://localhost:5432/swiparr');
  }

  if (!dbInstance) {
    dbInstance = drizzle(client, { schema });
  }

  return dbInstance;
}

// Keep the export for compatibility, but make it a proxy or getter
export const db = new Proxy({} as any, {
  get(_, prop) {
    return getDb()[prop];
  }
});

export { client };

export * from './schema';