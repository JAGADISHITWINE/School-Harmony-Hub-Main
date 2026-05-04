import { create } from "zustand";

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebar: (v: boolean) => void;
  globalLoading: boolean;
  setGlobalLoading: (v: boolean) => void;
}

export const useUI = create<UIState>((set, get) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
  setSidebar: (v) => set({ sidebarCollapsed: v }),
  globalLoading: false,
  setGlobalLoading: (v) => set({ globalLoading: v }),
}));