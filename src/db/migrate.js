import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL must be set for PostgreSQL migrations.');
}
console.log('Connecting to database at:', url.split('@').pop()); // Hide token if present

const client = postgres(url);


const db = drizzle(client);

async function wipeLegacyCryptoTokens() {
  // Security upgrade (C3/M8): v1 tokens were encrypted with a raw SHA-256-derived
  // key. They must be wiped so hosts re-encrypt under the new scrypt KDF (v2).
  try {
    const result = await client.unsafe(
      "UPDATE Session SET hostAccessToken = NULL, hostDeviceId = NULL WHERE hostAccessToken LIKE 'v1:%'"
    );
    const rows = Array.isArray(result) ? result.length : 0;
    if (rows > 0) {
      console.log(
        `[Security] Wiped ${rows} legacy v1-encrypted guest-lending token(s). ` +
        'Hosts will need to re-enable guest lending to re-encrypt under the new KDF.'
      );
    }
  } catch (error) {
    // Non-fatal: table may not exist yet on a fresh install
    console.warn('[Security] Could not wipe legacy tokens (safe to ignore on fresh install):', error.message);
  }
}

async function main() {
  console.log('Running migrations...');
  try {
    const migrationsFolder = path.join(process.cwd(), 'src', 'db', 'migrations');
    console.log('Migrations folder:', migrationsFolder);
    await migrate(db, { migrationsFolder });
    console.log('Migrations complete!');
    await wipeLegacyCryptoTokens();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
