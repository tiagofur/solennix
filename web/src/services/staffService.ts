import { api } from '../lib/api';
import type {
  EventStaff,
  PaginatedResponse,
  PaginationParams,
  Staff,
  StaffAvailability,
  StaffInsert,
  StaffTeam,
  StaffTeamInsert,
  StaffTeamUpdate,
  StaffUpdate,
} from '../types/entities';

export const staffService = {
  async getAll(): Promise<Staff[]> {
    return api.get<Staff[]>('/staff');
  },

  async getPage(params: PaginationParams = {}): Promise<PaginatedResponse<Staff>> {
    return api.get<PaginatedResponse<Staff>>('/staff', {
      page: String(params.page ?? 1),
      limit: String(params.limit ?? 20),
      ...(params.sort && { sort: params.sort }),
      ...(params.order && { order: params.order }),
    });
  },

  async search(query: string): Promise<Staff[]> {
    return api.get<Staff[]>('/staff', { q: query });
  },

  async getById(id: string): Promise<Staff> {
    return api.get<Staff>(`/staff/${id}`);
  },

  async create(data: StaffInsert): Promise<Staff> {
    return api.post<Staff>('/staff', data);
  },

  async update(id: string, data: StaffUpdate): Promise<Staff> {
    return api.put<Staff>(`/staff/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/staff/${id}`);
  },

  async getByEvent(eventId: string): Promise<EventStaff[]> {
    return api.get<EventStaff[]>(`/events/${eventId}/staff`);
  },

  async getAvailability(params: { date?: string; start?: string; end?: string }): Promise<StaffAvailability[]> {
    const query: Record<string, string> = {};
    if (params.date) query.date = params.date;
    if (params.start) query.start = params.start;
    if (params.end) query.end = params.end;
    return api.get<StaffAvailability[]>('/staff/availability', query);
  },

  // ── Staff Teams (Ola 2) ──

  async listTeams(): Promise<StaffTeam[]> {
    return api.get<StaffTeam[]>('/staff/teams');
  },

  async getTeam(id: string): Promise<StaffTeam> {
    return api.get<StaffTeam>(`/staff/teams/${id}`);
  },

  async createTeam(data: StaffTeamInsert): Promise<StaffTeam> {
    return api.post<StaffTeam>('/staff/teams', data);
  },

  async updateTeam(id: string, data: StaffTeamUpdate): Promise<StaffTeam> {
    return api.put<StaffTeam>(`/staff/teams/${id}`, data);
  },

  async deleteTeam(id: string): Promise<void> {
    return api.delete(`/staff/teams/${id}`);
  },
};
