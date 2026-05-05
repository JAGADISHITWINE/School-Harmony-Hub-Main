import { ClipboardCheck, FileUser, School2, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StudentModuleNav } from "./StudentModuleNav";

const admissionSteps = [
  "Create applicant and basic profile",
  "Capture guardian and contact details",
  "Assign institution, branch, section and academic year",
  "Verify documents and confirm admission",
];

const nextDeliverables = [
  "Applicant intake form with draft status",
  "Admission approval workflow",
  "Seat availability checks by section",
  "Admission number generation and audit trail",
];

export function StudentAdmissionsPage() {
  return (
    <div>
      <PageHeader
        title="Student Admissions"
        description="Handle new admissions, onboarding checks, and initial academic allocation."
      />
      <StudentModuleNav />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pipeline Stages" value={4} icon={UserPlus} trend="Lead to confirmed admission" />
        <StatCard label="Core Inputs" value={5} icon={FileUser} accent="blue" trend="Profile, guardian, branch, section, year" />
        <StatCard label="Allocation Scope" value="Institution" icon={School2} accent="amber" trend="Branch and section mapped here" />
        <StatCard label="Checks Pending" value={4} icon={ClipboardCheck} accent="rose" trend="Workflow pieces to implement next" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Admission Flow</CardTitle>
            <CardDescription>The intended student onboarding sequence for this module.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {admissionSteps.map((step, index) => (
              <div key={step} className="flex items-start gap-3 rounded-lg border border-border/70 bg-background/60 p-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {index + 1}
                </div>
                <p className="text-sm text-foreground">{step}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What We Add Next</CardTitle>
            <CardDescription>This screen is ready as a module slot and now needs admission-specific operations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {nextDeliverables.map((item) => (
              <div key={item} className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
