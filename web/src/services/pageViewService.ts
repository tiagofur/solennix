import { api } from '@/lib/api';

/** Best-effort marketing page-view beacon (analytics slice 2). Never throws. */
export async function recordPageView(pageKey: string): Promise<void> {
  try {
    await api.post('/public/page-views', { page_key: pageKey });
  } catch {
    // Intentional: analytics must not break UX.
  }
}
