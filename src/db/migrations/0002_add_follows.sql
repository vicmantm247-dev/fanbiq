CREATE TABLE "Follow" (
  "id" serial PRIMARY KEY,
  "followerId" text NOT NULL,
  "followingId" text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX "Follow_followerId_idx" ON "Follow" ("followerId");
CREATE INDEX "Follow_followingId_idx" ON "Follow" ("followingId");
CREATE UNIQUE INDEX "Follow_unique_idx" ON "Follow" ("followerId", "followingId");

ALTER TABLE "Follow" ADD CONSTRAINT "Follow_follower_fk" FOREIGN KEY ("followerId") REFERENCES "NativeUser"("id") ON DELETE CASCADE;
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_following_fk" FOREIGN KEY ("followingId") REFERENCES "NativeUser"("id") ON DELETE CASCADE;
