import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { SubscriptionNotification } from '../lib/types';

export function useAllNotifications(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['notifications'],
    enabled: options.enabled,
    queryFn: async () => {
      const { notifications } = await api.getSubscriptionNotifications();
      return notifications as SubscriptionNotification[];
    },
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
    refetchIntervalInBackground: true, // Continue refetching in background
    staleTime: 2000,
  });
}

// Keep backward compatibility
export function useSubscriptionNotifications(options: { enabled?: boolean } = {}) {
  return useAllNotifications(options);
}

export function useMarkSubscriptionNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string | number) => {
      return api.markSubscriptionNotificationRead(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
