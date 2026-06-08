import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface SearchUserApiResult {
  id: string;
  username: string;
  displayName: string;
  videoCount: number;
  createdAt: string;
}

export function useSearchUsers(query: string) {
  return useQuery<SearchUserApiResult[]>({
    queryKey: ["search", "users", query],
    queryFn: async () => {
      const response = await apiClient.get<SearchUserApiResult[]>(
        `/api/search/users?query=${encodeURIComponent(query)}`,
      );
      return response.data;
    },
    enabled: query.trim().length > 0,
    staleTime: 1000 * 60 * 2,
  });
}
