import { NextRequest, NextResponse } from "next/server";
import { getValidatedSession } from "@/lib/server/validate-session";
import { getProfilePicture } from "@/lib/server/profile-picture";
import { AuthService } from "@/lib/services/auth-service";
import { getMediaProvider } from "@/lib/providers/factory";
import { logger } from "@/lib/logger";
import { ProviderType } from "@/lib/providers/types";
import { SessionData } from "@/types";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    if (!id) {
        return new NextResponse("User ID required", { status: 400 });
    }

    try {
        const profile = await getProfilePicture(id);
        const url = new URL(request.url);
        const hasVersion = url.searchParams.has("v");

        if (profile?.image) {
            const imageValue = profile.image as string;
            if (imageValue.startsWith('http')) {
                return new NextResponse(null, {
                    status: 307,
                    headers: {
                        Location: imageValue,
                    },
                });
            }

            const body = Buffer.from(imageValue, 'base64');

            return new NextResponse(body, {
                headers: {
                    "Content-Type": profile.contentType || "image/webp",
                    "Cache-Control": hasVersion
                        ? "public, max-age=31536000, immutable"
                        : "no-cache, no-store, must-revalidate",
                },
            });
        }

        // Guests either have a locally-stored profile picture (above) or none at all.
        // Never fall through to the provider — their synthetic ID is unknown to Jellyfin/Emby/Plex.
        if (id.startsWith("guest-")) {
            return new NextResponse("User image not found", { status: 404 });
        }

        const session = await getValidatedSession();
        let auth;

        try {
            auth = await AuthService.getEffectiveCredentials(session);
        } catch (e) {
            // no auth available
        }

        const searchParams = request.nextUrl.searchParams;
        const providerType = searchParams.get("provider") || auth?.provider;
        const provider = getMediaProvider(providerType);
        const tag = searchParams.get("tag") === "undefined" ? null : searchParams.get("tag");
        const effectiveTag = tag || (providerType === ProviderType.TMDB ? id : undefined);

        if (!providerType || !provider) {
            return new NextResponse("User image not found", { status: 404 });
        }

        const options: Record<string, string> = {};
        searchParams.forEach((value, key) => {
            if (!["token", "imageType", "tag", "type", "provider"].includes(key)) {
                options[key] = value;
            }
        });

        const response = await provider.fetchImage(id, "user", effectiveTag || undefined, auth, options);

        return new NextResponse(response.data as any, {
            status: 200,
            headers: {
                "Content-Type": response.contentType,
                "Cache-Control": hasVersion
                    ? "public, max-age=31536000, immutable"
                    : "no-cache, no-store, must-revalidate",
            },
        });
    } catch (error: any) {
        if (error?.response?.status === 404) {
            return new NextResponse("User image not found", { status: 404 });
        }
        logger.error("Error serving profile picture:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
