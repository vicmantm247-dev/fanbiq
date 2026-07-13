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
