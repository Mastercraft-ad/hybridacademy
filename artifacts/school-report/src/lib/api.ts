const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export const apiUrl = (path: string) => `${BASE}/api${path}`;

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function apiFetchRaw(path: string, options?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), options);
}
