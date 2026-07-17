import { NextResponse } from "next/server";
import { getValidatedSession } from "@/lib/server/validate-session";
import { SessionData } from "@/types";
import { MediaService } from "@/lib/services/media-service";
import { handleApiError } from "@/lib/api-utils";

export async function GET() {
    const session = await getValidatedSession();
    if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

    try {
        const libraries = await MediaService.getLibraries(session);
        return NextResponse.json(libraries);
    } catch (error) {
        return handleApiError(error, "Failed to fetch libraries");
    }
}

