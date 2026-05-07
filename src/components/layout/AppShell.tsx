import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { useLocation } from "@tanstack/react-router";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Breadcrumbs } from "./Breadcrumbs";

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    if (mainRef.current) mainRef.current.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar />
        <Breadcrumbs />
        <main ref={mainRef} className="flex-1 px-6 pb-10 main-gradient-bg" style={{ minHeight: 'calc(100vh - 4rem)' }}>{children}</main>
      </div>
    </div>
  );
}
