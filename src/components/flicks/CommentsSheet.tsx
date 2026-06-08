"use client";

import { useEffect, useRef, useState } from "react";
import { Heart, Send, ChevronDown, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Flick } from "@/components/flicks/VideoCard";

// ── Types ────────────────────────────────────────────────────────────────────

export interface CommentReply {
  id: string;
  userId: string;
  username: string;
  avatarColor?: string;
  text: string;
  timestamp: string;
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  avatarColor?: string;
  /** Marks the original uploader so their comment gets a creator badge */
  isCreator?: boolean;
  text: string;
  likes: number;
  timestamp: string;
  replies?: CommentReply[];
  /** Pre-fetched reply count, may exceed replies.length when not all are loaded */
  replyCount?: number;
}

interface CommentsSheetProps {
  flick: Flick;
  totalCount: number;
  comments: Comment[];
  open: boolean;
  onClose: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

function getInitials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

// ── Sub-components ───────────────────────────────────────────────────────────

interface CommentAvatarProps {
  username: string;
  avatarColor?: string;
  size?: "sm" | "md";
}

function CommentAvatar({ username, avatarColor, size = "md" }: CommentAvatarProps) {
  return (
    <Avatar className={cn("shrink-0", size === "md" ? "size-8" : "size-6")}>
      <AvatarFallback
        className={cn(
          "text-black font-bold",
          size === "md" ? "text-xs" : "text-[10px]"
        )}
        style={{ backgroundColor: avatarColor ?? "#c8ff00" }}
      >
        {getInitials(username)}
      </AvatarFallback>
    </Avatar>
  );
}

interface ReplyItemProps {
  reply: CommentReply;
}

function ReplyItem({ reply }: ReplyItemProps) {
  return (
    <div className="flex gap-2 pt-2">
      <CommentAvatar username={reply.username} avatarColor={reply.avatarColor} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-semibold text-foreground">@{reply.username}</span>
          <span className="text-[10px] text-muted-foreground">{reply.timestamp}</span>
        </div>
        <p className="text-xs text-foreground/80 leading-snug mt-0.5">{reply.text}</p>
      </div>
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
}

function CommentItem({ comment }: CommentItemProps) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.likes);
  const [repliesExpanded, setRepliesExpanded] = useState(false);

  const hasReplies = (comment.replies?.length ?? 0) > 0 || (comment.replyCount ?? 0) > 0;
  const displayReplies = comment.replies ?? [];

  function handleLike() {
    setLiked((prev) => !prev);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
  }

  return (
    <div className="flex gap-3 py-3">
      <CommentAvatar username={comment.username} avatarColor={comment.avatarColor} />

      <div className="flex-1 min-w-0">
        {/* Meta row */}
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className="text-sm font-semibold text-foreground leading-none">
            @{comment.username}
          </span>
          {comment.isCreator && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#c8ff00]/15 text-[#c8ff00] border border-[#c8ff00]/25 leading-none">
              Creator
            </span>
          )}
          <span className="text-xs text-muted-foreground ml-auto shrink-0">
            {comment.timestamp}
          </span>
        </div>

        {/* Text */}
        <p className="text-sm text-foreground/85 leading-snug">{comment.text}</p>

        {/* Actions */}
        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={handleLike}
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            aria-label={liked ? "Unlike" : "Like"}
          >
            <Heart
              className={cn(
                "size-3.5 transition-all",
                liked ? "fill-red-500 text-red-500 scale-110" : "fill-none"
              )}
            />
            {likeCount > 0 && <span>{formatCount(likeCount)}</span>}
          </button>

