import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services";
import { useAuth } from "@/store/auth";

type Option = { id: string; name: string };
type TeacherOption = { id: string; full_name: string; employee_code: string };
type HODLinkOption = {
  id: string;
  hod_teacher_id: string;
  hod_teacher_name: string;
  institution_id: string;
  course_id: string;
  course_name: string;
  branch_id: string;
  branch_name: string;
};
type SubjectOption = { id: string; name: string; branch_id: string };
type TeacherHodSubjectRow = {
  id: string;
  teacher_id: string;
  teacher_name: string;
  hod_link_id: string;
  hod_teacher_id: string;
  hod_teacher_name: string;
  institution_id: string;
  course_id: string;
  course_name: string;
  branch_id: string;
  branch_name: string;
  subject_id: string;
  subject_name: string;
};

const listFrom = <T,>(payload: any): T[] =>
  (Array.isArray(payload?.data?.items) && payload.data.items) ||
  (Array.isArray(payload?.data) && payload.data) ||
  (Array.isArray(payload) && payload) ||
  [];

export function TeacherLinkingPage() {
  const { user } = useAuth();
  const institutionId = user?.institution_id || "";

  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [courses, setCourses] = useState<Option[]>([]);
  const [branches, setBranches] = useState<Option[]>([]);
  const [hodLinks, setHodLinks] = useState<HODLinkOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [rows, setRows] = useState<TeacherHodSubjectRow[]>([]);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);

  const [teacherId, setTeacherId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [hodLinkIds, setHodLinkIds] = useState<string[]>([]);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);

  const selectedHodLinks = useMemo(() => hodLinks.filter((x) => hodLinkIds.includes(x.id)), [hodLinkIds, hodLinks]);
  const selectedBranchSet = useMemo(() => new Set(branchIds), [branchIds]);
  const selectedTeacher = useMemo(() => teachers.find((t) => t.id === teacherId) || null, [teachers, teacherId]);
  const groupedRows = useMemo(() => {
    const map = new Map<string, TeacherHodSubjectRow[]>();
    for (const row of rows) {
      const key = `${row.teacher_id}|${row.hod_teacher_id}`;
      map.set(key, [...(map.get(key) || []), row]);
    }
    return Array.from(map.values()).map((items) =>
      items.slice().sort((a, b) => a.subject_name.localeCompare(b.subject_name))
    );
  }, [rows]);

  const loadTeachers = async () => {
    const res = await api.get<any>("/teachers?page=1&page_size=100");
    const items = listFrom<any>(res).map((x) => ({ id: x.id, full_name: x.full_name, employee_code: x.employee_code }));
    setTeachers(items);
  };

  const loadCourses = async () => {
    if (!institutionId) return;
    const res = await api.get<any>(`/courses?institution_id=${institutionId}&page=1&page_size=100`);
    setCourses(listFrom<any>(res).map((x) => ({ id: x.id, name: x.name })));
  };

  const loadBranches = async (selectedCourseId: string) => {
    if (!selectedCourseId) {
      setBranches([]);
      return;
    }
    const res = await api.get<any>(`/branches?course_id=${selectedCourseId}&page=1&page_size=100`);
    setBranches(listFrom<any>(res).map((x) => ({ id: x.id, name: x.name })));
  };

  const loadHodLinks = async () => {
    if (!institutionId) return;
    const params = new URLSearchParams({ institution_id: institutionId });
    if (courseId) params.set("course_id", courseId);
    const res = await api.get<any>(`/teachers/links/hod?${params.toString()}`);
    const all = listFrom<HODLinkOption>(res);
    setHodLinks(all.filter((x) => selectedBranchSet.size === 0 || selectedBranchSet.has(x.branch_id)));
  };

  const loadSubjects = async () => {
    if (branchIds.length === 0) {
      setSubjects([]);
      return;
    }
    const byId = new Map<string, SubjectOption>();
    for (const bid of branchIds) {
      const res = await api.get<any>(`/subjects?branch_id=${bid}&page=1&page_size=100`);
      const items = listFrom<any>(res).map((x) => ({ id: x.id, name: x.name, branch_id: bid }));
      for (const item of items) byId.set(item.id, item);
    }
    setSubjects(Array.from(byId.values()));
  };

  const loadRows = async () => {
    if (!institutionId) return;
    const params = new URLSearchParams({ institution_id: institutionId });
    if (courseId) params.set("course_id", courseId);
    const res = await api.get<any>(`/teachers/links/teacher-hod-subjects?${params.toString()}`);
    const all = listFrom<TeacherHodSubjectRow>(res);
    setRows(all.filter((x) => selectedBranchSet.size === 0 || selectedBranchSet.has(x.branch_id)));
  };

  useEffect(() => {
    loadTeachers().catch(() => toast.error("Failed to load teachers"));
    loadCourses().catch(() => toast.error("Failed to load courses"));
  }, [institutionId]);

  useEffect(() => {
    if (!editingLinkId) {
      setBranchIds([]);
      setHodLinkIds([]);
      setSubjectIds([]);
    }
    loadBranches(courseId).catch(() => toast.error("Failed to load branches"));
  }, [courseId]);

  useEffect(() => {
    if (!editingLinkId) {
      setHodLinkIds([]);
      setSubjectIds([]);
    }
    loadHodLinks().catch(() => toast.error("Failed to load HOD links"));
    loadSubjects().catch(() => toast.error("Failed to load subjects"));
    loadRows().catch(() => toast.error("Failed to load teacher links"));
  }, [institutionId, courseId, branchIds.join(",")]);

  const toggleSubject = (id: string, checked: boolean) => {
    setSubjectIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  const createLink = async () => {
    if (!teacherId || hodLinkIds.length === 0 || subjectIds.length === 0) {
      toast.error("Select teacher, HOD link(s) and at least one subject");
      return;
    }
    if (editingLinkId) {
      await api.patch(`/teachers/links/teacher-hod-subjects/${editingLinkId}`, {
        teacher_id: teacherId,
        hod_link_id: hodLinkIds[0],
        subject_id: subjectIds[0],
      });
      toast.success("Teacher link updated");
      setEditingLinkId(null);
      setTeacherId("");
      setCourseId("");
      setBranchIds([]);
      setHodLinkIds([]);
      setSubjectIds([]);
      setHodLinks([]);
      setSubjects([]);
      await loadRows();
      return;
    }
    for (const linkId of hodLinkIds) {
      const link = hodLinks.find((x) => x.id === linkId);
      if (!link) continue;
      const perBranchSubjects = subjectIds.filter((sid) => {
        const subject = subjects.find((s) => s.id === sid);
        return subject?.branch_id === link.branch_id;
      });
      if (perBranchSubjects.length === 0) continue;
      await api.post("/teachers/links/teacher-hod-subjects", {
        teacher_id: teacherId,
        hod_link_id: linkId,
        subject_ids: perBranchSubjects,
      });
    }
    toast.success("Teacher linked with HOD subjects");
    setTeacherId("");
    setCourseId("");
    setBranchIds([]);
    setHodLinkIds([]);
    setSubjectIds([]);
    setHodLinks([]);
    setSubjects([]);
    await loadRows();
  };

  const toggleBranch = (id: string, checked: boolean) => {
    setBranchIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  const toggleHod = (id: string, checked: boolean) => {
    setHodLinkIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  const removeLink = async (id: string) => {
    await api.delete(`/teachers/links/teacher-hod-subjects/${id}`);
    toast.success("Teacher link removed");
    await loadRows();
  };

  const startEdit = (row: TeacherHodSubjectRow) => {
    setEditingLinkId(row.id);
    setTeacherId(row.teacher_id);
    setCourseId(row.course_id);
    setBranchIds([row.branch_id]);
    setHodLinkIds([row.hod_link_id]);
    setSubjectIds([row.subject_id]);
  };

  const cancelEdit = () => {
    setEditingLinkId(null);
    setTeacherId("");
    setCourseId("");
    setBranchIds([]);
    setHodLinkIds([]);
    setSubjectIds([]);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Teacher Linking" description="Link teacher with institute, course, branch, HOD and multiple subjects." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Teacher</Label>
                <Select value={teacherId} onValueChange={setTeacherId}>
                  <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                  <SelectContent>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name} ({t.employee_code})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Course</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                  <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Branches</Label>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                {branches.map((b) => (
                  <label key={b.id} className="flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted/40 transition-colors">
                    <Checkbox checked={branchIds.includes(b.id)} onCheckedChange={(v) => toggleBranch(b.id, Boolean(v))} />
                    <span className="text-sm">{b.name}</span>
                  </label>
                ))}
                {branches.length === 0 && <p className="text-sm text-muted-foreground">Select course to load branches.</p>}
              </div>
            </div>
            <div>
              <Label>HODs</Label>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                {hodLinks.map((h) => (
                  <label key={h.id} className="flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted/40 transition-colors">
                    <Checkbox checked={hodLinkIds.includes(h.id)} onCheckedChange={(v) => toggleHod(h.id, Boolean(v))} />
                    <span className="text-sm">{h.hod_teacher_name} <span className="text-muted-foreground">({h.branch_name})</span></span>
                  </label>
                ))}
                {hodLinks.length === 0 && <p className="text-sm text-muted-foreground">No HOD links for selected branch(es).</p>}
              </div>
            </div>
            <div>
              <Label>Subjects</Label>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                {subjects.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted/40 transition-colors">
                    <Checkbox checked={subjectIds.includes(s.id)} onCheckedChange={(v) => toggleSubject(s.id, Boolean(v))} />
                    <span className="text-sm">{s.name}</span>
                  </label>
                ))}
                {subjects.length === 0 && <p className="text-sm text-muted-foreground">No subjects for selected branch(es).</p>}
              </div>
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <p className="text-sm font-semibold">Selection Summary</p>
            <div className="text-sm"><span className="text-muted-foreground">Teacher:</span> {selectedTeacher ? `${selectedTeacher.full_name} (${selectedTeacher.employee_code})` : "-"}</div>
            <div className="text-sm"><span className="text-muted-foreground">Branches:</span> {branchIds.length}</div>
            <div className="text-sm"><span className="text-muted-foreground">HOD Links:</span> {hodLinkIds.length}</div>
            <div className="text-sm"><span className="text-muted-foreground">Subjects:</span> {subjectIds.length}</div>
            <Button className="w-full mt-2" onClick={() => createLink().catch(() => toast.error("Failed to create teacher link"))}>
              {editingLinkId ? "Update Link" : "Link Teacher"}
            </Button>
            {editingLinkId && (
              <Button variant="outline" className="w-full" onClick={cancelEdit}>
                Cancel Edit
              </Button>
            )}
          </Card>
        </div>
      </div>

      <Card className="p-4">
        <p className="mb-3 text-sm font-semibold">Linked Records</p>
        <div className="overflow-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr>
                <th className="border p-2 text-left text-xs uppercase">Teacher</th>
                <th className="border p-2 text-left text-xs uppercase">HOD</th>
                <th className="border p-2 text-left text-xs uppercase">Course / Branch</th>
                <th className="border p-2 text-left text-xs uppercase">Subject</th>
                <th className="border p-2 text-left text-xs uppercase">Edit</th>
                <th className="border p-2 text-left text-xs uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {groupedRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="border p-3 text-sm text-muted-foreground">No teacher links found.</td>
                </tr>
              )}
              {groupedRows.map((group) =>
                group.map((r, idx) => (
                  <tr key={r.id}>
                    {idx === 0 && (
                      <>
                        <td className="border p-2 text-sm font-medium align-top" rowSpan={group.length}>{r.teacher_name}</td>
                        <td className="border p-2 text-sm font-medium align-top" rowSpan={group.length}>{r.hod_teacher_name}</td>
                      </>
                    )}
                    <td className="border p-2 text-sm">{r.course_name} / {r.branch_name}</td>
                    <td className="border p-2 text-sm">{r.subject_name}</td>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
