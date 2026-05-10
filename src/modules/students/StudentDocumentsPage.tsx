import { useEffect, useState } from "react";
import { FileArchive, FileCheck2, Plus, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { BulkImportTools } from "@/components/common/BulkImportTools";
import { StatCard } from "@/components/common/StatCard";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { FormModal } from "@/components/common/FormModal";
import { Field, FieldGrid } from "@/components/common/FormFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/services";
import { useList } from "@/hooks/use-crud";
import type { ListParams, Paginated } from "@/types";
import { StudentModuleNav } from "./StudentModuleNav";

interface StudentRow {
  id: string;
  roll_number: string;
  full_name: string;
}

interface DocumentRow {
  id: string;
  student_id: string;
  student_name?: string | null;
  roll_number?: string | null;
  document_type: string;
  title: string;
  file_name?: string | null;
  file_url?: string | null;
  status: string;
  remarks?: string | null;
  created_at: string;
}

const emptyForm = {
  student_id: "",
  document_type: "identity",
  title: "",
  file_name: "",
  file_url: "",
  status: "pending",
  remarks: "",
};

const listFrom = <T,>(payload: any): T[] =>
  (Array.isArray(payload?.data?.items) && payload.data.items) ||
  (Array.isArray(payload?.data) && payload.data) ||
  (Array.isArray(payload) && payload) ||
  [];

export function StudentDocumentsPage() {
  const list = useList<DocumentRow>("/students/documents/list", { page: 1, pageSize: 10, search: "" });
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<DocumentRow | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rows = list.data.data;

  useEffect(() => {
    api.get<any>("/students?page=1&page_size=100")
      .then((res) => setStudents(listFrom<StudentRow>(res)))
      .catch(() => setStudents([]));
  }, []);

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const startEdit = (row: DocumentRow) => {
    setEditing(row);
    setForm({
      student_id: row.student_id,
      document_type: row.document_type,
      title: row.title,
      file_name: row.file_name || "",
      file_url: row.file_url || "",
      status: row.status || "pending",
      remarks: row.remarks || "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.student_id || !form.title.trim()) return toast.error("Select student and enter document title");
    setBusy(true);
    try {
      const payload = {
        ...form,
        file_name: form.file_name || null,
        file_url: form.file_url || null,
        remarks: form.remarks || null,
      };
      if (editing) await api.patch(`/students/documents/${editing.id}`, payload);
      else await api.post("/students/documents", payload);
      toast.success(editing ? "Document updated" : "Document added");
      setOpen(false);
      list.refresh();
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<DocumentRow>[] = [
    {
      key: "student",
      header: "Student",
      cell: (row) => (
        <div>
          <div className="font-medium">{row.student_name || "-"}</div>
          <div className="font-mono text-xs text-muted-foreground">{row.roll_number || "-"}</div>
        </div>
      ),
    },
    { key: "document_type", header: "Type", cell: (row) => <span className="capitalize">{row.document_type}</span> },
    { key: "title", header: "Document", cell: (row) => <span className="font-medium">{row.title}</span> },
    { key: "file_name", header: "File", cell: (row) => row.file_name || row.file_url || "-" },
    { key: "status", header: "Status", cell: (row) => <StatusBadge value={row.status} /> },
    { key: "remarks", header: "Remarks", cell: (row) => row.remarks || "-" },
  ];

  return (
    <div>
      <PageHeader
        title="Student Documents"
        description="Track required student files and verification status."
        actions={
          <>
            <BulkImportTools resource="student-documents" label="Documents" onImported={list.refresh} />
            <Button onClick={startCreate}><Plus className="mr-2 h-4 w-4" /> Add Document</Button>
          </>
        }
      />
      <StudentModuleNav />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Documents" value={list.data.total} icon={FileArchive} />
        <StatCard label="Verified Page" value={rows.filter((row) => row.status === "verified").length} icon={FileCheck2} accent="blue" />
        <StatCard label="Pending Page" value={rows.filter((row) => row.status === "pending").length} icon={UploadCloud} accent="amber" />
      </div>

      <DataTable
        columns={columns}
        data={list.data as Paginated<DocumentRow>}
        loading={list.loading}
        params={list.params as ListParams}
        onParamsChange={list.setParams}
        searchPlaceholder="Search documents..."
        rowActions={(row) => <Button size="sm" variant="outline" onClick={() => startEdit(row)}>Edit</Button>}
      />

      <FormModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Document" : "Add Document"}
        onSubmit={save}
        busy={busy}
        submitLabel={editing ? "Update Document" : "Add Document"}
        size="lg"
      >
        <div className="space-y-4">
          <Field label="Student">
            <Select value={form.student_id} onValueChange={(v) => setForm((prev) => ({ ...prev, student_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>{student.full_name} ({student.roll_number})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <FieldGrid>
            <Field label="Document Type">
              <Select value={form.document_type} onValueChange={(v) => setForm((prev) => ({ ...prev, document_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="identity">Identity</SelectItem>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="operational">Operational</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => setForm((prev) => ({ ...prev, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FieldGrid>
          <Field label="Title"><Input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} /></Field>
          <FieldGrid>
            <Field label="File Name"><Input value={form.file_name} onChange={(e) => setForm((prev) => ({ ...prev, file_name: e.target.value }))} /></Field>
            <Field label="File URL"><Input value={form.file_url} onChange={(e) => setForm((prev) => ({ ...prev, file_url: e.target.value }))} /></Field>
          </FieldGrid>
          <Field label="Remarks"><Textarea value={form.remarks} onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))} /></Field>
        </div>
      </FormModal>
    </div>
  );
}
