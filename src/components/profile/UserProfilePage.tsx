"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, MoreVertical, Edit2, Share2, Loader2, BadgeCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { FlickPreviewCard } from "@/components/flicks/FlickPreviewCard";
import { SharedTabs } from "@/components/ui/shared-tabs";

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
  initialFlicks: UserFlick[];
  // Optional extended stats (can be wired from API later)
  followingCount?: number;
  followersCount?: number;
  likesCount?: number;
  bio?: string;
  isFollowing?: boolean;
  isVerified?: boolean;
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

// ─── FlickCard ────────────────────────────────────────────────────────────────

interface FlickCardProps {
  flick: UserFlick;
  index: number;
}

function FlickCard({ flick, index }: FlickCardProps) {
  return (
    <FlickPreviewCard
      flick={{
        id: flick.id,
        movieTitle: flick.movieTitle,
        movieYear: flick.movieYear,
        videoUrl: flick.videoUrl,
        posterUrl: flick.posterUrl,
        caption: flick.caption,
        uploader: flick.uploader,
        likes: flick.likes,
      }}
      index={index}
      animationDelay={40 + index * 60}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UserProfilePage({
  username,
  displayName,
  avatarUrl,
  isOwner,
  initialFlicks,
  followingCount = 0,
  followersCount = 0,
  likesCount = 0,
  bio,
  isFollowing = false,
  isVerified = false,
}: UserProfilePageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"flicks" | "liked">("flicks");
  const [following, setFollowing] = useState(isFollowing);
  const [followLoading, setFollowLoading] = useState(false);
  const [flicksLoading, setFlicksLoading] = useState(false);
  const [followersNum, setFollowersNum] = useState<number>(followersCount ?? 0);
  const [followingNum, setFollowingNum] = useState<number>(followingCount ?? 0);

  const visibleFlicks = activeTab === "flicks" ? initialFlicks : [...initialFlicks].reverse();

  // Use real data from database
  const totalLikes = likesCount ?? initialFlicks.reduce((acc, f) => acc + f.likes, 0);
  const totalFollowers = followersCount ?? 0;

  const handleFollow = useCallback(async () => {
    if (isOwner) return;
    
    setFollowLoading(true);
    try {
      if (following) {
        await apiClient.delete(`/api/user/${username}/follow`);
        toast.success("Unfollowed");
        setFollowersNum((n) => Math.max(0, n - 1));
      } else {
        await apiClient.post(`/api/user/${username}/follow`);
        toast.success("Followed");
        setFollowersNum((n) => n + 1);
      }
      setFollowing(!following);
    } catch (error) {
      toast.error(following ? "Failed to unfollow" : "Failed to follow");
    } finally {
      setFollowLoading(false);
    }
  }, [isOwner, username, following]);

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="h-screen overflow-y-auto bg-background overscroll-contain">
        {/* Top Nav */}
        <div className="flex items-center justify-between px-4 py-2 bg-background">
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
                {isVerified ? (
                  <div title="Verified">
                    <BadgeCheck className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  </div>
                ) : (
                  <Badge variant="outline" className="text-xs px-2 py-0.5">
                    {isOwner ? "You" : "Pro"}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">ID:{username}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 py-2 mb-2">
            <StatItem num={followingNum} label="Following" />
            <StatItem num={followersNum} label="Followers" />
            <StatItem num={totalLikes} label="Likes" />
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
                <Link href="/profile/edit" className="flex-1">
                  <Button variant="outline" className="w-full">
                    <Edit2 className="w-4 h-4" />
                    Edit profile
                  </Button>
                </Link>
                <Button variant="outline" size="icon">
                  <Share2 className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleFollow}
                  disabled={followLoading}
                  variant={following ? "outline" : "default"}
                  className="flex-1"
                >
                  {followLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </>
                  ) : following ? (
                    "Following"
                  ) : (
                    "Follow"
                  )}
                </Button>
                <Button variant="outline" size="icon">
                  <Share2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <SharedTabs
          tabs={[
            { label: "Flicks", value: "flicks" },
            { label: "Liked", value: "liked" },
          ]}
          activeValue={activeTab}
          onChange={(value) => setActiveTab(value as "flicks" | "liked")}
        />

        {/* Masonry Grid */}
        <div className="relative">
          <div className="pointer-events-none fixed inset-x-0 bottom-0 h-8 z-20 bg-gradient-to-t from-background via-background/60 to-transparent" />
          {flicksLoading ? (
          <div className="px-1.5 py-2 pb-16 bg-background" style={{ columnCount: 2, columnGap: 6 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="break-inside-avoid mb-1.5 bg-muted rounded-lg aspect-video animate-pulse"
                style={{ animation: "fadeUp 0.4s ease both", animationDelay: `${0.04 + i * 0.06}s` }}
              />
            ))}
          </div>
        ) : visibleFlicks.length === 0 ? (
          <EmptyState isOwner={isOwner} username={username} />
        ) : (
          <div className="px-1.5 py-2 pb-16 bg-background" style={{ columnCount: 2, columnGap: 6 }}>
            {visibleFlicks.map((flick, i) => (
              <FlickCard key={flick.id} flick={flick} index={i} />
            ))}
          </div>
        )}
        </div>
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