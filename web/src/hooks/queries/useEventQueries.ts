import { useQuery } from '@tanstack/react-query';
import { eventService } from '@/services/eventService';
import { queryKeys } from './queryKeys';

// Skeleton — only the hooks needed for Phase 1 (Client domain).
// Full event hooks will be added when Events module is migrated.

export function useEventsByClient(clientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.events.byClient(clientId!),
    queryFn: () => eventService.getByClientId(clientId!),
    enabled: !!clientId,
  });
}
