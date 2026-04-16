import { useToast } from '@/hooks/useToast';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

/**
 * Thrown when the backend returns 403 `{ error: "plan_limit_exceeded" }`.
 * Callers that want to handle plan walls inline can catch this type;
 * everyone else ignores it and a global listener (mounted in Layout)
 * surfaces a toast + navigates to /pricing.
 */
export class PlanLimitExceededError extends Error {
  readonly limitType: string;
  readonly current: number;
  readonly max: number;

  constructor(message: string, limitType: string, current: number, max: number) {
    super(message);
    this.name = 'PlanLimitExceededError';
    this.limitType = limitType;
    this.current = current;
    this.max = max;
  }
}

/**
 * Detail payload emitted on the `plan:limit-exceeded` CustomEvent.
 * Listeners (e.g., Layout.tsx) use this to decide whether to show a
 * modal, redirect, or simply flash a toast.
 */
export interface PlanLimitExceededEventDetail {
  message: string;
  limitType: string;
  current: number;
  max: number;
}

export function getAssetUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  try {
    return new URL(path, API_URL).href;
  } catch {
    return path;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

class ApiClient {
  private refreshPromise: Promise<boolean> | null = null;

  private getHeaders(): HeadersInit {
    // Auth tokens are sent via httpOnly cookies automatically.
    // No Authorization header needed — cookies are included via credentials: 'include'.
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Include CSRF token if present
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/(?:^|;\s*)csrf_token_v2=([^;]*)/);
      if (match && match[1]) {
        headers['X-CSRF-Token'] = decodeURIComponent(match[1]);
      }
    }

    return headers;
  }

  private async attemptRefresh(): Promise<boolean> {
    try {
      // Refresh token is sent automatically via httpOnly cookie
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
    const { params, ...init } = options;

    let url = `${API_URL}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const isFormData = init.body instanceof FormData;
    const defaultHeaders = this.getHeaders();
    if (isFormData) {
      delete (defaultHeaders as Record<string, string>)['Content-Type'];
    }

    const response = await fetch(url, {
      ...init,
      credentials: 'include', // CRITICAL: Send httpOnly cookies automatically
      headers: {
        ...defaultHeaders,
        ...init.headers,
      },
    });

    // Skip refresh/logout logic for auth endpoints — 401 there means bad credentials, not expired token
    const isAuthEndpoint = endpoint.startsWith('/auth/');

    if (response.status === 401 && !isRetry && !isAuthEndpoint) {
      // Attempt token refresh before logging out
      // Deduplicate concurrent refresh attempts
      if (!this.refreshPromise) {
        this.refreshPromise = this.attemptRefresh().finally(() => {
          this.refreshPromise = null;
        });
      }

      const refreshed = await this.refreshPromise;
      if (refreshed) {
        return this.request<T>(endpoint, options, true);
      }

      // Refresh failed — logout
      window.dispatchEvent(new Event('auth:logout'));
    }

    if (response.status === 401 && isRetry) {
      window.dispatchEvent(new Event('auth:logout'));
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Provide user-friendly messages for common status codes
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitHint = retryAfter ? ` Intentá nuevamente en ${retryAfter}.` : '';
        throw new Error(`Demasiadas solicitudes.${waitHint} Esperá un momento e intentá de nuevo.`);
      }
      // Plan-limit walls come as 403 with a structured body the backend
      // produces via writePlanLimitError. Surface them globally (toast +
      // CustomEvent so Layout can route to /pricing) and throw a typed
      // error so callers can still catch inline if they prefer.
      if (response.status === 403 && errorData.error === 'plan_limit_exceeded') {
        const limit = (errorData.limit ?? {}) as {
          type?: string;
          current?: number;
          max?: number;
        };
        const detail: PlanLimitExceededEventDetail = {
          message: errorData.message || 'Alcanzaste el límite de tu plan.',
          limitType: limit.type ?? 'unknown',
          current: limit.current ?? 0,
          max: limit.max ?? 0,
        };
        useToast.getState().addToast(detail.message, 'error');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent<PlanLimitExceededEventDetail>('plan:limit-exceeded', {
              detail,
            }),
          );
        }
        throw new PlanLimitExceededError(
          detail.message,
          detail.limitType,
          detail.current,
          detail.max,
        );
      }
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  get<T>(endpoint: string, params?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  post<T>(endpoint: string, body: any) {
    return this.request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) });
  }

  put<T>(endpoint: string, body: any) {
    return this.request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  postFormData<T>(endpoint: string, formData: FormData) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
    });
  }
}

export const api = new ApiClient();
