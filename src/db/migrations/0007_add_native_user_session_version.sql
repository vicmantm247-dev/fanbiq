ALTER TABLE "NativeUser" ADD COLUMN "sessionVersion" integer DEFAULT 1 NOT NULL;

UPDATE "NativeUser" SET "sessionVersion" = 1 WHERE "sessionVersion" IS NULL;
