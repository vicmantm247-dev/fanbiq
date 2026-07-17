ALTER TABLE "VerificationToken" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;

-- Ensure existing rows have attempts set
UPDATE "VerificationToken" SET "attempts" = 0 WHERE "attempts" IS NULL;

-- Optional: add an index on attempts if needed (not strictly necessary)
-- CREATE INDEX "VerificationToken_attempts_idx" ON "VerificationToken" USING btree ("attempts");
