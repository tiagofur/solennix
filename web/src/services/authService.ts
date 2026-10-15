import { api } from '@/lib/api';
import type { User } from '@/types/auth';

// Dual-transport contract: the backend also returns `tokens` in the body,
// but they are native-only (iOS/Android bearer auth). Web MUST ignore them:
// the session travels via httpOnly cookies, validated through checkAuth().
export interface TeamInviteAcceptResponse {
  user: User;
}

export const authService = {
  async acceptTeamInvite(token: string, password: string): Promise<TeamInviteAcceptResponse> {
    return api.post<TeamInviteAcceptResponse>('/auth/team-invite/accept', {
      token,
      password,
    });
  },
};
