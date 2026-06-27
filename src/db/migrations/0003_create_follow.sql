-- Create Follow table if missing
CREATE TABLE IF NOT EXISTS "Follow" (
  "id" serial PRIMARY KEY,
  "followerId" text NOT NULL,
  "followingId" text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'Follow' AND indexname = 'Follow_followerId_idx'
  ) THEN
    CREATE INDEX "Follow_followerId_idx" ON "Follow" ("followerId");
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'Follow' AND indexname = 'Follow_followingId_idx'
  ) THEN
    CREATE INDEX "Follow_followingId_idx" ON "Follow" ("followingId");
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'Follow' AND indexname = 'Follow_unique_idx'
  ) THEN
    CREATE UNIQUE INDEX "Follow_unique_idx" ON "Follow" ("followerId", "followingId");
  END IF;
END$$;

-- Add foreign keys if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'Follow' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'followerId'
  ) THEN
    ALTER TABLE "Follow" ADD CONSTRAINT "Follow_follower_fk" FOREIGN KEY ("followerId") REFERENCES "NativeUser"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'Follow' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'followingId'
  ) THEN
    ALTER TABLE "Follow" ADD CONSTRAINT "Follow_following_fk" FOREIGN KEY ("followingId") REFERENCES "NativeUser"("id") ON DELETE CASCADE;
  END IF;
END$$;
