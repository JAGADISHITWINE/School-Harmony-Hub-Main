import { ContactRound, Phone, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StudentModuleNav } from "./StudentModuleNav";

const guardianSections = [
  "Primary guardian and secondary guardian records",
  "Relationship, occupation, and emergency contact fields",
  "Communication preference and consent flags",
  "Guardian-to-student linking for siblings and family grouping",
];

export function StudentGuardiansPage() {
  return (
    <div>
      <PageHeader
        title="Student Guardians"
        description="Manage parent, guardian, emergency contact, and family communication details."
      />
      <StudentModuleNav />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Guardians Per Student" value="1-2" icon={Users} trend="Primary and backup contacts" />
        <StatCard label="Emergency Contacts" value="Enabled" icon={Phone} accent="blue" trend="Stored separately from profile" />
        <StatCard label="Consent Layer" value="Needed" icon={ShieldCheck} accent="amber" trend="Messaging and document approval" />
        <StatCard label="Family Mapping" value="Planned" icon={ContactRound} accent="rose" trend="Sibling grouping and billing reuse" />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Guardian Module Scope</CardTitle>
          <CardDescription>This screen gives us the place to separate guardian data from the core student master.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {guardianSections.map((item) => (
            <div key={item} className="rounded-lg border border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
              {item}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
