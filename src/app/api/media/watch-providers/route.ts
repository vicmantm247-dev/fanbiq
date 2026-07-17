import { NextRequest, NextResponse } from "next/server";
import { getValidatedSession } from "@/lib/server/validate-session";
import { SessionData } from "@/types";
import { MediaService } from "@/lib/services/media-service";
import { handleApiError } from "@/lib/api-utils";
import { getRuntimeConfig } from "@/lib/runtime-config";

export async function GET(request: NextRequest) {
    const session = await getValidatedSession();

    if (!session.isLoggedIn) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { tmdbDefaultRegion } = getRuntimeConfig();
    const region = searchParams.get("region") || tmdbDefaultRegion;
    const sessionCode = searchParams.get("sessionCode");
    const wantAll = searchParams.get("all") === "true";

    try {
        const result = await MediaService.getWatchProviders(session, region, sessionCode, wantAll);
        return NextResponse.json(result);
    } catch (error) {
        return handleApiError(error, "Failed to fetch watch providers");
    }
}

