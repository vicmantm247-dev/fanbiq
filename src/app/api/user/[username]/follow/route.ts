import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getSessionOptions } from "@/lib/session";
import { SessionData } from "@/types";
import { db, nativeUsers, follows } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";
import { NotificationService } from "@/lib/services/notification-service";

export async function POST(request: NextRequest, context: { params: Promise<{ username: string }> }) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

  if (!session.isLoggedIn || !session.user?.Id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { username } = await context.params;
    const normalizedUsername = username.trim().toLowerCase();

    // Get the target user with case-insensitive username matching
    const targetUser = await db
      .select()
      .from(nativeUsers)
      .where(sql`lower(${nativeUsers.username}) = ${normalizedUsername}`)
      .then((rows: Array<{ id: string; username: string; displayName: string | null; bio: string | null; email: string; passwordHash: string; isVerified: boolean; createdAt: Date; updatedAt: Date }>) => rows[0]);

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.id === session.user.Id) {
      return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
    }

    let inserted = false;
    try {
      await db.insert(follows).values({ followerId: session.user.Id, followingId: targetUser.id });
      inserted = true;
    } catch (err: any) {
      if (err?.code === '23505') {
        inserted = false;
      } else {
        throw err;
      }
    }

    if (inserted) {
      await NotificationService.create({
        recipientId: targetUser.id,
        actorId: session.user.Id,
        actorName: session.user.Name || session.user.Id,
        type: 'follow',
        message: `${session.user.Name || 'Someone'} followed you`,
      });
    }

    return NextResponse.json({
      success: true,
      message: inserted ? "Followed successfully" : "Already following",
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to follow user" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ username: string }> }) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

  if (!session.isLoggedIn || !session.user?.Id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { username } = await context.params;
    const normalizedUsername = username.trim().toLowerCase();

    // Get the target user with case-insensitive username matching
    const targetUser = await db
      .select()
      .from(nativeUsers)
      .where(sql`lower(${nativeUsers.username}) = ${normalizedUsername}`)
      .then((rows: Array<{ id: string; username: string; displayName: string | null; bio: string | null; email: string; passwordHash: string; isVerified: boolean; createdAt: Date; updatedAt: Date }>) => rows[0]);

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.id === session.user.Id) {
      return NextResponse.json({ error: "Cannot unfollow yourself" }, { status: 400 });
    }

    await db.delete(follows).where(and(eq(follows.followerId, session.user.Id), eq(follows.followingId, targetUser.id)));

    return NextResponse.json({ success: true, message: "Unfollowed successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to unfollow user" }, { status: 500 });
  }
}
