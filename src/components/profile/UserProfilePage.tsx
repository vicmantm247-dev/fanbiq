"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Search, MoreVertical, Edit2, Share2, Heart, Scissors } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserFlick {
  id: string;
  movieTitle: string;
  movieYear: number;
  videoUrl: string;
  posterUrl?: string;
  movieBackdropUrl?: string;
  uploader: string;
  uploaderAvatarUrl?: string;
  caption: string;
  likes: number;
  comments: number;
  timestamp: string;
}

interface UserProfilePageProps {
  username: string;
  displayName: string;
  avatarUrl?: string;
  isOwner: boolean;
  totalUploads: number;
  initialFlicks: UserFlick[];
  // Optional extended stats (can be wired from API later)
  followingCount?: number;
  followersCount?: number;
  likesCount?: number;
  bio?: string;
  isFollowing?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── StatItem ─────────────────────────────────────────────────────────────────

function StatItem({ num, label }: { num: number; label: string }) {
  return (
    <div className="flex flex-col">
      <div className="text-base font-extrabold">{formatCount(num)}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function TabItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1,
        textAlign: "center",
        fontSize: 13,
        fontWeight: 600,
        color: active ? "#111" : "#aaa",
        padding: "11px 0 10px",
        cursor: "pointer",
        position: "relative",
        transition: "color 0.2s",
        userSelect: "none",
      }}
    >
      {label}
      {active && (
        <div style={{
          position: "absolute",
          bottom: -1, left: "15%", right: "15%",
          height: 2,
          background: "#111",
          borderRadius: "2px 2px 0 0",
        }} />
      )}
    </div>
  );
}

// ─── FlickCard ────────────────────────────────────────────────────────────────

interface FlickCardProps {
  flick: UserFlick;
  index: number;
}

function FlickCard({ flick, index }: FlickCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // IntersectionObserver: autoplay when ≥30% visible
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.3) {
          if (!video.src) { 
            video.src = flick.videoUrl; 
            video.load(); 
          }
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: [0, 0.1, 0.3, 0.5, 1.0] }
    );
    obs.observe(video);
    return () => obs.disconnect();
  }, [flick.videoUrl]);

  const delay = `${0.04 + index * 0.06}s`;

  return (
    <div className="break-inside-avoid mb-1.5 cursor-pointer relative group" style={{ animation: "fadeUp 0.4s ease both", animationDelay: delay }}>
      {/* Card image wrap */}
      <div className="rounded-lg overflow-hidden relative bg-background">
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="none"
          poster={flick.posterUrl}
          className="w-full block object-cover"
        />

        {/* Scissors + likes badge — bottom left */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/50 rounded-full px-2 py-0.5">
          <Scissors className="w-3 h-3 text-white" />
          <span className="text-xs font-semibold text-white">
            {formatCount(flick.likes)}
          </span>
        </div>

        {/* Star badge — top right (first card) */}
        {index === 0 && (
          <div className="absolute top-2 right-2 w-7 h-7 bg-black/35 rounded-full flex items-center justify-center">
            <Heart className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Title label */}
      <div className="px-1 py-1">
        <div className="text-xs text-foreground leading-relaxed">
          {flick.movieTitle} {flick.movieYear ? `(${flick.movieYear})` : ""}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UserProfilePage({
  username,
  displayName,
  avatarUrl,
  isOwner,
  totalUploads,
  initialFlicks,
  followingCount = 18,
  followersCount = 0,
  likesCount = 0,
  bio,
  isFollowing = false,
}: UserProfilePageProps) {
  const [activeTab, setActiveTab] = useState<"flicks" | "liked">("flicks");
  const [following, setFollowing] = useState(isFollowing);

  const visibleFlicks = activeTab === "flicks" ? initialFlicks : [...initialFlicks].reverse();

  // Compute aggregate likes
  const totalLikes = likesCount || initialFlicks.reduce((acc, f) => acc + f.likes, 0);
  const totalFollowers = followersCount || totalUploads * 3;

  const handleFollow = useCallback(() => {
    if (isOwner) return;
    setFollowing((f) => !f);
  }, [isOwner]);

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="min-h-screen bg-background">
        {/* Top Nav */}
        <div className="flex items-center justify-between px-4 py-2 bg-background border-b">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon">
              <Search className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Profile Header */}
        <div className="px-4 py-2 bg-background">
          {/* Avatar + Name + ID */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-shrink-0">
              {/* Avatar ring */}
              <div className="w-22 h-22 rounded-full p-0.5 bg-background border-2 border-background ring-1 ring-border">
                <Avatar className="w-full h-full border-2 border-background">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback className="text-lg font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-lg font-extrabold">{displayName}</h1>
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  {isOwner ? "You" : "Pro"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">ID:{username}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 py-2 mb-2">
            <StatItem num={followingCount} label="Following" />
            <StatItem num={totalFollowers} label="Followers" />
            <StatItem num={totalLikes} label="Likes" />
            <StatItem num={totalUploads} label="Flicks" />
          </div>

          {/* Bio */}
          <div className="space-y-2 pb-2">
            <div className="text-sm font-semibold">{displayName}</div>
            {bio && <div className="text-sm text-foreground">{bio}</div>}
            <div className="flex items-center gap-2 text-sm cursor-pointer">
              <div className="w-4 h-4 rounded-full bg-foreground flex items-center justify-center">
                <span className="text-xs text-background">▶</span>
              </div>
              <span>fanbiQ</span>
              <span className="text-muted-foreground">›</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-2 py-3 mb-2">
            {isOwner ? (
              <>
                <Button variant="outline" className="flex-1">
                  <Edit2 className="w-4 h-4" />
                  Edit profile
                </Button>
                <Button variant="outline" size="icon">
                  <Share2 className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleFollow}
                  variant={following ? "outline" : "default"}
                  className="flex-1"
                >
                  {following ? "Following" : "Follow"}
                </Button>
                <Button variant="outline" size="icon">
                  <Share2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          background: "#fff",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}>
          <TabItem
            label="Flicks"
            active={activeTab === "flicks"}
            onClick={() => setActiveTab("flicks")}
          />
          <TabItem
            label="Liked"
            active={activeTab === "liked"}
            onClick={() => setActiveTab("liked")}
          />
        </div>

        {/* Masonry Grid */}
        {visibleFlicks.length === 0 ? (
          <EmptyState isOwner={isOwner} username={username} />
        ) : (
          <div className="px-1.5 py-2 pb-16 bg-background" style={{ columnCount: 2, columnGap: 6 }}>
            {visibleFlicks.map((flick, i) => (
              <FlickCard key={flick.id} flick={flick} index={i} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ isOwner, username }: { isOwner: boolean; username: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="text-5xl mb-4">🎬</div>
      <h3 className="text-lg font-semibold mb-2">
        {isOwner ? "Post your first Flick" : "No Flicks yet"}
      </h3>
      <p className="text-sm text-muted-foreground">
        {isOwner
          ? "Upload a short film reaction, review, or moment to get started."
          : `${username} hasn't posted any Flicks yet.`}
      </p>
    </div>
  );
}