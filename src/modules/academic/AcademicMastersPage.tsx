import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { FormModal } from "@/components/common/FormModal";
import { Field, FieldGrid } from "@/components/common/FormFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useAuth } from "@/store/auth";
import type { ListParams, Paginated } from "@/types";

type AcademicTab = "academic-years" | "courses" | "branches" | "subjects" | "classes" | "sections";

interface AcademicYear {
  id: string;
  institution_id: string;
  label: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_active: boolean;
}

interface Course {
  id: string;
  institution_id: string;
  name: string;
  code: string;
  level: string;
  duration_years: number;
  is_active: boolean;
}

interface Branch {
  id: string;
  course_id: string;
  name: string;
  code: string;
  is_active: boolean;
}

interface Subject {
  id: string;
  branch_id: string;
  academic_year_id: string | null;
  name: string;
  code: string;
  credits: number;
  is_active: boolean;
}

interface ClassRow {
  id: string;
  branch_id: string;
  academic_year_id: string | null;
  name: string;
  semester: number;
}

interface Section {
  id: string;
  class_id: string;
  name: string;
  max_strength: number;
}

interface Institution {
  id: string;
  org_id: string;
  name: string;
  code: string;
  is_active: boolean;
}

const tabs: { value: AcademicTab; label: string }[] = [
  { value: "academic-years", label: "Academic Years" },
  { value: "courses", label: "Courses" },
  { value: "branches", label: "Branches" },
  { value: "subjects", label: "Subjects" },
  { value: "classes", label: "Classes" },
  { value: "sections", label: "Sections" },
];

const emptyPage = <T,>(): Paginated<T> => ({ data: [], total: 0, page: 1, pageSize: 10 });

function rowsOf<T>(res: any): T[] {
  return ((Array.isArray(res?.data?.items) && res.data.items) || []) as T[];
}

function pageOf<T>(res: any): Paginated<T> {
  const rows = rowsOf<T>(res);
  return {
    data: rows,
    total: Number(res?.data?.total ?? rows.length),
    page: Number(res?.data?.page ?? 1),
    pageSize: Number(res?.data?.page_size ?? 10),
  };
}

function normalizeSearch(value: string | undefined) {
  return String(value || "").trim().toLowerCase();
}

function filterPage<T>(page: Paginated<T>, search: string | undefined, fields: Array<keyof T>) {
  const q = normalizeSearch(search);
  if (!q) return page;
  const data = page.data.filter((row) =>
    fields.some((field) => String(row[field] ?? "").toLowerCase().includes(q))
  );
  return { ...page, data, total: data.length };
}

