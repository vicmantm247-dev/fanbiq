import { notFound } from 'next/navigation';
import { db } from '@/db';
import { flicks, nativeUsers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { FlickDetailClient } from '@/components/flicks/FlickDetailClient';

interface FlickDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function FlickDetailPage({ params }: FlickDetailPageProps) {
  const { id } = await params;

  let flick;
  try {
    const result = await db
      .select({ flick: flicks, userId: nativeUsers.id })
      .from(flicks)
      .leftJoin(nativeUsers, eq(flicks.uploader, nativeUsers.username))
      .where(eq(flicks.id, id))
      .limit(1);
    flick = result[0];
  } catch (error) {
    console.error('Failed to fetch flick:', error);
  }

  if (!flick) {
    notFound();
  }

  const flickData = {
    id: flick.flick.id,
    movieId: flick.flick.tmdbId?.toString() ?? undefined,
    videoUrl: flick.flick.videoUrl,
    posterUrl: flick.flick.movieBackdropUrl || undefined,
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
