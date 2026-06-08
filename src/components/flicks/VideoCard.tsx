"use client";

import { type MouseEvent, useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Plus,
  Check,
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
}

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

const DUMMY_COMMENTS: Comment[] = [
  {
    id: "c1",
    userId: "u_hae",
    username: "hae_sung",
    avatarColor: "#c8ff00",
    isCreator: true,
    text: "For everyone asking — yes, the song at the end is \"Decisions\" by Hadestown. It ruins me every time 🎵",
    likes: 847,
    timestamp: "3d",
    replies: [
      {
        id: "r1",
        userId: "u_cine",
        username: "cinephile_max",
        avatarColor: "#a78bfa",
        text: "Thank you!! I've been looking for this for days",
        timestamp: "3d",
      },
    ],
    replyCount: 34,
  },
  {
    id: "c2",
    userId: "u_bella",
    username: "bella_discourse",
    avatarColor: "#fb7185",
    text: "The way Celine's face completely breaks in those last 10 seconds... Celine Song is a genius. This film should've won everything.",
    likes: 412,
    timestamp: "2d",
  },
  {
    id: "c3",
    userId: "u_sand",
    username: "sandworm_fan",
    avatarColor: "#60a5fa",
    text: "I watched this with my ex. We cried together. We broke up 2 weeks later. This movie knew something we didn't.",
    likes: 2100,
    timestamp: "1d",
    replyCount: 89,
  },
  {
    id: "c4",
    userId: "u_paul",
    username: "paulhunham",
    avatarColor: "#34d399",
    text: "People keep comparing this to Before Sunrise but Past Lives hits different because it's about all the lives you chose NOT to live.",
    likes: 634,
    timestamp: "20h",
  },
  {
    id: "c5",
    userId: "u_movie",
    username: "movielogic99",
    avatarColor: "#f97316",
    text: "Just found fanbiQ through this clip and I've already added 6 movies to my watchlist. What is this app 😭",
    likes: 291,
    timestamp: "8h",
  },
];

