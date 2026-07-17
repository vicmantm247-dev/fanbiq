import { NextRequest, NextResponse } from "next/server";
import { getValidatedSession } from "@/lib/server/validate-session";
import { SessionData } from "@/types";
import { db, nativeUsers, follows } from "@/db";
import { eq, sql } from "drizzle-orm";

export async function GET(request: NextRequest, context: { params: Promise<{ username: string }> }) {
  const session = await getValidatedSession();

  const { username } = await context.params;
  const normalizedUsername = username.trim().toLowerCase();

  const targetUser = await db
    .select()
    .from(nativeUsers)
    .where(sql`lower(${nativeUsers.username}) = ${normalizedUsername}`)
    .then((rows: any[]) => rows[0]);

  if (!targetUser) {
    return NextResponse.json({ isFollowing: false });
  }

  if (!session?.isLoggedIn || !session.user?.Id) {
    return NextResponse.json({ isFollowing: false });
  }

  if (session.user.Id === targetUser.id) {
    return NextResponse.json({ isFollowing: false });
  }

  const exists = await db
    .select()
    .from(follows)
    .where(eq(follows.followerId, session.user.Id), eq(follows.followingId, targetUser.id))
    .then((rows: any[]) => rows.length > 0);

  return NextResponse.json({ isFollowing: Boolean(exists) });
}
