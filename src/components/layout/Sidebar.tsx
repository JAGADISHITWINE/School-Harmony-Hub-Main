import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { ChevronDown, ChevronLeft, GraduationCap } from "lucide-react";
import { useAuth } from "@/store/auth";
import { useUI } from "@/store/ui";
import { cn } from "@/lib/utils";
import { api } from "@/services";
import { MENUS_ME_ENDPOINT } from "@/services/endpoints";

function Icon({ name, className }: { name: string; className?: string }) {
  const C = (Icons as any)[name] || Icons.Circle;
  return <C className={className} />;
}

interface BackendMenuItem {
  id: string;
  label: string;
  route: string | null;
  icon?: string | null;
  order_no?: number | null;
  children?: BackendMenuItem[];
}

export function Sidebar() {
  const { user } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useUI();
  const location = useLocation();
  const [menus, setMenus] = useState<BackendMenuItem[]>([]);

  useEffect(() => {
    if (!user) {
      setMenus([]);
      return;
    }

    let cancelled = false;

    const loadMenus = async () => {
      try {
        const res = await api.get<any>(MENUS_ME_ENDPOINT);
        const rows =
          (Array.isArray(res?.data) && res.data) ||
          (Array.isArray(res?.items) && res.items) ||
          (Array.isArray(res?.rows) && res.rows) ||
          (Array.isArray(res?.data?.data) && res.data.data) ||
          (Array.isArray(res?.data) && res.data) ||
          (Array.isArray(res) && res) ||
          [];
        if (!cancelled) setMenus(rows as BackendMenuItem[]);
      } catch {
        if (!cancelled) setMenus([]);
      }
    };

    loadMenus();
    return () => { cancelled = true; };
  }, [user]);

  if (!user) return null;

  const sortedMenus = [...menus].sort((a, b) => (a.order_no ?? 0) - (b.order_no ?? 0));

  return (
    <aside className={cn(
      "h-screen sticky top-0 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-300 flex flex-col",
      sidebarCollapsed ? "w-[72px]" : "w-64"
    )}>
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2 overflow-hidden">
        <div className="h-9 w-9 rounded-xl overflow-hidden">
          <img 
            src="https://thumbs.dreamstime.com/b/school-costom-logo-design-d-436103786.jpg"
            alt="logo"
            className="h-full w-full object-cover"
          />
        </div>
          {!sidebarCollapsed && (
            <div className="leading-tight">
              <p className="text-sm font-semibold gold" style={{ color: "var(--gold)" }}>Scholaris</p>
              <p className="text-[10px] uppercase tracking-widest text-muted">Admin</p>
            </div>
          )}
        </Link>
        <button
          onClick={toggleSidebar}
          className={cn(
            "h-7 w-7 grid place-items-center rounded-md hover:bg-sidebar-accent transition-colors",
            sidebarCollapsed && "rotate-180"
          )}
          aria-label="Toggle sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <nav className="p-2 space-y-1 overflow-y-auto flex-1 min-h-0">
        {sortedMenus.map((m) => (
          <MenuNode
            key={m.id}
            item={m}
            sidebarCollapsed={sidebarCollapsed}
            currentPath={location.pathname}
            level={0}
          />
        ))}
      </nav>
    </aside>
  );
}

function MenuNode({
  item,
  sidebarCollapsed,
  currentPath,
  level,
}: {
  item: BackendMenuItem;
  sidebarCollapsed: boolean;
  currentPath: string;
  level: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
  const sortedChildren = hasChildren ? [...item.children!].sort((a, b) => (a.order_no ?? 0) - (b.order_no ?? 0)) : [];
  const path = item.route || "";
  const isActive = Boolean(path && (currentPath === path || currentPath.startsWith(path + "/")));

  if (!path && hasChildren) {
    return (
      <div className={cn(level > 0 && "ml-4")}>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/70"
        >
          <Icon name={item.icon || "Circle"} className="h-4 w-4 shrink-0" />
          {!sidebarCollapsed && <span className="truncate font-medium flex-1 text-left">{item.label}</span>}
          {!sidebarCollapsed && (
            <ChevronDown className={cn("h-4 w-4 transition-transform", expanded ? "rotate-0" : "-rotate-90")} />
          )}
        </button>
        {!sidebarCollapsed && expanded && (
          <div className="space-y-1">
            {sortedChildren.map((child) => (
              <MenuNode
                key={child.id}
                item={child}
                sidebarCollapsed={sidebarCollapsed}
                currentPath={currentPath}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!path) return null;

  return (
    <div className={cn(level > 0 && "ml-4")}>
      <Link
        to={path as any}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors relative",
          isActive
            ? "bg-sidebar-accent text-sidebar-primary font-medium"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        )}
        title={sidebarCollapsed ? item.label : undefined}
      >
        {isActive && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-primary" />}
        <Icon name={item.icon || "Circle"} className="h-4 w-4 shrink-0" />
        {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
      </Link>
      {!sidebarCollapsed && hasChildren && (
        <div className="space-y-1">
          {sortedChildren.map((child) => (
            <MenuNode
              key={child.id}
              item={child}
              sidebarCollapsed={sidebarCollapsed}
              currentPath={currentPath}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
