import { NextResponse } from "next/server";
import { getValidatedSession } from "@/lib/server/validate-session";
import { ConfigService } from "@/lib/services/config-service";
import { AuthService } from "@/lib/services/auth-service";

export async function GET() {
    const session = await getValidatedSession();

    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const adminUserId = await ConfigService.getAdminUserId(session.user.provider);
    const isAdmin = await AuthService.isAdmin(session.user.Id, session.user.Name, session.user.provider, !!session.user.isGuest);

    return NextResponse.json({
        hasAdmin: !!adminUserId,
        isAdmin: isAdmin,
    });
}
