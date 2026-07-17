import { NextRequest, NextResponse } from "next/server";
import { getValidatedSession } from "@/lib/server/validate-session";
import { SessionData } from "@/types";
import { MediaService } from "@/lib/services/media-service";
import { handleApiError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
    const session = await getValidatedSession();
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const regions = await MediaService.getRegions(session);
        return NextResponse.json(regions);
    } catch (error) {
        return handleApiError(error, "Failed to fetch regions");
    }
}

