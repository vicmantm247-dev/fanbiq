CREATE TABLE "Config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "FlicksVideo" (
	"id" text PRIMARY KEY NOT NULL,
	"uploaderId" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"movieTitle" text NOT NULL,
	"movieYear" integer NOT NULL,
	"videoUrl" text NOT NULL,
	"thumbnailUrl" text,
	"duration" integer,
	"fileSize" integer,
	"views" integer DEFAULT 0 NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Hidden" (
	"id" serial PRIMARY KEY NOT NULL,
	"externalId" text NOT NULL,
	"externalUserId" text NOT NULL,
	"sessionCode" text
);
--> statement-breakpoint
CREATE TABLE "Like" (
	"id" serial PRIMARY KEY NOT NULL,
	"externalId" text NOT NULL,
	"externalUserId" text NOT NULL,
	"isMatch" boolean DEFAULT false NOT NULL,
	"sessionCode" text,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "NativeUser" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"username" text NOT NULL,
	"passwordHash" text NOT NULL,
	"isVerified" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SessionEvent" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessionCode" text NOT NULL,
	"type" text NOT NULL,
	"payload" text NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SessionMember" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessionCode" text,
	"externalUserId" text NOT NULL,
	"externalUserName" text NOT NULL,
	"settings" text,
	"joinedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Session" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"hostUserId" text NOT NULL,
	"hostAccessToken" text,
	"hostDeviceId" text,
	"provider" text,
	"providerConfig" text,
	"filters" text,
	"settings" text,
	"randomSeed" text,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "UserProfile" (
	"userId" text PRIMARY KEY NOT NULL,
	"image" text,
	"contentType" text,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "VerificationToken" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"token" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "FlicksVideo" ADD CONSTRAINT "FlicksVideo_uploaderId_NativeUser_id_fk" FOREIGN KEY ("uploaderId") REFERENCES "public"."NativeUser"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Hidden" ADD CONSTRAINT "Hidden_sessionCode_Session_code_fk" FOREIGN KEY ("sessionCode") REFERENCES "public"."Session"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Like" ADD CONSTRAINT "Like_sessionCode_Session_code_fk" FOREIGN KEY ("sessionCode") REFERENCES "public"."Session"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SessionMember" ADD CONSTRAINT "SessionMember_sessionCode_Session_code_fk" FOREIGN KEY ("sessionCode") REFERENCES "public"."Session"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_userId_NativeUser_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."NativeUser"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "FlicksVideo_uploaderId_idx" ON "FlicksVideo" USING btree ("uploaderId");--> statement-breakpoint
CREATE INDEX "FlicksVideo_createdAt_idx" ON "FlicksVideo" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "FlicksVideo_movieTitle_idx" ON "FlicksVideo" USING btree ("movieTitle");--> statement-breakpoint
CREATE INDEX "FlicksVideo_views_idx" ON "FlicksVideo" USING btree ("views");--> statement-breakpoint
CREATE UNIQUE INDEX "Hidden_session_key" ON "Hidden" USING btree ("externalId","externalUserId","sessionCode") WHERE sessionCode IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "Hidden_solo_key" ON "Hidden" USING btree ("externalId","externalUserId") WHERE sessionCode IS NULL;--> statement-breakpoint
CREATE INDEX "Hidden_sessionCode_externalUserId_idx" ON "Hidden" USING btree ("sessionCode","externalUserId");--> statement-breakpoint
CREATE INDEX "Hidden_externalUserId_sessionCode_idx" ON "Hidden" USING btree ("externalUserId","sessionCode");--> statement-breakpoint
CREATE UNIQUE INDEX "Like_session_key" ON "Like" USING btree ("externalId","externalUserId","sessionCode") WHERE sessionCode IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "Like_solo_key" ON "Like" USING btree ("externalId","externalUserId") WHERE sessionCode IS NULL;--> statement-breakpoint
CREATE INDEX "Like_externalUserId_createdAt_idx" ON "Like" USING btree ("externalUserId","createdAt");--> statement-breakpoint
CREATE INDEX "Like_sessionCode_externalUserId_idx" ON "Like" USING btree ("sessionCode","externalUserId");--> statement-breakpoint
CREATE INDEX "Like_sessionCode_externalId_idx" ON "Like" USING btree ("sessionCode","externalId");--> statement-breakpoint
CREATE UNIQUE INDEX "NativeUser_email_key" ON "NativeUser" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "NativeUser_username_key" ON "NativeUser" USING btree ("username");--> statement-breakpoint
CREATE INDEX "SessionEvent_sessionCode_idx" ON "SessionEvent" USING btree ("sessionCode");--> statement-breakpoint
CREATE INDEX "SessionEvent_id_sessionCode_idx" ON "SessionEvent" USING btree ("id","sessionCode");--> statement-breakpoint
CREATE UNIQUE INDEX "SessionMember_sessionCode_externalUserId_key" ON "SessionMember" USING btree ("sessionCode","externalUserId");--> statement-breakpoint
CREATE INDEX "SessionMember_sessionCode_idx" ON "SessionMember" USING btree ("sessionCode");--> statement-breakpoint
CREATE UNIQUE INDEX "Session_code_key" ON "Session" USING btree ("code");--> statement-breakpoint
CREATE INDEX "VerificationToken_userId_idx" ON "VerificationToken" USING btree ("userId");
