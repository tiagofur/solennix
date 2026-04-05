import { useQuery } from '@tanstack/react-query';
import { subscriptionService } from '@/services/subscriptionService';
import { queryKeys } from './queryKeys';

export function useSubscriptionStatus() {
  return useQuery({
    queryKey: queryKeys.subscription.status,
    queryFn: () => subscriptionService.getStatus(),
    staleTime: 5 * 60 * 1000, // Subscription status changes rarely
  });
}
