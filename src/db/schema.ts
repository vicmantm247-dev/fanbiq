import { pgTable, text, integer, serial, uniqueIndex, index, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql, type InferSelectModel, type InferInsertModel } from "drizzle-orm";

export const sessions = pgTable("Session", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  hostUserId: text("hostUserId").notNull(),
  hostAccessToken: text("hostAccessToken"),
  hostDeviceId: text("hostDeviceId"),
  provider: text("provider"),
  providerConfig: text("providerConfig"),
  filters: text("filters"),
  settings: text("settings"),
  randomSeed: text("randomSeed"),
  createdAt: timestamp("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
  return [
    uniqueIndex("Session_code_key").on(table.code),
  ];
});

export type Session = InferSelectModel<typeof sessions>;
export type NewSession = InferInsertModel<typeof sessions>;

export const likes = pgTable("Like", {
  id: serial("id").primaryKey(),
  externalId: text("externalId").notNull(),
  externalUserId: text("externalUserId").notNull(),
  isMatch: boolean("isMatch").notNull().default(false),
  sessionCode: text("sessionCode").references(() => sessions.code, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
  return [
    uniqueIndex("Like_session_key").on(table.externalId, table.externalUserId, table.sessionCode).where(sql`sessionCode IS NOT NULL`),
    uniqueIndex("Like_solo_key").on(table.externalId, table.externalUserId).where(sql`sessionCode IS NULL`),
    index("Like_externalUserId_createdAt_idx").on(table.externalUserId, table.createdAt),
    index("Like_sessionCode_externalUserId_idx").on(table.sessionCode, table.externalUserId),
    index("Like_sessionCode_externalId_idx").on(table.sessionCode, table.externalId),
  ];
});

export type Like = InferSelectModel<typeof likes>;
export type NewLike = InferInsertModel<typeof likes>;

export const hiddens = pgTable("Hidden", {
  id: serial("id").primaryKey(),
  externalId: text("externalId").notNull(),
  externalUserId: text("externalUserId").notNull(),
  sessionCode: text("sessionCode").references(() => sessions.code, { onDelete: "cascade" }),
}, (table) => {
  return [
    uniqueIndex("Hidden_session_key").on(table.externalId, table.externalUserId, table.sessionCode).where(sql`sessionCode IS NOT NULL`),
    uniqueIndex("Hidden_solo_key").on(table.externalId, table.externalUserId).where(sql`sessionCode IS NULL`),
    index("Hidden_sessionCode_externalUserId_idx").on(table.sessionCode, table.externalUserId),
    index("Hidden_externalUserId_sessionCode_idx").on(table.externalUserId, table.sessionCode),
  ];
});

export type Hidden = InferSelectModel<typeof hiddens>;
export type NewHidden = InferInsertModel<typeof hiddens>;

export const sessionMembers = pgTable("SessionMember", {
  id: serial("id").primaryKey(),
  sessionCode: text("sessionCode").references(() => sessions.code, { onDelete: "cascade" }),
  externalUserId: text("externalUserId").notNull(),
  externalUserName: text("externalUserName").notNull(),
  settings: text("settings"),
  joinedAt: timestamp("joinedAt").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
  return [
    uniqueIndex("SessionMember_sessionCode_externalUserId_key").on(table.sessionCode, table.externalUserId),
    index("SessionMember_sessionCode_idx").on(table.sessionCode),
  ];
});

export type SessionMember = InferSelectModel<typeof sessionMembers>;
export type NewSessionMember = InferInsertModel<typeof sessionMembers>;

export const config = pgTable("Config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Config = InferSelectModel<typeof config>;
export type NewConfig = InferInsertModel<typeof config>;

export const userProfiles = pgTable("UserProfile", {
  userId: text("userId").primaryKey(),
  image: text("image"),
  contentType: text("contentType"),
  updatedAt: timestamp("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type UserProfile = InferSelectModel<typeof userProfiles>;
 export type NewUserProfile = InferInsertModel<typeof userProfiles>;

export const follows = pgTable("Follow", {
  id: serial("id").primaryKey(),
  followerId: text("followerId").notNull().references(() => nativeUsers.id, { onDelete: "cascade" }),
  followingId: text("followingId").notNull().references(() => nativeUsers.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
  return [
    index("Follow_followerId_idx").on(table.followerId),
    index("Follow_followingId_idx").on(table.followingId),
    uniqueIndex("Follow_unique_idx").on(table.followerId, table.followingId),
  ];
});

export type Follow = InferSelectModel<typeof follows>;
export type NewFollow = InferInsertModel<typeof follows>;

export const sessionEvents = pgTable("SessionEvent", {
  id: serial("id").primaryKey(),
  sessionCode: text("sessionCode").notNull(),
  type: text("type").notNull(),
  payload: text("payload").notNull(),
  createdAt: timestamp("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
  return [
    index("SessionEvent_sessionCode_idx").on(table.sessionCode),
    index("SessionEvent_id_sessionCode_idx").on(table.id, table.sessionCode),
  ];
});

export type SessionEvent = InferSelectModel<typeof sessionEvents>;
export type NewSessionEvent = InferInsertModel<typeof sessionEvents>;

// ─── Native Auth Tables ────────────────────────────────────────────────────

export const nativeUsers = pgTable("NativeUser", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  username: text("username").notNull(),
  passwordHash: text("passwordHash").notNull(),
  displayName: text("displayName"),
  bio: text("bio"),
  isVerified: boolean("isVerified").notNull().default(false),
  sessionVersion: integer("sessionVersion").notNull().default(1),
  createdAt: timestamp("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("NativeUser_email_key").on(table.email),
  uniqueIndex("NativeUser_username_key").on(table.username),
]);

export type NativeUser = InferSelectModel<typeof nativeUsers>;
export type NewNativeUser = InferInsertModel<typeof nativeUsers>;

export const notifications = pgTable("Notification", {
  id: serial("id").primaryKey(),
  recipientId: text("recipientId").notNull().references(() => nativeUsers.id, { onDelete: "cascade" }),
  actorId: text("actorId").references(() => nativeUsers.id, { onDelete: "cascade" }),
  actorName: text("actorName"),
  type: text("type").notNull(),
  message: text("message").notNull(),
  sessionCode: text("sessionCode"),
  relatedId: text("relatedId"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  readAt: timestamp("readAt"),
}, (table) => {
  return [
    index("Notification_recipientId_createdAt_idx").on(table.recipientId, table.createdAt),
  ];
});

export type Notification = InferSelectModel<typeof notifications>;
export type NewNotification = InferInsertModel<typeof notifications>;

export const verificationTokens = pgTable("VerificationToken", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull().references(() => nativeUsers.id, { onDelete: "cascade" }),
  token: text("token").notNull(),          // 6-digit OTP stored as hashed value
  expiresAt: timestamp("expiresAt").notNull(),  // ISO timestamp
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("VerificationToken_userId_idx").on(table.userId),
]);

export type VerificationToken = InferSelectModel<typeof verificationTokens>;
export type NewVerificationToken = InferInsertModel<typeof verificationTokens>;

// ─── Flick Videos Table ────────────────────────────────────────────────────

export const flicksVideos = pgTable("FlicksVideo", {
  id: text("id").primaryKey(),
  uploaderId: text("uploaderId").notNull().references(() => nativeUsers.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  movieTitle: text("movieTitle").notNull(),
  movieYear: integer("movieYear").notNull(),
  videoUrl: text("videoUrl").notNull(),          // URL to stored video (cloud storage)
  thumbnailUrl: text("thumbnailUrl"),            // URL to video thumbnail
  duration: integer("duration"),                  // Video duration in seconds
  fileSize: integer("fileSize"),                 // File size in bytes
  views: integer("views").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("FlicksVideo_uploaderId_idx").on(table.uploaderId),
  index("FlicksVideo_createdAt_idx").on(table.createdAt),
  index("FlicksVideo_movieTitle_idx").on(table.movieTitle),
  index("FlicksVideo_views_idx").on(table.views),
]);

export type FlicksVideo = InferSelectModel<typeof flicksVideos>;
export type NewFlicksVideo = InferInsertModel<typeof flicksVideos>;

export const flicks = pgTable('flicks', {
  id: uuid('id').defaultRandom().primaryKey(),
  videoPath: text('video_path').notNull(),
  videoUrl: text('video_url').notNull(),
  movieTitle: text('movie_title').notNull(),
  movieYear: integer('movie_year').notNull(),
  tmdbId: integer('tmdb_id'),
  movieBackdropUrl: text('movie_backdrop_url').default(''),
  uploader: text('uploader').notNull().default('anonymous'),
  caption: text('caption').default(''),
  tags: text('tags').array().default([]),
  likes: integer('likes').default(0).notNull(),
  comments: integer('comments').default(0).notNull(),
  views: integer('views').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type FlickRow = InferSelectModel<typeof flicks>;
export type NewFlick = InferInsertModel<typeof flicks>;

export const flickInteractions = pgTable("FlickInteraction", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  flickId: text("flickId").notNull(),
  eventType: text("eventType").notNull(),
  movieId: text("movieId"),
  movieTitle: text("movieTitle"),
  uploader: text("uploader"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("FlickInteraction_userId_createdAt_idx").on(table.userId, table.createdAt),
  index("FlickInteraction_flickId_idx").on(table.flickId),
  index("FlickInteraction_eventType_idx").on(table.eventType),
]);

export type FlickInteraction = InferSelectModel<typeof flickInteractions>;
export type NewFlickInteraction = InferInsertModel<typeof flickInteractions>;

export const flickPersonalizationProfiles = pgTable("FlickPersonalizationProfile", {
  userId: text("userId").primaryKey(),
  preferences: text("preferences").notNull().default('{}'),
  updatedAt: timestamp("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("FlickPersonalizationProfile_updatedAt_idx").on(table.updatedAt),
]);

export type FlickPersonalizationProfile = InferSelectModel<typeof flickPersonalizationProfiles>;
export type NewFlickPersonalizationProfile = InferInsertModel<typeof flickPersonalizationProfiles>;
