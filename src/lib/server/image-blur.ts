import "server-only";
import sharp from "sharp";
import axios from "axios";
import { cacheLife, cacheTag } from "next/cache";
import { tagBlur } from "@/lib/cache-tags";

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
                return blurDataURL;
            } catch (err: any) {
                lastError = err;
                // try again unless this was the final attempt
                if (attempt < maxAttempts) continue;
            }
        }

        console.error(`Failed to generate blurDataURL for ${itemId}:`, lastError?.message || lastError);
        return undefined;
    } catch (error: any) {
        console.error(`Unexpected error generating blurDataURL for ${itemId}:`, error?.message || error);
        return undefined;
    }
}
