'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Heart, Scissors } from 'lucide-react';

export interface FlickPreviewCardData {
  id: string;
  movieTitle: string;
  movieYear?: number;
  videoUrl: string;
  posterUrl?: string;
  thumbnailUrl?: string;
  caption?: string;
  uploader?: string;
  likes?: number;
  views?: number;
}

function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

export function FlickPreviewCard({
  flick,
  index = 0,
  animationDelay = 0,
}: {
  flick: FlickPreviewCardData;
  index?: number;
  animationDelay?: number;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleOpenFlick = useCallback(() => {
    router.push(`/flicks/${flick.id}`);
  }, [flick.id, router]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
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

    observer.observe(video);
    return () => observer.disconnect();
  }, [flick.videoUrl]);

  return (
    <>
      <style>{`
        @keyframes flickPreviewFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        className="break-inside-avoid mb-1.5 cursor-pointer relative group"
        role="button"
        tabIndex={0}
        onClick={handleOpenFlick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleOpenFlick();
          }
        }}
        style={{ animation: 'flickPreviewFadeUp 0.4s ease both', animationDelay: `${animationDelay}ms` }}
      >
        <div className="rounded-lg overflow-hidden relative bg-background">
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            preload="none"
            poster={flick.posterUrl ?? flick.thumbnailUrl}
            className="w-full block object-cover"
          />


          {typeof flick.views === 'number' && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/50 rounded-full px-2 py-0.5">
              <Eye className="w-3 h-3 text-white" />
              <span className="text-xs font-semibold text-white">{formatCount(flick.views)}</span>
            </div>
          )}

          {index === 0 && (
            <div className="absolute top-2 right-2 w-7 h-7 bg-black/35 rounded-full flex items-center justify-center">
              <Heart className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        <div className="px-1 py-1">
          <div className="text-xs text-foreground leading-relaxed">
            {flick.movieTitle}
            {flick.movieYear ? ` (${flick.movieYear})` : ''}
          </div>
        </div>
      </div>
    </>
  );
}
