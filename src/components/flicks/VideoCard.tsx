"use client";

import { type MouseEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Pause,
  Heart,
  Trash2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { CommentsSheet, type Comment } from "@/components/flicks/CommentsSheet";
import { JoinPromptSheet } from "@/components/flicks/JoinPromptSheet";
import { useMovieDetail } from "@/components/movie/MovieDetailProvider";
import { useSwipe } from "@/hooks/api/use-swipe";
import { useFollowUser } from "@/hooks/api/use-follow-user";
import { useLikes, useSession } from "@/hooks/api";
import { toast } from "sonner";

async function trackFlickEvent(flickId: string, eventType: string, payload?: Record<string, unknown>) {
  try {
    await fetch("/api/flicks/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flickId, eventType, ...payload }),
    });
  } catch {
    // Fail silently so personalization never blocks the UI.
  }
}

export interface Flick {
  id: string;
  movieId?: string;
  movieMediaType?: 'movie' | 'tv';
  videoUrl: string | null;
  posterUrl?: string;
  moviePosterUrl?: string;
  movieBackdropUrl?: string;
  movieTitle: string;
  movieYear: number;
  uploader: string;
  uploaderAvatarUrl?: string;
  caption: string;
  likes: number;
  comments: number;
  timestamp: string;
  isFollowedByCurrentUser?: boolean;
}

interface VideoCardProps {
  flick: Flick;
  isActive: boolean;
  isFeedActive?: boolean;
  initialIsFollowed?: boolean;
  onFollowStatusChange?: (username: string, isFollowing: boolean) => void;
  profileButtonAction?: {
    label: string;
    onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  };
  hideProfileButton?: boolean;
  onDelete?: (id: string) => void;
}

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

