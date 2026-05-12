import { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services";
import { useAuth } from "@/store/auth";

type Option = { id: string; name: string };
type TeacherOption = { user_id: string; teacher_id?: string | null; full_name: string; employee_code: string };
type HODLinkRow = {
  id: string;
  hod_teacher_id: string;
  hod_teacher_name: string;
  institution_id: string;
  course_id: string;
  course_name: string;
  branch_id: string;
  branch_name: string;
};

const listFrom = <T,>(payload: any): T[] =>
  (Array.isArray(payload?.data?.items) && payload.data.items) ||
  (Array.isArray(payload?.data) && payload.data) ||
  (Array.isArray(payload) && payload) ||
  [];

export function HodLinkingPage() {
  const { user } = useAuth();
  const institutionId = user?.institution_id || "";

  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [courses, setCourses] = useState<Option[]>([]);
  const [branches, setBranches] = useState<Option[]>([]);
  const [rows, setRows] = useState<HODLinkRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [hodUserId, setHodUserId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [branchId, setBranchId] = useState("");
  const selectedTeacher = teachers.find((t) => t.user_id === hodUserId) || null;
  const selectedCourse = courses.find((c) => c.id === courseId) || null;
  const selectedBranch = branches.find((b) => b.id === branchId) || null;

  const loadTeachers = async () => {
    const res = await api.get<any>("/teachers/hod-candidates");
    const items = listFrom<any>(res).map((x) => ({
      user_id: x.user_id,
      teacher_id: x.teacher_id,
      full_name: x.full_name,
      employee_code: x.employee_code,
    }));
    setTeachers(items);
  };

  const loadCourses = async () => {
    if (!institutionId) return;
    const res = await api.get<any>(`/courses?institution_id=${institutionId}&page=1&page_size=500`);
    setCourses(listFrom<any>(res).map((x) => ({ id: x.id, name: x.name })));
  };

  const loadBranches = async (selectedCourseId: string) => {
    if (!selectedCourseId) {
      setBranches([]);
      return;
    }
    const res = await api.get<any>(`/branches?course_id=${selectedCourseId}&page=1&page_size=500`);
    setBranches(listFrom<any>(res).map((x) => ({ id: x.id, name: x.name })));
  };

  const loadRows = async () => {
    if (!institutionId) return;
    const params = new URLSearchParams({ institution_id: institutionId });
    if (courseId) params.set("course_id", courseId);
    if (branchId) params.set("branch_id", branchId);
    const res = await api.get<any>(`/teachers/links/hod?${params.toString()}`);
    setRows(listFrom<HODLinkRow>(res));
  };

  useEffect(() => {
    loadTeachers().catch(() => toast.error("Failed to load teachers"));
    loadCourses().catch(() => toast.error("Failed to load courses"));
  }, [institutionId]);

  useEffect(() => {
    loadBranches(courseId).catch(() => toast.error("Failed to load branches"));
    if (!editingId) setBranchId("");
  }, [courseId]);

  useEffect(() => {
    loadRows().catch(() => toast.error("Failed to load HOD links"));
  }, [institutionId, courseId, branchId]);

  const createLink = async () => {
    if (saving) return;
    if (!institutionId || !hodUserId || !courseId || !branchId) {
      toast.error("Select HOD, course and branch");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/teachers/links/hod/${editingId}`, {
          hod_user_id: hodUserId,
          institution_id: institutionId,
          course_id: courseId,
          branch_id: branchId,
        });
        toast.success("HOD link updated");
      } else {
        await api.post("/teachers/links/hod", {
          hod_user_id: hodUserId,
          institution_id: institutionId,
          course_id: courseId,
          branch_id: branchId,
        });
        toast.success("HOD linked");
      }
      setHodUserId("");
      setCourseId("");
      setBranchId("");
      setEditingId(null);
      await loadRows();
    } finally {
      setSaving(false);
    }
  };

  const removeLink = async (id: string) => {
    await api.delete(`/teachers/links/hod/${id}`);
    toast.success("HOD link removed");
    await loadRows();
  };

  const startEdit = (row: HODLinkRow) => {
    setEditingId(row.id);
    const teacher = teachers.find((t) => t.teacher_id === row.hod_teacher_id);
    setHodUserId(teacher?.user_id || "");
    setCourseId(row.course_id);
    setBranchId(row.branch_id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setHodUserId("");
    setCourseId("");
    setBranchId("");
  };

  return (
    <div className="space-y-4">
      <PageHeader title="HOD Linking" description="Link HOD with Institute, Course and Branch." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>HOD Teacher</Label>
                <SearchableSelect value={hodUserId} onValueChange={setHodUserId} placeholder="Select HOD" searchPlaceholder="Search HOD..." options={teachers.map((t) => ({ value: t.user_id, label: `${t.full_name} (${t.employee_code})` }))} />
              </div>
              <div>
                <Label>Course</Label>
                <SearchableSelect value={courseId} onValueChange={setCourseId} placeholder="Select course" searchPlaceholder="Search course..." options={courses.map((c) => ({ value: c.id, label: c.name }))} />
              </div>
              <div>
                <Label>Branch</Label>
                <SearchableSelect value={branchId} onValueChange={setBranchId} placeholder="Select branch" searchPlaceholder="Search branch..." options={branches.map((b) => ({ value: b.id, label: b.name }))} />
              </div>
            </div>
          </Card>
        </div>
        <div>
          <Card className="p-4 space-y-3">
            <p className="text-sm font-semibold">Selection Summary</p>
            <div className="text-sm"><span className="text-muted-foreground">HOD:</span> {selectedTeacher ? selectedTeacher.full_name : "-"}</div>
            <div className="text-sm"><span className="text-muted-foreground">Course:</span> {selectedCourse ? selectedCourse.name : "-"}</div>
            <div className="text-sm"><span className="text-muted-foreground">Branch:</span> {selectedBranch ? selectedBranch.name : "-"}</div>
            <Button className="w-full mt-2" disabled={saving} onClick={() => createLink().catch(() => toast.error("Failed to link HOD"))}>
              {saving ? "Saving..." : editingId ? "Update HOD Link" : "Create HOD Link"}
            </Button>
            {editingId && (
              <Button variant="outline" className="w-full" onClick={cancelEdit}>
                Cancel Edit
              </Button>
            )}
          </Card>
        </div>
      </div>

      <Card className="p-4">
        <p className="mb-3 text-sm font-semibold">Linked HOD Records</p>
        <div className="overflow-auto">
          <table className="w-full min-w-[680px] border-collapse">
            <thead>
              <tr>
                <th className="border p-2 text-left text-xs uppercase">HOD</th>
                <th className="border p-2 text-left text-xs uppercase">Course</th>
                <th className="border p-2 text-left text-xs uppercase">Branch</th>
                <th className="border p-2 text-left text-xs uppercase">Edit</th>
                <th className="border p-2 text-left text-xs uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="border p-3 text-sm text-muted-foreground">No HOD links found.</td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="border p-2 text-sm">{r.hod_teacher_name}</td>
                  <td className="border p-2 text-sm">{r.course_name}</td>
                  <td className="border p-2 text-sm">{r.branch_name}</td>
                  <td className="border p-2">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </td>
                  <td className="border p-2">
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeLink(r.id).catch(() => toast.error("Failed to remove link"))}>
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
