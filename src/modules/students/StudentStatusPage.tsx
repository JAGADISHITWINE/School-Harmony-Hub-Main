import { useState } from "react";
import { Ban, GraduationCap, RefreshCcw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormModal } from "@/components/common/FormModal";
import { api } from "@/services";
import { useList } from "@/hooks/use-crud";
import type { ListParams, Paginated } from "@/types";
import { StudentModuleNav } from "./StudentModuleNav";

interface StudentRow {
  id: string;
  roll_number: string;
  full_name: string;
  current_branch_name?: string | null;
  current_class_name?: string | null;
  current_section_name?: string | null;
  current_status?: string | null;
}

const statuses = ["active", "transferred", "detained", "graduated", "dropped"];

export function StudentStatusPage() {
  const list = useList<StudentRow>("/students", { page: 1, pageSize: 10, search: "" });
  const [active, setActive] = useState<StudentRow | null>(null);
  const [status, setStatus] = useState("active");
  const [busy, setBusy] = useState(false);
  const rows = list.data.data;

  const openStatus = (row: StudentRow) => {
    setActive(row);
    setStatus(row.current_status || "active");
  };

  const saveStatus = async () => {
    if (!active) return;
    setBusy(true);
    try {
      await api.patch(`/students/${active.id}/status`, { status });
      toast.success("Student status updated");
      setActive(null);
      list.refresh();
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<StudentRow>[] = [
    { key: "roll_number", header: "Roll No", cell: (row) => <span className="font-mono text-xs">{row.roll_number}</span> },
    { key: "full_name", header: "Student", cell: (row) => <span className="font-medium">{row.full_name}</span> },
    { key: "class", header: "Class", cell: (row) => `${row.current_class_name || "-"} / ${row.current_section_name || "-"}` },
    { key: "branch", header: "Branch", cell: (row) => row.current_branch_name || "-" },
    { key: "current_status", header: "Status", cell: (row) => <StatusBadge value={row.current_status || "active"} /> },
  ];

  return (
    <div>
      <PageHeader title="Student Status" description="Manage active, transferred, detained, graduated, and dropped lifecycle states." />
      <StudentModuleNav />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students" value={list.data.total} icon={ShieldAlert} />
        <StatCard label="Active Page" value={rows.filter((r) => (r.current_status || "active") === "active").length} icon={RefreshCcw} accent="blue" />
        <StatCard label="Exit Cases" value={rows.filter((r) => ["transferred", "dropped"].includes(r.current_status || "")).length} icon={Ban} accent="amber" />
        <StatCard label="Graduated" value={rows.filter((r) => r.current_status === "graduated").length} icon={GraduationCap} accent="rose" />
      </div>

      <DataTable
        columns={columns}
        data={list.data as Paginated<StudentRow>}
        loading={list.loading}
        params={list.params as ListParams}
        onParamsChange={list.setParams}
        searchPlaceholder="Search student statuses..."
        rowActions={(row) => <Button size="sm" variant="outline" onClick={() => openStatus(row)}>Update</Button>}
      />

      <FormModal
        open={Boolean(active)}
        onOpenChange={(v) => !v && setActive(null)}
        title="Update Student Status"
        description={active ? `${active.full_name} (${active.roll_number})` : undefined}
        onSubmit={saveStatus}
        busy={busy}
        submitLabel="Update Status"
      >
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {statuses.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormModal>
    </div>
  );
}