export function VideoCard({ flick, isActive, isFeedActive, initialIsFollowed = false, onFollowStatusChange, profileButtonAction, hideProfileButton, onDelete }: VideoCardProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [liked, setLiked] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [followed, setFollowed] = useState(initialIsFollowed);
  const [saved, setSaved] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [commentsActive, setCommentsActive] = useState(false);
  const [likeCount, setLikeCount] = useState(flick.likes);
  const [heartBurst, setHeartBurst] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(Boolean(flick.videoUrl));

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [showJoinPrompt, setShowJoinPrompt] = useState(false);
  const [hasSkippableActivity, setHasSkippableActivity] = useState(false);
  const [skipRecorded, setSkipRecorded] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  const { openMovie } = useMovieDetail();
  const { mutateAsync: addToLikes } = useSwipe();
  const { data: likes } = useLikes();
  const { data: session } = useSession();
  const followMutation = useFollowUser(flick.uploader);

  useEffect(() => {
    setFollowed(initialIsFollowed);
  }, [initialIsFollowed]);

  useEffect(() => {
    setSkipRecorded(false);
    setHasCompleted(false);
    setHasSkippableActivity(false);
  }, [flick.id]);

  useEffect(() => {
    if (isActive && isFeedActive !== false) {
      setHasSkippableActivity(true);
      return;
    }

    if (!isActive && hasSkippableActivity && !skipRecorded) {
      const video = videoRef.current;
      const watchedSeconds = video?.currentTime ?? 0;

      if (!hasCompleted && watchedSeconds < 3) {
        void trackFlickEvent(flick.id, "flick_skipped", {
          movieId: flick.movieId,
          movieTitle: flick.movieTitle,
          uploader: flick.uploader,
        });
        setSkipRecorded(true);
      }

      setHasSkippableActivity(false);
    }
  }, [flick.id, flick.movieId, flick.movieTitle, flick.uploader, hasCompleted, hasSkippableActivity, isActive, isFeedActive, skipRecorded]);

  useEffect(() => {
    setShowJoinPrompt(false);
    setPlaying(false);
    setShowControls(false);
  }, [flick.id]);

  useEffect(() => {
    const itemId = flick.movieId ?? flick.id;
    if (!itemId) return;
    if (!likes) return;

    const isLiked = likes.some((l: any) => {
      if (l.Id !== itemId) return false;
      // If the like belongs to the same session, consider it liked
      if (session?.code && l.sessionCode === session.code) return true;
      // Otherwise, check if current user is among likedBy
      if (Array.isArray(l.likedBy) && session?.userId) {
        return l.likedBy.some((u: any) => u.userId === session.userId);
      }
      return false;
    });

    setInWatchlist(Boolean(isLiked));
  }, [likes, session, flick.movieId, flick.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive && isFeedActive !== false) {
      setIsVideoLoading(Boolean(flick.videoUrl));
      const p = video.play();
      if (p !== undefined) {
        p.then(() => {
          setPlaying(true);
          setIsVideoLoading(false);
          void trackFlickEvent(flick.id, "flick_viewed", {
            movieId: flick.movieId,
            movieTitle: flick.movieTitle,
            uploader: flick.uploader,
          });
        }).catch(() => {
          setPlaying(false);
          setIsVideoLoading(false);
        });
      }
    } else {
      video.pause();
      video.currentTime = 0;
      setPlaying(false);
      setCommentsOpen(false);
    }

    return () => {
      const cleanupVideo = videoRef.current;
      if (cleanupVideo) {
        cleanupVideo.pause();
        cleanupVideo.currentTime = 0;
      }
    };
  }, [isActive, isFeedActive, flick.videoUrl]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const video = videoRef.current;
      if (!video) return;
      if (document.hidden) {
        video.pause();
        setPlaying(false);
      }
    };

    const handlePageHide = () => {
      const video = videoRef.current;
      if (!video) return;
      video.pause();
      setPlaying(false);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);

  useEffect(() => {
    if (!showControls) return;
    const t = setTimeout(() => setShowControls(false), 2000);
    return () => clearTimeout(t);
  }, [showControls]);

  const togglePlay = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    if (commentsOpen) return;
    const video = videoRef.current;
    if (!video || !flick.videoUrl) return;
    if (video.paused) {
      if (video.muted) {
        video.muted = false;
      }
      video.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setPlaying(false);
    }
    setShowControls(true);
  };

  const handleOpenMovie = () => {
    if (!flick.movieId) {
      toast.error("Movie details are not available for this flick.", {
        position: "top-right",
      });
      return;
    }
    openMovie(flick.movieId, {
      mediaType: flick.movieMediaType,
    });
  };

  const handleFollow = (nextState: boolean) => {
    setFollowed(nextState);
    onFollowStatusChange?.(flick.uploader, nextState);
    void trackFlickEvent(flick.id, "uploader_followed", {
      uploader: flick.uploader,
    });
  };

  const handleAddToLikes = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!flick.movieId && !flick.id) {
      toast.error("Could not add this item to your likes.", {
        position: "top-right",
      });
      return;
    }

    const itemId = flick.movieId ?? flick.id;

    const promise = addToLikes({
      itemId,
      direction: "right",
      item: {
        Id: itemId,
        Name: flick.movieTitle,
        OriginalTitle: flick.movieTitle,
      },
    });

    void trackFlickEvent(flick.id, "flick_liked", {
      movieId: itemId,
      movieTitle: flick.movieTitle,
      uploader: flick.uploader,
    });

    void trackFlickEvent(flick.id, "flick_added_to_likes_list", {
      movieId: itemId,
      movieTitle: flick.movieTitle,
      uploader: flick.uploader,
    });

    toast.promise(promise, {
      loading: "Adding item to like list...",
      success: "Item added to like list.",
      error: "Unable to add this item to your like list.",
      position: "top-right",
    });

    try {
      const data = await promise;
      if (data?.isMatch) {
        const matchedItem = {
          Id: itemId,
          Name: flick.movieTitle,
          likedBy: data.likedBy,
          PosterUrl: flick.moviePosterUrl || flick.movieBackdropUrl || flick.posterUrl || undefined,
          BlurDataURL: undefined,
        };
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("fanbiq:match", { detail: matchedItem }));
        }
      }
    } catch (err) {
      // toast.promise already shows the error; nothing extra to do here
    }
  };

  const iconClass = "drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]";

  const handleContextMenu = (e: MouseEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      onClick={togglePlay}
      onContextMenu={handleContextMenu}
      className={cn(
        "relative h-full w-full overflow-hidden bg-black text-white cursor-pointer select-none",
        !isActive && "opacity-90"
      )}
    >
      {/* ── Video layer ── */}
      <div className="absolute inset-0 bg-black flex items-center justify-center bottom-[55px]">
        {flick.videoUrl ? (
          <video
            ref={videoRef}
            src={flick.videoUrl}
            className="w-full h-auto object-cover"
            playsInline
            preload="auto"
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onLoadedData={() => setIsVideoLoading(false)}
            onCanPlay={() => setIsVideoLoading(false)}
            onWaiting={() => setIsVideoLoading(true)}
            onEnded={() => {
              setPlaying(false);
              setHasCompleted(true);
              if (videoRef.current) {
                videoRef.current.pause();
              }
              void trackFlickEvent(flick.id, "flick_watch_completed", {
                movieId: flick.movieId,
                movieTitle: flick.movieTitle,
                uploader: flick.uploader,
              });
              if (!session?.userId && !session?.isGuest) {
                setShowJoinPrompt(true);
              }
            }}
            onError={() => setIsVideoLoading(false)}
            onPlay={() => {
              setShowJoinPrompt(false);
              if (!playing) {
                setPlaying(true);
              }
            }}
            onPause={() => {
              if (playing) {
                setPlaying(false);
              }
            }}
          />
        ) : flick.posterUrl ? (
          <img
            src={flick.posterUrl}
            alt={flick.movieTitle}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[#1a0520] via-[#0a1a08] to-[#050508]" />
        )}

        {flick.videoUrl && isVideoLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <Spinner className="size-9 text-white/80" />
          </div>
        )}
      </div>

      {/* ── Scrim ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/22 to-black/18 pointer-events-none" />

      {/* ── Heart burst ── */}
      {heartBurst && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <Heart className="size-24 text-white fill-white animate-ping opacity-80" />
        </div>
      )}

      {/* ── Centre play/pause flash ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        <div
          className={cn(
            "rounded-full p-4 transition-opacity duration-200",
            showControls ? "opacity-100" : "opacity-0"
          )}
        >
          {playing ? <Pause className="size-8 text-white" /> : <Play className="size-8 text-white" />}
        </div>
      </div>

      {/* Right action rail removed per redesign: actions (like/comments/share/save) are hidden */}



      {/* ─────────────────────────────────────────────────────────────────────
          Bottom-left: uploader row + caption
          pb-12 doubles the original pb-6 breathing room below the text block.
          bottom value raised from 72px to account for the taller offset.
      ───────────────────────────────────────────────────────────────────── */}
      <div className="absolute bottom-[110px] left-0 right-0 px-4 pb-20 z-30">
        <div className="flex items-center gap-1 mb-2.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/${flick.uploader}`);
            }}
            className="shrink-0 hover:opacity-80 transition-opacity"
            aria-label={`View ${flick.uploader}'s profile`}
          >
            <Avatar className="size-7 shrink-0 border border-white/25">
              <AvatarImage src={flick.uploaderAvatarUrl} alt={flick.uploader} className="object-cover" />
              <AvatarFallback className="text-[10px] font-bold uppercase bg-white/10 text-white">
                {flick.uploader[0]}
              </AvatarFallback>
            </Avatar>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/${flick.uploader}`);
            }}
            className="text-white text-[13px] font-semibold leading-tight truncate min-w-0 drop-shadow hover:underline transition-colors"
          >
            @{flick.uploader}
          </button>

          {!hideProfileButton && (
            profileButtonAction ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  profileButtonAction.onClick(e);
                }}
                className="shrink-0 ml-2 rounded-full px-3 py-1 text-[11px] font-semibold bg-white text-black transition-opacity active:opacity-70"
              >
                {profileButtonAction.label}
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const nextState = !followed;
                  handleFollow(nextState);
                  followMutation.mutate(followed, {
                    onError: () => {
                      setFollowed(!nextState);
                      onFollowStatusChange?.(flick.uploader, !nextState);
                    },
                  });
                }}
                disabled={followMutation.isPending}
                className="shrink-0 ml-2 rounded-full px-3 py-1 text-[11px] font-semibold bg-white text-black transition-opacity active:opacity-70 disabled:cursor-not-allowed disabled:opacity-50"
                aria-pressed={followed}
              >
                {followed ? "Following" : "Follow"}
              </button>
            )
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsCaptionExpanded((prev) => !prev);
          }}
          className="mt-1 block max-w-full text-left"
          aria-expanded={isCaptionExpanded}
        >
          <p
            className={cn(
              "overflow-hidden text-white/88 text-[13px] leading-snug drop-shadow transition-[max-height,opacity] duration-300 ease-out",
              isCaptionExpanded ? "line-clamp-none max-h-24 opacity-100" : "line-clamp-1 max-h-5 opacity-90"
            )}
          >
            {flick.caption}
          </p>
        </button>
      </div>

      {/* ── Comments Sheet ── */}
      <CommentsSheet
        flick={flick}
        totalCount={flick.comments}
        comments={[]}
        open={commentsOpen}
        onClose={() => {
          setCommentsOpen(false);
          setCommentsActive(false);
        }}
      />
      <JoinPromptSheet open={showJoinPrompt} onOpenChange={setShowJoinPrompt} />
    </div>
  );
}
