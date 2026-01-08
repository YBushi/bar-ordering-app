import { getDeviceToken, deleteDeviceToken } from "./auth";

export const API_BASE = import.meta.env.VITE_API_URL ?? ""; 

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getDeviceToken();
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Device ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    // token invalid/revoked
    deleteDeviceToken();
    throw new Error("UNAUTHENTICATED");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}
