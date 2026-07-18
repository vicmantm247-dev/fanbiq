import { 
  MediaItem, 
  MediaLibrary, 
  MediaGenre, 
  MediaYear, 
  MediaRating,
  WatchProvider,
  MediaRegion
} from "@/types/media";

export enum ProviderType {
  TMDB = 'tmdb',
  NATIVE = 'native',
}

export interface ProviderCapabilities {
  hasAuth: boolean;
  hasQuickConnect: boolean;
  hasWatchlist: boolean;
  hasLibraries: boolean;
  hasSettings: boolean;
  requiresServerUrl: boolean;
  isExperimental: boolean;
  hasStreamingSettings: boolean; // TMDB specific streaming/region filters
  isAdminPanel: boolean;
}

export const PROVIDER_CAPABILITIES: Record<ProviderType, ProviderCapabilities> = {
  [ProviderType.TMDB]: {
    hasAuth: false,
    hasQuickConnect: false,
    hasWatchlist: false,
    hasLibraries: false,
    hasSettings: true,
    requiresServerUrl: false,
    isExperimental: false,
    hasStreamingSettings: true,
    isAdminPanel: false,
  },
  [ProviderType.NATIVE]: {
    hasAuth: true,
    hasQuickConnect: false,
    hasWatchlist: false,
    hasLibraries: false,
    hasSettings: false,
    requiresServerUrl: false,
    isExperimental: false,
    hasStreamingSettings: true,
    isAdminPanel: false,
  },
};


export interface SearchFilters {
  genres?: string[];
  excludedGenres?: string[];
  years?: number[];
  ratings?: string[];
  excludedRatings?: string[];
  minCommunityRating?: number;
  runtimeRange?: [number, number];
  libraries?: string[];
  watchProviders?: string[];
  watchRegion?: string;
  searchTerm?: string;
  sortBy?: string;
  unplayedOnly?: boolean;
  themes?: string[];
  excludedThemes?: string[];
  tmdbLanguages?: string[];
  limit?: number;
  offset?: number;
}

export interface MediaProvider {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;

  // Items
  getItems(filters: SearchFilters, auth?: AuthContext): Promise<MediaItem[]>;
  getItemDetails(id: string, auth?: AuthContext, options?: { includeUserState?: boolean; mediaType?: 'movie' | 'tv' }): Promise<MediaItem>;
  
  // Metadata
  getGenres(auth?: AuthContext): Promise<MediaGenre[]>;
  getThemes?(auth?: AuthContext): Promise<string[]>;
  getYears(auth?: AuthContext): Promise<MediaYear[]>;
  getRatings(auth?: AuthContext): Promise<MediaRating[]>;
  getLibraries(auth?: AuthContext): Promise<MediaLibrary[]>;
  getWatchProviders?(region: string, auth?: AuthContext): Promise<WatchProvider[]>;
  getRegions?(auth?: AuthContext): Promise<MediaRegion[]>;

  // Images
  getImageUrl(itemId: string, type: "Primary" | "Backdrop" | "Logo" | "Thumb" | "Banner" | "Art" | "user", tag?: string, auth?: AuthContext): string;
  getBlurDataUrl(itemId: string, type?: string, auth?: AuthContext): Promise<string>;
  fetchImage(itemId: string, type: string, tag?: string, auth?: AuthContext, options?: Record<string, string>): Promise<ImageResponse>;

  // Auth (optional, based on capabilities)
  authenticate?(username: string, password?: string, deviceId?: string, serverUrl?: string): Promise<any>;
  initiateQuickConnect?(deviceId: string, serverUrl?: string): Promise<any>;
  checkQuickConnect?(secret: string, deviceId: string, serverUrl?: string): Promise<any>;

  // Actions
  toggleWatchlist?(itemId: string, action: "add" | "remove", auth?: AuthContext): Promise<void>;
  toggleFavorite?(itemId: string, action: "add" | "remove", auth?: AuthContext): Promise<void>;
}

export interface AuthContext {
  accessToken?: string;
  deviceId?: string;
  userId?: string;
  serverUrl?: string;
  tmdbToken?: string;
  watchRegion?: string;
}

export interface ImageResponse {
  data: Buffer | ArrayBuffer;
  contentType: string;
}
