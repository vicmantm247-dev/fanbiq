import "server-only";
import sharp from "sharp";
import axios from "axios";
import { cacheLife, cacheTag } from "next/cache";
import { tagBlur } from "@/lib/cache-tags";

declare global {
  var __fanbiqBlurCache: Map<string, { value?: string; expiresAt: number }> | undefined;
  var __fanbiqBlurInFlight: Map<string, Promise<string | undefined>> | undefined;
}

const blurCache = globalThis.__fanbiqBlurCache ??= new Map<string, { value?: string; expiresAt: number }>();
const blurInFlight = globalThis.__fanbiqBlurInFlight ??= new Map<string, Promise<string | undefined>>();

// Limit sharp memory usage and cache
sharp.cache({ items: 50, memory: 50 }); // 50MB max cache
sharp.concurrency(2); // Limit CPU usage too

export async function getBlurDataURL(
    itemId: string,
    imageUrl: string,
    headers: any = {}
): Promise<string | undefined> {
    "use cache";
    cacheLife({ revalidate: 86400, stale: 3600, expire: 2592000 });
    cacheTag(tagBlur(itemId));
    cacheTag(tagBlur());

    const cacheKey = `${itemId}:${imageUrl}`;
    const now = Date.now();
    const cachedEntry = blurCache.get(cacheKey);
    if (cachedEntry && cachedEntry.expiresAt > now) {
        return cachedEntry.value;
    }

    const inFlight = blurInFlight.get(cacheKey);
    if (inFlight) {
        return inFlight;
    }

    const pending = (async () => {
        try {
            const defaultTimeout = parseInt(process.env.IMAGE_FETCH_TIMEOUT || "10000", 10);
            const maxAttempts = 2;
            let lastError: any = null;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                const timeout = defaultTimeout * attempt; // increase timeout on retry
                try {
                    const response = await axios.get(imageUrl, {
                        responseType: "arraybuffer",
                        headers,
                        timeout,
                    });

                    const buffer = Buffer.from(response.data);
                    const { data, info } = await sharp(buffer)
                        .resize(10) // Small size for blur placeholder
                        .toBuffer({ resolveWithObject: true });

                    const blurDataURL = `data:image/${info.format};base64,${data.toString("base64")}`;
                    blurCache.set(cacheKey, { value: blurDataURL, expiresAt: now + 1000 * 60 * 60 * 24 });
                    return blurDataURL;
                } catch (err: any) {
                    lastError = err;
                    // try again unless this was the final attempt
                    if (attempt < maxAttempts) continue;
                }
            }

            console.error(`Failed to generate blurDataURL for ${itemId}:`, lastError?.message || lastError);
            blurCache.set(cacheKey, { value: undefined, expiresAt: now + 1000 * 60 * 5 });
            return undefined;
        } catch (error: any) {
            console.error(`Unexpected error generating blurDataURL for ${itemId}:`, error?.message || error);
            blurCache.set(cacheKey, { value: undefined, expiresAt: now + 1000 * 60 * 5 });
            return undefined;
        } finally {
            blurInFlight.delete(cacheKey);
        }
    })();

    blurInFlight.set(cacheKey, pending);
    return pending;
}
