CREATE TABLE IF NOT EXISTS "Notification" (
  id SERIAL PRIMARY KEY,
  "recipientId" TEXT NOT NULL,
  "actorId" TEXT,
  "actorName" TEXT,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "sessionCode" TEXT,
  "relatedId" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Notification_recipientId_createdAt_idx"
ON "Notification" ("recipientId", "createdAt");
