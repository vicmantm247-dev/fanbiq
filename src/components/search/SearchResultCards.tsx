'use client';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { FlickPreviewCard } from "@/components/flicks/FlickPreviewCard";

export interface SearchMovieResult {
  id: string;
  title: string;
  year: number;
  rating: string;
  runtime: string;
  genres: string[];
  synopsis: string;
  posterUrl: string;
}

export interface SearchFlickResult {
  id: string;
  movieTitle: string;
  uploader: string;
  caption: string;
  /**
   * videoUrl — direct video source (mp4).
   * thumbnailUrl is kept as a poster frame fallback while the video loads.
   */
  videoUrl: string;
  thumbnailUrl: string;
  duration: string;
}

export interface SearchUserResult {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  followers: number;
  videos: number;
  avatarInitials: string;
  badges: string[];
  profilePicUrl?: string;
}

const formatCount = (value: number) => {
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(value);
};

// ─────────────────────────────────────────────────────────────────────────────
// SearchMovieCard — unchanged
// ─────────────────────────────────────────────────────────────────────────────
export function SearchMovieCard({ movie }: { movie: SearchMovieResult }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative h-44 min-w-[140px] overflow-hidden rounded-3xl bg-slate-950/60">
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/95 to-transparent" />
        </div>

        <div className="flex flex-1 flex-col justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="secondary">{movie.year}</Badge>
              <Badge variant="outline">{movie.rating}</Badge>
              <Badge variant="outline">{movie.runtime}</Badge>
            </div>
            <CardTitle className="text-lg sm:text-xl">{movie.title}</CardTitle>
            <CardDescription className="mt-1 text-sm text-muted-foreground line-clamp-3">
              {movie.synopsis}
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {movie.genres.slice(0, 3).map((genre) => (
              <Badge key={genre} variant="outline">
                {genre}
              </Badge>
            ))}
            <Button size="sm" variant="secondary" className="ml-auto">
              <Play className="size-4 mr-2" /> Watch
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SearchFlickCard
//
// Design method from discovery-feed-1.html:
//
//  • `card` wrapper — transparent, no border, no background. Atmosphere = media.
//  • `card-video-wrap` — the only element with border-radius + overflow:hidden.
//    The <video> fills 100% width; its intrinsic aspect ratio drives height,
//    producing naturally varying card heights in the masonry column.
//  • Overlays inside the wrap only: three-dot menu (top-right), duration badge
//    (bottom-right, above the progress bar), progress bar (bottom edge).
//    NO likes, NO comments on the card face.
//  • Label block sits OUTSIDE the wrap — movie source (Syne bold) on top,
//    caption (DM Sans muted) below, just like `.card-label` in the HTML.
//  • Uploader row below the label, also outside the clip.
//  • IntersectionObserver: play when ≥25% visible, pause when out of view.
//  • Tap the video to toggle mute; a transient pill overlay shows state.
// ─────────────────────────────────────────────────────────────────────────────
export function SearchFlickCard({
  flick,
  animationDelay = 0,
}: {
  flick: SearchFlickResult;
  animationDelay?: number;
}) {
  return (
    <FlickPreviewCard
      flick={{
        id: flick.id,
        movieTitle: flick.movieTitle,
        videoUrl: flick.videoUrl,
        posterUrl: flick.thumbnailUrl,
      }}
      animationDelay={animationDelay}
    />
  );
}

export function SearchUserCard({ user }: { user: SearchUserResult }) {
  const router = useRouter();
  const [imageLoading, setImageLoading] = useState(true);
  
  const handleNavigateToProfile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/${user.username}`);
  };

  return (
    <div 
      className="flex gap-4 mb-4 rounded-lg p-3 transition-colors cursor-pointer bg-card hover:bg-card/80"
      onClick={handleNavigateToProfile}
    >
      <div className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden">
        {user.profilePicUrl ? (
          <>
            {imageLoading && <Skeleton className="w-16 h-16" />}
            <Image
              src={user.profilePicUrl}
              alt={user.displayName}
              fill
              className="object-cover rounded-lg"
              onLoadingComplete={() => setImageLoading(false)}
            />
          </>
        ) : (
          <Avatar className="w-16 h-16 rounded-lg">
            <AvatarFallback className="text-2xl font-semibold rounded-lg">{user.avatarInitials}</AvatarFallback>
          </Avatar>
        )}
      </div>

      <div className="flex flex-col justify-between flex-1 min-w-0">
        <div>
          <div className="mb-1">
            <h3 className="font-bold line-clamp-1 text-foreground">{user.displayName}</h3>
            <p className="text-xs text-muted-foreground">@{user.username}</p>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2">{user.bio}</p>
        </div>
      </div>
    </div>
  );
}