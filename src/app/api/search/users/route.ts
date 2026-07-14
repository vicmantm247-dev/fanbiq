import { NextRequest, NextResponse } from "next/server";
import { db, nativeUsers, flicksVideos, userProfiles } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim() || "";

    if (!query) {
      return NextResponse.json([]);
    }

    const likeTerm = `%${query.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;

    const users = await db
      .select({
        id: nativeUsers.id,
        username: nativeUsers.username,
        email: nativeUsers.email,
        createdAt: nativeUsers.createdAt,
        videoCount: sql<number>`COUNT(${flicksVideos.id})`,
        profileImage: userProfiles.image,
      })
      .from(nativeUsers)
      .leftJoin(flicksVideos, eq(nativeUsers.id, flicksVideos.uploaderId))
      .leftJoin(userProfiles, eq(nativeUsers.id, userProfiles.userId))
      .where(sql`
        ${nativeUsers.username} ILIKE ${likeTerm}
        OR ${nativeUsers.email} ILIKE ${likeTerm}
      `)
      .groupBy(nativeUsers.id, nativeUsers.username, nativeUsers.email, nativeUsers.createdAt, userProfiles.image)
      .limit(20);

    return NextResponse.json(
      users.map((user: any) => ({
        id: user.id,
        username: user.username,
        displayName: user.username,
        videoCount: Number(user.videoCount ?? 0),
        createdAt: user.createdAt,
        profileImage: user.profileImage || null,
      })),
    );
  } catch (error) {
    logger.error("Failed to search users:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
