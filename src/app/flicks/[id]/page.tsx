import { notFound } from 'next/navigation';
import { db } from '@/db';
import { flicks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Share2, Heart } from 'lucide-react';
import Link from 'next/link';

interface FlickDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function FlickDetailPage({ params }: FlickDetailPageProps) {
  const { id } = await params;

  let flick;
  try {
    const result = await db
      .select()
      .from(flicks)
      .where(eq(flicks.id, id))
      .limit(1);
    flick = result[0];
  } catch (error) {
    console.error('Failed to fetch flick:', error);
  }

  if (!flick) {
    notFound();
  }

  return (
    <main className="relative w-full h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <Link href="/search">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-sm font-semibold">Flick Details</h1>
        <div className="w-[80px]" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full px-4 py-6">
          {/* Video */}
          <div className="mb-6 rounded-2xl overflow-hidden bg-black aspect-video">
            <video
              src={flick.videoUrl}
              poster={flick.movieBackdropUrl || ''}
              className="w-full h-full object-cover"
              controls
              autoPlay
              preload="metadata"
            />
          </div>

          {/* Info */}
          <div className="space-y-4">
            {/* Movie Title */}
            <div>
              <h2 className="text-2xl font-bold">{flick.movieTitle}</h2>
              {flick.movieYear && (
                <p className="text-sm text-muted-foreground">Year: {flick.movieYear}</p>
              )}
            </div>

            {/* Caption */}
            {flick.caption && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Caption</h3>
                <p className="text-sm text-muted-foreground">{flick.caption}</p>
              </div>
            )}

            {/* Uploader */}
            <div className="flex items-center gap-3 py-4 border-y border-border">
              <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                <span className="text-xs font-semibold">
                  {flick.uploader.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">@{flick.uploader}</p>
              </div>
              <Link href={`/${flick.uploader}`}>
                <Button variant="secondary" size="sm">
                  View Profile
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 py-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{flick.views}</p>
                <p className="text-xs text-muted-foreground">Views</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{flick.likes}</p>
                <p className="text-xs text-muted-foreground">Likes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{flick.comments}</p>
                <p className="text-xs text-muted-foreground">Comments</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button className="flex-1" size="lg">
                <Heart className="size-4 mr-2" />
                Like
              </Button>
              <Button variant="outline" size="lg">
                <Share2 className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
