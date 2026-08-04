import { api } from '@/lib/api';

/** Best-effort registration funnel beacon (analytics slice 3). Never throws. */
export async function recordRegistrationFunnelStep(
  step: string,
  method?: string,
): Promise<void> {
  try {
    const body: { step: string; method?: string } = { step };
    if (method) {
      body.method = method;
    }
    await api.post('/public/registration-funnel', body);
  } catch {
    // Intentional: analytics must not break UX.
  }
}
