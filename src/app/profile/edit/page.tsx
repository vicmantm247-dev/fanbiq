"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

interface ProfileData {
  id?: string;
  displayName?: string;
  bio?: string;
  username: string;
}

function validateUsername(username: string) {
  if (!username || username.length < 3) {
    return "Username must be at least 3 characters";
  }
  if (username.length > 30) {
    return "Username must be 30 characters or fewer";
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return "Username can only contain letters, numbers, and underscores";
  }
  return null;
}

export default function EditProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get<ProfileData>("/api/user/profile");
        const data = res.data as ProfileData;
        setProfileData(data);
        setDisplayName(data.displayName || data.username);
        setUsername(data.username);
        setBio(data.bio || "");
        // Fetch current avatar
        if (data.id) {
          setAvatarUrl(`/api/user/profile-picture/${data.id}`);
        }
      } catch (error) {
        toast.error("Failed to load profile");
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (!profileData) return;

    const validationError = validateUsername(username);
    setUsernameError(validationError);

    if (validationError) {
      setUsernameAvailable(null);
      return;
    }

    if (username === profileData.username) {
      setUsernameAvailable(true);
      return;
    }

    const timer = window.setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const response = await apiClient.get<{ available: boolean }>("/api/user/username", {
          params: { username },
        });
        setUsernameAvailable(response.data.available);
        setUsernameError(response.data.available ? null : "This username is already taken");
      } catch (error: any) {
        setUsernameAvailable(null);
        setUsernameError(error?.response?.data?.error || "Unable to validate username");
      } finally {
        setCheckingUsername(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [username, profileData]);

  const handleAvatarChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        toast.error("Image must be less than 5MB");
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleRemoveAvatar = useCallback(async () => {
    try {
      await apiClient.delete("/api/user/profile-picture");
      setAvatarUrl(null);
      setAvatarFile(null);
      toast.success("Profile picture removed");
    } catch (error) {
      toast.error("Failed to remove profile picture");
    }
  }, []);

  const handleSave = async () => {
    if (usernameError || usernameAvailable === false || checkingUsername) {
      toast.error("Please fix your username before saving.");
      return;
    }

    setLoading(true);
    const savingToast = toast.loading("Saving changes...");

    try {
      // Upload avatar if changed
      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        await fetch("/api/user/profile-picture", {
          method: "POST",
          body: formData,
        });
      }

      // Update profile
      const currentUsername = profileData?.username || "";
      await apiClient.put("/api/user/profile", {
        displayName: displayName || undefined,
        bio: bio || undefined,
        username: username !== currentUsername ? username : undefined,
      });

      toast.dismiss(savingToast);
      toast.success("Profile updated successfully");
      router.back();
    } catch (error: any) {
      toast.dismiss(savingToast);
      toast.error(error?.response?.data?.error || error?.message || "Failed to save changes");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (!profileData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 z-50 bg-background">
        <button
          onClick={handleCancel}
          className="p-2 hover:bg-muted rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">Edit Profile</h1>
        <div className="w-10" />
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="w-24 h-24 border-2 border-border">
              <AvatarImage src={avatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="text-xl font-bold">
                {displayName?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full hover:bg-primary/90 transition"
              title="Upload new avatar"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />

          {avatarUrl && (
            <button
              onClick={handleRemoveAvatar}
              className="text-sm text-destructive hover:underline flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Remove photo
            </button>
          )}
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Display Name */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
              maxLength={100}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {displayName.length}/100
            </p>
          </div>

          {/* Bio */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              maxLength={500}
              rows={4}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {bio.length}/500
            </p>
          </div>

          {/* Username */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              maxLength={30}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition"
              disabled={loading}
            />
            <div className="mt-1 text-xs">
              {usernameError ? (
                <span className="text-destructive">{usernameError}</span>
              ) : username && usernameAvailable ? (
                <span className="text-emerald-500">Username is available</span>
              ) : username && checkingUsername ? (
                <span className="text-muted-foreground">Checking availability…</span>
              ) : (
                <span className="text-muted-foreground">Usernames must be 3-30 characters and may contain letters, numbers, and underscores.</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleCancel}
            variant="outline"
            className="flex-1"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1"
            disabled={
              loading ||
              !!usernameError ||
              usernameAvailable === false ||
              checkingUsername ||
              !username
            }
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
