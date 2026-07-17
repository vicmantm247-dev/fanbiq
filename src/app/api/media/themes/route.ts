import { NextRequest, NextResponse } from "next/server";
import { getValidatedSession } from "@/lib/server/validate-session";
import { SessionData } from "@/types";
import { DEFAULT_THEMES } from "@/lib/constants";

export async function GET(request: NextRequest) {
    const session = await getValidatedSession();
    if (!session.isLoggedIn) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        return NextResponse.json(DEFAULT_THEMES);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch themes" }, { status: 500 });
    }
}

