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

type AcademicTab = string;

interface MenuItem {
  id: string;
  parent_id: string | null;
  label: string;
  route: string | null;
  icon: string;
  order_no: number;
  children: MenuItem[];
}

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

interface TabMeta {
  value: string;          // slug used as tab key, e.g. "acc" or "courses"
  label: string;          // display label from API, e.g. "Academic Years"
  route: string | null;
  apiResource: string;    // raw route segment, e.g. "acc"
  resolvedEndpoint: string; // resolved REST resource, e.g. "academic-years"
}

/**
 * Map a raw route-segment / apiResource to the actual REST endpoint name.
 * This is the ONLY place we handle oddities like "acc" → "academic-years".
 */
function resolveEndpoint(apiResource: string): string {
  return apiResource;
}

/**
 * Derive a stable tab slug and REST resource purely from the menu item.
 * - Tab value         = last path segment of the route, lowercased
 * - apiResource       = same raw segment
 * - resolvedEndpoint  = mapped endpoint (e.g. "acc" → "academic-years")
 *
 * The resolvedEndpoint is stored so that initialTab matching can work
 * whether the caller passes "acc", "academic-years", or the label slug.
 */
// function buildTabMeta(item: MenuItem): TabMeta {
//   // Fallback: label-based slug, e.g. "Academic Years" → "academic-years"
//   const labelSlug = item.label.toLowerCase().replace(/\s+/g, "-");

//   let value = labelSlug;
//   let apiResource = labelSlug;

//   if (item.route) {
//     const segment = item.route.split("/").filter(Boolean).pop()?.toLowerCase() || "";
//     if (segment) {
//       value = segment;
//       apiResource = segment;
//     }
//   }

//   const resolvedEndpoint = resolveEndpoint(apiResource);

//   return { value, label: item.label, route: item.route, apiResource, resolvedEndpoint };
// }

function buildTabMeta(item: MenuItem): TabMeta {
  const segment =
    item.route
      ?.split("/")
      .filter(Boolean)
      .pop()
      ?.toLowerCase() || "";

  return {
    value: segment,
    label: item.label,
    route: item.route,
    apiResource: segment,
    resolvedEndpoint: segment,
  };
}

/**
 * Find the best matching tab for a given initialTab string.
 * Matches against:
 *  1. tab.value           — exact route segment ("acc")
 *  2. tab.resolvedEndpoint — resolved resource name ("academic-years")
 *  3. label slug          — label-derived slug ("academic-years" from "Academic Years")
 */
function matchInitialTab(tabs: TabMeta[], initialTab: string | undefined): TabMeta | undefined {
  if (!initialTab) return undefined;
  const q = initialTab.toLowerCase();
  return (
    tabs.find((t) => t.value === q) ||
    tabs.find((t) => t.resolvedEndpoint === q) ||
    tabs.find((t) => t.label.toLowerCase().replace(/\s+/g, "-") === q)
  );
}

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
  return { data: page.data.slice(start, start + pageSize), total: page.total, page: pageNo, pageSize };
}

function today() { return new Date().toISOString().slice(0, 10); }
function nextYear() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

// Search fields per resolved endpoint
function searchFields(endpoint: string): string[] {
  if (endpoint === "academic-years") return ["label"];
  if (endpoint === "courses") return ["name", "code", "level"];
  if (endpoint === "branches" || endpoint === "subjects") return ["name", "code"];
  return ["name"];
}

