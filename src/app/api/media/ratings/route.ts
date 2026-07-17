import { NextRequest, NextResponse } from "next/server";
import { getValidatedSession } from "@/lib/server/validate-session";
import { SessionData } from "@/types";
import { MediaService } from "@/lib/services/media-service";

export async function GET(request: NextRequest) {
    const session = await getValidatedSession();
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const region = searchParams.get("region") || undefined;
        const { data, timedOut } = await MediaService.getRatings(session, region);
        return NextResponse.json({ data, timedOut });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch ratings" }, { status: 500 });
    }
}

