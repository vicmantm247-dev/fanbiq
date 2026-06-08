import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { MergedLike } from "@/types";

interface TmdbSearchResult {
  tmdbId: number;
  title: string;
  year: string;
  posterPath: string;
  backdropPath: string;
}

function mapTmdbResult(result: TmdbSearchResult): MergedLike {
  return {
    Id: String(result.tmdbId),
    Name: result.title,
    ProductionYear: result.year ? parseInt(result.year, 10) : undefined,
    Overview: undefined,
    Genres: [],
    ImageTags: {
      Primary: result.posterPath || undefined,
    },
    UserData: {
      IsFavorite: false,
      Played: false,
    },
    Guid: undefined,
    Taglines: undefined,
    OfficialRating: undefined,
    Language: undefined,
    BackdropImageTags: result.backdropPath ? [result.backdropPath] : undefined,
  } as MergedLike;
}

export function useSearchTmdb(query: string) {
  return useQuery<MergedLike[]>({
    queryKey: ["search", "tmdb", query],
    queryFn: async () => {
      const response = await apiClient.get<{ results: TmdbSearchResult[] }>(
        `/api/tmdb/search?q=${encodeURIComponent(query)}`,
      );
      return response.data.results.map(mapTmdbResult);
    },
    enabled: query.trim().length > 0,
    staleTime: 1000 * 60 * 2,
  });
}
