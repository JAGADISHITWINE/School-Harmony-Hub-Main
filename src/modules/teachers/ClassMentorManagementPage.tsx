import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { Pencil, RefreshCw, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services";
import { useAuth } from "@/store/auth";

type Option = { id: string; name: string };
type AcademicYearOption = { id: string; label: string; name?: string };
type TeacherOption = { id: string; full_name: string; employee_code: string };
type MentorRow = {
  id: string;
  teacher_id: string;
  teacher_name: string;
  employee_code: string;
  academic_year_id: string;
  academic_year_label: string;
  course_id: string;
  course_name: string;
  branch_id: string;
  branch_name: string;
  class_id: string;
  class_name: string;
  section_id: string;
  section_name: string;
  is_active: boolean;
};

const listFrom = <T,>(payload: any): T[] =>
  (Array.isArray(payload?.data?.items) && payload.data.items) ||
  (Array.isArray(payload?.data) && payload.data) ||
  (Array.isArray(payload) && payload) ||
  [];

export function ClassMentorManagementPage() {
  const { user } = useAuth();
  const institutionId = user?.institution_id || "";
  const role = String(user?.role || "").toLowerCase();
  const canManage = ["admin", "super_admin", "superadmin", "principal", "hod"].includes(role) || Boolean((user as any)?.is_superuser);

  const [years, setYears] = useState<AcademicYearOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [courses, setCourses] = useState<Option[]>([]);
  const [branches, setBranches] = useState<Option[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [sections, setSections] = useState<Option[]>([]);
  const [rows, setRows] = useState<MentorRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const [academicYearId, setAcademicYearId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [teacherId, setTeacherId] = useState("");

  const selectedYear = useMemo(() => years.find((x) => x.id === academicYearId) || null, [years, academicYearId]);
  const selectedTeacher = useMemo(() => teachers.find((x) => x.id === teacherId) || null, [teachers, teacherId]);
  const selectedClass = useMemo(() => classes.find((x) => x.id === classId) || null, [classes, classId]);
  const selectedSection = useMemo(() => sections.find((x) => x.id === sectionId) || null, [sections, sectionId]);

  const loadBaseData = async () => {
    if (!institutionId) return;
    const [yearRes, teacherRes, courseRes] = await Promise.all([
      api.get<any>(`/academic-years?institution_id=${institutionId}&page=1&page_size=500`),
      api.get<any>("/teachers?page=1&page_size=500"),
      api.get<any>(`/courses?institution_id=${institutionId}&page=1&page_size=500`),
    ]);
    const nextYears = listFrom<any>(yearRes).map((x) => ({ id: x.id, label: x.label || x.name, name: x.name }));
    setYears(nextYears);
    setTeachers(listFrom<any>(teacherRes).map((x) => ({ id: x.id, full_name: x.full_name, employee_code: x.employee_code })));
    setCourses(listFrom<any>(courseRes).map((x) => ({ id: x.id, name: x.name })));
    setAcademicYearId((prev) => prev || nextYears[0]?.id || "");
  };

  const loadBranches = async (selectedCourseId: string) => {
    if (!selectedCourseId) {
      setBranches([]);
      return;
    }
    const res = await api.get<any>(`/branches?course_id=${selectedCourseId}&page=1&page_size=500`);
    setBranches(listFrom<any>(res).map((x) => ({ id: x.id, name: x.name })));
  };

  const loadClasses = async (selectedBranchId: string) => {
    if (!selectedBranchId) {
      setClasses([]);
      return;
    }
    const res = await api.get<any>(`/classes?branch_id=${selectedBranchId}&page=1&page_size=500`);
    setClasses(listFrom<any>(res).map((x) => ({ id: x.id, name: x.name })));
  };

  const loadSections = async (selectedClassId: string) => {
    if (!selectedClassId) {
      setSections([]);
      return;
    }
    const res = await api.get<any>(`/sections?class_id=${selectedClassId}&page=1&page_size=500`);
    setSections(listFrom<any>(res).map((x) => ({ id: x.id, name: x.name })));
  };

  const loadRows = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (academicYearId) params.set("academic_year_id", academicYearId);
      if (branchId) params.set("branch_id", branchId);
      if (classId) params.set("class_id", classId);
      if (sectionId) params.set("section_id", sectionId);
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const res = await api.get<any>(`/teachers/class-mentors${suffix}`);
      setRows(listFrom<MentorRow>(res));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBaseData().catch(() => toast.error("Failed to load mentor setup data"));
  }, [institutionId]);

  useEffect(() => {
    loadBranches(courseId).catch(() => toast.error("Failed to load branches"));
    if (!editingId) {
      setBranchId("");
      setClassId("");
      setSectionId("");
    }
  }, [courseId]);

  useEffect(() => {
    loadClasses(branchId).catch(() => toast.error("Failed to load classes"));
    if (!editingId) {
      setClassId("");
      setSectionId("");
    }
  }, [branchId]);

  useEffect(() => {
    loadSections(classId).catch(() => toast.error("Failed to load sections"));
    if (!editingId) setSectionId("");
  }, [classId]);

  useEffect(() => {
    loadRows().catch(() => toast.error("Failed to load class mentors"));
  }, [academicYearId, branchId, classId, sectionId]);

  const resetForm = () => {
    setEditingId(null);
    setTeacherId("");
    setCourseId("");
    setBranchId("");
    setClassId("");
    setSectionId("");
  };

  const saveMentor = async () => {
    if (saving) return;
    if (!academicYearId || !teacherId || !classId || !sectionId) {
      toast.error("Select academic year, mentor teacher, class and section");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        teacher_id: teacherId,
        academic_year_id: academicYearId,
        class_id: classId,
        section_id: sectionId,
      };
      if (editingId) {
        await api.patch(`/teachers/class-mentors/${editingId}`, payload);
        toast.success("Class mentor updated");
      } else {
        await api.post("/teachers/class-mentors", payload);
        toast.success("Class mentor assigned");
      }
      resetForm();
      await loadRows();
    } finally {
      setSaving(false);
    }
  };

  const startEdit = async (row: MentorRow) => {
    setEditingId(row.id);
    setAcademicYearId(row.academic_year_id);
    setTeacherId(row.teacher_id);
    setCourseId(row.course_id);
    setBranchId(row.branch_id);
    setClassId(row.class_id);
    setSectionId(row.section_id);
  };

  const removeMentor = async (id: string) => {
    await api.delete(`/teachers/class-mentors/${id}`);
    toast.success("Class mentor removed");
    if (editingId === id) resetForm();
    await loadRows();
  };

  if (!canManage) {
    return (
      <div className="space-y-4">
        <PageHeader title="Class Mentor Management" description="Assign one class mentor for each academic year, class and section." />
        <Card className="p-6 text-sm text-muted-foreground">Only Admin and HOD users can manage class mentor assignments.</Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Class Mentor Management"
        description="Assign teachers as class mentors for a specific academic year, class and section."
        actions={
          <Button variant="outline" onClick={() => loadRows().catch(() => toast.error("Failed to refresh mentors"))}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <Card className="xl:col-span-3 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Academic Year</Label>
              <SearchableSelect value={academicYearId} onValueChange={setAcademicYearId} placeholder="Select year" searchPlaceholder="Search year..." options={years.map((y) => ({ value: y.id, label: y.label }))} />
            </div>
            <div>
              <Label>Course</Label>
              <SearchableSelect value={courseId} onValueChange={setCourseId} placeholder="Select course" searchPlaceholder="Search course..." options={courses.map((c) => ({ value: c.id, label: c.name }))} />
            </div>
            <div>
              <Label>Branch</Label>
              <SearchableSelect value={branchId} onValueChange={setBranchId} placeholder="Select branch" searchPlaceholder="Search branch..." options={branches.map((b) => ({ value: b.id, label: b.name }))} />
            </div>
            <div>
              <Label>Class</Label>
              <SearchableSelect value={classId} onValueChange={setClassId} placeholder="Select class" searchPlaceholder="Search class..." options={classes.map((c) => ({ value: c.id, label: c.name }))} />
            </div>
            <div>
              <Label>Section</Label>
              <SearchableSelect value={sectionId} onValueChange={setSectionId} placeholder="Select section" searchPlaceholder="Search section..." options={sections.map((s) => ({ value: s.id, label: s.name }))} />
            </div>
            <div>
              <Label>Mentor Teacher</Label>
              <SearchableSelect value={teacherId} onValueChange={setTeacherId} placeholder="Select teacher" searchPlaceholder="Search teacher..." options={teachers.map((t) => ({ value: t.id, label: `${t.full_name} (${t.employee_code})` }))} />
            </div>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <UserCheck className="h-4 w-4" /> Assignment Summary
          </div>
          <div className="text-sm"><span className="text-muted-foreground">Year:</span> {selectedYear?.label || "-"}</div>
          <div className="text-sm"><span className="text-muted-foreground">Class:</span> {selectedClass?.name || "-"}</div>
          <div className="text-sm"><span className="text-muted-foreground">Section:</span> {selectedSection?.name || "-"}</div>
          <div className="text-sm"><span className="text-muted-foreground">Mentor:</span> {selectedTeacher?.full_name || "-"}</div>
          <Button className="w-full" disabled={saving} onClick={() => saveMentor().catch((e: any) => toast.error(e?.message || "Failed to save mentor"))}>
            {saving ? "Saving..." : editingId ? "Update Mentor" : "Assign Mentor"}
          </Button>
          {editingId && <Button variant="outline" className="w-full" onClick={resetForm}>Cancel Edit</Button>}
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">Class Mentor Records</p>
          <span className="text-xs text-muted-foreground">{loading ? "Loading..." : `${rows.length} record(s)`}</span>
        </div>
        <div className="overflow-auto">
          <table className="w-full min-w-[880px] border-collapse">
            <thead className="sticky top-0 bg-background">
              <tr>
                <th className="border p-2 text-left text-xs uppercase">Academic Year</th>
                <th className="border p-2 text-left text-xs uppercase">Course</th>
                <th className="border p-2 text-left text-xs uppercase">Branch</th>
                <th className="border p-2 text-left text-xs uppercase">Class</th>
                <th className="border p-2 text-left text-xs uppercase">Section</th>
                <th className="border p-2 text-left text-xs uppercase">Mentor</th>
                <th className="border p-2 text-left text-xs uppercase">Status</th>
                <th className="border p-2 text-left text-xs uppercase">Edit</th>
                <th className="border p-2 text-left text-xs uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="border p-3 text-sm text-muted-foreground">
                    {loading ? "Loading class mentors..." : "No class mentor assignments found."}
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="border p-2 text-sm">{row.academic_year_label}</td>
                  <td className="border p-2 text-sm">{row.course_name}</td>
                  <td className="border p-2 text-sm">{row.branch_name}</td>
                  <td className="border p-2 text-sm">{row.class_name}</td>
                  <td className="border p-2 text-sm">{row.section_name}</td>
                  <td className="border p-2 text-sm">{row.teacher_name} ({row.employee_code})</td>
                  <td className="border p-2 text-sm">{row.is_active ? "Active" : "Inactive"}</td>
                  <td className="border p-2">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(row)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </td>
                  <td className="border p-2">
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeMentor(row.id).catch((e: any) => toast.error(e?.message || "Failed to remove mentor"))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
