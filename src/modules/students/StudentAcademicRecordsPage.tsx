import { ArrowRightLeft, CalendarRange, GitBranch, History } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StudentModuleNav } from "./StudentModuleNav";

const recordActions = [
  { title: "Initial Enrollment", detail: "Create the first academic record at admission time with branch, section and year." },
  { title: "Promotion", detail: "Open a new academic record when the student moves to the next year or section." },
  { title: "Transfer", detail: "Close the active record and start a new one when branch or section changes." },
  { title: "History", detail: "Preserve academic timeline instead of overwriting the student master." },
];

export function StudentAcademicRecordsPage() {
  return (
    <div>
      <PageHeader
        title="Student Academic Records"
        description="Track enrollment history, promotions, branch shifts, and academic-year level movement."
      />
      <StudentModuleNav />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Current Design" value="Year-Based" icon={CalendarRange} trend="Academic year stays on student records" />
        <StatCard label="Transition Types" value={3} icon={ArrowRightLeft} accent="blue" trend="Enroll, promote, transfer" />
        <StatCard label="Record Basis" value="Branch + Section" icon={GitBranch} accent="amber" trend="Operational linkage per student" />
        <StatCard label="History Mode" value="Preserved" icon={History} accent="rose" trend="No destructive overwrite needed" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {recordActions.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.detail}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-background/60 p-3 text-sm text-muted-foreground">
                This screen is where we should add search, active-record view, promotion action, and transfer action next.
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
