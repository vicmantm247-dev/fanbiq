const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
require('dotenv').config();

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is required');
}

const client = postgres(url);
const db = drizzle(client);

(async () => {
  try {
    await client.unsafe(`
      CREATE TABLE IF NOT EXISTS "FlickInteraction" (
        id SERIAL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "flickId" TEXT NOT NULL,
        "eventType" TEXT NOT NULL,
        "movieId" TEXT,
        "movieTitle" TEXT,
        "uploader" TEXT,
        "metadata" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS "FlickInteraction_userId_createdAt_idx"
      ON "FlickInteraction" ("userId", "createdAt");

      CREATE INDEX IF NOT EXISTS "FlickInteraction_flickId_idx"
      ON "FlickInteraction" ("flickId");

      CREATE INDEX IF NOT EXISTS "FlickInteraction_eventType_idx"
      ON "FlickInteraction" ("eventType");

      CREATE TABLE IF NOT EXISTS "FlickPersonalizationProfile" (
        "userId" TEXT PRIMARY KEY,
        "preferences" TEXT NOT NULL DEFAULT '{}',
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS "FlickPersonalizationProfile_updatedAt_idx"
      ON "FlickPersonalizationProfile" ("updatedAt");
    `);
    console.log('Applied flick personalization tables');
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
