import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api';

const TOKEN_KEY = 'auth_token';

interface RequestOptions extends RequestInit {
    params?: Record<string, string>;
}

type UnauthorizedCallback = () => void;

class ApiClient {
    private onUnauthorizedCallback?: UnauthorizedCallback;

    /**
     * Register a callback to be invoked on 401 responses.
     * Used by AuthContext to trigger logout/navigation.
     */
    setOnUnauthorized(callback: UnauthorizedCallback) {
        this.onUnauthorizedCallback = callback;
    }

    private async getHeaders(): Promise<HeadersInit> {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        return {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    }

    private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const { params, ...init } = options;

        let url = `${API_URL}${endpoint}`;
        if (params) {
            const searchParams = new URLSearchParams(params);
            url += `?${searchParams.toString()}`;
        }

        const headers = await this.getHeaders();

        const response = await fetch(url, {
            ...init,
            headers: {
                ...headers,
                ...init.headers,
            },
        });

        if (response.status === 401) {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            this.onUnauthorizedCallback?.();
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
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

    post<T>(endpoint: string, body: unknown) {
        return this.request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) });
    }

    put<T>(endpoint: string, body: unknown) {
        return this.request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) });
    }

    delete<T>(endpoint: string) {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }
}

export const api = new ApiClient();

/**
 * Helper to store the auth token after login/register.
 */
export async function setAuthToken(token: unknown): Promise<void> {
    if (!token) {
        console.warn("setAuthToken called with empty token");
        return;
    }
    const tokenString = String(token);
    if (!tokenString || tokenString === 'undefined' || tokenString === 'null') {
        console.warn("setAuthToken called with invalid token:", tokenString);
        return;
    }
    try {
        await SecureStore.setItemAsync(TOKEN_KEY, tokenString);
    } catch (error) {
        console.error("Error saving auth token:", error);
    }
}

/**
 * Helper to retrieve the current auth token.
 */
export async function getAuthToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
}

/**
 * Helper to clear the auth token on logout.
 */
export async function clearAuthToken(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
}
