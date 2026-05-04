import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { api } from "@/services/api";
import { backendLogin, backendMe, isBackendAuthEnabled } from "@/services/auth-api";
import type { AuthUser, Permission } from "@/types";

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
      hasPermission: (p) => !!get().user?.permissions.includes(p),
      hasAnyPermission: (ps) => ps.some(p => get().user?.permissions.includes(p)),
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
