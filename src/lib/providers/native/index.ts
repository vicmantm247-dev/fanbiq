import { MediaProvider, ProviderCapabilities, ProviderType } from "../types";
import { TmdbProvider } from "../tmdb/index";

/**
 * NativeProvider wraps TmdbProvider for all media operations
 * but uses our own DB users for authentication (no Jellyfin/Plex/Emby).
 * The actual credential check happens in the login API route.
 */
export class NativeProvider extends TmdbProvider {
  override readonly name = ProviderType.NATIVE as unknown as ProviderType.TMDB;

  override readonly capabilities: ProviderCapabilities = {
    hasAuth: true,
    hasQuickConnect: false,
    hasWatchlist: false,
    hasLibraries: false,
    hasSettings: false,
    requiresServerUrl: false,
    isExperimental: false,
    hasStreamingSettings: true,
    isAdminPanel: false,
  };

  // authenticate() is intentionally not implemented here.
  // Authentication is handled natively in /api/auth/login and /api/auth/register.
}