export function AcademicMastersPage({ initialTab }: { initialTab?: AcademicTab }) {
  const { user } = useAuth();
  const institutionId = user?.institution_id || "";
  const organizationId = user?.organization_id || "";
  const [activeInstitutionId, setActiveInstitutionId] = useState(institutionId);

  // ── Tabs: fully from API ───────────────────────────────────────────────────
  const [tabs, setTabs] = useState<TabMeta[]>([]);
  const [tabsLoading, setTabsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AcademicTab>("");
  

  useEffect(() => {
    (async () => {
      setTabsLoading(true);
      try {
        const res = await api.get<any>("/menus/me");
        const menuItems: MenuItem[] = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.data)
          ? res.data.data
          : [];

        const academicMenu = menuItems.find(
          (item) => item.label.toLowerCase() === "academic" && Array.isArray(item.children)
        );

        if (academicMenu?.children?.length) {
          const sorted = [...academicMenu.children].sort((a, b) => a.order_no - b.order_no);
          const dynamicTabs = sorted.map(buildTabMeta);
          setTabs(dynamicTabs);

          // FIX: match initialTab against value, resolvedEndpoint, or label slug
          const matched = matchInitialTab(dynamicTabs, initialTab);
          setActiveTab(matched ? matched.value : dynamicTabs[0].value);
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load navigation menus");
      } finally {
        setTabsLoading(false);
      }
    })();
  }, []);

  // ── State ─────────────────────────────────────────────────────────────────
  const [params, setParams] = useState<ListParams>({ page: 1, pageSize: 10, search: "" });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);

  // Central data store keyed by resolved endpoint name
  const [dataStore, setDataStore] = useState<Record<string, Paginated<any>>>({});

  const [courseFilter, setCourseFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");

  const [form, setForm] = useState<Record<string, any>>({});
  const [formAcademicYears, setFormAcademicYears] = useState<AcademicYear[]>([]);
  const [formCourses, setFormCourses] = useState<Course[]>([]);
  const [formBranches, setFormBranches] = useState<Branch[]>([]);
  const [formClasses, setFormClasses] = useState<ClassRow[]>([]);

  // Active tab metadata — now uses resolvedEndpoint for all data lookups
  const activeTabMeta = useMemo(() => tabs.find((t) => t.value === activeTab), [tabs, activeTab]);

  // FIX: use resolvedEndpoint from TabMeta instead of re-resolving manually
  const activeEndpoint = useMemo(
    () => activeTabMeta?.resolvedEndpoint || "",
    [activeTabMeta]
  );

  // Resolved endpoints for each resource type — derived from tabs
  const endpointOf = useMemo(() => {
    const map: Record<string, string> = {};
    tabs.forEach((t) => { map[t.apiResource] = t.resolvedEndpoint; });
    return map;
  }, [tabs]);

  const epCourses = useMemo(
    () => Object.values(endpointOf).find((e) => e === "courses") || "courses",
    [endpointOf]
  );
  const epBranches = useMemo(
    () => Object.values(endpointOf).find((e) => e === "branches") || "branches",
    [endpointOf]
  );
  const epYears = useMemo(
    () => Object.values(endpointOf).find((e) => e === "academic-years") || "academic-years",
    [endpointOf]
  );
  const epClasses = useMemo(
    () => Object.values(endpointOf).find((e) => e === "classes") || "classes",
    [endpointOf]
  );
  const epSections = useMemo(
    () => Object.values(endpointOf).find((e) => e === "sections") || "sections",
    [endpointOf]
  );

  const courseOptions = useMemo(() => (dataStore[epCourses]?.data || []) as Course[], [dataStore, epCourses]);
  const branchOptions = useMemo(() => (dataStore[epBranches]?.data || []) as Branch[], [dataStore, epBranches]);
  const yearOptions = useMemo(() => (dataStore[epYears]?.data || []) as AcademicYear[], [dataStore, epYears]);
  const classOptions = useMemo(() => (dataStore[epClasses]?.data || []) as ClassRow[], [dataStore, epClasses]);

  const courseName = useMemo(() => new Map(courseOptions.map((c) => [c.id, c.name])), [courseOptions]);
  const branchName = useMemo(() => new Map(branchOptions.map((b) => [b.id, b.name])), [branchOptions]);
  const yearName = useMemo(() => new Map(yearOptions.map((y) => [y.id, y.label])), [yearOptions]);
  const className = useMemo(() => new Map(classOptions.map((c) => [c.id, c.name])), [classOptions]);
  const branchToCourse = useMemo(() => new Map(branchOptions.map((b) => [b.id, b.course_id])), [branchOptions]);
  const classToBranch = useMemo(() => new Map(classOptions.map((c) => [c.id, c.branch_id])), [classOptions]);
  const currentInstitution = useMemo(
    () => institutions.find((i) => i.id === activeInstitutionId) || null,
    [institutions, activeInstitutionId]
  );

  const setEpData = (ep: string, page: Paginated<any>) =>
    setDataStore((prev) => ({ ...prev, [ep]: page }));

  const deriveInstitutionId = (row: any): string => {
    if (row?.institution_id) return row.institution_id;
    if (row?.course_id) return courseOptions.find((c) => c.id === row.course_id)?.institution_id || activeInstitutionId;
    if (row?.branch_id) {
      const cid = branchToCourse.get(row.branch_id);
      return courseOptions.find((c) => c.id === cid)?.institution_id || activeInstitutionId;
    }
    if (row?.class_id) {
      const bid = classToBranch.get(row.class_id);
      const cid = bid ? branchToCourse.get(bid) : "";
      return courseOptions.find((c) => c.id === cid)?.institution_id || activeInstitutionId;
    }
    return activeInstitutionId || institutionId;
  };

  // ── Loaders ───────────────────────────────────────────────────────────────

  const loadInstitutions = async () => {
    if (!organizationId) {
      setInstitutions(institutionId ? [{ id: institutionId, org_id: "", name: "Current Institution", code: "", is_active: true }] : []);
      return;
    }
    try {
      const res = await api.get<any>(`/institutions?org_id=${organizationId}&page=1&page_size=100`);
      const rows = (Array.isArray(res?.data?.items) ? res.data.items : []) as Institution[];
      const active = rows.filter((r) => r.is_active !== false);
      setInstitutions(active);
      if (!active.some((r) => r.id === activeInstitutionId)) setActiveInstitutionId(active[0]?.id || "");
    } catch {
      setInstitutions(institutionId ? [{ id: institutionId, org_id: organizationId, name: "Current Institution", code: "", is_active: true }] : []);
      if (!activeInstitutionId && institutionId) setActiveInstitutionId(institutionId);
    }
  };

  const fetchEp = async (ep: string, query: string): Promise<Paginated<any> | null> => {
    if (!query) return null;
    const res = await api.get<any>(`/${ep}?${query}&page=1&page_size=100`);
    return pageOf<any>(res);
  };

  const loadAcademicYears = async () => {
    if (!activeInstitutionId) return;
    const page = await fetchEp(epYears, `institution_id=${activeInstitutionId}`);
    if (page) setEpData(epYears, page);
  };

  const loadCourses = async () => {
    if (!activeInstitutionId) return;
    const page = await fetchEp(epCourses, `institution_id=${activeInstitutionId}`);
    if (page) {
      setEpData(epCourses, page);
      if (!page.data.some((c: Course) => c.id === courseFilter)) setCourseFilter(page.data[0]?.id || "");
    }
  };

  const loadBranches = async (courseId = courseFilter) => {
    if (!courseId) { setEpData(epBranches, emptyPage()); return; }
    const page = await fetchEp(epBranches, `course_id=${courseId}`);
    if (page) {
      setEpData(epBranches, page);
      if (!page.data.some((b: Branch) => b.id === branchFilter)) setBranchFilter(page.data[0]?.id || "");
    }
  };

  const loadSubjects = async (branchId = branchFilter) => {
    if (!branchId) { setEpData("subjects", emptyPage()); return; }
    const page = await fetchEp("subjects", `branch_id=${branchId}`);
    if (page) setEpData("subjects", page);
  };

  const loadClasses = async (branchId = branchFilter) => {
    if (!branchId) { setEpData(epClasses, emptyPage()); return; }
    const page = await fetchEp(epClasses, `branch_id=${branchId}`);
    if (page) {
      setEpData(epClasses, page);
      if (!page.data.some((c: ClassRow) => c.id === classFilter)) setClassFilter(page.data[0]?.id || "");
    }
  };

  const loadSections = async (classId = classFilter) => {
    if (!classId) { setEpData(epSections, emptyPage()); return; }
    const page = await fetchEp(epSections, `class_id=${classId}`);
    if (page) setEpData(epSections, page);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await loadInstitutions();
      await loadAcademicYears();
      await loadCourses();
    } catch (err: any) {
      toast.error(err?.message || "Unable to load academic masters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (institutionId && !activeInstitutionId) setActiveInstitutionId(institutionId); }, [institutionId]);
  useEffect(() => { loadAll(); }, [activeInstitutionId, organizationId]);
  useEffect(() => { if (courseFilter) loadBranches(courseFilter).catch(() => {}); }, [courseFilter]);
  useEffect(() => {
    if (branchFilter) {
      loadSubjects(branchFilter).catch(() => {});
      loadClasses(branchFilter).catch(() => {});
    }
  }, [branchFilter]);
  useEffect(() => { if (classFilter) loadSections(classFilter).catch(() => {}); }, [classFilter]);

  // Form option loader
  useEffect(() => {
    if (!mode) return;
    const instId = form.institution_id || activeInstitutionId || institutionId;
    if (!instId) return;
    (async () => {
      try {
        const yearsRes = await api.get<any>(`/academic-years?institution_id=${instId}&page=1&page_size=100`);
        const nextYears = rowsOf<AcademicYear>(yearsRes);
        setFormAcademicYears(nextYears);

        const coursesRes = await api.get<any>(`/courses?institution_id=${instId}&page=1&page_size=100`);
        const nextCourses = rowsOf<Course>(coursesRes);
        setFormCourses(nextCourses);

        const branchRes = await Promise.all(
          nextCourses.map((c) => api.get<any>(`/branches?course_id=${c.id}&page=1&page_size=100`).catch(() => ({ data: { items: [] } })))
        );
        const nextBranches = branchRes.flatMap((r) => rowsOf<Branch>(r));
        setFormBranches(nextBranches);

        const classRes = await Promise.all(
          nextBranches.map((b) => api.get<any>(`/classes?branch_id=${b.id}&page=1&page_size=100`).catch(() => ({ data: { items: [] } })))
        );
        const nextClasses = classRes.flatMap((r) => rowsOf<ClassRow>(r));
        setFormClasses(nextClasses);

        setForm((prev) => ({
          ...prev,
          institution_id: instId,
          course_id: nextCourses.some((c) => c.id === prev.course_id) ? prev.course_id : nextCourses[0]?.id || "",
          branch_id: nextBranches.some((b) => b.id === prev.branch_id) ? prev.branch_id : nextBranches[0]?.id || "",
          academic_year_id: nextYears.some((y) => y.id === prev.academic_year_id) ? prev.academic_year_id : nextYears[0]?.id || "",
          class_id: nextClasses.some((c) => c.id === prev.class_id) ? prev.class_id : nextClasses[0]?.id || "",
        }));
      } catch (err: any) {
        toast.error(err?.message || "Unable to load form options");
      }
    })();
  }, [mode, form.institution_id, activeInstitutionId, institutionId]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const setField = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setMode("create");
    const base = { institution_id: activeInstitutionId || institutionId };
    if (activeEndpoint === "academic-years") setForm({ ...base, label: "", start_date: today(), end_date: nextYear(), is_current: "false", is_active: "true" });
    else if (activeEndpoint === "courses") setForm({ ...base, name: "", code: "", level: "UG", duration_years: 4, is_active: "true" });
    else if (activeEndpoint === "branches") setForm({ ...base, course_id: courseFilter, name: "", code: "", is_active: "true" });
    else if (activeEndpoint === "subjects") setForm({ ...base, branch_id: branchFilter, academic_year_id: "", name: "", code: "", credits: 0, is_active: "true" });
    else if (activeEndpoint === "classes") setForm({ ...base, branch_id: branchFilter, academic_year_id: "", name: "", semester: 1 });
    else setForm({ ...base, class_id: classFilter, name: "", max_strength: 60 });
  };

  const openEdit = (row: any) => {
    setEditing(row);
    setMode("edit");
    const base = { ...row, institution_id: deriveInstitutionId(row) };
    if (["academic-years", "courses", "branches", "subjects"].includes(activeEndpoint)) {
      setForm({ ...base, is_active: row.is_active ? "true" : "false", ...(activeEndpoint === "academic-years" ? { is_current: row.is_current ? "true" : "false" } : {}) });
    } else {
      setForm(base);
    }
  };

  const refreshActive = async () => {
    if (activeEndpoint === "academic-years") await loadAcademicYears();
    else if (activeEndpoint === "courses") await loadCourses();
    else if (activeEndpoint === "branches") await loadBranches();
    else if (activeEndpoint === "subjects") await loadSubjects();
    else if (activeEndpoint === "classes") await loadClasses();
    else await loadSections();
  };

  const save = async () => {
    if (!form.institution_id) return;
    setBusy(true);
    try {
      let payload: any = {};
      if (activeEndpoint === "academic-years") {
        payload = { institution_id: form.institution_id, label: form.label, start_date: form.start_date, end_date: form.end_date, is_current: form.is_current === "true", is_active: form.is_active === "true" };
      } else if (activeEndpoint === "courses") {
        payload = { institution_id: form.institution_id, name: form.name, code: form.code, level: form.level, duration_years: Number(form.duration_years), is_active: form.is_active === "true" };
      } else if (activeEndpoint === "branches") {
        payload = { course_id: form.course_id, name: form.name, code: form.code, is_active: form.is_active === "true" };
      } else if (activeEndpoint === "subjects") {
        payload = { branch_id: form.branch_id, academic_year_id: form.academic_year_id || null, name: form.name, code: form.code, credits: Number(form.credits), is_active: form.is_active === "true" };
      } else if (activeEndpoint === "classes") {
        payload = { branch_id: form.branch_id, academic_year_id: form.academic_year_id || null, name: form.name, semester: Number(form.semester) };
      } else {
        payload = { class_id: form.class_id, name: form.name, max_strength: Number(form.max_strength) };
      }
      if (editing) await api.patch(`/${activeEndpoint}/${editing.id}`, payload);
      else await api.post(`/${activeEndpoint}`, payload);
      toast.success("Saved");
      setMode(null);
      await refreshActive();
    } finally {
      setBusy(false);
    }
  };

  // ── Table data ────────────────────────────────────────────────────────────

  const activeData = useMemo(() => {
    const page = dataStore[activeEndpoint] || emptyPage();
    return filterPage(page, params.search, searchFields(activeEndpoint) as any);
  }, [dataStore, activeEndpoint, params.search]);

  const tableData = localPage<any>(activeData as Paginated<any>, params);

  // ── Render ────────────────────────────────────────────────────────────────

  if (tabsLoading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Loading navigation...</div>;
  }
  if (tabs.length === 0) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">No academic modules configured.</div>;
  }

  return (
    <div>
      <PageHeader
        title="Academic Masters"
        description="Configure academic years, courses, branches, subjects, classes and sections."
        actions={
          <Button onClick={openCreate} disabled={!activeInstitutionId}>
            <Plus className="mr-2 h-4 w-4" /> New
          </Button>
        }
      />

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
           window.history.replaceState({}, "", `/academic/${v}`);
            setActiveTab(v as AcademicTab);

            setParams({
              page: 1,
              pageSize: 10,
              search: "",
            });
          }}
        >
        <TabsList className="mb-4 flex h-auto flex-wrap justify-start">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Filters
        activeEndpoint={activeEndpoint}
        institutions={institutions}
        courses={courseOptions}
        branches={branchOptions}
        classes={classOptions}
        activeInstitutionId={activeInstitutionId}
        courseFilter={courseFilter}
        branchFilter={branchFilter}
        classFilter={classFilter}
        setActiveInstitutionId={(v) => { setActiveInstitutionId(v); setCourseFilter(""); setBranchFilter(""); setClassFilter(""); setParams((p) => ({ ...p, page: 1 })); }}
        setCourseFilter={setCourseFilter}
        setBranchFilter={setBranchFilter}
        setClassFilter={setClassFilter}
      />

      <DataTable<any>
        columns={getColumns(activeEndpoint, { courseName, branchName, yearName, className }, openEdit)}
        data={tableData as Paginated<any>}
        loading={loading}
        params={params}
        onParamsChange={setParams}
        searchPlaceholder={`Search ${activeTabMeta?.label.toLowerCase() || ""}...`}
        rowActions={(row) => <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>Edit</Button>}
      />

      <FormModal
        open={!!mode}
        onOpenChange={(open) => !open && setMode(null)}
        title={`${editing ? "Edit" : "New"} ${activeTabMeta?.label.replace(/s$/, "") || "Record"}`}
        submitLabel={editing ? "Save" : "Create"}
        busy={busy}
        size="lg"
        onSubmit={save}
      >
        <AcademicForm
          activeEndpoint={activeEndpoint}
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

// ── Filters ────────────────────────────────────────────────────────────────

function Filters({
  activeEndpoint, institutions, courses, branches, classes,
  activeInstitutionId, courseFilter, branchFilter, classFilter,
  setActiveInstitutionId, setCourseFilter, setBranchFilter, setClassFilter,
}: {
  activeEndpoint: string;
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
  const needsCourse = ["branches", "subjects", "classes", "sections"].includes(activeEndpoint);
  const needsBranch = ["subjects", "classes", "sections"].includes(activeEndpoint);
  const needsClass = activeEndpoint === "sections";

  return (
    <div className="mb-4 flex flex-wrap gap-3 rounded-lg border border-border bg-card p-3">
      <Picker label="Institution" value={activeInstitutionId} onChange={setActiveInstitutionId} items={institutions.map((i) => ({ id: i.id, label: i.name }))} />
      {needsCourse && <Picker label="Course" value={courseFilter} onChange={setCourseFilter} items={courses.map((c) => ({ id: c.id, label: c.name }))} />}
      {needsBranch && <Picker label="Branch" value={branchFilter} onChange={setBranchFilter} items={branches.map((b) => ({ id: b.id, label: b.name }))} />}
      {needsClass && <Picker label="Class" value={classFilter} onChange={setClassFilter} items={classes.map((c) => ({ id: c.id, label: c.name }))} />}
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

// ── Columns ────────────────────────────────────────────────────────────────

function getColumns(
  endpoint: string,
  labels: { courseName: Map<string, string>; branchName: Map<string, string>; yearName: Map<string, string>; className: Map<string, string> },
  _openEdit: (row: any) => void,
) {
  const status = (r: any) => <StatusBadge value={r.is_active ? "active" : "inactive"} />;
  if (endpoint === "academic-years") return [
    { key: "label", header: "Label", sortable: true, cell: (r: AcademicYear) => <span className="font-medium">{r.label}</span> },
    { key: "start_date", header: "Start", cell: (r: AcademicYear) => r.start_date },
    { key: "end_date", header: "End", cell: (r: AcademicYear) => r.end_date },
    { key: "is_current", header: "Current", cell: (r: AcademicYear) => r.is_current ? "Yes" : "No" },
    { key: "is_active", header: "Status", cell: status },
  ];
  if (endpoint === "courses") return [
    { key: "name", header: "Name", cell: (r: Course) => <span className="font-medium">{r.name}</span> },
    { key: "code", header: "Code", cell: (r: Course) => <span className="font-mono text-xs">{r.code}</span> },
    { key: "level", header: "Level", cell: (r: Course) => r.level },
    { key: "duration_years", header: "Duration", cell: (r: Course) => `${r.duration_years} years` },
    { key: "is_active", header: "Status", cell: status },
  ];
  if (endpoint === "branches") return [
    { key: "name", header: "Name", cell: (r: Branch) => <span className="font-medium">{r.name}</span> },
    { key: "code", header: "Code", cell: (r: Branch) => <span className="font-mono text-xs">{r.code}</span> },
    { key: "course_id", header: "Course", cell: (r: Branch) => labels.courseName.get(r.course_id) || "-" },
    { key: "is_active", header: "Status", cell: status },
  ];
  if (endpoint === "subjects") return [
    { key: "name", header: "Name", cell: (r: Subject) => <span className="font-medium">{r.name}</span> },
    { key: "code", header: "Code", cell: (r: Subject) => <span className="font-mono text-xs">{r.code}</span> },
    { key: "branch_id", header: "Branch", cell: (r: Subject) => labels.branchName.get(r.branch_id) || "-" },
    { key: "academic_year_id", header: "Year", cell: (r: Subject) => labels.yearName.get(r.academic_year_id) || "-" },
    { key: "credits", header: "Credits", cell: (r: Subject) => r.credits },
    { key: "is_active", header: "Status", cell: status },
  ];
  if (endpoint === "classes") return [
    { key: "name", header: "Name", cell: (r: ClassRow) => <span className="font-medium">{r.name}</span> },
    { key: "branch_id", header: "Branch", cell: (r: ClassRow) => labels.branchName.get(r.branch_id) || "-" },
    { key: "academic_year_id", header: "Year", cell: (r: ClassRow) => labels.yearName.get(r.academic_year_id) || "-" },
    { key: "semester", header: "Semester", cell: (r: ClassRow) => r.semester },
  ];
  return [
    { key: "name", header: "Name", cell: (r: Section) => <span className="font-medium">{r.name}</span> },
    { key: "class_id", header: "Class", cell: (r: Section) => labels.className.get(r.class_id) || "-" },
    { key: "max_strength", header: "Max Strength", cell: (r: Section) => r.max_strength },
  ];
}

// ── Form ───────────────────────────────────────────────────────────────────

function AcademicForm({
  activeEndpoint, form, setField, institutions, courses, branches, academicYears, classes, currentInstitutionLabel,
}: {
  activeEndpoint: string;
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
          const items = institutions.map((i) => ({ id: i.id, label: i.name }));
          if (form.institution_id && !items.some((item) => item.id === form.institution_id))
            items.unshift({ id: form.institution_id, label: currentInstitutionLabel });
          return items;
        })()}
      />

      {activeEndpoint === "branches" && (
        <SelectField label="Course" value={form.course_id || ""} onChange={(v) => setField("course_id", v)} items={courses.map((c) => ({ id: c.id, label: c.name }))} />
      )}

      {(activeEndpoint === "subjects" || activeEndpoint === "classes") && (
        <>
          <SelectField label="Branch" value={form.branch_id || ""} onChange={(v) => setField("branch_id", v)} items={branches.map((b) => ({ id: b.id, label: b.name }))} />
          <SelectField
            label="Academic Year"
            value={form.academic_year_id || "__none__"}
            onChange={(v) => setField("academic_year_id", v === "__none__" ? "" : v)}
            items={[{ id: "__none__", label: "All Years" }, ...academicYears.map((y) => ({ id: y.id, label: y.label }))]}
          />
        </>
      )}

      {activeEndpoint === "sections" && (
        <SelectField label="Class" value={form.class_id || ""} onChange={(v) => setField("class_id", v)} items={classes.map((c) => ({ id: c.id, label: c.name }))} />
      )}

      {activeEndpoint === "academic-years" && (
        <>
          <Field label="Label"><Input value={form.label || ""} onChange={(e) => setField("label", e.target.value)} placeholder="2026-27" /></Field>
          <Field label="Start Date"><Input type="date" value={form.start_date || ""} onChange={(e) => setField("start_date", e.target.value)} /></Field>
          <Field label="End Date"><Input type="date" value={form.end_date || ""} onChange={(e) => setField("end_date", e.target.value)} /></Field>
          <BooleanSelect label="Current Year" value={form.is_current || "false"} onChange={(v) => setField("is_current", v)} />
          <BooleanSelect label="Status" value={form.is_active || "true"} onChange={(v) => setField("is_active", v)} activeText="Active" inactiveText="Inactive" />
        </>
      )}

      {activeEndpoint === "courses" && (
        <>
          <Field label="Name"><Input value={form.name || ""} onChange={(e) => setField("name", e.target.value)} placeholder="Bachelor of Engineering" /></Field>
          <Field label="Code"><Input value={form.code || ""} onChange={(e) => setField("code", e.target.value)} placeholder="BE" /></Field>
          <Field label="Level"><Input value={form.level || ""} onChange={(e) => setField("level", e.target.value)} placeholder="UG" /></Field>
          <Field label="Duration Years"><Input type="number" value={form.duration_years ?? 0} onChange={(e) => setField("duration_years", e.target.value)} /></Field>
          <BooleanSelect label="Status" value={form.is_active || "true"} onChange={(v) => setField("is_active", v)} activeText="Active" inactiveText="Inactive" />
        </>
      )}

      {["branches", "subjects", "classes", "sections"].includes(activeEndpoint) && (
        <Field label="Name">
          <Input value={form.name || ""} onChange={(e) => setField("name", e.target.value)} placeholder={activeEndpoint === "sections" ? "A" : "Name"} />
        </Field>
      )}

      {(activeEndpoint === "branches" || activeEndpoint === "subjects") && (
        <Field label="Code"><Input value={form.code || ""} onChange={(e) => setField("code", e.target.value)} placeholder="CSE" /></Field>
      )}

      {activeEndpoint === "subjects" && (
        <>
          <Field label="Credits"><Input type="number" value={form.credits ?? 0} onChange={(e) => setField("credits", e.target.value)} /></Field>
          <BooleanSelect label="Status" value={form.is_active || "true"} onChange={(v) => setField("is_active", v)} activeText="Active" inactiveText="Inactive" />
        </>
      )}

      {activeEndpoint === "branches" && (
        <BooleanSelect label="Status" value={form.is_active || "true"} onChange={(v) => setField("is_active", v)} activeText="Active" inactiveText="Inactive" />
      )}

      {activeEndpoint === "classes" && (
        <Field label="Semester"><Input type="number" value={form.semester ?? 1} onChange={(e) => setField("semester", e.target.value)} /></Field>
      )}

      {activeEndpoint === "sections" && (
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