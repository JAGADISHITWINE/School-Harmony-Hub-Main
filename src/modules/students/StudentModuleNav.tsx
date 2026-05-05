import { Link, useLocation } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const studentTabs = [
  { label: "Registry", to: "/students/registry" },
  { label: "Admissions", to: "/students/admissions" },
  { label: "Academic Records", to: "/students/academic-records" },
  { label: "Guardians", to: "/students/guardians" },
  { label: "Documents", to: "/students/documents" },
  { label: "Status", to: "/students/status" },
] as const;

export function StudentModuleNav() {
  const location = useLocation();

  return (
    <Card className="mb-6 border-border bg-card p-2">
      <div className="flex flex-wrap gap-2">
        {studentTabs.map((tab) => {
          const active =
            location.pathname === tab.to || location.pathname.startsWith(`${tab.to}/`);

          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                "rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
