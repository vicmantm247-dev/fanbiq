"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { cn, parseJsonResponse } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { VideoCard, type Flick } from "@/components/flicks/VideoCard";
import { MatchOverlay } from "@/components/deck/MatchOverlay";
import { useSession } from "@/hooks/api";

interface FlicksFeedProps {
  active?: boolean;
}

export function FlicksFeed({ active = true }: FlicksFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [flicks, setFlicks] = useState<Flick[]>([]);
  const [matchedItem, setMatchedItem] = useState<any | null>(null);
  const { data: session } = useSession();
  const sessionCode = session?.code || null;
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const loadFlicks = useCallback(async (pageNum: number) => {
    setLoading(true);

    try {
      const response = await fetch(`/api/flicks?page=${pageNum}&limit=10`);
      // Safely parse JSON; surface HTML or text responses in error message
      let data: any;
      try {
        data = await parseJsonResponse(response as unknown as Response);
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'Failed to load flicks');
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load flicks');
      }

      setFlicks((prev) => (pageNum === 1 ? data.flicks : [...prev, ...data.flicks]));
      setHasMore(Boolean(data.hasMore));
      setPage(pageNum);
    } catch (error) {
      console.error('Could not load flicks', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFlicks(1);
  }, [loadFlicks]);

  // Listen for match events dispatched from VideoCard
  useEffect(() => {
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent).detail;
      if (detail) setMatchedItem(detail);
    };
    window.addEventListener("swiparr:match", handler as EventListener);
    return () => window.removeEventListener("swiparr:match", handler as EventListener);
  }, []);

  // Derive active index from scroll position — much more reliable than IntersectionObserver
  // for full-height snap containers where each card is exactly 100% tall.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onScroll = () => {
      const scrollTop = container.scrollTop;
      const cardHeight = container.clientHeight;
      if (cardHeight === 0) return;
      const index = Math.round(scrollTop / cardHeight);
      setActiveIndex(Math.max(0, Math.min(index, Math.max(flicks.length - 1, 0))));

      if (index === flicks.length - 2 && hasMore && !loading) {
        loadFlicks(page + 1);
      }
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => container.removeEventListener("scroll", onScroll);
  }, [flicks.length, hasMore, loading, loadFlicks, page]);

  const scrollTo = useCallback((idx: number) => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({ top: idx * container.clientHeight, behavior: "smooth" });
  }, []);

  return (
    <>
    <div className="relative w-full h-screen bg-black">
      {/* Snap scroll container */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {loading && flicks.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center bg-black">
            <Loader2 className="size-8 text-white/50 animate-spin" />
          </div>
        ) : (
          flicks.map((flick, i) => (
            <div
              key={flick.id}
              className="w-full snap-start"
              style={{ height: "100%" }}
            >
              <VideoCard flick={flick} isActive={activeIndex === i} isFeedActive={active} />
            </div>
          ))
        )}
      </div>

      {/* Up/down nav — desktop only */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex-col gap-1 hidden md:flex">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => scrollTo(activeIndex - 1)}
          disabled={activeIndex === 0}
          className="rounded-full bg-black/40 p-1.5 text-white/70 hover:text-white hover:bg-black/60 transition-all disabled:opacity-20"
          aria-label="Previous flick"
        >
          <ChevronUp className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => scrollTo(activeIndex + 1)}
          disabled={activeIndex === flicks.length - 1}
          className="rounded-full bg-black/40 p-1.5 text-white/70 hover:text-white hover:bg-black/60 transition-all disabled:opacity-20"
          aria-label="Next flick"
        >
          <ChevronDown className="size-4" />
        </Button>
      </div>

      {/* Dot indicators */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 pointer-events-none">
        {flicks.map((_, i) => (
          <div
            key={i}
            className={cn(
              "rounded-full transition-all duration-200",
              i === activeIndex ? "w-1 h-4 bg-white" : "w-1 h-1 bg-white/30"
            )}
          />
        ))}
      </div>
    </div>
    <MatchOverlay
      item={matchedItem}
      sessionCode={sessionCode}
      onClose={() => setMatchedItem(null)}
    />
    </>
  );
}