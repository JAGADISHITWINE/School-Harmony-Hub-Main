import { FileArchive, FileBadge2, FileCheck2, UploadCloud } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StudentModuleNav } from "./StudentModuleNav";

const documentBuckets = [
  { title: "Identity", items: "Aadhaar, birth certificate, student photo" },
  { title: "Academic", items: "Transfer certificate, previous marksheets" },
  { title: "Compliance", items: "Caste, income, disability, scholarship proofs" },
  { title: "Operational", items: "Bonafide, ID card, undertakings, transport forms" },
];

export function StudentDocumentsPage() {
  return (
    <div>
      <PageHeader
        title="Student Documents"
        description="Track required student files, verification state, and future upload workflows."
      />
      <StudentModuleNav />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Document Buckets" value={4} icon={FileArchive} trend="Identity, academic, compliance, operational" />
        <StatCard label="Verification" value="Pending" icon={FileCheck2} accent="blue" trend="Review and approval flow to add" />
        <StatCard label="Uploads" value="Next" icon={UploadCloud} accent="amber" trend="Store and tag files per student" />
        <StatCard label="Certificates" value="Reusable" icon={FileBadge2} accent="rose" trend="Issue and archive generated docs" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {documentBuckets.map((bucket) => (
          <Card key={bucket.title}>
            <CardHeader>
              <CardTitle>{bucket.title}</CardTitle>
              <CardDescription>{bucket.items}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-background/60 p-3 text-sm text-muted-foreground">
                This screen is the right place for upload status, expiry reminders, and missing-document checks.
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
