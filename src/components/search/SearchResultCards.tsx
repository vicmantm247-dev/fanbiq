import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Play } from "lucide-react";
import { useRef, useEffect, useCallback } from "react";

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const muteHintRef = useRef<HTMLDivElement>(null);
  const muteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── IntersectionObserver: play / pause on visibility ──────────────────────
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            vid.play().catch(() => {});
          } else {
            vid.pause();
          }
        });
      },
      { threshold: 0.25 },
    );

    observer.observe(vid);
    return () => observer.disconnect();
  }, []);

  // ── Progress bar timeupdate ────────────────────────────────────────────────
  useEffect(() => {
    const vid = videoRef.current;
    const fill = progressRef.current;
    if (!vid || !fill) return;

    const onTime = () => {
      if (vid.duration) {
        fill.style.width = `${(vid.currentTime / vid.duration) * 100}%`;
      }
    };
    const onEnded = () => { fill.style.width = "0%"; };

    vid.addEventListener("timeupdate", onTime);
    vid.addEventListener("ended", onEnded);
    return () => {
      vid.removeEventListener("timeupdate", onTime);
      vid.removeEventListener("ended", onEnded);
    };
  }, []);

  // ── Tap to toggle mute ────────────────────────────────────────────────────
  const handleVideoClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRef.current;
    const hint = muteHintRef.current;
    if (!vid || !hint) return;

    vid.muted = !vid.muted;
    hint.querySelector("span")!.textContent = vid.muted ? "Muted" : "Sound on";
    hint.style.opacity = "1";

    if (muteTimerRef.current) clearTimeout(muteTimerRef.current);
    muteTimerRef.current = setTimeout(() => {
      if (hint) hint.style.opacity = "0";
    }, 1600);
  }, []);

  return (
    <div
      className="cursor-pointer group"
      style={{
        animation: "flickFadeUp 0.45s ease both",
        animationDelay: `${animationDelay}ms`,
      }}
    >
      {/* ── Media wrap — this is the ONLY element that clips and rounds ── */}
      <div className="relative rounded-2xl overflow-hidden bg-black">

        {/* Video — width 100%, height natural from source aspect ratio */}
        <video
          ref={videoRef}
          src={flick.videoUrl}
          poster={flick.thumbnailUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          onClick={handleVideoClick}
          className="w-full block object-cover"
          style={{ display: "block" }}
        />

        {/* Mute hint pill — top-left, fades out after tap */}
        <div
          ref={muteHintRef}
          className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full px-2 py-0.5 pointer-events-none"
          style={{
            background: "rgba(0,0,0,0.50)",
            opacity: 0,
            transition: "opacity 0.5s ease",
          }}
        >
          {/* Mute icon */}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <path d="M11 5L6 9H2v6h4l5 4V5z" fill="#fff" />
          </svg>
          <span className="text-[10px] font-semibold text-white whitespace-nowrap">Muted</span>
        </div>

        {/* Three-dot menu — top-right */}
        <button
          className="absolute top-2 right-2 z-10 w-[26px] h-[26px] rounded-full flex flex-col items-center justify-center gap-[2.5px]"
          style={{ background: "rgba(0,0,0,0.50)" }}
          aria-label="Options"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="w-[3px] h-[3px] rounded-full bg-white block" />
          <span className="w-[3px] h-[3px] rounded-full bg-white block" />
          <span className="w-[3px] h-[3px] rounded-full bg-white block" />
        </button>

        {/* Duration badge — bottom-right, above progress bar (mirrors bottom:48px offset) */}
        <span
          className="absolute right-2 z-10 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-white"
          style={{ bottom: "14px", background: "rgba(0,0,0,0.60)" }}
        >
          {flick.duration}
        </span>

        {/* Progress bar — bottom edge of media wrap */}
        <div
          className="absolute bottom-0 inset-x-0 z-10"
          style={{ height: "3px", background: "rgba(255,255,255,0.18)" }}
        >
          <div
            ref={progressRef}
            className="h-full rounded-r-sm"
            style={{ width: "0%", background: "#c8ff00", transition: "width 0.25s linear" }}
          />
        </div>
      </div>

      {/* ── Label block — OUTSIDE the clip, below the rounded media ── */}
      <div className="pt-[6px] pb-[2px] px-1">
        {/* Movie source — Syne weight, mirrors .card-source */}
        <p className="text-[12px] font-bold text-foreground leading-tight" style={{ fontFamily: "var(--font-syne, 'Syne', sans-serif)" }}>
          {flick.movieTitle}
        </p>
        {/* Caption — DM Sans muted, mirrors .card-title */}
        <p className="mt-[1px] text-[12px] text-muted-foreground leading-snug line-clamp-2">
          {flick.caption}
        </p>
      </div>

      {/* ── Uploader row — also outside the clip ── */}
      <div className="flex items-center gap-1.5 px-1 pb-1 mt-0.5">
        <Avatar className="size-4 shrink-0">
          <AvatarFallback className="text-[8px] font-semibold">
            {flick.uploader.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-[11px] text-muted-foreground truncate">
          @{flick.uploader}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SearchUserCard — unchanged
// ─────────────────────────────────────────────────────────────────────────────
export function SearchUserCard({ user }: { user: SearchUserResult }) {
  return (
    <div className="flex gap-4 mb-4 p-3 rounded-lg border transition-colors cursor-pointer bg-card border-border hover:bg-card/80">
      <div className="relative shrink-0 flex flex-col items-center gap-2">
        <Avatar className="w-16 h-24 rounded-lg">
          <AvatarFallback className="text-2xl font-semibold rounded-lg">{user.avatarInitials}</AvatarFallback>
        </Avatar>
        <Button size="sm" variant="secondary" className="w-16 h-8 px-2 text-xs">
          Follow
        </Button>
      </div>

      <div className="flex flex-col justify-between flex-1 min-w-0">
        <div>
          <div className="mb-1">
            <h3 className="font-bold line-clamp-1 text-foreground">{user.displayName}</h3>
            <p className="text-xs text-muted-foreground">@{user.username}</p>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2">{user.bio}</p>
          <div className="flex flex-wrap gap-1">
            {user.badges.map((badge) => (
              <Badge key={badge} variant="outline" className="text-xs">
                {badge}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex gap-3 text-xs mt-2">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Followers:</span>
            <span className="font-semibold">{formatCount(user.followers)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Videos:</span>
            <span className="font-semibold">{formatCount(user.videos)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}