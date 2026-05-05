import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Breadcrumbs } from "./Breadcrumbs";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar />
        <Breadcrumbs />
        <main className="flex-1 px-6 pb-10 main-gradient-bg" style={{ minHeight: 'calc(100vh - 4rem)' }}>{children}</main>
      </div>
    </div>
  );
}