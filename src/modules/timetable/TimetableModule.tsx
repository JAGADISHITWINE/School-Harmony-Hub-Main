import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/store/auth";
import { api } from "@/services";
import { toast } from "sonner";

type Option = { id: string; name: string };
type ScopedClassOption = Option & { branch_id?: string; branch_name?: string; semester?: number | null; year_no?: number | null };
type ScopedSectionOption = Option & { class_id?: string; class_name?: string };
type ScopedSubjectOption = Option & { class_id?: string; branch_id?: string | null; section_id?: string; code?: string };
type AcademicYear = { id: string; label: string };
type Teacher = { id: string; full_name: string; designation?: string | null; employee_code: string };
type TimetableSlot = {
  id: string;
  teacher_id: string;
  class_id: string;
  class_name: string;
  section_id: string;
  section_name: string;
  subject_id: string;
  subject_name: string;
  branch_id: string;
  branch_name: string;
  academic_year_id: string;
  academic_year_label?: string | null;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room_no?: string | null;
};

type MergedSlot = TimetableSlot & { teacher_name: string; teacher_designation: string };

const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const defaultSlotForm = {
  academic_year_id: "",
  class_id: "",
  section_id: "",
  subject_id: "",
  day_of_week: "monday",
  start_time: "09:00",
  end_time: "10:00",
  room_no: "",
};

const listFrom = <T,>(payload: any): T[] =>
  (Array.isArray(payload?.data?.items) && payload.data.items) ||
  (Array.isArray(payload?.data) && payload.data) ||
  (Array.isArray(payload) && payload) ||
  [];