function localPage<T>(page: Paginated<T>, params: ListParams) {
  const pageNo = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const start = (pageNo - 1) * pageSize;
  return {
    data: page.data.slice(start, start + pageSize),
    total: page.total,
    page: pageNo,
    pageSize,
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nextYear() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export function AcademicMastersPage({ initialTab = "academic-years" }: { initialTab?: AcademicTab }) {
  const { user } = useAuth();
  const institutionId = user?.institution_id || "";
  const organizationId = user?.organization_id || "";
  const [activeInstitutionId, setActiveInstitutionId] = useState(institutionId);
  const [activeTab, setActiveTab] = useState<AcademicTab>(initialTab);
  const [params, setParams] = useState<ListParams>({ page: 1, pageSize: 10, search: "" });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);

  const [academicYears, setAcademicYears] = useState<Paginated<AcademicYear>>(emptyPage);
  const [courses, setCourses] = useState<Paginated<Course>>(emptyPage);
  const [branches, setBranches] = useState<Paginated<Branch>>(emptyPage);
  const [subjects, setSubjects] = useState<Paginated<Subject>>(emptyPage);
  const [classes, setClasses] = useState<Paginated<ClassRow>>(emptyPage);
  const [sections, setSections] = useState<Paginated<Section>>(emptyPage);

  const [courseFilter, setCourseFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");

  const [form, setForm] = useState<Record<string, any>>({});
  const [formAcademicYears, setFormAcademicYears] = useState<AcademicYear[]>([]);
  const [formCourses, setFormCourses] = useState<Course[]>([]);
  const [formBranches, setFormBranches] = useState<Branch[]>([]);
  const [formClasses, setFormClasses] = useState<ClassRow[]>([]);

  const courseOptions = courses.data;
  const branchOptions = branches.data;
  const yearOptions = academicYears.data;
  const classOptions = classes.data;

  const courseName = useMemo(() => new Map(courseOptions.map((c) => [c.id, c.name])), [courseOptions]);
  const branchName = useMemo(() => new Map(branchOptions.map((b) => [b.id, b.name])), [branchOptions]);
  const yearName = useMemo(() => new Map(yearOptions.map((y) => [y.id, y.label])), [yearOptions]);
  const className = useMemo(() => new Map(classOptions.map((c) => [c.id, c.name])), [classOptions]);
  const branchToCourse = useMemo(() => new Map(branchOptions.map((b) => [b.id, b.course_id])), [branchOptions]);
  const classToBranch = useMemo(() => new Map(classOptions.map((c) => [c.id, c.branch_id])), [classOptions]);
  const currentInstitution = useMemo(
    () => institutions.find((item) => item.id === activeInstitutionId) || null,
    [institutions, activeInstitutionId],
  );

  const deriveInstitutionId = (row: any) => {
    if (row?.institution_id) return row.institution_id as string;
    if (row?.course_id) {
      return courseOptions.find((course) => course.id === row.course_id)?.institution_id || activeInstitutionId || institutionId;
    }
    if (row?.branch_id) {
      const courseId = branchToCourse.get(row.branch_id);
      return courseOptions.find((course) => course.id === courseId)?.institution_id || activeInstitutionId || institutionId;
    }
    if (row?.class_id) {
      const branchId = classToBranch.get(row.class_id);
      const courseId = branchId ? branchToCourse.get(branchId) : "";
      return courseOptions.find((course) => course.id === courseId)?.institution_id || activeInstitutionId || institutionId;
    }
    return activeInstitutionId || institutionId;
  };

  const loadInstitutions = async () => {
    if (!organizationId) {
      if (institutionId) {
        setInstitutions([
          {
            id: institutionId,
            org_id: "",
            name: "Current Institution",
            code: "",
            is_active: true,
          },
        ]);
      } else {
        setInstitutions([]);
      }
      return;
    }

    try {
      const res = await api.get<any>(`/institutions?org_id=${organizationId}&page=1&page_size=100`);
      const rows = ((Array.isArray(res?.data?.items) && res.data.items) || []) as Institution[];
      const activeRows = rows.filter((item) => item.is_active !== false);
      setInstitutions(activeRows);
      if (!activeRows.some((item) => item.id === activeInstitutionId)) {
        setActiveInstitutionId(activeRows[0]?.id || "");
      }
    } catch {
      if (institutionId) {
        setInstitutions([
          {
            id: institutionId,
            org_id: organizationId,
            name: "Current Institution",
            code: "",
            is_active: true,
          },
        ]);
        if (!activeInstitutionId) setActiveInstitutionId(institutionId);
      } else {
        setInstitutions([]);
        setActiveInstitutionId("");
      }
    }
  };

  const loadAcademicYears = async () => {
    if (!activeInstitutionId) return;
    const res = await api.get<any>(`/academic-years?institution_id=${activeInstitutionId}&page=1&page_size=100`);
    setAcademicYears(pageOf<AcademicYear>(res));
  };

  const loadCourses = async () => {
    if (!activeInstitutionId) return;
    const res = await api.get<any>(`/courses?institution_id=${activeInstitutionId}&page=1&page_size=100`);
    const page = pageOf<Course>(res);
    setCourses(page);
    if (!page.data.some((course) => course.id === courseFilter)) {
      setCourseFilter(page.data[0]?.id || "");
    }
  };

  const loadBranches = async (courseId = courseFilter) => {
    if (!courseId) {
      setBranches(emptyPage);
      return;
    }
    const res = await api.get<any>(`/branches?course_id=${courseId}&page=1&page_size=100`);
    const page = pageOf<Branch>(res);
    setBranches(page);
    if (!page.data.some((branch) => branch.id === branchFilter)) {
      setBranchFilter(page.data[0]?.id || "");
    }
  };

  const loadSubjects = async (branchId = branchFilter) => {
    if (!branchId) {
      setSubjects(emptyPage);
      return;
    }
    const res = await api.get<any>(`/subjects?branch_id=${branchId}&page=1&page_size=100`);
    setSubjects(pageOf<Subject>(res));
  };

  const loadClasses = async (branchId = branchFilter) => {
    if (!branchId) {
      setClasses(emptyPage);
      return;
    }
    const res = await api.get<any>(`/classes?branch_id=${branchId}&page=1&page_size=100`);
    const page = pageOf<ClassRow>(res);
    setClasses(page);
    if (!page.data.some((row) => row.id === classFilter)) {
      setClassFilter(page.data[0]?.id || "");
    }
  };

  const loadSections = async (classId = classFilter) => {
    if (!classId) {
      setSections(emptyPage);
      return;
    }
    const res = await api.get<any>(`/sections?class_id=${classId}&page=1&page_size=100`);
    setSections(pageOf<Section>(res));
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await loadInstitutions();
      await loadAcademicYears();
      await loadCourses();
    } catch (error: any) {
      toast.error(error?.message || "Unable to load academic masters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (institutionId && !activeInstitutionId) setActiveInstitutionId(institutionId);
  }, [institutionId, activeInstitutionId]);

  useEffect(() => {
    loadAll();
  }, [activeInstitutionId, organizationId]);

  useEffect(() => {
    if (courseFilter) loadBranches(courseFilter).catch(() => {});
  }, [courseFilter]);

  useEffect(() => {
    if (branchFilter) {
      loadSubjects(branchFilter).catch(() => {});
      loadClasses(branchFilter).catch(() => {});
    }
  }, [branchFilter]);

  useEffect(() => {
    if (classFilter) loadSections(classFilter).catch(() => {});
  }, [classFilter]);

  useEffect(() => {
    if (!mode) return;
    const nextInstitutionId = form.institution_id || activeInstitutionId || institutionId;
    if (!nextInstitutionId) return;

    const loadFormOptions = async () => {
      try {
        const yearsRes = await api.get<any>(`/academic-years?institution_id=${nextInstitutionId}&page=1&page_size=100`);
        const nextYears = rowsOf<AcademicYear>(yearsRes);
        setFormAcademicYears(nextYears);

        const coursesRes = await api.get<any>(`/courses?institution_id=${nextInstitutionId}&page=1&page_size=100`);
        const nextCourses = rowsOf<Course>(coursesRes);
        setFormCourses(nextCourses);

        const branchResponses = await Promise.all(
          nextCourses.map((course) =>
            api.get<any>(`/branches?course_id=${course.id}&page=1&page_size=100`).catch(() => ({ data: { items: [] } })),
          ),
        );
        const nextBranches = branchResponses.flatMap((res) => rowsOf<Branch>(res));
        setFormBranches(nextBranches);

        const classResponses = await Promise.all(
          nextBranches.map((branch) =>
            api.get<any>(`/classes?branch_id=${branch.id}&page=1&page_size=100`).catch(() => ({ data: { items: [] } })),
          ),
        );
        const nextClasses = classResponses.flatMap((res) => rowsOf<ClassRow>(res));
        setFormClasses(nextClasses);

        setForm((prev) => ({
          ...prev,
          institution_id: nextInstitutionId,
          course_id: nextCourses.some((course) => course.id === prev.course_id) ? prev.course_id : nextCourses[0]?.id || "",
          branch_id: nextBranches.some((branch) => branch.id === prev.branch_id) ? prev.branch_id : nextBranches[0]?.id || "",
          academic_year_id: nextYears.some((year) => year.id === prev.academic_year_id) ? prev.academic_year_id : nextYears[0]?.id || "",
          class_id: nextClasses.some((row) => row.id === prev.class_id) ? prev.class_id : nextClasses[0]?.id || "",
        }));
      } catch (error: any) {
        toast.error(error?.message || "Unable to load institution data");
      }
    };

    loadFormOptions();
  }, [mode, form.institution_id, activeInstitutionId, institutionId]);

  const setField = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setMode("create");
    if (activeTab === "academic-years") {
      setForm({ institution_id: activeInstitutionId || institutionId, label: "", start_date: today(), end_date: nextYear(), is_current: "false", is_active: "true" });
    } else if (activeTab === "courses") {
      setForm({ institution_id: activeInstitutionId || institutionId, name: "", code: "", level: "UG", duration_years: 4, is_active: "true" });
    } else if (activeTab === "branches") {
      setForm({ institution_id: activeInstitutionId || institutionId, course_id: courseFilter, name: "", code: "", is_active: "true" });
    } else if (activeTab === "subjects") {
      setForm({ institution_id: activeInstitutionId || institutionId, branch_id: branchFilter, academic_year_id: "", name: "", code: "", credits: 0, is_active: "true" });
    } else if (activeTab === "classes") {
      setForm({ institution_id: activeInstitutionId || institutionId, branch_id: branchFilter, academic_year_id: "", name: "", semester: 1 });
    } else {
      setForm({ institution_id: activeInstitutionId || institutionId, class_id: classFilter, name: "", max_strength: 60 });
    }
  };

  const openEdit = (row: any) => {
    setEditing(row);
    setMode("edit");
    if (activeTab === "academic-years") {
      setForm({ ...row, institution_id: deriveInstitutionId(row), is_current: row.is_current ? "true" : "false", is_active: row.is_active ? "true" : "false" });
    } else if (activeTab === "courses" || activeTab === "branches" || activeTab === "subjects") {
      setForm({ ...row, institution_id: deriveInstitutionId(row), is_active: row.is_active ? "true" : "false" });
    } else {
      setForm({ ...row, institution_id: deriveInstitutionId(row) });
    }
  };

  const refreshActive = async () => {
    if (activeTab === "academic-years") await loadAcademicYears();
    else if (activeTab === "courses") await loadCourses();
    else if (activeTab === "branches") await loadBranches();
    else if (activeTab === "subjects") await loadSubjects();
    else if (activeTab === "classes") await loadClasses();
    else await loadSections();
  };

  const save = async () => {
    if (!form.institution_id) return;
    setBusy(true);
    try {
      if (activeTab === "academic-years") {
        const payload = {
          institution_id: form.institution_id,
          label: form.label,
          start_date: form.start_date,
          end_date: form.end_date,
          is_current: form.is_current === "true",
          is_active: form.is_active === "true",
        };
        if (editing) await api.patch(`/academic-years/${editing.id}`, payload);
        else await api.post("/academic-years", payload);
      } else if (activeTab === "courses") {
        const payload = {
          institution_id: form.institution_id,
          name: form.name,
          code: form.code,
          level: form.level,
          duration_years: Number(form.duration_years),
          is_active: form.is_active === "true",
        };
        if (editing) await api.patch(`/courses/${editing.id}`, payload);
        else await api.post("/courses", payload);
      } else if (activeTab === "branches") {
        const payload = {
          course_id: form.course_id,
          name: form.name,
          code: form.code,
          is_active: form.is_active === "true",
        };
        if (editing) await api.patch(`/branches/${editing.id}`, payload);
        else await api.post("/branches", payload);
      } else if (activeTab === "subjects") {
        const payload = {
          branch_id: form.branch_id,
          academic_year_id: form.academic_year_id || null,
          name: form.name,
          code: form.code,
          credits: Number(form.credits),
          is_active: form.is_active === "true",
        };
        if (editing) await api.patch(`/subjects/${editing.id}`, payload);
        else await api.post("/subjects", payload);
      } else if (activeTab === "classes") {
        const payload = {
          branch_id: form.branch_id,
          academic_year_id: form.academic_year_id || null,
          name: form.name,
          semester: Number(form.semester),
        };
        if (editing) await api.patch(`/classes/${editing.id}`, payload);
        else await api.post("/classes", payload);
      } else {
        const payload = {
          class_id: form.class_id,
          name: form.name,
          max_strength: Number(form.max_strength),
        };
        if (editing) await api.patch(`/sections/${editing.id}`, payload);
        else await api.post("/sections", payload);
      }

      toast.success("Saved");
      setMode(null);
      await refreshActive();
    } finally {
      setBusy(false);
    }
  };

  const activeData = (() => {
    if (activeTab === "academic-years") return filterPage(academicYears, params.search, ["label"]);
    if (activeTab === "courses") return filterPage(courses, params.search, ["name", "code", "level"]);
    if (activeTab === "branches") return filterPage(branches, params.search, ["name", "code"]);
    if (activeTab === "subjects") return filterPage(subjects, params.search, ["name", "code"]);
    if (activeTab === "classes") return filterPage(classes, params.search, ["name"]);
    return filterPage(sections, params.search, ["name"]);
  })();
  const tableData = localPage<any>(activeData as Paginated<any>, params);

  return (
    <div>
      <PageHeader
        title="Academic Masters"
        description="Configure academic years, courses, branches, subjects, classes and sections."
        actions={<Button onClick={openCreate} disabled={!activeInstitutionId}><Plus className="mr-2 h-4 w-4" /> New</Button>}
      />

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as AcademicTab); setParams({ page: 1, pageSize: 10, search: "" }); }}>
        <TabsList className="mb-4 flex h-auto flex-wrap justify-start">
          {tabs.map((tab) => <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <Filters
        activeTab={activeTab}
        institutions={institutions}
        courses={courseOptions}
        branches={branchOptions}
        classes={classOptions}
        activeInstitutionId={activeInstitutionId}
        courseFilter={courseFilter}
        branchFilter={branchFilter}
        classFilter={classFilter}
        setActiveInstitutionId={(value) => {
          setActiveInstitutionId(value);
          setCourseFilter("");
          setBranchFilter("");
          setClassFilter("");
          setParams((prev) => ({ ...prev, page: 1 }));
        }}
        setCourseFilter={setCourseFilter}
        setBranchFilter={setBranchFilter}
        setClassFilter={setClassFilter}
      />

      <DataTable<any>
        columns={getColumns(activeTab, { courseName, branchName, yearName, className }, openEdit)}
        data={tableData as Paginated<any>}
        loading={loading}
        params={params}
        onParamsChange={setParams}
        searchPlaceholder={`Search ${tabs.find((t) => t.value === activeTab)?.label.toLowerCase()}...`}
        rowActions={(row) => <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>Edit</Button>}
      />

      <FormModal
        open={!!mode}
        onOpenChange={(open) => !open && setMode(null)}
        title={`${editing ? "Edit" : "New"} ${tabs.find((t) => t.value === activeTab)?.label.slice(0, -1) || "Record"}`}
        submitLabel={editing ? "Save" : "Create"}
        busy={busy}
        size="lg"
        onSubmit={save}
      >
        <AcademicForm
          activeTab={activeTab}
          form={form}
          setField={setField}
          institutions={institutions}
          courses={formCourses}
          branches={formBranches}
          academicYears={formAcademicYears}
          classes={formClasses}
          currentInstitutionLabel={currentInstitution?.name || "Current Institution"}
        />
      </FormModal>
    </div>
  );
}

