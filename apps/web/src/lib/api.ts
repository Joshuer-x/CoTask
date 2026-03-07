const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

let _accessToken: string | null = null;

export function setAccessToken(token: string) {
  _accessToken = token;
}

export function clearAccessToken() {
  _accessToken = null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (_accessToken) headers["Authorization"] = `Bearer ${_accessToken}`;

  const res = await fetch(`${API_URL}/v1${path}`, { ...init, headers, credentials: "include" });

  if (res.status === 401 && _accessToken) {
    // Attempt token refresh
    const refreshed = await fetch(`${API_URL}/v1/auth/refresh`, { method: "POST", credentials: "include" });
    if (refreshed.ok) {
      const { data } = await refreshed.json() as { data: { accessToken: string } };
      _accessToken = data.accessToken;
      headers["Authorization"] = `Bearer ${_accessToken}`;
      const retry = await fetch(`${API_URL}/v1${path}`, { ...init, headers, credentials: "include" });
      return retry.json() as Promise<T>;
    }
    clearAccessToken();
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { code: "UNKNOWN", message: res.statusText } }));
    throw err;
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
