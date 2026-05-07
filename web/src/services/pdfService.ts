import { API_URL } from '@/lib/api';

type PdfType =
  | 'budget'
  | 'payment-report'
  | 'contract'
  | 'shopping-list'
  | 'checklist'
  | 'equipment-list';

/**
 * Downloads a PDF from the backend and triggers a browser save dialog.
 * Uses credentials: 'include' so httpOnly auth cookies are sent automatically.
 */
export async function downloadEventPDF(eventId: string, type: PdfType): Promise<void> {
  // CSRF token — same pattern as ApiClient.getHeaders()
  const headers: Record<string, string> = {};
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)csrf_token_v2=([^;]*)/);
    if (match?.[1]) {
      headers['X-CSRF-Token'] = decodeURIComponent(match[1]);
    }
  }

  const response = await fetch(`${API_URL}/events/${eventId}/pdf/${type}`, {
    method: 'GET',
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`PDF generation failed (${response.status}): ${body}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  // Derive filename from Content-Disposition if present, else fallback
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? `${type}.pdf`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
