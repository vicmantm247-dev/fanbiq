import { z } from "zod";
import { assertSafeUrl } from "@/lib/security/url-guard";
import { config } from "@/lib/config";

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().optional(),
  provider: z.string().optional(),
  config: z.object({
    serverUrl: z.string().optional(),
    tmdbToken: z.string().optional(),
  }).optional(),
  profilePicture: z.string().optional(), // Base64 encoded
});

export const guestLoginSchema = z.object({
  username: z.string().min(1, "Username is required").max(50),
  sessionCode: z.string().max(4).optional().or(z.literal("")),
  profilePicture: z.string().optional(), // Base64 encoded
});


export const swipeSchema = z.object({
  itemId: z.string().min(1),
  direction: z.enum(["left", "right"]),
  item: z.any().optional(),
  sessionCode: z.string().length(4).optional().nullable(),
});

export const sessionActionSchema = z.object({
  action: z.enum(["join", "create"]),
  code: z.string().length(4).optional(),
  allowGuestLending: z.boolean().optional(),
});

export const sessionSettingsSchema = z.object({
  filters: z.object({
    genres: z.array(z.string()).optional(),
    excludedGenres: z.array(z.string()).optional(),
    yearRange: z.array(z.number()).length(2).optional(),
    minCommunityRating: z.number().optional(),
    officialRatings: z.array(z.string()).optional(),
    excludedOfficialRatings: z.array(z.string()).optional(),
    runtimeRange: z.array(z.number()).length(2).optional(),
    watchProviders: z.array(z.string()).optional(),
    watchRegion: z.string().optional(),
    sortBy: z.string().optional(),
    themes: z.array(z.string()).optional(),
    excludedThemes: z.array(z.string()).optional(),
    tmdbLanguages: z.array(z.string()).optional(),
    unplayedOnly: z.boolean().optional(),
  }).optional().or(z.any()),
  settings: z.object({
    maxMatches: z.number().int().min(0).optional(),
    maxRightSwipes: z.number().int().min(0).optional(),
    maxLeftSwipes: z.number().int().min(0).optional(),
    matchStrategy: z.enum(["atLeastTwo", "allMembers"]).optional(),
  }).optional(),
  allowGuestLending: z.boolean().optional(),
});

export const deleteSwipeSchema = z.object({
  itemId: z.string().min(1).max(256),
});

export const watchlistSchema = z.object({
  itemId: z.string().min(1).max(256),
  action: z.enum(["add", "remove"]),
  useWatchlist: z.boolean().optional(),
});

export const libraryUpdateSchema = z.array(z.string());

export const quickConnectSchema = z.object({
  secret: z.string().min(1),
});

export const userSettingsSchema = z.object({
  watchProviders: z.array(z.string()).min(1, "At least one streaming service must be selected"),
  watchRegion: z.string().min(2).max(2),
});

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be 30 characters or fewer")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores");

export const registerSchema = z.object({
  email: z.email("Invalid email address"),
  username: usernameSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
});

export const verifyOtpSchema = z.object({
  userId: z.string().min(1),
  otp: z.string().length(6, "Code must be 6 digits").regex(/^\d+$/, "Code must be digits only"),
});