import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function StatCard({
  label, value, icon: Icon, trend, accent = "primary",
}: {
  label: string; value: string | number; icon: LucideIcon;
  trend?: string; accent?: "primary" | "blue" | "amber" | "rose";
}) {
  const tone = {
    primary: "text-primary bg-primary/10",
    blue: "text-[hsl(210,80%,70%)] bg-[hsl(210,80%,70%)]/10",
    amber: "text-[hsl(40,90%,65%)] bg-[hsl(40,90%,65%)]/10",
    rose: "text-[hsl(350,80%,70%)] bg-[hsl(350,80%,70%)]/10",
  }[accent];
  return (
    <Card className="p-5 flex items-center justify-between gap-4 border-border bg-card">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-3xl font-semibold mt-1 text-foreground">{value}</p>
        {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
      </div>
      <div className={`h-12 w-12 rounded-xl grid place-items-center ${tone}`}>
        <Icon className="h-6 w-6" />
      </div>
    </Card>
  );
}