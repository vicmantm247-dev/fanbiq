import type { Metadata } from 'next'
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { flicks, nativeUsers } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getAsyncRuntimeConfig } from '@/lib/server/runtime-config';
import { getCloudinaryVideoThumbnailUrl } from '@/lib/cloudinary';
import { FlickDetailClient } from '@/components/flicks/FlickDetailClient';

interface FlickDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: FlickDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const { basePath, appPublicUrl } = await getAsyncRuntimeConfig();
  const origin = appPublicUrl.startsWith('http') ? appPublicUrl : `https://${appPublicUrl}`;
  const pageUrl = new URL(`${basePath}/flicks/${id}`, origin);

  const result = await db
    .select({ flick: flicks, userId: nativeUsers.id })
    .from(flicks)
    .leftJoin(nativeUsers, eq(flicks.uploader, nativeUsers.username))
    .where(eq(flicks.id, id))
    .limit(1);

  const flick = result[0];
  if (!flick) {
    return {
      title: 'Flick not found',
      description: 'This flick could not be found.',
    };
  }

  const title = flick.flick.movieTitle?.trim() || 'fanbIQ Flick';
  const description = flick.flick.caption?.trim() || `A flick shared by ${flick.flick.uploader}`;
  const rawImage = getCloudinaryVideoThumbnailUrl(flick.flick.videoUrl) || flick.flick.movieBackdropUrl || '';
  const imageUrl = rawImage
    ? rawImage.startsWith('http')
      ? rawImage
      : new URL(rawImage, origin).toString()
    : `${origin}${basePath}/icon1.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl.toString(),
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
      type: 'article',
      siteName: 'fanbIQ',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

const VIEW_COOKIE_NAME = 'fanbiq_viewed_flicks';
const VIEW_DEDUP_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

function parseViewedFlicksCookie(value: string | undefined) {
  if (!value) return {} as Record<string, number>;
  return value.split(',').reduce<Record<string, number>>((acc, entry) => {
    const [id, ts] = entry.split('@');
    if (id && ts) {
      const parsed = Number(ts);
      if (!Number.isNaN(parsed)) {
        acc[id] = parsed;
      }
    }
    return acc;
  }, {});
}

function serializeViewedFlicksCookie(entries: Record<string, number>) {
  return Object.entries(entries)
    .slice(-20)
    .map(([id, ts]) => `${id}@${ts}`)
    .join(',');
}

export default async function FlickDetailPage({ params }: FlickDetailPageProps) {
  const { id } = await params;

  let flick;
  const cookiesStore = await cookies();
  const viewedCookie = cookiesStore.get(VIEW_COOKIE_NAME)?.value;
  const viewedFlicks = parseViewedFlicksCookie(viewedCookie);
  const now = Date.now();
  const lastViewed = viewedFlicks[id];
  const shouldIncrementView = !lastViewed || now - lastViewed > VIEW_DEDUP_WINDOW_MS;

  try {
    const result = await db
      .select({ flick: flicks, userId: nativeUsers.id })
      .from(flicks)
      .leftJoin(nativeUsers, eq(flicks.uploader, nativeUsers.username))
      .where(eq(flicks.id, id))
      .limit(1);
    flick = result[0];

    if (flick && shouldIncrementView) {
      await db
        .update(flicks)
        .set({ views: sql`COALESCE(${flicks.views}, 0) + 1` })
        .where(eq(flicks.id, id));

      viewedFlicks[id] = now;
      const serialized = serializeViewedFlicksCookie(viewedFlicks);
      cookiesStore.set({
        name: VIEW_COOKIE_NAME,
        value: serialized,
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 1 week
      });
    }
  } catch (error) {
    console.error('Failed to fetch flick:', error);
  }

  if (!flick) {
    notFound();
  }

  const flickData = {
    id: flick.flick.id,
    movieId: flick.flick.tmdbId?.toString() ?? undefined,
    movieMediaType: flick.flick.movieMediaType ?? undefined,
    videoUrl: flick.flick.videoUrl,
    posterUrl: getCloudinaryVideoThumbnailUrl(flick.flick.videoUrl) || flick.flick.movieBackdropUrl || undefined,
    moviePosterUrl: undefined,
    movieBackdropUrl: flick.flick.movieBackdropUrl || undefined,
    movieTitle: flick.flick.movieTitle,
    movieYear: flick.flick.movieYear,
    uploader: flick.flick.uploader,
    uploaderAvatarUrl: flick.userId ? `/api/user/profile-picture/${flick.userId}` : undefined,
    caption: flick.flick.caption,
    likes: flick.flick.likes,
    comments: flick.flick.comments,
    timestamp: flick.flick.createdAt?.toString() ?? "",
  };

  return (
    <main className="relative w-full h-screen bg-background text-foreground">
      <FlickDetailClient flick={flickData} />
    </main>
  );
}
