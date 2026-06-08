import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { eq } from "drizzle-orm";
import { db, nativeUsers } from "@/db";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

    if (!session.isLoggedIn) {
      return NextResponse.json(null);
    }

    // Get user details from database
    const user = await db
      .select()
      .from(nativeUsers)
      .where(eq(nativeUsers.id, session.user.Id))
      .then((r: typeof nativeUsers.$inferSelect[]) => r[0]);

    if (!user) {
      return NextResponse.json(null);
    }

    return NextResponse.json({
      userId: user.id,
      username: user.username,
      email: user.email,
      isVerified: user.isVerified,
      isAdmin: false,
      isGuest: false,
      provider: "native",
    });
  } catch (error) {
    logger.error("Failed to get user details:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
