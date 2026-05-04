import type { AuthUser, MenuItem, Permission, Role } from "@/types";
import { ROLE_PERMISSIONS } from "@/lib/mock-db";
import { tokenStore } from "./api";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/$/, "");

function endpoint(path: string) {
  if (!API_BASE_URL) return path;
  return path.startsWith("/") ? `${API_BASE_URL}${path}` : `${API_BASE_URL}/${path}`;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function pickToken(payload: any): string {
  return asString(payload?.token) || asString(payload?.accessToken) || asString(payload?.access_token);
}

function normalizeRole(value: unknown): Role {
  const role = String(value || "").toLowerCase().replace(/\s+/g, "_");
  if (role === "super_admin" || role === "admin" || role === "teacher" || role === "accountant" || role === "student") {
    return role;
  }
  return "admin";
}

function deriveRole(source: any): Role {
  if (source?.is_superuser === true) return "super_admin";
  return normalizeRole(source?.role ?? source?.role_key);
}

function normalizePermissions(payload: any, role: Role): Permission[] {
  const incoming = payload?.permissions;
  if (Array.isArray(incoming)) return incoming as Permission[];
  return ROLE_PERMISSIONS[role] || [];
}

function normalizeMenus(payload: any): MenuItem[] {
  const rows =
    (Array.isArray(payload?.menus) && payload.menus) ||
    (Array.isArray(payload?.menu) && payload.menu) ||
    [];
  return rows as MenuItem[];
}

function normalizeAuthUser(payload: any): AuthUser {
  const source = payload?.user ?? payload?.data?.user ?? payload?.data ?? payload;
  const token = pickToken(payload) || pickToken(source);
  const role = deriveRole(source);
  const id = asString(source?.id || source?._id);
  const email = asString(source?.email || source?.username);
  const name = asString(source?.name || source?.fullName || source?.full_name || source?.username || source?.email);
  const status = source?.status === "inactive" ? "inactive" : "active";
  const createdAt = asString(source?.createdAt || source?.created_at || new Date().toISOString().slice(0, 10));

  return {
    id,
    name,
    email,
    institution_id: asString(source?.institution_id),
    role,
    status,
    createdAt,
    permissions: normalizePermissions(source, role),
    token,
    menus: normalizeMenus(source),
  };
}

async function authRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(endpoint(path), {
    ...init,
    headers,
  });

  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Request failed (${response.status})`);
  }

  return data as T;
}

export async function backendLogin(login: string, password: string): Promise<AuthUser> {
  const payload = await authRequest<any>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ login, password }),
  });

  const user = normalizeAuthUser(payload);
  if (!user.token) throw new Error("Login succeeded but token is missing in response");
  tokenStore.set(user.token);
  return user;
}

export async function backendMe(): Promise<AuthUser> {
  const payload = await authRequest<any>("/auth/me", { method: "GET" });
  const user = normalizeAuthUser(payload);
  if (!user.token) user.token = tokenStore.get() || "";
  return user;
}

export function isBackendAuthEnabled() {
  return Boolean(API_BASE_URL);
}
