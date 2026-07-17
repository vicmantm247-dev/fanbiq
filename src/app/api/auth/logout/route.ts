import { NextResponse } from "next/server";
import { getValidatedSession } from "@/lib/server/validate-session";
import { SessionData } from "@/types";
import { SessionService } from "@/lib/services/session-service";
import { logger } from "@/lib/logger";

export async function POST() {
  const session = await getValidatedSession();

  if (session.user?.Id && session.sessionCode) {
    try {
        await SessionService.leaveSession(session.user, session.sessionCode);
    } catch (e) {
        logger.error("Failed to leave session during logout", e);
    }
  }

  session.destroy();

  return NextResponse.json({ success: true });
}
