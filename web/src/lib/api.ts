import { useToast } from "@/hooks/useToast";
import i18n from "@/i18n/config";

export const API_URL =
	import.meta.env.VITE_API_URL || "http://localhost:8080/api";

/**
 * Thrown when the backend returns 403 `{ error: "plan_limit_exceeded" }`.
 * Callers that want to handle plan walls inline can catch this type;
 * everyone else ignores it and a global listener (mounted in Layout)
 * surfaces a toast + navigates to /pricing.
 */
export class EventCompletionBlockedError extends Error {
	readonly remaining: number;
	readonly currency: string;

	constructor(message: string, remaining: number, currency: string) {
		super(message);
		this.name = "EventCompletionBlockedError";
		this.remaining = remaining;
		this.currency = currency;
	}
}

export class PlanLimitExceededError extends Error {
	readonly limitType: string;
	readonly current: number;
	readonly max: number;

	constructor(
		message: string,
		limitType: string,
		current: number,
		max: number,
	) {
		super(message);
		this.name = "PlanLimitExceededError";
		this.limitType = limitType;
		this.current = current;
		this.max = max;
	}
}

/**
 * Thrown for any non-OK HTTP response that isn't already handled by
 * a more specific error type (e.g. PlanLimitExceededError).
 * Preserves the status code so callers can distinguish expected 401s
 * (no active session) from genuine errors without string matching.
 */
export class ApiHttpError extends Error {
	readonly statusCode: number;
	readonly endpoint: string;

	constructor(message: string, statusCode: number, endpoint: string) {
		super(message);
		this.name = "ApiHttpError";
		this.statusCode = statusCode;
		this.endpoint = endpoint;
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

export function getAssetUrl(
	path: string | null | undefined,
): string | undefined {
	if (!path) return undefined;
	if (
		path.startsWith("http://") ||
		path.startsWith("https://") ||
		path.startsWith("data:")
	) {
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

export interface ApiBlobResponse {
	blob: Blob;
	headers: Headers;
}

class ApiClient {
	private refreshPromise: Promise<boolean> | null = null;

	private getHeaders(): HeadersInit {
		// Auth tokens are sent via httpOnly cookies automatically.
		// No Authorization header needed — cookies are included via credentials: 'include'.
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};

		// Include CSRF token if present
		if (typeof document !== "undefined") {
			const match = document.cookie.match(/(?:^|;\s*)csrf_token_v2=([^;]*)/);
			if (match && match[1]) {
				headers["X-CSRF-Token"] = decodeURIComponent(match[1]);
			}
		}

		return headers;
	}

	private async attemptRefresh(): Promise<boolean> {
		try {
			// Refresh token is sent automatically via httpOnly cookie
			const response = await fetch(`${API_URL}/auth/refresh`, {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
			});

			return response.ok;
		} catch {
			return false;
		}
	}

	private async requestResponse(
		endpoint: string,
		options: RequestOptions = {},
		isRetry = false,
	): Promise<Response> {
		const { params, ...init } = options;

		let url = `${API_URL}${endpoint}`;
		if (params) {
			const searchParams = new URLSearchParams(params);
			url += `?${searchParams.toString()}`;
		}

		const isFormData = init.body instanceof FormData;
		const defaultHeaders = this.getHeaders();
		if (isFormData) {
			delete (defaultHeaders as Record<string, string>)["Content-Type"];
		}

		const response = await fetch(url, {
			...init,
			credentials: "include", // CRITICAL: Send httpOnly cookies automatically
			headers: {
				...defaultHeaders,
				...init.headers,
			},
		});

		const isAuthEndpoint = endpoint.startsWith("/auth/");

		if (response.status === 401 && !isRetry && !isAuthEndpoint) {
			if (!this.refreshPromise) {
				this.refreshPromise = this.attemptRefresh().finally(() => {
					this.refreshPromise = null;
				});
			}

			const refreshed = await this.refreshPromise;
			if (refreshed) {
				return this.requestResponse(endpoint, options, true);
			}

			window.dispatchEvent(new Event("auth:logout"));
		}

		if (response.status === 401 && isRetry) {
			window.dispatchEvent(new Event("auth:logout"));
		}

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			if (response.status === 429) {
				const retryAfter = response.headers.get("Retry-After");
				const waitHint = retryAfter
					? ` ${i18n.language.startsWith("es") ? "Intentá nuevamente en" : "Try again in"} ${retryAfter}.`
					: "";
				throw new Error(i18n.t("common:error.too_many_requests", { waitHint }));
			}
			if (
				response.status === 400 &&
				errorData.error === "event.completion_blocked"
			) {
				const remaining =
					typeof errorData.remaining === "number" ? errorData.remaining : 0;
				const currency =
					typeof errorData.currency === "string" ? errorData.currency : "MXN";
				const message =
					errorData.message ||
					i18n.t("events:form.error_balance_pending", {
						amount: remaining.toFixed(2),
					});
				throw new EventCompletionBlockedError(message, remaining, currency);
			}
			if (
				response.status === 403 &&
				errorData.error === "plan_limit_exceeded"
			) {
				const limit = (errorData.limit ?? {}) as {
					type?: string;
					current?: number;
					max?: number;
				};
				const detail: PlanLimitExceededEventDetail = {
					message:
						errorData.message || i18n.t("common:error.plan_limit_reached"),
					limitType: limit.type ?? "unknown",
					current: limit.current ?? 0,
					max: limit.max ?? 0,
				};
				useToast.getState().addToast(detail.message, "error");
				if (typeof window !== "undefined") {
					window.dispatchEvent(
						new CustomEvent<PlanLimitExceededEventDetail>(
							"plan:limit-exceeded",
							{
								detail,
							},
						),
					);
				}
				throw new PlanLimitExceededError(
					detail.message,
					detail.limitType,
					detail.current,
					detail.max,
				);
			}
			throw new ApiHttpError(
				errorData.error || `Request failed with status ${response.status}`,
				response.status,
				endpoint,
			);
		}

		return response;
	}

	private async request<T>(
		endpoint: string,
		options: RequestOptions = {},
		isRetry = false,
	): Promise<T> {
		const response = await this.requestResponse(endpoint, options, isRetry);

		if (response.status === 204) {
			return {} as T;
		}

		return response.json();
	}

	get<T>(endpoint: string, params?: Record<string, string>) {
		return this.request<T>(endpoint, { method: "GET", params });
	}

	post<T>(endpoint: string, body: any) {
		return this.request<T>(endpoint, {
			method: "POST",
			body: JSON.stringify(body),
		});
	}

	put<T>(endpoint: string, body: any) {
		return this.request<T>(endpoint, {
			method: "PUT",
			body: JSON.stringify(body),
		});
	}

	patch<T>(endpoint: string, body: any) {
		return this.request<T>(endpoint, {
			method: "PATCH",
			body: JSON.stringify(body),
		});
	}

	delete<T>(endpoint: string) {
		return this.request<T>(endpoint, { method: "DELETE" });
	}

	postFormData<T>(endpoint: string, formData: FormData) {
		return this.request<T>(endpoint, {
			method: "POST",
			body: formData,
		});
	}

	async getBlob(
		endpoint: string,
		params?: Record<string, string>,
	): Promise<ApiBlobResponse> {
		const response = await this.requestResponse(endpoint, {
			method: "GET",
			params,
		});
		return {
			blob: await response.blob(),
			headers: response.headers,
		};
	}
}

export const api = new ApiClient();
