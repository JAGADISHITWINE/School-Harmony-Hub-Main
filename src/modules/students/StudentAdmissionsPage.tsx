import { CalendarDays, Mail, School2, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useList } from "@/hooks/use-crud";
import type { ListParams, Paginated } from "@/types";
import { StudentModuleNav } from "./StudentModuleNav";

interface StudentRow {
  id: string;
  roll_number: string;
  full_name: string;
  email: string;
  current_branch_name?: string | null;
  current_class_name?: string | null;
  current_section_name?: string | null;
  current_academic_year_label?: string | null;
  current_status?: string | null;
  created_at: string;
}

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
};

export function StudentAdmissionsPage() {
  const list = useList<StudentRow>("/students", { page: 1, pageSize: 10, search: "" });
  const rows = list.data.data;

  const columns: Column<StudentRow>[] = [
    { key: "roll_number", header: "Roll No", cell: (row) => <span className="font-mono text-xs">{row.roll_number}</span> },
    {
      key: "full_name",
      header: "Student",
      cell: (row) => (
        <div>
          <div className="font-medium">{row.full_name}</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{row.email}</div>
        </div>
      ),
    },
    {
      key: "allocation",
      header: "Initial Allocation",
      cell: (row) => (
        <div className="text-sm">
          <div>{row.current_branch_name || "-"}</div>
          <div className="text-xs text-muted-foreground">{row.current_class_name || "-"} / {row.current_section_name || "-"}</div>
        </div>
      ),
    },
    { key: "current_academic_year_label", header: "Academic Year", cell: (row) => row.current_academic_year_label || "-" },
    { key: "created_at", header: "Admitted On", cell: (row) => <span className="text-muted-foreground">{formatDate(row.created_at)}</span> },
    { key: "current_status", header: "Status", cell: (row) => <StatusBadge value={row.current_status || "active"} /> },
  ];

  return (
    <div>
      <PageHeader title="Student Admissions" description="Live admission list from student onboarding and academic allocation." />
      <StudentModuleNav />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Admitted Students" value={list.data.total} icon={UserPlus} />
        <StatCard label="Current Page" value={rows.length} icon={CalendarDays} accent="blue" />
        <StatCard label="Allocated" value={rows.filter((r) => r.current_section_name).length} icon={School2} accent="amber" />
        <StatCard label="Active" value={rows.filter((r) => (r.current_status || "active") === "active").length} icon={UserPlus} accent="rose" />
      </div>

      <DataTable
        columns={columns}
        data={list.data as Paginated<StudentRow>}
        loading={list.loading}
        params={list.params as ListParams}
        onParamsChange={list.setParams}
        searchPlaceholder="Search admissions..."
      />
    </div>
  );
}
