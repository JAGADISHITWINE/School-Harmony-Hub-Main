import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BookOpen, ClipboardCheck, FileUp, Link as LinkIcon, Plus, Send } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/services";
import { useAuth } from "@/store/auth";

type Mode = "materials" | "assessments" | "assignments";

interface Option {
  id: string;
  name?: string;
  label?: string;
  branch_id?: string | null;
  class_id?: string | null;
  section_id?: string | null;
}

interface Dropdowns {
  academic_years: Option[];
  branches: Option[];
  classes: Option[];
  sections: Option[];
  subjects: Option[];
}

interface ContentRow {
  id: string;
  title: string;
  description?: string | null;
  academic_year_label?: string | null;
  branch_name?: string | null;
  class_name?: string | null;
  section_name?: string | null;
  subject_name?: string | null;
  material_type?: string;
  assessment_type?: string;
  total_marks?: number;
  due_date?: string;
  file_name?: string | null;
  file_url?: string | null;
  external_url?: string | null;
  attachment_name?: string | null;
  attachment_url?: string | null;
  submission_count?: number;
  submitted?: boolean;
}

const emptyDropdowns: Dropdowns = {
  academic_years: [],
  branches: [],
  classes: [],
  sections: [],
  subjects: [],
};

const materialTypes = [
  ["pdf", "PDF"],
  ["doc", "DOC"],
  ["ppt", "PPT"],
  ["image", "Image"],
  ["video_link", "Video Link"],
  ["other", "Other"],
];

const assessmentTypes = [
  ["quiz", "Quiz"],
  ["internal_test", "Internal Test"],
  ["unit_test", "Unit Test"],
  ["practical", "Practical"],
  ["other", "Other"],
];

function listFrom<T>(payload: any): T[] {
  return (
    (Array.isArray(payload?.data?.items) && payload.data.items) ||
    (Array.isArray(payload?.data) && payload.data) ||
    (Array.isArray(payload) && payload) ||
    []
  ) as T[];
}

