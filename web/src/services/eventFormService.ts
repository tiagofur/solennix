import { api } from '@/lib/api'
import type { EventFormLink } from '@/types/entities'

export const eventFormService = {
    async generateLink(label?: string, ttlDays?: number): Promise<EventFormLink> {
        return api.post<EventFormLink>('/event-forms', { label, ttl_days: ttlDays })
    },

    async listLinks(): Promise<EventFormLink[]> {
        return api.get<EventFormLink[]>('/event-forms')
    },

    async deleteLink(id: string): Promise<void> {
        return api.delete(`/event-forms/${id}`)
    },
}
