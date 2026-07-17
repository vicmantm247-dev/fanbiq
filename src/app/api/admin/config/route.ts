import { NextRequest, NextResponse } from "next/server";
import { getValidatedSession } from "@/lib/server/validate-session";
import { AuthService } from "@/lib/services/auth-service";

export async function GET() {
    const session = await getValidatedSession();

    if (!session || !session.user.Id || !(await AuthService.isAdmin(session.user.Id, session.user.Name, session.user.provider, !!session.user.isGuest))) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    return NextResponse.json({});
}

export async function PATCH(request: NextRequest) {
    const session = await getValidatedSession();

    if (!session || !session.user.Id || !(await AuthService.isAdmin(session.user.Id, session.user.Name, session.user.provider, !!session.user.isGuest))) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
    }
}
