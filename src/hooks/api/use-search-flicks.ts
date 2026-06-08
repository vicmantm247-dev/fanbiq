import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { SearchFlickResult } from "@/components/search/SearchResultCards";

interface SearchFlickApiResult {
  id: string;
  movieTitle: string;
  uploader: string;
  caption: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
}

function formatDuration(durationSeconds: number | null): string {
  if (!durationSeconds || durationSeconds <= 0) {
    return "0:00";
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function mapRemoteFlick(flick: SearchFlickApiResult): SearchFlickResult {
  return {
    id: flick.id,
    movieTitle: flick.movieTitle,
    uploader: flick.uploader,
    caption: flick.caption ?? "",
    videoUrl: flick.videoUrl,
    thumbnailUrl: flick.thumbnailUrl ?? "",
    duration: formatDuration(flick.durationSeconds),
  };
}

export function useSearchFlicks(query: string) {
  return useQuery<SearchFlickResult[]>({
    queryKey: ["search", "flicks", query],
    queryFn: async () => {
      const response = await apiClient.get<SearchFlickApiResult[]>(
        `/api/search/flicks?query=${encodeURIComponent(query)}`,
      );
      return response.data.map(mapRemoteFlick);
    },
    enabled: query.trim().length > 0,
    staleTime: 1000 * 60 * 2,
  });
}
