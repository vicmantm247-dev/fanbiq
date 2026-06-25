import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getSessionOptions } from "@/lib/session";
import { SessionData } from "@/types";
import { db, flicks } from "@/lib/db";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: flickId } = await params;
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

  if (!session.isLoggedIn || !session.user?.Name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const existing = await db.select().from(flicks).where(eq(flicks.id, flickId)).then((rows: any[]) => rows[0]);
    if (!existing) {
      return NextResponse.json({ error: "Flick not found" }, { status: 404 });
    }

    if (existing.uploader !== session.user.Name) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.delete(flicks).where(eq(flicks.id, flickId));
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete flick:", error);
    return NextResponse.json({ error: "Unable to delete flick" }, { status: 500 });
  }
}
