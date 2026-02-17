const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

class ApiClient {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    // console.log('API Request Token:', token ? token.substring(0, 10) + '...' : 'none');
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

    console.log(`API Request: ${options.method || 'GET'} ${url}`);
    if (init.body) console.log('Request Body:', init.body);
    console.log('Request Headers:', this.getHeaders());

    const response = await fetch(url, {
      ...init,
      headers: {
        ...this.getHeaders(),
        ...init.headers,
      },
    });

    if (response.status === 401) {
      // Handle unauthorized (logout)
      localStorage.removeItem('auth_token');
      // Optional: Redirect to login or dispatch event
      window.dispatchEvent(new Event('auth:logout'));
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

  post<T>(endpoint: string, body: any) {
    return this.request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) });
  }

  put<T>(endpoint: string, body: any) {
    return this.request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
