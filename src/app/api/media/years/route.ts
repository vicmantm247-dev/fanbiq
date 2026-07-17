import { NextRequest, NextResponse } from "next/server";
import { getValidatedSession } from "@/lib/server/validate-session";
import { SessionData } from "@/types";
import { MediaService } from "@/lib/services/media-service";
import { handleApiError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
    const session = await getValidatedSession();
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { data, timedOut } = await MediaService.getYears(session);
        return NextResponse.json({ data, timedOut });
    } catch (error) {
        return handleApiError(error, "Failed to fetch years");
    }
}