export function VideoCard({ flick, isActive, isFeedActive }: VideoCardProps) {
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
      video.muted = true;
      const p = video.play();
      if (p !== undefined) p.then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      video.pause();
      video.currentTime = 0;
      setPlaying(false);
      setCommentsOpen(false);
    }
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
          window.dispatchEvent(new CustomEvent("swiparr:match", { detail: matchedItem }));
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
      <div className="absolute inset-0 bg-black flex items-center justify-center">
        {flick.videoUrl ? (
          <video
            ref={videoRef}
            src={flick.videoUrl}
            className="block max-h-full max-w-full h-auto w-auto object-contain"
            loop
            playsInline
            preload="auto"
            poster={flick.posterUrl}
          />
        ) : flick.posterUrl ? (
          <img
            src={flick.posterUrl}
            alt={flick.movieTitle}
            className="max-h-full max-w-full h-auto w-auto object-contain"
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

      {/* ─────────────────────────────────────────────────────────────────────
          Right action rail
      ───────────────────────────────────────────────────────────────────── */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-30">

        {/* Like */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setLiked((v) => !v);
            setLikeCount((c) => (liked ? c - 1 : c + 1));
          }}
          className="flex flex-col items-center gap-1"
          aria-label={liked ? "Unlike" : "Like"}
        >
          <Heart
            className={cn(
              "size-7 transition-all",
              iconClass,
              liked ? "text-red-400 fill-red-400 scale-110" : "text-white"
            )}
          />
          <span className="text-white/80 text-[11px] font-medium drop-shadow-sm">
            {formatCount(likeCount)}
          </span>
        </button>

        {/* Comments */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCommentsActive((v) => !v);
            setCommentsOpen(true);
          }}
          className="flex flex-col items-center gap-1"
          aria-label="Comments"
        >
          <MessageCircle
            className={cn(
              "size-7 transition-colors",
              iconClass,
              commentsActive ? "text-white" : "text-white"
            )}
          />
          <span className="text-white/80 text-[11px] font-medium drop-shadow-sm">
            {formatCount(flick.comments)}
          </span>
        </button>

        {/* Share */}
        <button
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col items-center gap-1"
          aria-label="Share"
        >
          <Share2 className={cn("size-7 text-white", iconClass)} />
          <span className="text-white/80 text-[11px] font-medium drop-shadow-sm">Share</span>
        </button>

        {/* Save */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSaved((v) => !v);
          }}
          className="flex flex-col items-center gap-1"
          aria-label={saved ? "Unsave" : "Save"}
        >
          <Bookmark
            className={cn(
              "size-7 transition-all",
              iconClass,
              saved ? "text-white fill-white" : "text-white"
            )}
          />
          <span className="text-white/80 text-[11px] font-medium drop-shadow-sm">
            {saved ? "Saved" : "Save"}
          </span>
        </button>

        {/* ── Movie poster + details button with separate like toggle ────────────────────────────────── */}
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenMovie();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              handleOpenMovie();
            }
          }}
          className="flex flex-col items-center gap-0 mt-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/60"
          aria-label="Open movie details"
        >
          <div className="relative pb-3">
            <div
              className={cn(
                "w-10 h-10 rounded-lg overflow-hidden border transition-all duration-300",
                inWatchlist
                  ? "border-white/60 shadow-[0_0_14px_rgba(255,255,255,0.2)]"
                  : "border-white/10"
              )}
            >
              {flick.movieBackdropUrl ? (
                <img
                  src={flick.movieBackdropUrl}
                  alt={flick.movieTitle}
                  className="w-full h-full object-cover"
                />
              ) : flick.moviePosterUrl ? (
                <img
                  src={flick.moviePosterUrl}
                  alt={flick.movieTitle}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-white/10 to-white/[0.03]" />
              )}
            </div>

            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-10">
              <button
                type="button"
                onClick={(e) => {
                  setInWatchlist((v) => !v);
                  handleAddToLikes(e);
                }}
                className={cn(
                  "w-[22px] h-[22px] rounded-full flex items-center justify-center border-[1.5px] transition-all duration-200 shadow-sm",
                  inWatchlist ? "bg-black/60 border-white/50" : "bg-white border-white"
                )}
                aria-label={inWatchlist ? "Remove from list" : "Add movie to like list"}
              >
                {inWatchlist ? (
                  <Check
                    strokeWidth={3.5}
                    className="size-3 text-white transition-all duration-200"
                  />
                ) : (
                  <Plus
                    strokeWidth={3.5}
                    className="size-3 text-black transition-all duration-200"
                  />
                )}
              </button>
            </div>
          </div>

          <span className="text-white/70 text-[10px] font-medium drop-shadow-sm">
            Movie
          </span>
        </div>

      </div>



      {/* ─────────────────────────────────────────────────────────────────────
          Bottom-left: uploader row + caption
          pb-12 doubles the original pb-6 breathing room below the text block.
          bottom value raised from 72px to account for the taller offset.
      ───────────────────────────────────────────────────────────────────── */}
      <div className="absolute bottom-[81px] left-0 right-[72px] px-4 pb-14 z-30">
        <div className="flex items-center gap-1 mb-2.5">
          <Avatar className="size-7 shrink-0 border border-white/25">
            <AvatarImage src={flick.uploaderAvatarUrl} alt={flick.uploader} className="object-cover" />
            <AvatarFallback className="text-[10px] font-bold uppercase bg-white/10 text-white">
              {flick.uploader[0]}
            </AvatarFallback>
          </Avatar>
          <span className="text-white text-[13px] font-semibold leading-tight truncate min-w-0 drop-shadow">
            @{flick.uploader}
          </span>

          {/* Follow button — white pill, no lime */}
          {!followed ? (
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
          )}
        </div>

        <p className="text-white/88 text-[12.5px] leading-snug line-clamp-2 drop-shadow">
          {flick.caption}
        </p>
      </div>

      {/* ── Comments Sheet ── */}
      <CommentsSheet
        flick={flick}
        totalCount={flick.comments}
        comments={DUMMY_COMMENTS}
        open={commentsOpen}
        onClose={() => {
          setCommentsOpen(false);
          setCommentsActive(false);
        }}
      />
    </div>
  );
}