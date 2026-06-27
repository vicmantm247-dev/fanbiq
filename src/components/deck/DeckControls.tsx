import React from "react";
import { Button } from "@/components/ui/button";
import { Heart, HeartOff, X, Rewind, SlidersHorizontal } from "lucide-react";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";

interface DeckControlsProps {
  onRewind: () => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onToggleLike: () => void;
  onOpenFilter: () => void;
  canRewind: boolean;
  isLiked: boolean;
  rewindImageUrl?: string;
  rewindAriaLabel?: string;
  hasAppliedFilters: boolean;
  leftSwipesRemaining?: number;
  rightSwipesRemaining?: number;
}

export function DeckControls({
  onRewind,
  onSwipeLeft,
  onSwipeRight,
  onToggleLike,
  onOpenFilter,
  canRewind,
  isLiked,
  rewindImageUrl,
  rewindAriaLabel,
  hasAppliedFilters,
  leftSwipesRemaining,
  rightSwipesRemaining,
}: DeckControlsProps) {

  const isLeftSwipeDisabled = leftSwipesRemaining !== undefined ? leftSwipesRemaining < 1 : undefined
  const isRightSwipeDisabled = rightSwipesRemaining !== undefined ? rightSwipesRemaining < 1 : undefined

  return (
    <div className="flex items-center justify-center gap-6 z-2 w-full">
      <Button
        size="icon"
        variant="secondary"
        className="h-10 w-10 rounded-full bg-background/50 border-0 overflow-hidden relative"
        onClick={onRewind}
        disabled={!canRewind}
        aria-label={rewindAriaLabel ?? "Open movie details"}
      >
        {rewindImageUrl ? (
          <>
            <img
              src={rewindImageUrl}
              alt={rewindAriaLabel ?? "Movie backdrop"}
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-0 bg-black/30" aria-hidden="true" />
          </>
        ) : (
          <Rewind className="size-5.5" />
        )}
      </Button>
      <Button
        size="icon"
        variant="outline"
        className="h-18 w-18 rounded-full bg-background border-2 relative"
        onClick={onSwipeLeft}
        disabled={isLeftSwipeDisabled}
      >
        <X className="size-9" />
        {leftSwipesRemaining !== undefined && (
          <Badge variant='secondary' className="rounded-full absolute -top-2 -right-2">
            {leftSwipesRemaining}
          </Badge>
        )}
      </Button>
      <Button
        size="icon"
        className="h-18 w-18 rounded-full relative"
        onClick={isLiked ? onToggleLike : onSwipeRight}
        disabled={!isLiked && isRightSwipeDisabled}
      >
        {isLiked ? (
          <HeartOff className="size-9" />
        ) : (
          <Heart className="size-9 fill-primary-foreground" />
        )}
        {rightSwipesRemaining !== undefined && (
          <Badge variant='secondary' className="rounded-full absolute -top-2 -right-2">
            {rightSwipesRemaining}
          </Badge>
        )}
      </Button>
      <Button
        size="icon"
        variant="secondary"
        className="h-12 w-12 rounded-full bg-background/50 border-2 relative"
        onClick={onOpenFilter}
      >
        <SlidersHorizontal className="size-5.5" />
        {hasAppliedFilters && (
          <span className="rounded-full bg-foreground absolute top-0 right-0 size-3.5 border-2 border-background animate-in zoom-in duration-300" />
        )}
      </Button>
    </div>
  );
}