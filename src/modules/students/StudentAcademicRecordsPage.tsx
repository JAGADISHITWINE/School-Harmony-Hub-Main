import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { BookOpenCheck, CalendarRange, GitBranch, History, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Field, FieldGrid } from "@/components/common/FormFields";
import { FormModal } from "@/components/common/FormModal";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zResolver } from "@/modules/zodResolver";
import { api } from "@/services";
import type { ListParams, Paginated } from "@/types";
import { useAuth } from "@/store/auth";
import { StudentModuleNav } from "./StudentModuleNav";

interface BackendStudent {
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

interface AcademicRecordItem {
  id: string;
  student_id: string;
  branch_id: string;
  branch_name?: string | null;
  class_id?: string | null;
  class_name?: string | null;
  section_id: string;
  section_name?: string | null;
  academic_year_id: string;
  academic_year_label?: string | null;
  status: string;
  enrolled_at: string;
  exited_at?: string | null;
}

interface AcademicYearOption {
  id: string;
  label: string;
}

interface CourseOption {
  id: string;
  name: string;
}

interface BranchOption {
  id: string;
  name: string;
}

interface ClassOption {
  id: string;
  name: string;
}

interface SectionOption {
  id: string;
  name: string;
}

const recordSchema = z.object({
  academic_year_id: z.string().min(1, "Academic year required"),
  course_id: z.string().min(1, "Course required"),
  branch_id: z.string().min(1, "Branch required"),
  class_id: z.string().min(1, "Class required"),
  section_id: z.string().min(1, "Section required"),
});

type RecordFormValues = z.infer<typeof recordSchema>;

const defaultRecordValues: RecordFormValues = {
  academic_year_id: "",
  course_id: "",
  branch_id: "",
  class_id: "",
  section_id: "",
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

function statusTone(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "active":
      return "bg-emerald-500/10 text-emerald-700";
    case "transferred":
      return "bg-amber-500/10 text-amber-700";
    case "graduated":
      return "bg-sky-500/10 text-sky-700";
    case "dropped":
      return "bg-rose-500/10 text-rose-700";
    case "detained":
      return "bg-orange-500/10 text-orange-700";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function StudentAcademicRecordsPage() {
  const { user } = useAuth();
  const [params, setParams] = useState<ListParams>({ page: 1, pageSize: 10, search: "" });
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<BackendStudent[]>([]);
  const [activeStudent, setActiveStudent] = useState<BackendStudent | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordBusy, setRecordBusy] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyItems, setHistoryItems] = useState<AcademicRecordItem[]>([]);
  const [years, setYears] = useState<AcademicYearOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);

  const form = useForm<RecordFormValues>({
    resolver: zResolver(recordSchema),
    defaultValues: defaultRecordValues,
  });

