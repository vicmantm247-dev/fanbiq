"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DeckControls } from "@/components/deck/DeckControls";
import { VideoCard, type Flick } from "@/components/flicks/VideoCard";
import { useLikes, useSession, useSwipe, useUndoSwipe } from "@/hooks/api";
import { useMovieDetail } from "@/components/movie/MovieDetailProvider";
import { toast } from "sonner";

interface FlickDetailClientProps {
  flick: Flick;
}

export function FlickDetailClient({ flick }: FlickDetailClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: likes } = useLikes();
  const swipeMutation = useSwipe();
  const undoSwipe = useUndoSwipe();
  const { openMovie } = useMovieDetail();

  const currentItemId = useMemo(() => flick.movieId ?? flick.id, [flick.id, flick.movieId]);

  const isLiked = useMemo(() => {
    if (!currentItemId || !likes) return false;

    return likes.some((like: any) => {
      if (like.Id !== currentItemId) return false;
      if (session?.code && like.sessionCode === session.code) return true;
      if (Array.isArray(like.likedBy) && session?.userId) {
        return like.likedBy.some((user: any) => user.userId === session.userId);
      }
      return false;
    });
  }, [currentItemId, likes, session?.code, session?.userId]);

  const swipeCurrent = useCallback(
    (direction: "left" | "right") => {
      if (!currentItemId) return;

      swipeMutation.mutate({
        itemId: currentItemId,
        direction,
        sessionCode: session?.code ?? null,
        item: {
          Id: currentItemId,
          Name: flick.movieTitle,
          OriginalTitle: flick.movieTitle,
          Overview: flick.caption,
          BlurDataURL: flick.posterUrl ?? undefined,
          likedBy: [],
        } as any,
      });
    },
    [currentItemId, flick.caption, flick.movieTitle, flick.posterUrl, session?.code, swipeMutation]
  );

  const handleToggleLike = useCallback(() => {
    if (!currentItemId) return;

    if (isLiked) {
      undoSwipe.mutate(currentItemId, {
        onSuccess: () => {
          toast.success("Removed like.");
        },
        onError: () => {
          toast.error("Could not remove like.");
        },
      });
      return;
    }

    swipeCurrent("right");
  }, [currentItemId, isLiked, swipeCurrent, undoSwipe]);

  return (
    <div className="relative w-full h-full">
      <VideoCard flick={flick} isActive={true} isFeedActive={true} />
      <div className="absolute inset-x-0 bottom-0 z-40 px-4 pb-[max(4.7rem,env(safe-area-inset-bottom))]">
        <DeckControls
          onRewind={() => {
            const movieId = flick.movieId ?? flick.id;
            if (movieId) {
              openMovie(movieId, { showLikedBy: false, sessionCode: session?.code ?? null });
            }
          }}
          onSwipeLeft={() => undefined}
          onSwipeRight={() => swipeCurrent("right")}
          onToggleLike={handleToggleLike}
          onOpenFilter={() => router.push("/search")}
          canRewind={true}
          isLiked={Boolean(isLiked)}
          rewindImageUrl={flick.movieBackdropUrl ?? flick.posterUrl}
          rewindAriaLabel={`Go back from ${flick.movieTitle}`}
          hasAppliedFilters={false}
          leftSwipesRemaining={0}
        />
      </div>
    </div>
  );
}
