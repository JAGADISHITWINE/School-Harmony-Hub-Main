import { Ban, GraduationCap, RefreshCcw, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StudentModuleNav } from "./StudentModuleNav";

const statuses = [
  { title: "Active", detail: "Student is currently enrolled and usable across operational modules." },
  { title: "Transferred", detail: "Student moved branch, section, or institution and the current record was closed." },
  { title: "Graduated", detail: "Student completed the program and remains in history for transcripts and reporting." },
  { title: "Dropped / Detained", detail: "Administrative lifecycle state with audit visibility and restricted flows." },
];

export function StudentStatusPage() {
  return (
    <div>
      <PageHeader
        title="Student Status"
        description="Define lifecycle states and how each student moves through the institution."
      />
      <StudentModuleNav />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Lifecycle States" value={4} icon={ShieldAlert} trend="Active, transferred, graduated, dropped" />
        <StatCard label="Transitions" value="Controlled" icon={RefreshCcw} accent="blue" trend="Driven from academic record changes" />
        <StatCard label="Exit Cases" value="Tracked" icon={Ban} accent="amber" trend="No hard delete required for history" />
        <StatCard label="Completion" value="Supported" icon={GraduationCap} accent="rose" trend="Graduation belongs here" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {statuses.map((status) => (
          <Card key={status.title}>
            <CardHeader>
              <CardTitle>{status.title}</CardTitle>
              <CardDescription>{status.detail}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border/70 bg-background/60 p-3 text-sm text-muted-foreground">
                This screen should later control who appears in registry, attendance, fees, and certificate workflows.
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