function itemLabel(item: Option) {
  return item.name || item.label || item.id;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function titleCase(value = "") {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function TeacherContentPage() {
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const [mode, setMode] = useState<Mode>("materials");
  const [dropdowns, setDropdowns] = useState<Dropdowns>(emptyDropdowns);
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({
    academic_year_id: "",
    class_id: "",
    section_id: "",
    subject_id: "",
    from_date: "",
    to_date: "",
  });
  const [form, setForm] = useState({
    title: "",
    description: "",
    academic_year_id: "",
    branch_id: "",
    class_id: "",
    section_id: "",
    subject_id: "",
    material_type: "pdf",
    external_url: "",
    assessment_type: "quiz",
    total_marks: "100",
    due_date: today(),
    instructions: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [submissionFiles, setSubmissionFiles] = useState<Record<string, File | null>>({});
  const [submissionRemarks, setSubmissionRemarks] = useState<Record<string, string>>({});

  const availableClasses = useMemo(
    () => dropdowns.classes.filter((item) => !form.branch_id || item.branch_id === form.branch_id),
    [dropdowns.classes, form.branch_id]
  );
  const availableSections = useMemo(
    () => dropdowns.sections.filter((item) => !form.class_id || item.class_id === form.class_id),
    [dropdowns.sections, form.class_id]
  );
  const availableSubjects = useMemo(
    () => dropdowns.subjects.filter((item) => !form.class_id || item.class_id === form.class_id),
    [dropdowns.subjects, form.class_id]
  );

  const loadDropdowns = async () => {
    if (isStudent) return;
    try {
      const res = await api.get<any>("/teacher-content/teacher/dropdowns");
      const data = res?.data || emptyDropdowns;
      setDropdowns({
        academic_years: data.academic_years || [],
        branches: data.branches || [],
        classes: data.classes || [],
        sections: data.sections || [],
        subjects: data.subjects || [],
      });
      setForm((prev) => ({
        ...prev,
        academic_year_id: prev.academic_year_id || data.academic_years?.[0]?.id || "",
        branch_id: prev.branch_id || data.branches?.[0]?.id || "",
      }));
    } catch (error: any) {
      toast.error(error?.message || "Failed to load teacher assignments");
      setDropdowns(emptyDropdowns);
    }
  };

  const endpointPrefix = isStudent ? "/teacher-content/student" : "/teacher-content/teacher";

  const loadRows = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", page_size: "100" });
      Object.entries(filters).forEach(([key, value]) => {
        if (value && (mode !== "materials" || !key.includes("date"))) params.set(key, value);
      });
      const res = await api.get<any>(`${endpointPrefix}/${mode}?${params.toString()}`);
      setRows(listFrom<ContentRow>(res));
    } catch (error: any) {
      toast.error(error?.message || `Failed to load ${mode}`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDropdowns().catch(() => {});
  }, [isStudent]);

  useEffect(() => {
    loadRows().catch(() => {});
  }, [mode, filters.academic_year_id, filters.class_id, filters.section_id, filters.subject_id, filters.from_date, filters.to_date, isStudent]);

  const updateForm = (patch: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...patch }));

  const validateForm = () => {
    const required = ["title", "academic_year_id", "branch_id", "class_id", "section_id", "subject_id"] as const;
    if (required.some((key) => !String(form[key] || "").trim())) return "Complete all required academic fields.";
    if (mode !== "materials" && form.due_date < today()) return "Due date should not be in the past.";
    if (mode !== "materials" && Number(form.total_marks) <= 0) return "Total marks must be greater than zero.";
    if (file && file.size > 25 * 1024 * 1024) return "File size must be 25 MB or less.";
    if (mode === "materials" && !file && !form.external_url.trim()) return "Upload a file or enter a URL.";
    return "";
  };

  const saveContent = async () => {
    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }
    setSaving(true);
    try {
      const body = new FormData();
      body.set("title", form.title.trim());
      body.set("description", form.description.trim());
      body.set("academic_year_id", form.academic_year_id);
      body.set("branch_id", form.branch_id);
      body.set("class_id", form.class_id);
      body.set("section_id", form.section_id);
      body.set("subject_id", form.subject_id);
      if (mode === "materials") {
        body.set("material_type", form.material_type);
        if (form.external_url.trim()) body.set("external_url", form.external_url.trim());
      } else {
        body.set("total_marks", form.total_marks);
        body.set("due_date", form.due_date);
        body.set("instructions", form.instructions.trim());
        if (mode === "assessments") body.set("assessment_type", form.assessment_type);
      }
      if (file) body.set("file", file);
      await api.upload(`/teacher-content/teacher/${mode}`, body);
      toast.success(mode === "materials" ? "Material uploaded" : mode === "assessments" ? "Assessment created" : "Assignment created");
      setForm((prev) => ({ ...prev, title: "", description: "", external_url: "", instructions: "" }));
      setFile(null);
      await loadRows();
    } catch (error: any) {
      toast.error(error?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const submitAssignment = async (assignment: ContentRow) => {
    const submitFile = submissionFiles[assignment.id];
    const remarks = submissionRemarks[assignment.id] || "";
    if (!submitFile && !remarks.trim()) {
      toast.error("Add a file or remarks before submitting.");
      return;
    }
    const body = new FormData();
    if (remarks.trim()) body.set("remarks", remarks.trim());
    if (submitFile) body.set("file", submitFile);
    await api.upload(`/teacher-content/student/assignments/${assignment.id}/submit`, body);
    toast.success("Assignment submitted");
    await loadRows();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isStudent ? "Academic Work" : "Teacher Academic Content"}
        description={isStudent ? "View class materials, assessments, and assignments shared with your section." : "Create materials, assessments, and assignments only for your linked academic scope."}
      />

      <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="materials"><BookOpen className="mr-2 h-4 w-4" />Materials</TabsTrigger>
          <TabsTrigger value="assessments"><ClipboardCheck className="mr-2 h-4 w-4" />Assessments</TabsTrigger>
          <TabsTrigger value="assignments"><FileUp className="mr-2 h-4 w-4" />Assignments</TabsTrigger>
        </TabsList>

        {!isStudent && (
          <Card className="p-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <Field label="Title">
                <Input value={form.title} onChange={(event) => updateForm({ title: event.target.value })} />
              </Field>
              <Field label="Academic Year">
                <OptionSelect value={form.academic_year_id} options={dropdowns.academic_years} placeholder="Academic year" onChange={(value) => updateForm({ academic_year_id: value })} />
              </Field>
              <Field label="Branch">
                <OptionSelect value={form.branch_id} options={dropdowns.branches} placeholder="Branch" onChange={(value) => updateForm({ branch_id: value, class_id: "", section_id: "", subject_id: "" })} />
              </Field>
              <Field label="Class">
                <OptionSelect value={form.class_id} options={availableClasses} placeholder="Class" onChange={(value) => updateForm({ class_id: value, section_id: "", subject_id: "" })} />
              </Field>
              <Field label="Section">
                <OptionSelect value={form.section_id} options={availableSections} placeholder="Section" onChange={(value) => updateForm({ section_id: value })} />
              </Field>
              <Field label="Subject">
                <OptionSelect value={form.subject_id} options={availableSubjects} placeholder="Subject" onChange={(value) => updateForm({ subject_id: value })} />
              </Field>

              {mode === "materials" && (
                <>
                  <Field label="Material Type">
                    <ValueSelect value={form.material_type} options={materialTypes} onChange={(value) => updateForm({ material_type: value })} />
                  </Field>
                  <Field label="File">
                    <Input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} />
                  </Field>
                  <Field label="URL">
                    <Input value={form.external_url} onChange={(event) => updateForm({ external_url: event.target.value })} placeholder="https://..." />
                  </Field>
                </>
              )}

              {mode === "assessments" && (
                <Field label="Assessment Type">
                  <ValueSelect value={form.assessment_type} options={assessmentTypes} onChange={(value) => updateForm({ assessment_type: value })} />
                </Field>
              )}

              {mode !== "materials" && (
                <>
                  <Field label="Total Marks">
                    <Input type="number" min="1" value={form.total_marks} onChange={(event) => updateForm({ total_marks: event.target.value })} />
                  </Field>
                  <Field label="Due Date">
                    <Input type="date" min={today()} value={form.due_date} onChange={(event) => updateForm({ due_date: event.target.value })} />
                  </Field>
                  <Field label="Attachment">
                    <Input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} />
                  </Field>
                </>
              )}

              <div className="lg:col-span-3 grid gap-4 lg:grid-cols-2">
                <Field label="Description">
                  <Textarea value={form.description} onChange={(event) => updateForm({ description: event.target.value })} />
                </Field>
                {mode !== "materials" && (
                  <Field label="Instructions">
                    <Textarea value={form.instructions} onChange={(event) => updateForm({ instructions: event.target.value })} />
                  </Field>
                )}
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={saveContent} disabled={saving || dropdowns.branches.length === 0}>
                <Plus className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : mode === "materials" ? "Upload Material" : mode === "assessments" ? "Create Assessment" : "Create Assignment"}
              </Button>
            </div>
          </Card>
        )}

        <Card className="p-4">
          <div className="grid gap-4 md:grid-cols-6">
            <Field label="Academic Year"><OptionSelect value={filters.academic_year_id} options={dropdowns.academic_years} placeholder="All" allowAll onChange={(value) => setFilters((prev) => ({ ...prev, academic_year_id: value }))} /></Field>
            <Field label="Class"><OptionSelect value={filters.class_id} options={dropdowns.classes} placeholder="All" allowAll onChange={(value) => setFilters((prev) => ({ ...prev, class_id: value }))} /></Field>
            <Field label="Section"><OptionSelect value={filters.section_id} options={dropdowns.sections} placeholder="All" allowAll onChange={(value) => setFilters((prev) => ({ ...prev, section_id: value }))} /></Field>
            <Field label="Subject"><OptionSelect value={filters.subject_id} options={dropdowns.subjects} placeholder="All" allowAll onChange={(value) => setFilters((prev) => ({ ...prev, subject_id: value }))} /></Field>
            {mode !== "materials" && <Field label="From"><Input type="date" value={filters.from_date} onChange={(event) => setFilters((prev) => ({ ...prev, from_date: event.target.value }))} /></Field>}
            {mode !== "materials" && <Field label="To"><Input type="date" value={filters.to_date} onChange={(event) => setFilters((prev) => ({ ...prev, to_date: event.target.value }))} /></Field>}
          </div>
        </Card>

        <TabsContent value={mode} className="space-y-3">
          {loading && <div className="text-sm text-muted-foreground">Loading...</div>}
          {!loading && rows.length === 0 && (
            <Card className="border-dashed p-6 text-sm text-muted-foreground">No {mode} found for the selected filters.</Card>
          )}
          {rows.map((row) => (
            <Card key={row.id} className="p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{row.title}</h2>
                    {row.material_type && <Badge variant="outline">{titleCase(row.material_type)}</Badge>}
                    {row.assessment_type && <Badge variant="outline">{titleCase(row.assessment_type)}</Badge>}
                    {row.submitted && <Badge>Submitted</Badge>}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {row.academic_year_label || "-"} · {row.branch_name || "-"} · {row.class_name || "-"} / {row.section_name || "-"} · {row.subject_name || "-"}
                  </div>
                  {row.description && <p className="mt-2 text-sm">{row.description}</p>}
                  {row.due_date && (
                    <div className="mt-2 text-sm">
                      Due {new Date(row.due_date).toLocaleDateString()} · {row.total_marks} marks
                      {typeof row.submission_count === "number" ? ` · ${row.submission_count} submissions` : ""}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {row.external_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={row.external_url} target="_blank" rel="noreferrer"><LinkIcon className="mr-2 h-4 w-4" />Open URL</a>
                    </Button>
                  )}
                  {(row.file_url || row.attachment_url) && (
                    <Button variant="outline" size="sm" onClick={() => api.download(`/teacher-content/files/${mode}/${row.id}/download`, row.file_name || row.attachment_name || "download")}>
                      Download
                    </Button>
                  )}
                </div>
              </div>

              {isStudent && mode === "assignments" && !row.submitted && (
                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <Input placeholder="Submission remarks" value={submissionRemarks[row.id] || ""} onChange={(event) => setSubmissionRemarks((prev) => ({ ...prev, [row.id]: event.target.value }))} />
                  <Input type="file" onChange={(event) => setSubmissionFiles((prev) => ({ ...prev, [row.id]: event.target.files?.[0] || null }))} />
                  <Button onClick={() => submitAssignment(row)}>
                    <Send className="mr-2 h-4 w-4" />Submit
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function OptionSelect({
  value,
  options,
  placeholder,
  onChange,
  allowAll = false,
}: {
  value: string;
  options: Option[];
  placeholder: string;
  onChange: (value: string) => void;
  allowAll?: boolean;
}) {
  const selectOptions = [
    ...(allowAll ? [{ value: "all", label: "All" }] : []),
    ...options.map((item) => ({ value: item.id, label: itemLabel(item) })),
  ];

  return (
    <SearchableSelect
      value={value || (allowAll ? "all" : "")}
      onValueChange={(next) => onChange(next === "all" ? "" : next)}
      options={selectOptions}
      placeholder={placeholder}
      searchPlaceholder={`Search ${placeholder.toLowerCase()}...`}
    />
  );
}

function ValueSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[][];
  onChange: (value: string) => void;
}) {
  return (
    <SearchableSelect
      value={value}
      onValueChange={onChange}
      options={options.map(([id, label]) => ({ value: id, label }))}
      placeholder="Select"
      searchPlaceholder="Search options..."
    />
  );
}