          {hasReplies && (
            <button
              onClick={() => setRepliesExpanded((p) => !p)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown
                className={cn("size-3.5 transition-transform", repliesExpanded && "rotate-180")}
              />
              {repliesExpanded
                ? "Hide replies"
                : `View ${formatCount(comment.replyCount ?? displayReplies.length)} repl${(comment.replyCount ?? displayReplies.length) === 1 ? "y" : "ies"}`}
            </button>
          )}
        </div>

        {/* Replies */}
        {repliesExpanded && displayReplies.length > 0 && (
          <div className="mt-2 pl-2 border-l border-border/50 flex flex-col">
            {displayReplies.map((reply) => (
              <ReplyItem key={reply.id} reply={reply} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Loading skeletons ─────────────────────────────────────────────────────────

function CommentSkeleton() {
  return (
    <div className="flex gap-3 py-3">
      <Skeleton className="size-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CommentsSheet({
  flick,
  totalCount,
  comments,
  open,
  onClose,
}: CommentsSheetProps) {
  const [text, setText] = useState("");
  const [localComments, setLocalComments] = useState<Comment[]>(comments);
  const [loading] = useState(false); // swap with real fetch state
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync if parent swaps the comments prop (e.g. after API load)
  useEffect(() => {
    setLocalComments(comments);
  }, [comments]);

  // Auto-focus input when sheet opens
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 350);
      return () => clearTimeout(t);
    }
  }, [open]);

  function handlePost() {
    const trimmed = text.trim();
    if (!trimmed) return;

    const newComment: Comment = {
      id: `local-${Date.now()}`,
      userId: "current_user",
      username: "you",
      avatarColor: "#c8ff00",
      text: trimmed,
      likes: 0,
      timestamp: "now",
    };

    setLocalComments((prev) => [newComment, ...prev]);
    setText("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handlePost();
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="bottom"
        // Override the default close button — we render our own in the header
        className={cn(
          "rounded-t-2xl border-t border-border/60 bg-background",
          "h-[70dvh] flex flex-col gap-0 p-0",
          // Hide the default close button injected by SheetContent
          "[&>button:last-child]:hidden"
        )}
        // Prevent clicks inside the sheet from propagating to the video card
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Handle bar ── */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* ── Header ── */}
        <SheetHeader className="px-4 pt-1 pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">
              {formatCount(totalCount + localComments.filter((c) => c.userId === "current_user").length)}{" "}
              Comments
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close comments"
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Movie pill */}
          <div className="inline-flex items-center gap-1.5 w-fit rounded-full bg-muted/60 border border-border/50 px-3 py-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-[#c8ff00] shrink-0" />
            <span className="font-medium text-foreground/80 truncate max-w-[160px]">
              {flick.movieTitle}
            </span>
            <span>{flick.movieYear}</span>
          </div>
        </SheetHeader>

        <Separator />

        {/* ── Comment list ── */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4">
            {loading ? (
              <>
                <CommentSkeleton />
                <CommentSkeleton />
                <CommentSkeleton />
              </>
            ) : localComments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
                <span className="text-3xl">💬</span>
                <p className="text-sm">No comments yet. Be the first!</p>
              </div>
            ) : (
              localComments.map((comment, i) => (
                <div key={comment.id}>
                  <CommentItem comment={comment} />
                  {i < localComments.length - 1 && (
                    <Separator className="opacity-40" />
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <Separator />

        {/* ── Compose bar ── */}
        <div
          className="shrink-0 flex items-center gap-3 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          onClick={(e) => e.stopPropagation()}
        >
          <CommentAvatar username="you" avatarColor="#c8ff00" />

          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment…"
            className={cn(
              "flex-1 min-w-0 bg-muted/50 rounded-full px-4 py-2 text-sm",
              "outline-none border border-transparent",
              "focus:border-[#c8ff00]/40 focus:bg-muted/80",
              "placeholder:text-muted-foreground transition-colors"
            )}
          />

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handlePost}
            disabled={!text.trim()}
            aria-label="Post comment"
            className={cn(
              "rounded-full transition-colors shrink-0",
              text.trim()
                ? "text-[#c8ff00] hover:bg-[#c8ff00]/10"
                : "text-muted-foreground"
            )}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}