import { NextRequest, NextResponse } from 'next/server';
import { desc, sql, arrayContains, eq } from 'drizzle-orm';
import { formatDistanceToNow } from 'date-fns';
import { db } from '@/db';
import { flicks, type FlickRow, nativeUsers, userProfiles } from '@/db/schema';

export async function GET(request: NextRequest) {
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

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(flicks);

    const mappedRows = rows.map((row: { flick: FlickRow; userId: string | null }) => {
      const row_data = row.flick;
      const userId = row.userId;
      // Build the avatar URL using the actual user ID
      const uploaderAvatarUrl = userId ? `/api/user/profile-picture/${userId}` : '';
      
      return {
        id: row_data.id,
        movieId: row_data.tmdbId ? String(row_data.tmdbId) : undefined,
        videoUrl: row_data.videoUrl,
        movieTitle: row_data.movieTitle,
        movieYear: row_data.movieYear,
        // The `flicks` table does not store a separate poster column.
        // Use the backdrop as a reasonable poster fallback for now.
        moviePosterUrl: row_data.movieBackdropUrl || '',
        movieBackdropUrl: row_data.movieBackdropUrl,
        uploader: row_data.uploader,
        // Avatar URL is built from the actual userId via join
        uploaderAvatarUrl: uploaderAvatarUrl,
        caption: row_data.caption,
        likes: row_data.likes,
        comments: row_data.comments,
        timestamp: formatDistanceToNow(row_data.createdAt, { addSuffix: true }),
      };
    });

    return NextResponse.json({
      flicks: mappedRows,
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
