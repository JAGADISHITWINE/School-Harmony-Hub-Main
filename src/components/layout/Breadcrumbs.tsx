import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground px-6 py-3">
      <Link to="/dashboard" className="hover:text-foreground inline-flex items-center gap-1">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {parts.map((p, i) => {
        const path = "/" + parts.slice(0, i + 1).join("/");
        const last = i === parts.length - 1;
        return (
          <span key={path} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5" />
            {last
              ? <span className="text-foreground capitalize">{decodeURIComponent(p)}</span>
              : <Link to={path as any} className="hover:text-foreground capitalize">{decodeURIComponent(p)}</Link>}
          </span>
        );
      })}
    </nav>
  );
}