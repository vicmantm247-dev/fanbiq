import { NextRequest, NextResponse } from 'next/server';
import { desc, sql, arrayContains, eq, inArray } from 'drizzle-orm';
import { formatDistanceToNow } from 'date-fns';
import { getValidatedSession } from "@/lib/server/validate-session";
import { SessionData } from '@/types';
import { db } from '@/db';
import { flicks, type FlickRow, nativeUsers, follows } from '@/db/schema';
import { FlickPersonalizationService } from '@/lib/services/flick-personalization-service';

export async function GET(request: NextRequest) {
    const session = await getValidatedSession();
    const currentUserId = session?.isLoggedIn && session.user?.Id ? session.user.Id : null;
  try {
    const { searchParams } = request.nextUrl;
    const page = Number(searchParams.get('page') ?? '1');
    const limit = Number(searchParams.get('limit') ?? '10');
    const tag = searchParams.get('tag')?.trim();
    const pageNumber = Number.isNaN(page) || page < 1 ? 1 : page;
    const pageLimit = Number.isNaN(limit) || limit < 1 ? 10 : limit;
    const offset = (pageNumber - 1) * pageLimit;

    const baseQuery = db
      .select({
        flick: flicks,
        userId: nativeUsers.id,
      })
      .from(flicks)
      .leftJoin(nativeUsers, eq(flicks.uploader, nativeUsers.username))
      .orderBy(desc(flicks.createdAt))
      .limit(pageLimit)
      .offset(offset);

    const rows = tag
      ? await baseQuery.where(arrayContains(flicks.tags, [tag]))
      : await baseQuery;

    const uploaderIds = Array.from(
      new Set(rows.map((row: { flick: FlickRow; userId: string | null }) => row.userId).filter(Boolean))
    ) as string[];

    const followedIds = currentUserId && uploaderIds.length
      ? new Set(
          (
            await db
              .select({ followingId: follows.followingId })
              .from(follows)
              .where(eq(follows.followerId, currentUserId), inArray(follows.followingId, uploaderIds))
          ).map((row: any) => row.followingId)
        )
      : new Set<string>();

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(flicks);

    const mappedRows = rows.map((row: { flick: FlickRow; userId: string | null }) => {
      const row_data = row.flick;
      const userId = row.userId;
      const uploaderAvatarUrl = userId ? `/api/user/profile-picture/${userId}` : '';
      const isFollowedByCurrentUser = userId ? followedIds.has(userId) : false;

      return {
        id: row_data.id,
        movieId: row_data.tmdbId ? String(row_data.tmdbId) : undefined,
        videoUrl: row_data.videoUrl,
        movieTitle: row_data.movieTitle,
        movieYear: row_data.movieYear,
        moviePosterUrl: row_data.movieBackdropUrl || '',
        movieBackdropUrl: row_data.movieBackdropUrl,
        uploader: row_data.uploader,
        uploaderAvatarUrl,
        caption: row_data.caption,
        likes: row_data.likes,
        comments: row_data.comments,
        timestamp: formatDistanceToNow(row_data.createdAt, { addSuffix: true }),
        isFollowedByCurrentUser,
        tags: row_data.tags || [],
      };
    });

    const rankedFlicks = await FlickPersonalizationService.getRankedFlicks(currentUserId, mappedRows);

    return NextResponse.json({
      flicks: rankedFlicks,
      total: count,
      page: pageNumber,
      hasMore: offset + rows.length < count,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load flicks' },
      { status: 500 }
    );
  }
}

