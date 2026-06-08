import { NextRequest, NextResponse } from 'next/server';
import { desc, sql, arrayContains } from 'drizzle-orm';
import { formatDistanceToNow } from 'date-fns';
import { db } from '@/db';
import { flicks, type FlickRow } from '@/db/schema';

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
      .select()
      .from(flicks)
      .orderBy(desc(flicks.createdAt))
      .limit(pageLimit)
      .offset(offset);

    const rows = (tag
      ? await baseQuery.where(arrayContains(flicks.tags, [tag]))
      : await baseQuery) as FlickRow[];

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(flicks);

    const mappedRows = rows.map((row) => ({
      id: row.id,
      movieId: row.tmdbId ? String(row.tmdbId) : undefined,
      videoUrl: row.videoUrl,
      movieTitle: row.movieTitle,
      movieYear: row.movieYear,
      // The `flicks` table does not store a separate poster column.
      // Use the backdrop as a reasonable poster fallback for now.
      moviePosterUrl: row.movieBackdropUrl || '',
      movieBackdropUrl: row.movieBackdropUrl,
      uploader: row.uploader,
      // Avatar URL is not stored on the `flicks` row; return empty string
      // (consider joining `UserProfile.image` in future to populate this).
      uploaderAvatarUrl: '',
      caption: row.caption,
      likes: row.likes,
      comments: row.comments,
      timestamp: formatDistanceToNow(row.createdAt, { addSuffix: true }),
    }));

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
