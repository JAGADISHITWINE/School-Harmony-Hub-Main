import { toast } from "sonner";

/**
 * Centralized API service. Mocks an axios-style client with interceptors,
 * JWT auto-attach, and global error handling. Swap impl for real axios when
 * a backend exists.
 */

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/$/, "");
console.log("API Base URL:", API_BASE_URL || "Using mock API");
const TOKEN_KEY = "sms_token";
const REFRESH_TOKEN_KEY = "sms_refresh_token";
const AUTH_KEY = "sms_auth";
export const MAX_PAGE_SIZE = 500;

export const tokenStore = {
  get: () => (typeof window === "undefined" ? null : sessionStorage.getItem(TOKEN_KEY)),
  set: (t: string) => sessionStorage.setItem(TOKEN_KEY, t),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
  getRefresh: () => (typeof window === "undefined" ? null : sessionStorage.getItem(REFRESH_TOKEN_KEY)),
  setRefresh: (t: string) => sessionStorage.setItem(REFRESH_TOKEN_KEY, t),
  clearRefresh: () => sessionStorage.removeItem(REFRESH_TOKEN_KEY),
};

let sessionExpiryNotified = false;

function forceSessionLogout(message = "Session expired. Please login again.") {
  if (typeof window === "undefined") return;
  tokenStore.clear();
  tokenStore.clearRefresh();
  sessionStorage.removeItem(AUTH_KEY);
  if (!sessionExpiryNotified) {
    sessionExpiryNotified = true;
    toast.error(message);
  }
  if (window.location.pathname !== "/login") {
    setTimeout(() => {
      window.location.href = "/login";
    }, 300);
  }
}

type Handler<T = any> = (body: any, params: Record<string, string>) => Promise<T> | T;
type Route = { method: Method; pattern: RegExp; handler: Handler };
const routes: Route[] = [];

export function register(method: Method, path: string, handler: Handler) {
  const pattern = new RegExp("^" + path.replace(/:([a-zA-Z]+)/g, "(?<$1>[^/]+)") + "$");
  routes.push({ method, pattern, handler });
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function clampPageSize(url: string) {
  const [path, query = ""] = url.split("?");
  if (!query) return url;

  const params = new URLSearchParams(query);
  const requested = Number(params.get("page_size"));
  if (Number.isFinite(requested) && requested > MAX_PAGE_SIZE) {
    params.set("page_size", String(MAX_PAGE_SIZE));
    return `${path}?${params.toString()}`;
  }

  return url;
}

function endpoint(path: string) {
  if (!API_BASE_URL) return path;
  return path.startsWith("/") ? `${API_BASE_URL}${path}` : `${API_BASE_URL}/${path}`;
}

async function backendRequest<T>(method: Method, url: string, body?: any): Promise<T> {
  const safeUrl = clampPageSize(url);
  return backendRequestOnce<T>(method, safeUrl, body, true);
}

async function refreshAccessToken() {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return false;

  const res = await fetch(endpoint("/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const raw = await res.text();
  let data: any = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (!res.ok) return false;

  const payload = data?.data || data;
  const accessToken = payload?.access_token || payload?.token || payload?.accessToken;
  const nextRefreshToken = payload?.refresh_token || payload?.refreshToken;
  if (!accessToken) return false;

  tokenStore.set(accessToken);
  if (nextRefreshToken) tokenStore.setRefresh(nextRefreshToken);
  return true;
}

async function backendRequestOnce<T>(method: Method, safeUrl: string, body: any, allowRefresh: boolean): Promise<T> {
  const token = tokenStore.get();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(endpoint(safeUrl), {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  });

  const raw = await res.text();
  let data: any = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (!res.ok) {
    if (res.status === 401 && !safeUrl.startsWith("/auth/")) {
      if (allowRefresh && await refreshAccessToken()) {
        return backendRequestOnce<T>(method, safeUrl, body, false);
      }
      forceSessionLogout();
      throw new Error("Session expired");
    }
    const msg =
      data?.message ||
      data?.error ||
      (res.status === 404
        ? `API not found (404): ${method} ${safeUrl}`
        : `Request failed (${res.status})`);
    toast.error(msg);
    throw new Error(msg);
  }
  sessionExpiryNotified = false;
  return data as T;
}

async function request<T>(method: Method, url: string, body?: any): Promise<T> {
  if (API_BASE_URL) return backendRequest<T>(method, url, body);

  await sleep(180 + Math.random() * 220);

  // Auto-attach token (simulated)
  const token = tokenStore.get();
  if (!token && !url.startsWith("/auth/")) {
    forceSessionLogout();
    const err = new Error("Session expired");
    (err as any).status = 401;
    throw err;
  }

  for (const r of routes) {
    if (r.method !== method) continue;
    const m = r.pattern.exec(url);
    if (m) {
      try {
        return (await r.handler(body, m.groups || {})) as T;
      } catch (e: any) {
        // Global error handler
        const msg = e?.message || "Something went wrong";
        toast.error(msg);
        throw e;
      }
    }
  }
  toast.error(`No mock route: ${method} ${url}`);
  throw new Error(`No mock route: ${method} ${url}`);
}

export const api = {
  get: <T,>(url: string) => request<T>("GET", url),
  post: <T,>(url: string, body?: any) => request<T>("POST", url, body),
  put: <T,>(url: string, body?: any) => request<T>("PUT", url, body),
  patch: <T,>(url: string, body?: any) => request<T>("PATCH", url, body),
  delete: <T,>(url: string) => request<T>("DELETE", url),
  upload: async <T,>(url: string, formData: FormData): Promise<T> => {
    if (!API_BASE_URL) throw new Error("Bulk upload requires backend API");
    const token = tokenStore.get();
    const res = await fetch(endpoint(url), {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || data?.success === false) {
      const msg = data?.message || `Upload failed (${res.status})`;
      toast.error(msg);
      throw new Error(msg);
    }
    return data as T;
  },
  download: async (url: string, filename: string) => {
    if (!API_BASE_URL) throw new Error("Download requires backend API");
    const token = tokenStore.get();
    const res = await fetch(endpoint(url), {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) {
      const msg = `Download failed (${res.status})`;
      toast.error(msg);
      throw new Error(msg);
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  },
};
