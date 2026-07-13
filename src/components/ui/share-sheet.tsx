"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  Share2,
  SlidersHorizontal,
  Flag,
  Trash2,
} from "lucide-react";
import { Button } from "./button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "./sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ShareSheetProps {
  url: string;
  title?: string;
  uploader?: string;
  currentUsername?: string | null;
  onReport?: () => void;
  onDelete?: () => void;
  onOpenFilter?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  triggerClassName?: string;
}

/* -------------------------------------------------------------------- */
/* Brand marks — official glyphs (Bootstrap Icons, MIT licensed), each   */
/* rendered at its real brand color so every icon reads instantly.       */
/* -------------------------------------------------------------------- */

function WhatsAppMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-7" aria-hidden="true">
      <path
        fill="#25D366"
        d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"
      />
    </svg>
  );
}

function TelegramMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-7" aria-hidden="true">
      <path
        fill="#26A5E4"
        d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8.287 5.906q-1.168.486-4.666 2.01-.567.225-.595.442c-.03.243.275.339.69.47l.175.055c.408.133.958.288 1.243.294q.39.01.868-.32 3.269-2.206 3.374-2.23c.05-.012.12-.026.166.016s.042.12.037.141c-.03.129-1.227 1.241-1.846 1.817-.193.18-.33.307-.358.336a8 8 0 0 1-.188.186c-.38.366-.664.64.015 1.088.327.216.589.393.85.571.284.194.568.387.936.629q.14.092.27.187c.331.236.63.448.997.414.214-.02.435-.22.547-.82.265-1.417.786-4.486.906-5.751a1.4 1.4 0 0 0-.013-.315.34.34 0 0 0-.114-.217.53.53 0 0 0-.31-.093c-.3.005-.763.166-2.984 1.09"
      />
    </svg>
  );
}

function InstagramMark() {
  const gradientId = "share-sheet-instagram-gradient";
  return (
    <svg viewBox="0 0 16 16" className="size-7" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="16" x2="16" y2="0">
          <stop offset="0%" stopColor="#FEDA75" />
          <stop offset="35%" stopColor="#D62976" />
          <stop offset="70%" stopColor="#962FBF" />
          <stop offset="100%" stopColor="#4F5BD5" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradientId})`}
        d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599s.453.546.598.92c.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92s.546-.453.92-.598c.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92m-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217m0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334"
      />
    </svg>
  );
}

function XMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-6 text-foreground" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z"
      />
    </svg>
  );
}

const shareChannels = [
  { key: "whatsapp", label: "WhatsApp", icon: WhatsAppMark },
  { key: "telegram", label: "Telegram", icon: TelegramMark },
  { key: "instagram", label: "Instagram", icon: InstagramMark },
  { key: "x", label: "X", icon: XMark },
] as const;

export function ShareSheet({
  url,
  title,
  uploader,
  currentUsername,
  onReport,
  onDelete,
  onOpenFilter,
  open: openProp,
  onOpenChange,
  hideTrigger = false,
  triggerClassName,
}: ShareSheetProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const open = openProp ?? internalOpen;

  const isUploader = uploader && currentUsername && uploader === currentUsername;

  const shareText = useMemo(
    () => (title ? `${title} - ${url}` : url),
    [title, url]
  );

  const fallbackCopyText = (text: string) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "-9999px";
    textarea.style.opacity = "0";
    textarea.readOnly = true;
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    let successful = false;
    try {
      successful = document.execCommand("copy");
    } catch {
      successful = false;
    }

    document.body.removeChild(textarea);
    return successful;
  };

  const copyText = async (text: string) => {
    if (!text) return false;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Fallback to execCommand below
      }
    }

    return fallbackCopyText(text);
  };

  const handleCopyLink = async () => {
    const text = url || window.location.href || "";
    const success = await copyText(text);

    if (!success) {
      toast.error("Unable to copy the link. Tap and hold to copy manually.");
      return;
    }

    // Extra verification: when possible, read the clipboard back and ensure it matches.
    if (navigator.clipboard && navigator.clipboard.readText) {
      try {
        const read = await navigator.clipboard.readText();
        if (read !== text) {
          toast.error("Unable to copy the full link to clipboard.");
          return;
        }
      } catch {
        // If reading clipboard fails, proceed optimistically.
      }
    }

    setCopied(true);
    toast.success("Link copied to clipboard.");
    setTimeout(() => setCopied(false), 1800);
  };

  const openShareUrl = (targetUrl: string) => {
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  const channelHandlers: Record<(typeof shareChannels)[number]["key"], () => void> = {
    whatsapp: () =>
      openShareUrl(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`),
    telegram: () =>
      openShareUrl(
        `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(
          title ?? url
        )}`
      ),
    instagram: () => {
      openShareUrl("https://www.instagram.com/");
      toast("Open Instagram and paste the link to share.");
    },
    x: () => openShareUrl(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`),
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (openProp === undefined) {
      setInternalOpen(nextOpen);
    }
    if (!nextOpen) setConfirmingDelete(false);
    onOpenChange?.(nextOpen);
  };

  const handleReport = () => {
    onReport?.();
    toast.success("Reported this flick.");
    handleOpenChange(false);
  };

  const handleDeleteClick = () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    onDelete?.();
    handleOpenChange(false);
  };

  const handleOpenFilter = () => {
    onOpenFilter?.();
    handleOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-10 rounded-full border border-white/20 bg-black/50 text-white shadow-sm shadow-black/30 hover:bg-white/10",
            triggerClassName,
            hideTrigger && "hidden"
          )}
          onClick={(e) => {
            e.stopPropagation();
          }}
          aria-label="Open share options"
        >
          <Share2 className="size-4" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="rounded-t-2xl border-t border-border/60 bg-background flex flex-col gap-5 px-4 pb-6 pt-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center">
          <div className="h-1 w-9 rounded-full bg-foreground/15" />
        </div>

        <SheetHeader className="px-0 pt-0">
          <SheetTitle className="text-base font-semibold tracking-tight">
            Share
          </SheetTitle>
        </SheetHeader>

        {/* Share to — horizontally scrollable if it overflows */}
        <div className="flex flex-col gap-2.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Share to
          </span>
          <div className="flex gap-5 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={handleCopyLink}
              aria-label="Copy link"
              className="flex flex-shrink-0 flex-col items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground active:scale-95"
            >
              {copied ? (
                <Check className="size-7 text-foreground" />
              ) : (
                <Copy className="size-7" />
              )}
              {copied ? "Copied" : "Copy link"}
            </button>

            {shareChannels.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={channelHandlers[key]}
                aria-label={`Share to ${label}`}
                className="flex flex-shrink-0 flex-col items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground active:scale-95"
              >
                <Icon />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px w-full bg-border/60" />

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Actions
          </span>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="flex flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-3.5 text-xs h-auto"
              onClick={handleReport}
            >
              <Flag className="size-4" />
              Report
            </Button>

            <Button
              variant="outline"
              className="flex flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-3.5 text-xs h-auto"
              onClick={handleOpenFilter}
              disabled={!onOpenFilter}
            >
              <SlidersHorizontal className="size-4" />
              Filters
            </Button>

            <Button
              variant="destructive"
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-3.5 text-xs h-auto",
                confirmingDelete && "ring-2 ring-destructive ring-offset-2 ring-offset-background"
              )}
              onClick={handleDeleteClick}
              disabled={!isUploader || !onDelete}
            >
              <Trash2 className="size-4" />
              {confirmingDelete ? "Confirm" : "Delete"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}