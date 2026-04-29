import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { eventPublicLinkService } from '@/services/eventPublicLinkService'
import { queryKeys } from './queryKeys'

export function useEventPublicLink(eventId: string) {
    return useQuery({
        queryKey: queryKeys.eventPublicLinks.byEvent(eventId),
        queryFn: () => eventPublicLinkService.getActiveOrNull(eventId),
        enabled: !!eventId,
    })
}

export function useCreateOrRotateEventPublicLink(eventId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ ttlDays }: { ttlDays?: number } = {}) => eventPublicLinkService.createOrRotate(eventId, ttlDays),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.eventPublicLinks.byEvent(eventId) })
        },
    })
}

export function useRevokeEventPublicLink(eventId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (_: void) => eventPublicLinkService.revoke(eventId),
        onSuccess: () => {
            queryClient.setQueryData(queryKeys.eventPublicLinks.byEvent(eventId), null)
            queryClient.invalidateQueries({ queryKey: queryKeys.eventPublicLinks.byEvent(eventId) })
        },
    })
}
