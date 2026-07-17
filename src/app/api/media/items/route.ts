import { NextRequest, NextResponse } from "next/server";
import { getValidatedSession } from "@/lib/server/validate-session";
import { SessionData } from "@/types";
import { MediaService } from "@/lib/services/media-service";
import { handleApiError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
    const session = await getValidatedSession();
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get("searchTerm") || undefined;
    const page = parseInt(searchParams.get("page") || "0");
    const limit = parseInt(searchParams.get("limit") || "20");
    const filtersParam = searchParams.get("filters");
    let overrideFilters = undefined;
    if (filtersParam) {
        try {
            overrideFilters = JSON.parse(filtersParam);
        } catch (e) {
            logger.error("Failed to parse filters param", e);
        }
    }

    try {
        const result = await MediaService.getMediaItems(session, page, limit, searchTerm, overrideFilters);
        return NextResponse.json(result);
    } catch (error) {
        return handleApiError(error, "Failed to fetch deck");
    }
}

