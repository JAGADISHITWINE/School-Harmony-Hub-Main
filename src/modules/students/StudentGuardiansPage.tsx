import { Mail, Phone, Users } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { DataTable, type Column } from "@/components/common/DataTable";
import { useList } from "@/hooks/use-crud";
import type { ListParams, Paginated } from "@/types";
import { StudentModuleNav } from "./StudentModuleNav";

interface StudentRow {
  id: string;
  roll_number: string;
  full_name: string;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_email?: string | null;
  current_branch_name?: string | null;
  current_section_name?: string | null;
}

export function StudentGuardiansPage() {
  const list = useList<StudentRow>("/students", { page: 1, pageSize: 10, search: "" });
  const rows = list.data.data;
  const withPhone = rows.filter((row) => row.guardian_phone).length;
  const withEmail = rows.filter((row) => row.guardian_email).length;

  const columns: Column<StudentRow>[] = [
    { key: "roll_number", header: "Roll No", cell: (row) => <span className="font-mono text-xs">{row.roll_number}</span> },
    { key: "full_name", header: "Student", cell: (row) => <span className="font-medium">{row.full_name}</span> },
    { key: "guardian_name", header: "Guardian", cell: (row) => row.guardian_name || "-" },
    { key: "guardian_phone", header: "Phone", cell: (row) => row.guardian_phone ? <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{row.guardian_phone}</span> : "-" },
    { key: "guardian_email", header: "Email", cell: (row) => row.guardian_email ? <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{row.guardian_email}</span> : "-" },
    { key: "allocation", header: "Class", cell: (row) => `${row.current_branch_name || "-"} / ${row.current_section_name || "-"}` },
  ];

  return (
    <div>
      <PageHeader title="Student Guardians" description="Live parent and emergency contact details used for attendance alerts." />
      <StudentModuleNav />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Students" value={list.data.total} icon={Users} />
        <StatCard label="Phone Ready" value={withPhone} icon={Phone} accent="blue" />
        <StatCard label="Email Ready" value={withEmail} icon={Mail} accent="amber" />
      </div>

      <DataTable
        columns={columns}
        data={list.data as Paginated<StudentRow>}
        loading={list.loading}
        params={list.params as ListParams}
        onParamsChange={list.setParams}
        searchPlaceholder="Search guardians..."
      />
    </div>
  );
}
