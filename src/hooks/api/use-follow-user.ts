import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

export function useFollowUser(username: string) {
  return useMutation({
    mutationFn: async (isFollowing: boolean) => {
      if (isFollowing) {
        // Unfollow
        await apiClient.delete(`/api/user/${encodeURIComponent(username)}/follow`);
      } else {
        // Follow
        await apiClient.post(`/api/user/${encodeURIComponent(username)}/follow`);
      }
    },
    onError: (error) => {
      toast.error('Failed to update follow status');
      console.error('Follow error:', error);
    },
  });
}