  const {
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors },
  } = form;

  const courseId = watch("course_id");
  const branchId = watch("branch_id");
  const classId = watch("class_id");

  useEffect(() => {
    let cancelled = false;
    const loadStudents = async () => {
      setLoading(true);
      try {
        const res = await api.get<any>("/students?page=1&page_size=200");
        const rows = ((Array.isArray(res?.data?.items) && res.data.items) || []) as BackendStudent[];
        if (!cancelled) setStudents(rows);
      } catch {
        if (!cancelled) setStudents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadStudents();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!recordOpen || !user?.institution_id) return;
    let cancelled = false;
    const loadBaseOptions = async () => {
      try {
        const [yearsRes, coursesRes] = await Promise.all([
          api.get<any>(`/academic-years?institution_id=${user.institution_id}&page=1&page_size=100`),
          api.get<any>(`/courses?institution_id=${user.institution_id}&page=1&page_size=100`),
        ]);
        if (cancelled) return;
        const nextYears = ((Array.isArray(yearsRes?.data?.items) && yearsRes.data.items) || []) as AcademicYearOption[];
        const nextCourses = ((Array.isArray(coursesRes?.data?.items) && coursesRes.data.items) || []) as CourseOption[];
        setYears(nextYears);
        setCourses(nextCourses);
        setValue("academic_year_id", nextYears[0]?.id || "", { shouldValidate: true });
      } catch {
        if (!cancelled) {
          setYears([]);
          setCourses([]);
        }
      }
    };
    loadBaseOptions();
    return () => {
      cancelled = true;
    };
  }, [recordOpen, setValue, user?.institution_id]);

  useEffect(() => {
    if (!recordOpen) return;
    if (!courseId) {
      setBranches([]);
      setClasses([]);
      setSections([]);
      setValue("branch_id", "", { shouldValidate: true });
      setValue("class_id", "", { shouldValidate: true });
      setValue("section_id", "", { shouldValidate: true });
      return;
    }

    let cancelled = false;
    const loadBranches = async () => {
      try {
        const res = await api.get<any>(`/branches?course_id=${courseId}&page=1&page_size=100`);
        if (cancelled) return;
        const rows = ((Array.isArray(res?.data?.items) && res.data.items) || []) as BranchOption[];
        setBranches(rows);
        setClasses([]);
        setSections([]);
        setValue("branch_id", "", { shouldValidate: true });
        setValue("class_id", "", { shouldValidate: true });
        setValue("section_id", "", { shouldValidate: true });
      } catch {
        if (!cancelled) {
          setBranches([]);
          setClasses([]);
          setSections([]);
        }
      }
    };
    loadBranches();
    return () => {
      cancelled = true;
    };
  }, [courseId, recordOpen, setValue]);

  useEffect(() => {
    if (!recordOpen) return;
    if (!branchId) {
      setClasses([]);
      setSections([]);
      setValue("class_id", "", { shouldValidate: true });
      setValue("section_id", "", { shouldValidate: true });
      return;
    }

    let cancelled = false;
    const loadClasses = async () => {
      try {
        const res = await api.get<any>(`/classes?branch_id=${branchId}&page=1&page_size=100`);
        if (cancelled) return;
        const rows = ((Array.isArray(res?.data?.items) && res.data.items) || []) as ClassOption[];
        setClasses(rows);
        setSections([]);
        setValue("class_id", "", { shouldValidate: true });
        setValue("section_id", "", { shouldValidate: true });
      } catch {
        if (!cancelled) {
          setClasses([]);
          setSections([]);
        }
      }
    };
    loadClasses();
    return () => {
      cancelled = true;
    };
  }, [branchId, recordOpen, setValue]);

  useEffect(() => {
    if (!recordOpen) return;
    if (!classId) {
      setSections([]);
      setValue("section_id", "", { shouldValidate: true });
      return;
    }

    let cancelled = false;
    const loadSections = async () => {
      try {
        const res = await api.get<any>(`/sections?class_id=${classId}&page=1&page_size=100`);
        if (cancelled) return;
        const rows = ((Array.isArray(res?.data?.items) && res.data.items) || []) as SectionOption[];
        setSections(rows);
        setValue("section_id", "", { shouldValidate: true });
      } catch {
        if (!cancelled) setSections([]);
      }
    };
    loadSections();
    return () => {
      cancelled = true;
    };
  }, [classId, recordOpen, setValue]);

  const filteredStudents = useMemo(() => {
    const search = (params.search || "").trim().toLowerCase();
    const rows = !search
      ? students
      : students.filter((student) =>
      [
        student.full_name,
        student.email,
        student.roll_number,
        student.current_branch_name,
        student.current_class_name,
        student.current_section_name,
        student.current_academic_year_label,
        student.current_status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search))
      );

    if (!params.sortBy) return rows;

    const direction = params.sortDir === "desc" ? -1 : 1;
    return [...rows].sort((left, right) => {
      const leftValue = String((left as Record<string, unknown>)[params.sortBy!] ?? "").toLowerCase();
      const rightValue = String((right as Record<string, unknown>)[params.sortBy!] ?? "").toLowerCase();
      if (leftValue < rightValue) return -1 * direction;
      if (leftValue > rightValue) return 1 * direction;
      return 0;
    });
  }, [params.search, params.sortBy, params.sortDir, students]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredStudents.length / (params.pageSize ?? 10)));
    if ((params.page ?? 1) > totalPages) {
      setParams((current) => ({ ...current, page: totalPages }));
    }
  }, [filteredStudents.length, params.page, params.pageSize]);

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const pagedStudents = filteredStudents.slice((page - 1) * pageSize, page * pageSize);

  const tableData: Paginated<BackendStudent> = {
    data: pagedStudents,
    total: filteredStudents.length,
    page,
    pageSize,
  };

  const activeCount = students.filter((student) => (student.current_status || "").toLowerCase() === "active").length;
  const transitionedCount = students.filter((student) => (student.current_status || "").toLowerCase() === "transferred").length;
  const yearCount = new Set(students.map((student) => student.current_academic_year_label).filter(Boolean)).size;
  const branchCount = new Set(students.map((student) => student.current_branch_name).filter(Boolean)).size;

  const openHistory = async (student: BackendStudent) => {
    setActiveStudent(student);
    setHistoryOpen(true);
    setHistoryBusy(true);
    try {
      const res = await api.get<any>(`/students/${student.id}/academic-records`);
      const rows = ((Array.isArray(res?.data) && res.data) || []) as AcademicRecordItem[];
      setHistoryItems(rows);
    } catch {
      setHistoryItems([]);
    } finally {
      setHistoryBusy(false);
    }
  };

  const openAddRecord = (student: BackendStudent) => {
    setActiveStudent(student);
    setRecordOpen(true);
    setHistoryItems([]);
    setBranches([]);
    setClasses([]);
    setSections([]);
    reset(defaultRecordValues);
  };

  const closeRecordModal = (nextOpen: boolean) => {
    if (nextOpen) return;
    setRecordOpen(false);
    setRecordBusy(false);
    setActiveStudent(null);
    setBranches([]);
    setClasses([]);
    setSections([]);
    reset(defaultRecordValues);
  };

  const closeHistoryModal = (nextOpen: boolean) => {
    if (nextOpen) return;
    setHistoryOpen(false);
    setHistoryBusy(false);
    setHistoryItems([]);
    setActiveStudent(null);
  };

  const submitRecord = handleSubmit(async (values) => {
    if (!activeStudent) return;
    setRecordBusy(true);
    try {
      await api.post(`/students/${activeStudent.id}/academic-record`, {
        branch_id: values.branch_id,
        section_id: values.section_id,
        academic_year_id: values.academic_year_id,
      });
      toast.success("Academic record added");
      closeRecordModal(false);
      setLoading(true);
      const res = await api.get<any>("/students?page=1&page_size=200");
      const rows = ((Array.isArray(res?.data?.items) && res.data.items) || []) as BackendStudent[];
      setStudents(rows);
    } catch {
      // global API handler already shows the error toast
    } finally {
      setRecordBusy(false);
      setLoading(false);
    }
  });

  const columns: Column<BackendStudent>[] = [
    {
      key: "full_name",
      header: "Student",
      sortable: true,
      cell: (row) => (
        <div className="text-sm">
          <div className="font-medium">{row.full_name}</div>
          <div className="text-xs text-muted-foreground">{row.email}</div>
        </div>
      ),
    },
    {
      key: "roll_number",
      header: "Roll No",
      sortable: true,
      cell: (row) => <span className="font-mono text-xs">{row.roll_number}</span>,
    },
    {
      key: "current_branch_name",
      header: "Current Allocation",
      cell: (row) => (
        <div className="text-sm">
          <div>{row.current_branch_name || "-"}</div>
          <div className="text-xs text-muted-foreground">
            {[row.current_class_name, row.current_section_name, row.current_academic_year_label]
              .filter(Boolean)
              .join(" · ") || "-"}
          </div>
        </div>
      ),
    },
    {
      key: "current_status",
      header: "Status",
      sortable: true,
      cell: (row) => (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusTone(row.current_status)}`}>
          {row.current_status || "unknown"}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Joined",
      sortable: true,
      cell: (row) => <span className="text-sm text-muted-foreground">{formatDate(row.created_at)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Student Academic Records"
        description="Handle student allocations, promotions, and academic-year history without overwriting the student master."
      />
      <StudentModuleNav />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students Loaded" value={students.length} icon={BookOpenCheck} trend="Registry-backed academic list" />
        <StatCard label="Active Records" value={activeCount} icon={CalendarRange} accent="blue" trend="Current running allocations" />
        <StatCard label="Transferred" value={transitionedCount} icon={History} accent="amber" trend="Students with moved active records" />
        <StatCard label="Branches Covered" value={branchCount || 0} icon={GitBranch} accent="rose" trend={`${yearCount || 0} academic years in view`} />
      </div>

      <div className="mt-6">
        <DataTable<BackendStudent>
          columns={columns}
          data={tableData}
          loading={loading}
          params={params}
          onParamsChange={setParams}
          selectable={false}
          searchPlaceholder="Search by student, roll number, branch, class or year…"
          rowActions={(row) => (
            <div className="inline-flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => openHistory(row)}>
                History
              </Button>
              <Button variant="ghost" size="sm" onClick={() => openAddRecord(row)}>
                <Plus className="mr-1 h-4 w-4" />
                New Record
              </Button>
            </div>
          )}
          emptyText="No student academic records available yet."
        />
      </div>

      <FormModal
        open={historyOpen}
        onOpenChange={closeHistoryModal}
        title={activeStudent ? `${activeStudent.full_name} academic history` : "Academic history"}
        description={activeStudent ? `${activeStudent.roll_number} · ${activeStudent.current_branch_name || "No branch assigned"}` : undefined}
        size="xl"
      >
        <div className="space-y-4">
          {historyBusy && (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              Loading academic history...
            </div>
          )}

          {!historyBusy && historyItems.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              No academic history found for this student yet.
            </div>
          )}

          {!historyBusy && historyItems.length > 0 && historyItems.map((item, index) => (
            <Card key={item.id} className="border-border">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-base">
                    {item.branch_name || "-"} · {item.class_name || "-"} · {item.section_name || "-"}
                  </CardTitle>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusTone(item.status)}`}>
                    {item.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                <div>
                  <div className="text-xs uppercase tracking-wider">Academic Year</div>
                  <div className="mt-1 text-foreground">{item.academic_year_label || "-"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider">Timeline</div>
                  <div className="mt-1 text-foreground">
                    {formatDateTime(item.enrolled_at)} to {item.exited_at ? formatDateTime(item.exited_at) : "Present"}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider">Record Order</div>
                  <div className="mt-1 text-foreground">#{historyItems.length - index}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider">Placement</div>
                  <div className="mt-1 text-foreground">
                    {[item.branch_name, item.class_name, item.section_name].filter(Boolean).join(" / ") || "-"}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </FormModal>

      <FormModal
        open={recordOpen}
        onOpenChange={closeRecordModal}
        title={activeStudent ? `New academic record for ${activeStudent.full_name}` : "New academic record"}
        description="Use this for promotion, transfer, or a new academic-year allocation. The current active record will be closed automatically."
        size="lg"
        onSubmit={submitRecord}
        busy={recordBusy}
        submitLabel="Save record"
      >
        <form onSubmit={submitRecord} className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <div className="font-medium text-foreground">{activeStudent?.full_name || "-"}</div>
            <div className="mt-1 text-muted-foreground">
              Current: {[activeStudent?.current_branch_name, activeStudent?.current_class_name, activeStudent?.current_section_name, activeStudent?.current_academic_year_label]
                .filter(Boolean)
                .join(" · ") || "No active allocation"}
            </div>
          </div>

          <FieldGrid>
            <Field label="Academic Year" error={errors.academic_year_id?.message}>
              <Select value={watch("academic_year_id") || ""} onValueChange={(value) => setValue("academic_year_id", value, { shouldValidate: true })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select academic year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Course" error={errors.course_id?.message}>
              <Select value={watch("course_id") || ""} onValueChange={(value) => setValue("course_id", value, { shouldValidate: true })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Branch" error={errors.branch_id?.message}>
              <Select
                value={watch("branch_id") || ""}
                onValueChange={(value) => setValue("branch_id", value, { shouldValidate: true })}
                disabled={!courseId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Class" error={errors.class_id?.message}>
              <Select
                value={watch("class_id") || ""}
                onValueChange={(value) => setValue("class_id", value, { shouldValidate: true })}
                disabled={!branchId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Section" error={errors.section_id?.message} className="sm:col-span-2">
              <Select
                value={watch("section_id") || ""}
                onValueChange={(value) => setValue("section_id", value, { shouldValidate: true })}
                disabled={!classId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGrid>
        </form>
      </FormModal>
    </div>
  );
}