function Filters({
  activeTab,
  institutions,
  courses,
  branches,
  classes,
  activeInstitutionId,
  courseFilter,
  branchFilter,
  classFilter,
  setActiveInstitutionId,
  setCourseFilter,
  setBranchFilter,
  setClassFilter,
}: {
  activeTab: AcademicTab;
  institutions: Institution[];
  courses: Course[];
  branches: Branch[];
  classes: ClassRow[];
  activeInstitutionId: string;
  courseFilter: string;
  branchFilter: string;
  classFilter: string;
  setActiveInstitutionId: (v: string) => void;
  setCourseFilter: (v: string) => void;
  setBranchFilter: (v: string) => void;
  setClassFilter: (v: string) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-3 rounded-lg border border-border bg-card p-3">
      <Picker label="Institution" value={activeInstitutionId} onChange={setActiveInstitutionId} items={institutions.map((i) => ({ id: i.id, label: i.name }))} />
      {(activeTab === "branches" || activeTab === "subjects" || activeTab === "classes" || activeTab === "sections") && (
        <Picker label="Course" value={courseFilter} onChange={setCourseFilter} items={courses.map((c) => ({ id: c.id, label: c.name }))} />
      )}
      {(activeTab === "subjects" || activeTab === "classes" || activeTab === "sections") && (
        <Picker label="Branch" value={branchFilter} onChange={setBranchFilter} items={branches.map((b) => ({ id: b.id, label: b.name }))} />
      )}
      {activeTab === "sections" && (
        <Picker label="Class" value={classFilter} onChange={setClassFilter} items={classes.map((c) => ({ id: c.id, label: c.name }))} />
      )}
    </div>
  );
}

