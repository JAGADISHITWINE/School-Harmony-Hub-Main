import { toast } from "sonner";

/**
 * Centralized API service. Mocks an axios-style client with interceptors,
 * JWT auto-attach, and global error handling. Swap impl for real axios when
 * a backend exists.
 */

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/$/, "");

const TOKEN_KEY = "sms_token";
const AUTH_KEY = "sms_auth";

export const tokenStore = {
  get: () => (typeof window === "undefined" ? null : sessionStorage.getItem(TOKEN_KEY)),
  set: (t: string) => sessionStorage.setItem(TOKEN_KEY, t),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

let sessionExpiryNotified = false;

function forceSessionLogout(message = "Session expired. Please login again.") {
  if (typeof window === "undefined") return;
  tokenStore.clear();
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

function endpoint(path: string) {
  if (!API_BASE_URL) return path;
  return path.startsWith("/") ? `${API_BASE_URL}${path}` : `${API_BASE_URL}/${path}`;
}

async function backendRequest<T>(method: Method, url: string, body?: any): Promise<T> {
  const token = tokenStore.get();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(endpoint(url), {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  });

  const raw = await res.text();
  let data: any = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (!res.ok) {
    if (res.status === 401 && !url.startsWith("/auth/")) {
      forceSessionLogout();
      throw new Error("Session expired");
    }
    const msg =
      data?.message ||
      data?.error ||
      (res.status === 404
        ? `API not found (404): ${method} ${url}`
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
};
