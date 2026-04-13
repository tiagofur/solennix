import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { eventFormService } from '@/services/eventFormService'
import { queryKeys } from './queryKeys'

export function useEventFormLinks() {
    return useQuery({
        queryKey: queryKeys.eventFormLinks.all,
        queryFn: () => eventFormService.listLinks(),
    })
}

export function useGenerateLink() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ label, ttlDays }: { label?: string; ttlDays?: number }) =>
            eventFormService.generateLink(label, ttlDays),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.eventFormLinks.all })
        },
    })
}

export function useDeleteLink() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => eventFormService.deleteLink(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.eventFormLinks.all })
        },
    })
}
