import { getRuntimeConfig } from "@/lib/runtime-config";
import { MediaProvider, ProviderType } from "./types";
import { TmdbProvider } from "./tmdb/index";
import { NativeProvider } from "./native/index";

class ProviderFactory {
  private static instance: MediaProvider;

  static getProvider(providerTypeOverride?: string): MediaProvider {
    if (this.instance && !providerTypeOverride) return this.instance;

    let providerType = (providerTypeOverride || ProviderType.NATIVE) as ProviderType;
    if (!providerTypeOverride) {
        try {
            const config = getRuntimeConfig();
            providerType = config.provider as ProviderType;
        } catch (e) {
            // Fallback for build time etc
        }
    }

    const provider = this.createProvider(providerType);
    if (!providerTypeOverride) {
        this.instance = provider;
    }
    return provider;
  }

  private static createProvider(type: ProviderType): MediaProvider {
    switch (type) {
      case ProviderType.TMDB:
        return new TmdbProvider();
      case ProviderType.NATIVE:
        return new NativeProvider();
      default:
        console.warn(`Unknown provider: ${type}, defaulting to Native`);
        return new NativeProvider();
    }
  }
}

// Export a function instead of a constant to avoid issues with getRuntimeConfig being called too early
export const getMediaProvider = (type?: string) => ProviderFactory.getProvider(type);