function Picker({ label, value, onChange, items }: { label: string; value: string; onChange: (v: string) => void; items: { id: string; label: string }[] }) {
  return (
    <div className="w-full sm:w-64">
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger>
        <SelectContent>
          {items.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function getColumns(
  tab: AcademicTab,
  labels: {
    courseName: Map<string, string>;
    branchName: Map<string, string>;
    yearName: Map<string, string>;
    className: Map<string, string>;
  },
  _openEdit: (row: any) => void,
) {
  const status = (r: any) => <StatusBadge value={r.is_active ? "active" : "inactive"} />;
  if (tab === "academic-years") {
    return [
      { key: "label", header: "Label", sortable: true, cell: (r: AcademicYear) => <span className="font-medium">{r.label}</span> },
      { key: "start_date", header: "Start", cell: (r: AcademicYear) => r.start_date },
      { key: "end_date", header: "End", cell: (r: AcademicYear) => r.end_date },
      { key: "is_current", header: "Current", cell: (r: AcademicYear) => r.is_current ? "Yes" : "No" },
      { key: "is_active", header: "Status", cell: status },
    ];
  }
  if (tab === "courses") {
    return [
      { key: "name", header: "Name", cell: (r: Course) => <span className="font-medium">{r.name}</span> },
      { key: "code", header: "Code", cell: (r: Course) => <span className="font-mono text-xs">{r.code}</span> },
      { key: "level", header: "Level", cell: (r: Course) => r.level },
      { key: "duration_years", header: "Duration", cell: (r: Course) => `${r.duration_years} years` },
      { key: "is_active", header: "Status", cell: status },
    ];
  }
  if (tab === "branches") {
    return [
      { key: "name", header: "Name", cell: (r: Branch) => <span className="font-medium">{r.name}</span> },
      { key: "code", header: "Code", cell: (r: Branch) => <span className="font-mono text-xs">{r.code}</span> },
      { key: "course_id", header: "Course", cell: (r: Branch) => labels.courseName.get(r.course_id) || "-" },
      { key: "is_active", header: "Status", cell: status },
    ];
  }
  if (tab === "subjects") {
    return [
      { key: "name", header: "Name", cell: (r: Subject) => <span className="font-medium">{r.name}</span> },
      { key: "code", header: "Code", cell: (r: Subject) => <span className="font-mono text-xs">{r.code}</span> },
      { key: "branch_id", header: "Branch", cell: (r: Subject) => labels.branchName.get(r.branch_id) || "-" },
      { key: "academic_year_id", header: "Year", cell: (r: Subject) => labels.yearName.get(r.academic_year_id) || "-" },
      { key: "credits", header: "Credits", cell: (r: Subject) => r.credits },
      { key: "is_active", header: "Status", cell: status },
    ];
  }
  if (tab === "classes") {
    return [
      { key: "name", header: "Name", cell: (r: ClassRow) => <span className="font-medium">{r.name}</span> },
      { key: "branch_id", header: "Branch", cell: (r: ClassRow) => labels.branchName.get(r.branch_id) || "-" },
      { key: "academic_year_id", header: "Year", cell: (r: ClassRow) => labels.yearName.get(r.academic_year_id) || "-" },
      { key: "semester", header: "Semester", cell: (r: ClassRow) => r.semester },
    ];
  }
  return [
    { key: "name", header: "Name", cell: (r: Section) => <span className="font-medium">{r.name}</span> },
    { key: "class_id", header: "Class", cell: (r: Section) => labels.className.get(r.class_id) || "-" },
    { key: "max_strength", header: "Max Strength", cell: (r: Section) => r.max_strength },
  ];
}

function AcademicForm({
  activeTab,
  form,
  setField,
  institutions,
  courses,
  branches,
  academicYears,
  classes,
  currentInstitutionLabel,
}: {
  activeTab: AcademicTab;
  form: Record<string, any>;
  setField: (key: string, value: any) => void;
  institutions: Institution[];
  courses: Course[];
  branches: Branch[];
  academicYears: AcademicYear[];
  classes: ClassRow[];
  currentInstitutionLabel: string;
}) {
  return (
    <FieldGrid>
      <SelectField
        label="Institution"
        value={form.institution_id || ""}
        onChange={(v) => setField("institution_id", v)}
        items={(() => {
          const items = institutions.map((institution) => ({ id: institution.id, label: institution.name }));
          if (form.institution_id && !items.some((item) => item.id === form.institution_id)) {
            items.unshift({ id: form.institution_id, label: currentInstitutionLabel });
          }
          return items;
        })()}
      />
      {(activeTab === "branches") && (
        <SelectField label="Course" value={form.course_id || ""} onChange={(v) => setField("course_id", v)} items={courses.map((c) => ({ id: c.id, label: c.name }))} />
      )}
      {(activeTab === "subjects" || activeTab === "classes") && (
        <>
          <SelectField label="Branch" value={form.branch_id || ""} onChange={(v) => setField("branch_id", v)} items={branches.map((b) => ({ id: b.id, label: b.name }))} />
          {activeTab === "subjects" ? (
            <SelectField
              label="Academic Year"
              value={form.academic_year_id || "__none__"}
              onChange={(v) => setField("academic_year_id", v === "__none__" ? "" : v)}
              items={[
                { id: "__none__", label: "All Years" },
                ...academicYears.map((y) => ({ id: y.id, label: y.label })),
              ]}
            />
          ) : (
            <SelectField
              label="Academic Year"
              value={form.academic_year_id || "__none__"}
              onChange={(v) => setField("academic_year_id", v === "__none__" ? "" : v)}
              items={[
                { id: "__none__", label: "All Years" },
                ...academicYears.map((y) => ({ id: y.id, label: y.label })),
              ]}
            />
          )}
        </>
      )}
      {activeTab === "sections" && (
        <SelectField label="Class" value={form.class_id || ""} onChange={(v) => setField("class_id", v)} items={classes.map((c) => ({ id: c.id, label: c.name }))} />
      )}

      {(activeTab === "academic-years") && (
        <>
          <Field label="Label"><Input value={form.label || ""} onChange={(e) => setField("label", e.target.value)} placeholder="2026-27" /></Field>
          <Field label="Start Date"><Input type="date" value={form.start_date || ""} onChange={(e) => setField("start_date", e.target.value)} /></Field>
          <Field label="End Date"><Input type="date" value={form.end_date || ""} onChange={(e) => setField("end_date", e.target.value)} /></Field>
          <BooleanSelect label="Current Year" value={form.is_current || "false"} onChange={(v) => setField("is_current", v)} />
          <BooleanSelect label="Status" value={form.is_active || "true"} onChange={(v) => setField("is_active", v)} activeText="Active" inactiveText="Inactive" />
        </>
      )}

      {(activeTab === "courses") && (
        <>
          <Field label="Name"><Input value={form.name || ""} onChange={(e) => setField("name", e.target.value)} placeholder="Bachelor of Engineering" /></Field>
          <Field label="Code"><Input value={form.code || ""} onChange={(e) => setField("code", e.target.value)} placeholder="BE" /></Field>
          <Field label="Level"><Input value={form.level || ""} onChange={(e) => setField("level", e.target.value)} placeholder="UG" /></Field>
          <Field label="Duration Years"><Input type="number" value={form.duration_years ?? 0} onChange={(e) => setField("duration_years", e.target.value)} /></Field>
          <BooleanSelect label="Status" value={form.is_active || "true"} onChange={(v) => setField("is_active", v)} activeText="Active" inactiveText="Inactive" />
        </>
      )}

      {(activeTab === "branches" || activeTab === "subjects" || activeTab === "classes" || activeTab === "sections") && (
        <Field label="Name"><Input value={form.name || ""} onChange={(e) => setField("name", e.target.value)} placeholder={activeTab === "sections" ? "A" : "Name"} /></Field>
      )}
      {(activeTab === "branches" || activeTab === "subjects") && (
        <Field label="Code"><Input value={form.code || ""} onChange={(e) => setField("code", e.target.value)} placeholder="CSE" /></Field>
      )}
      {activeTab === "subjects" && (
        <>
          <Field label="Credits"><Input type="number" value={form.credits ?? 0} onChange={(e) => setField("credits", e.target.value)} /></Field>
          <BooleanSelect label="Status" value={form.is_active || "true"} onChange={(v) => setField("is_active", v)} activeText="Active" inactiveText="Inactive" />
        </>
      )}
      {activeTab === "branches" && (
        <BooleanSelect label="Status" value={form.is_active || "true"} onChange={(v) => setField("is_active", v)} activeText="Active" inactiveText="Inactive" />
      )}
      {activeTab === "classes" && (
        <Field label="Semester"><Input type="number" value={form.semester ?? 1} onChange={(e) => setField("semester", e.target.value)} /></Field>
      )}
      {activeTab === "sections" && (
        <Field label="Max Strength"><Input type="number" value={form.max_strength ?? 60} onChange={(e) => setField("max_strength", e.target.value)} /></Field>
      )}
    </FieldGrid>
  );
}

function SelectField({ label, value, onChange, items }: { label: string; value: string; onChange: (v: string) => void; items: { id: string; label: string }[] }) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger>
        <SelectContent>
          {items.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>
  );
}

function BooleanSelect({ label, value, onChange, activeText = "Yes", inactiveText = "No" }: { label: string; value: string; onChange: (v: string) => void; activeText?: string; inactiveText?: string }) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="true">{activeText}</SelectItem>
          <SelectItem value="false">{inactiveText}</SelectItem>
        </SelectContent>
      </Select>
    </Field>
  );
}
