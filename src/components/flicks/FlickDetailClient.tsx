"use client";

import { useCallback, useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DeckControls } from "@/components/deck/DeckControls";
import { VideoCard, type Flick } from "@/components/flicks/VideoCard";
import { useLikes, useSession, useSwipe, useUndoSwipe } from "@/hooks/api";
import { useMovieDetail } from "@/components/movie/MovieDetailProvider";
import { toast } from "sonner";
import { ShareSheet } from "@/components/ui/share-sheet";
import { useRuntimeConfig } from "@/lib/runtime-config";

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

  const { basePath: rcBasePath } = useRuntimeConfig();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    if (!flick?.id) return;
    if (typeof window === "undefined") return;
    setShareUrl(`${window.location.origin}${rcBasePath}/flicks/${flick.id}`);
  }, [flick?.id, rcBasePath]);

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

  const isUploadOwner = Boolean(flick.uploader && session?.userName && flick.uploader === session.userName);

  const handleDeleteFlick = async () => {
    try {
      const res = await fetch(`/api/flicks/${encodeURIComponent(flick.id)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || "Unable to delete flick.");
      toast.success("Flick deleted successfully.");
      setIsShareOpen(false);
      router.push("/");
    } catch (err) {
      toast.error((err as Error).message || "Could not delete this flick.");
    }
  };

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
          onOpenFilter={() => setIsShareOpen(true)}
          canRewind={true}
          isLiked={Boolean(isLiked)}
          rewindImageUrl={flick.movieBackdropUrl ?? flick.posterUrl}
          rewindAriaLabel={`Go back from ${flick.movieTitle}`}
          hasAppliedFilters={false}
          leftSwipesRemaining={0}
        />
      </div>
      <ShareSheet
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        onOpenFilter={() => router.push("/search")}
        url={shareUrl}
        title={flick.movieTitle ?? "fanbiQ"}
        uploader={flick.uploader}
        currentUsername={session?.userName ?? null}
        onDelete={isUploadOwner ? handleDeleteFlick : undefined}
        hideTrigger
      />
    </div>
  );
}
