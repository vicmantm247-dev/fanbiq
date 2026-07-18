import { z } from 'zod';
import packageJson from '../../package.json';
import { ProviderType } from './providers/types';

const envSchema = z.object({
  // Core
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  
  // Database
  DATABASE_URL: z.string().optional(),
  DATABASE_AUTH_TOKEN: z.string().optional(),

  // Provider
  PROVIDER: z.enum(ProviderType).default(ProviderType.NATIVE),
  PROVIDER_LOCK: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),

  // Server URLs
  SERVER_URL: z.string().optional(),
  SERVER_PUBLIC_URL: z.string().optional(),

  // Auth & Security
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters").optional(),
  USE_SECURE_COOKIES: z.preprocess((val) => val === 'true', z.boolean()).default(false),
  ALLOW_PRIVATE_PROVIDER_URLS: z.preprocess((val) => val === 'true', z.boolean()).default(false),
  ADMIN_USERNAME: z.string().optional(),

  // Provider Specific
  TMDB_ACCESS_TOKEN: z.string().optional(),
  TMDB_DEFAULT_REGION: z.string().optional(),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_UPLOAD_FOLDER: z.string().optional(),

  // UI / Proxy
  URL_BASE_PATH: z.string().default(''),
  APP_PUBLIC_URL: z.string().default('fanbiq.com'),
  JELLYFIN_USE_WATCHLIST: z.preprocess((val) => val === 'true', z.boolean()).default(false),

  APP_VERSION: z.string().optional(),
  NEXT_PUBLIC_APP_VERSION: z.string().optional(),
  X_FRAME_OPTIONS: z.string().default('DENY'),
  CSP_FRAME_ANCESTORS: z.string().default('none'),

  USE_ANALYTICS: z.preprocess((val) => val === 'true', z.boolean()).default(false),
  ENABLE_DEBUG: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Native auth (email/password)
  RESEND_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().optional(),
  USE_STATIC_FILTERS: z.preprocess((val) => val === 'true', z.boolean()).default(false),
});

const parsedEnv = envSchema.parse(process.env);

// Calculated values
const getDefaultDbPath = () => {
  // Default to a local Postgres instance for development and production
  // when no DATABASE_URL is provided. Users should set `DATABASE_URL` in
  // production to point to their managed Postgres instance.
  const defaultHost = 'localhost';
  const defaultPort = 5432;
  const defaultDb = 'swiparr';
  return `postgresql://${defaultHost}:${defaultPort}/${defaultDb}`;
};

const DATABASE_URL = parsedEnv.DATABASE_URL || getDefaultDbPath();
const DATABASE_AUTH_TOKEN = parsedEnv.DATABASE_AUTH_TOKEN;

const SERVER_URL = parsedEnv.SERVER_URL || '';

const SERVER_PUBLIC_URL = (parsedEnv.SERVER_PUBLIC_URL || SERVER_URL || '').replace(/\/$/, '');

const RAW_BASE_PATH = parsedEnv.URL_BASE_PATH.replace(/\/$/, '');
const BASE_PATH = RAW_BASE_PATH && !RAW_BASE_PATH.startsWith('/') ? `/${RAW_BASE_PATH}` : RAW_BASE_PATH;

const ADMIN_USERNAME = parsedEnv.ADMIN_USERNAME;

export const config = {
  ...parsedEnv,
  db: {
    url: DATABASE_URL,
    authToken: DATABASE_AUTH_TOKEN,
    isProduction: parsedEnv.NODE_ENV === 'production',
  },
  server: {
    url: SERVER_URL,
    publicUrl: SERVER_PUBLIC_URL,
  },
  cloudinary: {
    cloudName: parsedEnv.CLOUDINARY_CLOUD_NAME,
    apiKey: parsedEnv.CLOUDINARY_API_KEY,
    apiSecret: parsedEnv.CLOUDINARY_API_SECRET,
    uploadFolder: parsedEnv.CLOUDINARY_UPLOAD_FOLDER,
  },
  app: {
    version: (parsedEnv.APP_VERSION || parsedEnv.NEXT_PUBLIC_APP_VERSION || packageJson.version).replace(/^v/i, ''),
    basePath: BASE_PATH,
    appPublicUrl: parsedEnv.APP_PUBLIC_URL,
    provider: parsedEnv.PROVIDER,
    providerLock: parsedEnv.PROVIDER_LOCK,
    useWatchlist: false,
  },
  auth: {
    secret: parsedEnv.AUTH_SECRET,
    secureCookies: parsedEnv.USE_SECURE_COOKIES,
    adminUsername: ADMIN_USERNAME,
    googleClientId: parsedEnv.GOOGLE_CLIENT_ID,
    googleClientSecret: parsedEnv.GOOGLE_CLIENT_SECRET,
  },
  security: {
    allowPrivateProviderUrls: parsedEnv.ALLOW_PRIVATE_PROVIDER_URLS,
    plexImageAllowedHosts: parsedEnv.PLEX_IMAGE_ALLOWED_HOSTS,
  },
  proxy: {
    xFrameOptions: parsedEnv.X_FRAME_OPTIONS,
    cspFrameAncestors: parsedEnv.CSP_FRAME_ANCESTORS,
  }
} as const;

export type Config = typeof config;