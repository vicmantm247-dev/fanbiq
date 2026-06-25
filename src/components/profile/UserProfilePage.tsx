"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { VideoCard, type Flick } from "@/components/flicks/VideoCard";

interface UserProfilePageProps {
  username: string;
  displayName: string;
  avatarUrl?: string;
  isOwner: boolean;
  totalUploads: number;
  initialFlicks: Flick[];
}

export default function UserProfilePage({
  username,
  displayName,
  avatarUrl,
  isOwner,
  totalUploads,
  initialFlicks,
}: UserProfilePageProps) {
  const [flicks, setFlicks] = useState<Flick[]>(initialFlicks);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this flick permanently?")) {
      return;
    }

    setDeletingId(id);
    try {
      await apiClient.delete(`/api/flicks/${id}`);
      setFlicks((current) => current.filter((item) => item.id !== id));
      toast.success("Flick deleted.");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Unable to delete flick.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleFollowToggle = () => {
    setFollowing((value) => !value);
    toast.success(following ? "Unfollowed" : "Following");
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm shadow-slate-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 text-4xl font-bold text-white">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-3xl font-semibold tracking-tight text-slate-900">{displayName}</div>
              <div className="mt-1 text-sm text-slate-500">@{username}</div>
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                <span>{totalUploads} upload{totalUploads === 1 ? "" : "s"}</span>
                <span>{flicks.length} preview{flicks.length === 1 ? "" : "s"}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isOwner ? (
              <Link
                href="/change-password"
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Edit profile
              </Link>
            ) : (
              <button
                onClick={handleFollowToggle}
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50"
              >
                {following ? "Following" : "Follow"}
              </button>
            )}
            {isOwner && (
              <Link
                href="/flicks/upload"
                className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                Upload flick
              </Link>
            )}
          </div>
        </div>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Uploaded flicks</h2>
              <p className="mt-1 text-sm text-slate-500">
                {isOwner
                  ? "Manage your videos and delete uploads you no longer want."
                  : `Watch the latest clips uploaded by ${displayName}.`}
              </p>
            </div>
          </div>

          {flicks.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">
              {isOwner
                ? "You have not uploaded any flicks yet."
                : "This user has not uploaded any flicks yet."}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {flicks.map((flick) => (
                <VideoCard
                  key={flick.id}
                  flick={flick}
                  isActive={false}
                  isFeedActive={false}
                  profileButtonAction={isOwner ? {
                    label: "Edit profile",
                    onClick: (e) => {
                      e.stopPropagation();
                      window.location.href = "/change-password";
                    },
                  } : undefined}
                  onDelete={isOwner ? () => handleDelete(flick.id) : undefined}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
