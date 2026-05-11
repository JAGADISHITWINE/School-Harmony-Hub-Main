import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { api } from "@/services/api";
import { backendLogin, backendMe, isBackendAuthEnabled } from "@/services/auth-api";
import type { AuthUser, Permission } from "@/types";

const legacyModuleAliases: Record<string, string[]> = {
  users: ["user", "users"],
  roles: ["role", "roles"],
  menus: ["menu", "menus"],
  students: ["student", "students"],
  staff: ["teacher", "teachers", "staff"],
  classes: ["class", "classes", "academic"],
  attendance: ["attendance"],
  fees: ["fee", "fees"],
  notifications: ["notification", "notifications"],
};

function matchesPermission(requested: string, granted: string) {
  if (requested === granted) return true;

  const [moduleName, actionName] = requested.split(".");
  if (!moduleName || !actionName) return false;

  const aliases = legacyModuleAliases[moduleName] || [moduleName];
  if (actionName === "view") {
    return aliases.some((alias) => granted === `${alias}.read` || granted === `${alias}_read`);
  }

  if (actionName === "manage") {
    return aliases.some((alias) =>
      granted === `${alias}.manage` ||
      granted === `${alias}_manage` ||
      granted === `${alias}_create` ||
      granted === `${alias}_update` ||
      granted === `${alias}_delete` ||
      granted === `${alias}_collect` ||
      granted === `${alias}_issue` ||
      granted.endsWith(`.${alias}_manage`)
    );
  }

  return false;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  hydrate: () => Promise<void>;
  hasPermission: (p: Permission) => boolean;
  hasAnyPermission: (ps: Permission[]) => boolean;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      hydrated: false,
      hasPermission: (p) => (get().user?.permissions || []).some((granted) => matchesPermission(p, granted)),
      hasAnyPermission: (ps) => ps.some(p => (get().user?.permissions || []).some((granted) => matchesPermission(p, granted))),
      login: async (login, password) => {
        set({ loading: true });
        try {
          if (!isBackendAuthEnabled()) {
            throw new Error("Backend auth is not configured. Set VITE_API_BASE_URL in .env");
          }
          await backendLogin(login, password);
          const user = await backendMe();
          set({ user });
          return user;
        } finally { set({ loading: false }); }
      },
      logout: () => {
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("sms_auth");
          sessionStorage.removeItem("sms_token");
          sessionStorage.removeItem("sms_refresh_token");
        }
        set({ user: null });
      },
      hydrate: async () => {
        try {
          const user = isBackendAuthEnabled()
            ? await backendMe()
            : await api.get<AuthUser>("/auth/me");
          set({ user });
        } catch { set({ user: null }); }
        finally { set({ hydrated: true }); }
      },
    }),
    {
      name: "sms_auth",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ user: s.user }),
    }
  )
);
