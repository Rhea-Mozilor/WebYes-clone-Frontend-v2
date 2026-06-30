const BASE = '/api';

function getHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
  const token = localStorage.getItem('access_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function buildUrl(path: string, params?: Record<string, string | undefined>): string {
  const url = `${BASE}${path}`;
  if (!params) return url;
  const qs = new URLSearchParams(
    Object.entries(params).filter((e): e is [string, string] => e[1] !== undefined)
  ).toString();
  return qs ? `${url}?${qs}` : url;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    localStorage.removeItem('access_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body?.detail ?? res.statusText), { response: { data: body, status: res.status } });
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const client = {
  get<T>(path: string, params?: Record<string, string | undefined>): Promise<T> {
    return fetch(buildUrl(path, params), { headers: getHeaders() }).then(handleResponse<T>);
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return fetch(buildUrl(path), {
      method: 'POST',
      headers: getHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then(handleResponse<T>);
  },
  delete<T = void>(path: string): Promise<T> {
    return fetch(buildUrl(path), { method: 'DELETE', headers: getHeaders() }).then(handleResponse<T>);
  },
  patch<T>(path: string, body?: unknown): Promise<T> {
    return fetch(buildUrl(path), {
      method: 'PATCH',
      headers: getHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then(handleResponse<T>);
  },
};

export default client;
