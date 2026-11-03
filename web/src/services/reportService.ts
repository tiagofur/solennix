import { API_URL } from '@/lib/api';

function getCSRFHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)csrf_token_v2=([^;]*)/);
    if (match?.[1]) {
      headers['X-CSRF-Token'] = decodeURIComponent(match[1]);
    }
  }
  return headers;
}

/**
 * Downloads accounting CSV report from backend with UTF-8 BOM.
 */
export async function downloadAccountingExport(params?: { startDate?: string; endDate?: string }): Promise<void> {
  const headers = getCSRFHeaders();
  const query = new URLSearchParams();
  if (params?.startDate) query.set('start_date', params.startDate);
  if (params?.endDate) query.set('end_date', params.endDate);
  const qStr = query.toString() ? `?${query.toString()}` : '';

  const response = await fetch(`${API_URL}/reports/accounting/export${qStr}`, {
    method: 'GET',
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Accounting export failed (${response.status}): ${body}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  const disposition = response.headers.get('Content-Disposition') ?? '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? `solennix_contabilidad.csv`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
