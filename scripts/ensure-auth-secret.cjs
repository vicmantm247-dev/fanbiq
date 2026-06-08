const crypto = require('node:crypto');
const dotenv = require('dotenv');
const postgres = require('postgres');

dotenv.config();

const getDefaultDbPath = () => {
  if (process.env.NODE_ENV === 'production') {
    return 'file:/app/data/swiparr.db';
  }
  return 'file:swiparr.db';
};

const resolveDatabaseUrl = () => {
  return process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || getDefaultDbPath();
};

const ensureAuthSecret = async () => {
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32) {
    return;
  }

  const url = resolveDatabaseUrl();

  // If the DB is SQLite/turso-like, skip (AUTH_SECRET should be in env for local dev)
  if (!url || url.startsWith('file:')) {
    console.warn('[Auth] No remote DATABASE_URL detected; generate AUTH_SECRET locally and set in .env');
    return;
  }

  const sql = postgres(url, { max: 1 });
  try {
    const rows = await sql`SELECT value FROM "Config" WHERE key = 'auth_secret' LIMIT 1`;
    if (rows && rows.length > 0 && rows[0].value) {
      process.env.AUTH_SECRET = rows[0].value;
      return;
    }

    const generated = crypto.randomBytes(32).toString('hex');
    await sql.begin(async (sqlTx) => {
      await sqlTx`INSERT INTO "Config" ("key", "value") VALUES ('auth_secret', ${generated})`;
    });
    process.env.AUTH_SECRET = generated;
    console.log('[Auth] Generated AUTH_SECRET and stored in database.');
  } catch (error) {
    console.warn('[Auth] Failed to ensure AUTH_SECRET:', error.message || error);
  } finally {
    try { await sql.end(); } catch (e) {}
  }
};

ensureAuthSecret().catch((error) => {
  console.warn('[Auth] Failed to ensure AUTH_SECRET (fatal):', error);
});
