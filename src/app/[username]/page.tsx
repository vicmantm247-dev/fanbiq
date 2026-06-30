import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { SessionData } from "@/types";
import { db, flicks, nativeUsers, userProfiles, follows } from "@/lib/db";
import { eq, desc, sql } from "drizzle-orm";
import { formatDistanceToNow } from "date-fns";
import UserProfilePage from "../../components/profile/UserProfilePage";

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

export default async function UserPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const routeUsername = username;
  const normalizedUsername = username.trim().toLowerCase();
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

  let user = await db
    .select()
    .from(nativeUsers)
    .where(sql`lower(${nativeUsers.username}) = ${normalizedUsername}`)
    .then((rows: any[]) => rows[0]);

  if (!user && session?.isLoggedIn && session.user?.Id) {
    const ownerUser = await db
      .select()
      .from(nativeUsers)
      .where(eq(nativeUsers.id, session.user.Id))
      .then((rows: any[]) => rows[0]);

    if (ownerUser) {
      redirect(`/${ownerUser.username}`);
    }
  }

  const isOwner = session?.isLoggedIn && session.user?.Id === user?.id;

  const uploaderId = user?.id || (isOwner ? session.user?.Id : null);

  const profileUsername = user?.username || routeUsername;
  const flickRows = await db
    .select()
    .from(flicks)
    .where(eq(flicks.uploader, profileUsername))
    .orderBy(desc(flicks.createdAt));

  if (!user && !isOwner && flickRows.length === 0) {
    return notFound();
  }

  const profile = uploaderId
    ? await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, uploaderId))
        .then((rows: any[]) => rows[0])
    : null;

  const avatarUrl = profile ? `/api/user/profile-picture/${uploaderId}` : undefined;
  const initialDisplayName = user?.displayName || user?.username || username;
  const bio = user?.bio;

  // Compute followers/following counts and whether current session follows this user
  let followersCount = 0;
  let followingCount = 0;
  let isFollowing = false;

  if (uploaderId) {
    const followersRow = await db
      .select({ count: sql<number>`count(*)` })
      .from(follows)
      .where(eq(follows.followingId, uploaderId))
      .then((rows: any[]) => rows[0]);

    const followingRow = await db
      .select({ count: sql<number>`count(*)` })
      .from(follows)
      .where(eq(follows.followerId, uploaderId))
      .then((rows: any[]) => rows[0]);

    followersCount = Number(followersRow?.count ?? 0);
    followingCount = Number(followingRow?.count ?? 0);

    if (session?.isLoggedIn && session.user?.Id) {
      const exists = await db
        .select()
        .from(follows)
        .where(eq(follows.followerId, session.user.Id), eq(follows.followingId, uploaderId))
        .then((rows: any[]) => rows.length > 0);
      isFollowing = Boolean(exists);
    }
  }

  const flicksData: UserFlick[] = flickRows.map((row: any) => ({
    id: row.id,
    movieTitle: row.movieTitle,
    movieYear: row.movieYear,
    videoUrl: row.videoUrl,
    posterUrl: row.movieBackdropUrl || row.moviePosterUrl || undefined,
    movieBackdropUrl: row.movieBackdropUrl,
    uploader: row.uploader,
    uploaderAvatarUrl: avatarUrl,
    caption: row.caption,
    likes: row.likes,
    comments: row.comments,
    timestamp: formatDistanceToNow(row.createdAt, { addSuffix: true }),
  }));

  const currentUsername = user?.username || normalizedUsername;
  const displayName = user?.displayName || initialDisplayName;

  return (
    <UserProfilePage
      username={currentUsername}
      displayName={displayName}
      avatarUrl={avatarUrl}
      isOwner={Boolean(isOwner)}
      initialFlicks={flicksData}
      bio={bio}
      isVerified={user?.isVerified || false}
      followersCount={followersCount}
      followingCount={followingCount}
      isFollowing={isFollowing}
    />
  );
}
