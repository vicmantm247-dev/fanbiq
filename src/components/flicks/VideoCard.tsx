"use client";

import { type MouseEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Pause,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Plus,
  Check,
  Trash2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { CommentsSheet, type Comment } from "@/components/flicks/CommentsSheet";
import { useMovieDetail } from "@/components/movie/MovieDetailProvider";
import { useSwipe } from "@/hooks/api/use-swipe";
import { useLikes, useSession } from "@/hooks/api";
import { toast } from "sonner";

export interface Flick {
  id: string;
  movieId?: string;
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
}

interface VideoCardProps {
  flick: Flick;
  isActive: boolean;
  isFeedActive?: boolean;
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

export function VideoCard({ flick, isActive, isFeedActive, profileButtonAction, hideProfileButton, onDelete }: VideoCardProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [liked, setLiked] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [commentsActive, setCommentsActive] = useState(false);
  const [likeCount, setLikeCount] = useState(flick.likes);
  const [heartBurst, setHeartBurst] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);

  const [commentsOpen, setCommentsOpen] = useState(false);

  const { openMovie } = useMovieDetail();
  const { mutateAsync: addToLikes } = useSwipe();
  const { data: likes } = useLikes();
  const { data: session } = useSession();

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
      const p = video.play();
      if (p !== undefined) p.then(() => setPlaying(true)).catch(() => setPlaying(false));
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
  }, [isActive, isFeedActive]);

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
    openMovie(flick.movieId);
  };

  const handleAddToLikes = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!flick.movieId && !flick.id) {
      toast.error("Could not add this movie to your likes.", {
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

    toast.promise(promise, {
      loading: "Adding movie to like list...",
      success: "Movie added to like list.",
      error: "Unable to add this movie to your like list.",
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

  return (
    <div
      onClick={togglePlay}
      className={cn(
        "relative h-full w-full overflow-hidden bg-black text-white cursor-pointer select-none",
        !isActive && "opacity-90"
      )}
    >
      {/* ── Video layer ── */}
      <div className="absolute inset-0 bg-black flex items-start justify-center">
        {flick.videoUrl ? (
          <video
            ref={videoRef}
            src={flick.videoUrl}
            className="w-full h-full object-cover"
            loop
            playsInline
            preload="auto"
            poster={flick.posterUrl}
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
            "rounded-full bg-black/50 p-4 transition-opacity duration-200",
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
            ) : !followed ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFollowed(true);
                }}
                className="shrink-0 ml-2 rounded-full px-3 py-1 text-[11px] font-semibold bg-white text-black transition-opacity active:opacity-70"
              >
                + Follow
              </button>
            ) : (
              <span className="shrink-0 ml-2 rounded-full px-3 py-1 text-[11px] font-medium bg-white/10 border border-white/18 text-white/55">
                Following
              </span>
            )
          )}
        </div>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(flick.id);
            }}
            className="absolute top-3 right-3 z-40 rounded-full bg-black/60 p-2 text-white transition hover:bg-black"
            aria-label="Delete flick"
          >
            <Trash2 className="size-4" />
          </button>
        )}

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
    </div>
  );
}