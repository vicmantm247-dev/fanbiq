import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { flicks } from "@/db/schema";
import { desc, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { getCloudinaryVideoThumbnailUrl } from "@/lib/cloudinary";
import { getErrorMessage } from "@/lib/utils";

interface SearchFlickMatch {
  id: string;
  movieTitle: string;
  uploader: string;
  caption: string | null;
  videoUrl: string;
  durationSeconds: number | null;
}

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("query")?.trim() || "";

    if (!query) {
      return NextResponse.json([]);
    }

    const likeTerm = `%${query.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;

    const results = (await db
      .select({
        id: flicks.id,
        movieTitle: flicks.movieTitle,
        uploader: flicks.uploader,
        caption: flicks.caption,
        videoUrl: flicks.videoUrl,
        durationSeconds: sql<number | null>`NULL`,
      })
      .from(flicks)
      .where(sql`
        ${flicks.movieTitle} ILIKE ${likeTerm}
        OR ${flicks.uploader} ILIKE ${likeTerm}
        OR ${flicks.caption} ILIKE ${likeTerm}
      `)
      .orderBy(desc(flicks.createdAt))
      .limit(20)) as SearchFlickMatch[];

    return NextResponse.json(
      results.map((flick: SearchFlickMatch) => ({
        id: flick.id,
        movieTitle: flick.movieTitle,
        uploader: flick.uploader,
        caption: flick.caption ?? "",
        videoUrl: flick.videoUrl,
        thumbnailUrl: getCloudinaryVideoThumbnailUrl(flick.videoUrl) ?? "",
        durationSeconds: null,
      })),
    );
  } catch (error) {
    logger.error("Failed to search flicks:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