function formatDay(day: string) {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

function facultyTone(name: string) {
  const tones = [
    "border-l-4 border-l-emerald-500 bg-emerald-50/60",
    "border-l-4 border-l-sky-500 bg-sky-50/60",
    "border-l-4 border-l-amber-500 bg-amber-50/60",
    "border-l-4 border-l-rose-500 bg-rose-50/60",
    "border-l-4 border-l-indigo-500 bg-indigo-50/60",
    "border-l-4 border-l-teal-500 bg-teal-50/60",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return tones[hash % tones.length];
}

export function TimetableModule() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";

  const [years, setYears] = useState<AcademicYear[]>([]);
  const [courses, setCourses] = useState<Option[]>([]);
  const [branches, setBranches] = useState<Option[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [sections, setSections] = useState<Option[]>([]);

  const [yearId, setYearId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const [slots, setSlots] = useState<MergedSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("view");
  const [viewMode, setViewMode] = useState<"weekly" | "monthly" | "full">("weekly");
  const [search, setSearch] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [teacherId, setTeacherId] = useState("");
  const [reassignTargetTeacherId, setReassignTargetTeacherId] = useState("");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<Option[]>([]);
  const [createBranchId, setCreateBranchId] = useState("");
  const [createBranches, setCreateBranches] = useState<Option[]>([]);
  const [createClasses, setCreateClasses] = useState<ScopedClassOption[]>([]);
  const [createSections, setCreateSections] = useState<ScopedSectionOption[]>([]);
  const [createSubjects, setCreateSubjects] = useState<ScopedSubjectOption[]>([]);
  const [slotSaving, setSlotSaving] = useState(false);
  const [form, setForm] = useState(defaultSlotForm);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);

  const loadBase = async () => {
    if (!user?.institution_id) return;
    try {
      const [yRes, cRes] = await Promise.all([
        api.get<any>(`/academic-years?institution_id=${user.institution_id}&page=1&page_size=500`),
        api.get<any>(`/courses?institution_id=${user.institution_id}&page=1&page_size=500`),
      ]);
      setYears(listFrom<any>(yRes).map((x) => ({ id: x.id, label: x.label })));
      setCourses(listFrom<any>(cRes).map((x) => ({ id: x.id, name: x.name })));
      const [tRes, bRes, classRes, sectionRes] = await Promise.all([
        api.get<any>("/teachers?page=1&page_size=500"),
        api.get<any>("/branches?page=1&page_size=500"),
        api.get<any>("/classes?page=1&page_size=500"),
        api.get<any>("/sections?page=1&page_size=500"),
      ]);
      setBranches(listFrom<any>(bRes).map((x) => ({ id: x.id, name: x.name })));
      setClasses(listFrom<any>(classRes).map((x) => ({ id: x.id, name: x.name })));
      setSections(listFrom<any>(sectionRes).map((x) => ({ id: x.id, name: x.name })));
      const tRows = listFrom<Teacher>(tRes);
      setTeachers(tRows);
      setTeacherId(tRows[0]?.id || "");
      setReassignTargetTeacherId(tRows[0]?.id || "");
    } catch (e: any) {
      toast.error(e?.message || "Failed to load filters");
    }
  };

  useEffect(() => {
    loadBase();
  }, [user?.institution_id]);

  useEffect(() => {
    (async () => {
      try {
        const query = courseId ? `?course_id=${courseId}&page=1&page_size=500` : "?page=1&page_size=500";
        const res = await api.get<any>(`/branches${query}`);
        setBranches(listFrom<any>(res).map((x) => ({ id: x.id, name: x.name })));
        if (courseId) setBranchId("");
      } catch (e: any) {
        toast.error(e?.message || "Failed to load branches");
      }
    })();
  }, [courseId]);

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams({ page: "1", page_size: "500" });
        if (courseId) params.set("course_id", courseId);
        if (branchId) params.set("branch_id", branchId);
        const res = await api.get<any>(`/classes?${params.toString()}`);
        setClasses(listFrom<any>(res).map((x) => ({ id: x.id, name: x.name })));
        if (branchId) setClassId("");
      } catch (e: any) {
        toast.error(e?.message || "Failed to load classes");
      }
    })();
  }, [courseId, branchId]);

  useEffect(() => {
    (async () => {
      try {
        const query = classId ? `?class_id=${classId}&page=1&page_size=500` : "?page=1&page_size=500";
        const res = await api.get<any>(`/sections${query}`);
        setSections(listFrom<any>(res).map((x) => ({ id: x.id, name: x.name })));
        if (classId) setSectionId("");
      } catch (e: any) {
        toast.error(e?.message || "Failed to load sections");
      }
    })();
  }, [classId]);

  useEffect(() => {
    if (!classId) {
      setSubjectOptions([]);
      return;
    }
    (async () => {
      try {
        const res = await api.get<any>(`/subjects?class_id=${classId}&page=1&page_size=500`);
        setSubjectOptions(listFrom<any>(res).map((x) => ({ id: x.id, name: x.name })));
      } catch (e: any) {
        toast.error(e?.message || "Failed to load subjects");
      }
    })();
  }, [classId]);

  const loadTeacherScope = async (next: { branchId?: string; classId?: string; sectionId?: string } = {}) => {
    if (!teacherId) {
      setCreateBranches([]);
      setCreateClasses([]);
      setCreateSections([]);
      setCreateSubjects([]);
      return;
    }
    const params = new URLSearchParams();
    if (next.branchId) params.set("branch_id", next.branchId);
    if (next.classId) params.set("class_id", next.classId);
    if (next.sectionId) params.set("section_id", next.sectionId);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const res = await api.get<any>(`/teachers/${teacherId}/teaching-scope${suffix}`);
    const data = res?.data || {};
    setCreateBranches((data.branches || []).map((x: any) => ({ id: x.id, name: x.name })));
    setCreateClasses(!next.branchId ? [] : (data.classes || []).map((x: any) => ({
      id: x.id,
      name: [x.name, x.branch_name].filter(Boolean).join(" - "),
      branch_id: x.branch_id,
      branch_name: x.branch_name,
      semester: x.semester,
      year_no: x.year_no,
    })));
    setCreateSections(!next.classId ? [] : (data.sections || []).map((x: any) => ({
      id: x.id,
      name: [x.name, x.class_name].filter(Boolean).join(" - "),
      class_id: x.class_id,
      class_name: x.class_name,
    })));
    setCreateSubjects(!next.sectionId ? [] : (data.subjects || []).map((x: any) => ({
      id: x.id,
      name: x.code ? `${x.name} (${x.code})` : x.name,
      class_id: x.class_id,
      branch_id: x.branch_id,
      section_id: x.section_id,
      code: x.code,
    })));
  };

  useEffect(() => {
    setCreateBranchId("");
    setForm((p) => ({ ...p, class_id: "", section_id: "", subject_id: "" }));
    loadTeacherScope().catch((e: any) => toast.error(e?.message || "Failed to load teacher mappings"));
  }, [teacherId]);

  useEffect(() => {
    if (!teacherId || !createBranchId) return;
    setForm((p) => ({ ...p, class_id: "", section_id: "", subject_id: "" }));
    loadTeacherScope({ branchId: createBranchId }).catch((e: any) => toast.error(e?.message || "Failed to load teacher classes"));
  }, [createBranchId]);

  useEffect(() => {
    if (!teacherId || !form.class_id) return;
    setForm((p) => ({ ...p, section_id: "", subject_id: "" }));
    loadTeacherScope({ branchId: createBranchId, classId: form.class_id }).catch((e: any) => toast.error(e?.message || "Failed to load teacher sections"));
  }, [form.class_id]);

  useEffect(() => {
    if (!teacherId || !form.section_id) return;
    setForm((p) => ({ ...p, subject_id: "" }));
    loadTeacherScope({ branchId: createBranchId, classId: form.class_id, sectionId: form.section_id }).catch((e: any) => toast.error(e?.message || "Failed to load teacher subjects"));
  }, [form.section_id]);

  const loadTimetable = async () => {
    setLoading(true);
    try {
      if (isTeacher) {
        const res = await api.get<any>("/teachers/self/my-timetable");
        const rows = listFrom<TimetableSlot>(res).map((slot) => ({
          ...slot,
          teacher_name: user?.name || "Teacher",
          teacher_designation: "TEACHER",
        }));
        setSlots(rows);
        return;
      }
      const res = await api.get<any>("/teachers/timetable/all");
      const rows = listFrom<any>(res).map((slot) => ({
        ...slot,
        teacher_designation: (slot.teacher_designation || "Teacher").toUpperCase(),
      }));
      setSlots(rows);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load timetable");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimetable();
  }, [isTeacher, user?.name]);

  const createSlot = async () => {
    if (slotSaving) return;
    if (!teacherId || !form.academic_year_id || !form.class_id || !form.section_id || !form.subject_id) {
      toast.error("Fill required fields");
      return;
    }
    setSlotSaving(true);
    try {
      if (editingSlotId) {
        await api.patch(`/teachers/timetable/${editingSlotId}`, form);
        toast.success("Timetable slot updated");
      } else {
        await api.post(`/teachers/${teacherId}/timetable`, form);
        toast.success("Timetable slot created");
      }
      setForm(defaultSlotForm);
      setTeacherId("");
      setCreateBranchId("");
      setCreateBranches([]);
      setCreateClasses([]);
      setCreateSections([]);
      setCreateSubjects([]);
      setEditingSlotId(null);
      await loadTimetable();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create slot");
    } finally {
      setSlotSaving(false);
    }
  };

  const startEditSlot = (slot: MergedSlot) => {
    setTab("create");
    setEditingSlotId(slot.id);
    setTeacherId(slot.teacher_id);
    setCreateBranchId(slot.branch_id);
    setClassId(slot.class_id);
    setForm({
      academic_year_id: slot.academic_year_id,
      class_id: slot.class_id,
      section_id: slot.section_id,
      subject_id: slot.subject_id,
      day_of_week: slot.day_of_week,
      start_time: slot.start_time,
      end_time: slot.end_time,
      room_no: slot.room_no || "",
    });
  };

  const cancelEditSlot = () => {
    setEditingSlotId(null);
    setForm((p) => ({
      ...p,
      academic_year_id: "",
      class_id: "",
      section_id: "",
      subject_id: "",
      day_of_week: "monday",
      start_time: "09:00",
      end_time: "10:00",
      room_no: "",
    }));
  };

  const reassignSlot = async (slot: MergedSlot) => {
    if (!reassignTargetTeacherId) {
      toast.error("Select target teacher");
      return;
    }
    if (reassignTargetTeacherId === slot.teacher_id) {
      toast.error("Choose a different teacher");
      return;
    }
    try {
      await api.patch(`/teachers/timetable/${slot.id}/reassign`, {
        target_teacher_id: reassignTargetTeacherId,
      });
      toast.success("Class reallocated");
      await loadTimetable();
    } catch (e: any) {
      toast.error(e?.message || "Failed to reallocate class");
    }
  };

  const importTimetable = async () => {
    if (!teacherId || !importFile) {
      toast.error("Select teacher and file");
      return;
    }
    try {
      const base = ((import.meta as any).env?.VITE_API_BASE_URL || "").trim().replace(/\/$/, "");
      const formData = new FormData();
      formData.append("file", importFile);
      const res = await fetch(`${base}/teachers/${teacherId}/timetable/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionStorage.getItem("sms_token") || ""}` },
        body: formData,
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.message || "Import failed");
      toast.success(payload?.message || "Timetable imported");
      setImportFile(null);
      await loadTimetable();
    } catch (e: any) {
      toast.error(e?.message || "Failed to import timetable");
    }
  };

  const filtered = useMemo(() => {
    return slots
      .filter((s) => (yearId ? s.academic_year_id === yearId : true))
      .filter((s) => (branchId ? s.branch_id === branchId : true))
      .filter((s) => (classId ? s.class_id === classId : true))
      .filter((s) => (sectionId ? s.section_id === sectionId : true))
      .filter((s) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
          s.subject_name.toLowerCase().includes(q) ||
          s.teacher_name.toLowerCase().includes(q) ||
          s.class_name.toLowerCase().includes(q) ||
          s.section_name.toLowerCase().includes(q) ||
          s.branch_name.toLowerCase().includes(q)
        );
      });
  }, [slots, yearId, branchId, classId, sectionId, search]);

  const timeRows = useMemo(() => {
    const uniq = new Map<string, { start: string; end: string }>();
    for (const s of filtered) {
      uniq.set(`${s.start_time}-${s.end_time}`, { start: s.start_time, end: s.end_time });
    }
    return Array.from(uniq.values()).sort((a, b) => a.start.localeCompare(b.start));
  }, [filtered]);

  const slotMap = useMemo(() => {
    const m = new Map<string, MergedSlot[]>();
    for (const s of filtered) {
      const k = `${s.day_of_week}|${s.start_time}|${s.end_time}`;
      m.set(k, [...(m.get(k) || []), s]);
    }
    return m;
  }, [filtered]);

  const monthlyGroups = useMemo(() => {
    const byDay = new Map<string, MergedSlot[]>();
    for (const s of filtered) byDay.set(s.day_of_week, [...(byDay.get(s.day_of_week) || []), s]);
    return days.map((d) => ({
      day: d,
      slots: (byDay.get(d) || []).sort((a, b) => a.start_time.localeCompare(b.start_time)),
    }));
  }, [filtered]);

  const facultyLegend = useMemo(() => {
    const uniq = new Map<string, string>();
    for (const s of filtered) {
      if (!uniq.has(s.teacher_name)) uniq.set(s.teacher_name, facultyTone(s.teacher_name));
    }
    return Array.from(uniq.entries()).map(([name, tone]) => ({ name, tone }));
  }, [filtered]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timetable"
        description="View weekly lectures by academic year, course, branch, class and section for HOD/teachers."
      />

      <Card className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <Label>Academic Year</Label>
          <Select value={yearId} onValueChange={setYearId}>
            <SelectTrigger><SelectValue placeholder="All years" /></SelectTrigger>
            <SelectContent>{years.map((y) => <SelectItem key={y.id} value={y.id}>{y.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Course</Label>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
            <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Branch</Label>
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger><SelectValue placeholder="All branches" /></SelectTrigger>
            <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Class</Label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
            <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Section</Label>
          <Select value={sectionId} onValueChange={setSectionId}>
            <SelectTrigger><SelectValue placeholder="All sections" /></SelectTrigger>
            <SelectContent>{sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="view">Timetable View</TabsTrigger>
          {!isTeacher && <TabsTrigger value="create">Create Timetable</TabsTrigger>}
        </TabsList>
        <TabsContent value="view">
      <Card className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div>
          <Label>Search</Label>
          <Input placeholder="Search subject / teacher / class / section" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <Label>View Mode</Label>
          <div className="grid grid-cols-3 gap-2 rounded-md border p-1">
            {[
              { key: "weekly", label: "Weekly Grid" },
              { key: "monthly", label: "Monthly Grid" },
              { key: "full", label: "Full Grid" },
            ].map((item) => {
              const active = viewMode === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setViewMode(item.key as "weekly" | "monthly" | "full")}
                  className={`rounded px-2 py-2 text-xs font-medium transition ${
                    active ? "bg-primary text-primary-foreground" : "bg-transparent hover:bg-muted"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-end">
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadTimetable}>Refresh Timetable</Button>
            <Button
              variant="ghost"
              onClick={() => {
                setYearId("");
                setCourseId("");
                setBranchId("");
                setClassId("");
                setSectionId("");
                setSearch("");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
        {!isTeacher && (
          <div>
            <Label>Reallocate To</Label>
            <Select value={reassignTargetTeacherId} onValueChange={setReassignTargetTeacherId}>
              <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
              <SelectContent>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
      </Card>
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing <b>{filtered.length}</b> lecture slots
          </div>
          <Badge variant="outline">{viewMode.toUpperCase()} VIEW</Badge>
        </div>

        {loading && <div className="text-sm text-muted-foreground">Loading timetable...</div>}
        {!loading && timeRows.length === 0 && (
          <div className="text-sm text-muted-foreground">No timetable slots found for selected filters.</div>
        )}

        {!loading && viewMode === "weekly" && timeRows.length > 0 && (
          <div className="space-y-3">
            <div className="rounded-md border p-3">
              <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Faculty Color Legend</div>
              <div className="flex flex-wrap gap-2">
                {facultyLegend.length === 0 && <span className="text-xs text-muted-foreground">No faculty in current filter</span>}
                {facultyLegend.map((item) => (
                  <span key={item.name} className={`inline-flex items-center rounded-md border px-2 py-1 text-xs ${item.tone}`}>
                    {item.name}
                  </span>
                ))}
              </div>
            </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[980px] border-separate border-spacing-2">
              <thead>
                <tr>
                  <th className="rounded-md bg-muted p-2 text-left text-xs font-semibold uppercase">Time</th>
                  {days.map((day) => (
                    <th key={day} className="rounded-md bg-muted p-2 text-left text-xs font-semibold uppercase">{formatDay(day)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeRows.map((row) => (
                  <tr key={`${row.start}-${row.end}`}>
                    <td className="align-top rounded-md border bg-card p-2 text-sm font-medium whitespace-nowrap">{row.start} - {row.end}</td>
                    {days.map((day) => {
                      const key = `${day}|${row.start}|${row.end}`;
                      const entries = slotMap.get(key) || [];
                      return (
                        <td key={key} className="align-top rounded-md border bg-card p-2">
                          {entries.length === 0 && <div className="text-xs text-muted-foreground">-</div>}
                          <div className="space-y-2">
                            {entries.map((e) => (
                              <div key={e.id} className={`rounded-md border p-2 ${facultyTone(e.teacher_name)}`}>
                                <div className="text-sm font-semibold leading-tight">{e.subject_name}</div>
                                <div className="text-xs text-muted-foreground">{e.class_name} / {e.section_name}</div>
                                <div className="mt-1 text-xs font-medium">{e.teacher_name}</div>
                                <div className="mt-1 flex items-center gap-1">
                                  <Badge variant="secondary" className="text-[10px]">{e.teacher_designation}</Badge>
                                  {e.room_no && <Badge variant="outline" className="text-[10px]">Room {e.room_no}</Badge>}
                                  {!isTeacher && <Button size="sm" variant="outline" className="h-5 px-2 text-[10px]" onClick={() => startEditSlot(e)}>Edit</Button>}
                                  {!isTeacher && <Button size="sm" variant="outline" className="h-5 px-2 text-[10px]" onClick={() => reassignSlot(e)}>Reallocate</Button>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        )}
        {!loading && viewMode === "monthly" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {monthlyGroups.map((g) => (
              <Card key={g.day} className="p-3">
                <div className="font-semibold mb-2">{formatDay(g.day)}</div>
                <div className="space-y-2">
                  {g.slots.length === 0 && <div className="text-xs text-muted-foreground">No lectures</div>}
                  {g.slots.map((e) => (
                    <div key={e.id} className="rounded-md border p-2">
                      <div className="text-xs font-medium">{e.start_time} - {e.end_time}</div>
                      <div className="text-sm font-semibold">{e.subject_name}</div>
                      <div className="text-xs text-muted-foreground">{e.class_name} / {e.section_name}</div>
                      <div className="text-xs">{e.teacher_name}</div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
        {!loading && viewMode === "full" && (
          <div className="overflow-auto">
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr>
                  <th className="border p-2 text-left text-xs font-semibold uppercase">Day</th>
                  <th className="border p-2 text-left text-xs font-semibold uppercase">Time</th>
                  <th className="border p-2 text-left text-xs font-semibold uppercase">Subject</th>
                  <th className="border p-2 text-left text-xs font-semibold uppercase">Class/Section</th>
                  <th className="border p-2 text-left text-xs font-semibold uppercase">Teacher/HOD</th>
                </tr>
              </thead>
              <tbody>
                {filtered
                  .slice()
                  .sort((a, b) => a.day_of_week.localeCompare(b.day_of_week) || a.start_time.localeCompare(b.start_time))
                  .map((e) => (
                    <tr key={e.id}>
                      <td className="border p-2 text-sm">{formatDay(e.day_of_week)}</td>
                      <td className="border p-2 text-sm">{e.start_time} - {e.end_time}</td>
                      <td className="border p-2 text-sm font-medium">{e.subject_name}</td>
                      <td className="border p-2 text-sm">{e.class_name} / {e.section_name}</td>
                      <td className="border p-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span>{e.teacher_name}</span>
                          {!isTeacher && <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => startEditSlot(e)}>Edit</Button>}
                          {!isTeacher && <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => reassignSlot(e)}>Reallocate</Button>}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      </TabsContent>
      <TabsContent value="create">
        <Card className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>Teacher / HOD</Label>
            <SearchableSelect
              value={teacherId}
              onValueChange={setTeacherId}
              placeholder="Select teacher"
              searchPlaceholder="Search teacher..."
              options={teachers.map((t) => ({
                value: t.id,
                label: `${t.full_name} (${t.employee_code})`,
                search: `${t.full_name} ${t.employee_code}`,
              }))}
            />
          </div>
          <div>
            <Label>Academic Year</Label>
            <SearchableSelect
              value={form.academic_year_id}
              onValueChange={(v) => setForm((p) => ({ ...p, academic_year_id: v }))}
              placeholder="Select year"
              searchPlaceholder="Search year..."
              options={years.map((y) => ({ value: y.id, label: y.label }))}
            />
          </div>
          <div>
            <Label>Branch</Label>
            <SearchableSelect
              value={createBranchId}
              onValueChange={setCreateBranchId}
              placeholder="Select teacher branch"
              searchPlaceholder="Search branch..."
              options={createBranches.map((b) => ({ value: b.id, label: b.name }))}
            />
          </div>
          <div>
            <Label>Class</Label>
            <SearchableSelect
              disabled={!createBranchId}
              value={form.class_id}
              onValueChange={(v) => { setForm((p) => ({ ...p, class_id: v, section_id: "", subject_id: "" })); setClassId(v); }}
              placeholder="Select class"
              searchPlaceholder="Search class..."
              options={createClasses.map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>
          <div>
            <Label>Section</Label>
            <SearchableSelect
              disabled={!form.class_id}
              value={form.section_id}
              onValueChange={(v) => setForm((p) => ({ ...p, section_id: v }))}
              placeholder="Select section"
              searchPlaceholder="Search section..."
              options={createSections.map((s) => ({ value: s.id, label: s.name }))}
            />
          </div>
          <div>
            <Label>Subject</Label>
            <SearchableSelect
              disabled={!form.section_id}
              value={form.subject_id}
              onValueChange={(v) => setForm((p) => ({ ...p, subject_id: v }))}
              placeholder="Select subject"
              searchPlaceholder="Search subject..."
              options={createSubjects.map((s) => ({ value: s.id, label: s.name, search: `${s.name} ${s.code || ""}` }))}
            />
          </div>
          <div>
            <Label>Day</Label>
            <Select value={form.day_of_week} onValueChange={(v) => setForm((p) => ({ ...p, day_of_week: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{days.map((d) => <SelectItem key={d} value={d}>{formatDay(d)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Start Time</Label>
            <Input type="time" value={form.start_time} onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))} />
          </div>
          <div>
            <Label>End Time</Label>
            <Input type="time" value={form.end_time} onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))} />
          </div>
          <div>
            <Label>Room</Label>
            <Input value={form.room_no} onChange={(e) => setForm((p) => ({ ...p, room_no: e.target.value }))} />
          </div>
          <div className="md:col-span-4 flex justify-end">
            <Button onClick={createSlot} disabled={slotSaving}>
              {slotSaving ? "Saving..." : editingSlotId ? "Update Slot" : "Create Slot"}
            </Button>
            {editingSlotId && (
              <Button variant="outline" className="ml-2" onClick={cancelEditSlot}>
                Cancel Edit
              </Button>
            )}
          </div>
          <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end border-t pt-3">
            <div>
              <Label>Import CSV / XLSX</Label>
              <Input type="file" accept=".csv,.xlsx" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button variant="outline" onClick={importTimetable}>Upload Timetable File</Button>
            </div>
          </div>
        </Card>
      </TabsContent>
      </Tabs>
    </div>
  );
}
