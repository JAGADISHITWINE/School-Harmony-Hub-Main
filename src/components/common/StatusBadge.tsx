import { Badge } from "@/components/ui/badge";

const tones: Record<string, string> = {
  active: "bg-primary/15 text-primary border-primary/30",
  inactive: "bg-muted text-muted-foreground border-border",
  paid: "bg-primary/15 text-primary border-primary/30",
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  overdue: "bg-destructive/15 text-destructive border-destructive/30",
  present: "bg-primary/15 text-primary border-primary/30",
  absent: "bg-destructive/15 text-destructive border-destructive/30",
  late: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  sent: "bg-primary/15 text-primary border-primary/30",
  verified: "bg-primary/15 text-primary border-primary/30",
  draft: "bg-muted text-muted-foreground border-border",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  transferred: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  detained: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  graduated: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  dropped: "bg-destructive/15 text-destructive border-destructive/30",
};

export function StatusBadge({ value }: { value: string }) {
  const cls = tones[value] || "bg-muted text-muted-foreground border-border";
  return <Badge variant="outline" className={`capitalize ${cls}`}>{value}</Badge>;
}
