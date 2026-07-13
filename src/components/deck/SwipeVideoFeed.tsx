"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DeckControls } from "@/components/deck/DeckControls";
import { MatchOverlay } from "@/components/deck/MatchOverlay";
import { VideoCard, type Flick } from "@/components/flicks/VideoCard";
import { ShareSheet } from "@/components/ui/share-sheet";
import { useSession, useStats, useSwipe, useLikes, useUndoSwipe } from "@/hooks/api";
import { useMovieDetail } from "@/components/movie/MovieDetailProvider";
import { toast } from "sonner";
import { cn, parseJsonResponse } from "@/lib/utils";
import { useRuntimeConfig } from "@/lib/runtime-config";
import { ChevronUp, ChevronDown, Loader2 } from "lucide-react";

interface SwipeVideoFeedProps {
  isActive?: boolean;
}

export function SwipeVideoFeed({ isActive = true }: SwipeVideoFeedProps) {
  const pathname = usePathname();
  const isRouteActive = pathname === "/";
  const isFeedActive = isActive && isRouteActive;

  const containerRef = useRef<HTMLDivElement>(null);
  const [flicks, setFlicks] = useState<Flick[]>([]);
  const [followedAuthors, setFollowedAuthors] = useState<Record<string, boolean>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [matchedItem, setMatchedItem] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  const { data: session } = useSession();
  const sessionCode = session?.code || null;
  const sessionSettings = session?.settings;
  const { data: stats } = useStats();
  const { data: likes } = useLikes();
  const undoSwipe = useUndoSwipe();
  const { openMovie } = useMovieDetail();

  const swipeMutation = useSwipe();

  const currentFlick = flicks[activeIndex];
  const currentUsername = session?.userName ?? null;
  const isUploadOwner = Boolean(currentFlick?.uploader && currentUsername && currentFlick.uploader === currentUsername);

  const leftSwipesRemaining = sessionSettings?.maxLeftSwipes ? Math.max(0, sessionSettings.maxLeftSwipes - (stats?.mySwipes.left || 0)) : undefined;
  const rightSwipesRemaining = sessionSettings?.maxRightSwipes ? Math.max(0, sessionSettings.maxRightSwipes - (stats?.mySwipes.right || 0)) : undefined;

  const loadFlicks = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/flicks?page=${pageNum}&limit=10`, { credentials: "include" });
      const data = await parseJsonResponse(response as unknown as Response);
      if (!response.ok) {
        if (response.status === 401) {
          setFlicks([]);
          setHasMore(false);
          return;
        }
        throw new Error(data?.error || "Failed to load flicks");
      }
      setFlicks((prev) => (pageNum === 1 ? data.flicks : [...prev, ...data.flicks]));
      setHasMore(Boolean(data.hasMore));
      setPage(pageNum);
    } catch (error) {
      console.error("Could not load flicks", error);
      toast.error("Could not load video feed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setFollowedAuthors((prev) => {
      const next = { ...prev };
      flicks.forEach((flick) => {
        if (!flick.uploader) return;
        if (!(flick.uploader in next)) {
          next[flick.uploader] = flick.isFollowedByCurrentUser ?? false;
        }
      });
      return next;
    });
  }, [flicks]);

  useEffect(() => {
    loadFlicks(1);
  }, [loadFlicks]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onScroll = () => {
      const scrollTop = container.scrollTop;
      const cardHeight = container.clientHeight;
      if (cardHeight === 0) return;
      const index = Math.round(scrollTop / cardHeight);
      setActiveIndex(Math.max(0, Math.min(index, Math.max(flicks.length - 1, 0))));

      if (index === flicks.length - 2 && hasMore && !loading) {
        loadFlicks(page + 1);
      }
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => container.removeEventListener("scroll", onScroll);
  }, [flicks.length, hasMore, loading, loadFlicks, page]);

  const { basePath: rcBasePath } = useRuntimeConfig();

  useEffect(() => {
    if (!currentFlick) return;
    const origin = window.location.origin;
    setShareUrl(`${origin}${rcBasePath}/flicks/${currentFlick.id}`);
  }, [currentFlick, rcBasePath]);

  const handleDeleteFlick = async () => {
    if (!currentFlick) return;

    try {
      const res = await fetch(`/api/flicks/${encodeURIComponent(currentFlick.id)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      const result = await res.json();
      if (!res.ok || result.error) {
        throw new Error(result.error || "Unable to delete flick.");
      }

      setFlicks((prev) => prev.filter((flick) => flick.id !== currentFlick.id));
      setIsShareOpen(false);
      toast.success("Flick deleted successfully.");
    } catch (error) {
      toast.error((error as Error).message || "Could not delete this flick.");
    }
  };

  useEffect(() => {
    if (isFeedActive) return;

    const container = containerRef.current;
    if (!container) return;

    const videos = container.querySelectorAll<HTMLVideoElement>("video");
    videos.forEach((video) => {
      video.pause();
    });
  }, [isFeedActive]);

  const scrollTo = useCallback((index: number) => {
    const container = containerRef.current;
    if (!container) return;
    const target = Math.min(Math.max(index, 0), flicks.length - 1);
    container.scrollTo({ top: target * container.clientHeight, behavior: "smooth" });
  }, [flicks.length]);

  const getSwipeItem = (flick: Flick) => {
    const itemId = flick.movieId ?? flick.id;
    return {
      Id: itemId,
      Name: flick.movieTitle,
      Overview: flick.caption,
      BlurDataURL: flick.posterUrl ?? undefined,
      likedBy: [],
    };
  };

  const swipeCurrent = (direction: "left" | "right") => {
    if (!currentFlick) return;
    if (direction === "right" && rightSwipesRemaining === 0) {
      toast.error("No likes left", { description: "Max number of likes reached" });
      return;
    }
    if (direction === "left" && leftSwipesRemaining === 0) {
      toast.error("No dislikes left", { description: "Max number of dislikes reached" });
      return;
    }

    const itemId = currentFlick.movieId ?? currentFlick.id;
    const payload = {
      itemId,
      direction,
      item: direction === "right" ? getSwipeItem(currentFlick) : undefined,
      sessionCode,
    } as const;

    swipeMutation.mutate(payload, {
      onSuccess: (data) => {
        if (data.isMatch) {
          setMatchedItem({
            ...(currentFlick.movieId ? { Id: currentFlick.movieId, Name: currentFlick.movieTitle } : { Id: currentFlick.id, Name: currentFlick.movieTitle }),
            likedBy: data.likedBy,
            BlurDataURL: currentFlick.posterUrl,
            ...(currentFlick.movieBackdropUrl ? { movieBackdropUrl: currentFlick.movieBackdropUrl } : {}),
            ...(currentFlick.moviePosterUrl ? { moviePosterUrl: currentFlick.moviePosterUrl } : {}),
            ...(currentFlick.posterUrl ? { PosterUrl: currentFlick.posterUrl } : {}),
          });
        }
      },
      onError: () => {
        toast.error("Could not save swipe. Please try again.");
      },
    });

    scrollTo(activeIndex + 1);
  };

  const currentItemId = currentFlick?.movieId ?? currentFlick?.id;

  const currentLiked = useMemo(() => {
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

  const handleToggleLike = useCallback(() => {
    if (!currentItemId) return;
    if (currentLiked) {
      undoSwipe.mutate(currentItemId, {
        onSuccess: () => {
          toast.success("Removed movie from like list.");
        },
        onError: () => {
          toast.error("Could not remove movie from like list.");
        },
      });
      return;
    }
    swipeCurrent("right");
  }, [currentItemId, currentLiked, swipeCurrent, undoSwipe]);

  const openActiveMovie = useCallback(() => {
    if (!currentFlick) return;
    const movieId = currentFlick.movieId ?? currentFlick.id;
    openMovie(movieId, { showLikedBy: false, sessionCode });
  }, [currentFlick, openMovie, sessionCode]);

  const hasAppliedFilters = false;

  return (
    <div className="relative w-full h-full bg-black">
      <div
        ref={containerRef}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {loading && flicks.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center bg-black">
            <Loader2 className="size-8 text-white/50 animate-spin" />
          </div>
        ) : (
          flicks.map((flick, index) => (
            <div
              key={flick.id}
              className="w-full snap-start"
              style={{ height: "100%" }}
            >
              <VideoCard
                flick={flick}
                isActive={activeIndex === index}
                isFeedActive={isFeedActive}
                initialIsFollowed={followedAuthors[flick.uploader] ?? false}
                onFollowStatusChange={(username, isFollowing) => {
                  setFollowedAuthors((prev) => ({ ...prev, [username]: isFollowing }));
                }}
              />
            </div>
          ))
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(4.7rem,env(safe-area-inset-bottom))]">
        <DeckControls
          onRewind={openActiveMovie}
          onSwipeLeft={() => swipeCurrent("left")}
          onSwipeRight={() => swipeCurrent("right")}
          onToggleLike={handleToggleLike}
          onOpenFilter={() => setIsShareOpen(true)}
          canRewind={Boolean(currentFlick)}
          isLiked={Boolean(currentLiked)}
          rewindImageUrl={currentFlick?.movieBackdropUrl ?? currentFlick?.moviePosterUrl}
          rewindAriaLabel={currentFlick ? `Open details for ${currentFlick.movieTitle}` : "Open movie details"}
          hasAppliedFilters={hasAppliedFilters}
          leftSwipesRemaining={leftSwipesRemaining}
          rightSwipesRemaining={rightSwipesRemaining}
        />
      </div>

      <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-2 pointer-events-none">
        {flicks.map((_, i) => (
          <div
            key={i}
            className={cn(
              "rounded-full transition-all duration-200 pointer-events-auto",
              i === activeIndex ? "w-1 h-4 bg-white" : "w-1 h-1 bg-white/30"
            )}
          />
        ))}
      </div>

      <div className="absolute right-3 bottom-32 hidden md:flex flex-col gap-2 pointer-events-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => scrollTo(activeIndex - 1)}
          disabled={activeIndex === 0}
          className="rounded-full bg-black/40 p-1.5 text-white/70 hover:text-white hover:bg-black/60 transition-all disabled:opacity-20"
          aria-label="Previous flick"
        >
          <ChevronUp className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => scrollTo(activeIndex + 1)}
          disabled={activeIndex >= flicks.length - 1}
          className="rounded-full bg-black/40 p-1.5 text-white/70 hover:text-white hover:bg-black/60 transition-all disabled:opacity-20"
          aria-label="Next flick"
        >
          <ChevronDown className="size-4" />
        </Button>
      </div>

      <MatchOverlay
        item={matchedItem}
        sessionCode={sessionCode}
        onClose={() => setMatchedItem(null)}
      />
      <ShareSheet
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        onOpenFilter={() => setIsShareOpen(false)}
        url={shareUrl}
        title={currentFlick?.movieTitle ?? "fanbiQ"}
        uploader={currentFlick?.uploader}
        currentUsername={currentUsername}
        onDelete={isUploadOwner ? handleDeleteFlick : undefined}
        hideTrigger
      />
    </div>
  );
}
